---
type: fix
scope: canvas
related_files:
  - frontend/src/lib/canvas/png-dpi.ts:75
  - frontend/src/features/stickers/lib/svg-rasterizer.ts:104
  - frontend/src/features/stickers/lib/sheet-generator.ts:246
  - frontend/test/export-utils.test.ts:480
---
إغلاق الفجوة B-15: حقن كتلة pHYs في بايتات PNG المُصدَّرة من استوديو الملصقات (300/600 DPI والإدراج والشيت وVDP والنسخ للحافظة) عبر مرآة طرفية لـ setPNGDPI في Go — canvas.toBlob وحدها تكتب PNG بلا كثافة فتفسره الأدوات الخارجية بوصفه 96 DPI على مقاس فيزيائي خاطئ. الحقن بعد IHDR مباشرة مع CRC32، يتخطى pHYs موجودة ويقبل المدى 36–2400 مطابقاً لنظيره الخلفي.
