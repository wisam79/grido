---
type: fix
scope: ui
related_files:
  - frontend/test/toolbar-height-uniformity.test.ts:23
  - frontend/src/components/editor/toolbar/toolbar.tsx:73
---
استثناء الحاوية الجذرية لشريط الأدوات (`h-10` بارتفاع 40 بكسل) في اختبار `toolbar-height-uniformity.test.ts` حتى لا يُعتبر ارتفاع الحاوية زراً شاذاً، مع استمرار التحقق الصارم من توحيد جميع أزرار الأدوات على ارتفاع `h-8` (32 بكسل).
