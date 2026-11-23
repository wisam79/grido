# خطة التطوير البارامتري لنظام الملصقات والبطاقات (Parametric Stickers Evolution Plan) — 2026-11-23

## الأهداف والمبادئ المعمارية
- اقتباس الأفكار المجربة من نماذج السكراتش وتحويلها إلى قدرات بارامترية نظيفة داخل `frontend/src/features/stickers/` دون نسخ كود تجريبي أو تضخيم المعرض بعشرات القوالب الساكنة المكررة.
- الالتزام الكامل بأصول MIT الخالصة محلياً دون اتصال، وبمخرجات SVG متجهة خالية من مرشحات الراستر الثقيلة (`feTurbulence` / `feDisplacementMap`) لضمان نظافة تصدير الطباعة فائقة الدقة وCutContour.

---

## المراحل المنفذة والملفات المرجعية

### المرحلة 1 (P0): خط القص الديناميكي وجودة محرر النصوص السريع
- توسيع `StickerTemplate` و`StickerField` في `frontend/src/features/stickers/types.ts` لدعم `presentation` و`resolveCutShape` و`randomizeParams` و`autoContrastInk`.
- استخراج `resolveTemplateCutShape` في `frontend/src/features/stickers/lib/die-cut-offset.ts:25` وربطه بمسارَي التصدير `handleDownloadCutContour` و`handleDownloadPureCutContour` في `frontend/src/features/stickers/lib/use-sticker-export-actions.ts:80` و`:103` مع تحديث اعتمادات `useCallback`.
- قصر تنقّل مفتاح `Enter` وعداد الحقول في `frontend/src/features/stickers/components/sticker-inline-editor.tsx:95` على الحقول القابلة للتحرير النصي/الرقمي (`editableFields`)، وتمرير `data-max-width` لعنصر الظل المخفي في `frontend/src/features/stickers/lib/stamp-composer-v2.ts`.

### المرحلة 2 (P0/P1): اشتقاق الألوان بفضاء OKLCH وترقية محرك الأختام v2
- إنشاء وحدة اشتقاق الألوان `frontend/src/features/stickers/lib/color-derivation.ts` اعتماداً على حزمة `culori` (`deriveSurfacePalette` عند `:93`، و`pickDifferentOption` عند `:118`، و`pickDifferentPalette` عند `:131`).
- دمج اللوحة المشتقة في `frontend/src/features/stickers/lib/stamp-composer-v2.ts` عبر تدرجات الجسم والميدالية وإطارات الشريط المعدنية، وتصدير `renderStampShapeThumbnailSvg` (`:189`).
- تخطي تحذير التباين الإيجابي الكاذب للقوالب ذات الموازنة التلقائية عبر `template.autoContrastInk` في `frontend/src/features/stickers/components/sticker-properties.tsx:56`.

### المرحلة 3 (P1): مكتبة الأيقونات البصرية والمنتقي الشبكي وزر «توليفة»
- توسيع الأيقونات المحلية في `frontend/src/features/stickers/lib/composer-icons.ts:24` إلى 47 أيقونة MIT مصنّفة (24 Phosphor + 10 Tabler + 13 Fluent Emoji Flat).
- بناء مكونَي `ShapeGridPicker` و`IconGridPicker` في `frontend/src/features/stickers/components/sticker-visual-pickers.tsx:21` و`:65` مع حقل بحث بدور `type="search"` (`role="searchbox"`).
- ربط المنتقيات البصرية ومجموعات الحقول وزر «توليفة» في `frontend/src/features/stickers/components/sticker-design-tab.tsx:108` و`frontend/src/features/stickers/templates/composer_stamps.ts` مع الحفاظ على نصوص المستخدم وتسجيل التغيير بخطوة تراجع واحدة عبر `commit`.

### المرحلة 4 (P1): محرك البطاقات الإجرائية الخالي من مرشحات الراستر
- إنشاء المحرك الهندسي `frontend/src/features/stickers/lib/parametric-surfaces.ts` (`composeParametricCardSvg` عند `:505`) الذي يركب 8 خلفيات و6 أنماط و6 إطارات و6 زخارف بواجهات `data-field-id` مستقلة للطبقات (`bg`, `pattern`, `frame`, `ornament`, `badgeText`, `title`, `subtitle`, `footer`).
- تسجيل قالبَي `card_composer_square` و`card_composer_portrait` في `frontend/src/features/stickers/templates/composer_cards.ts` و`frontend/src/features/stickers/templates/index.ts` ليصبح المجموع الكلي **210** قوالب (`102` في تصنيف `cards`).

---

## التحقق المثبت (Post-Edit Commands)
- اختبارات Vitest المستهدفة منفردة (`--maxWorkers=1 --coverage.enabled=false`):
  - `frontend/test/sticker-studio.test.tsx`: **16/16 PASS**
  - `frontend/test/sticker-stamp-composer.test.tsx`: **7/7 PASS**
  - `frontend/test/sticker-templates.test.ts`: **16/16 PASS**
  - `frontend/test/sticker-parametric-surfaces.test.ts`: **6/6 PASS**
  - `frontend/test/sticker-inline-editor.test.tsx`: **3/3 PASS**
  - `frontend/test/sticker-coverage.test.ts`: **39/39 PASS**
  - `frontend/test/sticker-quality.test.ts`: **20/20 PASS**
  - `frontend/test/sticker-build-svg.test.ts`: **5/5 PASS**
  - `frontend/test/ui-compliance.test.ts`: **57/57 PASS**
- فحوص الجودة: `npm --prefix frontend run stickers:audit -- --json` (`templates: 210, withMm: 210, withoutMm: 0`)، `npm --prefix frontend run typecheck` (exit 0)، `npm --prefix frontend run lint` (0 تحذيرات/أخطاء)، و`npm --prefix frontend run format:check` (**PASS**).
- بوابة التوثيق: `node scripts/docs-gate.mjs --strict-refs` (بتحديث `vitest_test_files=187` في `docs/DOCUMENTATION_MAP.md`).
