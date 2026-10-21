---
type: fix
scope: ui
related_files:
  - frontend/src/components/ui/button.tsx:8
  - frontend/src/App.tsx:528
  - frontend/src/components/ui/blocks/fluent-setting-row.tsx:36
  - frontend/src/components/editor/properties/collage-settings.tsx:160
  - frontend/src/components/editor/dialogs/print-dialog.tsx:771
  - frontend/test/accessibility.test.tsx:40
---
الدفعة أ من تدقيق التصميم (Fluent 2): وُحّدت الحركة فأُزيل التكبير/الرفع عند التحويم والضغط، واستُبدل `transition-all` بخصائص محددة في 213 موضعاً عبر 74 ملفاً (بقيت أشرطة التقدم ومقبض القص وأسهم التوسيع الوظيفية فقط)؛ وصارت حالة أزرار الألواح النشطة محايدة `bg-accent-active` بدل الأزرق، وأُزيل نبض نقطة التجربة. حُسّنت وصولية تلميحات `FluentSettingRow` (هدف 22px واسم «شرح: …») وأُزيلت خاصية `icon` غير المستخدمة، وكُبّرت عينات ألوان الكولاج إلى 28px بحلقة تحديد بدل `scale-110`. أُزيل `tracking-wider` عن العناوين العربية في حوارَي الطباعة والإدراج الدفعي، وثُبّت اتجاه الأبعاد بـ`dir="ltr"` في شارة الطباعة والمعاينة.
