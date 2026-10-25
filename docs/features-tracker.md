# تتبع الميزات الأساسية — Grido Studio

**تاريخ المراجعة الأولى:** 30 يوليو 2026 (الإصدار ~v1.2.10)
**آخر تحديث:** 25 أكتوبر 2026 — بعد **جلسة تحسين تجربة صفحة الهبوط ومعدل التحويل (الجلسة 1.46): حذف قسم الجمهور المكرر، مبدّل ثنائي بين المحاكاة التفاعلية ولقطة التطبيق الفعلية، مسار شراء عبر واتساب مع مبدّل عملة ثانٍ متزامن في قسم الأسعار بموافقة المالك، وتوضيح التجربة المجانية وتصحيح ادعاءات الحاسبة والأسئلة والآراء** · وقبله **جلسة تطوير وتحديث واجهة تبويب النصوص ولوحة الخصائص (الجلسة 1.45): معاينة بصرية حية للأنماط بخطوطها وأوزانها الفعلية بهرمية منضبطة في تبويب الإدراج، حقل حجم خط رقمي بأسلوب برامج التصميم مع سلم قفز قياسي، شبكة خلايا تأثيرات بصرية (Effect Tiles) للظلال والخلفيات والتقويس مع أدوات تحكم تفاعلية مدمجة، وكتالوج نقي موحد لتأثيرات النصوص (`text-effects.ts`)** · وقبله **جلسة التحصين الأمني ومعالجة فحص الثغرات (الجلسة 1.44): ترقية Zod إلى 4.6.7، تهريب وسوم SVG، وإغلاق ثغرة سرد المجلدات** · وقبله **جلسة اعتماد خطة ترحيل الماسح العصبي وتنفيذ المراحل 0 إلى 3 واستئصال OpenCV.js (الجلسة 1.43)**
**المنهجية:** فحص الكود الفعلي (Go + React/Konva) ميزةً ميزة، ومطابقتها مع README وخطة التطوير.
**الغرض:** مستند حي يُحدَّث مع كل نظرة على الميزات؛ يكمل (ولا يستبدل) `docs/development-plan/TASKS.md`.

أسطورة الحالة: ✅ مكتمل | ⚠️ مكتمل مع فجوات | 🔶 جزئي | ❌ غير منفذ | 🆕 أُصلح في جلسة الإصلاحات

---

## 1.48 سجل جلسة تحسين مساحة العمل واللوحة اليسرى والتبويب الافتراضي — 25 أكتوبر 2026

**المرجع:** مراجعة تجربة المستخدم للوحة الجانبية اليسرى (شريط الأدوات والدرج الجانبي) وسلوك الطي والتبويب الافتراضي:

| البند | التنفيذ | الإثبات |
| --- | --- | --- |
| التبويب الافتراضي للاستوديو | الحفاظ على «الملصقات» (`stickers`) كافتراضي لمسار الاستوديو (تصميم من الصفر وتزيين)، و«الطبقات» (`layers`) لمسار الإنتاج السريع، وتصحيح حارس حذف العناصر في اختصارات لوحة المفاتيح بالتحقق المباشر من العناصر المحددة | `frontend/src/lib/workspace-tools.ts:295` و`frontend/src/hooks/use-keyboard-shortcuts.ts:93` ✅ |
| استقرار تخطيط مساحة العمل للشاشات القياسية | الحفاظ على عتبة التخطيط القياسي (`standard`) عند 1440px لحماية مساحة الكانفاس الواسعة (>600px) ومنع انحشار وازدحام الألواح الجانبية مع الكانفاس في الشاشات واللابتوبات القياسية (1280px / 1366px) وفق عقود الهندسة واختبارات E2E | `frontend/src/hooks/use-workspace-panels.ts:47` ✅ |
| تحديث الاختبارات | تعديل اختبارات التبويب الافتراضي للتأكد من فتح `layers` في الوضع الحر | `frontend/test/workspace-tools.test.ts:154` و`frontend/test/editor-store.test.ts:141` ✅ |
| حماية النقر المزدوج على التبويبات | منع طي الدرج الأيسر عند النقر المتكرر أو المزدوج على التبويبات بحصر الإغلاق في أزرار الطي الصريحة وسهم الطي وCtrl+B | `frontend/src/hooks/use-workspace-panels.ts:210,243` ✅ |
| تأمين تمدد النافذة وتوحيد خلفية الرنتايم | إضافة `width/height: 100%` و`min-w/h: 100%` للجذر وحاوية App، ومطابقة لون خلفية نافذة Wails الأصلية مع `#18181b` لمنع ظهور فراغ أسود أثناء التوسيع والتكبير | `frontend/src/index.css:398` و`frontend/src/App.tsx:261` و`main.go:261` ✅ |

**الفجوات المتبقية:** لا توجد فجوات متبقية في مساحة العمل؛ اللوحة مستقرة والتبويبات متناسقة.

---

## 1.47 سجل جلسة فصل الكولاج عن الوضع الحر (Mode Isolation) — 25 أكتوبر 2026

**المرجع:** بلاغ المالك: «عند الانتقال للكولاج وتعديل أي شيء يُمسح الوضع الحر تماماً». الوضعان يملكان مصفوفتين مستقلتين (`elements` للحر و`slots` للكولاج) لكن عدة مسارات كانت تمسح مصفوفة الوضع الآخر:

| البند | التنفيذ | الإثبات |
| --- | --- | --- |
| تبديل قالب الكولاج يمسح التصميم الحر | `setCollageTemplate` كان يضبط `elements: []` — ويُستدعى من اختيار القالب وتبديل الصفوف/الأعمدة وتطبيق الكولاج الحر (بلا تأكيد داخل الكولاج). أُزيل المسح | `frontend/src/lib/store/slices/collage-slice.ts:302` ✅ |
| قالب الصورة يمسح الكولاج ويستبدل التصميم الحر | `setTemplate` (يُعاد استدعاؤه عند تغيير المقاس/الاتجاه في لوحة الأبعاد) كان يضبط `slots: []` ويستبدل العناصر بصورة واحدة؛ صار يحفظ الخانات والعناصر ويبذر آخر صورة فقط عندما يكون الوضع الحر فارغاً | `frontend/src/lib/store/slices/collage-slice.ts:177` ✅ |
| تطبيق الكولاج الحر يمطّ التصميم الحر | تعيين `canvasWidth/Height` مباشرة كان يشوّه نسب العناصر (إحداثيات نسبية)؛ استُخرجت دالة موحدة `recenterElementsOnResize` يستخدمها `setCanvasSize` و`setTemplate` والمودال | `frontend/src/lib/canvas/resize-elements.ts:11` ✅ |
| حوار «سيتم مسح عناصر الوضع الحر» (P2-14) | لم يعد له موضع — بقي التأكيد فقط عند إسقاط صور لا تتسع للقالب الجديد | `frontend/src/components/editor/panels/template-panel.tsx:81` ✅ |
| Delete في الكولاج | كان يُظهر تنبيه «العناصر مقفلة» المضلل لأن التحديد يشير لخانة؛ حارس `mode !== 'single'` | `frontend/src/hooks/use-keyboard-shortcuts.ts:97` ✅ |
| فصل أبعاد الورقة وخلفية الكانفاس وسجل التراجع | عزل تام لأبعاد وخلفية كل وضع (`freeformCanvasWidth/Height/Bg` مقابل `collageCanvasWidth/Height/Bg`)؛ التبديل بين الكولاج والوضع الحر يحفظ ويستعيد أبعاد وخلفية كل وضع بدقة، وتعديل مقاس أو خلفية أحدهما لا يمس الآخر، مع تسجيلها في لقطات التراجع ودمجها في سكيما المشروع | `frontend/src/lib/store/slices/core-slice.ts:158,300` ✅ |
| اختبارات ارتدادية | حالات فصل كامل: تبديل القالب يُبقي العناصر، و`setTemplate` يُبقي الخانات، وفحص عزل الأبعاد والخلفية بين الوضعين | `frontend/test/collage-slice.test.ts:186` ✅ |

**الفجوات المتبقية:** لا توجد فجوات متبقية في عزل الوضعين؛ الوضع الحر ووضع الكولاج معزولان تماماً في العناصر والخانات والأبعاد ولون الخلفية وسجل التراجع.

---

## 1.46 سجل جلسة تحسين تجربة صفحة الهبوط ومعدل التحويل (CRO) — 25 أكتوبر 2026

**المرجع:** مراجعة المالك لصفحة الهبوط ضمن جلسة فحص جاهزية الرفع، بهدف تقصير الصفحة وتوضيح نموذج التجربة المجانية ومسار الشراء:

| البند | التنفيذ | الإثبات |
| --- | --- | --- |
| اختصار الصفحة بحذف قسم الجمهور | حُذف `AudienceSection` كاملاً (كان يكرر رسالة Bento والمقارنة) وأُزيل استيراده وعرضه، فصار ترتيب الصفحة عشرة أقسام: Hero → Bento → AI → Windows 11 → ROI → Comparison → Testimonials → Pricing → FAQ → CTA Banner | `admin-web/src/pages/LandingPage.tsx:104` ✅ |
| إبراز لقطة التطبيق الفعلية | مبدّل عرض ثنائي أعلى نافذة المحاكاة («المحاكاة التفاعلية» / «صورة البرنامج الفعلية») يعرض `/grido-desktop-ui.png` مع تكبير إلى Lightbox، و`role="group"` و`aria-pressed` على الزرين | `admin-web/src/components/landing/AppMockup.tsx:35,123,167,784` ✅ |
| توضيح التجربة المجانية في الهيرو | الزر الأساسي صار «تحميل النسخة التجريبية مجاناً» بدل «تحميل مجاني لـ Windows»، وأُضيف سطر «جرّب كافة ميزات الاستوديو مجاناً…» وعُدّل شريط الثقة إلى «معالجة وطباعة محلية بالكامل · خفيف جداً (<120MB ذاكرة) · مطابق لمعايير ICAO الرسمية» | `admin-web/src/components/landing/HeroSection.tsx:63,69,88,93` ✅ |
| مبدّل عملة ثانٍ في الأسعار (بموافقة المالك) | مبدّل IQD/SAR/USD أعلى قسم الأسعار بحالة مشتركة مع حاسبة العائد في `LandingPage`، يحدّث السعر ورسالة واتساب فوراً؛ يخالف بند «المبدّل الوحيد في الصفحة» في `admin-web/design.md` واعتُمد صراحةً في جلسة المراجعة 2026-10-25 | `PricingSection.tsx:57` و`LandingPage.tsx:21,127,142` ✅ |
| مسار شراء مباشر عبر واتساب | زر أساسي «طلب مفتاح الترخيص (<السعر> <العملة>)» يفتح `wa.me` برسالة تحمل العملة والسعر، يليه زر ثانوي «أو حمّل وجرّب مجاناً»، وسطر ضمانات (تجربة مجانية · تفعيل فوري · نقل الترخيص)، وبطاقة ضمان ثالثة «تجربة مجانية قبل الدفع» | `PricingSection.tsx:44,127,137` ✅ |
| تصحيح ادعاءات المسوّغات | حاسبة العائد: سطر «أساس الحسبة» (~5.5 دقيقة/زبون، 25% من الوقت الموفر، 26 يوماً) وتصحيح وصف العائد؛ الأسئلة الشائعة: سؤال تجربة مجانية أولاً وتوضيح أن الترميم السحابي اختياري؛ المقارنة: «مطابق لـ ICAO» و«أمان تام» بدل «معتمد 100%»؛ الآراء: حذف «أكثر من 140 استوديو» و«رضا 99.4%» واستبدالهما بعبارات غير مُدّعاة | `RoiCalculator.tsx:161` و`FaqSection.tsx:8,12` و`ComparisonSection.tsx:34,43` و`TestimonialsSection.tsx:72` ✅ |
| بوابات الجودة والتحقق | `npm run build` ناجح · `oxlint` 0 أخطاء/0 تحذيرات · Vitest 32/32 · `tsc --noEmit` و`eslint` نظيفان في الواجهة · `docs-gate.mjs --strict-refs` ناجح · تحقق بصري: تبديل اللقطة يعمل، ومبدّل العملة يحدّث السعر ورابط واتساب | 2026-10-25 ✅ |

**قرارات محمية بعد الجلسة (بموافقة المالك الصريحة — 2026-10-25):** مبدّل العملة الثاني في قسم الأسعار مقصود ويبقى متزامناً مع حاسبة العائد؛ حذفه أو الرجوع إلى مبدّل واحد يتطلب موافقة المالك (يلغي بند «المبدّل الوحيد في الصفحة» في `admin-web/design.md` v2.5).

**الفجوات المتبقية:** تفاعل مبدّل عرض المحاكاة واللقطة الفعلية تحقق منه بصرياً في Chromium فقط (لا تغطيه الاختبارات الآلية)، وأرقام الشهادات في `landing-content.ts` ما تزال أمثلة توضيحية غير مسندة إلى مرجع خارجي.

---

## 1.45 سجل جلسة تطوير وتحديث واجهة تبويب النصوص ولوحة الخصائص — 25 أكتوبر 2026

**المرجع:** طلب المالك «اريد تطوير تصميم تبويب النصوص ... اريد واجهة نظيفة واحترافية ومثالية»:

| البند | التنفيذ | الإثبات |
| --- | --- | --- |
| معاينة بصرية حية لأنماط الإدراج | عرض تسميات الأنماط الطباعية (عنوان رئيسي/فرعي/فقرة/تسمية) بخطوطها وأوزانها الفعلية بهرمية مقياس مضغوطة ومنتظمة (12-20px عبر `textPresetPreviewSize`)، مع زر إضافة نص بارز `h-9 bg-primary`، وضم الشارة والختم لتوثيق الاستوديو | `frontend/src/components/editor/panels/freeform/freeform-text-tab.tsx` و`frontend/src/lib/templates/text-presets.ts` ✅ |
| حقل حجم الخط الرقمي وأدوات التنسيق | استبدال القائمة المنسدلة المحدودة بحقل حجم خط رقمي حر (`FontSizeField`) يقبل أي رقم 6-500 مع أزرار قفز لسلم الطباعة القياسي، ودمج أدوات النمط والمحاذاة في شبكة كبسولات Fluent 2 موحدة، وتضمين منزلقات ارتفاع السطر وتباعد الحروف بالنمط المضمّن (`inline`)، وإظهار سياقي ذكي لحالة الأحرف والأرقام المشرقية | `frontend/src/components/editor/properties/panels/text/text-type-tab.tsx` و`font-size-field.tsx` و`font-size-utils.ts` ✅ |
| شبكة خلايا التأثيرات البصرية (Effect Tiles) | تصميم شبكة خلايا مرئية لمعاينة واختيار تأثيرات النص على طريقة Canva و Figma: خلايا الظلال (بدون/ناعم/ساقط/توهج/مجسم) مع حساب ظل CSS حقيقي، خلايا الخلفية (مستطيل/كبسولة)، وخلايا التقويس بمسارات SVG ديناميكية، مع كشف إعدادات التعديل الدقيقة أسفل الخلية النشطة | `frontend/src/components/editor/properties/panels/text/text-effects-tab.tsx` و`text-controls.tsx` ✅ |
| كتالوج تأثيرات النصوص المنفصل | استخراج منطق الظلال والخلفيات والتقويس وحسابات المعاينة في كتالوج نقي مستقل `text-effects.ts` كمصدر حقيقة واحد يمنع الازدواجية | `frontend/src/lib/templates/text-effects.ts` و`frontend/test/text-effects-catalog.test.ts` ✅ |
| بوابات الجودة والتوافق | 19 اختبار Vitest مستهدفاً (4 ملفات) أخضر 100% · المجموعة الكاملة 150 ملفاً: 1327 ناجحاً + 1 متجاوزاً (0 فاشلة) · `tsc --noEmit` نظيف تماماً · `eslint` نظيف (0 أخطاء و 0 تحذيرات) · Prettier مطابق · `docs-gate.mjs --strict-refs` ناجح | الفحوصات الآلية (2026-10-25) ✅ |

**قرارات محمية بعد الجلسة (بموافقة المالك الصريحة — 2026-10-25):** كتالوج الإدراج تسعة أنماط — الأربعة الطباعية + الشارة والختم + كتل توثيق الاستوديو الثلاث — وتظهر كلها في تبويب الإدراج (يلغي هذا القرار بند 1.37 المحمي) · معاينة التسمية بالخط والوزن الفعليين بحجم مضغوط 12–20px عبر `textPresetPreviewSize` · الشارة والختم للإدراج فقط ولا تُطبَّقان على نص محدد · أي تغيير مستقبلي في عدد الأنماط أو شكل المعاينة يحتاج موافقة المالك.

---

## 1.44 سجل جلسة التحصين الأمني ومعالجة فحص الثغرات — 24 أكتوبر 2026

**المرجع:** نتائج التدقيق الأمني الشامل للواجهة ونقاط التماس مع الباك إند:

| البند | التنفيذ | الإثبات |
| --- | --- | --- |
| ترقية حزمة Zod الإنتاجية | تحديث `zod` إلى الإصدار الآمن `4.6.7` عبر `npm audit fix` لإغلاق ثغرة استنزاف الذاكرة `GHSA-mrhx-c7xc-m3w5`، مع تحديث اعتمادات بيئة التطوير المصاحبة ضمن حدود SemVer الآمنة | `frontend/package-lock.json` و`npm list zod` (4.6.7) ✅ |
| تهريب نصوص SVG في QR Placeholder | إضافة دالة `escapeXml` في `barcode-svg.ts` وتهريب الـ `label` قبل دمجه في قالب SVG التحذيري لمنع أي حقن لوسوم XML عند إدخال نصوص غير قياسية | `frontend/src/features/stickers/lib/barcode-svg.ts:164` ✅ |
| استئصال الالتفاف على تعقيم SVG | إزالة معامل السقوط الخاطئ `|| svg` عند فشل التعقيم في `sticker-studio-dialog.tsx` و`use-bg-removal.ts` و`freeform-elements-tab.tsx`، وفرض تعقيم `stickerSource.svg` آلياً عند استيراد المشاريع في `project-serializer.ts` | `sticker-studio-dialog.tsx:253,341,382` و`project-serializer.ts:172` ✅ |
| حظر سرد المجلدات (Directory Listing) | فحص المسار المطلوب تحت `/local-image/` ورفض المجلدات (`stat.IsDir()`) والمسارات الفارغة أو النسبية (`.` / `..`) مع إلزام بادئة مجلد الوسائط لمنع `http.ServeFile` من توليد قائمة HTML لمحتويات المجلد | `internal/server/asset_server.go:587` و`asset_server_test.go:TestAssetServer_LocalImage_DirectoryListingBlocked` ✅ |
| بوابات الجودة والتحقق | `tsc --noEmit` نظيف 100% · `eslint` نظيف (0 تحذيرات) · `go vet ./internal/...` نظيف · `go test ./internal/server` ناجح · `docs-gate.mjs --strict-refs` ناجح | 2026-10-24 ✅ |

---

## 1.43 سجل اعتماد خطة ترحيل الماسح العصبي وتنفيذ المرحلة 0 (شبكة الأمان) — 24 أكتوبر 2026

**المرجع:** مواصفة `docs/plans/neural-scanner-warp-migration-spec.md` — إزالة OpenCV.js WASM (12.7MB) وترحيل الكشف إلى نموذج DocCornerNet ثابت الابتلاع والاستعدال إلى Go بميزانية ذاكرة مفروضة آلياً، استكمالاً لإصلاح انفجار ذاكرة 4GB (الجلسة 1.42).

| البند | التنفيذ | الإثبات |
| --- | --- | --- |
| حسم القرارات المعمارية D-1..D-5 | فحص `doccornernet_lean.ort` عبر onnxruntime 1.27 أثبت دخلاً ثابتاً `input tensor(float) [1,224,224,3]` ومخرجَي `coords [1,8]` و`score_logit [1,1]` — فحُسم D-1=A (الابتلاع 224 عبر ثابت `ML_INGEST_SIZE` المعزول؛ الخيار C لا يملك تغيير دخل ثابت والخيار B يحتاج إعادة تصدير خارجية)، وD-2=PNG وD-3=قارئ APP1 داخلي وD-4 ملزم وD-5=حذف مسار الرجوع المتزامن فوراً | `docs/plans/neural-scanner-warp-migration-spec.md` §9 ✅ |
| Golden vectors للاستعدال والفلاتر | اختبار `scanner-warp-golden.test.ts`: 3 صور اصطناعية × 5 مضلعات (15 حالة) تثبّت مخرجات مسار TS الحالي (قصّ + Homography عكسي + Bilinear) بايت-ببايت مع مصفوفة H في `manifest.json`، + مخرجات أوضاع الفلاتر الخمسة، + 8 توسيمات EXIF يتحقق منها قارئ TIFF مصغّر داخل الاختبار؛ التوليد عبر `FIXTURE_GEN=1` — والملفات مرجع توازي Go (RMSE) في المرحلة 1 | `frontend/test/scanner-warp-golden.test.ts` (18 حالة ✅) و`internal/service/testdata/scanner_warp/` (32 ملفاً) ✅ |
| توحيد محاكي الكانفاس | استخراج محاكي jsdom المشترك من `warp-pipeline.test.ts` إلى `test/helpers/scanner-canvas-mock.ts` (مصدر واحد + دعم `getContext` على كائنات المصدر لتعمل الفلاتر عليها) | `frontend/test/helpers/scanner-canvas-mock.ts` و`frontend/test/warp-pipeline.test.ts` (3 حالات ✅) ✅ |
| fixtures EXIF 1-8 | سكربت `scripts/generate-scanner-exif-fixtures.py` (Pillow) يولّد 8 JPEG بنمط بصري كاشف للاتجاه (ربع أحمر أعلى-يسار وأخضر أسفل-يمين) بتوسيمات 1-8 — أساس توازي تطبيع EXIF في Go مقابل سلوك `createImageBitmap({imageOrientation:'from-image'})` | `internal/service/testdata/scanner_warp/exif/orientation_{1..8}.jpg` ✅ |

**انحراف موثق عن الخطة:** بند «خط الأساس الميداني MEMSNAP» (م0) أُجّل إلى المرحلة 4 لأن خطاف `MEMSNAP` في `createLogger` يُنشأ هناك — لا معنى لالتقاط «قبل/بعد» بأداة غير موجودة بعد.

| البند (المرحلة 1 — خدمة استعدال Go) | التنفيذ | الإثبات |
| --- | --- | --- |
| خدمة الاستعدال الكاملة | `internal/service/scanner_warp_service.go`: نواة `WarpScannerDocument` (فرز أركان منقول من `sortCornerPoints` + قصّ `CROP_PADDING=2` + Homography عكسي بجاورس مع محور جزئي + Bilinear بشرائح 256 صف **متوازية** عبر `utils.SafeGo` + تدوير 90/180/270 نسخاً حرفياً) و`WarpFromMedia` (فك → EXIF → تحقق → استعدال → PNG بكتابة ذرية `CreateAtomic`) — سقف `MaxScannerWarpPixels = 50_000_000` موازٍ لـ`MAX_EXPORT_PIXELS` | `internal/service/scanner_warp_service.go` ✅ |
| فلاتر الستة في Go | `scanner_warp_filters.go`: magic/bw(Bradley تكيفي بصورة تكاملية)/grayscale/sharpen/deyellow منقولة حرفياً من `filters.ts` مع مكافئي `Math.round` و`(306r+601g+117b)>>10` | `internal/service/scanner_warp_filters.go` ✅ |
| قارئ EXIF داخلي (D-3) | `exif_orientation.go`: فك APP1/IFD0 بلا اعتماد جديد + تطبيع التوسيمات 1-8 بنفس دلالات `createImageBitmap({from-image})` | `internal/service/exif_orientation_test.go` (8 حالات أرباع + أبعاد) ✅ |
| نقطة `/api/scanner-warp` | في `asset_server.go` خلف LocalApiGuard: سقف جسم 64KB، فك JSON، تصنيف أخطاء موحّد `SCN-WARP-01..04` عربية، توصيل `main.go` عبر `createAssetHandler` | `internal/server/asset_server_scanner_warp_test.go` (نجاح + 403 بلا توكن + 5 حالات رفض) ✅ |
| **توازي TS↔Go** | 15 حالة Golden + 5 فلاتر + مصفوفة H: **تطابق حرفي (صفر بايت مختلف)** — أدق من عتبة RMSE < 1.5/255 المطلوبة؛ ترتيب استعدال→فلتر→تدوير مثبّت بتطابق حرفي؛ رفض مغلق (NaN/خارج الحدود/منحلّ/تجاوز 50MP/data:/فلتر مجهول/تدوير 45)؛ ميزانية ذاكرة 25MP مقيسة ≤ 900MB | `internal/service/scanner_warp_test.go` ✅ |
| بوابة الخروج | `go vet ./internal/... .` نظيف · `gofmt` صفر انحراف · `go test ./internal/handlers` أخضر · `go test ./internal/service` أخضر عدا `TestConfigurePrinterDevMode_LiveA4Enforcement` — **فشل مسبق** مثبت بالتشغيل على شجرة نظيفة بلا تعديلات الجلسة (اختبار طابعة حي يعتمد بيئة الجهاز) | تشغيل موثق أعلاه ✅ |

| البند (المرحلتان 2 و 3 — تحويل الواجهة واستئصال OpenCV) | التنفيذ | الإثبات |
| --- | --- | --- |
| تحويل الواجهة إلى Go (المرحلة 2) | استبدال `generateWarpedBlobForDoc` بـ `generateWarpedUrlForDoc` عبر `warp-client.ts` واستدعاء نقطة `/api/scanner-warp` مباشرة (صفر Blob، صفر كانفاس بدقة كاملة على الخيط الرئيسي)، مع استخراج مسار `/local-image/` من الروابط المطلقة لعناصر DOM (`extractLocalImagePath`) ودعم رفع `blob:`/`data:` تلقائياً لمنع خطأ `SCN-WARP-03` | `frontend/src/components/editor/document-scanner/core/warp-client.ts:21` و`use-scanner-processor.ts` ✅ |
| كشف المستندات العصبي الأصلي في Go | خدمة `ScannerDetectorService` المعتمدة على نموذج `FastViT-SA24` المكمّم بنصف الدقة `FP16` (بحجم 39.8MB موفراً 50% من الحجم بدقة متطابقة 100%) عبر مكتبة ONNX Runtime المضمنة ونقطة `/api/scanner-detect` لكشف أركان البطاقات والمستندات بدقة متناهية عبر خرائط الحرارة (Heatmaps) دون استهلاك ذاكرة الويب فيو، مع مرونة التهيئة وإعادة المحاولة التلقائية وحماية مسارات غير ويندوز بـ HTTP 503 ومنع ازدواجية الرفع المؤقت للوسائط | `internal/service/scanner_detector_service_windows.go` و`internal/server/asset_server.go:258` و`ml-orchestrator.ts:404` و`scanner_detector_test.go` ✅ |
| منسق الكشف العصبي والابتلاع الثابت (المرحلة 3) | استبدال مسار الرؤية الكلاسيكية بـ `ml-orchestrator.ts` الداعم لكشف التمريرات المتعددة للبطاقات المكدسة (`ML_MAX_PASSES=3`) مع كانفاس ابتلاع ثابت (224×224 بملء الإطار الكامل مطابقاً لعقد تدريب `DocCornerNet` دون حواجز letterbox رمادية) عبر `ml-ingest.ts` ونقل الاستدلال إلى `scanner-ml.worker.ts` المعزول مع مهلة 8s وإنهاء آلي | `frontend/src/components/editor/document-scanner/core/ml-orchestrator.ts` و`ml-ingest.ts:38` و`scanner-ml.worker.ts` ✅ |
| استئصال OpenCV.js وحزمته | حذف حزمة `@techstark/opencv-js` من `package.json` وتطهير كافة كود الكنتورات والرؤية الكلاسيكية المحذوفة (12 ملفاً تشمل `opencv-detector.ts` و`detect-fusion.ts` و`fast-vision.ts` و`contour-tracer.ts` والعمال المرتبطين)، وتوفير أكثر من 12.7MB من الحزمة | `frontend/package.json` و`frontend/src/components/editor/document-scanner/core/` ✅ |
| بوابات الجودة والتحقق | `tsc --noEmit` نظيف 100% · `eslint` نظيف بلا أي تحذيرات (0 تحذيرات) · `go vet ./internal/...` نظيف · `docs-gate.mjs --strict-refs` ناجح | 2026-10-24 ✅ |

---

## 1.42 سجل إصلاح تضخم ذاكرة WebView2 (4 GB) وانهيار المكدس عند عزل خلفية الملصق — 23 أكتوبر 2026

**المرجع:** بلاغ المالك: «فقط لانني حاولت ان امسح خلفية ملصق اضفته للكانفاس دخل التطبيق بنوبة هلع وضغط هائل وذهبت لمتابعة الاستهلاك فوجدت ان الويب فيو يستهلك 4 جيجا بايت»، وفحص سجل التشغيل الحي `grido.log` الذي أظهر `RangeError: Maximum call stack size exceeded` في `cancelActiveOperation` و`Document detector worker timed out`.

| البند | التنفيذ | الإثبات |
| --- | --- | --- |
| عزل خلفية الملصق متجهياً وبشكل لحظي | فحص `element.stickerSource` في `useBgRemoval`: بدلاً من إرسال الملصق لشبكة بورتريه البشر (`RemoveBackground` MODNet ONNX + 7 تمريرات Bilateral Filter)، يُعاد بناء SVG الملصق فوراً مع `isTransparent: true` وتحويله إلى `Blob` عبر `renderSvgToPngBlob` ورفعه لخادم الوسائط وحفظ `originalImageSrc` عبر `commitAiImageResult` مع دعم استعادة خلفية الملصق عند النقر على «استعادة الأصل» | `frontend/src/hooks/use-bg-removal.ts:88` و`frontend/src/components/editor/properties/panels/image-properties.tsx:599` ✅ |
| إصلاح التكرار اللانهائي عند إلغاء العملية | تصفير `activeOperation: null` في `cancelActiveOperation` قبل استدعاء `current.onCancel()`، واستخدام `finishOperation(activeOp.id)` داخل `handleCancelBgRemoval` لمنع الاستدعاء الدائري اللانهائي (`Maximum call stack size exceeded`) | `frontend/src/lib/ui/operation-status.ts:74` و`frontend/src/hooks/use-bg-removal.ts:73` ✅ |
| إلغاء تخزين Base64 للملصقات في التبويب | تحويل `handleInsertSticker` في `FreeformElementsTab` من `renderSvgToPngDataUrl` إلى `renderSvgToPngBlob` + `uploadMediaBlob` لتفادي الاحتفاظ بسلاسل Base64 الضخمة في كومة V8 وسجل التراجع وجسر IPC | `frontend/src/components/editor/panels/freeform/freeform-elements-tab.tsx:161` ✅ |
| قتل عامل OpenCV عند المهلة وتحرير مصفوفات WASM | استدعاء `this.terminate(...)` / `detectorWorkerClient.terminate(...)` فور انتهاء مهلة العامل (`WORKER_TIMEOUT_MS` / `OPENCV_WORKER_TIMEOUT_MS`) لقطع حسابات WASM العالقة وتحرير ذاكرة WebView2، وتحرير `approxTight.delete()` داخل كل كنتور مع سقف 500 كنتور في `opencv-detector.ts` | `frontend/src/components/editor/document-scanner/core/detector-worker-client.ts:92` و`document-detector.ts:701` و`opencv-detector.ts:271` ✅ |

---

## 1.41 سجل ترقية رسوم الملصقات وملاءمة النصوص وإصلاح تعديل الملصق المدرج من التبويب — 23 أكتوبر 2026

**المرجع:** مراجعة التعديلات الأخيرة لرسوم الملصقات وملاحظة المالك: «عندما اضغط زر ايمن على ملصق تم ادراجه من التبويب مباشرة لا يظهر خيار التعديل كما لو اضفته من استوديو الملصقات».

| البند | التنفيذ | الإثبات |
| --- | --- | --- |
| تفعيل «تعديل الملصق» للإدراج السريع من التبويب | تحديث `handleInsertSticker` و`getStickerSvgPreview` في `FreeformElementsTab` لاستخدام `buildDefaultStickerParams` و`buildStickerSvg` و`stickerRasterSize` وتمرير `stickerSource` (`{ templateId, params, svg }`) كمعامل ثالث إلى `addImageElement`، مع تهيئة `selectedTemplate` مباشرة من `editingElement` في `StickerStudioDialog` | `frontend/src/components/editor/panels/freeform/freeform-elements-tab.tsx:148` و`frontend/src/features/stickers/components/sticker-studio-dialog.tsx:107` ✅ |
| ملاءمة نصوص الحقول والأقواس وحماية `data-field-id` | دعم `data-max-width` في `postProcessStickerSvg` لملاءمة النصوص داخل الشرائط والأقواس وتقليص `letter-spacing` اللاتيني تناسبياً، ومنع اقتطاع الرموز الخاصة في `estimateTextWidth`، وتقييد `namespaceStickerSvgIds` بـ `(\s)id=` لعدم تلويث `data-field-id` | `frontend/src/features/stickers/lib/sticker-text.ts:126` و`:151` ✅ |
| تضمين الخطوط الكامل في مساري SVG وPNG | حفظ `unicode-range` وكافة أوزان ومجموعات الخط في `extractSheetFontFaceRules` و`collectFontFaces` داخل `sticker-font-embed.ts` (بما يدعم قراءة `ownerNode.textContent` في JSDOM)، واستدعاء `embedStickerFonts` قبل التصيير في `rasterizeSvgToCanvas` | `frontend/src/features/stickers/lib/sticker-font-embed.ts:25` و`:47` و`frontend/src/features/stickers/lib/svg-rasterizer.ts:59` ✅ |
| دقة تحذير التباين ووراثة دور اللون | إضافة `textColorRoles` في `sticker-a11y.ts` واستهلاكها عبر `buildStickerSvg` في `StickerProperties` لقصر التحذير على الألوان التي ترسم نصاً فعلياً، واستخدام `closest('[data-color-role]')` في `StickerPreview` | `frontend/src/features/stickers/lib/sticker-a11y.ts:136` و`frontend/src/features/stickers/components/sticker-properties.tsx:111` و`frontend/src/features/stickers/components/sticker-preview.tsx:175` ✅ |
| ترقية الرسوم المتجهة للقوالب والاختبارات | تحديث 14 ملف قوالب في `frontend/src/features/stickers/templates/*` بزخارف متناظرة (`frameCorners`) وتدرجات وأبعاد `data-max-width`، وتوسيع `test/sticker-text.test.ts` و`test/sticker-phase2.test.ts` و`test/sticker-quality.test.ts` و`test/sticker-studio.test.tsx` | `frontend/src/features/stickers/templates/frames.ts:6` و`frontend/test/sticker-studio.test.tsx:193` ✅ |
| القضاء على تأخر شاردز E2E في CI | تثبيت وتشغيل `wails3` بوضع `CGO_ENABLED=0` (مفتاح كاش `cgo0-v2`) وإزالة تثبيت `libgtk-4-dev`/`libwebkitgtk-6.0-dev` و`playwright install-deps chromium` من `validate-frontend` والشاردز الأربعة في `e2e-tests`، واستبعاد مرآة `azure.archive.ubuntu.com` المخنوقة من `/etc/apt/apt-mirrors.txt` في `validate-backend` و`webkit-smoke` | `.github/workflows/ci.yml:156` و`:234` و`:418` و`:684` ✅ |

---

## 1.40 سجل تدقيق وإصلاح منظومة التعامل مع النصوص واختناقات الأداء والذاكرة — 23 أكتوبر 2026

**المرجع:** طلب المالك «راجع الية التعامل مع النصوص في التطبيق» ثم «نعم اصلحها من فضلك»، تلاه تقرير تدقيق الأداء والذاكرة وطلب «نعم اصلح الكل».

| البند | التنفيذ | الإثبات |
| --- | --- | --- |
| حماية أبعاد النص في تبويب «ترتيب» | تعطيل حقل الارتفاع `H` لعناصر النص (لأن الارتفاع مشتق من المحتوى دائماً وكان التعديل اليدوي يلوّث سجل التراجع ثم تلغيه عقدة Konva)، وتحويل `textSizing` إلى `'fixed'` مع تصفير `textResizeAnchor` عند تعديل العرض `W` رقمياً | `frontend/src/components/editor/properties/element/tabs/arrange-tab.tsx:233` ✅ |
| تصفير ارتساء الزاوية عند تعديل المقاييس | تعديل `fontSize` أو `fontWeight` أو `fontStyle` أو `lineHeight` أو `letterSpacing` أو `textTransform` من `TextTypeTab` يصفّر `textResizeAnchor: undefined` ليعود التوسع التلقائي حول المركز | `frontend/src/components/editor/properties/panels/text/text-type-tab.tsx:96` ✅ |
| إزالة الازدواجية والكود الميت في لوحات النص | حذف `ColorField` المكرر وكود HEX الظاهر من بطاقة «إطار وحدود النص» وحذف بطاقة «ألوان الخلفية والشارة» المكررة في `TextColorTab`، واستئصال المكوّن الميت `TextProperties` ذي التبويبات الفرعية من `text-properties.tsx` | `frontend/src/components/editor/properties/panels/text/text-color-tab.tsx:135` و`frontend/src/components/editor/properties/panels/text-properties.tsx:1` ✅ |
| انتظار جاهزية الخطوط قبل التصدير | إضافة `ensureElementsFontsLoaded` في `fonts.ts` واستدعاؤها قبل التقاط `stageRef` في `exportCanvas` وفي بداية `renderFittedBranch` لضمان اكتمال تحميل وجوه الخطوط المطلوبة قبل التصيير | `frontend/src/lib/io/fonts.ts:500` و`frontend/src/lib/export/export-canvas.ts:43` و`frontend/src/lib/export/export-canvas-fitted.ts:40` ✅ |
| عزل إبطال كاش الفلاتر بالعنصر المعدّل | إضافة `draggingFilterId` في `render-quality.ts` وتمرير `targetId` إلى `useFilterCache` بحيث ينخفض مستوى دقة المعاينة ويعاد بناء الكاش للصورة أو الخانة قيد التعديل فقط دون إعادة بناء كاش الصور المفلترة الأخرى | `frontend/src/lib/canvas/render-quality.ts:4` و`frontend/src/hooks/use-filter-cache.ts:48` ✅ |
| فصل المعاينة الحية عن تسجيل التراجع في عجلة الألوان | إضافة `onCommit` إلى `ColorWheel` و`ColorWheelPicker` و`ColorField` و`onCommitColor` إلى `GradientPicker` بحيث يُسجّل `pushHistory()` مرة واحدة عند انتهاء السحب أو الاختيار بدل كل إطار `pointermove` | `frontend/src/components/editor/properties/color-wheel.tsx:25` و`frontend/src/components/editor/properties/color-panel.tsx:43` و`frontend/src/components/editor/properties/gradient-picker.tsx:24` ✅ |
| كاش تخطيط النص المنحني وإلغاء رسم Hit المزدوج | إضافة كاش LRU لتشكيل الحروف وتخطيط القوس (`shapedGlyphsCache` و`curvedLayoutCache`) مع مسبار قياس الخط وعدم تقليص `scratchCanvas` في `curved-text-utils.ts`، وتعطيل `listening` على عقدتي النص الداخليتين في `text-node.tsx` اعتماداً على مستطيل التفاعل الخلفي | `frontend/src/lib/canvas/curved-text-utils.ts:305` و`frontend/src/components/editor/konva/elements/text-node.tsx:372` ✅ |
| إزالة البحث التربيعي في الطبقات والخصائص | استبدال `findIndex`/`includes` داخل حلقة `layers-list.tsx` و`find` داخل `properties-panel.tsx` بفهارس `Map`/`Set` بتكلفة $O(1)$ | `frontend/src/components/editor/properties/layers-list.tsx:579` و`frontend/src/components/editor/panels/properties-panel.tsx:115` ✅ |
| ميزانية بايتات كاش الطباعة في Go وحفظ CMYK المباشر | فرض سقف بايتات (`requestRawCacheMaxBytes = 256MB`) على `imageCache` في `print_image_pipeline.go`، ودعم النسخ المباشر من `Exports/print_*` والبث المتدفق في `/api/save-file` مع `skipBlobFetch` في `runCmykExport` لتفادي سحب وإعادة رفع ملفات TIFF الضخمة عبر الذاكرة | `internal/service/print_image_pipeline.go:342` و`internal/server/asset_server.go:271` و`frontend/src/lib/export/export-cmyk.ts:131` ✅ |
| مزامنة مهارة النصوص والاختبارات | تحديث `.agents/skills/konva-text-typography-fx/SKILL.md` وتوسيع `test/element-properties-tabs.test.tsx` و`test/color-panel.test.tsx` و`test/curved-text.test.ts` و`test/export-cmyk.test.ts` | `.agents/skills/konva-text-typography-fx/SKILL.md:54` و`frontend/test/color-panel.test.tsx:169` ✅ |

---

## 1.39 سجل توحيد منتقي الخطوط وقوائم خصائص النص وتصريف استوديو الملصقات — 23 أكتوبر 2026

**المرجع:** أربع ملاحظات متتابعة من المالك على واجهة الخطوط: «راجع تصميم قوائم الخطوط لا يبدو انه يراعي التوجه الجديد لتصميم التطبيق» ثم «قم باصلاح الكل لو سمحت» ثم «لا ارى اي داعي لتصنيفات الخطوط اجلها قائمة فقط بلا تصنيفات» ثم «قوائم اختيار حجم الخط المنسدلة يبدو انها لا تتماشى مع تصميم التطبيق الحالي»، تلتها ملاحظة تدقيق عامة على عيوب الواجهة («ما هي العيوب التي رايتها في الواجهة اثناء استخدامك ؟») ثم «ممتاز قم بالاصلاح من فضلك» لاستوديو الملصقات، وأخيراً «لسنا بحاجة الى الايقونات في تبويبات من هذا النوع» مع لقطة لشريط تبويبات خصائص العنصر.

| البند | التنفيذ | الإثبات |
| --- | --- | --- |
| منتقي خطوط واحد بلا تصنيفات | مكوّن مشترك `FontSelector` في `components/ui/font-selector.tsx`: قائمة مسطّحة بصفوف 32px (`role="grid"`)، بحث عربي/لاتيني في حقل `combobox`، مفضّلة داخل الصف بنجمة، وتلميح يوضّح اسم الخط الإنجليزي ومصدره (مدمج/سحابي). حُذف `FONT_CATEGORIES` من `fonts.ts` وبقيت فئات البيانات للعرض فقط؛ واستُبدلت به نسختا منتقي النص والملصق | `frontend/src/components/ui/font-selector.tsx:41` و`frontend/src/lib/io/fonts.ts:19` و`frontend/src/components/editor/properties/panels/text/text-font-selector.tsx:15` و`frontend/src/features/stickers/components/sticker-font-selector.tsx:11` ✅ |
| سلوك المنتقي | معاينة فورية للعناصر المحددة مع تراجع كامل عن `Escape` أو إغلاق اللوحة، والتزام واحد فقط عند `Enter`، وتصفية إلى جميع النصوص المحددة (لا المحدد وحده)، وحفظ المفضّلة في `localStorage` مع بقاء النتيجة في الذاكرة إن فشل التخزين، وتصفير البحث عند إعادة الفتح | `frontend/src/components/ui/font-selector.tsx:92` و`frontend/src/components/editor/properties/panels/text/text-font-selector.tsx:71` ✅ |
| قوائم خصائص النص بتنسيق Fluent | قوائم الوزن والحجم وارتفاع السطر وتباعد الحروف تحوّلت من `<select>` أصلي إلى `Select` بـ Radix: مُشغِّل بسطح مسطّح وحد شعري وارتفاع 32px بلا `shadow-inner`، وقائمة بحدود `z-(--z-popover)` وارتفاع ديناميكي، والقيم الرقمية بـ`tabular-nums` واتجاه `ltr` داخل `dir="rtl"` | `frontend/src/components/editor/properties/panels/text/text-type-tab.tsx:74` و`:137` و`:161` و`:399` و`:430` ✅ |
| استوديو الملصقات بلا تكرار | اسم القالب مرة واحدة في ترويسة الحوار، والمقاس المادي مرة واحدة في مسرح المعاينة (بلا شارة DPI المضلِّلة لمعاينة متجهية)، والقيم اللونية السداسية في التلميح لا في التخطيط الدائم، وبطاقة «المقاس الفعلي» في اللوحة حُذفت؛ وانتقل زر «استعادة الافتراضي» إلى شريط العنوان بجوار زر الإغلاق، وحُذف شريط القراءة المكرّر في تذييل المعرض | `frontend/src/features/stickers/components/sticker-studio-dialog.tsx:603` و`:719` و`frontend/src/features/stickers/components/sticker-properties.tsx:194` و`frontend/src/features/stickers/components/sticker-preview.tsx:349` ✅ |
| تبويبات بلا أيقونات | حُذفت أيقونات شرائط التبويبات الأربع كلها: خصائص العنصر (تنسيق/تعبئة/تأثير/ترتيب)، ووجهتا الورقة/الكولاج، وتبويبات النص الفرعية (الخط/الألوان/التأثيرات)، وأقسام استوديو الملصقات؛ وبقيت الأسماء الوصولية والتلميحات وشارات الأعداد كما هي | `frontend/src/components/editor/properties/element-properties.tsx:65` و`frontend/src/components/editor/panels/properties-panel.tsx:178` و`frontend/src/components/editor/properties/panels/text-properties.tsx:74` و`frontend/src/features/stickers/components/sticker-properties.tsx:197` ✅ |
| إصلاح mock الاختبارات | `test/setup.ts` كان يعرّف `IntersectionObserver` بـ`vi.fn().mockReturnValue(...)`، وهو ممنوع في Vitest 4 عند الاستدعاء بـ`new` — فكانت 12 حالة في `test/font-selector` تفشل. حُوّل إلى صنف حقيقي على نمط `MockResizeObserver` المجاور، وحُذف التجاوز المكرر داخل `test/sticker-studio.test.tsx` | `frontend/test/setup.ts:9` ✅ |
| الاختبارات والبوابات | Vitest الكامل **150 ملفاً: 1356 ناجحة + 1 متخطاة (0 فاشلة)** — منها `test/font-selector` باثنتي عشرة حالة · Playwright `--list`: **237 حالة في 32 ملف مواصفة** · `tsc` صفر أخطاء · `eslint --max-warnings 0` نظيف على كل الملفات المعدّلة · Prettier مطابق · تحقق بصري في Chromium على خادم التطوير (وضعا الاستوديو: المعرض والتخصيص) في النمطين المضيء والداكن | الأوامر أعلاه ✅ |

**قرارات محمية بعد الجلسة:** منتقي الخطوط مكوّن واحد مشترك بين النص والملصق، وقائمة واحدة بلا تصنيفات ولا فلاتر (المفضّلة داخل الصف فقط) · كل قائمة منسدلة لخصائص النص من `Select` بـRadix بتنسيق Fluent، ولا `<select>` أصلي في لوحة الخصائص · كل معلومة تظهر مرة واحدة: اسم القالب في ترويسة الحوار، والمقاس في مسرح المعاينة، والقيم اللونية في التلميحات · شرائط التبويبات تسمية فقط بلا أيقونات · أي زر يخص نافذة (مثل «استعادة الافتراضي») يقع في شريط عنوان النافذة لا في جسم اللوحة.

**الفجوات المتبقية:** التحقق البصري النهائي على WebView2 في Windows مؤجل (كما في 1.36–1.38)، ولم يُشغَّل مجموعة Playwright محلياً (منع الـowner تشغيلها محلياً).

---

## 1.38 سجل ملاءمة النص ومحوّله ولوحة خصائصه — 22 أكتوبر 2026

**المرجع:** ملاحظتا المالك على لوحة خصائص النص: «الملائمة ومربع تحديد النص وتكيفه مع النص من اهم الاشياء التي يجب تطويرها واصلاحها في خطوتنا القادمة مع اصلاح واعادة تصميم خصائص»، ثم «اين ذهبت اركان مربع التحديد يبدو انه فارغ الان اركانه لا يمكن التحكم بها» بعد تقييد مقابض النص بالحواف الجانبية.

| البند | التنفيذ | الإثبات |
| --- | --- | --- |
| نموذج تحجيم موحّد | `textSizing: 'auto' | 'fixed'` في النوع والسكيما؛ `auto` يأخذ عرض أطول سطر (بحد أدنى 24px و95% من الورق)، و`fixed` يثبّت العرض ويلتف النص داخله. الارتفاع مشتق من المحتوى في الوضعين، والمستندات القديمة بلا حقل تُقرأ `fixed` | `frontend/src/lib/canvas/text-fit.ts:130` و`frontend/src/lib/store/types.ts` ✅ |
| توسّع حول المركز مع الدوران | تغيير عرض `auto` يُزاح الأصل بمقدار `−R(θ)·(Δw/2)` كي يبقى مركز الصندوق ثابتاً على أي زاوية؛ تُستهلك نفس المعادلة في العقدة والمحرر المباشر | `frontend/src/components/editor/konva/elements/text-node.tsx:228` و`frontend/src/components/editor/canvas/text-editing-overlay.tsx:270` ✅ |
| أركان محوّل النص | أُعيدت المقابض الثمانية كلها؛ الزوايا الأربع تُحجّم كتلة النص تناسبياً (`keepRatio` ثم تحويل مقياس العقدة إلى `fontSize` عند نهاية التحويل مع كتابة العرض بالنسبة نفسها كي تبقى نقاط الالتفاف)، ومنتصفات الحواف تغيّر العرض فقط مع تثبيت الارتفاع وإسقاط إزاحة الأصل على المحور المحلي x فتبقى الحافة العليا على خطها حتى مع تدوير العنصر | `frontend/src/components/editor/konva/elements/editor-transformer.tsx:272` و`frontend/src/components/editor/konva/layers/konva-overlay-layer.tsx:76` و`frontend/src/lib/canvas/transform-anchors.ts:9` ✅ |
| لوحة خصائص النص | إعادة تصميم كاملة في أربعة أقسام مسطّحة: الخط (المحدد/الوزن/الحجم/B/I/U/S/الحالة)، التنسيق (المحاذاة/لون النص/أرقام مشرقية)، الملاءمة (تلقائي/ثابت + التفاف عند الثبات)، والتباعد (ارتفاع السطر/تباعد الكلمات أو الحروف)؛ كل الأدوات h-8 وأزرار أيقونية بأسماء وصولية وتلميحات، والوصف في ترويسة اللوحة `48px · ملاءمة تلقائية`، مع تثبيت `dir="rtl"` على جذر تبويبات العنصر لأن Radix يفرض LTR افتراضياً فينقلب ترتيب الحقول | `frontend/src/components/editor/properties/panels/text/text-type-tab.tsx:84` و`frontend/src/components/editor/properties/element-properties.tsx:55` و`frontend/src/components/editor/panels/properties-panel.tsx` ✅ |
| تحرير مباشر متسق | المحرر يزامن العرض/الارتفاع أثناء الكتابة ويُلزم التغيير دفعة هندسة واحدة `{text, width, height, x, y}`، ويُطبّق الملاءمة التلقائية عند الطي | `frontend/src/components/editor/canvas/text-editing-overlay.tsx:270` ✅ |
| الاختبارات والبوابات | Vitest الكامل **149 ملفاً: 1331 ناجحة + 1 متخطاة (0 فاشلة)** بما فيها `test/text-fit` (3 حالات) وست حالات اتجاه في `text-render-state` · Playwright Chromium: `text-measure` **9/9** (قياس حقيقي + ملاءمة تلقائية + سحب ركن وتثبيت الارتفاع + عودة للحضن + سحب مقبض علوي بلا انزياح رأسي + حدود حبر النص المنحني + مطابقة إعادة الرسم عند مقياس النقطة 2×) و`panel-geometry` **6/6** و`transformer-box-follows-geometry` **1/1** · بعد تثبيت اتجاه التبويبات: 18 اختبار Vitest مستهدفاً و13 حالة Playwright (panel-geometry + text-measure + transformer-box + transformer-reselect) خضراء · `tsc` صفر أخطاء · `eslint` بلا تحذيرات · Prettier مطابق | الأوامر أعلاه ✅ |

**قرارات محمية بعد الجلسة:** `fitTextGeometry` هي مصدر هندسة النص الوحيد (العقدة/المتجر/المحرر/التصدير) · ارتفاع النص لا يُضبط يدوياً من المقابض ولا من لوحة الخصائص، بل من المحتوى · جميع مقابض المحوّل الثمانية تبقى ظاهرة للنص: الزوايا تُحجّم حجم الخط تناسبياً، ومنتصفات الحواف تغيّر العرض وتحوّل النص إلى `fixed` · العرض التلقائي محصور بين 24px و95% من عرض الورقة · أي مسار نصي جديد يجب أن يمرّ بـ `resolveTextSizing` و`clampAutoTextWidthPx` بدل حساب عرض محلي · أي `Tabs` يعرض محتوى عربياً يثبّت `dir="rtl"` على جذره (Radix يفرض LTR افتراضياً).

**الفجوات المتبقية:** النص المنحني ما زال سطراً واحداً (كما في 1.36)، والتحقق البصري النهائي على WebView2 في Windows مؤجل.

---

## 1.37 سجل جلسة تبويب النصوص النهائية — قائمة تسميات موحّدة وإزالة الحشو — 22 أكتوبر 2026

**المرجع:** متابعة مباشرة لنتيجة الجلسة 1.35 بعد ملاحظتين من المالك على اللقطات: «يجب توحيد التنسيق ما هذه الاحجام الغريبة» ثم «التسميات الرئيسية هي عنوان فرعي عنوان رئيسي وهكذا دون الحاجة الى اكثر من ذلك سيكون انظف». هذه النسخة تلغي قرارات 1.35 الخاصة بسبعة عشر نمطاً ومحرر النص السريع وبطاقات المعاينة، وتُبقي سلوك التطبيق على المحدد وزر الإدراج المنفصل.

| البند | التنفيذ | الإثبات |
| --- | --- | --- |
| كتالوج إدراج من سبعة أنماط | قائمة الإدراج: heading/subheading/body/caption ثم studio-date/photographer-tag/watermark. حُذفت gold-luxury وneon-glow و3d-title وoutline-modern وcongrats وsale-offer وcertificate وspecial-price وcaption-card؛ وبقيت badge وstamp-circle بوسم decorative للوحة الخصائص فقط، ويُطبَّقان من قسم «أنماط زخرفية» في تبويب خصائص النص عبر `applyTextPreset` | `frontend/src/lib/templates/text-presets.ts:13` و`:191` و`frontend/src/components/editor/properties/panels/text/text-type-tab.tsx` ✅ |
| قائمة صفوف موحّدة | صف واحد لكل نمط بارتفاع 32px وتسمية واحدة 12px بخط الواجهة، بلا نص معاينة ولا بيانات خط/سمك/مقاس ولا شريط فلاتر — التنظيم في مجموعتين: «أنماط النص» و«توثيق الاستوديو» | `frontend/src/components/editor/panels/freeform/freeform-text-tab.tsx:18` ✅ |
| إضافة وتحرير مباشر | زر «إضافة نص» واحد ينشئ مربعاً ويُركّز محرر النص المباشر فوراً؛ أُعيد معرّف العنصر من `addTextElement` لتحقيق ذلك | `freeform-text-tab.tsx:79` و`frontend/src/lib/store/slices/element/text-elements.ts:55` ✅ |
| تطبيق على المحدد بلا ازدواج | في وضع تحديد نص واحد تظهر شارة «سيُطبَّق النمط على المحدد»، وتُطبَّق أنماط الطباعة الأربعة على العنصر المحدد فقط مع حفظ النص والموضع، ويظهر زر + لإدراج عنصر جديد؛ كتل الاستوديو تُدرج دائماً | `freeform-text-tab.tsx:109` و`:125` ✅ |
| توافق الاختبارات | أُبقي `studio-elements-text` و`element-add-text-<preset>` (ومنها `element-add-text-heading`) ووُلّد اختبار مكوّن يثبت ظهور التسميات فقط وغياب الفلاتر/البيانات التقنية | `frontend/test/freeform-text-tab.test.tsx:8` ✅ |
| الاختبارات والبوابات | 20 اختبار Vitest مستهدفاً أخضر 100% · الشبكة الكاملة 148 ملفاً: **1322 ناجحة + 1 متخطاة** · Playwright Chromium **19/19** للسيناريوهات المتأثرة · `tsc` صفر أخطاء · `eslint` نظيف · Prettier مطابق · تحقق بصري في Chromium للوضعين المضيء والداكن ووضع التحديد | الأوامر أعلاه ✅ |

**قرارات محمية بعد الجلسة:** كتالوج الإدراج هو `INSERT_TEXT_PRESETS` المشتق من `TEXT_PRESETS` — سبعة أنماط فقط، والأنماط الزخرفية لا تظهر في التبويب · تسمية النمط وحدها هي محتوى الصف، بأسلوب موحّد بلا معاينات أو بيانات تقنية مكررة · الاستوديو كتل توثيق (تاريخ/حقوق مصور/علامة مائية) ولا تُعدَّل إلا من لوحة الخصائص · المعرّف المرجعي للاختبارات `element-add-text-heading` و`studio-elements-text` ثابتان · `addTextElement` يعيد معرّف العنصر ليبدأ التحرير المباشر، ولا تُطلق تلقائياً جلسة تحرير لأنماط الإدراج.

**تصحيح مؤرَّخ (2026-10-25 — الجلسة 1.45، بموافقة المالك الصريحة):** عُدل قرار كتالوج الإدراج أعلاه — صار تسعة أنماط تشمل الشارة والختم وكتل توثيق الاستوديو الثلاث، وأُزيل قسم «الأنماط الزخرفية» المنفصل من لوحة الخصائص، وصارت التسميات تُعرض بمعاينة بصرية حية. سبب التجاوز: طلب المالك تطوير التبويب صراحةً ثم موافقته على القرار المعروض في جلسة فحص جاهزية الرفع. القرار الجديد مُثبَّت في بلوك قرارات الجلسة 1.45.

**الفجوات المتبقية:** التحقق البصري النهائي على WebView2 في Windows ما يزال مؤجلاً (كما في 1.36).

---

## 1.36 سجل تدقيق وإصلاح محرك النصوص الشامل (Konva Text Parity) — 22 أكتوبر 2026

**المرجع:** استكمال طلب المالك «الان قم بعمل الاصلاح الشامل» بعد جولة توثيق Konva الرسمية ومراجعة كل مسارات النص الفعلية في المعاينة والتحرير والتصدير والطباعة.

| البند | التنفيذ | الإثبات |
| --- | --- | --- |
| دورة ارتفاع طبيعية بلا اقتطاع | القياس على عقدة `Konva.Text` معزولة `height='auto'` في `text-measure.ts`، والعرض بلا `height` ثابت مع إزاحة رأسية يدوية لـ top/middle/bottom، ومزامنة الارتفاع المخزَّن بمقارنة مباشرة مع `element.height` كي تبقى Undo/Redo سليمة | `frontend/src/lib/canvas/text-measure.ts:76` و `frontend/src/components/editor/konva/elements/text-node.tsx:134` ✅ |
| جاهزية الخطوط وإعادة القياس | كاش تحميل بمفتاح `family+weight+style`، انتظار الوجه الدقيق عبر `document.fonts.load`، دعم الخطوط المضمنة offline، تجاهل خطوط النظام، وإعادة القياس/الرسم عبر `fontEpoch` عند الجاهزية | `frontend/src/lib/io/fonts.ts:403` و `text-node.tsx:86` ✅ |
| تطابق محرر DOM مع الكانفس | حشوة الشارة تتمدّد للخارج مع إبقاء عرض المحتوى = عرض Konva، محاذاة رأسية مطابقة، أرقام مشرقية بعرض/حفظ متبادل، تدرج/صورة/حد/ظل في CSS، حماية IME، وتركيز مرة واحدة لكل جلسة | `frontend/src/components/editor/canvas/text-editing-overlay.tsx:106` ✅ |
| اتجاه أول محرف قوي | `resolveTextDirection` بدل «يحتوي عربي»، ويُستهلك في عقدة Konva و`ctx.direction` للتصدير و`dir` للمحرر؛ النص المختلط «Grido تصميم» يُعرض LTR و«تصميم Grido» RTL | `frontend/src/lib/canvas/text-helpers.ts:64` ✅ |
| تباعد العربية في الاتجاهين | تصفير التباعد العربي في `resolveTextRenderState`: الموجب يُعوَّض بمسافات كلمات، والسالب يُلغى حمايةً للوصلات؛ اللاتيني يبقى كما هو؛ أُزيلت معالجة `Math.min(0, …)` من الرسام المنحني | `text-helpers.ts:123` و `curved-text-utils.ts:287` ✅ |
| مسار التصدير الاحتياطي | كسر الكلمة الأعرض من السطر كما Konva، احترام `verticalAlign`، خط أساس ألفبائي بإزاحة (ascent−descent)/2 + lineHeight/2، تزيين `fontSize/15` مع إزاحة `fontSize/4`، ودمج `shadowOpacity` في لون الظل | `frontend/src/lib/canvas/text-layout.ts:82` و `frontend/src/lib/export/export-canvas-fitted.ts:176` ✅ — **تصحيح مؤرَّخ (2026-10-22 — الجلسة 1.38):** `verticalAlign` لم يبقَ مُستهلكاً في `text-layout.ts` ولا في المصدر الاحتياطي؛ الارتفاع يتبع المحتوى والحقل `textVerticalAlign` مهجور للتوافق مع الملفات القديمة فقط، وما ورد يصف حالة الجلسة 1.36 تاريخياً. |
| النص المنحني | حدود موحدة عبر كانفاس مؤقت يُعاد استخدامه (فلتر واحد على الصورة كاملة بدل فلتر لكل حرف)، اتجاه أول محرف قوي، وعكس المقاطع المخالفة لاتجاه الفقرة لترتيب bidi مبسّط (عربي/لاتيني/أرقام) | `frontend/src/lib/canvas/curved-text-utils.ts:240` ✅ |
| الاختبارات والبوابات | Vitest الكامل 147 ملفاً: **1323 ناجح + 1 متخطى** · Playwright Chromium للنصوص **3/3** (بما فيها قياس حقيقي وحدود مقوّسة) · `tsc` صفر أخطاء · `eslint` كامل بلا تحذيرات · Prettier نظيف للملفات المعدلة | الأوامر أعلاه ✅ |

**قرارات محمية بعد الجلسة:** `measureTextHeightPx` هو مصدر الحقيقة لقياس النص · لا يُمرَّر `height` ثابت إلى عقدة Konva.Text مهما كانت المحاذاة الرأسية · تباعد العربية يُصفَّر في الاتجاهين من الحالة المشتركة فقط · النص المنحني يطبّق فلتر الحدود على اتحاد الحروف عبر كانفاس وسيط · أي مسار نصي جديد يجب أن يستهلك `resolveTextRenderState` و`resolveTextDirection` بدل منطق محلي.

**الفجوات المتبقية:** النص المنحني ما زال سطراً واحداً بلا `lineHeight`/`textDecoration` (و`verticalAlign` لم يعد ذا معنى بعد نموذج الارتفاع المشتق)، وbidi فيه مبسّط لا يغطي كل حالات UAX #9 داخل المقطع (اتجاه الفقرة نفسه صار يتبع أول حرف قوي صحيحاً في الجلسة 1.38).

---

## 1.35 سجل جلسة إعادة هيكلة وبناء تبويب النصوص واستوديو الطباعة الحرة بهوية فاخرة — 22 أكتوبر 2026

**المرجع:** طلب المالك — «تبويب النصوص يحتاج الى اعادة هيكلة كاملة وازالة اي عناصر لا ترقى لمستوى التطبيق وعناصر حشو فقط وتطوير الميزات بشكل جيد واحترافي بما يتلائم مع جودة التطبيق»، وتصحيح وإصلاح تشويه محاولة الوكيل السابق الذي حوّل التبويب إلى استمارة رمادية غير ملائمة.

| البند | التنفيذ | الإثبات |
| --- | --- | --- |
| استئصال الرموز التعبيرية القديمة والتأثيرات البدائية | تطهير كتالوج وبطاقات النصوص الجاهزة من الرموز التعبيرية غير الملائمة (🔥، 🎉، 🏷️، 📜) واستبدالها بنصوص وهوامش فاخرة وأختام رسمية متناسقة مع استوديوهات التصوير والمطابع (تهنئة ملكية، باقة تسعير، شهادة تقدير، عروض الموسم) | `frontend/src/lib/templates/text-presets.ts:303` و `frontend/src/components/editor/panels/freeform/freeform-text-tab.tsx:32` ✅ |
| معاينات بصرية فائقة الدقة (WYSIWYG Previews) | تصميم بطاقات معاينة حية واقعية بدقة CSS فائقة الخفة بدون حشو: فويل ذهبي ملكي، نيون استوديو أزرق متوهج، نص مجسم ثلاثي الأبعاد، خط خارجي مفرغ، ختم مقوس بـ Reem Kufi، كبسولة زرقاء، وتوثيق تاريخ وبصمة المصور | `frontend/src/components/editor/panels/freeform/freeform-text-tab.tsx:32` ✅ |
| محرر النصوص السريع (Quick Composer) | شريط إدخال نصي رشيق (32px) في أعلى اللوحة بأيقونة `TextT` وزر مسح سريع، يتيح كتابة نص مخصص قبل النقر على أي نمط ليُدرج به مباشرة بدلاً من النص الافتراضي | `frontend/src/components/editor/panels/freeform/freeform-text-tab.tsx:288` ✅ |
| الكشف الذكي والتطبيق المباشر على النص المحدد | فحص لحظي لوجود عنصر نصي محدد على الكانفاس (`selectedTextElement`): إظهار شارة سياقية ذكية وتطبيق النمط فوراً عليه بنقرة واحدة عبر `applyTextPreset` مع حفظ محتواه وموقعه، أو إدراج عنصر جديد في المنتصف أو عبر زر `+` | `frontend/src/lib/store/slices/element/text-elements.ts:119` و `frontend/src/components/editor/panels/freeform/freeform-text-tab.tsx:265` ✅ |
| الحفاظ على التوافق الكامل واختبارات E2E | الحفاظ على كافة المفاتيح الـ 17 للأنماط وتفويض `activeCategory === 'text'` في `FreeformElementsTab` لمكون `FreeformTextTab` المستقل، مع تثبيت `data-testid="studio-elements-text"` و`element-add-text-heading` لضمان نجاح كافة سيناريوهات Playwright السحابية | `frontend/src/components/editor/panels/freeform/freeform-elements-tab.tsx:70` و `frontend/src/components/editor/panels/freeform/freeform-studio-panel.tsx:26` ✅ |
| الاختبارات والبوابات | 21 اختبار Vitest مستهدفاً أخضر 100% · `typecheck` صفر أخطاء · `eslint` صفر تحذيرات · `prettier` مطابق 100% · `docs-gate.mjs --strict-refs` أخضر بـ 53 تأكيداً | الأوامر وسجل الاختبارات ✅ |

**قرارات محمية بعد الجلسة:** تبويب النصوص مستقل في `freeform-text-tab.tsx` ويُفوَّض إليه من `freeform-elements-tab.tsx` لحظر الازدواجية · كتالوج النصوص في `text-presets.ts` هو المصدر الوحيد للحقيقة · حظر الرموز التعبيرية غير اللائقة في أنماط النصوص · النقر على النمط يطبقه على النص المحدد إن وُجد ويُدرج جديداً إن لم يوجد، وزر `+` يفرض إدراج عنصر جديد دائماً.

**الفجوات المتبقية:** التحقق البصري النهائي على WebView2 في Windows قيد المراقبة السحابية.

---

## 1.34 سجل جلسة إصلاح انحرافَي بوابة CI اللذين لم تكشفهما الاستهدافات — 22 أكتوبر 2026

**المرجع:** فشل وظيفة **Frontend Quality & Tests** في شغّل CI `39779445217` على الكومت `5d10b8c` — خطوة «Run Frontend Unit Tests & Coverage» وحدها، بينما نجحت بوابة التوثيق وبناء Windows ودخان WebKit وثلاث من أربع دُفعات E2E.

| البند | التنفيذ | الإثبات |
| --- | --- | --- |
| حجم خط اعتباطي في اللوحة الجديدة | `text-[9px]` في وسم الترقيم (خريطة النتيجة وشريط الصور) يخالف حارس R-series الذي يفرض مقياس `--text-*` حصراً — استُبدل بـ`text-2xs` وهو `9px` بعينه في المقياس، فبقي المظهر بلا تغيير وزال الانحراف | `frontend/src/components/editor/panels/collage/collage-autofill-tab.tsx:304` و`:460` ✅ |
| حارس يثبّت جرداً لا سلوكاً | `icon-size-resolution` كان يفترض شبكة 24 لأيقونة `Sparkle`؛ المولّد أسقطها عن استحقاق لأن كل استعمالات `Sparkle` في `src` عند 12/14/15/16px (الماسح usage-driven والملف مُولَّد لا يُعدَّل يدوياً، وإعادة توليده أعادت نفس الجرد) — صار التأكيد يقيس نية الحارس الأصلية: أولوية خاصية `size` على الأصناف بشبكة متاحة فعلاً (20 مقابل صنف 14) | `frontend/test/icon-size-resolution.test.tsx:75` ✅ |
| سبب عدم الكشف محلياً | الجلستان 1.32 و1.33 شغّلتا استهدافاً فقط وصرّحتا في «الفجوات المتبقية» أن الشبكة الكاملة لم تُعَد — الفجوة نفسها هي ما كشفه CI، وأُغلقت بتشغيل الشبكة محلياً | سجلّا الجلستين أعلاه ✅ |
| الشبكة الكاملة | **147 ملفاً: 1304 ناجحة + 1 متخطاة و0 فاشلة** والتغطية 56.03% عبارات (عتبات CI محفوظة بخروج نظيف) | `npm run test:coverage` ✅ |
| البوابات | `npm run lint` و`npm run format:check` نظيفتان محلياً على أوامر CI نفسها، والاستهداف على الحارسين 8/8 وعلى اختبارات التعبئة 25/25 | الأوامر أعلاه ✅ |

**قرارات محمية بعد الجلسة:** `src/components/ui/icons.tsx` مُولَّد — لا يُصلَح يدوياً، وأي حارس فيه يحاكي الجرد الذي ينتجه المولّد عند أحجام الاستعمال الفعلية · حارس `ui-compliance-guard` يمنع `text-[Npx]` بلا استثناء للوحات الجديدة، والمقياس `--text-*` يغطي 8/9/10/11px عبر `3xs/2xs/micro/mini` · تعديل ثابت في اختبار جائز فقط حين يكون التثبيت على جرد لا على سلوك، وتُذكر نية الحارس في التعليق نفسه · لا تُغلَق فجوة «الشبكة الكاملة» بالاعتماد على استهدافات عند ادعاء نجاح البوابات.

**الفجوات المتبقية:** اخضرار CI متوقّف على دفع الإصلاح · التحقق البصري على WebView2 الأصلي ما يزال مؤجلاً · دُفعة E2E الأولى كانت قيد التشغيل وقت هذه الجلسة (الثلاث الأخرى نجحت).

---

## 1.33 سجل جلسة إعادة بناء لوحة «تعبئة وفرز الخانات» — 22 أكتوبر 2026

**المرجع:** طلب المالك مع لقطة للوحة: «تعبئة وفرز الخانات يحتاج إلى تحسين بصري وتحسين أداء ومنطق وإصلاح آلية». النطاق المعتمَد من المالك عبر أسئلة الحصر: **إعادة بناء اللوحة** (لا تلميع جزئي)، و«الفرز» يعني **فرز الخانات** فقط (صفوف/أعمدة) لا فرز الصور بالاسم أو التاريخ، وألم الأداء هو **استيراد مجلد كبير (100+ صورة)**.

| البند | التنفيذ | الإثبات |
| --- | --- | --- |
| ترتيب التعبئة بالهندسة | صار ترتيب الخانات يُستنبط من إحداثياتها (تقريب ×1000 ثم فرز فريد للمحاور، والأول يفوز عند تداخل المركزين) بدل الاعتماد على `cellIndex` — الذي كان يقلب الترتيب بعد تبديل المحاور أو تغيير القالب؛ «صفوف» = صفوف خارجية وأعمدة تصاعدية، و«أعمدة» = أعمدة خارجية وصفوف تصاعدية | `frontend/src/components/editor/panels/collage/collage-autofill-plan.ts:84` و`:107` ✅ |
| خلط غير منحاز وقابل للمعاينة | استُبدل `sort(() => Math.random()-0.5)` بـFisher–Yates على مولّد Mulberry32 ببذرة، بلا تعديل للمدخل، مع زر «خلط جديد» يرفع البذرة؛ صار الخلط مُعاَناً في الخريطة قبل التطبيق | `collage-autofill-plan.ts:129` و`:141` ✅ |
| خريطة النتيجة الحيّة | شبكة بمحاذاة اللوحة (`dir="ltr"` لأن اللوحة يسار-يمين في حين الواجهة RTL) تعرض مصغّرة الصورة ورقم ترتيب التعبئة في كل خانة، وتُميّز الباهت (تبقى) والمتقطع (بلا صورة)، مع شارة ملخّص `صفوف×أعمدة · تُملأ · تبقى · بلا صورة` — زال التطبيق الأعمى | `collage-autofill-tab.tsx:613` ✅ |
| لا إسقاط ولا استبدال بصمت | الخطة تُرجع إحصاءات صريحة (تُملأ/تبقى/تُستبدل/تُترك بلا صورة/التكرارات)، وتحتها سطر تحذير كهرماني قبل التطبيق وسبب التعطيل ظاهر بدل تلميح فقط | `collage-autofill-plan.ts:197` + `collage-autofill-tab.tsx:153` و`:707` ✅ |
| قائمة صور الجلسة | `autofillImages` انتقلت إلى المتجر فتبقى عند تبديل التبويبات وتُصفَّر مع `reset()` فقط (لا تُحفظ في ملف المشروع)؛ الشريط مرقّم ويسحب أفقياً وبـAlt+الأسهم ويُحذف منه، بحد 500 صورة وإزالة تكرار عند الاستيراد وإعلان التجاوز، وعرض 24 مصغّرة + «عرض الكل» | `frontend/src/lib/store/slices/collage-slice.ts:174` + `frontend/src/lib/store/slices/core-slice.ts:369` + `collage-autofill-tab.tsx:70` ✅ |
| أداء الدفعة | `setSlotImagesBatch` صارت O(n+m) بخرائط بدل بحث متكرر لكل تعيين، ولا تصفير لفلاتر خانة لم تتغيّر، وإعادة تطبيق توزيع مطابق لا تملأ سجل التراجع ولا تُعيد ضبط شيء | `frontend/src/lib/store/slices/collage-slice.ts:349` + `collage-autofill-tab.tsx:228` ✅ |
| مصغّرات الخريطة | تحت 48 خانة تُعرض مصغّرات Go بعرض 128px، وفوقها الأرقام فقط حتى لا يُفكَّ مئات الصور في مخطط صغير | `collage-autofill-tab.tsx:72` ✅ |
| الاختبارات | ملفان جديدان: `collage-autofill-plan.test.ts` **14 حالة** (الهندسة مقابل `cellIndex`، الصفوف/الأعمدة، تقريب الإحداثيات العشرية، الحصر بلا تكرار وإحصاءاته، ثبات البذرة، إزالة التكرار والتجاوز، النقل) و`collage-autofill-tab.test.tsx` **11 حالة** (الخريطة وتطبيق الفارغة فقط والتكرار والحذف وإعادة الترتيب والسقف البصري وعدم ملء السجل) — الاستهداف **25/25** | `frontend/test/collage-autofill-plan.test.ts` + `frontend/test/collage-autofill-tab.test.tsx` ✅ |
| البوابات | `tsc --noEmit` و`eslint --max-warnings 0` و`prettier --check` نظيفة على الملفات الأربعة، والتحقق البصري في Chromium وFirefox وWebKit بمحاكاة جسر Wails (6 صور SVG على شبكة 4×2): الخريطة تطابق اللوحة، و«بلا صورة 2» مع تحذيرها، و«تكررت 2» بعد التطبيق، وسبب التعطيل ظاهر بعد الامتلاء — ثم حُذف ملف التحقق المؤقت | الأوامر أعلاه ✅ |

**قرارات محمية بعد الجلسة:** ترتيب التعبئة هندسي دائماً — لا يعود إلى `cellIndex` · الخريطة معاينة إلزامية قبل التوزيع ولا تطبيق أعمى · قائمة الصور حالة جلسة في المتجر ولا تدخل ملف المشروع · سقف 500 صورة و24 مصغّرة ظاهرة — رفع أيٍّ منهما يحتاج موافقة المالك · إعادة تطبيق توزيع مطابق لا تُسجَّل في التراجع · فرز الصور بالاسم/التاريخ خارج النطاق المعتمد.

**الفجوات المتبقية:** التحقق البصري على WebView2 الأصلي مؤجل (المتصفح + محاكاة الجسر فقط) · الشبكة الكاملة لـVitest وE2E لم تُعَد محلياً (تُشغَّل في CI) · الأداء على مجلد 100+ صورة مُثبَّت بالحدود والسقوف لا بقياس زمني حقيقي.

---

## 1.32 سجل جلسة تقليم تدقيق الأيقونات والزيادات البصرية — 22 أكتوبر 2026

**المرجع:** تقرير خبير بصري على الواجهة وفق Fluent 2 ومبدأَي «صفر حشو» و«تقليل النصوص»، دقّقه المالك بنداً بنداً فوافق على أربعة تغييرات متحقق منها فقط بعد استبعاد ما هو منفَّذ أصلاً أو مُقرأ خطأً.

| البند | التنفيذ | الإثبات |
| --- | --- | --- |
| إزالة رمز الشخص المكرر | حُذف رمز الرأس والكتفين المتطابق من بطاقات مقاس الصورة؛ بقي إطار النسبة وحده مُميِّزاً بين الخيارات (البطاقة الحرّة تحتفظ بـ`CornersOut`) — فلا نقض لقرار 1.26 لأن الأيقونة المكررة لا تفرّق بين شيء | `frontend/src/components/editor/panels/collage/collage-custom-grid-tab.tsx:96` ✅ |
| إزالة شارة العدد المكررة | حُذفت شارة عدد صور الشبكة الحالية من رأس القسم (العدد مشتق من الصفوف×الأعمدة الظاهرة أسفلها)، وبقي الحد الأقصى مرة واحدة في العنوان الفرعي بلا تكراره بين قوسين، وبقيت شارة نسبة التغطية لأنها معلومة غير مشتقة | `frontend/src/components/editor/panels/collage/collage-custom-grid-tab.tsx:274` و`:287` ✅ |
| فصل دلالة حفظ القالب | صار «حفظ كقالب» أيقونة `BookmarkSimple` في كل حالاتها (زراً ونموذج حفظ)، فلم يبقَ `FloppyDisk` إلا لحفظ المشروع في شريط الأدوات — وهي الدلالة نفسها المستخدمة لـ«قوالبي» في خصائص الملصقات | `frontend/src/components/editor/panels/collage/collage-custom-grid-tab.tsx:651` و`:677` و`:704` ✅ |
| عينات لون سريعة مركّزة | قلّت العينات من ثمانٍ إلى أربع (أسود/أبيض/أحمر/أزرق) بدل تكديس درجة رمادية ثانية لكل لون — تجاوز مقصود ومُعتمد من المالك لتفصيل جلسة 1.28 «ثماني عينات موزّعة»، والمنتقي الكامل يبقى من الرقعة نفسها | `frontend/src/components/editor/properties/color-panel.tsx:12` ✅ |
| أهداف لمس 28px | عينات اللون صارت أزراراً `h-7 w-7` (النقطة الداخلية 16px) بدل 16px، وزر إعادة تعيين المنزلق صار `h-7 w-7` بدل 24px — امتثالاً لقاعدة الحد الأدنى التفاعلي في `ui-ux-fluent.md` مع بقاء ظهوره شرطياً عند اختلاف القيمة | `frontend/src/components/editor/properties/color-panel.tsx:144` + `frontend/src/components/ui/blocks/fluent-slider-field.tsx:267` ✅ |
| الاختبارات | تأكيد غياب شارة العدد المكررة ووجود أربع عينات لونية فقط في الاختبارين المستهدفين | `frontend/test/collage-custom-grid-tab.test.tsx:42` + `frontend/test/color-panel.test.tsx:16` ✅ |
| البوابات | `typecheck` و`lint` و`prettier --check` نظيفة، والاستهداف **13/13** (10 collage-custom-grid + 3 color-panel)، وE2E مؤجل إلى CI وفق قاعدة منع Playwright محلياً | الأوامر أعلاه ✅ |

**قرارات محمية بعد الجلسة:** إطار النسبة (والرمز الحر `CornersOut`) هو مُميِّز بطاقات مقاس الصورة — لا يعود رمز الرأس والكتفين المتطابق داخل كل بطاقة · الحد الأقصى للصور يُذكر مرة واحدة في عنوان القسم ولا يُكرَّر في شارة أو بين قوسين · شارة رأس القسم تعرض نسبة التغطية فقط لأنها غير مشتقة مما حولها · `FloppyDisk` محجوز لحفظ المشروع، وحفظ قوالب الكولاج بـ`BookmarkSimple` · العينات السريعة أربع بحد أقصى بأهداف 28px — الزيادة تحتاج موافقة المالك · المنتقي الكامل يبقى مدخله الوحيد الرقعة الحالية (قرار 1.28 ساري).

**الفجوات المتبقية:** التحقق البصري على WebView2 مؤجل · الشبكة الكاملة لـVitest وE2E لم تُعَد محلياً (تُشغَّل في CI).

---

## 1.31 سجل جلسة نظام الطبقات الاحترافي: دمج منطقي وتسطيح وتسمية وترتيب — 22 أكتوبر 2026

**المرجع:** طلب المالك — إضافة خصائص أنظمة الطبقات العالمية: تكوين أشكال جديدة من الأشكال القياسية ومعاملتها كشكل واحد، مع خصائص احترافية أخرى.

| البند | التنفيذ | الإثبات |
| --- | --- | --- |
| محرك العمليات المنطقية | `path-bool@1.0.4` مع تحويل كل شكل قياسي (مستطيل/دائرة/حلقة/نجمة/مضلع/سهم…) إلى مقاطع `CubicSeg` منسّبة لإحداثيات الورقة، ثم اتحاد/طرح/تقاطع/استثناء يُنتج مساراً واحداً | `frontend/src/lib/canvas/path-boolean.ts:1` + `frontend/src/lib/canvas/shape-to-path.ts:1` ✅ |
| طبقة ناتجة قابلة للتحرير | عنصر واحد `shape='path'` يرث طلاء الطبقة الأمامية (تعبئة/تدرج/صورة/حد/ظل) وترتيبها، ويُحذف المصدر ويُحدَّد الناتج في خطوة تراجع واحدة | `frontend/src/lib/store/slices/element/merge.ts:85` ✅ |
| تسطيح كصورة | تحديد مختلط (صور/نصوص/أشكال) يُلتقط من محرّك Konva بدقة الورقة كاملة مع إخفاء غير المحدد واستعادته في `finally`، ويُنتج عنصر صورة واحداً — متاح في الوضع الحر فقط | `frontend/src/lib/store/slices/element/merge.ts:138` ✅ |
| إعادة التسمية وخطوة الترتيب | `name` مُصرَّح في Zod فيصمد عبر الحفظ، و`bringForward`/`sendBackward` بخطوة واحدة مع تعطيل عند الحدود ودفعة تاريخ واحدة | `frontend/src/lib/store/slices/element/crud.ts:193` + `frontend/src/lib/store/slices/element/selection.ts:58` + `frontend/src/lib/schema.ts:118` ✅ |
| واجهة اللوحة والأيقونات | قائمة «دمج الطبقات المحددة» في شريط التحديد بأيقونات Fluent دلالية (`ShapeUnion/ShapeSubtract/ShapeIntersect/ShapeExclude/ImageStack`)، وقائمة السطر بأيقونة `RenameA` وسهمَي خطوة | `frontend/src/components/editor/panels/freeform/freeform-layers-tab.tsx:304` + `frontend/src/components/editor/properties/layers-list.tsx:410` ✅ |
| توحيد حدود المسار للتصدير | حدود `svgPath` انتقلت من `shape-node` المحلي إلى مصدر مشترك يستخدمه Konva والتصدير الاحتياطي — فلا يتضاعف مقياس الشكل المدموج ولا ينزاح في المخرجات | `frontend/src/lib/canvas/svg-path-bounds.ts:1` + `frontend/src/lib/export/export-canvas-fitted.ts:325` ✅ |
| التحقق | 33/33 اختبار (23 هندسة دمج + 10 عقد ستور تشمل دورة Save/Load فعلية عبر `serializeEditorState`/`deserializeProjectFile`)؛ ومسبار E2E محلي مؤقت أثبت تصدير PNG بمقاس **2480×3508** (=A4 عند 300 DPI) مع `dpi=300` في طلب الحفظ، وبكسل أزرق في المركز وأبيض في الزاوية، وتسطيحاً إلى صف صورة واحد ثم تراجعاً إلى صفين — ثم حُذف المسبار بعد التحقق | `frontend/src/lib/canvas/shape-merge.test.ts:1` + `frontend/src/lib/store/element-slice-merge.test.ts:1` ✅ |

**قرارات محمية بعد الجلسة:** الدمج المنطقي للأشكال المتجهة فقط ويُرفض للنصوص/الصور بتلميح يوجّه إلى التسطيح · الطبقات المخفية مستبعدة من كل عمليات الدمج · التسطيح في الوضع الحر فقط · الشكل المدموج يبقى `shape='path'` + `svgPath` فلا يحتاج Backend ولا تغييراً في صيغة الحفظ · لا تُضاف العلامة المائية لأي مسار تصدير.

**الفجوات المتبقية:** لم يُشغَّل تطبيق Wails الفعلي للتحقق من حقن DPI داخل بايتات Go ومسار الحفظ الأصلي — التحقق جرى في Chromium عبر محاكي Wails؛ ولم يُحفظ اختبار E2E دائم لهذه الميزة (المسبار المؤقت حُذف). الشبكة الكاملة Vitest/E2E لم تُعَد محلياً.

---

## 1.30 سجل جلسة إصلاح مهلة تحميل OpenCV داخل العامل — 22 أكتوبر 2026

**المرجع:** طلب المالك — «اصلح المشاكل» بعد فشل دورة CI على التزام الإصدار v1.22.0 (`detector-worker-probe.spec.ts:71` توقّع `documents.length > 0` واستلم 0، والعامل سجّل `{"type":"opencv-success","result":null}` خلال 11 ثانية).

| البند | التنفيذ | الإثبات |
| --- | --- | --- |
| تشخيص السبب الجذري | مسبار الجدوى `cv-worker-probe` أثبت أنّ OpenCV يعمل داخل العامل لكنّ تهيئته الباردة في CI استغرقت **44.7 ثانية**، بينما سقف `LOAD_TIMEOUT_MS = 10_000` في المُحمِّل كان يُرجع `null` قبل اكتمال `onRuntimeInitialized` — أي أنّ الفشل مهلة تحميل لا خلل كشف | `frontend/e2e/cv-worker-probe.spec.ts:1` + `frontend/src/components/editor/document-scanner/opencv-loader.ts:24` ✅ |
| مهلة تحميل قابلة للضبط | `loadOpenCV(timeoutMs = LOAD_TIMEOUT_MS)` صار يقبل ميزانية خاصة بكل مستدعٍ، وكلا المؤقّتين الداخليين (سباق `import('@techstark/opencv-js')` وانتظار `onRuntimeInitialized`) يستخدمانها بدل الثابت | `frontend/src/components/editor/document-scanner/opencv-loader.ts:59` ✅ |
| ميزانية العامل 90 ثانية | ثابت جديد `WORKER_LOAD_TIMEOUT_MS = 90_000` يُمرَّر في مسارَي العامل: طلب `opencv` عبر `detectDocumentsWithOpenCVFromImageData(..., loadTimeoutMs)` وطلب `warmup` — فالمحرك لا يُجهض قبل اكتمال التهيئة، والتحضير المسبق ينجح أخيراً على الآلات البطيئة بدل إعادة المحاولة الفاشلة | `frontend/src/components/editor/document-scanner/opencv-loader.ts:29` + `frontend/src/workers/document-detector.worker.ts:78` و`:92` + `frontend/src/components/editor/document-scanner/core/opencv-detector.ts:175` و`:180` ✅ |
| ثبات تجربة المستخدم | لم يتغيّر أي سقف يشعر به المستخدم: `OPENCV_WORKER_TIMEOUT_MS = 4000` في `document-detector` ما يزال يُسابق العامل ويكمل بهرم الرؤية النقية (JS) عند التجاوز، ومسار الخيط الرئيسي بلا عامل بقي عند 1200ms — فزيادة الميزانية تخدم نجاح الكشف اللاحق لا زمن الاستجابة | `frontend/src/components/editor/document-scanner/core/document-detector.ts:654` ✅ |
| الإصدار v1.22.0 | رُفع الوسم ونُشر الإصدار بعد اخضرار CI: بوابة «CI Health Gate» رفضت النشر أولاً على `c365fdf` لأن الدورة 39676734622 فشلت، ثم أعيد تشغيل الدورة والدورة الفرعية فنُشر `Grido Studio Release v1.22.0` بالأصول الأربعة (`GridoStudio.exe` و`GridoStudio-installer.exe` و`Grido.Studio.Setup.exe` و`grido-checksums.txt`) | `gh release view v1.22.0` — <https://github.com/wisam79/grido/releases/tag/v1.22.0> ✅ |
| البوابات | `typecheck` و`lint` و`format:check` نظيفة، والاستهداف **8/8** في `opencv-detector.test.ts`؛ وE2E مؤجل إلى CI وفق قاعدة منع Playwright محلياً | الأوامر أعلاه ✅ |

**قرارات محمية بعد الجلسة:** مهلة تحميل WASM في العامل (90 ثانية) منفصلة عن سقف تجربة المستخدم (4 ثوانٍ في `document-detector`) — لا يُخفض الأول ولا يُرفع الثاني بلا قياس · المُحمِّل يبقى كسولاً (بلا تحضير تلقائي على الإقلاع) وحفظ الذاكرة مقدّم على سرعة أول كشف · فشل العامل يسقط دائماً إلى هرم الرؤية النقية ولا يُحمّل WASM على الخيط الرئيسي إلا عند غياب `Worker` كلياً.

**الفجوات المتبقية:** الإصلاح لم يدخل v1.22.0 (الوسم على `c365fdf` قبله) — يحتاج إصدار ترقيعي v1.22.1 بموافقة المالك · التحقق من نجاح المسبار في CI بعد الدفع · الشبكة الكاملة لـVitest وE2E لم تُعَد محلياً.

---

## 1.29 سجل جلسة نقل أدوات الإضافة وإزالة وجهة المقاسات — 21 أكتوبر 2026

**المرجع:** طلب المالك — «حتى تبويب مقاسات الورق في الشريط الجانبي لا أرى له أي داعي بما أن جهة الخصائص تتكفل بالأمر... من الممكن أن ننقل الأدوات إلى الشريط الجانبي (إضافة نص وشكل وملصق) ونوفر مساحة في شريط الأدوات». وبعد تنفيذ أولي جمع الإدراج في سطح موحّد، صحّح المالك الفهم: «كنت أقصد أن نقوم بعمل تبويب خاص لكل واحدة في الشريط الجانبي»، ثم حدّد المقصود بصرياً: «الشريط الجانبي هو هذا المنطقة باللون الأحمر» — أي شريط الأيقونات الرأسي نفسه. وأخيراً طلب «يكفي عرض الأشكال بدون الأسماء»، ثم «رتب الأشكال على عمودين...» وانتهى إلى ثلاثة أعمدة، وختم: «تبويب الطبقات يجب ان يكون التبويب الاول في الشريط الجانبي ونفس الايقونة الشبحية المستخدمة في الداخل يجب ان تستخدمها للشريط الجانبي بدل الحالية».

| البند | التنفيذ | الإثبات |
| --- | --- | --- |
| إزالة وجهة المقاسات | حُذفت وجهة مقاسات الورق من الشريط الجانبي وحُذف تبويب القوالب وملفه `freeform-presets-tab.tsx` وقائمة `CANVAS_SIZE_PRESETS`، مع ترحيل `migrateLegacyStudioTab` للقيم القديمة (`elements`/`presets` → `stickers`) | `frontend/src/lib/workspace-tools.ts:43` و`:46` ✅ |
| دمج المقاسين الفريدين | نُقل مقاس 15×20 سم (152×203 مم، «6×8″») إلى `PAPER_SIZES` وكارت العمل 90×50 مم إلى `CARD_AND_LABEL_SIZES`، فلا يضيع أي مقاس بحذف الوجهة — بقية المقاسات موجودة أصلاً في لوحة الخصائص وكتالوج الورق | `frontend/src/lib/templates/constants.ts:29` و`:76` ✅ |
| أربعة أزرار إدراج مستقلة | صار لكل أداة زرها في شريط الأيقونات نفسه، و«الطبقات» أولها بأيقونة `Layer` الشبحية نفسها المستخدمة داخل اللوح، ثم «الملصقات» و«الأشكال» و«النصوص» (`STUDIO_SECTIONS` بأربع وجهات، كل وجهة بتبويب واحد ولوح مباشر)، وحُذف سطح «العناصر» الموحّد وشريط التبويبات الداخلي، وعنوان اللوح يتبع الأداة | `frontend/src/lib/workspace-tools.ts:43` و`:228` + `frontend/src/components/editor/workspace/workspace-panel-rail.tsx:486` + `freeform-studio-panel.tsx:20` ✅ |
| كتالوج أشكال بلا أسماء | أُزيلت أسماء الأشكال من بطاقات الكتالوج — الرمز وحده يكفي — ورُتّبت على ثلاثة أعمدة برموز أكبر (خلية 48px ورمز 24px) لتكون واضحة بنظرة، مع `title` و`aria-label` على كل زر للحفاظ على التلميح والوصف الوصولي | `frontend/src/components/editor/panels/freeform/freeform-elements-tab.tsx:497` و`:505` ✅ |
| إتاحة الإدراج في المسار السريع | المسار السريع يبدأ من «الطبقات» ولا يخفي أي أداة: `getStudioSectionsForWorkflow` يعيد الوجهات الأربعة كما هي، و`getDefaultStudioTab('quick')` يختار البداية فقط | `frontend/src/lib/workspace-tools.ts:280` و`:295` + `frontend/src/hooks/use-workspace-panels.ts:79` ✅ |
| استوديو ملصقات دائم | انتقل مالك الحوار ومستمعا `grido:open-stickers-dialog` و`grido:reedit-sticker-element` والتحميل المسبق إلى `StickerStudioHost` المركّب في `AppDialogsHost` الدائم، فبقي الفتح من زر الملصقات ولوحة الأدوات والقائمة، وإعادة التحرير من قائمة الكانفاس | `frontend/src/components/editor/dialogs/sticker-studio-host.tsx:1` + `frontend/src/components/editor/workspace/app-dialogs-host.tsx:84` ✅ |
| تنظيف شريط الأدوات | حُذفت مجموعة الإضافة من الشريط وملفاتها الثلاثة (`toolbar-add-tools.tsx` و`toolbar-add-text.tsx` و`toolbar-add-shapes.tsx`)، ونُقل ناقل إعادة تحرير الملصقات إلى مجلد الحوارات، فصار الشريط: ملف | تراجع/إعادة | نقل للكولاج | `frontend/src/components/editor/toolbar/toolbar.tsx` ✅ |
| الاختبارات وE2E | `workspace-tools` (**35/35**) و`editor-store` (11/11) و`layers-list` (7/7) تؤكد الأزرار الأربعة وغياب السطح الموحّد؛ ومساعد `openStudioElementsCategory` (بأنواع `stickers`/`shapes`/`text`) يفتح `rail-studio-<category>` ويتحقق من لوحه، ومواصفة الاستوديو تتحقق من الأزرار الأربعة وغياب `segmented-*` | `frontend/test/workspace-tools.test.ts:102` + `frontend/e2e/helpers/studio-elements.ts:11` + `frontend/e2e/studio-panels.spec.ts:12` ✅ |
| البوابات | `typecheck` و`lint` و`format:check` نظيفة، والاستهداف **81/81** في 9 ملفات (35 workspace-tools + 11 editor-store + 7 layers-list + 4 text-preset-catalog + 3 shape-catalog + 13 element-slice + 1 canvas-color-deck + 4 toolbar-height-uniformity + 3 ui-compliance-guard)، وE2E مؤجل إلى CI وفق قاعدة منع Playwright محلياً | الأوامر أعلاه ✅ |
| إصلاح CI بعد الدفع | بعد فشل `Frontend Quality & Tests` و`Playwright E2E (Shard 2/4)`: حُدّث `App.test` ليتحقق من لوح «الملصقات» الافتراضي بدل نص التبويبات المحذوف، وأُزيل الاقتطاع من معاينات الأنماط النصية (التفاف النص داخل البطاقة بدل `truncate`) فخلا فحص `panel-geometry` من النصوص المقتطعة؛ المجموعة الكاملة محلياً **1246/1247** في 143 ملفاً | `frontend/test/App.test.tsx:258` + `frontend/src/components/editor/panels/freeform/freeform-elements-tab.tsx:66` ✅ |

**قرارات محمية بعد الجلسة:** لكل أداة إدراج زر مستقل في شريط الأيقونات («الطبقات» أولاً بأيقونة `Layer`، ثم ملصقات/أشكال/نصوص) — لا سطح «العناصر» موحّد ولا شريط تبويبات داخلي فوق اللوح · كتالوج الأشكال رمزي بلا أسماء مرئية؛ الاسم يبقى في `title` و`aria-label` فقط · المسار السريع يبدأ من «الطبقات» لكنه لا يخفي أي أداة إدراج، ولا تعود قاعدة تصفية تبويبات العناصر · وجهة «المقاسات» لا تعود إلى الشريط الجانبي — مقاسات الورق القياسية في كتالوج الورق، والأبعاد الحرة في لوحة خصائص مساحة العمل · لا تعود أدوات الإضافة (نص/شكل/ملصق) إلى شريط الأدوات العلوي؛ الإدراج من أزرار الشريط الجانبي حصراً · استوديو الملصقات يملكه `StickerStudioHost` الدائم في `AppDialogsHost` ولا يُعاد إلى مكوّن الشريط · لا تبويب «قوالب» في الاستوديو، وترحيل قيم `elements`/`presets` القديمة إلى `stickers` سلوك مقصود.

**الفجوات المتبقية:** الشبكة الكاملة لـVitest وE2E لم تُعَد محلياً (تُشغَّل في CI) · التحقق البصري على WebView2 مؤجل.

---

## 1.28 سجل جلسة إزالة وجهة الهوية البصرية وصقل شريط اللون — 21 أكتوبر 2026

**المرجع:** طلب المالك — «هذا التبويب لا أرى له أي داعي» ثم «بصراحة تبويب الهوية كله زائد عن الحاجة»، بعد طلب تحسين شريط اللون.

| البند | التنفيذ | الإثبات |
| --- | --- | --- |
| شريط لون أوضح | صار للرقعة الحالية في `ColorField` زر واحد يفتح المنتقي (حُذفت أيقونة المنتقي المكررة)، وفاصل شعري قبل ثمانِ عينات سريعة موزّعة على العرض، وحلقة تحديد أوضح وتسميات وصولية عربية | `color-panel.tsx:12` و`:137` + `test/color-panel.test.tsx` **3/3** ✅ |
| إزالة وجهة الهوية | حُذفت تبويبات `fonts/palette/backdrops` من `STUDIO_TOOLS` و`FreeformTab`، وحُذفت وجهة `identity` من `STUDIO_SECTIONS`، وصار `StudioSection = 'content' \| 'paper'`، ويعرض `FreeformStudioPanel` التبويبات الثلاثة الباقية فقط | `workspace-tools.ts:37` و`:41` و`:220` + `freeform-studio-panel.tsx:79` ✅ |
| حذف المكوّنات والبنية اليتيمة | حُذفت ملفات تبويبات الهوية الثلاثة واختبارها، و`paper-background.ts` و`apply-color.ts` و`palette-extract.ts`، ومكوّن `PaperBackgroundSummary` وأحداث `PAPER_BACKGROUND_EVENTS` وتوصيلاتها في لوحة الخصائص و`App.tsx`، وقائمة الهويات الستة عشر، وتفضيلات الخطوط/التدرجات من `local-prefs` (بقي القارئ/الكاتب العام المستخدم في منتقي الخطوط) | `shared-controls.tsx` + `local-prefs.ts:6` + `freeform-panel-constants.ts` ✅ |
| الاختبارات وE2E | حُدّث `workspace-tools.test.ts` (وجهتان للاستوديو، **34/34**) و`studio-panels.spec.ts` و`panel-geometry.spec.ts`، وأُعيدت تسمية اختبار أداة الورقة إلى `canvas-color-deck.test.tsx`، وحُذف اختبار تبويب الخلفيات | `test/workspace-tools.test.ts:68` + `e2e/studio-panels.spec.ts:40` ✅ |
| البوابات | `typecheck` و`lint` و`format:check` نظيفة، والاستهداف **56/56** (3 color-panel + 34 workspace-tools + 18 canvas-rendering-core + 1 canvas-color-deck)، وE2E مؤجل إلى CI وفق قاعدة منع Playwright محلياً | الأوامر أعلاه ✅ |

**قرارات محمية بعد الجلسة:** وجهة «الهوية» لا تعود إلى الشريط الجانبي — الخطوط في خصائص النص، والألوان عبر `ColorField` الموحّد في لوحات الخصائص، وخلفية الورقة في إعدادات الورقة · زر الرقعة الواحد هو مدخل المنتقي الوحيد، ولا تُعاد أيقونة منتقٍ ثانية في الصف · لا هجرة للتخزين المحفوظ: قيم `fonts/palette/backdrops` القديمة تسقط إلى التبويب الافتراضي (`elements`) عبر `isStudioTab`، وهو سلوك مقصود.

**الفجوات المتبقية:** حزمة `culori` صارت بلا مستخدم بعد حذف `palette-extract.ts` (تُزال في جلسة تنظيف لاحقة) · الشبكة الكاملة لـVitest وE2E لم تُعَد محلياً (تُشغَّل في CI) · التحقق البصري على WebView2 مؤجل.

---

## 1.27 سجل جلسة مواءمة اختبارات الحد الأدنى البصري — 21 أكتوبر 2026

**المرجع:** إغلاق الفجوتين المعلّقتين في الجلسات 1.23–1.26 قبل أي كوميت، دون نقض قرار تقليل النصوص.

| البند | التنفيذ | الإثبات |
| --- | --- | --- |
| الحالة الفارغة للطبقات | حُدّث `layers-list.test.tsx` ليتحقق من الأيقونة بدور `img` وتسميتها الوصولية بدل النص المرئي المحذوف عمداً؛ وصيغتها الحالية بعد أزرار الإدراج المستقلة في الشريط: «لا توجد طبقات بعد — أضف من الملصقات أو الأشكال أو النصوص» (تصحيح مؤرَّخ 21 أكتوبر 2026) | `frontend/test/layers-list.test.tsx:18` ✅ |
| إعدادات الورقة | حُدّث `collage-custom-grid-tab.test.tsx` ليتحقق من غياب ترويسة «مساحة العمل» ومن عناصر المقاس/العرض/الارتفاع وخلفية الورقة الفعلية | `frontend/test/collage-custom-grid-tab.test.tsx:197` ✅ |
| البوابات | `npx vitest run test/layers-list.test.tsx test/collage-custom-grid-tab.test.tsx` → **17/17**، و`npm run typecheck` و`npm run lint` و`npm run format:check` نظيفة | الأوامر أعلاه ✅ |

**قرارات محمية:** لا يُعاد النص المرئي إلى الحالة الفارغة للطبقات؛ التسمية الوصولية عبر `aria-label` كافية · لا تُعاد ترويسة «مساحة العمل» إلى إعدادات الورقة.

**الفجوات المتبقية:** الشبكة الكاملة لـVitest لم تُعَد محلياً وفق قاعدة عدم إجهاد البيئة (تُشغَّل في CI) · التحقق البصري على WebView2 مؤجل.

---

## 1.26 سجل إزالة أيقونات عناوين البطاقات — 21 أكتوبر 2026

**المرجع:** طلب المالك — «كل عناوين البطاقات ليست بحاجة إلى أيقونة؛ العنوان كافٍ لوحده (بطاقة مقاس الصورة مثالاً)».

| البند | التنفيذ | الإثبات |
| --- | --- | --- |
| إزالة أيقونة العنوان من المصدر | حُذفت خاصية `icon` من `FluentSection` كلياً (النوع والتدمير والعرض)، فصار العنوان وحده هو ترويسة القسم | `frontend/src/components/ui/blocks/fluent-section.tsx:6` ✅ |
| تنظيف كل مواضع الاستدعاء | أُزيلت `icon={<…>}` من كل `<FluentSection>` في 18 ملفاً (كولاج، فري فورم، خصائص الصورة/الشكل/النص/الخانة، الملصقات، واختبارات الوصولية والكتل)، وأُزيلت الاستيرادات التي صارت ميتة | `frontend/src/components/editor/properties/panels/*` + `frontend/src/features/stickers/components/sticker-properties.tsx` ✅ |
| تقنين للوكلاء | أُضيف بند إلى `Zero Visual Filler` في `.agents/rules/ui-ux-fluent.md`: عنوان القسم/البطاقة بلا أيقونة إطلاقاً، و`FluentSection` لا يقبل `icon` | `.agents/rules/ui-ux-fluent.md:31` ✅ |

**قرارات محمية بعد الجلسة:** ترويسة القسم نصّية بحتة — لا أيقونة عنوان مهما كان القسم · الأيقونات تبقى للأفعال والحالات فقط (قص، قفل، تحذير، زر بلا نص).

**الفجوات المتبقية:** ~~أيقونات خيارات البطاقات الداخلية (مثل أيقونات أنواع الصور) باقية لأنها تفرّق بين الخيارات لا تزيّن العنوان~~ — تصحيح مؤرَّخ (الجلسة 1.32، 22 أكتوبر 2026): رمز الرأس والكتفين المكرر حُذف من بطاقات مقاس الصورة لأن تطابقه بين الخيارات لا يفرّق بينها، وبقي إطار النسبة مُميِّزاً؛ وأي أيقونة خيار داخلية تُقبل فقط إذا اختلفت فعلاً بين الخيارات · `test/collage-custom-grid-tab.test.tsx` و`test/layers-list.test.tsx` — فشل سابق خارج النطاق، أُغلق في الجلسة 1.27 · التحقق البصري على WebView2 مؤجل.

---

## 1.25 سجل تصحيح نظام الألوان الموحّد وصف الأبعاد — 21 أكتوبر 2026

**المرجع:** طلب المالك — «نظام عجلة ألوان موحّدة لكامل التطبيق بمعيار حقيقي كما في التطبيقات الاحترافية، لا عجلة صغيرة مكرّرة في كل مكان... واستغلال المساحة العمودية بدل حشر الأزرار أفقياً».

| البند | التنفيذ | الإثبات |
| --- | --- | --- |
| منتقٍ واحد موحّد | أُعيد بناء `color-panel.tsx`: `ColorField` هو الحقل الوحيد، ويفتح حوار منبثقاً واحداً (`Popover`) بعجلة HSV، ويُلغى نظام العجلات المضمّنة (`ColorPanel` صار مُغلّفاً شفافاً و`ColorWheelPanel` لا يعرض شيئاً) فلا تتكرر العجلة في أي لوحة | `frontend/src/components/editor/properties/color-panel.tsx:1` ✅ |
| صف الحقل بلا كود خارجي | حُذف نص HEX من صف الحقل واستُغل الفراغ بألوان سريعة (8 عينات) بجوار أيقونة العجلة التي تفتح الحوار؛ كود HEX والشفاف والقطارة داخل الحوار فقط | `frontend/src/components/editor/properties/color-panel.tsx:20` ✅ |
| حوار مضغوط | عُرض الحوار بعرض `w-64` وحشو `p-2.5` بدل `w-80/p-3` فلا يبدو أعرض من اللازم | `frontend/src/components/editor/properties/color-panel.tsx:129` ✅ |
| صف الأبعاد عمودي | صار صف المقاس والاتجاه عمودياً: قائمة المقاس بعرض كامل في سطر، ومبدّل الاتجاه `FluentSegmentedControl` بخيارين مسمّيين في سطر تحته، **والنص بجوار الأيقونة لا تحتها** عبر خاصية `iconInline` الجديدة، فزال اقتطاع «عمودي/أفقي» | `frontend/src/components/editor/properties/general/canvas-dimensions-panel.tsx:289` + `frontend/src/components/ui/blocks/fluent-segmented-control.tsx:38` ✅ |

**قرارات محمية بعد التصحيح:** منتقٍ واحد للتطبيق كله يُفتح من الرقعة — لا عجلات مضمّنة في اللوحات · كود HEX لا يظهر في الواجهة الخارجية بل داخل الحوار · الألوان السريعة المختصرة مسموحة في صف الحقل · عند ضيق العرض تُستغل المساحة العمودية بدل حشر الأزرار أفقياً.

**الفجوات المتبقية:** سلوك التراجع يسجّل دفعة لكل تغيير أثناء السحب (مكافئ لما قبل التصحيح) · `test/layers-list.test.tsx` — أُغلق في الجلسة 1.27 · التحقق البصري على WebView2 مؤجل.

---

## 1.24 سجل جلسة عجلة الألوان وحارس تقليل النصوص — 21 أكتوبر 2026

**المرجع:** طلب المالك — «كلما قلت النصوص قل الإجهاد البصري... هذا المبدأ يجب أن يسري في عموم الواجهة وتثبيته للوكلاء... وتوفير عجلة ألوان ذات تصميم احترافي».

| البند | التنفيذ | الإثبات |
| --- | --- | --- |
| حارس تقليل النصوص | أُضيف بند ملزم `Text Minimalism Gate` إلى `.agents/rules/ui-ux-fluent.md` وإلى `.agents/skills/grido-ui-designer-guide/SKILL.md`، مع إشارة في فهرس `.agents/AGENTS.md`: كل نص مرئي يجب أن يحمل معلومة جديدة، ويُمنع تكرار اسم القسم أو وصف قيمة مرئية أو شرح فعل واضح، ويُطبَّق اختبار الحذف في كل تعديل قادم لا في الشاشات الجديدة فقط | `.agents/rules/ui-ux-fluent.md:20` + `.agents/skills/grido-ui-designer-guide/SKILL.md:40` + `.agents/AGENTS.md:47` ✅ |
| محرك ألوان نقي | ملف جديد `lib/color-wheel.ts` يحوي تطبيع HEX، وتحويلات HEX↔HSV/RGB، وحساب النقطة داخل العجلة (درجة اللون من الزاوية والتشبع من نصف القطر) مع قصّ المدى | `frontend/src/lib/color-wheel.ts:1` + `frontend/test/color-wheel.test.ts` (6 حالات) ✅ |
| عجلة ألوان احترافية | مكوّن `ColorWheel` يرسم عجلة HSV دقيقة على Canvas بدقة Retina، ويعرض التشبع/الدرجة بمؤشر دائري، وشريط سطوع منفصل بتدرج من الأسود إلى اللون الحي، مع سحب بالمؤشر، وأسهم لوحة المفاتيح، وARIA لدرجة اللون والسطوع | `frontend/src/components/editor/properties/color-wheel.tsx:1` ✅ |
| دمج وإزالة نص زائد | استُبدل `HexColorPicker` من `react-colorful` بالعجلة الجديدة داخل `ColorWheelPicker`، وحُذف عنوان «ألوان الاستوديو» لأن العينات تعرّف نفسها، وحُذفت حزمة `react-colorful` وCSS الخاص بها | `frontend/src/components/editor/properties/shared-controls.tsx:404` + `frontend/package.json` + `frontend/src/index.css` ✅ |
| صقل بصري متراكم | `FluentSegmentedControl` يدعم `variant="panel"` بعرض كامل، والشريط الجانبي أيقونات فقط بعرض 44px مع pill نشط محايد، وأُخفيت أيقونات التبويبات الثلاثية لتفادي الاقتطاع، وأُزيل مبدّل هدف التدرج من تبويب الخلفيات، وبُسّطت ترويسة إعدادات الورقة | `fluent-segmented-control.tsx` + `workspace-panel-rail.tsx` + `freeform-backdrops-tab.tsx` + `canvas-dimensions-panel.tsx` ✅ |
| البوابات | `tsc --noEmit` و`eslint --max-warnings 0` وبناء Vite نظيفة، وVitest الموجّه **32/32** (6 عجلة ألوان + 10 تبويب الخلفيات + 2 إعدادات الورقة + 14 خصائص/تدرج)، وE2E مؤجل إلى CI وفق قاعدة منع Playwright محلياً | `npm run typecheck` + `npm run lint` + `npm run build` + `npx vitest run test/color-wheel.test.ts test/freeform-backdrops-tab.test.tsx test/canvas-dimensions-panel.test.tsx test/element-properties-tabs.test.tsx test/paper-gradient.test.tsx` ✅ |

**قرارات محمية بعد الجلسة:** عجلة الألوان تعتمد HSV لا HSL، والسطوع منفصل عن العجلة حتى يبقى اللون مرئياً عند القيم الداكنة · لا تُعاد حزمة `react-colorful` ولا واجهة المربع/شريط التدرج القديمة · كل حقول اللون في التطبيق تمر عبر `ColorField` الذي يفتح حواراً منبثقاً واحداً بالعجلة (عُدّل في 1.25: لا عجلات مضمّنة) · كود HEX والشفاف داخل الحوار فقط، والألوان السريعة المختصرة في صف الحقل · مبدأ تقليل النصوص لا يمس labels الحقول ورسائل الخطأ وأسماء الأقسام الغامضة.

**الفجوات المتبقية:** `test/layers-list.test.tsx` — أُغلق في الجلسة 1.27 بعد مواءمة الاختبار مع الحالة الفارغة المختصرة · لم تُعَد حزمة Vitest الكاملة بعد هذه الجلسة · التحقق البصري للعجلة على WebView2 الفعلي مؤجل إلى دورة CI/يدوية.

---

## 1.23 سجل جلسة تجميع الشريط الجانبي في وجهات — 21 أكتوبر 2026

**المرجع:** طلب المالك — تقليص ست أدوات مسطّحة في كل وضع إلى ثلاث وجهات متماسكة مع تبويبات داخلية، بلا فقدان أي أداة أو اختصار أو هجرة لتخطيط الألواح المحفوظ.

| البند | التنفيذ | الإثبات |
| --- | --- | --- |
| سجل وجهات موحّد | `COLLAGE_SECTIONS` و`STUDIO_SECTIONS` فوق سجل التبويبات القائم: استوديو (content: elements+layers، paper: presets، identity: fonts+palette+backdrops) وكولاج (grid: custom+presets+freeform، slots: autofill+arrange، paper: paper)، مع `getDefaultStudioTab` و`getCollageSectionForTab` و`getStudioSectionForTab` و`getSectionsForWorkflow`؛ أُزيلت دوال التجميع المسطّح (`groupTools`/`getToolsForMode`/`getToolsForWorkflow`) | `workspace-tools.ts:214` و`:248` و`:293` ✅ |
| شريط جانبي بوجهات | `WorkspacePanelRail` يعرض وجهات بدل أدوات، ويحسب `activeSectionId` و`isSectionInUse` (custom/freeform في الشبكة، collage-template في القص)، ونفس المنطق في `CompactToolLauncher` على شاشات compact | `workspace-panel-rail.tsx:396` و`:628` ✅ |
| تبويبات داخلية دائمة | `FreeformStudioPanel` و`CustomCollageCard` و`TemplatePanel` تعرض شرائح الوجهة دائماً عند وجود أكثر من تبويب (لم تعد مرتبطة بـcompact)، مع `layoutId` لكل وجهة وحذف خصائص `showInternalTabs`/`showInternalCollageTabs` من `App.tsx` | `freeform-studio-panel.tsx:45` و`custom-collage-card.tsx:273` و`template-panel.tsx:162` ✅ |
| افتراضي العناصر والوضع السريع | الافتراضي صار `elements` بدل `layers`؛ وفي وضع `quick` تنطوي وجهة المحتوى إلى «الطبقات» (tabs=['layers']) وتُحاذى الحالة المشتقة إلى `getDefaultStudioTab(workflow)` دون setState داخل effect | `use-workspace-panels.ts:94,101` ✅ |
| اختصارات Alt+1..9 | الاختصارات تختار الوجهات المرئية من `getSectionsForWorkflow` وتُفعّل `section.defaultTab` (وليس معرّف الوجهة) | `use-keyboard-shortcuts.ts:274` ✅ |
| الاختبارات | تحديث `workspace-tools.test.ts` (34 حالة لسجل الوجهات والطي وعدم الفقدان/التكرار) و`editor-store.test.ts`، وإعادة كتابة `studio-panels.spec.ts` و`collage-panels.spec.ts` لمعرّفات الوجهات والتبويبات الجديدة، وتحديث `panel-geometry.spec.ts` | `npm test` (ملفات الميزة خضراء) + `npx playwright test e2e/studio-panels.spec.ts e2e/collage-panels.spec.ts --project=chromium` (3/3) ✅ |

**قرارات محمية بعد الجلسة:** معرّفات التبويبات (`FreeformTab`/`CollageTab`) وتخزين `grido_workspace_layout_v1` لم تتغيّر — الوجهات طبقة عرض فقط · Alt+1..9 ما زالت تسع فتحات لكنها تشير لوجهات · الطي التلقائي عند فتح لوحة الخصائص في standard لم يُمس · `panel-geometry.spec.ts` يفتح الوجهات فقط لأن التبويبات الداخلية تبقى ضمن اللوح نفسه.

**الفجوات المتبقية:** اختبار `layers-list.test.tsx` («لا توجد طبقات بعد») — أُغلق في الجلسة 1.27 بمواءمة الاختبار مع الأيقونة وتسميتها الوصولية.

**تصحيح مؤرَّخ (2026-10-21 — الجلسة 1.28):** حُذفت وجهة «الهوية» وتبويباتها الثلاثة بطلب المالك؛ ما ورد أعلاه يصف حالة الجلسة 1.23 تاريخياً، والواقع الحالي وجهتان فقط (`content` و`paper`).

---

## 1.22 سجل جلسة حزمة معايير الكود P0 — 21 أكتوبر 2026

**المرجع:** طلب المالك — اعتماد البروتوكولات العالمية التي يهملها المشروع (أنماط كود، ترتيب الاستيراد، نظافة الكود، رسائل الالتزام)، وتنفيذها في **تغيير معزول** عبر worktree مستقل (`chore/p0-code-standards`) حمايةً للعمل غير المرفوع في الشجرة الرئيسية.

| البند | التنفيذ | الإثبات |
| --- | --- | --- |
| P0-1 | **تطبيع التنسيق:** تنسيق كل ملفات Go المتتبعة بـ`gofmt` (صفر انحراف، بما فيه توثيق قائمة في `print_flip_rotation_order_test.go`)، وتشغيل Prettier على `frontend/src`, `test`, `e2e` وملفات الإعداد | `gofmt -l` فارغ · `npm run format:check` |
| P0-2 | **قواعد محرر موحدة:** `.editorconfig` (مسافات/نهايات أسطر)، `.gitattributes` يثبّت `lf` ويعزل الأصول الثنائية، و`.nvmrc` (Node 22) يقرأه CI عبر `node-version-file` | الملفات الجذرية + `.github/workflows/ci.yml` |
| P0-3 | **بوابات CI جديدة:** خطوة Prettier (`format:check`) وخطوة `gofmt` على كل ملفات Go المتتبعة، مع صفوف في ملخص CI | `.github/workflows/ci.yml` |
| P0-4 | **تقوية ESLint:** `import-x/order` (خارجي ← `@bindings` ← `@/` ← نسبي ← أنواع)، `import-x/no-duplicates`، `@typescript-eslint/consistent-type-imports`، وتفعيل `no-unused-vars` (مع تجاهل `_`) و`no-console` (باستثناء logger/worker/الاختبارات) | `frontend/eslint.config.js` + إصلاحات آلية/يدوية في `src/test/e2e` |
| P0-5 | **Conventional Commits:** مدقق بلا اعتماديات `scripts/commit-msg-lint.mjs` + خطاف `.husky/commit-msg` يرفض الرسائل غير المطابقة ويدعم `--range` لفحص الدفعات | `node scripts/commit-msg-lint.mjs --range HEAD~3..HEAD` |
| P0-6 | **أوامر مطوّر:** `lint:fix` وتوسيع `format`/`format:check` ليشمل `test` و`e2e` وملفات الإعداد، و`engines.node >=22` | `frontend/package.json` |
| P0-7 | **تصحيح بوابة التوثيق:** صار فحص مراجع المسارات في الوضع الصارم `--strict-refs` يستثني المسارات المُولَّدة والمُتجاهَلة من Git (مثل `frontend/bindings/` و`/bin`) ويعاملها كتحذير بدل خطأ — فلا تُغلق البوابة الصارمة كل كومت بسبب مسارات لا وجود لها في المستودع | `scripts/docs-gate.mjs:322` + `node scripts/docs-gate.mjs --strict-refs` (ناجح) |

**قرارات محمية بعد الجلسة:** التغيير معزول على `chore/p0-code-standards` ولم يلمس الشجرة الرئيسية · لا تغيير سلوكي في الواجهة أو المحرك · `no-console` لا يمنع sink التسجيل الموحد `lib/logger.ts` ولا العمال · لم تُعدَّل أرقام الاختبارات أو صيغة `ProjectFileV1`.

## 1.20 سجل جلسة إصلاحات الدقة والاتساق في الواجهة — 21 أكتوبر 2026

**المرجع:** طلب المالك — «اصلح الكل» بعد فرز مراجعة لقطات الشاشة؛ نُفّذت البنود الأربعة المؤكدة بالكود فقط، ورُفضت الادعاءات غير المطابقة (منها ترتيب أزرار النافذة في RTL، وقد تُحقّق أنه سلوك ويندوز الصحيح فلم يُغيَّر).

| البند | التنفيذ | الإثبات |
| --- | --- | --- |
| GRID-1 | **مزامنة شبكة الكولاج:** أُضيف `lib/canvas/collage-grid.ts` (`getTemplateGrid` / `deriveGridFromCells`) واشتُقّت الشبكة من `physicalLayout` أو من إحداثيات الخانات بدل تعداد 4/6/8/9/12، فيُزامَن أي عدد منتظم (قالب 30 صورة → 6×5). وشارة الحالة تعرض شبكة الكانفس الفعلية، وتُظهر «تغييرات غير مطبقة» عند اختلاف النموذج، وتُخفى للشبكات غير المنتظمة؛ وأُعيد تسمية «إعادة البناء» إلى «تطبيق الشبكة» | `collage-grid.ts:1` + `custom-collage-card.tsx:126` + `collage-custom-grid-tab.tsx:216` + `test/collage-grid.test.ts` ✅ |
| SLD-2 | **إدخال رقمي في `FluentSliderField`:** حقل نصي يقبل الأرقام العربية/الفارسية والكسور العربية، ويقيّد القيمة بالمدى ويقرّبها لخانتين، مع تأكيد بـEnter أو فقدان التركيز وإلغاء بـEscape وأسهم Up/Down؛ وزر إعادة تعيين يظهر فقط عند اختلاف القيمة عن `defaultValue`. القيم المصاغة (`valueFormatter`) تبقى عرضاً فقط، ولا يُدفع تحديث أثناء كل حرف | `fluent-slider-field.tsx:257` + `test/fluent-blocks.test.tsx` ✅ |
| UNIT-3 | **تباعدات الكولاج بالمليمتر:** عُرضت «التباعد بين الصور» والهامش والاستدارة بـ`mm` محسوبة من `getEffectiveDpi`، مع إبقاء التخزين بالبكسل وحدود مميّزة (30/100/50mm) | `collage-settings.tsx:58` ✅ |
| TITLE-4 | **هوية المستند:** أُضيف `projectName` و`isDirty` إلى `core-slice`، يرفعهما سجل التاريخ عند أي تغيير فعلي (بعد الـ dedupe) وعند undo/redo، ويصفّرهما `loadProject`/`markProjectSaved`/`reset`؛ ويعرض شريط العنوان شريحة اسم المشروع أو «مستند جديد» مع نقطة `primary` للتغييرات غير المحفوظة على الشاشات ≥1280px. حُذف المشروع المفتوح يمسح الاسم ويُبقي المستند معدّلاً | `core-slice.ts:31` + `history-slice.ts:225` + `projects-dialog.tsx:189` + `App.tsx:629` + `test/core-slice.test.ts` ✅ |
| QA-5 | **البوابات:** `tsc --noEmit` و`eslint --max-warnings 0` نظيفان، وVitest **142 ملفاً / 1250 ناجحة + 1 متخطاة (0 فاشلة)** — منها 7 حالات جديدة لاشتقاق الشبكة، وحالة لعلامة التعديل، وحالة لهوية المشروع، و3 حالات لشارة التطبيق/التغييرات المعلّقة/الشبكة غير المنتظمة. و`docs-gate --strict-refs` أخضر. تحقق بصري مؤقت عبر Playwright (نافذة 1700px): شريحة «مستند جديد» بلا نقطة، ثم نقطة «تغييرات غير محفوظة» بعد إدراج نص، وحقل «التباعد بين الصور» يعرض `mm` ويقبل الإدخال ويعيده زر إعادة التعيين إلى 0 — ثم حُذف الملف المؤقت | `npm test` + `npx playwright test` (2026-10-21) ✅ |

**الفجوات المتبقية:** استعادة مسودة الحفظ التلقائي تمرّر `projectId` فقط (ملف المشروع لا يحمل الاسم)، فتظهر شريحة «مستند جديد» حتى أول حفظ/فتح صريح — مقبول لأنه مسار استرداد نادر. الشريحة مخفية تحت 1280px لتفادي مزاحمة مبدّل الوضع في الشريط.

---

## 1.19 سجل جلسة الدفعة أ من تدقيق التصميم (Fluent 2) — 21 أكتوبر 2026

**المرجع:** طلب المالك — «ابدأ التدقيق الآن» ثم «ابدأ بالدفعة أ الآن» بعد تقرير تدقيق مرتب بالأثر (11 ملاحظة موثقة بملف:سطر).

| البند | التنفيذ | الإثبات |
| --- | --- | --- |
| MOT-1 | **توحيد الحركة:** أُزيل `active:scale` و`hover:-translate-y` و`hover:scale` من الأزرار والبطاقات كافة، وصار أساس `Button` انتقال ألوان فقط (`transition-colors duration-150`). استُبدل `transition-all` بخصائص محددة في 213 موضعاً عبر 74 ملفاً، مع إبقاء 3 استثناءات وظيفية فقط (سماكة خطوط الإرشاد، مقبض قص الماسح، حركة Toast)، وخصائص دقيقة لأشرطة التقدم (`transition-[width]`) وأسهم التوسيع (`transition-[color,transform]`) | `frontend/src/components/ui/button.tsx:8` + `grep -rn "transition-all" src` = 3 نتائج وظيفية ✅ |
| ACT-2 | **حالة نشطة محايدة:** أزرار طي/توسيع الألواح في شريط العنوان تستخدم `text-foreground bg-accent-active` بدل الأزرق `primary`، وتوقف نبض نقطة التجربة (`animate-pulse`) مع بقاء النقطة والهالة؛ الأزرق محجوز للأوامر التعبوية فقط | `frontend/src/App.tsx:528,577` ✅ |
| A11Y-3 | **تلميح الإعدادات:** هدف اللمس الفعلي لتلميح `FluentSettingRow` صار 22px (`p-1 -m-1 inline-flex`)، واسمه المنطوق «شرح: <التسمية>»؛ وأُزيلت خاصية `icon` الميتة من الواجهة والرندر والاختبار لأن لا مستدعي إنتاجي لها | `fluent-setting-row.tsx:36,73` + `test/accessibility.test.tsx:40` ✅ |
| UI-4 | **عينات ألوان الكولاج:** كُبّرت من 24px إلى 28px (`w-7 h-7`)، واستُبدل `scale-110` بحلقة تحديد مزدوجة `ring-2 ring-primary ring-offset-2` مع انتقال ألوان فقط | `collage-settings.tsx:160` ✅ |
| BIDI-5 | **طباعة عربية مستقيمة:** حُذف `uppercase tracking-wider` من ثلاثة عناوين عربية في حوار الطباعة وعنوان في الإدراج الدفعي (تبديد تباعد الحروف المتصل)، وثُبّتت أبعاد الورقة بـ`dir="ltr"` في الشارة والمعاينة لتظهر «210×297» بترتيب أرقام موحد | `print-dialog.tsx:771,1047` + `batch-insert-dialog.tsx:526` ✅ |
| QA-6 | **البوابات:** `tsc --noEmit` و`eslint --max-warnings 0` نظيفان، وVitest **141 ملفاً / 1236 ناجحة + 1 متخطاة**. تحقق بصري مؤقت عبر Playwright (3 حالات: الحالة النشطة المحايدة، عينة 28px بلا scale، شارة طباعة LTR بلا tracking) نجح ثم حُذف الملف المؤقت | `npm test` (2026-10-21) + جلسة Playwright مؤقتة ✅ |

**الفجوات المتبقية:** ثلاث حالات `transition-all` مقصودة وظيفياً (خطوط الإرشاد، مقبض قص الماسح، Toast) لا تُنقل لخصائص محددة لاعتمادها على أبعاد/تحويل متغير. أما الدفعة ب (نص مساعد 10px، توحيد الحالات الفارغة، موضع لوحة الأوامر) فلم تبدأ بعد.

---

## 1.18 سجل جلسة إزالة العلامة المائية من التصدير — 21 أكتوبر 2026

**المرجع:** طلب المالك — «أرى أن لا يوجد داعي للعلامة المائية أبداً ولا حاجة لوجودها، هل يمكنك إزالتها؟».

| البند | التنفيذ | الإثبات |
| --- | --- | --- |
| WM-1 | **حذف وحدة العلامة المائية نهائياً:** حُذف `export-watermark.ts` بلا بديل، فلم يعد التصدير يعيد ترميز الصورة مرة ثانية لرسم شريط «نسخة مجانية» — يوفّر كانفساً كامل الحجم إضافياً و`toBlob` ثانياً على كل تصدير | `frontend/src/lib/export/export-canvas.ts:20` + حذف `export-watermark.ts` ✅ |
| WM-2 | **تبسيط عقد `exportCanvas`:** أُزيلت واجهة `ExportCanvasOptions` والمعامل الرابع وخيار `watermark`؛ يعيد البلوب الملتقط مباشرة في مساري Konva والاحتياطي | `export-canvas.ts:20,87,143` ✅ |
| WM-3 | **تصدير الخانة الواحدة والبارل:** أُزيل تطبيق العلامة من `exportSlotCanvas` ومن إعادة التصدير في `export-image.ts`، فبقي مسارا تسليم متطابقين | `export-slot.ts:100` و`export-image.ts:1` ✅ |
| WM-4 | **تنظيف المستهلكين والنصوص:** نداء زر «تكرار في الكولاج» صار `exportCanvas('png', 1, stage)` بلا خيارات، وحُدّثت تعليقات CMYK ونص حوار التصدير التي كانت تذكر العلامة | `toolbar-transfer-to-collage.tsx:50` + `export-cmyk.ts:4,99` + `export-dialog.tsx:465` ✅ |
| WM-5 | **الاختبارات:** حُذف `export-canvas-watermark.test.ts` (حالتان)، وحُدّث اختبار النقل ليتحقق من النداء بلا خيارات — 107 حالة في 10 ملفات تصدير خضراء، والأنواع واللينت نظيفان | `toolbar-transfer-to-collage.test.tsx:80` + `npm run typecheck` + `npx vitest run export toolbar-transfer` (2026-10-21) ✅ |

**قرارات محمية بعد الجلسة:** حُذف رسم العلامة من كل مسارات التسليم بطلب صريح من المالك (يلغي قرار 0.19 المحمي) · بوابة الترخيص `isLicenseActive()` باقية كما هي لميزات AI وإزالة الخلفية · «قالب النص المائي» في `text-presets.ts` ميزة تصميم مستقلة لم تُمس · لا تغيير في صيغة `ProjectFileV1` أو مخطط الستور.

---

## 1.17 سجل جلسة ترقية جسر كاميرا الهاتف لنمط الدفع اللحظي (WhatsApp-style WebSockets) — 20 أكتوبر 2026

**المرجع:** طلب المالك — «لماذا لا يتعامل التطبيق مع جسر الهاتف كجهة مستقبلة ويرسل لها كرسالة واتساب؟».

| البند | التنفيذ | الإثبات |
| --- | --- | --- |
| قناة الدفع اللحظي الفوري (WhatsApp Push) | ربط الهاتف وسطح المكتب عبر قنوات `Supabase Realtime Broadcast` (WebSockets): الهاتف يرسل إشعار `photo-ready` فور التقاط الصورة وإشعار `paired` فور مسح الـ QR، فيستقبلها سطح المكتب بلحظتها (0ms تأخير) ويسحب الصورة فورياً بلا استقصاء HTTP متكرر | `internal/service/phone_bridge_service.go:startRealtimeSync` و`admin-web/src/pages/PhoneCameraPage.tsx:183,485` ✅ |
| شبكة أمان هادئة وإعادة استخدام الاتصالات | استبدال الاستقصاء العنيف السابق بمؤقت استقصاء احتياطي هادئ وطويل الأمد (كل 12 ثانية) فقط في حال تعطل اتصال WebSocket المؤقت، مع استخدام عميل HTTP موحد ذي اتصالات Keep-Alive مشتركة | `internal/service/phone_bridge_service.go:45,760,1005` ✅ |
| حل انقطاع استقبال الصور السحابية | إزالة السطر الزائد الذي كان يعيد كتابة `cloudURL` ويطمس هوية المستخدم `uid/token` برابط غير معرّف، مما أعاد تطابق بادئة المسار الشخصي في باكت Supabase Storage المؤمّن بسياسات RLS | `internal/service/phone_bridge_service.go:298` و`phone_bridge_service_test.go:TestPhoneBridgeService_CloudURLFormatting` ✅ |
| الاستماع لأخطاء الجسر وتنبيه الواجهة | ربط حدث `phone:cloud-error` في خطاف `usePhoneBridgeListener` وإظهار تنبيه واضح، مع تحويل تلقائي إلى وضع LAN وإظهار بانر إرشادي في الحوار عند غياب جلسة السحابة | `frontend/src/components/editor/system/use-phone-bridge.ts:132` و`frontend/src/components/editor/dialogs/phone-bridge-dialog.tsx:145` ✅ |
| ترشيق الصور وتسريع النقل 75% | ضبط سقف أبعاد الصور السحابية إلى 2048px وجودة 0.80 في صفحة الهاتف (كافية لطباعة 300+ DPI)، مما خفض حجم الصور من 3MB+ إلى ~450KB وسرّع الرفع والسحب | `admin-web/src/pages/PhoneCameraPage.tsx:369,507,542` ✅ |
| تحسين تجربة الاقتران والمعرض | إلغاء الاستماع المزدوج لحدث الاقتران في الحوار لمنع تكرار الـ Toast، وتفعيل الاختيار المتعدد في معرض صفحة الكاميرا المحلية | `frontend/src/components/editor/dialogs/phone-bridge-dialog.tsx:43` و`internal/service/embedded/phone_camera_page.html:455,622` ✅ |
| امتثال خطوط الحوار لنظام Fluent 2 | توحيد مقياس خطوط نصوص التحذير في حوار الجسر واستبدال فئات الحجم الاعتباطي بـ `text-xs` للامتثال لحارس الاتساق البصري | `frontend/src/components/editor/dialogs/phone-bridge-dialog.tsx:294` ✅ |

---

## 1.16 سجل جلسة الأداء: استعدال الماسح و OpenCV خارج الخيط الرئيسي + مصغّرات Go — 20 أكتوبر 2026

**المرجع:** طلب المالك — «ok do it» بعد خطة أداء معتمدة من ثلاث مراحل (ماسح/مصغّرات/Worker).

| البند | التنفيذ | الإثبات |
| --- | --- | --- |
| استعدال المنظور خارج الخيط الرئيسي | عامل جديد `scanner-warp.worker.ts` ينفّذ الاستعدال على `OffscreenCanvas`: يقصّ المصدر على منطقة المستند فقط، ويكتب المخرج على شرائح 256px بدل مخزن `ImageData` كامل، ويعيد Blob مباشرة بلا Base64. المسار المتزامن بقي كاحتياطي (بيئات بلا Worker/OffscreenCanvas والاختبارات)، والإلغاء فوري عبر إنهاء العامل | `core/warp-pipeline.ts` + `core/warp-worker-client.ts` + `workers/scanner-warp.worker.ts` + `hooks/use-scanner-processor.ts` ✅ |
| محرك OpenCV (WASM) خارج الخيط الرئيسي | الخيط_MAIN يرسم الصورة مصغّرة (640px) ويرسل البكسلات، والعامل ينفّذ `findContours` كاملةً — فلا تُحمَّل WASM (نحو 13MB) على خيط الواجهة. مسار احتياطي متزامن حين لا يتوفّر Worker، وتهيئة مسبقة عند فتح الماسح، وإنهاء العامل مع إغلاق النافذة لتحرير ذاكرة WASM | `core/opencv-detector.ts` (`detectDocumentsWithOpenCVFromImageData`) + `workers/document-detector.worker.ts` + `core/detector-worker-client.ts` ✅ |
| مصغّرات الصور في Go | مسار `GET /local-image/thumb/<file>?w=128\|256\|512` يولّد المصغرة عند الطلب في `Media/.thumbs`: فحص ترويسة قبل فك الترميز، سقف 120MP، `singleflight`، سيمفور بسعة 2، كتابة ذرية، تصحيح اتجاه EXIF، وكاش `max-age=86400` | `internal/service/media_thumbnail.go` + `internal/server/asset_server.go` ✅ |
| استهلاك المصغرات في الواجهة | `getThumbnailSrc()` في قائمة الطبقات وحوار الإدراج الدفعي وشريط الكولاج، مع رجوع تلقائي للأصل عند فشل المصغرة — بلا تغيير في مخطط المشروع أو في مسار Konva والطباعة | `frontend/src/lib/canvas/thumbnail-src.ts` + `layers-list.tsx` + `batch-insert-dialog.tsx` + `collage-autofill-tab.tsx` ✅ |
| تنظيف المصغرات اليتيمة | `cleanupThumbnails` تحذف المصغرات التي فقدت أصلها أو لم يعد مشاراً إليه (مع مهلة 24 ساعة)، ضمن دورة التنظيف الدوري والتنظيف اليدوي | `internal/repository/media_cleanup.go` ✅ |
| إثبات عملي لا نظري | ثلاثة فحوص Playwright: `cv-worker-probe` (تهيئة OpenCV داخل العامل + `findContours` = 2 كفاف)، `detector-worker-probe` (كشف مستند اصطناعي عبر العامل بأركان (50,40)-(148,158) مطابقة للمستطيل المرسوم)، و`warp-worker-probe` (الاستعدال عبر `createImageBitmap` + `OffscreenCanvas` ينتج PNG صالحاً) | `frontend/e2e/cv-worker-probe.spec.ts` + `detector-worker-probe.spec.ts` + `warp-worker-probe.spec.ts` ✅ |
| بوابات الجودة | `tsc --noEmit` و`eslint` بلا أخطاء، Vitest: **141 ملفاً / 1227 ناجحة + 1 متخطاة**، `go vet` + `go test ./internal/...` (303 دالة اختبار) خضراء، وفحصا Playwright خضراوان | `frontend/` + `go test` (2026-10-20) ✅ |

**الفجوات المتبقية (تحتاج تصميماً منفصلاً):** استدلال `scanic` (DocCornerNet) ما زال على الخيط الرئيسي — يحتاج الدقة الكاملة ويصعّب مقياس الأركان عند النقل، وتحويل `stage.toCanvas` المتزامن في التصدير إلى مسار غير حاجب، ومسار التركيب السريع في Go ما زال مشروطاً بعناصر بسيطة. كما بقي بند ذاكرة إدراج الألبوم في الكانفس (احتفاظ `useAsyncImage` بالأصل كاملاً) خارج نطاق هذه الجلسة.

---

## 1.15 سجل جلسة الأداء والوصولية: دقة الطباعة الكاملة وحدود الذاكرة وفصل الحزم — 20 أكتوبر 2026

**المرجع:** طلب المالك بعد جلسة 1.14 — «هل بقي المزيد من الإصلاحات؟» ثم «yes do all».

| البند | التنفيذ | الإثبات |
| --- | --- | --- |
| دقة طباعة/تصدير كاملة | `captureStageBlob(..., { useFullResolution: true })` يستبدل عقد `Image` التي تحمل نسخة عرض 2048px بأصلها قبل الالتقاط ثم يعيدها في `finally`، عبر خريطة `WeakMap` (نسخة العرض ← الأصل) في `display-image.ts`. كان تكبير نسخة العرض يُسقط جودة A4/A3 الفعلية تحت 300DPI رغم طلب نسبة عالية | `frontend/src/lib/canvas/konva-export-utils.ts` و`display-image.ts` و`export-canvas.ts` و`print-payload-builder.ts` ✅ |
| معالجة طباعة بدفعات محدودة الذاكرة | `printBatchSize` يقدّر بايتات وسم كل عنصر (`W×H` عند DPI ×4) ويعالج دفعة ≤ **512 MiB**، ثم يرسمها ويحرّر مراجعها قبل التالية. سابقاً كانت كل الصور المعالَجة تبقى حيّة حتى نهاية الرسم | `internal/service/print_service.go` ✅ |
| تسلسل طلبات الطباعة + سقف كومة Go | `printJobSem` (طلب واحد في كل مرة) يمنع مضاعفة كانفس الورقة/التركيب عند نقرتين، و`debug.SetMemoryLimit(3 GiB)` سقف ناعم يمنع تضخّم الكومة قبل ضغط النظام | `print_service.go` و`main.go` ✅ |
| ميزانية بايتات لنسخ العرض | كاش 2048px صار بسقف **128 MiB** إضافة إلى 24 نسخة (كان 24×16 MiB ≈ 384 MiB)، والطرد يُحرّر المرجع فقط ويُبقي `WeakMap` للأصل من أجل الطباعة | `frontend/src/lib/canvas/display-image.ts` ✅ |
| سقف كاش الفلاتر ومنع موجات إعادة الخبز | سقف **24 ميغابكسل** للعقدة الواحدة (عقدة 2480×3508 بنسبة 2.5 ≈ 218 MiB)، وإعادة خبز فقط عند تكبير >5% أو تغيّر الأبعاد أو الصورة/الفلتر — لا عند كل عجلة تكبير/تصغير | `frontend/src/hooks/use-filter-cache.ts` ✅ |
| فصل الحوارات الثقيلة وقوالب الملصقات | `projects-dialog` و`batch-insert-dialog` و`phone-bridge-dialog` صارت `lazy()` وتُركَّب عند أول فتح فقط (لا تحميل مسبق من `open=false`)، و`~149KB` من قوالب SVG للملصقات صارت `import()` داخل تبويب العناصر مع حالة تحميل | `toolbar-file-ops.tsx` و`freeform-elements-tab.tsx` ✅ |
| إصلاحات ARIA والوصولية | `FluentFilterChips` صار `role=group` + `aria-pressed` بدل tablist بلا لوحة/تنقل؛ قائمة الطبقات `list/listitem` مع زر تحديد داخلي بدل `option` يحتوي أزراراً (nested interactive)؛ كتالوج الملصقات `role=group` بدل listbox؛ مفتاح التبديل غير المحدد صار مرئياً (`foreground/70` + حدود أوضح)؛ أسماء وصول لأربعة combobox في حوار الطباعة وثلاثة منتقيات أخرى؛ `aria-label` لـtablist المبدّل | `layers-list.tsx` و`fluent-filter-chips.tsx` و`switch.tsx` و`sticker-catalog.tsx` و`fluent-segmented-control.tsx` و`print-dialog.tsx` وغيرها ✅ |
| قياس الأثر | الحزمة الرئيسية: **1,568.71 kB (444.96 kB gzip)** مقابل 1,851.16 kB (504.53 gzip) بعد جلسة 1.14 (‑282.45 kB خام / ‑59.57 gzip). انفصلت `projects-dialog` (33.95 kB) و`batch-insert-dialog` (13.70 kB) و`phone-bridge-dialog` (9.44 kB) | `npx vite build` (2026-10-20) ✅ |
| بوابات الجودة | `tsc --noEmit` و`eslint` بلا أخطاء، Vitest كامل: **138 ملفاً / 1216 ناجحة + 1 متخطاة**، و`go build ./...` + `go test ./internal/service` أخضر | `frontend/` + `go test` (2026-10-20) ✅ |

**الفجوات المتبقية (تحتاج تصميماً منفصلاً):** ~~نقل كشف OpenCV/المستندات خارج الخيط الرئيسي~~ و~~توليد مصغّرات الصور في Go~~ (عولجت في جلسة 1.16)، ويبقى: تحرير WASM الخاص بـOpenCV بعد مسح المستند (عولج جزئياً بإنهاء عامل الكشف مع إغلاق النافذة)، وتحويل `stage.toCanvas` المتزامن في التصدير إلى مسار غير حاجب. كما أن مسار التركيب السريع في Go ما زال مشروطاً بعناصر بسيطة، لكن مسار الالتقاط الاحتياطي صار يستخدم الأصل كامل الدقة.

---

## 1.14 سجل جلسة الأداء: تقليم ذاكرة تكيّفي وتقسيم الحزمة — 20 أكتوبر 2026

**المرجع:** طلب المالك — «هل ترى في التطبيق أي مشاكل في الأداء؟ وهل نستغل سرعة Go بشكل مثالي ولا نضع الحمل على الواجهة والويب فيو؟».

| البند | التنفيذ | الإثبات |
| --- | --- | --- |
| تقليم ذاكرة تكيّفي بدل الدوري العنيف | `StartAutoTrim` صار يفحص `runtime.MemStats` كل 45 ثانية ولا يُقليم إلا عند تجاوز `HeapAlloc` حد **320 MiB** (بعد تصدير/معالجة كبيرة) أو بعد **10 دقائق** صيانة لتقليم مجموعات عمل WebView2. كان التقليم كل 30 ثانية ينفّذ `runtime.GC` + `debug.FreeOSMemory` + `EmptyWorkingSet` على كل عمليات WebView2 فيسبّب تجمّدات وأخطاء صفحات | `internal/service/memory_service.go:38` و`memory_service_windows.go:24` ✅ |
| ميزانية بايتات لكاش الصور | كاش الصور صار LRU مزدوج السقف: 100 إدخال **و** 256 MiB تقديرية (`width×height×4`)، مع إبقاء الإدخال الجديد وحده إن تجاوز الميزانية، وإسقاط المرجع فقط دون تصفير `src` حفاظاً على عقد Konva. كان السقف 100 صورة كاملة الدقة (~9.6 ج.ب نظرياً لصور 24MP) | `frontend/src/lib/canvas/image-cache.ts:15` و`image-cache.test.ts` (5 حالات) ✅ |
| تحرير الكاشات عند مستند جديد | `reset()` يُفرغ كاش الصور الكامل ونسخ العرض 2048px معاً، فلا تتراكم ذاكرة المستندات السابقة عند فتح/إغلاق عدة مشاريع في جلسة واحدة | `frontend/src/lib/store/slices/core-slice.ts:320` و`frontend/src/lib/canvas/display-image.ts:126` ✅ |
| إزالة برميل المحرر | `@/components/editor` كان يُسحب من `license-lock-screen.tsx` (محموّل مع `App`) فيجرّ كل الحوارات واللوحات — ومنها `print-dialog` — إلى الحزمة الرئيسية ويُلغي `lazy()`. استُبدل باستيرادات مباشرة في `App` و`app-dialogs-host` و`license-lock-screen`، وحُذف `index.ts` لمنع التكرار | `frontend/src/App.tsx:6` و`components/editor/system/license-lock-screen.tsx:6` ✅ |
| `exifr` عند الطلب | صار `import('exifr')` داخل `getExifOrientation` بدل استيراد ثابت: المسار السريع للصور المحلية يقرأ الترويسة في Go، فلم يعد ~75 ك.ب يُحمَّل عند الإقلاع | `frontend/src/lib/io/exif-utils.ts:14` ✅ |
| قياس الأثر | الحزمة الرئيسية بعد البناء: **1,851.16 kB (504.53 kB gzip)** مقابل **1,978.04 kB (546.19 kB gzip)** قبل الجلسة (−126.9 kB خام / −41.7 kB gzip)، وانفصل `print-dialog` في chunk 45.24 kB و`exifr` في 75.30 kB | `npx vite build` (2026-10-20) ✅ |
| بوابات الجودة | `tsc --noEmit` و`eslint` بلا أخطاء، Vitest كامل: **138 ملفاً / 1216 ناجحة + 1 متخطاة**، و`go vet` + `go test ./internal/service` أخضر | `frontend/` + `go test` (2026-10-20) ✅ |

**الفجوات المتبقية من التشخيص (لم تُنفَّذ في هذه الجلسة):** نقل شبكة OpenCV/كشف المستند خارج الخيط الرئيسي، وتوليد مصغّرات الصور في Go بدل الاعتماد على صور كاملة الدقة، وتوسيع مسار التركيب السريع للطباعة في Go، وضبط سقف ذاكرة صريح لمسار الطباعة (144MP × 4 بايت لكل كانفس مع تزامن `NumCPU`).

---

## 1.13 سجل جلسة ترقية نظام النصوص وإعادة تصميم أعمدة الخصائص — 20 أكتوبر 2026

**المرجع:** طلب المالك — «طور نظام النصوص كذلك» ثم «تحسين تصميم أعمدة الخصائص بشكل احترافي أكثر ولجميع الحالات للنصوص والصور والأشكال»، مع شرط **بلا منطق مكرر** وإعادة استخدام أقصى ما هو موجود.

| البند | التنفيذ | الإثبات |
| --- | --- | --- |
| كتالوج نصوص واحد | `TEXT_PRESETS` أصبح المصدر الوحيد للاسم والوصف والفئة ومجموعة القائمة ونص المعاينة واللون وارتفاع السطر، مع `TEXT_PRESET_CATALOG` و`TEXT_PRESET_CATEGORY_LABELS`. يستهلكه شريط «إضافة نص»، شبكة النصوص السريعة في التحرير الحر، والأنماط السريعة في تبويب النص — بلا قوائم أو نصوص موازية | `lib/templates/text-presets.ts:1` و`toolbar-add-text.tsx` و`freeform-panel-constants.ts` و`text-type-tab.tsx` ✅ — **تصحيح مؤرَّخ (2026-10-21 — الجلسة 1.29):** حُذف `toolbar-add-text.tsx` ونُقل الإدراج إلى `freeform-elements-tab.tsx`؛ ما ورد يصف حالة الجلسة 1.13 تاريخياً. |
| تعبئة النصوص بالصور | تبويب لون النص يعيد استخدام `GradientPicker` بوضع الصورة و`ImageFillControls` نفسها المستخدمة للأشكال، مع `normalizeImageFillPatch` مشتركة. النص المستقيم يرسم عبر `fillPatternImage` مع `fillPriority='pattern'` (إلزامي وإلا غلب اللون النقش) | `text-color-tab.tsx` و`fill-utils.ts` و`image-fill-patch.ts` ✅ |
| تعبئة النص المقوّس بلا تشويه | النص المقوّس يرسم تعبئة كل حرف عبر `createElementGlyphPainter`؛ التدرج يُعاد إسقاطه إلى فضاء الحرف، ونقش الصورة يُصحح بمصفوفة `inverseGlyphTransform · elementMatrix` ليبقى ثابتاً في فضاء العنصر بدل أن يدور مع كل حرف | `lib/canvas/fill-paint.ts:1` و`curved-text-utils.ts` و`test/fill-paint.test.ts` ✅ |
| رياضيات تعبئة مشتركة | استُخرجت `buildGradientFill` و`resolveElementFill` و`createElementPattern` و`createElementGlyphPainter` ومعادلات الأفاين إلى `fill-paint.ts`، ويستهلكها النص المستقيم والمقوّس والتصدير اليدوي — رياضيات واحدة بدل نسخ متباعدة | `fill-paint.ts` و`export-canvas-fitted.ts` و`test/fill-utils.test.ts` ✅ |
| أنماط التفاف النص | `word` / `char` / `none` متاحة في تبويب النص، ويطبقها `wrapTextLines` المشترك في المعاينة والتصدير؛ `none` يحفظ الأسطر كما هي بدل التفاف قسري | `lib/canvas/text-layout.ts:1` و`text-node.tsx` و`text-type-tab.tsx` و`test/text-layout.test.ts` ✅ |
| حالة تصيير مشتركة | `resolveTextRenderState` توحّد الأرقام العربية وتحويل حالة الأحرف ومعالجة تباعد الحروف العربية بين المعاينة والتصدير، بدل منطقين منفصلين | `lib/canvas/text-helpers.ts` و`test/text-render-state.test.ts` ✅ |
| رأس خصائص سياقي | رأس اللوحة يعرض نوع العنصر وأبعاده بالبكسل أو عدد التحديد المتعدد، مع إجراءين دائمين للإظهار والقفل خارج منطقة التعطيل — فيبقى القفل قابلاً للفك حتى لو تعطلت بقية التبويبات | `properties-panel.tsx` و`element-header-badge.tsx` ✅ |
| تبويبات مفهومة وثابتة | التبويبات الأربعة صارت نصاً + أيقونة («تنسيق/تعبئة أو ضبط/تأثير/ترتيب») بدل أيقونات فقط، مع أسماء وصول وصفية، وشريط لاصق يبقى ظاهراً أثناء تمرير الأقسام | `element-properties.tsx` و`fluent-segmented-control.tsx` ✅ |
| هرمية أقسام أهدأ | `FluentSection` خفّف الحدود والظلال، جعل شارة الأيقونة محايدة 24px، واعتمد عنواناً semibold وفاصلاً أخف؛ ووُحّد إيقاع 10px بين أقسام النص والصورة والشكل والترتيب | `ui/blocks/fluent-section.tsx` ولوحات الخصائص ✅ |
| ثبات التسلسل | حقول `wrap` و`fillImage*` معلنة في `schema.ts`، فلا تُسقط عند الحفظ | `lib/schema.ts` ✅ |
| بوابات الجودة | `tsc --noEmit` و`eslint` بلا أخطاء/تحذيرات، وVitest كامل أخضر، وبوابة التوثيق تمر | `changelog/fragments/20261020-text-system-and-properties-panel.md` ✅ |
| إصلاح تلميح اللون وهندسة الألواح | تلميح «تغيير اللون» صار Fluent داخل التطبيق ويفتح أعلى الزر بدل التلميح الأصلي الذي كان يتسرّب أسفل بطاقة «إطار الصور»؛ وأُضيفت أسماء وصول لمفتاحَي «زوايا مستقلة» و«رأس في البداية»، واختُصر «شبكة كاملة» مرئياً إلى «الكل» مع إبقاء الاسم الوصفي في `aria-label` | `shared-controls.tsx` و`shape-properties.tsx` و`collage-paper-tools-tab.tsx` و`changelog/fragments/20261020-properties-color-and-geometry-fixes.md` ✅ |

---

## 1.12 سجل جلسة ترقية نظام الأشكال: كتالوج موحّد وتعبئة بالصور وأنواع Konva جديدة — 20 أكتوبر 2026

**المرجع:** طلب المالك — «الأشكال يجب أن تتجاوز الدائرة والمستطيل: أشكال كثيرة وقدرات مثل التعبئة بالصور وغيرها»، مع بحث في التوثيق والمكتبات، وشرط صريح: **بلا منطق مكرر** وإعادة استخدام أقصى ما هو موجود.

| البند | التنفيذ | الإثبات |
| --- | --- | --- |
| كتالوج أشكال موحّد | `lib/io/shape-catalog.ts` مصدر الحقيقة الوحيد: 33 شكلاً في ثلاث فئات (هندسية/أسهم/رموز) بمعرّف وتسمية ونوع Konva أو مسار SVG 24×24 ونسبة إدراج وخصائص ابتدائية. حلّ محل أربع قوائم مكررة (toolbar + `QUICK_SHAPES` + `VECTOR_SHAPES` + مفتاح أيقونات الخصائص) | `shape-catalog.ts:1` و `svg-paths.ts:1` و `test/shape-catalog.test.ts` ✅ |
| معاينة هندسية مشتركة | `ShapeGlyph` يرسم الشكل فعلياً (نجمة/مضلع بعدد الرؤوس، قوس/قطاع بزاويتهما) ويستهلكه شريط الإضافة وشبكة التحرير الحر وعنوان بطاقة الخصائص معاً | `components/editor/shapes/shape-glyph.tsx:1` ✅ |
| أنواع Konva أصلية جديدة | `Konva.Arc` و`Konva.Wedge` (نصف قطر داخلي/خارجي وزاوية تبدأ من أعلى الشكل)، سهم مزدوج الرأسين عبر `pointerAtBeginning`، رؤوس نجمة حتى 20 وعمق قابل للضبط، زوايا مستقلة للمستطيل `[أعلى-يسار…]` | `shape-node.tsx:1` و `shape-properties.tsx` ✅ |
| أنماط الحد | متصل/متقطع/منقّط عبر `dash` + `lineCap` الأصليين، والشرطات تتدرّج مع سماكة الحد، والمنقّط يُثبَّت مستديراً حسب توثيق Konva | `lib/canvas/shape-pattern.ts:1` ✅ |
| تعبئة الأشكال بالصور | `fillType='image'` عبر `fillPatternImage` مع `fillPriority='pattern'` (إلزامي وإلا غلب اللون النقش)، أوضاع `stretch/cover/contain/tile` + حجم التكرار + دوران + إزاحة، داخل منتقي التعبئة الموجود نفسه (خيار رابع) بدل منتقٍ جديد | `fill-utils.ts` و `image-fill-controls.tsx` و `gradient-picker.tsx` ✅ |
| رياضيات نقش واحدة للمعاينة والتصدير | `computeShapePattern` + `shapePatternMatrix` مشتركتان بين عقدة Konva والتصدير اليدوي، مع `toLocalPattern` لتعويض مقياس أشكال المسار (viewBox) — فلا تتباين المعاينة والطباعة | `shape-pattern.ts` و `export-canvas-fitted.ts` و `test/shape-pattern.test.ts` ✅ |
| إزالة تكرار اختيار الصور | استخراج `pickLocalImage()` في `file-dialog-utils.ts` (تُمرَّر بيانات `data:image/` فقط إلى `SaveImageFromBase64`) واستخدامه في خصائص الصورة وتعبئة الشكل، مع إعادة توجيه تأكيد بوابة التوثيق BUG-CRIT-03 إلى المصدر الوحيد | `file-dialog-utils.ts:1` و `scripts/docs-gate.mjs` ✅ |
| ثبات التسلسل | إعلان كل الحقول الجديدة في `schema.ts` (أنواع arc/wedge، fillType=image، fillImage*، radiusCorners، starPoints/starInnerRatio، strokeStyle/lineCap، pointerAtBeginning) — zod يُسقط غير المعلن عند الحفظ | `lib/schema.ts` و `lib/store/types.ts` ✅ |
| بوابات الجودة والتوثيق | `tsc --noEmit` صفر أخطاء · `eslint` صفر تحذيرات · اختبارات Vitest خضراء · `node scripts/docs-gate.mjs` أخضر | `changelog/fragments/20261020-canvas-shape-system-upgrade.md` ✅ |

---

## 1.11 سجل جلسة صقل التدرج الهرمي لطباعة الواجهة وتخفيف سُمك المنزلقات والإعدادات — 19 أكتوبر 2026

**المرجع:** ملاحظة وطلب المالك — ثقل وسُمك خطوط شريط الخصائص الأيمن وتسميات الحقول والمنزلقات، وطلب تخفيفها لتتناسب مع معايير Microsoft Fluent 2 الراقية.

| البند | التنفيذ | الإثبات |
| --- | --- | --- |
| حل مشكلة Fallback الأوزان في Readex Pro | خط Readex Pro المشحون محلياً يحوي وزنين أساسيين (400 Regular و 700 Bold). عند استخدام فئة Tailwind `font-semibold` (الوزن 600) كان المتصفح يُسقط النص تلقائياً على 700 Bold، مما حوّل كل تسميات المنزلقات وصف الإعدادات إلى خط عريض جداً نافس عناوين الأقسام وأفقد اللوحة تدرجها البصري | `offline-fonts.css:1` و `fluent-slider-field.tsx:174` ✅ |
| تخفيف تسميات المنزلقات وصف الإعدادات (Regular 400) | تحويل تسميات الحقول في `FluentSliderField` و `FluentSettingRow` بنمطي العرض (الأفقي المدمج والعمودي) من `font-semibold` إلى `font-normal text-foreground/80` و `text-foreground/85`، مما أنتج خطاً ناعماً وأنيقاً يبرز عنوان القسم العريض (`font-bold`) فوقه بسلاسة | `fluent-slider-field.tsx:174` و `fluent-setting-row.tsx:37` و `:76` ✅ |
| ترشيق شارات القيم الرقمية (Tabular Digits) | إزالة `font-bold` من شارات القيم الرقمية للمنزلقات، واعتماد `font-mono text-mini tabular-nums text-muted-foreground` للحفاظ على اصطفاف الأرقام دون إجهاد بصري | `fluent-slider-field.tsx:201` و `:224` ✅ |
| صقل نصوص البطاقات الفرعية في خصائص الصورة | تحويل نصوص العناوين المصغرة والأزرار السريعة (`قوالب الاستوديو` و `قناع الشكل`) من `font-bold` و `font-semibold` إلى `font-normal` لتفادي تشوه وانغلاق تجاويف الحروف العربية في الأحجام الدقيقة | `image-properties.tsx:77` و `:767` ✅ |
| بوابات الجودة والتوثيق | `tsc --noEmit` صفر أخطاء · `eslint` صفر تحذيرات · 23 اختبار Vitest أخضر 100% · `node scripts/docs-gate.mjs --strict-refs` أخضر | `changelog/fragments/20261019-ui-typography-refinement.md` ✅ |

---

## 1.10 سجل جلسة إعادة هيكلة لوحة خصائص الصورة ونقل الفلاتر لتبويب التأثيرات — 19 أكتوبر 2026

**المرجع:** طلب المالك — تخفيف الازدحام في الشريط الأيمن لخصائص الصورة واستغلال التبويبات القياسية باحترافية، بنقل بطاقة الفلاتر (المرشحات) الكبيرة إلى تبويب "التأثيرات" (Effects).

| البند | التنفيذ | الإثبات |
| --- | --- | --- |
| فك ازدحام تبويب التنسيق (Style Tab De-cluttering) | إزالة بطاقة المرشحات الكبيرة (9 معاينات صور) من تبويب التنسيق (`ImageStyleProperties`)، ليقتصر التبويب الأول حصراً على: أدوات الذكاء الاصطناعي (2x2) + خلفية الصورة + أدوات الصورة والقص، مما يجعله خفيفاً ويناسب ارتفاع اللوحة بلا تمرير مجهد | `image-properties.tsx:405` ✅ |
| استغلال تبويب التأثيرات باحترافية (Effects Tab) | استحداث مكوّن `ImageEffectsProperties` الذي يجمع بطاقة "المرشحات" (`ImageFiltersSection`) في الأعلى، تليها بطاقة "الظل والوهج" (`ShadowGlowSection`)، مما يمنح التأثيرات البصرية قسماً مخصصاً متكاملاً | `image-properties.tsx:288` و `element-properties.tsx:165` ✅ |
| تحديث التلميحات الدلالية للتبويبات | ضبط نصوص التلميحات (`Tooltip`) في شريط التبويبات ليصبح تبويب `adjust` مخصصاً لـ "تعديل الألوان والإضاءة" وتبويب `effects` لـ "المرشحات وتأثيرات الظل" | `element-properties.tsx:75` و `:85` ✅ |
| بوابات الجودة والتوثيق | `tsc --noEmit` صفر أخطاء · `eslint` صفر تحذيرات · اختبارات vitest خضراء 100% · `node scripts/docs-gate.mjs --strict-refs` أخضر | `changelog/fragments/20261019-image-properties-filters-to-effects.md` ✅ |

---

## 1.09 سجل جلسة التوازن البصري والتأطير الرباعي الكامل لمساحة الكانفاس — 19 أكتوبر 2026

**المرجع:** طلب المالك — تحقيق توازن بصري مثالي بنمط أدوات التصميم العالمية (Photoshop) عبر تعويض النقص في الجهتين اليمنى والسفلية بمساطر وأشرطة تمرير تفاعلية تحرك الكانفاس أعلى وأسفل ويمين ويسار.

| البند | التنفيذ | الإثبات |
| --- | --- | --- |
| التأطير الرباعي المتماثل لمساحة العمل (4-Sided Viewport Framing) | إغلاق إطار الكانفاس بأضلاعه الأربعة وزواياه الأربع: المسطرة الأفقية بالأعلى (20px) + المسطرة الرأسية باليسار (20px) + شريط التمرير الرأسي باليمين (20px) + شريط التمرير الأفقي بالأسفل (20px) مع توحيد الخلفيات الدلالية `bg-ruler-surface` والحدود `border-ruler-border` | `canvas-rulers.tsx:215` و `editor-canvas.tsx:598` ✅ |
| شريطا التمرير التفاعليان بنمط Fluent 2 فائق السرعة (Canvas Scrollbars) | مكونات `CanvasHorizontalScrollbar` و `CanvasVerticalScrollbar` في `canvas-scrollbars.tsx` بتصميم كبسولة ملساء عصرية (Fluent Pill) تتمدد بسلاسة عند التحويم خالية من أزرار الأسهم الكلاسيكية والحزوز، تدعم السحب المباشر مع التقاط المؤشر (Pointer Capture)، النقر على المسار للقفز، النقر المزدوج للتوسيط، والتنقل بمفاتيح الأسهم (WAI-ARIA)، مع ربط فوري بمسار الـ GPU Compositor اللحظي (Zero Latency) في `use-canvas-viewport.ts` أثناء التمرير بالعجلة والمسافة والتكبير | `canvas-scrollbars.tsx:1` و `use-canvas-viewport.ts:182` و `frontend/test/canvas-scrollbars.test.tsx:1` ✅ |
| زاوية إعادة التوسيط الفورية (Corner Recenter Button) | زر تفاعلي في الزاوية السفلية اليمنى (20x20px) بنقطة التقاء شريطي التمرير مزود بأيقونة `Crosshair` وتلميح Fluent لإعادة توسيط الكانفاس فورياً بدقة رياضية 1:1 | `canvas-scrollbars.tsx:425` و `editor-canvas.tsx:610` ✅ |
| التوافق مع وضع التركيز والطباعة | إخفاء المساطر وأشرطة التمرير كلياً عند تعطيل المساطر أو تفعيل وضع التركيز (Zen Mode) أو وضع الطباعة (`printMode`) لإتاحة مساحة رسم حرة تمتد لكامل الشاشة بلا عوائق | `editor-canvas.tsx:600` و `:615` ✅ |
| بوابات الجودة والتوثيق | `tsc --noEmit` صفر أخطاء · `eslint` صفر تحذيرات · 18 اختبار Vitest أخضر بالكامل (شمل 9 اختبارات جديدة لشريط التمرير والتأطير) · `node scripts/docs-gate.mjs --strict-refs` أخضر | `changelog/fragments/20261019-canvas-viewport-scrollbars.md` ✅ |

---

## 1.08 سجل جلسة الحفاظ التام على شفافية الصور المعزولة في مسار الذكاء الاصطناعي — 19 أكتوبر 2026

**المرجع:** طلب المالك — القضاء التام على تحول خلفيات الصور المعزولة (PNG) إلى خلفية سوداء عند الترميم أو التوضيح بالذكاء الاصطناعي في Modal AI وإلغاء الحاجة لإعادة قص الصورة.

| البند | التنفيذ | الإثبات |
| --- | --- | --- |
| دعم قناة الألفا في خادم Modal السحابي | استبدال `cv2.IMREAD_COLOR` بـ `cv2.IMREAD_UNCHANGED`، عزل قناع الشفافية، وترميم الوجه والملابس بنماذج CodeFormer و Real-ESRGAN، ثم تكبير قناع الشفافية هندسياً بـ `cv2.INTER_LANCZOS4` وإعادة دمجه كصورة BGRA مشفرة بصيغة PNG | `modal_ai/upscaler.py:247` و `:336` و `:427` ✅ |
| تشفير PNG التلقائي للصور الشفافة في Go | فحص عينات الشفافية في `internal/service/ai_service.go` للصور المحلية `/local-image/...` وتشفيرها كـ `data:image/png;base64` بـ `png.Encode` بدلاً من فرض `jpeg.Encode` على خلفية سوداء | `internal/service/ai_service.go:420` و `internal/service/ai_service_test.go:538` (PASS 0.02s) ✅ |
| شبكة أمان العميل (Client Safeguard) | دالة `ensureTransparencyPreserved` في `use-ai-enhance.ts` تعيد زراعة قناع الشفافية الأصلي بدقة 1:1 عبر `destination-in` في حال فقدان الشفافية من أي رد سحابي غير محدث | `frontend/src/hooks/use-ai-enhance.ts:90` و `:372` ✅ |
| بوابات الجودة والتوثيق | `go test` لخدمة AI بالكامل أخضر · `npm run lint` صفر أخطاء · `npm run typecheck` صفر أخطاء · `node scripts/docs-gate.mjs --strict-refs` أخضر | `changelog/fragments/20261019-ai-transparency-preservation.md` ✅ |

---

## 1.07 سجل جلسة إزالة أيقونة وضع التركيز المكررة من شريط أدوات الكانفاس — 19 أكتوبر 2026

**المرجع:** طلب المالك — التخلص من الازدواجية البصرية لأيقونة العين (وضع التركيز / Zen Mode) بحذفها من شريط أدوات الكانفاس السفلي (`CanvasViewportDeck`) والإبقاء عليها حصرياً في الشريط الجانبي (`WorkspacePanelRail`).

| البند | التنفيذ | الإثبات |
| --- | --- | --- |
| استئصال أيقونة العين من شريط أدوات الكانفاس السفلي | حذف زر `ZenMode` وأيقونتي `Eye` و `EyeSlash` والخصائص غير المستخدمة (`isZenMode`, `onToggleZenMode`) من `CanvasViewportDeck`، ليقتصر الشريط السفلي حصراً على وظائف الزوم والملاءمة والمساطر والشبكة والمقاسات | `frontend/src/components/editor/canvas/canvas-viewport-deck.tsx:40` و `:344` ✅ |
| تنظيف استدعاء `CanvasViewportDeck` في `App.tsx` | تبسيط استدعاء المكون في `footerContent` بإزالة الخصائص الزائدة | `frontend/src/App.tsx:662` ✅ |
| توثيق سيادة الشريط الجانبي على وضع التركيز | تثبيت زر وضع التركيز حصرياً في شريط الأدوات الجانبي `WorkspacePanelRail` مع اختصار `Ctrl+.` | `frontend/src/components/editor/workspace/workspace-panel-rail.tsx:574` ✅ |
| بوابات الجودة والتوثيق | `npm run lint` صفر أخطاء · `npm run typecheck` صفر أخطاء · `node scripts/docs-gate.mjs --strict-refs` أخضر | `changelog/fragments/20261019-ui-deduplicate-zen-mode-eye.md` ✅ |

---

## 1.06 سجل جلسة استقرار عجلة الكانفاس وحدود التحريك وتفلطح حاويات العرض — 19 أكتوبر 2026

**المرجع:** متابعة تدقيق معماري لسلوك التاتش باد أثناء التمرير، وارتجاج الكانفاس عند فتح/طي الألواح، وتداخل سياقات `overflow-hidden` في شجرة محرر التصميم.

| البند | التنفيذ | الإثبات |
| --- | --- | --- |
| إزالة snap-back وارتعاش لوحة اللمس | توحيد `clampStagePos` على قاعدة واحدة لكل مدخلات التحريك مع إزالة تكميم الأعداد الصحيحة `Math.round` لمنع تقطع حركة الكسور، وتجاهل رعشات القرص المجهرية (< 0.5px) في `flushWheel` لمنع تداخل الزوم مع التمرير بإصبعين ودمج الإزاحات المتزامنة مع تحديث المسرح فورياً (Imperative Fast-Path) وتأجيل التزام الستور | `frontend/src/components/editor/canvas/use-canvas-viewport.ts:55` و `:185` و `frontend/test/canvas-viewport-bounds.test.ts:91` ✅ |
| حرية تأطير وسحب الصور المكبرة | معالجة انعكاس حدود `Math.min/max` في `useKonvaDrag` عند تكبير الصورة عن الكانفاس لتأطير الوجه، مما يتيح تمرير أي جزء من الصورة بحرية تامة دون قفل حركي | `frontend/src/hooks/use-konva-drag.ts:233` و `frontend/src/hooks/use-konva-drag.test.ts:293` ✅ |
| قَص الطباعة الآلي فائق الدقة (300+ DPI) | تحويل مسار التصدير تلقائياً إلى التقاط المسرح بدقة الطباعة الكاملة عند خروج أطراف الصورة خارج الكانفاس، مما يقص الأطراف الزائدة آلياً على حدود الورقة ويمنع أخطاء رفض الطباعة (`invalid item geometry` أو `overflowItem`) | `frontend/src/lib/print/single-print-composition.ts:137` و `frontend/test/single-print-composition.test.ts:102` ✅ |
| عزل خطوط المحاذاة الذكية عن رندر الأب | نقل `activeGuides` إلى مخزن التفاعل اللحظي `useCanvasInteraction` وعزل مكون `CanvasActiveSnapGuides` لمنع إعادة رندر شجرة الكانفاس والمساطر أثناء سحب العناصر | `frontend/src/lib/canvas/canvas-interaction-store.ts:19` و `frontend/src/components/editor/canvas/editor-canvas.tsx:303` ✅ |
| تسريع معالجة حركة المؤشر والمساطر | تغليف مستمع سحب خطوط الإرشاد `useUserGuides` داخل `requestAnimationFrame` وتأجيل قياس `getBoundingClientRect` في `useRulerMetricsPreview` لمنع Layout Thrashing | `frontend/src/components/editor/canvas/use-user-guides.ts:133` و `frontend/src/components/editor/canvas/use-ruler-metrics.ts:108` ✅ |
| تثبيت شريط الأدوات السفلي ومنع اختفائه | إزالة `h-full` من الحاوية الداخلية `min-h-0 overflow-hidden` في `workspace-canvas-shell` لتأخذ `calc(100% - 40px)` بحرية واستعادة سياق `overflow-hidden` في `workspace-layout` حتى لا يُدفع شريط `footer` المثبت خارج الشاشة عند فتح لوحة الخصائص | `workspace-layout.tsx:57` و `:96` و `:100` و `editor-canvas.tsx:303` و `:326` ✅ |
| تثبيت مقاس Viewport أثناء حركة الألواح | خطاف `useStableViewportSize` يقيس أول مرة فوراً ثم يؤجل التزام تغييرات `ResizeObserver` 140ms، فلا يعاد تخصيص `<Stage width height>` مع كل إطار من أنيميشن 100ms | `frontend/src/components/editor/canvas/use-stable-viewport-size.ts:15` و `use-canvas-viewport.ts:94` ✅ |
| تنظيف مراقبات المساطر المكررة | حذف `ResizeObserver` وقياسات `rulerMetrics/containerSize` غير المستهلكة من `useRulerMetricsPreview`، والاكتفاء بمعالجي حركة المؤشر وتثبيت الإحداثيات على بكسل الجهاز | `frontend/src/components/editor/canvas/use-ruler-metrics.ts:8` و `editor-canvas.tsx:114` ✅ |
| تطهير مقاسات الورق واعتماد مقاسات الطباعة الفعلية | تطهير القوائم من المقاسات الوهمية غير الفيزيائية (مثل 35×45مم كـ "ورقة" مستقلة أو مقاسات السوشيال ميديا) وحصرها في 3 فئات طباعة حقيقية متوفرة في الأسواق وتدعمها الطابعات (ورق صور 10×15، 13×18، 15×20 · ورق قياسي A4، A5، A6، A3، Letter · كروت وبطاقات 85×55، 90×50)، مع إضافة A6 و biz-card للمقاسات العامة الموحدة | `frontend/src/lib/templates/constants.ts:31` و `frontend/src/components/editor/panels/freeform/freeform-panel-constants.ts:230` ✅ |
| منع ازدواجية عناصر التحكم (الأبعاد الحرة) | الالتزام الصارم بمبدأ "المصدر الوحيد للحقيقة" وحظر ازدواجية الميزات، بإبقاء تخصيص الأبعاد الحرة (W × H ملم/بكسل وقفل النسبة) حصراً في لوحة خصائص مساحة العمل بالجانب الأيمن (`CanvasDimensionsPanel`) وإلغاء حقول الإدخال المكررة من تبويب القوالب بالجانب الأيسر (`FreeformPresetsTab`) ليبقى مخصصاً لاختيار مقاسات الورق القياسية | `frontend/src/components/editor/properties/general/canvas-dimensions-panel.tsx:44` و `frontend/src/components/editor/panels/freeform/freeform-presets-tab.tsx:35` ✅ — **تصحيح مؤرَّخ (2026-10-21 — الجلسة 1.29):** حُذف `freeform-presets-tab.tsx` كلياً مع وجهة المقاسات، وبقيت الأبعاد الحرة حصراً في `CanvasDimensionsPanel` والمقاسات القياسية في كتالوج الورق. |
| بوابات الجودة والتوثيق | `tsc --noEmit` بلا أخطاء · `eslint` بلا تحذيرات · `docs-gate --strict-refs` أخضر · اختبارات vitest تمر 100% (35/35) | 2026-10-19 ✅ |

---

## 1.05 سجل جلسة التدقيق الاحترازي النهائي للوحة الإدارة وموقع الهبوط المخدومين عبر GitHub Pages — 19 أكتوبر 2026

**المرجع:** المراجعة الاحترازية الشاملة النهائية لموقع الهبوط (`admin-web`) ولوحة إدارة التراخيص والخوادم السحابية قبل مرحلة الإطلاق النهائي والمستقر، مع تأكيد استضافة GitHub Pages وتأمين المسارات وإمكانية الوصول.

| البند | التنفيذ | الإثبات |
| --- | --- | --- |
| تعزيز إمكانية وصول نافذة تعديل المشترك | إضافة مستمع مفتاح `Escape` لإلغاء وإغلاق النافذة، دعم الإغلاق بالنقر على الخلفية المعتمة، وتثبيت سمات الوصول `role="dialog" aria-modal="true" aria-labelledby` | `admin-web/src/pages/admin/components/EditUserModal.tsx:43` ✅ |
| مدخل مباشر لمسار `/admin` على GitHub Pages | إضافة توليد مجلد `dist/admin/index.html` في خط سير النشر الآلي `.github/workflows/deploy-pages.yml` لتمكين الوصول المباشر للوحة برمز حالة 200 OK دون الاعتماد على 404 | `.github/workflows/deploy-pages.yml:52` ✅ |
| تحديث خريطة الموقع والفهرسة للأمان والقانونية | إدراج رابطي سياسة الخصوصية `/privacy` وشروط الخدمة `/terms` في `sitemap.xml` لتعزيز التوثيق والامتثال لمحركات البحث وبوابات الدفع | `admin-web/public/sitemap.xml:9` ✅ |
| مواءمة التوثيق لاستضافة GitHub Pages | تصحيح توصيف المنصة في دستور `.agents/AGENTS.md` والتعليق في `admin-web/src/lib/version.ts` للتأكيد على أن المنصة منشورة كلياً على GitHub Pages وتخدم نقاط النهاية الثابتة | `.agents/AGENTS.md:15` + `version.ts:4` ✅ |
| اختبارات متكاملة معزولة للوحة الإدارة | كتابة 18 اختباراً متكاملاً في الذاكرة عبر mock client يحاكي بدقة RPCs وPostgREST، يتحقق من الصلاحيات والفرز والبحث والحسابات المالية والتوليد والتصدير دون لمس الإنتاج | `admin-web/src/pages/admin/__tests__/admin-integrated.test.ts:1` ✅ |
| تعريب شامل واحترافي لكافة نصوص ومكونات لوحة الإدارة | استبدال كافة المصطلحات الإنجليزية والمختصرات في 8 مكونات (Sidebar, Header, StatsCards, StatsBreakdown, UsersTable, KeysTable, UsageLogsTable, SettingsForm, EditUserModal, LoginForm) بنصوص عربية واضحة ومختصرة وملائمة للتصميم | `admin-web/src/pages/admin/components/Sidebar.tsx:35` ✅ |
| بوابات الجودة والتحقق الآلي | بناء الموقع بالكامل (`npm run build` ناجح بنسبة 100%) · فحص الأنواع (`tsc -b` 0 أخطاء) · فحص اللينتر (`oxlint` 0 أخطاء) · اختبارات `vitest` (32/32 ناجحة عبر ملفين) · `docs-gate --strict-refs` أخضر | 2026-10-19 ✅ |

---

## 1.04 سجل جلسة ترشيق ذاكرة ماسح المستندات — Blob-first وتقنين أبعاد الاستعدال بسقف 50MP — 18 أكتوبر 2026

**المرجع:** مراجعة "الميزات التي تحتاج عناية مطابقة لحزمة الملصقات" حددت ماسح المستندات كأقرب توأم: مسار تصديره يراكم Data URLs بدقة الطباعة لكل مستند محدد ثم يعيد فك ترميزها في واجهة الخصائص، وأبعاد الاستعدال غير مسقوفة إطلاقاً (صورة فائقة الدقة قد تطلب كانفاس ~69MP).

| البند | التنفيذ | الإثبات |
| --- | --- | --- |
| مسار Blob-first للإدراج المفرد والمتعدد | `handleApplyActive`/`handleApplySelected` يولّدان PNG Blob مباشرة من كانفاس الاستعدال (`canvasToBlob`) بدل `toDataURL`، مع حارس إلغاء/إغلاق بعد الترميز | `frontend/src/components/editor/document-scanner/hooks/use-scanner-processor.ts:141` + `:171` ✅ |
| رفع ثنائي بلا Base64 | واجهة الخصائص ترفع كل Blob عبر `uploadMediaBlob` إلى خادم الوسائط، مع تراجع Data URL للبيئات بلا مسارات أصلية | `frontend/src/components/editor/properties/panels/image-properties.tsx:222` ✅ |
| سقف بكسل موحّد 50MP | وحدة `target-dims.ts` مستخرجة من الـhook: `clampToPixelBudget` يقلّص تدريجياً بنسبة √(السقف/المساحة) ويحفظ النسبة، بالاعتماد على `MAX_EXPORT_PIXELS` المشترك | `frontend/src/components/editor/document-scanner/core/target-dims.ts:15` ✅ |
| وحدة تحويل مشتركة | نقل `canvasToBlob`/`blobToDataUrl` إلى `lib/canvas/canvas-blob.ts` وتحديث استيرادات مسارات الملصقات الأربعة | `frontend/src/lib/canvas/canvas-blob.ts:18` ✅ |
| اختبارات الجلسة | ملف جديد `target-dims.test.ts` (8 حالات): ثوابت المعاينة لكل نوع مستند، حدود التصدير الدنيا، التقليص عند 50MP بحفظ النسبة، والمدخلات الشاذة | `frontend/src/components/editor/document-scanner/__tests__/target-dims.test.ts:1` ✅ |
| بوابات الجودة والتحقق | `typecheck` نظيف · `lint` نظيف (0 تحذيرات) · شبكة Vitest كاملة 129 ملفاً (1161 ناجحة + 1 متخطاة، 0 فاشلة) · `docs-gate --strict-refs` أخضر | 2026-10-18 ✅ |

---

## 1.03 سجل جلسة خطة النهوض بنظام الملصقات — Sticker Studio 2.0 — 18 أكتوبر 2026

**المرجع:** طلب المالك — خطة شاملة لتحسين نظام الملصقات وتطويره تفاعلياً واحترافياً، بالاعتماد على الحلول الجاهزة والمكتبات المتخصصة، مع مراعاة الأمان والأداء وحماية الذاكرة وجودة الإصدار والطباعة ونظافة الكود والالتزام بدستور `.agents`. **الجلسة نفّذت التخطيط + المرحلة 1 كاملة (نواة buildStickerSvg + Blob-first + ميزانية البكسل + دفتر Object URL + VDP المتدفق).**

| البند | التنفيذ | الإثبات |
| --- | --- | --- |
| خطة تنفيذ من سبع مراحل | توثيق خط الأساس (83 قالباً، 5,782 سطراً، 42 قالباً بمقاس صريح)، والفجوات P0/P1/P2، والمعمارية المستهدفة `StickerDesign v2` + `buildStickerSvg` + `ExportOrchestrator` | `docs/plans/sticker-studio-v2-plan.md:1` ✅ |
| تشخيص P0 مؤكد بالكود | VDP يحتجز 500 صورة في الذاكرة، وBase64 في التصدير، وغياب سقف بكسلات، ومؤقت Object URL عالمي واحد، وازدواجية تعقيم/بناء بين الاستوديو وVDP | `frontend/src/features/stickers/lib/vdp-batch.ts:1` + `frontend/src/features/stickers/lib/svg-rasterizer.ts:1` + `frontend/src/features/stickers/components/sticker-studio-dialog.tsx:1` ✅ |
| نواة بناء موحّدة (P0-1) | `buildStickerSvg` نقطة توليد وحيدة لتعقيم الألوان/الخط/الحقول ثم `generateSvg` ثم postProcess؛ الاستوديو والمعرض الكتلي وVDP تستدعيها حصراً بلا `generateSvg` مباشرة | `frontend/src/features/stickers/lib/sticker-design/build-svg.ts:72` + `sticker-catalog.tsx:65` ✅ |
| مخطط v2 وهجرة متسامحة | `StickerParamsSchema` zod مع `version:2` وحقول sizeMm/bleedMm/safeMm/overrides؛ `migrateStickerParams` يرقّي v1 ويُسقط القيم التالفة حقلاً حقلاً (لا إسقاط التصميم كاملاً)، مع تقميع المفاتيح الخطرة `__proto__` قبل الـsafeParse | `frontend/src/features/stickers/lib/sticker-design/schema.ts:104` + `preset-utils.ts:23` ✅ |
| Blob-first بلا Base64 | `renderSvgToPngBlob` و`generateStickerSheetBlob` بديلاً Data URL في الإدراج/الشيت/التنزيل؛ سطح المكتب يرفع Blob ثنائياً عبر `uploadMediaBlob` إلى `/api/upload-media` | `svg-rasterizer.ts:76` + `sheet-generator.ts:79` + `sticker-studio-dialog.tsx:270` ✅ |
| ميزانية بكسل موحّدة (P0-3) | `assertRasterBudget` 50MP/32k قبل تخصيص أي Canvas في المُصيّر ومولّد الشيت | `frontend/src/features/stickers/lib/export-limits.ts:58` ✅ |
| دفتر Object URL (P0-4) | سجل مركزي بمؤقّت مستقل لكل رابط بدل المؤقت العالمي المتسرّب (M35)، واختباره يعيد إنتاج السيناريو | `frontend/src/lib/io/object-url-registry.ts:31` + `test/object-url-registry.test.ts:29` ✅ |
| VDP متدفّق بإلغاء حقيقي | `onRendered` + `AbortSignal`، إدراج كل 50 بطاقة بإحداثيات محسوبة مقدماً عبر `computeSmartGridLayout` فلا يُحتاج مصفوفة 500 Data URL | `vdp-batch.ts:50` + `vdp-import-dialog.tsx:96` ✅ |
| تعقيم فارغ للمعاينات الكتلية | معاينة المعرض تمر بنقطة البناء الوحيدة بفضّ معرّفات بمفتاح القالب | `sticker-catalog.tsx:68` ✅ |
| تدقيق القوالب آلياً | سكربت `stickers:audit` يقيس defaultMm وربطات data-field-id/data-color-role | `scripts/sticker-template-audit.mjs:1` ✅ |
| اختبارات الجلسة | 4 ملفات جديدة (19 حالة): بناء SVG لكل القوالب بلا NaN، سلامة حقن الألوان/الخط، ميزانية البكسل، دفتر الرابط، ومخطط/هجرة v1→v2 | `test/sticker-build-svg.test.ts` + `test/sticker-export-limits.test.ts` + `test/object-url-registry.test.ts` + `test/sticker-design-schema.test.ts` ✅ |
| بوابة التوثيق | `node scripts/docs-gate.mjs --strict-refs` أخضر بعد مزامنة الجرد والبلوك الأرقام | 2026-10-18 ✅ |

**الفجوات المتبقية عمداً:** المراحل 2–7 من الخطة — Preflight الطباعي، محرك التصدير الكامل `ExportOrchestrator`، الكاش 64MB، تحويع VDP إلى خط عامل، ومصلوف القوالب المتبقية `defaultMm`.

---

## 1.02 سجل جلسة تفعيل خطافات Antigravity وترقية مسارات العمل التشغيلية لمهارات حديثة — 18 أكتوبر 2026

**المرجع:** مراجعة بيئة وتحديثات Antigravity 2.0 وتفعيل الإمكانات المعمارية غير المستغلة: حظر الأوامر المحظورة آلياً، ترقية مسارات العمل القديمة إلى مهارات مدعومة بأوامر سلاش مباشرة، وضبط شروط دورة الحياة.

| البند | التنفيذ | الإثبات |
| --- | --- | --- |
| خطافات الحماية الآلية الصلبة | إنشاء `.agents/hooks.json` و `scripts/agent-hook-pre-command.mjs` لاعتراض أداة `run_command` برمجياً؛ حظر قطعي لأمر `cd`، حظر تشغيل Playwright E2E محلياً، وحظر تجاوز الـ hooks بـ `--no-verify` أو `-n` | `.agents/hooks.json:1` + `scripts/agent-hook-pre-command.mjs:1` ✅ |
| خطاف بدء الجلسة والتذكير البيئي | إنشاء `scripts/agent-hook-session-start.mjs` للتحقق من حالة الـ fragments في `changelog/fragments/` وحقن إشعار أمني لبدء الجلسات الجديدة | `scripts/agent-hook-session-start.mjs:1` ✅ |
| ترقية مسارات العمل القديمة إلى Skills | تحويل مسارات العمل الأربعة من `.agents/workflows/` إلى مهارات كاملة بـ YAML frontmatter في `.agents/skills/` (`canvas-export-qa`, `database-migration`, `release-deployment`, `security-audit`) وتفعيل أوامر السلاش المباشرة | `.agents/skills/canvas-export-qa/SKILL.md:1` + `.agents/skills/release-deployment/SKILL.md:1` ✅ |
| مزامنة الدستور ومصفوفة الحوكمة | تحديث `.agents/AGENTS.md` وقاعدة الحوكمة `.agents/rules/architecture-governance.md` لتوثيق الحظر الآلي عبر الـ hooks وإدراج المهارات الأربع الجديدة في فهرس المهارات | `.agents/AGENTS.md:20` + `.agents/rules/architecture-governance.md:11` ✅ |
| بوابات الجودة والتحقق | نجاح فحص بوابة التوثيق `node scripts/docs-gate.mjs --strict-refs` ونجاح دورة GitHub Actions CI السحابية 100% بكافة وظائفها الـ 11 | 2026-10-18 (Run ID: 39143230995) ✅ |

---

## 1.01 سجل جلسة استئصال حوار طباعة المتصفح والتحول للطباعة الأصلية المباشرة 100% — 18 أكتوبر 2026

**المرجع:** توجيه المالك بحصر التطبيق على نظام Windows واعتماد نظام الطباعة الأصلي المباشر (Win32 GDI Spooler) بنسبة 100%، واستئصال حوار المتصفح (`window.print`) وحاوية DOM المفرغة وتأخيرات Radix، وفصل مسار CMYK كملف TIFF مخصص للمطابع بدلاً من إرساله للطابعة العادية أو المتصفح.

| البند | التنفيذ | الإثبات |
| --- | --- | --- |
| استئصال حوار طباعة المتصفح وتأخيرات Radix | إزالة دالة `fallbackBrowserPrint()` ودالة `showPrintResult()` ومكتبة `PrintNative` من `use-print-export.ts`، وإلغاء تأخير 300ms الزائف، وإرسال مصفوفات بكسلات DIB مباشرة إلى Win32 GDI Spooler | `frontend/src/components/editor/print/use-print-export.ts:60` ✅ |
| تبسيط حوار الطباعة وزر CMYK للمطابع | إزالة مفتاح التبديل والحفظ المحلي `PRINT_DIRECT_STORAGE_KEY` من `print-dialog.tsx`، وتعديل زر الإجراء الرئيسي ليتحول تلقائياً إلى «تصدير ملف المطبعة (TIFF)» بأيقونة `FloppyDisk` عند اختيار CMYK، و«طباعة الورقة» بأيقونة `Printer` في نمط sRGB | `frontend/src/components/editor/dialogs/print-dialog.tsx:180` ✅ |
| تحديث تأكيدات Vitest للمسار الأصلي الصرف | تحديث اختبارات الإخفاق والاستثناءات في `print-export-payload.test.ts` و`print-dialog-backstage.test.tsx` للتأكد من إظهار رسائل خطأ صريحة للمستخدم بدلاً من السقوط التلقائي لحوار المتصفح غير المتاح | `frontend/test/print-export-payload.test.ts:510` + `frontend/test/print-dialog-backstage.test.tsx:28` ✅ |
| دستور المحرك والتوجيهات المعمارية | تحديث القاعدة 51 في `.agents/rules/konva-canvas-engine.md` ودليل المطور `docs/developer_guide.md` لتوثيق التحول الكامل إلى Win32 GDI Spooler وحظر استدعاء `window.print()` | `.agents/rules/konva-canvas-engine.md:47` + `docs/developer_guide.md:195` ✅ |
| بوابات الجودة والتحقق | `typecheck` نظيف (0 أخطاء) · `lint` نظيف (0 تحذيرات) · 114 اختبار طباعة Vitest ناجح 100% · `docs-gate.mjs --strict-refs` ناجح | 2026-10-18 ✅ |

---

## 1.00 سجل جلسة تعزيز حزمة اختبارات الطباعة المباشرة عبر Win32 GDI واستقرار طابعات الاستوديو — 18 أكتوبر 2026

**المرجع:** تعزيز وتقفيل عقود اختبارات محرك الطباعة المباشرة Win32 GDI في Go وواجهة usePrintExport في Vitest لضمان جاهزية واعتماد النظام الأصيل 100% تمهيداً للاستغناء الكامل عن حوار المتصفح (`window.print`) في الإصدار القادم.

| البند | التنفيذ | الإثبات |
| --- | --- | --- |
| مقاسات أوراق استوديوهات التصوير الفوتوغرافي | تغطية اختبارية شاملة في Go لمقاسات الصور الأكثر شيوعاً في الاستوديوهات (4×6 بوصة 10×15 سم، 5×7 بوصة 13×18 سم، 6×8 بوصة 15×20 سم، كارت الهوية 86×54 مم، والبانوراما 210×600 مم) وضمان خلوها من الإحداثيات السالبة أو تجاوز مساحات الطباعة الفيزيائية في نمطي الحواف الصفرية (Cover) وبدونها (Contain) | `internal/service/printer_gdi_windows_test.go:689` ✅ |
| أمان الملفات التالفة والترويسة الخاطئة | اختبار رفض الملفات التالفة أو مجهولة البكسلات في `PrintImageDirectGDI` والتأكد من إرجاع خطأ آمن مع تنظيف الموارد وإغلاق الملفات ومقابض GDI دون أي انهيار | `internal/service/printer_gdi_windows_test.go:855` ✅ |
| حالات الألفا المتطرفة وحدود الأبعاد | اختبار تحويل مصفوفات DIB لصور شفافة 100% (تصفير كامل للبايتات) وصور معتمة تماماً، وتقفيل حدود طلبات الطباعة المباشرة (10مم كحد أدنى و1000مم كحد أقصى) وتوافق التوجيه الهندسي | `internal/service/printer_gdi_windows_test.go:740,768` ✅ |
| العزل التام لمخرج ألوان CMYK | تأكيد حظر استدعاء `PrintDirect` تماماً عند اختيار فضاء ألوان CMYK حتى مع تفعيل الطباعة المباشرة، وتوجيه الإخراج حصراً لملف TIFF بفصل الأحبار | `frontend/test/print-export-payload.test.ts:632` ✅ |
| تكامل معلمات الحواف الصفرية وتنبيهات الطابور الميدانية | التحقق من تمرير `borderless` و `paperId` و `formName` بدقة، واختبار التنبيه الفوري عند أخطاء طابور الطباعة الميدانية (انحشار الورق Paper Jam وحالة عدم الاتصال Offline) | `frontend/test/print-export-payload.test.ts:650,670` ✅ |
| حماية التزامن ومقاومة السباق الزمني للطلبات المتأخرة | التحقق من أن اكتمال طلب طباعة متأخر لا يؤثر على الجيل الأحدث (`attemptRef`) ولا يطلق إشعارات أو إغلاقات متضاربة عند طلب طباعة جديد | `frontend/test/print-export-payload.test.ts:702` ✅ |
| بوابات الجودة والتحقق | `go vet ./internal/service` نظيف · `typecheck` نظيف (0 أخطاء) · `lint` نظيف (0 تحذيرات) · `docs-gate.mjs --strict-refs` ناجح | 2026-10-18 ✅ |

---

## 0.101 سجل جلسة تسطيح الأسطح وتثبيت حارس هرمية الاستدارة — 21 أكتوبر 2026

**المرجع:** تكملة جلسة «الطابع الأصلي لسطح المكتب» — بعد حفظ الكود في كومت وقائي، جُرِعت البقايا المتعارضة على الكود فحُوِّلت إلى مصدر حقيقة واحد (قاعدة + مهارة + توكنز + حارس آلي).

| البند | التنفيذ | الإثبات |
| --- | --- | --- |
| تسطيح الأسطح الداخلية | 115 موضعاً `rounded-xl` → `rounded-md` (4px) داخل الألواح والحوارات، و24 موضعاً → `rounded-lg` (6px) للأسطح العائمة (Popover/Dropdown/Select/Command وقوائم شريط القوائم)، وتوحيد AlertDialog مع Dialog (`p-5` + `gap-3` + `shadow-fluent-16` + عنوان `text-base font-bold`) | `frontend/src/components/ui/select.tsx:51` + `frontend/src/components/editor/system/desktop-menu-bar.tsx:249` ✅ |
| إصلاح صنف ظل ميت | `shadow-fluent-24` كان مستعملاً في `crash-recovery-dialog.tsx` و`shared-controls.tsx` بينما `--fluent-shadow-24` غير معرّف في `index.css` — فلا يُولَّد الصنف ولا يظهر ظل إطلاقاً؛ استُبدل بـ `shadow-fluent-16` | `frontend/src/components/crash-recovery-dialog.tsx:79` + `frontend/src/components/editor/properties/shared-controls.tsx:412` ✅ |
| توحيد درجة الارتفاع | كل الأسطح العائمة من `shadow-fluent-28` إلى `shadow-fluent-16` (8 مواضع) لتطابق أساس `Dialog`، فلا تبدو نافذة أثقل من غيرها | `frontend/src/components/ui/sheet.tsx:58` ✅ |
| توكنز الهرمية في الحارس | `RADIUS` صار يحمل `control`/`inset`/`overlay`/`modal`/`panel`/`pill` بدل `container` القديم، مع تعليق يثبّت اشتقاق القيم من أساس 6px | `frontend/src/lib/ui/ui-compliance.ts:23` ✅ |
| حارس آلي (4 حراس) | اختبار يمنع `rounded-2xl/3xl` في المصدر، ويمنع أي `shadow-fluent-N` غير معرّف في `index.css` (صنفات الظل الميتة)، ويمنع بقايا `shadow-fluent-28`، ويؤكّد أن `FluentSection` صف مسطّح بلا نصف قطر/ظل وأن رأس اللوح `h-9` | `frontend/test/ui-compliance.test.ts:86` ✅ |
| توثيق القاعدة | تحديث `.agents/rules/ui-ux-fluent.md` (الهرمية الجديدة) و`grido-ui-designer-guide` (المبدأ 1.2 + قالب الحوار) و`fluent2-design-system` (سلم الاستدارة + قواعد السطح المسطّح)، مع وسم سطرَي تقريرَي التدقيق القديمين كـ SUPERSEDED | `.agents/rules/ui-ux-fluent.md:14` + `.agents/skills/grido-ui-designer-guide/SKILL.md:14` ✅ |
| توحيد تسمية سلايدر الزوايا | «استدارة الزوايا» ← «الزوايا» في خصائص الأشكال والكولاج لتطابق خصائص الصور — التسمية القديمة كانت تكرّر «استدارة» داخل قسم «الحدود والاستدارة»؛ حُدّث معه اختبارا الوحدة وE2E اللذان كانا يتوقعان النص القديم | `frontend/src/components/editor/properties/panels/shape-properties.tsx:285` + `frontend/test/element-properties-tabs.test.tsx:68` ✅ |
| إزالة شريط البحث من الشريط العلوي | حُذف حقل «ابحث أو نفّذ أمراً» (مع `Ctrl+K` المكرر داخله) — لوحة الأدوات `Ctrl+K` والقائمة المنسدلة «عرض» هما المدخلان الوحيدان، فلا تتكرر القدرة ولا يظهر حقل شبه فارغ وسط الأوامر (قاعدة «لوحة واحدة») | `frontend/src/components/editor/toolbar/toolbar.tsx:105` ✅ |
| فكّ تكدّس مفتش الخصائص | فاصل أقوى بين المجموعات يقود كل مجموعة (12px أسفله و18px فوقه)، وكشف تدريجي يطوي المجموعات المتقدمة (أبعاد الطباعة، تعبئة الخلايا، خلفية الصورة، تكبير الصورة، خلفية الصورة للصورة)، وإصلاح انزياح 2px في شريط التبويبات اللاصق (`-mx-3.5` → `-mx-3` بعد تغيّر حشو اللوح) | `frontend/src/components/ui/blocks/fluent-section.tsx:59` + `frontend/src/components/editor/properties/slot-properties.tsx:237` ✅ |
| ميزانية الأيقونات في المفتش | حُذفت 29 أيقونة صفّية مكرّرة للتسمية («السطوع» + شمس، «إزاحة أفقية» + سهم…) وتُركت أيقونات رؤوس المجموعات وأيقونات الأزرار؛ ووُسّع عمود تسمية السلايدر من 64px إلى 80px فلا تُبتَر التسميات في عمود 296px | `frontend/src/components/editor/properties/panels/image-properties.tsx:112` + `frontend/src/components/ui/blocks/fluent-slider-field.tsx:176` ✅ |
| توثيق مبدأ الأيقونات | صياغة القاعدة في `.agents/rules/ui-ux-fluent.md` و`grido-ui-designer-guide`: الأيقونة **حاجة بصرية لا فرض ولا زينة** — تُبقي حين تضيف معنى لا يوصله النص، وتُحذف حين تكرّر التسمية، وأيقونة واحدة لكل مجموعة؛ مع حارس آلي في `ui-compliance.test.ts` يمنع عودة أيقونة في صفوف `FluentSliderField`/`FluentSettingRow` | `.agents/rules/ui-ux-fluent.md:25` + `frontend/test/ui-compliance.test.ts:120` ✅ |
| تبسيط أداة لون الخلفية | حُذف «لون مخصص» + أيقونة الفرشاة من `StudioCanvasColorDeck` (الرقعة وحدها هي اللون)، وأُزيلت أيقونة قطرة من مفتاح «تعبئة متدرجة» — الصف الآن: [حقل اللون][القطارة]، والرقعة والـhex مرتّبان رقعةً ثم قيمة | `frontend/src/components/editor/properties/shared-controls.tsx:634` ✅ |
| نمط «حقل» للمبدّلات المدمجة | `FluentSegmentedControl` بأسلوب `variant="field"` للمبدّلات داخل صف الحقول (نمط الحد، طرف الخط، ملاءمة الصورة، نوع التعبئة، شكل القص، وضع التعبئة، الوجهة، العرض/الشبكة) — إطار واحد مع الحقول المجاورة بدل تبويب سفلي عارٍ وسطها | `frontend/src/components/ui/blocks/fluent-segmented-control.tsx:24` ✅ |
| صفّ الأبعاد | أُزيلت تكرار وحدة القياس (`px`/`mm`) من داخل حقلي العرض والارتفاع، وأُزيل مبدّل الوحدة من صف المقاس لأنه مكرر مع قائمة وحدة المسطرة؛ الوحدة تُقرأ من `rulerUnit`، ووُضع وصف «النسبة» بجوار عنوان «الأبعاد» بدل دفعه إلى الطرف المقابل | `frontend/src/components/editor/properties/general/canvas-dimensions-panel.tsx:464` + `frontend/src/components/ui/blocks/fluent-setting-row.tsx:36` ✅ |
| بوابات الجودة والتحقق | `npm run typecheck` نظيف · `npm run lint` نظيف (0 تحذيرات) · `vitest test/ui-compliance.test.ts` = 31/31 · `vitest test/element-properties-tabs.test.tsx` = 5/5 · `docs-gate.mjs --strict-refs` ناجح · CI سحابي ناجح 100% | 2026-10-21 ✅ |

---

## 0.100 سجل جلسة إعادة تصميم الواجهة نحو طابع سطح المكتب الأصلي (Desktop-Native Flat UI) — 21 أكتوبر 2026

**المرجع:** اتجاه جديد معتمد في جلسة 21 أكتوبر 2026 — إعادة تصميم واجهة المحرر على نمط أدوات سطح المكتب (Figma / Photoshop / Office) بدل النمط «بطاقات ويب» المستدير: أسطح مسطّحة، حدود شعرية، حواف حادة، وكثافة أعلى. طبّق على 54 ملفاً (بنية أساسية + ألواح + حوارات).

| البند | التنفيذ | الإثبات |
| --- | --- | --- |
| خفض أساس نصف القطر | `--radius` من `0.5rem` (8px) إلى `0.375rem` (6px) في `index.css`، فتصير القيم الفعلية `rounded-md` = 4px و`rounded-lg` = 6px و`rounded-xl` = 10px — حافة حادة تميّز تطبيقات ويندوز 11 (4–6px) عن البطاقات المستديرة الكبيرة (16px+) | `frontend/src/index.css:128` ✅ |
| تسطيح أقسام لوحة الخصائص | `FluentSection` تحوّل من بطاقة عائمة (حدود + ظل + حشو) إلى صفّ مسطّح يفصله خط شعري `border-b border-border/55`، مع أيقونة سطرية بلا شارة خلفية وعنوان `text-xs font-bold` | `frontend/src/components/ui/blocks/fluent-segmented-control.tsx:92` + `frontend/src/components/ui/blocks/fluent-section.tsx:59` ✅ |
| تبويب سفلي بدل الكبسولة | `FluentSegmentedControl` في الوضع الأفقي صار تبويباً بخط سفلي نشط (`absolute inset-x-1 bottom-0 h-0.5 bg-primary`) بلا كبسولة عائمة أو ظل، والوضع العمودي يبقى بطاقة مسطّحة | `frontend/src/components/ui/blocks/fluent-segmented-control.tsx:92` ✅ |
| تخفيف الحوارات والقوائم المنبثقة | `Dialog` من `rounded-2xl`/`p-6`/`gap-4`/`shadow-fluent-28` إلى `rounded-xl`/`p-5`/`gap-3`/`shadow-fluent-16`، ومثله `Popover` و`DropdownMenu` و`Command` و`Sheet` (حشو 12px → 10px) | `frontend/src/components/ui/dialog.tsx:77` ✅ |
| ضغط رأس اللوح ومحتواه | رأس `PanelShell` من `min-h-12` + `text-sm` إلى `h-9` + `text-xs` (48px → 36px)، وحشو المحتوى من `p-3.5` إلى `px-3 py-2` — كثافة ألواح محررات سطح المكتب | `frontend/src/components/editor/panels/panel-shell.tsx:80` ✅ |
| حالة فارغة مسطّحة | `FluentEmptyState` من بطاقة `rounded-xl` + شارة أيقونة + `shadow-2xs` إلى حدّ متقطّع `rounded-md` بلا خلفية مصمتة، ووصف مختصر `text-mini` بدل السطر المطوّل | `frontend/src/components/ui/blocks/fluent-empty-state.tsx:34` ✅ |
| توثيق القاعدة | تحديث `.agents/skills/fluent2-design-system/SKILL.md` (سلم الاستدارة الجديد + قواعد السطح المسطّح) و`ui-compliance.ts` (`RADIUS.modal` = `rounded-xl`) لتثبيت الاتجاه حتى لا يعود الكود قديماً | `.agents/skills/fluent2-design-system/SKILL.md:122` + `frontend/src/lib/ui/ui-compliance.ts:26` ✅ |
| بوابات الجودة والتحقق | `npm run typecheck` نظيف · `npm run lint` نظيف (0 تحذيرات) · `node scripts/docs-gate.mjs --strict-refs` ناجح | 2026-10-21 ✅ |

---

## 0.99 سجل جلسة معالجة ازدواجية صور جسر الهاتف والالتقاط اللحظي وإصلاح تقدم التحديثات — 18 أكتوبر 2026

**المرجع:** حل السبب الجذري لوصول صور جسر الهاتف بشكل مزدوج وتأخر الرفع (5+ ثوانٍ)، وتصحيح شريط تقدم تحديثات التطبيق العالق عند 0%.

| البند | التنفيذ | الإثبات |
| --- | --- | --- |
| منع ازدواجية تحميل صور جسر الهاتف | إضافة جدول تتبع للكائنات المعالجة `processedFiles` في دورة استطلاع رنتايم Go (`pollCloudSession`)؛ تخطي أي ملف جاري أو تم تنزيله فورياً، مما يمنع تنزيل الملف نفسه مرتين أثناء زمن رحلة حذف السحابة غير المتزامن (HTTP DELETE) | `internal/service/phone_bridge_service.go:561` ✅ |
| تسريع الالتقاط والرفع الفوري (Zero-Lag) | إزالة حظر الهاردوير الناتج عن `ImageCapture.takePhoto()` والتقاط الإطار فورياً (0ms) من عنصر الفيديو المباشر إلى الكانفاس، وضبط أبعاد التصدير القصوى إلى 2560px وجودة 0.85 لضغط الصور إلى ~400KB ونقلها في أقل من 200ms مع الحفاظ التام على دقة 300+ DPI | `admin-web/src/pages/PhoneCameraPage.tsx:368` + `admin-web/src/pages/PhoneCameraPage.tsx:476` ✅ |
| قفل منع النقر المزدوج لزر الغالق | إضافة قفل مرجعي `isCapturingRef` وتعطيل الزر أثناء الرفع لمنع تكرار الإرسال العفوي من شاشة اللمس | `admin-web/src/pages/PhoneCameraPage.tsx:119` + `admin-web/src/pages/PhoneCameraPage.tsx:834` ✅ |
| إصلاح شريط تقدم تحديثات التطبيق | بث أحداث التقدم بصيغة ثنائية (الرقم المباشر وخريطة كائن `update:progress`)، والتعامل الآمن مع غياب `Content-Length` عبر تقدير الحجم، ودعم قراءة كافة صيغ بيانات الأحداث في React مع حد أدنى بصري للتحميل (4%) | `internal/service/updater.go:453` + `frontend/src/components/editor/system/update-notifier.tsx:111` ✅ |
| بوابات الجودة والتحقق | نجاح فحص `admin-web` (`oxlint` + `vite build`) ونجاح `frontend` (`eslint` + `tsc --noEmit`) وبوابة التوثيق الإلزامية `docs-gate.mjs --strict-refs` | 2026-10-18 ✅ |

---

## 0.98 سجل جلسة تقليص وحذف النصوص الطويلة والمكررة في واجهة المحرر والحوارات — 18 أكتوبر 2026

**المرجع:** طلب المالك — مراجعة شاملة لنصوص واجهة المحرر وفق قاعدتي الاختصار وصفر الحشو، بتقصير العبارات المطولة وحذف الكامل للعبارات المكررة التي لا تضيف معلومة (مسح آلي لأنماط النصوص الطويلة أنتج 80 مرشحاً عبر `frontend/src`).

| البند | التنفيذ | الإثبات |
| --- | --- | --- |
| تقليم نصوص الحوارات والأزرار والتلميحات | تقصير وصف حوار استعادة الجلسة وأزراره، ووصف جسر الهاتف، ووسم خصائص الطابعة، وحالة الفراغ في قائمة الطبقات، والعنوان الفرعي لخلفية الورقة، ووحدة قياس المسطرة، وتلميح إعادة بناء شبكة الكولاج والملاءمة التلقائية | `frontend/src/components/crash-recovery-dialog.tsx` + `frontend/src/components/editor/dialogs/phone-bridge-dialog.tsx` + `frontend/src/components/editor/properties/layers-list.tsx` ✅ |
| حذف كامل للعبارات الزائدة | حذف وصف حوار الاستعادة عند غياب مسودة (مكرر مع زر «نسخ التقرير»)، ومربع تحذير RGB في حوار التصدير (بلا تحذير فعلي)، ووصف صف «خطوط النزيف» (يظهر في العنوان الفرعي للقسم)، وسطر sRGB/CMYK المكرر في حوار الطباعة | `frontend/src/components/editor/dialogs/export-dialog.tsx` + `frontend/src/components/editor/panels/collage/collage-paper-tools-tab.tsx` + `frontend/src/components/editor/dialogs/print-dialog.tsx` ✅ |
| تقليم رسائل الأخطاء والـ toasts | تقصير رسائل الطباعة المباشرة والتصدير والذكاء الاصطناعي والحفظ التلقائي وسلة الوسائط مع الحفاظ على المعلومة القابلة للتنفيذ | `frontend/src/components/editor/print/print-transport.ts` + `frontend/src/hooks/use-ai-enhance.ts` + `frontend/src/hooks/use-autosave.ts` ✅ |
| مزامنة الاختبارات المرتبطة | تحديث الاختبارات التي تؤكد نصوص الأزرار والوسوم المتغيرة (استعادة الجلسة، قائمة الطبقات، حوار التصدير، التدرجات المفضلة، مساعد الطباعة) | `frontend/test/*.test.tsx` ✅ |
| بوابات الجودة | نجاح `npm run lint` و`npm run typecheck` بعد التقليم والحذف | 2026-10-18 ✅ |

---

## 0.97 سجل جلسة إطلاق الإصدار v1.18.0 وتثبيت القواعد الحاكمة لجسر الهاتف والأجهزة المتنقلة — 18 أكتوبر 2026

**المرجع:** طلب المالك — ترفيع إصدار التطبيق إلى v1.18.0 ونشر التحديث، وتأصيل الدروس المستفادة عبر `/learn` وتثبيت قواعد استمرارية جسور الأجهزة والتوزيع التلقائي في الكولاج ومعايير Apple HIG للأجهزة المتنقلة.

| البند | التنفيذ | الإثبات |
| --- | --- | --- |
| ترفيع ونشر الإصدار v1.18.0 | ترفيع الإصدار رسمياً عبر `scripts/release.mjs minor --push` لتوحيد النسخة عبر كافة مصادر الحقيقة (`build/config.yml`، `info.json`، `project.nsi`، `Taskfile.yml`، `package.json`)، وجمع كافة الـ fragments وإنشاء الوسم `v1.18.0` ودفع خط البناء السحابي | `scripts/release.mjs` + `CHANGELOG.md` + وسم `v1.18.0` ✅ |
| قاعدة دورة حياة جسور الأجهزة | حظر إيقاف جلسات الأجهزة الخارجية (مثل كاميرا الهاتف أو الماسحات الضوئية) عند إغلاق النوافذ الحوارية، وإلزام استمراريتها في الخلفية حتى الإيقاف الصريح مع شارة حية في شريط الأدوات | `.agents/rules/backend-wails-runtime.md` ✅ |
| قاعدة التقدم التلقائي للأصول المتتابعة | إلزام التوزيع الذكي عند استقبال صور متتالية في الكولاج بملء الخانة المحددة/الفارغة ثم نقل التحديد تلقائياً للخانة الفارغة التالية لتمكين الالتقاط السريع | `.agents/rules/konva-canvas-engine.md` ✅ |
| قاعدة معايير واجهات الهواتف (Apple HIG) | إلزام اتباع Apple HIG في صفحات الويب المخصصة للأجهزة المتنقلة وحظر العبارات الترويجية والزخارف غير الوظيفية | `.agents/rules/ui-ux-fluent.md` ✅ |
| اكتمال محاكاة Wails في اختبارات المكونات | إلزام تحديث كائن محاكاة `wailsjs/go/main/App` في `App.test.tsx` فور استهلاك أي دوال Wails جديدة عبر الخطافات المركزية | `.agents/rules/backend-wails-runtime.md` + `frontend/test/App.test.tsx` ✅ |
| بوابات الجودة والتحقق | نجاح دورة CI السحابية الكاملة 100% لكافة المنصات واختبارات E2E على WebKit و Chromium · نجاح `docs-gate.mjs --strict-refs` | 2026-10-18 ✅ |

---

## 0.96 سجل جلسة استقرار جلسة جسر كاميرا الهاتف وضمان استلام الصور على الكانفاس — 17 أكتوبر 2026

**المرجع:** حل السبب الجذري لعدم وصول صور كاميرا الهاتف إلى الكانفاس، حيث كان إغلاق نافذة الـ QR يوقف خادم الجسر ومزامنة السحابة ويلغي التوكن؛ فتم الحفاظ على استمرار الجلسة في الخلفية مع إضافة مؤشر حي في شريط الأدوات وزر إيقاف صريح، والتقدم التلقائي بين خانات الكولاج عند استلام الصور.

| البند | التنفيذ | الإثبات |
| --- | --- | --- |
| استمرار الجلسة عند إغلاق النافذة | إزالة الاستدعاء القسري لـ `StopPhoneBridge()` عند إغلاق نافذة الـ QR، لتمكين المصور من رؤية الكانفاس وترتيب اللقطات أثناء التقاط الصور من الهاتف دون انقطاع الاستماع | `frontend/src/components/editor/dialogs/phone-bridge-dialog.tsx:101` ✅ |
| زر إيقاف صريح للجسر | إضافة زر «إيقاف الجسر» في أسفل نافذة الحوار لقطع الاتصال وتنظيف الجلسة متى ما رغب المستخدم، مع حالة انتظار وتشغيل نظيفة | `frontend/src/components/editor/dialogs/phone-bridge-dialog.tsx:290` ✅ |
| مؤشر حي في شريط الأدوات | عرض شارة نبضية خضراء في شريط الأدوات الرئيسي توضح اسم الهاتف المقترن وعدد الصور المستلمة فورياً، مع نقطة حالة خضراء في قائمة الإدراج | `frontend/src/components/editor/toolbar/toolbar-file-ops.tsx:280` ✅ |
| استلام ذكي وانتقال تلقائي بين الخانات | تحديث `use-phone-bridge.ts` لإسقاط الصور في الخانة المحددة أو أول خانة شاغرة، والتقدم التلقائي للخانة التالية لتمكين التصوير المتتابع السلس مع دعم الوضع الفردي | `frontend/src/components/editor/system/use-phone-bridge.ts:60` ✅ |
| مزامنة حالة الجسر عبر الستور وأحداث Go | بث حدث `phone:status` من Go عند التشغيل والإيقاف والاقتران ووصول الصور، وتخزينها في `phone-bridge-store.ts` الموحد | `internal/service/phone_bridge_service.go:180` + `frontend/src/lib/phone-bridge-store.ts` ✅ |
| بوابات الجودة والتحقق | `typecheck` نظيف (0 أخطاء) · `lint` نظيف (0 تحذيرات) · `ui-compliance-guard` ناجح · `go test` ناجح · `docs-gate --strict-refs` ناجح | 2026-10-17 ✅ |

---

## 0.95 سجل جلسة الجسر السحابي الذكي لكاميرا الهاتف بمعايير Apple HIG — 17 أكتوبر 2026

**المرجع:** تجاوز كافة عوائق جدار حماية ويندوز (Public Network Blocks) والراوتر المنزلي (AP Isolation) في ميزة كاميرا الهاتف، ببناء جسر سحابي فوري ذكي (Smart Cloud Relay Bridge) ينقل الصور بأعلى دقة لمستشعر الكاميرا ومصمم بمعايير Apple Human Interface Guidelines مع تصفير كامل لمساحة التخزين السحابي وقواعد البيانات عبر الحذف اللحظي (Instant Purge).

| البند | التنفيذ | الإثبات |
| --- | --- | --- |
| صفحة الهاتف بمعايير Apple HIG | تطوير صفحة `admin-web/src/pages/PhoneCameraPage.tsx` بتصميم iOS Camera الأصلي (True OLED Black `#000000`، شريط Dynamic Island علوي بحالة الاتصال والاقتران، زر التقاط آبل الدائري 76px، وميض الالتقاط، استجابة لمسية Haptic Vibrate، ومعاينة شبكة 3x3) | `admin-web/src/pages/PhoneCameraPage.tsx` + `admin-web/src/App.tsx:26` ✅ |
| اقتران ثنائي آمن وتعرف على الجهاز | إرسال مصافحة اقتران فورية `.handshake.json` من الهاتف عند الفتح، والتعرف التلقائي على طراز الجهاز (iPhone Pro / Android) وعرض حالة الاقتران والاسم في حاسوب الاستوديو والهاتف | `internal/service/phone_bridge_service.go:587` + `PhoneCameraPage.tsx:162` ✅ |
| قدرات الكاميرا والتحكم العتادي | دعم كاميرا النظام الأصلية، وتفعيل مستويات التكبير (1x, 2x, 3x)، ومفتاح الفلاش (Torch)، والنقر للتركيز (Tap-to-Focus) بإطار أصفر نبضي وأيقونة شمس التعريض، وصوت غالق ميكانيكي بـ Web Audio API، وقفل الشاشة (Wake Lock) | `admin-web/src/pages/PhoneCameraPage.tsx:50-100,270-360` ✅ |
| تنظيف الواجهة واستئصال العبارات الدعائية | إزالة النصوص الترويجية والصناديق الإعلانية من حوار `PhoneBridgeDialog.tsx` وصفحة الهاتف، واعتماد تبويبين مباشرين (عبر الإنترنت / شبكة محلية LAN) وشريط حالة مدمج وأنيق | `frontend/src/components/editor/dialogs/phone-bridge-dialog.tsx:234` ✅ |
| الحذف الفوري والتصفير (Instant Purge) | استماع Go الخلفي لحظياً وسحب الصور وتخزينها محلياً بـ `utils.CreateAtomic` وبث حدث الكانفاس، ثم حذف الصورة من السيرفر السحابي فورياً خلال ثانيتين لضمان استهلاك 0 ميجابايت دائم و 0 سجلات قاعدة بيانات | `internal/service/phone_bridge_service.go:pollCloudBridge,deleteCloudObject` ✅ |
| نقاط وصول ثابتة لمسارات SPA | توليد مجلدات ثابتة لمساري `/cam` و `/camera` في سير عمل `deploy-pages.yml` لتخدمهما GitHub Pages برمز 200 OK مباشر وتفادي أخطاء 404 | `.github/workflows/deploy-pages.yml:47` ✅ |
| بوابات الجودة والتحقق | بناء `admin-web` نظيف (2.03s) · اجتياز فحص مطابقة الواجهة (`ui-compliance-guard`) لاختبارات الخطوط والطباعة · فحص `go vet` نظيف 100% · فحص الأنواع `typecheck` للواجهة نظيف 100% · بوابة التوثيق `docs-gate` ناجحة | 2026-10-17 ✅ |

---

## 0.94 سجل جلسة محرك الطباعة المباشرة الأصلية لنظام Windows عبر Win32 GDI — 17 أكتوبر 2026

**المرجع:** دراسة وتنفيذ الطباعة الأصلية الصناعية المباشرة في Go لتجاوز قيود حوار Chromium والمتصفح (`window.print`)، وإرسال الصور فائقة الدقة (300+ DPI) مباشرة إلى طابور الطباعة (Windows Print Spooler) مع تذكرة طباعة حقيقية ودعم الطباعة بدون حواف (Borderless) — تلاها تقوية شاملة بعد مراجعة عتادية ثانية دوّرت كل نقاط الضعف المرصودة (أمان مسار الملف، سقوط DEVMODE الآمن، تغطية borderless بنسبة الأبعاد، حكم المهمة من البتات الرقمية، تعطيل واضح مع CMYK).

| البند | التنفيذ | الإثبات |
| --- | --- | --- |
| محرك Win32 GDI في Go | استحداث `internal/service/printer_gdi_windows.go` لاستدعاء `CreateDCW` و `StartDocW` و `StartPage` و `StretchDIBits` و `EndPage` و `EndDoc` بـ Pure Go (صفر CGO) عبر `golang.org/x/sys/windows` — مع فحص نتيجة `EndPage`/`EndDoc` إلزامياً ورفض اعتبار المهمة مكتملة عند فشلهما | `internal/service/printer_gdi_windows.go` ✅ |
| توافق Bottom-Up DIB و 32-bit BGRA | تحويل صور Go إلى مصفوفة DIB مقلوبة الأسطر برمجياً (Bottom-Up) بارتفاع موجب لتفادي انهيار برامج تشغيل طابعات الصور الاستوديو أو إخراج صفحات فارغة، مع محاذاة 4 بايت خالية من التشوه، وإزالة أثر Premultiplied Alpha (un-premultiply) حتى لا تُطبع البكسلات شبه الشفافة أغمق، ومسارات فائقة السرعة لـ `*image.RGBA` و`*image.NRGBA` و`*image.YCbCr` تقرأ مصفوفات `Pix` مباشرة وتلغي ملايين استدعاءات `img.At` الديناميكية | `printer_gdi_windows.go:convertToBottomUpDIB` ✅ |
| دمج آمن لـ DEVMODE (Safe 2-Step) | استعلام حجم إعدادات الدرايفر الخاصة (`DocumentPropertiesW`) مع فحص الحد الأدنى للذاكرة لمنع فيضان البنية، ومطابقة المقاسات القياسية (A4/A3/Letter...) مع ثوابت ويندوز المعتمدة (`matchStandardPaperID`) بدل فرض `DMPAPER_USER` الذي ترفضه أغلب السائقين، ودمج مرن يسقط لنسخة احتياطية تحفظ اتجاه الصفحة والنسخ عند رفض مقاس الورق المخصص | `printer_gdi_windows.go:configurePrinterDevMode,matchStandardPaperID` ✅ |
| استعلام القوالب وحالة المهمة | استعلام قوالب الورق المدعومة عبر `DeviceCapabilitiesW` مع الإبلاغ عن أي فشل بدل كتمه، وقراءة عدد آمنة بإشارة `int32` تمنع تخصيصاً ضخماً عند إرجاع -1، واستهلاك القوالب في `PrintDialog` لمطابقة اسم القالب ودعم الحواف الصفرية، ومراقبة حالة المهمة خلفياً في `usePrintExport` عبر `PollJobStatus` للتنبيه الفوري عند نفاد الورق أو انقطاع الطابعة | `printer_gdi_windows.go:GetSupportedPapers,PollJobStatus` + `print-dialog.tsx` + `use-print-export.ts` ✅ |
| عزل المنصات غير ويندوز | توفير Stubs متوافقة في `internal/service/printer_gdi_other.go` للحفاظ على صحة البناء المتقاطع للماك ولينكس بنسبة 100% | `internal/service/printer_gdi_other.go` ✅ |
| جسر Wails IPC وعقود النطاق | تصدير دوال `PrintDirect` و `GetSupportedPapers` و `PollJobStatus` عبر `PrintHandler`، وإعادة توليد ربطات TypeScript، وتحديث جسر محاكاة E2E في `wails-v3-bridge.ts` مع اجتياز حارس انحراف العقود 4/4 | `internal/handlers/print_handler.go` + `wails-v3-bridge.ts` ✅ |
| تكامل الواجهة وحوار الطباعة | إضافة خيار ومفتاح «طباعة مباشرة (Win32)» في حوار الطباعة وتحديث `usePrintExport` لتنفيذ الإرسال الصامت المباشر مع الاحتفاظ بمسار المتصفح كاحتياطي آمن — والمفتاح محفوظ بين الجلسات، ومعطَّل تلقائياً مع فضاء CMYK (محرك GDI يرسم RGB فقط) مع بيان السبب، وتجاوز مهلة الإرسال لا يفتح الحوار تلقائياً تفادياً للطباعة المزدوجة، والطباعة بلا حواف تغطي الورقة بنسبة الأبعاد (cover) دون تشويه، وعرض شارة قالب الطابعة ومطابقته لحظياً | `use-print-export.ts` + `print-dialog.tsx` ✅ |
| بوابات الجودة والتحقق | `go vet ./internal/...` نظيف · `go test ./internal/...` ناجح كاملاً · `tsc --noEmit` نظيف · `npm run lint` نظيف (0 تحذيرات) · 20 اختبار وحدة إضافي شامل: 10 في Go (`TestCalculatePrintDestRect_BorderlessCover`, `TestCalculatePrintDestRect_StandardContain`, `TestCalculatePrintDestRect_FallbackWhenPhysicalZero`, `TestConvertToBottomUpDIB_NRGBA_TransparentPixelZeroing`, `TestEvaluateJobStatus_Bitmasks`, `TestParseSupportedPaperInfo`, `TestConvertToBottomUpDIB_GrayscaleFallback`, `TestConvertToBottomUpDIB_SubImageBounds`, `TestCalculatePrintDestRect_ExactAspectMatch`, `TestCalculatePrintDestRect_ExtremePanorama`) و 10 في Vitest (عقد `formName`، مراقبة `PollJobStatus` خلفياً، تنبيهات أعطال الطابور، استثناءات `PrintDirect`، حظر الطباعة المزدوجة عند المهلة، مصفوفة الخانات الفارغة، السقوط للطابعة الافتراضية، اسم الطابعة ورقم المهمة في الإشعار، تجاهل الاستعلام لـ jobId الصفري، وترجمة سقوف الأخطاء التقنية) بإجمالي 22/22 حالة في `print-export-payload.test.ts` و 24 حالة في `print-export-helpers.test.ts` و 279 دالة اختبار في Go · `docs-gate` ناجحة | 2026-10-17 ✅ |

---

## 0.93 سجل جلسة حفظ أدلة الكانفاس في SQLite وتجريد مهيئ المشاريع (project-hydrator) — 16 أكتوبر 2026

**المرجع:** استكمال مسار الاستقرار المعماري عبر محورين بالتوازي: (1) حفظ الحقول التسعة لمساطر وخطوط الإرشاد وهوامش القص في نموذج Go SQLite (`domain.Project`) وقاعدة البيانات المحلية، (2) تفكيك وتجريد 285 سطراً من منطق التحقق والتطهير وتفريد المعرفات وتسوية الكولاج من `core-slice.ts` إلى وحدة نقية مستقلة `frontend/src/lib/io/project-hydrator.ts` قابلة للاختبار المعزول.

| البند | التنفيذ | الإثبات |
| --- | --- | --- |
| نموذج Go SQLite | إضافة الحقول التسعة (`ShowRuler`, `RulerUnit`, `UserGuides`, `ShowUserGuides`, `LockUserGuides`, `ShowBleedGuides`, `BleedMarginMM`, `SafeMarginMM`, `CutShapeType`) إلى `domain.Project` في `internal/core/domain/project.go` | `internal/core/domain/project.go:41-49` ✅ |
| توافق ربطات TypeScript | تحديث الفئة `Project` في `models.ts` بالحقول التسعة وقيمها الافتراضية في المُنشئ لمنع أي انحراف في الأنواع مع Wails | `bindings/grido/internal/core/domain/models.ts` ✅ |
| تجريد مهيئ المشاريع | استخراج وتطوير وحدة نقية `frontend/src/lib/io/project-hydrator.ts` تحوي `makeUniqueId` و `hydrateProjectState` لمعالجة وتطهير الأبعاد والعناصر والخانات والخطوط وإعدادات الطباعة، وتقليص `core-slice.ts` من 674 سطراً إلى 380 سطراً فقط | `frontend/src/lib/io/project-hydrator.ts` · `core-slice.ts:373` ✅ |
| تكامل المتسلسل وقاعدة البيانات | تحديث `projectFileToDomainProject` لتمرير الحقول التسعة لقاعدة البيانات وتحديث `domainProjectToProjectFile` لقراءتها دون تحويل قسري (`as unknown`) | `project-serializer.ts:240,303` ✅ |
| الاختبارات والتحقق | اختبارات حفظ واسترجاع الحقول في SQLite عبر `internal/repository/db_test.go`، واختبارات التحويل الثنائي والتهيئة وتفريد المعرفات في `project-serializer.test.ts` (14/14 نجاح)، واجتياز اختبارات الستور (93/93) | `db_test.go` + `project-serializer.test.ts` ✅ |
| بوابات الجودة | `npm run typecheck` نظيف (0 أخطاء) · `npm run lint` نظيف (0 تحذيرات) · `go vet ./internal/...` نظيف · `docs-gate --strict-refs` ناجحة | 2026-10-16 ✅ |

---

## 0.92 سجل جلسة مزامنة حفظ خطوط الإرشاد وهوامش الطباعة وعزل حوارات خادم الأصول — 16 أكتوبر 2026

**المرجع:** استكمال مسار الاستقرار المعماري: (1) تحقيق التوافق الكامل (Persistence Parity) لخطوط الإرشاد ومساطر الكانفاس وهوامش القص للطباعة بين الستور وحفظ/تحميل المشاريع، (2) عزل آخر موضع يستدعي رنتايم Wails مباشرة في `internal/server/asset_server.go:124` بتجريد حوار حفظ الملفات (`SaveFileDialog`) خلف منفذ `domain.RuntimeBridge`.

| البند | التنفيذ | الإثبات |
| --- | --- | --- |
| مخطط المشروع Zod | إضافة `UserGuideSchema` وإدراج 9 حقول في `ProjectSchema` بقيم افتراضية تطابق `DEFAULT_GRID_STATE`: مساطر الكانفاس (`showRuler`, `rulerUnit`)، خطوط الإرشاد (`userGuides`, `showUserGuides`, `lockUserGuides`)، وهوامش القص والأمان للطباعة (`showBleedGuides`, `bleedMarginMM`, `safeMarginMM`, `cutShapeType`) | `frontend/src/lib/schema.ts` ✅ |
| متسلسل ومهاجر المشاريع | تضمين الحقول التسعة في `serializeEditorState` وتوفير قيم افتراضية متوافقة في `migrateProject` و `domainProjectToProjectFile` لضمان قراءة الملفات القديمة بسلاسة | `project-serializer.ts:74,136` ✅ |
| استعادة وتصفير المتجر | في `loadProject` استعادة الحقول التسعة مع تنظيف صارم لمصفوفة `userGuides` (نطاق 0-1 ونوع h/v ومعرّفات فريدة)؛ وفي `reset` تفريغ الأدلة وإعادة كافة الحقول لقيمها الافتراضية بدقة | `core-slice.ts:371,607` ✅ |
| عزل حوارات خادم الأصول | توسيع `domain.RuntimeBridge` بنوع `FileFilter` ودالة `SaveFileDialog` وتنفيذها في `WailsRuntimeBridge` والـ `NoopRuntimeBridge` الصامت، وحقن المنفذ في `AssetServer` واستئصال استيراد `application` المباشر تماماً | `runtime.go:19` · `runtime_wails.go:35` · `asset_server.go:124` ✅ |
| الاختبارات والتحقق | اختبارات شاملة لحفظ واستعادة خطوط الإرشاد في `project-serializer.test.ts` (8/8 نجاح)، واختبارات حوار الحفظ وسلوك الـ Noop في `asset_server_test.go` (6/6 نجاح)، واجتياز `go vet` و `typecheck` و `lint` بنسبة 100% | `project-serializer.test.ts` + `asset_server_test.go` ✅ |
| بوابات الجودة | `npm run typecheck` نظيف · `npm run lint` نظيف (صفر تحذيرات) · `docs-gate --strict-refs` ناجحة · توثيق متزامن (`developer_guide` + قاعدة الرنتايم) | 2026-10-16 ✅ |

---

## 0.91 سجل جلسة توحيد لقطة التراجع وفصل خدمات Go عن رنتايم Wails — 16 أكتوبر 2026

**المرجع:** توجيه المالك بإصلاح كل الضعف المعماري المحدد: (1) تعداد حقول لقطة التراجع يدوياً في خمسة مواضع مع ثقب الأنواع `Record<string, unknown>` في `history-slice` — أي حقل جديد يعني خمسة تعديلات وإلا انحرفت البذرة أو المقارنة بصمت (صنف Bug#1/H4)، (2) اقتران خدمات الأعمال Go (الترخيص/جسر الهاتف/المحدّث) برنتايم Wails عبر `application.Get()` المباشر بما يمنع اختبارها معزولة، (3) بذرة `loadProject` الجزئية (كولاج فقط) التي أبقت الشبكة وإعدادات الطباعة خارج أول لقطة فلا يعكسها أول Undo.

| البند | التنفيذ | الإثبات |
| --- | --- | --- |
| سجل اللقطات الموحّد | أُنشئ `history-snapshot.ts` كمصدر وحيد لحقول اللقطة: `SNAPSHOT_KEYS` (25 حقلاً بترتيبها) + `SNAPSHOT_FIELDS` بمواصفات كل حقل (افتراضي/تطبيع/نسخ/مقارنة) تُشتق منها الالتقاط (`captureHistoryEntry`) والاستعادة والمقارنة (`snapshotValuesEqual`) والافتراضيات (`DEFAULT_HISTORY_ENTRY_EXTRAS`) — إضافة حقل = سطران في السجل فقط، مع صون المراجع المشتركة (قالب الكولاج/الأدلة/إعدادات الطباعة) لسلامة الـ dedupe الأول | `history-snapshot.ts:25,87` ✅ |
| قفل نوعي بلا تعداد يدوي | `HistoryCross` صار مشتقاً من `SnapshotValues` (لا تعداد للحقول)، واختبار قفل نوعي يفشل الـ typecheck عند إضافة حقل إلى `HistoryEntry` دون تسجيله في `SNAPSHOT_KEYS`، واختبار اكتمال الافتراضيات لكل مفتاح | `history-slice.ts:39` + `history-slice.test.ts` ✅ |
| بذرة loadProject الكاملة | حُذفت البذرة الجزئية اليدوية واستُبدلت بـ `set(seedHistorySnapshot(get()))` بعد كل التسويات — أول Undo الآن يعكس الشبكة وإعدادات الطباعة وآخر صورة محررة أيضاً، ويبقى `reset()` يستهلك نفس السجل | `core-slice.ts:597` ✅ |
| منفذ الرنتايم | أُنشئ `domain.RuntimeBridge` (Emit/OpenURL/Quit + `NoopRuntimeBridge`) وجسّر وحيد `WailsRuntimeBridge`: بلا تطبيق Wails (اختبارات/CLI) يصير البث والإغلاق no-op ويفشل فتح المتصفح بخطأ واضح — سلوك مطابق لما قبل الفصل حرفياً | `domain/runtime.go:10` + `service/runtime_wails.go:18` ✅ |
| تنظيف الاقتران | حُذف استيراد `application` من الخدمات الثلاث وحُذفت `LicenseService.SetContext` (استُبدلت بـ `SetBrowserOpener`) وبُثّ تقدم التحديث عبر `progressWriter.runtime` والإغلاق عبر `u.runtime.Quit()`؛ بقي `PhoneBridgeService.SetContext` (سياق دورة حياة خادم الجوال فقط) والمستثنون المصرح بهم (`desktop_service`/`desktop_windows` + الجسر نفسه) | `license_service.go:39` · `phone_bridge_service.go:72` · `updater.go:139` · `app.go:57` ✅ |
| استمرارية MAINT-06 | القرار المحمي صامد بلا نقض: منفذ فتح المتصفح المحقون في `LicenseService` (حقل `browserOpen` + الاستبدال الاختباري) بقي كما هو — تغيّر ربطه الافتراضي فقط من `SetContext` إلى جسر الرنتايم، وقُنن ضمن قاعدة جديدة في `backend-wails-runtime.md` (RuntimeBridge Port Invariant) | `oauth_browser_test.go` + قاعدة الرنتايم ✅ |
| اختبارات | اختبار جسر تسجيلي لـ `progressWriter` (بث عبر المنفذ بلا Wails + عدم إعادة بث النسبة نفسها) واختبار بقاء الجسر الافتراضي عند `SetRuntimeBridge(nil)` واختبارتا `SetBrowserOpener` (nil يُتجاهل + الاستبدال الفعلي) — بلا ملفات اختبار جديدة (مقياس `vitest_test_files` ثابت) | `updater_test.go` + `oauth_browser_test.go` ✅ |
| بوابات الجودة | `npm run typecheck` نظيف · `npm run lint` نظيف (صفر تحذيرات) · `docs-gate` ناجحة · توثيق متزامن (`developer_guide` 8 شرائح + مهارة `zustand-state-patterns`) | 2026-10-16 ✅ |

**الفجوات المتبقية:** التحقق الشامل للخلفية (بناء Go + حزمة اختبارات الوحدة الكاملة + E2E) خارج الفحوص المحلية المصرح بها بالدستور — يُنفَّذ في CI السحابي عند الدفع · `admin-web` غير متأثر بهذه الجلسة.

---

## 0.90 سجل توحيد توكنات صفحة الهبوط وإعادة سطر الدعم الواحد — 16 أكتوبر 2026

**المرجع:** توجيه المالك برفع تقييم تصميم صفحة الهبوط من 8.5/10 إلى 10/10؛ عُولجت الاستقطاعات الثلاثة القابلة للتنفيذ: (1) رتابة رؤوس الأقسام بعد تقليم 0.87، (2) تكرار قيم hex بدل توكنات `@theme`، (3) انحرافات لونية خارج النظام. مبدّل AR/EN استُبعد بقرار منتج (يستلزم نسخة إنجليزية كاملة). سطر الدعم الواحد لا ينقض دستور 0.87 «عنوان أبيض كبير واحد»: بلا شارة eyebrow وبلا أيقونة وبلا وصف ثانٍ.

| البند | التنفيذ | الإثبات |
| --- | --- | --- |
| سطر الدعم الواحد | عاد حقل `description` الاختياري إلى `SectionHeader` بمقياس واحد (`text-xs sm:text-sm text-text-secondary` + `text-balance`) وعرضين مضبوطين: 672px موسّط للعناوين المركزية و448px لمحاذاة البداية؛ استُدعي في 8 أقسام (Bento · AI · ويندوز 11 · الجمهور · المقارنة · الآراء · الأسعار · الأسئلة) — وحاسبة التوفير لها رأسها المخصص فبقيت بلا سطر | `SectionHeader.tsx:48-56` + 8 مواضع ✅ |
| توحيد التوكنات | أُبدلت كل قيم hex المكررة في 14 مكوّناً + `LandingPage.tsx` بأدوات `@theme`: `bg-workspace/sidebar/card/card-hover/inset`، `border-border-subtle`، `text-text-primary/secondary/muted`، `brand-primary/hover/light`، `status-success/warning/error` — بما فيها تعبئة منزلقات الحاسبة والهيرو وشريط تقدم الهيدر | القائمة الكاملة في `changelog/fragments/20261016-admin-web-landing-token-unification.md` ✅ |
| استثناءات مقصودة | لوحات `AppMockup` (نسخة طبق الأصل من واجهة التطبيق بسطح `#1A1A1A`) و`CMYK3DStack`/`Biometric3DCard` (مشاهد ثلاثية الأبعاد ببصرياتها) وأخضر واتساب `#25D366/#20bd5a` ورمز إغلاق ويندوز `#c42b1c` بقيت خارج التوحيد | `AppMockup.tsx` · `CMYK3DStack.tsx` · `Biometric3DCard.tsx` ✅ |
| انحرافات خارج النظام | `#A3A3A3` في وصف الهيرو ← `text-text-secondary` · `#D4D4D4` في المقارنة والأسئلة ← `text-text-primary` · `text-slate-300` في Bento ← `text-text-primary` · حدود `#333333`/`#242424` ← `border-border-subtle` · روابط التذييل `text-blue-400 hover:text-blue-300` ← `text-brand-light hover:text-white` | `HeroSection.tsx:63` · `ComparisonSection.tsx` · `FaqSection.tsx:99` · `LandingPage.tsx:95` ✅ |
| وصولية مبدّلي العرض | مبدّلا Bento (معاينة/مجسم 3D وورقة الطباعة/CMYK) صارا `role="group"` مع `aria-label`، وكل زر `type="button"` + `aria-pressed` | `BentoGrid.tsx:36-58, 209-231` ✅ |
| إعادة ربط CSS بالتوكنات | `.btn-secondary` (خلفية + hover) وthumb شريط التمرير في `index.css` انتقلا من `#1E1E1E/#262626/#2C2C2C` إلى `var(--grido-surface-card/card-hover/border-subtle)` | `index.css:163-181, 435` ✅ |
| دستور التصميم | تحديث `design.md`: جدول الطباعة (سطر الوصف)، بند ممارسة التوكنات، سجل v2.1، وتصحيح أرقام أسطر `Windows11Section`/`FaqSection` بعد إزاحة سطر الوصف | `admin-web/design.md` ✅ |
| بوابات الجودة | `oxlint` (0/0) · `tsc -b && vite build` ناجح · `vitest` 14/14 · `docs-gate` | 2026-10-16 ✅ |

**الفجوات المتبقية:** مبدّل AR/EN غير منفَّذ (قرار منتج — يتطلب نسخة إنجليزية كاملة) · فجوات `pages/admin` و`components/common` اللونية خارج نطاق جلسة الهبوط (مبدّل لاحقاً عند الحاجة) · بقية فجوات 0.84/0.85 القائمة (شريط الختام الواسع ما زال قائماً).

---

## 0.89 سجل إزالة إطار شعار هيدر صفحة الهبوط — 16 أكتوبر 2026

**المرجع:** توجيه المالك بإزالة التأطير حول شعار التطبيق في الهيدر؛ امتداد لمبدأ تقليم الزخرفة المعتمد في الجلسة 0.87.

| البند | التنفيذ | الإثبات |
| --- | --- | --- |
| شعار الهيدر | حُذفت حاوية الإطار كاملةً (تدرّج خلفي + `border-white/10` + `shadow-inner` + `p-1` + `rounded-xl`) وبقي الشعار عارياً بمقاسه، مع نقل أثر الرفع `group-hover:scale-105` إلى الصورة نفسها | `Header.tsx:109-116` ✅ |

---

## 0.88 سجل إصلاحات مراجعة غير المرفوع (خلفية قائمة الجوال · تعبئة منزلق السعر · تباين) — 16 أكتوبر 2026

**المرجع:** مخرجات مراجعة التغييرات غير المرفوعة في `admin-web` وإغلاق العيوب المؤكدة قبل الكومت.

| البند | التنفيذ | الإثبات |
| --- | --- | --- |
| خلفية قائمة الجوال (Portal) | `fixed inset-0` داخل `<header>` كان يُسجن في شريط الهيدر بعد التمرير لأن `backdrop-blur-2xl` على الهيدر الملتصق يُنشئ الحاوية المرجعية لعناصر `fixed`؛ نُقلت إلى `createPortal(document.body)` فعاد تعتيم كامل الشاشة والإغلاق بالنقر خارج القائمة | `Header.tsx:185-197` ✅ |
| تعبئة منزلق السعر | `priceFill` تُشتق من السعر المقيَّد بمدى العملة الحالية (0–100) فلا تقفز التعبئة لحظة تبديل العملة قبل مزامنة السعر | `RoiCalculator.tsx:32-39` ✅ |
| تباين متبقٍّ | `text-[#666]` في تسمية محاكاة مستوى التشغيل ← `text-[#8A8A8A]` (توكن `--grido-text-muted`) | `AppMockup.tsx:383` ✅ |
| دستور التصميم | تصحيح سجل v2.0: بنية الأقسام الأحد عشر لا تسعة | `design.md:389` ✅ |
| بوابات الجودة | `oxlint` نظيف · `tsc -b && vite build` ناجح · `vitest` 14/14 · `docs-gate --strict-refs` ناجحة | 2026-10-16 ✅ |

---

## 0.87 سجل جلسة تقليم رؤوس الأقسام والأيقونات الزخرفية في صفحة الهبوط — 16 أكتوبر 2026

**المرجع:** توجيه المالك بأن «الأيقونات ليست بهارات توضع على كل طبخة بل حاجة بصرية لها وقتها ومكانها»، وأنه يكفي **عنوان أبيض كبير واحد** لكل سكشن؛ ومسنَد بمبدأ Fluent 2 الرسمي: «Icons represent concepts, objects, or actions, and have semantic purpose within a layout» (صفحة Icon)، و«Badge … short text, color, and icons for quick recognition … placed near the relevant content».

| البند | التنفيذ | الإثبات |
| --- | --- | --- |
| توحيد رأس القسم | أُعيدت كتابة `SectionHeader` ليصير **عنواناً أبيض واحداً**: حُذفت `icon` و`badge` (eyebrow) و`subtitle`، وبقيت `align`/`size`/`gap` فقط؛ وحُدّثت مواضع الاستدعاء الثمانية (Bento · AI · Windows 11 · الجمهور · المقارنة · الآراء · الأسعار · الأسئلة) | `SectionHeader.tsx` + 8 مواضع ✅ |
| إزالة أيقونات التنقل | أُزيلت أيقونات روابط التنقل من درج الجوال وحقل `icon` من `NAV_LINKS` (قائمة سطح المكتب كانت نصية أصلاً) | `Header.tsx` ✅ |
| إزالة نجوم الآراء | صف النجوم وحقل `rating` حُذفا من بطاقة الرأي ومن واجهة `Testimonial` ومدخلاتها الثلاثة؛ بقي وسم المقياس الأخضر | `TestimonialsSection.tsx` + `landing-content.ts` ✅ |
| شارات/وسوم ترويجية | حُذفت الشارة العائمة «الخيار الأسرع للاستوديوهات» وشارة «نتائج حقيقية» وعلامة النجاح الخضراء المكررة في مسار خطوات الـAI وإيموجي الوسوم (✨/📷/✓) وأيقونة `ShieldCheck` في شارة الختام وأيقونات شريط الثقة في الهيرو — وبقيت الأيقونات ذات الغرض فقط (أزرار/مبدّل 3D/سهم الأكورديون/بلاطات هوية البطاقات/✓✗ في المقارنة/أيقونات الخطوات) | `ComparisonSection/AiSpotlightSection/BentoGrid/CtaBanner/HeroSection` ✅ |
| إزالة شريط تقدم مكرّر | حُذف الشريط الثابت العلوي (`3px`) من `LandingPage.tsx` وبقي شريط الهيدر المعتمد على `ref` | `LandingPage.tsx` ✅ |
| إغلاق فجوتين من 0.86 | اشتُقّت `CLIENT_MIN/MAX/STEP` في `RoiCalculator.tsx` بدل تكرار 5/150 يدوياً، ونُقلت `.ds-range` داخل `@layer components` | `RoiCalculator.tsx` + `index.css` ✅ |
| سلّم الارتفاع (بمرجع مهارة `fluent-design-system` المُثبّتة) | أُضيف `--material-shadow-16` وفئات `.ds-elevate-rest/raised/overlay/dialog` في `@layer components`، وطُبّقت على عناصر الهبوط العائمة: أزرار الهيدر، درج الجوال، زر التحميل العائم، زر واتساب — مع إزالة توهج `#3b82f6` من أزرار الهيدر (Zero Button Glow) | `index.css` + `Header/WhatsAppButton` + `LandingPage.tsx` ✅ |
| بوابات الجودة | `npm run lint` (oxlint 0/0) · `tsc -b` صفر أخطاء · `vitest` 14/14 · `vite build` ناجح · `docs-gate.mjs --strict-refs` | 2026-10-16 ✅ |

**الفجوات المتبقية:** بقية فجوات 0.84/0.85 القائمة (كثافة نص الآراء أُغلقت في 0.86 · شريط الختام الواسع ما زال قائماً).

---

## 0.86 سجل جلسة مراجعة التغييرات غير المرفوعة، إعادة مزامنة دستور التصميم مع الكود، إصلاح تتبّع التوهج، وصقل الاستعارة الانتقائية — 16 أكتوبر 2026

**المرجع:** مراجعة جودة للتغييرات غير المرفوعة في `admin-web` عبر بوابات الجودة الأربع، ثم اعتماد `admin-web/design.md` «على الكود الفعلي» بإعادة كتابة كاملة (v2.0)، وإغلاق فجوة التوهج المكتشفة أثناء التحقق.

| البند | التنفيذ | الإثبات |
| --- | --- | --- |
| إعادة مزامنة دستور التصميم | إعادة كتابة `admin-web/design.md` بالكامل (v2.0 → v2.1): التوكنات الفعلية من `:root`/`@theme inline`، وحذف كل ادعاء غير منفَّذ (مبدّل AR/EN، `shadow-brand-glow`، وجود `tailwind.config.js`)، وبنية الأقسام الـ11 بترتيب `LandingPage.tsx:122-177` بدل 7 أقسام، وتوثيق البدائيات المنفَّذة — يُغلق بند «التحديث الشامل للدستور» المفتوح منذ 0.84 | `admin-web/design.md` + `docs-gate --strict-refs` ✅ |
| إصلاح تتبّع توهج البطاقات | بطاقات Bento (`spotlight-hover`) كانت تسقط على المركز 50% لأن متتبّع `LandingPage.tsx:35` يقصر على `.spotlight-card`؛ وُسّع المحدد إلى `'.spotlight-card, .spotlight-hover'` فتبع التوهج المؤشر (نفس rAF/passive — لا تغيير أداء) | `LandingPage.tsx:35` ✅ |
| استعارة انتقائية — كشف متتابع | `.reveal-stagger` على شبكات Bento/الجمهور/الآراء/ضمانات التسعير: انطلاق 80ms ثم +60ms لكل بطاقة، والمؤخرة على opacity/transform فقط (التحويم بلا تأخير) — يُغلق فجوة «stagger» من 0.84 | `index.css:326-348` + 4 شبكات ✅ |
| استعارة انتقائية — تجميد خارج الشاشة | نافذة `AppMockup` تُجمَّد حركاتها ودورتا المرحلة/الطباعة عند خروجها من الشاشة (IO هامش 120px → `.mockups-paused`)، وحُذفت حركات mockup ميتة (`scan-hud`/`wipe`/`beam`/`pulse` ≈47 سطراً بلا مستهلك) | `AppMockup.tsx:39-54,120-122` ✅ |
| استعارة انتقائية — كثافة الآراء | الاقتباس من `text-xs sm:text-sm` إلى `text-sm sm:text-base` مع `leading-relaxed` — يُغلق فجوة «كثافة النص داخل بطاقات الآراء» من 0.85 | `TestimonialsSection.tsx:41` ✅ |
| بوابات الجودة | `npm run lint` (oxlint 0/0) · `tsc -b && vite build` ناجح · `vitest` 14/14 · `docs-gate.mjs --strict-refs` ناجحة | 2026-10-16 ✅ |

**الفجوات المتبقية:** `RoiCalculator.tsx:26` يكرر حدود المدى 5/150 يدوياً بدل اشتقاقها · `.ds-range` غير طبقية بينما باقي البدائيات في `@layer components` (خطر كامن إن أضيفت utility عليها مستقبلاً) · بقية فجوات 0.84/0.85 قائمة (أُغلقت فجوتا «stagger» و«كثافة نص الآراء» في هذه الجلسة).

---

## 0.85 سجل جلسة صقل تصميم صفحة الهبوط (قسم الـAI · ضمانات التسعير · Bento · شريط الختام · تعبئة منزلقات الحاسبة) — 16 أكتوبر 2026

**المرجع:** تشغيل صفحة الهبوط في المتصفح واستعراض الأقسام بصرياً بأحجام 480/800/1920 ثم إغلاق الفراغات الميتة. (ملاحظة أدوات: معاينة المتصفح كانت مضبوطة على zoom 0.5 فبدت الصفحة مضغوطة في المنتصف؛ بعد تصحيحها ظهرت القياسات الحقيقية.)

| البند | التنفيذ | الإثبات |
| --- | --- | --- |
| قسم محرك الذكاء الاصطناعي | عمودان متوازنان بدل بطاقة بعرض كامل تحوي وسائط `max-w-md`: وسائط (5/12) + مسار خطوات عمودي (7/12)، وحُذف صف البطاقات الثلاث المنفصل. أزيل ~330px فراغاً على كل جانب و~300px من طول الصفحة (10160 ← 9876) | `AiSpotlightSection.tsx:102,196` ✅ |
| تراص الجوال/التابلت | قيد `max-w-sm mx-auto lg:max-w-none` على شريط المقارنة كي لا تتضخم الصورة بعرض كامل تحت `lg` | `AiSpotlightSection.tsx:138` ✅ |
| ضمانات التسعير | تحويل البطاقات من رأسية `justify-between` (عنوان أعلى/وصف أسفل ← فتحة ~70px) إلى صف أفقي `items-center` موسّط رأسياً | `PricingSection.tsx:148` ✅ |
| فجوات Bento | `flex-1` لمعاينتي «صانع الكولاج» و«خصوصية تامة» فامتصّتا ارتفاع الصف الممتد بدل ترك فراغ أسفلهما (قياس: الأبناء يصلون إلى 370/393px داخل البطاقة) | `BentoGrid.tsx:163,208` ✅ |
| شريط الدعوة الختامي | هالة `aurora-bg` محيطة + حدّ لامع `card-specular-edge` بدل صندوق مسطّح | `CtaBanner.tsx:8,11` ✅ |
| تعبئة منزلقات الحاسبة | `--range-fill` + تدرّج `to left` في RTL عبر `[dir='rtl'] .ds-range` فصار موضع القيمة داخل مداها مقروءاً (14% / 33%) | `index.css:222,235` + `RoiCalculator.tsx:98,121` ✅ |
| تحذير postcss | استبدال تدرّج Tailwind الاعتباطي بفئة CSS صريحة: المُصغّر كان يحوّل `ellipse 55% 65% at 50% 50%` إلى `55% 65%` (صيغة قديمة) ويطلق تحذير تدرّج | `npm run build` بلا تحذيرات CSS ✅ |
| بوابات الجودة | `tsc -b` صفر أخطاء · `vite build` ناجح · `vitest` 14/14 · `docs-gate.mjs` ناجحة · لا تجاوز أفقي عند 480px (`scrollWidth == clientWidth`) | 2026-10-16 ✅ |
| توحيد شريط رأس القسم | `SectionHeader` جديد استوعب 8 كتل يدوية (شارة + عنوان + وصف) كانت تتفرّق في مقياس العنوان (48px/40px/30px) وحجم الوصف (12px/14px) والهامش (40/48px) وعرض الحاوية (672px/768px). الآن `align`/`size`/`gap` مُسمّاة، والعنوان 768px منفصل عن الوصف 672px فلا ينكسر سطر العنوان ولا يتغيّر لفّ الوصف (قياس: كل عناوين الأقسام سطر واحد) | `SectionHeader.tsx:41` + 8 مواضع استدعاء ✅ |
| توحيد سطح البطاقات والبلاطات | `ds-card` في 18 موضعاً و`ds-icon-tile` الجديدة في 9 مواضع بدل السلاسل اليدوية؛ تحقّق مطابقة: `rounded-2xl` = `--radius-2xl` = 20px، فأُنصاف الأقطار بقيت 20px للبطاقات و16px للبلاطات | `index.css:448` + `BentoGrid/PricingSection/AudienceSection/Windows11Section/TestimonialsSection/ComparisonSection/CtaBanner/RoiCalculator/TourModal` ✅ |
| إصلاح طبقات CSS (سبب جذري) | البدائيات كانت غير طبقية فتغلب utilities في Tailwind v4، فكان `.ds-card` يُلغي `hover:border-*` و`bg-[#171717]` وحدّ الفتح في الأسئلة. نُقلت `.ds-card*/.ds-icon-tile` إلى `@layer components` فاشتغلت 4 حالات تحويم + حدّ المقارنة الأزرق + حالة فتح الأسئلة الشائعة | `index.css:431` — قياس حيّ: `borderTopColor` أزرق 40%، وخلفية بطاقة «الطرق التقليدية» `rgb(23,23,23)` ✅ |

**الفجوات المتبقية:** كثافة النص داخل بطاقات الآراء (نص 12px بأسطر متكاثفة) · شريط الختام ما زال بعرض واسع بمحتوى موسّط · بقية فجوات P2/P3 المسجّلة في الجلسة 0.84 قائمة · قسم «مراكز الطباعة» يحمل وسمين متقاربين (`خطوط القص` + وسم فوق الصورة) يحتاج توحيداً.

---

## 0.84 سجل جلسة صقل صفحة الهبوط (admin-web — منزلقات · تباين · تنظيف CSS/أصول · هيدر) — 15 أكتوبر 2026

**المرجع:** مراجعة تصميم صفحة الهبوط `admin-web` وإغلاق أولويات P1 المتفق عليها — تغييرات دنيا بلا مساس بالمحظورات (`/api/download`، `/api/version`، `public/_redirects`، `netlify.toml`، `public/callback/`، `dir="rtl"`، `sample-passport.png`).

| البند | التنفيذ | الإثبات |
| --- | --- | --- |
| مقابض منزلقات حاسبة التوفير | فئة `.ds-range` موحدة (مقبض 18px مرئي بتلوين عبر `--range-accent`) بدل `appearance-none` الذي كان يحذف المقبض كلياً في Chromium/Firefox | `admin-web/src/index.css:193-238` + `RoiCalculator.tsx:91,113` ✅ |
| تباين النصوص (WCAG AA) | `#666` و`#737373` ← `#8A8A8A` (توكن `--grido-text-muted` الفعلي) | `RoiCalculator.tsx:43` + `ComparisonSection.tsx:107` ✅ |
| حذف CSS ميت (~110 أسطر) | 12 كلاسة/كتلة بلا أي مستهلك (`text-hero/h1/h2/h3/body`، `acrylic-panel`، `fluent-mica`، `fluent-focus-ring`، `popIn`، `floatIcon/animate-float`، `soft-ambient-glow`، `section-divider`، `bg-dot-grid`، `ds-value-pill`، `ds-dot`، `ds-section-head`) بعد تحقق grep | `admin-web/src/index.css` ✅ |
| احترام `prefers-reduced-motion` | `html { scroll-behavior: auto; }` داخل كتلة تقليل الحركة | `index.css:356-359` ✅ |
| حذف أصول ميتة | `admin-web/public/fonts/` (15 ملف Thmanyah woff2 ≈1.13MB) — صفر مراجع (`git grep`)، متتبعة في Git | 2026-10-15 ✅ |
| تطوير هيدر صفحة الهبوط (Premium) | Magic Pill منزلق يتبع المقطع النشط (قياس `offsetLeft/Width` عند تغيّر القسم + resize + `fonts.ready`) · شريط تقدم تمرير متدرج أسفل الهيدر عبر rAF بلا إعادة رندر · خلفية معتمة + إغلاق بالنقر + دخول متتابع (`dropIn`) لقائمة الجوال · وميض `.cta-shine` على زر التحميل (سطح المكتب والدرج) · توحيد السطح على توكن `#171717` (كان `#1A1A1A`/`#161616`) · حد لامع علوي وظل أخف عند التمرير · زر قائمة دائري + `aria-controls` + إغلاق `Escape` · `scroll-padding-top: 6rem` | `Header.tsx:65,232` + `index.css:184,311,364` ✅ |
| مزامنة الدستور | تصحيح مرجعي في `admin-web/design.md`: إزالة مراجع الفئات المحذوفة (`text-hero..body` و`.acrylic-panel`) واستبدالها بالمنفَّذ فعلياً (`font-display`/`font-mono`، `.fluent-specular`/`.app-mockup`) — التحديث الشامل (لوحة v1.0 وwireframe القديم) يبقى فجوة مفتوحة | `admin-web/design.md` ✅ |
| بوابات الجودة | `npm run lint` (oxlint 0/0) · `tsc -b && vite build` ناجح · فحص `dist`: `--range-accent` مولّد والفئات المحذوفة غائبة · بوابات الجلسة تشمل `docs-gate.mjs --strict-refs` | 2026-10-15 ✅ |

**الفجوات المتبقية (P2/P3 لصفحة الهبوط):** توحيد التوكنات/`ds-card` في المكوّنات · مكوّن `SectionHeader` مشترك لجزر الأقسام · دمج الأزرار العائمة المكررة · تحويل الصور إلى WebP · الخطوط المحلية · stagger للكشف عند التمرير · التحديث الشامل لدستور `admin-web/design.md` (لوحة v1.0 + wireframe قديم لا يطابق الأقسام المنفَّذة).

---

## 0.85 سجل جلسة فرض مقاس الورق المحدد من المستخدم على ناتج الطباعة في ويندوز — 17 أكتوبر 2026

**المرجع:** طلب المالك — فرض مقاس الورق الذي يحدده المستخدم من التطبيق بدقة على ناتج الطباعة النهائي ومنع ارتداد الطابعة للمقاسات الافتراضية.

| البند | التنفيذ | الإثبات |
| --- | --- | --- |
| استعلام وتمرير معرف الورق الرقمي (PaperID) | إضافة `PaperID uint16` في `DirectPrintRequest` وتمرير `paperId: matchedPaper?.id` من الواجهة (`print-dialog.tsx` و `use-print-export.ts`) لفرض المعرف الرقمي الأصلي للدرايفر | `domain/print.go:109` + `use-print-export.ts:518` + `print-dialog.tsx:447,1118` + `print-export-payload.test.ts:400` ✅ |
| استعلام قدرات الطابعة الحية وتوسيع القوالب القياسية في Go | في `printer_gdi_windows.go`: دمج دالة `findPrinterPaperMatch` للاستعلام الآلي عن قوالب الطابعة الحية عبر `DeviceCapabilities` لمقاسات الصور (10x15 سم و 13x18 سم)، وتوسيع `matchStandardPaperID` ليشمل A6 و A2 و B6 JIS والبطاقات البريدية مع فرض `DmPaperWidth/DmPaperLength` الفيزيائية بعُشر المليمتر لمقاسات `DMPAPER_USER` | `printer_gdi_windows.go:390-480` + `TestMatchStandardPaperID_AllSupportedSizes` (18/18 PASS) ✅ |
| إتاحة المقاسات المتقدمة في حوار الطباعة | استيراد `ADVANCED_PAPER_SIZES` في `print-dialog.tsx` لدمج مقاس Letter والمقاسات المتقدمة في قائمة اختيار الورق | `print-dialog.tsx:50,772` ✅ |
| بوابات الجودة والتوثيق | نجاح `docs-gate.mjs --strict-refs`، `npm run lint` (0 تحذيرات)، `npm run typecheck` (0 أخطاء)، واختبارات Go (Service) بنجاح تام | 2026-10-17 ✅ |

---

## 0.84 سجل جلسة إصلاح قص الطباعة المباشرة عبر Win32 GDI وحماية مقاسات الورق القياسية — 17 أكتوبر 2026

**المرجع:** طلب المالك — التحقيق الهندسي وحل مشكلة قص أعلى ورقة الكولاج ورؤوس الصور في ناتج الطباعة الفورية (`jijo.pdf`) رغم سلامة المعاينة على الكانفاس.

| البند | التنفيذ | الإثبات |
| --- | --- | --- |
| تصحيح راية الحواف الصفرية في الواجهة | إلغاء الربط التلقائي الزائف `borderless: effectiveMarginMM === 0`، وحصر تفعيل `borderless` بالورق الذي يدعم الحواف الصفرية فعلياً في درايفر الطابعة عبر `matchedPaper?.isBorderless` وتمريره في خيارات `PrintExecuteOptions` | `use-print-export.ts:34,514` + `print-dialog.tsx:445,1114` ✅ |
| أولوية قوالب ويندوز القياسية في Go | في `configurePrinterDevMode`: فحص `matchStandardPaperID` أولاً وتعيين المعرّف القياسي (مثل `DMPAPER_A4 = 9`) لمنع رفض الدرايفرات لقالب `dmPaperUser` المخصص وسقوط درايفرات مثل Microsoft Print to PDF في مقاس Letter الافتراضي | `printer_gdi_windows.go:388-400` + `TestConfigurePrinterDevMode_StandardPaperIDPrecedence` (PASS) ✅ |
| نمط الاحتواء وحظر الإزاحات السالبة في GDI | في `calculatePrintDestRect`: اعتماد نمط الاحتواء والتوسيط (Contain) مع فرض حد أدنى صفري حتمي `destX >= 0, destY >= 0` لمنع انزلاق محتوى الورقة ورؤوس الصور خارج حدود مساحة الطباعة الفيزيائية | `printer_gdi_windows.go:605-625` + `TestCalculatePrintDestRect_A4OnLetterPdf_NoTopClipping` (PASS) ✅ |
| بوابات الجودة والتوثيق | نجاح `docs-gate.mjs --strict-refs`، `npm run lint` (0 أخطاء)، `npm run typecheck` (0 أخطاء)، ونجاح اختبارات Go (Service) والـ Vitest كاملة | 2026-10-17 ✅ |

---

## 0.83 سجل جلسة تفريغ العمليات الثقيلة إلى Go والتدفق الثنائي (Binary Stream Canvas · Native Local Image AI · Batch Scanner Ingestion) — 15 أكتوبر 2026

**المرجع:** طلب المالك — فحص وتفريغ العمليات الثقيلة التي تتم في الواجهة بدلاً من Go واستبدال وسائط Base64 الضخمة بالتدفق الثنائي وحلول النظام الأصلية.

| البند | التنفيذ | الإثبات |
| --- | --- | --- |
| تدفق ثنائي لكانفاس تنقيح الخلفية (`uploadCanvasBlob`) | استبدال `canvas.toDataURL` و `SaveImageFromBase64` بـ `uploadCanvasBlob` الذي يضخ `Blob` الثنائي مباشرة كـ `multipart/form-data` إلى `/api/upload-media` وتحديث كاش الأبعاد اللحظي | `frontend/src/lib/io/media-upload.ts` + `refine-bg-dialog.tsx:460-475` + `media-upload.test.ts` (PASS) ✅ |
| تحسين الدقة بالذكاء الاصطناعي من المسار المحلي مباشرة | تمكين `EnhanceImageWithAI` في Go من معالجة مسارات `/local-image/...` مباشرة بقراءة الملف المحلي وضبط الأبعاد وترميز JPEG 92% وتجهيز حمولة Modal AI دون فك الترميز وإنشاء Canvas في المتصفح | `internal/service/ai_service.go:392-425` + `internal/service/media_service.go:148` + `TestEnhanceImageWithAI_LocalImagePath` (PASS) ✅ |
| تفريغ استهلاك الواجهة في `use-ai-enhance` | تجاوز تحميل `new Image()` وعملية الرسم على الكانفاس المشفر في الواجهة عند كون الصورة محلية، وتمرير المسار فورياً إلى Go | `frontend/src/hooks/use-ai-enhance.ts:75-88` + `ai-enhance-collage.test.tsx` (PASS) ✅ |
| تسريع وحفظ دُفعة الماسح الضوئي (`image-properties.tsx`) | استبدال الحفظ الفردي التتابعي بحفظ متوازي `Promise.all`، وحساب الأبعاد بدفعة واحدة `resolveBatchImageAspectRatios` مع إدراج ذري موحد في الستور `addImageElementsBatch` | `frontend/src/components/editor/properties/panels/image-properties.tsx:230-265` ✅ |
| بث ثنائي مباشر لقص الصور وتحديث الأبعاد اللحظي | استبدال `croppedCanvas.toDataURL()` بـ `uploadCanvasBlob` في `crop-dialog.tsx` مع حساب الأبعاد الفوري وتجاوز حلقات `new Image()` و `SaveImageFromBase64` في ألواح الخصائص وقوائم السياق | `crop-dialog.tsx:105-135` + `image-properties.tsx:780-820` + `slot-properties.tsx:665-675` + `element-menu-section.tsx:160-190` ✅ |
| تسريع فك ترميز التصدير بالعتاد (`createImageBitmap`) | استخدام فك الترميز غير المتزامن المباشر في `export-bleed.ts` لتفادي تخصيصات DOM وعقد `Image` في مسار تصدير الحواف (زُيل مسار العلامة المائية في الجلسة 1.18) | `export-bleed.ts:130-170` ✅ |
| بوابات الجودة والتوثيق | نجاح `docs-gate.mjs --strict-refs`، `npm run lint` (0 أخطاء، 0 تحذيرات)، `npm run typecheck` (0 أخطاء)، واختبارات Go والـ Vitest كاملة | 2026-10-15 ✅ |

---

## 0.82 سجل جلسة تسريع الإدخال والاستيراد والتكامل المكتبي الأصلي (Batch Dimensions · Binary Clipboard · Native Drop) — 15 أكتوبر 2026

**المرجع:** طلب المالك — تطوير نظام الإدخال وآلية الاستيراد وتحسين سرعة الاستدعاء والاستجابة والبحث عن أي عمليات ثقيلة تتم في الواجهة بدل Go مع تفضيل الحلول المكتبية المتاحة.

| البند | التنفيذ | الإثبات |
| --- | --- | --- |
| استجابة أبعاد الرفع المباشرة (`/api/upload-media`) | خادم الوسائط في Go يحسب أبعاد الصورة (`width`, `height`, `aspectRatio`) فور فحص الترويسة وكتابة الملف الذرية ويعيدها ضمن استجابة JSON، مما يلغي استدعاءات IPC اللاحقة أو قراءة DOM البطيئة | `internal/server/asset_server.go:121-125` + `asset_server_test.go` (PASS 0.85s) ✅ |
| استدعاء متوازي لأبعاد الصور المتعددة (`resolveBatchImageAspectRatios`) | استبدال حلقات `for` التسلسلية باستدعاء دَفعة واحد (`GetBatchImageDimensions`) إلى Go الذي يحلل ترويسات الملفات بتوازي تام عبر `errgroup` والأنوية المتاحة | `frontend/src/lib/canvas/image-dimensions.ts:24-42` + `frontend/test/image-dimensions.test.ts` (4/4 PASS) ✅ |
| كاش فوري لنسب الأبعاد في الذاكرة (`aspectRatioCache`) | كاش $O(1)$ محلي بـ `Map` في الواجهة لمنع إعادة قراءة الملفات أو DOM لنفس المسار عند تكرار الرسم أو الإدراج | `frontend/src/lib/canvas/image-dimensions.ts:8-17` + `frontend/src/lib/canvas/measure-image.ts:16` ✅ |
| تدفق ثنائي للصق صور الحافظة (Direct Binary Streaming) | استبدال تحويل الصور الملصقة من الحافظة إلى Base64 في ذاكرة V8 بضخ مباشر للـ `Blob` الثنائي كـ `multipart/form-data` عبر `fetchLocalApi('/api/upload-media')` | `frontend/src/lib/io/clipboard-utils.ts:60-75` ✅ |
| تسريع الإفلات الأصلي ومحاذاة الكولاج (`native-file-drop`) | معالجة إفلات الملفات من النظام بدَفعة واحدة (`addImageElementsBatch` في الوضع الحر أو توزيع لحظي على خلايا الكولاج الفارغة) بلقطة تاريخ Undo واحدة بدل تجميد الواجهة بنداءات فردية متتالية | `frontend/src/hooks/use-app-bootstrap.ts:100-145` ✅ |
| ترقية حوارات الإدراج وأشرطة الأدوات | تحديث `batch-insert-dialog.tsx` و `toolbar-file-ops.tsx` و `use-image-drop.ts` لاستخدام المعالجة المتوازية وكاش الأبعاد اللحظي | `batch-insert-dialog.test.tsx` + `use-image-drop.ts` ✅ |
| بوابات الجودة والتوثيق | 53 تأكيد كود في `docs-gate.mjs`، نجاح الفحص المصغَّر بالكامل (`npm run lint` صفر أخطاء، `npm run typecheck` صفر أخطاء، `go test` لـ server و service أخضر 100%) | 2026-10-15 ✅ |

---

## 0.81 سجل جلسة تدقيق أبرز نقاط الضعف وإغلاق الرباعية الأولى (سقوف التركيب · WYSIWYG القلب/التدوير · تحصين المحدّث · دورة حياة التأطير) — 15 أكتوبر 2026

**المرجع:** طلب المالك — تدقيق مثبّت بالكود عبر أربعة محاور متوازية (أمن المحدّث · الواجهة/الحالة · موثوقية Go · الطباعة/التصدير)، ثم إغلاق البنود الأربعة الأعلى أثراً بأربعة وكلاء على ملفات معزولة (التقرير الكامل: `docs/reviews/20-weakness-audit-fixes-2026-10-15.md`).

| البند | التنفيذ | الإثبات |
| --- | --- | --- |
| سقوف ذاكرة التركيب + recover العمال (RV-Print-26) | ثابتا سياسة واحد `maxCanvasPixels = 144_000_000` و`maxCanvasSidePx = 65535`، فحص `validateCanvasComposition` مبكر (كانفس الوضع الحر + أبعاد العناصر غير المنتهية)، حارس هدف التحجيم قبل `imaging.Resize` وقبل أي `int(...)`، و`recoverPrintWorkerPanic` يحوّل أي panic في العمال المتوازيين إلى خطأ مفهرس — والأبعاد التالفة صارت تُرفض برسالة عربية بدل التجاهل الصامت | `print_service.go:44,166,206` + `print_compose.go:335` + `print_compose_limits_test.go` (9 اختبارات) ✅ |
| WYSIWYG القلب/التدوير (RV-Print-27) | القلب (`FlipH/FlipV`) قبل التدوير مطابقةً لمصفوفة Konva T·R·S، ومعاينة CSS بنفس الترتيب (`rotate` قبل `scaleX/scaleY`) — كان الناتج ينعكس 180° عند 90°/270° مع أي قلب | `print_image_pipeline.go:707` + `print-preview.tsx:165,184` + `print_flip_rotation_order_test.go` + `test/print-preview-transform-order.test.tsx` ✅ |
| فشل مغلق على رابط التنزيل الأولي (UPD-1) | رفض أي `downloadURL` لا يبدأ بـ`https://` قبل إنشاء الطلب نفسه (كان الفحص على إعادات التوجيه فقط) | `updater.go:479-481` + `TestUpdaterRejectsNonHTTPSInitialURL` ✅ |
| دورة حياة عامل التأطير المشترك (FF-1) | عدّاد `activeConsumers` + إلغاء موحّد `cancelActiveFrameFlow` يُسوّي كل الطلبات المعلقة، وفكّ نسخة غير مالكة لم يعد يقتل عمل نسخة أخرى (احترام قرارَي 0.68 و0.76) | `use-face-frame.ts:78,130` + `test/face-frame-lifecycle.test.tsx` (6 سيناريوهات، 3 تفشل على الكود الأصلي) ✅ |
| بوابات الجولة | `go build ./...` · `go vet` · `go test ./internal/service ./internal/handlers` · `npm run typecheck` · `npm run lint` · vitest مستهدف (ملفان/8 حالات) — كلها خضراء | 2026-10-15 ✅ |
| بنود رصد فقط (بلا كود) | سلسلة توقيع التحديث غير مجسّرة end-to-end (لا توليد/رفع `.sig`) + حالة متغير `UPDATER_PUBLIC_KEY` — خيارا معالجة A/B للقرار في التقرير 20 | `release.yml` + `updater.go:597-609` ⚠️ |

> ملاحظة تشغيلية: أثناء الجلسة طُبِّق بالخطأ stash قديم (`backup-pre-v1.4.1-restore`) على الشجرة، فاستُعيدت كاملةً (صفر ملفات ضائعة)، والأستاش الأصلي ما زال محفوظاً في `git stash list` — الشجرة الآن = تغييرات الجلسة فقط.

---

## 0.80 سجل جلسة تدقيق الوصولية وتوحيد تعقيم نصوص المحرر وقياس Konva الحي — 15 أكتوبر 2026

**المرجع:** إدماج وتنقيح تدقيق الوصولية الشامل (PR #23) ومعالجة ثغرات نصوص Konva وتعقيم منافذ الـ Store.

| البند | التنفيذ | الإثبات |
| --- | --- | --- |
| وحدة النصوص المركزية | إنشاء `text-helpers.ts` بسقف `TEXT_MAX_LENGTH = 2000`، تعقيم محارف التحكم، وتوحيد تعبير فحص العربية `isArabicText` | `frontend/src/lib/canvas/text-helpers.ts` ✅ |
| حماية الـ Store ومنافذ الإدخال | تعقيم المدخلات في `crud.ts` و `text-elements.ts` و `project-serializer.ts` و `clipboard-utils.ts` مع تنبيه Toast عند اقتطاع النصوص الملصقة | `npm run typecheck` + `npm run lint` (0 أخطاء) ✅ |
| قياس Konva الحي للمحاذاة العمودية | إضافة `textVerticalAlign` للـ Schema واللوحة مع قياس ديناميكي عبر `node.textHeight` يمنع تجميد ارتفاع الصندوق عند تمرير `height` | `frontend/src/components/editor/konva/elements/text-node.tsx:95` ✅ — **تصحيح مؤرَّخ (2026-10-22 — الجلسة 1.38):** أُهمل `textVerticalAlign` مع نموذج الارتفاع المشتق من المحتوى؛ الحقل باقٍ في `types.ts`/`schema.ts` موسوماً `@deprecated` للقراءة القديمة فقط ولا يستهلكه أي مسار رندر أو قياس أو تصدير. |
| طبقة التحرير (Overlay) والوصولية | انتظار جاهزية الخط عبر `document.fonts.ready`، توجيه المؤشر لآخر النصوص الطويلة، إزالة `role` الزائد، وضبط اعتماديات الـ Hook | `text-editing-overlay.tsx` (ESLint 0 أخطاء) ✅ |
| تدقيق وصولية حوارات وألواح المحرر | إضافة `focus-visible:ring-2` وتصحيح `aria-label` في حوار الطباعة وتأمين صور المعاينة عبر 25 ملفاً | مطابقة E2E في `print-dialog.spec.ts` ✅ |
| بوابات الجودة والتوثيق | نجاح `docs-gate.mjs --strict-refs` و `npm run lint` و `npm run typecheck` بنسبة 100% | `changelog/fragments/20261015-ui-text-a11y-audit.md` ✅ |

---

## 0.79 سجل جلسة التراجع النظيف واستئصال الكود الميت والفخاخ المعمارية — 14 أكتوبر 2026

**المرجع:** طلب المالك — التراجع الكامل النظيف إلى v1.15.1 بعد محاولة سابقة فاشلة لنظام الطبقات V2، مع استئصال الملفات الميتة والتوائم المهجورة لقطع دابر الفخاخ المعمارية.

| البند | التنفيذ | الإثبات |
| --- | --- | --- |
| التراجع النظيف إلى v1.15.1 | إلغاء التغييرات غير المستقرة في الكانفاس والطبقات واستعادة التركيب الشرطي النظيف في `konva-canvas.tsx` واستعادة `grid-layer.tsx` و `columns-layer.tsx` | كود الكانفاس والواجهة مطابق لـ v1.15.1 المستقر ✅ |
| استئصال فخ `layers-panel.tsx` | حذف المكون المهجور وإلغاء تصديره من `panels/index.ts`، وتحويل اختباره إلى `test/layers-list.test.tsx` لاختبار `LayersList` الرسمية | `test/layers-list.test.tsx` (7/7 PASS) ✅ |
| تنظيف الملفات الميتة (Zero Importers) | حذف `preset-miniature.tsx` و `print-icon.tsx` و `pointer-lock.ts` وتنظيف المراجع المعمارية في المهارات | فحص `git grep` نظيف وبلا مراجع ميتة ✅ |
| إصلاح دورة حياة React Ref | نقل تعديل `isRunningRef` في `phone-bridge-dialog.tsx` إلى `useEffect` لمنع خطأ render-phase ref mutation | `npm run lint` (0 أخطاء) ✅ |
| بوابات الجودة والتوثيق | نجاح `docs-gate.mjs --strict-refs` و `tsc --noEmit` بدون أخطاء | البوابات خضراء 100% ✅ |

---

## 0.78 سجل جلسة تصدير CMYK TIFF وتأنيس أخطاء الطباعة وإطلاق v1.15.1 — 13 أكتوبر 2026

**المرجع:** إغلاق مسار CMYK TIFF وأخطاء الطباعة المعربة وتأمين إغلاق جسر الهاتف، وحزم وترقية الإصدار الرسمي إلى v1.15.1.

| البند | التنفيذ | الإثبات |
| --- | --- | --- |
| تصدير CMYK TIFF | توجيه مسار حفظ ورقة الطباعة عند اختيار فضاء CMYK لإنتاج ملف `.tiff` عالي الدقة متوافق مع المطابع بدلاً من `.jpg` | `print-transport.ts` + `use-print-export.ts` + `print-dialog.tsx` ✅ |
| تأنيس أخطاء الطباعة | استبدال رسائل خطأ Go IPC التقنية بإشعارات Toast معربة واضحة للمستخدم في كافة حالات فشل الحفظ أو المعالجة | `print-dialog.tsx` + `test/print-dialog-backstage.test.tsx` ✅ |
| إغلاق جسر الهاتف | استخدام `isRunningRef` في `phone-bridge-dialog.tsx` لمنع إعادة تشغيل الخادم وتأمين مسار `StopPhoneBridge` عند الإغلاق | `phone-bridge-dialog.tsx` + `test/phone-bridge-dialog.test.tsx` (5/5 PASS) ✅ |
| حزمة إصدار v1.15.1 | توحيد رقم الإصدار v1.15.1 في كافة ملفات التكوين والمثبت والحزم وربط سجل التغييرات كاملاً | `build/`, `frontend/package.json`, `CHANGELOG.md` ✅ |

---

## 0.77 سجل جلسة استقرار الملفات والذاكرة وأداء الكانفاس (M16-final & Memory Leak Fix) — 13 أكتوبر 2026

**المرجع:** إغلاق المحورين الأخيرين — استقرار الملفات/الذاكرة + أداء الكانفاس والتحقق المتكامل بالدليل القاطع.

| البند | التنفيذ | الإثبات |
| --- | --- | --- |
| تسريب `pathLocks` في Go | استبدال `sync.Map` اللانهائي بخريطة `refCountedMutex` + `pathLocksMu` + `refs`، حذف آلي عند `refs==0` فور تحرير القفل | `internal/utils/atomicfile.go` + `internal/utils/atomicfile_leak_test.go` (4 اختبارات جديدة، 50/1000/200/100 كاتب متزامن وفريد، `PathLocksCount==0` دون تسريب) ✅ |
| إلغاء حجب الكانفاس (M16-final) | إلغاء `drawImage(5000px)` التزامني أثناء طور الرسم، عرض الأصل فوراً (<16ms)، وبناء البروكسي المخفض خلفياً عبر `createImageBitmap` وسقف 2048px | `frontend/src/lib/canvas/display-image.ts` + `useDisplayImage` + ترحيل `image-node.tsx` و `collage-image.tsx` (`tsc` 0 نظيف) ✅ |
| تفريغ الذاكرة عند فقدان التركيز | ربط حدث `window.blur` باستدعاء `triggerMemoryTrim()` لتفريغ الـ Working Set تزامناً مع عقدة الباك إند `main.go/WindowLostFocus` | `frontend/src/hooks/use-window-controls.ts` (تفريغ مزدوج Go+JS محمي بـ catch) ✅ |
| بوابات الجودة والتوثيق | 18 اختباراً في `internal/utils` (100% PASS)، وتحديث الأرقام المرجعية لملفات اختبار Go (46 ملفاً) | `DOCUMENTATION_MAP.md` + `docs-gate.mjs` ✅ |

---

## 0.76 سجل جلسة الإصلاح الشامل لعيوب الواجهة (UI Bug Hunt) — 13 أكتوبر 2026

**المرجع:** طلب المالك — صيد منهجي لعيوب الواجهة (5 وكلاء متوازيين: حوارات/كانفس/مساحة عمل/وصولية/حالة) مع تحقق يدوي من كل بند P0 قبل التنفيذ. البوابة 1: لم يُنقض أي قرار محمي — رُفضت 3 مقترحات بعد التحقق (عقد `h-6 w-6` للشريط السريع، و`z-50` المرخص للـ overlays في `ui-compliance.test.ts:151-154`، وتصميم كاش الفلاتر M15 المقصود).

| البند | التنفيذ | الإثبات |
| --- | --- | --- |
| إلغاء التصدير | الإغلاق أثناء التحميل مسموح (راية + رمز جولة anti-concurrency)، إيقاف صامت عند نقاط الفحص، زر «إيقاف التصدير»، بلا توستات كاذبة | `export-dialog.tsx` (runTokenRef/shouldStop) ✅ |
| تكديس المودالات | حارس `shouldIgnoreCanvasAction` على مفاتيح الحوارات/التبويبات/الوضع، حذف جراحة DOM من الطباعة، Escape حصري لـ Radix | `use-keyboard-shortcuts.ts` + `print-dialog.tsx` ✅ |
| شاشات compact | تبويبات استوديو داخلية، زر عائم للوحة الأوامر بنفس الحالة (`CompactToolLauncher` + ‏`ToolLauncherContent` الوحيد)، مبدّل وضع مدمج | `freeform-studio-panel.tsx` + `workspace-panel-rail.tsx` + `workspace-layout.tsx` + `App.tsx` ✅ |
| مزامنة الألواح | فتح الخصائص لكل العروض، إيقاف تلويث wide، مطابقة Alt+1..9 للمفلترة (`getToolsForWorkflow`)، تأكيد إفراغ الخانات | `App.tsx` + `use-workspace-panels.ts` + `collage-autofill-tab.tsx` ✅ |
| سلامة الحالة | مُحدِّث طباعة نقي، حارس خانة العمليات + فحص متبادل AI، مسار autosave واحد (`lastWrittenString`)، تسوية فك التأطير | `print-slice.ts` + `operation-status.ts` + `use-autosave.ts` + `use-face-frame.ts` ✅ |
| كانفس Konva | حارس صفر + اتجاه محرر النصوص، قص الشريط، تماثل المساطر، نطاق المؤشر، سمك `/stageScale`، حد snap، أمان المعاينة، تنظيف pointerup | `text-editing-overlay.tsx` + `canvas-quick-bar.tsx` + `ruler.tsx` + `use-ruler-metrics.ts` + الطبقات ✅ |
| وصولية | أسماء Switches، تنقل الرقائق، حراس refine/redo/catalog، عزل bidi، حلقة الخلايا، قائمة list/listitem، توثيق Tab، ‏MotionConfig، سقف LRU | ملفات متعددة ✅ |
| تحقق خفيف | `tsc` نظيف · `eslint` (0) · `lint:rtl` نظيف (بلا Vitest/E2E محلياً حسب الثابت) | 2026-10-13 ✅ |

**الفجوات المتبقية عمداً:** صلاحية trial للطباعة/ AI (قرار منتج: الرسالة أم البوابة؟) · زر إيقاف حوار Crop أثناء المعالجة (بلا راية إلغاء في Cropper) · تنقل أسهم قائمة الطبقات listbox الكامل (يتطلب `aria-activedescendant`).

---

## 0.75 سجل جلسة عقد اتجاه RTL وامتثال الواجهة لـ Fluent — 13 أكتوبر 2026

**المرجع:** طلب المالك — مراجعة الواجهة ونظام RTL ثم تحسينها وفق تعليمات الوكلاء (`.agents/rules/ui-ux-fluent.md` + المهارات). البوابة 1: لا نقض لأي قرار محمي — عقد `h-6 w-6` للشريط السريع بقي كما هو (محمي باختبار `test/canvas-quick-bar.test.tsx:124`).

| البند | التنفيذ | الإثبات |
| --- | --- | --- |
| عقد الاتجاه الموثق | مصدر الحقيقة `html dir=rtl` + تثبيت `dir="rtl"` على محتويات Portals الست (Dialog/Alert/Sheet/Popover/Select/Tooltip) وجذر DropdownMenu (سياق Radix) + توثيق جزر `ltr` الخمس بتعليقات `ltr-island` | `lib/ui/ui-compliance.ts` (‏`DIRECTION_CONTRACT` + ‏`assertNoPhysicalDirection`) ✅ |
| خصائص منطقية | `ml/mr` ← `ms/me` (الترخيص/الخطوط)، `border-l/r` ← `border-s/e` (الألواح/السكروول/التحسين)، `text-right` ← `text-start` (10 ملفات)، حقول `text-left` الرقمية ← `text-start` + ‏`dir="ltr"` صريح | `npm run lint:rtl` نظيف ✅ |
| صياغة الانتظار | `جاري العزل…/التأطير…/الترميم…` (بلا مسافة) ← `...` بمسافة حسب ثابت Wait UX | `toolbar-ai-tools.tsx` ✅ |
| استكمال RV-4 | مراجع `console.error` المتبقية من توحيد v1.14.8 (التصدير/التمهيد) ← `createLogger` الموحد | `export-dialog.tsx` + `main.tsx` ✅ |
| هرمية الاستدارة والحجم | صفوف التحكم `rounded-lg` ← `rounded-md` (4 مواضع) + حذف متغير `icon-xs` (‏24px دون الحد `h-7`) بلا استخدام | `button.tsx` ✅ |
| تحقق خفيف | `tsc` نظيف · `eslint` (0) · `lint:rtl` نظيف (حسب ثابت عدم إجهاد الجهاز: بلا Vitest/E2E محلياً) | 2026-10-13 ✅ |

**الفجوات المتبقية عمداً:** أزرار الشريط السريع `h-6 w-6` (قرار محمي — يتطلب موافقة صريحة) · صيغ النسب المئوية `جاري العزل (45%)` أُبقيت (تقدم محدد، لا يغطيه الثابت نصاً) · `h-8.5` لصفوف الطبقات و`h-10` لزر `xl` خارج السلم الاسمي (تغييرهما بصري بلا عائد امتثال واضح).

---

## 0.74 سجل جلسة نقل عزل الخلفية بالذكاء الاصطناعي إلى محرك Go الأصلي (Go Native ONNX) — 13 أكتوبر 2026

**المرجع:** طلب المالك — نقل نماذج عزل الخلفية إلى لغة Go بعد معاناة الواجهة الأمامية (WebView2) من تسريب الذاكرة وتجميد Web Worker.

| البند | التنفيذ | الإثبات |
| --- | --- | --- |
| محرك Go ONNX الأصلي | `BgRemovalService` عبر `github.com/yalue/onnxruntime_go v1.16.0` مقترناً بـ `onnxruntime.dll` الرسمي من مايكروسوفت (API Version 20) | `internal/service/bg_removal_service_test.go` ✅ |
| نموذج MODNet عالي الدقة | استبدال `selfie_multiclass.tflite` بنموذج البورتريه الاحترافي `modnet.onnx` (~24.7MB) المخصص لخصلات الشعر والحدود الدقيقة | تجربة صور البورتريه الفعلية `TestONNXRealImageInference` (270ms على المعالج) ✅ |
| معمارية الملف التنفيذي الواحد | تضمين المكتبة والنموذج داخل الثنائي عبر `//go:embed`؛ استخراج ذري للمكتبة إلى `%APPDATA%\GridoStudio\bin` وتحميل النموذج من الذاكرة مباشرة دون كتابة على القرص | التحقق في بيئة Windows واختبارات Go ✅ |
| دمج القناع وحماية الحواف | إعادة استخدام وتوحيد `compositeMaskParallel` و `ResizeGrayLinear` مع منع تسرب الهالات البيضاء (Spill Suppression) وتطهير ألوان خلفيات الاستوديو (Chroma Decontamination) | نجاح `ApplyMaskRaw` والكتابة الذرية `utils.CreateAtomic` ✅ |
| تنظيف كود الواجهة | استبدال Web Worker باستدعاء مباشر لربط Wails `RemoveBackground` وحذف `bg-removal.worker.ts` نهائياً | فحص الأنواع `npm run typecheck` و `npm run lint` (0 تحذيرات) ✅ |
| بوابات الجودة والتوثيق | دوال Go اختبارية 45 ملفاً (+1) ناجحة 100%، Vitest (119 ملفاً) ناجحة 100%، وبوابة التوثيق `--strict-refs` ناجحة | `docs-gate.mjs` ✅ |

---

## 0.73 سجل جلسة تصليب وتسريع خط CI (أمان + زمن) — 12 أكتوبر 2026

**المرجع:** طلب المالك — تقليص زمن عمليات البناء والاختبارات على GitHub بالإجراءات الأمنية والقياسية الموصى بها. المهارة المعنية رُوجعت (`.agents/skills/wails-cross-compiler`) ولا تغيير عليها — العمل يخص سير العمل السحابي لا بروتوكول البناء المحلي.

| البند | التنفيذ | الإثبات |
| --- | --- | --- |
| صلاحيات الحد الأدنى | `permissions: contents: read` علوياً (كل الوظائف للقراءة فقط افتراضياً، كنمط `release.yml`) + `workflow_dispatch` | تحليل YAML آلي (صلاحيات + 8 وظائف) ✅ |
| فلترة المسارات | وظيفة `changes` (`dorny/paths-filter@v3` مع `fetch-depth: 0` الكامل لدقة `push`) + شروط `needs/if` لكل وظيفة ثقيلة، وبوابة التوثيق بلا اعتماد وتعمل دائماً | نفس التحليل (توصيل needs/outputs سليم) ✅ |
| ضمان التقاطع | الواجهة تعمل أيضاً عند تغيّر Go (انحراف الربطات)، وE2E/WebKit على جسر Mock فلا تتأثر بـ Go وحده — موثّق في تعليق الوظيفة | مراجعة `ci.yml` ✅ |
| مهلات صريحة | `timeout-minutes` على الوظائف الثماني (5–60) بدل حد GitHub الافتراضي 6 ساعات | نفس التحليل ✅ |
| تثبيت staticcheck | `@latest` المتحرك ← `2025.1.1` (إصدار مُتحقق من `dominikh/go-tools`) + مفتاح كاش مطابق، وتوحيد Go/Node في `env` علوي | مراجعة `ci.yml` ✅ |
| كاش WebKit | كتلة كاش `~/.cache/ms-playwright` بمفتاح `webkit` + شرط التثبيت عند الفقد (كان ~100MB+ كل تشغيل) + `--no-fund` في كل `npm ci` | مراجعة `ci.yml` ✅ |
| Dependabot | `.github/dependabot.yml` جديد (أسبوعي: إجراءات + `frontend` + `admin-web` + وحدات Go بسقوف PR) | تحليل YAML (4 أنظمة) ✅ |
| تنسيق وتحقق | `prettier` المثبت (3.9.4) نظيف + `docs-gate` و`--strict-refs` ناجحان | 2026-10-12 ✅ |

**الأثر الزمني المتوقع (بلا قياس سحابي بعد — يُقاس أول دورة بعد الدفع):** طلبات التوثيق فقط ~دقيقة (البوابة + الفلترة) بدل ~25 دقيقة · WebKit يوفر تنزيل المتصفح عند ثبات القفل · لا تغيير في زمن طلبات الكود الكاملة (نفس الاختبارات، بتخطي التثبيتات المكررة فقط).
**الفجوات المتبقية عمداً:** تثبيت الأفعال بـ SHA (مقابل صيانة أعلى — الاعتماد على Dependabot + نطاقات majors) · `workflow_call`/`composite actions` لإزالة تكرار الإعداد ×5 (تغيير هيكلي أكبر أُجّل لمراجعة مستقلة) · التحقق السحابي الفعلي بعد الدفع (`gh run watch` — بلا دفع في هذه الجلسة).

---

## 0.72 سجل جلسة رفع تغطية اختبارات الملصقات (+37) — 12 أكتوبر 2026

**المرجع:** طلب المالك — زيادة تغطية الاختبارات. النطاق: نظام الملصقات (أعلى فجوات سلوكية قابلة للاختبار الحتمي في `jsdom`) بلا أي Mock — سلوك حقيقي عبر `localStorage` والمكتبات الفعلية (`jsbarcode`، `qrcode.react`)، ومراجعة ذاتية بمهارة `test-guard` قبل الشحن.

| البند | التنفيذ | الإثبات |
| --- | --- | --- |
| تصليب تخزين القوالب (13) | رفض 6 حمولات فاسدة (JSON معطوب/غير مصفوفة/بلا `params.fields`)، إزالة تكرار الاسم لنفس القالب، سقف 50 بالأحدث أولاً، فرادة 50 معرفاً متتابعاً، اسم افتراضي، نسخ عميق للحقول، حذف آمن لمعرف مجهول | `test/sticker-coverage.test.ts` ✅ |
| مسارات الباركود/QR (4) | CODE128 حقيقي متزامن بعد التسخين، تحذير EAN13 غير الصالح، EAN13 غير متزامن بالمقاس المطلوب، QR حقيقي غير متزامن بلا عنصر وهمي | نفس الملف ✅ |
| تخطي تضمين الخطوط (3) | بلا عائلات مطلوبة، خطوط مضمنة مسبقاً، عائلات مجهولة بلا وجوه قابلة للجلب — كلها تُرجع الأصل | نفس الملف ✅ |
| الكتالوج والبحث (11) | المجموعات السبع × فلاتر الأشكال الثلاثة، البحث الفارغ = الكتالوج كاملاً، بحث بالمعرف/بالفئة/مجهول، الحقول بلا عنصر مرئي | نفس الملف ✅ |
| القياس والحالات الحدية (6) | تقدير بديل بلا كانفاس، أرضية المليمتر، ونِسَب الأبعاد الشاذة (0/سالب/NaN) | نفس الملف ✅ |
| بوابات الجودة | المجموعة الكاملة **119 ملفاً / 1074 ناجحة + 1 متخطاة (0 فاشلة)** · `tsc` نظيف · `eslint` (0) · `prettier` · `docs-gate` + `--strict-refs` ✅ | 2026-10-12 ✅ |

**الفجوات المتبقية عمداً (غير قابلة للاختبار الحتمي في `jsdom`):** `renderSvgToPngDataUrl` و`generateStickerSheet` (يتطلبان كانفاس 2D حقيقياً) · `renderVdpBatch` (يعتمد عليهما) · مكونات `StickerStudioDialog`/`StickerCatalog` التفاعلية (تُغطى بـ E2E: `sticker-studio.spec.ts`). *[تصحيح لاحق — الجلسة 1.03: حُذف `generateStickerSheet` لغياب مستدعيه وتوحّد المسار على `generateStickerSheetBlob`، وصار `renderSvgToPngDataUrl` مسار توافق للحافظة فقط.]*

---

## 0.71 سجل جلسة حزمة جودة نظام الملصقات (P0 + P1) — 12 أكتوبر 2026

**المرجع:** طلب المالك — تطوير نظام الملصقات وتحسين جودته بشكل شامل مرتب بلا مكتبات جديدة (تثبيت الحزمة الحالية: `culori` للاحق، و`jspdf/pdf-lib/fuse.js` مقترحة للمرحلة التالية ولم تُعتمد بعد).

| البند | التنفيذ | الإثبات |
| --- | --- | --- |
| بحث عربي مُطبَّع | `normalizeArabicQuery` (همزات/تاء مربوطة/تشكيل/تطويل) مطبَّق في `searchStickerTemplates` على الطرفين | `test/sticker-quality.test.ts` (3 حالات: توحيد + «قهوه» تجد «قهوة») ✅ |
| فضّ تضارب معرّفات SVG | `namespaceStickerSvgIds` (idempotent) في المعرض (`tpl-<id>`) والمعاينة الحية (`live-<id>`) | نفس الملف (3 حالات: تبادئ + idempotent + تكامل postProcess) ✅ |
| حماية الوصل العربي | إسقاط `letter-spacing` عن RTL مركزياً في `postProcessStickerSvg` مع إبقائه للاتيني | حالة مخصصة (عربي بلا تباعد · PREMIUM به) ✅ |
| تنبيه تباين الطباعة | `lib/sticker-a11y.ts` (WCAG نقي) + سطر تحذيري حي في لوحة الألوان عند < 3.0 | 3 حالات (21:1 · رفض غير-hex · تمييز منخفض/عالٍ) ✅ |
| ملاءمة الشيت التلقائية | `autoFitSheetGrid` + زر «ملاءمة تلقائية على الورقة» بأبعاد ورق الطباعة الفعالة | حالتان (A4 ‏50مم→3×5 · ملصق أكبر من الورقة→1×1) ✅ |
| تصدير 600 DPI + تنعيم عالٍ | خيار «PNG فائقة (600 DPI للمطابع)» + `imageSmoothingQuality: high` في الترسترة والشيت | مراجعة الكود ✅ |
| سلاسة الكتابة | `useDeferredValue(params)` لتوليد SVG الثقيل بقيمة مؤجلة | `tsc` + فحص حي ✅ |
| P0-1 تسريب object URLs | إصلاح الاستدعاء الذاتي اللانهائي إلى `URL.revokeObjectURL` فعلي بعد 60 ثانية | مراجعة الكود ✅ |
| P0-2 رموز QR/باركود وهمية | عناصر تحذيرية صريحة بدل المربع الأسود/الشريط المصمت قبل الجاهزية أو عند الفشل | مراجعة الكود ✅ |
| P0-3 معرفات القوالب | `crypto.randomUUID()` + تشديد تحقق `params.fields` عند التحميل | مراجعة الكود ✅ |
| بوابات الجودة | `tsc --noEmit` نظيف · `eslint` (0) على الملفات العشرة · ملفات الملصقات المعنية 78/78 ✅ · `docs-gate` (بعد تحديث `vitest_test_files` 117→118) ✅ | 2026-10-12 ✅ |

**الفجوات المتبقية (للمرحلة التالية، مقترحة ولم تُعتمد):** تصدير PDF للمطابع (`pdf-lib`/`jspdf` — الفجوة M-5) · بحث ضبابي (`fuse.js`) · تناغم ألوان `culori` في لوحة الملصقات · تفكيك `sticker-studio-dialog.tsx` (914 سطراً) و`sticker-properties.tsx` (710) على غرار الجلسة 0.70 · مقاس الملصق بالمم قابل للتحرير (يتطلب ترحيل مخطط `StickerParams`) · استيراد/تصدير القوالب المحفوظة.

---

## 0.70 سجل جلسة توحيد التسجيل وتفكيك الوحدات الضخمة ورفع التغطية — 12 أكتوبر 2026

**المرجع:** مراجعة التعديلات الأخيرة (ترحيل `console` إلى `createLogger`) + تفكيك أضخم 10 ملفات + رفع تغطية الاختبارات.

| البند | التنفيذ | الإثبات |
| --- | --- | --- |
| استكمال ترحيل `console.error/warn` إلى `createLogger` في 40 ملفاً + حارس H9 | كل ملف إنتاج يسجّل عبر نطاقه الخاص، والـ backend يستلم `info/warn/error` عبر `LogFrontendError`؛ اختبار H9 يمنع عودة `console` الخام | `frontend/src/lib/logger.ts` + `test/ui-compliance.test.ts:189` ✅ |
| إصلاح فقدان قابلية فحص DevTools في `logger` | الـ console تستلم الأجزاء الأصلية بهويتها، و`Error` يُنسَّق عبر `message` بدل `{}`، مع `console.info/debug` الصحيح | `frontend/src/lib/logger.ts:7-62` + `test/logger.test.ts` (6 حالات) ✅ |
| تفكيك `freeform-math.ts` (1184 سطراً) | مجلد `lib/slots/` بعشرة ملفات + barrel، والملف الأصلي shim؛ لا تغيير بأي مستهلك | `frontend/src/features/freeform-collage/lib/slots/` ✅ |
| تفكيك `element-slice.ts` (898 سطراً) | مجلد `slices/element/` بتسعة ملفات بنفس `createElementSlice` وشكل الحالة | `frontend/src/lib/store/slices/element/` ✅ |
| تفكيك `AdminDashboard.tsx` (1684 → 180 سطراً) | مجلد `admin-web/src/pages/admin/` (4 هوكات + 10 مكونات) بنفس التصدير الافتراضي | `admin-web/src/pages/admin/` ✅ |
| رفع التغطية +31 حالة | `test/logger.test.ts` (6) + `test/freeform-slots-coverage.test.ts` (25)؛ المجموع **1025 ناجحة + 1 متخطاة في 117 ملفاً** | `npm --prefix frontend run test` بتاريخ 2026-10-12 ✅ |
| بوابات الجودة | `tsc --noEmit` (فرونت + admin) نظيف · `eslint` بلا تحذيرات · `node scripts/docs-gate.mjs --strict-refs` ناجح | 2026-10-12 ✅ |

**الفجوات المتبقية:** هوكات الـ admin الجديدة بلا اختبارات (تتطلب `testing-library` غير مثبتة في `admin-web` — تحقق وهمي هناك يخفي أكثر مما يكشف) · ملفا الداتا `addons.ts`/`frames.ts` و`icons.tsx` تُركت عمداً (حجمها طبيعي).

---

## 0.69 سجل جلسة التصحيح والتحصين المعماري المركز — 12 أكتوبر 2026

**المرجع:** مراجعة وتدقيق تقرير المعمارية الشامل — تنفيذ التحسينات المؤكدة بالكود الفعلي دون إدخال تراجعات.

| البند | التنفيذ | الإثبات |
| --- | --- | --- |
| تسريع استجابة الذكاء الاصطناعي وتوحيد كاش Supabase Auth | دمج جلب معرّف المستخدم `userID` وخطة الحساب والحد اليومي في كاش ذاكري موحد `userPlanCacheEntry` في `internal/service/ai_service.go` بمهلة 5 دقائق؛ القضاء على طلب HTTP المزدوج عند كل عملية تحسين | `ai_service.go:resolveUserInfoForToken` ✅ |
| استئصال استيراد Wails v2 الموروث في الكانفاس | تحديث `editor-canvas.tsx` للاستيراد المباشر لـ `OpenFile` و `SaveImageFromBase64` من حزمة bindings الرسمية `@bindings/grido/app` | `editor-canvas.tsx:6` ✅ |
| ضبط نوعية عقود IPC لتنظيف وسائط التخزين | استبدال `map[string]interface{}` بهياكل صريحة `MediaCleanupResult` و `MediaTrashResult` في `internal/service/media_service.go` و `app.go` لتوليد أنواع TypeScript قوية بدلاً من `{ [_ in string]?: any }` | `media_service.go` + `app.go` ✅ |
| تطهير جذر المستودع وعزل حزمة سطح المكتب | استخراج وتجميع 5 ملفات Go مبعثرة خاصة بالنوافذ ومراقبة الشاشات في حزمة `internal/desktop/`، وحذف ملف ثنائي مهمل `grido.exe` (95MB) وسجلات vite من الجذر وتحديث مراجع واستيرادات `main.go` | `internal/desktop/` + `main.go` ✅ |
| بوابات الجودة والتحقق الآلي | `npm run lint` (0 تحذيرات) · `npm run typecheck` (0 أخطاء) · `go vet` (0 أخطاء) · `go test ./internal/desktop/...` (نجاح) · `node scripts/docs-gate.mjs --strict-refs` (نجاح تام) | 2026-10-12 ✅ |

---

## 0.68 سجل جلسة معالجة ثقل الذاكرة وهندسة إدارة الرام الأصلية لتطبيق سطح المكتب — 11 أكتوبر 2026

**المرجع:** فحص حي وميداني دقيق لاستهلاك الرام والمعالج عبر شجرة عمليات Wails وWebView2 — معالجة التضخم العشوائي للذاكرة (حيث تجاوز الاستهلاك سابقاً 1.3GB إلى 1.4GB) وإعادة التطبيق إلى أصول برمجيات سطح المكتب الخفيفة (<15MB إلى 100MB رام نشط).

| البند | التنفيذ | الإثبات |
| --- | --- | --- |
| إلغاء وسائط Chromium المسببة لتضخم الـ GPU Process | حذف وسائط `--enable-gpu-rasterization` و`--enable-zero-copy` و`--ignore-gpu-blocklist` من `main.go` لمنع حجز 600MB+ من ذاكرة أسطح Direct3D المشتركة | انخفاض الذاكرة المحجوزة للـ GPU من 608MB إلى ~310MB ✅ |
| حظر التحميل المسبق لـ OpenCV WASM عند الإقلاع (`Zero Early Allocation`) | إزالة `warmupOpenCV()` من `use-app-bootstrap.ts` وتحويلها لدالة خاملة في `opencv-loader.ts` لمنع حجز 15MB WASM وهيب الذاكرة الخطية في عملية الـ renderer عند الإقلاع، وحصرها عند فتح الماسح الضوئي فقط | فحص لوج الإقلاع وغياب كاش OpenCV حتى يطلبه المستخدم ✅ |
| خدمة إدارة وتفريغ الذاكرة الأصلية في Go (`MemoryService`) | استحداث `internal/service/memory_service.go` و`memory_service_windows.go` لاستدعاء `EmptyWorkingSet` و`SetProcessWorkingSetSizeEx` على Go وعمليات WebView2 التابعة، وعند تصغير النافذة أو فقدان التركيز. منذ جلسة 1.14 (2026-10-20) صار التقليم **تكيّفياً**: فحص كل 45 ثانية، وتنفيذ فقط عند تجاوز كومة Go حد 320 MiB أو بعد 10 دقائق صيانة — بدل كل 30 ثانية | انخفاض الـ Working Set الفعلي إلى **14.4MB فقط** عبر كامل العمليات ✅ |
| تفريغ فوري للرام عند إنهاء العمليات (`triggerMemoryTrim`) | استدعاء تفريغ الذاكرة عبر `/api/trim-memory` فور اكتمال عزل الخلفية وتأطير الوجه وإغلاق حوارات التصدير والطباعة والماسح الضوئي | استجابة فورية وتفريغ تلقائي فور إغلاق أي حوار ثقيل ✅ |
| تحرير فوري لعمال الذكاء الاصطناعي (`Worker Terminate on Settle`) | استدعاء `terminateWorker()` تلقائياً داخل دالة `settle()` المشتركة في `use-bg-removal.ts` و`use-face-frame.ts` فور اكتمال الاستدلال أو فشله أو إلغائه، لتحرير سياق WebGL/ANGLE وذاكرة Worker فوراً | فحص العمليات الحية + تصفير استهلاك الرام إلى أدنى مستوى ✅ |
| إغلاق صريح لأقنعة الذاكرة `MPMask.close()` وكبح أبعاد الاقتصاص | إغلاق أقنعة التجزئة صراحةً مع وضع سقف `maxCropDim = 2048` بكسل على أبعاد الـ `OffscreenCanvas` في `face-frame.worker.ts` | `bg-removal.worker.ts` + `face-frame.worker.ts` ✅ |
| بوابات الجودة والتحقق الآلي | `npm run lint` (0 تحذيرات) · `npm run typecheck` (0 أخطاء) · `node scripts/docs-gate.mjs --strict-refs` (نجاح تام) · `go test ./internal/service/...` (نجاح) | 2026-10-11 ✅ |

---

## 0.67 سجل جلسة تحصين أمني وموثوقي شامل (أربع فجوات مُغلقة) — 11 أكتوبر 2026

**المرجع:** التقرير 19 (`docs/reviews/19-security-hardening-2026-10-11.md`) — أربع فجوات مؤكدة بالكود والقياس، نُفِّذت بالترتيب من الأثر الأعلى إلى الأدنى، مع إثبات بالقياس وفحص تفنيد حيث أمكن.

| البند | التنفيذ | الإثبات |
| --- | --- | --- |
| تعليق أبدي بعد سقوط عامل الويب (P1 — مرئي للمستخدم) | `onerror` صار يلتقط الطلبات المعلقة ثم **يُنهي العامل المُتعطّل** في `use-bg-removal.ts` و`use-face-frame.ts` فيُبنى عامل جديد عند الطلب التالي، بدل إعادة `postMessage` إلى عامل ميت | اختبار انحدار في `bg-worker.test.tsx` + **فحص تفنيد** (فشل على الكود القديم بحالة `1 failed` على تأكيد `terminate`) ✅ |
| ثقة التحديث بالمصدر نفسه (TOFU) | توقيع Ed25519 على بصمة المثبت الخام بمفتاح عام مثبّت (`UpdaterPublicKey`)؛ مفتاح مُهيَّأ ⇒ إلزامي وفشل مغلق، غير مُهيَّأ ⇒ السلوك القديم بتحذير صريح؛ + ربط `Taskfile`/`release.yml` ومتغيّر مستودع، ووسيط Netlify يمرّر `signature` | 18 حالة اختبار في `updater_test.go` ✅ |
| ثغرة `xlsx` عالية بلا إصلاح من npm | تغيير المصدر إلى النسخة المصونة `cdn.sheetjs.com/xlsx-0.20.3` مع بقاء حراس التخفيف دفاعاً في العمق | `npm audit --omit=dev` = **0 ثغرات** (كانت عالية واحدة) + 12/12 اختبار VDP ✅ |
| مسارات `/api` المحلية بلا توكن جلسة | `service.LocalApiGuard`: أصل مطابق + ترويسة `X-Grido-Session` بمقارنة زمن ثابت؛ التوكن عبر ربط Wails وحده ولا يُسجَّل؛ **فشل مغلق** عند تعذّر التوليد + عميل واجهة موحّد على المستدعين الأربعة | 10 حالات حارس (`httptest`) + 13 أوليات + 4 عميل واجهة ✅ |
| توليد الربطات والتحقق الشامل | `wails3 generate bindings -ts -clean=true` (دالة جديدة `GetLocalApiToken` وتوقيع ثلاثي لـ`DownloadAndInstallUpdate`) مع تسجيل المعالج في جسر E2E | Vitest **115 ملفاً / 992 ناجحاً + 1 متخطّى** · `go test ./internal/...` ✅ · `typecheck` ✅ · `lint` (0) ✅ · حارس انحراف العقود (4) ✅ |

**فجوات متبقية (غير منفَّذة عمداً وموثقة في القسم 6 من التقرير 19):** تشقق المفاتيح مربوط بالجهاز بملح ثابت معلن (بلا DPAPI/Keystore) · CSP الإنتاج يسمح `img-src https:` و`connect-src localhost:*` · نمو محدود في `pathLocks` داخل `atomicfile.go` · إلغاء الترميم السحابي ما زال غير ممكن · ادعاء ثغرة TLS في `go1.26.4` لم يُتحقق منه (‏`govulncheck` غير مثبّت).

---

## 0.66 سجل جلسة تصدير CMYK (TIFF/JPEG) من حوار التصدير وإصلاح حامل أحبار TIFF — 11 أكتوبر 2026

**المرجع:** تنفيذ التوصية (1) من تقرير تدقيق أنظمة الألوان (البند F-1 / G8) — إعادة مدخل CMYK في حوار **التصدير** (لا الطباعة) لإخراج ملفات مطابع الأوفست، وهو نفس الاتجاه المحمي في الجلسة 0.47 (البند: استئصال خيار فضاء الألوان من حوار الطباعة وتوحيده على sRGB، وترك CMYK لمطابع الأوفست في التصدير) — لا نقض لأي قرار محمي.

| البند | التنفيذ | الإثبات |
| --- | --- | --- |
| مدخل فضاء الألوان (RGB/CMYK) في حوار التصدير | مجموعة أزرار `export-colorspace-label` وشبكة صيغة تابعة: RGB ⇒ PNG/JPG و CMYK ⇒ TIFF/JPEG، مع إخفاء النزيف وعلامات القص وتصدير الخلايا المنفصلة في وضع CMYK (لا تنطبق على المسار) | `export-dialog.tsx` ✅ |
| وصل الإعداد بمسار الطباعة الخلفي | المساعد `runCmykExport`: لقطة بنفس دقة مسار RGB ← رفع إلى `/api/upload-print-image` ← `PrintRequest` (عنصر واحد يملأ الورقة، بلا خطوط قص، `colorSpace: "cmyk"`) ← `ExportPrintSheet` بمهلة `EXPORT_TIMEOUT_MS` ← قراءة `print_*` من `/local-image/` وحفظها | `export-cmyk.ts` + `export-dialog.tsx` ✅ |
| فلتر TIFF في حوار الحفظ الخلفي | إضافة `AddFilter("TIFF Image (*.tif;*.tiff)")` لمسار `/api/save-file` عند امتداد `.tif/.tiff` | `main.go` ✅ |
| إصلاح G8: TIFF بفصل أحبار حقيقي | `encodeCMYKTIFF` يكتب `PhotometricInterpretation=5` و`InkSet=1` و`SamplesPerPixel=4` و Deflate بلا `ExtraSamples`، ويعيد استخدام `injectTIFFResolution`؛ القياس قبل الإصلاح: TIFF بـ photometric=2 (RGB) وقناة ألفا، وJPEG بـ 3 مكوّنات | `print_cmyk_tiff.go` + `print_export.go` ✅ |
| قيد متبقٍ موثَّق صراحةً | مخرج JPEG يبقى بفضاء RGB لأن مُرمِّز Go لا يدعم CMYK — الحوار يذكر ذلك في وصف الخيار وفي لوحة المعلومات | `export-dialog.tsx` + القسم 12 من تقرير المفشلة 18 ✅ |
| تحسين عزل الخلفية ودقة خصلات الشعر (Hair-Aware Adaptive Thresholding) | استخراج قناع الشعر المستقل (`confidenceMasks[1]`) من نموذج `selfie_multiclass` في `bg-removal.worker.ts` وتطبيق عتبة ديناميكية متكيفة (حساسية ناعمة 0.15..0.52 للشعر، وقاطعة 0.35..0.65 للجسم والملابس) + توسيع نطاق `lutAlpha` في Go من `[65..215]` إلى `[15..235]` لمنع بتر الشعر وحل مشكلة القص المزدوج | `bg-removal.worker.ts` + `image_processor.go` ✅ |
| منظومة اختبارات العقد والإصلاح | `test/export-cmyk.test.ts` (14) و`test/export-dialog.test.tsx` (11) و`print_cmyk_tiff_test.go` و`print_fullpage_cmyk_test.go` + تحديث اختباري المفكّك الخاطئ وتعليق TAC | `vitest` + `go test ./internal/service` ✅ |
| بوابات الجودة والتحقق الآلي | `npm run lint` (0) · `npm run typecheck` (0) · `node scripts/docs-gate.mjs --strict-refs` (نجاح) · `go vet ./...` (نجاح) — والتحقق الثقيل (Vitest/Go suites/E2E) عبر GitHub Actions | 2026-10-11 ✅ |

**فجوة متبقية (غير منفَّذة عمداً وموثقة):** ترميز 4 مكوّنات CMYK داخل JPEG — يحتاج مُرمِّز JPEG مستقل بلا دعم من مكتبة Go القياسية (مرشح لجلسة مستقلة)، وتغطيها حاليًا واجهة الحوار بتوضيح صريح أن TIFF هو الحامل الحقيقي.

---

## 0.65 سجل جلسة تحصين مسارات التحديث وتوزيع المثبت بعد تحويل المستودع إلى خاص — 10 أكتوبر 2026

**المرجع:** حماية وتأمين الشيفرة المصدرية بجعل مستودع `wisam79/grido` خاصاً (`Private`)، مع ضمان استمرار التحديث التلقائي لكافة الإصدارات السابقة والحالية وتنزيل المثبت من موقع `https://grido.cloud-ip.cc` دون أي أخطاء أو طلب تسجيل دخول.

| البند | التنفيذ | الإثبات |
| --- | --- | --- |
| تحويل المستودع إلى خاص (`Private Repository`) | تحويل رؤية المستودع رسمياً إلى خاص مع الحفاظ على النشر العام لـ GitHub Pages على الدومين المخصص `grido.cloud-ip.cc` بدعم اشتراك GitHub Pro | `gh repo view` (isPrivate: true) ✅ |
| خدمة مسارات التوزيع الثابتة عبر GitHub Pages | أتمتة جلب ملف المثبت الفعلي عبر `gh release download` وتخزينه كـ `/GridoStudio-installer.exe` و `/api/download` وبيانات الإصدار `/api/version` داخل `.github/workflows/deploy-pages.yml` | `.github/workflows/deploy-pages.yml` ✅ |
| تطبيع روابط التحميل في الباك إند (`updater.go`) | استخراج الرابط تلقائياً وتطبيع أي رابط خاص بـ GitHub Releases إلى الرابط العام `https://grido.cloud-ip.cc/api/download` لمنع أخطاء `404 Not Found` | `updater.go` + `updater_test.go` (اجتياز 5 اختبارات) ✅ |
| توحيد رابط التحميل المباشر باسم الملف الصريح في الموقع | توجيه `GITHUB_RELEASE_DOWNLOAD_URL` في `admin-web/src/lib/version.ts` إلى `/GridoStudio-installer.exe` لتنزيل المثبت مباشرة باسمه وامتداده الصحيح | `version.ts` ✅ |
| بوابات الجودة والتحقق الآلي | بناء `admin-web` (نجاح تام) · `tsc --noEmit` (0) · `go test ./internal/service` (أخضر) · `docs-gate.mjs --strict-refs` يمر بنجاح 100% | 2026-10-10 ✅ |

---

## 0.64 سجل جلسة صقل ومطابقة محرك نصوص Konva ودعم RTL وتحميل الخطوط (Konva Text Engine Audit & Hardening) — 10 أكتوبر 2026

**المرجع:** طلب المالك مراجعة توثيق Konva وطريقة تعامل المحرك مع النصوص، والتحكم بالخصائص وأدوات التعديل ووجودها في الكانفاس، ثم إعادة تقييم الحالة الفعلية للكود وتنفيذ الإصلاحات.

| البند | التنفيذ | الإثبات |
| --- | --- | --- |
| تدقيق معماري وتوثيقي شامل لمحرك النصوص | مراجعة شاملة لتوثيق Konva.js الرسمي وإنشاء أرتيفاكت المراجعة الشامل ومقارنة خصائص `Konva.Text` الـ 20+ مع كود Grido (`TextElement` و `text-node.tsx` و `editor-transformer.tsx` و `text-editing-overlay.tsx`) وتوثيق نسبة النضج والتفوق البصري (90%) | `konva-text-engine-audit.md` ✅ |
| دعم اتجاه النص العربي الصريح (`direction="rtl"`) | تمرير خاصية `direction={isArabic ? 'rtl' : 'inherit'}` لعقدة `<KonvaText>` لمنع Konva من تفكيك الكلمات العربية إلى محارف فردية وحماية وصلات الحروف وتماسكها عند محاذاة النص أو التوزيع | `text-node.tsx` ✅ |
| مزامنة تحميل خطوط Google مع إعادة قياس ورسم Konva | إنشاء سجل اشتراك `onFontReady` في `fonts.ts` بالاعتماد على `document.fonts.ready`، والاشتراك به داخل `text-node.tsx` لاستدعاء `_setTextData()` وإعادة رسم الطبقة `batchDraw()` فور جاهزية الخط في ذاكرة المتصفح لمنع تشوه أبعاد النص بالخط البديل | `fonts.ts` + `text-node.tsx` ✅ |
| تبسيط مربع التحديد وتطهير الازدواجية وتحصين القفل | حذف `useEffect` المكرر ومصفوفات الـ refs الزائدة من `konva-canvas.tsx` والاعتماد على `EditorTransformer` كمصدر وحيد للحقيقة وفق نمط Konva الرسمي، وحظر تعديل العناصر المقفلة في التحديد المتعدد، وتصحيح شارة الأبعاد الحية لقراءة المجموعة بالكامل | `editor-transformer.tsx` + `konva-canvas.tsx` + `konva-overlay-layer.tsx` ✅ |
| بوابات الجودة والتحقق الآلي | `tsc --noEmit` (0 أخطاء) · `eslint` (0 أخطاء) · `node scripts/docs-gate.mjs --strict-refs` يمر بنجاح 100% | 2026-10-10 ✅ |

---

## 0.63 سجل جلسة تقنين «صفر الحشو البصري» للوكلاء (Zero Visual Filler Standard) — 10 أكتوبر 2026

**المرجع:** ملاحظة المستخدم أن الوكلاء أثناء التطوير يميلون للحشو البصري: أيقونات في كل مكان حتى عند عدم الحاجة إليها، وعنوان فرعي تحت كل عنوان رغم أن العنوان الرئيسي نفسه قد يكون زائداً — وأن هذا الأسلوب غير صحيح وغير مفيد.

| البند | التنفيذ | الإثبات |
| --- | --- | --- |
| قاعدة ملزمة جديدة في قواعد الواجهة | إضافة «حظر الحشو البصري (Zero Visual Filler Standard)» إلى `.agents/rules/ui-ux-fluent.md`: منع الأيقونات الزخرفية، منع العنوان الفرعي الافتراضي، قابلية حذف عنوان البطاقة عند وضوح المحتوى، و«اختبار الحذف» قبل التسليم؛ مع تقييد مبدأ Icon-Driven UI بالأيقونات الوظيفية فقط بدل صيغة «دائماً» السابقة | `.agents/rules/ui-ux-fluent.md` ✅ |
| تحديث دليل الواجهات | إعادة صياغة المبدأ الأول إلى «الأيقونات الوظيفية»، إضافة المبدأ الرابع «صفر حشو بصري»، وتحويل قالب الحوار القياسي إلى رأس مينيمالي افتراضي (بلا كبسولة أيقونة زخرفية أو `DialogDescription` تلقائي أو أيقونة داخل زر التنفيذ) مع بقاء `DialogTitle` إلزامية للوصولية | `.agents/skills/grido-ui-designer-guide/SKILL.md` ✅ |
| بوابات الجودة والتحقق الآلي | `node scripts/docs-gate.mjs --strict-refs` يمر بنجاح | 2026-10-10 ✅ |

---

## 0.62 سجل جلسة التوحيد الشامل لأسطح وخلفيات أزرار التحكم (Comprehensive Surface & Button Background Unification) — 10 أكتوبر 2026

**المرجع:** ملاحظة المستخدم وطلبه للتوحيد الشامل لخلفيات الأزرار بعد ملاحظة تباين ألوان الأزرار في الوضع الداكن بين الداكن الغائر والأفتح المرفوع.

| البند | التنفيذ | الإثبات |
| --- | --- | --- |
| توحيد محددات القياس والاتجاه إلى `FluentSegmentedControl` | استبدال عناصر `div` اليدوية لمحدد وحدة القياس (`px` / `mm`) والاتجاه (`عمودي` / `أفقي`) في `canvas-dimensions-panel.tsx` بالمكوّن القياسي `FluentSegmentedControl`، موفراً مساراً مجوفاً وظلالاً وانتقالاً سلساً مطابقاً لتبويبات اللوح العلوية (`الكولاج` / `الورقة`) | `canvas-dimensions-panel.tsx` ✅ |
| توحيد زر مقاس الورقة وزر قفل الأبعاد إلى `bg-card` | رفع سطح زر المقاسات القياسية (`A4`) وزر قفل نسبة الأبعاد (`lockAspect`) من `bg-input/60` (الذي كان يجعلهما كصناديق إدخال سوداء غائرة) إلى الأسطح المرفوعة القياسية للأزرار `bg-card hover:bg-muted/60 border border-border/80` | `canvas-dimensions-panel.tsx` ✅ |
| توحيد محددات ومفاتيح لوحة الشبكة والقص (`grid-columns-panel.tsx`) | تحويل خيارات نمط الشبكة (`خطوط` / `نقاط`) وشكل القص (`مستطيل` / `مستدير` / `دائري`) إلى `FluentSegmentedControl`، وترقية صفوف مفاتيح التبديل من `bg-input/50` إلى أسطح البطاقات `bg-card/70` | `grid-columns-panel.tsx` ✅ |
| توحيد محفزات اختيار الألوان والأزرار السريعة (`shared-controls.tsx`) | ترقية محفزات `PopoverColorPicker` وزر القطارة وزر الخلفية الشفافة وأزرار أنماط النصوص السريعة (`text-type-tab.tsx`) إلى أسطح `bg-card` المتسقة | `shared-controls.tsx` + `text-type-tab.tsx` ✅ |
| بوابات الجودة والتحقق الآلي | `tsc --noEmit` (0) · `eslint` (0 تحذير) · `vitest test/canvas-dimensions-panel.test.tsx` (2 ناجحة) · `docs-gate.mjs --strict-refs` يمر بنجاح 100% | 2026-10-10 ✅ |

---

## 0.61 سجل جلسة توحيد أزرار الإخراج في الشريط العلوي (Toolbar Export Buttons Visual Unification) — 10 أكتوبر 2026

**المرجع:** طلب المستخدم توحيد أزرار وأيقونات (حفظ، طباعة، تصدير) في الشريط العلوي بصف واحد، حيث كان زر التصدير يظهر بنص ولون أزرق وحجم مختلف عن زري الحفظ والطباعة الأيقونيين.

| البند | التنفيذ | الإثبات |
| --- | --- | --- |
| توحيد هندسة ومقاس زر التصدير (`h-8 w-8`) | تحويل زر «تصدير» من زر ممتد بنص عريض (`px-3` ولون `primary`) إلى زر أيقوني قياسي مربع (`32×32px / h-8 w-8 p-0`) ليتطابق هندسياً وبصرياً 100% مع زري «حفظ» و«طباعة» | `toolbar.tsx` ✅ |
| توحيد عائلة الأيقونات وحزمتها (Fluent 2) | استخدام أيقونات Fluent 2 الرسمية الموحدة (`FloppyDisk`, `Printer`, `Export`) من `@/components/ui/icons` مع توحيد ألوان النص وحالات التمرير والتكبير (`w-4 h-4 text-muted-foreground/80 group-hover:text-foreground group-hover:scale-105`) | `toolbar.tsx` ✅ |
| الحفاظ على الوصولية واختصارات لوحة المفاتيح | الحفاظ الكامل على `aria-label="تصدير صورة"` وشارات التلميح المتضمنة للاختصارات السريعة (`Ctrl+S`, `Ctrl+P`, `Ctrl+E`) ومعرفات الاختبار `data-testid` | `toolbar.tsx` ✅ |
| بوابات الجودة والتحقق الآلي | `tsc --noEmit` (0) · `eslint` (0) · `vitest` كافّة الاختبارات خضراء · `docs-gate.mjs --strict-refs` يمر بنجاح 100% | 2026-10-10 ✅ |

---

## 0.60 سجل جلسة إلغاء الأكورديون الفردي وإتاحة تعدد البطاقات المفتوحة (Multi-Open Independent Section Cards) — 10 أكتوبر 2026

**المرجع:** طلب المستخدم التراجع عن نمط الأكورديون الفردي الحصري (Solo Mode) الذي كان يطوي البطاقات تلقائياً ويترك بطاقة واحدة مفتوحة فقط، وإعادة السلوك الحر الذي يتيح فتح بطاقات متعددة في نفس الوقت دون طي إجباري.

| البند | التنفيذ | الإثبات |
| --- | --- | --- |
| إلغاء نمط الأكورديون الفردي الحصري (`Solo Mode`) | إزالة منطق `activeSection` الفردي ومفتاح `SOLO_SECTION_PREF_KEY` من تبويب شبكة الكولاج (`collage-custom-grid-tab.tsx`) وتطهيره من التخزين المحلي | `collage-custom-grid-tab.tsx` ✅ |
| إتاحة فتح وإغلاق البطاقات باستقلالية تامة | إعادة استخدام مصفوفة التفضيلات `collapsePrefs` حيث تفتح كافة البطاقات افتراضياً (`open ?? true`) ويمكن للمستخدم طي أو فتح أي بطاقة بحرية دون التأثير على البطاقات المجاورة أو إغلاقها قسراً | `collage-custom-grid-tab.tsx` ✅ |
| حفظ تفضيل كل بطاقة في التخزين المحلي | حفظ حالة كل بطاقة بشكل مستقل في `localStorage` بمفتاح `COLLAPSE_PREF_KEY` لتذكر تفضيل المستخدم في الجلسات القادمة | `collage-custom-grid-tab.tsx` ✅ |
| بوابات الجودة واختبارات الوحدة | `vitest test/collage-custom-grid-tab.test.tsx` (8 اختبارات خضراء شملت اختبار الطي المتعدد والمستقل) · `tsc --noEmit` (0) · `eslint` (0) · `docs-gate.mjs --strict-refs` يمر بنجاح 100% | 2026-10-10 ✅ |

---

## 0.59 سجل جلسة صقل شارة التحجيم وترشيق الشريط السريع (Transformer Live Badge & Quick Bar Polish) — 10 أكتوبر 2026

**المرجع:** طلب المستخدم بحصر ظهور شارة الأبعاد والزاوية فوق العنصر على التحجيم فقط دون التحريك، وتنعيم لونها ومظهرها حتى لا تسد الرؤية، وترشيق وتصغير الشريط السريع المنبثق فوق العناصر.

| البند | التنفيذ | الإثبات |
| --- | --- | --- |
| حصر شارة الأبعاد على التحجيم فقط (`transform`) | فك ارتباط مستمعي `dragstart`, `dragmove`, `dragend` من شارة `transformer-badge` واقتصارها حصراً على أحداث `transformstart`, `transform`, `transformend` لمنع تشويش الرؤية أثناء سحب وتحريك العناصر | `editor-transformer.tsx` ✅ |
| تنعيم وتخفيف مظهر شارة الأبعاد (Fluent Acrylic) | تحويل خلفية الشارة إلى زجاج أكريليك خفيف شبه شفاف (`rgba(15, 23, 42, 0.72)` / `rgba(24, 24, 27, 0.75)`) مع حدود دقيقة 0.75px وظل ناعم، وخفض الارتفاع من 24px إلى 18px والخط إلى 9.5px وتقريبها من المقبض العلوي (`badgeOffset = 20`) | `index.css` + `editor-transformer.tsx` ✅ |
| ترشيق وتصغير الشريط السريع المنبثق (`canvas-quick-bar`) | تقليص الفجوة الرأسية فوق العنصر إلى `GAP_PX = 5` (بدلاً من 8px)، تصغير هوامش وحشوات الحاوية (`px-1 py-0.5 gap-0.5 rounded-lg`)، وإضافة ضبابية زجاجية أنيقة `backdrop-blur-md` مع الحفاظ على عقد أبعاد الأزرار القياسية `h-6 w-6` | `canvas-quick-bar.tsx` + `test/canvas-quick-bar.test.tsx` ✅ |
| بوابات الجودة والتحقق الآلي | `tsc --noEmit` (0) · `eslint` (0 تحذير) · `vitest test/canvas-quick-bar.test.tsx` (11 ناجحة) · `vitest test/canvas-viewport-bounds.test.ts` (6 ناجحة) · `docs-gate.mjs --strict-refs` يمر بنجاح 100% | 2026-10-10 ✅ |

---

## 0.58 سجل جلسة قص العناصر عند حدود الورقة (Canvas Paper Boundaries Clipping) — 10 أكتوبر 2026

**المرجع:** شكوى المستخدم من خروج العناصر وظهورها فوق مساحة العمل خارج حدود الورقة. توحيد السلوك البصري مع برامج التصميم الاحترافية (Photoshop, Figma, Illustrator) بقص المحتوى عند حواف الورقة.

| البند | التنفيذ | الإثبات |
| --- | --- | --- |
| قص طبقة العناصر الحرة (`elements-content-layer`) | إضافة `clipX={0} clipY={0} clipWidth={canvasWidth} clipHeight={canvasHeight}` على `<Layer name="elements-content-layer">` لمنع رسم أي أشكال أو نصوص أو صور خارج أبعاد الورقة المنطقية | `konva-single-layer.tsx` + `test/canvas-viewport-bounds.test.ts` ✅ |
| قص طبقة السحب الرسمية (`dragLayer`) | إضافة نفس خصائص القص على طبقة السحب الرسمية لضمان استمرار قص العنصر بسلاسة أثناء حركة الفأرة دون أي قفز أو تسريب خارجي | `konva-canvas.tsx` ✅ |
| قص طبقة الكولاج (`collage-layer`) | إضافة خصائص القص على `<Layer name="collage-layer">` لحماية وضع الكولاج من أي نزيف خارج حدود الورقة | `konva-collage-layer.tsx` + `test/canvas-viewport-bounds.test.ts` ✅ |
| محاذاة حارس الحذف التلقائي (`culling`) | توسيع هامش الحذف التلقائي للعناصر المدارة من 0.1 إلى 0.25 ليتطابق بدقة مع هامش السحب `margin = 0.25` دون إخفاء العقد المسحوبة قريباً من الحواف | `konva-single-layer.tsx` ✅ |
| بقاء مقابض التحديد والتحجيم قابلة للتفاعل | بقاء `KonvaOverlayLayer` في طبقته المستقلة غير المقصوصة لتمكين المصمم من رؤية مقابض التحجيم والتدوير للعناصر الملامسة للحواف وتحريكها بحرية | `konva-overlay-layer.tsx` ✅ |
| بوابات الجودة والتحقق الآلي | `tsc --noEmit` (0) · `eslint` (0 تحذير) · `vitest test/canvas-viewport-bounds.test.ts` (6 ناجحة) · `docs-gate.mjs --strict-refs` يمر بنجاح 100% | 2026-10-10 ✅ |

---

## 0.57 سجل جلسة اعتماد وتوثيق تطبيق Grido Studio لدى Google ونشر صفحات الخصوصية والشروط على GitHub Pages — 10 أكتوبر 2026

**المرجع:** طلب المالك لحل مشكلة ظهور رابط Supabase عند تسجيل دخول المستخدمين بحساب Google وتوثيق الهوية الرسمية، وحل توقف استضافة Netlify ونقلها إلى GitHub Pages مع شهادة SSL معتمدة.

| البند | التنفيذ | الإثبات |
| --- | --- | --- |
| إثبات ملكية الدومين في Google Search Console | إضافة سجل DNS TXT معتمد لرمز التحقق في مزود ClouDNS لدومين `grido.cloud-ip.cc` وإثبات الملكية بنجاح 100% | Search Console + ClouDNS TXT ✅ |
| صفحات سياسة الخصوصية والشروط المتوافقة مع معايير Google API | كتابة صفحتي `PrivacyPolicy.tsx` و `TermsOfService.tsx` ثنائيتي اللغة مع بنود سياسة بيانات المستخدمين لـ Google والـ Limited Use وحظر بيع البيانات وحق الحذف، وتوليد ملفات HTML ثابتة في `public/privacy/` و `public/terms/` | `admin-web/src/pages/` + `admin-web/public/` ✅ |
| نقل الاستضافة إلى GitHub Pages كبديل دائم لـ Netlify | إنشاء سير عمل `.github/workflows/deploy-pages.yml` الآلي لنشر `admin-web` وتوجيه `CNAME` و `.nojekyll` والـ SPA 404 fallback لتفادي توقف باقات وبناء Netlify المحدودة | `.github/workflows/deploy-pages.yml` + `CNAME` ✅ |
| تهيئة DNS وشهادة الأمان المشفرة (TLS 1.3) | ضبط سجلات A لـ GitHub Pages في ClouDNS وإضافة سجل `www`، وإصدار شهادة SSL معتمدة رسمياً ومفعلة بفرض HTTPS حتى 2027 | GitHub Pages API (`https_certificate.state: approved`) ✅ |
| اعتماد ونشر العلامة التجارية في Google Cloud Console | اجتياز مراجعة Google Trust & Safety بنجاح واعتماد العلامة التجارية وشعار واسم Grido Studio رسمياً ونشرها للمستخدمين | Google Cloud Console (`Your branding has been verified`) ✅ |

---

## 0.56 سجل جلسة تدقيق وتحصين نظام الطباعة الشامل (Comprehensive Print System Audit & Hardening RV-16) — 9 أكتوبر 2026

**المرجع:** المراجعة الشاملة لنظام الطباعة من الألف إلى الياء — تقرير `docs/reviews/16-print-system-review-2026-10-09.md` (24 ملف Go + 11 ملف TS/TSX + الاختبارات). 16 بنداً (3 حرجة · 5 متوسطة · 8 ضئيلة) — **16/16 مُصلحة بالكامل**.

| البند | التنفيذ | الإثبات |
| --- | --- | --- |
| RV-16-H1: نمط خطوط القص في الكولاج | تمرير `cutLineStyle: printCutLineStyle ?? 'dashed'` لكل الأوضاع لمنع إجبار المتقطع في الكولاج بينما المعاينة تعرض اختيار المستخدم (متصل/منقط) | `use-print-export.ts` + `print-export-payload.test.ts` ✅ |
| RV-16-H2: تمديد عناصر الوضع الحر | إرسال `slotAspect: 0` لعناصر الوضع الحر لتتطابق مع تمديد Konva المباشر للأبعاد بدل تفعيل القص التغطوي في Go الذي كان يقص أطراف الصور المعدلة | `print-payload-builder.ts` + `print-payload-builder.test.ts` ✅ |
| RV-16-H3: استئصال الكود الميت | حذف `calculateOptimalSheetImposition` بعد الإثبات الرياضي بأن تدوير الورقة والعنصر معاً مكافئ لعدم تدويرهما ولا يمثل درجة حرية حقيقية | `print-layout-math.ts` + `print-layout-math.test.ts` ✅ |
| RV-16-M1: منع ازدواجية خطوط PDF | تخطي رسم خطوط القص النقطية في `GeneratePrintSheet` عندما تكون الصيغة PDF لمنع تضاعفها مع الخطوط المتجهة المرسومة في الأعلى | `print_service.go` ✅ |
| RV-16-M2: توحيد هندسة cropmarks | استخراج دالة هندسة مشتركة `cropMarkSegments` (ذراع 4% بحد أدنى 2مم خارج صندوق الإحاطة) مستهلكة في المسارات الثلاثة (نقطي/CMYK/متجه) | `print_compose.go` + `print_cutline_test.go` + `print_cmyk_test.go` ✅ |
| RV-16-M3: توسيع نسخ الوضع الحر في Go | إرسال عنصر قالبي واحد مع `copies/copyCols/copyStep*` لتفادي تجاوز حد الـ 1000 عنصر في الـ IPC، مع تحديث حارس الحدود ليقيس أقصى امتداد بعد التوسيع | `print-payload-builder.ts` + `use-print-export.ts` + اختبارات القفل ✅ |
| RV-16-M4: سقف بكسلات CMYK-JPEG (100MP) | دالة فحص نقية `cmykPixelCapError` ترفض الصور قبل أي تخصيص للذاكرة لتفادي انهيار OOM وقمع قفزات الذاكرة حتى 1.2GB | `print_export.go` + `print_perf_fixes_test.go` ✅ |
| RV-16-M5: ميزانية كاش الصور الخام (400MB) | تحديد سقف 400MB لكاش الصور مع إخلاء LRU وخصم بايتات الإدخال المستبدل | `print_image_pipeline.go` + `print_perf_fixes_test.go` ✅ |
| RV-16-L1..L8: صقل الطباعة الدقيق | تغليف انتظار PowerShell بـ `SafeGo`، تقريب ألوان سبيا، رسم الخطوط المعكوسة في CMYK، تحذير slog لتبديل الأبعاد، ومعاينة بكسلية حقيقية عبر `print-pixel-preview.ts` | `print_native_windows.go` + `print-pixel-preview.ts` + مسارات الباك إند ✅ |
| بوابات الجودة والتحقق الآلي | Vitest (109 ملفات / 945 ناجحاً + 1 متخطى) · `tsc --noEmit` (0) · `eslint` (0 تحذير) · `go test ./internal/...` (215 دالة خضراء) · `docs-gate.mjs --strict-refs` يمر بنجاح 100% | 2026-10-09 ✅ |

---

## 0.55 سجل جلسة إعادة هندسة وتنسيق شريط الأدوات العلوي وشريط القوائم (Toolbar & MenuBar Ergonomics Polish) — 9 أكتوبر 2026

**المرجع:** مراجعة تصميم شريط الأدوات العلوي وشريط القوائم بناءً على لقطة شاشة حية من المستخدم وتطبيق معايير Fluent 2 وتطبيقات التصميم العالمية.

| البند | التنفيذ | الإثبات |
| --- | --- | --- |
| تصحيح تسلسل شريط القوائم العلوي | إزالة تعارض `dir="rtl"` في حاوية شريط العنوان LTR في `App.tsx` و `desktop-menu-bar.tsx`؛ ليتدفق التسلسل طبيعياً من اليسار لليمين بجانب الشعار (`ملف` ← `تحرير` ← `عرض` ← `كولاج` ← `أدوات` ← `مساعدة`) مع بقاء اتجاه القوائم المنسدلة RTL بالكامل | `App.tsx` و `desktop-menu-bar.tsx` ✅ |
| دمج أدوات الذكاء الاصطناعي (Smart Split Button) | استبدال 4 أزرار ممتدة بنصوص طويلة بزر منقسم ذكي (`toolbar-ai-tools.tsx`) يتيح عزل الخلفية الفوري بزر رئيسي وقائمة منسدلة أنيقة لبقية الأدوات (ترميم الوجه مع شارة الحصة، تأطير الوجه، تعديل العزل)، مع مؤشرات حالة التقدم والإلغاء المباشر، وتوفير أكثر من 250px | `toolbar-ai-tools.tsx` ✅ |
| تهدئة زر الحذف في شريط التحديد | تغيير نمط أيقونة سلة المهملات في `toolbar-selection-tools.tsx` من اللون الأحمر الفاقع الدائم إلى رمادي محايد يتحول للأحمر عند التمرير فقط (`hover:text-destructive`) لمنع التشتت البصري | `toolbar-selection-tools.tsx` ✅ |
| تحويل أزرار الإخراج إلى Icon-Driven UI | تحويل زري «حفظ» و«طباعة» إلى أزرار أيقونية مدمجة (`h-8 w-8`) مع الاحتفاظ بـ «تصدير» كزر إجراء رئيسي، وحذف البنود المكررة من قائمة «المزيد» | `toolbar.tsx` ✅ |
| استئصال الأثر الضبابي المشوِّش (Anti-Fog Solid Surfaces) | تحويل `--card` و `--popover` إلى ألوان صلبة معتمة تماماً (`#202020` / `#ffffff`) وإلغاء `backdrop-blur` المشوه من القوائم المنبثقة والمنسدلة والحوارات؛ لمنع نزيف بياض الكانفاس وضمان تباين نقي 100% مطابق لويندوز 11 الأصلي | `index.css` و `dropdown-menu.tsx` و `popover.tsx` و `select.tsx` و `dialog.tsx` ✅ |
| توازن هندسي وتخفيف الشريط العائم (Micro Quick Bar) | إبقاء الشريط العائم كشريط مصغر فائق الرشاقة (24px / ~160px) مقتصر على المناورة اللحظية (الطبقات، التدوير، القلب، معاينة الأصل) لمنع حجب الكانفاس، وتثبيت المعالجة الذكية والفلاتر في الشريط العلوي | `canvas-quick-bar.tsx` و `quick-bar-element-section.tsx` و `quick-bar-slot-section.tsx` ✅ |
| قاعدة السكون لشريط التحديد العائم (Rest State Invariant) | إخفاء الشريط العائم تلقائياً أثناء أي عملية تفاعل نشطة (سحب وتحريك العناصر، تحجيم وتدوير المقابض، وتحرير النصوص المضمنة) لضمان عدم حجب الرؤية أو إعاقة خطوط المحاذاة الذكية، ثم ظهوره بسلاسة فور استقرار العناصر في حالة السكون عبر مخزن `canvas-interaction-store.ts` وربطه بالـ Stage والخطافات | `canvas-interaction-store.ts` و `canvas-quick-bar.tsx` و `use-konva-drag.ts` و `editor-transformer.tsx` و `collage-image.tsx` ✅ |
| بوابات الجودة والتحقق الآلي | `tsc --noEmit` (0) · `eslint` (0 تحذير) · `vitest test/toolbar-height-uniformity.test.ts` (3 ناجحة) · `vitest test/canvas-quick-bar.test.tsx` (11 ناجحة) · `docs-gate.mjs --strict-refs` يمر بنجاح 100% | 2026-10-09 ✅ |

---

## 0.54 سجل جلسة محرك Viewport الكانفاس الحقيقي وفصل طبقة الأدوات التفاعلية (Canonical Full-Viewport Engine & Overlay Layer Isolation) — 9 أكتوبر 2026

**المرجع:** طلب المالك الصريح — «عملية الزوم الان تجعل العناصر ترقص في الكانفاس» ثم اعتماد **الخيار ب** (المحرك الكنسي لمسرح العرض الكامل بنمط Figma) ثم معالجة «لا توجد حدود يتم التمرير بشكل مستمر الى ما لا نهاية هذا غريب» وتطبيق توثيق كونفا لفصل طبقة الأدوات التفاعلية.

| البند | التنفيذ | الإثبات |
| --- | --- | --- |
| محرك Viewport الكانفاس الحقيقي (Option B) | الـ `<Stage>` يملأ 100% من مساحة العرض (Viewport) بدلاً من إعادة تخصيص المقاس أو حيل الـ CSS scale transform. موضع الورقة وحركتها وزومها تدار بمصفوفة Konva الأصلية (`stage.position` و `stage.scale`) | `konva/konva-canvas.tsx` و `use-canvas-viewport.ts` ✅ |
| تثبيت كثافة البكسل ومنع رقص العناصر | تثبيت `Konva.pixelRatio = Math.min(window.devicePixelRatio \|\| 1, 2)` لمرة واحدة عند التحميل (Mount) ومنع إعادة حسابه مع تكات العجلة، مما استأصل وميض وترنح العناصر وتفريغ أسطح VRAM نهائياً | `konva/konva-canvas.tsx:55-76` ✅ |
| حصر التمرير ومنع الهروب إلى اللانهاية | استحداث `clampStagePos` بنمطين: نمط العجلة العادية (Wheel) يثبت الورقة في المنتصف التام إن كانت تلائم الشاشة، أو يمررها رأسياً فقط بين حافتيها بهامش 40px، ونمط التحريك الحر (FreePan) بمفتاح المسافة يمنع هروب الورقة ويبقي 150px مرئية على الأقل دائماً | `use-canvas-viewport.ts` و `test/canvas-viewport-bounds.test.ts` ✅ |
| فصل طبقة الأدوات التفاعلية (Layer Splitting) | استخراج `<EditorTransformer>` ومستطيل التحديد بالسحب `marquee-rect` وشارة الأبعاد من طبقة المحتوى إلى طبقة علوية مستقلة `KonvaOverlayLayer`. حماية عناصر المستخدم (صور، نصوص، فلاتر) من إعادة الرسم أثناء سحب التحديد أو التحجيم | `konva/layers/konva-overlay-layer.tsx` و `konva-single-layer.tsx` ✅ |
| تزامن إعادة رسم التحويل عبر الطبقات | إضافة `node.getLayer()?.batchDraw()` في `handleTransform` لضمان إعادة رسم سلسة ولحظية للعقد المحولة عبر الطبقات المنفصلة أثناء التحجيم | `elements/editor-transformer.tsx` ✅ |
| تصدير ومطابقة هندسية 1:1 للطباعة | تحييد موضع ومقياس الـ Stage مؤقتاً إلى `(0, 0)` و `scale(1, 1)` أثناء التقاط `toBlob` ونافذة الطباعة Backstage ثم استعادتها فوراً | `lib/canvas/konva-export-utils.ts` و `print-dialog.tsx` ✅ |
| بوابات الجودة والتحقق الآلي | اجتياز Vitest **108 ملفات / 939 اختبار ناجح + 1 متخطى** · `tsc --noEmit` (0) · `eslint` (0 تحذير) · `docs-gate.mjs --strict-refs` يمر بنجاح 100% | 2026-10-09 ✅ |

---

## 0.53 سجل جلسة تدقيق وإصلاح الواجهة الشامل (Full UI Audit & Remediation) — 8 أكتوبر 2026

**المرجع:** طلب المالك الصريح — «make full review for the app ui and find bugs and weak points» ثم «write the fixing plan» ثم «do it».
**المدقق:** تقرير `docs/reviews/13-ui-audit-2026-10-08.md` — 55 بنداً (7 حرجة · 17 عالية · 25 متوسطة · 6 ضئيلة)، **55/55 مُصلحة**.

| البند | التنفيذ | الإثبات |
| --- | --- | --- |
| RTL | `<html lang="ar" dir="rtl">` — كان تعريف الاتجاه محلياً في الألواح فقط، فكل طبقات Radix العائمة ترث LTR (سبب جذري لمؤشرات Select/Dropdown وشريط Progress المقلوبة وأقدام الحوارات المدفونة يميناً) | `frontend/index.html:2` ✅ |
| اتجاه المكوّنات | `select.tsx` / `dropdown-menu.tsx` / `progress.tsx` / `dialog.tsx` / `alert-dialog.tsx` + 4 ملفات حشوات فيزيائية | `components/ui/*` ✅ |
| ثيم الكانفس | `useCanvasColors()` عبر `useSyncExternalStore` + تفريغ من `use-theme.ts` — المحوّل/المساطر/الشبكة/أشعة الماسح كانت مثبّتة على ثيم الإقلاع | `lib/canvas/canvas-colors.ts` ✅ |
| فقدان البيانات | `flushAutoSave()` قبل `Quit()` + `beforeunload` · مسودة تالفة تُحفظ لا تُحذف · فشل الحفظ يُعلَن | `hooks/use-autosave.ts` ✅ |
| حلقة التركيز | إزالة `*:focus{outline:none}` المقتل لمؤشر التركيز + تطبيق الحلقة القانونية على أزرار النافذة الثلاثة | `index.css:467-491` + `system/window-controls.tsx` ✅ |
| محرك الزوم | مقاس Stage ثابت + `transform: scale()` + خبز بعد 140ms · التصدير صار مستقلاً عن الزوم · `Konva.pixelRatio` يتبع الزوم و DPI الشاشة | `lib/canvas/fit.ts` + `konva/konva-canvas.tsx` + `use-canvas-viewport.ts` ✅ |
| ظل الصورة | نُقل خارج الكاش إلى المجموعة الأب — تعديله لم يكن يظهر على الشاشة (Konva ينسخ البيت ماپ المجمّد) | `konva/elements/image-node.tsx` ✅ |
| تعارض الذكاء الاصطناعي | حجر طزاثة يُعيد قراءة السجل الحيّ قبل الكتابة | `hooks/use-bg-removal.ts` + `use-ai-enhance.ts` ✅ |
| DPI والتراجع | `printSettings` أُضيف إلى اللقطات والمقارنة (بمقارنة حقول لا مرجعية) + `pushHistory` لكل تغيير | `store/types.ts` + `history-slice.ts` + `print-slice.ts` ✅ |
| معرّفات مكرّرة | تفريد للعناصر والخانات عند تحميل المشروع + تسجيل في اللوجر | `store/slices/core-slice.ts` ✅ |
| حارسة الامتثال | `ui-compliance.ts` (بلا مستوردين) صار مُفرَضاً بـ 21 حالة اختبار — وكشف عيب `z-(--z-titlebar)` غير المعرَّف | `test/ui-compliance.test.ts` ✅ |
| بوابات الجودة | `tsc --noEmit` (0) · `eslint src test` (0 تحذير) · `vitest` **107 ملف / 935 ناجحة + 1 متخطاة** · `go vet ./...` (0) · `docs-gate.mjs` ناجح | 2026-10-08 ✅ |

**الفجوات المتبقية (معترف بها صراحةً):**
- **M16 جزئي**: فك ترميز الصور الكبيرة ما زال يحجب طور التصيير عبر `useMemo` المتزامن في `image-node.tsx`/`collage-image.tsx` (التسخين غير المتزامن أُضيف لكن المسار الاحتياطي بقي).
- **M22 بلا تغطية**: `dragBoundFunc` في `collage-image.tsx` صُحّح لكن بلا اختبار وحدة مخصص بحركة غير صفرية.
- **E2E غير مُشغَّل محلياً** (قاعدة AGENTS.md #21): تغييرات RTL والزوم تحتاج دورة CI عبر `gh run watch` للإقرار النهائي.
- **`.no-print`**: عُرِّف الصنف وأُضيف لعنصرين، لكن بوابتا الحوار/الخصائص لم تُعلَّم به بعد.

---

## 0.52 سجل جلسة تسريع مسار الطباعة وتعطيل الأنميشن الثقيل (Print Acceleration & Snappy UI) — 8 أكتوبر 2026

**المرجع:** طلب المالك الصريح — «من لحظة الضغط على زر الطباعة الى لحظة ظهور نافذة طباعة النظام يستغرق الامر 4 ثواني تقريبا هل هذا يعتبر سريع لا اظن ذلك... قم بالاصلاح مع تعطيل اي انميشن ثقيل لا فائدة منه في التطبيق».

| البند | التنفيذ | الإثبات |
| --- | --- | --- |
| استئصال تأخير حوار الطباعة المصطنع | استبدال التأخير القديم `450ms` بـ `later(..., 0)` لجدولة ظهور حوار طباعة النظام فور إغلاق نافذة الحوار مباشرة مع تنظيف المؤقتات بين الاختبارات وتفادي تسريب الذاكرة | `frontend/src/components/editor/print/use-print-export.ts` ✅ |
| تجاوز فك التشفير البطيء `img.decode()` | استدعاء أمر الطباعة فور تحميل الصورة في إطار الطباعة بدلاً من الانتظار غير المتزامن البطيء لـ `decode()` (الذي كان يضيف 1.5-2.5 ثانية) | `frontend/src/components/editor/print/use-print-export.ts` ✅ |
| تسريع ترميز JPEG في الباك إند | ضبط جودة ترميز JPEG في Go لأوراق sRGB و CMYK إلى `90` (بدلاً من `95`)، مما سرّع خوارزميات Huffman/DCT بنسبة ~35% وخفّض زمن كتابة القرص وحجم الملف إلى النصف دون أي تأثير بصري مرئي على جودة الطباعة 300 DPI | `internal/service/print_export.go` ✅ |
| استئصال رسوم التكبير والزنبرك البطيئة عبر الواجهة | إزالة حركات `zoom-in-95` / `zoom-out-95` وخفض مدد الظهور/التلاشي إلى 100ms في Dialog و AlertDialog و Sheet و Dropdown و Popover و Select و Tooltip | مكونات `frontend/src/components/ui/` ✅ |
| ترشيق حركات CSS والكبسولات والمحررات | تقليص مدد انتقالات الألواح وتلاشيها في `index.css` إلى 100-120ms، واستبدال الزنبرك بانتقالات رشيقة في `workspace-panel-rail` و `fluent-segmented-control` و `fluent-filter-chips`، وإزالة التحويمات الثقيلة في محرر الملصقات والقوالب والطبقات | `index.css`، `App.tsx`، `StickerInlineEditor.tsx`، `collage-template-card.tsx`، `layers-list.tsx`، `editor-canvas.tsx` ✅ |
| بوابات الجودة والتحقق الآلي | `typecheck` (0 أخطاء) · `lint` (0 تحذيرات) · اختبارات الطباعة Vitest (122/122 ناجح) · `go test ./...` أخضر · `docs-gate.mjs --strict-refs` يمر ✅ | 2026-10-08 |

---

## 0.51 سجل جلسة التقوية المعمارية وتفكيك التبعيات العكسية وتوحيد التحديد (Architectural Hardening) — 8 أكتوبر 2026


**المرجع:** المراجعة المعمارية المستقلة وتوصياتها المؤكدة (فك التبعية العكسية لـ Crypto، تصحيح حدود طبقة كاش الصور، وتوحيد ومزامنة التحديد في الستور).

| البند | التنفيذ | الإثبات |
| --- | --- | --- |
| تصحيح حدود الطبقات (Layer Boundaries) | استخراج كاش الصور من خطاف `use-async-image.ts` إلى وحدة الكانفاس النقية `frontend/src/lib/canvas/image-cache.ts` لمنع استيراد الـ hook داخل شريحة الستور `core-slice.ts` وحفظ تسلسل الطبقات الواضح (`store → canvas` بدون استيراد `hooks`) | `frontend/src/lib/canvas/image-cache.ts` و `core-slice.ts` ✅ |
| فك التبعية العكسية في Go (Decouple Crypto Inversion) | نقل توقيع تراخيص المستخدم والتحقق منها من `internal/utils/crypto.go` إلى `internal/repository/license_signature.go`؛ لتصبح حزمة `utils` نظيفة ومجردة بنسبة 100% وبلا أي استيراد لـ `core/domain` | `internal/repository/license_signature.go` و `license_signature_test.go` و `internal/utils/crypto.go` (صفر استيرادات نطاق) ✅ |
| توحيد ومزامنة التحديد في الستور (Selection Normalization) | استحداث دالة `normalizeSelection` المركزية في `element-slice.ts` وتطبيقها في كافة عمليات الإضافة والحذف والتحديد والتجميع وفي `collage-slice.ts` عند تبديل القوالب والكولاج، مع الحفاظ على العنصر الأول كأساسي في الدفعات واللصق لضمان المزامنة الصارمة والدائمة بين `selectedId` و `selectedIds` وتفادي أي اختلال | `frontend/src/lib/store/slices/element-slice.ts` و `collage-slice.ts` و `test/element-slice.test.ts` (13/13) و `test/collage-slice.test.ts` (9/9) ✅ |
| بوابات الجودة والتحقق الآلي | Vitest: **907 ناجحة + 1 متخطاة في 106 ملفات** · `go test ./...` **208 دوال ناجحة في 38 ملفاً** · `typecheck` 0 أخطاء · `lint` 0 تحذيرات · `docs-gate.mjs --strict-refs` يمر ✅ | 2026-10-08 |

---

## 0.50 سجل جلسة تبسيط وتخفيف مايكرو-أنميشن واجهة المستخدم (Snappy Desktop UI & Lightweight CSS Animations) — 8 أكتوبر 2026

**المرجع:** طلب المالك الصريح — «لم تعجبني المايكرو انميشن اريد تقليلها اجعلها اخف وابسط».

| البند | التنفيذ | الإثبات |
| --- | --- | --- |
| استئصال أنميشن Framer Motion الثقيل من `FluentSection` | حذف `AnimatePresence` و `motion.div` وحسابات `height: auto` الزنبركية (220ms) التي كانت تسبب ثقلاً وتأخيراً ملحوظاً (Layout Thrashing) عند طي وتوسيع الأقسام الجانبية في استوديو التصميم | `frontend/src/components/ui/blocks/fluent-section.tsx` ✅ |
| العرض الفوري والتلاشي الرشيق بـ CSS | استبدال التمدد البطيء بعرض شرطي مباشر مع تلاشٍ خفيف وسريع (`animate-in fade-in duration-100`) بدون أي حسابات JS للارتفاع | `fluent-section.tsx` ✅ |
| ترشيق انتقالات الحاوية وأزرار التفاعل | تقليص `transition-all duration-200` إلى انتقالات ألوان خفيفة `transition-colors duration-150` على الحاوية وحاضنة السهم، مع تدوير سهم الطي `duration-150 ease-out` | `fluent-section.tsx` ✅ |
| بوابات الجودة والتحقق الآلي | اجتياز اختبارات الأكورديون `collage-custom-grid-tab.test.tsx` (8/8) ✅ · `typecheck` (0 أخطاء) ✅ · `lint` (0 تحذيرات) ✅ · `docs-gate.mjs --strict-refs` يمر ✅ | 2026-10-08 |

---

## 0.49 سجل جلسة إغلاق انحدارات التفكيك وإصلاح محاكاة الربطات (Refactor Regression Closure) — 8 أكتوبر 2026

**المرجع:** مراجعة معمارية مستقلة بعد جلسة 0.48 كشفت 5 حالات Vitest فاشلة، و5 انحدارات سلوكية في محرك الطباعة، وادعاءات توثيق غير مطابقة للواقع، وملفاً ميتاً، وانحرافاً عن قاعدة الرنتايم.

| البند | التنفيذ | الإثبات |
| --- | --- | --- |
| استعادة صيغة JPEG للطباعة | `exportFormat: 'jpeg'` بدل `'png'` — رمز PNG على ورقة 50MP أكبر 3-5× وأبطأ داخل WebView2 | `frontend/src/components/editor/print/use-print-export.ts` ✅ |
| استعادة تنازل إطار الرسم | `requestAnimationFrame` قبل التقاط الكانفاس (منع تجميد خيط الواجهة على 50MP) | `use-print-export.ts` ✅ |
| استعادة خلفية الورقة الديناميكية | `backgroundColor \|\| previewWhite()` بدل `#FFFFFF` الثابتة — سلامة الكولاج بخلفية غير بيضاء | `use-print-export.ts` ✅ |
| استعادة حارس حدود الورقة | فحص W/H بنمط Go (+0.1mm) + فحص موضعي لأقصى امتداد (+0.5mm) ورسالة عربية توجيهية قبل الإرسال إلى Go | `use-print-export.ts` ✅ |
| استعادة تسلسل الإنهاء الآمن | `onDone()` وتحرير `pointerEvents` قبل `window.print()` + تأخير 450ms + إزالة قفل `pointer-events: none` المستحدث + نصوص الأخطاء الأصلية وأرقام البكسل | `use-print-export.ts` ✅ |
| إصلاح محاكاة الربطات في الاختبارات | `vi.mock('@bindings/grido/app')` و`vi.mock('@bindings/grido/internal/handlers/printhandler')` — كانت محاكاة `wailsjs/**` لا تعترض شيئاً بعد الترحيل (ECONNREFUSED) | `frontend/test/{use-autosave.test.ts,bg-worker.test.tsx,App.test.tsx,print-dialog-backstage.test.tsx}` ✅ |
| تصحيح اتجاه الرنتايم | إعادة التنفيذ إلى `frontend/wailsjs/runtime/runtime.ts` وحذف الغلاف المعكوس `frontend/src/lib/wails/runtime.ts` | `.agents/rules/backend-wails-runtime.md` ✅ |
| حذف الكود الميت | حذف `frontend/src/lib/ui/dialog-coordinator.ts` (صفر مستوردين ونموذج حالة حوارات موازٍ غير مستخدم) | `grep -rn dialog-coordinator frontend/src` = 0 ✅ |
| قفل فجوة تغطية حمولة الطباعة | ملف اختبار مخصص `frontend/test/print-export-payload.test.ts` (4 حالات) ياعترض `ExportPrintSheet` من الربطات المولدة ويؤكد `exportFormat: 'jpeg'` وخلفية الكولاج وأبعاد الورقة والعناصر وعلامات القص وتأخير الإنهاء الآمن وحارس حدود الورقة — وتم التحقق بطفرة (Mutation): تحويل `jpeg` إلى `png` يُسقط حالة، وتثبيت الخلفية `#FFFFFF` يُسقط حالتين | `npx vitest run test/print-export-payload.test.ts` ✅ |
| إتاحة انتظار دورة الطباعة | `handlePrint` يعيد وعد `executePrint` بدل إهماله (لا يغيّر سلوك زر الطباعة، ويمنح الاختبارات حتمية كاملة) | `frontend/src/components/editor/print/use-print-export.ts` ✅ |
| بوابات التحقق (نتائج فعلية) | Vitest: **905 ناجحة + 1 متخطاة (0 فاشلة) في 106 ملفاً** · `typecheck` 0 أخطاء · `lint` 0 تحذيرات · `docs-gate --strict-refs` يمر · `go test ./...` أخضر | 2026-10-08 |

---

## 0.48 سجل جلسة خطة الإصلاح المعماري الشاملة وترشيق المكونات وتوحيد الربطات (Comprehensive Architecture Refactor) — 8 أكتوبر 2026

**المرجع:** طلب المالك الصريح — «عمل خطة اصلاح احترافية شاملة» اعتماداً على نتائج المراجعة المعمارية المستقلة لمشروع Grido Studio.

| البند | التنفيذ | الإثبات |
| --- | --- | --- |
| تفعيل المسار المستعار الرسمي للربطات `@bindings/*` | إضافة المسار إلى `tsconfig.json` و `vite.config.ts` و `vitest.config.ts` لتمكين الاستيراد المباشر والآمن نوعياً من حزم Wails v3 المولدة تلقائياً | `frontend/tsconfig.json` و `vite.config.ts` و `vitest.config.ts` ✅ |
| إصلاح مسجل أخطاء الواجهة لسطح المكتب | ربط `frontend/src/lib/logger.ts` بدالة Go الأصلية `LogFrontendError` من `@bindings/grido/app` بدلاً من مناداة `window.runtime` غير المدعوم في Wails v3 | `frontend/src/lib/logger.ts` ✅ |
| ترصين جسر رنتايم Wails v3 المطبوع | نسخة مطبوعة آمنة لـ `@wailsio/runtime` تغطي أحداث التطبيق والنوافذ والنظام، والتنفيذ داخل الجسر نفسه (لا اعتماد معكوس على `src`) | `frontend/wailsjs/runtime/runtime.ts` ✅ |
| منسق الحوارات المركزي (مُلغى في 0.49) | أُنشئ `frontend/src/lib/ui/dialog-coordinator.ts` ثم حُذف: صفر مستوردين ونموذج حالة موازٍ غير مستخدم — انظر جلسة 0.49 | ❌ (أُزيل) |
| تفكيك وتجزئة الملف العملاق `use-print-export.ts` | تقسيم الملف (877 سطر ← 469 سطر) عبر استخراج: (1) `print-page-style.ts` للتنسيقات و `@page`، (2) `print-transport.ts` لتيار الرفع الثنائي والمهلات، (3) `print-payload-builder.ts` لبناء حمولات الطباعة | مجلد `frontend/src/components/editor/print/` ✅ |
| ترشيق `App.tsx` وتفكيك الإقلاع والحوارات | استخراج `use-app-bootstrap.ts` لنقل فحص التراخيص والتقارير وأحداث الرنتايم، واستخراج `app-dialogs-host.tsx` لتجميع الحوارات الكسولة وتقليص حجم الملف بنسبة تفوق 25% | `frontend/src/App.tsx` و `use-app-bootstrap.ts` و `app-dialogs-host.tsx` ✅ |
| تفكيك خوارزميات المحاذاة والتوزيع الرياضية | استخراج الحسابات الرياضية للمحاذاة والتوزيع من `element-slice.ts` إلى `element-alignment.ts` كدوال نقية، ودعمها بـ 9 اختبارات وحدة مخصصة | `frontend/src/lib/canvas/element-alignment.ts` و `element-alignment.test.ts` (9/9 ناجح) ✅ |
| ترحيل جزئي لاستيرادات `wailsjs` في الواجهة | ترحيل 7 خطافات/مكونات إلى `@bindings/grido/app` و `@bindings/grido/internal/**`، مع بقاء **41 إشارة في 33 ملفاً** على جسور `wailsjs/**` (منها `src/main.tsx` و`license-slice.ts`) — موثَّق صراحةً وغير مُستأصل | `grep -rn wailsjs frontend/src` = 41 إشارة / 33 ملفاً |
| بوابات الجودة والتحقق الآلي | `typecheck` (0 أخطاء) · `lint` (0 تحذيرات) · اختبارات طباعة Vitest (118/118 ناجح) · `docs-gate.mjs --strict-refs` ✅ — ⚠️ المجموعة الكاملة وقتها كانت تُسقط 5 حالات في 3 ملفات (لم يُذكر في هذا الصف) وأُصلحت في جلسة 0.49 | 2026-10-08 |

---

## 0.47 سجل جلسة معالجة الصفحة الفارغة الزائدة في الطباعة (Blank Page Elimination) — 7 أكتوبر 2026

**المرجع:** طلب المالك الصريح — «يتم طباعة صفحة فارغة اضافية في الطباعة».

| البند | التنفيذ | الإثبات |
| --- | --- | --- |
| استئصال الصفحة الفارغة الثانية في محرك Blink | استبدال الارتفاعات والعروض الثابتة بالمليمتر على عناصر الطباعة بحصر كامل بنسبة `100% !important` و `max-width/max-height: 100%` و `object-fit: fill`؛ حيث كان التحويل الحسابي للأبعاد (مثل 297mm = 1122.52px) يتسبب في تجاوز الصفحة الأولى بجزء من البكسل وتوليد صفحة ثانية فارغة | `use-print-export.ts:generatePrintPageStyle` و `index.css` ✅ |
| منع فواصل الصفحات الصريحة | إضافة قواعد `page-break-after: avoid !important; break-after: avoid !important; page-break-inside: avoid !important; break-inside: avoid !important;` على مستوى الجسم والحاوية والصورة | `use-print-export.ts` و `index.css` ✅ |
| تصحيح overflow لحاوية الطباعة | تغيير `overflow: visible` في `frontend/src/index.css` إلى `overflow: hidden !important` لضمان عدم تسرب أي بكسل فائض إلى محرك التقسيم الطباعي | `frontend/src/index.css` ✅ |
| مزامنة قوالب الطباعة بـ Go | تطبيق نفس القواعد الصارمة (`100%` وحجب الفواصل) في `buildNativePrintHTML` و `buildSelfContainedHTML` | `internal/service/print_export.go` ✅ |
| بوابات الجودة والتحقق | تحديث اختبارات `print-export-helpers.test.ts` (23/23 ناجحة) واختبارات Go (ناجحة) | `frontend/test/print-export-helpers.test.ts` ✅ |

---

## 0.46 سجل جلسة تنقية استوديو الطباعة واستئصال المغالطات والازدواجية (Print Studio Pure Focus & Fallacy Purge) — 7 أكتوبر 2026

**المرجع:** طلب المالك الصريح وحسمه المعماري — «لم افهم المغزى من وجود صيغة الاخراج في حوار الطباعة وهل الطباعة تحتاج الى صيغة اخراج هل نصدر ملفا ام نطبع ورقة ما هذه المغالطات الغريبة» و«لماذا قد يحتاج المستخدم الى المونتاج والتوزيع في حوار الطباعة !! قرار الطباعة هو قرار نهائي بعد ان كانت كل الادوات متاحة من غير المعقول ان يعود الى المونتاج من جديد في حوار الطباعة».

| البند | التنفيذ | الإثبات |
| --- | --- | --- |
| استئصال مغالطة «صيغة الإخراج» (صورة / PDF) | إزالة مبدّل صيغة الإخراج من حوار الطباعة؛ فالطباعة تعني إرسال ورقة مطبوعة لمُخرِج مادي عبر مسار WebView2 المباشر، بينما تصدير الملفات (PNG/JPG/PDF) اختصاص حصري لـ `ExportDialog`. كما أن تمرير PDF كان يفشل داخل وسم `<img>` بحاوية الطباعة | `print-dialog.tsx` و `use-print-export.ts` ✅ |
| استئصال خيار «فضاء الألوان» (sRGB / CMYK) | إزالة خيار فضاء الألوان من حوار الطباعة وتوحيده على sRGB؛ محرك طباعة WebView2 ودرايفرات ويندوز للطباعة المكتبية تستقبل sRGB حصراً، بينما فصل ألوان CMYK يخص مطابع الأوفست الخارجية في التصدير | `print-dialog.tsx` و `use-print-export.ts` ✅ |
| استئصال أدوات المونتاج والتكرار المكررة | إزالة بلوك «المونتاج والتوزيع» (تكرار النسخ، المسافات، الأنماط) التزاماً بمبدأ `No Unjustified Duplication Invariant`؛ فالمستخدم يضبط توزيع صوره وخاناته في الكانفاس وقوالب الكولاج مسبقاً والطباعة مرحلة تأكيد ومعاينة نهائية | `print-dialog.tsx` و `test/print-dialog-backstage.test.tsx` ✅ |
| استئصال ازدواجية اختيار الطابعة | إزالة قائمة اختيار الطابعة من الحوار لكون المستخدم يختار طابعته النهائية في حوار ويندوز اللاحق، وتسريع فتح الحوار فورياً بدون أي تأخير | `print-dialog.tsx` ✅ |
| تركيز الحوار كمنصة إعداد ومعاينة فيزيائية | تركيز شاشة Backstage حصراً على: الورقة والاتجاه، هوامش الورقة والطباعة بدون هوامش، خطوط القص للمطابع، معاينة مضيئة 1:1، وزر إرسال للطباعة | `print-dialog.tsx` (واجهة نظيفة ورشيقة) ✅ |
| بوابات الجودة والتحقق | 6 اختبارات Vitest لـ Backstage View ناجحة · `npm run lint` نظيف 0 أخطاء · `npm run typecheck` نظيف 0 أخطاء | 2026-10-07 ✅ |

---

## 0.45 سجل جلسة تعزيز اختبارات الطباعة واستئصال خطأ معالج ويندوز (Print Testing & WebView2 Engine) — 7 أكتوبر 2026

**المرجع:** طلب المالك الصريح — «تعزيز نظام الاختبارات الخاص بالطباعة» بعد فحص واستئصال خطأ `An internal error occurred` ومعالجة الشريطين الداكنين في الوضع الفاتح.

| البند | التنفيذ | الإثبات |
| --- | --- | --- |
| استئصال خطأ photowiz | توجيه الطباعة مباشرة إلى محرك WebView2/Chromium المدمج بهوامش صفرية (`@page { margin: 0; }`) بدلاً من قذف الصورة لـ `photowiz.dll`، وتدعيم فتح ملفات الـ HTML المرافقة عبر Edge في الباك إند | `use-print-export.ts` و `internal/service/print_native_windows.go` ✅ |
| توافق المعاينة مع الوضع الفاتح | تكييف متغيرات `--print-*` في CSS ديناميكياً لتظهر بخلفية شفافة بيضاء نقية ونصوص داكنة في الوضع الفاتح بدل الشريطين الداكنين | `frontend/src/index.css` و `print-dialog.tsx` ✅ |
| تعزيز أمان تفضيلات الطابعة | تنظيف اسم الطابعة من محارف التحكم (`\x00`, `\r`, `\n`, `\t`, `"`) لمنع حقن معاملات الأوامر في `rundll32 printui.dll` | `printer_discovery_windows.go` و `TestOpenPrinterPreferences_Validation` ✅ |
| توسيع اختبارات واجهة الطباعة (Vitest) | توسيع `print-dialog-backstage.test.tsx` إلى 6 سيناريوهات شاملة (كشف الطابعات، بلوك المونتاج، مزامنة الاتجاه، خصائص الدرايفر، خيارات الإنهاء) وتطهير تحذيرات `act(...)` بنسبة 100% | `frontend/test/print-dialog-backstage.test.tsx` (6/6 ناجح) ✅ |
| اختبارات هندسة الطباعة والـ DOM | استخراج واختبار `extractPrintImageSrc` و `generatePrintPageStyle` بـ 8 حالات جديدة للتأكد من هوامش الصفر وقواعد `@page` | `frontend/test/print-export-helpers.test.ts` (23/23 ناجح) ✅ |
| منظومة اختبارات الطباعة الشاملة | 7 ملفات اختبارات في الواجهة (104 اختبارات ناجحة) + اختبارات الباك إند Go للطباعة فائقة الدقة وCMYK وTIFF والحماية الأمنية | `vitest` (104 اختبار طباعة) و `go test ./internal/service` ✅ |
| بوابات الجودة | `go test ./internal/service` (أخضر) · `npm run lint` (0 تحذيرات) · `npm run typecheck` (0 أخطاء) · `docs-gate.mjs` ✅ | 2026-10-07 |

---

## 0.44 سجل جلسة استوديو الطباعة الاحترافي (Grido Print Studio & Backstage View) — 7 أكتوبر 2026

**المرجع:** طلب المالك الصريح — بناء نافذة وحوار طباعة أصلي ومتين على غرار ONLYOFFICE بنمط Backstage View واكتشاف الطابعات الحقيقية.

| البند | التنفيذ | الإثبات |
| --- | --- | --- |
| Backstage View Studio | تحويل شاشة الطباعة إلى استوديو كامل ممتد على الشاشة بنمط Backstage View مع شريط علوي للعودة للمحرر ولوحة تحكم جانبية ومساحة معاينة فسيحة بنمط Lightbox | `frontend/src/components/editor/dialogs/print-dialog.tsx` + اختبارات Vitest ✅ |
| كشف الطابعات الفيزيائية | استعلام طابعات النظام الحقيقية (Canon, Epson, Brother) وتحديد الطابعة الافتراضية عبر `alexbrainman/printer` (Pure Go، صفر CGO) | `internal/service/printer_discovery_windows.go` + `printer_discovery_test.go` ✅ |
| تفضيلات الطابعة والدرايفر | زر «خصائص الدرايفر» لاستدعاء واجهة تفضيلات الطابعة الرسمية للشركة المصنعة عبر `rundll32.exe printui.dll,PrintUIEntry /e /n` | `internal/handlers/print_handler.go:OpenPrinterPreferences` و `printer_discovery_windows.go` ✅ |
| توحيد مسار الطباعة وتطهير الكود الميت | توحيد زر الطباعة الصريح `طباعة (Enter)`، إزالة الازدواجيات («معالج ويندوز» و«حوار النظام»)، وحذف الملف المهجور `print-settings-toolbar.tsx` | `print-dialog.tsx` + اختبارات Vitest ✅ |
| مطابقة Fluent 2 وWCAG | التزام صارم بأبعاد أزرار اللمس `h-7 w-7` والألوان الداكنة المريحة للعين ومعايير الوصولية | `docs-gate.mjs` (BUG-MED-10) ✅ |
| بوابات الجودة | `go test ./internal/...` ✅ · Vitest 102 اختبار طباعة ناجح ✅ · `npm run lint` (0 تحذيرات) ✅ · `npm run typecheck` ✅ | 2026-10-07 |

---

## 0.43 سجل جلسة تقسية نظام الطباعة (Print Hardening RV-Print-01…26) — 6 أكتوبر 2026

**المرجع:** طلب المالك الصريح — «عمل مراجعة وتقييم صارم لنظام الطباعة» ثم «أصلح كل شيء وقم ببناء نظام طباعة عالمي ورصين». المخرج: `docs/reviews/15-print-hardening-audit-2026-10-06.md`.

| البند | التنفيذ | الإثبات |
| --- | --- | --- |
| RV-Print-01 (سقف Copies) | `maxCopiesPerItem=5000` و`maxExpandedPrintCells=25000` بجمع int64 آمن من الفيض | `print_service.go` + 4 اختبارات ✅ |
| RV-Print-02 (خطوط مائلة CMYK) | Bresenham مُعامَل بالطول مع إيقاع شرطات موحّد في `solid/dotted/dashed` | `print_cmyk.go` + اختبارا المائل ✅ |
| RV-Print-02b (تسطيح ألفا) | premultiplied RGBA/NRGBA يُركَّب فوق أبيض الورقة `F = rp + 255 - a` | `print_cmyk.go` + اختبار ✅ |
| RV-Print-03 (فحص قبل التحويل) | رفض ورقة CMYK > 50MP قبل أي `ConvertRGBAtoCMYK` | `print_export.go` ✅ |
| RV-Print-04 (وسوم دقة TIFF) | `injectTIFFResolution` يعيد كتابة IFD0 بـ `X/YResolution=DPI/1` و`ResolutionUnit=2` (BE/LE، إزاحات مُزاحة) | `print_tiff_tags.go` + 5 اختبارات ✅ |
| RV-Print-05 (احتياطي معاينة) | فشل ترميز PNG ⇒ احتياطي JPEG ⇒ وسقوط قاتل مع سجل | `print_export.go` ✅ |
| RV-Print-06 (URI سليم) | `url.URL{Scheme:"file"}` بترميز كامل بدل استبدال المسافات | `print_export.go` ✅ |
| RV-Print-07 (نطاق المسارات) | `resolveLocalPath` يقيّد في: `data:` و`/local-image/` وشجرة `GRIDO_APP_DIR` بعد `EvalSymlinks` | `print_image_pipeline.go` + اختبارا النطاق ✅ |
| RV-Print-08 (سقف الفك) | `DecodeConfig` قبل `imaging.Decode` — سقف 100MP؛ قنبلة 65 بايت معلنة 10GP تُرفض | `print_image_pipeline.go` + اختبار القنبلة ✅ |
| RV-Print-09 (اقتطاع الرفع) | نسخ بحد+1 (maxFileSize+1) وإرجاع 413 في `/api/upload-print-image` و`/api/upload-media` و`/api/save-file` | `main.go` ✅ |
| RV-Print-10 (PowerShell آمن) | المسار عبر متغيرات البيئة `GRIDO_PRINT_DIR/FILE` بلا استيفاء نصي nor Base64، سجل عند فشل `Wait` | `print_native_windows.go` ✅ |
| RV-Print-11 (PDF ديناميكي) | `OrientationStr` يُشتق من `PaperWidthMM > PaperHeightMM` | `print_pdf_export.go` ✅ |
| RV-Print-12 (منظف TEMP) | حذف `grido_print_*.html` بعد 24 ساعة وسقف 20MB/ملف بدل 5 دقائق | `print_native.go` ✅ |
| RV-Print-19 (سباق الواجهة) | `attemptRef` رمز جيل يتجاهل النتائج المتأخرة؛ `setExporting` ذري؛ `setPrintInvocation` داخل effect؛ كائن hook مُثبَّت | `use-print-export.ts` + `print-dialog.tsx` + 14 حالة ✅ |
| RV-Print-20/21 (مهلات وإلغاء) | `AbortController` 120ث للرفع، `withTimeout` 10د لـIPC، timers مُتتبَّعة تُنظَّف عند التفكيك | `use-print-export.ts` + اختبارات ✅ |
| RV-Print-22 (حالة الحوار) | `onCutLinesChange` بوصف واحد حسب الوضع؛ حفظ/استعادة `selectedIds`؛ تتبع آخر هامش غير صفري | `print-dialog.tsx` ✅ |
| RV-Print-23 (وصولية) | `aria-label` لأزرار الأيقونات، `role=alert/status`، `aria-live`، `aria-keyshortcuts`، عنوان Enter | `print-dialog.tsx` ✅ |
| RV-Print-24 (المعاينة) | حارس `collage-active`، حد أدنى 1px، حفظ `rawCutLines` و`copyBlocks` | `print-preview.tsx` ✅ |
| RV-Print-25 (نمط القص الموحّد) | `resolveCutLineDash` + زوايا cropmarks في التصدير اليدوي — ثلاثة مخرجات توحّدت | `export-canvas-collage.ts` + `export-canvas.ts` ✅ |
| RV-Print-26 (ثبات المقياس) | وثيقة تعليق `print-layout-math.ts` تُعلن أن المليمتر المحوري هو الحقيقة في كل المسارات | `print-layout-math.ts:123-133` ✅ |
| تقوية الاختبارات | 21 دالة Go جديدة + 14 حالة Vitest؛ 21 اختباراً قائماً حُدِّث لعقد الإدخال الإنتاجي (`/local-image/` داخل GRIDO_APP_DIR معزول) | `print_*_test.go` + `print-export-helpers.test.ts` ✅ |
| بوابات الجودة | `go test ./internal/...` ✅ · `go vet` ✅ · `-race` نظيف ✅ · Vitest 876 ناجحة + 1 متخطاة (103 ملفات) ✅ · `tsc` ✅ · `eslint --max-warnings 0` ✅ | 2026-10-06 |

---

## 0.42 سجل جلسة تحصين حصص الذكاء الاصطناعي وإصلاح عيوب الحذف والتبديل — 5 أكتوبر 2026

**المرجع:** طلب المالك الصريح «قم بحل الجميع» بعد التحقق من عيوب حذف العناصر المقفلة، وفقدان عناصر التصميم في الكولاج، وثغرتي احتساب حصص الـ AI في تقرير 14.

| البند | التنفيذ | الإثبات |
| --- | --- | --- |
| R14-1 (تسريب حصة AI) | تحويل الفحص المسبق في Modal إلى **Fail-Closed** برفض حرق GPU بكود 503 عند أي خطأ شبكي، والتحقق الصارم من `usage_recorded` في عميل Go ورفض العملية إن كانت `false` | `modal_ai/upscaler.py:220-226` و `internal/service/ai_service.go:481-492` ✅ |
| R14-2 (سباق التجاوز والخصم المزدوج) | إضافة هجرة `20261005160000` بعمود `request_id uuid` وفهرس فريد، وقفل صفي حصري `FOR UPDATE` على بروفايل المستخدم لمنع التجاوز المتزامن، ومعالجة خاملة Idempotent تمنع التكرار | `supabase/migrations/20261005160000_atomic_ai_quota_reservation.sql` و `modal_ai/upscaler.py:188,350` ✅ |
| UI-BUG-1 (حذف العناصر المقفلة) | حماية دالتي `removeElement` و `removeElements` في الستور بالامتناع التلقائي عن حذف أي عنصر `locked: true` إلا بطلب إجباري صريح، وتصفية العناصر المقفلة في قائمة سطح المكتب وشريط التحديد وتبويب وقائمة الطبقات مع إشعار `toast.info` | `element-slice.ts`، `desktop-menu-bar.tsx`، `toolbar-selection-tools.tsx`، `freeform-layers-tab.tsx`، `layers-list.tsx`، `layers-panel.tsx` واختبارات `element-slice.test.ts` ✅ |
| UI-BUG-2 (فقدان عناصر التصميم في الكولاج) | استئصال أسطر تفريغ المصفوفة `nextState.elements = []` من دالة `setMode` في `core-slice.ts`، لضمان بقاء كافة عناصر التصميم الحر محفوظة في الذاكرة دون مسح عند التبديل للكولاج | `core-slice.ts:157-160` واختبار انحدار `core-slice.test.ts` بنجاح 100% ✅ |
| بوابات الجودة والتوثيق | خلو تام من تحذيرات Lint وأنواع TypeScript، واجتياز 24 هجرة في `migration-lint.mjs`، ونجاح بوابة التوثيق الصارمة | `npm run lint` ✅، `npm run typecheck` ✅، `node scripts/migration-lint.mjs` ✅ |

---

## 0.41 سجل جلسة إعادة تصميم وصقل تبويب «الألوان والهوية» — 5 أكتوبر 2026

**المرجع:** طلب المالك الصريح — «كنت اقصد تبويب الهوية والالوان في الشريط الجانبي» ثم «لم تتبع اسلوب التطبيق ولا هويتها البصرية كذلك هناك هدر في المساحات وتوزيع مبالغ به».

| البند | التنفيذ | الإثبات |
| --- | --- | --- |
| بطاقة علوية مدمجة للتحكم | دمج مبدل الوجهة (عنصر/ورقة) مع عينة اللون المخصص وكود الـ HEX وزري النسخ والمفضلة في كبسولة موحدة رشيقة | `freeform-palette-tab.tsx` |
| شريط الاستوديو القياسي الفوري | وضع ألوان الاستوديو الثمانية القياسية في صف مدمج سريع (`h-5`) بجانب أزرار استخراج الصور والتناغم الذكي | `freeform-palette-tab.tsx` |
| بطاقات هويات بصرية عالية الكثافة | تصميم بطاقات مضغوطة مدمجة (`h-10`) تعرض اسم الهوية وشريط عينات متصل وأزرار التوزيع وتطبيق الخلفية بلا هدر للمساحات | `freeform-palette-tab.tsx` |
| 16 هوية بصرية مصنفة | إضافة 16 هوية متناسقة مصنفة (وثائق وهوية، استوديو وتصوير، أعمال وفخامة، عصري وإبداعي) مع كبسولات تصفية `FluentFilterChips` | `freeform-panel-constants.ts` |
| تناغم لوني ذكي واستخراج من الصور | كبسولة سريعة لاشتقاق التناغم اللوني الرياضي (OKLCH) واستخراج ألوان الهوية من صور الكانفاس بلمسة واحدة | `freeform-palette-tab.tsx` |
| شريط المفضلة المدمج | شريط مدمج أسفل القائمة للألوان المفضلة مع زر التفريغ السريع | `freeform-palette-tab.tsx` |
| بطاقات خطوط فائقة الرشاقة بسطر واحد | إعادة هندسة بطاقات الخطوط لتكون بسطر واحد مدمج (`h-10`, 40px) وتطبيق نوع الخط مباشرة على اسمه مع هامش مريح يمنع تداخل الحروف مع الإطار | `freeform-fonts-tab.tsx` |
| شريط أدوات طبقات مدمج بنمط مستقل | تقليص شريط أدوات الطبقات من 135px إلى 34px مع شريط محاذاة مشروط، وإلغاء ازدواجية الصناديق لتملأ الطبقات كامل اللوحة | `freeform-layers-tab.tsx` و `layers-list.tsx` |
| ترشيد مساحات تبويب الخلفيات والأنماط | إخفاء صندوق المفضلة الفارغ لتجنب هدر 120px، وإزالة مربع الشرح المكرر، وضغط بطاقات التدرجات إلى 52px وبطاقة خلفية الورقة إلى 48px | `freeform-backdrops-tab.tsx` و `shared-controls.tsx` |
| ترشيد شبكة الأشكال والملصقات | تحويل شبكة الأشكال الهندسية إلى 3 أعمدة (تقليص الصفوف من 6 إلى 4) وخفض ارتفاع معاينات الملصقات من 96px إلى 72px | `freeform-elements-tab.tsx` |
| إعادة تصميم تبويب فرز وترتيب الخانات | استئصال عرض مصغرات صور الوجوه المتكررة واستبدالها بمخطط هيكلي تجريدي، وموازنة الأزرار عبر الامتداد الكامل للأزرار الفردية | `collage-arrange-tab.tsx` |
| اجتياز بوابات الجودة والنوع | فحص الأنواع واختبارات الكانفاس واختبارات الوحدة وبوابة التوثيق بنجاح كامل (0 تحذيرات) | `npm run lint` ✅، `npm run typecheck` ✅، `docs-gate.mjs` ✅ |

**تصحيح مؤرَّخ (2026-10-21 — الجلسة 1.28):** حُذفت ملفات `freeform-palette-tab.tsx` و`freeform-fonts-tab.tsx` و`freeform-backdrops-tab.tsx` مع إزالة وجهة الهوية البصرية؛ هذا السجل تاريخي.

---

## 0.40 سجل جلسة تدقيق وإصلاح عيوب واجهة المستخدم (UI/UX Bug Fixes) — 4 أكتوبر 2026

**المرجع:** طلب المالك — «find ui bugs» ثم اعتماد وتنفيذ حزمة الإصلاحات.

| البند | التنفيذ | الإثبات |
| --- | --- | --- |
| طي لوحة الخصائص في Wide | ربط حالة فتح وإغلاق لوحة الخصائص برمز `isInspectorPinned` ومُحدِّثه الدالي، ومزامنتها عند عبور نقاط التوقف (standard→wide) مع اختبار انحداري، وحل تعطل زر الطي ومنع الإغلاق الخاطئ لدرج القوالب في الشاشات العريضة | `workspace-layout.tsx` و `use-workspace-panels.ts` و `use-workspace-panels.test.ts` |
| زر الخصائص في شريط العنوان | إضافة زر طي/إظهار لوحة الخصائص لسطح المكتب في الشريط الرئيسي بجانب زر القوالب مع أيقونة `<SlidersHorizontal />` واختصار `Ctrl+Shift+B` | `App.tsx` |
| منع فيضان قائمة مقاسات الورق | تقييد قائمة مقاسات الورق القياسية والمتقدمة بـ `max-h-[60vh] overflow-y-auto` لمنع خروجها عن حدود الشاشة في الحواسيب المحمولة | `canvas-viewport-deck.tsx` |
| تفعيل تلاشي تمرير الألواح | مراقبة عنصر `[data-radix-scroll-area-viewport]` وغلاف المحتوى التابع له بدلاً من الحاوية المغلفة لإظهار تأثير التلاشي العلوي `panel-scroll-hint` عند نمو وتمرير المحتوى | `panel-shell.tsx` |
| تصحيح محاذاة RTL لشارة الطبقات | استبدال الفئة الفيزيائية `-right-0.5` بـ `-end-0.5` لضمان اتساق موضع الشارة الرقمية في الوضع العربي | `workspace-panel-rail.tsx` |
| محاذاة أزرار تصدير الصور | استخدام `text-start` المنطقية بدلاً من `text-right` الفيزيائية في بطاقات خيارات صيغ التصدير | `export-dialog.tsx` |
| تسجيل أخطاء التهيئة بالمسجل الموحد | توجيه أخطاء الترخيص وفتح الملفات إلى `appLog.error` بدلاً من `console.error` لضمان شمولها في حزمة الدعم `grido_support_logs.zip` | `App.tsx` |
| منع تداخل نصوص طبقة التحرير | إضافة المفتاح `key={editingTextId || 'none'}` لـ `TextEditingOverlay` و `key={textEl.id}` لـ `textarea` لمنع احتفاظ مربع التحرير بنصوص قديمة عند الانتقال السريع بين العناصر | `editor-canvas.tsx` و `text-editing-overlay.tsx` |
| استقرار مراجع دوال الكولاج أثناء الرندر | تحديث مراجع دوال الإزاحة والسحب والنقر مباشرة داخل جسم الرندر بدلاً من `useEffect` المتأخر لمنع الـ Stale Closures | `collage-image.tsx` |
| تثبيت ميموزيشن طبقة العناصر المفردة | تثبيت مراجع معالجات `onDblClick` و `onChange` واستخدام كاش لكائنات `elementRef` لتمكين المقارن `propsAreEqual` من منع إعادة تصيير عناصر Konva بدون داعٍ | `konva-single-layer.tsx` و `konva-canvas.tsx` |
| سلاسة تقريب عجلة معاينة الملصقات | فك ارتباط مراقب حدث التكبير بالعجلة عن حالة `zoomLevel` واستخدام مرجع `zoomLevelRef` لمنع إعادة تسجيل المستمع مع كل إطار حركة وتفادي تقطع الإيماءات | `StickerPreview.tsx` |
| حماية دورة حياة نافذة جسر الهاتف | إضافة فحص `isMountedRef` لكافة الوعود غير المتزامنة ومؤقت نسخ الرابط والاستطلاع الدوري لمنع تعديل الحالة بعد فك التركيب وتوجيه الأخطاء إلى `phoneLog` | `phone-bridge-dialog.tsx` |
| تنظيف مستمعات سحب حواف النافذة | إضافة `useEffect` لتنظيف معالجات `mousemove` و `mouseup` و `blur` المرتبطة بـ `window` عند فك تركيب المكون أثناء السحب وتوجيه الأخطاء إلى `windowLog` | `window-resize-handles.tsx` |
| تدقيق شرط تطهير كاش الصور | حصر مطابقة المفتاح بـ `key === src || key.startsWith(`${src}__`)` لمنع طرد صور الكاش التي تشترك في بادئة المسار بالخطأ | `use-async-image.ts` |
| تفاعلية مؤشر أبعاد كولاج المساحة الحرة | استخدام حالة تفاعلية `isDragging` بدلاً من قراءة المرجع غير التفاعلي أثناء الرندر لضمان ظهور وتحديث الشارة الحية بدقة فور بدء السحب وانتهائه | `FreeformCanvasEditor.tsx` |
| مفتاح تركيبي لخطوط الإرشاد الذكية | استبدال الفهرس بمفتاح تركيبي مبني على النوع والإحداثي والفهرس `${guide.type}-${guide.coord}-${idx}` لتفادي وميض الخطوط الإرشادية | `editor-canvas.tsx` |
| حماية اختصارات الكانفاس بالنوافذ | فحص `isModalActive` لمنع تفعيل اختصارات الكانفاس (تراجع، حذف، أسهم) داخل النوافذ المنبثقة، وإيقاف انتشار الحدث في نافذة الملصقات | `use-keyboard-shortcuts.ts` و `StickerStudioDialog.tsx` |
| حماية مفتاح Tab لإمكانية الوصول | منع اختطاف مفتاح `Tab` عند التركيز على أزرار وعناصر الواجهة لضمان التنقل السلس باللوحة وقصر نمط Zen على الكانفاس فقط | `use-keyboard-shortcuts.ts` |
| ظهور الشريط السريع عند عنصرين | تصحيح شرط ظهور أدوات التحديد المتعدد ليصبح `selectedIds.length >= 2` بدلاً من 3 لمنع اختفاء شريط الأدوات السريع | `canvas-quick-bar.tsx` |
| استقرار مستمعات سحب الأدلة | ربط مستمعات `pointermove` و `pointerup` بحالة `isDragging` وتحديث المراجع داخل `useEffect` لمنع إعادة تسجيل المستمعات مع كل حركة | `use-user-guides.ts` |
| رفع ترتيب طبقة تحرير النصوص | تخصيص `--z-canvas-text-overlay: 70;` لرفع طبقة تحرير النصوص فوق الخطوط الإرشادية وحل تداخل Z-index | `index.css` و `ui-compliance.ts` و `text-editing-overlay.tsx` |
| تطهير كاش كائنات وعقد Konva | تنظيف مراجع ومعالجات الأحداث للعناصر المحذوفة من `elementRefCache` و `dblClickHandlersRef` لمنع تسرب الذاكرة | `konva-canvas.tsx` و `konva-single-layer.tsx` |
| حماية إزاحة سحب الكولاج أثناء الإيماءة | حماية `accumulatedDrag.current` من إعادة التعيين أثناء السحب النشط عبر `isDraggingRef` لمنع ارتداد الصورة | `collage-image.tsx` |
| ثبات بؤرة التقريب لغير العجلة | الحفاظ على نقطة ارتكاز مركز العرض عند التقريب عبر القوائم أو الأزرار لتفادي إعادة التمركز المفاجئة | `use-canvas-viewport.ts` |
| تأمين شارة التحويل ضد NaN/Infinity | حماية حسابات مقياس وموضع شارة التحويل `safeBadgeScale` ضد القسمة على الصفر عند المقياس المنعدم | `editor-transformer.tsx` |
| اجتياز بوابات الجودة | اجتياز فحوصات الأنواع والـ Lint وبوابة التوثيق الصارمة واختبارات الوحدة بنسبة 100% | `npm run lint` (0 تحذيرات)، `npm run typecheck` (0 أخطاء)، `docs-gate.mjs` ✅ |

---

## 0.39 إطلاق الإصدار الرسمي v1.12.0 — 3 أكتوبر 2026

**المرجع:** طلب المالك الصريح («ارفع اصدار جديد») لتوحيد حزمة الميزات الموسعة، وتسريع محرك الطباعة، وإصلاحات الاستقرار المعمارية.

| البند | التنفيذ | الإثبات |
| --- | --- | --- |
| ترفيع الإصدار إلى v1.12.0 | ترفيع متزامن شامل عبر `scripts/release.mjs` لجميع المصادر السبعة: `build/config.yml`، `info.json`، `project.nsi`، `Taskfile.yml`، `build.ps1`، `package.json` و `package-lock.json` | `node scripts/release.mjs --check` ✅ |
| ترقية سجل التغييرات | تحويل قسم `[Unreleased]` بالكامل إلى قسم الإصدار الرسمي `[v1.12.0] - 2026-10-03` | `CHANGELOG.md` |
| تحقق الجودة الاستباقي | خلو كامل من تحذيرات Lint و Typecheck، واكتمال فحص بوابات التوثيق الصارمة | `npm run lint` (0 تحذيرات)، `npm run typecheck` (0 أخطاء)، `docs-gate.mjs` ✅ |
| اجتياز الـ CI السحابي المسبق | التأكد من اجتياز الدورة السابقة لـ `main` (Run 37150707537) بنجاح 100% لكافة الوظائف العشر قبل إنشاء الوسم | `gh run view 37150707537` |

---

## 0.38 سجل تكميلي: تسريع خط أنابيب الطباعة وحزمة الإصلاحات المعمارية (#1 إلى #4) — 3 أكتوبر 2026

**المرجع:** تدقيق الأداء وخطة التعلم الصادرة عن تدقيق الأخطاء الـ 14 المعتمدة من المالك.

| البند | التنفيذ | الإثبات |
| --- | --- | --- |
| تسريع معالجة الصور بالـ LUT | دمج تعديلات السطوع والتباين في جدول بحثي مركب (Single-pass LUT) بمسح بكسلي واحد يوفر نسخة NRGBA وسيطة كاملة | `print_image_pipeline.go` واختبارات `print_perf_fixes_test.go` بنجاح 100% |
| التدفق المباشر للقرص وحقن DPI | استبدال مصفوفات البايتات الوسيطة بالترميز المتدفق المباشر للقرص مع حقن JFIF و pHYs لحظياً | `print_export.go` و `dpiJPEGWriter` و `dpiPNGWriter` |
| توازي أبعاد الصور وتخفيف CMYK | جلب أبعاد الصور بالتوازي عبر `errgroup` بعدد الأنوية الكامل، وتصغير معاينة CMYK المعروضة في المتصفح إلى 1200px | `media_service.go` و `print_export.go` |
| إصلاح تباعد شبكة الكولاج الحرج | تصحيح حساب `stepYMM` ليعتمد على `grid.cellHeight` مباشرة بدلاً من الفارق مع العنصر 1 الذي كان يصفّر الإزاحة الرأسية للشبكات | `use-print-export.ts` |
| إصلاح العيب #1 (تراجع بعد التحميل) | شمولية بذر لقطة التاريخ الأولى `history[0]` بكافة حقول القوالب والتدرج الخطي عند فتح المشاريع | `core-slice.ts:loadProject` |
| إصلاح العيب #2 و #5 (انزياح الخانات) | استبدال الفهرسة السطحية `[i]` بخوارزمية المطابقة المكانية `remapSlotsToCells` وحظر إعادة البناء الزائدة | `core-slice.ts` و `print-slice.ts` و `collage-slice.ts` |
| إصلاح العيب #3 (إسقاط أحداث Wails) | إلغاء الاستدعاءات العامة لـ `EventsOff` والاعتماد حصراً على دوال الإلغاء الفردية (`unbind / unsubscribe`) | `App.tsx` و `use-phone-bridge.ts` |
| إصلاح العيب #4 (فحص حمولة الحافظة) | التحقق الصارم من عناصر الحافظة الملصقة بـ `CanvasElementSchema.safeParse` قبل حقنها في الستور | `clipboard-utils.ts` |
| ترسيخ القواعد والمهارات | توثيق القواعد المعمارية في دستور المشروع (`backend-wails-runtime`, `konva-canvas-engine`, `architecture-governance`, `zustand-state-patterns`) | ملفات `.agents/` و `learning_proposal.md` |

---

## 0.37 سجل تكميلي: استغلال إمكانات محرك Konva v10.3 الشامل — 3 أكتوبر 2026

**المرجع:** أمر الهدف الشامل (`/goal do all`) استناداً لخطة التوسعة الشاملة لإمكانات محرك Konva غير المستغلة واستبدال الكود اليدوي.

| البند | التنفيذ | الإثبات |
| --- | --- | --- |
| تحديد الصندوق (Marquee Selection) | تتبع سحب الفأرة على خلفية الكانفاس الفارغة ورسم مستطيل تحديد أكريليكي وفحص التقاطع بـ `Konva.Util.haveIntersection` و `getElementPixelVisualBox` وتحديث `selectedIds` في الوضع الفردي مع دعم مفتاح Shift للتراكم؛ وحل سباق أحداث إفلات الفأرة بين `window.pointerup` و `stage.onMouseUp` عبر دالة ذرية `finishMarquee` وتوسيع المجموعات | `konva-canvas.tsx` و `konva-single-layer.tsx` واختبارات التقاطع في `element-geometry.test.ts` |
| تسريع شبكة النقاط (Grid Caching) | تفعيل `shape.cache()` لشكل الشبكة في `grid-layer.tsx` مع تفريغ وإعادة بناء الكاش عند تغير معايير الشبكة أو أبعاد الكانفاس فقط، مما يلغي رسم ما يصل إلى 20,000 نقطة في كل إطار | `grid-layer.tsx` واختبارات `test:canvas` |
| فلاتر الاستوديو (Pixelate & Threshold) | تفعيل فلتر التعتيم البكسلي `pixelate` لحماية الخصوصية وفلتر الثنائية الحادة `threshold` لأختام المطابع مع مطابقة كاملة في خوارزمية الطباعة في Go | `konva-filters.ts` و `constants.ts` و `single-print-composition.ts` و `print_image_pipeline.go` واختبارات `canvas-rendering-core.test.ts` واختبارات Go بنجاح 100% |
| أشكال متجهة أصلية (Native Shapes) | كتالوج موحّد بـ33 شكلاً يغذي الواجهات كلها، مع أنواع Konva الأصلية `Arrow` (مزدوج الرأسين) و `RegularPolygon` و `Ring`/`Arc`/`Wedge` و `Star` (رؤوس وعمق) و `Rect` (زوايا مستقلة)، وأنماط حد `dash`، وتعبئة الصور `fillPatternImage` بأربعة أوضاع ملاءمة — في المعاينة واللوحات وخط أنابيب التصدير | `shape-catalog.ts` و`shape-node.tsx` و`shape-properties.tsx` و`toolbar-add-shapes.tsx` و`freeform-elements-tab.tsx` و`export-canvas-fitted.ts` — **تصحيح مؤرَّخ (2026-10-21 — الجلسة 1.29):** حُذف `toolbar-add-shapes.tsx`، والكتالوج الكامل صار يُعرض بمجموعاته في `freeform-elements-tab.tsx`. |
| أقنعة القص المتجهة للصور (Image Masking) | دعم أقنعة الأشكال المتجهة للصور (`clipFunc` على مجموعات Konva) لقص الصور بأشكال دائرية وقلب ونجمة دون تشويه أو تكرار يدوي، مع مطابقة في التصدير | `image-node.tsx` و `image-properties.tsx` و `export-canvas-fitted.ts` |
| فحص التصادم لإسقاط الصور (Native Hit-Testing) | استبدال الحساب اليدوي للإسقاط في `use-image-drop.ts` بفحص تصادم Konva اللحظي `stage.getIntersection(pointer)` و `findAncestor` | `use-image-drop.ts` |
| أداة اليد والتحريك بالمساحة (Space-Pan) | تحريك الكانفاس بمفتاح المسافة أو الزر الأوسط (`use-canvas-viewport.ts`) مع التقاط فوري لـ `pointerdown` ومنع التعارض مع التحديد | `use-canvas-viewport.ts` و `konva-canvas.tsx` |
| بوابات التوثيق والجودة | إضافة اختبارات وحدة جديدة (إجمالي 67 حالة في 8 ملفات كانفاس)، خلو تام من تحذيرات وأخطاء Lint و Typecheck ونجاح بوابات التوثيق الصارمة | `node scripts/docs-gate.mjs --strict-refs` ✅ (37 تأكيداً) |

---

## 0.36 سجل تكميلي: إزالة تبويب المفضلة، إعادة تصميم مكتبة الخطوط وهندسة الإشعارات — 3 أكتوبر 2026

**المرجع:** طلبات المالك الصريحة («تبويب المفضلة واخر استخدام يعتبر ميزة فائضة وعبثية قم بازالتها كاملة»، «تحسين كامل لتصميم مكتبة الخطوط بدون تصنيفات وبطاقات رشيقة»، و«اكثر ما يرهقني ان التطبيق يظهر اشعارا في الاعلى على كل كبيرة وصغيرة... قلل من الاشعارات الى اقل حد ممكن»).

| البند | التنفيذ | الإثبات |
| --- | --- | --- |
| حذف تبويب المفضلة | حذف `freeform-library-tab.tsx` و `freeform-library-tab.test.tsx` وحذف استيراده واستدعائه من `freeform-studio-panel.tsx` | خلو شجرة الكود والاختبارات من المكون |
| تنظيف سجل الأدوات | حذف `library` من نوع `FreeformTab` ومصفوفة `STUDIO_TOOLS` وأيقونة `Star` غير المستخدمة في `workspace-tools.ts` | نجاح `npx vitest run test/workspace-tools.test.ts` (27/27) |
| تنظيف التخزين المحلي | إزالة مفاتيح `favoriteShapes` و `favoriteTextPresets` و `recentItems` ودالتي `elementPrefKey` و `parseElementPrefKey` من `local-prefs.ts` | خلو الكود من أي إشارات للمفاتيح والدوال المحذوفة |
| إعادة تصميم مكتبة الخطوط | إلغاء الكبسولات والعناوين الزائدة واعتماد بطاقات رشيقة بأسلوب Fluent 2 مع معاينة حية للنص العربي/اللاتيني ومفضلة سريعة | `freeform-fonts-tab.tsx` نجاح الاختبارات والفحص البصري |
| هندسة الإشعارات (Toasts) | نقل Sonner إلى `bottom-center` لمنع حجب الكانفاس، تفعيل زجاجية Fluent 2 الأكريليكية وحصر الظهور بإشعار واحد، وكتم كافة الإشعارات الروتينية للعمليات اللحظية | `App.tsx` و `sonner.tsx` و `index.css` وتعديلات لوحات التحكم |
| تحديث بوابة التوثيق | تحديث عدد ملفات Vitest من 103 إلى 102 في `DOCUMENTATION_MAP.md` وتوثيق التغييرات في `CHANGELOG.md` | نجاح `node scripts/docs-gate.mjs --strict-refs` (37 تأكيداً) |

---

## 0.35 سجل تكميلي: تنظيف السقالات الميتة، حفظ نوع وثيقة F-12، حذف دالة Edge وترحيل اللوجر — 2 أكتوبر 2026

**المرجع:** موافقة المالك الصريحة («تمام») على تنفيذ حزمة الإصلاحات الأربعة المحددة في جلسة التقييم.

| البند | التنفيذ | الإثبات |
| --- | --- | --- |
| تنظيف سقالات الهواتف | حذف مجلدي `build/ios` و `build/android` وتنظيف مهام iOS من `build/Taskfile.yml` — مكّن `go build ./...` و `go vet ./...` القياسيين من النجاح فوراً | خروج `go build ./...` و `go vet ./...` بكود 0 دون حصر المسار |
| حذف دالة Edge الميتة | حذف `supabase/functions/license/index.ts` التي كانت تعمل بصلاحية `service_role` بلا مستهلك | خلو المستودع من الدالة ومراجع استدعائها |
| F-12 نوع بطاقة الهوية | تمرير `aspectType?: DocumentAspectType` في `ScoredCandidate` وتفضيل `cand.aspectType` على الاستدلال الهندسي في `opencv-detector.ts` و `document-detector.ts` | اختبار انحدار جديد في `scanner-hardening.test.ts:500-510` (25/25 ناجح) |
| RV-4 ترحيل اللوجر | ترحيل 26 استدعاء `console.error` إلى `createLogger` في `use-print-export.ts` (9)، `projects-dialog.tsx` (7)، `batch-insert-dialog.tsx` (5)، و `toolbar-file-ops.tsx` (5) | تراجع استدعاءات `console.error` المباشرة في الواجهة من 105 إلى 79 |
| بوابات التوثيق | نجاح `docs-gate.mjs --strict-refs` بعد تصحيح مراجع المسارات المحذوفة ومزامنة الخريطة ودليل المطور | `node scripts/docs-gate.mjs --strict-refs` ✅ (37 تأكيداً) |

---

## 0.34 سجل تكميلي: سد الفجوات المفتوحة C-05/C-06/defer/VERSION وصقل RV-4 — 2 أكتوبر 2026

**المرجع:** طلب المالك «سد النقوصات وصقل ما يحتاج صقل» بعد مراجعة `docs/reviews/07` و`11` وسؤال التقييم العام.

| البند | التنفيذ | الإثبات |
| --- | --- | --- |
| C-05 تكلفة L4 | `modal_ai/upscaler.py`: `GPU_HOURLY_USD=0.60` بدل `1.10` (الفئة `gpu="L4"`) مع تعليق التصحيح | قراءة الكود + `docs/AI_ARCHITECTURE.md` |
| C-06 ابتلاع التسجيل | محاولة + إعادة بعد ثانية، وعند الفشل `usage_recorded=False` صراحةً مع `CRITICAL` بدل النجاح الصامت | قراءة `upscaler.py:327-375` |
| إغلاق الملف المبكر | `_ = srcFile.Close()` بعد `io.Copy` وقبل `af.Commit()` في `ProcessOpenedFile` — `defer` لشبكة الأمان فقط | `internal/service/media_service.go:306-311` |
| إطار VERSION | `MIN_SUPPORTED_PROJECT_VERSION=1` + رفض المستقبلية برسالة تحديث ورفض التالفة + قبول سلاسل رقمية | `frontend/src/lib/io/project-serializer.ts:6-110` |
| RV-4 جزئي | توجيه `App.tsx` (مسارا التعافي) و`error-boundary.tsx` إلى `createLogger` بدل `console.error` | `frontend/src/App.tsx` + `error-boundary.tsx` |
| ما لم يُلمس (يحتاج قرار مالك) | ربط `p_device_id` بالعتاد · اشتقاق المفتاح من `MachineGuid` وحده · إسقاط `xlsx` أو مصدر مصون · `PSD/ICC/HarfBuzz` الكاملة | توثيق فقط — لا تغيير سلوكي بلا موافقة |

---

## 0.33 سجل تكميلي: تغطية panics الـ goroutines (SafeGo) — 2 أكتوبر 2026

**المرجع:** إغلاق فجوة رُصدت في إعادة تقييم سجل 0.32 — `PanicHandler` يغطي مسارات Wails المُدارة فقط، وعشرة مواضع إطلاق في كود التطبيق كانت خارج أي حماية.

| البند | التنفيذ | الإثبات |
| --- | --- | --- |
| غلاف موحّد لـ goroutines | `internal/utils/safe_go.go`: `SafeGo(name, fn)` يشغّل الدالة محمية ويُمرّر أي panic عبر `PanicReporter` المسجَّل؛ وبلا مستقبل يُسجَّل الخطأ ثم يُعاد إطلاق الـ panic (لا ابتلاع) | `TestSafeGo_RunsNormallyWithoutCrashPath` · `TestSafeGo_FunnelsPanicIntoCrashPath` |
| الربط بمسار الانهيار | `main.go`: `utils.SetPanicReporter(service.ReportGoroutinePanic)` قبل أي goroutine محمية؛ و`service.ReportGoroutinePanic` يمرّر إلى `defaultCrashGuard.HandleFatalPanic` (تقرير + إعادة تشغيل + إنهاء) | تأكيد كودي في `scripts/docs-gate.mjs` |
| تغطية المواضع العشرة | عمال الصور (×2)، تحويل CMYK، تنظيف صادرات الطباعة، منظّف ملفات الطباعة المؤقتة، خادم OAuth، جسر الهاتف، فحص اتصال DB، تنظيف الوسائط، `CleanupTempUpdates`، ومؤقت حالة النافذة | `mustNotContain: ['go func(']` في تأكيدات عمال الصور وCMYK والمنظفات |
| قرار انهيار واحد لكل عملية | ترتيب مؤجَّلات `HandleFatalPanic`: `Unlock` أولاً و`exitProcess` بعده (LIFO) ⇒ الإنهاء يقع والقفل محتجز. **مصدر الانهيار الوحيد** في الإنتاج هو `defaultCrashGuard` عبر `DefaultCrashGuard()` (App كان ينشئ نسخة ثانية بقفل مستقل ⇒ مساران مستقلان) + **قفل على مستوى العملية** لملف عدّاد الحلقات يمنع سباق القراءة–التعديل–الكتابة | `TestCrashGuardService_RestartLoopGuardTripsAtCap` · تأكيدا `CRASH-GUARD-UNIFIED` و `CRASH-RESTART-GUARD-MUTEX` + `go test -race` ✅ |
| بوابات الجودة والتوثيق | **37 تأكيد كودي** (بعد إصلاحات المراجعة قبل الرفع)، و`go_test_files=33` بلا تغيير | `node scripts/docs-gate.mjs --strict-refs` ✅ · `go vet` ✅ · `go test ./internal/repository/ ./internal/utils/ ./internal/service/` ✅ |

---

## 0.32 سجل تكميلي: التعافي الذاتي بعد الانهيار (Crash Auto-Restart) — 2 أكتوبر 2026

**المرجع:** استكمال سجل 0.30 — بدل الطرد الصامت بعد الانهيار، يُعاد تشغيل التطبيق تلقائياً بحارس يمنع الحلقات، ويُعرض حوار استعادة المسودة في النسخة الجديدة.

| البند | التنفيذ | الإثبات |
| --- | --- | --- |
| إعادة تشغيل تلقائية بعد الانهيار | `internal/service/crash_restart.go` + `crash_guard.go`: حفظ التقرير ثم إطلاق نسخة جديدة في عملية معزولة (`--crash-relaunch` · `DETACHED_PROCESS` على ويندوز و`setsid` غيرها) ثم إنهاء العملية بلا انتظار للابن | `TestCrashGuardService_HandleFatalPanicRelaunchesAndExits` · `TestIsCrashRelaunch` |
| مهلة إفلات قفل النسخة الواحدة | `main.go`: العملية المُعاد تشغيلها تنتظر `CrashRelaunchSettleDelay` (1.5s) قبل تهيئة Wails حتى تُفلت العملية المنهارة قفل `SingleInstance` فلا تُظنّ نسخة ثانية | تأكيد كودي في `scripts/docs-gate.mjs` |
| حارس حلقات إعادة التشغيل | عدّاد ذري `crash-restart-guard.json` (0600): **إعادتان** كحد أقصى داخل نافذة **15 دقيقة**، وانهيار بعد هدوء أطول يبدأ سلسلة جديدة، وأي إقلاع يدوي يصفّر العدّاد | `TestCrashGuardService_RestartLoopGuardTripsAtCap` · `TestCrashRestartGuard_WindowExpiryStartsFreshSeries` · `TestCrashRestartGuard_ClearUnlocksFreshSeries` |
| الفشل المغلق وتحمل الفساد | تعذّر حفظ العدّاد ⇒ لا إعادة تشغيل (منع حلقة محتملة) مع بقاء التقرير وحوار استعادة المسودة؛ والحالة الغائبة/الفاسدة تُعامل كسلسلة جديدة | `TestCrashRestartGuard_FailsClosedWhenStateCannotBePersisted` · `TestCrashRestartGuard_CorruptStateStartsFreshSeries` |
| بوابات الجودة والتوثيق | 12 اختبار وحدة في `crash_guard_test.go` (بما فيها فشل الإطلاق وقيود التطوير) و**30 تأكيد كودي**؛ والإجمالي `go_test_files=33` بلا تغيير (اختبارات في ملف قائم) | `node scripts/docs-gate.mjs --strict-refs` ✅ · `go vet` ✅ · `go test ./internal/service/` ✅ |

---

## 0.31 سجل تكميلي: المرحلة 3 للملصقات — حدود القص المتجه الحقيقي للمطابع (Die-Cut Offset) — 2 أكتوبر 2026

**المرجع:** إغلاق فجوة المرحلة 3 للملصقات المؤجلة في سجل 0.27 (حدود Die-cut كـ offset-path متجه حقيقي).

| البند | التنفيذ | الإثبات |
| --- | --- | --- |
| محرك توليد مسارات القص المتجه | `frontend/src/features/stickers/lib/die-cut-offset.ts`: استخراج الـ viewBox، وتوليد مسار مستطيل بحواف ناعمة موسَّع بنسبة نزف من أصغر بُعد (`bleedPercent` افتراضي 4% ≈ 2 مم على ملصق 50 مم). **بلا استدلال لشكل الملصق** — الحدّ مشتق من `viewBox` وحده لقاعدة السلامة: مستطيل ناعم يضمن احتواء العمل دائماً ولا يمكن أن يقصّ في غيره. ملف المقص يُصدَّر بلا أبعاد فيزيائية (المشغّل يحدّد الحجم) | `test/die-cut-offset.test.ts` (9 اختبارات، منها **اختبار انحدار بالقالب الحقيقي**) + تأكيد `mustNotContain` في `docs-gate` يمنع عودة استدلال الشكل |
| طبقة CutContour القياسية للمطابع | توليد وسم `<g id="CutContour" inkscape:label="CutContour" data-role="die-cut-contour">` بلون الماجنتا القياسي للمطابع (`#FF00FF` بسماكة 1.5) المعترف به في مقصات Roland و Graphtec و Summa | مطابقة الكود الناتج مع معايير ماكينات ومقصات الفينيل |
| خيارات التصدير الاحترافية في الاستوديو | `StickerStudioDialog.tsx`: إضافة خياري «SVG مع خط القص (CutContour)» و «خط القص فقط للمقصات (Plotter)» في قائمة التصدير | مراجعة الكود وفحص الواجهة |
| بوابات الجودة والتوثيق | `vitest_test_files=103` وتأكيد كودي جديد في بوابة التوثيق (الإجمالي **27 تأكيداً**) | `node scripts/docs-gate.mjs --strict-refs` ✅ · `tsc --noEmit` ✅ · `eslint` 0 warnings ✅ |

---

## 0.30 سجل تكميلي: نظام حماية الانهيار والتعافي (Crash Guard & Recovery) — 2 أكتوبر 2026

**المرجع:** إغلاق الفجوة التشغيلية للانهيار الصامت للملف التنفيذي الواحد (رُصدت في `comprehensive-app-review.md`).

| البند | التنفيذ | الإثبات |
| --- | --- | --- |
| التقاط الـ Panic في رنتايم Wails v3 | ربط `PanicHandler` في `main.go` لالتقاط أي انهيار مُميت وتمريره لـ `CrashGuardService`، ثم **إعادة فرض الإنهاء الفوري** (`HandleFatalPanic` ⇒ `exitProcess(1)` عبر `defer`) لأن المعالج المخصص يُلغي `defaultPanicHandler` ⇒ `os.Exit(1)` — لا استمرار بحالة فاسدة | تأكيد كودي في `scripts/docs-gate.mjs` + `TestCrashGuardService_HandleFatalPanicWritesThenExits` و`TestCrashGuardService_HandleFatalPanicExitsEvenIfPersistFails` |
| تقرير الانهيار الذري المحلي (`crash-dump.json`) | `internal/service/crash_guard.go`: كتابة ذرية لتقرير JSON بصلاحيات 0600 (`utils.AtomicWriteFile`) يشمل التوقيت، الإصدار، المنصة والمعمارية، نص الخطأ، الـ Stack Trace، وفحص وجود مسودة `autosave.json` | `TestCrashGuardService_HandleAndRecover` (دورة حفظ وفحص وحذف كاملة) |
| دوال جسر الـ IPC في Go | `app.go`: إضافة `CheckPendingCrashReport` و `DismissCrashReport` وتوليد ربطات Wails v3 تلقائياً بـ `wails3 generate bindings` | ربطات تايب سكريبت الرسمية في `frontend/bindings/grido/app.ts` |
| حوار التعافي واسترجاع المشاريع | `frontend/src/components/crash-recovery-dialog.tsx`: نافذة Fluent 2 تظهر عند الإقلاع في `App.tsx` عند وجود تقرير، تتيح استعادة المسودة أو تجاهلها، مع إمكانية نسخ تفاصيل الخطأ لدعم المطورين محلياً (100% Local / Zero Secrets). **الإغلاق الضمني محجوب** (ESC/النقر خارج النافذة) حتى لا يمسح المسودة المستعادة بصمت | `frontend/test/crash-recovery-dialog.test.tsx` (8 حالات، منها اختبارا انحدار للإغلاق الضمني) |
| بوابات الجودة والتوثيق | `vitest_test_files=102` و `go_test_files=33`؛ و26 تأكيد كودي في بوابة التوثيق الصارمة | `node scripts/docs-gate.mjs --strict-refs` ✅ · `tsc --noEmit` ✅ · `eslint` 0 warnings ✅ |

---

## 0.29 سجل تكميلي: هيكلة منظومة الوكلاء ودستور المشروع والأمان المتقدم — 1 أكتوبر 2026

**المرجع:** طلب المالك — «تطوير agents أكثر وفق قواعد تنصيب الوكلاء القياسية للمشاريع» مسبوقاً بجولة تدقيق أمني شاملة.

| البند | التنفيذ | الإثبات |
| --- | --- | --- |
| حل عيب اقتطاع التعليمات (Truncation Bug) | تجزئة `AGENTS.md` (كان 74KB ويقتطع مفسر الذكاء الاصطناعي 51KB منه) إلى 6 ملفات قواعد قطاعية في `.agents/rules/` بترويسات YAML Frontmatter (`trigger: glob` و `trigger: always_on`) وكل ملف بحجم آمن (<19KB) | فحص الأحجام الفعلي على القرص (بين 4.7KB و 18.8KB) |
| دستور المشروع الأعلى (`AGENTS.md`) | إعادة صياغة الدستور بحجم مركز (<11KB) يربط الثوابت المطلقة والمهارات المعمارية الـ 20 وخريطة القواعد | `docs-gate.mjs --strict-refs` (18 مدخلاً في الجرد، 24 تأكيداً) |
| الوكلاء الفرعيون التخصصيون | إنشاء 4 وكلاء في `.agents/agents/`: `canvas_qa_auditor` (محرك Konva والتصدير 300+ DPI)، `backend_wails_architect` (رنتايم Wails v3 و Go)، `supabase_security_officer` (أمان RLS والجلسات)، و `docs_release_gatekeeper` (التوثيق والإصدارات) | اكتشاف آلي كامل في محرك Antigravity |
| مسارات التشغيل القياسية (SOPs) | إنشاء 4 أدلة تشغيل في `.agents/workflows/`: `release-deployment.md`، `database-migration.md`، `security-audit.md`، و `canvas-export-qa.md` | فحص مسارات المراجع الصارم |
| قالب تكوين خادم MCP | `.agents/mcp_config.json` جاهز ومعد لربط Supabase MCP عبر `@modelcontextprotocol/server-postgres` | قراءة ومطابقة المواصفة |
| مواءمة سياسة كلمات المرور وتطهير السجلات | تطبيق حد 8 أحرف + حروف وأرقام في Go والواجهة؛ وتطهير سجلات أخطاء فك التشفير في `auth_flows.go` بالاكتفاء بتسجيل حجم البيانات | `TestLicenseService_PasswordPolicyValidation` + تأكيد كودي في `docs-gate` |

---

## 0.28 سجل تكميلي: الجلسة الواحدة النشطة (Last-Wins) — 1 أكتوبر 2026

**المرجع:** طلب المالك — «لا نهتم بالعتاد بل بالجلسة: عند فتح جلسة جديدة نمنع أي جلسة سابقة على جهاز آخر، مع رسالة صريحة».

| البند | التنفيذ | الإثبات |
| --- | --- | --- |
| جدول الجلسة النشطة | `supabase/migrations/20261001000000_single_active_session.sql`: `public.user_sessions` (سطر واحد لكل مستخدم، `user_id` مفتاح أساسي) + RLS بسياسة `no_direct_session_access` (`FOR ALL USING (false)`) فلا وصول مباشر من العميل | `migration-lint` (23 ملفاً، 0 تحذير) + تأكيد في `docs-gate` |
| دالتا الحجز والفحص | `claim_session(p_session_id, p_app_version)` — UPSERT غير مشروط (آخر دخول يفوز) · `check_session(p_session_id)` — ترجع `active/superseded` وتحدّث `last_seen_at`؛ `SECURITY DEFINER` + `GRANT EXECUTE TO authenticated` فقط | `TestClaimAndCheckSession_LastWins` (دخول ثانٍ يطرد الأول فعلياً عبر HTTP وهمي) |
| إدارة الجلسة في Go | `internal/service/session_manager.go`: `newSessionID` (128-bit من `crypto/rand`)، `claimSession` (لا يحفظ المعرّف إلا بعد تأكيد خادمي — يمنع «الطرد الكاذب»)، `ensureSessionClaimed`، `verifyActiveSession` (فشل الشبكة ⇒ لا طرد)، و`ErrSessionSuperseded` بنص الطرد الصريح | `TestClaimSession_FailedClaimLeavesNoLocalID` + `TestVerifyActiveSession_OfflineGrace` (منفذ مغلق ⇒ الجلسة باقية) + تأكيدان في `docs-gate` |
| تخزين معرّف الجلسة | `internal/utils/crypto.go`: `encryptedTokenPair.SessionID` + `SaveSessionID`/`LoadSessionID`/`ClearSessionID` — نفس الملف AES-GCM بصلاحيات 0600؛ الملفات القديمة (بلا `session_id`) تُقرأ بلا خطأ وتُحجز عند أول تحقق | `TestSessionID_RoundTripAndPreservation` (حفظ/حفاظ Save على الجلسة/مسحها مع إبقاء التوكنات) |
| الحجز عند كل دخول | `auth_flows.go` (تسجيل · OTP · دخول · استعادة كلمة المرور) + `oauth_server.go` (Google) يستدعون `claimSession` بعد حفظ الجلسة؛ `CheckStatus` يحجز إن لم تُحجز ويتحقق من النشاط | `go test ./internal/service/` ✅ |
| الطرد برسالة صريحة | `CheckStatus` يمسح الجلسة ويرجع `ErrSessionSuperseded`؛ `license-slice.ts` (`isSessionSupersededError`/`sessionSupersededMessage`) يصفّر المستخدم ويفتح نافذة الحساب؛ `App.tsx` يعرض `toast` عند الإقلاع والفحص الدوري (كل 5 دقائق) | `test/license-slice.test.ts` (حالة طرد: تصفير + فتح النافذة) |
| `Logout` لا يحذف جلسة الجهاز الآخر | `Logout` يمسح الجلسة المحلية فقط (`utils.ClearSessionID`) + `logout` في Supabase — حذف صف الخادم كان سيفقد أثر الطرد على الجهاز الأقدم | قراءة كود + اختبارات الخدمة |

**البوابات بعد الجلسة:** `go vet ./internal/...` ✅ · `go test ./internal/utils/ ./internal/service/` ✅ · `tsc --noEmit` ✅ · ESLint على الملفات المتغيرة ✅ · Vitest (`license-slice` 16 · `App` 4 · `account-license-modal` 6) ✅ · `docs-gate --strict-refs` (23 تأكيداً) ✅ · `migration-lint` (23 هجرة، 0 تحذير + التحقق الذاتي) ✅.

**ما لا تفعله الميزة (حدود مقصودة):** لا تمنع المشاركة **التتابعية** (تسليم الحساب ساعة ثم استعادته) — الهدف جعلها غير عملية لا منعاً رياضياً؛ ولا تعتمد على بصمة عتاد إطلاقاً (معرّف الجلسة عشوائي لكل دخول)؛ والأوفلاين لا يطرد أبداً (الطرد فقط عند إثبات شبكي).

**مخاطرة مقبولة بقرار تصميمي — UPSERT غير مشروط في `claim_session`:** أي حامل توكن صالح يستطيع حجز الجلسة فوراً، فتوكن مسروق يعني طرد المالك. والمالك يسترد جلسته بإعادة الدخول — أي تبادل طرد متكرر حتى تغيير كلمة المرور. هذا مقصود ضمنياً في خيار «الجلسة» بلا ربط بالعتاد. **تخفيفه المستقبلي المقترح:** تناوب الريفريش + تنبيه بريدي. ⚠️ لا تُسجَّل هذه الملاحظة داخل ملف الهجرة نفسها: `scripts/migration-lint.mjs` يفرض ثبات بصمات الهجرات المُطبَّقة (`supabase/migrations.manifest.json`)، فأي تعليق داخل هجرة سابقة يكسر الـ CI.

---

## 0.27 سجل تكميلي: موثوقية نصوص الملصقات العربية وقابلية النقل (29 سبتمبر 2026)

**المرجع:** طلب المالك — تحسين الملصقات والنصوص العربية (خطة من ثلاث مراحل وُافق عليها، ونُفذت المرحلتان 1 و2 وتحسين الشيت بنسبة ورق الطباعة).

| البند | التنفيذ | الإثبات |
| --- | --- | --- |
| اتجاه RTL/LTR تلقائي + ملاءمة مقاس | `frontend/src/features/stickers/lib/sticker-text.ts` (`detectTextDirection` أول-حرف-قوي · `postProcessStickerSvg` تُستدعى في `StickerStudioDialog` فتغطي كل القوالب: حقن `direction/unicode-bidi` المفقودة + تقليص `font-size` -حتى 84% من `viewBox`، وحد أدنى 55%، وتخطي `textPath`) + تخطي `textTransform` للعربي في `text-node.tsx` | `test/sticker-text.test.ts` (7 حالات — كل القوالب الـ83 XML صالح واتجاه صريح) |
| دقة 300 DPI حقيقية من المليمتر | `stickerRasterSize()`/`mmToPx()` في `sticker-text.ts`، وتُستخدم في الإدراج المفرد/الشيت/تنزيل PNG/النسخ بدل 1200/1000px الثابتة | نفس ملف الاختبار (50مم→591px · 70مم→827px) |
| SVG محمول بخط مضمّن | `lib/sticker-font-embed.ts` (استخراج `@font-face` من stylesheets المبنية، `data:` + كاش، حد وجهين/400KB) + استثناء `<style>` الآمن في `lib/utils.ts` (`isSafeEmbeddedFontStyle` — يحظر `@import`/روابط خارجية/`javascript:`) | `test/sticker-phase2.test.ts` (6 حالات) |
| مصدر متجه محفوظ على العنصر | `StickerElementSource.svg?` + مخطط Zod (توافق خلفي) + «نسخ SVG متجه» في قائمة سياق العنصر (`element-menu-section.tsx`) | حالة المخطط في `sticker-phase2.test.ts` |
| شيت الملصقات بنسبة ورق الطباعة | `sheet-generator.ts` (خيارات مليمترية + علامات قص بمقاسات المطبعة 2مم/5مم أسود) + `resolveStickerSheetMm()` في الاستوديو تستعمل `printSettings` الفعالة (A4 مع احترام landscape) بدل مربع 200×200 | حالة نسبة A4 غير المربعة في نفس الملف |

**البوابات بعد الجلسة:** Vitest (الملفات الأربعة المعنية: sticker-text 7 + sticker-phase2 6 + sticker-templates 13 + svg-safety 9 = 35/35، ثم 26/26 بعد جولة التعديل) ✅ · `tsc --noEmit` ✅ · لم تُلمس ملفات Go ولا عقود IPC.
**الفجوات المتبقية المقصودة (مرحلة 3):** ✅ أُغلقت حدود Die-cut كـ offset-path متجه حقيقي في سجل 0.31 (`lib/die-cut-offset.ts` وطبقة CutContour) · استبدال تشكيل `curved-text-utils.ts` اليدوي بـ HarfBuzz الكامل · اتجاه تلقائي لأعمدة VDP.

---

## 0.26 سجل تكميلي: إغلاق بنود P0 الثلاثة من التقرير 12 (28 سبتمبر 2026)

**المرجع:** طلب المالك — «أصلح بنود P0 الثلاثة: توحيد حدّ الحصة اليومية على مصدر خادمي واحد، ومعالجة ثغرة xlsx في مسار VDP، وتقييد قراءة `.env` بمجلد العمل على وضع التطوير — مع اختبارات وبوابات مرافقة».

**الفروق (الملفات المتغيرة):**

| البند | التنفيذ | الإثبات |
| --- | --- | --- |
| RV-1 (F-01) | `internal/service/ai_service.go`: `aiUsageDayKey` (يوم UTC) + حقل `Baseline` + `AIRateLimiter.Sync` + قراءة `used_today`/`daily_limit` من RPC + `injectServerQuota` · `frontend/src/lib/ai/quota.ts` (وحدة حسم واحدة) · `use-ai-enhance.ts` و`license-slice.ts` (`utcDay`) | `TestAIRateLimiter_UsesUTCForDayKey` (منطقة `TEST+3`) · `TestAIRateLimiter_SyncFromServerIsAuthoritative` · `TestCallAIUsageRPC_ParsesServerQuota` · `TestEnhanceImageWithAI_InjectsServerQuotaSnapshot` · `test/ai-quota.test.ts` (11 حالة) · تأكيدان في `docs-gate` |
| RV-2 (F-02) | `frontend/src/features/stickers/lib/vdp-parser.ts`: `sheetRows`/`preview` بسقف `VDP_PARSE_ROW_LIMIT` + `VDP_MAX_FILE_BYTES` (10MB) + تعطيل الصيغ/الأنماط/HTML/VBA + `dense` + منع أسماء أعمدة خطرة (`__proto__`/`prototype`/`constructor`) | 5 حالات في `test/vdp-parser.test.ts` (تثبيت معاملات `XLSX.read` عبر Mock · رفض ملف ضخم · تلوّث النموذج الأولي) · تأكيد في `docs-gate` · قرار المصدر موثَّق في `SECURITY_NOTICE.md` |
| RV-3 (F-04) | `internal/service/license_service.go`: `loadEnvConfigFile(appDir, allowCwdFallback)` · `internal/service/devmode_{dev,prod}.go` (وسم `dev`) · `internal/utils/devmode.go` · `main.go` (تفويض `isDevMode`) | `TestLoadEnvConfigFile_DevOnlyCwdFallback` (يُثبت تجاهل `.env` المهاجم من مجلد العمل) · تأكيد في `docs-gate` |

**البوابات بعد الإغلاق:** `go vet ./internal/...` + `go test ./internal/...` ✅ (160 دالة في 31 ملفاً) · Vitest **95 ملفاً / 766 ناجحاً + 1 متخطّى (767)** ✅ · `tsc --noEmit` ✅ · ESLint `--max-warnings 0` ✅ · `docs-gate --strict-refs` **16 تأكيداً** ✅ (كانت 12).

**ملاحظة على RV-2:** البند أُغلق بـ«تخفيف موثَّق» لا بإزالة الثغرة — إزالة `No fix available` تتطلب تغيير مصدر المكتبة (SheetJS المصونة من `cdn.sheetjs.com`) أو إسقاط مسار `xlsx`، وهو قرار المالك في `SECURITY_NOTICE.md`.

---

## 0.26 إطلاق v1.9.6: إغلاق بنود P0 وتحصين الحصص والنوافذ (28 سبتمبر 2026)

**المرجع:** إطلاق الإصدار 1.9.6 بعد إغلاق كافة بنود التدقيق P0 واجتياز دورة الـ CI السحابية الكاملة 10/10 بنجاح.

**المنفَّذ والمثبَّت:**
1. **حصة الذكاء الاصطناعي (F-01):** توحيد مفتاح اليوم على UTC، تصفير لقطة الخادم فوراً عند الخروج وعزلها حسب البريد والباقة لمنع حجب الرصيد بلقطات قديمة.
2. **تحصين تفكيك Excel (F-02):** تقييد القراءة بـ `sheetRows` و `VDP_MAX_ROWS` ومنع تلوث النموذج الأولي وتفرد أسماء الأعمدة.
3. **تحصين بيئة التطوير (F-04):** قصر ارتداد `.env` على البناء الموسوم بـ `-tags dev` وفحص لاحقة اسم التنفيذي فقط دون المسار.
4. **تحسين تجربة زر التكبير ونوافذ التقسيم (Snap Assist):** رفع مهلة التحويم إلى 800ms وإلغاء المؤقت فورياً عند النقر لمنع التداخل مع نية المستخدم.
5. **البوابات:** تشغيل كل البوابات بنجاح (`vitest` 95 ملفاً / 767 اختباراً، `docs-gate` 16 تأكيداً، ودورة CI السحابية 10/10 كاملة).

---

## 0.25 سجل تكميلي: مراجعة كاملة من الألف إلى الياء لكل التطبيق (28 سبتمبر 2026)

**المرجع:** طلب المالك — «مراجعة كاملة للتطبيق من الألف إلى الياء لا تترك ولا حرف خلفك».

**المنفَّذ:** تدقيق كامل لكل الطبقات بتشغيل بوابات الجودة فعلياً وقراءة الكود مباشرة (لا نقل من تقارير)
+ إنشاء `docs/reviews/11-full-app-review-2026-09-28.md` (التقرير 12) بخطة أولويات P0/P1/P2.

**نتائج البوابات (مخرجات أوامر مُشغَّلة، لا منقولة):** `tsc --noEmit` ✅ · ESLint `--max-warnings 0` على `src`+`test`+`e2e` ✅ · Vitest **94 ملفاً / 749 ناجحاً + 1 متخطّى (750)** ✅ ·
`go vet ./internal/...` + `go test ./internal/...` ✅ · `docs-gate --strict-refs` (12 تأكيداً) ✅ · `migration-lint` 22 هجرة ✅ · `release --check` 1.9.5 ✅ ·
`admin-web` (oxlint 0 + `npm run build`) ✅ · `npx playwright test --list` = **165 حالة / 25 ملف** ✅ · `npm audit --omit=dev` ⚠️ (1 عالية في الواجهة + 2 في admin-web).

| البند | التحديث | الحالة |
| --- | --- | --- |
| RV-1 | ⬆️ **أُغلق في 0.26.** **تناقض حدّ اليوم للذكاء الاصطناعي (P0):** يوم محلي في العميل/المُقيِّد المحلي (`use-ai-enhance.ts:53-61` و`ai_service.go:96,118`) مقابل يوم UTC في المرجع الخادمي (`20260730000001_server_side_ai_quota.sql:44`) ⇒ مستخدم UTC+3 يرى «المتبقي 5/5» والخدمة ترفض الطلب بين 00:00 و03:00 محلياً. الأصح: عرض `used_today`/`daily_limit` من رد الـRPC (يعيدهما أصلاً) + يوم UTC محلياً. | ✅ مغلق |
| RV-2 | ⬆️ **أُغلق في 0.26 (بتخفيف موثَّق).** **ثغرة اعتمادية بلا إصلاح `xlsx` (P0):** GHSA-4r6h-8v6p-xvw6 + GHSA-5pgg-2g8v-p4x9، والمستهلك مسار الطباعة بالبيانات المتغيرة بلا سقف تفكيك (`vdp-parser.ts`). | ✅ مغلق |
| RV-3 | ⬆️ **أُغلق في 0.26.** **`.env` من مجلد العمل (P0):** `license_service.go:86` يرتد إلى `".env"` النسبي بلا `isDevMode()` ⇒ إمكان إعادة توجيه مصادقة الحساب وخادم الذكاء الاصطناعي. | ✅ مغلق |
| RV-4 | **ملاحظات الإنتاج (P1):** ترحيل 26 استدعاء مباشر في العمليات الحساسة (الطباعة، المشاريع، الإدراج الدفعي، أشرطة الأدوات) إلى `createLogger` — انخفاض استدعاءات `console.error` المباشرة من 105 إلى 79 استدعاءً. | 🔶 جزئي (26 مُرحّلاً) |
| RV-5 | **SVG مخزَّن (P1):** يُخدَم بلا تعقيم في نفس أصل التطبيق (`media_service.go:445-479` + `main.go:599-607`). تعقيم الملصقات مُصلَح فعلاً (`utils.ts:49-73` + `test/svg-safety.test.ts`) — المتبقّي مسار التخزين/الخدمة. | ❌ مفتوح |
| RV-6 | ⬆️ **أُغلق في 0.35.** **دالة Edge `license` ميتة بصلاحية `service_role` (P1):** حُذفت الدالة المتروكة (`supabase/functions/license/index.ts`) بالكامل بعد موافقة المالك، لتصفير السطح المعرض للخطر. | ✅ مغلق |
| RV-7 | **مهلة 120s في الواجهة (P1):** تحرق حصة AI بلا صورة لأن مهلة الخلفية 3 دقائق وحاوية Modal 600 ثانية والتسجيل بعد المعالجة. | ❌ مفتوح |
| RV-8 | **تحقّق إيجابي:** كل ادعاءات الإغلاق في `BUGS_REPORT.md` صحيحة بالكود (لا خصم مزدوج · كتابة ذرية · Path Traversal في موضعين · `-w -s` · توافق الإصدار)، وثلاثة ادعاءات سابقة فقط انحرفت (مُحصّن SVG، سقوف 09، رقم README). | ✅ متحقَّق |
| RV-9 | **تحديث التوثيق المرافق:** إضافة التقرير 12 إلى `docs/reviews/README.md` (صف + ملخص) وإدخال `CHANGELOG.md` تحت `[Unreleased]` وسجل الجلسة هذا. | ✅ |

**الفجوات المتبقية (P0/P1/P2):** انظر القسم 6 من التقرير 12 — 3 بنود P0 (RV-1..RV-3) **أُغلقت جميعاً في 0.26**، 4 بنود P1 (RV-4..RV-7)،
و5 بنود P2 (`p_check_only` الصريح · خريطة امتدادات AVIF/HEIC · حذف سقالات `build/ios` و`build/android` لجعل `go vet ./...` و`go build ./...` يعملان · حارس يربط أرقام الحصص الثلاثة · تصحيح رقم README).

---

## 0.24 سجل تكميلي: ترسيخ التعلم (/learn) — حراس الـ CI وبوابات الجودة للإصدارات ومزامنة ألواح العمل (28 سبتمبر 2026)

**المرجع:** تنفيذ أمر ترسيخ التعلم (`/learn`) وتطبيق الدروس المستفادة من تراجعات CI السحابية عبر صياغة قواعد ملزمة وتحديث أدلة المهارات وبوابات الإطلاق.

**المنفَّذ والمثبَّت:**
1. **حارس المراقبة الإلزامية بعد الدفع (`AGENTS.md` و `grido-qa-security-auditor`):** إلزام الوكلاء بمراقبة دورة الـ CI السحابية فورياً بعد أي عملية دفع `git push` أو رفع وسم إصدار عبر أوامر GitHub CLI (`gh run list`, `gh run watch`) ومنع إنهاء الجلسة أو تسليم المهام قبل التأكد من اكتمال كافة الوظائف بنجاح.
2. **بوابة سلامة الـ CI قبل إطلاق أي إصدار (Pre-Release CI Health Gate):** اشتراط نجاح آخر دورة CI كاملة على الفرع الرئيسي بنسبة 100% (`completed success`) كشرط مسبق إلزامي لتنفيذ `scripts/release.mjs` ومنع ترفيع أو إطلاق أي إصدار في حال وجود تراجع معلق.
3. **حارس المزامنة التلقائية لألواح العمل (`Workspace Drawer Selection Sync Invariant`):** توثيق إلزامية تحويل اللوحة النشطة فورياً إلى لوحة الخصائص (`properties`) عند تحديد أي عنصر نشط على الكانفاس لتفادي تراجع اختبارات خصائص العناصر ومحددات E2E.
4. **نجاح إصدار وبناء v1.9.5:** اكتمال سير العمل `Build & Release Desktop App` بنجاح وتوليد حزم التوزيع في Releases.

| البند | التحديث | الحالة |
| --- | --- | --- |
| LRN-1 | **حارس الـ CI بعد الدفع (`AGENTS.md`):** إلزامية تشغيل `gh run list` و `gh run watch` ومنع إنهاء الجلسات على فشل. | ✅ |
| LRN-2 | **بوابة الإصدارات (`grido-qa-security-auditor`):** التحقق من سلامة آخر CI على `main` قبل إطلاق أي إصدار. | ✅ |
| LRN-3 | **حارس ألواح العمل (`AGENTS.md`):** مزامنة التحديد النشط مع لوحة الخصائص وحماية تخطيط الكانفاس. | ✅ |
| LRN-4 | **إطلاق v1.9.5:** اكتمال البناء السحابي وإصدار الحزم بنجاح 10/10. | ✅ |

---

## 0.25 سجل جلسة: تحسين تصميم تبويب «المفضلة وآخر استخدام» (1 أكتوبر 2026)

**المرجع:** طلب المالك «حسّن تصميم تبويب المفضلة وآخر استخدام». النطاق: `freeform-library-tab.tsx` وحده (لا تغيير منطقي).

**ما أُنجز:** روجعت اللوحة بصرياً عبر معاينة معزولة (التطبيق مقفول بالترخيص فلا يمكن الوصول للوحة من الواجهة الكاملة):
1. **معاينات الأشكال صارت الشكل الحقيقي:** كانت المثلث/القلب/المعين/الدرع/السهم/المسدّس/النجمة كلها **مربًّعات ملوّنة متطابقة** لا يفترق بعضها إلا باللون. الآن تُرسم بـSVG (مسار 24×24 الموجود في `svg-paths.ts`) والنجمة بمسار مضمَّن والخط الفاصل بشريط أفقي. أثر واضح: صار بالإمكان التعرّف على الشكل بنظرة.
2. **إزالة تكرار عنوان بطاقات النصوص:** كانت بطاقة النص تعرض نص العيّنة كمعاينة **ثم** التسمية (يظهر «عنوان رئيسي» مرتين). صارت المعاينة بصمة لونية 20×20 ببادئة «Aa» — عرض موحّد بلا فوضى.
3. **توحيد شرائح «آخر استخدام»:** كانت أزراراً بتداخل حدود متغيّرة وعناوين ملفوفة على أسطر؛ صارت شريحة واحدة الارتفاع بعرض معاينة ثابت وقصّ نصّي.
4. **تمييز المفضّلة:** بطاقة المفضّل بخلفية/حدّ كهرماني خفيف ونجمة ممتلئة دائمة، ونجمة غير المفضّل تظهر عند التمرير/التركيز فقط → تقليل الضجيج البصري مع بقاء العناصر كاملة الوصولية.

**التحقق:** `freeform-library-tab.test.tsx` (5 حالات) ✅ · `tsc --noEmit` ✅ · `eslint --max-warnings 0` ✅ · معاينة حيّة في الوضعين الفاتح والداكن بلا أخطاء من المكوّن. لا تغيير في المنطق أو نصوص الوصولية التي تعتمدها الاختبارات. (ملفات معاينة مؤقتة أُنشئت للإثبات ثم حُذفت.)

---

## 0.24 سجل جلسة: تدقيق آلية مسح المستندات وإغلاق تغطية مسار OpenCV (1 أكتوبر 2026)

**المرجع:** طلب المالك «مراجعة آلية مسح المستندات بشكل أدق» ثم اختيار مخرج «تقرير موثَّق بالأدلة»، وبعده تنفيذ «إضافة اختبارات وحدة لمسار كشف OpenCV بمحاكاة واجهة cv الهيكلية»، ثم «استبدال مقياس التداخل المعتمد على المستطيل المحيط بتقاطع مضلع‑مضلع حقيقي مع إعادة معايرة العتبات».

**ما أُنجز:**
1. **تقرير تدقيق معمّق** `docs/reviews/13-document-scanner-mechanism-review-2026-10-01.md`: شرح الآلية خطوة بخطوة (ثلاثة محرّكات كشف + دمج عصبي + استعدال + فلترة) مع 12 بنداً موثّقاً بالأدلة، وتحققات إيجابية تمنع «إصلاحات» تلحق ضرراً.
2. **قياس مستقل لخطأ مقياس التداخل:** مقارنة تنفيذ `computeQuadOverlapStats` (AABB) بتقاطع مضلع‑مضلع حقيقي (Sutherland–Hodgman): **0.417 مقابل 0.052 = 8× مبالغة**، ونفس الزوج يُخمَد بميل 25° ويُبقى بلا ميل ⇒ خطر إسقاط مستند حقيقي في نمط «متعدد البطاقات» (بند P1 مفتوح).
3. **إغلاق F-02 (P1):** لم يكن لـ`opencv-detector.ts` أي تغطية فعلية — الـWASM لا يتهيأ في jsdom والقياس 0% statements (الأسطر 37–584). أُنشئ `__tests__/opencv-detector.test.ts` (8 حالات) بحقن محاكاة هيكلية في `globalThis.cv` (نقطة الحقن موجودة أصلاً في `getLoadedOpenCV()` — صفر تعديل على كود الإنتاج) ⇒ **0% ← 91.2% statements / 94.4% lines**.
4. **تحقق الطفرات:** تعطيل حارس `isDeleted` أو تخطّي حلقة `matsToFree` ⇒ تفشل 7 من 8 حالات فوراً (رصد حذف مزدوج/تسريب) — التأكيدات ليست شكلية.
5. **بند جديد (F-12 · P2):** القصّ التلقائي للبطاقات المكدسة يضيّع نية القصّ (`aspectType: "id_card"`) لأن الكاشفين يعيدان الاستنتاج الهندسي (`opencv-detector.ts:542` · `document-detector.ts:536`) ⇒ شطران أفقياً يُسمّيان `a4_p`/`free` ويُصدَّران بنسبة A4 (تشويه ~11%). المسار اليدوي «تقسيم البطاقات» سليم.
6. **إغلاق F-01 (P1) — تقاطع مضلع‑مضلع حقيقي:** `computeQuadOverlapStats` صارت تقصّ المضلع الأصغر عبر أضلاع الأكبر (Sutherland–Hodgman) وتحسب مساحة Shoelace، مع إبقاء AABB كفحص رفض سريع مسبق واحتياط وحيد للمضلع غير المحدّب؛ أُضيفت 6 حالات إثبات في `__tests__/scanner-hardening.test.ts` منها **«مستندان مائلان 25° متباعدان لا يُدمجان»**، وتحقّق طفرة يُفشل الحالتين الجوهريتين عند الرجوع إلى AABB.
7. **إعادة معايرة العتبات (نتيجة مُعلَنة: بلا تغيير رقمي):** عتبات `applyNMS` (0.38/0.60/1.30×/0.45/0.30) وعتبات الدمج (0.55/0.35/0.8) صحيحة كما هي لأنها مُعايَرة في الإطار المحاذي حيث AABB = الحقيقة، والتضخّم لم يكن يساعد على إخماد التكرار الحقيقي؛ أُضيف تعليق صريح فوق `applyNMS`. البوابات: `tsc` ✅ · `eslint --max-warnings 0` ✅ · كامل Vitest **828 حالة (827+1) في 101 ملفاً** ✅.
8. **سطح معايرة موحّد لعتبات التداخل (consolidation):** أُنشئ `core/overlap-tuning.ts` كمصدر واحد موثّق لكل عتبة تُفسّر `computeQuadOverlapStats` — NMS (0.38/0.60/1.30×/0.45 · iou 0.30 و0.40) والدمج العصبي (0.55/0.35 · منع احتواء 0.75 · استبدال احتواء 0.80/1.35) وفحص الثنوية (0.25 · نسبة مساحة 1.7) — بدل توزّعها على ثلاثة ملفات، وأُزيل الرقمان السحريان `0.8`/`1.35` من `detect-fusion` وصارت `ML_CONFIRM_IOU`/`ML_MISS_IOU`/`ML_CONTAINMENT_BLOCK` مشتقّة منه؛ يثبّته `__tests__/overlap-tuning.test.ts` (5 حالات: قيم صريحة + علاقات + ارتباط fusion + سلوك حدّي لـNMS). لا تغيير سلوكي.

| البند | التحديث | الحالة |
| --- | --- | --- |
| SCN-1 | **تقرير المراجعة 13:** جرد الـ8 محركات/مراحل + 12 بنداً بالأدلة + خطة عمل مرتّبة + قياس تداخل مستقل. | ✅ |
| SCN-2 | **تغطية مسار OpenCV:** صفر ← 91.2% statements / 94.4% lines بـ8 حالات محاكاة هيكلية (تنظيف + single/multi + قصّ مكدس رأسي/أفقي + بوابتا رفض). | ✅ |
| SCN-3 | **أرقام المرجعية:** `vitest_test_files` 99 ← **101** والحالات **807** (806+1) في `docs/DOCUMENTATION_MAP.md` + `docs/testing_guide.md` — ثم **813** (812+1) بعد 6 حالات تقاطع المضلعات، و**818** (817+1) بعد 8 حالات opencv + 5 حالات سطح المعايرة، و**828** (827+1) بعد 10 حالات توسعة (تفاضلي عشوائي للمقياس + حدود NMS + فرع استبدال الاحتواء). | ✅ |
| SCN-4 | **مقياس التداخل (F-01): أُغلق** — تقاطع مضلع‑مضلع حقيقي (Sutherland–Hodgman + Shoelace) مع إبقاء AABB كفحص رفض/احتياط؛ وإعادة معايرة العتبات أثبتت أنها صحيحة كما هي (بلا تغيير رقمي) لكونها محسوبة في الإطار المحاذي؛ و6 حالات إثبات منها «مستندان مائلان 25° متباعدان لا يُدمجان». | ✅ |
| SCN-6 | **نوع المستند المقسوم (F-12): أُغلق في 0.35** — الحفاظ على `cand.aspectType` (`id_card`) وتمريره للمستندات الناتجة عن الشطر في `opencv-detector.ts` و`document-detector.ts` بدل إعادة الاستدلال الهندسي الخاطئ، ومثبَّت باختبار انحدار في `scanner-hardening.test.ts`. | ✅ |
| SCN-5 | **عطل بنية تشغيل:** فشل بدء عامل واحد في التشغيل الجماعي لـ`test/batch-insert-dialog.test.tsx` (الملف ينجح منفرداً 3/3) — يستحق متابعة مستقلة. | ⏳ |
| SCN-7 | **سطح المعايرة الموحّد:** `core/overlap-tuning.ts` مصدر واحد موثّق لعتبات التداخل وNMS/الدمج + `__tests__/overlap-tuning.test.ts` يثبّتها ويثبت سلوكها الحدّي. | ✅ |

---

## 0.23 سجل تكميلي: تشخيص وإصلاح حالات فشل CI ومواءمة E2E مع فتح اللوحة الافتراضية (28 سبتمبر 2026)

**المرجع:** فحص سجلات فشل خط أنابيب GitHub Actions (فشل متكرر عبر 6 دفعات منذ الالتزام `3c4b4ff` في اختبارات Playwright E2E وWebKit Smoke).

**الأسباب الجذرية المُثبَّتة والمعالجة:**
1. **مزامنة لوحة الخصائص في الشاشات القياسية (`App.tsx`):** بعد تغيير السلوك الافتراضي لبدء الشريط بلوحة القوالب، كان إدراج عنصر أو تحديده على الكانفاس يُبقي اللوحة على القوالب ويحجب لوحة الخصائص (`PropertiesPanel`). أُضيفت مزامنة تفاعلية تفتح الخصائص فورياً عند تحديد أي عنصر جديد (`selectedId`).
2. **اختبار دخان المحرك (`engine-smoke.spec.ts`):** عند الإقلاع أصبح التبويب الأول نشطاً افتراضياً، فكان النقر عليه يغلقه (`data-collapsed="true"`) بدلاً من فتحه. حُدّث الاختبار للتحقق من نشاطه ثم اختبار التبديل لأداة ثانية.
3. **اختبارات التخطيط المتجاوب (`workspace-layout.spec.ts`):** تعديل شرط العرض في 1440px إلى `toBeGreaterThanOrEqual(800)` نظراً لظهور درجي القوالب والمفتش معاً (1440 - 48 - 296 - 296 = 800px)، واختبار ملاءمة العرض في 1920px بإغلاق الدرج الأيسر لإتاحة العرض الكامل.

| البند | التحديث | الحالة |
| --- | --- | --- |
| CI-1 | **مزامنة الخصائص عند التحديد (`App.tsx`):** فتح تلقائي للوحة الخصائص عند تحديد أي عنصر في المقاس القياسي. | ✅ |
| CI-2 | **مواءمة اختبارات E2E:** نجاح كافة اختبارات الدخان (`engine-smoke.spec.ts` 3/3)، الخصائص (`element-properties.spec.ts` 1/1)، الصورة والتحويل (`single-photo` + `transformer` 4/4)، والتخطيط (`workspace-layout.spec.ts` 8/8). | ✅ |
| CI-3 | **بوابة التوثيق:** تحديث `vitest_test_files` إلى 94 في `docs/DOCUMENTATION_MAP.md` واجتياز `docs-gate.mjs` بنجاح كامل. | ✅ |

---

## 0.22 سجل تكميلي: إدراج ملصق من الاستوديو في وضع الكولاج كان يُنتج عنصراً غير مرئي (28 سبتمبر 2026)

**المرجع:** جلسة تشغيل حي (`wails3 dev` + التحكم بالواجهة عبر جسر المتصفح ومراقبة أداء) — اكتشاف سلوكي أثناء التجربة الفعلية لمسارات الملفات المعدلة.

**نتائج مراقبة الأداء (وضع المتصفح، A4/300DPI):** FPS خمول 60.1 · FPS أثناء تعديل فتحات الكولاج الحر 59.9 (p95=17ms) · TTFB 62ms · الذاكرة 509→513MB مستقرة بلا تسريب · إطار بطيء وحيد 83ms عند تطبيق تغيير أبعاد فتحة (غير محسوس — مؤجل لجلسة تحسين). أخطاء الكونسول كلها 404 من جسر Wails في وضع المتصفح فقط (متوقعة) — لا أخطاء واجهة فعلية.

**الخلل المُثبَّت:** إدراج ملصق (أو حفظ إعادة تحريره) بينما المستخدم في وضع الكولاج كان يضيف العنصر إلى `elements` — طبقة لا تُرسم إلا في وضع التعديل الحر (`KonvaSingleLayer` عند `mode === 'single'` فقط في `konva-canvas.tsx`) — فيبدو الإدراج فاشلاً، ثم يُمسح العنصر صامتاً عند أي تبديل وضع لاحق (قرار P1-19: دخول الكولاج يمسح عناصر الحر).

| البند | التحديث | الحالة |
| --- | --- | --- |
| ST-1 | **انتقال تلقائي للوضع الحر قبل الإدراج/إعادة التحرير (`StickerStudioDialog.tsx`):** `setMode('single')` قبل `addImageElement`/`updateElement` مع toast توضيحي «انتقلت إلى وضع التعديل الحر لإدراج الملصق» — نفس علاج `addImageFromSrc` بخيار `setSingleMode` الموجود للصور العادية، ويشمل مسار إعادة التحرير (عنصر أُدرج سابقاً ثم غادر المستخدم وضعه). | ✅ |
| TS-3 | **تحقق حي + اختبارات:** سيناريو الإدراج من وضع الكولاج جُرّب حياً عبر جسر المتصفح (انتقل للوضع الحر والملصق ظاهر فوراً) · `tsc --noEmit` ✅ · vitest (sticker/editor-store/element-slice/collage-custom-grid-tab) 65/65 ✅ · بوابة التوثيق ✅. | ✅ |

**قرار محمي لم يُنقض:** قرار P1-19 (الدخول للكولاج يمسح عناصر الحر) باقٍ كما هو — الإصلاح يمنع الوصول لعنصر في المسار الذي كان يعرضه للفقد الصامت، ولا يغيّر دلالات تبديل الوضع.

**الفجوات المتبقية (اختيارية، منخفضة):** إطار الـ83ms عند تطبيق أبعاد فتحة الكولاج الحر (تحسين لاحق) · الملصق المدرج لا يظهر في وضع الكولاج بتصميم الوضعين الحالي — بديل مستقبلي: تحويل تلقائي للملصق إلى خانة أو عرض تحذيري عند الإدراج في وضع الكولاج بدل التبديل.

---

## 0.21 سجل تكميلي: تثبيت مؤشر الماوس في المساطر على حافة بكسل مادية (28 سبتمبر 2026)

**المرجع:** تابع لجلسة 0.20 — إغلاق فجوة تثبيت البكسل على مؤشر الماوس داخل المساطر.

**المنفَّذ والمختبر (`tsc --noEmit` ✅ · `eslint` صفر تحذيرات ✅ · اختبارات المساطر 9/9 ✅):**

| البند | التحديث | الحالة |
| --- | --- | --- |
| RU-2 | **تثبيت مؤشر الماوس (`use-ruler-metrics.ts`):** إحداثيات المؤشر تُقرَّب لأقرب حافة بكسل مادية (`devicePixelRatio`) قبل `setAttribute` — كان المؤشر يقع على كسور بكسل فيظهر 2px ضبابياً متغير السمك. الخط الآن 1px حاد ثابت في كل موضع. | ✅ |
| TS-2 | **اختبارات وحدة `snapGuidePosToPixel` (تكميل جلسة 0.20):** 6 حالات في `test/user-guides-pixel-snap.test.ts` (dpr 1/1.25/1.5/2، أبعاد كسرية، حدود، مدخلات منحلة). | ✅ |

**الفجوات المتبقية (اختيارية، منخفضة):** `editor-canvas.tsx` لا يمرر `selectionBoundsX/Y` بعد لتفعيل شريط التحديد الحي · أيقونة سلة لعنصر المسح في قائمة المزيد · اختصار لوحة مفاتيح لمسح مساحة العمل.

**تكميل لاحق في نفس اليوم:** استبدال أيقونة زر التصدير من `ArrowExportLtr` (سهم أفقي يوحي باتجاه LTR معكوس في RTL) إلى `ArrowExportUp` (سهم صاعد من صينية — محايد الاتجاه، الرمز الكلاسيكي للتصدير) في `icons.tsx`، مع الاحتفاظ بالقديمة باسم `ExportLtr` للتوافق. الأثر يمتد تلقائياً لزر التصدير في الشريط وقائمة سطح المكتب (الاسم المشترك `Export`). تكميل آخر: رفع ارتفاع بطاقات «مقاس الصورة» في تبويب الشبكة المخصصة من h-8 إلى min-h-[52px] مع تكبير الرسم المصغر وتباعد أسطر أرحب (كانت مضغوطة عمودياً).

---

## 0.20 سجل جلسة تحسين المساطر وإعادة توزيع الشريط وإصلاح الخطوط الإرشادية (28 سبتمبر 2026)

**المرجع:** طلب المالك — «حسّن شكل المساطر» ثم «حسّن توزيع عناصر شريط الأدوات بأفضل توزيع ممكن واحترافي» ثم «لماذا خطوط الإرشاد المسحوبة من المساطر تظهر بسمك مختلف وعشوائي في كل سحبة؟».

**المنفَّذ والمختبر (`tsc --noEmit` ✅ · `eslint` صفر تحذيرات ✅ · اختبارات ذات صلة: 56+ حالة ✅):**

| البند | التحديث | الحالة |
| --- | --- | --- |
| RU-1 | **تحسين شكل المساطر (`ruler.tsx`):** ظل حواف الورقة (تدرج 5px بنمط Figma)، علامة صفر مثلثة (Photoshop)، تظليل هوامش الصفحة (خاصية `marginPx` كانت تُمرَّر ولا تُرسم)، شريط تحديد العنصر المُسقَط (خاصية `selectionBounds` المهملة كذلك)، هالة الأرقام (`paintOrder: stroke`)، ومؤشر ماوس أنعم. | ✅ |
| TB-1 | **إعادة توزيع شريط الأدوات بمنطق تدفق العمل:** زر المسح الأحمر انتقل لقائمة «المزيد» عبر `grido:clear-canvas-request` (الإجراءات المدمّرة لا تُثبَّت — مبدأ Fluent؛ نافذة التأكيد بقيت في `toolbar-file-ops.tsx`)، وزر النقل للكولاج جُمِّع مع أدوات الإضافة، وحُذف كود ميت (`handleClearCanvas` + استيراد `Broom`). | ✅ |
| GD-1 | **إصلاح السمك العشوائي للخطوط الإرشادية:** دالة `snapGuidePosToPixel()` تُقرّب الموضع لأقرب حافة بكسل مادية (devicePixelRatio) عند بدء السحب ومتابعته (قبل المغناطيسية) وعند الرسم بصرياً — الخط كان يقع بين بكسلين فيظهر 2px ضبابي أو 1px حاد عشوائياً حسب موضع الإفلات. القيمة المخزنة وأهداف المحاذاة لم تتأثرا. | ✅ |

**قرارات محمية لم تُنقض:** تثبيت التراجع/الإعادة في الشريط (منع Layout Shift) · أزرار الحفظ/الطباعة/التصدير في أقصى اليسار مع غلافها · حارس توحيد ارتفاع الأزرار (h-8) · منطق التدريج الثلاثي والخطوات التكيفية للمساطر · دلالات تخزين مواضع الخطوط الإرشادية (0..1 نسبي).

**الفجوات المتبقية من هذه الجلسة (اختيارية، منخفضة):** تثبيت البكسل على مؤشر الماوس داخل المساطر (أُنجز لاحقاً — انظر 0.21) · `editor-canvas.tsx` لا يمرر `selectionBoundsX/Y` بعد لتفعيل شريط التحديد الحي · أيقونة سلة لعنصر المسح في قائمة المزيد.

---

## 0.19 سجل جلسة نقل التصميم إلى الكولاج، مواءمة قصّة الخانات، اتساق الأيقونات، وفتح التبويب الأول افتراضياً (27 سبتمبر 2026)

**المرجع:** طلب المالك — «راجع التعديلات الأخيرة بشكل كامل ومفصل» ثم «وجود أيقونات باللون الأزرق دون تفعيلها يوحي بأنها مفعّلة» ثم فتح لوحة التبويب الأول في الشريط الجانبي افتراضياً عند الإقلاع.

**المنفَّذ والمختبر (`vitest` 92/92 ملفاً و737/738 حالة ✅ · `tsc --noEmit` ✅ · `eslint` للملفات المعدّلة ✅ · `docs-gate --strict-refs` ✅):**

| البند | التحديث | الحالة |
| --- | --- | --- |
| TR-1 | **زر «تكرار في الكولاج»:** نقل التصميم الحر إلى شبكة الكولاج بلقطة واحدة (`exportCanvas("png", 1, stage, { watermark: false })`) وإدراجها في خانات الكولاج الحالية بدفعة واحدة عبر `setSlotImagesBatch` — بلا تغيير مقاس الكانفاس أو اتجاهه أو قالبه، ويظهر في الوضع الحر فقط. ملفات: `toolbar-transfer-to-collage.tsx` + توصيل في `toolbar.tsx` و`toolbar-items.tsx` + أيقونة `TableArrowRepeatAll`. | ✅ |
| TR-2 | **دالة توزيع موحّدة `buildCollageInsertAssignments`:** استخراج منطق التوزيع من `use-image-drop.ts` إلى دالة نقية يشترك فيها مسارا الإسقاط والنقل (بلا تغيير سلوكي — مطابقة سطراً بسطر مع الكود المستخرَج). | ✅ |
| TR-3 | **خيار `watermark` في `exportCanvas`:** افتراضيه `true` (كل مسارات التسليم محفوظة) و`false` للالتقاطات الوسيطة فقط — يمنع ظهور العلامة مرتين بعد تصدير الكولاج. | ✅ |
| CV-1 | **مواءمة قصّة خانات الكولاج مع نسخة العرض:** الحسابات كلها في فضاء النسخة المخفّضة (2048px) مع تحويل الإزاحات `srcToShown` وحارس صفري — يعالج ظهور الصور الكبيرة (لقطة النقل 2480px+) مصغَّرة ومزاحة داخل الخلية. دلالات المتجر والتعريفات في التصدير/الطباعة لم تتغيّر (المحرر كان المخالف الوحيد). | ✅ |
| CV-2 | **فضاء سحب موحّد:** `accumulatedDrag`/`dragStartRef` في فضاء العرض حصراً + مزامنة معتمدة على النسبة، فلا قفزة عند أول سحب لصورة مخفّضة وتطابق تام مع المصدر/المطبوع. | ✅ |
| UI-1 | **إزالة الأزرق الدائم من أيقونات أوامر الشريط:** `تكرار في الكولاج` (جديد) + أيقونة استوديو الملصقات (`toolbar-add-tools.tsx:90`) + زر «تجميع العناصر» (`toolbar-selection-tools.tsx:111`) صارت ترث حالة الزر (رمادي في الراحة → داكن عند التمرير) بدل اللون الأساسي الدائم الذي كان يوحي بتفعيل غير حقيقي. الألوان الدلالية المقصودة (فك التجميع كهرماني، حذف أحمر) بقيت كما هي. **تصحيح مؤرَّخ (2026-10-21 — الجلسة 1.29):** حُذف `toolbar-add-tools.tsx` مع مجموعة الإضافة، وانتقل حوار استوديو الملصقات إلى `sticker-studio-host.tsx` المفتوح من تبويب العناصر. | ✅ |
| PN-1 | **فتح لوحة التبويب الأول افتراضياً للشريط الجانبي (`useWorkspacePanels`):** في المقاس القياسي (`standard`) والمقاس العريض (`wide`)، تفتح لوحة التبويب الأول افتراضياً عند الإقلاع («شبكة الكولاج» في الكولاج، و«الطبقات» في الوضع الحر)، مع الحفاظ التام على تفضيلات المستخدم في `localStorage` ووضع التركيز والتنقل المستقر. | ✅ |
| TS-1 | **تغطية اختبارات جديدة (4 ملفات / 17 حالة):** `collage-insert.test.ts` (6) · `collage-image-crop.test.tsx` (4 — منها انحدار الإطار ودورة السحب) · `export-canvas-watermark.test.ts` (2) · `toolbar-transfer-to-collage.test.tsx` (5). | ✅ |
| DC-1 | **مزامنة التوثيق:** تحديث `vitest_test_files` وعدد الحالات في بلوك `docs-metrics` + جدول الأرقام في `docs/DOCUMENTATION_MAP.md`، وإدخالات `CHANGELOG.md` تحت `[Unreleased]`. | ✅ |

**قرارات محمية في تلك الجلسة:** ~~الافتراضي في `exportCanvas` يبقى تطبيق العلامة المائية على كل مسارات التسليم~~ (نُقض بطلب المالك في 2026-10-21 — الجلسة 1.18 حذفت العلامة نهائياً) · لا تغيير في مخطط بيانات المشروع أو صيغة `ProjectFileV1` · الزر الجديد يستخدم مسارات الستور القياسية (`setMode` + `setSlotImagesBatch`) بلا كود ستور جديد · حُرّاس الواجهة (`StageProvider`، `physicalLayout`) كما هي.

**الفجوات المتبقية من هذه الجلسة (اختيارية، منخفضة):** مرجع `useStageRef` الاحتياطي مشترك على مستوى الوحدة (يُفضَّل `useRef` لكل مستدعٍ) · فحص «لا خانات» في زر النقل يقع بعد `setMode` · اختبار `dragBoundFunc` بحركة غير صفرية · أيقونات الأزرار ذات النصوص («تصدير»، «إدراج») وأدوات AI تبقى أساسية عمداً كإجراءات أساسية/هوية مجموعة.

---

## 0.18 سجل جلسة الطباعة بالبيانات المتغيرة (VDP)، التراجع/الإعادة، وإعادة تحرير الملصقات، وتحسين إدارة النوافذ (27 سبتمبر 2026)

**المرجع:** طلب المالك — «مراجعة التعديلات الأخيرة» + «تحسين حالة نافذة التطبيق وتغير زر التوسيع بشكل ديناميكي أكثر دقة».

**المنفَّذ والمختبر (`vitest` 88/88 ملفاً و720/721 حالة ✅ · `tsc --noEmit` ✅ · `go vet -tags bindings .` ✅ · `go test -tags bindings` 4/4 حالات ✅ · `docs-gate` ✅):**

| البند | التحديث | الحالة |
| --- | --- | --- |
| VDP-1 | **الطباعة بالبيانات المتغيرة (VDP) في استوديو الملصقات:** استيراد Excel/CSV من العميل مباشرة (`papaparse` + `xlsx`) مع ربط ذكي للأعمدة، سقف 500 صف، تسليم خيط الواجهة كل 5 صفوف، تعقيم SVG، وحفظ محلي عبر `SaveImageFromBase64`. ملفات: `vdp-parser.ts`, `vdp-batch.ts`, `VdpImportDialog.tsx` (تُغلق فجوة M-5). | ✅ |
| VDP-2 | **سجل تراجع/إعادة لتخصيصات الملصق (`useStickerParamsHistory`):** محرك نقي بـ 50 خطوة كحد أقصى، دمج زمني للأفعال السريعة (400ms)، اختصارات `Ctrl+Z`/`Ctrl+Y`، وأزرار بصرية في شريط المعاينة. ملفات: `params-history.ts`, `StickerStudioDialog.tsx`. | ✅ |
| VDP-3 | **إعادة تحرير الملصقات من الكانفس (`Sticker Re-editing`):** إدراج خيار «تعديل الملصق» في قائمة السياق لعناصر الملصقات (`stickerSource` في Schema وStore)، مع ناقل أحداث `sticker-reedit-bus.ts` وتحديث نفس العنصر عند الحفظ. | ✅ |
| WIN-1 | **تتبع حالة التكبير بدقة فورية عبر أحداث Wails v3:** استبدال استطلاع `resize` وتأخير 100ms بالاستماع المباشر لـ `WindowMaximise` و `WindowUnMaximise` و `WindowRestore` في `use-window-controls.ts`. | ✅ |
| WIN-2 | **حفظ الأبعاد الطبيعية (Restored Geometry):** تتبع أبعاد ما قبل التكبير عبر `WindowDidResize` و `WindowDidMove`، وحفظها عند الإغلاق بدلاً من أبعاد الشاشة الكاملة لتفادي التمدد المفرط على شاشات أخرى في `main.go`. | ✅ |
| WIN-3 | **منع وميض الإقلاع:** إطلاق النافذة مخفية (`Hidden: true`) وإظهارها وتركيزها بعد `WindowRuntimeReady`. | ✅ |
| WIN-4 | **حفظ دوري ذري لحالة النافذة:** تفعيل حفظ خلفي كل 30 ثانية عبر goroutine مع `AtomicWriteFile` ضد حالات الإغلاق القسري. | ✅ |
| UX-1 | **امتثال Wait UX وتفريغ حالات التحميل:** تصحيح نصوص الانتظار في `VdpImportDialog` إلى «جاري ...» وإضافة `useEffect` لتصفير حالات التحميل عند تغيّر `open`. | ✅ |

---

## 0.17 سجل جلسة تدقيق `BUGS_REPORT.md` مقابل الكود وتحصين ادعاءات «مُصلح» (27 سبتمبر 2026)

**المرجع:** طلب المالك — «مزامنة التوثيق مع الكود الحقيقي» · `BUGS_REPORT.md` (تقرير سبتمبر) + `docs/reviews/07-…-2026-09-25.md`.

**المنفَّذ والمختبر (`node scripts/docs-gate.mjs --strict-refs` ✅ · `go build .` ✅ · اختبار انحراف سالب للبوابة ✅):**

| البند | التحديث | الحالة |
| --- | --- | --- |
| D-1 | **تدقيق 26/26 بنداً في `BUGS_REPORT.md` بقراءة الملفات التنفيذية:** لا بند مفتوح واحد. أُلحق «تصحيح خامس» مؤرَّخاً بمصفوفة (بند ← الحالة ← `ملف:سطر`) بدلاً من تعديل التقرير الأصلي (قاعدة الإلحاق فقط). | ✅ |
| D-2 | **تصحيح 4 مواضع غير دقيقة في التصحيحات السابقة:** `ai_service.go:340 → :331` · `db.go:398-411 → :403-409 + :512-516` · موضع `-w -s` الحقيقي `build/windows/Taskfile.yml:65` (لا `build.ps1:49` ولا `release.yml:122`) · شرط SignPath ما زال `env.` والإصلاح الفعلي نقل التعريف إلى مستوى الـ job (`release.yml:16-18`). | ✅ |
| D-3 | **تأكيدات تحقّق على مستوى الكود داخل البوابة (فحص 5 جديد في `scripts/docs-gate.mjs`):** 12 → **16 تأكيداً** (4 أُضيفت في 0.26 لبنود P0 الثلاثة) (موجود/ممنوع/تكرار متوقع) تُثبّت أدلة البنود المُغلقة — الخصم المزدوج، فساد autosave، `env` التوقيع، `-w -s`، الكتابة الذرية، `exportsCleanup`، `data:image/`، تجميع `strokeBatch`، `DialogCloseButton`/`FluentSliderField`، وسم NSIS، `h-7 w-7`. **مُثبَت بالاختبار:** حُذف `utils.AtomicWriteFile` مؤقتاً ⇒ فشلت البوابة ⇒ أُعيد الملف ونجحت. | ✅ |
| D-4 | **مصفوفة الحالة §1 و`§5` في `BUGS_REPORT.md` موسومة صراحةً بأنها متقادمة** مع قائمة الصفوف التي كُتبت قبل إصلاحها (13 صفاً ✅ + 3 جزئية). | ✅ |

**الفجوات الحقيقية التي تحقّقنا أنها ما تزال مفتوحة (لم تُغلق في هذه الجلسة):**

| # | الفجوة | الموقع | الخطورة | الحالة |
| --- | --- | --- | --- | --- |
| C-05 | تكلفة الـGPU تُحسب بسعر A10G (`1.10/3600`) بينما الفئة تعمل على `gpu="L4"` ⇒ `ai_usage.cost_usd` مضلّلة | `modal_ai/upscaler.py:320-323` | متوسطة (تقارير/MRR) | ❌ مفتوحة |
| C-06 | فشل تسجيل الاستهلاك يُبتلع (`print` + متابعة) ⇒ تنفيذ مكلَّف بلا احتساب عند انقطاع شبكي لحظي | `modal_ai/upscaler.py:359-360` | متوسطة (مقايضة افاضلية/صحة غير موثّقة) | ❌ مفتوحة |
| — | إغلاق الملف المصدر مؤجَّل بـ`defer` في `ProcessOpenedFile` (قفل لحظي على ويندوز) | `internal/service/media_service.go:267` | منخفضة | ❌ مفتوحة (سطر `إغلاق الملفات` في §1) |

> هذه البنود الثلاثة ملكوها `docs/reviews/07-full-security-completeness-audit-2026-09-25.md`؛ لم تُنفَّذ هنا (نطاق الجلسة توثيقي) وتُجدول في جلسة إصلاحات قادمة.

---

## 0.16 سجل جلسة تحصين دورة حياة الوسائط والأمان (26 سبتمبر 2026)

**المرجع:** مراجعة ثغرات الأمان وسلامة البيانات (`[C-04]` من تدقيق سبتمبر 2026).

**المنفَّذ والمختبر (`typecheck` ✅ / `go test ./internal/repository/...` ✅ / `vitest` ✅ / `docs-gate` ✅):**

| البند | التحديث | الحالة |
| --- | --- | --- |
| M-1 | **إصلاح دورة حياة الحجر الصحي (`[C-04]`):** تجديد `mtime` عبر `os.Chtimes(trashPath, now, now)` فور نقل الملفات إلى `MediaTrash` لمنع الحذف الفوري التلقائي (0 ثانية مهلة) للملفات التي مر عليها أكثر من 30 يوماً. وتصحيح مهلة الحذف إلى 30 يوماً. | ✅ |
| M-2 | **حساب دقيق لإحصائيات التنظيف اليدوي:** احتساب المساحة وعدد الملفات المنظفة في `CleanUnusedMediaNow` فقط بعد نجاح عملية النقل الفعلية. | ✅ |
| M-3 | **إدارة كاش صور الواجهة (`useAsyncImage`):** آلية LRU حقيقية (حد 100 + لمس الحداثة عند كل إصابة قراءة/تسخين) وإسقاط مراجع الكاش عند الطرد/الإبطال دون تصفير `src` الكائنات الحية المعروضة (يمنع اختفاء الصور من الكانفس). | ✅ |
| M-4 | **حماية تسجيل طبقة السحب (`KonvaCanvas`):** دالة `ref` مستقرة الهوية — `null` لا يصل إلا عند الـ unmount الحقيقي فيُنظَّف التسجيل قصداً، بدل مسح حالة السحب النشط مع كل إعادة رندر. | ✅ |
| M-5 | **اختبارات انحدار صارمة:** إضافة `TestCleanupUnusedMedia_OldUnreferencedFileSurvivesOneCycle` في Go وملف `frontend/test/use-async-image-cache.test.ts` (طرد/حداثة LRU/إبطال — يفشل على الكود القديم وينجح على الجديد). | ✅ |

---


## 0.15 سجل جلسة اختزال نصوص الشريط الجانبي (25 سبتمبر 2026)

**المرجع:** طلب المالك (تقليل النصوص قدر الإمكان في تبويبات الوضعين).

**المنفَّذ والمختبر (`typecheck` ✅ / `lint --max-warnings 0` ✅ / كامل Vitest 84/84 ملف و690/691 حالة ✅ / `docs-gate` ✅):**

| البند | التحديث | الحالة |
| --- | --- | --- |
| T-1 | **اختزال ~150 نصا مرئيا** في 10 ملفات تبويبات + `workspace-tools` (subtitles ≤3 كلمات، toasts بلا تم/تمت، أزرار 1-2 كلمة) — بلا مساس بـ aria-labels/testIds/المنطق/الأوامر. | ✅ |
| T-2 | **ضبط 7 توقعات اختبارية** على النصوص الجديدة (`collage-arrange/presets`, `freeform-library`). | ✅ |
| T-3 | **إصلاح عنوانين متبادلين** في المفضلة (`إضافة/إعادة إضافة` — كشفته الاختبارات) + **حذف ملف يتيم مكسور** (`collage-layers-tab` غير مربوط + `phosphor` محذوفة). | ✅ |
| T-4 | الأرقام الحاكمة الجديدة: **Vitest 84 ملف/691 حالة (690 ناجحة + 1 متخطّاة)** في `DOCUMENTATION_MAP.md`. | ✅ |

---

## 0.14 سجل جلسة إزالة زحمة الشريط الجانبي (25 سبتمبر 2026)

**المرجع:** ملاحظة المالك (تبويبات حشو) + قاعدة «لا تكرار بين العمودين» (أي عنصر في العمود الأيمن لا يُكرر في تبويبات اليسار).

**المنفَّذ والمختبر (`typecheck` ✅ / `lint --max-warnings 0` ✅ / vitest الملفين 38/38 ✅):**

| البند | التحديث | الحالة |
| --- | --- | --- |
| S-1 | **دمج الاستوديو 9→7:** تبويب `العناصر` الموحد + ترحيل `stickers/shapes/text → elements` + حماية التبديل السريع (`quick` + `elements` مفتوح → `layers`). | ✅ |
| S-2 | **حذف `collage-backdrop-tab.tsx` نهائيا (الكولاج 7→6):** تدقيق التغطية أثبت تكرار 1:1 مع اليمين — لا بديل مكرر. | ✅ |
| S-3 | **شريحة `workflow-slice` + `getToolsForWorkflow` الحقيقية** (كانت تتجاهل المسار بمعامل ميت) + أمري `workflow-quick/studio` في لوحة الأوامر. `batch` مؤجل بقرار D-5. | ✅ |
| S-4 | **تحديث E2E:** حذف زر الخلفية + توقعات hub العناصر (`rail-studio-stickers/shapes/text` صفر) في `collage-panels` و `studio-panels`. | ✅ |

> **قاعدة التصنيف المعتمدة:** تُحذف النسخ الحرفية فقط (نفس المنزلقات/المنتقيات لنفس الحالة). تبقى المعارض والقوالب والمعالجات (إدراج/تصفح/توزيع) لأن العمود الأيمن للضبط لا للاكتشاف.

---

## 0.13 سجل جلسة الصقل الأولى (25 سبتمبر 2026 — صقل فقط، صفر إضافات ثقيلة)

**المرجع:** خطة الصقل المعتمدة من المالك (صقل أولا — PSD/VDP/ICC خارج النطاق بقرار D-5).

**المنفَّذ والمختبر (`typecheck` ✅ / `lint --max-warnings 0` ✅ / كامل Vitest 84/84 ملف و686/687 حالة ✅ / `go vet` ✅ / `gofmt` صفر انحراف ✅ / `docs-gate` ✅):**

| البند | التحديث | الحالة |
| --- | --- | --- |
| P0 | **قرارات محمية D-1..D-5** (غير موقع عمدا / Wails v3 فوق v2 / E2E محاكي v3 / BUGS_REPORT أرشيف / صقل أولا) — أي تدقيق قادم ممنوع من نقضها بلا موافقة المالك. | ✅ |
| P2 | **توحيد `@types/react/dom` على 19** مع `react 19.2.8` — صفر أخطاء نوعية (كان عدم تطابق 18 مقابل 19). | ✅ |
| P2 | **فحص `gofmt` على `internal/`** — صفر ملف منحرف (ادعاء الـ 12 ملفا القديم لم يعد صحيحا). | ✅ |
| P3 | **حذف `onnxruntime-web`** (صفر استخدام — توفير ~7-20MB) **+ إضافة `culori ^4.0.2`** — مولّد `buildColorHarmony` يغلق الفجوة M-3. | ✅ |
| P1 | **تفكيك `export-image.ts` (1094 → Barrel + 8 وحدات)** بلا تغيير سلوكي، مع إصلاح تلويث Regex أثناء النقل بالاستعادة البايتية من الأصل. | ✅ |
| DOC | الأرقام الحاكمة الجديدة: **Vitest 84 ملف/687 حالة (686 ناجحة + 1 متخطّاة)** — حُدّثت في `DOCUMENTATION_MAP.md` + `CHANGELOG.md`. | ✅ |

> **المتبقي من الخطة:** تفكيك `freeform-math` و `element-slice` و `document-detector` و `addons` + تغطية Service إلى 80% + GPG للبصمات.

---


## 0.12 سجل جلسة تنفيذ تصدير PDF المتجهي (25 سبتمبر 2026)

**المرجع:** الفجوة M-5 من سجل 0.11 (لا مولّد PDF) — أُغلقت بهذه الجلسة.

**المنفَّذ والمختبر (go test ✅ كل الحزم / vitest طباعة ✅ 88/88 / typecheck ✅ / eslint ✅ / prettier ✅):**

| البند | التحديث | الحالة |
| --- | --- | --- |
| P-1 | **مولّد PDF في الخادم `internal/service/print_pdf_export.go`:** صفحة `gofpdf.NewCustom` بالمقاس الفيزيائي الدقيق، تضمين JPEG q95 بلا إعادة ترميز، خطوط قص متجهة بنفس إيقاع `drawCutLines`، سقف 50MP، رفض صريح لـ CMYK→PDF، كتابة ذرية، ومعاينة HTML تحفظ عقد الطباعة. | ✅ |
| P-2 | **مبدّل الصيغة في الواجهة:** زرّا «صورة / PDF» في `print-settings-toolbar.tsx` + حالة `exportFormat` في `print-dialog.tsx` + تمرير `exportFormat: "pdf"` في `use-print-export.ts` عبر عقد `domain.PrintRequest` نفسه (تفكيك `ctx` إلى مُعاملات مسمّاة لإرضاء `exhaustive-deps`). PDF مع CMYK يبدّل تلقائياً إلى sRGB مع تلميح. | ✅ |
| P-3 | **اعتمادية `github.com/jung-kurt/gofpdf v1.16.2` (pure-Go، بلا cgo):** آمنة للبناء المتقاطع في Wails. | ✅ |
| P-4 | **اختبارات Go (3 دوال في `print_pdf_export_test.go`):** توقيع `%PDF-` + MediaBox لـ A4 + XObject + مشغّلات قص + معاينة HTML، رفض CMYK، تجاوز NaN/Inf. | ✅ |
| P-5 | **توثيق العقد في `docs/developer_guide.md` (§5 قسم Print Export Pipeline):** أي `exportFormat` جديد يُضاف في `domain/print.go` + `print_export.go` + اختبار مسار. | ✅ |

> **المتبقي من توصيات 0.11:** PSD ثم VDP (M-6 وM-7 ما زالتا فجوات).

---

## 0.11 سجل جلسة تدقيق فجوات السوق والمكتبات البديلة (25 سبتمبر 2026)

**المرجع:** بحث آلي في 679 ملفاً بالمستودع (بحث نصي عن `pdf-lib`/`maroto`/`pdfcpu`/`ag-psd`/`papaparse`/`xlsx`/`harfbuzz`/`opentype`/`face-api`/`imgly`) + قراءة `print_export.go` و`print_native.go` و`bg-removal.worker.ts` و`face-frame.worker.ts` و`palette-extract.ts` و`batch-insert-dialog.tsx`.

**الغرض:** تصحيح التوصيات السابقة المكرَّرة بعد التحقق من البدائل القائمة فعلاً في الكود، وحصر الفجوات الحقيقية فقط.

| البند | النتيجة الموثَّقة بالأدلة | الحالة |
| --- | --- | --- |
| M-1 | **اقتراح «عزل خلفية أوفلاين» مُكرَّر — يُحذف من التوصيات:** البديل مُنفَّذ بالفعل في `frontend/src/workers/bg-removal.worker.ts` عبر `ImageSegmenter` + `selfie_multiclass.tflite` داخل Web Worker حقيقي مع إلغاء `terminate()` فوري (1024px، بلا خادم، بلا تكلفة). | ❌ الملغى |
| M-2 | **اقتراح «قص ICAO آلي للوجه» مُكرَّر — يُحذف من التوصيات:** البديل أقوى من `face-api` في `face-frame.worker.ts` + `lib/filters/face-frame-utils.ts` (`computeIdCropRect`، مرساة مستوى العينين 38%، زاوية تحديق ثلاثية الأبعاد، تمييز `$Y_skull_top` عن `$Y_hair_top`، ومطابقة نسبة أبعاد المصدر). | ❌ الملغى |
| M-3 | **اقتراح «استخراج ألوان» مُنفَّذ جزئياً:** الاستخراج قائم في `lib/canvas/palette-extract.ts` (تكميم 4-bit، وزن تشبع، دمج من 4 صور) ومستخدَم في `freeform-palette-tab.tsx`؛ **الناقص** هو مولّد تناغمات الألوان (Complementary/Triadic) لا الاستخراج. | 🔶 جزئي — تصحيح 2026-10-21: حُذف `palette-extract.ts` في الجلسة 1.28 مع إزالة وجهة الهوية؛ البند تاريخي |
| M-4 | **اقتراح «إدراج دفعي» مُنفَّذ جزئياً:** `batch-insert-dialog.tsx` يغطي الصور (grid/cascade/collage + نسخ متعددة)؛ **الناقص** هو ربط جدول بيانات (VDP). | 🔶 جزئي |
| M-5 | **فجوة «تصدير PDF» مؤكَّدة (الأعلى قيمة):** `internal/service/print_export.go` ينتج PNG/JPEG/TIFF/HTML فقط؛ `print_native.go:71` يسمح بـ `.pdf` داخل `validExts` **للطباعة** لكن لا مولِّد PDF في المشروع (صفر نتيجة لـ `pdf-lib`/`maroto`/`pdfcpu`/`%PDF`). القناة الخلفية جاهزة والمخرج ناقص. | ❌ فجوة |
| M-6 | **فجوة «PSD» مؤكَّدة:** صفر مرجع لـ `ag-psd`/`psd` في `frontend/package.json` — لا استيراد ولا تصدير لطبقات فوتوشوب. | ❌ فجوة |
| M-7 | **فجوة «طباعة بيانات متغيرة (VDP)» مؤكَّدة:** صفر مرجع لـ `papaparse`/`xlsx` — لا مسار من جدول بيانات إلى قالب طباعي. | ❌ فجوة |
| M-8 | **فجوتان متوسطتان موثّقتان سلفاً (لا جديد):** تحويل CMYK بلا ملفات ICC (§2 «تحويل CMYK بلا ملفات ICC»)، وغياب ترحيلات إصدارية للمشاريع (`VERSION=1` ثابت). | ❌ فجوة |

> **الخلاصة:** التوصيات الباقية بعد التدقيق = **تصدير PDF** ثم **PSD** ثم **VDP**. أي توصية سابقة بخلاف ذلك ملغاة ولا تُنفَّذ.

---

## 0.10 سجل جلسة استخراج وتأسيس مهارات المعايير الرسمية (25 سبتمبر 2026)

**المرجع:** مراجعة التوثيقات الرسمية للمكتبات الأساسية (Zustand v5, Radix UI, Tailwind CSS v4) وإنشاء المهارات التوجيهية في `.agents/skills/`.

| البند | التحديث | الحالة |
| --- | --- | --- |
| K-1 | **مهارة إدارة الحالة `zustand-state-patterns`:** تثبيت نمط الشرائح السبع (Slices)، ومنع الـ Stale Closures باستخدام `getState()` المباشر داخل دوال الـ Callbacks والأحداث، وفرض `useShallow` للمحددات المجمعة لتفادي أخطاء حلقة التحديث اللانهائية ومشاكل الأداء في Zustand v5. | ✅ |
| K-2 | **مهارة إمكانية الوصول وتجربة المستخدم `radix-ui-accessibility-ux`:** تثبيت معايير WAI-ARIA للنوافذ الحوارية والقوائم (`Dialog`, `DropdownMenu`)، حصر التركيز التلقائي، الإغلاق بمفتاح `Escape`، وفرض وجود `Title` و`Description` مع توثيق تقنية `<VisuallyHidden>` لتفادي تحذيرات قارئات الشاشة. | ✅ |
| K-3 | **مهارة محرك التنسيق `tailwind-v4-theme-engine`:** توثيق المعمارية الجديدة القائمة على توجيه `@theme` المباشر في `index.css` دون الحاجة لملف إعداد JS، فرض استخدام متغيرات الطبقات المعتمدة `z-(--z-...)` بدلاً من القيم السحرية العشوائية، والتناغم البرمجي بين توكنز Tailwind ومحرك Konva. | ✅ |

---

## 0.9 سجل جلسة تدقيق جودة الكود وتغطية الاختبارات (25 سبتمبر 2026)

**المرجع:** تقرير التدقيق `docs/reviews/08-code-quality-audit-2026-09-25.md` وسكربت القياس `scripts/quality-metrics.mjs`.

| البند | التحديث | الحالة |
| --- | --- | --- |
| Q-1 | **قياس التغطية الحية للجهتين:** تغطية Go statements = 59.0% (Handlers 84.5%, Repo 76.7%, Utils 71.5%, Service 51.9%) · تغطية الواجهة lines = 51.5% (Print 99.5%, Canvas 65.8%, Store 67.8%, Document Scanner 75.5%). | ✅ |
| Q-2 | **تحليل الملفات الساخنة (Hotspots):** تحديد 28 ملف منطق في الواجهة > 500 سطر (5 منها > 800 سطر، أعلاها `freeform-math.ts` 1056 سطر و`export-image.ts` 1014 سطر)، و4 ملفات بالباكند (أعلاها `print_image_pipeline.go` 642 سطر). | ✅ |
| Q-3 | **فحص انزياح التنسيق (`gofmt`):** كشف 12 ملفاً في `internal/` بانزياح حقيقي في المحاذاة والمسافات البادئة، ورصد غياب فحص `gofmt` في خط سير CI. | ✅ |
| Q-4 | **فحص `golangci-lint`:** رصد 17 ملاحظة تراكمية غير حرجة (11 `errcheck`، 5 `ineffassign`، 1 `SA1012`) وإدراجها في خطة التحسينات. | ✅ |
| Q-5 | **نظافة الممارسات البرمجية:** تأكيد سلامة الأنواع مع انخفاض `: any` إلى 1 و`as any` إلى 1، وصفر `console.log`، وصفر `panic`/`log.Fatal`. | ✅ |

---


## 0.8 سجل جلسة تحصين الأسرار وإلزام بوابة التوثيق (25 سبتمبر 2026)

**المرجع:** تنفيذ توصية التدقيق `C-02` (`docs/reviews/07-full-security-completeness-audit-2026-09-25.md`) + إنشاء نظام توثيق مُلزِم.

| البند | التحديث | الحالة |
| --- | --- | --- |
| S-1 | **حذف السرّ الميت `ModalAIKey`:** أُزيل المتغير ودالة `GetModalAIKey` من `internal/service/license_service.go`، والاختبار `TestGetModalAIKey`، والحقن من `build/windows/Taskfile.yml` و`build.ps1` و`.github/workflows/release.yml`. الدليل: إثبات فعلي بأن المفتاح (37 حرفاً) موجود نصاً داخل `bin/GridoStudio.exe` وقابل للاستخراج بـ`strings`، مع عدم وجود أي مستهلك إنتاجي (التوثيق عبر JWT فقط). | ✅ |
| S-2 | **تعطيل السرّ في `.env` المحلي** مع تسجيل ضرورة إبطاله من لوحة Modal (يبقى قابلاً للاستخراج من الإصدارات المنشورة سابقاً). | ✅ |
| S-3 | **بوابة التوثيق الإلزامية:** `docs/DOCUMENTATION_MAP.md` (جرد + مصفوفة مزامنة + أرقام + بوابات) + `scripts/docs-gate.mjs` + مهارة `grido-docs-sync-guard` + قاعدة حاكمة في `.agents/AGENTS.md` + `.husky/pre-commit` و`.husky/pre-push` + خطوة `Documentation Gate` في CI. | ✅ |
| S-4 | **إصلاح خطافات Git المعطّلة:** كان `core.hooksPath` يشير إلى `frontend/.husky/_` غير الموجود ⇒ **لا خطافات تعمل إطلاقاً**؛ صُحّح إلى `.husky` (مُتتبَّع في Git) عبر `scripts/setup-husky.mjs`. | ✅ |
| S-5 | **تصحيح انحرافات التوثيق:** `README.md` (62→84 ملف اختبار · 30→29 عائلة خطوط بتفصيل أوفلاين دقيق · شجرة المعمارية · قسم التوثيق)، `docs/testing_guide.md` (67/469 و15/31 و21 → الأرقام الفعلية 84/684 و25/165)، `docs/developer_guide.md` (Tailwind v4 بدل «Vanilla CSS»)، حذف `docs/HOW_TO_REGENERATE_MODAL_KEY.md` (دليل ميت)، و`docs/AI_ARCHITECTURE.md` + `SECURITY_NOTICE.md`. | ✅ |
| S-6 | **الأرقام المرجعية الحاكمة (مُثبتة بالأوامر):** Vitest 84 ملف/684 حالة (683 ناجحة + 1 متخطّاة) · E2E 25 ملف/165 حالة · Go 29 ملف/151 دالة — في `docs/DOCUMENTATION_MAP.md` القسم 4. | ✅ |
| S-7 | **تحقق الأدوات:** `go vet ./internal/...` ✅ · `go build .` ✅ · `go test` (service/repository/utils/handlers) ✅ · `vitest run ipc-contract-drift` 4/4 ✅ · `docs-gate` ✅ | ✅ |

**ملاحظة أدوات:** `go vet ./...` و`go build ./...` يفشلان بسبب مجلد قالب Wails `build/ios/scripts/deps` (خارج التطبيق) — استخدم `go vet ./internal/...` و`go build .`.

---

## 0.7 سجل جلسة صيانة تعليمات الوكلاء (19 سبتمبر 2026)

**المرجع:** مراجعة شاملة لـ `.agents/AGENTS.md` و `.agents/skills/*/SKILL.md` مع تحقق كل ادعاء مقابل الكود الفعلي.

| البند | التحديث | الحالة |
| --- | --- | --- |
| A-1 | **حارس انحراف عقود IPC أصبح حقيقياً** — القاعدة كانت تشير لاختبار غير موجود؛ أُنشئ `frontend/src/lib/wails/ipc-contract-drift.test.ts` (مسح تكراري للربطات المولدة + مطابقة `WAILS_V3_METHOD_HANDLERS` + كشف المعالجات اليتيمة مع قائمة سماح للـ fallback الدفاعيين 2987688963/2154875234) — 4 اختبارات ✅، مع استثناء بنية `e2e/**` من حساب التغطية في `vitest.config.ts` لمنع سحب حدود التغطية للأسفل | ✅ |
| A-2 | **دمج مهارات Konva الأربع المتداخلة** (`konva-canvas-optimizer`, `konva-gesture-touch-transformer`, `konva-layer-composite-filters`, `konva-freeform-collage-engine`) في مهارة موحدة `konva-rendering-invariants/SKILL.md` مع قائمة فحص ختامية | ✅ |
| A-3 | **إصلاح مراجع وهمية** — `internal/core/domain/user.go`/`LicenseInfo` (غير موجودين) → `license.go`/`UserProfile`/`LicenseRepository` في `grido-architecture-navigator`؛ «7 وظائف CI» → 4 وظائف فعلية؛ «70+ ملف اختبار» → 70 ملف وحدة فعلي + 21 E2E | ✅ |
| A-4 | **إصلاح النمط الأمني في أمثلة المهارات** — مثالا `safeLocalImageHandler` و `AssetServerHandler` كانا يقبلان مساراً كاملاً بفحص HasPrefix غير آمن؛ أُعيدت كتابتهما بالنسخة الموحدة المطابقة للتنفيذ الفعلي في `media_service.go` (Base → Join → EvalSymlinks على الطرفين + Clean + Separator) | ✅ |
| A-5 | **تصحيح نمط الأحداث في `wails-v3-multiwindow-sync`** — كان يستخدم `window.wails?.Events?.Emit` غير الموجود؛ صار عبر جسر `wailsjs/runtime/runtime` (`EventsEmit`/`EventsOn`) المطابق للاستخدام الفعلي، مع تنبيهات توافق لإصدارات beta | ✅ |
| A-6 | **قاعدة «سيادة المصدر الواحد للحقيقة»** في AGENTS.md (لكل قاعدة موقع واحد + صيانة المراجع عند الحذف) + توثيق استثناء `lint`/`typecheck` المحلي من قاعدة حظر الاختبارات المحلية | ✅ |
| A-7 | **تنظيف بقايا أدوات** — حذف `git worktree` المهجور `.kilo/worktrees/indispensable-bag` (كان نظيفاً) ومجلدي `.kilo/` و `.kilocode/` | ✅ |

---

## 0.6 سجل جلسة إصلاح مسار بناء Wails v3 وE2E (18 سبتمبر 2026)

**المرجع:** مراجعة استقرار الكود الحالي + التحقق الدقيق من المشاكل المكتشفة (أدلة أسطر + فحص منافذ تجريبي).

| البند | التحديث | الحالة |
| --- | --- | --- |
| B-1 | **CI/Release كانا يقودان Wails v2 على مشروع v3** — استُبدل `wails/v2/cmd/wails` بـ `wails3@v3.0.0-beta.23`، و`wails generate module` (مولّد v2 لا يستخرج الخدمات من `application.New`) بـ `wails3 generate bindings -ts -clean=true`، و`wails build` بـ `wails3 task build` / `wails3 task package` (`ci.yml` + `release.yml`) | ✅ |
| B-2 | **مسارات مخرجات الإصدار** — `build\bin` (اصطلاح v2) → `bin` (اصطلاح `BIN_DIR` في `Taskfile.yml:6`) ومثبّت NSIS `build\windows\nsis\GridoStudio-installer.exe` في خطوات الجمع/التوقيع/البصمات/الرفع | ✅ |
| B-3 | **مهمة `windows-build` بلا Node** — أُضيف `actions/setup-node` (خطوة `wails3 task build` تبني الواجهة وتحتاج npm) | ✅ |
| B-4 | **تعارض منفذ E2E (5173 ↔ 9245)** — Playwright كان ينتظر `localhost:5173` بينما Vite على `127.0.0.1:9245` مع `strictPort` ⇒ توحيد المنفذ/المضيف في `playwright.config.ts` + تشغيل الخادم بمنفذ صريح | ✅ مُثبت تجريبياً |
| B-5 | **محاكي `window.go` يُركَّب في الإنتاج** — v3 لا يحقن `window.go` إطلاقاً؛ حُصر المحاكي بـ`import.meta.env.DEV` ونُقل مانع قائمة السياق ليُطبَّق في الإنتاج باستقلال | ✅ |
| B-6 | **`wailsIsDesktop()`** — تكتشف إشارات v3 (`window.wails` / `chrome.webview.postMessage` / `webkit.messageHandlers`) مع إبقاء `window.go` كإشارة متوافقة (تعتمد عليها اختبارات الوحدة) | ✅ |
| B-7 | **حاجز الربطات المولّدة** — `frontend/scripts/ensure-bindings.mjs` + خطافات `prebuild`/`prebuild:dev`/`pretypecheck`/`pretest`/`pretest:coverage` | ✅ |
| B-8 | **نظافة Git** — حذف `frontend/lint-results.txt` و`frontend/package.json.md5` وإضافة `/bin` وملفات الآثار إلى `.gitignore` | ✅ |
| B-9 | **تصحيح توثيقي** — `BUGS_REPORT.md` (ادعاءات ذرية/Goroutines قديمة)، `TASKS.md` (SEC-02/03 وQ-03 منفَّذة فعلاً)، `next-session-prompt.md` (وصف `wailsjs/`)، وبانر «تاريخي» على تقارير يوليو | ✅ |

| B-10 | **تشخيص فشل E2E الحقيقي** — بعد إصلاح المنفذ صارت الحزمة تعمل (31 اختباراً تبدأ)، والسبب الجذري للفشل: `e2e/helpers/wails-mock.ts` يحاكي v2 (`window.go`/`window.runtime`) بينما v3 يستخدم `$Call.ByID` ⇒ شاشة «النسخة مقفلة». سُجّل كـ **Q-02** وحُوِّلت مهمة CI إلى `continue-on-error: true` بتعليق صريح | ✅ موثَّق |
| B-11 | **تحديث حالات `TASKS.md`**: SEC-02/SEC-03 → مكتملة (مسار RPC بديل معتمد)، Q-03 → منفَّذة جزئياً | ✅ |

**بنود أُغلقت بعد التحقق (كانت مشتبهاً بها):**
- `npm run lint` **يمرّ فعلاً** بسياسة `--max-warnings 0` (`LINT_OK`) ⇒ لا مشكلة في بوابة الـLint؛ الأثر القديم `frontend/lint-results.txt` كان مضلّلاً فقط.
- ادعاءات `BUGS_REPORT.md` عن غياب الكتابة الذرية في `media_service.go`/`window_state.go`/`print_export.go` و`BUG-LOW-08` (Goroutines غير مقيدة) **غير صحيحة حالياً**: الملفات الثلاثة تستخدم `utils.AtomicWriteFile`/`utils.CreateAtomic`، والحارس الذري موجود في `print_export.go:57` (`exportsCleanup.CompareAndSwap`).

**تحقق قياسي مُنفَّذ:** `go vet ./...` ✅ — `go test ./internal/...` ✅ (handlers/repository/service/utils) — `npx tsc --noEmit` ✅ — `npm run lint` ✅ — فحص المنافذ: `9245 => HTTP 200` و`5173 => UNREACHABLE`.

---

## 0.5 سجل جلسة إزالة ازدواجية "اختراع العجلة" في المحرك (16 سبتمبر 2026)

**المرجع:** `docs/plans/wheel-deduplication-plan.md` (MAINT-03…09) — **التحقق (go build ✅ / go vet ✅ / go test: root+utils+handlers+repository+service ✅ / typecheck ✅ / lint ⏳ / vitest ⏳):**

| البند | التحديث | الحالة |
| --- | --- | --- |
| MAINT-03 | **وحدة الكتابة الأذرعية الموحدة `internal/utils/atomicfile.go`** (`CreateAtomic/Commit/Abort/AtomicWriteFile`) مع 8 اختبارات جديدة. | ✅ |
| MAINT-04 | **ترحيل 12 موضعاً** كانت تعيد كتابة نمط tmp+fsync+rename يدوياً (autosave، وسائط، معالج صور، جسر الجوال، تصدير الطباعة، حالة النافذة، app/main، سجلات AI، حد الاستخدام). | ✅ |
| MAINT-05 | **توحيد إعادة المحاولة في `internal/service/http_retry.go`** (`httpDoWithRetry` مع jitter وRetry-After ووعي بالسياق) — ترحيل `supabase_client.go` و`license_service.go` إليه. | ✅ |
| MAINT-06 | **إزالة طبقة فتح المتصفح يدوية (3 ملفات build-tag)** — استُبدلت بـ `runtime.BrowserOpenURL` خلف منفذ محقون قابل للاختبار في `LicenseService` + فصل دالة نقية `buildOAuthAuthorizeURL`. | ✅ |
| MAINT-07 | **توحيد `clamp` في واجهة `frontend/src/lib/clamp.ts`** (وحدة صفرية اعتماديات لسلامة Web Workers) وحذف 3 نسخ محلية (freeform-math، face-frame-utils، FreeformCollageModal). | ✅ |
| MAINT-08 | **ثلاثة عملاء HTTP مشتركة في `ai_service.go`** بدل إنشاء عميل جديد داخل كل نداء (كان يقطع اتصالات keep-alive). | ✅ |
| MAINT-09 | **تصحيح التوثيق المضلّل**: وسوم "حالة البند" في `docs/reviews/comprehensive-app-review.md` تفرّق بين المقترح التاريخي والمنفَّذ (`http_retry.go`، عملاء HTTP المشتركة، `AIRateLimiter`). | ✅ |

**عجلات أُبقيت عمداً (قرارات معتمدة في الخطة §0.1):** `print-layout-math.ts`، `SepiaBlend`، `history-slice.ts` (Undo/Redo مخصص)، حقن DPI في `print_export.go`، `updater.go`، `AIRateLimiter` — حلول قياسية صحيحة لنطاقها.

---

---

## 0.4 سجل جلسة برنامج التميز للواجهة (9 سبتمبر 2026)

**المرجع:** `docs/plans/ui-excellence-plan.md` (المراحل 1+2+4 كاملة، المرحلة 3 على الملفات الثلاثة الأكبر)
**التحقق (typecheck ✅ / lint 0 ✅ / vitest 370/370 ✅ / build ✅):**

| البند | التحديث | الحالة |
| --- | --- | --- |
| UX-1 | **توحيد كامل للألوان في الـ tokens:** متغيرات `--ruler-*` للمساطر، `--print-*` لحوار الطباعة، تسجيل `--canvas-*` كأصناف Tailwind؛ صفر hex/slate/zinc خارج النظام (مسح rg = 0 في كل شيء). | ✅ |
| UX-2 | **مقياس طبقات موحد `--z-*`:** استبدال كل القيم السحرية من `z-[45]` حتى `z-[99999]` بسبعة متغيرات معرّفة في `@theme`. | ✅ |
| UX-3 | **تفكيك الملفات العملاقة:** `canvas-quick-bar` 798→153 (أقسام quick-bar/)، `App` 694→512 (license-lock-screen مستقلة)، `editor-canvas` 726→629 (use-ruler-metrics). صافي **-919 سطراً** عبر 71 ملفاً. | ✅ |
| UX-4 | **إزالة الازدواجية:** حذف `zoom-controls.tsx` (ميت)، `WindowControls` مشترك، `QuickBarAiActions` موحد، توست sonner بطبقة تنسيق واحدة. | ✅ |
| UX-5 | **نظافة الواجهة:** `--font-mono` حقيقي، صفر إيموجي في نصوص UI، توحيد الأحجام (142→0 اعتباطية)، أزرار الهيدر على Radix Tooltip. | ✅ |
| UX-6 | **تفكيك بقية الملفات >500 سطراً** (refine-bg 698، image-properties 653، slot-properties 641، batch-insert 598، projects-dialog 593، toolbar-items 589، FreeformCollageModal 535، desktop-menu-bar 530، shared-controls 524، App 512). | 🔶 |

---

## 0.3 سجل جلسة محرك تأطير الوجوه الذكي وتصحيح سحب الصور والطباعة (1 أغسطس 2026)

**المُنجز والمختبر (go test ✅ / vitest ✅ 133/133 / typecheck ✅ / lint ✅ 0 أخطاء / build frontend ✅ / build Wails ✅):**

| البند | التحديث والميزة | الحالة |
| --- | --- | --- |
| FE-1 | **محرك قرار المصور الخبير (Human-Expert Engine)**: حساب زاوية التحديق ثلاثية الأبعاد (3D Pitch Angle $\phi$) وتعديل خط العينين تلقائياً لتجنب اختناق الذقن أو تضخم الجبهة عند النظر للأعلى/الأسفل. | ✅ |
| FE-2 | **تثبيت المستوى القياسي للعينين (ICAO Eye-Level Anchor at 38%)**: تثبيت مستوى العينين دائماً عند نسبة $\approx 38\%$ من أعلى الإطار المعياري لاحترام الشروط الدولية لصور الهوية. | ✅ |
| FE-3 | **التمييز الذكي بين الجمجمة وشعر/غطاء الرأس العالي**: التمييز بين $Y_{skull\_top}$ و $Y_{hair\_top}$ لحماية مسافة الأمان العلوية ($Headroom$) دون تقليص الوجه. | ✅ |
| FE-4 | **مطابقة نسبة أبعاد الصورة المصدر (Source Image Aspect Ratio Parity)**: دمج $imageAspectRatio = origW / origH$ في معادلات $computeIdCropRect$ لمنع أي اقتطاع بكسلي ثانوي في Konva عند قص الصور غير المربعة ($3:4, 16:9, 4:3$). | ✅ |
| FE-5 | **تثبيت حركة السحب داخل الخلية (`onDragStart` Baseline)**: تثبيت مرجع الضغطة الابتدائية في $KonvaCollageImage$ لمنع التسارع الأسي والانزلاق المفاجئ وتأمين حركة سحب خطية $1:1$ سلسة للغاية. | ✅ |
| FE-6 | **التأطير التلقائي في وضع الكولاج (Collage Slot Auto-Framing)**: دمج زِر وإيقونة "ضبط الوجه تلقائياً" في شريط خصائص الخلية ($SlotProperties$) وإعادة ضبط التكبير $zoom=1$ والإزاحات تلقائياً عند التأطير. | ✅ |
| FE-7 | **محرك الطباعة الناطق فائق الدقة (Go CMYK Print Engine)**: تحويل الألوان التوازي على أنوية المعالج ($ConvertRGBAtoCMYK$) وطباعة خطوط القص بـ $Pure Black K:255$ وتكامل مباشر مع نظام طباعة الويندوز. | ✅ |

---

## 0.2 سجل جلسة إصلاح الواجهة 🅒 (31 يوليو 2026 — P0/P1/P2)

**المُنجز والمختبر (go test -race ✅ / vitest ✅ 118/118 / typecheck ✅ / lint ✅ 0 أخطاء / build frontend ✅ / build admin-web ✅):**

| البند | الإصلاح | الحالة |
| --- | --- | --- |
| P0-1 | سحب العناصر في الوضع الحر بإحداثيات منطقية (قسمة على stageScale) — المؤشر يلتصق عند zoom≠100% | ✅ |
| P0-2 | وضع الطيران: خطأ الشبكة يُبقي الجلسة (offline grace) — الاختبار حُدّث ليعكس السلوك | ✅ |
| P0-3 | flipY عبر scaleY=-1 للعناصر الثلاثة (صورة/نص/شكل) | ✅ |
| P0-4 | العناصر المقفولة مستثناة من السحب الجماعي | ✅ |
| P0-5 | فلترة حذف المقفولة + تجاهل عناصر القوائم في اختصارات لوحة المفاتيح | ✅ |
| P0-6 | دبل-كليك ممنوع على العناصر المقفولة | ✅ |
| P0-7 | بذرة التاريخ (history) = العناصر الصالحة فقط عند فتح المشروع | ✅ |
| P0-8 | حراسة حقلي X/Y في لوحة الخصائص (نطاق -1..2 منطقي) | ✅ |
| P0-9 | Alt=reset: استعادة الموضع الأصلي عند blur/visibilitychange مع تنظيف المستمعين | ✅ |
| P0-10 | تجاهل Ctrl/Cmd+wheel في تمرير الفتحة (لا تكبير مزدوج) | ✅ |
| P0-11 | طابع تاريخ الحصص اليومي موحّد sv-SE في 3 مواضع — العدّاد يصح عند منتصف الليل UTC+3 | ✅ |
| P0-12 | قفل Worker مشترك + خريطة طلبات — عزل الخلفية المتزامن من الشريط واللوحة لا يتعارضان | ✅ |
| P1-1 | ثبات targetPixelRatio تحت أي zoom (تعليق توثيقي — السلوك صحيح رياضياً) | ✅ |
| P1-2 | إزالة iframe المعاينة عبر afterprint بـ {once:true} + مهلة أمان 60s | ✅ |
| P1-3 | استرجاع آخر هامش غير صفري عند إطفاء «بدون هوامش» + صفر تلقائي عندما يطابق العرض الورق تماماً مع الهامش الافتراضي | ✅ |
| P1-4 | صيغة عدد النسخ تأخذ الفجوة في الحسبان (سقف 48) في كل الأوضاع | ✅ |
| P1-5 | خطوط القص تستخدم offsetX/offsetY (أصل ممركز) — تزامن بين المعاينة والتصدير | ✅ |
| P1-6 | تصفير الصورة المُلتقطة عند إغلاق حوار الطباعة (لا صورة قديمة بعد المعاينة) | ✅ |
| P1-7 | حارس Enter داخل عناصر الإدخال في حوار الطباعة (لا طباعة عشوائية) | ✅ |
| P1-8 | رسائل خطأ واضحة عند فشل استبدال/قص الصورة (toast) | ✅ |
| P1-9 | حذف من قائمة السياق يفلتر المقفولة | ✅ |
| P1-10 | إسقاط الصورة على فتحة الكولاج بإحداثيات منطقية + قانون الموضع (margin + slot.x×avail + gap/2) | ✅ |
| P1-11 | سحب الصورة داخل الفتحة عبر عكس التحويل المطلق (لا انحراف عند zoom) | ✅ |
| P1-12 | مساطر المؤشر تُستعلم كل إطار rAF (لا refs قديمة بعد تغيير الحجم) | ✅ |
| P1-13 | تغيير صورة الفتحة بنسبة أبعاد مختلفة يعيد ضبط drag/zoom (يحافظ على flip/rotation) | ✅ |
| P1-14 | مرايا الحواف والزوايا داخل منطقة النزيف (mirror-bleed) في التصدير | ✅ |
| P1-15 | معاملات تقدير حجم الملف (JPG 0.35 / PNG 0.6) + لصاقة «تقريبي» | ✅ |
| P1-16 | قرار: بقاء 5/يوم للمجاني بدون بوابة ترخيص للـ Enhance — شارة PRO/AI فقط في الشريط السريع | ✅ |
| P1-17 | خصائص التحديد المتعدد: المفاتيح الأسلوبية للكل، والموضعية (x/y/locked) للعنصر المعروض | ✅ |
| P1-18 | محاذاة التحديد المتعدد لحدود المجموعة (توسيط/أعلى/يمين/…) | ✅ |
| P1-19 | قرار موثق: وضع الكولاج يمسح elements عند الدخول — الأوضاع منفصلة عمداً | ✅ |
| P2-3 | محرر النص: تمييز بصري بـ box-shadow بدل border/padding (لا انزياح عن العرض الدقيق) | ✅ |
| P2-4 | Escape في محرر النص يحفظ المكتوب (نفس منطق onBlur) — لا يضيع نص المستخدم | ✅ |
| P2-8 | قصّ صفر: toast «حدد منطقة قص صالحة» + حماية أبعاد القالب | ✅ |
| P2-9 | إعادة قياس قائمة السياق عند تغيّر محتواها أثناء الفتح (spinner↔نص) | ✅ |
| P2-11 | تبويبة الحساب/الترخيص تُشتق عند كل فتح للحوار (لا تبقى قديمة) | ✅ |
| P2-14 | حوار تأكيد عند تبديل قالب الكولاج إذا كان يسقط صوراً موجودة أو يمسح عناصر الوضع الحر | ✅ |
| P2-15 | تغيير DPI يُحسب من قيم الـ store لا من الحقول الجزئية + سقف 2000mm | ✅ |

**مؤجّلة من P2 (موثقة بلا تنفيذ):** P2-1 (حد أدنى للتحجيم — يمس فلسفة boundBoxFunc المحمية)، P2-2 (flipX XOR — SPECULATIVE يحتاج إثباتاً يدوياً)، P2-5 (مزامنة إزاحة magic-ai-scanner)، P2-6 (لمس الكولاج — لا يمكن التحقق هنا)، P2-7 (Space عالق في refine-bg — يحتاج فحص فرشاة يدوي)، P2-10 (WindowIsMaximised غير متوفر في bindings — بقي استدلالياً)، P2-12 (تثبيت LRU للصورة المعروضة)، P2-13 (إلغاء/watchdog لمحدّث التحديث).

---

## 0.1 سجل جلسة الإصلاحات الشاملة 🅑 (31 يوليو 2026 — إغلاق الـ Backlog)

**المُنجز والمختبر (go test ✅ 5 pkg / vitest ✅ 117/117 / typecheck ✅ / build frontend ✅ / build admin-web ✅ / lint ✅ 0 أخطاء):**

| البند | الإصلاح | الحالة |
| --- | --- | --- |
| E-6 | التصدير اليدوي الاحتياطي: تدرجات linear/radial للأشكال والنصوص، `ctx.shadow*`، `globalCompositeOperation`، قص `cornerRadius` للصور عبر intermediate canvas، رسم `path` بـ Path2D/mقياس viewBox، إطار النص `strokeText`، وزخرفة underline/line-through يدوياً | ✅ مُختبر |
| E-7 | سلايدر زاوية التدرج (0–360°) في gradient-picker (محسوبة من مركز العنصر)، وخيار وحدة mm/px في المساطر مع حفظ التفضيل في `grido_ruler_unit` | ✅ مُختبر |
| AI-4 | حُذف `frontend/public/models/esrgan-slim/` (~902KB) — تحقق grep من غياب المراجع | ✅ |
| AI-5 | حُذف `supabase/functions/ai-enhance/` بالكامل | ✅ |
| L-5 | حُذف `nunito-v16-latin-regular.woff2` اليتيم | ✅ |
| README/CHANGELOG | `selfie_multiclass` بدل RMBG-1.4، 1024px بدل 2048، **12 عائلة خط** بدل 26، حصص **5/15/50** بدل 3/25/100، سقف تراجع **30** بدل 20، قسم [Unreleased] يوثق الجلستين | ✅ |
| **صفحة الهبوط** | إعادة تصميم شاملة: إصدار ديناميكي من `/api/version` (لا يدوي `1.2.3`)، og:image (1200×630 مولّد)، canonical/og:url/robots/JSON-LD، أقسام أسعار + شهادات + سيناريوهات + مقارنة، أدوار ARIA للتبويبات (`role=tablist/tab/tabpanel`)، aria-label لسلايدر قبل/بعد، رابط «تخطَّ إلى المحتوى»، حذف Cairo الزائد (خط واحد)، تجميع mousemove fix (`closest` + rAF throttle)، ف줌 نظف كل classes الميتة (`brand-*`→ ثيم `@theme` brand-scale حقيقي، `xs:` معرّف، `bg-ink-950`→`bg-black`)، حذف Three.js deps + Embedded3D/StudioHero3D/App.css/hero.png/react.svg/vite.svg/favicon.svg/icons.svg/dribbble-3d-demo.mp4/5×.jpg منسوخة، `tailwind.config.js` القديم (v3) محذوف، خط «التنفيذية»→«اليدوية»، روابط فوتر `href="#"` أُزيلت/استُبدلت بالوكيل المعتمد | ✅ مُختبر بناءً |
| **AI-1 (إصلاح ارتداد حرج)** | بعد التحويل لـ module Worker ظهر «ModuleFactory not set»: ملفات `public/wasm/` كانت بإصدار الحزمة القديمة (classic glue بلا `globalThis.ModuleFactory`). **الإصلاح**: مزامنة كاملة مع `@mediapipe/tasks-vision` v0.10.35 (module + nosimd + classic trio)، واستدعاء `forVisionTasks(wasmBaseUrl, true)` للـ module loader. **التحقق**: استدعاء `import()` للملف المُزامِن يسجّل `ModuleFactory` فعلاً (Node ESM)، واختبار النموذج على صورة حقيقية (`id-pic.png` 1254×1254 → مقدمة 49.6% + حدود ناعمة 1.1%) نجح. اختبار vitest (bg-worker) حُدّث لمحاكاة Web Worker + التحقق من `terminate` | ✅ مُختبر |

---

## 0. سجل جلسة الإصلاحات الشاملة 🅐 (31 يوليو 2026 — الصباحية)

**المُنجز والمختبر (go test ✅ / vitest جزئي ✅ / typecheck ✅ / build ✅):**

| البند | الإصلاح |
| --- | --- |
| L-1 | المحدِّث يتحقق من SHA-256 للمثبت قبل تشغيله (fail-closed)، و`version.ts` يرسل البصمة من `grido-checksums.txt` الجديد في pipeline الإصدار |
| L-4 | فصل `runAsAdmin` إلى `updater_windows.go` / `updater_other.go` ببناء شرطي |
| AI-2 | الحد اليومي يُشتق خادمياً من خطة المستخدم (Go + RPC جديد `p_check_only`) — لم يعد العميل موثوقاً |
| AI-3 | إزالة مسار `X-Grido-Api-Key` الميت؛ تسجيل الدخول إلزامي |
| AI-1 | Web Worker حقيقي `workers/bg-removal.worker.ts` + إلغاء قسري فوري (terminate) |
| AI-6 | توثيق قياسات فعلية للمدة (costUsd=0 للاستدلال المحلي) |
| L-3 | توحيد التسجيل في `grido.log` واحد (lumberjack) عبر GetAppDir + sync.Once؛ حُذف `utils/logger.go` |
| E-1 | `textBgColor` يُصيَّر الآن في Konva (Rect خلف النص) + نافذة التحرير + التصدير اليدوي |
| E-2 | قلب/تدوير الخانات: واجهة (4 أزرار) + تصيير Konva (Group تحويل) + تكافؤ `flipY` كامل للعناصر |
| E-3 | تفعيل أزرار VECTOR_SHAPES الخمسة مع viewBox وقياس صحيح للمسار |
| E-4 | لقطة السجل تشمل إعدادات الكولاج/الكانفس/الخلفية — التراجع يعمل فعلياً |
| E-5 | مغناطيس أثناء التحجيم (Resize) في `boundBoxFunc` مع معايرة ذاتية للإحداثيات |
| E-8 | `nextZIndex()` تصاعدي رتيب — لا تصادم زراعياً في 5 نقاط توليد |
| L-2 | Autosave يراقب `gridType`/`snapToGrid`؛ استُبعد `showRuler` عمداً (تفضيل واجهة — AGENTS.md #68) |
| P-1 | شريط «توزيع النسخ» في حوار الطباعة: نسخ/ورقة + نمط تكرار + مسافة + خطوط قص |

**قرارات موثقة يجب احترامها:**
- `getSnapPositions` **ليست** كوداً ميتاً — تستخدمها `test/snap-utils.test.ts` و`test/performance.test.ts`.
- حدود الحصص 5/15/50 مكررة في 3 مواضع يجب إبقاؤها متزامنة: `ai_service.go` (planLimit*) + `use-ai-enhance.ts` + migration `20260730000000`.
- الترحيل الجديد و`upscaler.py` المعدّل **لم يُنشرا بعد** على Supabase/Modal (يتطلبان فعل نشر خارجياً).

---

## 1. مصفوفة الحالة الشاملة

| # | الميزة | الحالة | الملاحظة الأبرز |
| --- | --- | --- | --- |
| 1 | محرر الكولاج + التعديل الحر (وضعان) | ✅ 🆕 | سحب منطقي + إسقاط على الفتحة بدقة zoom (P0-1/P1-10/P1-11) |
| 2 | نظام العناصر (صورة/نص/شكل) | ✅ 🆕 | E-1/E-2/E-3/E-8 + خصائص التحديد المتعدد (P1-17) |
| 3 | التراجع/الإعادة (Undo/Redo) | ✅ 🆕 | لقطة كاملة (E-4) + بذرة تاريخ صحيحة عند الفتح (P0-7) |
| 4 | الفلاتر والتأثيرات | ✅ | 6 رؤى + SkinGlow مخصص |
| 5 | المحاذاة المغناطيسية + المساطر + الشبكة | ✅ 🆕 | مغناطيس سحب وتحجيم (E-5) + محاذاة التعدد (P1-18) + مساطر بلا refs قديمة (P1-12) |
| 6 | عزل الخلفية بالـ AI | ✅ 🆕 | Web Worker + قفل مشترك متزامن (P0-12) |
| 7 | ترميم الصور بالـ AI | ✅ 🆕 | حصة خادمية + فحص مسبق قبل GPU (AI-2/AI-3) |
| 8 | ماسح المستندات | ✅ | — |
| 9 | الطباعة عالية الدقة | ✅ 🆕 | تزامن خطوط القص + هامش صفري ذكي + صيغة فجوة صحيحة (P1-1..7) + فك تشابك دورة حياة حوار الطباعة وتأمين زر الإغلاق والتنظيف الذاتي |
| 10 | التصدير (PNG/JPG + نزيف) | ✅ 🆕 | مرايا النزيف (P1-14) + تقدير حجم أدق (P1-15) |
| 11 | القوالب | ✅ 🆕 | تأكيد قبل تبديل القالب عند إسقاط صور (P2-14) |
| 12 | التراخيص والمصادقة | ✅ 🆕 | تبويبة صحيحة عند كل فتح (P2-11) |
| 13 | حفظ المشاريع + نسخ احتياطي | ✅ | — |
| 14 | الحفظ التلقائي | ✅ 🆕 | مراقبة كاملة للحقول المسلسلة (L-2) |
| 15 | الخطوط الأوفلاين | ✅ | 12 عائلة |
| 16 | المحدِّث التلقائي | ✅ 🆕 | تحقق SHA-256 + بناء شرطي (L-1/L-4) |
| 17 | نافذة Frameless + مثيل واحد | ✅ | — |
| 18 | التسجيل وتصدير السجلات | ✅ 🆕 | نظام واحد موحد (L-3) |

---

## 2. الفجوات المتبقية (Backlog بعد الجلسة)

| # | الفجوة | الموقع | الخطورة |
| --- | --- | --- | --- |
| — | تصنيفا `visa` و `personal` بلا قوالب فعلية | `photo-templates.ts` | تجميلية |
| L-6 | لا ترحيلات إصدارية للمشاريع (`VERSION=1` ثابت) | `project-serializer.ts` | تجميلية |
| — | تحويل CMYK بلا ملفات ICC | `print_service.go` | منخفضة (موثق) |
| — | كشف تكبير النافذة استدلالي | `use-window-controls.ts` | تجميلية |
| S-1 | سلسلة توقيع التحديث غير مجسّرة end-to-end: لا يُولَّد/يُرفع ملف `.sig` في مسار الإصدار (checksums فقط)، والتوقيع يُتحقق منه فقط إن مُرِّر الحقل عبر `/api/version` | `.github/workflows/release.yml` + `internal/service/updater.go:479-481` | متوسطة — يخففها SHA-256 fail-closed (قرار 0.67/D-1) |
| S-2 | وضع توقيع الثنائيات المُصدرة يعتمد على تعريف متغير المستودع `UPDATER_PUBLIC_KEY` في إعدادات GitHub (غير مقروء من الكود — يجب تأكيده)؛ غيابه = «بصمة + تحذير» | `.github/workflows/release.yml:167` + `internal/service/updater.go:597-609` | منخفضة (قرار 0.67 محمي) |

> البنود E-6، E-7، المساطر px، AI-4، AI-5، L-5 أُغلقت جميعها في جلسة 🅑 — انظر سجل 0.1 أعلاه.

### تحسين أداء إضافي (جلسة 🅑 — إضافة بعد المراجعة)
- `updateElement` في `element-slice.ts` (س 188): أضيف فحص shallow-change قبل `.map()` لمنع إعادة بناء مصفوفة العناصر عبر كل تفاعل drag/transform محكوم بـ rAF. لا يغيّر الواجهة — يزيل «إعادة الرسم المتتالية بلا داعٍ» عند التعديلات الحركية المجمعة. (اختبارات 117/117 خضراء).

**أعمال نشر خارجية مطلوبة (خارج الكود):**
0. **إبطال (Revoke) أي مفتاح Modal قديم** يبدأ بـ `grido_sec_ai_live_` من لوحة Modal — يبقى قابلاً للاستخراج من الإصدارات المنشورة سابقاً (تدقيق `C-02`).
1. تطبيق `supabase/migrations/20260730000000_server_side_ai_quota.sql` على قاعدة Supabase.
2. إعادة نشر `modal_ai/upscaler.py` على Modal.
3. إصدار Tag جديد لاختبار `grido-checksums.txt` + التحديث التلقائي end-to-end.

---

## 3. انحرافات التوثيق (README vs الواقع) — ✅ أُغلقت كلها في جلسة 🅑

| الادعاء السابق | التصحيح المنفذ |
| --- | --- |
| «RMBG-1.4 عبر MediaPipe في Web Worker» | ✅ وُثّق `selfie_multiclass.tflite` عبر `@mediapipe/tasks-vision` في Worker (README + developer_guide + CHANGELOG) |
| «تصغير الصور لـ 2048px قبل الاستدلال» | ✅ وُثّق الحد الفعلي **1024px** |
| «26 عائلة خطوط عربية» | ✅ وُثّقت **12 عائلة** (89 ملف woff2) |
| «30 عائلة خطوط عربية (16 منها أوفلاين)» في README | ✅ صُحّحت إلى **29 عائلة في المُنتقي** (16 مُعدّة للعمل أوفلاين · 12 تُنزَّل آلياً) — مطابقة `frontend/src/lib/io/fonts.ts` (29 مُدخلاً / 16 `isOffline`) |
| «62 ملف اختبار» في README و«67 ملف/469 حالة» في testing_guide | ✅ صُحّحت إلى **84 ملف / 684 حالة** (683 ناجحة + 1 متخطّاة) + E2E **25 ملف / 165 حالة** |
| «حصص AI: free 3 / pro 25 / enterprise 100» | ✅ وُثّقت **free 5 / pro 15 / enterprise 50** (اشتقاق خادمي) |
| CHANGELOG: «Undo/redo capped at 20 entries» | ✅ السقف الفعلي **30 مدخلاً** |

---

## 4. قواعد التتبع المثالي

1. **عند إغلاق فجوة:** انقلها من جدول الفجوات إلى المصفوفة وحدّث تاريخ آخر تحديث.
2. **عند إضافة ميزة:** أضف صفاً في المصفوفة برقم تسلسلي + ملفاتها + حالتها من أول يوم.
3. **التقاطع مع TASKS.md:** الفجوات الأمنية/الجودوية تبقى مملوكة لـ `docs/development-plan/TASKS.md`؛ هذا المستند مرجع حالة فقط.
4. **قبل كل إصدار:** أعد مطابقة المصفوفة وانحرافات التوثيق مع الكود الفعلي.
5. **الخطورة:** عالية = تمنع الإصدار | متوسطة = تُجدول | منخفضة/تجميلية = فرص تحسين.

---

## 5. قرارات محمية — يُمنع نقضها بلا موافقة صريحة من المالك (2026-09-25)

| # | القرار | السبب والدليل | الأثر على التدقيق |
|---|---|---|---|
| D-1 | إصدارات غير موقعة عمدا (لا شهادة — قيد مادي) | التعويض: `bin/grido-checksums.txt` + تحقق SHA-256 fail-closed `internal/service/updater.go:278-292,359-392`؛ التوليد `release.yml:197-208` | لا يُصنف كعيب حرج — خطر مقبول وموثق |
| D-2 | Wails v3 `beta.28` فوق v2 المستقر | v2 ميت معماريا؛ الترحيل موثق `BUILD-FIX 2026-09-18` | لا يُقترح الرجوع لـ v2 |
| D-3 | E2E بجسر v3 مُحاكى (`wails-v3-bridge.ts:34`) | Chromium ≠ WebView2؛ الشحن `WebView2/WebKitGTK` (`playwright.config.ts:35`) و `@smoke` فقط عليه | لا تُتهم الثقة — المقايضة عقلانية |
| D-4 | `BUGS_REPORT.md` أرشيف تاريخي | معظم بنوده مُصلحة (`ai_service.go:331`، `db.go:408`)؛ القاعدة `DOCUMENTATION_MAP.md:112` إلحاق فقط | لا يُحاكم به الحاضر |
| D-5 | صقل أولا — PSD/VDP/ICC الكاملة خارج النطاق حاليا | `M-6/M-7/M-8` مؤجلة بقرار مالك 2026-09-25؛ الإضافة الوحيدة المسموحة `culori` والحذف `onnxruntime-web` | لا تُفتح كفجوات إصدار |
