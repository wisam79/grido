# خطة تطوير تجربة المستخدم الشاملة — موجات 0–7

**التاريخ:** 2026-11-13 · **مرجع الاعتماد:** الخطة المعتمدة في السياق الرئيسي، كما نقلها المنسّق · **الحالة:** تنفيذ جزئي سلوكي وبصري محدود؛ موجات0–7 والخطة **غير مكتملة**، والقبول البصري/AA الكامل غير مغلق.

## الحالة الحالية — 2026-11-13

البوابات المركزية النهائية بعد جميع التعديلات البصرية **PASS** بحسب المنسّق: frontend typecheck/lint/format، وadmin lint/tsc app، و`node scripts/docs-gate.mjs --strict-refs` بالجرد **174/32/67/6** وinventory20/assertions53، و`git diff --check`. فشل metric173→174 السابق أدناه سجل مرحلي محفوظ لا يصف الحالة النهائية. لا يعني ذلك تشغيل E2E أو CI؛ المواصفات مكتوبة فقط ولم تُشغّل.

وصلت مراجعة بصرية محدودة من المنسّق بالنموذج الرئيسي: before المحرر1280؛ after داكن1280/1024/1600 ومضيء1600، ثم **لقطة light النهائية بعد تقوية الرأس** ولقطة collage light1600. لم ير clipping؛1024 أخفى الدرج وأبقى الكانفاس جيداً،1600 متوازن،lightcontrast جيد،toolbar واسع يحمل حفظ/تصديرlabels وطباعةprimary وcompact يطويlabels بلاoverlap، وبطاقاتfreeform أقوى. بعد `bg-card/55` و`border-border/70` وselected `border-primary/35` أظهرت اللقطة النهائية تحسناً في header/tab. collage light1600 بلاclipping؛ الخلايا الصغيرة متوقعة من الهندسة الفيزيائية. محاولة darkcollage انتهت بمهلة، **ليست قبولاً ولا تُعاد**. هذه screenshot review محدودة، لاAA/fullwave أوformalindependentjudge. mixed screenshot/phone device/RTL200/coarse وonboarding/print/recovery/timings/adminfullvisual معلّقة.

## المنفّذ مقابل المعلّق

**المنفّذ في نطاق مالك التوثيق:** إنشاء هذه الخطة و[حزمة قبول UX](../ux-acceptance/README.md) وقالب manifest، تسجيل المجلد في الخريطة، وإضافة سجل جلسة وfragment واحد. هذا ليس تنفيذ واجهة أو تحققاً من سلوكها. **مهمة Todo 0 (السقالة والـbaseline الأولي) منجزة** بحسب المنسّق؛ ليست شهادة إغلاق الموجة 0.

**المتاح من الأدلة — baseline جزئي:** صورة المحرر الأولية الاصطناعية عبر `mockGetStartupFile` في المعاينة المحلية `9315/__ux-preview` بviewport **1280×720**؛ DOM يؤكد roles/canvas image/state والألواح. مراجع ZCode artifacts الكاملة نسبةً إلى جذر artifacts الخارجي:

- المحرر: `sess_3b59bfb6-1d68-4235-8d8d-dad892b00774/call_1OAkqyxnLNLtqjM66yok5iH1-tool-result-6b9cacbd-4fa7-4651-be7a-7376d819b69b.png`.
- تعديل الإدارة 1280×720: `sess_3b59bfb6-1d68-4235-8d8d-dad892b00774/call_QNIL8CBJNptZvH6tA9Eeylge-tool-result-3a8a7114-ac35-459a-9a6f-05115871a24e.png`.
- التأكيد الخطر: `sess_3b59bfb6-1d68-4235-8d8d-dad892b00774/call_99qcXtvPkazydw5bm7OjlrJx-tool-result-84996961-9322-4317-ad0a-89179451e34d.png`؛ DOM يؤكد delete نشطاً أولياً.

المتصفح أنتج الصور لكن النموذج تلقى `Media omitted`، وأكد وكيل Read للصورة عدم توافر الرؤية أيضاً؛ **لا حكم بصري ولا قبول AA أو رحلة**.

**المنفّذ المرسل — subsets فقط:** قواعد الموجة 0 في **7 ملفات**، واختبارا `frontend/test/ui-compliance.test.ts` **54/54** و`frontend/test/ui-compliance-guard.test.ts` **8/8** منفردان workers=1. للموجة 2 subset آمن في **5 ملفات** واختبار `frontend/test/multi-selection-properties.test.tsx` **21/21 نهائي** يحل محل 16/16 ولا يُجمع معه: store حقيقي وReact Testing Library، أهلية typed بدلاً من blind broadcast، المقفل inert، وhistory واحد/gesture. **ليس الموجة 2 كاملة**؛ fontFamily/content/rotation/group ratio/gradients خارج subset. للموجة 3 CSS واختبار `frontend/test/ux-accessibility-styles.test.ts` **8/8** لوجود tokens/focus/forced-colors/reduced-transparency بالمصدر، لا runtime/coarse acceptance.

**نتائج مسماة أخرى:** admin feedback **7/7** وedit **5/5**، وphone actual UI بمُحاكيات **15/15** (مع ربط `z-(--z-dialog)` و`z-(--z-toast)`)؛ مشاريع `projects-dialog-backup` **13/13** وتصدير `export-dialog` **38/38** منفردان مع `--no-file-parallelism`، و`App.test.tsx` **26/26** و`panel-shell-visual` **8/8** و`element-properties-tabs` **41/41**. الأوامر والأسماء الدقيقة في [سجل الاختبار](../testing_guide.md#متابعة-تطوير-ux--2026-11-13). **SaveRecovery وتغييرات الطباعة غير منجزة بعد**؛ نتائج الموجة 5 ليست دليل تنفيذها.

**GUI الإدارة after — DOM/keyboard فقط:** بعد reload كانت كل label مرتبطة بحقلها والاسم focused؛ `cancel.pressEnter` أزال Edit. `trigger.pressEnter` فتح `alertdialog` بعنوان «تأكيد إجراء خطير»، والإلغاء active مقابل delete في baseline؛ `cancel.pressEnter` أزال التأكيد. مرجع after الخارجي: `sess_3b59bfb6-1d68-4235-8d8d-dad892b00774/call_cb1gfIrALWLtK7i6zOGXKEIj-tool-result-8ef439f9-8125-4100-bf2d-4a17ffee2e48.png`. **click timeouts ليست نجاحاً**؛ المقبول هنا أحداث المفاتيح وDOM فقط، لا قبول بصري أو AA أو كامل الرحلة. بقية after والـviewport/وقت after الدقيق غير مثبتة بعد.

**المعلّق:** onboarding كامل، SaveRecovery/تغييرات print، الحقول mixed المستبعدة، هجرة `supabase/migrations/20261113155602_phone_bridge_handshake_json_mime.sql` (`LOCAL NOT APPLIED`)، بقية نطاق موجات0–7 والرحلات/الحالات وbaseline/after والتوقيت وAA/hitbox/RTL/200%/coarse/runtime. أُضيفت تحديثات README ودليلَي الاختبار/المطور وتصميم الإدارة بالأدلة المحددة، و[تقرير25 المؤقت](../reviews/25-ux-development-acceptance-2026-11-13.md) (مع ملحق إغلاق التشخيص) مع إضافة مؤرخة لفهرس المراجعات. التقرير24 ومصدره محفوظان دون تغيير بايتات.

**موجة4 وCI — تنفيذ جزئي وإغلاق التشخيص:** `libraries-discovery` **12/12** (بعد حارس منع حلقة تمرير معرض الملصقات)، `collage-presets-tab` **5/5**، `template-panel` **8/8**، و`core freeform` **87/87**؛ لا onboarding/library/collage كاملًا. توحيد تبويبات المفتش الأيمن على `variant="panel"` في `properties-panel.tsx` و`slot-properties.tsx` مع `element-properties.tsx`، وصقل `multi-selection-properties.tsx` (**22/22**)، ومواءمة عقد `panel-shell.tsx` (`min-h-12`) مع `ui-compliance.test.ts` (**54/54**) و`fluent2-design-system/SKILL.md`. CI specs frontend6/admin4 وPlaywright1.61.1/Vitest exclude admin E2E/workflow SmokeEvidence مكتوبة **NOTRUN**، لا Wails build/runtime change.

**البوابات المركزية:** `node scripts/docs-gate.mjs --strict-refs` أعاد **174/32/67/6** و`inventory 20 / assertions 53` **PASS**؛ وكذلك فحوص الجودة الخفيفة في `frontend` و`admin-web` و`gofmt` و`git diff --check` بعد حذف الفرعين المحليين المدمجين (`fix/print-export-parity-closure` و`fix/ui-audit-followup`) والإبقاء على العمل الخطي على `main`. لا `PASS` شامل لـCI/E2E/build السحابي أو حذف `origin/*` قبل إذن المالك.

معلومة revision نقلها المنسّق بتاريخ 2026-11-13: البداية `main@7fa01cd5` مؤكدة بـgit قبل تغييرات package-only؛ تغييرات القواعد متميزة عن مصدر الواجهة، ثم package/lock الخاص بـRadix واعتماديات الإدارة المعتمدة. هذا revision للبداية لا بصمة تلقائية لكل صورة أو tree مطابق قبل كل تعديل. **وقت الالتقاط يُؤخذ من artifact نفسه فقط**؛ لم يُرسل بعد، فيبقى `null` دون استنتاج host time.

## الحدود والثوابت

- تطوير تراكمي وفق الخطة المعتمدة؛ لا إعادة كتابة للمحرك أو ازدواج لوحة أوامر/حوارات/اختصارات. لكل إجراء وطلب ونتيجة async **مالك واحد**، مع حماية تبديل المستند/الهدف والإلغاء من النتائج المتأخرة.
- ملكية هذه المهمة `docs/` وfragment الجلسة فقط؛ لا كود إنتاج، ولا `.agents` أو قواعدها، ولا `admin-web/design.md`. موجة 0 الخاصة بالقواعد وموجات الكود مملوكة لوكلائها ولا يكرر مالك التوثيق البحث فيها.
- fixtures ولقطات اصطناعية فقط؛ لا صور عملاء/هويات حقيقية/أسرار/QR اقتران فعلي، ولا وصول Supabase أو سحابة أو Wails أصلي أو طابعات فعلية أو بيانات `appData`. أدلة المحاكاة تُسمّى محاكاة ولا تتحول إلى قبول حي.
- لا اختبارات/بناء/E2E محلي بواسطة مالك التوثيق، ولا حزمة اختبارات كاملة/E2E/build محلي في الخطة؛ لا commit/push أو تشغيل خدمة حيّة ضمن هذه الجولة. نتائج الفحوص المصرّح بها تأتي من المنسّق مع الأمر والتاريخ والحدود.
- الحفاظ على crop المحسوب مرة واحدة وهندسة Konva/التصدير وUndo، وعدم تحويل `cutShapeType` إلى clipping تلقائي. JPEG هو الافتراضي، PNG مدعوم، وكلاهما sRGB؛ CMYK الحقيقي **TIFF فقط**. لا إضافة أو ادعاء ICC/soft proof أو قبول طابعة.
- AA نتيجة قياس لا اسم class/token. هدف التصميم `28px` للفأرة و`44px` للمؤشر الخشن ليس شهادة WCAG. لا قيم p95 أو نسب تحسّن قبل baseline موثّق؛ الأداء report-only إلى أن يرد القياس.

## مصفوفة الموجات الحية

| الموجة | نطاق الخطة المعتمد | المطلوب قبل الإغلاق | التنفيذ | الأدلة/القبول |
| --- | --- | --- | --- | --- |
| 0 | baseline + rules | تثبيت السيناريوهات/البيئة واللقطات قبل التطوير، تنسيق ملكية القواعد دون تكرار | قواعد منفذة (7 ملفات) + مهمة السقالة/الـbaseline الأولي منجزة بحسب المنسّق | قبول جزئي غير مغلق؛ صور editor/admin أولية وDOM بلا رؤية؛ ui-compliance 54/54 وحارس 8/8 استهداف منفرد workers=1؛ بقية baseline/قياسات معلّقة |
| 1 | keyboard / dialog / scanner safety | أوامر بلوحة المفاتيح، focus/return/trap، إلغاء الماسح وسلامة ملكية النتائج | subset منفذ في 7 ملفات بحسب المنسّق | استهدافات نهائية: fluent-blocks 28/28، freeform-keyboard 23/23، scanner-keyboard 10/10، منفردة workers=1؛ ليست قبول كل الحوارات/الماسح/الرحلات |
| 2 | mixed inspector + semantic locked | تحديد مختلط صادق، disabled/locked مفهوم، لا تعديل مقفل أو Undo مكرر | subset آمن فقط (5 ملفات): typed eligibility، إزالة blind broadcast، locked inert، history واحد/gesture | **21/21 نهائي** يحل محل 16/16؛ store حقيقي + React Testing Library؛ لا fontFamily/content/rotation/group ratio/gradients؛ قبول الرحلة معلّق |
| 3 | workspace / toolbar responsive + tokens visual | استجابة الشريط/الألواح، توكناتLight/Dark، أهدافالمؤشر وRTL/200% | panel/card/toolbar/freeformlibrary visual subsets + responsive overflow/focus/mobile restore | combined central visual run **38/38 في5 ملفات**: responsive9/libraries12/panel7/presets5/toolbarheight5؛ template8 وfluent33 منفردان؛ screenshots limited accepted، لكن AA/runtime/coarse/RTL200 والمختلط screenshot معلّقة |
| 4 | import / collage / libraries favorites local | استيراد ومكتبات وكولاج ومفضلة محلية واضحة دون تغييرالمصدر/الهندسة | favorites/discovery/status/retry/customize subsets | central libraries12/presets5 + template8؛ collage light1600 بلاclipping والخلايا الصغيرة physicalexpected؛ darkcollagetimeout ليس قبولاً، onboarding/import/library journeys معلّقة |
| 5 | save / recovery / export / print truthful phases | حفظ واسترداد صادقان، مراحل تشغيل ومخرجات وإلغاء حقيقيان مع حفظ crop/CMYK | SaveRecovery/تغييرات الطباعة غير منجزة؛ باقي التنفيذ ليس مغلقاً | projects-dialog-backup13/13 وexport-dialog38/38 منفردان، لا إثبات تنفيذ SaveRecovery/print أو قبول طابعة |
| 6 | admin / phone UX | تأكيد/إلغاء وتسجيل خروج في الإدارة؛ إذن كاميرا/التقاط/اختيار/رفع/إعادة محاولة للهاتف | subset feedback/edit/phone مع تحقق GUI إدارة DOM/keyboard محدد | admin7/7 و5/5 وphone15/15 UI mocks؛ labels/focus/Enter cancel/alertdialog مثبتة فقط، click timeouts لا نجاح؛ لا visual AA أو كامل login/logout/phone/live |
| 7 | acceptance + measure | مراجعة الرحلات الخمس، مقارنة before/after والقياس والقيود، تقرير قبول لاحق | تقرير25مؤقت + centralgates/diffcheckPASS؛ screenshots راجعها النموذج الرئيسي؛ CI specsNOTRUN | visual limited accepted ضمن screenshots فقط؛ لا independentjudge/AA/RTL200/coarse/fulljourneys، ولاE2E/CI/build/timing |

تعتمد كل موجة على أدلة الحالة المطلوبة، لا على انتهاء وكيل أو عدد ملفات. يمكن فصل «تنفيذ مثبت» عن «اختبار مستهدف ناجح» عن «قبول بصري/رحلة معلّق» داخل الموجة عند وصول النتائج؛ لا تعميم الإغلاق على باقي النطاق.

## الرحلات الخمس المعتمدة

| المعرّف | الرحلة | نقطة النهاية المطلوبة | الحالة الحالية |
| --- | --- | --- | --- |
| J1 | صورة هوية: input → crop → frame → adjust → copies → save → print | حفظ صادق ومراحل طباعة معروفة دون عتاد حقيقي؛ crop لا يتكرر | معلّق |
| J2 | كولاج: grid/template/freeform → batch → reorder/cell → save template or project → output | اتساق ترتيب/خلايا وتراجع وحفظ ومخرج، مع حفظ هندسة وصور المستند | معلّق |
| J3 | تعديل حر: images/text/shapes → mixed selection → align/layers → undo → export | مفتش مختلط وقفل دلالي وUndo صادق وتصدير يحافظ على المستند | معلّق |
| J4 | إدارة: login → search user → edit or keys → confirm/cancel → logout | منع إجراء مؤكد/متأخر بعد الإلغاء أو الخروج؛ بيانات اصطناعية ومحاكاة فقط | معلّق |
| J5 | هاتف: session → camera permission → capture or pick → upload → retry | إذن/فشل/رفع/إعادة محاولة واضحون دون صورة أو اقتران أو خدمة حيّة | معلّق |

**لكل رحلة:** `idle`، `empty`، `loading`، `run/progress`، `cancel`، `success`، `partial success`، `error`، `retry`، `focus`، `undo`؛ و`disabled/locked` و`stale-result` عند انطباقها. تُسجّل `not-applicable` مع سبب، لا نجاحاً ضمنياً. الإلغاء لا يترك busy عالقاً، والنجاح الجزئي لا يُعرض كنجاح كامل، والتركيز لا يضيع بعد نهاية العملية.

## بوابة القبول والأدلة

- تباين WCAG 2.2 AA مقاس: نص عادي ≥4.5:1، كبير وفق تعريف WCAG ≥3:1، وعناصر غير نصية وظيفية ≥3:1 مع الاستثناءات الموثقة؛ Light/Dark وحالات التحكم المنطبقة.
- hitbox ≥24×24 CSS px أو استثناء WCAG موثق، مع أهداف التصميم 28px mouse/44px coarse. اسم وصولي ومعاملة focus-visible/Tab/Shift+Tab وEnter/Space/Escape صحيحة، بلا اختطاف الكتابة أو اختصار عام مكرر.
- RTL/LTR و200% **UI zoom** بلا قص أو تراكب يحجب الأفعال والرسائل. UI zoom منفصل عن zoom الكانفاس وOS scaling؛ ذكر viewport/runtime في الدليل.
- لكل scenario سجل واحد واضح يربط fixture/البيئة/revision والحالة بالـexpected/observed واللقطة/الاختبار. baseline وbefore **قبل التطوير**؛ after قابل للمقارنة. baseline المفقود يُصرّح به ولا يُنشأ ادعاء رجعي.
- أدلة الكود، نتائج الاختبارات، اللقطات، والقبول أربعة أنواع منفصلة. معيار القبول في [README الحزمة](../ux-acceptance/README.md)، والحقول في [قالب manifest](../ux-acceptance/manifest.template.json). لا تُنشر أدلة حساسة أو أصول ثنائية داخل `docs/`.

## سجل الأدلة والتحديث التالي

| التاريخ | الواقع المثبت | ما ينتظر المنسّق |
| --- | --- | --- |
| 2026-11-13 | ملفات سقالة التوثيق فقط؛ لا تنفيذ واجهة من مالك التوثيق ولا snapshots/test runs/build/E2E/commit/push | نتائج موجات مسماة، baseline وbefore/after، أوامر وجرد docs-metrics، قياسات AA/hitbox/RTL/200% وقبول الرحلات |
| 2026-11-13 — تحديث من المنسّق | baseline جزئي ملتقط: معاينة المحرر `/__ux-preview` على 9315، viewport 1280×720، صورة اصطناعية أولية عبر `mockGetStartupFile`؛ DOM يؤكد roles/canvas image/state والألواح؛ المتصفح أنتج اللقطة لكن النموذج تلقى `Media omitted` | لا قبول بصري؛ وقت الالتقاط الدقيق وبقية الحالات والتوقيت/coarse/AA/RTL/200% وafter معلّقة؛ تجهيز الإدارة وقت هذا التحديث ليس نتيجة منها |
| 2026-11-13 — متابعة من المنسّق | Todo0 للسقالة/الـbaseline الأولي منجز؛ وصلت صور تعديل الإدارة/تأكيد خطر وDOM initial delete active؛ قواعد 7 ملفات واختبارا 54/54 و8/8 منفردان؛ mixed safe subset 5 ملفات و16/16 | timestamps من artifact فقط لا host؛ baseline revision البداية 7fa01cd5 قبل package-only؛ no visual judgement؛ Wave0 acceptance جزئي وWave2 subset فقط |
| 2026-11-13 — استهدافات مسماة لاحقة | مراجع admin الكاملة وأوامر frontend ثبتت؛ Wave1 subset بنتائج 28/23/10 نهائية لكل ملف، CSS8 وtoolbar9 مع scoped/type checks؛ toast3000ms | وقت هذا التحديث كان mixed16 يُعاد فحصه؛ لا تحديث docs-metrics قبل central gate |
| 2026-11-13 — نتائج نهائية محددة وGUI DOM | mixed21/21 يحل محل16، adminfeedback7/edit5/phone15 UI mocks، projects13/export38 منفردان؛ adminafter labels/namefocus/Entercancel/alertdialog titled/cancelactive مقابل baselinedeleteactive | لا قبول clicks المتأخرة أو visual/AA/fullwave؛ SaveRecovery/print لم يُنجزا، والتفصيل المحدّث في السجل الموالي |
| 2026-11-13 — إغلاق التشخيص ومزامنة التوثيق | حلقة تمرير معرض الملصقات (`libraries-discovery` 12/12)، حارس فك التركيب وجلسة المستند (`element-properties-tabs` 41/41)، توحيد `variant="panel"` (`panel-shell-visual` 8/8)، صقل `multi-selection-properties` (22/22) و`toolbar` (`9/9` + `5/5`)، توكنات `--z-toast`/`--z-dialog`، مواءمة عقد `panel-shell.tsx` (`min-h-12`) في `ui-compliance.test.ts` (54/54) و`SKILL.md`، وحذف الفرعين المحليين المدمجين؛ `frontend`/`admin-web`/`gofmt`/`docsstrict` (`174/32/67/6`) **PASS** | SaveRecovery وتغييرات الطباعة، هجرة `20261113155602` (`LOCAL NOT APPLIED`)، قياسات AA/RTL/200%/coarse/timing، الـCI/E2E السحابي وحذف `origin/*` بانتظار إذن المالك |

عند وصول نتيجة: حدّث صف الموجة المعنية وسجل tracker وfragment **نفس الجلسة**؛ أضف تفاصيل README/testing/developer فقط إذا استوجبها الدليل، وألحق التقرير 25 وفهرسه لاحقاً دون مساس بالتقرير 24. أرقام الاختبارات الحالية في الخريطة تاريخية محفوظة؛ تحديثها معلق حتى أمر ونتيجة المنسّق. هذه السقالة تتوقف هنا انتظاراً للأدلة.
