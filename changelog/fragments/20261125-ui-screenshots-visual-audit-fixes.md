---
type: fix
scope: ui
related_files:
  - frontend/src/components/editor/panels/freeform/freeform-text-tab.tsx:38
  - frontend/src/components/editor/panels/custom-collage-card.tsx:144
  - frontend/src/components/editor/panels/collage/collage-custom-grid-tab.tsx:139
  - frontend/src/components/editor/canvas/ruler.tsx:131
  - frontend/src/components/editor/panels/collage/collage-autofill-tab.tsx:43
  - frontend/src/components/editor/panels/collage/collage-paper-tools-tab.tsx:152
  - frontend/src/hooks/use-workspace-panels.ts:311
  - frontend/src/components/editor/properties/general/canvas-dimensions-panel.tsx:422
  - frontend/src/components/editor/properties/general/grid-columns-panel.tsx:313
  - frontend/src/components/editor/properties/color-panel.tsx:127
  - frontend/src/components/editor/properties/shared-controls.tsx:224
  - frontend/src/components/editor/panels/properties-panel.tsx:111
  - frontend/src/components/editor/panels/panel-shell.tsx:105
  - frontend/src/components/editor/workspace/workspace-panel-rail.tsx:187
  - frontend/src/components/ui/blocks/fluent-capsule-button.tsx:52
  - frontend/src/components/ui/blocks/fluent-segmented-control.tsx:168
  - frontend/src/components/ui/blocks/fluent-slider-field.tsx:332
  - frontend/src/components/ui/slider.tsx:65
  - frontend/src/components/ui/scroll-area.tsx:38
---
إصلاح عيوب التصميم والمحاذاة البصرية المرصودة عبر لقطات المحرر السبع: معالجة قص قوس معاينة «ختم» ودوران «علامة مائية» في تبويب النصوص، ومزامنة نوع التمدد الحر ومصفوفة المحاذاة (`28×28px`) في شبكة الكولاج، وحجب تداخل أرقام المسطرة عند الزاوية `MM` والحافة السفلية، ونقل تذييل تعبئة الخانات إلى `PanelFooterPortal` مع رفع تباين شارة الصور المعلقة، وتوحيد مبدّل «وضع التكرار» وعدّاد النسخ وحدث فتح الخصائص في «الورق والقص»، وصقل لوحة «إعدادات الورقة» (دمج تسميتي العرض والارتفاع داخل الحقول، إعادة تصميم `ColorField` بكود HEX وعينات متقاربة دون شارة متداخلة، توحيد صف التدرج ومبدّل نمط الشبكة، وترقية `Slider` والتبويبات ومؤشر الشريط الجانبي وكبسولات شريط الحالة).
