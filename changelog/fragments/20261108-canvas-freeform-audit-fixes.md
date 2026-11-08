---
type: fix
scope: canvas
related_files:
  - frontend/src/components/editor/konva/drag-layer.ts:112
  - frontend/src/components/editor/konva/layers/konva-single-layer.tsx:125
  - frontend/src/components/editor/panels/freeform/freeform-elements-tab.tsx:233
  - frontend/src/components/editor/panels/freeform/freeform-layers-tab.tsx:109
  - frontend/src/components/editor/panels/freeform/freeform-text-tab.tsx:165
  - frontend/src/components/editor/properties/layers-list.tsx:689
  - frontend/src/components/editor/toolbar/toolbar-transfer-to-collage.tsx:81
  - frontend/src/hooks/use-keyboard-shortcuts.ts:608
  - frontend/src/hooks/use-konva-drag.ts:200
  - frontend/src/lib/canvas/element-geometry.ts:169
  - frontend/src/lib/export/freeform-preflight.ts:78
  - frontend/src/lib/print/single-print-composition.ts:135
  - frontend/src/lib/store/slices/core-slice.ts:215
  - frontend/src/lib/store/slices/element/clipboard.ts:104
  - frontend/src/lib/store/slices/element/crud.ts:217
  - frontend/src/lib/store/slices/element/selection.ts:88
---

إصلاحات تدقيق وضع التعديل الحر: استعادة الطبقات تصاعدياً لمنع فساد التكديس، مطابقة أقنعة القص بالمسار السريع، تثبيت المركز المرئي عند تحجيم العناصر المدوّرة ومنع اختفائها خارج الكانفاس، ذرية تراجع النقل للكولاج، تحييد القفل والإخفاء عند اللصق والتكرار، وتصفير محرر النصوص عند تبديل الوضع مع صقل مؤشرات الواجهة.
