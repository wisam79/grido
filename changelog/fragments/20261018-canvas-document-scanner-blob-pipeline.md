---
type: perf
scope: canvas
related_files:
  - frontend/src/components/editor/document-scanner/core/target-dims.ts:15
  - frontend/src/components/editor/document-scanner/hooks/use-scanner-processor.ts:141
  - frontend/src/components/editor/document-scanner/document-scanner-dialog.tsx:35
  - frontend/src/components/editor/document-scanner/__tests__/target-dims.test.ts:1
  - frontend/src/lib/canvas/canvas-blob.ts:18
  - frontend/src/components/editor/properties/panels/image-properties.tsx:222
  - frontend/src/features/stickers/lib/svg-rasterizer.ts:1
  - docs/features-tracker.md:13
  - docs/DOCUMENTATION_MAP.md:103
---

مسار Blob-first لماسح المستندات: استُبدل Base64 في مساري الإدراج المفرد والمتعدد بتوليد Blob مباشرة من كانفاس الاستعدال عبر `canvasToBlob` وتسليمه للمستهلك، الذي يرفعه ثنائياً إلى خادم الوسائط عبر `uploadMediaBlob` (بلا Data URLs تتراكم في V8 Heap) مع تراجع تلقائي إلى Data URL في البيئات بلا مسارات أصلية، وحارس إلغاء/إغلاق بعد الترميز فلا يُسلَّم أي مستند بعد إغلاق النافذة. واستُخرجت وحدة `target-dims.ts` من داخل الـhook مع سقف البكسل الموحّد 50MP (`MAX_EXPORT_PIXELS`) بتقليص تدريجي يحفظ النسبة البصرية — كان `maxEdgeW` غير مسقوف فصورة فائقة الدقة قد تطلب كانفاس استعدال بنحو 69MP. ونُقلت `canvasToBlob`/`blobToDataUrl` إلى وحدة مشتركة `lib/canvas/canvas-blob.ts` (مستخدِم ثانٍ فعلي = إزالة التكرار) مع تحديث استيرادات الملصقات الأربعة.
