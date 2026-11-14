# قبول تجربة المستخدم — UX Acceptance

**التاريخ:** 2026-11-13 · **الحالة:** قبول جزئي/Provisional؛ مراجعة لقطات محدودة متاحة، لكن الخطة والتصميم الواسع والقبولAA/fullwave غير مغلقين.

**الحالة الحالية للبوابات:** فحوص `frontend` و`admin-web` الخفيفة والاختبارات المستهدفة وبوابة `docsstrict` (`174/32/67/6` و`inventory 20 / assertions 53`) **PASS** بعد إغلاق إصلاحات التشخيص ومواءمة عقد `panel-shell.tsx` (`min-h-12`). لا `final global E2E/CI/build` محلي بعد.

مرجع المتابعة: [خطة موجات0–7](../plans/2026-11-13-comprehensive-ux-development-plan.md) و[تقرير25 المؤقت](../reviews/25-ux-development-acceptance-2026-11-13.md)، Provisional بلا قبول بصري/AA أو إغلاق كامل. [manifest.template.json](./manifest.template.json) قالب متابعة يضم الأدلة المرسلة، ليس شهادة قبول. أضيف التقرير25 إلى الفهرس بإلحاق مؤرخ؛ التقرير24 ومصدره لا يُعدّلان.

## حدود الحزمة والخصوصية

- تجهيز الأدلة ببيانات وfixtures اصطناعية حصراً؛ لا صور عملاء أو جوازات حقيقية أو حسابات أو مفاتيح أو توكنات أو QR اقتران فعلي أو أسماء طابعات شخصية. لم تُنشأ fixtures في هذه السقالة.
- افحص اللقطات والسجلات قبل مشاركتها؛ استبعد الأسرار والمعرّفات والمسارات الشخصية، وسجّل أي تنقيح. اجعل الأصول الثنائية في مكان أدلة مخصص خارج `docs/`؛ يحتفظ manifest بمراجع نسبية منقحة فقط.
- هذه الجولة لا تشغّل طابعة فعلية أو خدمة سحابية أو تعدّل بيانات إنتاج. محاكاة الخدمات لا تثبت قبول Wails/WebView2 الأصلي أو الطباعة الفيزيائية أو الترخيص/السحابة الحيّة.
- لا اختبارات أو بناء أو E2E أو commit/push بواسطة مالك التوثيق. نتائج المنسّق تُنقل كما وصلت مع الأمر والتاريخ والنطاق والقيود؛ لا تُعمّم على حزمة لم تُشغّل.

## تسلسل الأدلة المخطط

1. قبل التطوير: تثبيت revision والبيئة والرحلة والحالة، ثم baseline ولقطات **before** من fixtures اصطناعية. وصل baseline **جزئي** لصورة المحرر الأولية فقط (السجل أدناه)، لا baseline كامل أو قبول بصري؛ بقية الحالات وbefore/after معلّقة. لا تعويض بأثر رجعي عن baseline مفقود.
2. بعد التنفيذ: لقطات **after** بالسيناريو والبيئة نفسيهما، ودليل كود منفصل عن نتيجة الاختبار وعن الملاحظة البصرية.
3. راجع الرحلات الخمس المعتمدة في الخطة: `J1` صورة هوية (إدخال/قص/تأطير/ضبط/نسخ/حفظ/طباعة)، `J2` كولاج (شبكة/قالب/حر/دفعات/ترتيب/خلية/حفظ قالب أو مشروع/مخرج)، `J3` تعديل حر (صور/نصوص/أشكال/تحديد مختلط/محاذاة/طبقات/تراجع/تصدير)، `J4` إدارة (دخول/بحث/تعديل مستخدم أو مفاتيح/تأكيد أو إلغاء/خروج)، و`J5` هاتف (جلسة/إذن كاميرا/التقاط أو اختيار/رفع/إعادة محاولة). جميعها معلّقة دون تشغيل حي.
4. لكل رحلة افحص `idle`، `empty`، `loading`، `run/progress`، `cancel`، `success`، `partial success`، `error`، `retry`، `focus`، `undo`؛ وأيضاً `disabled/locked` و`stale-result` عند انطباقها. عدم الانطباق يحتاج سبباً، لا تحويله إلى نجاح.
5. لكل دليل: معرّف، صاحب التشغيل، وقت الالتقاط الفعلي، revision، نظام التشغيل/runtime، viewport، الثيم، الاتجاه، UI zoom، fixture، expected/observed، المرفقات وحدود الاستنتاج. القيم المجهولة تبقى `null`/`pending`.

## معايير القبول المطلوبة — ليست نتائج مقاسة

| المحور | شرط القبول | الدليل المطلوب | الحالة الحالية |
| --- | --- | --- | --- |
| WCAG 2.2 AA | النص العادي ≥4.5:1؛ النص الكبير وفق تعريف WCAG ≥3:1؛ الأيقونات الوظيفية وحدود التحكم المطلوبة ≥3:1، مع توثيق الاستثناءات النظامية | أزواج ألوان فعلية وقياس في Light/Dark وحالات التحكم المنطبقة | معلّق |
| Hitbox | الهدف التفاعلي ≥24×24 CSS px أو استثناء WCAG موثق؛ أهداف التصميم 28px للفأرة و44px للمؤشر الخشن ليست شهادة WCAG؛ لا تداخل يجعل النقر يفعّل جاراً | قياسات bounds ومسار نقر/لمس؛ لا الاعتماد على حجم رسم الأيقونة | معلّق |
| Focus / keyboard | اسم وصولي، Tab/Shift+Tab منطقيان، focus-visible غير محجوب، حصر التركيز في الحوار وعودته للمُطلِق، Enter/Space/Escape بحسب السياق؛ لا اعتراض اختصارات الحقول النصية | رحلة كاملة بلوحة المفاتيح + فتح/إغلاق وتبديل حوار/مستند | معلّق |
| RTL / LTR | الاتجاهان بلا انعكاس خاطئ للهندسة أو قص للأسماء/القيم؛ LTR للرموز والقيم المناسبة | لقطات وحركة فعلية في الاتجاهين | معلّق |
| 200% UI zoom | جميع الأفعال والرسائل قابلة للوصول بلا قص أو تراكب؛ تمرير واضح عند الحاجة؛ فصل UI zoom عن zoom الكانفاس وOS scaling | قبل/بعد في واجهة مكبّرة وذكر viewport/runtime | معلّق |
| ملكية التفاعل | مالك واحد لكل حوار/أمر/اختصار/عملية؛ الإلغاء أو تبديل الصورة/المستند يمنع commit متأخر ولا يترك التركيز أو busy عالقاً | دليل lifecycle ومسارات cancel/retry/stale-result | معلّق |
| سلامة المستند | تغييرات UX لا تعيد حساب crop أو تضاعفه، لا تغيّر geometry/Undo ولا تُطبّق `cutShapeType` كـclipping تلقائي | أدلة عقود/انحدار ولقطات، مع فصل الهندسة عن pixel parity | معلّق |
| حدود اللون والمخرج | JPEG الافتراضي وPNG المدعوم مسارا sRGB؛ CMYK الحقيقي TIFF فقط؛ لا ادعاء ICC/soft proof أو قبول طابعة | مراجعة عقد المخرج دون تشغيل طابعة أو سحابة | معلّق |

## سجل baseline الجزئي — 2026-11-13

نقل المنسّق التقاط صورة أولية اصطناعية بواسطة `mockGetStartupFile` في معاينة المحرر المحلية، المنفذ `9315` والمسار `/__ux-preview`، viewport **1280×720**. DOM أكد roles/canvas image/state وظهور الألواح؛ لا يمتد ذلك إلى تقييم مظهرها أو إكمال أي رحلة. مرجع artifact بالنسبة إلى جذر ZCode artifacts خارج المستودع: `sess_3b59bfb6-1d68-4235-8d8d-dad892b00774/call_1OAkqyxnLNLtqjM66yok5iH1-tool-result-6b9cacbd-4fa7-4651-be7a-7376d819b69b.png`؛ لا يُنسخ إلى docs ولا تُنشَر المسارات الشخصية.

المتصفح أنتج الصور لكن النموذج تلقى `Media omitted`، وأكد وكيل آخر أن Read للصورة لا يتيح الرؤية أيضاً، لذلك **لا حكم بصري أو قبول**. وصل التقاط تعديل الإدارة 1280×720 والتأكيد الخطر؛ DOM يؤكد delete نشطاً أولياً. المراجع الكاملة نسبةً إلى جذر ZCode artifacts الخارجي:

- تعديل الإدارة: `sess_3b59bfb6-1d68-4235-8d8d-dad892b00774/call_QNIL8CBJNptZvH6tA9Eeylge-tool-result-3a8a7114-ac35-459a-9a6f-05115871a24e.png`.
- التأكيد الخطر: `sess_3b59bfb6-1d68-4235-8d8d-dad892b00774/call_99qcXtvPkazydw5bm7OjlrJx-tool-result-84996961-9322-4317-ad0a-89179451e34d.png`.

أكد المنسّق بـgit revision البداية `7fa01cd5` قبل package-only؛ هذا لا يثبت hash الشجرة لكل artifact. **وقت الالتقاط من artifact فقط**، لا يُستنتج من host time؛ يبقى `null` حتى وصوله. Todo0 للسقالة والـbaseline الأولي **منجز**، بينما قبول الموجة 0 **جزئي وغير مغلق**؛ التوقيت وبقية الحالات والمؤشر الخشن والتباين/RTL/200% وafter معلّقة.

## نتائج التنفيذ المستهدفة المرسلة — subsets فقط

قواعد الموجة 0 في 7 ملفات؛ `ui-compliance` 54/54 وحارس 8/8. subset الموجة 1 في 7 ملفات: `fluent-blocks` 28/28 و`freeform-keyboard` 23/23 و`scanner-keyboard` **10/10** نهائية للاستهدافات. المفتش المختلط subset آمن في 5 ملفات/**21/21 نهائي يحل محل16/16**، store حقيقي + React Testing Library: typed eligibility، إزالة blind broadcast، locked inert، history واحد/gesture؛ لا fontFamily/content/rotation/group ratio/gradients. موجة 3: CSS8/8 source-only وtoolbar9/9، toast3000ms؛ CSS runtime/coarse consumers معلّقان.

وصلت نتائج adminfeedback7/7 وedit5/5 وphone actual UI بمُحاكيات15/15. مشاريع `projects-dialog-backup`13/13 وتصدير `export-dialog`38/38 منفردان مع `--no-file-parallelism`؛ **SaveRecovery/تغييرات print لم تُنجز بعد**، ولا تثبت هذه الاختبارات تنفيذها. مكتبات موجة4 تنتظر final integration، لا إغلاق من نتائج أولية.

### الإدارة after — keyboard/DOM فقط

بعد reload: كل label مرتبطة والاسم focused، و`cancel.pressEnter` أزال Edit. `trigger.pressEnter` فتح `alertdialog` باسم **«تأكيد إجراء خطير»** مع cancel active مقابل delete في baseline؛ `cancel.pressEnter` أزال التأكيد. artifact after نسبةً إلى جذر artifacts الخارجي: `sess_3b59bfb6-1d68-4235-8d8d-dad892b00774/call_cb1gfIrALWLtK7i6zOGXKEIj-tool-result-8ef439f9-8125-4100-bf2d-4a17ffee2e48.png`؛ timestamp/viewport after لم يُرسلا بعد. **clicks المنتهية بمهلة ليست نجاحاً**؛ الملاحظات المعتمدة أحداث المفاتيح وDOM فقط، لا vision/AA أو كامل رحلة الإدارة.

الأوامر والأسماء في [سجل الاختبار](../testing_guide.md#متابعة-تطوير-ux--2026-11-13)، كل ملف منفرد workers=1 ودون coverage. موجة4 تشمل `libraries-discovery` **12/12** (بما في ذلك حارس منع حلقة التمرير) و`collage-presets-tab` **5/5** وtemplate **8/8**، و`multi-selection-properties` **22/22** و`panel-shell-visual` **8/8** و`element-properties-tabs` **41/41** (تشمل حارس فك التركيب وجلسة المستند) وcorefreeform 87/87.

البوابة التاريخية قبل panel-shell كانت 173/32/67/6، ثم صار الجرد 174/32/67/6 بعد إضافة `panel-shell-visual.test.tsx` واجتياز `docsstrict`؛ فشل metric 173→174 السابق تاريخي مرحلي فقط. كما اجتازت فحوص `frontend` و`admin-web` الخفيفة بعد إصلاحات التشخيص. CI specs frontend6/admin4 مكتوبة NOTRUN ولا Wails runtime change. onboarding/SaveRecovery/print والقبول fullwave/AA/RTL/200%/coarse/timing معلّقة.

## مراجعة لقطات المحرر المحدودة — 2026-11-13

راجع المنسّق بالنموذج الرئيسي (لا حكم مستقل من subagent) before1280 وafter داكن1280/1024/1600 ومضيء1600. مراجع artifacts نسبةً إلى الجذر الخارجي نفسه:

- داكن1280: `sess_3b59bfb6-1d68-4235-8d8d-dad892b00774/call_mvWYCwP0GkmLyJBam8c2uLlM-tool-result-2b115558-dbcb-4df7-affc-f26136122c61.png`.
- داكن1024: `sess_3b59bfb6-1d68-4235-8d8d-dad892b00774/call_fgUlviZgGx64CC5UrVbF1KJJ-tool-result-97eb38a9-455c-47bf-88ff-788972522c11.png`.
- داكن1600: `sess_3b59bfb6-1d68-4235-8d8d-dad892b00774/call_eMGOpGIs3lg3HX7UVwSvZfig-tool-result-64f85548-798a-4a13-b673-0aa82f5ad9df.png`.
- مضيء1600: `sess_3b59bfb6-1d68-4235-8d8d-dad892b00774/call_52GeKiUxbbCEWQKcBlvgJISN-tool-result-f64c3cb7-d43d-45d7-8f5b-98f481eb0aef.png`.

الحكم المحدود: لا clipping ظاهر؛1024 يخفي الدرج ويترك الكانفاس جيداً؛1600 متوازن؛light contrast جيد؛toolbar واسع يظهر حفظ/تصدير labels وطباعةprimary، و1024 يطوي labels وفقbreakpoint بلا overlap؛ بطاقات مكتبة عناصرfreeform أقوى. بعد لقطةlight قُوي panelheader (`bg-card/55` و`border-border/70` وselected `border-primary/35`) والتقطت لقطتا `final light` و`collage light` المرجعيتان في [تقرير 25](../reviews/25-ux-development-acceptance-2026-11-13.md#ملحق-المراجعة-البصرية-المحدودة-والجرد174--2026-11-13). لا قياس AA/hitbox أو RTL/200%/coarse/runtime، ولا formal independent visual judge.

## القياس والحكم

الأداء `report-only` حتى يصل baseline موثّق؛ لا قيم p95 أو نسب تحسّن أو عتبات زمن مخترعة قبل القياس. تحديث `docs-metrics` في الخريطة ينتظر عدّ المنسّق وأمره؛ أعداد الملفات لا تعني نجاح الاختبارات. لا تُستنتج قبول AA من screenshot وحدها، ولا تكفي نتيجة وحدة لإغلاق رحلة كاملة.

تظل الحالة **pending** حتى يراجع مالك القبول الأدلة المطلوبة. عند نقص دليل تُذكر الفجوة صراحة؛ تُحدّث الخطة وtracker وfragment الجلسة نفسه. لا تُحدّث `README.md` أو دليلَي الاختبار/المطور إلا عند وجود تغيير مشاهد أو نتيجة/عقد مثبت يستوجب ذلك.
