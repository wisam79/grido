# مواصفة معمارية — ترحيل ماسح المستندات إلى نموذج عصبي ثابت + استعدال Go + ميزانية ذاكرة دائمة

**التاريخ:** 24 أكتوبر 2026 · **الحالة:** معتمدة للتنفيذ — القرارات D-1..D-5 محسومة (24 أكتوبر 2026، انظر §9)
**النطاق:** استبدال محرك OpenCV.js WASM بنموذج DocCornerNet (Scanic) بابتلاع ثابت، ترحيل الاستعدال والقص إلى Go، وتثبيت ميزانية ذاكرة دائمة مفروضة آلياً.
**المرجع:** بلاغ انفجار الذاكرة 4GB (الجلسة 1.42 — `docs/features-tracker.md`) · تقرير 20 · مهارة `opencv-mediapipe-ai-tuner` §4 و§6 · مهارة `wails-konva-hi-res-export`.

---

## 1. الملخص التنفيذي

قرار معماري رباعي: **(1)** إزالة OpenCV.js (~12.7MB WASM) ومسار الكنتورات الكلاسيكي بالكامل، **(2)** تشغيل DocCornerNet على كانفاس ابتلاع ثابت يضمن سقف Heap، **(3)** تنفيذ استعدال المنظور والقص والفلاتر في رنتايم Go عبر AssetServer بدقة الطباعة الكاملة دون لمس V8 Heap، **(4)** ميزانية ذاكرة دائمة (V8 < 250MB) مفروضة ببوابة ساكنة + قياس E2E لحظي.

النتيجة النهائية: كانفاس الماسح لا يحتجز أي صورة بدقة كاملة داخل V8 إطلاقاً — لا `ImageData` كاملة، لا كانفاس مصدر بدقة أصلية، لا Blob/Base64 ضخم. البكسلات الثقيلة تعيش في Go (مُدارة بـGC ناضج خارج V8) والكشف العصبي يعمل في كانفاس 512×512 ثابت داخل عامل ويب.

---

## 2. الحالة الموثّقة (تحقق فعلي بالأسطر — 24 أكتوبر 2026)

### 2.1 المسار الحالي

| المكوّن | الدليل |
|---|---|
| التزامن الحالي: ML **على الخيط الرئيسي** + الكلاسيكي في العامل | `document-detector.ts:918` (`detectDocumentWithMl` يُستدعى من `detectDocumentAuto` مباشرة) مقابل `:920` (`runClassicalDetection` عبر العامل) |
| OpenCV: حزمة npm كسولة + مهلة تحميل بارد 90s | `package.json:88` (`@techstark/opencv-js ~5.0.0-release.1`) · `opencv-loader.ts:29` (`WORKER_LOAD_TIMEOUT_MS = 90_000`) |
| مهلة عامل الكشف 15s مع قتل فوري (إصلاح 1.42) | `detector-worker-client.ts:28` و`:93-95` |
| نسخ Buffer بدل نقله (يبطل Zero-Copy) | `detector-worker-client.ts:88` — `imgData.data.slice().buffer` |
| الاستعدال: شرائح 256 صف + قص مصدر + Homography عكسي Bilinear | `warp-pipeline.ts:22` (`WARP_STRIP_ROWS=256`) و`:25` (`CROP_PADDING=2`) و`:171-234` |
| EXIF يُطبَّق في العامل عبر `createImageBitmap({imageOrientation:'from-image'})` | `scanner-warp.worker.ts:62` |
| **مسار رجوع متزامن يفتح كانفاس بدقة كاملة على الخيط الرئيسي** | `use-scanner-processor.ts:127-132` (`srcCanvas.width = img.naturalWidth` + `drawImage`) — انتهاك مباشر لميزانية V8 |
| أهداف الاستعدال بسقف 50MP موحّد | `target-dims.ts:16-32` · `export-limits.ts:7` (`MAX_EXPORT_PIXELS = 50_000_000`) |
| أوضاع الفلاتر الستة | `types.ts` — `'original' \| 'magic' \| 'bw' \| 'grayscale' \| 'sharpen' \| 'deyellow'` |
| مُقسِّم البطاقات المكدّسة: هندسة نقية (لا كنتورات) | `multi-doc-segmenter.ts` — تبعيته الوحيدة من `contour-tracer` هي `computePolygonArea` (دالة نقية) |
| الدمج: ML مُدقّق (confirm/rescue/replace) بميزانيات انتظار متدرّجة | `detect-fusion.ts:26-52` |
| نموذج Scanic محلي + ORT WASM محلي | `public/models/scanic/` — `doccornernet_lean.ort` (1.84MB) + `ort-wasm-simd-threaded.wasm` (1.45MB) · النسخ عبر `scripts/copy-models.mjs` |
| Go: حارس API محلي + نقاط نهاية ثنائية قائمة | `asset_server.go:145` (LocalApiGuard) · `:150` (`/api/trim-memory`) · `:159-199` (`/api/apply-mask` — النمط المرجعي) |
| Go: خدمة معالجة صور قائمة على `imaging` + توازي صفوف | `image_processor.go:22-66` |
| سقوف Go القائمة: 144MP كانفاس طباعة · 65535 ضلع · 256MB كاش خام | `print_service.go:44` · `print_image_pipeline.go:342` (تقرير 20/جلسة 1.40) |
| كاش فلاتر Konva لكل عقدة: 24MP (~96MiB) | `use-filter-cache.ts:36` |
| **لا مكتبة EXIF في Go** | `go.mod` — `imaging v1.6.2` + `gg v1.3.0` فقط |

### 2.2 ⚠️ اكتشافات تصحيحية (تُحسم قبل التنفيذ)

| # | الاكتشاف | الأثر |
|---|---|---|
| **C-1** | **نموذج doccornernet الحالي يبتلع بدقة 224×224 وليس 512×512** — الدليل: `node_modules/scanic/dist/scanic-mlDetector.js` (مصغّر: `var e=224` مع تطبيع ImageNet `t=[.485,.456,.406]`)، وهو ثابت مضغوط داخل حزمة `scanic-ml ~0.2.0` نفسها. | «الابتلاع الثابت 512» يصبح حقيقة معمارية فقط مع قرار **D-1** (إعادة تصدير النموذج بدخل 512 أو امتلاك جلسة ORT مباشرة). حتى إغلاق D-1، تُبنى الواجهة على ثابت واحد `ML_INGEST_SIZE` معزول والابتلاع الفعلي يتبع عقد النموذج — الضمانات المكانية سليمة في الحالتين (فرق Tensor: 0.6MB عند 224 مقابل 3MB عند 512). **حُسم بـA — انظر §9.** |
| **C-2** | **`public/wasm/` هو MediaPipe وليس OpenCV** — `vision_wasm_module_internal.wasm` (10.64MB) يخدم عزل الخلفية وتأطير الوجه. | **يُمنع حذفه** ضمن هذا الترحيل. الوفر المستهدف يأتي حصراً من إسقاط `@techstark/opencv-js` من `package.json` (يختفي من الـbundle كسولاً). يُحدَّث `SECURITY_NOTICE.md` بتوضيح ملكية كل WASM. |
| **C-3** | **ML يعمل حالياً على الخيط الرئيسي** (Cf. 2.1 صفاً أولاً) — استدلال WASM SIMD على خيط الواجهة. | الترحيل ينقل الاستدلال إلى عامل (وهو ما يبرر ضغط الذاكرة الشامل أصلاً). |
| **C-4** | **فجوة EXIF في Go:** العامل الحالي يطبّق اتجاه EXIF قبل الاستعدال؛ `imaging.Decode` في Go لا يفعل. | خدمة Go الجديدة **تملك** تحويل EXIF (قراءة APP1 والتطبيع قبل مطابقة الأركان) — قرار D-3 للتنفيذ. |
| **C-5** | مسار الرجوع المتزامن (`use-scanner-processor.ts:127-132`) يفتح كانفاس بدقة المصدر الكاملة على الخيط الرئيسي. | يُحذف — عقدة Go **هي** مسار الرجوع (Wails حاضر دائماً؛ الاختبارات تسخر العميل على حدود API). قرار D-5. |

---

## 3. القرارات المعمارية المعتمدة (الركائز الأربع)

### R1 — الاستغناء الكامل عن OpenCV.js ومسار الكنتورات
- إسقاط `@techstark/opencv-js` من `package.json` وحذف: `opencv-loader.ts` · `opencv-detector.ts` · `cv-types.ts` · `detect-fusion.ts` · `fast-vision.ts` · `contour-tracer.ts` (مع ترحيل `computePolygonArea` النقية إلى `quad-geometry.ts`).
- حذف فرع `opencv` من `document-detector.worker.ts` و`detector-worker-client.ts` وتسخينه (`warmupDocumentDetectorWorker`).
- **الكشف متعدد المستندات يُصان بلا كنتورات:** تمريرات استدلال تكرارية مقنّعة (§5.1) + الإبقاء على `multi-doc-segmenter.ts` (هندسة دلالة نقية: NMS + شطر البطاقات المكدّسة) — **مع توريث `aspectType` إجبارياً عند الشطر** (مهارة `opencv-mediapipe-ai-tuner` §4 — قاعدة محكمة لا تُنقض).
- سلسلة الرجوع الجديدة: `ML → (تمريرات متعددة في mode=multi) → defaultInsetCorners + إرشاد يدوي`. لا مسار رؤية كلاسيكي إطلاقاً.

### R2 — ابتلاع عصبي ثابت الميزانية
- كانفاس ابتلاع **مربّع ثابت** (`ML_INGEST_SIZE = 224` — عقد النموذج المفحوص مباشرة: دخل ثابت `[1,224,224,3]` · القيمة تُعزل في سجل الميزانية §6) بـletterbox: تحجيم يحافظ على النسبة + تعبئة محايدة `#808080` (لا حواف زائفة).
- `drawImage` مباشرة من `HTMLImageElement` إلى كانفاس الابتلاع (تحجيم GPU — لا `ImageData` وسيط بدقة كاملة)، ثم `getImageData` مرة واحدة (~197KB عند 224) و**نقل** Buffer للعامل (`transfer` — إصلاح C-5 النمطي و`detector-worker-client.ts:88`).
- الاستدلال داخل `scanner-ml.worker.ts` (ORT WASM محلي من `public/models/scanic/`) مع سقف ساعة كلي 8s لكل كشف وإنهاء فوري عند المهلة (نمط 1.42 المحمي).
- **ضمان مكاني صريح:** Heap الكشف = كانفاس ابتلاع (~0.2MB) + Tensor (≤0.6MB) + ساحة ORT (~40MB) ⇒ **≤ 50MB بغض النظر عن دقة المصدر (حتى 50MP+)**.

### R3 — الاستعدال والقص في Go (Print-Full-Resolution، صفر V8)
- نقطة نهاية `/api/scanner-warp` خلف `LocalApiGuard` (نفس نمط `/api/apply-mask`).
- الواجهة **لا ترسل بايتات الصورة** — ترسل مسار الوسائط المحلي القائم + الأركان الأربع في فضاء العرض المتطابق مع EXIF (ما يراه المستخدم). Go يفكّ ويطبّع EXIF ويستعدل ويقص ويصفّي ويدوّر ويُرمّز PNG ويسلّم عبر MediaService.
- المعالجة بشرائح صفوف (256 صف — توازي `warp-pipeline.ts:22`) مع استدامة الرياضيات نفسها (Homography عكسي + Bilinear) — **توازٍ بكسلي مقصود مع مسار TS الموروث حتى إغلاق المرحلة 2** (توازي المعاينة↔التصدير المفروض في `wails-konva-hi-res-export` §2.1).
- ترتيب العمليات مُثبَّت تعاقدياً: **EXIF → فك → استعدال → فلتر → تدوير 90/180/270** (درس انعكاس 180° — تقرير 20 بند 2: ترتيب التحويلات يُختبر لا يُفترض).

### R4 — ميزانية ذاكرة دائمة مفروضة آلياً
- سجل ثوابت واحد `frontend/src/lib/memory/budget.ts` (§6) + بوابة ساكنة `scripts/memory-budget.mjs` + قياس لحظي E2E + قياس ميداني telemetry (§7 مراحل 4).

---

## 4. البنية المستهدفة

### 4.1 تدفّق الكشف (بعد الترحيل)

```
[تحميل الصورة (HTMLImageElement — bitmap مُدار من المتصفح، خارج V8)]
        │
        ▼
buildIngestCanvas(src, ML_INGEST_SIZE=224)   ← drawImage مباشر، letterbox، تعبئة محايدة
        │  ImageData 224×224 (~197KB) — transfer وليس copy
        ▼
scanner-ml.worker  (ORT WASM محلي · مهلة 8s · terminate عند المهلة/العطل)
        │  أركان مطبَّعة → رفع لمقياس المصدر الكامل (عكس الـletterbox)
        ▼
[mode=single] نتيجة واحدة
[mode=multi ]  تمريرة 2: تعتيم المنطقة المكتشفة على كانفاس الابتلاع → إعادة استدلال
               ... حتى ML_MAX_PASSES=3 أو ثقة < ML_ADD_MIN_SCORE (0.6)
        │
        ▼
NMS (نقي، قائم) → شطر البطاقات المكدّسة (هندسة دلالة، توريث aspectType) → DetectedDocument[]
        │
        ▼  عند فشل/مهلة ML
defaultInsetCorners + toast إرشادي «اضبط الأركان يدوياً» (رمز SCN-DETECT-01)
```

### 4.2 تدفّق الاستعدال (بعد الترحيل)

```
use-scanner-processor.generateWarpedUrlForDoc(corners, aspect, isPreview)
        │  لا fetch للصورة · لا Blob · لا كانفاس مصدر
        ▼
POST /api/scanner-warp  (JSON فقط: sourceUrl + corners + targetW/H + filter + rotation)
        │  LocalApiGuard + تحقق مسارات MediaService (Path Traversal fail-closed)
        ▼
Go: قراءة EXIF Orientation (APP1) → تطبيع → فك (imaging)
        → validateScannerWarp (أركان منتهية داخل الحدود · target ≤ 50MP)
        → Homography عكسي + Bilinear بشرائح 256 صف
        → فلتر (magic/bw/grayscale/sharpen/deyellow — توازٍ بكسلي مع TS)
        → تدوير 90/180/270 → PNG → MediaService (كتابة ذرية)
        ▼
200 {"url":"/media/scan_*.png","width":..,"height":..}   → <img src> (bitmap خارج V8)
```

### 4.3 عقد الواجهة

```jsonc
// POST /api/scanner-warp   (Content-Type: application/json, سقف جسم 64KB)
{
  "sourceUrl": "/media/abc.jpg",          // مسار وسيط قائم حصراً — لا http خارجي، لا data:
  "corners": [{ "x":.., "y":.. }, /* ×4 */], // فضاء العرض المتطابق مع EXIF (ما يراه المستخدم)
  "targetW": 2480, "targetH": 3508,         // resolveTargetDims — السقف Go = 50_000_000 (توازٍ MAX_EXPORT_PIXELS)
  "filter": "magic",                        // enum مفروض، غير معروف ⇒ 400
  "rotation": 0,                            // ∈ {0,90,180,270} وإلا 400
  "format": "png"                           // D-2
}
// 200 → { "status":"success", "url":"/media/scan_<ts>.png", "width":N, "height":N }
// 400 → { "error":"<عربي>", "code":"SCN-WARP-01|02|03|04" }   // أركان تالفة | تجاوز 50MP | مصدر غير صالح | فلتر/تدوير غير صالح
```

- المعاينة (`isPreview=true`) نفس النقطة بأهداف صغيرة (620×877 ونحوها — `target-dims.ts:44-67`) — لا مساراً منفصلاً، فتوازي المعاينة↔التصدير محفوظ بنيوياً.
- إدراج النتيجة: `url` يمرّر إلى تدفّق الإدراج القائم (نمط `addImageElement` بمصدر URL — سابقة الجلسة 1.41). عقد `onSave(blob)` في الحوار يتحول إلى `onSave(url)` (§7 مرحلة 2).

### 4.4 طوبولوجيا العمال (قبل ← بعد)

| العامل | قبل | بعد |
|---|---|---|
| `document-detector.worker` (JS pyramid + OpenCV WASM 90s) | ينشأ عند فتح الحوار | **يُحذف** |
| ML على الخيط الرئيسي | نعم (C-3) | **يُرحَّل** إلى `scanner-ml.worker` |
| `scanner-warp.worker` (OffscreenCanvas) | ينشأ عند أول استعدال | **يُحذف** (Go يحلّه) |
| عامل عزل الخلفية + عامل تأطير الوجه (MediaPipe) | قائمان | **بلا تغيير** (قواعد دورة حياة مهارة §6: terminate عند العطل، لا إعادة استخدام ميت) |

---

## 5. تفاصيل التصميم الملزمة

### 5.1 التمريرات التكرارية متعددة المستندات (بدل الكنتورات)

1. تمريرة 1: استدلال كامل ⇒ مستند أول بثقة ≥ `ML_STANDALONE_MIN` (0.55).
2. `mode=multi` فقط: تعتيم مضلع المستند المكتشف على **كانفاس الابتلاع** (تعبئة بلون الحشوة المحايد) ⇒ إعادة استدلال ⇒ مستند إضافي بثقة ≥ `ML_ADD_MIN_SCORE` (0.6).
3. حتى `ML_MAX_PASSES = 3` (كلفة إضافية ≈ 2×20ms عند 512). ثم NMS القائم، ثم `splitQuadIntoIdCardsWithSeam` للبطاقات المكدّسة.
4. **إسقاط كامل لأدوار الدمج** (`detect-fusion.ts` يُحذف) — لا كلاسيكي يُدمج معه؛ العتبات الباقية (`ML_ADD_MIN_SCORE`، `ML_STANDALONE_MIN`) تنتقل إلى `ml-orchestrator.ts` بمسمياتها.

### 5.2 توازي الرياضيات (Parity Contracts)

| العقد | المرجع | إثبات |
|---|---|---|
| Homography + Bilinear | مطابقة رياضية لـ`warp-pipeline.ts:150-234` | Golden vectors (مرحلة 0): مضلعات اصطناعية + صور اصطناعية ⇒ RMSE < 1.5/255 بين مخرج Go وTS |
| الفلاتر الستة | `filters.ts` | Fixture لكل وضع ⇒ RMSE < 2/255 |
| EXIF 1–8 | سلوك `createImageBitmap({from-image})` | 8 صور JPEG اصطناعية بتوسيمات EXIF كاملة ⇒ أركان متطابقة بعد التطبيع |
| target-dims | `resolveTargetDims` (يبقى TS مصدره) | اختبار وحدة TS قائم يضمن السقف 50MP قبل أي نداء Go |
| تدوير 90/180/270 بعد الفلتر | ترتيب `warpSourceImage` | اختبار بكسل حي في Go (نمط `print_flip_rotation_order_test.go`) |

### 5.3 حدود Go الفاشلة المغلقة (fail-closed)

- `maxScannerWarpPixels = 50_000_000` (توازٍ إجباري مع `MAX_EXPORT_PIXELS` — بوابة سجل تمنع الانحراف).
- رفض أي بُعد غير منتهٍ/NaN/سالب، وأركان خارج `[0..w-1]×[0..h-1]` (بلا قصّ صامت — رسالة عربية مفهومة، درس `validateCanvasComposition` تقرير 20 بند 1).
- `sourceUrl` يُحلّ حصراً عبر MediaService (لا مسارات خام)، ورفض `data:`/`http(s)` خارجي.
- الكتابة عبر `utils.AtomicWriteFile`، والعمليات الثقيلة داخل `errgroup` مع `recover` (نمط `recoverPrintWorkerPanic`).
- **ميزانية Go RSS العابرة:** مصدر مفكوك + مخرج (50MP RGBA لكلٍّ = ~200MB) + 64MB تشغيل ⇒ سقف موثّق ≤ ~500MB عابر لأسوأ حالة، مُدار من Go GC خارج V8 — يُقاس في اختبار وليس تقديراً.

---

## 6. ميزانية الذاكرة الدائمة (السجل)

**ملف السجل:** `frontend/src/lib/memory/budget.ts` — مصدر الحقيقة الوحيد؛ كل ثابت يُصدَّر ويُستهلك ولا يُكرَّر حرفياً في ملفات أخرى (بوابة تمنع النسخ الحرفي).

| # | المجال | السقف | مصدر القيمة | الإنفاذ |
|---|---|---|---|---|
| B1 | V8 JS Heap — حالة مستقرة (محرر مفتوح + مسح 50MP كاملاً) | **< 250MB** | ثابت جديد | E2E لحظي (§7 م4) + telemetry سجلي |
| B2 | ساحة كشف ML في العامل (ابتلاع+Tensor+ORT) | **≤ 50MB** | `ML_INGEST_SIZE=512` ثابت | ثابت بنيوي + assertion بوابة |
| B3 | كانفاس ابتلاع ML | 224×224 ثابت (ImageData ≈ 197KB) | B2 | `memory-budget.mjs` |
| B4 | كاش فلاتر Konva لكل عقدة | 24MP (~96MiB) | `use-filter-cache.ts:36` قائم | سجل + docs-gate (تقاطع القيم) |
| B5 | سقف بكسل التصدير/الطباعة الموحّد | 50MP | `export-limits.ts:7` قائم | سجل (TS) ↔ `maxScannerWarpPixels` (Go) بوابة توازٍ |
| B6 | بكسلات الاستعدال داخل V8 | **صفر** | R3 | `memory-budget.mjs`: يحظر استيراد `warpPerspective`/`warpSourceImage`/`filters` في `use-scanner-processor` |
| B7 | Base64 للوسائط الضخمة | ممنوع | قرار 1.42/1.41 | قاعدة قائمة + بوابة |
| B8 | حمل WASM | OpenCV 12.7MB ⇒ **0** · MediaPipe 10.64MB (يبقى) · Scanic ORT 1.45MB (يبقى) | C-2 | `memory-budget.mjs`: يفحص `package.json` + جرد `public/` |
| B9 | عدد عمال الويب | سجل مغلق: `scanner-ml` + عزل الخلفية + تأطير الوجه (3) | §4.4 | `memory-budget.mjs`: جرد `new Worker(` مقابل قائمة بيضاء |
| B10 | كاش Go الخام للطباعة | 256MB | `print_image_pipeline.go:342` قائم | قائم — يُضاف للسجل للتوثيق فقط |

**Telemetry ميداني:** عيّنة `performance.memory.usedJSHeapSize` عند نقاط: فتح الماسح، بعد الكشف، بعد الاستعدال، بعد الإدراج، وأثناء خمول المحرر كل 30s — تُسجَّل عبر `createLogger` بصيغة سطر واحد `MEMSNAP {scope} {heapMB}` لتسهيل diff بين الإصدارات في `grido.log`.

---

## 7. خطة التنفيذ خطوة بخطوة

> قاعدة حاكمة (AGENTS.md): كل إصلاح باختبار انحدار أحمر قبل الإصلاح وأخضر بعده حيث أمكن، والتحقق الثقيل عبر CI. كل مرحلة تُغلق ببواباتها قبل الانتقال.

### المرحلة 0 — شبكة الأمان (بلا تغيير سلوكي)

| البند | التفصيل |
|---|---|
| Golden vectors | توليد 3 صور اصطناعية (منظور متزايد) × 5 مضلعات ⇒ تشغيل مسار TS الحالي والتقاط مخرجات + مصفوفة Homography (9 قيم) ⇒ تثبيتها fixtures (**RGBA خام بلا ترميز + manifest JSON** — يلغي أي تباين فك ترميز بين Go وTS) في `internal/service/testdata/scanner_warp/` — **قبل أي حذف**، فيبقى مرجع مستقل عن أي تطبيق |
| خط الأساس الميداني | تشغيل سيناريو 50MP كامل على البناء الحالي والتقاط `MEMSNAP` (قبل/بعد في نهاية الترحيل) |
| جرد EXIF | 8 fixtures JPEG بتوسيمات 1–8 |
| **بوابة الخروج** | fixtures ملتقطة ومثبّتة · لا تغيير كود إنتاج |

### المرحلة 1 — خدمة استعدال Go (إضافة فقط، لا تغيير واجهة)

| البند | التفصيل |
|---|---|
| ملفات جديدة | `internal/service/exif_orientation.go` (قارئ APP1 أصغر — D-3) · `internal/service/scanner_warp_service.go` (تطبيع → فك → تحقق → Homography عكسي بشرائح 256 → فلاتر الستة → تدوير → PNG → AtomicWrite) · نقطة `/api/scanner-warp` في `asset_server.go` (سقف جسم 64KB · LocalApiGuard · تحقق مسارات MediaService) |
| اختبارات | `scanner_warp_test.go`: توازي Golden vectors (RMSE < 1.5) · 8 حالات EXIF · 6 فلاتر (RMSE < 2) · ترتيب الاستعدال→فلتر→تدوير ببكسل حي · رفض الأركان التالفة/تجاوز 50MP/`data:`/مسار خارجي (fail-closed) · سقف RSS عابر على صورة اصطناعية 25MP |
| **بوابة الخروج** | `go vet` + `go test ./internal/service ./internal/handlers` أخضر · الواجهة لم تُمسّ |

### المرحلة 2 — تحويل الواجهة إلى Go (مسار مزدوج مؤقت)

| البند | التفصيل |
|---|---|
| ملفات | `frontend/src/lib/scanner/warp-client.ts` (عميل fetch مطبوع + تصنيف أخطاء `formatSolvableError` بأكواد SCN-WARP-01..03) · `use-scanner-processor.ts`: استبدال `generateWarpedBlobForDoc` بـ`generateWarpedUrlForDoc` (لا fetch للصورة، لا Blob) · عقد `onSave(blob)` ⇒ `onSave(url)` في `document-scanner-dialog.tsx` ومسار الإدراج |
| صمام أمان | `SCANNER_WARP_BACKEND = 'go' \| 'js'` لمدة إصدار واحد (افتراضي `go`) — **يحذف في المرحلة 5**. **يُحذف المسار المتزامن بدقة كاملة (C-5) فوراً** (لا يبقى تحت أي راية: انتهك B6) |
| اختبارات | تحديث اختبارات المعالج (سخرية العميل على حدود API) · E2E مواصفات الماسح تعمل على `go` · توازي معاينة↔تصدير على حالات a4_p/id_card/square |
| **بوابة الخروج** | `tsc` · `eslint --max-warnings 0` · Vitest · مواصفات E2E الماسح خضراء على مسار go |

### المرحلة 3 — منسّق ML ثابت الابتلاع + إزالة OpenCV

| البند | التفصيل |
|---|---|
| ملفات جديدة | `scanner-ml.worker.ts` (ORT + مهلة 8s + terminate عند المهلة/العطل — قواعد §6) · `ml-ingest.ts` (`buildIngestCanvas` letterbox + نقل Buffer) · `ml-orchestrator.ts` (تمريرات تكرارية §5.1 + عتبات مهاجرة + NMS + شطر دلالي بتوريث aspectType) |
| حذف | `opencv-loader.ts` · `opencv-detector.ts` · `cv-types.ts` · `detect-fusion.ts` · `fast-vision.ts` · `contour-tracer.ts` (بعد ترحيل `computePolygonArea` إلى `quad-geometry.ts`) · فرع `opencv` من العامل/العميل/التسخين · حزمة `@techstark/opencv-js` من `package.json` |
| تعديل | `document-detector.ts` يذوب في `ml-orchestrator.ts` (يبقى: `defaultInsetCorners` · `addManualDocumentQuad` · `splitQuadIntoIdCards` — تصديراتها العامة محفوظة للأسماء التاريخية) · `use-scanner-detection.ts`: إسقاط `warmupDocumentDetectorWorker` وتوحيد التسخين على ML عند فتح الحوار (نمط requestIdleCallback القائم) |
| اختبارات | حذف `opencv-detector.test.ts` و`detect-fusion.test.ts` · إعادة كتابة `scanner-hardening.test.ts` على المنسّق الجديد · حالة تمريرتين: صورتان اصطناعيتان ⇒ مستندان في multi · وحدة single ⇒ مستند واحد حصراً · مهلة عامل ⇒ رجوع defaultInset بلا تعليق |
| **بوابة الخروج** | كل بوابات الواجهة + `npm run build` نظيف **مع assertion حجم الـbundle: لا chunk يتجاوز 6MB** (اختفاء كتلة OpenCV يُثبت قياساً لا ادعاءً) |

### المرحلة 4 — السجل + التلمتريا + بوابات CI

| البند | التفصيل |
|---|---|
| ملفات | `frontend/src/lib/memory/budget.ts` (سجل B1-B10 — يستورد القيم القائمة من مصادرها، لا يكررها) · `scripts/memory-budget.mjs` (بوابة ساكنة: غياب opencv من `package.json` · حظر استيرادات الكنتور/الاستعدال اليدوي في `use-scanner-processor` · `ML_INGEST_SIZE` يطابق السجل · جرد العمال مقابل قائمة بيضاء · سقف chunk 6MB) · `frontend/e2e/memory-budget.spec.ts` (تشكيل صورة 50MP لحظياً → فتح الماسح → كشف → استعدال → إدراج؛ عيّنات `usedJSHeapSize` عند كل نقطة < 250MB) · خطاف MEMSNAP في `createLogger` |
| CI | خطوة `memory-budget` في وظيفة `validate-frontend` في `ci.yml` + husky `pre-push` · المواصفة اللحظية ضمن شارد E2E القائم (بلا وظيفة جديدة) |
| docs-gate | تأكيدات جديدة: RV-Scanner-1 (لا `@techstark/opencv-js`) · RV-Scanner-2 (لا استيراد كلاسيكي) · RV-Scanner-3 (الاستعدال عبر عميل Go حصراً في المعالج) · RV-Scanner-4 (`ML_INGEST_SIZE` == قيمة السجل/المستند) · RV-Scanner-5 (توازي 50MP بين TS وGo) · تحديث أرقام المستندات المتقاطعة |
| **بوابة الخروج** | البوابة الساكنة خضراء محلياً وفي CI · E2E الذاكرة خضراء · docs-gate `--strict-refs` أخضر |

### المرحلة 5 — التنظيف والتوثيق (بعد إصدار واحد مستقر)

- حذف صمام `SCANNER_WARP_BACKEND` وكود TS المتبقي: `perspective-warper.ts` · `warp-pipeline.ts` · `warp-worker-client.ts` · `scanner-warp.worker.ts` · `filters.ts` · `document-detector.worker.ts`.
- `SECURITY_NOTICE.md`: توضيح ملكية WASM (C-2) · `README.md` (الميزات والأرقام) · `docs/features-tracker.md` (جلسة جديدة) · `DOCUMENTATION_MAP.md` (تحديث القياسات) · fragment في `changelog/fragments/` · تحديث مهارة `opencv-mediapipe-ai-tuner` (قسم الماسح: النموذج العصبي هو المحرك، توثيق تمريرات الشطر الدلالي) · أرشفة هذه الخطة بحالة «منفَّذة» (قاعدة `DOCUMENTATION_MAP.md:34`).

---

## 8. جرد الملفات (إجمالي)

| العمل | الملفات |
|---|---|
| **إضافة** | `internal/service/scanner_warp_service.go` (+test) · `internal/service/exif_orientation.go` (+test) · `/api/scanner-warp` في `asset_server.go` · `frontend/src/lib/scanner/warp-client.ts` · `scanner-ml.worker.ts` · `ml-ingest.ts` · `ml-orchestrator.ts` · `frontend/src/lib/memory/budget.ts` · `scripts/memory-budget.mjs` · `frontend/e2e/memory-budget.spec.ts` · `internal/service/testdata/scanner_warp/*` |
| **تعديل** | `use-scanner-processor.ts` (URL + حذف المسار المتزامن) · `use-scanner-detection.ts` (تسخين ML فقط) · `document-scanner-dialog.tsx` (عقد `onSave(url)`) · `document-detector.ts` ⇒ يذوب في المنسّق · `detector-worker-client.ts` ⇒ عميل عامل ML · `quad-geometry.ts` (يستقبل `computePolygonArea`) · `core/index.ts` · `package.json` (إسقاط opencv) · `ci.yml` · `scripts/docs-gate.mjs` · `.husky/pre-push` |
| **حذف** | `opencv-loader.ts` · `opencv-detector.ts` · `cv-types.ts` · `detect-fusion.ts` · `fast-vision.ts` · `contour-tracer.ts` · `perspective-warper.ts` · `warp-pipeline.ts` · `warp-worker-client.ts` · `scanner-warp.worker.ts` · `document-detector.worker.ts` · `cv-worker-probe.worker.ts` · `__tests__/opencv-detector.test.ts` · `__tests__/detect-fusion.test.ts` |

---

## 9. سجل القرارات (محسومة — 24 أكتوبر 2026)

> **دليل حسم D-1 (فحص مباشر):** تحميل `doccornernet_lean.ort` عبر onnxruntime 1.27 أثبت أن الغراف **ثابت الدخل** `input tensor(float) [1, 224, 224, 3]` بمخرجَي `coords [1,8]` و`score_logit [1,1]` — أي أن تغيير حجم الدخل مستحيل بلا إعادة تصدير.

| # | القرار | الحسم | الأساس |
|---|---|---|---|
| **D-1** | جعل «512» حقيقة ابتلاع لا واجهة فقط | **A — الإبقاء على 224 الحالي** (`ML_INGEST_SIZE = 224`) | فحص الغراف أعلاه: الخيار C (جلسة ORT مباشرة) لا يملك تغيير حجم دخل ثابت، وB يتطلب أدوات إعادة تصدير ونسخة `scanic-ml` داعمة غير متاحة حالياً. كل مكاسب الذاكرة (B2/B3) معمارية ولا تعتمد على دقة الابتلاع. الثابت معزول في السجل؛ إعادة التصدير لاحقاً تبقى ترقيةً بتغيير ثابت واحد |
| **D-2** | صيغة مخرج الاستعدال | **PNG** | توازٍ مع المسار الحالي، بلا فقدان، مناسب للطباعة؛ WebP يُدرس لاحقاً بقرار مستقل |
| **D-3** | EXIF في Go | **قارئ APP1 داخلي (~100 سطر)** | عدم تضخيم go.sum لحاجة عمود واحد |
| **D-4** | توضيح | `public/wasm/` = MediaPipe (10.64MB) **يبقى** | ملزم — لا يُعد جزءاً من OpenCV ولا يُحذف |
| **D-5** | حذف مسار الرجوع المتزامن (C-5) | **حذف فوري** | عقدة Go **هي** مسار الرجوع؛ يبقى قاعدة B6 (صفر بكسل استعدال في V8) حصرية |

---

## 10. المخاطر وضبطها

| الخطر | الأثر | الضبط |
|---|---|---|
| تراجع اكتشاف multi بعد إسقاط الكلاسيكي | مستندات متجاورة لا تُلتقط | Golden suite اصطناعية (م0) + مواصفات E2E متعددة المستندات قائمة تُشغّل على المسار الجديد **قبل** حذف OpenCV (مرحلة 3 تُغلق بمقارنة أدقّة لا بعبور أخضر فقط) |
| عدم تطابق فضاء أركان EXIF بين العرض وGo | قصّ منحرف/مقلوب | اختبارات التوسيمات 1–8 (م1) بfixtures مولّدة — القصّ الخطأ يظهر بكسلياً فوراً |
| انحراف توازي Bilinear/فلاتر TS↔Go | اختلاف جودة خفي | Golden vectors بRMSE ملزم، لا «تشابه بصري» |
| بطء إقلاع ORT بارد في العامل | أول كشف يتأخر | تسخين عند فتح الحوار (نمط قائم) + مهلة 8s ⇒ رجوع إرشادي بلا تعليق |
| تذبذب قياس الذاكرة في CI | بوابة E2E صاخبة | عتبة 250MB سخية (القصد كشف الانفجار لا التوفير)، عيّنات متعددة، وإعادة محاولة واحدة آلية |
| تراجع دقة الزوايا عند الابتلاع الصغير | أركان أقل دقة على مستندات صغيرة | الأركان تُستخرج بنسبة الابتلاع ثم **تُقاس بمصدر الصورة المعروض للمستخدم** (تعديل يدوي قائم كضمانة UX)؛ D-1 يحسّن هذا |

**التراجع:** صمام `SCANNER_WARP_BACKEND` (م2) يبقى إصداراً واحداً لتراجع الاستعدال فوراً. تراجع الكشف يستعيد كتلة OpenCV من Git (بلا وسط بين المرحلتين: إزالة الكشف الكلاسيكي م3 تحدث بعد استقرار م1+م2 في إصدار واحد على الأقل).

---

## 11. القواعد المحكمة التي يلتزم بها التنفيذ

1. **دورة حياة العمال** (مهارة `opencv-mediapipe-ai-tuner` §6): التقاط الطلبات المعلقة ثم `terminate()` وتصفير المرجع عند أي عطل؛ لا إعادة استخدام عامل ميت.
2. **توريث `aspectType` عند شطر البطاقات** (§4 من المهارة): إجباري؛ يُمنع الاستدلال الهندسي المنفرد بعد الشطر.
3. **أخطاء قابلة للحل** (`formatSolvableError`) بأكواد SCN-* ورسائل عربية صريحة — لا فشل صامت.
4. **لا Base64 للوسائط الضخمة** (B7) — مسار URL حصراً.
5. **كتابة ذرية وفشل مغلق** — `utils.AtomicWriteFile` وتحقق مدخلات يرفض لا يقصّ صامتاً.
6. **توازي المعاينة↔التصدير** (`wails-konva-hi-res-export` §2.1) — نفس المعادلات والمصدر للنقطة الواحدة.
7. **توثيق إلحاقي لا إعادة كتابة تاريخ** — هذه الخطة تُؤرشف بحالة «منفَّذة» عند إغلاقها (`DOCUMENTATION_MAP.md:112`).
