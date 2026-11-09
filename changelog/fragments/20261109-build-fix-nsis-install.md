---
type: fix
scope: build
related_files:
  - .github/workflows/release.yml:190
---

إصلاح خطأ تثبيت مترجم NSIS في سير عمل النشر عبر إزالة معامل `--retry` غير المدعوم في Chocolatey وتأمين الخطوة بـ `try/catch` وإعادة ضبط رمز الخروج.
