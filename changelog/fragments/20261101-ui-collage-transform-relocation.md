---
type: refactor
scope: ui
related_files:
  - frontend/src/components/editor/properties/slot-properties.tsx:497
  - frontend/src/components/editor/canvas/quick-bar/quick-bar-slot-section.tsx:167
  - frontend/src/components/ui/icons.tsx:866
  - frontend/src/components/editor/canvas/context-menu/slot-menu-section.tsx:315
---
نقل أدوات التدوير والقلب من الشريط السريع العائم أعلى خلية الكولاج إلى لوح خصائص الخلية: صف تحويلات موحّد داخل قسم «الصورة» (تدوير 90° + قلب أفقي + قلب عمودي) بأزرار أيقونية متساوية h-8 وحدود شعرية بلا ظل وفق طابع سطح المكتب، القلبان بمفتاح حالة `aria-pressed` وإبراز primary عند التفعيل مع وزن أيقونة fill، والفعل عبر أدوات الخانة في الستور بخطوة تراجع واحدة (توحيد قلب عمودي السابق مع نمط flipSlotY). الشريط السريع يبقى للعمليات الحركية (رفع/تعبئة/استعادة/تفريغ/حذف) دون ازدواجية الأدوات. تحسين أيقونتَي تعبئة الصف والعمود في الشريط السريع وقائمة النقر الأيمن معاً: `TableInsertRow`/`TableInsertColumn` (شبكة بصف/عمود مميّز) بدل `Rows`/`Columns` المجردة — أيقونتان جديدتان في الطبقة المولّدة على شبكة 16 عبر `icons:generate`.
