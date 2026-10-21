---
type: fix
scope: ui
related_files:
  - frontend/src/lib/canvas/collage-grid.ts:1
  - frontend/src/components/editor/panels/custom-collage-card.tsx:126
  - frontend/src/components/editor/panels/collage/collage-custom-grid-tab.tsx:216
  - frontend/src/components/ui/blocks/fluent-slider-field.tsx:257
  - frontend/src/components/editor/properties/collage-settings.tsx:58
  - frontend/src/lib/store/slices/core-slice.ts:31
  - frontend/src/lib/store/slices/history-slice.ts:225
  - frontend/src/components/editor/dialogs/projects-dialog.tsx:189
  - frontend/src/App.tsx:629
  - frontend/test/collage-grid.test.ts:1
---
إصلاحات دقة في الواجهة: (1) صارت شبكة الكولاج تُشتق من إحداثيات الخانات أو `physicalLayout` عبر `getTemplateGrid` بدل تعداد 4/6/8/9/12، فتُزامن أي شبكة منتظمة (مثل قالب الثلاثين صورة 6×5)، وشارة الحالة تعرض شبكة الكانفس الفعلية وتصرّح بـ«تغييرات غير مطبقة» عند اختلاف النموذج بدل ادعاء التطبيق. (2) أُضيف إلى `FluentSliderField` حقل رقمي قابل للتحرير (يقبل الأرقام العربية والكسور، ويقيّد بالمدى، ويدعم Enter/Escape/الأسهم) وزر إعادة تعيين يظهر فقط عند اختلاف القيمة عن الافتراضية؛ القيم المصاغة خاصة تبقى للعرض فقط. (3) عُرضت تباعدات الكولاج والهامش والاستدارة بالمليمتر المحسوبة من DPI الفعلي مع إبقاء التخزين بالبكسل. (4) صار شريط العنوان يعرض اسم المشروع ونقطة تعديل غير محفوظ، تُدار عبر `projectName`/`isDirty` وتُصفَّر عند الحفظ أو التحميل، مع الحفاظ على موضع أزرار النافذة في RTL كما هو.
