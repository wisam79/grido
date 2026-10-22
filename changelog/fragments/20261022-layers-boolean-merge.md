---
type: feat
scope: canvas
related_files:
  - frontend/src/lib/store/slices/element/merge.ts:85
  - frontend/src/lib/canvas/path-boolean.ts:1
  - frontend/src/components/editor/panels/freeform/freeform-layers-tab.tsx:304
  - frontend/src/lib/export/export-canvas-fitted.ts:325
  - frontend/src/components/editor/properties/layers-list.tsx:410
---

نظام طبقات احترافي: دمج منطقي متجهي (اتحاد/طرح/تقاطع/استثناء) عبر `path-bool` يُنتج طبقة مسار واحدة قابلة للتحرير، وتسطيح أي تحديد مختلط إلى صورة واحدة، وإعادة تسمية الطبقات وخطوة ترتيب واحدة، مع توحيد حدود مسارات `svgPath` بين Konva والتصدير بدقة الطباعة.
