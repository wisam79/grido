---
type: fix
scope: ui
related_files:
  - frontend/src/components/editor/panels/collage/collage-presets-tab.tsx:62
  - frontend/src/components/editor/panels/custom-collage-card.tsx:86
  - frontend/src/components/editor/panels/collage/collage-autofill-tab.tsx:246
  - frontend/src/components/editor/panels/collage/collage-paper-tools-tab.tsx:91
  - frontend/src/components/editor/panels/freeform/freeform-text-tab.tsx:64
  - frontend/src/components/editor/panels/freeform/freeform-elements-tab.tsx:273
  - frontend/src/components/editor/panels/freeform/freeform-layers-tab.tsx:230
  - frontend/test/collage-presets-tab.test.tsx:37
  - frontend/test/collage-autofill-tab.test.tsx:66
  - frontend/test/App.test.tsx:318
---
صقل تبويبات الشريط الجانبي في وضعي الكولاج والتعديل الحر: معاينات قوالب أكبر وأوضح، مدخل مختصر للمحرر الحر يعرض التخطيط المطبّق بدلاً من رسم افتراضي، وتعبئة مضغوطة بخانات فارغة واضحة ودليل حالات شرطي.
فصل النزيف وشكل القص مع خيارات مرئية وتجميع عداد النسخ، وفي الوضع الحر صارت صفوف النصوص معاينات مطبعية حقيقية (خط ووزن كل نمط، قوس للختم، وخلفية للشارة والتاريخ) بأسطح محايدة للأشكال والملصقات وشريط أدوات طبقات مسطّح، مع إبقاء المعالجات والتحذيرات وحدود الاستيراد والطباعة دون تغيير وإضافة حالات انحدار داخل الاختبارات القائمة.
