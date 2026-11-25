# أرشيف سجلات التطوير التاريخية (Developer Guide History)

> أرشيف تاريخي لسجلات التطوير المفصولة عن docs/developer_guide.md.

## استيراد وتلوين الشعارات المتجهة (`FF-06`) — 2026-11-24

- **التعقيم والاستيراد في Go:** يعالج `internal/service/svg_media.go` ملفات `.svg` بتمريرة XML صارمة (`SanitizeSVGBytes` بتحديد 5MiB ورفض `<!ENTITY>` و`script`/`foreignObject`/SMIL/معالجات الأحداث و`url()` الخارجية، مع `ParseSVGDimensions` للوحدات و`viewBox` وتطبيع المقاس إلى `1024px`). يشترك في الاستدعاء `media_service.go` و`asset_server.go` (`/api/upload-media` فقط دون `/api/upload-print-image`) مع دعم `app.go` و`native_image_drop.go` وحماية الحذف في `media_cleanup.go`.
- **النواة المتجهة والتلوين غير الهدّام:** يحفظ `ImageElement` مسار `.svg` الأصلي ويخزّن الصبغة الاختيارية في `svgTintColor` (`types.ts` و`schema.ts` و`project-serializer.ts`). يوفّر `frontend/src/lib/canvas/svg-logo.ts` تضمين قواعد `<style>` الآمنة (`inlineSafeSvgStyles`) ثم `applySvgLogoTint` للأشكال والحواف وتدرجات `<stop>` مع حماية `<mask>`/`<clipPath>`؛ كما عُمّم منع `url(...)` الخارجية في `scrubSvgElement` داخل `frontend/src/lib/utils.ts` ليشمل كل السمات لا `style` فقط.
- **Konva والطباعة 300+ DPI وتوافق الكولاج:** تحول خانات الكولاج فقط الملف إلى PNG عبر `frontend/src/lib/io/svg-slot-compat.ts`؛ أما في الوضع الحر فيرسم `useStickerDisplayRaster` اللوحة المتجهة الملونة مباشرة (مع `forceRaster` وتثبيت `sourceIdentity` أثناء التعديل لمنع الوميض)، وتُنتج `ensureStickerPrintResolution` في `print-rerasterize.ts` نسخ طباعة منفصلة في `elementSrcMap` عندما تشترك عدة شعارات في نفس ملف `.svg` بألوان مختلفة، مع استبعاد `.svg` من مسار Go السريع (`single-print-composition.ts`) ومن تحذيرات `low-resolution` الوهمية (`freeform-preflight.ts`).
- **الواجهة وتجربة المستخدم:** `ImageStyleProperties` يعرض بطاقة «لون الشعار» (مع «استعادة اللون الأصلي» وحراسة التراجع بخطوة واحدة وتفادي اللقطات المكررة) ويطوي «أدوات الذكاء الاصطناعي» افتراضياً للشعار المستورد، ويعرض `layers-list.tsx` التسمية الدلالية `شعار SVG`.

## تهذيب الواجهة السياقية والشريط السريع (`FF-05`) — 2026-11-24

- **استغلال المصدر الواحد:** `canCopyStickerSvg` و`copyStickerSvgWithFeedback` في `frontend/src/features/stickers/lib/clipboard-utils.ts` يشتركان `resolveStickerSvgSync` لدعم ملصقات الاستوديو وبطاقات VDP الخالية من حقل `svg` المخزّن؛ وخطاف `useImageShapeMaskAction` في `frontend/src/hooks/use-image-shape-mask-action.ts` يجمع تشغيل `maskSelectedImageWithShape` وحراسة الجلسة/التكرار بين `element-menu-section.tsx` و`quick-bar-multi-selection-section.tsx`.
- **المفتش والشريط السريع:** `ImageStyleProperties` يبرز قسم «استوديو الملصقات» قبل «أدوات الذكاء الاصطناعي» ويطوي الأخيرة افتراضياً للملصقات (`defaultOpen={!element.stickerSource}` بمفتاح مرتبط بالنوع والهوية). و`QuickBarElementSection` / `QuickBarMultiSelectionSection` يضيفان `تعديل الملصق` / `ضبط الكادر` / `قنّع بالشكل` كأزرار أيقونات فقط `h-7 w-7` تعتمد حصراً على `requestStickerReedit` و`setCroppingElementId` و`getImageShapePair`.

## تعبئة الأشكال بإفلات الصور ومعاملة التقنيع (`FF-04`) — 2026-11-24

- **تحديث التنقيح (2026-11-24):** `isDropFillableImageShape` في `image-shape-fill.ts` يجمع `isFillableImageShape` مع `canArrangeSelection` لمواءمة Hit-Testing والتحويم (`use-image-drop.ts`) مع حراس المجموعات والأقفال في `merge.ts` ومنع ابتلاع الإفلات بصمت؛ استُخرج `FillableShapeGeometry` في `fillable-shape-geometry.tsx` ليتشاركه `shape-node.tsx` و`CanvasDropTargetHighlight` في `konva-overlay-layer.tsx` عبر `dropTargetShapeId` في `canvas-interaction-store.ts`؛ نُقلت `isImageFilePath` وتصفية المسارات إلى `processNativeImageDrop` في `native_image_drop.go` لإسقاط ملفات غير الصور قبل إصدار `start`/`complete`؛ حُذف `!!image.originalImageSrc` من `needsImageCapture` لمنع إعادة الترميز غير الضرورية للصور المقصوصة أو المحسّنة سلفاً؛ ويدعم `fillShapeWithImage` خيار `skipHistory` لتسجيل خطوة `Ctrl+Z` واحدة عند إفلات عدة صور فوق شكل.
- **طبقات الملكية:** `image-shape-fill.ts` مصدر الأهلية وpatch التعبئة؛ `merge.ts` مالك `fillShapeWithImage` و`maskSelectedImageWithShape` وتحديث العناصر والتحديد والسجل الذري. الواجهة لا تعيد إنشاء هندسة الأقنعة أو منطق التراجع. تبقى هوية الشكل وهندسته وتنسيقه محفوظة، ويُرفض التحديد غير المكتمل للمجموعة أو المصدر غير الجاهز.
- **توجيه الإسقاط:** `use-image-drop.ts` يحل إصابة Konva من نقطة viewport المحوّلة من إحداثيات CSS، ويصل إلى مجموعة العنصر ذات المعرّف، ثم يثبت الهدف وجلسة المستند قبل انتظار الرفع/الأبعاد. الاشتراك القصير يحرس تغير الحالة طوال الطلب، ويُنظف عند الإكمال أو فك التركيب؛ الصور الزائدة تُدرج، وتصادمات خانات الكولاج تُحوّل إلى قائمة الصور غير الموضوعة بدل إسقاط المصدر أو استبدال تحرير أحدث.
- **عقد Wails الإضافي:** `main.go` يقرأ `ctx.DropTargetDetails().X/Y` ويستهلك `processNativeImageDrop` في `native_image_drop.go`. حدث `native-file-drop` له `start {dropId,x?,y?}` قبل I/O و`complete {dropId,images}` بعده، حتى عند الفشل/الفراغ. `native-image-drop.ts` وسيط ملكية للمستهلك يستهلك الرسائل المرحلية غير المملوكة ولا يسقطها في مستند آخر؛ `use-app-bootstrap.ts` يوجهها إليه ويحافظ على fallback رسائل `images` القديمة بحارس جلسة. لا تغيّر أي توقيع RPC معرض أو نوع ربط مولّد، لذلك لا إعادة توليد ربطات لازمة لهذا العقد الحدثي؛ بناء Go/Wails الفعلي واختبار انحراف العقود الشامل يبقيان في CI.
- **التقاط لا يقبل نجاحاً فارغاً:** خيارات `captureStageBlob` أصبحت تدعم `requireImageNodeIds` للإجراءات التي ستستهلك الأصل. تُحل الجذور وأبناء Image داخل القفل وتُفحص الرؤية والجاهزية والأبعاد، وتنتشر أخطاء المصدر الكامل/البدائل المطلوبة، ويُعاد فحص الهوية قبل `toCanvas`. تسجيل ملكية HTML ذاتي idempotent لا يكتب فوق ملكية المشتقات، والـ lease و`finally` يستعيدان الحالة. المتصلون بلا هذا الخيار يحتفظون بالتسامح السابق.
- **الهيئة الحالية لا المصدر المطلوب فقط:** `getDisplayImageOriginalSrc` يقرأ ملكية bitmap الفعلية؛ `gridoStickerRenderSource` يربط راستر SVG النشط بالصورة الأساس الفعلية. لا تُختم العقدة بعنوان الصورة المراد تحميلها وتُعد جاهزة خطأً. يُرفض bitmap السابق أو شاهد الملصق المفقود/القديم، وتُحرس مراحل الالتقاط والرفع بمراجع المشاركين وبإبطال دائم عند تغير الوضع/المقاس.
- **حدود محفوظة:** لا حذف لأصل على القرص ولا تغيير إصدار المشروع أو حقول الرسم المخزنة. جودة ملف التعبئة الملتقط تراعي إطار الوجهة، لكن سياسة `fillPatternImage` على مشتق 2048px لم تتغير، ولا clipping من `cutShapeType`. قبول الإفلات الأصلي والعتاد/الطابعة منفصل عن اختبارات الوحدة المحلية الموضحة في [دليل الاختبار](testing_guide.md).

- **الاعتماد السحابي — 2026-11-24:** ثبت الالتزام `92e26b83` على `main` ونجح CI الاعتيادي `45383702556` والكامل `45384798172`، مع توليد الربطات واختباراتها وبناء Wails/Windows من المصادر نفسها. مرّ WebKit في الاعتيادي وجميع وظائف بوابة الكامل المطلوبة؛ قبول الإفلات الأصلي/العتاد لا يُستنتج من ذلك. برومت الاستئناف في [next-session-prompt.md](next-session-prompt.md) يستأنف `FF-05` ويعيد استخدام إجراءات `FF-04` القائمة.

## مصدر الأقنعة الهندسية الموحّد (`FF-03`) — 2026-11-23

- `frontend/src/lib/canvas/mask-geometry.ts` مصدر نقي واحد لـ `MASK_SHAPES` و`MaskShape` وأوامر المسارات المحلية `buildMaskPath` وراسم Canvas/Konva `traceMaskPath` ومحوّل SVG `maskPathToSvg`. يستورد المخطط `MASK_SHAPES` ويستورد الستور النوع فقط؛ غياب `maskShape` يبقى مساوياً لـ `none` في المشاريع القديمة بلا ترحيل أو تغيير إصدار الملف.
- `image-node.tsx` يبني المسار مرة لكل قناع/أبعاد ويستهلكه في `clipFunc` وراسم الظل. الأقنعة الهندسية تتقدم على استدارة الصورة دون حذف قيمتها المحفوظة؛ `filterKey` يعتمد الاستدارة **الفعلية**، فيبطل كاش الفلاتر عند الانتقال من/إلى الطبيعي فقط، ولا يعيد خبز الفلاتر عند تبديل قناعين خارجيين أو تحريك العنصر. ظل الالتقاط يظل يقرأ مصدر الصورة والقص الحيّين داخل معاملة `captureStageBlob` ولا يحتفظ بمصدر التصدير.
- `export-canvas-fitted.ts` يفلتر مستطيل الصورة أولاً ثم يقصّ الناتج بالقناع المشترك، مطابقاً لمجموعة Konva خارج كاش الصورة، كي لا تغيّر `pixelate` حواف Alpha. تُركّب الخلفية غير المفلترة داخل القناع ثم تُرسم الصورة المركبة بظل واحد خارج القص. سطح التركيب بحجم العنصر يُعاد استخدامه داخل استدعاء التصدير المتسلسل، مع تصفيره بتعيين أبعاده لكل عنصر؛ لا يشارك مسبح الفلاتر. الاستدارة الطبيعية تبقى قبل الفلاتر كما في `KonvaImage`.
- `image-properties.tsx` يعرض ثماني معاينات SVG مشتقة من المسار نفسه مع `aria-label` و`aria-pressed` وحلقات التركيز وهدف اللمس؛ بلا كتالوج هندسي تقريبي موازٍ. الاختيار يفحص الهدف والقفل والحالة الحية، ويثبت خطوة تاريخ واحدة فقط عند تغير القيمة. مسار Go السريع يبقى ممنوعاً لكل قناع غير طبيعي؛ الطباعة تستخدم Konva بدقة المصدر الكامل، ولا تغيير لـ `cutShapeType` أو عقود القص والنزيف.
- الأدلة والحدود في [دليل الاختبار](testing_guide.md) و[خارطة الصقل](development-plan/POLISH_ROADMAP.md): تحقق هندسي وعقود Canvas ومحاكاة DOM والتقاط بعقد Konva حقيقية؛ لا قبول طابعة فعلية. بعد إذن الرفع ثبت الالتزام `1666c3cf` على `main` ونجح CI الكامل `45244058336` والاعتيادي `45243991321` (بما فيه WebKit). قبول Supabase/GUI الأصلي على فرع الاختبار منفصل، ولا يُنسب إلى هذه الجولة.

## عزل أدوات قبول E2E — 2026-11-20

مصدر قبول backend هو نفسmain/service/SQLite/assets مع `-tags=e2e,server,production` (Ubuntu)، أو`-tags=e2e,production` (Windowsnative). ملفات `runtime_harness*_e2e.go` محصورةtag؛ نسخةrelease تستخدمno-op ولا تملك منفذCDP/testdialogs. `prepareRuntimeHarness` يفرض absolute canonical `GRIDO_APP_DIR` وloopbackliteral وصحةMODE/ports، وnative CDP يمر عبرAdditionalBrowserArgs لا متغيرWebView2 الذي يمسحهWails. الإصدار العام لا يتغير بإعدادtest.

`RuntimeProcess` في `scripts/e2e/runtime-process.mjs` يشغّل binary مبنياً مسبقاً، يتحقق/يعيد تشغيل العملية، ويعطي مساراتgrido.db/autosave.json/Media/Exports/webview_cache وFIFOdialogqueue مؤقتة. `runtime_dialog_e2e.go` يعالج اختيار الملف فقط بعدpath/symlink checks؛ media/export/project تبقى فعلية. تحويل استدعاءاتapp.go/backup للـRuntimeBridge لا يغيّر توقيعاتIPC. توليد الربطات/اختبارdrift يمران فيCI من المصادر الجديدة؛ لا خدماتgeneric testRPC تضافللrelease.

Supabase provisioner يستعملCLI2.81.3 وDocker/psql داخلRUNNER_TEMP فقط، configfixture مثبتة للإصدار، ينسخmigrationsbyte-identical ويتعامل معhistoricalprincipalprereq ببياناتsynthetic، ثمAuthaccountsحقيقية منفصلةUSER/TARGET/PHONE/ADMIN. service-role/DBcredentials لا تصلsharedenv أوbrowser أوbinary أوartifact، والمرفقاتsanitizedprovision-report/cli-help فقط. Nativeauthcontract منفصلthird-partyMOCK يمرLoginAccount الحقيقي ولا يكتبprofile/entitlementلتجاوزauth.

الرحلاتGUI فيe2e-acceptance لا تستوردbindingsللقيامبالعمليات ولا تكتبstore؛ القراءاتreadonly. pipeline evidence مطلوبSHA/runtime/fixtures/outputs/trace/screenshots/videoالمتاح، والقدراتغيرالمتاحةblocked. التنفيذالمكتوب ليس قبولاً قبلrun؛ [تقرير28](reviews/28-real-e2e-acceptance-2026-11-20.md) يحفظنتائجR0 والفشلوإعادةالتشغيل.

## عقود مراجعة حملة التعديلات — 2026-11-20

تفاصيل الدليل والتنفيذ والحدود في [التقرير 27](reviews/27-change-campaign-audit-2026-11-20.md). لا تغييرات Go/IPC/migrations، ولا إعادة توليد bindings لازمة لهذه الجولة.

- **اشتراكات السمة/الفلاتر:** `use-theme.ts` يملك لقطة cached بـ`useSyncExternalStore` ومستمع نظام واحد ينظف بعد آخر subscriber؛ `toolbar-image-filters.tsx` يشترك بمراجع store مستقرة ولا يضع مصفوفة مشتقة جديدة داخل كائن useShallow، ويتحقق من الأقفال والتحديد الحي وقت الفعل.
- **استعادة تعثر العرض:** ErrorBoundary يستخدم `clearAutoSave()` من الكاتب المرتب بعد تأكيد مرئي، لا localStorage key وهمي ولا reload عند فشل أو superseded clear. CrashRecovery يمنع تراكب العملية غير القابلة للإلغاء حتى بعد reopen، ويعزل الرسائل عن الجلسة القديمة.
- **تحديد/ترتيب ذري:** `canArrangeSelection` يحرس complete unlocked groups. `buildElementLayerMovePatches` في `selection-properties.ts` يعيد استعمال z slots للمتأثرين فقط، يمنع locked crossing، ويرفض legacy interleaved units تحفظياً بدل إعادة ترقيم الكل. setters تطبع/تزيل duplicate IDs، وعمليات no-op لا تخلق history.
- **الحقول والنتائج غير المتزامنة:** معاملات X/Y وMmField تملك baseline/preview وجلسة مستند؛ raw draft منفصل عن geometry المقيدة، Escape يستعيد owned preview/redo، Enter/blur يثبّت مرة. حراس readiness generation تمنع clipboard results القديمة من العودة بعد تعطيل/إعادة تمكين، والقطارة تنظف listeners/cursor والطلب الأصلي.
- **الرسم/الطباعة:** shadow caster يقرأ live Image/crop في serialized capture ويستعمل capture DPI دون الاحتفاظ بمصدر export بعد finally؛ element-space paint يحفظ affine/path/arc/wedge parity، مع بقاء pattern2048 وcut guides بلا clipping. URL preview ملك الحوار فقط، وتحديد collage يستعاد وفق slots، وborderless لا يستنتج من غياب capabilities.
- **Freeform/scanner/stickers:** نقل المجموعة AABB بترجمة واحدة، directional resize مع normalized aspect، pack المستحيل لا يشوّه preset، options تنقل عبر snapshots لنفس المستند. scanner operation identity يملك preview/export/abort، وsource replacement يبطل metadata/results. sticker insert/VDP/batch تستعمل محاولة/جلسة/target/layout حية؛ crop/refine completion مستقل عن تغير المصدر الناتج من حفظ المحاولة نفسها.
- **الواجهة/الإدارة:** dialog2000/dialog-popover2500/toast3000 من CSS، Sonner style يقاوم unlayered vendor CSS، والألواح inert تسلّم التركيز دون سرقة modal. Phone zoom يتحقق من capabilities/settings وcamera owner وsrcObject؛ capture يتبع crop المرئي. مولد admin single/batch له قفل مشترك متزامن، وليس ذلك تفويض خادم أو rollback كتابة.

الملاحظات baseline `BASE-01…04` بالتقرير تبقى مفتوحة؛ لا ادعاء اكتمال حماية جميع المشاريع/الهاتف/toolbar refine/sticker export. اختبارات mocks لا تثبت Wails أصلي أو pixels أو طابعة.

## عقود تطوير UX الجزئية وCI — 2026-11-13

**الحالة الحالية:** فحوص `frontend` و`admin-web` الخفيفة و`gofmt` وبوابة `docsstrict` (**174/32/67/6** و`inventory 20 / assertions 53`) **PASS** بعد إغلاق إصلاحات التشخيص ومواءمة عقد ترويسة اللوح (`panel-shell.tsx` `min-h-12` مع `ui-compliance.test.ts` و`fluent2-design-system/SKILL.md`)؛ لا `final global E2E/CI/build` محلي بعد. التنفيذ سلوكي وبصري محدود، لا اكتمال خطة أو AA/fullwave.

مرجع التنفيذ والحدود [الخطة الحية](plans/2026-11-13-comprehensive-ux-development-plan.md) و[تقرير25 المؤقت](reviews/25-ux-development-acceptance-2026-11-13.md). لا تغيير Go/IPC أو بناء Wails/NSIS من هذه الدفعة، ولا fullwave/visual acceptance.

- **Mixed inspector:** subset عبر `frontend/src/lib/selection-properties.ts` و`frontend/src/components/editor/properties/multi-selection-properties.tsx`؛ typed eligibility بدلاً من blind broadcast، locked inert وhistory واحد/gesture مع شريط محاذاة أيقوني و`coarse-touch-target`. 22/22 نهائي في real store + React Testing Library؛ fontFamily/content/rotation/group ratio/gradients خارج النطاق. crop/geometry/Undo وCMYK TIFF-only تبقى عقوداً محمية.
- **Workspace/keyboard/visual shell:** تبويبات المفتش الأيمن موحدة على `variant="panel"` في `properties-panel.tsx` و`element-properties.tsx` و`slot-properties.tsx`؛ شريط الأدوات والنوافذ والتنبيهات تلتزم بتوكنات `--z-toast`/`--z-dialog` (`sonner.tsx` و`FeedbackProvider.tsx` و`EditUserModal.tsx`)؛ مع حارس منع حلقة تمرير معرض الملصقات (`sticker-catalog.tsx`) وحارس فك التركيب وجلسة المستند في `ElementArrangeTab` (`arrange-tab.tsx`). fluent-blocks 33/33، panel-shell-visual 8/8، toolbar-responsive 9/9، toolbar-height 5/5، ui-compliance 54/54 (`min-h-12`)؛ ولقطات `final light` و`collage light` التُقطت ووثقت في التقرير 25 بلا formal independent judge أو AA/RTL/200%/coarse runtime.
- **Libraries:** `frontend/src/lib/asset-favorites.ts` يملك المفضلة المحلية تحت `grido_asset_favorites_v1`، لا metadata مستند أو خدمة سحابية. `template-panel.tsx` تحت `components/editor/panels/` يملك savedTemplatesStatus/loading/loaded/error ويعيد loadTemplates إلى retry؛ `custom-collage-card.tsx` يمرر status/retry/customize، و`frontend/src/features/stickers/components/sticker-studio-dialog.tsx` يمرر catalogDiscovery وموضع التمرير (`libraries-discovery` 12/12، `collage-presets-tab` 5/5). هذا discovery subset، **ليس onboarding كاملًا أو قبول جميع الاستيرادات/حفظ القوالب**.
- **Admin/dialog:** `admin-web/src/components/common/accessible-dialog.tsx` يختار Radix Dialog/AlertDialog ويملك trap/initial/return focus مع busy guard؛ FeedbackProvider يربط AlertDialog.Cancel بالتأكيد الخطر وتوكنات `--z-dialog`/`--z-toast`، وEditUserModal يربط labels ويعطل الحقول والحفظ أثناء busy ويستخدم `z-(--z-dialog)`. بعد reload، DOM/Enter أكد الاسم focused والإلغاء active وتفكيك الحوارات؛ click timeouts ليست نجاحاً، ولا شهادة vision/AA أو Supabase/live.
- **CI المكتوب فقط:** `frontend/e2e/ux-keyboard.spec.ts` ستة سيناريوهات، `admin-web/e2e/ux-smoke.spec.ts` أربعة؛ `admin-web/playwright.config.ts` يستخدم Vite مستقل واعتراض APIs. `admin-web/vite.config.ts` وworkflow يستبعدان `e2e/**` من Vitest؛ admin devDependency `@playwright/test`1.61.1. workflow يضيف Chromium smoke وartifact `admin-ux-smoke-evidence` لمدة7 أيام، **لا نتيجة CI بعد**؛ build/E2E/fullsuite/scheduledjobs تنتظر إذن push المستخدم.

الفحوص الخفيفة في `frontend` و`admin-web` وبوابة `docsstrict` (`174/32/67/6`) **PASS**؛ SaveRecovery/print/onboarding والقياس وبقية الرحلات وهجرة `20261113155602` (`LOCAL NOT APPLIED`) ما زالت معلّقة؛ لا p95/% تحسن.

---

## حدود عقود متابعة UI/البنية — 2026-11-13

مرجع الحالة والأدلة [التقرير 24](reviews/24-ui-architecture-audit-disposition-2026-11-13.md#ملحق-disposition--2026-11-13)؛ البنود المسماة مثبتة بأدلة محددة ونتائج منفردة، والباقي غير متحقق/غير مغلق في هذه الجولة. لا شهادة إغلاق شامل.

- **Capture:** `frontend/src/lib/canvas/konva-export-utils.ts:529–572,719–785` يحل `includeNodeIds` من Stage داخل القفل، ويبقي أسلاف/أبناء المحدد ويستعيد visible الأصلية في `finally`. `frontend/src/lib/store/slices/element/merge.ts:54–77,222–264` يحفظ Map لمراجع المصادر immutable ويفحصها بعد capture/upload؛ تغيير مشارك يبطل النتيجة، وتعديلات nonparticipants لا تبطلها.
- **Auth:** `frontend/src/components/editor/dialogs/account/use-auth-forms.ts:60–102,121–310` يشترك متزامناً في close ويشترط open+mounted+generation قبل callbacks ورسائل/حقول النتائج. `account-license-modal.tsx:53–85` تحت `dialogs/` يثبت callback/finite/reset. الحماية **محلية للواجهة**؛ لا تلغي مصادقة الستور أو IPC الأصلي، ويبقى نجاح store.user المتأخر ممكناً. لا تغيير لسياسة الترخيص/offline.
- **Admin:** `admin-web/src/pages/admin/useAdminOperationOwnership.ts:13–47` يجمع lifecycle/session epochs وclient identity مع mounted/authenticated؛ reset في `useAdminUsers.ts:50–68` و`useAdminKeys.ts:51–63` تحت المجلد نفسه يبطل الملكية. `useAdminSession.ts:80–101,164–193,247–276` يبطل الجلسة متزامناً وينظف override التخزين ويراقب auth؛ ordinary fetch IDs لا تبطل mutation في الجلسة نفسها. هذا عزل للنتائج والرسائل، **لا rollback** لكتابة خادم أو بديل authorization؛ اختبار ownership النهائي 51/51 بالمحاكاة.
- **Phone:** `admin-web/src/lib/phone-bridge-pairing.ts:33,78` و`admin-web/src/pages/PhoneCameraPage.tsx:170,244–359,565,791–808` يثبتان transitions/generations/reset/channel lifecycle/canUpload/labels؛ النقل هو العرض الرئيسي، وبادج ack يظهر فقط عند إقرار حقيقي إن وصل. **transport readiness ليس desktop acknowledgement**؛ paired-ack اختياري بلا producer مثبت، وغيابه لا يحجب upload توافقاً مع desktop قديم. الهجرة `supabase/migrations/20261113155602_phone_bridge_handshake_json_mime.sql` **LOCAL NOT APPLIED** رغم lint والبصمة؛ اختبار pure helper 24/24 لا يثبت page GUI/live MIME.
- **Templates/rotation:** `frontend/src/components/editor/panels/template-panel.tsx:42–89,215–224,273–288` يتحقق من خلايا الاستيراد وحدودها وradix10، ويحذف نسخة المكتبة فقط مع حفظ applied metadata snapshot وهندسته وصوره. `frontend/src/features/freeform-collage/lib/slots/slot-resize.ts:340–381` يدور المقاس الفيزيائي بعامل تحجيم واحد؛ إن تعارض الحد الأدنى مع المساحة يعيد slots نفسها بلا تغيير حتى rotation.
- **Batch:** الدليل السابق `frontend/src/components/editor/dialogs/batch-insert-dialog.tsx:294,523` يثبت تفريغ queue وإخفاء layout غير المدعوم في الكولاج؛ إخفاء الخيار بديل صادق، لا تنفيذ لسياسة layout جديدة.

---

## عقود إغلاق الطباعة والتصدير في شجرة العمل — 13 نوفمبر 2026

> هذه فقرة معمارية عن التنفيذ الموجود حالياً، لا شهادة قبول نهائي. تشغيل CI الشامل والتحقق من اكتمال تنسيق خطة الطابعة/حالة السبول/الإلغاء في كل أسطح الواجهة، والقبول على طابعة فعلية تبقى بوابات معلّقة حتى تأكيد الوالد/المالك.

### `cover` واحد من المحرر إلى Go

- صور الوضع الحر البسيطة تصرّح بالعقد `imageFit: 'cover'` في `frontend/src/lib/print/single-print-composition.ts`. يحل `print-payload-builder.ts` أبعاد المصدر بعد EXIF ويحسب `computeSlotCrop` مرة واحدة، ثم يرسل `cropX/Y/W/H` و`slotAspect: 0` كي لا يعيد Go اشتقاق نافذة مختلفة.
- `runFreeformPreflight` في `frontend/src/lib/export/freeform-preflight.ts` يقيس DPI الفعلي من نافذة المصدر التي ستبقى بعد `cover`، لا من كامل المصدر. `applyImageProcessing` في `internal/service/print_image_pipeline.go` يستهلك القص قبل القلب ثم التدوير والتحجيم.
- المتجهات المستقلة في `test-fixtures/print-rgba/cover/` تقفل القص المركزي، الأبعاد الفردية، النسبة المطابقة والقلب بعد القص. لا تُولَّد من ناتج الإنتاج ولا تُبارك تلقائياً في CI.
- **تمركز التكبير الموحّد ومعاينة الطباعة وتوافق `cropMode`:** مسارات `KonvaCollageImage` (`frontend/src/components/editor/konva/elements/collage-image.tsx`) و`computeSlotCrop` (`frontend/src/lib/export/export-primitives.ts`) و`computeCropFromSlot` (`internal/service/print_image_pipeline.go`) تمركز كلا المحورين عند `(imgW - sw) / 2` و`(imgH - sh) / 2` للخانات الجديدة والمصفّرة (`cropMode: 'centered'`) مطابقةً للحاضنة الذهبية `test-fixtures/print-crop-golden.json`، وتحافظ على الارتكاز القديم (`cropMode` المفقود أو `'legacy'`) للمشاريع السابقة، مع تطبيع/تقييد `zoom` ضمن `[1..3]` في `schema.ts` و`project-hydrator.ts` و`validatePrintItem` (`internal/service/print_service.go`). كما يخبز `renderPixelFilterPreview` (`frontend/src/components/editor/print/print-pixel-preview.ts`) قص `computeSlotCrop` المحلي (`getSlotLocalSize`) قبل تطبيق فلتر البكسل دون مضاعفة `zoom`/`pan`/`objectPosition` في `SheetPreview` (`frontend/src/components/editor/print/print-preview.tsx`)، بينما تترجم `computeSlotPreviewPan` (`frontend/src/lib/print/preview-pan.ts`) فائض التغطية للصور غير المخبوزة عبر CSS `objectPosition` (حتى عند `zoom = 1`) والمتبقي عبر `panX`/`panY` المعكوس والمُدار والمقلوب إلى فضاء العنصر.

### عقد الفلاتر القانوني

- `frontend/src/lib/filters/print-filter-contract.ts` هو كتالوج الوصفات المرتبة: وصفة المرشح أولاً، ثم تعديلات المستخدم بترتيب brightness → contrast → saturation. `custom-filters.ts` و`konva-filters.ts` يستهلكان العمليات نفسها؛ النظير في Go هو `printFilterRecipes` و`applyPrintImageFilterPipeline` في `print_image_pipeline.go`.
- العمليات اللونية المتجاورة قد تندمج في مسح بكسلي واحد، لكن التقريب المرحلي وترتيب العمليات محفوظان؛ pixelate والـblur يظلان تمريرتين مكانيتين مستقلتين. مسارات Canvas 2D اليدوية للكولاج والوضع الحر والخانة المفردة تطبق العمليات القانونية نفسها على `ImageData` بدل الاعتماد على اختلافات `ctx.filter` بين محركات المتصفح. المرشح أو التعديل غير الصالح يُرفض في تحقق الطلب بدلاً من التجاهل الصامت.
- `test-fixtures/print-rgba/filters/` يحمل RGBA متوقعاً مستقلاً لـidentity/brightness/contrast/saturation/sepia/grayscale/invert/threshold/pixelate، وتستهلكه اختبارات TypeScript وGo مع حرّاس طفرة للترتيب.

### معاملة التقاط Stage (Capture Transaction)

`captureStageBlob` في `frontend/src/lib/canvas/konva-export-utils.ts` يملك دورة الالتقاط كاملة داخل قفل تسلسلي لكل `Stage`:

1. انتظار الدور بمهلة وإشارة `AbortSignal`، ثم انتظار جاهزية الخطوط وصور العقد عند طلبها.
2. استئجار الأصول الكاملة وترقية مشتقات العرض 2048px، وتطبيق بدائل صور الطباعة مع تحويل إحداثيات القص.
3. حفظ كاش الشاشة وترقيته ضمن ميزانية 256MiB، وتصفير موضع/مقياس Stage وإخفاء المحوّل والشبكات وعناصر التحرير.
4. فحص سقف البكسلات قبل `toCanvas`، ثم إحاطة `toBlob` بمهلة وإلغاء.
5. الاستعادة الحتمية داخل `finally`: موضع ومقياس Stage، بدائل الصور وقصّها، مصادر العرض، نسب كاش الشاشة المقاسة، رؤية الطبقات، lease الأصول وعلامة الالتقاط.

أي مسار جديد للطباعة أو التصدير يحتاج هذه المعاملة؛ لا يجوز إجراء mutation خارجي للعقد ثم محاولة استعادته خارج القفل.

### النزيف وCMYK والتدرجات والإلغاء

- `applyBleedAndCropMarks` في `frontend/src/lib/export/export-bleed.ts` يعيد الـBlob نفسه عند صفر نزيف. النزيف الموجب يتحقق من mm وDPI وبكسلات الخرج **قبل** تخصيص canvas، ويرفض صراحةً فشل الفك/السياق/الرسم/الترميز أو الإلغاء؛ لا نجاح صامت بملف أصلي بلا نزيف.
- `downloadBlob` لا يسمح لـfallback المحلي/IPC بحفظ Blob فارغ؛ عند وجود `sourceFilename` يجلب البايتات الحقيقية ويتحقق من توقيع TIFF قبل فتح الحفظ الاحتياطي.
- **CMYK الحقيقي TIFF فقط.** `runCmykExport` يبني `PrintRequest` بصيغة `tiff` ويتحقق من توقيع الناتج، و`print_export.go` يرفض CMYK JPEG صراحةً لأن مشفّر Go لا يحفظ فصل الأحبار. PNG وJPEG مخرجات sRGB؛ لا ICC أو soft proof في هذا الإغلاق.
- `domain.PrintBackgroundBlock` يصف تعبئة صلبة أو تدرجاً خطياً محلياً بالملليمتر. `drawBackgroundBlocks` ينشئ gradient داخل مستطيل كل كتلة قبل رسم العناصر، فتتكرر النسخ دون تدرج عالمي متسرب بينها.
- `PrintRequest.JobID` يقبل معرف عميل محدوداً وآمناً للسجل أو يولّد معرفاً قديماً متوافقاً. التسجيل يسبق انتظار semaphore، والمعرف المكرر يُرفض؛ `CancelPrintJob(jobID)` يلغي المهمة المالكة فقط. `composeCanvas`، عمال الصور، حدود الدفعات والرسم والحفظ تفحص السياق، والإلغاء بعد الكتابة يحذف المخرج المؤقت/النهائي قبل الإرجاع.

### خطة الطابعة والسبول وDirect GDI

- المسار النشط للطباعة sRGB هو: توليد JPEG افتراضياً أو PNG اختيارياً → `PrintDirect` → `PrintImageDirectGDI` → `CreateDCW`/`StartDocW`/`StretchDIBits` → Windows Spooler. لا `iframe` ولا `window.print()` في هذا المسار.
- `ResolvePrinterPlan(PrinterPlanRequest)` يحل القالب الفعلي قبل السبول ويعيد المطلوب/المطبق، أبعاد الورق والمساحة القابلة للطباعة والإزاحات والمقياس وسبب fallback. الطلب الصريح لقالب مخصص غير مدعوم يفشل ولا يسقط بصمت إلى A4؛ fallback الافتراضي يحمل metadata صريحة.
- `PollJobStatus` يعيد envelope ثابتاً للحالة/الكود/النهائية، و`CancelSpoolJob` يستعمل `SetJobW(..., JOB_CONTROL_CANCEL)` لمهمة أُرسلت فعلاً. هذا منفصل عن `CancelPrintJob` الخاص بتوليد الورقة قبل السبول.
- الواجهة تستدعي `ResolvePrinterPlan` قبل `PrintDirect`، تمرر `PrintRequest.jobId` وكتل الخلفية، وتثبت `spoolJobRef`. بعد السبول تُبقي حالة الانتظار وتستعلم كل 1.5ث حتى terminal أو مهلة دقيقتين؛ الإلغاء يستهدف generation/spool بمعرفيهما ولا يلغي أعمالاً أخرى.
- اختبارات Windows ذات البادئة `TestGDIPure_*` تستخدم seam Win32 قابلاً للاستبدال ولا تحتاج طابعة مثبتة؛ CI يشغّلها في `windows-build`. الاختبارات الحية ذات `TestGDILive_*` ليست ضمن اختيار المستضيف.

### تقرير الأداء

مهمة `print-performance-report` في `.github/workflows/ci.yml` تعمل على Windows عند الجدولة أو `workflow_dispatch`، وتشغّل `TestPrintPerfBaselineReport` مع `GRIDO_PRINT_PERF_REPORT=1`. تسجل بيئة المشغّل والزمن والتخصيص/RSS وتنتج `print-bench.txt` و`print-bench.json` و`print-environment.json` وسجل الاختبار لسيناريوهات A4 JPEG وPNG وCMYK TIFF، الفلاتر متعددة الخلايا، النسخ المتكررة، الإلغاء وDIB على Windows. المهمة **report-only** بلا عتبة زمن/RSS مخترعة إلى أن يُجمع baseline سحابي ويُعتمد.

### قرارات لا تتغير ضمن هذا الإغلاق

- JPEG هو افتراضي الطباعة؛ PNG مدعوم اختيارياً للنصوص والباركود والملصقات.
- `fillPatternImage` يبقى على مشتق العرض 2048px حتى تصميم تحويل هندسي مستقل.
- `cutShapeType` دليل مرئي/بيانات مشروع وليس clipping تلقائياً للمخرج.
- CMYK الحقيقي TIFF فقط، وICC/soft proof والقبول اللوني الفيزيائي مؤجلة.
- حزمة SOP/manifest للطابعة موجودة تحت `docs/print-acceptance/`، وتقرير `docs/reviews/23-real-printer-acceptance-2026-11-13.md` حالته Pending؛ وجود القالب لا يدّعي تشغيل عتاد أو قبولاً.

---

## هندسة محرك الكانفاس المستقلة والمصفوفات المتزامنة (Viewport Geometry Engine) — 8 نوفمبر 2026

- **النواة الرياضية المستقلة (`frontend/src/lib/canvas/viewport-geometry.ts`):** استخراج كامل معادلات الإحداثيات والتقييد إلى وحدة رياضية نقية خالية من DOM (`createCanvasCamera` و`reconcileCanvasCamera` و`getStageClampBounds` و`clampStagePos` و`computeScrollbarMetrics` و`clientToLocal`).
- **فصل الكاميرا المؤقتة عن سجل المستند:** حالة الزوم والتنقل تُدار عبر كائن `CanvasCamera` المؤقت في `use-canvas-viewport.ts`، فلا تُسلسَل في ملفات المشاريع ولا تلوث سجل التراجع والإعادة (Undo/Redo)، مع تصفير الزوم تلقائياً عند تحميل أي مشروع جديد (`core-slice.ts`).
- **ثبات نقطة المركز العالمية عند تغيير المقاس (`reconcileCanvasCamera`):** خوارزمية تحفظ الإحداثي العالمي لنقطة منتصف نافذة الرؤية (`worldX`, `worldY`) أثناء تحجيم النافذة أو فتح وإغلاق الألواح الجانبية، مما يمنع قفز الورقة أو انزياحها عن نظر المستخدم.
- **تزامن المصفوفات اللحظي للمساطر والأغلفة والشريط السريع:** تطبيق تحويلات الـ Matrix اللحظية (`matrix(${ratio}, 0, 0, 1, ...)` و`scale(${ratio})`) على مساطر الـ SVG وغلاف عناصر HTML والشريط السريع العائم أثناء حركة العجلة واللمس، فتتحرك الأغلفة والمساطر في توافق بكسلي تام مع مسرح Konva دون انتظار استقرار إطارات React ودون التسبب في شلالات إعادة تصيير.
- **تطبيع تكبير Windows و CSS Zoom (`clientToLocal`):** فك تأثير نسبة تكبير الشاشة في Windows وتحجيم CSS لحساب إحداثيات الفأرة الدقيقة وضمان رسم خطوط المساطر ومؤشرات التحديد بدقة بكسلية مادية خالية من الضبابية.

## تسريع انتقال الصور عبر جسر الهاتف (Phone Bridge Fast Pipeline) — 7 نوفمبر 2026

- **ضغط وتوجيه متمايز على الهاتف (`2048px` vs raw picker):** الصفحة السحابية (`admin-web/src/pages/PhoneCameraPage.tsx`) تقص وتحدّ لقطات `<video>` الكاميرا الحية إلى سقف `2048px` بصيغة JPEG بينما تمرّر ملفات اختيار الألبوم والكاميرا الأصلية مباشرةً دون فك ترميز أو إعادة ضغط (`phone-camera-page.test.tsx`)؛ أما صفحة الشبكة المحلية المضمّنة (`internal/service/embedded/phone_camera_page.html`) فتضغط وتحجّم الصور الملتقطة أو المختارة من المعرض على معالج الهاتف الرسومي إلى سقف `2048px` بصيغة JPEG، مع استخدام `URL.createObjectURL` للمصغرات بدلاً من ترميز Base64، ورفع مصافحة الاقتران بـ `upsert: false` توافقاً مع سياسة `INSERT`-only في RLS.
- **عدم حجب WebSocket وحقن الأبعاد المسبقة في Go (`internal/service/phone_bridge_service.go`):** إشعار `photo-ready` عبر Supabase Realtime WebSocket يشغّل `downloadAndSaveCloudPhoto` داخل `utils.SafeGo` فلا تتجمّد حلقة قراءة الرسائل أثناء التنزيل، مع تقليص الاستقصاء الاحتياطي إلى 4 ثوانٍ (وبدء أول فحص بعد ثانيتين). كما تبني `buildPhotoReceivedPayload` أبعاد الصورة الموجهة بـ EXIF (`width`, `height`, `aspectRatio`) وتبثها ضمن حدث `phone:photo-received`.
- **حقن الكاش المتزامن في الواجهة (`frontend/src/components/editor/system/use-phone-bridge.ts` + `frontend/src/lib/canvas/image-dimensions.ts`):** تخزّن `setCachedImageDimensions` و`setCachedImageAspectRatio` الأبعاد فور وصول الحدث، فيُدرج العنصر في الكانفاس مباشرة بلا انتظار نداء IPC إضافي (`resolveImageAspectRatio`).
- **مسار النسخ الذري المباشر في `EnsureThumbnail` (`internal/service/media_thumbnail.go`):** عندما تكون الصورة المحلية (`.jpg`/`.jpeg` أو `.png`) ضمن سقف العرض المطلوب (`max(W, H) <= width`) واتجاه EXIF طبيعياً (`orientation <= 1`)، تُنسخ البايتات ذرياً إلى مجلد `.thumbs` مباشرة دون فك ترميز البكسلات عبر `imaging.Open` أو إعادة ضغطها.

## محرك الخطوط والأوزان — 7 نوفمبر 2026

`frontend/src/lib/io/fonts.ts` يعرّف `weights` لكل عائلة و`offlineWeights` لما هو معلن محلياً. `findFontOption` يطابق اسم العائلة كاملاً أو معرّف الكتالوج، و`getSupportedFontWeights` و`resolveSupportedFontWeight` مصدر واحد للقائمة والتحميل والقياس؛ الخط المحلي لا يجلب أوزاناً سحابية ضمنياً. `loadGoogleFont` يبقى `Promise<boolean>`، وينتظر ورقة CSS ثم الوجه بوزنه ونمطه وعينة عربية/لاتينية. فشل الورقة أو المهلة أو غياب الوجه لا يُخزَّن كجاهزية؛ إشعار انتهاء المحاولة لا يعني نجاحها. الخطوط اللاتينية الأربع مضمّنة فعلياً وأوزان IBM المتوسطة مربوطة، وملفات OFL ومصدر الأصول في مجلد الخطوط.

المنتقي المشترك يبقى مسطّحاً وتُقرأ المفضلة كسولياً عبر `DEFAULT_FAVORITE_FONTS` عند التهيئة مع تفعيل المعاينة الحيّة عند التنقل بأسهم الكيبورد فوق عمود المفضلة (`font-selector.tsx`)، وتعيد `TextFontSelector` ملاءمة هندسة النص (`fitTextGeometry`) فورياً وعند اكتمال تحميل الخط البارد بعد التحقق من بصمة العنصر (`elementMatchesExpected`) وتحديث لقطة السجل الملتزمة مكانياً عبر `replaceCurrentHistoryEntry` (`history-slice.ts`) دون إضافة لقطة تراجع ثانية أو الكتابة فوق `Undo`/التعديل اليدوي (`text-font-selector.tsx`)، كما تدعم `isFontLoaded` (`faceMatches`) مطابقة الوزن والنمط الاختياريين ويستهلكها `TextEditingOverlay` لإظهار المحرر فوراً عند جاهزية الوجه، وتستعيد معاينة النص خط ووزن وهندسة كل عنصر على حدة عند الإلغاء، بينما التبديل النهائي يختار وزناً متاحاً ويضيف لقطة تاريخ واحدة. وتصفّر `applyTextPreset` الخصائص المتبقية (`letterSpacing` و`fontStyle` و`textDecoration` و`textTransform` وتعبئة التدرج الدائري/الصورة) وتدرج `crud.ts` حقل `strokeWidth` ضمن `TEXT_MEASURE_KEYS`، بينما يفصل `export-canvas-fitted.ts` رسم إطار شارة النص عن تعبئة الخلفية عند غياب لون التعبئة. أوزان المستندات القديمة تُحل للعرض دون ترحيل بياناتها قسرياً. خطة البنود ونتائج التحقق وحدوده: `docs/plans/2026-11-07-text-and-fonts-review-plan.md`.

المسار المشترك في `text-helpers.ts` يطبع فواصل الأسطر للعرض المنحني فقط ويحدد وزن العرض ولون التزيين؛ الخام يبقى في المستند. يدعم `curved-text-utils.ts` اتصال الكشيدة وهمزة الوصل والكاف والياء الفارسيتين دون رابطة مختلقة أو ادعاء Bidi كامل. المحرر يظهر شارة القوس ومعاينة خافتة، وأدوات الظل/إطار الشارة تستخدم نمط preview/commit الحالي.

في الملصقات، معاينة العائلة طبقة عرض في `sticker-studio-dialog.tsx` لا تكتب `params` أو سجل التراجع؛ `StickerFontSelector` ينتظر الأوزان المتاحة ويفحص جيل الطلب قبل المعاينة والالتزام. `sticker-font-embed.ts` يقرأ CSS المحلي أو يجلب Google CSS من الأصل المحدد عند حجب CSSOM، ثم يعيد تركيب وجوه آمنة من WOFF2 محلي/Google مع منع التحويلات ومصادر أخرى. فشل التضمين يبقي سلوك fallback السابق ولا يضمن قابلية نقل الخط عند غياب الشبكة.

## تصحيح سلامة الحفظ والإلغاء والتنظيف — 6 نوفمبر 2026

- **كاتب المسودة الموحد:** `frontend/src/hooks/use-autosave.ts` يسلسل الحفظ الدوري و`flushAutoSave` و`clearAutoSave` في ذيل وعود واحد، ويأخذ المحتوى الحي عند امتلاك الكاتب. بصمة القبول مملوكة لجلسة المستند؛ إشعار استعادة قديم لا يمحو مراجعة قرص أحدث. أوامر بدء مستند جديد ومسح تقرير الانهيار تمر عبر المسار نفسه، ونتيجة تحميل مسودة بعد فك التركيب أو reset لا تستبدل المستند الجديد.
- **مرساة الحفظ اليدوي:** `projects-dialog.tsx` يلتقط `captureHistoryEntry` و`getDocumentSession` قبل `SaveProject`. نجاح الحفظ يثبت اللقطة المرسلة لا حالة حيّة لاحقة؛ إخلاء أقدم سجل لا يُفسَّر كتبديل مستند، والتراجع يحدد `isDirty` مقابل ما حُفظ فعلاً.
- **إلغاء العمليات غير المتزامنة:** رموز الجولات في حوار التصدير وخطاف الطباعة تُبطَل عند الإغلاق وفك التركيب؛ يُعاد فحص الملكية بعد الالتقاط/الرفع وقبل طلب Go. قص الصور والتعديل اليدوي يمرران معيار `isActive` إلى مستهلك النتيجة، وينتظران نجاحه؛ المستهلك يتحقق من المصدر الحي والجلسة قبل تعديل العنصر أو الخانة. ماسح المستندات يملك `AbortController` وجيلاً لكل preview/export/detection؛ الإلغاء يقطع رفع blob وطلب `/api`، ولا يشغّل Base64/worker fallback. `r.Context()` يمر إلى بوابة قبول محدودة بعمليتين ونواة الاستعدال/الفلاتر والكتابة الذرية، والعملية القديمة لا تصفّر حالة أحدث.
- **تنظيف الوسائط:** حُدّث الوصف التاريخي لـLIMIT/OFFSET أدناه: الجمع الآن بصفحات مفاتيح `id > lastID` مع كل حقول المراجع الستة، فلا يتخطى مشروعاً حياً عند حذف صف من دفعة سابقة. ليس ذلك عزلاً معاملياً لجميع التعديلات المتزامنة؛ فشل جمع أي دفعة يمنع التنظيف.
- **استيراد النسخ:** `backup_service.go` يتحقق من كامل المكتبة قبل أي استيراد: قيمة JSON واحدة، معرّفات غير فارغة وغير مكررة، وحقول JSONText صالحة بكائن/مصفوفة/null مع حفظ الصيغ القديمة الاختيارية. `null` التاريخية عملية بلا تغيير، و`[]` مع overwrite يبقى تفريغاً صريحاً. لا تغيير لتواقيع Go/Wails أو الربطات؛ اختبار انحراف العقود والبناء بوابات CI مستقلة.

الأدلة التفصيلية وحدود التحقق: `docs/reviews/22-app-debugging-2026-11-06.md`.

## تنفيذ خطة الأداء الشاملة — 5 نوفمبر 2026

تنفيذ دفعة أداء شاملة عبر ثماني دفعات متوازية (إصلاحات الحالة والذاكرة والطباعة وملكية الصور ودورة الحياة). الأسس المعمارية لم تتغير؛ التفاصيل الحاكمة أدناه:

- **سياسة الذاكرة الموحدة:** صيانة الذاكرة تُدار حصرياً عبر `MemoryService` (`internal/service/memory_service.go`) — حارس in-flight + نافذة دمج 2ث، حارس `MarkHeavyWorkStart/End` يمنع التقليم التلقائي أثناء توليد ورقة الطباعة (جسر `SetPrintMemoryBridge` في `main.go`)، ولا تقليم عند فقدان تركيز النافذة (`use-window-controls.ts`) ولا عند التصغير؛ `TrimNow` الصريح وحده يتجاوز حارس العمل الثقيل. `debug.FreeOSMemory` وحده بدل زوج GC مزدوج، وتقليم إقلاع وحيد عبر `StartAutoTrim`.
- **إلغاء مهام الطباعة (عقد IPC جديد):** `PrintHandler.CancelActivePrintJobs()` + `CancelPrintJob(jobID)` — سجل مهام في `print_service.go` (تسجيل قبل الاستحواذ على `printJobSem`، نقاط تحقق سياق بين العناصر والدفعات وقبل الحفظ). الإلغاء يمسّ التوليد الحسابي فقط؛ سبول الطابعة يبقى على مسار إلغاء النظام (AbortDoc).
- **مسار الطباعة:** خلايا مستطيلة بلا `dc.Clip()` (قناع Alpha بحجم الصفحة كان يُخصص لكل خلية — مسار سريع بـSubImage مع اختبار بكسلي ذهبي)، كاش المعالجة بميزانية 512MiB بالبايتات إضافة للسقف العددي، وزن الدفعات يشمل مساحة المصدر المفكوك بعد EXIF، وترميز CMYK TIFF متدفق إلى الملف المؤقت بوسوم دقة تُبنى داخل IFD0 (مطابقة بايت-بايت مثبتة بالذهبي)، وحقن DPI لـPNG/JPEG متدفق في `internal/server/dpi_patch.go`.
- **مشتق العرض 2048px:** `use-async-image` يحمّل `/local-image/thumb/<file>?w=2048` (العرض فقط) بدل فك الأصل في المتصفح، مع fallback كامل للأصل وملكية عابرة (`display-image.ts`) تُحرَّر بعد الالتقاط؛ التصدير يجلب الأصل عند الطلب عبر `preloadImagesForFullResolution`. القص والتصدير والطباعة وAI تبقى على المصدر الكامل الموجّه بEXIF (قرار محمي).
- **كاش الفلاتر:** `composePixelFilters` (`konva-filters.ts`) يجمع الفلاتر اللونية المتتالية في تمريرة putImageData واحدة بالترتيب نفسه؛ الفلاتر المكانية تمريرات مستقلة. سقف كاش العقدة واعٍ بالأسطح: `4·W·H·(2r²+1)` (scene+filter عند r وhit عند 1)، وميزانية التصدير بالصيغة نفسها مع استعادة كاش الشاشة بالنسبة المقاسة لا المشتقة.
- **الحفظ التلقائي:** بصمة مستند ثابتة `buildProjectDocument` بلا `savedAt` (تُختم على الكتابة المقبولة فقط)، وجلسة مستند تلغي الأعمال المؤجلة عند reset/load فلا يعود حفظ قديم بعد مسح المسودة. رستر الملصقات المُولَّد يُرفع كوسائط محلية بدل dataURL مع ارتداد آمن.
- **النسخ الاحتياطي (عقد IPC جديد):** `BackupHandler.ExportBackupToPath(defaultFilename)` يفتح حوار الحفظ في Go ويبثّ JSON المشاريع مباشرة إلى الملف الذرية — لا تمر الحمولة عبر IPC؛ `ExportBackup` محتفظ بها للتوافق.
- **التنظيف والـSQLite:** جمع مراجع الوسائط على دفعات 200 (LIMIT/OFFSET) مع اكتمال الجمع قبل أي حذف (fail-closed على كل دفعة)، وPRAGMA الاتصال في DSN + `ConnectHook` (`db.go`) فتُعاد على كل اتصال بديل.
- **دورة حياة الواجهة:** حوارا الطباعة/التصدير يُركَّبان عند أول فتح فقط، قوالب الملصقات في مسار عزل الخلفية تُحمَّل ديناميكياً، مولدات الباركود/QR على أول استخدام مع `ensureBarcodeLibsReady` قبل تخزين SVG نهائي في الإدراج السريع، عامل الماسح يُنهى عند unmount حصراً مع إلغاء warmup المجدول، وعزل الخلفية يملك جلسة إلغاء صادقة (لا تطبيق لنتيجة ملغاة ولا تصفير حالة عملية أحدث).
- **الإدخال:** تراكم zoom عبر `pendingZoomRef` (`use-canvas-viewport.ts`)، معاينة فواصل الكولاج عبر `previewCollageGap/Margin` + `commitCollageSpacing` عند الإفلات، `applySlotMoves` لإزاحة تحديد متعدد بتحديث متجر واحد، ونبضة أسهم الحقول الرقمية بلقطة تراجع واحدة (`fluent-slider-field.tsx`).

## واجهة محرر الكولاج الحر — 28 أكتوبر 2026

- `frontend/src/features/freeform-collage/components/freeform-collage-modal.tsx` يملك مستند التحرير وحارس المسودة كما سابقاً، ويجمع كروم النافذة ولوحة Radix ذات تبويبات إدراج/تعبئة/خصائص. حالة اللوحة مستقلة عن سجل المستند؛ إخفاؤها لا يزيل الخلايا ولا يضيف لقطة تراجع، وتحديد خلية يفتح تبويب خصائصها دون إجبار اللوحة المخفية على الظهور.
- `freeform-left-tools-panel.tsx` يعرض وضع الإدراج أو التعبئة. اختيار استراتيجية التعبئة لا يستدعي المحرك قبل الضغط على «تعبئة الورقة»، وتبقى الاستراتيجية المختارة عند التنقل بين التبويبات. `freeform-right-inspector-panel.tsx` يحرر الخلية الأساسية فقط ويصرّح بذلك عند التحديد المتعدد.
- `freeform-canvas-editor.tsx` معاينة DOM لهندسة الخلايا النسبية، وليست Konva جديدة. الملاءمة تستخدم وحدات حاوية CSS على محورَي العرض والارتفاع؛ التكبير محلي للمعاينة من 50% إلى 300% من مقياس الملاءمة، والتحريك والتحجيم يستعملان أبعاد الورقة المعروضة عبر `getBoundingClientRect`. مسارات الطباعة والتصدير وGo والمتجر لم تتغير.
- `FreeformToolButton` في `freeform-top-action-bar.tsx` يوحّد أدوات الأيقونات والتلميحات وحالة `aria-pressed` في الشريط ومحدد الورق وشريط التكبير. `freeform-slot-card.tsx` يعرض أرقام الخلايا وأبعادها بدل خيال الأشخاص، مع مقابض تحجيم خارج حدود الخلية.
- قيد مضيف قائم: الانتقال بين هيكلي سطح المكتب والهاتف يعيد تركيب `CustomCollageCard` المستضيف فيغلق محرره المحلي؛ لم يُنقل مالك المسودة إلى مستوى التطبيق ضمن إعادة التصميم هذه.

## مراجعة توحيد الأدوات وإصلاحات ما قبل الرفع — 28 أكتوبر 2026

- مجلد التصدير يُنشأ عبر `utils.GetExportsDir`، وفحوص نطاق المسارات تشترك في `PathWithinDir` و`PathWithinDirInclusive`. حارسا الطباعة الأصلية وGDI يحوّلان مجلد التصدير إلى مسار مطلق قبل `EvalSymlinks`، حتى يعمل تجاوز `GRIDO_APP_DIR` النسبي مع بقاء رفض المجلد الشقيق `ExportsEvil`.
- تصحيح Windows بعد CI: يُحوَّل مسار الملف نفسه إلى مطلق قبل `EvalSymlinks`، لا بعده فقط؛ حلّ الرابط بمسار نسبي لا يطبّع بادئات Windows وأسماء 8.3 كما يفعل الحلّ المطلق، فتختلف المقارنة مع مجلد Exports المطبع. ينطبق الترتيب نفسه على الطباعة الأصلية وGDI.
- `sanitizeNativePrintFilePath` في `internal/service/print_native.go` يفصل التحقق عن إطلاق برنامج الطباعة؛ `PrintNative` يستعمله فعلياً دون تغيير توقيع IPC، وتختبره حالات الانحدار دون فتح نافذة نظام.
- توحيد تفاصيل رسم خطوط القص عبر `cutLinePixels`، والتحويل إلى CMYK عبر `rgbToRichCMYK`، ومسار تركيب الورقة في خدمات التصدير والطباعة. هذه إعادة استخدام للمنطق الحالي وليست تغييراً في هندسة الخلايا أو فضاء اللون.
- الواجهة تستخدم `persistPickedImage` لتثبيت صور DataURL، و`isLocalApiAvailable` لفحص إمكانية استعمال جسر HTTP، و`isAutoFillGridEnabled`/`setAutoFillGridEnabled` للتفضيل المحلي، و`downloadJsonFile` لتنزيل JSON عبر سجل الروابط المؤقتة. تحويلات المليمتر والبكسل تعتمد مكتبة `canvas/units`، وأقصى نسخة عرض يعتمد `MAX_DISPLAY_DIM`، وقائمة الورق المشتركة `ALL_PAPER_SIZES`.
- ألواح تبويبات الكولاج غير النشطة موجودة كحاويات مخفية بلا محتوى ثقيل، لتبقى مراجع `aria-controls` صحيحة مع استمرار تركيب الأداة النشطة وحدها.

