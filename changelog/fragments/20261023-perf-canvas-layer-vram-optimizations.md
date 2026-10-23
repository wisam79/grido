---
type: perf
scope: canvas
related_files:
  - frontend/src/components/editor/konva/konva-canvas.tsx:560
  - frontend/src/components/editor/konva/layers/konva-background-layer.tsx:67
  - frontend/src/hooks/use-filter-cache.ts:74
  - frontend/src/components/editor/canvas/ruler.tsx:194
  - frontend/src/components/editor/canvas/use-canvas-viewport.ts:184
  - frontend/src/components/editor/konva/elements/image-node.tsx:124
  - frontend/src/components/editor/konva/layers/konva-collage-layer.tsx:50
  - frontend/src/components/editor/konva/layers/konva-single-layer.tsx:120
---

إصلاح 6 معرقلات أداء رئيسية في محرك الكانفاس لتقليص استهلاك VRAM ورفع سلاسة العرض: دمج طبقات الخلفية الساكنة الأربعة (ظل الورقة، التعبئة/التدرج، الشبكة، الأعمدة) في طبقة واحدة موحدة بحفظ 6 بافرات كانفاس كاملة، تصحيح حساب مقياس العرض في `useFilterCache` بالاعتماد المباشر على `stage.scaleX()` لمنع تضخم الكاش إلى 2.5×، كاش مراجع عناصر DOM للمساطر وعصي التمرير في `useCanvasViewport` مع تحويل حتمي لمجموعتي `#h-ruler-content` و`#v-ruler-content` في `ruler.tsx`، اعتماد السحب خالي الظلال `withShadowlessDrag` في `URLImage` وإلغاء `isDragLifted` useState، عزل حالة مرور الفأرة في مكوّن `CollageEmptySlotPlaceholder` لمنع إعادة تصيير طبقة الكولاج بالكامل، وتصحيح استبعاد العناصر المدوّرة خارج الكانفاس بمراعاة نسبة الأبعاد عبر `getElementVisualBox`.
