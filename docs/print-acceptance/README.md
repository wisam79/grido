# قبول الطباعة على طابعة فعلية

هذه الحزمة هي الإجراء التشغيلي الدائم (SOP) لقبول مسار الطباعة الفيزيائي في Grido Studio على Windows. ملف الإثبات القياسي هو [`manifest.schema.json`](./manifest.schema.json)، ونقطة البدء القابلة للنسخ هي [`manifest.template.json`](./manifest.template.json).

> [!IMPORTANT]
> - لا تُعد الاختبارات الآلية أو CI أو المحاكيات أو المعاينة أو **Microsoft Print to PDF** قبولاً على طابعة فعلية، حتى لو نجحت كلها.
> - قبول **CMYK TIFF** مسار منفصل: يُفحص الملف بأداة خارجية متخصصة في ما قبل الطباعة ثم يُسلّم إلى مسار المطبعة المتفق عليه. نجاحه لا يثبت قبول طباعة Windows/GDI، والعكس صحيح.
> - اللون في هذه الحزمة **تسجيل فقط (record-only)** ما دام ICC مؤجلاً؛ لا يرفع انطباع لوني جيد نتيجة هندسية فاشلة، ولا يفشل القبول بسبب فرق لوني وحده.

## 1. نطاق القبول ووحدة السجل

أنشئ manifest مستقلاً لكل تركيبة ثابتة من:

1. commit + إصدار التطبيق + ملف بناء Windows؛
2. الطابعة + firmware + driver؛
3. وسيلة الاتصال: `usb` أو `network`؛
4. إعدادات الوسائط والجودة واللون المستخدمة فعلياً.

لا تخلط اتصال USB واتصال الشبكة في سجل واحد. إذا كان كلاهما ضمن الدعم المطلوب، نفّذ الحزمة مرتين وسجّل manifest منفصلاً لكل اتصال. لا تنقل نتيجة طابعة أو driver أو firmware إلى تركيبة أخرى.

## 2. المخرجات المطلوبة

احفظ الحزمة خارج مجلد `docs/`، مثلاً:

```text
artifacts/print-acceptance/<acceptance-id>/
├── manifest.json
├── source/                 # fixture/project الأصلي
├── output/                 # الملف النقطي المرسل إلى Windows spooler
├── scans/                  # مسح ضوئي مسطّح، بلا auto-crop أو auto-scale
├── photos/                 # صورة كاملة للورقة والطابعة/الحالة عند الحاجة
└── logs/                   # timeline وحالة الطابور وملاحظات التشغيل
```

كل مصدر ومخرج ودليل رقمي يجب أن يحمل SHA-256 داخل manifest. الورقة الفيزيائية لا يمكن تجزئتها؛ اربطها بمعرّف العينة الظاهر في الصورة/المسح وبـ SHA-256 لملف الدليل.

## 3. المتطلبات السابقة

### 3.1 البرنامج وWindows

- استخدم بناء Windows حقيقياً من commit محدد، وسجّل commit SHA، إصدار التطبيق، معرّف البناء، اسم artifact وSHA-256 له.
- سجّل Windows edition/version/build/architecture ونسخة WebView2 إن أمكن.
- احتفظ بالـ fixture وملف الإخراج الذي أُرسل إلى الطابعة، ولا تعِد توليدهما بعد القياس.

### 3.2 الطابعة والقياس

- سجّل الشركة، الموديل، الرقم التسلسلي إن توفر، firmware، اسم driver وإصداره ومعماريته.
- سجّل الاتصال المستخدم حرفياً: USB مع منفذه/معرّفه، أو شبكة مع البروتوكول والعنوان/اسم الطابور.
- استخدم مسطرة صلبة أو قدمة قياس (caliper) بدقة قراءة موثقة؛ يوصى بدقة `0.1 mm` أو أفضل. سجّل الأداة والرقم التسلسلي وتاريخ المعايرة إن توفر.
- عطّل auto-fit/scale/crop في driver ما لم يكن جزءاً مقصوداً من الخطة، وسجّل paper/media/quality/borderless/color كما طُلبت وكما طُبقت.
- اترك الورقة تستقر قبل القياس وفق تعليمات الوسيط والطابعة؛ سجّل زمن الانتظار في الملاحظات.

### 3.3 fixture ثابت

يجب أن يضم fixture واحداً على الأقل:

- إطار قياس أفقي ورأسي بأبعاد معلومة وعلامات top/center/bottom/left/right؛
- صورة cover تُظهر القص المتوقع بوضوح؛
- فلتر واحد على الأقل بقيم معروفة؛
- شفافية alpha فوق خلفية معلومة؛
- نصاً عربياً ولاتينياً بأحجام صغيرة وكبيرة؛
- barcode/QR بحمولة ثابتة قابلة للفك؛
- grid وخطوط قص/حدود رفيعة تكشف الانزياح أو القص.

## 4. مصفوفة التشغيل الإلزامية

يحتوي manifest على عشر حالات، ولا يجوز حذف حالة؛ استعمل `blocked` مع سبب إن تعذر تنفيذها:

| المعرّف | الحالة | الحد الأدنى |
|---|---|---|
| `geometry_a4_portrait` | A4 عمودي | 3 طبعات متتالية من الملف نفسه |
| `geometry_a4_landscape` | A4 أفقي | 3 طبعات متتالية |
| `geometry_4x6_borderless_portrait` | ‏4×6 بوصة بلا حواف، عمودي | 3 طبعات متتالية |
| `geometry_4x6_borderless_landscape` | ‏4×6 بوصة بلا حواف، أفقي | 3 طبعات متتالية |
| `geometry_custom_portrait` | مقاس مخصص عمودي | 3 طبعات متتالية؛ يُسجل المقاس الفعلي |
| `geometry_custom_landscape` | المقاس المخصص نفسه أفقياً | 3 طبعات متتالية |
| `content_fidelity` | cover/filter/alpha/text/barcode/grid | صورة + scan، وفك barcode بأداة مسجلة |
| `fault_offline` | فصل الطابعة/الشبكة | لا نجاح كاذب، حالة `PRINTER_OFFLINE`، وتعافٍ موثق |
| `fault_paper_out` | درج فارغ/نفاد الورق | حالة `OUT_OF_PAPER` ثم تعافٍ بعد تزويد الورق |
| `fault_cancel` | إلغاء job ID المعروف | إلغاء المهمة المقصودة فقط، بلا ورقة إضافية أو إلغاء مهمة أخرى |

`4×6` في الطلب يعني `101.6 × 152.4 mm` قبل تبديل الاتجاه. المقاس المخصص يجب أن يكون قالباً يدعمه driver أو نموذجاً مخصصاً موثقاً؛ لا يُقبل سقوط صامت إلى A4/Letter.

## 5. خطوات التنفيذ

### 5.1 تثبيت الهوية والـ hashes

1. انسخ [`manifest.template.json`](./manifest.template.json) إلى مجلد الأدلة وغيّر `acceptanceId`.
2. املأ بيانات التطبيق وWindows والطابعة والاتصال والأداة.
3. احسب SHA-256 للبناء والـ fixture ولكل ملف خرج. على PowerShell:

```powershell
Get-FileHash -Algorithm SHA256 <path>
```

4. لا تغيّر الملف بعد حساب hash. إذا تغيّر، أعد الحساب وسجّل السبب.

### 5.2 الخطة المطلوبة مقابل المطبقة

لكل حالة، سجّل قبل إرسال المهمة:

- `requestedPlan`: form ID/name، أبعاد الورق، الاتجاه، media، quality/DPI، borderless، color؛
- `appliedPlan`: القيم التي أعادها driver/الخطة الفعلية؛
- `planComparison`: نتيجة المقارنة وسبب أي fallback.

أي fallback صامت أو اختلاف غير معتمد في form ID/name أو الأبعاد أو الاتجاه أو borderless أو media أو quality أو color يفشل الحالة. إذا كان التغيير مقصوداً، صحّح الطلب أولاً ثم أعد التشغيل؛ لا تعدّل السجل بأثر رجعي كي يطابق الناتج.

### 5.3 الطباعة وtimeline

1. اطبع النسخ الثلاث لكل حالة هندسية من **نفس output hash**.
2. سجّل timeline مؤرخة: plan resolved، submitted/job ID، spooling/rendering/printing، ثم completed أو الحالة الخطأ/الإلغاء.
3. لا تعتبر اختفاء المهمة من الطابور دليلاً كافياً وحده؛ اربط الحالة بالورقة والدليل والصورة/scan.
4. في حالات offline/paper-out/cancel، تأكد أن التطبيق بقي مستجيباً، ولم يُظهر اكتمالاً كاذباً، وأن التعافي أو الإلغاء اقتصر على المهمة المقصودة.

### 5.4 القياس

لكل نسخة هندسية، قِس وسجّل:

- العرض عند `top` و`horizontalCenter` و`bottom`؛
- الارتفاع عند `left` و`verticalCenter` و`right`؛
- انحراف crop/cut عن موضعه المتوقع عند الحواف الأربع، ثم أكبر قيمة مطلقة.

لا تقس الورقة الخارجية فقط إذا كان driver يقصها؛ استخدم إطار fixture ذي الأبعاد المعروفة. لا تستعمل قياس scan بعد auto-crop أو resize بديلاً عن القياس الفيزيائي.

احسب القيم الأسوأ كما يلي:

```text
dimensional error = max(|كل قياس عرض - target width|,
                        |كل قياس ارتفاع - target height|)

run-to-run variation = max(range القياسات المتناظرة عبر النسخ الثلاث)

horizontal scale = mean(top, horizontalCenter, bottom) / target width
vertical scale   = mean(left, verticalCenter, right) / target height
anisotropy %     = |horizontal scale - vertical scale|
                   / mean(horizontal scale, vertical scale) × 100

crop/cut error = max(|انحراف كل حافة/علامة قص عن موضعها المتوقع|)
```

سجّل القيمة الأسوأ عبر جميع النسخ في `evaluation`، ولا تقرّب قبل المقارنة بالحد.

### 5.5 الصور والمسح واللون

- التقط صورة كاملة تُظهر الورقة ومعرّف الحالة/العينة ومسطرة مرجعية، من دون perspective مضلل قدر الإمكان.
- امسح الورقة مسحاً مسطحاً بدقة أصلية، مع إيقاف auto-crop/deskew/fit/scale؛ سجّل جهاز المسح وإعداداته في الملاحظات.
- افحص cover/filter/alpha/text/barcode/grid وسجّل المتوقع والمشاهد. يجب أن يفك barcode إلى نفس hash للحمولة المتوقعة.
- سجّل ظروف الإضاءة والانطباع اللوني والفروق المرئية، لكن أبقِ `colorPolicy = record-only` و`iccStatus = deferred`. لا تضع حد Delta-E أو حكم لون pass/fail قبل اعتماد ICC وأداة قياس مناسبة.

## 6. بوابات القبول

| البوابة | شرط النجاح |
|---|---:|
| أقصى خطأ أبعاد | `≤ 0.5 mm` |
| أقصى تباين بين التشغيلات | `≤ 0.3 mm` |
| أقصى anisotropy | `≤ 0.5%` |
| أقصى خطأ crop/cut | `≤ 0.5 mm` |
| اللون | تسجيل فقط؛ ICC مؤجل |

تُقبل الحزمة (`execution.result = pass`) فقط إذا:

- الحالات العشر موجودة وكلها `pass`؛
- الحالات الهندسية حققت الحدود الأربع؛
- requested/applied plan متطابقتان بلا fallback صامت؛
- اختبارات المحتوى وحالات offline/paper-out/cancel نجحت؛
- source/output/evidence hashes وبيانات المشغّل والتاريخ مكتملة.

استخدم `fail` عند وجود نتيجة منفذة فاشلة، و`blocked` عند تعذر التنفيذ أو نقص العتاد/الدليل، و`pending` للقالب الذي لم يُنفذ. **لا تحوّل pending أو blocked إلى قبول.**

## 7. التحقق من manifest

المخطط يستخدم JSON Schema Draft 7، ويغلق الخصائص غير المعروفة بـ `additionalProperties: false`. كما يمنع إعلان `pass` إذا تجاوزت القيم الرقمية الحدود أو بقيت البيانات الأساسية/الأدلة فارغة.

مثال باستخدام Ajv المتوفر في المشروع:

```bash
node -e "const fs=require('node:fs');const Ajv=require('./frontend/node_modules/ajv');const ajv=new Ajv({allErrors:true,jsonPointers:true});const schema=JSON.parse(fs.readFileSync('docs/print-acceptance/manifest.schema.json','utf8'));const data=JSON.parse(fs.readFileSync('docs/print-acceptance/manifest.template.json','utf8'));const ok=ajv.validate(schema,data);if(!ok){console.error(ajv.errors);process.exit(1)}"
```

التقرير الأولي لهذه الموجة موجود في [`../reviews/23-real-printer-acceptance-2026-11-13.md`](../reviews/23-real-printer-acceptance-2026-11-13.md) وحالته **pending**؛ وجود الحزمة لا يعني أن تشغيل طابعة حدث.
