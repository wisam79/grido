---
type: fix
scope: canvas
related_files:
  - frontend/src/features/freeform-collage/components/freeform-canvas-editor.tsx:88
  - frontend/src/features/freeform-collage/lib/slots/slot-align.ts:143
  - frontend/src/lib/store/slices/collage-slice.ts:403
  - frontend/src/lib/export/export-primitives.ts:87
  - frontend/src/components/editor/konva/elements/collage-image.tsx:200
  - internal/service/print_image_pipeline.go:1001
  - frontend/src/lib/print/preview-pan.ts:31
  - frontend/src/features/freeform-collage/lib/slots/slot-pack.ts:139
  - frontend/src/lib/schema.ts:270
  - frontend/src/lib/io/project-hydrator.ts:220
  - frontend/src/components/editor/print/print-pixel-preview.ts:90
  - frontend/src/components/editor/print/print-preview.tsx:80
  - internal/core/domain/print.go:30
  - internal/service/print_service.go:255
---
إصلاح قفل النسبة المطبّع في الكولاج الحر، وفصل التداخلات عند الحواف (`resolveOverlaps`)، ومنع إعادة إزاحة الجيران في الدومينو (`tryDisplaceOverlappingCells`)، وتوحيد تمركز التكبير في المحورين (`KonvaCollageImage` + `computeSlotCrop` + `computeCropFromSlot` + `test-fixtures/print-crop-golden.json`) مع حفظ توافق المشاريع القديمة عبر `cropMode` (`legacy` مقابل `centered`)، وتقييد وتطبيع `zoom` ضمن `[1..3]` في المخطط والهيدريشن و`validatePrintItem`، وخبز القص الفعلي (`zoom`/`dragX`/`dragY`/`rotation`/`cropMode`) في `renderPixelFilterPreview` ومطابقة سحب معاينة الطباعة (`computeSlotPreviewPan` عبر `objectPosition` وتدوير/قلب متجه الإزاحة حتى عند `zoom = 1`)، وتطبيق `marginMM` وتوحيد وسم/مقاس `4×6` سم مقابل `10×15` سم في `slot-pack.ts` و`mixed-presets.ts` و`collage-templates.ts`.
