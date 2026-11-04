---
type: fix
scope: canvas
related_files:
  - frontend/src/lib/filters/custom-filters.ts:13
---
إصلاح فحص الأنواع (Typecheck) لمرشحات Konva المخصصة عبر التوصيف الدقيق لكائن `Konva.Factory` لضمان تسجيل دوال الجلب والتعيين `addGetterSetter` بدون أخطاء تصريف.
