# مراجعة حملة التعديلات — 2026-11-20

## النطاق والمنهج

الأساس `HEAD = 5832c0eb`، والجرد الأولي من `git status --short` و`git diff --stat`: **122 ملفاً متتبعاً معدّلاً** وfragment غير متتبع. راجعت الفروق الحالية كاملة، موزعة على خمسة مسارات مراجعة عميقة مع تتبع العقود والمستهلكين؛ لا مجرد بحث عن أسماء. لا تغييرات Go أو migrations ضمن هذه الدفعة، ولا مراجعة شاملة جديدة لكل تاريخ التطبيق. أضيفت إصلاحات محدودة في تبعيات مباشرة، مع الحفاظ على تغييرات الحملة وعدم استرجاع الملفات أو إعادة كتابة التطبيق.

**الحالة:** إصلاحات الكود والاختبارات المستهدفة منفذة. جميع الاستهدافات المذكورة أدناه نجحت في آخر تشغيل لكل ملف. الفحوص العامة النهائية قيد التثبيت في ملحق البوابات؛ لا استنتاج نجاح من تشغيل سابق. الملاحظات القديمة خارج الفروق مفصولة صراحةً عن الإصلاحات.

## العيوب المثبتة والإصلاحات

كل ✅ هنا يعني إصلاحاً في شجرة العمل بتاريخ 2026-11-20 مع الدليل المحدد؛ لا يعني قبولاً بصرياً/طابعة/سحابة.

| المعرف | الشدة | المشكلة المثبتة | الإصلاح ودليل المصدر | الاختبار |
|---|---|---|---|---|
| CA-01 ✅ | P1 | `useShallow` يغلّف كائناً يحوي `targetIds` جديدة؛ تركيب الفلاتر ينهار بخطأ `Maximum update depth exceeded` حتى بلا تحديد | اشتراك بمراجع مستقرة واشتقاق منفصل؛ `frontend/src/components/editor/toolbar/toolbar-image-filters.tsx` | `toolbar-image-filters`؛ فشل قبل الإصلاح ثم نجح |
| CA-02 ✅ | P1 | تطبيق مرشح جماعي يعدّل الصور المقفلة | أهلية وقت الفعل، استبعاد المقفل وغير المحدد/المحذوف، لا تاريخ عند no-op؛ المصدر نفسه | `toolbar-image-filters` |
| CA-03 ✅ | P1 | زر مسح المسودة يحذف مفتاح localStorage غير مستخدم ولا يمس ملف الحفظ الفعلي | `clearAutoSave()` عبر الكاتب المرتب بعد تأكيد مرئي؛ الفشل أو تبديل المستند لا يعيد التحميل؛ `frontend/src/components/error-boundary.tsx:64` | `error-boundary` + `use-autosave` |
| CA-04 ✅ | P2 | الحوار يعيد تمكين أفعال الاستعادة عند reopen فيما عملية سابقة مستمرة؛ الرفض غير معالج | قفل ref متزامن طوال عمر العملية، حراسة رسائل الجلسة ورفض معروض؛ `frontend/src/components/crash-recovery-dialog.tsx` | `crash-recovery-dialog` |
| CA-05 ✅ | P2 | مستمع السمة المشترك دائم؛ تغيّر بين render/subscribe قد يترك المستهلك قديمًا | لقطة مستقرة بـ`useSyncExternalStore`، مستمع واحد ينظف بعد آخر مشترك وتسوية عند الاشتراك؛ `frontend/src/hooks/use-theme.ts:71` | `hooks` |
| CA-06 ✅ | P2 | عبور عتبة العرض يلغي Zen ولا يستعيد المفتش؛ فتح الدرج الوظيفي لا يخرج من Zen | الحفاظ على Zen الصريح عبر الاستجابة، استعادة الألواح بدقة ودعم updater؛ `frontend/src/hooks/use-workspace-panels.ts` | `use-workspace-panels` + `App` |
| CA-07 ✅ | P1 | regroup ومحاذاة/أسهم يمكن أن تفصل مجموعة ذرية أو تحرّك أعضاء مجموعة مقفلة | أهلية المجموعة كاملة، تطبيع التحديد، حراسة الحسابات المشتركة؛ `frontend/src/lib/store/slices/element/selection.ts` و`frontend/src/lib/canvas/element-alignment.ts` | `element-slice` + `keyboard-shortcuts` |
| CA-08 ✅ | P2 | ترتيب عضو وحده أو DnD يعيد ترقيم كل الطبقات بما فيها المقفلة | وحدات مجموعات كاملة، إعادة استخدام مواقع z للمتأثرين فقط، منع عبور وحدة مقفلة ورفض ترتيب قديم متداخل؛ `frontend/src/lib/selection-properties.ts:228` و`layers-list.tsx` | `element-slice` + `layers-list` |
| CA-09 ✅ | P2 | حذف مجموعة يبدّل العنصر الأساسي رغم بقاء المقفل الأساسي | إبقاء primary إذا بقي ضمن التحديد الفعلي؛ `frontend/src/lib/store/slices/element/crud.ts` | `element-slice` بحالة تميز الإصلاح عن fallback |
| CA-10 ✅ | P1 | Escape في X/Y يزيل pending history ويبقي المعاينة المعدلة | ملكية إحداثيات الجلسة، استعادة owned preview وتثبيت واحد عند Enter/blur؛ `frontend/src/components/editor/properties/element/tabs/arrange-tab.tsx` | `element-properties-tabs` |
| CA-11 ✅ | P2 | مسودة غير معدلة للشبكة/الخط/HEX تكتب فوق تغيير خارجي عند blur | dirty/session/owned-value guards، تنسيق نهائي وعدم مضاعفة commit؛ `grid-columns-panel.tsx` و`font-size-field.tsx` و`color-panel.tsx` | `canvas-dimensions-panel` + `element-properties-tabs` + `color-panel` |
| CA-12 ✅ | P1 | قطارة fallback تحتفظ بالمستمعين والمؤشر بعد التفكيك؛ native picker قد يطبق نتيجة قديمة | تنظيف واستعادة cursor وAbortController وملكية محاولة/مستند؛ `frontend/src/components/editor/properties/color-panel.tsx` | `color-panel` |
| CA-13 ✅ | P1 | UI zoom الأصلي لا يحترم readiness؛ paste/تاريخ nudge متأخر يصيب مستنداً جديداً | جيل readiness وجلسة مستند وحراس مشتركة للحافظة؛ `frontend/src/hooks/use-keyboard-shortcuts.ts` و`frontend/src/lib/io/clipboard-utils.ts` | `keyboard-shortcuts` + `clipboard-utils` |
| CA-14 ✅ | P2 | curve release يكرر history، وgradient commit يرسل القيمة القديمة | فصل drag-end عن commit وتمرير قيمة commit الحقيقية؛ `text-effects-tab.tsx` و`gradient-picker.tsx` | `element-properties-tabs` |
| CA-15 ✅ | P2 | مقارنة opacity المدوّرة تخفي تغيراً حقيقياً؛ سمك/لون السهم غير مطابق لافتراضي الرسم | تقريب العرض فقط ومقارنة القيمة المخزنة، توحيد سمك/لون الشكل الخطي؛ `selection-properties.ts` و`shape-properties.tsx` | `multi-selection-properties` + `element-properties-tabs` |
| CA-16 ✅ | P1 | تنظيف StrictMode يصفّر caster المذكرة؛ الظل لا يقرأ المصدر الكامل أثناء capture | caster من image/crop الحيين، دقة capture داخل المعاملة وbitmap عرض محدود فقط؛ `frontend/src/components/editor/konva/elements/image-node.tsx:272` | `image-node` (StrictMode، success، abort) |
| CA-17 ✅ | P1 | تعويض endpoints/radii لا يمثل paint affine غير المنتظم؛ arc/wedge يدوران paint مع الهندسة | رسم paint في فضاء العنصر مع هندسة Konva الأصلية ونظير fallback؛ `fill-utils.ts` و`shape-node.tsx` و`frontend/src/lib/export/export-canvas-fitted.ts` | `fill-utils` |
| CA-18 ✅ | P2 | `strokeScaleEnabled=false` يغيّر zoom/DPR؛ السهم الرفيع fallback يفرض ارتفاع16px | إزالة override ومطابقة `arrowY=h/2`؛ `shape-node.tsx` و`export-canvas-fitted.ts:409` | `fill-utils` |
| CA-19 ✅ | P2 | حاجز capture/gesture للكاش يطبق على مراقبي القص فقط | تطبيق الحاجز على كل صور الفلاتر وإعادة محاولة عند الاستقرار؛ `frontend/src/hooks/use-filter-cache.ts` | `use-filter-cache` |
| CA-20 ✅ | P2 | مقارنة الصورة الأصلية تبقى على target قديم أو تكتب فوق مصدر أحدث | pointer input وتنظيف تغيّر الهوية/blur/unmount واستعادة owned source فقط؛ quick-bar section العنصر والخانة | `canvas-quick-bar` |
| CA-21 ✅ | P2 | URL preview يُلتقط ثم يفرغ؛ fallback document URL يُلغى؛ StrictMode يفسد saved selection وcollage يعاد وفق elements فقط | ملكية URL واستقرار القيمة واستعادة تحديد الوضع الصحيح؛ `frontend/src/components/editor/dialogs/print-dialog.tsx` | `print-dialog-backstage` |
| CA-22 ✅ | P2 | غياب إمكانات الطابعة يُفسّر borderless | صفر هوامش ونموذج مطابق مصرح بدعمه فقط؛ المصدر نفسه | `print-dialog-printer-default` + `use-print-layout` |
| CA-23 ✅ | P1 | سحب المجموعة يسنّب العضو القائد وأدلة تبقى بعد clamp | سناب AABB واحد واستبعاد المشاركين وترجمة واحدة وأدلة مطابقة للنهاية؛ `frontend/src/features/freeform-collage/lib/slots/slot-move.ts` | `freeform-slots-coverage` |
| CA-24 ✅ | P1 | قفل النسبة corner بحركة عمودية فقط يمنعه العرض القديم وقد يصطدم ضلع مرافق بجار | مقياس fitted واحد وحدود اتجاهية للضلعين وإزالة أدلة زائفة؛ `slot-resize.ts` | `freeform-collage` |
| CA-25 ✅ | P1 | `MmField` يخلق history لكل حرف وEscape لا يعيد الهندسة/redo؛ مسودة تنتقل لتحديد أحدث | معاملة واحدة قابلة للإلغاء مع raw draft ومعاينة مقيدة، bounds دقيقة لا display rounded؛ freeform inspector/history/actions | `freeform-editor` + `element-properties-tabs` |
| CA-26 ✅ | P2 | خيار غير قابل للتراجع يبقي future لكنه يعود لخيارات قديمة في redo؛ dirty يسقط خيارات محفوظة | نشر خيارات المستند نفسه عبر اللقطات، مقارنة الحقول المحفوظة، عزل import؛ `use-freeform-document-history.ts` وmodal | `freeform-editor` |
| CA-27 ✅ | P1 | pack مستحيل يصغّر preset فيزيائي بتشويه/يفيض؛ split يختلف عن MIN_SIZE | رفض المستحيل مع حفظ المستند واستعمال الحد الموحد؛ `slot-pack.ts` وslot actions | `freeform-collage` |
| CA-28 ✅ | P1 | ماسح يغلق دون abort، reset قبل render لا يبطل العمل، تبديل source يترك docs/preview قديمة | ref-owned preview/export وقفل الاستبعاد وabort close/unmount/source change وحراسة النتائج؛ hooks/dialog الماسح | `document-scanner` |
| CA-29 ✅ | P2 | اختيار/إضافة/حذف مستند متاح أثناء processing؛ loupe/pins لا تتطابق مع display/حدود الصورة | تعطيل كامل الأفعال المعنية وتوحيد مقاييس العرض/العينة/outer loupe؛ sidebar/document-list-item/canvas hook | `document-scanner` + `scanner-keyboard` |
| CA-30 ✅ | P1 | import/save الكولاج الحر يعود بعد reopen ويمسح draft/loading أحدث | reader abort+session وsave attempt، refresh المكتبة يستمر بعد persistence ناجح؛ modal وslot actions | `freeform-editor` |
| CA-31 ✅ | P1 | إدراج/re-edit الملصق القديم يصل بعد reopen/document switch؛ deleted يصير new أو locked/replaced يُكتب فوقه | حراس محاولة/مستند/target/source/lock وقراءة canvas بعد setMode؛ `use-sticker-insert-actions.ts` | `sticker-insert-actions` |
| CA-32 ✅ | P1 | VDP parse/chunks/progress/finally القديم يملأ جلسة/مستند أحدث | ملكية latest file/generation وabort وحارس document/layout، حساب الوضع المرئي؛ `vdp-import-dialog.tsx` | `vdp-import-dialog` |
| CA-33 ✅ | P1 | import batch قديم يملأ queue أحدث، overflow يضاف بعد معاملة منفصلة | session/request guards وتسليم pending عبر `setSlotImagesBatch` ذرياً؛ `batch-insert-dialog.tsx` | `batch-insert-dialog` |
| CA-34 ✅ | P2 | post-save source guard يرفض تحديث المستهلك الناجح ويترك crop/refine مفتوحاً | فصل ملكية completion عن source-attempt مع source ref في layout effect؛ crop/refine | `image-dialog-lifecycle` |
| CA-35 ✅ | P2 | microtask تفسير التسجيل يسبق mode-reset ويمسح التفسير | reset صريح متزامن مع mode؛ `account/use-auth-forms.ts` | `account-license-modal` |
| CA-36 ✅ | P2 | inline color draft يبقى بعد تبديل role، Enter يصيب wrapper غير text، preset storage failure يعلن نجاحاً | role-sensitive reset وcontained text dispatch ورفض persistence بصراحة؛ inline/properties | `sticker-inline-editor` |
| CA-37 ✅ | P2 | FileReader المشاريع يعيد confirmation بعد reopen وfocus ring على sibling لا يشمل input | reader/session guards وexport/import completion guards ونقل focus-within للمالك؛ `projects-dialog.tsx` | `projects-dialog-backup` |
| CA-38 ✅ | P2 | restart الجسر يعلن نجاحاً على null/stopped | النجاح يحتاج حالة backend running؛ `phone-bridge-dialog.tsx` | `phone-bridge-dialog` |
| CA-39 ✅ | P1 | مولد single/batch يسمح بطلبات متزامنة قبل rerender | قفل متزامن مشترك وملكية reset/session؛ `admin-web/src/pages/admin/useAdminKeys.ts` | `admin-mutation-ownership` |
| CA-40 ✅ | P1 | fulfillment zoom لا يثبت support ونتيجة قديمة تملك كاميرا جديدة؛ digital يزيد فوق sensor crop | queue/owner+capabilities/settings وإزاحة digital بالratio؛ replacement stream يربط video حتى إن لم remount؛ `PhoneCameraPage.tsx:387` | `phone-camera-page` |
| CA-41 ✅ | P2 | capture لا يتبع object-cover preview؛ torch/AudioContext قد يتسربان | crop مرئي متطابق وقفل torch وتنظيف الصوت على نجاح/رفض/استثناء/مهلة؛ المصدر نفسه | `phone-camera-page` |
| CA-42 ✅ | P2 | duplicate الكولاج ينقل URLs/filter فقط | `moveSlotContentsBatch` الكامل مع هندسة الوجهة وتاريخ واحد؛ `desktop-menu-bar.tsx` | `App` |
| CA-43 ✅ | P2 | disabled asChild يمرر child-first handlers/link default؛ tab مفاتيح consumed تغير mode؛ inert يترك focus عالقاً | منع تفعيل disabled فعلياً وحراس keyboard وتسليم focus للكانفاس دون سرقة modal؛ button/mode/App/workspace | `ui-components` + `App` |
| CA-44 ✅ | P2 | Sonner unlayered CSS يغلب z utility والحركة | inline `var(--z-toast)` وقواعد reduced-motion الفعلية؛ sonner/index.css | `ui-components` + `ui-compliance` |
| CA-45 ✅ | P2 | fragment الحملة يستخدم `fixed` بلا related_files والتوثيق لا يزامن الاختبارات/tokens | `fix` ومراجع، fragment هذه الجلسة، أدلة التوثيق والجرد | فحص سكيمة مستقل وبوابة التوثيق |

## التحقق التنفيذي المستهدف

كل ملف شُغّل **منفرداً** بعامل واحد ودون coverage؛ حلقات الصدفة تستدعي عملية Vitest مستقلة لكل مسار، لا suite كاملة أو تشغيل متوازٍ. آخر نتيجة لكل صف أدناه هي النتيجة المعتمدة، ولا تُجمع إعادة التشغيل معها.

```bash
node C:/projects/grido/frontend/node_modules/vitest/vitest.mjs run <file> --root C:/projects/grido/frontend --config C:/projects/grido/frontend/vitest.config.ts --maxWorkers=1 --no-file-parallelism --coverage.enabled=false
node C:/projects/grido/admin-web/node_modules/vitest/vitest.mjs run <file> --root C:/projects/grido/admin-web --config C:/projects/grido/admin-web/vite.config.ts --maxWorkers=1 --no-file-parallelism --coverage.enabled=false
```

| `<file>` في frontend | آخر نتيجة |
|---|---|
| test/toolbar-image-filters.test.tsx | 3/3 PASS |
| test/error-boundary.test.tsx | 3/3 PASS |
| test/crash-recovery-dialog.test.tsx | 10/10 PASS |
| test/hooks.test.ts | 8/8 PASS |
| test/use-workspace-panels.test.ts | 14/14 PASS |
| test/element-slice.test.ts | 28/28 PASS |
| test/element-slice-text.test.ts | 17/17 PASS |
| test/element-properties-tabs.test.tsx | 54/54 PASS |
| test/canvas-dimensions-panel.test.tsx | 12/12 PASS |
| test/color-panel.test.tsx | 13/13 PASS |
| test/layers-list.test.tsx | 14/14 PASS |
| test/multi-selection-properties.test.tsx | 23/23 PASS |
| test/freeform-text-tab.test.tsx | 7/7 PASS |
| test/keyboard-shortcuts.test.ts | 29/29 PASS |
| test/clipboard-utils.test.ts | 6/6 PASS |
| test/ui-components.test.tsx | 13/13 PASS |
| test/fluent-blocks.test.tsx | 36/36 PASS |
| test/ui-compliance.test.ts | 56/56 PASS |
| test/App.test.tsx | 27/27 PASS |
| test/image-dialog-lifecycle.test.tsx | 12/12 PASS |
| test/sticker-insert-actions.test.tsx | 6/6 PASS |
| test/sticker-inline-editor.test.tsx | 3/3 PASS |
| test/vdp-import-dialog.test.tsx | 3/3 PASS |
| test/account-license-modal.test.tsx | 68/68 PASS |
| test/batch-insert-dialog.test.tsx | 5/5 PASS |
| test/projects-dialog-backup.test.tsx | 15/15 PASS |
| test/phone-bridge-dialog.test.tsx | 7/7 PASS |
| test/fill-utils.test.ts | 22/22 PASS |
| test/image-node.test.tsx | 3/3 PASS |
| test/use-filter-cache.test.tsx | 4/4 PASS |
| test/canvas-quick-bar.test.tsx | 19/19 PASS |
| test/use-print-layout.test.ts | 13/13 PASS |
| test/print-dialog-printer-default.test.tsx | 7/7 PASS |
| test/print-dialog-backstage.test.tsx | 18/18 PASS |
| test/freeform-collage.test.ts | 101/101 PASS |
| test/freeform-slots-coverage.test.ts | 33/33 PASS |
| test/freeform-editor.test.tsx | 53/53 PASS |
| test/scanner-keyboard.test.tsx | 12/12 PASS |
| src/components/editor/document-scanner/__tests__/document-scanner.test.ts | 29/29 PASS |
| test/text-editing-overlay.test.tsx | 17/17 PASS |
| test/use-autosave.test.ts | 21/21 PASS |

| `<file>` في admin-web | آخر نتيجة |
|---|---|
| src/pages/phone-camera-page.test.tsx | 28/28 PASS |
| src/pages/admin/__tests__/admin-mutation-ownership.test.tsx | 55/55 PASS |
| src/pages/admin/components/admin-ui-components.test.tsx | 13/13 PASS |

### إخفاقات مرحلية محفوظة وسبب إصلاحها

- الفلاتر: ثلاث حالات فشلت قبل تثبيت selector، ثم حالة lock كشفت تعديلاً فعلياً للمقفل وأُصلحت.
- فحص الأنواع بعد الدمج كشف narrowing ومراجع أسماء أثناء wiring ومُحاكيات CancellablePromise؛ أُصلحت بلا `any` أو إسقاط تأكيدات.
- shared freeform minima كشف عدم وصول القيم خارج المجال إلى المعاينة؛ أُعيد clamped preview مع raw draft، وبقيت التوقعات الأصلية.
- حالات Sonner كانت تتوقع list قبل toast؛ fixture الصحيح يرسل toast وينتظر نشره. Separator dekorative يستخدم Radix `role=none`؛ fixture رُبط بعقده الفعلي.
- App fixture بدون token فتح auth modal كما ينبغي؛ أُصلح fixture لا focus trap. fixture duplicate بلا خانة ثانية صار بمعرفات وهندسة صريحة.
- camera replacement كشف عيب srcObject فعلياً وأُصلح في المصدر.
- image-node احتاج `getImageData().data` في Canvas mock قبل إنشاء Konva؛ لا إضعاف capture assertions.
- VDP/projects file inputs داخل Portal؛ اختبارات fixture تبحث في document لا container الفارغ.
- large scanner fixture غيّر natural size دون corners؛ سُويت الإحداثيات. snapped group fixture على حد `.020000000000000018 > .02` بقي `.18` بحسب الحساب، واختبارات AABB المستقلة محفوظة.
- lint كشف كتابة ref أثناء render وتنظيف/recursion/import-order/label/no-alert؛ عولج السبب دون تعطيل القواعد. تأكيد مسح المسودة صار تأكيداً مرئياً داخل fallback لا نافذة alert أصلية.
- تحذيرات jsdom `getContext` وReact `act` تظهر في بعض الاختبارات القديمة؛ وWails browser-preview/سجلات failure mocks متوقعة. PASS ليس دليلاً على بكسلات أو native runtime.

## ملاحظات قديمة خارج إصلاحات الحملة — OPEN

| المعرف | الشدة | المسار والدليل | الحالة |
|---|---|---|---|
| BASE-01 | P2 | `frontend/src/components/editor/dialogs/phone-bridge-dialog.tsx` init/poll/restart/stop يعتمد mount guard دون close/reopen generation كامل | تقرير فقط؛ truthful running-result أصلح، لكن ملكية كل عمليات الجسر غير مغلقة |
| BASE-02 | P2 | `frontend/src/components/editor/dialogs/projects-dialog.tsx` handleSave/confirmDelete/handleConfirmReset أوسع من حراسة import/export المصلحة | تقرير فقط؛ لا ادعاء سلامة جميع completions |
| BASE-03 | P1 | `frontend/src/components/editor/toolbar/toolbar-ai-tools.tsx:232` مستهلك Refine onSave لا يفحص نشاط/قفل/هوية target مثل المستهلك الآخر | baseline غير معدّل؛ يحتاج حارس مستهلك واختبار مستقل |
| BASE-04 | P2 | `frontend/src/features/stickers/lib/use-sticker-export-actions.ts` cancellation boolean/finally في مسار export غير المعدّل | baseline غير معدّل؛ لا ادعاء اكتمال ملكية export |

حراس draft equality لا تحل كل ABA محتمل بلا revision دائم. إلغاء clipboard/raster/upload قد يترك ملف وسائط كُتب فعلياً قبل الإبطال؛ الحارس يمنع إدراجه في مستند أحدث ولا يدعي rollback خادم/قرص. ترتيب legacy groups المتداخل يُرفض تحفظياً بدل إعادة تنظيمه صامتاً.

## حدود القبول

- لا full unit suite/coverage أو E2E/Playwright أو بناء ثقيل محلي؛ CI الشامل ينتظر إذن commit/push مستقل.
- لا commit/push/publish، لا حسابات Supabase حية أو migrations/صلاحيات، لا dependency security audit جديد. هذا تدقيق دفعة سلوكي، لا شهادة أمن التطبيق كله.
- Browser Use متاح وتم فحص controlled/user tabs، وكلاهما فارغ؛ لم تكن معاينة محلية مفتوحة ولم يُنشأ خادم/fixture اصطناعي جديد. **لم يُنفّذ GUI/visual acceptance**.
- لم تُنفّذ كاميرا فعلية/طابعة/نافذة Wails؛ اختبارات DOM/Canvas mocks تثبت العقود المذكورة لا جودة raster أو DPI في جهاز حقيقي.
- عقود pattern2048 وSourceFullRes وserialized capture والمجموعات الذرية وJPEG/PNG مقابل CMYK TIFF ودليل cutShape بلا clipping محفوظة.

## بوابات الجودة النهائية

**النتيجة النهائية — 2026-11-20:**

- `npm --prefix C:/projects/grido/frontend run typecheck` **PASS**.
- `npm --prefix C:/projects/grido/frontend run lint` **PASS**، صفر أخطاء/تحذيرات؛ من دون تعطيل قاعدة لإخفاء الإصلاح.
- `npm --prefix C:/projects/grido/frontend run format:check` **PASS**؛ الملفات المعدلة نسّقت بعد الإصلاحات.
- `npm --prefix C:/projects/grido/admin-web run lint` **PASS**، صفر أخطاء/تحذيرات.
- `node C:/projects/grido/admin-web/node_modules/typescript/bin/tsc --noEmit -p C:/projects/grido/admin-web/tsconfig.app.json` و`tsconfig.node.json` **PASS**.
- `node scripts/docs-gate.mjs --strict-refs` **PASS** بعد تحديث الجرد؛ inventory20/assertions53، والأعداد186/32/68/6. **لا staged files**، لذلك مصفوفة commit/schema ضمن البوابة لم تُنفذ.
- `git diff --check` **PASS**.
- فحص مستقل بـNode لfragmentَي `20261120-ui-change-campaign-audit.md` و`20261120-ui-comprehensive-ui-bugs-fix.md`: frontmatter/type/scope/body/related_files ووجود الملفات وحدود الأسطر **PASS**، من دون تغيير index أو تجهيز commit.
- آخر تشغيل لكل واحد من الملفات44 في الجدول **PASS**؛ لا full suite/E2E/CI/GUI/بناء جديد. فشل metrics178→186 وlint34 وfixtures في السجل أعلاه تاريخ مرحلي محفوظ، لا عيوب معلقة في بوابات الشجرة الحالية.


## متابعة ملاحظة المستخدم — القوائم خلف الحوار (2026-11-20)

**CA-46 ✅ — P1:** مكونات القوائم المشتركة تستخدم2500، لكن مستهلكين يفرضون150 أو1500 عبر `className`، فيحذف `tailwind-merge` توكن2500 ويضع wrapper Radix خلف الحوار2000. أزيلت التجاوزات من أربع قوائم `print-dialog.tsx`، ومن `freeform-paper-selector.tsx` و`freeform-top-action-bar.tsx` و`freeform-right-inspector-panel.tsx` (قائمة وتلميح)، ومن `font-selector.tsx` (منتقي وتلميحان) و`text-type-tab.tsx` (وزن الخط داخل Sheet). بقيت قوائم canvas/rail المحلية على طبقاتها المقصودة؛ لا رفع عشوائي لكل الأسطح.

- حارس regression جديد في `test/ui-compliance.test.ts` يغطي المستهلكين الستة ولا يكتفي بالـprimitives.
- تشغيل منفرد بالقالب السابق: `ui-compliance` **57/57**، `font-selector` **17/17**، `freeform-editor` **53/53**، `print-dialog-backstage` **18/18**، `element-properties-tabs` **54/54**؛ كلها PASS. نتيجة57 تحل محل56 في جدول الجولة السابق، لا تُجمع معه.
- تحقق Browser Use محدود في harness محلي مستثنى من Git (`frontend/.zcode/overlay-layer-qa/`) يستخدم مكونات الإنتاج دون تجاوز بوابة ترخيص التطبيق: DOM فتح الحوار والقائمة بالمفاتيح؛ قياس computed style أعاد dialog2000/listbox2500/wrapper2500، و`elementFromPoint` في وسط القائمة أصاب option داخلها (`hitInside=true`). CSS تجميع PostCSS الفعلي أعاد التوكنز والأصناف، لا أرقام مصدر فقط.
- تشغيل خادم جديد فشل لأن9245 مشغول؛ استُخدمت المعاينة القائمة. التطبيق الأصلي هناك يعرض فشل تحقق الجلسة، فلم تُتجاوز المصادقة؛ harness معزول وليس قبول رحلة تطبيق كاملة. نقرات Browser Use الآلية timeout، ولم تُنسب إلى نجاح. screenshot أُنتج لكن النموذج تلقى Media omitted، فلا حكم بصري على الصورة ولا قبول GUI كامل. هذا يحدّث فقرة «لم يُنشأ fixture» السابقة تاريخياً، لا يمحوها.
- **بوابات CA-46 النهائية:** frontend `typecheck` و`lint` و`format:check`، و`docs-gate --strict-refs` و`git diff --check` كلها **PASS** بعد الإصلاح. مراجع fragment المحدّثة فُحصت مستقلاً ونجحت؛ لا staging/commit/push.
- لا E2E/CI أو Wails/طابعة أو نشر. الملفات الثلاثة الإضافية في هذه المتابعة: shared `font-selector.tsx`، `text-type-tab.tsx`، `freeform-top-action-bar.tsx`؛ مراجعها أعلاه قابلة للتتبع.

قائمة المصادر الإضافية في متابعة CA-46:

```text
frontend/src/components/ui/font-selector.tsx
frontend/src/components/editor/properties/panels/text/text-type-tab.tsx
frontend/src/features/freeform-collage/components/freeform-top-action-bar.tsx
```

## جرد الملفات المراجعة

يشمل كل مصادر الدفعة الأصلية والتبعيات المباشرة الخمس المضافة (المجموع الحالي من `git diff --name-only` هو **117 ملف مصدر**). تفاصيل الجرد تضاف آلياً أدناه من المسارات الفعلية، لا أسماء مستنتجة.

```text
admin-web/src/pages/PhoneCameraPage.tsx
admin-web/src/pages/admin/components/KeysTable.tsx
admin-web/src/pages/admin/components/LoginForm.tsx
admin-web/src/pages/admin/components/UserDetailsDrawer.tsx
admin-web/src/pages/admin/useAdminKeys.ts
frontend/src/App.tsx
frontend/src/components/crash-recovery-dialog.tsx
frontend/src/components/editor/canvas/canvas-bleed-guides.tsx
frontend/src/components/editor/canvas/canvas-quick-bar.tsx
frontend/src/components/editor/canvas/canvas-scrollbars.tsx
frontend/src/components/editor/canvas/canvas-viewport-deck.tsx
frontend/src/components/editor/canvas/context-menu.tsx
frontend/src/components/editor/canvas/context-menu/canvas-menu-section.tsx
frontend/src/components/editor/canvas/context-menu/element-menu-section.tsx
frontend/src/components/editor/canvas/context-menu/slot-menu-section.tsx
frontend/src/components/editor/canvas/editor-canvas.tsx
frontend/src/components/editor/canvas/quick-bar/quick-bar-element-section.tsx
frontend/src/components/editor/canvas/quick-bar/quick-bar-slot-section.tsx
frontend/src/components/editor/canvas/text-editing-overlay.tsx
frontend/src/components/editor/canvas/use-canvas-viewport.ts
frontend/src/components/editor/canvas/use-ruler-metrics.ts
frontend/src/components/editor/canvas/use-user-guides.ts
frontend/src/components/editor/dialogs/account-license-modal.tsx
frontend/src/components/editor/dialogs/account/auth-tab-content.tsx
frontend/src/components/editor/dialogs/account/use-auth-forms.ts
frontend/src/components/editor/dialogs/batch-insert-dialog.tsx
frontend/src/components/editor/dialogs/crop-dialog.tsx
frontend/src/components/editor/dialogs/export-dialog.tsx
frontend/src/components/editor/dialogs/keyboard-shortcuts-dialog.tsx
frontend/src/components/editor/dialogs/phone-bridge-dialog.tsx
frontend/src/components/editor/dialogs/print-dialog.tsx
frontend/src/components/editor/dialogs/projects-dialog.tsx
frontend/src/components/editor/dialogs/refine-bg-dialog.tsx
frontend/src/components/editor/document-scanner/components/document-list-item.tsx
frontend/src/components/editor/document-scanner/components/scanner-sidebar.tsx
frontend/src/components/editor/document-scanner/document-scanner-dialog.tsx
frontend/src/components/editor/document-scanner/hooks/use-scanner-canvas-render.ts
frontend/src/components/editor/document-scanner/hooks/use-scanner-detection.ts
frontend/src/components/editor/document-scanner/hooks/use-scanner-processor.ts
frontend/src/components/editor/konva/elements/collage-image.tsx
frontend/src/components/editor/konva/elements/editor-transformer.tsx
frontend/src/components/editor/konva/elements/fill-utils.ts
frontend/src/components/editor/konva/elements/image-node.tsx
frontend/src/components/editor/konva/elements/shape-node.tsx
frontend/src/components/editor/konva/konva-canvas.tsx
frontend/src/components/editor/konva/layers/konva-collage-layer.tsx
frontend/src/components/editor/konva/layers/konva-single-layer.tsx
frontend/src/components/editor/panels/collage/collage-arrange-tab.tsx
frontend/src/components/editor/panels/freeform/freeform-layers-tab.tsx
frontend/src/components/editor/panels/freeform/freeform-text-tab.tsx
frontend/src/components/editor/print/print-preview.tsx
frontend/src/components/editor/properties/color-panel.tsx
frontend/src/components/editor/properties/element/tabs/arrange-tab.tsx
frontend/src/components/editor/properties/general/canvas-dimensions-panel.tsx
frontend/src/components/editor/properties/general/grid-columns-panel.tsx
frontend/src/components/editor/properties/gradient-picker.tsx
frontend/src/components/editor/properties/layers-list.tsx
frontend/src/components/editor/properties/panels/shape-properties.tsx
frontend/src/components/editor/properties/panels/text/font-size-field.tsx
frontend/src/components/editor/properties/panels/text/text-effects-tab.tsx
frontend/src/components/editor/properties/slot-properties.tsx
frontend/src/components/editor/system/desktop-menu-bar.tsx
frontend/src/components/editor/system/license-lock-screen.tsx
frontend/src/components/editor/system/update-notifier.tsx
frontend/src/components/editor/toolbar/mode-switcher.tsx
frontend/src/components/editor/toolbar/toolbar-image-filters.tsx
frontend/src/components/editor/workspace/app-dialogs-host.tsx
frontend/src/components/editor/workspace/rail-settings-menu.tsx
frontend/src/components/editor/workspace/workspace-layout.tsx
frontend/src/components/error-boundary.tsx
frontend/src/components/ui/alert-dialog.tsx
frontend/src/components/ui/blocks/fluent-capsule-button.tsx
frontend/src/components/ui/blocks/fluent-filter-chips.tsx
frontend/src/components/ui/blocks/fluent-slider-field.tsx
frontend/src/components/ui/button.tsx
frontend/src/components/ui/dialog.tsx
frontend/src/components/ui/dropdown-menu.tsx
frontend/src/components/ui/popover.tsx
frontend/src/components/ui/radio-group.tsx
frontend/src/components/ui/select.tsx
frontend/src/components/ui/separator.tsx
frontend/src/components/ui/sheet.tsx
frontend/src/components/ui/sonner.tsx
frontend/src/components/ui/tabs.tsx
frontend/src/components/ui/tooltip.tsx
frontend/src/features/freeform-collage/components/freeform-collage-modal.tsx
frontend/src/features/freeform-collage/components/freeform-left-tools-panel.tsx
frontend/src/features/freeform-collage/components/freeform-paper-selector.tsx
frontend/src/features/freeform-collage/components/freeform-right-inspector-panel.tsx
frontend/src/features/freeform-collage/lib/slots/slot-move.ts
frontend/src/features/freeform-collage/lib/slots/slot-pack.ts
frontend/src/features/freeform-collage/lib/slots/slot-resize.ts
frontend/src/features/freeform-collage/lib/use-freeform-document-history.ts
frontend/src/features/freeform-collage/lib/use-freeform-slot-actions.ts
frontend/src/features/stickers/components/sticker-catalog.tsx
frontend/src/features/stickers/components/sticker-design-tab.tsx
frontend/src/features/stickers/components/sticker-inline-editor.tsx
frontend/src/features/stickers/components/sticker-preview.tsx
frontend/src/features/stickers/components/sticker-properties.tsx
frontend/src/features/stickers/components/sticker-sheet-tab.tsx
frontend/src/features/stickers/components/sticker-studio-dialog.tsx
frontend/src/features/stickers/components/vdp-import-dialog.tsx
frontend/src/features/stickers/lib/use-sticker-insert-actions.ts
frontend/src/hooks/use-filter-cache.ts
frontend/src/hooks/use-keyboard-shortcuts.ts
frontend/src/hooks/use-print-layout.ts
frontend/src/hooks/use-theme.ts
frontend/src/hooks/use-workspace-panels.ts
frontend/src/index.css
frontend/src/lib/canvas/element-alignment.ts
frontend/src/lib/export/export-canvas-fitted.ts
frontend/src/lib/io/clipboard-utils.ts
frontend/src/lib/selection-properties.ts
frontend/src/lib/store/slices/element/crud.ts
frontend/src/lib/store/slices/element/selection.ts
frontend/src/lib/store/slices/element/text-elements.ts
frontend/src/lib/ui/ui-compliance.ts
```

ملفات الاختبار المعدلة/المضافة في الشجرة (جرد فقط، النتائج بالأعلى):

```text
admin-web/src/pages/admin/__tests__/admin-mutation-ownership.test.tsx
admin-web/src/pages/admin/components/admin-ui-components.test.tsx
admin-web/src/pages/phone-camera-page.test.tsx
frontend/src/components/editor/document-scanner/__tests__/document-scanner.test.ts
frontend/test/App.test.tsx
frontend/test/account-license-modal.test.tsx
frontend/test/batch-insert-dialog.test.tsx
frontend/test/canvas-dimensions-panel.test.tsx
frontend/test/canvas-quick-bar.test.tsx
frontend/test/color-panel.test.tsx
frontend/test/crash-recovery-dialog.test.tsx
frontend/test/element-properties-tabs.test.tsx
frontend/test/element-slice-text.test.ts
frontend/test/element-slice.test.ts
frontend/test/fill-utils.test.ts
frontend/test/fluent-blocks.test.tsx
frontend/test/freeform-collage.test.ts
frontend/test/freeform-editor.test.tsx
frontend/test/freeform-slots-coverage.test.ts
frontend/test/freeform-text-tab.test.tsx
frontend/test/hooks.test.ts
frontend/test/keyboard-shortcuts.test.ts
frontend/test/layers-list.test.tsx
frontend/test/multi-selection-properties.test.tsx
frontend/test/phone-bridge-dialog.test.tsx
frontend/test/print-dialog-backstage.test.tsx
frontend/test/print-dialog-printer-default.test.tsx
frontend/test/projects-dialog-backup.test.tsx
frontend/test/scanner-keyboard.test.tsx
frontend/test/text-editing-overlay.test.tsx
frontend/test/ui-compliance.test.ts
frontend/test/ui-components.test.tsx
frontend/test/use-print-layout.test.ts
frontend/test/use-workspace-panels.test.ts
frontend/test/clipboard-utils.test.ts
frontend/test/error-boundary.test.tsx
frontend/test/image-node.test.tsx
frontend/test/sticker-inline-editor.test.tsx
frontend/test/sticker-insert-actions.test.tsx
frontend/test/toolbar-image-filters.test.tsx
frontend/test/use-filter-cache.test.tsx
frontend/test/vdp-import-dialog.test.tsx
```
