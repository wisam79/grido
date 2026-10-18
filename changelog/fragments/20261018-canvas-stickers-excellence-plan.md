---
type: feat
scope: canvas
related_files:
  - docs/plans/sticker-studio-v2-plan.md:1
  - docs/features-tracker.md:1
  - docs/DOCUMENTATION_MAP.md:102
  - frontend/src/features/stickers/lib/sticker-design/build-svg.ts:1
  - frontend/src/features/stickers/lib/sticker-design/schema.ts:1
  - frontend/src/features/stickers/lib/export-limits.ts:1
  - frontend/src/features/stickers/lib/svg-rasterizer.ts:1
  - frontend/src/features/stickers/lib/sheet-generator.ts:1
  - frontend/src/features/stickers/lib/vdp-batch.ts:1
  - frontend/src/lib/io/object-url-registry.ts:1
  - frontend/src/features/stickers/components/vdp-import-dialog.tsx:86
  - frontend/src/features/stickers/components/sticker-studio-dialog.tsx:270
  - frontend/src/features/stickers/lib/preset-utils.ts:12
  - scripts/sticker-template-audit.mjs:1
---

المرحلة الأولى من خطة النهوض بنظام الملصقات (استوديو الملصقات 2.0): نواة تصميم موحّدة `buildStickerSvg` كنقطة توليد وحيدة (تعقيم + RTL/ملاءمة + فضّ المعرّفات) لكل مسارات العرض والتصدير وVDP، والتحقق من الإعدادات المحفوظة بمخطط zod v2 مع هجرة متسامحة تُرقّي v1 وتُسقط القيم التالفة فقط دون مسح التصميم السليم، ومسار Blob-first يلغي Base64 في تصدير PNG والمجمّعة (طريق ثنائي إلى خادم الوسائط على سطح المكتب)، مع ميزانية بكسل 50MP قبل تخصيص أي Canvas، ودفتر `object-url-registry` يغلق تسريب رابط التنزيل (M35) بمؤقّت مستقل لكل رابط، وتدفق VDP بإلغاء تعاوني وإدراج كل 50 بطاقة بإحداثيات محسوبة مقدماً فلا تتراكم Data URLs بالذاكرة، وإضافة سكربت تدقيق ثابت للقوالب (`npm run stickers:audit`) يقيس تغطية `defaultMm` وربطات `data-field-id`/`data-color-role`.
