package service

import (
	"os"
	"path/filepath"
	"testing"
)

// TestLoadEnvConfigFile_DevOnlyCwdFallback يُثبت أن قراءة `.env` من **مجلد العمل
// الحالي** مسموحة في وضع التطوير فقط، وأن `.env` داخل مجلد بيانات التطبيق يُقرأ
// دائمًا. السبب: تشغيل الإنتاج من مجلد يحوي `.env` ملقَّمًا يعيد توجيه مصادقة
// الحساب وخادم الذكاء الاصطناعي إلى خادم مهاجم.
func TestLoadEnvConfigFile_DevOnlyCwdFallback(t *testing.T) {
	appDir := t.TempDir()
	cwdDir := t.TempDir()

	appEnv := []byte("SUPABASE_URL=https://app-dir.example\n")
	if err := os.WriteFile(filepath.Join(appDir, ".env"), appEnv, 0o600); err != nil {
		t.Fatalf("failed to write app-dir .env: %v", err)
	}

	originalWd, err := os.Getwd()
	if err != nil {
		t.Fatalf("failed to read working directory: %v", err)
	}
	if err := os.Chdir(cwdDir); err != nil {
		t.Fatalf("failed to change working directory: %v", err)
	}
	t.Cleanup(func() { _ = os.Chdir(originalWd) })

	// 1) .env في مجلد التطبيق يُقرأ بغض النظر عن الوضع
	vars := loadEnvConfigFile(appDir, false)
	if vars["SUPABASE_URL"] != "https://app-dir.example" {
		t.Errorf("expected the app-dir .env to be honored, got %q", vars["SUPABASE_URL"])
	}

	// 2) بلا .env في مجلد التطبيق ومع تعطيل الارتداد (إنتاج) ⇒ لا شيء يُقرأ
	emptyAppDir := t.TempDir()
	if err := os.WriteFile(filepath.Join(cwdDir, ".env"), []byte("SUPABASE_URL=https://attacker.example\n"), 0o600); err != nil {
		t.Fatalf("failed to write cwd .env: %v", err)
	}
	if vars := loadEnvConfigFile(emptyAppDir, false); len(vars) != 0 {
		t.Errorf("expected the current-directory .env to be ignored in production, got %v", vars)
	}

	// 3) في وضع التطوير يُقرأ الاحتياطي من مجلد العمل
	devVars := loadEnvConfigFile(emptyAppDir, true)
	if devVars["SUPABASE_URL"] != "https://attacker.example" {
		t.Errorf("expected the current-directory fallback to be honored in dev mode, got %q", devVars["SUPABASE_URL"])
	}

	// 4) ملف بتنسيق صحيح: التعليقات والمسافات والعلامات المحيطة تُهذَّب
	if err := os.WriteFile(
		filepath.Join(emptyAppDir, ".env"),
		[]byte("# تعليق\n\nSUPABASE_ANON_KEY = \"quoted-value\" \nMODAL_AI_URL=\n"),
		0o600,
	); err != nil {
		t.Fatalf("failed to write parsed .env: %v", err)
	}
	parsed := loadEnvConfigFile(emptyAppDir, false)
	if parsed["SUPABASE_ANON_KEY"] != "quoted-value" {
		t.Errorf("expected quotes and spaces to be trimmed, got %q", parsed["SUPABASE_ANON_KEY"])
	}
	if _, ok := parsed["# تعليق"]; ok {
		t.Error("expected comment lines to be skipped")
	}
}
