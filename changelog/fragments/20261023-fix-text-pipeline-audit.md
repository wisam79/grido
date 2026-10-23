---
type: fix
scope: canvas
related_files:
  - frontend/src/components/editor/properties/element/tabs/arrange-tab.tsx:233
  - frontend/src/components/editor/properties/panels/text/text-color-tab.tsx:135
  - frontend/src/components/editor/properties/panels/text/text-type-tab.tsx:96
  - frontend/src/lib/io/fonts.ts:500
  - frontend/src/lib/export/export-canvas.ts:43
  - frontend/src/lib/export/export-canvas-fitted.ts:40
  - frontend/src/hooks/use-filter-cache.ts:48
  - frontend/src/components/editor/properties/color-wheel.tsx:25
  - frontend/src/lib/canvas/curved-text-utils.ts:305
  - frontend/src/components/editor/properties/layers-list.tsx:579
  - internal/service/print_image_pipeline.go:342
  - internal/server/asset_server.go:271
---
إصلاح ملاحظات تدقيق منظومة النصوص واختناقات الأداء والذاكرة: تعطيل تعديل الارتفاع `H` يدوياً لعناصر النص في تبويب «ترتيب» وتحويل النص إلى `fixed` مع تصفير `textResizeAnchor` عند تعديل العرض `W` رقمياً أو مقاييس الخط من لوحة الخصائص، وإزالة تكرار حقول ألوان النص وحذف المكوّن الميت `TextProperties`، وانتظار جاهزية خطوط عناصر النص (`ensureElementsFontsLoaded`) قبل التصدير. كما جرى حصر إبطال كاش الفلاتر بالعنصر المعدّل فقط (`draggingFilterId`)، وفصل المعاينة الحية عن تسجيل التراجع (`onCommit`) في عجلة الألوان، وتخزين تخطيط الحروف المنحنية مؤقتاً مع تعطيل رسم Hit المزدوج للنصوص، واستبدال البحث التربيعي في قائمة الطبقات ولوحة الخصائص بفهارس `Map`/`Set`، وفرض ميزانية بايتات على كاش صور الطباعة الخام في Go مع نسخ ملفات CMYK مباشرة من القرص دون سحبها وإعادة رفعها عبر الذاكرة.
