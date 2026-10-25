---
type: fix
scope: ui
related_files:
  - frontend/src/lib/workspace-tools.ts:295
  - frontend/src/hooks/use-workspace-panels.ts:47
  - frontend/src/hooks/use-keyboard-shortcuts.ts:93
  - frontend/test/workspace-tools.test.ts:154
  - frontend/test/editor-store.test.ts:141
---

تحسين تجربة مساحة العمل واللوحة اليسرى: استقرار تخطيط مساحة العمل وعتبة التخطيط القياسية (Standard Layout عند 1440px) لحماية مساحة الكانفاس الواسعة (>600px)، وتصحيح حارس حذف العناصر في اختصارات لوحة المفاتيح بالتحقق من وجود عناصر حرة محددة فعلاً بدل حظر الحذف بـ mode.
