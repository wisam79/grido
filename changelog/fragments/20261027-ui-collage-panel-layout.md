---
type: refactor
scope: ui
related_files:
  - frontend/src/components/editor/panels/collage/collage-custom-grid-tab.tsx:263
  - frontend/src/components/editor/properties/slot-properties.tsx:436
  - frontend/src/components/ui/blocks/fluent-section.tsx:56
  - frontend/src/components/editor/toolbar/toolbar.tsx:76
  - frontend/src/components/editor/workspace/workspace-layout.tsx:135
  - frontend/test/fluent-blocks.test.tsx:68
  - frontend/test/collage-custom-grid-tab.test.tsx:144
---
توحيد كثافة مساحة العمل وتخفيف الحدود ووزن العناوين، مع ضغط شريطي الأدوات والحالة دون تصغير النصوص أو تغيير هندسة الكانفاس. نقل زري ملء الورقة والشريط العلوي مقابل مصفوفة المحاذاة، وتنظيم خصائص الخلية بمنزلقات ألوان أفقية وحذف أدوات العمود الأيمن المتكررة في الشريط العائم واختصار الإرشادات إلى تلميحات، مع الحفاظ على الوظائف غير المكررة.
