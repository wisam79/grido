---
type: refactor
scope: ui
related_files:
  - frontend/src/features/freeform-collage/components/freeform-collage-modal.tsx:141
  - frontend/src/features/freeform-collage/lib/use-freeform-document-history.ts:1
  - frontend/src/features/freeform-collage/lib/use-freeform-slot-actions.ts:1
  - frontend/src/features/freeform-collage/lib/use-freeform-keyboard.ts:1
---
تفكيك حوار الكولاج الحر (1191 سطراً) إلى ثلاثة hooks بنمط الميزة في `lib/` — تفكيك هيكلي خالص بلا أي تغيير سلوكي: `use-freeform-document-history` (محرّك المستند والتاريخ: لقطة past/present/future وdocumentValue المشتقة، الاستبدال/الدفع/التراجع/الإعادة، آلية نبضة الأسهم بمرجعها، ومسارات السحب الثلاثة) و`use-freeform-slot-actions` (إجراءات الخلايا العشرون: تقسيم/إضافة/تعبئة/حذف/تدوير/مضاعفة/محاذاة/توزيع/نسخ ولصق/تحرير جماعي/تصدير واستيراد JSON مع لوح الحافظة الداخلي) و`use-freeform-keyboard` (تأثير الاختصارات على capture بحارسه H14). المكوّن يبقى قائد الأوركسترا للحالة الحية والحوارين (حفظ قالب وتطبيق الكولاج) والـJSX — 666 سطراً بعد التفكيك. الـJSX والمكونات الفرعية لم تُمس، وAPI المكوّن العام ثابت. تحقق: 76/76 اختبار ميزة الكولاج الحر (freeform-editor + freeform-collage)، tsc، ESLint `--max-warnings 0`، format، docs-gate.
