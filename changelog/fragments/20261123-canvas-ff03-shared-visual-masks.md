---
type: feat
scope: canvas
related_files:
  - frontend/src/lib/canvas/mask-geometry.ts:1
  - frontend/src/lib/store/types.ts:113
  - frontend/src/lib/schema.ts:226
  - frontend/src/components/editor/konva/elements/image-node.tsx:178
  - frontend/src/lib/export/export-canvas-fitted.ts:101
  - frontend/src/components/editor/properties/panels/image-properties.tsx:768
  - frontend/test/image-mask-geometry.test.tsx:1
---
تطبيق `FF-03`: توحيد هندسة أقنعة الصور في مصدر نقي واحد لـ Konva والتصدير ومعاينات المنتقي، وتوسيع الخيارات إلى طبيعي ودائري وقوس وسداسي وماسة وقلب ونجمة وختم مزخرف مع توافق الحفظ والتراجع.
ضمان القناع بعد الفلاتر البكسلية والخلفية داخل القناع قبل ظل واحد، وإبطال كاش الاستدارة الفعلية، مع تحقق هندسي عند 300/600 DPI وحماية المصدر الكامل أثناء الالتقاط.
