---
type: refactor
scope: ui
related_files:
  - frontend/src/features/freeform-collage/components/freeform-collage-modal.tsx:727
  - frontend/src/features/freeform-collage/components/freeform-top-action-bar.tsx:1
  - frontend/src/features/freeform-collage/components/freeform-left-tools-panel.tsx:1
  - frontend/src/features/freeform-collage/components/freeform-right-inspector-panel.tsx:1
  - frontend/test/freeform-editor.test.tsx:1
---
إعادة هيكلة نافذة الكولاج الحر إلى تخطيط احترافي ثلاثي الأعمدة: شريط إجراءات علوي موحد (تراجع/تكرار/تدوير/تقسيم/محاذاة/ترتيب/مساعدات الكانفس)، عمود أدوات أيسر (إضافة خلية، مقاسات جاهزة من المصدر الواحد `PHOTO_PRESET_DIMENSIONS_MM`، تعبئة ذكية، فجوة وهامش)، ومفتش أيمن سياقي لخصائص الخلية بالملم مع قفل النسبة والتقييد داخل حدود الورقة. حُذف المكونان القديمان المكرران (`freeform-toolbar` و`freeform-slot-inspector`) تطبيقاً لثابت عدم الازدواجية، وأُصلح انضغاط عرض النافذة إلى 512px بسبب `sm:max-w-lg` الأساسي عبر `sm:max-w-[1420px]` وفق نمط باقي الحوارات، فأصبحت الورقة مرئية فور فتح المحرر دون الحاجة لإضافة خلايا.
