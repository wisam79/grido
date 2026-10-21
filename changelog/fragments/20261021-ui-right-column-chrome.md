---
type: refactor
scope: ui
related_files:
  - frontend/src/components/editor/panels/panel-shell.tsx:34
  - frontend/src/components/editor/panels/template-panel.tsx:38
  - frontend/src/App.tsx:652
  - frontend/src/components/editor/workspace/mobile-panels-sheet.tsx:32
  - frontend/src/components/editor/panels/freeform/freeform-layers-tab.tsx:134
  - frontend/src/components/editor/panels/collage/collage-paper-tools-tab.tsx:110
  - frontend/src/components/editor/properties/collage-settings.tsx:218
  - frontend/src/components/editor/panels/collage/collage-presets-tab.tsx:642
  - frontend/src/components/editor/panels/collage/collage-custom-grid-tab.tsx:311
  - frontend/src/components/editor/panels/freeform/freeform-backdrops-tab.tsx:449
  - frontend/src/components/editor/properties/slot-properties.tsx:223
---

تنظيف كروم العمود الأيمن: سهم طيّ يتبع جهة اللوح (يمين في Standard ويسار في Wide)، وإخفاء زر الطيّ الميت داخل ورقة compact، وإزالة رأس «لوحات العمل» وعنوان «العناصر» المكررين، وتسمية تبويب «القوالب» بـ«الأدوات» لأنه يحتضن أدوات الوضع الحر والكولاج معاً. أُزيلت أيضاً قيم مكررة داخل الألواح: هامش النزيف وعدد النسخ من ترويسة القسم (يظهران في عنصري التحكم تحتهما)، وحاوية ووصف «نهاية الطباعة على الورقة»، وعدّاد القوالب المحفوظة المكرر في مُشغّل الفئة، والحد الأقصى للصفوف/الأعمدة المكرر في كل عدّاد، وتكرار هدف التدرج في ترويسة «تدرجات جاهزة»، وقسم «التعبئة التلقائية» الذي يغلّف صفاً يحمل الاسم نفسه.
