---
type: fix
scope: canvas
related_files:
  - frontend/src/lib/canvas/fit.ts:226
  - frontend/test/canvas-fit.test.ts:380
---

استعادة وضع الملاءمة التلقائية `auto` كخيار افتراضي عند غياب التفضيل المخزن في `readStoredFitMode` بدل تثبيته على `height`، مما يعيد تفعيل ملاءمة العرض الذكية على الشاشات العريضة واجتياز عقد التخطيط `e2e/workspace-layout.spec.ts`.
