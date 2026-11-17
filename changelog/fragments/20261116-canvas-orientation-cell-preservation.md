---
type: fix
scope: canvas
related_files:
  - frontend/src/lib/canvas/collage-geometry.ts:297
  - frontend/src/lib/store/slices/core-slice.ts:316
  - frontend/src/lib/store/slices/collage-slice.ts:789
  - frontend/src/components/editor/properties/general/canvas-dimensions-panel.tsx:66
  - frontend/src/components/editor/panels/custom-collage-card.tsx:297
  - frontend/src/components/editor/konva/elements/image-node.tsx:252
  - frontend/src/components/editor/properties/element/shared/shadow-glow-section.tsx:14
  - frontend/src/lib/export/export-canvas-fitted.ts:84
  - frontend/src/lib/store/slices/element/text-elements.ts:18
  - frontend/src/lib/workspace-tools.ts:749
  - frontend/src/components/editor/konva/layers/konva-overlay-layer.tsx:58
  - frontend/src/components/editor/konva/elements/editor-transformer.tsx:94
  - frontend/src/components/editor/konva/elements/text-node.tsx:317
  - frontend/src/components/editor/canvas/text-editing-overlay.tsx:418
  - frontend/src/components/editor/canvas/quick-bar/quick-bar-element-section.tsx:64
  - frontend/src/lib/workspace-tools.ts:246
  - frontend/src/components/editor/workspace/workspace-panel-rail.tsx:163
  - frontend/src/hooks/use-keyboard-shortcuts.ts:317
  - frontend/src/components/editor/panels/freeform/freeform-elements-tab.tsx:15
  - frontend/src/features/stickers/lib/composer-icons.ts:1
  - frontend/src/features/stickers/lib/stamp-composer-v2.ts:302
  - frontend/src/features/stickers/templates/composer_stamps.ts:138
  - frontend/src/features/stickers/components/sticker-design-tab.tsx:131
---
إصلاح تشوّه وانقلاب أبعاد خلايا الكولاج اليدوية والمخبوزة عند تبديل اتجاه الورقة (أفقي ↔ عمودي) وعزل قالب الوضع الحر (`template`) عن الكولاج، وإصلاح عدم عمل الظل على الصور في Konva والتصدير ولوحة الخصائص، وتحسين آلية إدراج النصوص ومربع التحديد والتفاعل البصري مع النص على الكانفاس، وتوحيد مدخل الملصقات في الشريط الجانبي لفتح «استوديو الملصقات» مباشرة مع دمج مركّب الأختام v2 ومحرك العمق واللمعان وإطار القص الأبيض مع 24 أيقونة متجهة بترخيص MIT.
