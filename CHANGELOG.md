# Changelog — Grido Studio

> **معمارية Fragments (2026-10-14):** هذا الملف مُولَّد تلقائياً — آخر 5 إصدارات + [Unreleased] فقط. لا يُعدَّل يدوياً أبداً.
> الأرشيف التاريخي (ما قبل v1.14.6): [`CHANGELOG_ARCHIVE.md`](CHANGELOG_ARCHIVE.md) — كل جلسة وكيل تُنشئ fragment واحد في `changelog/fragments/` والترفيع يجمعها هنا عبر `scripts/release.mjs`. المرجع: [`changelog/README.md`](changelog/README.md).

All notable changes to Grido Studio are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

> **تصحيح توثيقي (سبتمبر 2026 — مثبت من الكود):** إدخال `v1.2.11` ادعى أن `build.ps1` يفشل عند غياب `MODAL_AI_KEY`، لكن `build.ps1` يبني بمفتاح فارغ دون فشل. يُترك الإدخال الأصلي لسجل التاريخ. **تحديث 2026-09-25:** أُزيلت آلية `MODAL_AI_KEY` من البناء والكود بالكامل (تدقيق `C-02`) — لم يعد للموضوع وجود.

## [Unreleased]

## [v1.15.2] - 2026-10-14

### Reverted
- **تراجع نظيف عن تجربة نظام الطبقات V2 ولوحة الطبقات المكررة (Clean Rollback to v1.15.1):**
  1. إلغاء التغييرات غير المستقرة في محرك الكانفاس (`layer-system.ts` و `viewport-culling.ts`) وإلغاء فرض تركيب جميع الطبقات في وقت واحد، وإعادة التركيب الشرطي النظيف حسب الوضع في `konva-canvas.tsx`.
  2. إلغاء إرجاع `null` في `konva-single-layer.tsx` الذي كان يسبب تدمير عقد Konva وفقدان مراجعها وكاش الصور عند التكبير والتحريك.
  3. استعادة ملفي الشبكة والأعمدة المعزولين (`grid-layer.tsx` و `columns-layer.tsx`) وإلغاء دمجها غير السليم في طبقة الخلفية.
  4. استئصال الازدواجية في لوحات الطبقات: إزالة حشو `LayersPanel` من لوحة الخصائص `properties-panel.tsx`، والاعتماد الحصري على نظام الطبقات المكتمل والموحد `LayersList` و `freeform-layers-tab.tsx`.
  5. استعادة الحالة المستقرة لشرائح الستور (`core-slice.ts` و `collage-slice.ts`) وخدمات الباك إند.

### Removed
- **استئصال الكود الميت والفخاخ المعمارية (Dead Code & Trap Removal):**
  1. حذف المكون المهجور `layers-panel.tsx` وإلغاء تصديره من `panels/index.ts` لمنع تشتيت الوكلاء وضمان بقاء `LayersList` مصدراً وحيداً للحقيقة.
  2. تحويل ملف الاختبار `test/layers-panel.test.tsx` إلى `test/layers-list.test.tsx` لاختبار مكون `LayersList` الفعلي والمستخدم في الإنتاج مع نجاح 7/7 اختبارات.
  3. استئصال الملفات الميتة ذات الصفر استيرادات: `preset-miniature.tsx`، و `print-icon.tsx`، و `pointer-lock.ts`.

### Fixed
- **إصلاح خطأ دورة حياة React Ref في جسر كاميرا الهاتف (Phone Bridge Dialog):**
  1. تحديث `isRunningRef` داخل `useEffect` بدلاً من تعديله أثناء دورة الرسم (Render phase) للامتثال الصارم لقاعدة `react-hooks/refs` في ESLint وضمان نجاح فحص الـ CI السحابي 100%.
### Added
- اعتماد خط «المراعي» (Almarai) كخط أساسي لواجهة Grido Studio لإضفاء طابع عصري وناعم ومريح للعين ينسجم مع فلسفة Microsoft Fluent 2 مع إبقاء IBM Plex Sans Arabic كخط بديل احتياطي.

### Fixed
- معالجة استثناء كومتات ترفيع الإصدار في بوابة التوثيق (docs-gate) وتمرير GRIDO_DOCS_GATE في release.mjs لضمان سلامة جمع الشظايا والوسم محلياً وفي CI.
- إصلاح مشاكل تبويب الطبقات: إزالة DragOverlay المسبب لانزياح الطبقة خارج موضع المؤشر في RTL، وقفل سحب الطبقات حصرياً على المحور الرأسي Y، وإدماج أدوات التحكم داخل بطاقة السطر دون إطار عائم، وإبقاء أزرار الإظهار والقفل ظاهرة دائماً، وحل مشكلة بتر أسماء الطبقات وتحديث نمط سلة المهملات وفق معايير Fluent 2.
- تحديث اختبار محرك الخطوط ليتوافق مع شحن خط ريدكس برو محلياً مع التطبيق كخط الواجهة المعتمد، وتعديل حشو أزرار لوحة ترتيب الكولاج لتفادي أي اقتطاع نصي لحروفه العريضة.

### Refactored
- تحويل سجل التغييرات إلى معمارية Fragments — تقسيم CHANGELOG إلى نشط (آخر 5 إصدارات) + أرشيف، وإنشاء changelog/fragments/ بسكيما صارمة (type/scope/related_files)، وتحويل release.mjs ليجمع الـ fragments تلقائياً عند الترفيع مع تقليم الأقدم إلى الأرشيف.
## [v1.15.1] - 2026-10-13

### Added
- **دعم تصدير الطباعة بصيغة CMYK TIFF للأجهزة والمطابع (CMYK TIFF Print Export):**
  1. توجيه مسار حفظ أوراق الطباعة عند اختيار فضاء الألوان CMYK ليُصدّر كملف `.tiff` عالي الدقة متوافق مع المطابع بدلاً من `.jpg`.
  2. تعريب وتأنيس رسائل فشل الطباعة عبر إشعارات Toast عربية واضحة ومحددة الخطأ بدلاً من السلاسل النصية الخام لرسائل خطأ Go IPC.

### Performance
- **إلغاء حجب خيط الرسم في الكانفاس للصور الضخمة (Canvas Unblocked Render M16-final):**
  1. فك اختناق `getDisplayImage` في `frontend/src/lib/canvas/display-image.ts`: القضاء على حجب طور الرسم التزامني (80–200ms لتنفيذ `drawImage` لصور 5000px) عبر استدعاء غير محجوب يطلق `ensureDisplayProxy` في الخلفية ويعيد الأصل فوراً (<16ms للرسم الأول).
  2. إنشاء خطاف `useDisplayImage` التفاعلي (`frontend/src/hooks/use-display-image.ts`) كجسر بين الرسم وبناء البروكسي الخلفي عبر `createImageBitmap`، مع إعادة رسم سلسة فور جاهزية النسخة المخففة دون وميض ومع الحفاظ على السلوك التزامني لبيئة الاختبارات (jsdom).
  3. ترحيل مكونات الكانفاس الرئيسية `image-node.tsx` و `collage-image.tsx` لاستخدام `useDisplayImage`.
- **التفريغ الاستباقي للذاكرة عند فقدان التركيز (Proactive Working Set Memory Trim):**
  1. ربط حدث `window.blur` في `frontend/src/hooks/use-window-controls.ts` باستدعاء `triggerMemoryTrim()` لتفريغ الـ Working Set فور فقدان التركيز تزامناً مع عقدة الباك إند `main.go/WindowLostFocus`.

### Fixed
- **إصلاح تسريب أقفال الملفات الذرية في Go (Atomic File Locks Leak Fix):**
  1. القضاء على تسريب `pathLocks` في `internal/utils/atomicfile.go`: استبدال `sync.Map` اللانهائي (الذي كان يحتفظ بكل مسار فريد `img_${nano}.png` حياً للأبد) بنظام قفل مع عداد مراجع (`refCountedMutex`) وقفل عام `pathLocksMu`؛ يُحذف المفتاح تلقائياً فور وصول `refs == 0` بعد فك القفل دون كسر التسلسل التنافسي.
  2. إضافة دالة `PathLocksCount()` للمراقبة وتثبيت 4 اختبارات تسريب ومنافسة جديدة في `internal/utils/atomicfile_leak_test.go` (50 كاتب متزامن لنفس المسار، 1000 مسار وسائط فريد متتالي، 200 مسار مع `Abort` متتالي، و100 كاتب متزامن لمسارات فريدة) مع ثبوت عودة العداد للصفر تماماً (0 PASS/FAIL leaks).
- **إصلاح دورة حياة جسر كاميرا الهاتف (Phone Bridge Lifecycle Fix):**
  1. منع إعادة تشغيل `initBridge` المكررة عند فتح الحوار عبر استخدام `isRunningRef` في `phone-bridge-dialog.tsx` بدلاً من الاعتماد المباشر على تغير حالة `bridgeInfo?.isRunning` في مصفوفة التبعيات، وإيقاف الخادم بنظافة عند dismiss.
- **إصلاح شامل لعيوب الواجهة (UI Bug Hunt):**
  1. التصدير قابل للإلغاء أخيراً: الإغلاق أثناء التحميل مسموح ويوقف الحلقة بصمت (راية + رمز جولة ضد التزامن)، وزر الفوتر يتحول لـ«إيقاف التصدير»، وبلا رسائل نجاح/فشل كاذبة بعد الإغلاق.
  2. منع تكديس المودالات: اختصارات فتح الحوارات والتبويبات والوضع تتجاهل الحالة أثناء مودال مفتوح أو داخل الحقول (`shouldIgnoreCanvasAction`)، وحذف جراحة DOM من إغلاق الطباعة، وتوحيد Escape على مسار Radix وحده.
  3. شاشات compact (<1024px): شريط تبويبات داخلي للاستوديو الحر، وزر عائم للوحة الأوامر بنفس اللوحة والحالة (Ctrl+K يعمل)، ومبدّل وضع مدمج بالأيقونات في الترويسة.
  4. مزامنة الألواح: الفتح التلقائي للخصائص عند التحديد لجميع العروض (لا standard فقط)، وإيقاف تلويث `activePanel` عند طي المفتش في wide، ومطابقة Alt+1..9 للقائمة المفلترة لمسار quick، وتأكيد `AlertDialog` لإفراغ الخانات.
  5. سلامة الحالة: مُحدِّث `setPrintSettings` نقي (دفع متزامن بلا setTimeout)، وحارس انشغال خانة العمليات + فحص متبادل في خطافات AI الثلاثة، ومسار كتابة autosave واحد مشترك، وتسوية كاملة عند فك تأطير الوجه.
  6. كانفس Konva: حارس قسمة-على-صفر واتجاه RTL في محرر النصوص، وقص الشريط السريع للورق الضيق، وتأطير mid-ticks السالبة، ونطاق مؤشر المساطر بالنافذة، وسمك شاشة ثابت للتحديد، ومنطقة snap محدودة، واستعادة معاينة الخلية عند الفك، وتنظيف pointerup.
  7. وصولية: أسماء للـ Switches، وتنقل لوحة مفاتيح لرقائق الترشيح، وحارس حقول refine، وحارس إعادة الملصقات، وحارس بحث الكتالوج، وعزل bidi للمفاتيح والمسارات، وحلقة تركيز لخلايا الخانات، وقائمة طبقات بدور list/listitem مع إظهار الإجراءات عند التركيز، وتوثيق متغيرات Tab/Shift+Z/Backspace، واحترام `prefers-reduced-motion` عبر MotionConfig، وسقف LRU لكاش العزل.
  8. لم يُمس: عقد `h-6 w-6` للشريط السريع (محمي باختبار)، و`z-50` المرخص للـ overlays (مثبت باختبار ui-compliance)، وتصميم كاش الفلاتر M15 (مقصود وموثق) — رُفضت التغييرات المقترحة عليها بعد التحقق.
- **مواءمة الواجهة مع قواعد `ui-ux-fluent.md` (تحسينات امتثال Fluent 2):**
  1. صياغة نصوص الانتظار في `toolbar-ai-tools.tsx`: `جاري العزل ...` / `جاري التأطير ...` / `جاري الترميم ...` (مسافة + نقاط حذف حسب ثابت Wait UX).
  2. استكمال RV-4 في المواضع التي فلتت من توحيد v1.14.8: توجيه أخطاء `export-dialog.tsx` و `main.tsx` عبر `createLogger` الموحد.
  3. هرمية الاستدارة: صفوف وأزرار التحكم `rounded-md` بمستوى عناصر التحكم.
  4. حذف متغير الحجم `icon-xs` غير المستخدم من `button.tsx`.
  5. لم يُمس شريط الكانفس السريع (`h-6 w-6`): عقد أبعاد موثق ومحمي باختبار.

## [v1.15.0] - 2026-10-12

### Added
- **نقل عزل الخلفية بالذكاء الاصطناعي إلى محرك Go الأصلي (Go Native ONNX Runtime Background Removal):**
  1. تشغيل نموذج `modnet.onnx` فائق الدقة المخصص لصور البورتريه والاستوديوهات الاحترافية محلياً 100% عبر مكتبة `github.com/yalue/onnxruntime_go` (v1.16.0 المتوافقة مع Microsoft ORT API v20).
  2. الحفاظ الكامل على معمارية الملف التنفيذي الواحد المستقل (Single Portable Executable): تضمين `onnxruntime.dll` و `modnet.onnx` داخل الثنائي عبر `//go:embed`؛ يتم استخراج المكتبة ذرياً لمرة واحدة فقط في `%APPDATA%\GridoStudio\bin` بينما يُحمَّل النموذج مباشرة من الذاكرة (In-Memory Session) بدون كتابة على القرص.
  3. دمج ومعالجة القناع بأعلى سرعة عبر أنوية المعالج بالكامل (`compositeMaskParallel` و `ResizeGrayLinear`) مع مكافحة تسرب الهالات البيضاء على خصلات الشعر وحماية ألوان خلفيات الاستوديو (Chroma Decontamination) والترميم الناعم.
  4. استجابة فائقة وزمن استدلال ~270ms على المعالج (CPU) دون استهلاك كرت الشاشة في WebView2، والتخلص التام من انهيارات WebGL وتجميد الواجهة وتسريبات الذاكرة لـ Web Worker.
  5. حذف `bg-removal.worker.ts` والاستغناء عن حزمة `@mediapipe/tasks-vision` في عزل الخلفية.

## [v1.14.8] - 2026-10-12

### Changed
- **استكمال توحيد التسجيل الأمامي عبر `createLogger` (Frontend Unified Logging Completion):**
  1. استبدال كل نداءات `console.error/warn` الخام في 40 ملفاً من الواجهة بمسجّلات نطاق `createLogger(scope)` من `frontend/src/lib/logger.ts`، مع توجيه `info/warn/error` إلى سجل الـ backend المنظم (lumberjack) عبر `LogFrontendError`.
  2. إصلاح فقدان قابلية الفحص في DevTools: الـ console تستلم الآن الأجزاء الأصلية (كائنات قابلة للتوسيع و`Error` قابل للنقر) بينما الـ backend يستلم النص المنسق، ومعالجة `Error.message` بدل `{}` الفارغ من `JSON.stringify`، واستخدام `console.info/debug` بمستواها الصحيح.
  3. حارس امتثال جديد H9 في `frontend/test/ui-compliance.test.ts` يمنع عودة أي `console` خام إلى كود الإنتاج (يُستثنى `lib/logger.ts` نفسه وasserts التطوير والاختبارات).
- **تصليب وتسريع خط البناء والاختبارات السحابي (CI Hardening & Fast-Path — تحقق 2026-10-12):**
  1. أمان بالحد الأدنى (`permissions: contents: read` على مستوى سير العمل — كل الوظائف للقراءة فقط افتراضياً، على نمط `release.yml`) + `workflow_dispatch` للتشغيل اليدوي.
  2. فلترة مسارات (`changes` عبر `dorny/paths-filter@v3`): الوظائف الثقيلة تعمل فقط عند تغيّر مدخلاتها (بوابة التوثيق تعمل **دائماً** بلا استثناء) — طلبات التوثيق فقط تنتهي في ~دقيقة بدل ~25 دقيقة، مع ضمان متقاطع موثّق (الواجهة تعمل أيضاً عند تغيّر Go لانحراف الربطات، وE2E/WebKit على جسر Mock فلا تتأثر بـ Go).
  3. مهلات صريحة لكل وظيفة (`timeout-minutes`: البوابة 10 · الواجهة 30 · Go ‏25 · الإدارة 20 · ‏E2E ‏40 · ويندوز 60 · ‏WebKit ‏30 · الفلترة 5) بدل حد GitHub الافتراضي (6 ساعات) عند التعليق.
  4. تثبيت `staticcheck@2025.1.1` (إصدار مُتحقق من `dominikh/go-tools`) بدل `@latest` المتحرك + مفتاح كاش مطابق، وتوحيد إصداري Go/Node في `env` علوي واحد.
  5. كاش متصفح WebKit في `webkit-smoke` (كان يُنزَّل ~100MB+ كل تشغيل) بنفس نمط Chromium + `--no-fund` في كل `npm ci`.
  6. تحديثات أمنية دورية هادئة: `.github/dependabot.yml` مضبوط بجدولة شهرية (`interval: monthly`) وسقف PR واحد لكل بيئة مع استثناء التحديثات الكبرى (`ignore: semver-major`) لمنع الضوضاء والتحديثات الكاسرة.

### Refactored
- **تفكيك أضخم 3 ملفات إلى مجلدات فرعية مع براميل توافقية (God-Module Splitting, no API change):**
  1. `freeform-math.ts` (1184 سطراً) → مجلد `frontend/src/features/freeform-collage/lib/slots/` بعشرة ملفات (`constants`, `slot-ids`, `photo-presets`, `slot-move`, `slot-resize`, `slot-align`, `slot-pack`, `slot-batch`, `layout-io`, `index`)، والملف الأصلي صار shim رقيقاً `export * from './slots'`.
  2. `element-slice.ts` (898 سطراً) → مجلد `frontend/src/lib/store/slices/element/` بتسعة ملفات (`types`, `image/text/shape-elements`, `crud`, `clipboard`, `selection`, `alignment`, `index`) بنفس اسم `createElementSlice` وشكل الحالة.
  3. `AdminDashboard.tsx` (1684 → 180 سطراً) → مجلد `admin-web/src/pages/admin/` بأربعة هوكات وعشرة مكونات عرضية بنفس التصدير الافتراضي.

### Added
- **رفع تغطية الاختبارات (+31 حالة، المجموع 1025 ناجحة + 1 متخطاة في 117 ملفاً — تحقق 2026-10-12):**
  1. `frontend/test/logger.test.ts` (6 حالات): تنسيق `Error` المرسل للـ backend، هوية الكائنات في الـ console، التوجيه الخلفي، ابتلاع فشل IPC، وكتم trace/debug بالإنتاج.
  2. `frontend/test/freeform-slots-coverage.test.ts` (25 حالة): الدوال غير المغطاة سابقاً (`newSlotId`, `snapToGrid`, `addDefaultSlot`, `slotsFromFile`) وحراس الحالات الحدية والاستيراد المعادي، عبر الـ barrel الجديد مباشرة.
- **حزمة جودة نظام الملصقات (Sticker Quality Pack — تحقق 2026-10-12، +12 حالة في `frontend/test/sticker-quality.test.ts`، المجموع 1037 ناجحة + 1 متخطاة في 118 ملفاً):**
  1. بحث عربي مُطبَّع (`normalizeArabicQuery` في `lib/sticker-text.ts`): توحيد الهمزات والألفات والتاء المربوطة/الهاء والياء/الألف المقصورة وإسقاط التشكيل والتطويل — «قهوه» تجد «قهوة»، ويُطبَّق في `searchStickerTemplates` على الاستعلام والقوالب معاً.
  2. فضّ تضارب معرّفات SVG (`namespaceStickerSvgIds`): تبادئ `id` و`url(#…)` و`href="#…"` بمفتاح القالب (idempotent) — تُطبَّق في معاينات المعرض (`sticker-catalog.tsx`) والمعاينة الحية (`sticker-studio-dialog.tsx`) فلا تتلاقط الفلاتر والأقواس المنحنية بين 80+ بطاقة معروضة معاً.
  3. حماية الوصل العربي: إسقاط `letter-spacing` عن النص RTL مركزياً في `postProcessStickerSvg` (كان يفكّك اتصال الحروف في عشرات القوالب) مع إبقائه للاتينية (ترويسات PREMIUM المتباعدة عمداً).
  4. تنبيه تباين الطباعة (`lib/sticker-a11y.ts` — WCAG نقي بلا مكتبات): تحذير كهرماني حي في لوحة الألوان عند تباين < 3.0 مع الخلفية.
  5. ملاءمة الشيت التلقائية (`autoFitSheetGrid` في `lib/sheet-generator.ts` + زر «ملاءمة تلقائية على الورقة» في تبويب الشيت): أكبر شبكة تتسع بمقاس الملصق المليمتري على ورقة الطباعة الفعالة مع الفواصل وهوامش الأمان.
  6. تصدير PNG فائق 600 DPI للمطابع (خيار جديد في قائمة التصدير) + `imageSmoothingQuality: high` في الترسترة وتوليد الشيت.
  7. سلاسة الكتابة: `useDeferredValue(params)` في الاستوديو — الحقول تستجيب فوراً ويُعاد توليد SVG الثقيل بقيمة مؤجلة.
- **رفع تغطية اختبارات الملصقات (+37 حالة، المجموع 1074 ناجحة + 1 متخطاة في 119 ملفاً — تحقق 2026-10-12):**
  1. `frontend/test/sticker-coverage.test.ts` (37 حالة بلا أي Mock — سلوك حقيقي عبر `localStorage` والمكتبات الفعلية): تصليب تخزين القوالب (6 حمولات فاسدة مرفوضة، إزالة تكرار الاسم، سقف 50، فرادة المعرفات، نسخ عميق للحقول، حذف آمن)، مسارات توليد الباركود/QR الحقيقية مقابل العناصر التحذيرية، مسارات تخطي تضمين الخطوط، تجميع الكتالوج (7 مجموعات × فلتر الشكل × البحث الفارغ)، الحقول المخفية، وتقدير القياس والحالات الحدية للأبعاد — مع مراجعة ذاتية بمهارة `test-guard` (جدولة `it.each` للمتغيرات، وفصل السلوكيات المدمجة).

### Fixed
- **إصلاحات حرجة في مسار الملصقات (P0 — تحقق 2026-10-12):**
  1. تسريب عناوين الكائنات: `revokeObjectUrlLater` في `sticker-studio-dialog.tsx` كانت تستدعي نفسها دورياً كل 60 ثانية بدل `URL.revokeObjectURL` فلا يُلغى أي عنوان أبداً — صار الإلغاء فعلياً بعد 60 ثانية مع دمج الطلبات المتتالية.
  2. رموز QR وهمية: مسار `generateQrCodeInnerSvg` المتزامن (قبل اكتمال الجلب الكسول) ومسار الفشل كانا يُرجعان مربعاً أسود مصمتاً يبدو رمزاً صالحاً وهو غير قابل للمسح — صارا يُرجعان عنصراً تحذيرياً صريحاً (إطار متقطع + ⚠) كمسار الباركود، وكذلك عنصر الانتظار في `generateBarcodeInnerSvg` (بدل الشريط المصمت) قبل جاهزية JsBarcode.
  3. معرفات القوالب المحفوظة: `saveStickerPreset` كان يستخدم `Date.now() + Math.random()` المعرّض للتصادم في العمليات السريعة — صار `crypto.randomUUID()` (مع سقوط آمن)، وتشديد التحقق من بنية `params.fields` عند التحميل من `localStorage`.
- **إصلاح صلاحيات فحص المسارات في CI لطلبات السحب (CI pull_request Paths Filter Permissions):**
  1. إضافة إذن `pull-requests: read` في سير العمل `ci.yml` ووظيفة `changes` (`Detect Changed Areas`): كان حصر الصلاحيات على `contents: read` يمنع `dorny/paths-filter@v3` من استدعاء GitHub REST API (`listFiles`) عند أحداث `pull_request`، مما أسفر عن خطأ `Resource not accessible by integration` وفشل كل طلبات السحب (بما فيها تحديثات Dependabot).
  2. توسيع مرشحات المسارات لتشمل `build/**` و `Taskfile.yml` ضمن مسارات الباك إند، و `scripts/**` ضمن مسارات سير العمل لضمان إعادة التحقق عند تعديل سكربتات البناء أو الإطلاق.
  3. فصل تثبيت اعتماديات النظام لـ Playwright (`npx playwright install-deps webkit/chromium`) عن تثبيت الثنائيات، مما يضمن وجود حزم النظام (مثل `libwoff2dec1.0.2`) على بيئة التشغيل حتى عند استعادة ثنائيات المتصفح من الكاش.

## [v1.14.7] - 2026-10-12

### Performance & Architectural Hardening
- **تحسين زمن استجابة الذكاء الاصطناعي وتوحيد كاش Supabase (Unified AI User & Plan Caching):**
  1. دمج جلب `userID` وخطة الحساب والحد اليومي في كاش ذاكري موحد `userPlanCacheEntry` في `internal/service/ai_service.go` بمهلة 5 دقائق.
  2. القضاء التام على استدعاء الشبكة المزدوج لـ `fetchSupabaseUserInfo` عند كل عملية تحسين، مما يخفض زمن استجابة طلبات الذكاء الاصطناعي للنصف، ويلغي أي استدعاء خارجي عند توفر الكاش.
  3. تنظيف الدوال غير المستخدمة واستيفاء فحص `staticcheck` الصارم للباك إند.
- **تحديث استيرادات الواجهة وعقود IPC (Wails v3 Bindings Modernization & Strict Types):**
  1. تحديث `editor-canvas.tsx` و `freeform-collage-modal.tsx` للاستيراد المباشر من `@bindings/grido/app` لـ `OpenFile`, `SaveImageFromBase64`, و `SaveCustomTemplate` واستئصال الاستيرادات الموروثة القديمة من مسارات Wails v2.
  2. تصنيف مخرجات دوال تنظيف وسائط التخزين في Go (`CleanUnusedMediaNow` و `EmptyMediaTrash`) بهياكل صريحة `MediaCleanupResult` و `MediaTrashResult` في `internal/service/media_service.go` و `app.go` بدلاً من الخرائط المبهمة `map[string]interface{}` لضمان دقة النوع عبر IPC.
- **تطهير جذر المستودع وعزل حزمة سطح المكتب (Clean Root Architecture & Desktop Package Isolation):**
  1. استخراج وتجميع كود إدارة النوافذ ومراقبة الشاشات المتعددة واستعادة الأحجام (`window_sizing.go`, `window_state.go`, `window_monitor_*.go`) من جذر المستودع إلى حزمة داخلية نظيفة ومستقلة `internal/desktop/`.
  2. تنظيف المخلفات المؤقتة والملفات التنفيذية المحلية من الجذر (`grido.exe` بحجم 95MB وسجلات vite-dev) وتحديث استيرادات `main.go` وتأكيدات بوابات التوثيق آلياً.
- **تفكيك معالج الأصول المحلي وخادم الوسائط (Modular Local Asset Server Extraction):**
  1. استخراج ما يزيد عن 320 سطراً من معالجات HTTP لمسارات `/api/*` والوسائط المحلية من `main.go` إلى خادم مستقل ونظيف في `internal/server/asset_server.go` مع حقن تبعيات `AssetServerDeps`، مما خفض حجم `main.go` من 783 سطراً إلى 470 سطراً وعزل مسارات الذاكرة ورفع الصور وحفظ الملفات.
- **فصل منطق تنظيف وسلة الوسائط عن قاعدة البيانات (Media Cleanup & Quarantine Separation):**
  1. استخراج كافة دوال فحص الصور غير المرجعية والحجر الصحي وتنظيف السلة الدورية (`CleanupUnusedMedia`, `runCleanupMedia`, `CleanUnusedMediaNow`, `EmptyMediaTrash`) من `internal/repository/db.go` إلى `internal/repository/media_cleanup.go`.
  2. تخفيض حجم `db.go` من 645 سطراً إلى 282 سطراً مكرساً حصراً لعمليات SQLite والترحيلات والـ ORM النقي، مع الحفاظ الكامل على توافق الحزمة ونجاح حزمة الاختبارات 100%.
- **توحيد تسميات الواجهة لمعيار `kebab-case` القياسي (Frontend Feature Naming Normalization):**
  1. ترقية وتوحيد 13 مكوّناً في `frontend/src/features/` من PascalCase إلى `kebab-case` قياسي (مثل `freeform-collage-modal.tsx`, `freeform-canvas-editor.tsx`, `sticker-studio-dialog.tsx`, `sticker-catalog.tsx`, `vdp-import-dialog.tsx`).
  2. تحديث براميل التصدير (`index.ts`) واختبارات المكوّنات وتكوين `eslint.config.js` مع نجاح الفحص النوعي بـ TypeScript وخلوه التام من أي تحذيرات.
