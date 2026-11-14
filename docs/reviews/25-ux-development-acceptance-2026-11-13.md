# التقرير 25 — متابعة قبول UX مؤقتة

**التاريخ:** 2026-11-13 · **الحالة:** Provisional / قبول جزئي غير مغلق · **المصدر:** نتائج وأدلة المنسّق، لا تشغيل من كاتب التوثيق.

مرجع النطاق [الخطة الحية لموجات 0–7](../plans/2026-11-13-comprehensive-ux-development-plan.md)، وأوامر الاستهداف [دليل الاختبار](../testing_guide.md#متابعة-تطوير-ux--2026-11-13)، ومراجع الصور/القيود [حزمة القبول](../ux-acceptance/README.md) و[manifest](../ux-acceptance/manifest.template.json). هذا **تقرير جديد مستقل**؛ التقرير 24 ومصدره لا يُعدّلان ولا يُعاد تصنيف تاريخهما.

## ما ثبت وما لا يثبته

- Todo0 للسقالة والـbaseline الأولي منجز؛ **قبول الموجة0 جزئي**. صورة محرر اصطناعية عبر `mockGetStartupFile` عند1280×720 وصورتا admin edit/تأكيد خطر موجودة خارج المستودع. البداية `main@7fa01cd5` مؤكدة بـgit قبل package-only، لا hash للشجرة لكل صورة؛ timestamp من artifact فقط ولم يُرسل بعد.
- المتصفح أنتج الصور لكن النموذج تلقى `Media omitted`، وأكد وكيل Read عدم توافر الرؤية أيضاً. **لا تقييم بصري ولا شهادة AA** أو حكم hitbox/RTL/200% من الصور.
- admin after بعد reload: كل label مرتبطة بحقلها والاسم focused، `cancel.pressEnter` أزال Edit، و`trigger.pressEnter` فتح `alertdialog` باسم «تأكيد إجراء خطير» مع cancel active مقابل delete في baseline؛ `cancel.pressEnter` أزال التأكيد. هذه أحداث keyboard وDOM فقط؛ **click timeouts ليست نجاحاً**. مراجع before/after في الحزمة، لا تفريغ سجلات كامل هنا.

## التنفيذ والاختبارات المحددة

| النطاق | المرسل المثبت | حدود الاستنتاج |
| --- | --- | --- |
| قواعد الموجة0 | قواعد7 ملفات، ui-compliance54/54 وحارس8/8 | امتثال مصدر لا قبول موجة/AA |
| موجة1 | subset keyboard/dialog/scanner؛ fluent-blocks28/28، freeform-keyboard23/23، scanner-keyboard10/10 | لا جميع حوارات/حالات الماسح أو خدمة أصلية |
| موجة2 | safe subset typed eligibility/إزالة blind broadcast/locked inert/history واحد؛ mixed21/21 نهائي بدل16 | لا fontFamily/content/rotation/group ratio/gradients أو رحلة كاملة |
| موجة3 | CSS source8/8 وtoolbar9/9؛ overflow/focus reveal/mobile restore، toast3000ms | runtime/coarse/contrast/RTL/200% وبقية workspace غير مقبولة بعد |
| موجة4 | helper favorites12/component discovery10 بحسب المنسّق؛ central integration ربط status/retry/customize/discovery؛ template7/presets4 | تنفيذ جزئي، لا onboarding كامل أو قبول استيراد/مكتبات/كولاج كامل |
| موجة5 | projects-dialog-backup13/export-dialog38 منفردان | **SaveRecovery/تغييرات print غير منجزة**؛ لا قبول طابعة أو مخرج كامل |
| موجة6 | adminfeedback7/edit5/phoneUI15 بمحاكاة، وDOMafter المحدد | لا full login/search/mutation/logout أو كاميرا/اقتران/رفع حيّ |
| core regression | freeform87 وelementtabs39 نهائيان للاستهداف، بدل النتائج السابقة64/16 من الجولة السابقة | لا جمع تشغيلات أو حزمة شاملة |

كل نتيجة ملف منفرد workers=1 ودون coverage؛ الأوامر والتفصيل في دليل الاختبار. الأعداد ليست نسبة إنجاز أو مجموع شهادة قبول.

## البوابات والجرد وCI

- بوابة المنسّق `node scripts/docs-gate.mjs --strict-refs`: **173/32/67/6** (Vitest/E2E/Go/مستندات الجذر)، inventory20/assertions53؛ **FAIL metrics فقط** بسبب166→173 و31→32. حُدّث التوثيق؛ **إعادة النجاح معلّقة** ولا يُستنتج PASS.
- admin light checks: `npm --prefix admin-web run lint` صفر أخطاء/تحذيرات، و`node C:/projects/grido/admin-web/node_modules/typescript/bin/tsc --noEmit -p C:/projects/grido/admin-web/tsconfig.app.json` PASS بحسب المنسّق. frontend gate ما زال جارياً؛ لا شهادة بوابة نهائية أو staged matrix.
- CI مكتوب **ولم يُشغّل**: `frontend/e2e/ux-keyboard.spec.ts` (6 سيناريوهات) و`admin-web/e2e/ux-smoke.spec.ts` (4)؛ admin config مستقل، `@playwright/test`1.61.1، واستبعاد `e2e/**` من admin Vitest، وخطوات smoke/evidence في workflow. كتابة specs/jobs ليست نتيجة E2E؛ CI/scheduled jobs تنتظر إذن push المستخدم.

## ملحق تثبيت integration والفحوص المرحلية — 2026-11-13

- `test/asset-favorites.test.ts`12/12 و`test/libraries-discovery.test.tsx`10/10 استهدافان scoped قبل consumer integration بالقالب frontend في دليل الاختبار.
- `test/template-panel.test.tsx` **8/8 نهائي يحل محل7/7** بعد إضافة loading/failure/retry/empty؛ المحاولة الأولى أخفقت بسبب selector يجد رسالتَي status، ثم تصحيح استهداف الرسالة أعاد المرور، **ليس sourcebug**. `test/collage-presets-tab.test.tsx`4/4 بعد إضافة loaded prop صريح للاختبار القديم. ربط3مصادرstatus/retry/customize/discovery مثبت، لكن scrollState مصدر فقط واختبار المالك معلّق.
- frontend آخرtypecheck/lintPASS، formatFAILملفي مصدر/اختبار ثم نُسّقا؛ **إعادة الفحوص الثلاثة معلّقة**، ولا تُحوّل الإصلاح الشكلي إلى finalPASS. adminlightPASS كما أعلاه.
- تقرير25 يبقىProvisional وsource24محفوظ؛ لا قبول بصري/AA أو onboarding كامل/SaveRecovery/print أو إغلاق wave. CI smoke فقط لم يُشغّل، لا تعديل Wailsbuild/runtime؛ مهارة compiler لم يُعدّلها كاتب التوثيق.

## ملحق البوابات النهائية وعدم اكتمال التطوير البصري — 2026-11-13

وصلت من المنسّق **PASS نهائية** لـfrontendtypecheck/lint/format وadminlint/tsc، وإعادة `node scripts/docs-gate.mjs --strict-refs` بالجرد173/32/67/6 وinventory20/assertions53. حالاتFAILmetrics/format وpending السابقة أعلاه تاريخية محفوظة، وإعادة البوابات انتهت. staged matrix وCI/E2E/build/scheduledjobs لا تُستنتج من هذه النتائج ولم تُشغّل.

أشار المستخدم إلى عدم ظهور التحسينات المرئية المتوقعة، وأكد المنسّق أن **موجة التصميم/التطوير البصري الواسعة لم تكتمل، وأن غالبية التنفيذ سلوكية**. لذلك التقرير25 يظلProvisional: لاallplanDone، ولاcosmeticPASS/visualAAacceptance أو إغلاق wave0/1–7. onboarding كامل وSaveRecovery/print والتصميم العام وبقية الرحلات/AA/RTL/200%/coarse/runtime والقياس معلّقة. مصدر24محفوظ، ولاكود إضافي أوcommit/push بعد هذه المزامنة.

## ملحق المراجعة البصرية المحدودة والجرد174 — 2026-11-13

أصبحت المراجعة البصرية أوسع منDOM: راجع المنسّق بالنموذج الرئيسي before1280 وafter dark1280/1024/1600 وlight1600، ثم final light بعد تقوية الرأس وcollage light1600؛ artifacts في حزمةالقبول. لم يرclipping؛1024 أخفىالدرج/canvas جيد،1600 متوازن،lightcontrast جيد،toolbarwide labels/primaryPrint والcompact بلاoverlap،freeform cards أقوى. بعدbg-card/55/border70/selectedprimary35 أظهرت final light تحسنheader/tab. collage light بلاclipping؛ tiny slots physical geometry expected. darkcollage screenshot timeout **ليس قبولاً ولا يُعاد**. هذا main-controller screenshot review محدود، لاformalindependentjudge أوAA.

المراجع الجديدة: final light `sess_3b59bfb6-1d68-4235-8d8d-dad892b00774/call_ZAEkxnY1cEwBd4GAX83Bh7Bh-tool-result-cfc0f6f9-d73d-4e63-a2b8-5b8316d65027.png`؛ collage light `sess_3b59bfb6-1d68-4235-8d8d-dad892b00774/call_DPVhgEnKsyYB02kZipNwJnB2-tool-result-326eb1b0-a2cd-4a23-825b-3879ed165f1a.png`.

أضيف `frontend/test/panel-shell-visual.test.tsx` فصار الجرد174. البوابات المركزية النهائية بعد كل التعديلات البصرية **PASS**: frontendtypecheck/lint/format، adminlint/tscapp، docsstrict174/32/67/6 inventory20/assert53، وdiffcheck. التشغيل البصري المركزي المجمّع **38/38 في5 ملفات**: toolbar-responsive9، libraries-discovery12، panel-shell7، collage-presets5، toolbar-height5. تحذيرا browsermode وNaN معروفان في الاختبار ولم يسببا فشلاً. template8 منفرد؛ panel7+fluent33 وtoolbar5+9 نتائج إضافية مسماة، لا تُجمع كشهادة نسبة.

القبول البصري **محدود ومقبول ضمن اللقطات المذكورة فقط**: final light header وlightcollage بلاclipping ظاهر؛ darkcollagetimeout مستبعد. لا E2E/CI جرى تشغيله؛ specs مكتوبةNOTRUN وPlaywright package/workflow موجودان فقط. لاAA/RTL200/coarse/phone-device/mixed screenshot أو fulljourney acceptance.

## المعلّق صراحةً

1. القبول البصري الكامل وقياسات AA/hitbox/focus/RTL/200% والمؤشر الخشن وforced-colors/reduced-transparency runtime.
2. baseline لجميع الرحلات والحالات، لقطات after قابلة للمقارنة، timestamps/revision لكل artifact، وتوقيت الأداء؛ لا p95 أو نسب تحسن قبل baseline قياس.
3. onboarding كامل، جميع حقول mixed غير المشمولة، بقية library/import/collage، SaveRecovery/print، وجميع الرحلات الخمس بحالاتها؛ **لا إغلاق كامل لموجة0 أو1–7**.
4. staged documentation matrix وCI/E2E/build الكامل؛ المواصفات والworkflow مكتوبة ولم تُشغّل. لا اختبارات شاملة/E2E/build/commit/push بواسطة مالك التوثيق.

البيانات synthetic فقط؛ لا Supabase/سحابة/طابعة/Wails أصلي/appData. crop والهندسة وUndo محفوظة كعقود محمية، CMYK الحقيقي TIFF فقط مقابل sRGB في JPEG/PNG؛ لا ICC/soft proof أو قبول طابعة. هذه المتابعة مؤقتة وتنتظر الأدلة النهائية؛ أي إضافة لاحقة تكون مؤرخة، لا تمحو القيود أو التاريخ.

## ملحق الإصلاحات التشخيصية وإغلاق انحراف التوثيق — 2026-11-13

- **إغلاق إصلاحات التشخيص (شجرة العمل على `main`):**
  1. منع حلقة إعادة ضبط `scrollTop` في معرض الملصقات (`sticker-catalog.tsx` و`sticker-studio-dialog.tsx` عبر `lastReportedScrollTopRef` وحارس `libraries-discovery.test.tsx` **12/12**).
  2. حماية فك التركيب وجلسة المستند في `ElementArrangeTab` (`arrange-tab.tsx` عبر `coordDirtySessionRef`) ومنع تسرب الالتزام لمستند مُعاد تصفيره (`element-properties-tabs.test.tsx` **41/41**).
  3. توحيد تبويبات المفتش الأيمن على `variant="panel"` مع خصائص الوصول وتسميات RTL (`properties-panel.tsx` و`slot-properties.tsx` مطابقةً لـ`element-properties.tsx`؛ `panel-shell-visual.test.tsx` **8/8**).
  4. صقل `multi-selection-properties.tsx` باستخدام `FluentSection` وشريط محاذاة أيقوني وأزرار `h-8 coarse-touch-target` مع بقاء المقفل inert وسجل التراجع الموحّد (`multi-selection-properties.test.tsx` **22/22**).
  5. ربط `coarse-touch-target` و`aria-label` في الشريط المضغوط والمدمج (`App.tsx`، `toolbar.tsx`، `mode-switcher.tsx`، `toolbar-overflow.tsx`) مع توكنات `--z-toast`/`--z-dialog` في `sonner.tsx` و`FeedbackProvider.tsx` و`EditUserModal.tsx`.
  6. مواءمة التناقض العرضي حول ترويسة اللوح: تثبيت `panel-shell.tsx` على عقد Wave 7 المقبول (`min-h-12` + `bg-card/55` + `border-b border-border/70`) وتحديث `frontend/test/ui-compliance.test.ts` (**54/54**) و`.agents/skills/fluent2-design-system/SKILL.md` ليكونا متسقين مع `panel-shell-visual.test.tsx`.
  7. حذف الفرعين المحليين المدمجين مسبقاً (`fix/print-export-parity-closure` و`fix/ui-audit-followup`) من المستودع المحلي والإبقاء على المسار الخطي على `main` (`origin/*` بانتظار قرار المالك).
- **نتائج الفحص بعد آخر تعديل:** تم اجتياز الفحوص الخفيفة في `frontend` و`admin-web`، وتنسيق `gofmt -l` و`git diff --check`، والاختبارات المستهدفة المسماة في دليل الاختبار، وبوابة `node scripts/docs-gate.mjs --strict-refs` بالجرد `174/32/67/6` (`inventory 20 / assertions 53`). تبقى بنود `SaveRecovery`، تعديلات الطباعة، ترحيل Supabase غير المطبّق (`20261113155602`), E2E الكامل وCI والقبول الفيزيائي معلّقة صراحةً.
