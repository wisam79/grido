package repository

import (
	"encoding/json"
	"errors"
	"fmt"
	"log/slog"
	"os"
	"path/filepath"
	"regexp"
	"sync"
	"time"

	"grido/internal/core/domain"
	"grido/internal/utils"
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

// collectReferencedImages يجمع كل الصور المشار إليها في المشاريع وقاعدة البيانات ومسودة autosave.json
func collectReferencedImages(projects []domain.Project, appDir string) (map[string]bool, error) {
	referencedImages := make(map[string]bool)

	// 1. فحص مسارات الصور في المشاريع المحفوظة بقاعدة البيانات (كافة الحقول)
	for _, p := range projects {
		collectImageFilenames(string(p.Elements), string(p.Slots), referencedImages)
		extractImagesFromText(string(p.Template), referencedImages)
		extractImagesFromText(string(p.CollageTemplate), referencedImages)
		extractImagesFromText(string(p.PrintSettings), referencedImages)
	}

	// 2. فحص مسار الصورة في مسودة التخزين التلقائي autosave.json
	// ملف تالف/غير مكتمل يوقف التنظيف فوراً — إرجاع قائمة فارغة يعني اعتبار
	// صور العمل الجاري «مهجورة» وحذفها (خطر فقدان بيانات المستخدم)
	autosavePath := filepath.Join(appDir, "autosave.json")
	if autosaveBytes, err := os.ReadFile(autosavePath); err == nil {
		var autosaveData struct {
			Elements []elementJSONStruct `json:"elements"`
			Slots    []slotJSONStruct    `json:"slots"`
		}
		if err := json.Unmarshal(autosaveBytes, &autosaveData); err == nil {
			elemsBytes, _ := json.Marshal(autosaveData.Elements)
			slotsBytes, _ := json.Marshal(autosaveData.Slots)
			collectImageFilenames(string(elemsBytes), string(slotsBytes), referencedImages)
			extractImagesFromText(string(autosaveBytes), referencedImages)
		} else {
			return nil, fmt.Errorf("corrupt autosave.json encountered: %w", err)
		}
	}

	// 3. فحص مسارات الصور في القوالب المخصصة المحفوظة بقاعدة البيانات لمنع مسح أصول القوالب
	dbMu.RLock()
	currentDB := dbInstance
	dbMu.RUnlock()

	if currentDB != nil {
		var templates []domain.CustomTemplate
		if err := currentDB.Find(&templates).Error; err == nil {
			for _, t := range templates {
				collectImageFilenames("", string(t.Cells), referencedImages)
				extractImagesFromText(string(t.Cells), referencedImages)
			}
		}
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

	var projects []domain.Project
	if err := db.Select("elements, slots").Find(&projects).Error; err != nil {
		return
	}

	appDir := utils.GetAppDir()
	mediaDir := filepath.Join(appDir, "Media")
	trashDir := filepath.Join(appDir, "MediaTrash")

	referenced, err := collectReferencedImages(projects, appDir)
	if err != nil {
		slog.Error("Failed to collect referenced images (autosave might be corrupt), aborting cleanup to prevent data loss", "error", err)
		return
	}
	moveUnreferencedToTrash(mediaDir, trashDir, referenced)
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

	var projects []domain.Project
	if err := db.Select("elements, slots").Find(&projects).Error; err != nil {
		return 0, 0, err
	}

	appDir := utils.GetAppDir()
	mediaDir := filepath.Join(appDir, "Media")
	trashDir := filepath.Join(appDir, "MediaTrash")

	referenced, err := collectReferencedImages(projects, appDir)
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
