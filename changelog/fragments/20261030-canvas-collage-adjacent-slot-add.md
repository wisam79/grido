---
type: feat
scope: canvas
related_files:
  - frontend/src/App.tsx:441
  - frontend/src/index.css:794
  - frontend/src/components/editor/toolbar/toolbar.tsx:48
  - frontend/src/components/editor/toolbar/toolbar-file-ops.tsx:235
  - frontend/src/components/editor/toolbar/toolbar-history-tools.tsx:16
  - frontend/src/components/editor/toolbar/toolbar-selection-tools.tsx:95
  - frontend/src/components/editor/toolbar/toolbar-transfer-to-collage.tsx:117
  - frontend/src/components/editor/toolbar/toolbar-image-filters.tsx:59
  - frontend/src/components/editor/toolbar/toolbar-ai-tools.tsx:113
  - frontend/src/lib/canvas/collage-geometry.ts:62
  - frontend/src/lib/store/slices/collage-slice.ts:320
  - frontend/src/components/editor/properties/slot-properties.tsx:174
  - frontend/src/components/editor/properties/panels/image-properties.tsx:97
  - frontend/src/components/editor/properties/panels/shape-properties.tsx:136
  - frontend/src/components/editor/properties/panels/text/text-effects-tab.tsx:112
  - frontend/src/components/editor/properties/panels/text/text-type-tab.tsx:240
  - frontend/src/components/editor/properties/collage-settings.tsx:62
  - frontend/src/components/editor/panels/collage/collage-paper-tools-tab.tsx:79
  - frontend/src/components/editor/properties/general/grid-columns-panel.tsx:214
  - frontend/src/features/stickers/components/sticker-properties.tsx:430
  - frontend/src/components/editor/konva/layers/konva-collage-layer.tsx:196
  - frontend/src/components/editor/canvas/canvas-quick-bar.tsx:82
  - frontend/src/components/editor/konva/elements/editor-transformer.tsx:353
  - frontend/src/lib/canvas/transform-anchors.ts:44
  - frontend/src/lib/canvas/konva-export-utils.ts:167
  - frontend/src/lib/templates/constants.ts:186
  - frontend/src/lib/schema.ts:350
  - frontend/src/lib/store/history-snapshot.ts:145
  - frontend/src/components/editor/panels/freeform/freeform-layers-tab.tsx:230
  - frontend/src/components/editor/properties/layers-list.tsx:216
---
إضافة أزرار (+) التفاعلية حول الخلية المحددة في الكانفاس الرئيسي لوضع الكولاج لإدراج خلية مجاورة مباشرة بنفس المقاس الفيزيائي، وتعيين التباعد الافتراضي لخلايا الكولاج إلى 2 مم والهوامش الافتراضية إلى 3 مم، وترقية نظام الإزاحة الذكية للحفاظ على الفجوات في السلاسل المتعددة ودعم تكبير خلايا الحواف للداخل وتعميم المقاس مع الإزاحة التلقائية، وإزاحة الشريط السريع العائم في وضع التعديل الحر لتفادي تغطية مقبض التدوير، وإصلاح تدوير النصوص ليكون حول منتصف العنصر بدقة، وإعادة هيكلة وتصميم شريط العنوان وشريط الأدوات العلوي وتبويب الطبقات وخصائص الخلية وتوحيد جميع منزلقات التحكم في التطبيق بالعرض الكامل وفق الهوية البصرية لـ Fluent 2.
