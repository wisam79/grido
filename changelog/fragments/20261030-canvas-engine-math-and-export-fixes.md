---
type: fix
scope: canvas
related_files:
  - frontend/src/lib/canvas/konva-export-utils.ts:160
  - frontend/src/components/editor/konva/elements/image-node.tsx:280
  - frontend/src/hooks/use-konva-drag.ts:80
  - frontend/src/components/editor/konva/elements/collage-image.tsx:210
  - frontend/src/components/editor/konva/layers/konva-single-layer.tsx:75
  - frontend/src/components/editor/canvas/text-editing-overlay.tsx:90
---

- **إصلاح ترتيب ترقية الدقة وتحجيم القص في `captureStageBlob` (`frontend/src/lib/canvas/konva-export-utils.ts`):** تنفيذ `upgradeImagesToFullResolution` قبل `upgradeCachesForExport` وعكس الترتيب عند الاستعادة ليُخبز كاش الفلاتر من الصورة الأصلية الكاملة، مع تحجيم إحداثيات القص (`cropX/cropY/cropWidth/cropHeight`) بالتناسب بين نسخة العرض (2048px) والأصل ثم استعادتها بعد الالتقاط.
- **توحيد قص `object-fit: cover` للصور في الوضع الحر (`frontend/src/components/editor/konva/elements/image-node.tsx`):** حساب مستطيل قص مركزي (`coverCrop`) على الصورة المعروضة في `URLImage` لمطابقة `drawImageCover` في مسار التصدير اليدوي (`frontend/src/lib/export/export-canvas-fitted.ts`) ومنع مطّ الصور عند التحجيم بمقابض الجوانب.
- **تماسك السحب الجماعي عند حواف الكانفاس (`frontend/src/hooks/use-konva-drag.ts`):** حساب الصندوق البصري الموحّد (Composite AABB) لكافة العناصر المحددة القابلة للتحريك في `onDragStart` وتقييده ككتلة صلبة واحدة في `dragBoundFunc` مع تحريك التابعين بنفس الإزاحة `(dx, dy)` في `onDragMove`.
- **توحيد استعادة كاش الفلاتر في الكولاج (`frontend/src/components/editor/konva/elements/collage-image.tsx`):** استدعاء `recacheFilters(true)` من `useFilterCache` عند انتهاء السحب لاحترام مقياس المسرح وسقف الذاكرة `MAX_CACHE_PIXELS`.
- **تحسين استبعاد العناصر خارج الورقة ودقة التدرج الشعاعي النصي:** ضبط هامش الـ Viewport Culling في `frontend/src/components/editor/konva/layers/konva-single-layer.tsx` مع مراعاة الظلال، واحتساب `fillRadialGradientStartRadius` في `frontend/src/components/editor/canvas/text-editing-overlay.tsx`.

