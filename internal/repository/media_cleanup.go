package repository

import (
	"encoding/json"
	"errors"
	"fmt"
	"log/slog"
	"os"
	"path/filepath"
	"regexp"
	"strings"
	"sync"
	"time"

	"grido/internal/core/domain"
	"grido/internal/utils"

	"gorm.io/gorm"
)

var (
	cleanupStopChan chan struct{}
	cleanupMu       sync.Mutex
)

// CleanupUnusedMedia يقوم بمسح جميع الصور غير المستخدمة في أي مشروع لتوفير مساحة القرص بشكل دوري
func CleanupUnusedMedia() {
	defer func() {
		if r := recover(); r != nil {
			slog.Error("Recovered from panic in CleanupUnusedMedia background task", "error", r)
		}
	}()

	cleanupMu.Lock()
	if cleanupStopChan != nil {
		cleanupMu.Unlock()
		return
	}
	cleanupStopChan = make(chan struct{})
	cleanupMu.Unlock()

	// تأخير بدء التنظيف لتفادي تعارض الملفات أو مسح ملفات مرفوعة حديثاً قبل حفظ مسودتها
	select {
	case <-time.After(15 * time.Second):
	case <-cleanupStopChan:
		return
	}

	// التنظيف الأول عند بدء التشغيل
	runCleanupMedia()

	// إطلاق مؤقت دوري كل 1 ساعة لتنظيف الخلفية بدون تجميد
	ticker := time.NewTicker(1 * time.Hour)
	defer ticker.Stop()
	for {
		select {
		case <-ticker.C:
			runCleanupMedia()
		case <-cleanupStopChan:
			return
		}
	}
}

// StopCleanupUnusedMedia يقوم بإيقاف الخلفية بشكل آمن عند إغلاق التطبيق
func StopCleanupUnusedMedia() {
	cleanupMu.Lock()
	defer cleanupMu.Unlock()
	if cleanupStopChan != nil {
		close(cleanupStopChan)
		cleanupStopChan = nil
	}
}

type elementJSONStruct struct {
	ImageSrc         string `json:"imageSrc"`
	OriginalImageSrc string `json:"originalImageSrc"`
}

type slotJSONStruct struct {
	ImageSrc         string `json:"imageSrc"`
	OriginalImageSrc string `json:"originalImageSrc"`
}

var mediaFilenameRegex = regexp.MustCompile(`(?i)(?:/local-image/|/Media/|\\Media\\)?([a-zA-Z0-9_\-\.]+\.(?:png|jpg|jpeg|webp|bmp|gif|tiff|tif))`)

// extractImagesFromText يستخرج أي أسماء ملفات صور من النصوص الخام كشبكة أمان عامة لمنع فقدان الصور
func extractImagesFromText(rawText string, referenced map[string]bool) {
	if rawText == "" {
		return
	}
	matches := mediaFilenameRegex.FindAllStringSubmatch(rawText, -1)
	for _, m := range matches {
		if len(m) > 1 && m[1] != "" {
			filename := filepath.Base(filepath.Clean(m[1]))
			referenced[filename] = true
		}
	}
}

// collectImageFilenames منطق مساعد مشترك لتجميع أسماء الملفات لتجنب التكرار (DRY)
func collectImageFilenames(elementsStr, slotsStr string, referenced map[string]bool) {
	if elementsStr != "" {
		var elems []elementJSONStruct
		if err := json.Unmarshal([]byte(elementsStr), &elems); err == nil {
			for _, el := range elems {
				if el.ImageSrc != "" {
					filename := filepath.Base(filepath.Clean(el.ImageSrc))
					referenced[filename] = true
				}
				if el.OriginalImageSrc != "" {
					filename := filepath.Base(filepath.Clean(el.OriginalImageSrc))
					referenced[filename] = true
				}
			}
		}
		// شبكة أمان إضافية بالـ Regex على نصوص العناصر بالكامل
		extractImagesFromText(elementsStr, referenced)
	}
	if slotsStr != "" {
		var slots []slotJSONStruct
		if err := json.Unmarshal([]byte(slotsStr), &slots); err == nil {
			for _, slot := range slots {
				if slot.ImageSrc != "" {
					filename := filepath.Base(filepath.Clean(slot.ImageSrc))
					referenced[filename] = true
				}
				if slot.OriginalImageSrc != "" {
					filename := filepath.Base(filepath.Clean(slot.OriginalImageSrc))
					referenced[filename] = true
				}
			}
		}
		// شبكة أمان إضافية بالـ Regex على نصوص الخلايا بالكامل
		extractImagesFromText(slotsStr, referenced)
	}
}

// mediaCleanupBatchSize حجم دفعة جلب المشاريع أثناء جمع مراجع التنظيف: جلب
// كامل المكتبة دفعة واحدة بكل أعمدة المراجع الستة يضاعف ذروة الذاكرة على
// المكتبات الكبيرة، فتُجلب المشاريع على دفعات مرتبة بالمفتاح وتُجمع مراجعها
// تدريجياً في الذاكرة، مع إلزامية اكتمال جمع كل الدفعات قبل بدء أي حذف.
const mediaCleanupBatchSize = 200

// cleanupProjectsBatch يجلب دفعة مشاريع واحدة بكل حقول المراجع الستة
// (elements وslots وtemplate وcollage_template وprint_settings وeditor_state
// — إسقاط أي حقل يعني نقل صورة مستخدم حيّة إلى MediaTrash وفق ثابت «حماية
// مراجع الوسائط في التنظيف»). التقدم بالمعرّف لا بإزاحة الصفوف حتى لا يتسبب حذف
// مشروع سبق فحصه في تخطي مشروع حيّ في الدفعة التالية. nil يعني أول دفعة.
func cleanupProjectsBatch(db *gorm.DB, afterID *string) ([]domain.Project, error) {
	var projects []domain.Project
	query := db.
		Select("id", "elements", "slots", "template", "collage_template", "print_settings", "editor_state").
		Order("id asc").
		Limit(mediaCleanupBatchSize)
	if afterID != nil {
		query = query.Where("id > ?", *afterID)
	}
	err := query.Find(&projects).Error
	return projects, err
}

// forEachCleanupProjectBatch يمشي على كامل المشاريع دفعةً دفعة ويستدعي fn لكل
// دفعة حتى دفعة غير ممتلئة (أقل من حجم الدفعة) تعني نهاية المكتبة. أي خطأ في
// أي دفعة يُعاد فوراً — الجمع غير المكتمل لا يفتح باب الحذف إطلاقاً
// (fail-closed: امتداد حارس فساد مسودة autosave على كل دفعة على حدة).
// يحمي من حذف صفوف الدفعات السابقة، ولا يدّعي لقطة معاملية للتعديلات المتزامنة.
func forEachCleanupProjectBatch(db *gorm.DB, fn func(batch []domain.Project)) error {
	var afterID *string
	for {
		batch, err := cleanupProjectsBatch(db, afterID)
		if err != nil {
			return fmt.Errorf("fetch cleanup projects batch: %w", err)
		}
		fn(batch)
		if len(batch) < mediaCleanupBatchSize {
			return nil
		}
		lastID := batch[len(batch)-1].ID
		afterID = &lastID
	}
}

// collectProjectReferences يستخرج مراجع الصور من أعمدة المراجع الستة لمشروع واحد
func collectProjectReferences(p *domain.Project, referenced map[string]bool) {
	collectImageFilenames(string(p.Elements), string(p.Slots), referenced)
	extractImagesFromText(string(p.Template), referenced)
	extractImagesFromText(string(p.CollageTemplate), referenced)
	extractImagesFromText(string(p.PrintSettings), referenced)
	extractImagesFromText(string(p.EditorState), referenced)
}

// collectAutosaveReferences يفحص مسار الصورة في مسودة التخزين التلقائي
// autosave.json. ملف تالف/غير مكتمل يوقف التنظيف فوراً (خطأ، لا قائمة فارغة) —
// إرجاع قائمة فارغة يعني اعتبار صور العمل الجاري «مهجورة» وحذفها (خطر فقدان
// بيانات المستخدم).
func collectAutosaveReferences(appDir string, referenced map[string]bool) error {
	autosavePath := filepath.Join(appDir, "autosave.json")
	if autosaveBytes, err := os.ReadFile(autosavePath); err == nil {
		var autosaveData struct {
			Elements []elementJSONStruct `json:"elements"`
			Slots    []slotJSONStruct    `json:"slots"`
		}
		if err := json.Unmarshal(autosaveBytes, &autosaveData); err == nil {
			elemsBytes, _ := json.Marshal(autosaveData.Elements)
			slotsBytes, _ := json.Marshal(autosaveData.Slots)
			collectImageFilenames(string(elemsBytes), string(slotsBytes), referenced)
			extractImagesFromText(string(autosaveBytes), referenced)
		} else {
			return fmt.Errorf("corrupt autosave.json encountered: %w", err)
		}
	} else if !os.IsNotExist(err) {
		return fmt.Errorf("read autosave.json: %w", err)
	}
	return nil
}

// collectCustomTemplateReferences يفحص مسارات الصور في القوالب المخصصة
// المحفوظة بقاعدة البيانات لمنع مسح أصول القوالب (fail-closed عند فشل القراءة)
func collectCustomTemplateReferences(referenced map[string]bool) error {
	dbMu.RLock()
	currentDB := dbInstance
	dbMu.RUnlock()

	if currentDB == nil {
		return nil
	}

	var templates []domain.CustomTemplate
	if err := currentDB.Find(&templates).Error; err != nil {
		return fmt.Errorf("read custom templates: %w", err)
	}
	for _, t := range templates {
		collectImageFilenames("", string(t.Cells), referenced)
		extractImagesFromText(string(t.Cells), referenced)
	}
	return nil
}

// collectReferencedImages يجمع كل الصور المشار إليها: المشاريع (جلب على دفعات
// بالمفتاح وجمع تدريجي في الذاكرة) ثم مسودة autosave.json ثم القوالب
// المخصصة. لا يُعاد النداء بنجاح إلا بعد اكتمال جمع كل الدفعات ومصادر المراجع
// كلها — أي خطأ يُبطل العملية قبل بدء أي حذف (fail-closed).
func collectReferencedImages(db *gorm.DB, appDir string) (map[string]bool, error) {
	referencedImages := make(map[string]bool)

	// 1. فحص مسارات الصور في المشاريع المحفوظة بقاعدة البيانات (كافة الحقول)
	if err := forEachCleanupProjectBatch(db, func(batch []domain.Project) {
		for i := range batch {
			collectProjectReferences(&batch[i], referencedImages)
		}
	}); err != nil {
		return nil, err
	}

	// 2. فحص مسار الصورة في مسودة التخزين التلقائي autosave.json
	if err := collectAutosaveReferences(appDir, referencedImages); err != nil {
		return nil, err
	}

	// 3. فحص مسارات الصور في القوالب المخصصة المحفوظة بقاعدة البيانات
	if err := collectCustomTemplateReferences(referencedImages); err != nil {
		return nil, err
	}

	return referencedImages, nil
}

// moveUnreferencedToTrash ينقل الملفات غير المشار إليها إلى الحجر الصحي (MediaTrash)
func moveUnreferencedToTrash(mediaDir, trashDir string, referenced map[string]bool) {
	files, err := os.ReadDir(mediaDir)
	if err != nil {
		return
	}

	_ = os.MkdirAll(trashDir, 0755)

	for _, f := range files {
		if f.IsDir() {
			continue
		}

		filename := f.Name()
		filePath := filepath.Join(mediaDir, filename)
		// نقل الملفات غير المشار إليها والتي مضى عليها أكثر من 7 أيام للحجر الصحي (حماية ملفات المشاريع المستقلة)
		info, err := os.Stat(filePath)
		if err != nil || time.Since(info.ModTime()) < 7*24*time.Hour {
			continue
		}

		if !referenced[filename] {
			trashPath := filepath.Join(trashDir, filename)
			if err := os.Rename(filePath, trashPath); err != nil {
				slog.Error("Failed to move file to trash", "src", filePath, "dst", trashPath, "error", err)
				continue
			}
			// ⏱️ os.Rename يحافظ على mtime الأصلي للملف المنقول —
			// بلا هذا السطر، سيحذف purgeOldTrash أي ملف غير مرجعي عمره > 30 يوماً
			// في نفس الدورة (0 ثانية مهلة استرداد). لذلك نُحدّث mtime إلى الآن لبدء مهلة الـ 30 يوماً.
			now := time.Now()
			if err := os.Chtimes(trashPath, now, now); err != nil {
				slog.Error("Failed to update mtime for trashed file", "path", trashPath, "error", err)
			}
		}
	}
}

// purgeOldTrash يحذف الملفات القديمة التي مضى عليها أكثر من 30 يوماً من الحجر الصحي
func purgeOldTrash(trashDir string) {
	trashFiles, err := os.ReadDir(trashDir)
	if err != nil {
		return
	}

	for _, f := range trashFiles {
		if f.IsDir() {
			continue
		}
		filePath := filepath.Join(trashDir, f.Name())
		if info, err := os.Stat(filePath); err == nil {
			if time.Since(info.ModTime()) > 30*24*time.Hour {
				_ = os.Remove(filePath)
			}
		}
	}
}

// thumbnailOriginalName يستخرج اسم الصورة الأصلية من اسم مصغرة بالصيغة
// <originalFilename>__w<width>.<ext>. أي اسم لا يطابق الصيغة يُتجاهل.
func thumbnailOriginalName(thumbName string) string {
	idx := strings.LastIndex(thumbName, "__w")
	if idx <= 0 {
		return ""
	}
	rest := thumbName[idx+3:]
	dot := strings.IndexByte(rest, '.')
	if dot <= 0 {
		return ""
	}
	for _, r := range rest[:dot] {
		if r < '0' || r > '9' {
			return ""
		}
	}
	return thumbName[:idx]
}

// cleanupThumbnails يحذف المصغرات المشتقة التي فقد أصلها أو لم يعد مشاراً
// إليه. المصغرات قابلة لإعادة التوليد، لكن نمنح الأصل المشار إليه حديثاً
// مهلة أمان قبل الحذف لتفادي سباق الحفظ التلقائي.
func cleanupThumbnails(mediaDir string, referenced map[string]bool, minAge time.Duration) (count int, freedBytes int64) {
	thumbDir := filepath.Join(mediaDir, ".thumbs")
	entries, err := os.ReadDir(thumbDir)
	if err != nil {
		return 0, 0
	}

	for _, entry := range entries {
		if entry.IsDir() {
			continue
		}
		thumbName := entry.Name()
		originalName := thumbnailOriginalName(thumbName)
		if originalName == "" {
			continue
		}
		thumbPath := filepath.Join(thumbDir, thumbName)
		info, err := entry.Info()
		if err != nil {
			continue
		}

		originalPath := filepath.Join(mediaDir, originalName)
		_, originalErr := os.Stat(originalPath)
		originalExists := originalErr == nil
		if originalExists && referenced[originalName] {
			continue
		}
		// إذا كان الأصل موجوداً لكنه غير مشار إليه، لا نحذف إلا بعد المهلة.
		if originalExists && time.Since(info.ModTime()) < minAge {
			continue
		}
		// إذا اختفى الأصل فالمصغرة يتيمة فوراً وقابلة للحذف.
		if err := os.Remove(thumbPath); err == nil {
			count++
			freedBytes += info.Size()
		}
	}
	return count, freedBytes
}

func runCleanupMedia() {
	defer func() {
		if r := recover(); r != nil {
			slog.Error("Recovered from panic in runCleanupMedia execution", "error", r)
		}
	}()

	dbMu.RLock()
	db := dbInstance
	dbMu.RUnlock()

	if db == nil {
		return
	}

	appDir := utils.GetAppDir()
	mediaDir := filepath.Join(appDir, "Media")
	trashDir := filepath.Join(appDir, "MediaTrash")

	// الجمع على دفعات يكتمل كاملاً قبل أي حذف (fail-closed عند أي دفعة تالفة)
	referenced, err := collectReferencedImages(db, appDir)
	if err != nil {
		slog.Error("Failed to collect referenced images (corrupt autosave or unreadable batch), aborting cleanup to prevent data loss", "error", err)
		return
	}
	moveUnreferencedToTrash(mediaDir, trashDir, referenced)
	cleanupThumbnails(mediaDir, referenced, 24*time.Hour)
	purgeOldTrash(trashDir)
}

// CleanUnusedMediaNow يقوم بالتنظيف اليدوي الفوري لجميع الوسائط غير المستخدمة وإعادة إحصائيات ما تم تنظيفه
func CleanUnusedMediaNow() (cleanedCount int, freedBytes int64, err error) {
	dbMu.RLock()
	db := dbInstance
	dbMu.RUnlock()

	if db == nil {
		return 0, 0, errors.New("database not initialized")
	}

	appDir := utils.GetAppDir()
	mediaDir := filepath.Join(appDir, "Media")
	trashDir := filepath.Join(appDir, "MediaTrash")

	// الجمع على دفعات يكتمل كاملاً قبل أي حذف (fail-closed عند أي دفعة تالفة)
	referenced, err := collectReferencedImages(db, appDir)
	if err != nil {
		return 0, 0, fmt.Errorf("failed to collect referenced images: %w", err)
	}

	files, err := os.ReadDir(mediaDir)
	if err != nil {
		if os.IsNotExist(err) {
			return 0, 0, nil
		}
		return 0, 0, err
	}

	_ = os.MkdirAll(trashDir, 0755)

	for _, f := range files {
		if f.IsDir() {
			continue
		}
		filename := f.Name()
		filePath := filepath.Join(mediaDir, filename)

		if !referenced[filename] {
			// 🛡️ حد أدنى للعمر قبل النقل (24 ساعة) — اتساقاً مع السبب الذي
			// يفرض حماية عمر في المسار التلقائي (moveUnreferencedToTrash):
			// الملف المستورد حديثاً قد لا يكون مرجعه قد حُفظ بعد في مشروع
			// أو مسودة autosave (debounce ثانيتين + idle)، فنقله الفوري =
			// فقدان صورة المستخدم. 24 ساعة تغطي كل تأجيلات الحفظ المعروفة
			// مع إبقاء «التنظيف الآن» فورياً بمعناه. نقرأ Stat مباشرةً.
			info, err := os.Stat(filePath)
			if err != nil || time.Since(info.ModTime()) < 24*time.Hour {
				continue
			}
			fileSize := info.Size()
			trashPath := filepath.Join(trashDir, filename)
			if err := os.Rename(filePath, trashPath); err != nil {
				slog.Error("Failed to move file to trash during manual clean", "src", filePath, "dst", trashPath, "error", err)
				continue
			}
			now := time.Now()
			_ = os.Chtimes(trashPath, now, now)
			freedBytes += fileSize
			cleanedCount++
		}
	}

	thumbCount, thumbBytes := cleanupThumbnails(mediaDir, referenced, 24*time.Hour)
	cleanedCount += thumbCount
	freedBytes += thumbBytes

	purgeOldTrash(trashDir)

	return cleanedCount, freedBytes, nil
}

// EmptyMediaTrash يقوم بالحذف النهائي لكافة الملفات الموجودة في سلة وسائط التطبيق (MediaTrash)
// ويحرر المساحة الحقيقية على القرص فورياً مع إعادة عدد الملفات والبايتات المحررة
func EmptyMediaTrash() (deletedCount int, freedBytes int64, err error) {
	appDir := utils.GetAppDir()
	trashDir := filepath.Join(appDir, "MediaTrash")

	files, err := os.ReadDir(trashDir)
	if err != nil {
		if os.IsNotExist(err) {
			return 0, 0, nil
		}
		return 0, 0, err
	}

	for _, f := range files {
		if f.IsDir() {
			continue
		}
		filePath := filepath.Join(trashDir, f.Name())
		fileSize := int64(0)
		if info, err := os.Stat(filePath); err == nil {
			fileSize = info.Size()
		}
		if err := os.Remove(filePath); err == nil {
			deletedCount++
			freedBytes += fileSize
		} else {
			slog.Warn("Failed to permanently delete media trash file", "path", filePath, "error", err)
		}
	}

	return deletedCount, freedBytes, nil
}
