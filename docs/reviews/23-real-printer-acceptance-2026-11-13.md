# مراجعة 23 — قبول طابعة فعلية (Wave 4K)

**التاريخ:** 2026-11-13
**الحالة:** ⏳ **Pending — قالب قبول فقط؛ لم يحدث تشغيل طابعة فعلية**
**النطاق:** بوابة خارجية لقبول مسار Windows على عتاد طباعة حقيقي، بعد اكتمال البوابات البرمجية المناسبة.
**الإجراء الدائم:** [`../print-acceptance/README.md`](../print-acceptance/README.md)
**المخطط:** [`../print-acceptance/manifest.schema.json`](../print-acceptance/manifest.schema.json)
**القالب:** [`../print-acceptance/manifest.template.json`](../print-acceptance/manifest.template.json)

## 1. الحكم الحالي

لا توجد نتيجة قبول أو رفض بعد. لم تُستخدم طابعة فعلية، ولم تُسجّل طبعات أو قياسات أو صور أو scans أو timeline حقيقية. لذلك يبقى هذا التقرير **pending** ولا يجوز الاستشهاد به على أن Wave 4K اجتازت قبول الطابعة.

نجاح اختبار آلي أو CI أو اختبار GDI نقي أو معاينة أو **Microsoft Print to PDF** لا يساوي قبول طابعة فعلية. كما أن قبول **CMYK TIFF** مسار منفصل بأداة خارجية لما قبل الطباعة؛ لا يمنح قبول Windows/GDI ولا يستمد قبوله منه.

## 2. ما أُنجز في هذه الجولة

أُنشئت حزمة توثيق دائمة تسجل، دون افتراض تشغيل:

- commit وإصدار التطبيق ومعرّف وSHA-256 لبناء Windows؛
- Windows edition/version/build/architecture وWebView2؛
- الشركة/الموديل/serial/firmware واسم driver وإصداره؛
- اتصال USB أو network كسجل مستقل؛
- requested plan مقابل applied plan، بما فيه form ID/name؛
- paper/media/quality/DPI/borderless/color والاتجاه والنسخ؛
- job ID وtimeline لحالات plan/submission/spooling/rendering/printing/completion/fault/cancel؛
- SHA-256 للمصدر والمخرج والصور والمسح والسجلات؛
- حالات A4 و4×6 borderless والمقاس المخصص، عمودي وأفقي؛
- fixture يغطي cover/filter/alpha/text/barcode/grid؛
- حالات offline وpaper-out وcancel مع عزل المهمة؛
- قياسات ruler/caliper عند top/center/bottom/left/right؛
- scan/photo evidence وبيانات المشغّل والتاريخ وحكم pass/fail/blocked/pending.

المخطط صارم (`additionalProperties: false`) ويمنع إعلان `pass` عند تجاوز الحدود أو نقص حقول الإثبات الإلزامية. القالب صالح للمخطط وهو معلّق عمداً بقيم `null`/قوائم فارغة حيث لا توجد أدلة.

## 3. مصفوفة التشغيل المطلوبة

| الحالة | المطلوب | الوضع الحالي |
|---|---|---|
| A4 عمودي | 3 طبعات متتالية + قياسات + صور/scan | ⏳ Pending |
| A4 أفقي | 3 طبعات متتالية + قياسات + صور/scan | ⏳ Pending |
| ‏4×6 بوصة بلا حواف عمودي | 3 طبعات + تحقق قص الحواف | ⏳ Pending |
| ‏4×6 بوصة بلا حواف أفقي | 3 طبعات + تحقق قص الحواف | ⏳ Pending |
| مقاس مخصص عمودي | 3 طبعات + form ID/name الفعلي | ⏳ Pending |
| مقاس مخصص أفقي | 3 طبعات + form ID/name الفعلي | ⏳ Pending |
| cover/filter/alpha/text/barcode/grid | فحص عيني + scan + فك barcode | ⏳ Pending |
| offline | حالة صريحة بلا اكتمال كاذب + تعافٍ | ⏳ Pending |
| paper-out | `OUT_OF_PAPER` + تعافٍ | ⏳ Pending |
| cancel | إلغاء job ID المقصود فقط | ⏳ Pending |

## 4. بوابات القياس

| البوابة | الحد الإلزامي | نتيجة فعلية |
|---|---:|---|
| أقصى خطأ أبعاد | `≤ 0.5 mm` | لم يُقَس |
| أقصى تباين run-to-run | `≤ 0.3 mm` | لم يُقَس |
| أقصى anisotropy | `≤ 0.5%` | لم يُقَس |
| أقصى خطأ crop/cut | `≤ 0.5 mm` | لم يُقَس |
| اللون | record-only؛ ICC مؤجل | لم يُسجل |

لا تُقرب القياسات قبل المقارنة، ويُستخدم أسوأ قياس عبر النسخ الثلاث. اللون وصفي فقط في هذه الجولة؛ لا يوجد حد Delta-E ولا حكم pass/fail لوني ما دام ICC مؤجلاً.

## 5. شروط تحويل الحالة

### إلى Pass

لا تتحول الحالة إلى **Pass** إلا بعد:

1. تعبئة manifest مستقل لتركيبة commit/build/Windows/printer/firmware/driver/connection المحددة؛
2. إكمال الحالات العشر ونجاحها؛
3. تطابق requested/applied plan بلا fallback صامت؛
4. نجاح الحدود الهندسية الأربع؛
5. إرفاق hashes وصور وscans وسجلات timeline؛
6. توقيع المشغّل وتاريخ القرار؛
7. تحقق manifest ضد المخطط.

### إلى Fail

تتحول إلى **Fail** عند تنفيذ الحالة ورصد تجاوز للحد أو اختلاف خطة غير معتمد أو إخفاق المحتوى/الأعطال. يجب حفظ الأدلة الفاشلة وعدم استبدالها بنتيجة إعادة تشغيل لاحقة؛ إعادة التشغيل تُسجّل بحزمة/manifest جديد أو كإعادة مؤرخة واضحة.

### إلى Blocked

تتحول إلى **Blocked** إذا لم يتوفر العتاد أو الوسيط أو القالب أو أداة القياس أو تعذر إحداث fault بأمان. `blocked` ليس قبولاً.

## 6. حدود هذه المراجعة

- هذه الجولة وثائق وقالب فقط؛ لا تدعي بناء Windows أو تشغيل تطبيق أو إرسال spool job.
- لا توجد بيانات طابعة/firmware/driver فعلية ولا source/output hashes فعلية.
- لا توجد قياسات مسطرة/قدمة، ولا صور أو scans، ولا operator attestation.
- لا يُغلق قرار ICC المؤجل، ولا يدمج CMYK TIFF داخل قبول الطابعة الفيزيائية.

**الخلاصة:** حزمة القبول جاهزة للاستخدام التشغيلي، أما نتيجة القبول نفسها فتبقى **Pending** إلى أن ينفذها مالك العتاد على طابعة فعلية ويوثق الأدلة وفق المخطط.
