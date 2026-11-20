# قبول E2E — سجل التشغيل الحقيقي 2026-11-20

## الحالة

**IN PROGRESS — لا قبول نهائي أو نجاح كامل.** القرار المعتمد: رحلات GUI كاملة وآثار ومخرجات وبيانات فعلية، مع تشغيل سحابي كامل على SHA مثبت وإصلاح الفشل، وبيئة معزولة وفرع اختبار مؤقت دون نشر/دمج main. الخطة والمصفوفة في [خطة القبول](../plans/2026-11-20-real-e2e-acceptance-plan.md).

الفصل الإلزامي: mocked browser integration ≠ real Go/SQLite server ≠ native WebView2 ≠ actual local Supabase ≠ physical printer/live cloud. قفل الأرقام والنتائج من تشغيل فعلي فقط؛ لا تُستنتج من عبارات المواصفات.

## التشغيل R0 — قياس الحزمة القائمة

- الفرع: `test/e2e-acceptance-20261120`.
- SHA: `0acc51e684d113175109a38d95c763442720bce1`، لقطة الإصلاحات السابقة والتوثيق والاختبارات المستهدفة.
- Run: [44802717734](https://github.com/wisam79/grido/actions/runs/44802717734).
- الأمر: `gh workflow run ci.yml --repo wisam79/grido --ref test/e2e-acceptance-20261120`.
- `main` لم يتغير، لا release/tag/deploy-pages.

### نتائج مؤقتة واردة من CI

| الوظيفة | الحالة المثبتة عند الفحص |
|---|---|
| Detect Changed Areas | PASS |
| Documentation Gate | PASS |
| Print Performance & RSS Report (Windows) | PASS، report-only |
| Backend Race & Coverage (Scheduled) | PASS |
| Admin Web Quality | PASS |
| Playwright E2E Shard1 | PASS |
| Playwright E2E Shard2 | FAIL |
| Playwright E2E Shard3 | PASS |
| Playwright E2E Shard4 | PASS |
| WebKit Smoke | PASS، ليس الحزمة الكاملة |
| Modal AI Unit Tests | PASS، لا خدمة/نموذج خارجي |
| Backend Quality & Tests | SKIPPED بسبب paths filter، لا قبول كامل |
| Windows Build / Frontend Quality | قيد التشغيل عند الفحص؛ تُلحق النتيجة الفعلية لاحقاً |

### الفشل F-R0-01 — حالة جسر الهاتف

- المصدر: `frontend/e2e/phone-bridge.spec.ts:12`.
- خطوة: `getByRole('dialog').filter({hasText:/جسر كاميرا الهاتف/}).getByText(/الجسر متصل ويعمل/)`، السطر22.
- نتيجة: عنصر غير موجود خلال15000ms، وRetry1 فشل بالطريقة نفسها. الشارد **19 passed / 1 failed**.
- دليل: job `136518862076` ضمن run أعلاه؛ سجل CI محفوظ محلياً في `scratch/e2e-baseline-shard2.log` (مستثنى من Git).
- الحالة: التشخيص والإصلاح قيد التنفيذ؛ لا حذف للتوقع بلا ربطه بالحالة الفعلية/fixture. هذا mocked integration وليس إثبات نقل كاميرا حي.

## فجوات fidelity المثبتة قبل التنفيذ

- `app.spec.ts` يحفظ اسماً ثم يقرأ fixture باسم مختلف، وSaveProject mock لا يكتب شيئاً.
- helper `applyCollagePreset` يتجاهل اسم القالب ويطبق الشبكة الافتراضية.
- unknown Wails RPC يرجع200/null، ما يخفي نداءات غير مُغطاة.
- CI لا يفرض كل الوظائف عند manual dispatch ولا يشغّل Firefox أو كاملWebKit.
- الحزمة الحالية Vite+mock لا تثبت Go/SQLite/native file dialogs أو bytes تصدير.
- لا GUI PDF export مثبت؛ دعم backend وحده لا يجيز قبول رحلة مستخدمPDF.

## نتيجة R0 النهائية — FAILURE

وصلت نتيجة run44802717734 كاملة: Windows Build Verification **PASS**؛ Frontend Quality & Tests **FAIL**، وباقي الحالات كما في الجدول المؤقت (backend-quality skipped). لا شهادة قبول.

**F-R0-02:** `frontend/test/collage-image-crop.test.tsx:453` — حالة منع الكاش أثناء السحب وتنظيف المؤقت تتوقع recache واحدة بعد الاستقرار، لكن0 نداءات. الحزمة الفعلية **186 ملفاً:185passed/1failed**، والحالات **2538:2536passed/1failed/1skipped**. سجل job136518861903 محفوظ في `scratch/e2e-baseline-frontend.log`. التشخيص المستهدف بدأ محلياً بملف واحد مسموح، والفرضية المبدئية تداخل مؤقت gesture retry معcrop settle لا نقص mock. لا تغيير توقعات التراجع/الكاش لإخفاء الخلل.

**تصحيح F-R0-02 — الكود مثبت، إعادة CI كاملة معلّقة:** أُعيدت الحالة red محلياً في ملف واحد (22passed/1failed)، وثبت تداخل retry120ms معcrop settle500ms. التغيير المحدود في `frontend/src/hooks/use-filter-cache.ts` لا يحدد settlement جديداً إذا كان cropTimer قائماً، مع بقاء capture/drag/transform barriers. Green منفرد: `collage-image-crop`23/23 و`use-filter-cache`7/7، مع تأكيد499ms/500ms/no-late-duplicate/unmount. لم تُرخَّ توقعات الكاش أو تستخدم mock لتجاوز العيب؛ لا يعني green الفردي قبول R1 الكامل.

## شروط الإغلاق

آخر SHA واحد، discovery/project inventory مطابق للمنفذ، لا failed/flaky/skip غير مفسر، artifacts trace/screenshots/video المتاح ومخرجات/hash ومراجع البيئة، وإعادة كاملة أخيرة. نقص hardware/OAuth/Modal أو capability يُسجّل BLOCKED مستقلاً، ولا توصف شهادة التطبيق كاملة بأنها PASS مع نقص رحلة لازمة.

## ملاحق التنفيذ والنتائج

تُضاف بعد وصول أوامر/تقارير التأسيس والخدمات ونتائج التشغيل الفعلية. السجل الحالي لا يدعي اكتمال التنفيذ أو النجاح.
