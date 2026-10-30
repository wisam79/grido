---
type: fix
scope: canvas
related_files:
  - frontend/src/lib/store/slices/collage-slice.ts:501
  - frontend/src/lib/canvas/collage-geometry.ts:171
  - frontend/src/hooks/use-filter-cache.ts:154
  - frontend/src/lib/export/export-primitives.ts:17
  - frontend/src/lib/export/export-canvas-collage.ts:165
  - frontend/src/components/editor/print/print-payload-builder.ts:113
  - frontend/src/features/freeform-collage/components/freeform-collage-modal.tsx:679
  - internal/service/print_image_pipeline.go:745
  - internal/service/print_compose.go:191
---
إصلاحات مراجعة الكولاج: انتقال originalImageSrc مع صورته في التعبئة الجماعية، فاصل مجاور يتبع الفعلي المخبوز بعد التصغير، حد 1مم للمقاس المرئي في الستور، تراجع ذري لحركات الأسهم في المحرر الحر مع سحب جماعي متسق وحفظ خيارات Apply، إبطال كاش الفلاتر عند تغيّر القص، أبعاد رسم محلية موحّدة لربع الدورة بين Konva والتصدير وGo، ورسم خلفية/إطار الخانات المزخرفة بلا صورة في كل المخرجات.
