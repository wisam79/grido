---
type: fix
scope: ui
related_files:
  - frontend/src/lib/store/slices/history-slice.ts:28
  - frontend/src/lib/store/slices/core-slice.ts:514
  - frontend/src/components/editor/dialogs/projects-dialog.tsx:203
  - frontend/src/lib/store/history-slice.test.ts:131
---
اشتقاق `isDirty` بمقارنة اللقطة مع مرساة آخر حفظ بدل `true` الأعمى في undo/redo: حقل `lastSavedEntry` جديد في شريحة التاريخ تضبطه `markHistorySaved()` عند نجاح الحفظ (`markProjectSaved` ومسار حفظ `projects-dialog` في فرع «غير متغيّر» حصراً — تعديلات أثناء الانتظار تبقى غير محفوظة) و`seedHistorySnapshot` عند تحميل مشروع (المحمّل نقطة حفظ نظيفة)، و`reset()` يصفّرها لتنهار المرساة إلى بذرة المستند الجديد فتبقى مساحة العمل البكر نظيفة. `pushHistory` و`undo` و`redo` صاروا يشتقون العلامة بـ`isSameSnapshot(الرأس المستعاد، المرساة)` — التراجع إلى الحالة المحفوظة نفسها يطفئ نقطة التعديل في شريط العنوان والإعادة تبعدها تعيد إضاءتها (سلوك مقصود يغير توثيق الاختبار السابق «التراجع يبقي التعديل حتى لو عاد المحتوى»). المقارنة تعيد استخدام `isSameSnapshot` العميقة بلا تسلسل JSON. تحقق: 8/8 `history-slice.test.ts` (شاملة اختبار المرساة الجديد عبر حفظ→تعديل→تراجع→نظيف→إعادة→متسخ→حفظ→تراجع→متسخ) و10/10 `core-slice.test.ts`، و`tsc` وESLint وformat وdocs-gate.
