---
type: fix
scope: print
related_files:
  - frontend/src/features/stickers/lib/sheet-generator.ts:100
  - frontend/src/features/stickers/components/sticker-studio-dialog.tsx:383
  - frontend/src/features/stickers/components/sticker-properties.tsx:559
  - frontend/src/features/stickers/templates/badges.ts:23
  - frontend/test/sticker-quality.test.ts:130
  - frontend/test/sticker-templates.test.ts:133
  - docs/plans/sticker-template-audit.md:8
---
هندسة شيت الملصقات: استخراج computeSheetCellLayout نقية مع سقف فيزيائي موحّد النسبة يمنع تمدد الخلية فوق المقاس المعلن للملصق (كان يكبّره فوق راستر 300DPI فيلين الحواف)، ورفع الهامش الافتراضي إلى 8مم مطابقةً للملاءمة التلقائية كي لا تُبتع علامات القص الحدودية (تمتد 7مم)، ورفع سقف منزلقَي الصفوف/الأعمدة إلى 12 لمطابقة سقف الملاءمة، وتسمية لون علامات القص ثابتاً. وإكمال defaultMm للقوالب الـ41 الناقصة باصطلاح 0.2مم/وحدة viewBox ليصبح الجرد 83/83 مع حارس بنيوي يمنع عودة الفجوة، وإعادة توليد تقرير التدقيق.
