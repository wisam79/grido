---
type: fix
scope: ui
related_files:
  - frontend/src/components/editor/toolbar/toolbar-image-filters.tsx:1
  - frontend/src/components/error-boundary.tsx:1
  - frontend/src/hooks/use-theme.ts:1
  - frontend/src/lib/selection-properties.ts:1
  - frontend/src/components/editor/konva/elements/image-node.tsx:1
  - frontend/src/features/stickers/lib/use-sticker-insert-actions.ts:1
  - admin-web/src/pages/PhoneCameraPage.tsx:1
  - frontend/src/components/editor/dialogs/print-dialog.tsx:721
  - frontend/src/components/ui/font-selector.tsx:193
  - frontend/src/features/freeform-collage/components/freeform-top-action-bar.tsx:222
---
مراجعة حملة التعديلات مقابل HEAD وإصلاح حلقة Zustand للفلاتر، مسح الحفظ التلقائي الحقيقي بتأكيد، ملكية النتائج المتأخرة، معاملات الإدخال والتراجع، ترتيب المجموعات والأقفال، ومطابقة الظلال والتعبئات والكاميرا والطباعة.
تفاصيل العيوب والأدلة ونتائج الاختبارات المنفردة وحدود التحقق في docs/reviews/27-change-campaign-audit-2026-11-20.md؛ لا تشغيل شامل أو E2E أو نشر أو قبول طابعة فعلية.
