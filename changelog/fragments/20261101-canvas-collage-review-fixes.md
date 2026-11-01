---
type: fix
scope: canvas
related_files:
  - frontend/src/lib/store/slices/collage-slice.ts:451
  - frontend/src/lib/templates/grid-utils.ts:54
  - frontend/src/lib/export/export-primitives.ts:96
  - frontend/src/components/editor/konva/elements/collage-image.tsx:182
  - internal/service/print_image_pipeline.go:677
  - frontend/src/lib/print/preview-pan.ts:17
  - frontend/src/components/editor/print/print-preview.tsx:174
  - frontend/src/components/editor/konva/layers/konva-collage-layer.tsx:524
---
إصلاحات جولة مراجعة هندسة الكولاج والقصّ: عكس إزاحة الجيران على المسار الكامل (avail+gap) بدل avail وحدها فلا تُرفض تكبيرات صحيحة؛ حارس 1مم لمولّدات الشبكة الفيزيائية يضغط الفجوة بدل إنتاج خلايا مجهرية؛ تقييد نافذة القصّة النهائية بحدود الصورة في المسارات الثلاثة (Konva/تصدير يدوي/Go) بعد ربع الدوران مع pan محفوظ؛ تحويم ربع الدوران في معاينة الطباعة عبر مساعد مشترك؛ رسم خطوط القص فوق محتوى الخلايا مطابقةً لمسارات الطباعة؛ وإطار التحديد داخل قصّ الورقة بدل خارجه المُقتَص.
