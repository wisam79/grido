---
type: fix
scope: ui
related_files:
  - frontend/src/hooks/use-workspace-panels.ts:19
  - frontend/src/components/ui/switch.tsx:17
  - frontend/src/components/editor/panels/collage/collage-custom-grid-tab.tsx:340
  - frontend/src/components/ui/blocks/fluent-slider-field.tsx:317
  - frontend/src/components/editor/canvas/canvas-rulers.tsx:99
  - frontend/src/components/editor/canvas/canvas-scrollbars.tsx:392
  - frontend/src/components/editor/canvas/canvas-viewport-deck.tsx:483
  - frontend/src/components/editor/canvas/ruler.tsx:138
  - frontend/src/components/editor/properties/layers-list.tsx:686
  - frontend/src/components/ui/dialog.tsx:97
  - frontend/src/index.css:548
  - frontend/test/ui-compliance.test.ts:239
  - frontend/test/use-workspace-panels.test.ts:116
---
إغلاق ملاحظات المراجعة البصرية رقم 21 (P1/P2/P3): طي درج القوالب افتراضياً تحت 1200px لضمان كانفاس ≥ 660px عند 1024px، وتوحيد تباين أزرار الإجراء النصية البيضاء عبر `bg-primary-action` (5.17:1) مع حارس امتثال آلي، وتوسيع جميع الأهداف التفاعلية الصغيرة إلى ≥ 24×24px، وإزالة إطار التركيز الأزرق عن حاويات الحوارات (`[tabindex="-1"]`)، ورفع أرضية خط المساطر إلى 9px، وإضافة سطر إرشادي لحالة الطبقات الفارغة، وتوحيد الأرقام الغربية في التواريخ (`ar-EG-u-nu-latn`).
