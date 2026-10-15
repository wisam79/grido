---
type: fix
scope: ui
related_files:
  - frontend/test/text-helpers.test.ts:1
  - frontend/src/components/editor/dialogs/print-dialog.tsx:685
  - frontend/src/components/editor/panels/collage/collage-custom-grid-tab.tsx:320
  - frontend/src/components/editor/panels/collage/collage-paper-tools-tab.tsx:195
  - frontend/src/features/stickers/components/sticker-preview.tsx:435
---

استعادة سمات `title` لأزرار التفاعل جنباً إلى جنب مع `aria-label`، وإضافة اختبارات وحدة شاملة لوحدة `text-helpers`:
- استعادة سمات `title` التلميحية لأزرار اتجاه الطباعة، وعدادات الشبكة، والنسخ، والتراجع/التكبير لضمان ظهور التلميحات الفورية وتوافق اختبارات Vitest.
- إضافة 12 اختبار وحدة في `test/text-helpers.test.ts` تغطي تعقيم محارف التحكم، وتطبيع الـ Unicode، والحد الأقصى للنصوص، وكشف العربية.
- تحديث الأرقام المرجعية لملفات اختبار Vitest إلى 120 ملفاً.
