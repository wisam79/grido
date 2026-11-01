---
type: refactor
scope: ui
related_files:
  - frontend/src/features/stickers/components/sticker-studio-dialog.tsx:93
  - frontend/src/features/stickers/lib/use-sticker-customization.ts:1
  - frontend/src/features/stickers/lib/use-sticker-insert-actions.ts:1
  - frontend/src/features/stickers/lib/use-sticker-export-actions.ts:1
---
تفكيك حوار استوديو الملصقات (929 سطراً) إلى ثلاثة hooks بنمط الميزة في `lib/` — تفكيك هيكلي خالص بلا أي تغيير سلوكي: `use-sticker-customization` (آلة حالة التخصيص: مرحلة المعرض/التخصيص، القالب المحدد ببذرة إعادة التحرير، سجل معاملات قابل للتراجع مع اختصاراته، وتوليد SVG حي مؤجَّل بنسخته المُطهَّرة ومعرّفات الحقول المخفية، وتأثير تصفير الجلسة عند الإغلاق) و`use-sticker-insert-actions` (إدراج فردي/شيت بالمسار الثنائي رفع Blob/Data URL ووضع إعادة التحرير، مع `resolveStickerSheetMm` المُصدَّرة) و`use-sticker-export-actions` (SVG مضمّن الخطوط وخط القص والمسار النقي للبلوتر وPNG 300/600 ونسخ الصورة/SVG). الـJSX بمرحلتيه لم يُمس حرفياً وAPI المكوّن العام ثابت. تحقق: 27/27 اختبار الملصقات المستهدفة (sticker-studio + sticker-quality)، tsc، ESLint `--max-warnings 0`، format، docs-gate.
