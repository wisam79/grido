---
type: removed
scope: print
related_files:
  - frontend/src/lib/export/export-canvas.ts:20
  - frontend/src/lib/export/export-slot.ts:100
  - frontend/src/lib/export/export-image.ts:1
  - frontend/src/components/editor/toolbar/toolbar-transfer-to-collage.tsx:50
  - frontend/test/toolbar-transfer-to-collage.test.tsx:80
---
إزالة العلامة المائية للخطة المجانية من كل مسارات التصدير: حُذف `export-watermark.ts` وتوصيلاته في `exportCanvas` و`exportSlotCanvas`، وبسّط زر «تكرار في الكولاج» نداءه بلا خيار `watermark`. لم تتغير بوابة الترخيص لميزات AI وإزالة الخلفية، و«قالب النص المائي» في محرر النصوص ميزة تصميم مستقلة بقيت كما هي.
