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

## لقطة R1 — تنفيذ مكتوب جاهز للتشغيل، لا نتيجة قبول بعد

أضيفت حزمةالمتصفحاتstrictledger/forcefull، وسبعرحلاتJ01–J07 فيستةspecsfrontendبخلفيةGo/SQLiteمضمّنة، وثلاثرحلاتA01/A02/P01 فيadmin/phoneSupabaselocal. nativeCDP/testdialogadapterتحملbuildtage2eفقط؛ releaseلايشحنها. wrapperيطابقfull/sharddiscoveryويرفضskipped/retries/missingevidence، nativevideoexplicitblocked، PDFGUI/hardware/OAuth/Modalأبوابغيرمغلقة.

الفحوصالخفيقة: frontendtypecheck/lintوالأنواع/lintالمستقلةe2e-acceptance **PASS** بعدتصحيحموضعتعليقاتتعريفاتNodeالمسؤولة؛ reportselftest5/5 وjourneyverifier6/6 **PASS**، YAMLأولparseأصدرwarningleading! ثمصححت`${{...}}` وصارerrors/warningsصفر. لاE2Eمحلي. هذهتفاصيلتأسيسلاادعاءتشغيلR1.اللقطةالكودالأولى25993520متبوعةبتصحيحتعليقاتESMtypes، وتحددSHAالنهائيللدفعقبلdispatch.

## تشغيل R1 الكامل للحزمة المسجلة

run [44807851024](https://github.com/wisam79/grido/actions/runs/44807851024) على8c228110 عبر`ci.yml -f force_full=true` بدأ24شارد=نظامين×ثلاثمتصفحات×أربعشاردات، fullquality/race/report. المساراتactual لم تدخللأنworkflowالجديدغيرمسجلعلىdefaultbranch (dispatch404)، ولميُمسmainللتجاوز. نُقلتactualjobsإلىciالمسجلمعexpected_shaاختياريguard، وأصبحتconcurrencyبSHAتحفظR1عندتشغيلنسخةأحدث.

**F-R1-01:** adminunitdiscovery التقط Playwrightspecsالجديدةe2e-acceptance داخلVitest (معSUPABASE_URLغيرموجود)، فتوقفت2filesمع190unitspass. إصلاحإعدادVitest يستبعدe2e-acceptanceمنunitrunnerويُبقيهاتنفذفيacceptancelaneالصحيحة؛ ليسtest.skipأوحذفGUIاختبار. تفاصيلسجلjob136536551271فيscratch/e2e-r1-admin.log. قبولR1لاينسبإلىالاختباراتغيرالمنفذة.

## R2 — تشغيل قبول actual بدأ فعلياً

run [44809194193](https://github.com/wisam79/grido/actions/runs/44809194193) علىSHA`44d7cdc7781343f52485a357c0485c32c8a95d07` عبرciالمسجلمعforce_full/expected_sha. preflightمقارنةSHAوفرعtestنجح، ووظيفتاLinuxactualSupabase/server/admin/phone وWindowsnativeWebView2/SQLite بدآعلىGitHub، إضافةإلىكاملالمتصفحاتquality. هذايثبتبدءالوظائفلااجتيازها.

R1run44807851024 أُلغيعمداًبعدثبوتfailureوتقادمSHAلتوفيرمواردالنسخةالحالية؛ نتائجهالجزئيةوالفشللاتُمسحولاتُسمىPASS. يتضمنF-R1-02حارسالشبكةرفضPOST/api/trim-memoryالمشروعوليسunexpectedserviceعشوائي، وF-R1-03mockstartupserializedemptyخلقimageSrc`\"\"` وصورةزائدة؛ التشخيصالاختباريفيإطارlegacyfixtureقيدالإصلاح. لايوسَّعالallowlistلجميعAPIولايسقطتوقعexactproject.

### نتيجة R2 النهائية — FAILURE (`44809194193`) وتصحيحات جولة R3

اكتمل التشغيل [44809194193](https://github.com/wisam79/grido/actions/runs/44809194193) على `44d7cdc7781343f52485a357c0485c32c8a95d07` بنتيجة عامة **FAILURE**: نجحت وظائف `Enforce published test-ref and acceptance source SHA` و`Detect Changed Areas` و`Documentation Gate` و`Admin Web Quality` و`Backend Quality & Tests` و`Backend Race & Coverage (Scheduled)` و`Modal AI Unit Tests (Python 3.10)` و`Windows Build Verification` و`Print Performance & RSS Report (Windows)`، بينما أخفقت المسارات التالية وعولجت لرفع جولة R3:

- **`F-R2-01` (`Frontend Quality & Tests`, job `136541178436`):** اجتازت ملفات Vitest الـ 186 (`2540 passed / 1 skipped`)، لكن `frontend/vitest.config.ts` استثنى `**/e2e/**` فقط فالتقط مواصفات `e2e-acceptance/`؛ أُضيف `'**/e2e-acceptance/**'` إلى `test.exclude` و`coverage.exclude`.
- **`F-R2-02` (`Windows real native WebView2 + SQLite`, job `136541155928`):** فشل `--list` قبل بدء أي رحلة بسبب زيادة `../` واحدة في 5 استيرادات `scripts/e2e/` ضمن `frontend/e2e-acceptance/stickers-vdp.spec.ts` و`frontend/e2e-acceptance/helpers/gui.ts` و`frontend/e2e-acceptance/helpers/real-app.ts`، مع ابتلاع `onError()` للخطأ في `scripts/e2e/report-playwright.cjs`؛ صُحّحت المسارات وأُضيفت طباعة `error.message` إلى `stderr`.
- **`F-R2-03` (`Real local Supabase + embedded Go server + actual admin/phone`, job `136541155936`):** خرج `supabase-fixture.mjs` برمز `9` لأن Node 24 يقرأ `--env-file` خياراً للمشغّل قبل تمريره للسكربت؛ أُضيف فاصل `--` في `ci.yml` و`e2e-acceptance.yml`، وحُصّن التوقف دون marker مع إضافة `scripts/e2e/report-infrastructure.mjs` لتسجيل تعثّر البنية كحالة فشل صريحة دون تمرير البوابة.
- **`F-R2-04` (إخفاقات حزمة المتصفحات الـ 24 شارد):**
  - `frontend/e2e/helpers/wails-v3-bridge.ts`: فرض `contentType: 'application/json'` لمنع تحويل `''` إلى `'""'` في `GetStartupFile`/`LoadAutoSave`، وتوحيد `StartPhoneBridge` (`93234400`) كعملية idempotent مثل Go مع تحديث `frontend/e2e/phone-bridge.spec.ts` لاحتمال الاستدعاء المزدوج في StrictMode.
  - `frontend/e2e/helpers/wails-mock.ts` و`ai-tools.spec.ts` و`bg-removal.spec.ts` و`document-scanner.spec.ts`: محاكاة `POST /api/trim-memory` المصرّح بالتوكن وحارس نفس المضيف والتحقق من استدعائه، وتحديث `app.spec.ts` و`command-palette-commands.spec.ts` و`engine-smoke.spec.ts` و`frontend/e2e-acceptance/settings-journey.spec.ts` (`html` `--grido-ui-zoom`).
  - `frontend/e2e/perf-canvas-drag.spec.ts`: بدء `last: null` لتجنب عينة `<= 0` عندما يسبق طابع `rAF` وقت `performance.now()`.
  - `frontend/e2e/transformer-box-follows-geometry.spec.ts`: استطلاع الصندوق بعد كل ضغطة `Alt+ArrowUp` على حدة لإزالة السباق في WebKit.
  - `frontend/e2e/export-transform.spec.ts`: انتظار استقرار أنيميشن ظهور `URLImage` (`280ms` `BackEaseOut`) واكتمال الصورة قبل الالتقاط في WebKit.
  - `frontend/src/lib/canvas/text-stroke-filter.ts` و`frontend/src/lib/canvas/curved-text-utils.ts`: إضافة مجس `supportsScaledCanvasSvgStrokeFilter()` وتنفيذ بديل موحّد للحد على الكتلة بأكملها لـ WebKit (تجاهل `url(#...)`) وFirefox (تمدد ببكسل الجهاز عند CTM `2×`) دون رسم حد لكل حرف.
- **`F-R2-05` (`Final scoped acceptance summary`, job `136562362339`):** نفاد مساحة القرص (`No space left on device`) أثناء تجميع الأدلة؛ أُعيدت تسمية مخرج `full-gate` في `ci.yml` إلى `ci-full-summary` لمنع إعادة تنزيله في `acceptance-gate`، وأُضيف تفريغ أدوات الـ runner وحذف `downloaded-evidence` بعد تحقق `report-merge.mjs` في `ci.yml` و`e2e-acceptance.yml`.
- **تنظيف الفروع الموازية:** حُذفا فرعا الريموت المدموجان مسبقاً `fix/print-export-parity-closure` و`fix/ui-audit-followup` وأُزيل الـ worktree اليتيم `well-mollusk` قبل إطلاق جولة R3.
- **حالة R3:** اكتمل التشغيل [44900123938](https://github.com/wisam79/grido/actions/runs/44900123938) على `96340422fb12469675b837a82edde4ac56b00dfe` بنتيجة عامة **FAILURE** مع تقدم ملموس:

## R3 (`44900123938`) وقرار تقليص المصفوفة لجولة R4 (2026-11-21)

- **ما نجح في R3:**
  - جميع بوابات الجودة والبناء التسع (`Documentation Gate`، `Detect Changed Areas`، `Enforce published test-ref and acceptance source SHA`، `Backend Race & Coverage (Scheduled)`، `Print Performance & RSS Report (Windows)`، `Windows Build Verification`، `Backend Quality & Tests`، `Admin Web Quality`، `Frontend Quality & Tests` بعد استبعاد `e2e-acceptance` من Vitest، و`Modal AI Unit Tests`).
  - انحلت مشكلة نفاد مساحة القرص في `Full CI gate` و`Final scoped acceptance summary`.
  - نجح مسار `actual-admin/admin-chromium` (`2/2`) على Supabase المحلية الحقيقية.
  - نجحت إصلاحات R2 في شاردات Chromium (`perf-canvas-drag`، `phone-bridge`، `print-dialog`، `print-export`، `transformer-reselect`، `user-journeys`، واجتاز `ubuntu-24.04 chromium 3/4` و`windows-2022 firefox 3/4` بالكامل).
- **قرار المالك 2026-11-21 (تقليص مصفوفة المتصفحات المقلدة):** وافق المالك صراحةً على حذف **Firefox** وحذف شاردات **Windows/WebKit** المقلّدة المكررة من `e2e-full`، والإبقاء على:
  1. `Ubuntu Chromium` (4 شاردات، مطابق لمحرك WebView2).
  2. `Windows real native WebView2 + SQLite` (الثنائي الحقيقي).
  3. `Real local Supabase + embedded Go server + actual admin/phone` (على Ubuntu Docker).
- **إخفاقات R3 المتبقية وإصلاحاتها المرفوعة في R4:**
  - **`F-R3-01` (`app.spec.ts:25`):** عرضت المرحلة مسار المصغّرة `/local-image/thumb/saved-b64.png?w=2048` بدلاً من `/local-image/saved-b64.png`؛ حُدّث استطلاع المرحلة لقبول النمطين مع بقاء فحص `SaveProject` على المسار الكنسي الصارم `/local-image/saved-b64.png`.
  - **`F-R3-02` (`grid-collage.spec.ts:26`, `single-photo.spec.ts:20`, `workflows.spec.ts:20`):** تعارض المحدد المركب `getByTestId('canvas-zoom-in').or(getByLabel('تكبير'))` مع زر تكبير النافذة `تكبير` (strict mode violation = عنصران)؛ اقتصر الاختبار على `getByTestId('canvas-zoom-in')`.
  - **`F-R3-03` (`frontend/e2e-acceptance/helpers/real-app.ts`):**
    1. في `actual-linux/real-server` (`7/7`): `--trace=on` في Playwright يبدأ التتبع تلقائياً على `browser.newContext()` ففشل `context.tracing.start()` المزدوج؛ أُحيط البدء والإيقاف اليدويان بحارس `manualTrace` دون إسقاط مرفق التتبع التلقائي.
    2. في `native-windows` (`7/7`): طلب `startRuntimeAuthContract` متغير `E2E_USER_PASSWORD`؛ أُضيف توليد كلمة مرور مؤقتة عشوائية (`randomBytes(16).toString('hex')`) عندما تغيب متغيرات البيئة (بلا أي أسرار ثابتة).
  - **`F-R3-04` (`admin-web/e2e-acceptance/phone-real.spec.ts:22`):** تعرض `PhoneCameraPage.tsx:709` عبارة مصافحة التخزين في الواجهة عند الخطأ فقط بينما ترفع `.handshake.json` فعلياً للتخزين؛ استُبدل الفحص بالتحقق من غياب رسالة الخطأ مع استطلاع وجود ملف `.handshake.json` الحقيقي عبر Storage REST API قبل رفع الصورة.
- **حالة R4 (`44908746284` على `6b27063f829e790db5a9e818515d3712b08f4042`):**
  - **النتيجة:** 14 وظيفة ومساراً **PASS** (`Documentation Gate`، `Detect Changed Areas`، `Enforce published test-ref and acceptance source SHA`، `Backend Race & Coverage (Scheduled)`، `Print Performance & RSS Report (Windows)`، `Frontend Quality & Tests`، `Backend Quality & Tests`، `Admin Web Quality`، `Modal AI Unit Tests (Python 3.10)`، `Windows Build Verification`، شاردات `ubuntu-24.04 chromium 2/4` و`3/4` و`4/4`، ومسارا `actual-admin/admin-chromium 1/1` و`actual-phone/phone-chromium 1/1`).
  - **الجذور المُثبتة لإخفاقَي R4 وتصحيحات جولة R5:**
    1. **`F-R4-01` (`ubuntu-24.04 chromium 1/4` — `frontend/e2e/app.spec.ts:59-62`):** ضغط `Escape` لإغلاق `library` دون انتظار `expect(library).toBeHidden()` أعاد التركيز (Focus) عبر Radix `<Dialog>` إلى زر الفتح `<button data-testid="toolbar-projects">`. ولأن `use-keyboard-shortcuts.ts:147-151` يتجاهل `Delete` عمداً عندما يكون هدف الحدث زراً (`button`)، لم يُحذف العنصر؛ أُضيف `await expect(library).toBeHidden()` ثم نقر `#canvas-area` لإعادة التركيز إلى الكانفاس قبل `Control+a` + `Delete`.
    2. **`F-R4-02` (`actual-linux/real-server 7/7` و`native-windows 7/7` — `frontend/e2e-acceptance/helpers/real-app.ts:82`):** كشفت لقطة الشاشة `screenshot-0-final.png` ظهور نافذة `UpdateNotifier` («تحديث جديد متوفر: `dev` ← `v1.34.1`») تلقائياً فوق `AccountLicenseModal`، ما عطّل تفاعل نافذة تسجيل الدخول (`aria-hidden="true"`). السببان: (أ) غياب حقن `-ldflags="-X grido/internal/service.AppVersion=v1.34.1"` في أوامر `go build` الخاصة بثنائيات القبول في `ci.yml` و`e2e-acceptance.yml` فبقي الإصدار `"dev"` (`0.0.0`)، و(ب) عيب تجربة مستخدم في `frontend/src/components/editor/system/update-notifier.tsx` يفتح نافذة التحديث التلقائية فوق نافذة المصادقة؛ أُضيف حقن `AppVersion` في مسارَي القبول (`server` و`native`) وتأجيل فتح `UpdateNotifier` التلقائي ما دامت `accountModalOpen` مفتوحة (مع استثناء الفحص اليدوي).
- **حالة R5 (`44910913571` على `f6c247dc6bbd5cea2f5c6ad41d0a6972fc7a3ac8`):**
  - **النتيجة:** نجحت معالجات R4 بالكامل (`UpdateNotifier` لم يعد يغطي `AccountLicenseModal`، وتم النقر على دخول الحساب في كل اختبارات `actual-linux` و`native-windows` ونجح `expect(library).toBeHidden()` في `app.spec.ts`)؛ واجتازت 14 وظيفة ومساراً بالكامل (`Enforce published test-ref and acceptance source SHA`، `Documentation Gate`، `Detect Changed Areas`، `Print Performance & RSS Report (Windows)`، `Backend Race & Coverage (Scheduled)`، `Modal AI Unit Tests (Python 3.10)`، `Windows Build Verification`، `Admin Web Quality`، `Frontend Quality & Tests`، `Backend Quality & Tests`، شاردات `ubuntu-24.04 chromium 2/4` و`3/4` و`4/4`، ومسارا `actual-admin/admin-chromium` و`actual-phone/phone-chromium`).
  - **الجذور المُثبتة لإخفاقات R5 (تتضمن عيباً إنتاجياً حقيقياً كشفه اختبار القبول) وتصحيحات جولة R6:**
    1. **عيب إنتاجي حقيقي في تداخل تركيب نافذة الحساب (`frontend/src/App.tsx:204` و`app-dialogs-host.tsx:94`):** أظهرت لقطة `r5-linux/test-failed-1.png` بقاء نافذة `AccountLicenseModal` («النسخة مفعلة بنجاح - الباقة: Pro احترافي») مفتوحة فوق مساحة العمل بعد نجاح الدخول؛ السبب أن `<AccountLicenseModal />` كان مُركَّباً مرتين (داخل فرع `!isLicenseActive` ومرة أخرى داخل `AppDialogsHost`)، وعند انقلاب `isLicenseActive` من `false` إلى `true` فور حل `loginAccount` أُلغي تركيب نسخة الفرع الأول قبل استئناف `useAuthForms.handleAuth` بعد `await`، فأبطل الحارس `isRequestCurrent` استدعاء `setAccountModalOpen(false)` وظلت نسخة `AppDialogsHost` مفتوحة. الحل: رفع `<AccountLicenseModal />` و`<UpdateNotifier />` و`<QuitSaveFailedDialog />` و`<SonnerToaster />` مرة واحدة إلى الغلاف المشترك في `App.tsx` وإزالة النسخ المكررة من `AppDialogsHost`.
    2. **محدد `#canvas-area` الخاطئ في القبول (`frontend/e2e-acceptance/helpers/real-app.ts:86` و`canvas-readonly.ts:48` و`frontend/e2e/app.spec.ts:63`):** فشل `actual-linux` (`7/7`) عند السطر `86` لأن `<KonvaCanvas>` (`<Stage>` ← `.konvajs-content` ← `<canvas>`) شقيق سابق لـ `<div id="canvas-area" className="pointer-events-none">` في `editor-canvas.tsx:440-463` وليس ابناً له؛ كما اعترض شقيق `<canvas>` نقرة `#canvas-area` في `app.spec.ts:63`. حُدِّثت المحددات إلى `.canvas-viewport .konvajs-content` (مع التأكد من اختفاء حوار `الحساب والترخيص` بعد تسجيل الدخول).
    3. **ملف عقد المصادقة المحلي المقلَّد في `native-windows` (`scripts/e2e/runtime-auth-contract.mjs:33`):** أظهرت لقطة `r5-native/screenshot-0-final.png` شاشة قفل الترخيص بعد نجاح الدخول لأن `runtime-auth-contract.mjs` أعاد `{ plan: 'free', expires_at: '0001-01-01T00:00:00Z', status: 'none' }` خلافاً لعقد `supabase-fixture.mjs:252` (`pro`/`active`/90 يوماً)؛ حُدِّث ملف العقد المحلي ليعيد اشتراك `pro` نشطاً لمدة 90 يوماً وفق `SupabaseProfile`.
- **حالة R6 (`44913313786` على `534799327d41313c0d8fb62d818ab69c1100fc32`):**
  - **النتيجة:** اجتازت كافة المهام غير القبولية والشاردات المقلدة 14/14 (`Enforce published test-ref and acceptance source SHA`، `Documentation Gate`، `Detect Changed Areas`، `Print Performance & RSS Report (Windows)`، `Backend Race & Coverage (Scheduled)`، `Modal AI Unit Tests (Python 3.10)`، `Windows Build Verification`، `Admin Web Quality`، `Frontend Quality & Tests`، `Backend Quality & Tests`، وجميع شاردات `ubuntu-24.04 chromium 1/4..4/4` مع اختبارات `App.test.tsx` `27/27` و`account-license-modal.test.tsx` `68/68`)، كما نجح `actual-admin/admin-chromium 1/1` (`2/2`) و`actual-phone/phone-chromium 1/1` (`1/1`)؛ وثبت إصلاح `AccountLicenseModal` الإنتاجي فدخلت كل رحلات `J01–J07` في المسارين الفعليين (`actual-linux` و`native-windows`) إلى مساحة العمل.
  - **الجذور المُثبتة لإخفاقات R6 السبعة وتصحيحات جولة R7:**
    1. **بوابة `Full CI gate` (`legacy-linux/chromium: missing/outside evidence` ×4):** تقوم `evidenceFiles(output)` في `scripts/e2e/report-lib.mjs` بفحص الملفات المخفية (مثل `output/.last-run.json` و`Media/.thumbs/*`) بينما يترك `actions/upload-artifact@v4` خيار `include-hidden-files` على `false` افتراضياً فتُسقط أثناء الرفع؛ أُضيف `include-hidden-files: true` لجميع خطوات رفع الأدلة في `ci.yml` و`e2e-acceptance.yml`.
    2. **استيراد الصور في وضع الخادم (`actual-linux` J01/J03/J06):** أعادت `wailsIsDesktop()` في `frontend/src/lib/wails-env.ts` القيمة `false` في وضع الخادم المدمج (`-tags=server` بلا حقن WebView `postMessage`/`window.wails`) فسقطت إلى منتقي المتصفح `<input type="file">`؛ أُضيف رصد `_wails.backendConnected` فور نجاح أي نداء ترخيص/دخول إلى Go في `frontend/src/lib/store/slices/license-slice.ts` ليعمل `OpenMultipleFiles` الحقيقي عبر محول القبول.
    3. **الوضع المدمج في `native-windows` (`J01–J07`):** يفتح مشغّل `windows-2022` الافتراضي بشاشة `1024×768` فتُحسب نافذة `ResolveDefaultWindowSize` بعرض `976×680` (< عتبة `1024` في `use-workspace-panels.ts`) وتُخفي شريط الألواح؛ أُضيف `page.setViewportSize({ width: 1600, height: 1000 })` عبر CDP في `frontend/e2e-acceptance/helpers/real-app.ts` لمطابقة أبعاد سطح المكتب دون تغيير منطق الإنتاج.
    4. **`J02` (`real-exports.spec.ts:11`):** لم يطابق محدّد `role="list" name="قائمة الطبقات"` لأن `LayersList` لا تصيّر القائمة عند صفر عناصر؛ عُدِّل التحقق لفحص ظهور حقل عرض الورقة مباشرة أو فتحه عبر قائمة الإعدادات.
    5. **`J04` (`collage-journeys.spec.ts:70`):** يلف مكوّن `MmField` وحدة `مم` داخل نفس عنصر `<label>` فيصير الاسم الوصولي للحقل «العرض مم»/«الارتفاع مم»؛ حُدِّث المحدّد بـ regex `/^العرض(?:\s+مم)?$/` و`/^الارتفاع(?:\s+مم)?$/`.
    6. **`J05` (`stickers-vdp.spec.ts:35` — `1133 !== 1134`):** تقرب `stickerRasterSize` (`sticker-text.ts:34,46`) العرض `Math.round(88 * 300 / 25.4) = 1039` أولاً ثم تحسب الارتفاع بنسبة العرض (`1133`)؛ طوبقت معادلة الاختبار على الحساب الفعلي.
    7. **`J07` (`settings-journey.spec.ts:48`):** يبقى `<aside data-testid="workspace-panel-properties">` بعرض `1px` بسبب `border-s` على `w-0` فيكون `isVisible()` `true` دائماً؛ عُدِّل الفحص للتحقق من سمة `data-collapsed`.
- **حالة R7:** قيد التشغيل السحابي والتحقق النهائي قبل الإغلاق والدمج إلى `main`.

## شروط الإغلاق

آخر SHA واحد، discovery/project inventory مطابق للمنفذ، لا failed/flaky/skip غير مفسر، artifacts trace/screenshots/video المتاح ومخرجات/hash ومراجع البيئة، وإعادة كاملة أخيرة. نقص hardware/OAuth/Modal أو capability يُسجّل BLOCKED مستقلاً، ولا توصف شهادة التطبيق كاملة بأنها PASS مع نقص رحلة لازمة.

## ملاحق التنفيذ والنتائج

تُضاف بعد وصول أوامر/تقارير التأسيس والخدمات ونتائج التشغيل الفعلية. السجل الحالي لا يدعي اكتمال التنفيذ أو النجاح.
