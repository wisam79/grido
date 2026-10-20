---
type: refactor
scope: ui
related_files:
  - frontend/src/components/ui/blocks/fluent-section.tsx:59
  - frontend/src/components/ui/blocks/fluent-slider-field.tsx:176
  - frontend/src/components/editor/properties/slot-properties.tsx:237
  - frontend/src/components/editor/properties/panels/image-properties.tsx:560
  - frontend/test/ui-compliance.test.ts:120
---
فكّ تكدّس عمود المفتش: فاصل أقوى يقود كل مجموعة (12px أسفله و18px فوقه)، وكشف تدريجي يطوي المجموعات المتقدمة (أبعاد الطباعة، تعبئة الخلايا، خلفية الصورة، تكبير الصورة)، وإزالة 29 أيقونة صفّية مكرّرة للتسمية مع توسيع عمود تسمية السلايدر إلى 80px، مع حارس آلي يمنع عودة حشر الأيقونات.
