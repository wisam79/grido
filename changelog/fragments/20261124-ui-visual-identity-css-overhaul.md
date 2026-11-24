---
type: fix
scope: ui
related_files:
  - frontend/src/index.css:36
  - frontend/src/index.css:317
  - frontend/src/index.css:982
  - frontend/src/App.tsx:255
  - frontend/src/components/editor/system/grido-brand-mark.tsx:9
  - frontend/src/components/editor/system/startup-splash.tsx:66
  - frontend/src/bootstrap.ts:5
  - main.go:303
  - frontend/src/components/ui/sonner.tsx:24
  - frontend/test/ui-compliance.test.ts:491
---
توحيد الهوية البصرية والشعار وألوان العلامة (`GRIDO_BRAND_GEOMETRY`) عبر المحرر وصفحة الهبوط، وإزالة وميض الثيم والأصل غير المستورد، وإصلاح ربط `--color-destructive-foreground` وتباين WCAG AA وتنظيف الكود الميت وتصفير الألوان الخام في `frontend/src/index.css` و25 ملفاً.
