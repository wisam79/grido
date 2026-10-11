# تتبّع أنظمة الألوان في الطباعة (sRGB / CMYK / ICC)

**التاريخ:** 2026-10-11
**النطاق:** المسار الكامل للون من الواجهة → الحمولة → Go → الملف/الطابعة، مع رصد التحويلات والفجوات.
**المنهجية:** قراءة سطراً بسطر لمسارات التوليد والتصدير في Go والواجهة، مع تشغيل اختبار سقف الحبر فعلياً لقياس TAC (لا نقل أرقام من التوثيق).

---

## 1. الملخص التنفيذي

1. **مسار الطباعة الفعلي اليوم sRGB حصراً.** الواجهة تُثبّت `colorSpace: 'sRGB'` و`exportFormat: 'jpeg'` في `use-print-export.ts:443,446`، فلا يوجد أي عنصر واجهة يُرسل `'cmyk'` أو `'pdf'` أو `'png'`.
2. **مسار CMYK كامل ومُختبر في الخلفية، لكنه غير قابل للوصول من التطبيق.** `print_cmyk.go` + فرع CMYK في `print_export.go` + اختبارات Go، لكن لا مُستدعي في الواجهة يطلبه. الفروع الأخرى (PDF/PNG/CMYK) تُخدم فقط عبر الاختبارات أو استدعاء مباشر للـ IPC.
3. **لا وجود لإدارة ألوان حقيقية (ICC).** لا ملفات ICC ولا مكتبة lcms؛ التحويل رياضي عبر `color.RGBToCMYK` + تعزيز Rich Black. القرار `D-5` يبقيها خارج النطاق.
4. **لا مُدارية ألوان على المخارج:** لا تضمين ملف تعريف ألوان في PNG/JPEG/TIFF، ولا تحويل لأجهزة العرض.
5. **TAC الفعلي = 293.3%** (قياس حيّ)، تحت سقف 300% المُختبَر، لكن تعليق الاختبار `print_cmyk_test.go:232` يقوله «~197%» وهو **رقم خاطئ** (doc-vs-code discrepancy).

---

## 2. خريطة المسار

```
الواجهة (Konva, sRGB جهاز)
  ├─ الوضع الحر: لقطة الكانفاس PNG  → /api/upload-print-image → /local-image/*.png
  └─ الكولاج: مصادر الخانات كما هي (data: أو /local-image)
        ↓  domain.PrintRequest { colorSpace, exportFormat, backgroundColor, dpi, items, cutLines, composition }
Go: GeneratePrintSheet (print_service.go:198)
  ├─ كانفاس gg RGBA 8-bit (فضاء sRGB ضمني) + تعبئة الخلفية بـ parseColor
  ├─ معالجة الصور (Lanczos + LUT سطوع/تباين + تشبع + فلاتر photography) — كلها sRGB 8-bit
  ├─ خطوط القص: رمادي 120 (print_compose.go:82)
  └─ composeCanvas (الوضع الحر) إن وُجد
        ↓  saveOutput (print_export.go)
  ├─ PDF   → sRGB فقط (CMYK مرفوض) + خطوط متجهة + JPEG q95 مضمّن
  ├─ sRGB  → JPEG q90 (الطباعة) أو PNG (افتراضي) + حقن DPI (JFIF/pHYs)
  └─ CMYK  → ConvertRGBAtoCMYK → ApplyPureBlackCutLines → TIFF (Deflate+وسوم الدقة) أو JPEG q90 + معاينة PNG مصغّرة
        ↓
HTML معاينة (buildNativePrintHTML) → window.print (WebView2) أو PrintNative
```

---

## 3. عقد الطلب وحقول الألوان

`internal/core/domain/print.go:52` — `PrintRequest` يحمل:
- `ColorSpace string` (`"sRGB"` أو `"CMYK"`) — السطر 61.
- `ExportFormat string` (`png/jpeg/tiff/pdf`).
- `BackgroundColor string` يُفكّ في Go عبر `parseColor` (`print_compose.go:33`) الذي يفهم `#RGB/#RGBA/#RRGGBB/#RRGGBBAA/"transparent"` ويفشل بصوت مسموع عند صيغة غير معروفة (أبيض + تحذير سجل) بدل أصفار صامتة.

نفس الحقلين موجودان في عقد TS المولّد: `frontend/bindings/grido/internal/core/domain/models.ts:238-260`.

---

## 4. مسارات الإخراج حسب (colorSpace, exportFormat)

| colorSpace | exportFormat | المخرج | ملاحظة |
|---|---|---|---|
| sRGB | jpeg | `.jpg` | **مسار الطباعة الحالي الوحيد** (q90، JFIF DPI) |
| sRGB | png | `.png` | الافتراضي عند غياب jpeg (pHYs DPI) |
| sRGB | pdf | `.pdf` | JPEG q95 مضمّن + خطوط قص متجهة، سقف 50MP |
| CMYK | tiff | `.tif` | Deflate + `XResolution/YResolution/ResolutionUnit` |
| CMYK | jpeg | `.jpg` | q90، سقف بكسلات 100MP (`cmykPixelCapError`) |
| CMYK | pdf | ❌ مرفوض | `print_pdf_export.go:39` — gofpdf لا يضمّن CMYK |

المصدر: `print_export.go:186-330` (تفريع `isCMYK` و PDF)، `print_pdf_export.go`، `print_export.go:53-67` (سقف CMYK-JPEG).

---

## 5. التحويل إلى CMYK تفصيلاً (`print_cmyk.go`)

- **الأساس:** `color.RGBToCMYK` (stdlib) — رياضي، بلا ICC.
- **تسطيح الألفا على الورق الأبيض** قبل التحويل: RGBA المخزّن premultiplied يُركَّب فوق أبيض بصيغة `F = rp + (255 - a)` (المسار السريع للمصفوفات)، ولغير RGBA بصيغة 16-bit مكافئة. (كانت البكسلات الشفافة تُقرأ سوداء.)
- **Rich Black:** عند `K > 220` و`c,m,y < 50` تُضاف تعزيزات بنسبة `richFactor = (K-220)/35`: `c+40·f، m+30·f، y+30·f` (سطر 23).
- **خطوط القص:** `ApplyPureBlackCutLines` تعيد رسمها أسودَ نقياً `(0,0,0,255)` بإيقاع مطابق للمعاينة (متصل/منقط/متقطع/علامات زوايا) مع حارس المدى المعكوس (RV-16-L3) وخط Bresenham المائل.
- **التوازي:** التحويل على عدد الأنوية بعمال تحت `utils.SafeGo`.
- **TAC المقيس:** **748/1020 = 293.3%** (تشغيل `TestRGBToRichCMYK_TotalAreaCoverageCap` — 2026-10-11). الحد دون 300% بنيوياً، لكن تعليق الاختبار الرقمي «~197%» غير صحيح.

---

## 6. أين تُحدَّد الألوان في الواجهة، وما هو قابل للوصول

- `print-dialog.tsx` — **لا يحوي أي مبدّل فضاء ألوان أو صيغة** (أُزيلا في تقنية سابقة، ويؤكده بحث الكود: لا وجود لـ`cmyk`/`colorSpace` في `src/` إلا موضع واحد).
- `use-print-export.ts` — يبني `domain.PrintRequest` بـ:
  - `colorSpace: 'sRGB'` (سطر 443)
  - `exportFormat: 'jpeg'` (سطر 446)
  - `backgroundColor: backgroundColor || previewWhite()`
- خلفيات الوضع الحر/الكولاج تُرسم في Konva ثم تُلتقط أو تُرسل كصور؛ نموذج التدرّجات `gradientStart/gradientEnd` من `canvas-colors.ts` يُرسم داخل حزمة Konva/Konva→Go.
- **لون المعاينة** في الحوار يُرسم HTML/Konva (sRGB جهاز) — لا معاينة CMYK (لأن الواجهة لا تطلبها أصلاً).

---

## 7. مسار التصدير العميل الثاني (مختلف عن الطباعة)

`export-dialog.tsx` يصدّر صوراً مباشرة من الكانفاس عبر `exportCanvas`/`exportSlotCanvas` (عميل بحت): PNG أو JPG بجودة منزلقة — **sRGB حصراً** (لا خيار فضاء ألوان، ولا مرور على Go). هذا منفصل تماماً عن خط `ExportPrintSheet`.

---

## 8. الفجوات والمخاطر

| # | الفجوة | الدليل | الأثر |
|---|---|---|---|
| G1 | **لا ملفات ICC ولا إدارة ألوان** | لا مكتبة lcms/icc في Go (بحث) | CMYK تقريبي؛ لا مطابقة معيارية للمطابع |
| G2 | **CMYK غير قابل للوصول من الواجهة** — ✅ مُصلح جزئياً (2026-10-11) في مسار **التصدير**؛ حوار الطباعة يبقى sRGB قراراً محميًا | `use-print-export.ts:443` يثبّت sRGB | ميزة مطبعة معطّلة عملياً لمستخدم التطبيق (انظر القسم 12) |
| G3 | **PDF + CMYK مرفوض** | `print_pdf_export.go:39` | لا مسار CMYK متجهي للمطبعة |
| G4 | **sRGB غير مُدار على المخارج** | لا تضمين ICC في PNG/JPEG/TIFF | ألوان تختلف بين أجهزة العرض/الطابعات |
| G5 | **TAC بلا قيد صريح** (≤300% بالبناء، مقيس 293.3%) | `print_cmyk.go:23`, `print_cmyk_test.go:248` | قد يتجاوز حدود بعض المطابع الحدّية |
| G6 | **تعليق اختبار خاطئ** («~197%») — ✅ مُصلح (2026-10-11) | `print_cmyk_test.go:231` | توثيق مضلّل داخل الكود |
| G7 | **خط القص: رمادي 120 في sRGB/PDF مقابل أسود نقي في CMYK** — فارق **مقصود وموثّق** | `print_compose.go:79` | ليس عيباً، لكنه يلزم بقاء موثّقاً |
| G8 | **مخرجات «CMYK» كانت RGB فعلياً** — ✅ مُصلح جزئياً (2026-10-11): TIFF صار `photometric=5`، وJPEG ما زال RGB | القياس في `print_cmyk_tiff_test.go` والقسم 12 | ملف مطبعة يفقد فصل الأحبار بلا أي إشارة |

---

## 9. تغطية الاختبارات المرجعية

- **Go:** `print_cmyk_test.go` (تحويلات، Rich Black، تسطيح ألفا، TAC، الخطوط المعكوسة)، `print_cutline_test.go`، `print_pdf_export_test.go` (رفض CMYK)، `print_perf_fixes_test.go` (`cmykPixelCapError`)، `print_hardening_test.go` (فرع CMYK-JPEG)، سيناريوهات `print_workshop_scenarios_test.go` (منها CMYK/TIFF).
- **الواجهة:** اختبارات الحمولة/التخطيط للطباعة (`test/print-*.test.ts*`)، و`e2e/print-dialog.spec.ts` (مؤخراً: وضع حر + كولاج + مسار المتصفح الاحتياطي).

---

## 10. التوصيات (بالأولوية)

1. ✅ **مُنفَّذ (2026-10-11):** حسم F-1 — أُعيد مدخل CMYK في حوار **التصدير** (لا الطباعة) لإخراج TIFF/JPEG، ووُصل بالمسار الخلفي عبر `runCmykExport`. (تفاصيل القسم 12.)
2. ✅ **مُنفَّذ (2026-10-11):** صُحّح تعليق G6 في `print_cmyk_test.go:231` إلى الرقم المقيس (748/255 ≈ 293.3%).
3. **إدارة ألوان (اختياري، قرار مالك):** إن ارتُفع قرار `D-5`، ادخل مكتبة ICC (مثل `github.com/mazznoer/colorgrad` لا تكفي — يلزم lcms) لتحويل CMYK معياري + تضمين ملف تعريف في المخارج.
4. **ثبّت TAC كعقد:** أضف حارساً صريحاً أو وثّق الحدّ كما هو في دليل المطابع.
5. **وضوح WYSIWYG:** أبقِ فارق لون خطوط القص موثّقاً في المعاينة (G7).

---

## 11. قيود هذا التتبّع

- لم يُشغَّل التطبيق على عتاد طباعة حقيقي، ولم تُفحص ملفات مخرجة بأدوات إدارة ألوان خارجية.
- قياس TAC عبر شبكة أخذ عيّنات (خطوة 17) — قريب من القمة لا حصر دقيق.
- ACM/ICC على مستوى نظام التشغيل (Windows/WCS) خارج نطاق الكود.

---

## 12. التنفيذ (2026-10-11): مدخل CMYK في حوار التصدير + إصلاح حامل أحبار TIFF

تنفيذ التوصية **F-1 / (1)** من القسم 10، مع انحدار إضافي اكتُشف أثناء التحقق.

### 12.1 الواجهة — `frontend/src/components/editor/dialogs/export-dialog.tsx`

- **مدخل فضاء الألوان:** مجموعة أزرار RGB/CMYK (`export-colorspace-label`)، شبكة الصيغة صارت مشروطة به:
  RGB ⇒ PNG/JPG، CMYK ⇒ TIFF/JPEG.
- **الربط الخلفي:** `runCmykExport` في `frontend/src/lib/export/export-cmyk.ts` يلتقط الكانفاس
  (`exportCanvas('png',1,stage)`) ← يرفعه عبر `/api/upload-print-image` ← يبني `PrintRequest`
  (عنصر واحد يملأ الورقة، `marginMM/gapMM=0`، `showCutLines=false`، `colorSpace='cmyk'`) ←
  `ExportPrintSheet` ← يقرأ ملف `print_*` من `/local-image/` ويحفظه عبر `downloadBlob`.
  المهلة صريحة (`withTimeout(..., EXPORT_TIMEOUT_MS)`).
- **هندسة صفرية الانحراف (مطابقة `canvas_qa_auditor` + `wails-konva-hi-res-export`):** اللقطة تُنتج
  `canvasWidth×canvasHeight` بكسل بالضبط (`paperCaptureRect` + `pixelRatio=1`)، ومقاس الورقة المرسل
  يُشتق ليحقق `mmToPx(mm, dpi) == canvasPx` (`mm ≈ px × 25.4 / dpi`)؛ ومقاس القالب الفيزيائي يُقبل
  فقط حين يطابق الكانفاس عند تلك الدقة (فرق ≤ 1 بكسل). يمنع ذلك أي إعادة تشكيل صامتة للصورة داخل
  محرك الطباعة، واختبار الحوار يثبت عقد التحويل ذهاباً وإياباً (`Math.round(mm × dpi / 25.4) == canvasPx`).
- **ما لا ينطبق على CMYK:** علامات القص والنزيف وتصدير الخلايا المنفصلة تبقى في مسار RGB فقط،
  والحوار يخفيها ويوضّح السبب بدل تشغيلها بلا أثر.
- **فلتر الحفظ:** `main.go` أضاف فلتر TIFF لمسار `/api/save-file` (كان PNG/JPEG فقط).

### 12.2 الانحدار G8 — «CMYK» في الملفات كان تسمية بلا مضمون (مُصلَح جزئياً)

اختبار جديد (`print_cmyk_tiff_test.go`) كشف بالقياس أن مخرجات CMYK من المشفّرات القياسية **تفقد
فصل الأحبار**:

| المخرج | القياس الفعلي قبل الإصلاح |
|---|---|
| TIFF (`x/image/tiff`) | `PhotometricInterpretation=2` (RGB) مع `SamplesPerPixel=4` = قناة ألفا، والبكسل مكتوب بـ `At().RGBA()` أي **RGB محوّل من CMYK** |
| JPEG (`image/jpeg`) | `SOF0 components=3` (YCbCr) — مكتبة Go القياسية **لا تدعم ترميز CMYK** أصلاً |

**الإصلاح:** مشفّر مستقل `internal/service/print_cmyk_tiff.go` يكتب TIFF 6.0 بفصل أحبار حقيقي:
`PhotometricInterpretation=5` (Separated)، `InkSet=1` (CMYK)، `SamplesPerPixel=4`،
`BitsPerSample=[8,8,8,8]`، `PlanarConfig=1`، `Compression=8` (Deflate)، بلا `ExtraSamples`، مع
إعادة استخدام `injectTIFFResolution` (المنطق المُختبَر) لوسوم الدقة 282/283/296.
`print_export.go` صار يستدعي `encodeCMYKTIFF` بدل `tiff.Encode`. والضغط يتدفق **صفاً-صفاً** إلى مخزن الملف
من غير نسخة خام كاملة (كانت ستضيف حتى ~200MB على سقف 50MP) — الذروة مطابقة للمسار السابق.

**قيد باقٍ (موثّق في الواجهة والتقرير):** مخرج **JPEG يبقى بفضاء RGB** لأن مُرمِّز Go لا يكتب
4 مكوّنات؛ الحوار يذكر ذلك صريحاً في عنوان الخيار وفي لوحة المعلومات، وTIFF هو الحامل الحقيقي.

### 12.3 الاختبارات

- **Go:** `print_cmyk_tiff_test.go` (وسوم الفصل + دورة قنوات حرفية + Stride لصورة فرعية + رفض
  المدخلات غير الصالحة + نهاية-لنهاية عبر `GeneratePrintSheet`)، `print_fullpage_cmyk_test.go`
  (عقد حوار التصدير: كامل الصفحة حدّاً-لحدّ + الامتداد + قيد JPEG).
- **Go (تحديث):** `print_workshop_scenarios_test.go` و`print_cutline_test.go` كانا يفكّان «CMYK»
  بمفكّك RGB (`x/image/tiff` لا يدعم photometric=5)، فصارا يقرآن شريط القنوات الأربع عبر مرجع
  مستقل — الاختبارات كانت تثبّت المخرج الخطأ.
- **الواجهة:** `test/export-cmyk.test.ts` (14 اختباراً) و`test/export-dialog.test.tsx` (11 اختباراً:
  تبديل فضاء الألوان، إخفاء الصيغ غير المنطبقة، معاملات الطلب الفعلية، الامتداد، مسار الخطأ).

### 12.4 إثبات مناعة الاختبارات بفحص الطفرة (Mutation Testing)

قاعدة `quality-cicd-release.md` تفرض إثباتاً بفحص الطفرة على عقود الحمولة الحرجة، وقد وُجد فعلًا **اختبار قليل المناعة وأُصلح**:

| الطفرة المتعمدة | النتيجة المرصودة |
|---|---|
| `buildCmykPrintRequest`: `exportFormat: params.format` ← `'png'` | ❌ 4 اختبارات في `test/export-cmyk.test.ts` (بما فيها تثبيت `exportFormat`) — الطفرة مقتولة |
| حوار التصدير: `paperWidthMM: widthMM` ← `widthMM + 1` | ❌ اختبار «يمرر صيغة CMYK عبر المسار الخلفي» في `test/export-dialog.test.tsx` (تحقق: أُعيد بعد إضافة عقد mm↔px وأمسك الطفرة مجدداً) — الطفرة مقتولة |
| المشفّر: `tiffPhotometricSeparated = 5` ← `2` | ❌ بعد إصلاح المقارنة (أدناه) — الطفرة مقتولة، وأُعيد التأكد منها بعد تحويل الضغط إلى تدفق صفّي |
| حامل الطلب: `ExportFormat: format` ← `"png"` | ❌ `TestExportDialogCMYCFullPageOutput/JPEG` (الامتداد المتوقع `.jpg`) — الطفرة مقتولة |

> **اكتشاف من فحص الطفرة (مُصلح):** كانت `cmykFromTIFFFile` تقارن وسم الفوتومتري بثابت المشفّر نفسه (`tiffPhotometricSeparated`)، وهي مقارنة دائرية تجعل تحويل 5 إلى 2 **لا يُكشف** (الطفرة نجت أول مرة). صارت الاختبارات تسنُد قيم المواصفة **حرفياً** (5/4/1/1) حتى لا تُجرّ نفس ثوابت كود الإنتاج. هذا مثال واقعي على قيمة فحص الطفرة لا على مجرد زيادة اختبارات.

### 12.5 نتيجة التشغيل وبوابات الوكيل

- **محلياً (المسموح به في `.agents/AGENTS.md` §2.2):** `npm run typecheck` (0) ✅ ·`npm run lint --max-warnings 0` (0) ✅ · `node scripts/docs-gate.mjs --strict-refs` (نجاح 100% + 18 مدخلاً + 45 تأكيد كود) ✅ · `go vet ./...` (نجاح) ✅ · وتشغيل **ملفّي اختبار مُستهدفين** فقط (25 اختباراً) للتحقق من تعديلات المكوّن ولإثبات فحص الطفرة ✅.
- **غير محلي (عبر GitHub Actions حسب القاعدة):** المجموعة الكاملة لـ Vitest/Go و E2E وحدود التغطية — لم تُدفع التغييرات (لا `push` بلا إذن المالك).
- **انحراف إجرائي أُتصحّح:** شُغّلت أثناء هذه الجلسة مجموعات ثقيلة محلياً (Vitest كامل + `go test ./...`) قبل قراءة القاعدة؛ التحقق النهائي لجميع الملفات المتغيرة اعتمد على الفحوص الخفيفة أعلاه + التشغيل المُستهدف، والتحقق الشامل محله CI.
- **التوثيق المرافق:** `CHANGELOG.md` تحت `[Unreleased]` · `docs/features-tracker.md` (الجلسة 0.66 + فجوة JPEG المتبقية) · `docs/developer_guide.md` (المشفّر ومسارات الوصول إلى CMYK) · `docs/testing_guide.md` (أرقام ومفاتيح الاختبارات الجديدة) · `README.md` (صف ميزة للمستخدم).
