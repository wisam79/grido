package service

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"strings"

	"grido/internal/core/domain"
	"grido/internal/utils"
)

type BackupService struct {
	repo        domain.ProjectRepository
	licenseRepo domain.LicenseRepository
}

func NewBackupService(repo domain.ProjectRepository, licenseRepo domain.LicenseRepository) *BackupService {
	return &BackupService{repo: repo, licenseRepo: licenseRepo}
}

// writeBackupJSON هو باني أرشيف النسخ الاحتياطي المشترك الوحيد (الثابت 6: لا
// ازدواج) — يُستدعى من المسارين: ExportBackup (عبر IPC) وExportBackupToFile
// (كتابة مباشرة على القرص). يبثّ JSON المشاريع إلى أي io.Writer عنصراً بعنصر
// بدل بناء الحمولة كاملة في الذاكرة ثم نسخها كسلسلة عبر IPC، والمخرج مطابق
// بايت-ب-بايت لصيغة json.MarshalIndent(projects, "", "  ") التاريخية حتى تبقى
// النسخ القديمة قابلة للاستيراد.
func (s *BackupService) writeBackupJSON(w io.Writer) error {
	projects, err := s.repo.FindAll()
	if err != nil {
		return fmt.Errorf("failed to retrieve projects for backup: %w", err)
	}

	// توثيق توافق الصيغة التاريخية: nil يُرمَّز "null" والمصفوفة الفارغة "[]"
	// (len(nil)==0 يدخل الفرع، والفحص الداخلي يفصل ترميز nil عن الفارغة)
	if len(projects) == 0 {
		payload := "[]"
		if projects == nil {
			payload = "null"
		}
		if _, err := io.WriteString(w, payload); err != nil {
			return fmt.Errorf("failed to write backup JSON: %w", err)
		}
		return nil
	}

	if _, err := io.WriteString(w, "[\n"); err != nil {
		return fmt.Errorf("failed to write backup JSON: %w", err)
	}
	for i := range projects {
		if i > 0 {
			if _, err := io.WriteString(w, ",\n"); err != nil {
				return fmt.Errorf("failed to write backup JSON: %w", err)
			}
		}
		// بادئة "  " على مستوى العنصر تحاكي بالضبط المسافة البادئة التي يطبقها
		// MarshalIndent على كل عنصر داخل المصفوفة (بادئة السطر الأول تُكتب
		// يدوياً لأن MarshalIndent يطبق prefix على الأسطر اللاحقة فقط) — كل
		// عنصر يُرمَّز ويُكتب وحده فلا تتجمع الحمولة كاملة في الذاكرة.
		if _, err := io.WriteString(w, "  "); err != nil {
			return fmt.Errorf("failed to write backup JSON: %w", err)
		}
		element, err := json.MarshalIndent(projects[i], "  ", "  ")
		if err != nil {
			return fmt.Errorf("failed to marshal project %q to JSON: %w", projects[i].ID, err)
		}
		if _, err := w.Write(element); err != nil {
			return fmt.Errorf("failed to write backup JSON: %w", err)
		}
	}
	if _, err := io.WriteString(w, "\n]"); err != nil {
		return fmt.Errorf("failed to write backup JSON: %w", err)
	}
	return nil
}

// ExportBackup retrieves all projects and returns them serialized in JSON format.
// عقد IPC قائم يُحتفظ به لتوافق الربطات الحالية — الواجهة ستنقل استدعاءها
// لاحقاً إلى ExportBackupToFile.
func (s *BackupService) ExportBackup() (string, error) {
	var buf bytes.Buffer
	if err := s.writeBackupJSON(&buf); err != nil {
		return "", err
	}
	return buf.String(), nil
}

// ExportBackupToFile يكتب أرشيف النسخ الاحتياطي (نفس صيغة ExportBackup بايت-ب-بايت)
// مباشرة إلى المسار المطلوب بكتابة أذرعية عبر utils.CreateAtomic (ملف مؤقت
// .tmp + f.Sync ثم os.Rename — الثابت 3) دون تحميل الحمولة كسلسلة كاملة أو
// إعادتها عبر IPC: يُبثّ JSON متدفقاً إلى الملف المؤقت عبر باني الأرشيف
// المشترك writeBackupJSON، وأي فشل يحذف الملف المؤقت (defer Abort) ولا يمس
// الملف الهدف القائم.
func (s *BackupService) ExportBackupToFile(filePath string) error {
	if strings.TrimSpace(filePath) == "" {
		return fmt.Errorf("backup export path is empty")
	}

	atomicFile, err := utils.CreateAtomic(filePath, 0o644)
	if err != nil {
		return err
	}
	defer atomicFile.Abort() // no-op بعد Commit؛ يحذف الملف المؤقت عند أي فشل

	if err := s.writeBackupJSON(atomicFile); err != nil {
		return err
	}
	return atomicFile.Commit()
}

// ImportBackup deserializes the backup JSON and saves projects to database
func (s *BackupService) ImportBackup(jsonData string, mode string) error {
	// Prevent excessively large payloads (e.g. > 50MB)
	if len(jsonData) > 50*1024*1024 {
		return fmt.Errorf("الملف كبير جداً، الحد الأقصى للاستيراد هو 50 ميغابايت")
	}

	var projects []domain.Project
	// فك متدفق فوق نفس السلسلة — Unmarshal([]byte(...)) كان ينسخ 50MB كاملة
	decoder := json.NewDecoder(strings.NewReader(jsonData))
	if err := decoder.Decode(&projects); err != nil {
		return fmt.Errorf("failed to parse backup JSON data: %w", err)
	}
	// Decode يقبل أول قيمة فقط؛ لا يجوز استبدال المكتبة ببادئة ملف تالف.
	if _, err := decoder.Token(); err != io.EOF {
		return fmt.Errorf("backup JSON must contain exactly one value")
	}

	if mode != "merge" && mode != "overwrite" {
		return fmt.Errorf("invalid backup import mode: %q (expected %q or %q)", mode, "merge", "overwrite")
	}

	// بعض المصدّرات القديمة أعادت null لمكتبة nil: نقبلها بلا تغيير، لا كأمر
	// حذف. المصفوفة الصريحة [] تبقى قابلة للاستيراد بوضع overwrite لتفريغها.
	if projects == nil {
		return nil
	}
	if err := validateBackupProjects(projects); err != nil {
		return err
	}

	// Check licensing limits
	profile, err := s.licenseRepo.Get()
	isFree := true
	if err == nil && profile != nil {
		isFree = !profile.IsEntitled()
	}

	if isFree {
		existingCount := 0
		if mode == "merge" {
			existingProjects, _ := s.repo.FindAll()
			uniqueProjects := make(map[string]bool)
			for _, p := range existingProjects {
				uniqueProjects[p.ID] = true
			}
			for _, p := range projects {
				uniqueProjects[p.ID] = true
			}
			existingCount = len(uniqueProjects)
		} else {
			existingCount = len(projects)
		}

		if existingCount > 3 {
			return fmt.Errorf("لقد تجاوزت الحد الأقصى للمشاريع في الخطة المجانية (3 مشاريع). يرجى الترقية لباقة Pro للاستيراد")
		}
	}

	overwrite := (mode == "overwrite")

	if err := s.repo.ImportProjects(projects, overwrite); err != nil {
		return fmt.Errorf("failed to import projects to repository: %w", err)
	}

	return nil
}

// validateBackupProjects completes validation before either import mode can
// mutate the library. Keep legacy optional fields and object/array envelopes;
// do not reinterpret paths, require local files, or impose a newer DTO schema.
func validateBackupProjects(projects []domain.Project) error {
	ids := make(map[string]struct{}, len(projects))
	for i := range projects {
		p := &projects[i]
		if strings.TrimSpace(p.ID) == "" {
			return fmt.Errorf("backup project %d: ID cannot be empty", i+1)
		}
		if _, exists := ids[p.ID]; exists {
			return fmt.Errorf("backup project %d: duplicate ID %q", i+1, p.ID)
		}
		ids[p.ID] = struct{}{}

		for _, field := range []struct {
			name  string
			value domain.JSONText
		}{
			{"elements", p.Elements},
			{"slots", p.Slots},
			{"template", p.Template},
			{"collageTemplate", p.CollageTemplate},
			{"printSettings", p.PrintSettings},
			{"editorState", p.EditorState},
			{"userGuides", p.UserGuides},
		} {
			value := strings.TrimSpace(string(field.value))
			if value == "" || value == "null" {
				continue
			}
			if (value[0] != '{' && value[0] != '[') || !json.Valid([]byte(value)) {
				return fmt.Errorf("backup project %d (%q): %s must contain a JSON object, array, or null", i+1, p.ID, field.name)
			}
		}
	}
	return nil
}

// ResetLibrary deletes all projects from the database
func (s *BackupService) ResetLibrary() error {
	if err := s.repo.ImportProjects([]domain.Project{}, true); err != nil {
		return fmt.Errorf("failed to clear projects library: %w", err)
	}
	return nil
}
