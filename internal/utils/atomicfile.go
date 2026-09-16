package utils

import (
	"errors"
	"fmt"
	"io"
	"os"
)

// ─────────────────────────────────────────────────────────────────────────────
// atomicfile.go — الكتابة الذرية الموحّدة لكل ملفات التطبيق
//
// كانت دورة (create → write → fsync → rename) معادة يدوياً في 12 موضعاً
// (app.go، main.go ×2، window_state.go، crypto.go، autosave_service.go،
// ai_service.go، ai_logs_service.go، media_service.go، image_processor.go،
// phone_bridge_service.go، print_export.go) بصلاحيات وسياسات أخطاء مختلفة.
// هذا الملف هو المصدر الوحيد للدورة.
//
// ثابت الاستخدام: كاتب واحد لكل مسار هدف — إما mutex عند المستدعي أو اسم
// هدف فريد لكل عملية (كما في media_service/phone_bridge عبر UnixNano).
// الاصطلاح الموحّد للملف المؤقت هو <path>.tmp ليبقى متوافقاً مع مسّاحات
// الملفات المؤقتة القائمة (تنظيف Exports في print_export.go وتنظيف
// التحديثات في updater.go).
// ────────────────────────────────────────────────────────────────────────────

// AtomicFile كاتب ملف بكتابة أذرعية: يُنشئ ملفاً مؤقتاً بجانب الهدف،
// وCommit() يزامن (fsync) ثم ينقل ذرياً (os.Rename)، وAbort() يُلغي ويحذف
// المؤقت. إن انقطعت العملية في المنتصف لا يبقى سوى ملف .tmp قابل للتنظيف —
// ولا يظهر الملف الهدف تالفاً أو صفرياً.
type AtomicFile struct {
	file    *os.File
	tmpPath string
	dstPath string
	done    bool
}

// CreateAtomic ينشئ الملف المؤقت للهدف المطلوب بالصلاحيات المعطاة.
// الصلاحيات صريحة دائماً (لا تعتمد على umask): 0600 للملفات الحساسة
// (التوكنات ومفاتيح الترخيص) و0644 لبقية المخرجات.
func CreateAtomic(path string, perm os.FileMode) (*AtomicFile, error) {
	tmpPath := path + ".tmp"
	f, err := os.OpenFile(tmpPath, os.O_WRONLY|os.O_CREATE|os.O_TRUNC, perm)
	if err != nil {
		return nil, fmt.Errorf("create temp file %s: %w", tmpPath, err)
	}
	return &AtomicFile{file: f, tmpPath: tmpPath, dstPath: path}, nil
}

// Write يكتب دفعة بايتات في الملف المؤقت.
func (a *AtomicFile) Write(p []byte) (int, error) { return a.file.Write(p) }

// WriteString يكتب سلسلة دون تحويلها إلى []byte — مهم للحمولات الكبيرة
// (autosave قد يصل 100MB وكان تحويل []byte(jsonData) ينسخها كاملة).
func (a *AtomicFile) WriteString(s string) (int, error) { return a.file.WriteString(s) }

// ReadFrom يُمرّر إلى *os.File.ReadFrom لتفعيل المسار السريع داخل io.Copy
// بدل حلقة Write العامة — يهم لملفات الوسائط الكبيرة.
func (a *AtomicFile) ReadFrom(r io.Reader) (int64, error) { return a.file.ReadFrom(r) }

// File يعيد الملف المؤقت لمن يحتاج *os.File صراحةً (مثل png.Encoder).
func (a *AtomicFile) File() *os.File { return a.file }

// Commit يزامن وينقل ذرياً. أي فشل ⇒ حذف المؤقت وإرجاع الخطأ الأصلي مُغلَّفاً.
func (a *AtomicFile) Commit() error {
	if a.done {
		return errors.New("atomic file: already committed or aborted")
	}
	a.done = true

	if err := a.file.Sync(); err != nil {
		_ = a.file.Close()
		_ = os.Remove(a.tmpPath)
		return fmt.Errorf("sync temp file %s: %w", a.tmpPath, err)
	}
	if err := a.file.Close(); err != nil {
		_ = os.Remove(a.tmpPath)
		return fmt.Errorf("close temp file %s: %w", a.tmpPath, err)
	}
	// os.Rename يستبدل الهدف الموجود (MOVEFILE_REPLACE_EXISTING على ويندوز)
	if err := os.Rename(a.tmpPath, a.dstPath); err != nil {
		_ = os.Remove(a.tmpPath)
		return fmt.Errorf("finalize atomic write %s: %w", a.dstPath, err)
	}
	return nil
}

// Abort يُغلق ويحذف المؤقت. آمن ومتكرر، وno-op بعد Commit (لا يمس الملف
// النهائي) — يحفظ سلوك abortAtomicFile السابق في print_export.go.
func (a *AtomicFile) Abort() {
	if a == nil || a.done {
		return
	}
	a.done = true
	_ = a.file.Close()
	_ = os.Remove(a.tmpPath)
}

// AtomicWriteFile غلاف للحمولات الصغيرة الجاهزة في الذاكرة.
func AtomicWriteFile(path string, data []byte, perm os.FileMode) error {
	a, err := CreateAtomic(path, perm)
	if err != nil {
		return err
	}
	defer a.Abort() // no-op بعد Commit

	if _, err := a.Write(data); err != nil {
		return fmt.Errorf("write temp file %s: %w", a.tmpPath, err)
	}
	return a.Commit()
}