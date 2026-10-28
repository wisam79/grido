---
type: refactor
scope: ui
related_files:
  - frontend/src/components/editor/panels/custom-collage-card.tsx:313
  - frontend/src/components/editor/panels/collage/collage-arrange-tab.tsx:361
  - frontend/src/components/editor/panels/collage/collage-custom-grid-tab.tsx:359
  - frontend/src/components/editor/panels/collage/collage-presets-tab.tsx:82
  - frontend/src/components/editor/properties/collage-settings.tsx:62
  - frontend/src/components/editor/panels/properties-panel.tsx:50
  - frontend/src/App.tsx:77
  - frontend/e2e/collage-panels.spec.ts:12
---
تحسين هيكل ومظهر وضع الكولاج: تبويبات مسطّحة ثابتة مرتبطة بمحتواها وصولياً، وأقسام فرز بلا بطاقات متداخلة أو ظلال، ومخططات قوالب هندسية محايدة ومنزلقات خصائص مضغوطة وإيقاع موحد للوحات التعبئة والقص. إصلاح رابط «الإطار وخطوط القص» لفتح المفتش واختيار إعدادات الكولاج مع إلغاء تحديد الخلية، دون تعديل التخطيط الثلاثي أو محرك الرسم والطباعة.
