# خطة النهوض بنظام الملصقات — Sticker Studio 2.0

**تاريخ الإعداد:** 18 أكتوبر 2026  
**الحالة:** خطة تنفيذ مقترحة — **لم يُنفَّذ منها أي بند بعد**  
**النطاق:** `frontend/src/features/stickers/**` + تكامل التصدير/الطباعة في Go + الاختبارات + التوثيق  
**المرجع الحاكم:** `.agents/AGENTS.md` · `.agents/rules/konva-canvas-engine.md` · `.agents/rules/architecture-governance.md` · `.agents/rules/quality-cicd-release.md` · `.agents/skills/wails-konva-hi-res-export/SKILL.md`  
**البوابات المطلوبة عند التنفيذ:** `changelog/fragments/` + `docs/features-tracker.md` + `README.md` (عند تغيير ميزة ظاهرة) + `docs/developer_guide.md` (عند تغيير عقد التصدير) + `docs/testing_guide.md` (عند تغيير الاختبارات) + `node scripts/docs-gate.mjs --strict-refs`

---

## 0. الملخص التنفيذي

نظام الملصقات الحالي **أساس قوي ومكتمل وظيفياً**: 83 قالباً في 13 تصنيفاً، معاينة SVG حية، تحرير نصي داخل المعاينة، تراجع/إعادة، ألوان وخطوط، شيت طباعة، باركود/QR، تصدير PNG 300/600 DPI وSVG وخط قص، وإعادة تحرير من الكانفاس، وVDP من Excel/CSV. لكنه وصل إلى **سقف النمو المعماري**: المكوّنات الأربعة الكبرى تمثل معظم الكود، ومنطق التعقيم/البناء مكرر بين مساري الاستوديو وVDP، وخط أنابيب التصدير يقوم بترميز Base64 متكرر ويحتفظ بكل صور الدفعة في الذاكرة، ولا توجد طبقة Preflight أو مقاس فيزيائي موحّد لكل القوالب.

هذه الخطة لا تعيد بناء النظام ولا تستبدل React+Konva أو قوالب SVG. هي **ترقية تراكمية من سبع مراحل**:

1. **تثبيت خط الأساس** باختبارات ذهبية وتغطية القوالب الـ83 وتحديد ميزانيات الذاكرة.
2. **نواة تصميم واحدة** `StickerDesign v2` + `buildStickerSvg` تلغي ازدواجية التعقيم والبناء.
3. **محرك تصدير آمن للذاكرة**: Worker + OffscreenCanvas + Blob-first + Cache LRU + ميزانية بكسل.
4. **جودة طباعة حقيقية**: مقاس بالمم، نزف/منطقة آمنة، Preflight، خط قص مشتق من قالب صريح، PDF بمقاس فيزيائي.
5. **تفاعل احترافي**: تحريك/تحجيم/تدوير النصوص داخل المعاينة، طباعة طباعية، لوحات ألوان متناغمة، مفضلة/مؤخرة.
6. **VDP على نطاق واسع**: تدفّق صفوف بلا تجميع 500 صورة في الذاكرة، ومخرجات شيت/PDF.
7. **تقوية وإصدار**: Fuzz أمني، ميزانيات أداء، تحقق CI، توثيق، وتراجع آمن.

**القرارات الحاكمة:**

- **لا إعادة كتابة من الصفر** ولا استبدال محرك الكانفاس (Zero-Rewrite Invariant).
- **لا مكتبة PDF جديدة في المرحلة 1**: يوجد مسار PDF في Go (`internal/service/print_pdf_export.go`)؛ نعيد استخدامه ونمنع الازدواجية. أي إضافة JavaScript لاحقة تحتاج مبرراً من متطلب مطبعة فعلي.
- **لا مكتبة ألوان ثانية:** `palette-extract.ts` (الذي كان يستخدم Culori) حُذف في الجلسة 1.28 بتاريخ 2026-10-21؛ Culori ما زالت مثبتة بلا مستخدم، فأي عمل ألوان جديد يعيد استخدامها بدل إضافة مكتبة ثانية.
- **jsbarcode + qrcode.react** يبقيان للرموز الحالية؛ `bwip-js` يُقيَّم فقط عند الحاجة الفعلية إلى GS1-128/Data Matrix.
- **Blob-first**: لا `toDataURL` في خط الأنابيب الداخلي؛ الحفظ المكتبي عبر `/api/upload-media` الثنائي بدل `SaveImageFromBase64`.
- **OffscreenCanvas + Worker** مع Fallback على الخيط الرئيسي وحدود بكسل صريحة.
- **مخطط Zod إصدار 2** مع ترحيل من الحالة الحالية؛ لا كسر للعناصر المحفوظة.
- **مصدر واحد للحقيقة** لمنطق البناء والتعقيم والقياس، ومنع أي نسخة ثانية في VDP أو المعاينة.

---

## 1. خط الأساس المُتحقق منه (Baseline)

> كل رقم أدناه مأخوذ من الكود الحالي، لا من الذاكرة. أرقام الأسطر تقريبية عند حدود الدوال.

### 1.1 حجم النظام وتوزيعه

| البند | الحالة الحالية | الدليل |
|---|---|---|
| القوالب | **83 قالباً** في 13 تصنيفاً | `grep -c "generateSvg:" frontend/src/features/stickers/templates/*.ts` = 83 |
| المقاس الفيزيائي | **42 قالباً فقط** لديها `defaultMm` | `grep -c "defaultMm:"` = 42؛ الباقي يسقط إلى 50 مم افتراضية |
| إجمالي كود الميزة | **5,782 سطراً** | `wc -l` على ملفات `features/stickers` |
| أكبر أربعة ملفات | الاستوديو 952 · الخصائص 766 · المعاينة 516 · الكتالوج 455 | `wc -l` |
| اختبارات الميزة | 9 ملفات (unit/component) + E2E واحد | `frontend/test/*sticker*`, `frontend/e2e/sticker-studio.spec.ts` |
| خط الأنابيب | SVG → `<img>` → Canvas 2D → `toDataURL('image/png')` | `lib/svg-rasterizer.ts` |
| الشيت | رسم شبكة على Canvas ثم `toDataURL` | `lib/sheet-generator.ts` |
| VDP | 500 صف كحد أقصى، 10MB، تفكيك آمن، ثم **تجميع كل PNG** | `lib/vdp-parser.ts`, `lib/vdp-batch.ts` |
| الطباعة | PNG/SVG/خط قص من الاستوديو؛ PDF وCMYK TIFF موجودان في Go لكن ليس من الاستوديو مباشرة | `internal/service/print_pdf_export.go`, `internal/service/print_export.go` |

### 1.2 ما هو جيد ويجب الحفاظ عليه

- تعقيم ألوان وسمات SVG مركزي في `lib/svg-safety.ts` مع اختبارات.
- تعقيم SVG DOM-based في `frontend/src/lib/utils.ts:160` مع Cache محدود (256 مدخلاً).
- دعم RTL/LTR تلقائي وإسقاط `letter-spacing` عن العربي في `lib/sticker-text.ts`.
- تضمين خطوط `@font-face` كـ `data:` فقط مع سقف 400KB ووجهين لكل عائلة.
- حماية VDP من تلوّث النموذج الأولي وأسماء الأعمدة الخطرة، وتعطيل الصيغ/HTML/VBA.
- حماية جسر الوسائط المحلي بـ Origin + Session Token، وكتابة ذرية في Go.
- تراجع/إعادة بقيمة مؤجلة `useDeferredValue` لتقليل تقطيع الكتابة.
- كتالوج بـ IntersectionObserver و`content-visibility` وخريطة SVG مخبأة.

### 1.3 الفجوات المؤكدة (وليست انطباعات)

| # | الفجوة | الأثر | الدليل |
|---|---|---|---|
| B-1 | `renderVdpBatch` يجمع كل صور PNG في مصفوفة ثم يمررها دفعة واحدة | 500 بطاقة × ~0.5MB Base64 ≈ 250MB+ نصوص حيّة + عناصر كانفاس | `lib/vdp-batch.ts` |
| B-2 | `renderSvgToPngDataUrl` و`generateStickerSheet` يعيدان Data URL | Base64 يضخّم 4/3 ويضاعف الذاكرة عند كل حفظ/إدراج | `lib/svg-rasterizer.ts`, `lib/sheet-generator.ts` |
| B-3 | لا ميزانية بكسل قبل إنشاء Canvas | 600 DPI على A3 ≈ 69.6MP ≈ 278MB لسطح RGBA واحد؛ خطر OOM | `stickerRasterSize()` بلا سقف |
| B-4 | `revokeObjectUrlLater` يستخدم مؤقتاً عالمياً واحداً ويلغي مؤقت الرابط السابق | الرابط الأول قد لا يُلغى أبداً → تسرّب ذاكرة | `sticker-studio-dialog.tsx` (ثابت `objectUrlRevokeTimer`) |
| B-5 | منطق التعقيم/بناء `safeParams` مكرر بين الاستوديو وVDP | خطر انحراف سلوكي بين المسارين | `sticker-studio-dialog.tsx` + `vdp-batch.ts` |
| B-6 | 41 قالباً بلا مقاس فيزيائي صريح | تصدير/طباعة بمقاس غير مقصود، وملاءمة شيت خاطئة | `types.ts` + `templates/*` |
| B-7 | خط القص مستطيل مشتق من `viewBox` فقط | لا يطابق الملصقات الدائرية/غير المنتظمة؛ قرار موثّق لكنه حد جودة | `lib/die-cut-offset.ts` |
| B-8 | لا Preflight قبل التصدير | نصوص صغيرة/تباين منخفض/باركود بلا هامش قد تُطبع معيبة | لا توجد وحدة Preflight |
| B-9 | `resolveTextField` يطابق النص بالمحتوى عند غياب `data-field-id` | قد يحرّر حقلاً خاطئاً عند تكرار النص | `sticker-preview.tsx` |
| B-10 | `resolveColorRole` يستنتج الدور من تطابق `fill` | لونان متطابقان → دور خاطئ | `sticker-preview.tsx` |
| B-11 | لا مخطط إصدار للتصميم/القوالب المحفوظة | ترحيل هشّ عند إضافة `sizeMm` أو `overrides` | `types.ts` + `preset-utils.ts` |
| B-12 | مكوّنات ضخمة Vacuous State | صعوبة الاختبار، إعادة الرسم، ومراجعة الكود | 952/766/516/455 سطراً |
| B-13 | لا تصدير PDF مباشر من الاستوديو ولا مقاس صفحة/نزف | المستخدم يمر بمسار إدراج ثم طباعة | `sticker-studio-dialog.tsx` |
| B-14 | لا تحقق آلي من قابلية مسح الباركود | قالب قد يُصدَّر برمز غير مقروء | لا اختبار Barcode decode |
| B-15 | لا تحقق من الـ DPI الفعلي في ملفات PNG المصدرة | قد يُفسَّر الملف بـ96 DPI خارج التطبيق | Canvas API لا يكتب pHYs |

---

## 2. الفجوات مرتبة بالأولوية

### P0 — تمنع الجودة أو تسبب OOM/تسرّباً

1. **VDP 500 صورة في الذاكرة** (B-1).
2. **Base64 في كل خط التصدير** (B-2).
3. **غياب ميزانية البكسل** (B-3).
4. **تسريب Object URL** (B-4).
5. **ازدواجية البناء/التعقيم** (B-5).
6. **المقاس الفيزيائي الناقص** (B-6).
7. **غياب Preflight** (B-8).
8. **ربط الحقول/الألوان بالاستنتاج** (B-9, B-10).
9. **مخطط تصميم بلا إصدار** (B-11).

### P1 — ترفع الاحترافية والجودة بشكل ملموس

- تحريك/تحجيم/تدوير النصوص داخل المعاينة (Layout Overrides).
- تحكم كامل بالطباعة: الوزن، المحاذاة، ارتفاع السطر، تباعد لاتيني، Auto-fit.
- لوحات ألوان متناغمة بـ OKLCH + تحذير الخروج من Gamut + ΔE 2000.
- شيت بمعاينة حقيقية، هوامش، تدوير، مقاسات ورق جاهزة.
- تصدير PDF مباشر + CMYK TIFF من الاستوديو عبر Go.
- VDP إلى شيت/PDF بدل 500 عنصر كانفاس.
- Barcode GS1/Data Matrix عند الحاجة، مع تحقق آلي.
- مفضلة/مؤخرة/استيراد وتصدير القوالب المحفوظة.
- A11y كامل: تركيز، `aria-live` للـ Preflight، اختصارات، تقليل الحركة.

### P2 — تحسينات متقدمة لا تُعطّل الإصدار

- PDF/X أو ICC Output Intent أو Soft Proof حقيقي.
- Spot Colors/Overprint/Trapping.
- استيراد SVG لمستخدم (مع Sandbox).
- قوالب يدوية DSL كامل.
- مزامنة سحابية للقوالب.
- تعدد الصفحات/Imposition المتقدم.

---

## 3. المعمارية المستهدفة

### 3.1 المخطط العام

```text
┌──────────────────────────── UI (Fluent 2 / RTL) ────────────────────────────┐
│ StickerStudioDialog                                                         │
│  ├─ StudioHeader / StudioFooter          (أزرار، حالة، اختصارات)            │
│  ├─ StickerCatalog                       (بحث، مفضلة، تصنيفات)              │
│  ├─ StickerPreview                       (SVG + Overlay + Inline Editor)    │
│  └─ StickerInspector                     (Design / Type / Sheet / Preflight)│
└───────────────────────────────┬─────────────────────────────────────────────┘
                                │ StickerDesign v2 (Zod)
┌───────────────────────────────▼─────────────────────────────────────────────┐
│ Core (pure, testable)                                                       │
│  buildStickerSvg() · applyLayoutOverrides() · estimateBounds()              │
│  preflight() · sheetMath() · stableHash() · migrateDesign()                 │
└───────────────────────────────┬─────────────────────────────────────────────┘
                                │
┌───────────────────────────────▼─────────────────────────────────────────────┐
│ ExportOrchestrator                                                          │
│  ├─ Rasterizer (Worker + OffscreenCanvas, fallback main thread)             │
│  ├─ BitmapCache (LRU by bytes)                                              │
│  ├─ SheetComposer (grid / bleed / marks / tiling)                           │
│  ├─ SaveAdapter (Blob → /api/upload-media | download)                       │
│  └─ PrintBridge (Go: PDF / CMYK TIFF / direct print)                        │
└──────────────────────────────────────────────────────────────────────────────┘
```

### 3.2 الوحدات الجديدة المقترحة

| المسار | المسؤولية | قاعدة |
|---|---|---|
| `lib/sticker-design/schema.ts` | Zod schema v2 + أنواع مشتقة | لا أنواع يدوية موازية |
| `lib/sticker-design/defaults.ts` | قيم افتراضية من القالب | لا تكرار في المكونات |
| `lib/sticker-design/migrate.ts` | ترحيل v1→v2 | توافق خلفي كامل |
| `lib/sticker-design/build-svg.ts` | تعقيم + `generateSvg` + post-process + namespace | **نقطة التوليد الوحيدة** |
| `lib/sticker-design/overrides.ts` | تطبيق `dx/dy/scale/rotation` على `[data-field-id]` | آمن ومحدود |
| `lib/sticker-design/preflight.ts` | قواعد الفحص والإصلاح المقترح | نقي بلا DOM |
| `lib/sticker-design/hash.ts` | مفتاح كاش مستقر | لا يعتمد على ترتيب عشوائي |
| `lib/export/rasterizer.ts` | واجهة `rasterizeSvg → Blob` | لا Base64 داخلياً |
| `lib/export/raster.worker.ts` | تنفيذ Worker | رسائل requestId/cancel |
| `lib/export/bitmap-cache.ts` | LRU بالبايت + `close()` | سقف 64MB افتراضي |
| `lib/export/sheet-composer.ts` | تركيب الشيت من Master واحد | تدفق ثابت الذاكرة |
| `lib/export/object-url-registry.ts` | دورة حياة كل URL | مؤقت لكل URL |
| `lib/export/save-blob.ts` | حفظ مكتبي/ويب | مسار ثنائي أولاً |
| `components/studio/*` | هيكل الاستوديو | ≤ 300 سطر/ملف جديد |
| `components/inspector/*` | تبويبات المفتش | كل تبويب ملف مستقل |

> **قاعدة منع الازدواجية:** لا يُسمح بوجود أي نسخة ثانية من `sanitizeStickerColor` أو `safeParams` أو `stickerRasterSize` خارج `lib/sticker-design` و`lib/export`. أي استدعاء من VDP أو المعاينة يمر عبر النواة.

---

## 4. نموذج البيانات `StickerDesign v2`

### 4.1 المخطط المقترح

```ts
// إرشادي — يُنفَّذ فعلياً في lib/sticker-design/schema.ts
const StickerDesignV2 = z.object({
  version: z.literal(2),
  templateId: z.string().min(1).max(80),

  fields: z.record(
    z.string().max(80),
    z.string().max(500), // سقف يمنع SVG ضخماً من حقل واحد
  ),

  palette: z.object({
    primary: z.string(),   // يُعقّم عبر isSafeCssColor
    secondary: z.string(),
    background: z.string(),
    transparent: z.boolean(),
  }),

  typography: z.object({
    family: z.string().max(80),
    scale: z.number().min(0.5).max(2),
    weight: z.enum(['400', '600', '700', '900']).optional(),
    align: z.enum(['start', 'center', 'end']).optional(),
    lineHeight: z.number().min(0.8).max(2).optional(),
  }),

  size: z.object({
    widthMm: z.number().positive().max(1000),
    heightMm: z.number().positive().max(1000),
    lockAspect: z.boolean(),
  }),

  print: z.object({
    bleedMm: z.number().min(0).max(10),
    safeMm: z.number().min(0).max(10),
    dieCut: z.boolean(),
    finish: z.enum(['standard', 'glossy', 'matte', 'holographic']),
    colorSpace: z.enum(['srgb', 'cmyk']),
  }),

  overrides: z.record(
    z.string(),
    z.object({
      dxMm: z.number().min(-500).max(500),
      dyMm: z.number().min(-500).max(500),
      scale: z.number().min(0.2).max(5),
      rotationDeg: z.number().min(-180).max(180),
      visible: z.boolean(),
    }),
  ).optional(),
});
```

### 4.2 الترحيل

- `migrateDesign(input)`:
  - v1 (الحالي) → v2: اشتق `size` من `template.defaultMm` أو 50 مم، `bleedMm=2`, `safeMm=2`, `colorSpace='srgb'`.
  - أي حقل ناقص/زائد يُسقَط بأمان مع Warning غير حاجب.
  - `version` غير معروف → رفض مع رسالة واضحة، لا تخمين.
- `StickerElementSource` المحفوظ على العنصر يُرقّى تلقائياً عند القراءة (`project-serializer` / `crud`).
- القوالب المحفوظة في `localStorage` تُهاجر مرة واحدة وبنسخة احتياطية قبل الكتابة.

### 4.3 المقاس الفيزيائي

- إضافة `defaultMm` لكل الـ83 قالباً (تدقيق يدوي/كودمود).
- `sizeMm` قابل للتحرير مع قفل نسبة الأبعاد.
- كل الحسابات الداخلية تُسمّى بوضوح: `widthMm`, `heightMm`, `bleedMm`, `safeMm`؛ لا خلط بين mm وpx.
- `stickerRasterSize(aspect, sizeMm, dpi)` لا تعود تسقط إلى 50 مم إلا كخطأ صريح (Warning في Preflight).

---

## 5. المكتبات والحلول الجاهزة — قرار ومبرر

> السياسة: لا نضيف مكتبة إلا إذا كانت **تقوم بما لا نريد صيانته داخلياً**، ولا تكرر قدرة موجودة، وتُحمَّل كسولاً إن كانت ثقيلة.

| المكتبة | الإصدار/الترخيص | القرار | المبرر والحدود |
|---|---|---|---|
| **culori** | 4.0.2 · MIT · ~21.7KB gzip | **نُبقي ونوسّع** | مثبتة ومستخدمة. تدعم OKLCH/LCH و`differenceCiede2000` و`toGamut`. لا تضف Color.js/chroma.js. |
| **jsbarcode** | 3.12.3 · MIT · ~11KB | **نُبقي للرموز الحالية** | Code128/EAN كافٍ؛ محمّل كسولاً بالفعل. |
| **qrcode.react** | 4.2.0 · MIT | **نُبقي** | QR SVG حقيقي؛ محمّل كسولاً. |
| **bwip-js** | 4.11.4 · MIT | **P2 — تقييم فقط** | يضيف GS1-128/GS1 DataMatrix/GS1 QR؛ حزمة BWIPP كبيرة (~2MB خام) وتحتاج Named Encoder + Dynamic Import. لا نضيفه قبل طلب فعلي من مطبعة. |
| **jsPDF + svg2pdf.js** | 4.2.1 + 2.8.1 · MIT | **Spike مشروط في P2** | أفضل مسار متجهي من SVG في المتصفح، لكن دعم SVG جزئي، وتشكيل العربية غير مضمون، وإصدار 4.2.1 أمني إلزامي. لا يُضاف قبل إثبات أن مسار Go لا يكفي، ويجب أن يحل محل مسار لا أن يكرره. |
| **pdf-lib** | 1.17.1 · MIT | **لا** | لا يستورد SVG كاملاً (يرسم Paths فقط)، وإيقاع إصداراته بطيء. لا يضيف قيمة على Go الحالي. |
| **fuse.js** | 6.x · Apache-2.0 | **P2 اختياري** | البحث العربي المطبَّع الحالي كافٍ لـ83 قالباً. يُضاف فقط إذا أصبح عدد القوالب كبيراً أو طُلبت تحمل الأخطاء المطبعية. |
| **DOMPurify** | 3.x · MPL-2.0/Apache-2.0 | **تقييم أمني في P0** | التعقيم الحالي DOM-based ومختبر. لا نستبدله قبل Fuzz corpus + مقارنة نتائج؛ إن أثبت DOMPurify تفوقاً أمنياً واضحاً نتبناه، وإلا نبقى ونشدد Allowlist. |
| **OffscreenCanvas / ImageBitmap / Blob** | Platform | **اعتماد أساسي** | تقليل تجميد الواجهة وذاكرة Base64. مع Fallback للمتصفح/WebView2 القديم. |
| **BarcodeDetector** | Platform (Chromium) | **اختبار CI فقط** | لا اعتماد runtime؛ نستخدمه في E2E للتحقق من قابلية مسح الباركود/QR. |

### 5.1 ما لا ندّعي قدرته

- لا PDF/X ولا ICC Output Intent ولا Soft Proof حقيقي من المتصفح.
- لا CMYK مضبوط الملف الشخصي (Profile-aware) داخل JS؛ مسار CMYK الحالي في Go هو فصل حبري تقريبي ويجب التحقق منه مع المطبعة.
- لا Spot Colors أو Overprint أو Trapping.
- لا نُسمّي ملفاً «Print-Ready» بلا Preflight ناجح ومراجعة متطلبات المطبعة.

---

## 6. مراحل التنفيذ

> التقديرات لمطور واحد + وكيل ذكي، وتشمل الاختبار والتوثيق. يمكن تنفيذ المراحل 1 و2 بالتوازي بعد تثبيت خط الأساس.

### المرحلة 0 — تثبيت خط الأساس وبوابات الجودة (2–3 أيام)

**الهدف:** لا تغيير سلوكي؛ نعرف بالضبط ما نحميه قبل التفكيك.

- [ ] إنشاء هذا المستند وربطه في `docs/features-tracker.md` وسجل الجلسة.
- [ ] إنشاء `changelog/fragments/20261018-stickers-excellence-plan.md` (type: docs).
- [ ] تدقيق آلي لكل القوالب: `defaultMm` موجود؟ `data-field-id` لكل حقل؟ `data-color-role` لكل لون؟ — تقرير في `docs/plans/`.
- [ ] Snapshot اختبارات SVG لكل الـ83 قالباً (تجزئة/بنية، لا صورة) لضمان عدم تغير المخرجات أثناء إعادة الهيكلة.
- [ ] تسجيل خط أساس يدوي/آلي: زمن فتح الاستوديو، زمن تغيير حرف، زمن تصدير 300/600 DPI، وحجم الذاكرة التقريبي.
- [ ] إضافة ميزانيات معلنة في الكود: `MAX_RASTER_PIXELS = 50_000_000`، `MAX_CACHE_BYTES = 64MB`، `MAX_VDP_ROWS = 500`.
- [ ] CI: وظيفة ملصقات خفيفة (typecheck + lint + unit + E2E في السحابة فقط وفق `.agents`).

**معيار الإنجاز:** تقرير خط أساس مرفق + كل القوالب لها تغطية بنيوية + لا تغيير مرئي.

---

### المرحلة 1 — نواة التصميم وإزالة الازدواجية (4–6 أيام)

**الهدف:** نقطة بناء واحدة، مخطط مُصدَّر، ومكونات أصغر؛ بلا تغيير مرئي.

- [ ] `lib/sticker-design/schema.ts` + `defaults.ts` + `migrate.ts` + `hash.ts`.
- [ ] `buildStickerSvg(design, template)`:
  - تعقيم الألوان/الخط/الحقول.
  - `template.generateSvg`.
  - `postProcessStickerSvg` + Namespace.
  - تطبيق `overrides` (إن وجدت).
  - إرجاع `{ svg, warnings }` بدل String عارية.
- [ ] استبدال منطق `safeParams` في `vdp-batch.ts` و`StickerStudioDialog` بالنواة.
- [ ] تفكيك `StickerStudioDialog` إلى:
  - `use-sticker-studio.ts` (الحالة، الحفظ، الإدراج).
  - `use-sticker-export.ts` (التصدير/الطباعة).
  - `studio-header.tsx`, `studio-footer.tsx`, `studio-gallery-view.tsx`, `studio-customize-view.tsx`.
- [ ] تفكيك `StickerProperties` إلى `inspector/design-tab.tsx`, `type-tab.tsx`, `sheet-tab.tsx`, `preflight-tab.tsx`, `presets-tab.tsx`.
- [ ] نقل `resolveTextField`/`resolveColorRole` إلى `lib/sticker-design/hit-testing.ts` مع تفضيل `data-field-id`/`data-color-role`، وإسقاط الاستنتاج النصي تدريجياً.
- [ ] إصلاح Object URL: `object-url-registry.ts` بمؤقت/`records` لكل URL، وإلغاء عند `close` و`unmount`.
- [ ] Zod validation لـ:
  - `StickerUserPreset` عند التحميل.
  - `editingElement.source` عند إعادة التحرير.
  - `StickerElementSource` في مخطط العنصر.
- [ ] إزالة `as Partial<CanvasElement>` غير الضرورية وتضييق الأنواع.

**الملفات المتأثرة:** `frontend/src/features/stickers/**`, `frontend/src/lib/store/types.ts`, `frontend/src/lib/utils.ts` (استيراد فقط)، `frontend/test/sticker-*.test.ts`.

**معيار الإنجاز:**
- لا تغيير في Snapshot SVG.
- `rg "safeParams|sanitizeStickerColor" frontend/src/features/stickers` لا يظهر إلا داخل `lib/sticker-design`.
- أكبر ملف في الميزة ≤ 400 سطر (باستثناء ملفات القوالب).
- 100% من اختبارات الملصقات الحالية تمر.

---

### المرحلة 2 — محرك التصدير الآمن للذاكرة (5–7 أيام)

**الهدف:** إنهاء Base64/OOM وتجميد الواجهة، مع الحفاظ على نفس جودة البكسل.

- [ ] `lib/export/rasterizer.ts`:
  - `rasterizeSvg(svg, { widthPx, heightPx, dpi, format, signal }) → Promise<Blob>`.
  - `MAX_RASTER_PIXELS` قبل إنشاء Canvas؛ رفض مع رسالة توجيهية.
  - Fallback على الخيط الرئيسي عند غياب `OffscreenCanvas`.
- [ ] `workers/sticker-raster.worker.ts`:
  - `createImageBitmap(blob)` بدل `<img>` + Data URL.
  - `OffscreenCanvas` + `convertToBlob`.
  - `imageBitmap.close()` في `finally`.
  - بروتوكول `requestId` + `cancel` + `progress`.
- [ ] `lib/export/bitmap-cache.ts`:
  - LRU بالبايت، مفتاح `hash(design)+w+h+format`.
  - سقف 64MB افتراضي، وإغلاق Bitmap عند الإخراج.
- [ ] `lib/export/sheet-composer.ts`:
  - تركيب الشيت من Master واحد (لا إعادة تصيير لكل نسخة).
  - دعم `rows/cols/spacing/margins/rotation/bleed/crop marks`.
  - إذا تجاوز الشيت الميزانية: Tiling أو رفض مع خيار DPI أقل.
- [ ] `lib/export/save-blob.ts`:
  - Desktop: `fetchLocalApi('/api/upload-media', { method:'POST', body: blob })` (مثل `lib/io/media-upload.ts`).
  - Web: `URL.createObjectURL(blob)` + `download` + إلغاء عبر Registry.
  - إبقاء `SaveImageFromBase64` كـ Fallback مؤقت فقط، مع تعليق واضح.
- [ ] تحويل VDP إلى تدفّق:
  - `for row` → `rasterizeSvg` → حفظ/تجميع → `bitmap.close()` → التالي.
  - لا `pngUrls[]` ضخم؛ فقط المسارات/Blobs النهائية المطلوبة.
  - على سطح المكتب: حفظ مباشر لكل بطاقة أو شيت، ثم إدراج المسارات.
  - على الويب: سقف أقل أو ZIP/شيت بدل 500 عنصر.
- [ ] إزالة `toDataURL` من المسارات الداخلية للشيت/VDP؛ يبقى فقط عند حدود API قديمة مؤقتة.
- [ ] إضافة `AbortController` لكل مهمة تصدير وإلغاء فعلي عند إغلاق الحوار.

**معيار الإنجاز:**
- 20 عملية تصدير 600 DPI متتالية بلا نمو Heap غير محدود (قياس Chromium).
- VDP 500 صف لا يبني 500 صورة في الذاكرة؛ الذروة تحت الميزانية المعلنة.
- لا `object URL` غير مُلغى بعد إغلاق الحوار.
- زمن الواجهة لا يتجمد > 100ms أثناء التصدير (Worker).

---

### المرحلة 3 — جودة الطباعة والـ Preflight (6–8 أيام)

**الهدف:** مخرجات قابلة للطباعة بثقة، مع فحص مسبق واضح.

- [ ] تعبئة `defaultMm` لكل الـ83 قالباً + تحرير المقاس في الواجهة (قفل النسبة).
- [ ] `bleedMm` و`safeMm` في المخطط + Overlay في المعاينة (تبديل).
- [ ] Preflight نقي:
  - نص أصغر من 6pt/1.5mm.
  - تباين < 4.5 للنص الصغير و< 3 للكبير (مع توضيح أنه تقدير للطباعة لا WCAG نهائي).
  - عنصر داخل منطقة القص/خارج الـ Safe.
  - باركود: X-dimension، Quiet Zone، تباين، صلاحية البيانات.
  - صورة نقطية بدقة فعالة < 300 DPI (عند وجودها).
  - خط غير مضمّن في SVG، أو حقل فارغ.
  - تجاوز ميزانية البكسل/المقاس.
- [ ] `preflight-tab.tsx`: Pass/Warn/Error + إصلاح مقترح (زيادة الخط، تغميق اللون، تفعيل الهامش).
- [ ] خط قص:
  - إضافة `dieCutPath`/`dieCutShape` اختياري في `StickerTemplate` للقوالب الدائرية/المخصصة.
  - Fallback المستطيل الحالي عند غياب المسار (لا استدلال تلقائي).
  - معاينة وتصدير بنفس الهندسة.
- [ ] شيت:
  - مقاسات ورق جاهزة (A4/A3/A5/Letter/100×150/مخصص) + اتجاه + هوامش + تدوير.
  - معاينة مطابقة للتصدير (Math واحد).
- [ ] PDF مباشر:
  - استخدام `ExportPrintSheet`/`PrintService` الحالي عبر Go مع الصورة المركبة و`ExportFormat=pdf`.
  - ضبط `PaperWidthMM/PaperHeightMM` بدقة؛ خطوط القص متجهة.
  - محاولة إضافة `TrimBox`/`BleedBox` في `print_pdf_export.go` إن كان `gofpdf` يسمح بذلك؛ وإلا توثيق القيد.
  - CMYK: مسار TIFF الحالي، مع تحذير صريح أنه فصل حبري تقريبي.
- [ ] DPI Metadata:
  - حفظ PNG عبر Go مع `pHYs` (أو تحويل إلى PDF بمقاس فيزيائي) بدل الاعتماد على metadata المتصفح.
- [ ] Barcode CI:
  - E2E في Chromium يلتقط رمزاً ويستخدم `BarcodeDetector` للتحقق من القيمة.
  - حالات: Code128، EAN13 صالح/غير صالح، QR.

**معيار الإنجاز:**
- كل قالب له مقاس فيزيائي وPreflight افتراضي (بلا أخطاء حاجبة غير مقصودة).
- PDF الناتج بمقاس ±0.1mm، وخطوط القص صحيحة.
- الباركود/QR يُفكّ شفرياً 100% في CI.
- معاينة الشيت = التصدير (اختبار مقارنة إحداثيات).

---

### المرحلة 4 — التفاعل الاحترافي (6–8 أيام)

**الهدف:** تحرير مباشر يشبه أدوات التصميم، بلا كسر القوالب.

- [ ] طبقة Overlay فوق SVG:
  - `getBBox()` لكل `[data-field-id]`.
  - إطار تحرير + مقابض تحريك/تحجيم/تدوير.
  - Snap إلى المركز/الحواف/المحاذاة البصرية (بدون مكتبة سحب ثقيلة).
- [ ] `overrides`:
  - `dxMm/dyMm/scale/rotationDeg/visible` لكل حقل.
  - تطبيقها في `buildStickerSvg` على عنصر `text` فقط (أو الحاوية المحددة).
  - تصديرها مع التصميم وإعادة تحريرها لاحقاً.
  - Reset لكل حقل/للجميع.
- [ ] Typography:
  - الوزن، المحاذاة، ارتفاع السطر، تباعد لاتيني فقط.
  - Auto-fit أذكى: قياس DOM/SVG (`getBBox`) بدل تقدير Canvas فقط.
- [ ] الألوان:
  - `culori` لبناء لوحات Analogous/Complementary/Triadic في OKLCH.
  - تحذير Out-of-sRGB Gamut + `ΔE 2000` عند تغيير لوحة.
  - إبقاء اللون الأصلي وعدم استبداله صامتاً.
- [ ] المعرض:
  - مفضلة/مؤخرة (localStorage مُصدَّر).
  - عدد لكل تصنيف.
  - بحث ضبابي اختياري (Fuse) بعد قياس.
  - زر «لوحة عشوائية» من لوحات منسقة.
- [ ] القوالب المحفوظة:
  - استيراد/تصدير JSON مع Zod + حد حجم.
  - إعادة تسمية/تكرار/بحث.
- [ ] A11y:
  - `aria-live` لنتائج Preflight.
  - اختصارات: `Ctrl+Z/Y`, `Ctrl+D` (تكرار), `Esc`, أسهم للتحريك الدقيق.
  - احترام `prefers-reduced-motion`.
  - فحص `jest-axe` للمكونات.

**معيار الإنجاز:**
- تحريك نص بالماوس/لوحة المفاتيح ثم تصدير PNG/SVG يعكس الموضع.
- Undo/Redo يغطي كل تغييرات Overrides/الطباعة/الألوان.
- لا `dangerouslySetInnerHTML` جديد بلا تعقيم.
- Axe: 0 انتهاكات حرجة في الاستوديو.

---

### المرحلة 5 — VDP والدفعات الكبيرة (4–6 أيام)

- [ ] تدفّق الصفوف مع `chunk`/`yield` وإلغاء.
- [ ] معاينة أول 20 صفاً فقط + جدول أخطاء لكل صف.
- [ ] التحقق من الربط: كل حقل مطلوب مربوط أو له قيمة أساسية.
- [ ] مخرجات:
  - شيت واحد أو عدة شيتات.
  - PDF/CMYK TIFF عبر Go.
  - ZIP للبطاقات المفردة (على الويب) مع سقف.
- [ ] عدم تحويل 500 بطاقة إلى 500 عنصر كانفاس؛ بدل ذلك:
  - سطح المكتب: حفظ المسارات ثم إدراج شيت/عناصر محدودة.
  - الويب: شيت أو ZIP.
- [ ] تقرير VDP: عدد النجاح/الفشل، الصفوف المتخطاة، سبب الفشل.
- [ ] اختبار 500 صف في CI (بيانات وهمية) مع قياس الذاكرة/الزمن.

**معيار الإنجاز:** 500 صف بلا OOM، مع إلغاء فوري، ونتيجة قابلة للطباعة.

---

### المرحلة 6 — التقوية والإصدار (4–5 أيام)

- [ ] Fuzz لتعقيم SVG (Corpus: script/onload/foreignObject/external href/data:text/css/url()/prototype).
- [ ] Fuzz لمخطط Zod (قيم سالبة/NaN/ضخمة/مفاتيح خطرة).
- [ ] مراجعة أمنية وفق `.agents/skills/security-audit/SKILL.md`.
- [ ] Bundle analysis: لا تدخل مكتبات ثقيلة إلى Chunk الرئيسي؛ كلها Dynamic Import.
- [ ] CI كامل: typecheck + lint + unit + E2E + Go tests + docs-gate + bundle budget.
- [ ] تحديث:
  - `README.md` (جدول الميزات).
  - `docs/developer_guide.md` (عقود التصدير/الطباعة).
  - `docs/testing_guide.md` (أوامر/أرقام).
  - `docs/features-tracker.md` (سجل الجلسة + الفجوات).
  - `changelog/fragments/` (fragment واحد).
- [ ] خطة تراجع: إبقاء المسار القديم خلف مفتاح مؤقت لمدة إصدار واحد إن لزم.

**معيار الإنجاز:** CI أخضر 100%، Docs Gate ناجح، لا P0/P1 أمنية مفتوحة، وقياسات الأداء ضمن الميزانية.

---

## 7. بروتوكول الأمان

### 7.1 حدود الثقة

| المصدر | الثقة | الإجراء |
|---|---|---|
| مكتبة القوالب المدمجة | موثوقة (كود المشروع) | مراجعة فقط؛ لا تُعامل كمدخل مستخدم |
| حقول النص/الألوان/الخط | **غير موثوقة** | تعقيم + سقف طول + Zod |
| القوالب المحفوظة (`localStorage`) | **غير موثوقة** | Zod + رفض/تجاهل الحقول الزائدة |
| ملف VDP (CSV/XLSX) | **غير موثوق** | حجم/صفوف/صيغ معطلة/حماية prototype |
| SVG المستورد/المصدَّر | **غير موثوق عند الفتح** | DOM Sanitizer + Allowlist + منع External Refs |
| مسار الحفظ المحلي | موثوق عبر Go | MIME sniff + حجم + كتابة ذرية + اسم مولّد |
| الطابعة/PDF | حدود النظام | تحقق مقاسات/ألوان + عدم ادعاء PDF/X |

### 7.2 الضوابط الإلزامية

1. **تعقيم مركزي واحد** في `buildStickerSvg`؛ لا يُبنى SVG للعرض أو التصدير من أي مكان آخر.
2. **Allowlist** للعناصر/السمات في `sanitizeSvgMarkup` بدل Denylist فقط:
   - مسموح: `svg,g,path,rect,circle,ellipse,line,polyline,polygon,text,tspan,textPath,defs,linearGradient,radialGradient,stop,clipPath,mask,pattern,filter,feGaussianBlur,feOffset,feBlend,feColorMatrix,feMorphology,feMerge,feMergeNode,style` (بشروط).
   - ممنوع: `script,foreignObject,iframe,object,embed,animate,set,handler`.
   - السمات: حظر `on*`, `javascript:`, `data:text/html`, `@import`, `expression(`, `href` خارجي.
3. **سقف نص الحقل** 500 حرف، وسقف عدد الحقول 50، وسقف حجم SVG الناتج 1MB (Warning/رفض).
4. **الألوان/الخطوط** عبر `isSafeCssColor` و`FONT_FAMILY_NAME`؛ لا تُمرَّر قيمة خام إلى سمة.
5. **خطوط `data:`** فقط، MIME `font/woff2`، سقف 400KB/وجه، وجهان/عائلة، لا `@import`/URL خارجي.
6. **Object URLs**: Registry لكل URL + إلغاء عند الإغلاق/إلغاء المهمة؛ لا مؤقت عالمي واحد.
7. **VDP**: حد 10MB، 500 صف، `sheetRows`، تعطيل الصيغ/الأنماط/HTML/VBA، `dense`، منع `__proto__/prototype/constructor`، ورفض الصفوف الفارغة.
8. **الحفظ الثنائي**: `/api/upload-media` مع Origin + Session Token، MIME sniff، حد حجم، اسم ملف مولّد (لا اسم مستخدم).
9. **Go**: كتابة ذرية `.tmp` + `fsync` + `os.Rename`، لا مسارات من العميل، لا أسرار في الثنائي.
10. **السجلات**: لا تُسجَّل قيم الحقول/الملفات/التوكنات؛ تُسجَّل الأخطاء برموز.
11. **CSP/Serving**: أي SVG مخدوم من نفس الأصل يجب أن يُقدَّم بـ `Content-Type: image/svg+xml` + `Content-Security-Policy: sandbox` أو تعقيم قبل الخدمة (الفجوة RV-5 الموثقة تخص مسار التخزين/الخدمة، وليست في نطاق هذه الخطة لكنها مانع إصدار إن لمسنا Serving).
12. **الاعتماديات**: Pin + `npm audit` + مراجعة ترخيص/صيانة؛ لا إضافة مكتبة PDF/باركود بلا مبرر مكتوب.

### 7.3 اختبارات أمنية

- Fuzz Corpus لـ SVG (≥ 1000 حالة مولدة) + حالات انحدار لكل payload معروف.
- Zod: قيم `NaN`, `Infinity`, سالبة، ضخمة، مفاتيح prototype.
- VDP: ملف 11MB، 501 صف، صيغة `.exe` مُعاد تسميتها، صف بعنوان `__proto__`.
- Object URL: 50 عملية تصدير متتالية → صفر URLs حية بعد الإغلاق.
- E2E: فتح SVG مُصدَّر في نفس الأصل لا ينفذ Script (اختبار Playwright في CI).

---

## 8. الأداء وحماية الذاكرة

### 8.1 ميزانية البكسل (أساس القرار)

| المقاس | 300 DPI | ذاكرة RGBA لسطح واحد | 600 DPI | ذاكرة RGBA لسطح واحد |
|---|---:|---:|---:|---:|
| 50×50mm | 591×591 = 0.35MP | ~1.4MB | 1181×1181 = 1.39MP | ~5.6MB |
| A6 105×148mm | 1240×1748 = 2.17MP | ~8.7MB | 2480×3496 = 8.67MP | ~34.7MB |
| A4 210×297mm | 2480×3508 = 8.70MP | ~34.8MB | 4960×7016 = 34.80MP | ~139.2MB |
| A3 297×420mm | 3508×4961 = 17.40MP | ~69.6MB | 7016×9921 = 69.60MP | ~278.4MB |

**القواعد:**

- `MAX_RASTER_PIXELS = 50MP` (متوافق مع `maxPDFPixels` في Go). فوقه: رفض مع خيار DPI أقل، أو Tiling.
- `MAX_CACHE_BYTES = 64MB` للـ Bitmap LRU؛ فوقه إخلاء الأقدم وإغلاقه.
- لا تحتفظ بأكثر من Master واحد لكل تصميم/مقاس؛ البطاقات المتكررة تعيد استخدام نفس الـ Bitmap.
- VDP لا يجمع 500 صورة؛ يحفظ/يرسل كل صف ثم يحرر.
- أي `ImageBitmap` يُغلق في `finally`؛ أي `OffscreenCanvas` يُفقد بعد `convertToBlob`.
- لا `getImageData` لكامل الشيت إلا لمعالجة بكسلات حقيقية.
- لا `toDataURL` في المسار الداخلي؛ Base64 فقط عند حدود API قديمة، ويُزال تدريجياً.

### 8.2 خط الأنابيب

```text
Design → buildStickerSvg → hash
        → BitmapCache? ──yes──→ drawImage(master)
                │ no
                ▼
        Worker: createImageBitmap(svg Blob) → OffscreenCanvas → convertToBlob
                │
                ▼
        SheetComposer (draw masters, marks, bleed)
                │
                ▼
        Blob → /api/upload-media (desktop) | download (web)
```

### 8.3 ميزانيات الواجهة

- فتح الاستوديو: ≤ 150ms على جهاز مرجعي (Gallery lazy).
- الكتابة في حقل: لا Long Task > 50ms؛ `useDeferredValue` + `React.memo` + Cache.
- تغيير قالب: ≤ 100ms للـ SVG الأولي.
- تصدير 600 DPI لملصق واحد: ≤ 800ms مستهدف (يُقاس، لا يُفترض).
- VDP 500: تقدم كل 5 صفوف، وإلغاء ≤ 100ms.
- Gallery: لا إعادة رسم لكل البطاقات عند تغيير حقل؛ فصل حالة المعرض عن حالة التصميم.

### 8.4 قياسات مقترحة (Dev-only)

- `PerformanceObserver` لـ `longtask`.
- `performance.memory` (Chromium) قبل/بعد 20 تصديراً.
- عدّاد `liveObjectUrls` و`liveBitmaps` في Dev Overlay.
- Benchmark script في CI للوحدات النقية (بلا Canvas) + E2E للتصدير.

---

## 9. الجودة الرقمية وجودة الطباعة

### 9.1 قواعد الإخراج

| المتطلب | القاعدة | التحقق |
|---|---|---|
| Vector-first | SVG أصلي، لا تحويل إلى صورة قبل الطباعة إن أمكن | تصدير SVG + PDF |
| الدقة | 300 DPI حد أدنى للصور/النصوص الصغيرة؛ 600 DPI للخطوط الدقيقة | Preflight + حساب mm→px |
| المقاس | mm في المخطط والواجهة، لا px | اختبار 50/70/A6/A4 |
| النزف | 2mm افتراضي، قابل للتعديل 0–10mm | معاينة + PDF/PNG |
| المنطقة الآمنة | 2mm افتراضي، تحذير عند تجاوزها | Preflight |
| خط القص | Path صريح من القالب أو مستطيل ناعم Fallback | اختبار كل قالب |
| الخطوط | مضمّنة في SVG، أو محوّلة إلى مسارات للطباعة الحرجة | `embedStickerFonts` + Preflight |
| الألوان | sRGB مصدر؛ تحذير CMYK/Gamut؛ لا استبدال صامت | Culori + Preflight |
| الباركود | X-dimension وQuiet Zone حسب النوع؛ تباين عالٍ | BarcodeDetector CI |
| PDF | مقاس فيزيائي دقيق + خطوط قص متجهة؛ لا ادعاء PDF/X | Go PDF tests |
| CMYK | TIFF فصل حبري عبر Go؛ تحذير أن التحويل تقريبي | Go tests |
| DPI Metadata | pHYs أو PDF فيزيائي؛ لا الاعتماد على Canvas | Go/PDF tests |

### 9.2 Preflight — القواعد والشدّة

| القاعدة | الشدّة | الإصلاح المقترح |
|---|---|---|
| نص < 6pt | Error | زيادة `fontScale` أو تقليل النص |
| تباين < 3.0 | Error | لوحة أغمق/خلفية أفتح |
| تباين 3.0–4.5 لنص صغير | Warning | زيادة الحجم أو التباين |
| عنصر خارج Safe Area | Warning/Error | تفعيل الهوامش أو تصغير العنصر |
| باركود بلا Quiet Zone كافٍ | Error | زيادة الهامش/تصغير الرمز |
| باركود ببيانات غير صالحة | Error | تصحيح القيمة/النوع |
| صورة فعالة < 300 DPI | Warning | استبدال المصدر أو تصغير المقاس |
| خط غير مضمّن في SVG | Warning | تضمين الخط/تحويل النص |
| تجاوز 50MP | Error | DPI أقل/شيت أصغر/Tiling |
| حقول فارغة مطلوبة | Warning | إدخال قيمة أو إخفاء الحقل |

### 9.3 ما لا يجب ادعاؤه

- «PDF/X جاهز» أو «معتمد من المطبعة» بلا تحقق خارجي.
- «CMYK دقيق» بلا ICC Profile وقياس.
- «معاينة مطابقة 100% للطباعة» على شاشة غير معايرة.
- «كل القوالب قابلة للقص التعسفي»؛ خط القص يجب أن يكون صريحاً في القالب.

---

## 10. جودة الكود والنظافة

### 10.1 قواعد إلزامية

- **حد الملف:** 300 سطر للمكونات/الوحدات الجديدة، 400 سطر كحد أقصى بعد التفكيك؛ القوالب مستثناة.
- **مصدر واحد:** لا نسخة ثانية من التعقيم/البناء/القياس.
- **أنواع صارمة:** لا `any` جديد؛ لا `as` لتجاوز المخطط؛ `unknown` + Zod على الحدود.
- **وحدات صريحة:** أسماء `widthMm`, `heightPx`, `dpi`؛ لا متغير `size` غامض.
- **الأرقام السحرية:** ثوابت مسماة في `constants.ts` (300, 600, 2mm, 6pt, 50MP).
- **التعليقات:** عربية موجزة تشرح «لماذا»، لا «ماذا».
- **الاختبارات:** كل دالة نقية جديدة لها اختبار؛ كل إصلاح له اختبار انحدار.
- **عدم التكرار:** أي منطق يتكرر مرتين يُنقل إلى `lib` في نفس الـ PR.
- **عدم كسر العقود:** `StickerElementSource` و`CanvasElement` بتوافق خلفي + Migration.
- **الأداء:** لا `useEffect` يعتمد على `dragX/dragY/zoom` لإعادة Cache (قاعدة Konva).
- **الأمان:** لا `dangerouslySetInnerHTML` إلا بعد `sanitizeSvgMarkupCached`.
- **RTL/Fluent:** لا `ml-/mr-` خارج `ltr-island`، واستخدم `Fluent*` وTokens.

### 10.2 شجرة هدف مقترحة

```text
features/stickers/
  components/
    studio/
      sticker-studio-dialog.tsx        (≤ 200)
      studio-header.tsx
      studio-footer.tsx
      studio-gallery-view.tsx
      studio-customize-view.tsx
    catalog/
      sticker-catalog.tsx
      gallery-card.tsx
    preview/
      sticker-preview.tsx
      sticker-overlay.tsx
      sticker-inline-editor.tsx
    inspector/
      sticker-inspector.tsx
      design-tab.tsx
      typography-tab.tsx
      sheet-tab.tsx
      preflight-tab.tsx
      presets-tab.tsx
    vdp/
      vdp-import-dialog.tsx
      vdp-mapping-table.tsx
  hooks/
    use-sticker-studio.ts
    use-sticker-export.ts
    use-sticker-preflight.ts
  lib/
    sticker-design/
      schema.ts defaults.ts migrate.ts build-svg.ts overrides.ts
      preflight.ts hit-testing.ts hash.ts units.ts
    export/
      rasterizer.ts sheet-composer.ts bitmap-cache.ts
      object-url-registry.ts save-blob.ts
    vdp/
      vdp-parser.ts vdp-job.ts
  templates/ (كما هي، مع defaultMm وmetadata)
```

---

## 11. الاختبارات والتحقق

### 11.1 هرم الاختبار

| الطبقة | ماذا تغطي | أين |
|---|---|---|
| Unit خالص | Schema/Migration، Build SVG، Preflight، Sheet Math، Cache LRU، URL Registry، Sanitizer | `frontend/test/sticker-*.test.ts` |
| Component | Inspector tabs، Catalog، Inline Editor، Preflight UI، Keyboard | `frontend/test/sticker-*.test.tsx` |
| E2E (CI فقط) | Gallery → Customize → Edit → Undo → Export → Insert، VDP، PDF، Barcode decode | `frontend/e2e/sticker-studio.spec.ts` |
| Visual | 6 قوالب تمثيلية (عربي/QR/باركود/دائري/إطار/تدرج) عند 300 DPI | Playwright snapshot في CI |
| Performance | 20 تصدير 600 DPI + VDP 500 + Long Tasks | CI benchmark / تقرير يدوي |
| Security | Fuzz SVG/Zod/VDP + Object URL soak + SVG XSS | `frontend/test/sticker-security.test.ts` |
| Go | PDF page size، خطوط القص، CMYK TIFF، رفض الأحجام | `internal/service/print_*_test.go` |

### 11.2 أوامر التحقق (وفق `.agents`)

**مسموح محلياً فقط:**

```bash
npm run typecheck
npm run lint
node scripts/docs-gate.mjs --strict-refs
```

**ممنوع محلياً:** Playwright/E2E/الاختبارات الثقيلة — تُشغَّل في GitHub Actions، ثم `gh run list` و`gh run watch` بعد الدفع (فقط عند طلب المالك).

### 11.3 بيانات الاختبار

- 83 قالباً × (اسم عربي، اسم لاتيني، حقول فارغة، حقول طويلة 500 حرف).
- باركود: `123456789012` (EAN13)، `GRIDO-001` (Code128)، QR `https://grido.app`.
- VDP: 500 صف، صف فارغ، صف بعنوان `__proto__`، ملف 11MB، CSV بفاصل `;`.
- SVG: script/onload/foreignObject/`href="http://..."`/`style="background:url(...)"`/`data:text/html`.
- ألوان: hex قصير/طويل، `rgb()`, `hsl()`, قيمة حقن `#fff" onload="`.
- مقاسات: 50×50، 70×70، A6، A4، A3، 1000mm، 0، NaN.

---

## 12. الالتزام بـ `.agents` والتوثيق

### 12.1 الثوابت

- **حظر `cd`** في أي أمر؛ استخدم `cwd` أو مسارات كاملة.
- **حظر تشغيل Playwright/الاختبارات الثقيلة محلياً**؛ التحقق السحابي فقط.
- **كتابة ذرية** لأي ملف تكوين/تصدير في Go.
- **لا أسرار** في الكود/الثنائي/السجلات.
- **لا إعادة بناء من الصفر** ولا استبدال React+Konva.
- **لا ازدواجية** بين مساري الاستوديو/VDP أو بين Go وJS.
- **Fluent 2 + RTL + A11y** في كل واجهة جديدة.
- **قواعد Konva** عند لمس الكانفاس/التصدير (PixelRatio ثابت، Cache، Drag Layer، إلخ).

### 12.2 مستندات يجب تحديثها مع التنفيذ

| التغيير | المستند |
|---|---|
| هذه الخطة | `docs/plans/sticker-studio-v2-plan.md` (هذا الملف) |
| سجل الجلسة/الفجوات | `docs/features-tracker.md` |
| ميزة ظاهرة | `README.md` (جدول الميزات) |
| عقد تصدير/طباعة | `docs/developer_guide.md` |
| اختبارات/أوامر/أرقام | `docs/testing_guide.md` |
| أي تغيير سلوكي | `changelog/fragments/YYYYMMDD-stickers-<slug>.md` |
| إضافة/نقل ملف مؤثر | `docs/DOCUMENTATION_MAP.md` + `git grep` للمراجع |
| تغيير قاعدة حاكمة | `.agents/AGENTS.md` + المهارة المعنية |

### 12.3 بوابة ما قبل الكومت

```bash
node scripts/docs-gate.mjs --strict-refs
```

ثم في CI: typecheck + lint + unit + E2E + Go + bundle budget. لا `--no-verify`.

---

## 13. المخاطر والخطط البديلة

| الخطر | الاحتمال | الأثر | التخفيف |
|---|---|---|---|
| تشكيل العربية في PDF المتجهي | متوسط | مرتفع | إبقاء النص كصورة/مسارات، أو Raster 600 DPI؛ اختبار مع مطبعة قبل الادعاء |
| OOM على 600 DPI A3 | متوسط | مرتفع | سقف 50MP + Tiling + رفض واضح |
| Worker/OffscreenCanvas غير متاح | منخفض | متوسط | Fallback على الخيط الرئيسي + سقف أقل |
| انحدار بصري أثناء التفكيك | متوسط | متوسط | Snapshot + عدم تغيير `buildStickerSvg` إلا باختبارات |
| مكتبة جديدة غير مصانة/ثقيلة | متوسط | متوسط | Dynamic Import + Pin + مراجعة ترخيص + بديل |
| تباين متطلبات المطابع | مرتفع | متوسط | Preflight + تقرير + عدم ادعاء PDF/X |
| تسريب Object URLs | متوسط | متوسط | Registry + اختبار Soak |
| نمو القوالب إلى مئات | منخفض | متوسط | بحث/تصنيفات + Lazy + Fuzzy لاحقاً |
| تعارض مع تعديلات أخرى على `sticker-studio-dialog` | متوسط | متوسط | تفكيك تدريجي، PRs صغيرة، عدم لمس السلوك في PR الهيكلة |

---

## 14. مؤشرات النجاح (KPIs)

| المؤشر | خط الأساس | الهدف |
|---|---|---|
| OOM أثناء 100 تصدير متتالي | غير مقاس/محتمل | 0 |
| ذروة الذاكرة لعملية تصدير | غير محدودة | ≤ 2.5× حجم سطح Canvas |
| VDP 500 صف | 500 صورة محتجزة | تدفّق + ذروة ≤ 300MB |
| Object URLs حية بعد الإغلاق | غير مضمون | 0 |
| القوالب بمقاس فيزيائي | 42/83 | 83/83 |
| القوالب بتغطية Preflight | 0 | 83/83 |
| الباركود القابل للمسح في CI | غير مختبر | 100% |
| PDF بمقاس صحيح | غير مختبر من الاستوديو | ±0.1mm |
| أكبر ملف في الميزة | 952 سطراً | ≤ 400 سطراً |
| ازدواجية منطق البناء/التعقيم | موجودة | 0 |
| typecheck/lint | نظيف | نظيف |
| Docs Gate | ناجح | ناجح |
| زمن فتح الاستوديو | غير مقاس | ≤ 150ms مرجعي |
| Long Tasks أثناء الكتابة | غير مقاس | 0 > 50ms |
| اختبارات الملصقات | 9 ملفات | + وحدات Preflight/Export/Security |

---

## 15. أول 10 مهام تنفيذية (بالترتيب)

1. **تدقيق القوالب:** سكربت يقرأ كل قالب ويطبع `defaultMm`/`fields`/`data-field-id`/`data-color-role` — تقرير في `docs/plans/`.
2. **Snapshot SVG** لكل الـ83 قالباً (بنية/هاش) قبل أي تعديل.
3. **إصلاح Object URL Registry** (P0 صغير ومستقل).
4. **مخطط `StickerDesign v2` + Migration** مع اختبارات توافق.
5. **`buildStickerSvg`** ونقل التعقيم من الاستوديو/VDP.
6. **تفكيك الاستوديو** إلى Hook + Header/Footer + View، بلا تغيير سلوكي.
7. **`rasterizer` + Worker** مع Fallback واختبار بكسل صغير.
8. **`saveBlob` عبر `/api/upload-media`** وإزالة Base64 من مسار الإدراج.
9. **Preflight MVP** (نص/تباين/مقاس/بكسل) + تبويب UI.
10. **VDP Streaming** وإزالة مصفوفة 500 صورة.

---

## 16. المراجع الفنية (بحث أكتوبر 2026)

### PDF
- pdf-lib: <https://github.com/Hopding/pdf-lib> · API: <https://pdf-lib.js.org/docs/api/classes/pdfpage>
- jsPDF: <https://github.com/parallax/jsPDF> · إصدار 4.2.1 الأمني: <https://github.com/advisories/GHSA-wfv2-pwc8-crg5>
- svg2pdf.js: <https://github.com/yWorks/svg2pdf.js>
- PDFKit: <https://pdfkit.org/docs/vector.html>

### الباركود
- bwip-js: <https://github.com/metafloor/bwip-js/> · Encoders: <https://github.com/metafloor/bwip-js/wiki/BWIPP-Barcode-Types>
- JsBarcode: <https://github.com/lindell/JsBarcode>
- GS1 2D in Retail: <https://ref.gs1.org/guidelines/2d-in-retail/>

### الألوان
- Culori: <https://culorijs.org/api/>
- Color.js: <https://colorjs.io/docs/gamut-mapping>
- CSS Color 4: <https://www.w3.org/TR/css-color-4/>
- CSS Color 5: <https://www.w3.org/TR/css-color-5/>
- WCAG 2.2 Contrast: <https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html>

### الذاكرة/Canvas
- MDN Canvas size: <https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/canvas>
- MDN `toBlob`: <https://developer.mozilla.org/en-US/docs/Web/API/HTMLCanvasElement/toBlob>
- MDN `convertToBlob`: <https://developer.mozilla.org/en-US/docs/Web/API/OffscreenCanvas/convertToBlob>
- MDN `ImageBitmap.close`: <https://developer.mozilla.org/en-US/docs/Web/API/ImageBitmap/close>
- web.dev OffscreenCanvas: <https://web.dev/articles/offscreen-canvas>
- WebView2 Evergreen vs Fixed: <https://learn.microsoft.com/en-us/microsoft-edge/webview2/concepts/evergreen-vs-fixed-version>

### داخل المشروع
- `internal/service/print_pdf_export.go` — PDF بمقاس فيزيائي وخطوط قص متجهة.
- `internal/service/print_export.go` — مسارات PNG/JPEG/TIFF/CMYK/PDF.
- `frontend/src/lib/io/media-upload.ts` — رفع Blob ثنائي إلى `/api/upload-media`.
- `frontend/src/lib/utils.ts:160` — تعقيم SVG.
- `frontend/src/features/stickers/lib/svg-safety.ts` — تعقيم الألوان/الخطوط.
- `frontend/src/features/stickers/lib/sticker-text.ts` — RTL/DPI/Post-process.
- `frontend/src/features/stickers/lib/die-cut-offset.ts` — خط القص.
- `frontend/src/features/stickers/lib/vdp-parser.ts` — حماية VDP.

---

## 17. ملحق: خريطة الأدلة الحالية

| الملف | ما يثبته |
|---|---|
| `sticker-studio-dialog.tsx` | 952 سطراً؛ بناء SVG؛ تصدير PNG/SVG/CutContour؛ إدراج؛ VDP |
| `sticker-properties.tsx` | 766 سطراً؛ تبويبات Design/Sheet/Presets؛ تحذير التباين |
| `sticker-preview.tsx` | 516 سطراً؛ Inline Editor؛ استنتاج الحقول/الألوان |
| `sticker-catalog.tsx` | 455 سطراً؛ Lazy/IntersectionObserver؛ بحث |
| `lib/svg-rasterizer.ts` | `toDataURL`؛ تحميل الخطوط؛ Object URL |
| `lib/sheet-generator.ts` | `toDataURL`؛ شبكة؛ علامات قص |
| `lib/vdp-batch.ts` | تجميع `pngUrls[]`؛ 800×800 ثابت |
| `lib/vdp-parser.ts` | 500 صف/10MB/حماية prototype |
| `lib/die-cut-offset.ts` | مستطيل مشتق من viewBox |
| `lib/sticker-font-embed.ts` | `@font-face` data؛ سقف 400KB |
| `internal/service/print_pdf_export.go` | PDF موجود في Go؛ sRGB فقط؛ حد 50MP |

---

**الخلاصة:** النظام لا يحتاج «ميزات أكثر» بقدر ما يحتاج **حدوداً واضحة بين النواة والواجهة والتصدير**، و**ميزانية ذاكرة**، و**Preflight**، و**مصدر واحد للبناء**. تنفيذ المراحل 0–3 وحده يزيل أخطر أسباب OOM والتسرّب والطباعة المعيبة؛ المراحل 4–6 تحوّله من أداة جيدة إلى استوديو ملصقات احترافي.
