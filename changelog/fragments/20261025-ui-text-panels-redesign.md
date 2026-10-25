---
type: feat
scope: ui
related_files:
  - frontend/src/components/editor/panels/freeform/freeform-text-tab.tsx:1
  - frontend/src/components/editor/properties/panels/text/text-type-tab.tsx:1
  - frontend/src/components/editor/properties/panels/text/text-effects-tab.tsx:1
  - frontend/src/components/editor/properties/panels/text/text-controls.tsx:1
  - frontend/src/components/editor/properties/panels/text/font-size-field.tsx:1
  - frontend/src/components/editor/properties/panels/text/font-size-utils.ts:1
  - frontend/src/components/editor/workspace/workspace-layout.tsx:1
  - frontend/src/components/editor/canvas/use-stable-viewport-size.ts:1
  - frontend/src/index.css:695
  - frontend/src/lib/templates/text-effects.ts:1
  - frontend/src/lib/templates/text-presets.ts:1
  - frontend/test/text-effects-catalog.test.ts:1
  - frontend/test/use-stable-viewport-size.test.tsx:1
---

تطوير وتحديث واجهة تبويب النصوص ولوحة الخصائص، وإصلاح حركة ظهور وطي الألواح الجانبية حول الكانفاس: معاينة بصرية حية للأنماط الطباعية بخطوطها وأوزانها الفعلية، حقل رقمي لحجم الخط مع أزرار لسلم الطباعة (6-500px)، خلايا تأثيرات بصرية (Effect Tiles) للظلال والخلفيات والتقويس، وترقية حركة الألواح الجانبية لمنحنى Fluent 2 الزنبركي (200ms) مع محاذاة انزلاق المحتوى وربط مقاس الكانفس بـ requestAnimationFrame لإلغاء القفزة المتأخرة السابقة (140ms settle lag).
