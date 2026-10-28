---
type: refactor
scope: ui
related_files:
  - frontend/src/features/freeform-collage/components/freeform-collage-modal.tsx:1
  - frontend/src/features/freeform-collage/components/freeform-canvas-editor.tsx:1
  - frontend/src/features/freeform-collage/components/freeform-left-tools-panel.tsx:1
  - frontend/src/features/freeform-collage/components/freeform-right-inspector-panel.tsx:1
  - frontend/test/freeform-editor.test.tsx:1
  - frontend/src/components/editor/dialogs/print-dialog.tsx:1
  - frontend/test/print-dialog-backstage.test.tsx:1
---
إعادة تصميم محرر الكولاج الحر بلوحة واحدة للإدراج والتعبئة والخصائص، ومساحة هندسية مرقمة مع تكبير وملاءمة وتدوير الورقة، وحفظ وتطبيق في الترويسة.
فصل اختيار التعبئة عن تنفيذها، وعزل أسهم التبويبات والقوائم عن تحريك الخلايا، وإتاحة استعادة المقاس؛ دون تعديل محرك الطباعة أو حفظ الصور. وُثّق قيد إغلاق المضيف عند الانتقال بين عرضَي سطح المكتب والهاتف.
تحسين حوار الطباعة بأقسام مسطّحة وملاءمة تقيس محورَي المعاينة وتعمل بعد تركيب بوابة الحوار، مع إزالة تكرار بيانات الورقة وشارة 1:1 وإظهار حالات الفراغ وتجاوز الحدود؛ عقود الطابعات والتصدير باقية.
