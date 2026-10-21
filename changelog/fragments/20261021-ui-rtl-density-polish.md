---
type: fix
scope: ui
related_files:
  - frontend/src/hooks/use-workspace-panels.ts:344
  - frontend/src/components/ui/slider.tsx:20
  - frontend/src/components/editor/properties/layers-list.tsx:313
  - frontend/src/components/editor/properties/element/tabs/arrange-tab.tsx:83
  - frontend/src/components/editor/panels/collage/collage-custom-grid-tab.tsx:262
  - frontend/src/components/editor/panels/freeform/freeform-elements-tab.tsx:469
  - frontend/src/components/editor/properties/panels/text/text-font-selector.tsx:333
  - frontend/src/components/editor/panels/panel-shell.tsx:91
  - frontend/src/index.css:111
---
جولة صقل RTL والكثافة: (1) صار Ctrl+K يفتح لوحة الأدوات الحقيقية في compact بعد تصحيح دلالة وضع Zen التي كانت تحجب تركيب `CompactToolLauncher`. (2) صارت المنزلقات RTL افتراضياً مع مسار ونطاق ومقبض أوضح في الوضعين، بعد التحقق من هندسة التعبئة من اليمين. (3) نُقل تكرار وحذف الطبقة إلى قائمة «المزيد» فتحرر اسم الطبقة عند 288px مع بقاء كل الإجراءات بنقرة واحدة. (4) رُفعت التسميات الوظيفية الميكرو إلى 11px في ألواح الخصائص والدرج، مع توثيق استثناء شارات الأعداد/النسب وkbd وحدها. (5) رُتّبت أزرار المحاذاة يمين←وسط←يسار وصُحّحت فروقات أسهم مصفوفة `dir="ltr"`. (6) أُزيل التمرير المتداخل من ست قوائم ليبقى PanelShell مصدر التمرير الوحيد، مع إبقاء تمرير الـ Popover المستقل. (7) وُحّدت توكنز Fluent 2 فاستُبدلت الألوان الخام بدلالات `warning/success/info` وأُزيلت حدود `dark:border-white/*` واستُبدل `left` بـ`start`.
