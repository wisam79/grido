---
type: fix
scope: ui
related_files:
  - frontend/src/App.tsx:65
  - frontend/src/components/ui/blocks/fluent-slider-field.tsx:265
  - frontend/src/components/editor/properties/element-properties.tsx:60
  - frontend/src/components/editor/panels/collage/collage-custom-grid-tab.tsx:355
  - frontend/src/components/editor/properties/collage-settings.tsx:140
  - frontend/src/components/editor/toolbar/toolbar.tsx:125
---

- **مزامنة الألواح الجانبية (`frontend/src/App.tsx`):** توحيد حساب `isTemplatesOpen` و`isPropertiesOpen` مع `WorkspaceLayout` عبر شاشات سطح المكتب القياسية والواسعة لضمان دقة أزرار الهيدر والفتح التلقائي للمفتش عند التحديد.
- **ثبات المحاور العمودية وتوحيد المنزلقات (`frontend/src/components/ui/blocks/fluent-slider-field.tsx`، `image-properties.tsx`، `shape-properties.tsx`، `element-properties.tsx`):** تثبيت محور مسارات التمرير وحقول القيم في `FluentSliderField` وتوحيد التخطيط الأفقي (`layout="inline"`) وتبويبات المفتش (`variant="tabs"`) بين وضعي الكولاج والتعديل الحر.
- **التناسب الهندسي وإزالة التكرار في الكولاج (`collage-custom-grid-tab.tsx`، `collage-settings.tsx`، `collage-paper-tools-tab.tsx`، `slot-properties.tsx`):** موازنة ارتفاع مصفوفة المحاذاة (`72px`) مع أزرار التخطيط السريع، وتأطير بطاقات مقاس الصورة، ومحاذاة مفتاحي خطوط القص عمودياً، وإزالة قسم الإرشادات المكرر من تبويب الورقة، وإضافة فلاتر الصور السريعة لخصائص الخلية.
- **توحيد لغة المكونات والهرمية البصرية وإلغاء تكرار مؤشرات AI (`grid-columns-panel.tsx`، `freeform-text-tab.tsx`، `toolbar.tsx`، `toolbar-ai-tools.tsx`، `image-properties.tsx`):** اعتماد `FluentSettingRow` و`FluentSliderField` في إعدادات الشبكة والأعمدة، وتوحيد ارتفاع زر إضافة النص (`h-8`)، وإبراز زر الطباعة في الشريط العلوي، ودمج مؤشرات تقدم عمليات الذكاء الاصطناعي الأربعة المتزامنة في مؤشر موضعي واحد داخل الزر النشط دون قفز عمودي أو لافتات عائمة مكررة.

