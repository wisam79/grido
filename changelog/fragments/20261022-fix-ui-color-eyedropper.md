---
type: fix
scope: ui
related_files:
  - frontend/src/components/editor/properties/color-panel.tsx:165
  - frontend/src/components/editor/properties/color-panel.tsx:250
  - frontend/test/color-panel.test.tsx:45
---
إصلاح جذري لقطارة الألوان (EyeDropper): حماية نافذة المنبثق (Popover) من الإغلاق الفجائي عند النقر خارجها لسحب اللون عبر حظر `onPointerDownOutside` و`onInteractOutside` و`onFocusOutside` أثناء تفعيل القطارة، مع بناء قطارة كانفاس تفاعلية داخلية (`activateInAppSampler`) تقرأ بكسلات طبقات الكانفاس مباشرة وتعمل كبديل فوري ومضمون 100% في حال تعذر أو رفض المتصفح/WebView2 فتح القطارة الشاملة، مع تغذية بصرية وإشعارات واضحة.
