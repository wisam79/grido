---
type: feat
scope: ui
related_files:
  - frontend/src/components/editor/properties/slot-properties.tsx:515
  - frontend/src/components/editor/toolbar/toolbar-selection-tools.tsx:30
  - frontend/src/components/editor/toolbar/toolbar.tsx:84
  - frontend/src/components/editor/toolbar/toolbar-file-ops.tsx:120
  - frontend/src/components/editor/dialogs/crop-dialog.tsx:168
  - frontend/test/toolbar-height-uniformity.test.ts:52
---

إعادة هيكلة لوح خصائص الخلية (SlotProperties) ليعتمد نظام التبويبات القياسي الثلاثي الرشيق من Fluent 2 (تنسيق، ضبط، تأثير) مع تقديم بطاقة الصورة وأدوات الذكاء الاصطناعي في صدارة تبويب التنسيق (Content-First UX) تليها بطاقة مقاس الخلية، واستعادة شريط تمرير تكبير الصورة داخل الخلية (Zoom Slider 100%-300%) المفقود مع دعم التراجع الذري، وموازنة شبكة أدوات الصورة (صف متكافئ ثنائي لـ «قص» و«توسيط»، وصف متكافئ ثلاثي لـ «تدوير» و«أفقي» و«عمودي») مع اختصار العناوين والتسميات إلى كلمات مفردة دالة، وإزالة قسم توزيع الصورة المكرر لمنع ظهور شريط التمرير والحفاظ على كثافة بصرية نظيفة وهادئة، مع إزالة أزرار الذكاء الاصطناعي من شريط الأدوات العلوي لتحقيق واجهة هادئة وأيقونية خالصة وموحدة الأبعاد (h-8 w-8). وإصلاح سلوك إغلاق حوار القص (CropDialog) تلقائياً وفورياً بمجرد ضغط المستخدم على زر تطبيق القص بنجاح.
