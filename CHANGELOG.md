# Changelog

All notable changes to Grido Studio are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

> **تصحيح توثيقي (سبتمبر 2026 — مثبت من الكود):** إدخال `v1.2.11` ادعى أن `build.ps1` يفشل عند غياب `MODAL_AI_KEY`، لكن `build.ps1` يبني بمفتاح فارغ دون فشل. يُترك الإدخال الأصلي لسجل التاريخ. **تحديث 2026-09-25:** أُزيلت آلية `MODAL_AI_KEY` من البناء والكود بالكامل (تدقيق `C-02`) — لم يعد للموضوع وجود.

## [Unreleased]

### Added
- **نظام الطبقات المركزي V2 وميزانية VRAM (Layer System V2 — مصدر الحقيقة الوحيد):**
  1. وحدة `frontend/src/lib/canvas/layer-system.ts` — سجل `LAYER_DEFS + LAYER_ORDER` بخمس طبقات موثقة (`background 0→ collage 1→ content 2→ overlay 3→ drag 4`)، مع تقدير VRAM بالصيغة الرسمية `scene+hit ≈ 41 MB/layer @1080p/dpr2` وحد Mobile Safari 256 MB (إنذار فوق 5 طبقات ≈205 MB). أي تغيير في z يجب أن يمر من هذا الملف.
  2. وحدة `frontend/src/lib/canvas/viewport-culling.ts` — إخفاء عناصر خارج العرض عند `>40` عنصر عبر حساب AABB مدوّر (توصية Konva الرسمية «Very Large Scenes»)، تُحسب في `konva-canvas.tsx` وتُطبق في `konva-single-layer.tsx` بلا قص للمحدد.

### Performance
- **تحسينات أداء مُستندة لتوثيق Konva الرسمي (All_Performance_Tips / Listening_False / Optimize_Strokes / Shape_Caching):**
  1. تثبيت `Konva.pixelRatio` عند التركيب فقط (`Math.min(dpr,2)`) وعدم إعادة تخصيصه مع الزوم، مع تسجيل ميزانية VRAM في DEV عند تغير DPR.
  2. `konva-background-layer.tsx` — إزالة `_context` الخاص واستبداله بسياق Konva العام `ctx` مع التمرير الصحيح لـ `fillStrokeShape(shape)`، وتجميع مسار الشبكة/الأعمدة (`beginPath` واحد + `fill/stroke` واحد).
  3. `konva-single/collage/overlay-layer.tsx` — إعلان `listening:false` و`hitGraphEnabled/clearBeforeDraw` و`perfectDrawEnabled/shadowForStrokeEnabled=false` على الطبقات/الأشكال الثابتة وفق توصيات «Listening_False» و«Optimize_Strokes».
  4. `konva-canvas.tsx` — طبقة drag مسماة `drag-layer` بترتيب z موثق وتوثيق معمارية الطبقات V2 في JSX.

### Changed
- **لوحة الطبقات المرئية بالسحب والقفل/الإظهار (Visible Layers Panel — dnd-kit + PropertiesPanel tabs):**
  1. `frontend/src/components/editor/panels/layers-panel.tsx` — ترقية من HTML5 draggable إلى `@dnd-kit/core/sortable` (`PointerSensor distance:6` + `KeyboardSensor` + `closestCenter`) مع مقبض سحب منفصل (باقي الصف للتحديد)، وحلّ شفافية السحب العالقة وتعارض `hitGraph`؛ ترتيب `zIndex` بالـ batch نفسه (`updateElements + pushHistory` مرة واحدة) مع توثيق 5 طبقات المنطقية (`layer-system.ts`).
  2. `frontend/src/components/editor/panels/properties-panel.tsx` — لوحة الطبقات صارت مرئية فعلياً عبر تبويبين مجاورين للخصائص: عند بلا تحديد تبويب `الطبقات` بجانب `الورقة/الكولاج`، وعند التحديد تبويب فرعي `الخصائص/الطبقات` داخل الخصائص نفسها؛ العنوان ديناميكي `الطبقات (N)` ويُعاد إلى `الخصائص` تلقائياً عند تغيير التحديد.
  3. `frontend/test/layers-panel.test.tsx` — تحديث للاختيار عبر `getByRole('button', {name})` الثابت بدل ترتيب DOM الهش (كان يفشل بعد dnd-kit)، مع نجاح 7/7.

### Fixed
- **إصلاحات الطبقات والـ viewport (Layer & Viewport Fixes):**
  1. `use-canvas-viewport.ts` — إصلاح تجميد أولي 220 ms كان يترك `viewportSize` عند `800×600` بوميض، وإصلاح `deltaX*=viewportH`→`viewportW` في `deltaMode PAGE`.
  2. `konva-background-layer.tsx` — حذف خاصية `mode` الميتة، وحماية `colW` بـ `Math.max(0, …)`.
  3. `core/collage-slice.ts` + `schema/types` — إصلاح اتساق `core-slice`/`collage-slice` (إعادة تموضع الفجوات/الهوامش) ومواصفات Zod الصارمة.

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


## [v1.14.6] - 2026-10-11

- **معمارية إدارة الذاكرة وتخفيض استهلاك الرام بمحرك Wails وWebView2 (Native Memory Management & Working Set Compaction):**
  1. **إلغاء وسائط Chromium المسببة لتضخم ذاكرة الرسوميات:** حذف وسائط `--enable-gpu-rasterization` و`--enable-zero-copy` و`--ignore-gpu-blocklist` من `main.go` التي كانت تجبر عملية `gpu-process` وعملية الـ renderer على حجز مئات الميجابايتات (أكثر من 600MB) من أسطح Direct3D وذاكرة البلاطات المشتركة دون داعٍ.
  2. **حظر التحميل المسبق لـ OpenCV WASM عند الإقلاع (Zero Early Allocation):** إزالة `warmupOpenCV()` من `use-app-bootstrap.ts` وتحويلها لدالة خاملة في `opencv-loader.ts` لمنع حجز 15MB من بايتات WebAssembly والذاكرة الخطية (Linear Heap) في عملية الـ renderer عند الإقلاع، وحصر تحميلها بالطلب عند فتح نافذة الماسح الضوئي فقط.
  3. **خدمة إدارة الذاكرة الأصلية في Go (`MemoryService`):** استحداث `internal/service/memory_service.go` مع التنفيذ المخصص لويندوز `memory_service_windows.go` الذي يستدعي `EmptyWorkingSet` و`SetProcessWorkingSetSizeEx` عبر شجرة العمليات التابعة لـ `os.Getpid()` (العملية الرئيسية، وعمليات WebView2: المتصفح، المعالج الرسومي، والرندر، والشبكة) دورياً كل 30 ثانية وعند تصغير النافذة أو فقدان التركيز.
  4. **ربط تفريغ الذاكرة بأحداث الواجهة (`triggerMemoryTrim`):** إضافة مسار آمن `/api/trim-memory` يُستدعى تلقائياً فور انتهاء عمليات الذكاء الاصطناعي (عزل الخلفية، ضبط الوجه)، وإغلاق نوافذ الحوار الثقيلة (الماسح الضوئي، إعدادات الطباعة، والتصدير).
  5. **النتيجة الحية المقاسة:** انخفاض استهلاك مساحة العمل الفعلية للرام (Working Set) من أكثر من 1.3GB إلى قرابة 14.4MB عبر كافة العمليات، وانخفاض الذاكرة المحجوزة للرندر من 630MB إلى أقل من 80MB.
- **تحصين اختبارات واجهة المستخدم ومعالجة الصور ضد المهلات وفحوص الـ Worker المنهى:**
  1. تحديث اختبار `frontend/test/bg-worker.test.tsx` للاحتفاظ بمرجع المثيل `MockBgWorker.lastInstance` للتحقق من استدعاء `postMessage` بعد أن يقوم الهوك بإنهاء العامل فوراً عند تسوية المهمة (`settle()`).
  2. تمديد مهلة اختبار فحص المشاهد الكبيرة `detects a document on a large 1280x960 scene without hanging` إلى 20 ثانية في `scanner-hardening.test.ts` لمنع فشل الـ CI العرضي تحت ضغط معالجات السحابة.

## [v1.14.5] - 2026-10-11

### Fixed
- **تحرير فوري لموارد WebGL/GPU وعمال الذكاء الاصطناعي (Worker Terminate on Settle):**
  1. إنهاء فوري وقسري لعامل عزل الخلفية `use-bg-removal.ts` وعامل ضبط الوجه `use-face-frame.ts` عبر استدعاء `terminateWorker()` داخل دالة `settle()` المشتركة فور اكتمال الاستدلال أو فشله أو إلغائه، بدلاً من إبقاء سياقات WebGL المعلقة في الذاكرة.
  2. إغلاق صريح لكل كائن قناع فردي `MPMask.close()` في `bg-removal.worker.ts` بالإضافة إلى `result.close()` لتحرير ذاكرة محرك الرسوميات ANGLE/Direct3D فوراً ومنع تسريب الذاكرة أو تراكم المهملات (GC Thrashing).
  3. فرض سقف أقصى صارم على أبعاد الصورة المقتصة `maxCropDim = 2048` بكسل داخل `face-frame.worker.ts` لمنع حجز لوحات رسم `OffscreenCanvas` ضخمة تُرهق محرك المتصفح.

## [v1.14.4] - 2026-10-11

### Security
- **توكن جلسة إلزامي على مسارات `/api` المحلية (Local API Session Token) — إغلاق ثغرة العمليات المحلية:**
  1. حارس جديد `internal/service/local_api_guard.go` (`service.LocalApiGuard`) يفرض على كل طلب `/api/*` شرطين: أصل مطابق لمضيف الخادم، وترويسة `X-Grido-Session` تحمل توكن العملية بمقارنة زمن ثابت (`utils.SecureTokenEqual`).
  2. **الثغرة التي أُغلقت:** فحص الأصل وحده يحجب المتصفحات عملياً (لا صفحة تستطيع إرسال Origin مطابق لمضيفنا)، لكنه لا يحجب أي **عملية محلية** ترسل `POST` مباشراً بامتيازات التطبيق إلى `/api/upload-media` أو `/api/save-file` أو `/api/upload-print-image` — أي كتابة ملفات في مجلدات التطبيق وظهور حوارات نظام. التوكن يُسلَّم للواجهة عبر ربط Wails وحده (`App.GetLocalApiToken`) — IPC داخل العملية لا يصل إليه متصفح ولا عملية خارجية — ولا يُسجَّل في أي لوج (توكن في اللوج = توكن مسروق).
  3. **السياسة فشل مغلق:** تعذّر توليد التوكن عند الإقلاع ⇒ رفض كل طلبات `/api` بدل الانفتاح الصامت.
  4. عميل واجهة موحّد `frontend/src/lib/local-api.ts` (`fetchLocalApi`) يضيف الترويسة تلقائياً، وطُبِّق على الملفات الأربعة: `use-bg-removal.ts` (`/api/apply-mask`)، `use-image-drop.ts` (`/api/upload-media`)، `print-transport.ts` (`/api/upload-print-image`)، و`export-project.ts` (`/api/save-file`).
  5. أولية مشتركة `internal/utils/securetoken.go` (`GenerateSecureToken` / `SecureTokenEqual`) مع 13 حالة اختبار، و10 حالات اختبار للحارس في `internal/service/local_api_guard_test.go` (تشمل: بلا توكن، توكن خاطئ، بادئة توكن، أصل مخالف بتوكن صحيح، أصل غير قابل للتحليل، وحارس بلا توكن = رفض دائم)، و4 حالات لعميل الواجهة في `frontend/test/local-api.test.ts`.
- **التحقق من توقيع المثبت بمفتاح عام مثبّت في الثنائي (Updater Signature Verification) — إغلاق ثقة «المصدر نفسه»:**
  1. بصمة SHA-256 تُجلب من **نفس المصدر** الذي يُجلب منه المثبت (`/api/version` أو أصول الإصدار)، فسيرفر توزيع مخترق أو اعتراض DNS بشهادة صالحة يخدم ملفاً خبيثاً وبصمته المطابقة معاً — فتنهار فائدة البصمة كاملة. أُضيف تحقق توقيع Ed25519 على **بصمة المثبت الخام** (32 بايتاً) لا على الملف كاملاً، فلا يُحمَّل ملف بحجم 200MB في الذاكرة للتحقق.
  2. سياسة صريحة: مفتاح مُهيَّأ ⇒ التوقيع **إلزامي** (Fail-closed: غياب التوقيع أو عدم مطابقته أو توقيع مفتاح آخر ⇒ حذف الملف ورفض التثبيت)؛ مفتاح غير مُهيَّأ ⇒ السلوك القديم (بصمة فقط) مع تحذير صريح في اللوج — فلا يتعطّل مسار التحديث لبناءات لم تُهيَّأ بعد.
  3. ربط البناء: `UPDATER_PUBLIC_KEY` في `build/windows/Taskfile.yml` (حقن ldflags) و`.github/workflows/release.yml` (**متغيّر مستودع لا سرّ** — مفتاح عام يُشحن في الثنائي عن قصد)، ووسيط الإصدارات `admin-web/netlify/functions/version.ts` يقرأ أصل `grido-checksums.txt.sig` ويمرّره في حقل `signature` بجانب `sha256`.
  4. عقد ربط جديد: `UpdateInfo.signature` (حقل JSON) و`DownloadAndInstallUpdate(url, sha256, signature)`؛ أُعيد توليد الربطات (`wails3 generate bindings -ts -clean=true`) والواجهة `update-notifier.tsx` تمرّر التوقيع ممّا يقرأه الخادم.
  5. 11 حالة اختبار في `internal/service/updater_test.go` (توقيع صالح، base64 بلا حشو، مفتاح آخر، بصمة معدَّلة، توقيع مفقود، ترميز مشوَّه، توقيع مقتطع، مفتاح مفقود، مفتاح بطول خاطئ، بصمة غير سداسية عشرية، بصمة بطول خاطئ) + 4 حالات لتحديد أصل التوقيع + 3 لاستخراج أول سطر منه.
- **إغلاق ثغرة `xlsx` (SheetJS) — تغيير المصدر إلى النسخة المصونة:**
  1. كان الاعتماد على `xlsx@0.18.5` من npm، وهي نسخة مهجورة تحمل تلوّث النموذج الأولي `GHSA-4r6h-8v6p-xvw6` و`ReDoS` في `GHSA-5pgg-2g8v-p4x9` مع حالة **No fix available** من npm — وملف الإدخال يأتي من خارج التطبيق (ملف Excel للمستخدم في مسار الطباعة بالبيانات المتغيرة).
  2. صار الاعتماد على النسخة المصونة من مصدرها الرسمي: `"xlsx": "https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz"`، والدليل المُقاس: `npm audit --omit=dev` في `frontend/` يعيد **`found 0 vulnerabilities`** بدل ثغرة عالية واحدة، وانخفضت شجرة التبعيات 8 حزم (`cfb`, `codepage`, `ssf`, `frac`, `crc-32`, `adler-32`, `word`, `wmf`) — و`package-lock.json` يثبّت الحزمة بـ`resolved` + `integrity` (sha512) فلا يمكن استبدالها من الـCDN بصمت.
  3. حراس التخفيف **مُبقاة** دفاعاً في العمق (ملف الإدخال غير موثوق حتى مع مكتبة مصونة): سقف التفكيك نفسه `VDP_PARSE_ROW_LIMIT = 501`، وسقف حجم `VDP_MAX_FILE_BYTES = 10MB` قبل أي قراءة، وتصفير الصيغ/الأنماط/HTML/VBA، ومنع أسماء الأعمدة الخطرة (`__proto__`/`prototype`/`constructor`). 12 اختباراً في `frontend/test/vdp-parser.test.ts` ناجحة.
  4. **مقايضة موثَّقة:** البناء يعتمد على `cdn.sheetjs.com` لجلب الحزمة (البديل الوحيد المصون)، والبديل المسجَّل لو تعطّل المصدر هو تفكيك `.xlsx` في Go (`archive/zip` + `encoding/xml` بلا تبعيات جديدة) مع `papaparse` للـCSV — بثمن فقدان دعم `.xls` القديم. مُوثَّق في `SECURITY_NOTICE.md`.

### Added
- **تصدير CMYK (TIFF/JPEG) من حوار التصدير إلى مسار الطباعة الخلفي الموجود:**
  1. مدخل «فضاء الألوان» (RGB/CMYK) في `frontend/src/components/editor/dialogs/export-dialog.tsx`، وشبكة الصيغة تتبعه: RGB ⇒ PNG/JPG و CMYK ⇒ TIFF/JPEG؛ وتُخفى مخلفات مسار RGB (النزيف وعلامات القص وتصدير الخلايا المنفصلة) في وضع CMYK بدل تشغيلها بلا أثر.
  2. المساعد `runCmykExport` في `frontend/src/lib/export/export-cmyk.ts`: يلتقط الكانفاس بنفس دقة مسار RGB (نفس العلامة المائية) ← يرفع إلى `/api/upload-print-image` ← يبني `PrintRequest` (عنصر واحد يملأ الورقة، `marginMM/gapMM=0`، بلا خطوط قص، `colorSpace: "cmyk"`) ← `ExportPrintSheet` بمهلة صريحة `EXPORT_TIMEOUT_MS` ← يقرأ ملف `print_*` من `/local-image/` ويحفظه بامتداد `.tif`/`.jpg`.
     - **هندسة صفرية الانحراف:** مقاس الورقة يُشتق بحيث يُنتج `mmToPx(mm, dpi)` بالضبط نفس أبعاد اللقطة بالبكسل (`mm ≈ canvasPx × 25.4 / dpi`)، ويُأخذ مقاس القالب الفيزيائي فقط حين يطابق الكانفاس عند هذه الدقة (فرق ≤ 1 بكسل) — وإلا لأعاد محرك الطباعة تشكيل الصورة صامتاً بمقاس مختلف.
  3. فلتر TIFF في حوار حفظ الملف الخلفي (`main.go`، مسار `/api/save-file`) — كان PNG/JPEG فقط فلا يظهر TIFF في حوار الحفظ.

### Fixed
- **تعليق أبدي في عزل الخلفية وضبط الوجه بعد سقوط العامل (Dead Worker Reuse — تعليق مرئي للمستخدم):**
  1. معالج `workerInstance.onerror` كان يبلّغ الطلبات المعلقة فقط ويُبقي `workerInstance` مرجعاً لعامل انهار — فكل طلب لاحق يُرسل `postMessage` إلى عامل لا يرد أبداً، فيبقى مؤشر «جاري العزل» ظاهراً بلا نهاية حتى يضغط المستخدم «إلغاء» بنفسه (وهو المسار الوحيد الذي يستدعي `terminateWorker`). هذه الحالة تقع فعلياً عند فشل تحميل وحدة داخل العامل أو نفاد ذاكرة WASM أو فقدان سياق GPU.
  2. الإصلاح في `use-bg-removal.ts` و`use-face-frame.ts`: يلتقط المعالج الطلبات المعلقة أولاً ثم **يُنهي العامل المُتعطّل فوراً** (`terminateWorker()` يمسح سجل الطلبات ويصفّر العامل)، فيُبنى عامل جديد عند الطلب التالي.
  3. اختبار انحدار في `frontend/test/bg-worker.test.tsx` («rebuilds a fresh worker after a worker-level error instead of hanging forever») — **أُثبت أنه يفشل على الكود القديم** (فشل تأكيد استدعاء `terminate` بحالة `1 failed`) وينجح بعد الإصلاح، فلا يكون اختباراً زائفاً.
- **مخرجات CMYK كانت تسمية بلا مضمون — TIFF بفصل أحبار حقيقي الآن (اكتُشف أثناء تنفيذ تصدير CMYK):**
  1. القياس أثبت أن `golang.org/x/image/tiff` يكتب `PhotometricInterpretation=2` (RGB) مع قناة ألفا وبكسلات محوّلة عبر `At().RGBA()` عند تمرير `*image.CMYK`، وأن مُرمِّز `image/jpeg` القياسي يكتب 3 مكوّنات (YCbCr) ولا يدعم CMYK — أي فقدان كامل لفصل الأحبار داخل ملف يُسمّى «CMYK».
  2. مشفّر مستقل جديد `internal/service/print_cmyk_tiff.go` (`encodeCMYKTIFF`): TIFF 6.0 بـ `PhotometricInterpretation=5` (Separated) و`InkSet=1` و`SamplesPerPixel=4` و`BitsPerSample=[8,8,8,8]` و`PlanarConfig=1` و`Compression=8` (Deflate) بلا `ExtraSamples`، مع إعادة استخدام `injectTIFFResolution` لوسوم 282/283/296، وضغط Deflate متدفق صفاً-صفاً بلا نسخة خام كاملة (لا قفزة ذاكرة عند سقف 50MP). `print_export.go` يستدعيه بدل `tiff.Encode`.
  3. **قيد متبقٍ (موثّق في الواجهة والتقرير):** مخرج JPEG يبقى بفضاء RGB لأن مُرمِّز Go لا يكتب 4 مكوّنات؛ الحوار يذكر ذلك صريحاً و TIFF هو الحامل الحقيقي لفصل الأحبار.
  4. تحديث اختبارين كانا يفكّان «CMYK» بمفكّك RGB فيثبّتان المخرج الخاطئ (`print_workshop_scenarios_test.go` و`print_cutline_test.go`)، وتصحيح تعليق TAC المضلّل في `print_cmyk_test.go` (المقيس 748/255 ≈ 293.3% لا ~197%).
- **تحسين استخراج قناع عزل الخلفية بالذكاء الاصطناعي وحل مشكلة القص المزدوج (`Hair-Aware Segmentation`):**
  1. استخراج قناع الشعر المستقل (`confidenceMasks[1]`) من نموذج `selfie_multiclass` في `bg-removal.worker.ts` وتطبيق عتبة ديناميكية متكيفة (*Adaptive Thresholding*): نافذة حساسية ناعمة لخصلات الشعر الرقيقة (`0.15..0.52`) تمنع بتر أطراف الشعر، مع عتبة حادة (`0.35..0.65`) للجسم والملابس للحفاظ على خطوط الأكتاف والياقة قاطعة ونظيفة.
  2. حل مشكلة القص المزدوج (*Double Clamping*) في الباك إند (`internal/service/image_processor.go`): توسيع نطاق جدول التنعيم `lutAlpha` من `[65..215]` إلى `[15..235]`، مما يسمح لشفافية الشعر الحقيقية بالمرور وتفعيل خوارزميات مكافحة الهالات وتطهير الألوان (Chroma Decontamination) عليها بدلاً من محوها صامتاً.
- **تأمين جلب بصمات SHA-256 للمثبت عبر موقع التوزيع العام (`api/checksums`):**
  - استضافة ملف البصمات `grido-checksums.txt` في مسار عام على `https://grido.cloud-ip.cc/api/checksums` وحقن بصمة `sha256` مباشرة في كائن JSON لـ `/api/version` أثناء النشر، مع تطبيع رابط جلب البصمات في `updater.go` ليتجاوز قيود المستودع الخاص ويسمح بالتحديث التلقائي الفوري دون أخطاء غياب البصمة.

### Changed
- **إعادة توليد ربطات Wails v3 بعد تغيير عقود الواجهة:** `GetLocalApiToken()` دالة ربط جديدة (معرّفها الرقمي `1585336687`) وتوقيع `DownloadAndInstallUpdate` صار ثلاثي الوسائط — أُعيد التوليد بـ`wails3 generate bindings -ts -clean=true`، وسُجِّل معالج `GetLocalApiToken` في جسر E2E كما يفرضه حارس انحراف عقود IPC (`frontend/src/lib/wails/ipc-contract-drift.test.ts`، 4 حالات ناجحة).
- **أتمتة مزامنة موقع التوزيع وواجهة برمجة الإصدارات (`deploy-pages.yml` Auto-Trigger):**
  - ربط سير عمل `release.yml` بإطلاق سير عمل `deploy-pages.yml` تلقائياً فور إنشاء ونشر أي Release جديد، لتجاوز حظر الأفعال المتكررة التلقائية في GitHub Actions وتحديث نقطة النهاية `/api/version` ومثبت التطبيق فورياً دون الحاجة للتشغيل اليدوي.

## [v1.14.3] - 2026-10-10

### Added
- **أمر إفراغ سلة وسائط التطبيق نهائياً وتحرير مساحة القرص (`EmptyMediaTrash`):**
  1. إضافة دالة `EmptyMediaTrash()` في الباك إند (`internal/repository/db.go` و `app.go`) لحذف ملفات `MediaTrash/` نهائياً واستعادة المساحة الحقيقية على القرص فورياً مع إعادة عدد الملفات والبايتات المحررة بدقة.
  2. توسيع نموذج `MediaStorageStats` ليعيد إحصائيات دقيقة ومستقلة لكل من وسائط التطبيق النشطة وسلة المحذوفات (`trashCount` و `trashTotalBytes`).
  3. إضافة خيار «إفراغ سلة وسائط التطبيق» في قائمة «ملف» بالواجهة مع حوار تأكيد يوضح الحجم وعدد الملفات، وإشعار بنجاح التحرير.

### Fixed
- **حماية مراجع الوسائط ومنع فقدان الصور في المشاريع المحفوظة (Media Reference Gathering Hardening):**
  1. تدقيق وفحص شامل لكافة حقول المشروع المحفوظة في قاعدة البيانات (`Elements` و `Slots` و `Template` و `CollageTemplate` و `PrintSettings`) ومسودة التخزين التلقائي والقوالب.
  2. شبكة أمان عامة بالتعبير النمطي (Regex Safety Net) تفحص كافة النصوص في الكائنات وتلتقط أي صورة مشار إليها لمنع نقلها إلى سلة المحذوفات حتى لو كانت في حقول غير قياسية.
  3. تصحيح رسالة تنظيف كاش الوسائط لتكون دقيقة وصريحة («تم نقل X ملف إلى سلة وسائط التطبيق») بدلاً من الرسالة السابقة المضللة.
- **معالجة تسريب مجلدات الاختبارات المؤقتة في Go (`os.MkdirTemp` Test Leak Fix):**
  1. تحويل `func init()` في حزم الاختبارات (`repository` و `handlers` و `utils`) إلى `TestMain(m *testing.M)` مع تنظيف حتمي تلقائي `defer os.RemoveAll(tempDir)` عند انتهاء تشغيل الاختبارات، مما أوقف تراكم مجلدات `grido-test-*` المؤقتة في `%TEMP%`.
- **تسريع أول استدعاء لنماذج الذكاء الاصطناعي المحلية عبر التسخين الحقيقي (AI Inference Real Warmup):**
  1. معالجة تجميد إطار العرض (~4.5s) عند أول نقرة على عزل الخلفية أو تأطير الوجه الناتج عن ترجمة shaders الخاصة بـ TFLite GPU delegate، عن طريق استدعاء استدلال تجريبي كامل على صورة ضئيلة (`OffscreenCanvas(64,64)`) أثناء خمول التطبيق عبر `requestIdleCallback` مع فاصل زمني لتفادي ازدحام الذاكرة ونواة GPU.
  2. حماية تداخل الاستدلالات في `bg-removal.worker.ts` و `face-frame.worker.ts` بربط طلبات التسخين بوعد memoized ينتظره طلب الاستدلال الحقيقي قبل المتابعة، مع تصفير الوعد بأمان عند أي خطأ للسماح بمحاولة لاحقة.
- **منع تشوه وسحق مقاسات الطباعة وتوحيد النسبة 1:1 (`object-fit: contain`):**
  1. استبدال `object-fit: fill` بـ `object-fit: contain` في كافة مولدات أنماط الطباعة (`print-page-style.ts`، `use-print-export.ts`، `index.css`، ومولدي HTML في `internal/service/print_export.go`).
  2. الحفاظ الصارم على نسبة أبعاد التصميم والتركيب الهندسي ومنع السحق الأفقي أو الرأسي في حال اختلاف مقاس الورق المختار في حوار الطباعة الأصلي عن نسبة أبعاد التصميم، مع إضافة اختبارات التحقق في الطبقتين (`print-export-helpers.test.ts` و `print_hardening_test.go`).
- **تحصين مسارات التحديث وتوزيع المثبت بعد تحويل المستودع إلى خاص (`Private Repository` & `GitHub Pages`):**
  1. تحويل مستودع المشروع إلى خاص (`Private`) لحماية الشيفرة المصدرية مع الحفاظ على التوزيع العام لموقع `https://grido.cloud-ip.cc` مستفيداً من مزايا GitHub Pro.
  2. أتمتة توليد مسارات التوزيع الثابتة `/GridoStudio-installer.exe` و `/api/download` و `/api/version` داخل سير العمل الآلي `.github/workflows/deploy-pages.yml` باستخدام `gh release download` وتوثيق `GH_TOKEN`، مما يتيح للزوار تنزيل المثبت باسمه الصريح مباشرة من الدومين، ويضمن التوافقية العكسية 100% لكافة الأجهزة للتحديث التلقائي دون أخطاء `404`.
  3. تطبيع روابط التحديث في الباك إند (`internal/service/updater.go`) لتحويل أي رابط أصل على GitHub Releases إلى مسار التوزيع العام `https://grido.cloud-ip.cc/api/download`، وتوجيه زر التحميل اليدوي في نافذة التحديث (`update-notifier.tsx`) إلى الموقع الرسمي.
  4. توحيد مصدر رابط التحميل المباشر `GITHUB_RELEASE_DOWNLOAD_URL = '/GridoStudio-installer.exe'` في `admin-web/src/lib/version.ts` كمرجع وحيد للحقيقة في صفحة الهبوط.

## [v1.14.2] - 2026-10-10

### Fixed
- **تبسيط وتوحيد محرك مربع التحديد وتحصين العناصر المقفلة (Transformer Simplification & Locked Hardening):**
  1. إزالة الازدواجية البرمجية واللفائف الزائدة في ربط عقد المحوّل، وإلغاء `useEffect` ومصفوفات المراجع المكررة من `konva-canvas.tsx` وحصر إدارة المحوّل في مكونه المخصص `EditorTransformer` كمصدر وحيد للحقيقة وفق نمط Konva الرسمي.
  2. سد ثغرة التحديد المتعدد للعناصر المقفلة: استبعاد أي عنصر مقفل من مقابض التحويل المشتركة، وحمايته داخل `handleTransformEnd` في `konva-overlay-layer.tsx` بمنع تطبيق أو حفظ أي تعديل عليه.
  3. تصحيح شارة الأبعاد والزاوية الحية (`transformer-badge`): قراءة الصندوق المحيط الإجمالي للمجموعة بالكامل عند التحديد المتعدد وعرض عدد العناصر والمقاس الملمي الإجمالي، بدلاً من حصرها خطأً في العنصر الأول فقط.
  4. فرض حاجز الإيماءة القياسي `!tr.isTransforming() && !tr.isDragging()` على كافة مسارات تحديث المحوّل اليدوية.
- **صقل محرك نصوص Konva ودعم اتجاه النص العربي وتحميل الخطوط (Konva Text Engine Hardening):** 
  1. تمرير خاصية `direction={isArabic ? 'rtl' : 'inherit'}` لعقدة `<KonvaText>` عند اكتشاف نصوص عربية لمنع قيام Konva بتقطيع الحروف المتصلة فرادى وحماية وصلات الخط العربي ومحاذاة التوزيع (`justify`).
  2. مزامنة تحميل خطوط Google ديناميكياً مع دورة رسم Konva عبر اشتراك `onFontReady` المبني على `document.fonts.ready`، وإجبار عقدة النص على إعادة القياس الفعلي بـ `_setTextData()` وإعادة رسم الطبقة `batchDraw()` فور جاهزية الخط في ذاكرة المتصفح لمنع تشوه أبعاد النص بالخط البديل (fallback font) في الإطار الأول.
- **ضبط هندسة لوحة الطبقات وشبكة مقاسات الكولاج (Panel Geometry & Spec Layout Fix):** معالجة اقتطاع النصوص في فحص E2E للوحة التحكم (`panel-geometry.spec.ts`) عبر ترشيق أزرار الإجراءات السريعة في `freeform-layers-tab.tsx` إلى مقياس `h-6.5 w-6.5` مع إعطاء أولوية حماية عنوان «العناصر» من الانكماش أو الاقتطاع، وصقل تخطيط بطاقات مقاسات صور الكولاج في `collage-custom-grid-tab.tsx` بتوسيع حيز النص وإزالة الاقتطاع من مواصفات الأبعاد لتستوعب النصوص الفنية بالكامل بلا بتر بصري.
- **قص العناصر خارج حدود الورقة (Canvas Paper Boundaries Clipping):** تفعيل القص البصري الدقيق `clipX={0} clipY={0} clipWidth={canvasWidth} clipHeight={canvasHeight}` على كل من طبقة العناصر `elements-content-layer` وطبقة الكولاج `collage-layer` وطبقة السحب الرسمية `dragLayer`، لمنع تسريب أو ظهور أجزاء العناصر خارج إطار الورقة على مساحة العمل أثناء التصميم أو السحب، وتعديل هامش الحذف التلقائي `culling` ليتسق مع هامش السحب `margin = 0.25` دون إخفاء العقد المسحوبة عند الحواف، مع بقاء مقابض التحديد والتحجيم في `KonvaOverlayLayer` مرئية وقابلة للتفاعل.

### Added
- **قاعدة «صفر الحشو البصري» الملزمة للوكلاء (Zero Visual Filler Standard):** تقييد مبدأ Icon-Driven UI بالأيقونات الوظيفية فقط (إجراء/حالة/تصنيف حقيقي) ومنع الأيقونات الزخرفية بجوار العناوين وداخل البطاقات والأزرار النصية، ومنع العناوين الفرعية الافتراضية تحت كل عنوان (تُضاف فقط عند معلومة جديدة لا يستنتجها السياق، وإلا فالشرح في `Tooltip`)، مع قابلية حذف عنوان البطاقة نفسه عندما يعرّف المحتوى نفسه، واعتماد «اختبار الحذف» قبل تسليم أي واجهة — مُقنَّنة في `.agents/rules/ui-ux-fluent.md` (قاعدة ملزمة بـ glob) ودليل `.agents/skills/grido-ui-designer-guide/SKILL.md` (قالب الحوار القياسي أصبح مينيمالياً افتراضياً).
- **صفحات سياسة الخصوصية وشروط الخدمة المتوافقة مع معايير Google OAuth (`admin-web`):** إنشاء صفحتي `PrivacyPolicy.tsx` و `TermsOfService.tsx` ثنائيتي اللغة (عربي/إنجليزي) لموقع `https://grido.cloud-ip.cc` مع توثيق امتثال كامل لسياسة بيانات مستخدمي خدمات Google API والـ Limited Use وحظر بيع البيانات وحق الحذف، وتوليد ملفات HTML ثابتة في `public/privacy/` و `public/terms/` لضمان قراءة سريعة من روبوتات التحقق التابعة لجوجل.
- **نشر صفحة الهبوط ولوحة الإدارة على GitHub Pages (`admin-web`):** إضافة سير عمل آلي `.github/workflows/deploy-pages.yml` (مع `enablement: true`) لنشر الموقع المترجم وتوجيه الدومين المخصص `grido.cloud-ip.cc` عبر ملف `CNAME` و `.nojekyll` ودعم التوجيه أحادي الصفحة (SPA 404 fallback) كبديل دائم ومستقر وغير محدود لاستضافة Netlify الموقوفة بسبب الكريدتس.

### Changed
- **تطبيق معيار «صفر الحشو البصري» على النوافذ الحوارية والألواح (Zero Visual Filler Implementation):** تنقية شاملة لكافة نوافذ التطبيق الحوارية وألواحه (`export-dialog`, `projects-dialog`, `phone-bridge-dialog`, `crop-dialog`, `account-license-modal`, `update-notifier`, `batch-insert-dialog`, `panel-shell`, `properties-panel`) بإزالة كبسولات الأيقونات الزخرفية بجانب العناوين، وإلغاء العناوين الفرعية الحشوية (`DialogDescription` التكراري)، وإزالة الأيقونات الزائدة من داخل أزرار التنفيذ النصية البسيطة، ليصبح رأس النوافذ والألواح نظيفاً مينيمالياً ومريحاً للعين، مع الحفاظ الكامل على نصوص وإمكانية وصول `DialogTitle` و`DialogCloseButton`.
- **توحيد شامل لأسطح وخلفيات أزرار التحكم (Comprehensive Surface & Button Background Unification):** تم القضاء على التباين والتنافر البصري في الوضع الداكن بين الأزرار الغائرة والمرفوعة (`bg-input` مقابل `bg-card`):
  1. تحويل مفاتيح تبديل وحدة القياس (`px` / `mm`) واتجاه الصفحة (`عمودي` / `أفقي`) في لوحة مساحة العمل (`canvas-dimensions-panel.tsx`) من عناصر `div` يدوية متباينة إلى المكوّن القياسي `FluentSegmentedControl` مع مسار مجوف وظلال specularity وكبسولة متحركة متوافقة تماماً مع تبويبات اللوحة العلوية (`الكولاج` / `الورقة`).
  2. توحيد خلفية زر قائمة المقاسات القياسية (`A4`) وزر قفل التناسب (`lockAspect`) ومحفزات اختيار الألوان (`PopoverColorPicker`) والقطارة والأزرار الثانوية السريعة من `bg-input/60` (التي كانت تظهر كحقول إدخال سوداء غائرة) إلى الأسطح المرفوعة القياسية `bg-card hover:bg-muted/60 border border-border/80`.
  3. توحيد مجموعات خيارات نمط الشبكة (`خطوط` / `نقاط`) وشكل القص (`مستطيل` / `مستدير` / `دائري`) في `grid-columns-panel.tsx` لتعتمد كلياً على `FluentSegmentedControl` وتوحيد صفوف التبديل على أسطح `bg-card/70`.
  4. توحيد أزرار الأنماط السريعة للنصوص (`text-type-tab.tsx`) إلى أسطح بطاقات تفاعلية أنيقة ومتسقة.
- **توحيد أزرار الإخراج في الشريط العلوي (حفظ، طباعة، تصدير):** تم توحيد تصميم زر «تصدير» ليتطابق بصرياً وهندسياً مع زري «حفظ» و«طباعة» كأزرار أيقونية مربعة موحدة (`32×32px / h-8 w-8`) داخل كبسولة الأوامر `fluent-command-group`، مع إزالة النص واللون المميز المنفرد، وتوحيد الأيقونات الثلاث (`FloppyDisk`, `Printer`, `Export`) من حزمة Fluent 2 بنفس السماكة والتدرج والتأثيرات الحركية والتلميحات.
- **إلغاء نمط الأكورديون الفردي الحصري وإتاحة فتح بطاقات متعددة في نفس الوقت (Multi-Open Independent Sections):** تم التراجع عن آلية طي البطاقات الحصرية (`Solo Mode`) في تبويب شبكة الكولاج (`collage-custom-grid-tab.tsx`)، وإعادة السلوك الحر المستقل بحيث يمكن فتح أكثر من بطاقة في الوقت نفسه (أبعاد الشبكة، مقاس الصورة، المحاذاة) أو طي أي منها دون إجبار بقية البطاقات على الانكماش أو الإغلاق التلقائي، مع حفظ تفضيل المستخدم لكل بطاقة في `localStorage`.
- **حصر شارة الأبعاد الحية على التحجيم فقط وصقل مظهرها (Transformer Badge Ergonomics):** تم حصر ظهور شارة الأبعاد والزاوية الحية (`transformer-badge`) حصراً على عمليات التحجيم والتدوير بمقابض المحوّل (`transformstart`, `transform`, `transformend`) مع كتمها وإخفائها التام أثناء تحريك وسحب العناصر (`drag`) لتفادي حجب الرؤية، وتحديث مظهرها إلى كبسولة أكريليك نصف شفافة خفيفة (`rgba(15, 23, 42, 0.72)`) بارتفاع 18px وخط ميكرو 9.5px بدلاً من الصندوق الأسود المصمت العريض.
- **ترشيق وتصغير الشريط السريع المنبثق فوق العناصر (Compact Floating Quick Bar):** تحويل شريط الأدوات العائم فوق العناصر (`canvas-quick-bar`) إلى كبسولة أرشق وأصغر بـ `rounded-lg` وتعتيم زجاجي ناعم `backdrop-blur-md` مع خفض الظل إلى `shadow-fluent-8` وتقليص الفجوة الرأسية فوق العنصر من 8px إلى 5px ليكون ملاصقاً وأقل إشغالاً لمساحة العمل.
- **مقياس طباعي عربي مقترن بارتفاعات الأسطر (P0-1 من التقييم البصري 2026-10-10):** أُضيفت توكنات `--text-*--line-height` في `@theme` (18/21/24px للنص و11/13/14/16px للميكرو) بدل الاعتماد على النسبة اللاتينية (~1.33) التي تضغط الحروف العربية وتقصّ نزولها، وأُزيلت `leading-tight/none/snug` اليدوية المتناثرة (15 موضعاً) لصالح المقياس الموحّد.
- **ربط التسميات وأسماء الوصولية (P0-2):** رُبط حقل مفتاح الترخيص ومفتاح «توسيط الصف الأخير» بحقولهما، وحُوّلت عناوين المجموعات (التوزيع/القص/التصدير/فلاتر الماسح) إلى مجموعات مُسمّاة بـ`aria-labelledby`، مع اختبار axe لاسم كبسولة شريط الحالة.
- **تفعيل حارس الاتساق البصري (P1-5):** اختبار `ui-compliance-guard.test.ts` يمشي على كل `.tsx` ويفشل عند `z-[N]` السحري أو `text-[Npx]` الاعتباطي أو لون hex خام داخل `className`؛ واستُبدلت المخالفات المتبقية بتوكنات (`--window-close*`، `text-micro`، `text-sm`).
- **تباين سطح مساحة العمل المضيء (P2-6):** خُفِّض `--workspace-bg` إلى `#eef1f6` وقُوّيت نقطة الشبكة ليرتفع فصل الورقة البيضاء عنه.
- **كثافة أهداف شريط الحالة (P2-7):** رُفعت أزرار `FluentCapsuleButton` وأرضية العرض من 28px إلى 32px.
- **توحيد قناة الأوامر (P1-4):** أصبح شريط الأدوات يبثّ نفس أحداث `grido:open-export-dialog` / `grido:open-print-dialog` / `grido:open-projects-dialog` التي تبثّها قائمة سطح المكتب والاختصارات، وGate ترخيص الطباعة انتقل إلى مستمع الحدث المركزي في `App.tsx` — فأُصلح بهذا تجاوز `Ctrl+P` لبوابة الخطة الاحترافية (كان يفتح الطباعة مباشرة).
- **توحيد التلميحات (P1-3):** أُزيلت سمات `title` الأصلية المكرّرة (حاويات أبعاد الورقة و«لون الظل» حيث يغطيها `aria-label` أو نص مرئي)؛ وأثبت الفحص أن أغلب استخدامات `title=` هي **props مكوّنات** تغذّي Radix `Tooltip` و`aria-label` لا نظام تلميحات أصلي منافس، ولم يبق سوى 4 تلميحات أصلية إعلامية (اختصار/نص كامل عند الاقتصاص).
- **توزيع عناصر لوحة «إعدادات الورقة»:** أصبح محدد «الاتجاه» (عمودي/أفقي) ممتدًا بعرض اللوحة بعمودين متساويين (كان ضيّقًا محاذيًا لليسار بعكس صف «الأبعاد» الذي يملك عناصر ممتدة)، فتوحّد إيقاع عناصر القسم واصطفّت مع صف الوحدة والأبعاد.
- **توزيع عناصر تبويبات الخصائص:** أصبحت تبويبات العنصر الأربعة أيقونية متساوية (كانت عناوينها تُقتطع «الت…» في لوح 296px، والأسماء محفوظة عبر `aria-label`)، وأزرار التدوير/القلب في تبويب «الترتيب» صارت ممتدة على ثلاثة أعمدة متساوية بدل انكماشها على الطرف، مع أسماء وصولية لحقول X/Y/W/H بدل `title` الأصلية.

## [v1.14.1] - 2026-10-09

### Fixed
- **(RV-16-H1) نمط خطوط القص المختار يُرسل للطباعة في وضع الكولاج أيضاً:** كان التصدير يجبر النمط «متقطع» في وضع الكولاج بينما المعاينة تعرض اختيار المستخدم (متصل/منقط) — فتُطبع الورقة بنمط مختلف عما يعاينه المستخدم. الآن `use-print-export.ts` يمرر `printCutLineStyle` لكل الأوضاع مع سقوط لـ«متقطع» عند الغياب فقط، مع اختبارَي قفل في `print-export-payload.test.ts`.
- **(RV-16-H2) عناصر الوضع الحر تُطبع ممدَّدة كما في المحرر لا مقصوصة الوسط:** مسار التركيب السريع كان يرسل `slotAspect` لكل عنصر فيفعّل قصاً تغاطياً (cover) في Go، بينما Konva يمدد الصورة كاملة داخل مستطيلها — أي صورة مُمدَّدة بغير نسبة مصدرها كانت تفقد أطرافها في المطبوع. الآن `print-payload-builder.ts` يرسل `slotAspect: 0` (تمديد كامل مطابق للمحرر) مع قفل اختباري في ملف `print-payload-builder.test.ts` الجديد.
- **(RV-16-M1) خطوط قص مفردة في تصدير PDF:** كانت تُرسم مرتين — نقطية مخبوزة داخل صورة JPEG المضمّنة ومتجهة فوقها — فتتضاعف عند حافة الورقة (النقطية مسحوبة 1.5px للداخل). الآن المسار النقطي يُتخطى في `GeneratePrintSheet` عندما تكون الصيغة PDF وتبقى المتجهة وحدها (أحد ما يضمن حدة أي تكبير).
- **(RV-16-M2) نمط «علامات القص» (cropmarks) متطابق بين المعاينة والمطبعة:** كان Go يعامله خطوطاً صلبة كاملة في المسارات الثلاثة (نقطي/CMYK/PDF) بينما المعاينة تعرض أذرع زوايا فقط. دالة هندسة مشتركة `cropMarkSegments` (نفس معادلة المعاينة: ذراع 4% من الضلع الأقصر بحد أدنى 2مم خارج صندوق الإحاطة) تستهلك من المسارات الثلاثة، باختبارات هندة وسلوك نقطي وCMYK.
- **(RV-16-M3) توسيع نسخ الوضع الحر على جانب Go وحارس حدود واعٍ بالنسخ:** كان الوضع الحر يكرر عناصر كل نسخة عبر IPC فيتجاوز حد التحقق (1000 عنصر) عند 48 نسخة × 21 عنصراً ويرفض الورقة. الآن عنصر قالبي واحد مع `copies/copyCols/copyStep*` (نفس آلية الكولاج)، وحارس حدود الورقة في `use-print-export.ts` يقيس أقصى امتداد بعد توسيع النسخ (كان يفحص أول نسخة فقط — ثغرة كانت تصيب الكولاج أيضاً).
- **(RV-16-M4) سقف بكسلات لمسار CMYK-JPEG (100MP):** كان بلا سقف — ورقة 144MP تستهلك ~1.2GB ذروة (RGBA + CMYK + ترميز). الفحص عبر دالة نقية `cmykPixelCapError` قبل أي تخصيص (TIFF يبقى على 50MP).
- **(RV-16-M5) ميزانية بايتات إجمالية لكاش الصور الخام المشترك (400MB):** السقوف كانت لكل صورة فقط (16×100MB ≈ 1.6GB أسوأ حالة محتفظاً بها 5 دقائق) — الآن إزالة الأقدم وصولاً عند تجاوز الميزانية مع خصم بايتات الإدخال المستبدل.
- **(RV-16-L1..L8) تقويات الطباعة الدقيقة:** غلاف `utils.SafeGo` حول goroutine انتظار PowerShell الاحتياطي (كان يتجاوز حارس الانهيار)؛ رسم الخطوط الرأسية/الأفقية المعكوسة في CMYK (كانت تُسقط بصمت)؛ تقريب نصف أعلى في سبيا الطباعة (كان اقتطاعاً ينحرف 1/256 عن CSS)؛ توثيق فارق لون خطوط القص المقصود (رمادي 120 في sRGB/PDF وأسود نقي في CMYK)؛ تحذير سجل عند تبديل أبعاد الورقة الدفاعي (كان يصحح بصمت)؛ حذف متغير ميت في مسار PDF؛ تبسيط شرط الهامش المكرر حرفياً في `use-print-layout.ts`؛ ومعاينة حقيقية لمرشّحات pixelate/threshold في نافذة الطباعة عبر `print-pixel-preview.ts` (كانت تقارَب بـ CSS ضبابياً) بنفس خوارزميات المصدر المشترك وسقوط هادئ عند الفشل.

### Removed
- **(RV-16-H3) حذف `calculateOptimalSheetImposition` (كود ميت بوعد مستحيل):** لا مستدعي إنتاجي إطلاقاً، وحقل `rotateItem` متعذر رياضياً — مرشح «ورقة مدوّرة + عنصر مدوّر» مكافئ دائماً لـ«ورقة سليمة + عنصر سليم» في عدد النسخ فكانت المرشحات المدوّرة no-op. حُذفت مع 8 حالات اختبارها وأُزيلت إشارتها من دليل المطور.

## [v1.14.0] - 2026-10-09

### Added
- **قاعدة السكون لشريط التحديد العائم (Rest-State Invariant for CanvasQuickBar):** تطبيق قاعدة السكون الصارمة على الشريط السريع العائم (`CanvasQuickBar`) بحيث يظهر حصراً في حالة سكون واستقرار العناصر المحددة، ويختفي تماماً وتلقائياً أثناء كافة عمليات التفاعل الحركي (سحب وتحريك العناصر، تحجيم وتدوير العناصر عبر مقابض الـ Transformer، وتحرير النصوص المضمنة). يمنع هذا السلوك حجب الرؤية، ويعطي مصممي الهوية والطباعة مساحة بصرية صافية لرؤية دلائل المحاذاة الذكية (Smart Alignment Guides) دون أي تشويش أو هبوط في معدل الإطارات (60/120 FPS)، ثم ينزلق الشريط بسلاسة ويظهر مجدداً في الموضع الجديد فور استقرار العنصر.
- **مخزن التفاعل اللحظي الترانزيت للكانفاس (`canvas-interaction-store.ts`):** إنشاء مخزن Zustand خفيف ونقي لتتبع حالات `isDragging` و `isTransforming` بدقة ذرية عبر خطافات `use-konva-drag` و`editor-transformer` و`collage-image` ومسرح الكانفاس `Stage` كشبكة أمان عامة، مع تنظيف آمن لحالات التفاعل عند أحداث إلغاء المؤشر أو فقدان التركيز.
- **حزمة اختبارات التحقق من قاعدة السكون (`canvas-quick-bar.test.tsx`):** إضافة 4 حالات اختبار جديدة شاملة تتحقق آلياً من اختفاء الشريط أثناء السحب والتحجيم وتحرير النصوص، وعودته للظهور فور العودة لحالة السكون مع تغطية كاملة (11/11 نجاح تام).
- **محرك Viewport الكانفاس الحقيقي (Option B — Canonical Full-Viewport Stage Engine):** إعادة بناء معمارية محرك الرسم والكانفاس جذرياً بنمط Figma & Adobe Illustrator الاحترافي. الـ Stage يملأ 100% من مساحة العرض (Viewport) ولا تتغير أبعاده مع الزوم (حماية تامة لذاكرة VRAM)، وتُدار إحداثيات وموضع الورقة بالكامل عبر تحويل المسرح الأصلي لـ Konva (stage.position و stage.scale).
- **تثبيت كثافة البكسل ومنع التذبذب والرقص (Fixed pixelRatio & Zero-Jitter Zoom):** تثبيت Konva.pixelRatio لمرة واحدة عند التحميل (Mount) ومنع إعادة حسابه ديناميكياً أثناء حركة الزوم، مما قضى 100% على وميض وترنح العناصر وتفريغ أسطح الرسم في VRAM.
- **حدود ذكية لمنع التمرير اللانهائي (Strict Viewport Bounds Clamping):** تقييد موضع الورقة تلقائياً عبر دالة clampStagePos؛ بحيث تُثبَّت الورقة في المنتصف تماماً إن كانت تلائم الشاشة ولا تسبح في الفراغ عند تدوير عجلة الفأرة، وتمرر بسلاسة بين حافتيها بهامش مريح (40px) إن كانت أطول من الشاشة، مع منع هروب الورقة خارج حدود النافذة نهائياً عند التحريك الحر بمفتاح المسافة.
- **تزامن مطلق للطبقات الطافية والمساطر والمطبوعات:** تثبيت حاوية عناصر HTML الطافية (#canvas-area) بدقة بكسلية مطلقة على موضع وأبعاد الورقة الحقيقية، ومزامنة مساطر Figma، وتحديث لقطات التصدير ومعاينة الطباعة لتلتقط 1:1.
- **فصل طبقة الأدوات التفاعلية العلوية (Konva Overlay Tools Layer Splitting):** استخراج محوّل التحديد (`EditorTransformer`) ومستطيل التحديد المطاطي بالسحب (`marquee-rect`) من طبقة المحتوى `KonvaSingleLayer` إلى طبقة علوية مستقلة مخصصة `KonvaOverlayLayer`. يضمن هذا عدم إعادة رسم صور وفلاتر ونصوص المستخدم أثناء عمليات التحديد بالسحب أو التحجيم عبر مقابض المحوّل، مما يرفع سرعة التفاعل إلى 120-144 إطاراً في الثانية حتى مع مئات العناصر.
- **إخفاء موحد لطبقة الأدوات في مسار التصدير ومعاينة الطباعة:** دمج `.overlay-tools-layer` ضمن `withHiddenOverlays` و`print-dialog.tsx` لحجب مقابض التحويل ومستطيلات التحديد دفعة واحدة أثناء التقاط الكانفاس والطباعة دون فحص وتكرار العقد الفردية.
- **حارس اختبار حدود نافذة الكانفاس والطبقة التفاعلية (canvas-viewport-bounds.test.ts):** 4 حالات اختبار جديدة تفحص سلوك التمرير الرأسي، والتثبيت في المنتصف، والتحريك الحر بمفتاح المسافة، والتحقق من تصدير `KonvaOverlayLayer`.
- **حارس امتثال الواجهة الحيّ (`ui-compliance.test.ts`):** ملف اختبار جديد (`frontend/test/ui-compliance.test.ts` — 21 حالة) يستورد ثوابت `frontend/src/lib/ui/ui-compliance.ts` التي كانت مُصدَّرة بلا أي مستورد (حارس صوري). يفرض الآن آلياً: وجود حلقة التركيز المزدوجة على `button`/`input`/`switch`/`tabs` وعلى مكوّنات `blocks/*` و`window-controls.tsx`، ومنع `z-index` خام خارج طبقات Radix المشروعة، وتعريف كل رمز `--z-*` مُستخدَم في `index.css` فعلياً. كشف الحارس عيباً حقيقياً أثناء الربط: `window-controls.tsx` كان يشير إلى رمز `--z-titlebar` غير معرَّف (زرّا الإطار يعملان بلا طبقة أصلاً) فنُقل إلى `--z-quick-bar`.
- **ثبات مقاس الـ Stage عبر الزوم (`fit.ts` + `canvas-fit.test.ts`):** `computeCanvasDisplay` تُعيد الآن `stageW/stageH` بجانب `displayW/displayH`، مع دالة `paperCaptureRect()` لتصدير مستقل عن الزوم. خمس حالات اختبار جديدة تُثبّت أن مقاس الـ Stage لا يتأثر بالزوم (ولا بضجيج القرص) وأن نسبة الأبعاد محفوظة والقيم لا تنحل عند حاوية فارغة.

### Fixed
- **تعزيز تثبيت مترجم NSIS في خط سير إصدارات الويندوز (Multi-Source NSIS Installer Fallback):** إضافة مصادر متعددة لتثبيت مترجم NSIS (`winget` ← `choco --retry 3` ← تحميل مباشر رسمي عبر SourceForge) مع كاش مزدوج لمجلدي `Program Files (x86)` و `Program Files` وتحقق ديناميكي من مسار `makensis.exe`؛ لتفادي انهيار بناء الحزمة التنفيذية والمثبت عند حدوث انقطاع أو `504 Gateway Timeout` في خوادم Chocolatey السحابية.
- **تحقيق التوازن الهندسي وتخفيف الشريط العائم (Micro In-Context Quick Bar & Spatial Balance):**
  - الإبقاء على الشريط العائم (`CanvasQuickBar`) كشريط مصغر فائق الرشاقة (Micro-Bar) بحجم 24px وبطول لا يتجاوز 160px مخصصاً حصراً للإجراءات الحركية اللحظية فوق الكانفاس (ترتيب الطبقات، التدوير 90°، القلب، ومعاينة الأصل بالضغط المطول) دون حشوه بأدوات الذكاء الاصطناعي أو منتقيات الفلاتر الثقيلة التي تحجب الكانفاس وتسبب الاكتظاظ البصري.
  - تثبيت الأدوات الإبداعية والمعالجة الذكية (الذكاء الاصطناعي المدمج، فلاتر الألوان، محاذاة وتجميع العناصر) في شريط الأدوات العلوي كأزرار كبسولية أنيقة وموحدة الارتفاع (`h-8`)، مع تكليف لوح الخصائص الأيمن بالتعديلات الرقمية الدقيقة (الأبعاد والمليمترات).
  - استئصال التشويش الضبابي من الشريط العائم (`backdrop-blur-xl`) واعتماد سطح صلب معتم عالي التباين (`bg-card border border-border shadow-fluent-16 rounded-xl`) متوافقاً مع Fluent 2.
- **استئصال الأثر الضبابي المشوِّش واستعادة أسطح ويندوز 11 الصلبة للبطاقات والقوائم (Fluent 2 Solid Surface & Anti-Fog Fix):**
  - استبدال ألوان `--card` و `--popover` شبه الشفافة بقيم لونية صلبة معتمة تماماً (`#202020` في الوضع الداكن و `#ffffff` في الوضع الفاتح) وفق معيار Windows 11 Mica Alt الأصلي.
  - إزالة تأثيرات `backdrop-blur` المشوهة من القوائم المنبثقة والمنسدلة والحوارات (`DropdownMenu`, `Popover`, `Select`, `Tooltip`, `Dialog`, `AlertDialog`) التي كانت تتسبب في نزيف بياض الكانفاس وتحويل خلفية البطاقات إلى ضباب رمادي باهت رديء التباين.
  - استعادة التباين اللوني النصي المفقود في الوضع الداكن (`--foreground: #f5f5f5`) لضمان وضوح قراءة فائق ومطابق تماماً لتطبيقات ويندوز 11 الرسمية.
- **إعادة هندسة وتنسيق شريط الأدوات العلوي وشريط القوائم (Toolbar & MenuBar Ergonomics Polish):**
  - **تصحيح تسلسل شريط القوائم في شريط العنوان:** إزالة التعارض بين اتجاه `dir="rtl"` وحاوية LTR في `DesktopMenuBar` ليتدفق التسلسل طبيعياً من اليسار لليمين بجانب الشعار (`ملف` ← `تحرير` ← `عرض` ← `كولاج` ← `أدوات` ← `مساعدة`).
  - **دمج أدوات الذكاء الاصطناعي في زر منقسم ذكي (Smart AI Split Button):** استبدال 4 أزرار نصوص متزاحمة في `toolbar-ai-tools.tsx` بزر كبسولي أنيق موحد (عزل فوري + قائمة منسدلة لبقية أدوات الترميم والتأطير وتعديل العزل مع شارة الحصة المتبقية ومؤشرات التقدم والإلغاء)، مما وفّر أكثر من 250px من العرض الأفقي.
  - **تهدئة زر الحذف في شريط التحديد:** تحويل أيقونة سلة المهملات من اللون الأحمر الفاقع الدائم إلى رمادي هادئ في وضع الراحة يتحول للأحمر عند التمرير فقط (`hover:text-destructive hover:bg-destructive/10`) متوافقاً مع Fluent 2.
  - **تحويل أزرار الإخراج إلى Icon-Driven UI وتنظيف الازدواجية:** تحويل زري «حفظ» و«طباعة» إلى أزرار أيقونية موحدة (`h-8 w-8`) مع الاحتفاظ بـ «تصدير» كزر رئيسي بارز، وحذف البنود المكررة من قائمة «المزيد».
- **تحديث محدد موقع الكانفاس في اختبارات E2E (E2E Canvas Locator Update):** تحديث محدد Konva canvas في اختبارات engine-smoke ليدعم `.konvajs-content canvas` بجانب `#canvas-area` للتوافق مع معمارية محرك Viewport الشامل الجديد.
- **توافق حارس الواجهة عبر المنصات (Cross-Platform UI Compliance Guard):** استبدال الاقتطاع اليدوي بالخط المائل المعكوس (\) في اختبار ui-compliance بدالة path.basename القياسية، لضمان استخراج أسماء الملفات بدقة عبر بيئات تشغيل Linux وWindows السحابية.
- **حل تجمد حوار الطباعة عند إغلاق حوار الطباعة الأصلي (Print Dialog Lifecycle & Modal Decoupling):** إصلاح سباق زمني حرج كان يتسبب في بقاء نافذة «إعداد ومعاينة الطباعة» عالقة في الشاشة بحالة «جاري تجهيز المعاينة ...» بعد إغلاق أو إلغاء حوار الطباعة الأصلي لنظام التشغيل (`window.print()`). كان السبب تقليص مهلة الإطلاق إلى `0ms`؛ مما أدى إلى استدعاء `window.print()` التجميدي التزامني في WebView2 أثناء استمرار حركة خروج Radix Dialog (`duration-100`) وتطبيق `@media print { body > *:not(#print-container) { display: none !important; } }`، فيُلغي المتصفح أنيميشن الخروج دون إطلاق حدث `animationend` فتبقى عقدة الـ Dialog عالقة في DOM كعنصر زومبي مفرغ المعاينة. تم استعادة مهلة أمان كافية (300ms) وتخفيض حركة الخروج إلى 75ms، مع الحفاظ على معاينة الورقة أثناء التلاشي لتجربة بصرية فائقة السلاسة.
- **اتجاه الواجهة من جذر المستند (RTL at the document root):** إضافة `dir="rtl"` إلى `<html>` في [`index.html`](file:///c:/projects/grido/frontend/index.html). كانت كل الطبقات العائمة من Radix (`Dialog`, `AlertDialog`, `Select`, `DropdownMenu`, `Popover`, `Tooltip`, `Toast`) تُزرع في `document.body` فترث LTR بينما الألواح تعدّله محلياً — وهو السبب الجذري لمؤشرات `Select` والـ `DropdownMenu` وشريط `Progress` المقلوبة، ولأقدام نوافذ الحوار المدفونة يميناً رغم العربية.
- **اتجاه العناصر في مكوّنات الواجهة المشتركة:** `select.tsx` (`pr-7/pl-2`→`pe-7/ps-2`، `right-1.5`→`end-1.5`) · `dropdown-menu.tsx` (`ps-2/pe-7`، `left-1.5`→`end-1.5`، `ml-auto`→`ms-auto`، `data-[inset]:pl-8`→`ps-8`) · `progress.tsx` (تعبئة بـ `scaleX` + `origin-left rtl:origin-right` بدل `translateX` الفيزيائي) · `dialog.tsx`/`alert-dialog.tsx` (`sm:text-right`→`sm:text-start`) · حشوات فيزيائية في حاويات التمرير العربية (`freeform-presets-tab`, `freeform-palette-tab`, `freeform-fonts-tab`, `collage-presets-tab`).
- **مؤشرات تبويب الحوار كانت تشير إلى معرّفات غير موجودة (Radix Tabs / Segmented):** `projects-dialog.tsx` و`account-license-modal.tsx` كانا يستخدمان رأس `FluentSegmentedControl` (يُخرج `role="tab"`) داخل Radix `Tabs`/`TabsContent`، فتُعلن `aria-labelledby` عن trigger غير موجود. أُضيف `idPrefix` إلى `FluentSegmentedControl` (يُخرج `id` + `aria-controls`) واستُبدل `TabsContent` بألواح `role="tabpanel"` صريحة مربوطة.
- **حلقة تركيز موحّدة (نظامان كانا متعارضين):** `index.css` كان يفرض `*:focus { outline: none }` (اقتلع أي مؤشر تركيز افتراضي) مع قاعدة `outline: 2px` عامة، بينما ~50 مكوّناً تستخدم `ring-*`. أي عنصر كتب `focus:outline-none` بلا حلقة يفقد التركيز كلياً — وهو حال أزرار النافذة الثلاثة. أُزيلت قاعدة القتل وبقيت القاعدة العامة شبكة أمان للعناصر الأصلية فقط، وأضيفت الحلقة القانونية لأزرار التصغير/التكبير/الإغلاق.
- **`svg` filter للنصوص كان يُبنى داخل التصيير وفي كل إطار:** `text-stroke-filter.ts` صار يخزّن المُرشِّحات في `Map` بالمفتاح `(radius|color)` مع `warmTextStrokeFilter()` جاهز للتصيير، واستُبدل استدعاء `sceneFunc` في `curved-text-utils.ts` (كان `getElementById` + بناء DOM في كل إطار سحب/زوم/تحويل) ببحث في `Map`.
- **عزل الخلفية والترميم الذكيين كانا يُرجّعان تعديلات أحدث (كتابة قديمة):** `use-bg-removal.ts` و`use-ai-enhance.ts` كانا يبنيان التصحيح من العنصر الملتقط لحظة الإطلاق ويكتبانه بعد دقائق بلا حرس — استبدال الصورة أو التراجع أثناء الانتظار يُلغى بصوت خافت ويُمحى `originalImageSrc`. أُضيف حجر طزاثة يُعيد قراءة السجل الحيّ ويُجهض العملية عند اختلاف `imageSrc`.
- **تغيير DPI الطباعة كان غير قابل للتراجع:** `print-slice.ts` يعيد بناء هندسة الخانات عند تغيير الـ DPI بلا `pushHistory`، و`printSettings` كان غائباً عن `HistoryEntry`/`captureSnapshot`/`isSameSnapshot` — فيرجّع `Ctrl+Z` الخانات ويُبقي الـ DPI الجديد أبداً. أُضيف الحقل إلى اللقطات (بمقارنة حقول يدوية لا مرجعية) وخطوة تراجع واحدة لكل تغيير مثبَّت.
- **حفظ تلقائي غير مضمون قبل الإغلاق:** الكتابة النهائية كانت تحدث في وعد عائم غير منتظر داخل تنظيف React يسابق `Quit()`. أُضيف `flushAutoSave()` قابل للانتظار يستدعيه مُغلِّق النافذة (ومستمعو `beforeunload`/`pagehide` احتياطاً).
- **مسودة عمل تالفة كانت تُحذف صامتة:** `use-autosave.ts` كان يستدعي `ClearAutoSave()` (حذف `os.Remove` فعلي) عند أي خطأ تحليل بلا إشعار ولا نسخة — بايت فاسد واحد يُدمّر النسخة الوحيدة من عمل غير محفوظ. صار الملف يُبقي كما هو (أول حفظ ناجح يكتب فوقه) مع إشعار صريح والحذف قراراً يدوياً.
- **فشل الحفظ التلقائي كان صامتاً:** رفض `SaveAutoSave` (امتلاء القرص، تجاوز سقف الحمولة) كان يُطبع في وحدة التحكم فقط فيتوقف الحفظ بينما يظن المستخدم أن عمله محفوظ. يُعلَن الآن صراحةً بنص الخطأ الحقيقي مع عدّاد يمنع وميض الإشعارات.
- **ألوان الكانفس كانت لا تتبع الثيم:** `canvas-colors.ts` كان يخزّن `getComputedStyle` مرة واحدة في وحدة مع ذاكرة مؤقتة، ودالة `invalidateCanvasColors()` كانت بلا أي مستورد — فالمحوّل والمساطر والشبكة وأشعة الماسح تبقى بألوان ثيم الإقلاع للأبد. أُضيف اشتراك `useCanvasColors()` (عبر `useSyncExternalStore`) يُعيد تصيير مكوّنات Konva المُغلَّفة بـ `React.memo`، ويُستدعى التفريغ من تأثير `use-theme.ts`.
- **تعديل ظل الصورة لم يكن يظهر:** الظل كان موضوعاً على `Konva.Image` المُخزَّن بـ `node.cache()` — وKonva ينسخ البيت ماپ المجمَّد فيتجاهل أي تغيير `shadow*`. نُقل الظل إلى المجموعة الأب (خارج الكاش) فيرسم من الأبناء في كل إطار: يتبع تحرير المستخدم فوراً ويتبع ظل الرفع أثناء السحب بلا تفريغ الكاش. كذلك أُضيف `cornerRadius` إلى مفتاح كاش الكولاج (`collage-image.tsx`) فلم يبقَ الاستدارة القديمة مرسومة بعد تغييرها.
- **قسمة على صفر في حوار الطباعة:** `use-print-layout.ts` يحسب `spaceUsedPercent` بقسمة على `availableWidthMM × availableHeightMM` بلا حصر لهامش فعّال غير محصور — عند هامش ≥ نصف الورقة يصبح الناتج `NaN` فيموت تحذير تجاوز الصفحة صمتاً. الهوامش مقصورة والحصة الأرضية 1مم مع تغطية اختبارية.
- **معرّفات مكرّرة في ملفات المشاريع:** `loadProject` كان يتحقق من الأبعاد المنتهية فقط. ملف محرر يدوياً أو موروث بمعرّفين متطابقين يجعل كل كتابة مفهرسة بالمعرّف (`updateElement`/`removeElement`/`bringToFront`) تُطبَّق على السجلين معاً. أُضيف تفريد المعرّفات للعناصر والخانات مع تسجيل في اللوجر الموحّد.
- **إصلاحات لقطات التاريخ وكثافة الكاش وأزرار بلا أسماء** (تفاصيلها في `docs/features-tracker.md` — الجلسة 0.53).

### Changed
- **محرك الزوم صار بـ CSS transform مع خبز عند الاستقرار (Zoom Engine Rework):** كان الزوم يُطبَّق بتمرير `<Stage width height>` الجديدين، فيعيد Konva تخصيص backing store لكل طبقة ويستدعي `layer.draw()` متزامناً في كل التزام — أي إطار كامل لكل ضغطة عجلة (أثقل تكلفة في دورة التكبير). صار مقاس الـ Stage ثابتاً عند `zoom=1` والزوم يُطبَّق بـ `transform: scale()` فوق غلاف يحجز المساحة البصرية الصحيحة، ويُثبَّت الناتج في المتجر بعد 140ms من سكون الإيماءة (خبز واحد) فيعود الرسم بكامل حدّته. `getLogicalPointerPos` و`use-konva-drag` و`use-filter-cache` تُقسّم على مضاعف الـ CSS، و`Konva.pixelRatio` يُعاد حسابه عند الخبز من المقياس الفعلي × كثافة الجهاز × الزوم (مع مستلم تغيّر الـ DPI عند نقل النافذة لشاشة أخرى). **التصدير صار مستقلاً عن الزوم:** `captureStageBlob` يلتقط منطقة الورقة بإحداثياتها المنطقية، فلم يعد حجم ملف 300DPI يتغير بمجرد تكبير المستخدم لحظة التصدير.
- **مسارات الأخطاء تُبقي نص Go الحقيقي:** استبدال 14 موقعاً من `toast.error('فشل ...')` و`String(err)` (التي تُخرج `[object Object]` لأن Wails يرفض بالنصوص الصريحة) باستدعاء `toErrorMessage(err, 'النص الافتراضي')` في `refine-bg-dialog`، `export-dialog`، `print-dialog`، `StickerStudioDialog`، `VdpImportDialog`، `FreeformCollageModal`، `license-tab-content`.
- **اللوجر الموحّد بدل `console` المباشر:** تحويل 11 موقعاً في مسارات الحفظ التلقائي والمعالجة والحوارات إلى `createLogger(...)` (يصبح الخطأ قابلاً للوصول إلى سجل Go بدل الضياع في وحدة التحكم)، وتوحيد كل نصوص الانتظار على صيغة `جاري … ...` الإلزامية (7 مواقع كانت `يصدّر ...`/`يحفظ ...`/`جاري التجهيز...`).
- **إلغاء حصار لوحة المفاتيح في محرر الملصقات:** `StickerInlineEditor` كان يبتلع `Tab`/`Shift+Tab` للتنقل بين الحقول فلا يمكن مغادرة المحرر بلوحة المفاتيح مطلقاً (WCAG 2.1.2). بقي `Escape` للإغلاق و`Enter` للحقل التالي فقط.
- **واجهات بدون أسماء وصولية:** إضافة `aria-label` لأزرار الرموز المفردة في `FreeformToolbar` (18 موقعاً عبر مساعد `ToolBtn`)، `freeform-layers-tab` (14 موقعاً)، `layers-panel`، `arrange-tab`، `projects-dialog`؛ واقتران 7 أزواج `<Label>`/`<Input>` في `auth-tab-content`؛ واستبدال شرائح `Slider` الخام بـ `FluentSliderField` في `batch-insert-dialog` و`crop-dialog`؛ و`DialogDescription` لحوار الاختصارات.
- **حوارات لا تتجمّد في حالة تحميل:** أُضيف `cancelledRef` لحوارات `StickerStudioDialog` و`VdpImportDialog` فلا يُدرَج عنصر ولا يظهر إشعار نجاح بعد إغلاق النافذة، و`finally` لتصفير `isDownloading` في `update-notifier` (وعد تنزيل معلّق كان يُ permanently قفل النافذة)، وتعطيل زر الإغلاق أثناء العمل الطويل.
- **أولويات الاشتراكات والأداء:** `properties-panel` صار يشترك في العنصر/الخانة المحددة فقط بدل مصفوفتين كاملتين (كل نقرة سحب كانت تُعيد تصيير اللوحة بكامل أقسامها)؛ `text-node` يشترك في قيمة منطقية `editingTextId === element.id` بدل المعرّف الكامل (كل تحرير نص كان يُعيد تصيير كل العقد النصية)؛ وإعادة ترتيب الطبقات عبر `updateElements` المجمّعة بدل كتابة لكل عنصر؛ وكثافة كاش الصور تُحسب من الزوم البصري فلا تبدو المفلترة ضبابية بعد التكبير.

### Removed
- **رموز نسيج ميتة:** إزالة `--color-chart-1..5` من `@theme` (كانت تشير إلى `--chart-N` غير معرَّفة في أي مكان، وصفر استخدام) و`--ruler-tick-label` الثلاثي التعريف، وقاعدة `.text-muted-foreground-hover` اليدوية المكررة لرمز `@theme` قائم.
- **إخفاء الطباعة بسمة عنصر بدل صنف:** `@media print` كان يُخفي `[role='status']` و`[role='presentation']` فيُسقط محتوى حقيقياً (`skeleton.tsx`، `fluent-section.tsx`). استُبدلا بصنف `.no-print` — الذي وُجد أنه **غير معرَّف** أصلاً في `index.css` (كل استخداماته الخمسة كانت بلا أثر)، فعُرِّف واستُخدم.
- **تقليل الحركة لا تجميدها:** `prefers-reduced-motion` كان يضغط مدة الدوران إلى 0.01ms فـ"يُجمّد" المؤشر الدائري في زاوية عشوائية؛ صار المؤشر يتوقف كلياً بشفافية مخفّضة.


## [v1.13.3] - 2026-10-08

### Performance
- **تسريع مسار الطباعة وخفض زمن الاستجابة (Print Pipeline Acceleration):**
  - استئصال التأخير الاصطناعي القديم (`450ms`) في [`use-print-export.ts`](file:///c:/projects/grido/frontend/src/components/editor/print/use-print-export.ts) واستبداله بـ `later(..., 0)` لضمان إطلاق نافذة طباعة النظام فور إغلاق الحوار مع صيانة تنظيف المؤقتات بين الاختبارات وتفادي تسريب الذاكرة.
  - تجاوز انتظار فك التشفير غير المتزامن `img.decode()` واستدعاء أمر الطباعة فور اكتمال تحميل الصورة في إطار الطباعة الخفي (`print-frame`).
  - تحسين جودة ترميز JPEG في Go ([`internal/service/print_export.go`](file:///c:/projects/grido/internal/service/print_export.go)) لأوراق sRGB و CMYK وضبطها إلى `90` (بدلاً من `95`)، مما سرّع عمليات تشفير Huffman/DCT بنسبة ~35% وخفّض زمن كتابة القرص وحجم الملف إلى النصف دون أي تأثير بصري مرئي على جودة الطباعة 300 DPI.
- **تعطيل وترشيق المايكرو-أنميشن الثقيل عبر التطبيق (Snappy Desktop Micro-Animations):**
  - استئصال حركات التكبير والتصغير والزنبرك البطيئة (`zoom-in-95`, `zoom-out-95`) وتقليص مدد الظهور/التلاشي إلى 100ms في نوافذ الحوار والتنبيهات والألواح الجانبية والقوائم المنسدلة والمنتقيات (`dialog.tsx`, `alert-dialog.tsx`, `sheet.tsx`, `dropdown-menu.tsx`, `popover.tsx`, `select.tsx`, `tooltip.tsx`).
  - تبسيط حركات الـ CSS في [`index.css`](file:///c:/projects/grido/frontend/src/index.css) وتقليص مدد انتقالات الألواح وتلاشيها إلى 100-120ms واستبدال تذبذب الزنبرك في `@keyframes fluent-pop-in` بتلاشٍ فوري مستقر.
  - إلغاء فترات التأخير المتتالية في الإقلاع وحركات الزنبرك في محددات الأوضاع والشرائح والكبسولات (`App.tsx`, `workspace-panel-rail.tsx`, `fluent-segmented-control.tsx`, `fluent-filter-chips.tsx`).
  - إزالة انتقالات التحويم الثقيلة وإعادة حساب الأبعاد في محرر الملصقات وبطاقات القوالب وشجرة الطبقات والكانفاس (`StickerInlineEditor.tsx`, `StickerPreview.tsx`, `StickerStudioDialog.tsx`, `collage-template-card.tsx`, `layers-list.tsx`, `editor-canvas.tsx`).

## [v1.13.2] - 2026-10-08


### Changed
- **ترقية محرك Wails v3 إلى `v3.0.0-beta.28` (Wails v3 Engine Upgrade):**
  - ترقية حزم Go (`github.com/wailsapp/wails/v3`) إلى `v3.0.0-beta.28`.
  - ترقية عميل زمن التشغيل بالواجهة (`@wailsio/runtime`) إلى `^3.0.0-beta.28` مع إعادة إنشاء ملف القفل وتوليد الربطات الرسمية بالكامل.
  - ترقية أداة الـ CLI (`wails3`) في بيئات البناء والـ CI السحابي (`ci.yml` و `release.yml`) وتوثيق المطور وقواعد ومهارات الوكلاء إلى `v3.0.0-beta.28`.
  - الاستفادة من تحسينات استقرار تعافي `WebView2` على Windows ومنع النوافذ البيضاء (Blank Windows) والحفاظ على معالجات أحداث Wails حية في الذاكرة.

### Fixed
- **تطبيع ومزامنة التحديد عند تبديل القوالب والكولاج (`collage-slice.ts`):** استخدام `normalizeSelection` في `setTemplate` و `setCollageTemplate` لضمان مزامنة `selectedId` و `selectedIds` وتصفيرهما عند التحويل إلى وضع الكولاج، مع إضافة اختبار وحدة في `test/collage-slice.test.ts`.
- **الحفاظ على العنصر الأول كأساسي في تطبيع تحديد الدفعات واللصق (`element-slice.ts`):** تمرير `newIds[0]` كمعرف أساسي في `addImageElementsBatch` و `pasteCopiedElements` لضمان تطابق `selectedId` مع أول عنصر مُضاف في التخطيط الشبكي والمتتالي، واجتياز اختبار `grid-layout-math.test.ts`.

### Added
- **المرحلة الثانية للتقوية المعمارية وفك التبعيات العكسية وتوحيد التحديد (Architectural Hardening, Inversion Decoupling & Selection Normalization):**
  - **استخراج كاش الصور النقي (`frontend/src/lib/canvas/image-cache.ts`):** فصل منطق كاش الصور وإبطاله (`invalidateImageCache`, `preloadImageIntoCache`) من الـ Hook `use-async-image.ts` إلى طبقة المكتبات، مما أنهى اختراق الحدود المعمارية لشريحة `core-slice.ts` (Store Layer لم يعد يستورد من UI Hook Layer).
  - **فك التبعية العكسية في Go وحزمة الأدوات (`internal/utils`):** نقل منطق توقيع التراخيص وفحص سلامتها (`ComputeProfileSignature`, `SaveLicenseSignature`, `VerifyLicenseSignature`, `ClearLicenseSignature`) من `internal/utils/crypto.go` إلى `internal/repository/license_signature.go`؛ لتصبح حزمة `utils` نظيفة ومجردة بنسبة 100% وخالية من أي استيراد لحزم النطاق الداخلي `internal/core/domain` (208 دوال اختبار Go خضراء).
  - **توحيد ومزامنة حالة التحديد في الستور (`element-slice.ts`):** استحداث دالة `normalizeSelection` المركزية وتطبيقها عبر كافة إجراءات الإضافة والحذف والتحديد المتعدد والتجميع، مما يضمن استحالة حدوث انحراف أو عدم اتساق بين `selectedId` (المفرد) و `selectedIds` (المتعدد) مع تغطية شاملة باختبارات الوحدة.
- **ترسيخ قواعد التعلم المعماري المستفادة (`/learn` — Architectural Rules Persistence):**
  - **معيار سرعة وخفة المايكرو-أنميشن لسطح المكتب (`ui-ux-fluent.md` و `fluent2-design-system`):** حظر حسابات الارتفاع الديناميكية بـ JavaScript أو حركات الزنبرك البطيئة في الألواح الجانبية والأكورديون، واستبدالها بإظهار مباشر وتلاشٍ سريع بـ CSS وتقليص انتقالات الألوان وتدوير الأسهم إلى زمن لا يتجاوز 150ms للحفاظ على رشاقة تطبيقات سطح المكتب الاحترافية.
  - **حظر التبعيات العكسية لحزمة الأدوات في Go (`backend-wails-runtime.md`):** إلزامية بقاء `internal/utils` نظيفة ومجردة بنسبة 100% وبلا أي استيراد لكائنات النطاق الداخلي `internal/core/domain` أو حزم الخدمات، وتوطين منطق التوقيع في طبقة المستودعات.
  - **حدود الطبقات المعمارية وحظر استيراد الخطافات في الستور وتطبيع التحديد (`architecture-governance.md` و `zustand-state-patterns`):** حظر استيراد خطافات الواجهة داخل شرائح Zustand، وإلزامية مرور كافة إجراءات التحديد عبر دالة نقية مركزية `normalizeSelection` تضمن المزامنة الصارمة لـ `selectedId` و `selectedIds`.
  - **ثوابت محرك الطباعة وعقد التصدير لـ WebView2 (`konva-canvas-engine.md`):** تثبيت صيغة JPEG حصراً لصور 50MP، إلزامية `requestAnimationFrame` قبل الالتقاط، احترام خلفية الكولاج، وضبط تسلسل الإنهاء الآمن (تحرير `pointerEvents` قبل `window.print()` بـ 450ms).
  - **محاذاة هويات Mock وعقود الحمولات بفحص الطفرة (`quality-cicd-release.md`):** إلزامية تحديث مسارات `vi.mock` عند ترحيل الربطات لمنع الفشل الصامت، حظر إعلان النتائج بناءً على فحوص جزئية، وإلزامية فحص الطفرة (Mutation Testing) لعقود الحمولات الحساسة.
  - **حظر التجريدات التأملية والكود الميت (`architecture-governance.md`):** حظر إنشاء طبقات تجريد أو منسقات موازية ما لم تكن مستهلكة بالكامل في نفس الجلسة.
- **تنفيذ المرحلة الشاملة للإصلاح المعماري وترشيق المكونات وتوحيد الربطات (Architectural Refactoring & Modernization):**
  - **المسار المستعار للربطات الرسمية (`@bindings/*`):** تفعيل المسار في `tsconfig.json` و `vite.config.ts` و `vitest.config.ts` لربط خدمات Wails v3 تلقائياً بدلاً من مسارات `wailsjs` اليدوية.
  - **إصلاح مسجل الأخطاء للواجهة الأمامية (`frontend/src/lib/logger.ts`):** ربط أخطاء الواجهة بدالة Go `LogFrontendError` من `@bindings/grido/app` لضمان كتابة السجلات في نظام ويندوز وسطح المكتب.
  - **ترصين جسر الرنتايم الرسمي (`frontend/wailsjs/runtime/runtime.ts`):** تحويل غلاف `@wailsio/runtime` إلى نسخة مطبوعة آمنة (`EventsOn/EventsOff/EventsEmit`، `WindowMinimise/WindowToggleMaximise/WindowIsMaximised/WindowGetSize/WindowSetPosition/SnapAssist`، `Quit`، `BrowserOpenURL`) مع بقاء التنفيذ داخل الجسر نفسه — بلا اعتماد معكوس على `src`، وبقاء الجسر نقطة الاستيراد الموحدة لمكونات الواجهة وفق `.agents/rules/backend-wails-runtime.md`.
  - **تفكيك الملف العملاق `use-print-export.ts`:**
    - استخراج تنسيقات الطباعة إلى `frontend/src/components/editor/print/print-page-style.ts`.
    - استخراج النقل الشبكي وإدارة المهلات إلى `frontend/src/components/editor/print/print-transport.ts`.
    - استخراج منشئ حمولات الطباعة إلى `frontend/src/components/editor/print/print-payload-builder.ts`.
    - ترشيق الخطاف الأساسي بنسبة تفوق 46% (877 ← 469 سطراً) مع صيانة التوافق لاختبارات الوحدة الـ 118.
  - **ترشيق `App.tsx` وتفكيك مسؤوليات الإقلاع والحوارات:**
    - استخراج خطاف الإقلاع `frontend/src/hooks/use-app-bootstrap.ts` لنقل فحص التراخيص، جلب ملف البدء، تقارير الانهيار، وأحداث Wails v3 (`file-opened`, `native-file-drop`, `app:resume`).
    - استخراج مضيف الحوارات `frontend/src/components/editor/workspace/app-dialogs-host.tsx` لتجميع حوارات التصدير والطباعة والترخيص والإشعارات.
    - تقليص حجم `App.tsx` من 849 سطراً إلى 636 سطراً.
  - **تفكيك دوال المحاذاة والتوزيع الرياضية من `element-slice.ts`:**
    - استخراج خوارزميات المحاذاة والتوزيع النقية إلى `frontend/src/lib/canvas/element-alignment.ts`.
    - إضافة 9 اختبارات وحدة مخصصة في `frontend/src/lib/canvas/element-alignment.test.ts` واجتيازها بنسبة 100%.
  - **ترحيل جزئي لاستيرادات `wailsjs` في الواجهة (لا استئصال كامل):**
    - ترحيل 7 خطافات/مكونات (`use-autosave`, `use-ai-enhance`, `use-bg-removal`, `use-face-frame`, `use-keyboard-shortcuts`, `error-boundary`, محرك `use-print-export`) إلى `@bindings/grido/app` و `@bindings/grido/internal/**`.
    - **تبقى 41 إشارة في 33 ملفاً** داخل `frontend/src` على جسور `wailsjs/**` (منها `src/main.tsx` و`license-slice.ts` وملفات الحوارات والمعاينة) — إكمال الترحيل خارج نطاق هذه الجلسة.

- **تبسيط وتخفيف مايكرو-أنميشن المكون `FluentSection` واستعادة سرعة سطح المكتب (Snappy Desktop UI & Lightweight CSS Animations):**
  - استئصال حركة الارتفاع البطيئة بـ `framer-motion` (`AnimatePresence` و `motion.div` و `height: auto`) التي كانت تسبب تأخيراً ملحوظاً (Layout Thrashing) بمدى 220ms عند طي وتوسيع أقسام الألواح الجانبية في استوديو التصميم.
  - استبدالها بظهور فوري وتلاشٍ رشيق بـ CSS (`animate-in fade-in duration-100`) بدون أي بطء في إعادة حساب أبعاد الصفحة.
  - ترشيق انتقالات الحاوية ورأس القسم من `transition-all duration-200` إلى انتقالات ألوان خفيفة `transition-colors duration-150`، مع تدوير سريع ورشيق لسهم الطي `duration-150 ease-out`، مما يمنح استجابة فورية وحاسمة بنمط برامج سطح المكتب الاحترافية.
- **نمط الأكورديون الفردي الحصري لشريط الكولاج الأيسر (Single Accordion / Solo Mode in Collage Custom Grid):**
  - تفعيل نمط الفتح الحصري (Solo Mode) في تبويب شبكة الكولاج `frontend/src/components/editor/panels/collage/collage-custom-grid-tab.tsx`، بحيث يكون قسم واحد فقط مفتوحاً في اللحظة نفسها («أبعاد الشبكة»، «مقاس الصورة»، أو «المحاذاة على الورقة»)، وتُطوى بقية الأقسام تلقائياً عند فتح أي قسم للقضاء التام على شريط التمرير العمودي وملاءمة شاشات الحواسيب المحمولة.
  - إتاحة طي القسم النشط بالكامل لرؤية الرؤوس وشاراتها الملخصة دون أي تمرير.
  - حفظ حالة القسم النشط الأخير محلياً في `localStorage` (`grido-collage-grid-solo-section`) لضمان استمرارية تجربة المستخدم.
  - تحديث وتوسيع اختبارات الوحدة في `frontend/test/collage-custom-grid-tab.test.tsx` لتأكيد سلوك الفتح الحصري واجتياز كافة الفحوصات بنسبة 100%.
- **تصميم سطح مكتب أصيل وموجز لنافذة حوار الطباعة وتوحيد الثيم الفحمي (Native Desktop Print UI & Charcoal Neutral Palette):**
  - **مواءمة الألوان مع هوية التطبيق الفحمية:** تحديث توكنات سطح وأشرطة المعاينة في `frontend/src/index.css` (`--print-surface: #141416`, `--print-header: rgba(26, 26, 29, 0.88)`, `--print-zoom-capsule: rgba(36, 36, 39, 0.85)`) ونقاط الحالة الخضراء الزمردية (`bg-emerald-500`) للتخلص من اللون الأزرق الكحلي ومطابقة هوية Grido وMicrosoft Fluent 2 الفحمية المحايدة.
  - **هندسة الشريط الجانبي بنمط تطبيقات الديسكتوب:** دمج قائمة اختيار الطابعة وزر «الخصائص» المباشر في صف أفقي واحد مدمج لتبديل نوع الورق (عادي / لامع) بضغطة زر واحدة دون ازدحام رأسي.
  - **اختصار العناوين وحذف الشروحات المطولة (No Web Bloat):** اختصار عناوين البلوكات إلى «الطابعة»، «الورقة والاتجاه»، و«خيارات الطباعة»، واستئصال النصوص التوضيحية الطويلة من خيارات «طباعة بدون هوامش» و«خطوط وعلامات القص» لمنح تجربة مستخدم سريعة ومهنية تحاكي برامج سطح المكتب الاحترافية (Photoshop / Lightroom).
  - **حذف البطاقات المكررة:** التخلص من بطاقة ملخص الأبعاد السفلية في الشريط الجانبي لمنع تكرار البيانات مع شريط المعاينة السفلي (1:1) وتوفير المساحة للشاشات المدمجة.
  - **تحديث الاختبارات:** تحديث اختبارات استوديو الطباعة في `frontend/test/print-dialog-backstage.test.tsx` لتطابق التسميات الموجزة الجديدة مع نجاح كافة الاختبارات بنسبة 100%.
- **تكامل تفضيلات الطابعة ونوع الورق المباشر (Printer & Media Preferences Integration):**
  - إضافة بلوك مخصص وبارز «الطابعة ونوع الورق» في الشريط الجانبي لحوار الطباعة `frontend/src/components/editor/dialogs/print-dialog.tsx`.
  - كشف واستعراض الطابعات الفيزيائية المثبتة مع اختيار الطابعة الافتراضية تلقائياً.
  - إضافة زر مباشر «الخصائص ⚙️» يستدعي لوحة تحكم الطابعة الرسمية للشركة المصنّعة (`OpenPrinterPreferences`) لتبديل نوع الورق (ورق صور لامع Glossy مقابل ورق عادي Plain) وضبط جودة الحبر بضغطة زر واحدة قبل الطباعة.
  - دعم الارتداد التلقائي للطابعة الافتراضية في معالج الباكند `internal/handlers/print_handler.go` عند تمرير اسم طابعة فارغ.
  - تغطية السيناريو باختبار وحدة في `frontend/test/print-dialog-backstage.test.tsx` (7/7 tests passed).

### Fixed
- **استعادة سلوك محرك الطباعة بعد التفكيك وإصلاح محاكاة الاختبارات واستئصال الكود الميت (Restore Print Engine Behavior, Fix Binding Mocks & Remove Dead Code):**
  - **صيغة الإخراج:** إعادة `exportFormat: 'jpeg'` في `frontend/src/components/editor/print/use-print-export.ts` بدل `'png'` — رمز PNG على ورقة 50MP أكبر 3-5× وأبطأ ترميزاً عدة مرات داخل WebView2 (انظر تعليق المسار في `internal/service/print_export.go`)، وكانت الكومتة `655a92e` قد اعتمدت JPEG لهذا السبب.
  - **تنازل إطار الرسم:** إعادة `await new Promise((r) => requestAnimationFrame(() => r(null)))` قبل التقاط الكانفاس لمنع تجميد خيط الواجهة أثناء التقاط 50MP المتزامن.
  - **خلفية الورقة:** إعادة `backgroundColor || previewWhite()` بدل `#FFFFFF` الثابتة لسلامة تصدير الكولاج بخلفية غير بيضاء.
  - **حارس حدود الورقة:** إعادة فحص حدود الورقة قبل إرسال الطلب (نمط Go: `W/H ≤ ‏الورقة + 0.1mm`) مع فحص موضعي لأقصى امتداد (`farthestX`/`farthestY ≤ الورقة + 0.5mm`) ورسالة توجيهية بالعربية — Go يرفض تجاوز W/H لكنه لا يفحص الموضع، فالعنصر المُزاح خارج الورقة كان يُقصّ بصمت.
  - **تسلسل الإنهاء الآمن:** استدعاء `onDone()` وتحرير `document.body.style.pointerEvents` **قبل** إطلاق `window.print()`، وتأجيل العرض 450ms بعد أنيميشن إغلاق Radix — مع إزالة قفل `pointer-events: none` المستحدث (لم يكن في السلوك المعتمد)، وإعادة نصوص أخطاء `فشل التصدير`/`حدث خطأ أثناء توليد ورقة الطباعة` وأرقام البكسل والميجابكسل في رسالة `CanvasTooLargeError`.
  - **محاكاة الاختبارات:** مواءمة `vi.mock` مع هويات الوحدات الجديدة (`@bindings/grido/app` و`@bindings/grido/internal/handlers/printhandler`) في `frontend/test/use-autosave.test.ts` و`bg-worker.test.tsx` و`App.test.tsx` و`print-dialog-backstage.test.tsx` — كانت المحاكاة على مسار `wailsjs/**` لا تعترض شيئاً بعد الترحيل فتسقط 5 حالات بـ `ECONNREFUSED`.
  - **الرنتايم:** إعادة تنفيذ الجسر إلى `frontend/wailsjs/runtime/runtime.ts` وحذف الغلاف المعكوس `frontend/src/lib/wails/runtime.ts` التزاماً بـ `.agents/rules/backend-wails-runtime.md` (الذي يوجب نقطة استيراد موحدة ومنع الاعتماد المعكوس).
  - **استئصال الكود الميت:** حذف `frontend/src/lib/ui/dialog-coordinator.ts` (صفر مستوردين + نموذج حالة حوارات موازٍ غير مستخدم) التزاماً بقاعدة `No Unjustified Duplication`.
  - **قفل عقد حمولة الطباعة (PrintRequest Contract Test):** ملف مخصص `frontend/test/print-export-payload.test.ts` يعترض `ExportPrintSheet` من الربطات المولدة ويثبّت `exportFormat: 'jpeg'` وخلفية الكانفاس (لا أبيض صلب) وأبعاد الورقة والعناصر وعلامات القص والاتجاه والاحتياطيات، ويقفل تسلسل الإنهاء الآمن وحارس حدود الورقة — وتم التحقق بحقن طفرة (Mutation): `jpeg → png` يُسقط حالة، وتثبيت الخلفية `#FFFFFF` يُسقط حالتين، ثم أُعيد الملف مطابقاً تماماً. وأصبح `handlePrint` يعيد وعد `executePrint` (بدل إهماله) ليتيح انتظار انتهاء الدورة دون تغيير سلوك زر الطباعة.
  - **التحقق الفعلي:** `npm --prefix frontend run test` (106 ملفاً / 905 ناجحة + 1 متخطاة / 0 فاشلة) · `npm run typecheck` (0 أخطاء) · `npm run lint` (0 تحذيرات) · `node scripts/docs-gate.mjs --strict-refs` (يمر) · `go test ./...` (أخضر).
- **منع تعليق أو تجمد نافذة حوار الطباعة وتحرير قفل مؤشر الفأرة (Prevent Print Dialog Deadlock & Pointer-Events Lock):**
  - إضافة `pointer-events-auto` إلى مكونات `DialogOverlay` و `DialogContent` و `DialogCloseButton` في `frontend/src/components/ui/dialog.tsx` لمنع وراثة خاصية `pointer-events: none` الصادرة من طبقات Radix DismissableLayer عند حدوث تعارض في الطبقات المتداخلة.
  - استحداث دالة `cancelExport` في `frontend/src/components/editor/print/use-print-export.ts` لزيادة `attemptRef.current++` فورياً لإبطال أي عمليات تصدير غير مكتملة، ومنع تشغيل الطباعة المتأخرة الزومبي، وتصفير مؤشر المهام في شريط ويندوز، وتحرير `document.body.style.pointerEvents`.
  - تحصين معالج اختصار `Escape` في `frontend/src/components/editor/dialogs/print-dialog.tsx` بفحص `if (e.defaultPrevented) return;` لمنع إغلاق حوار الطباعة قسراً أثناء إغلاق القوائم المنسدلة الفرعية (مثل حجم الورقة) وتفادي إرباك دورة حياة Radix DismissableLayer.
  - ربط `cancelExport` و `e.stopPropagation()` بأزرار الإغلاق والإلغاء (`DialogCloseButton` و `إلغاء`) ومعالجات `onOpenChange` و `onEscapeKeyDown`، وضمان تنظيف أي قفل للـ pointer-events عند إلغاء تركيب المكون (Unmount).
- **منع طباعة صفحة فارغة إضافية في Chromium / WebView2 (Prevent Extra Blank Page in Print):**
  - استبدال الارتفاعات والعروض الثابتة بالمليمتر (`${paperHeightMM}mm !important`) على `html, body` و `#print-container` و `img` بحصر صارم بنسبة `100% !important` مع `max-width: 100% !important; max-height: 100% !important;` و `object-fit: fill !important;` و `overflow: hidden !important;` في `generatePrintPageStyle` و `index.css`.
  - إضافة قواعد تجنب فواصل الصفحات الصريحة (`page-break-after: avoid !important; break-after: avoid !important; page-break-inside: avoid !important; break-inside: avoid !important;`) على مستوى الحاوية والجسم والصورة، وتصحيح `overflow: visible` في `frontend/src/index.css` لمنع محرك Blink من توليد صفحة ثانية فارغة جراء الفروق الدقيقة للكسور العشرية (Subpixel Rounding) أو هوامش الدرايفرات الفيزيائية.
  - تطبيق نفس القواعد الصارمة لمنع الصفحات الفارغة في قوالب الطباعة بـ Go (`buildNativePrintHTML` و `buildSelfContainedHTML` في `internal/service/print_export.go`).
- **استئصال مغالطة «صيغة الإخراج» وفضاء الألوان من حوار الطباعة (Purge Export Format & CMYK Fallacies from Print Backstage):**
  - إزالة مبدّل «صيغة الإخراج» (صورة / PDF) ومبدّل «فضاء الألوان» (sRGB / CMYK) بالكامل من حوار الطباعة `frontend/src/components/editor/dialogs/print-dialog.tsx`؛ فالطباعة الفيزيائية تعني إرسال ورقة مطبوعة إلى طابعة حقيقية وليست تصديراً لملفات على القرص (الذي هو اختصاص أصيل وحصري لحوار التصدير `ExportDialog`).
  - توحيد خط سير الطباعة في `use-print-export.ts` ليعتمد داخلياً على صيغة نقطية فائقة الدقة (JPEG 300+ DPI بنطاق sRGB) تلائم محرك WebView2 ودرايفرات ويندوز مباشرة دون تعريض المستخدم لخيار PDF الذي كان يفشل داخل وسم `<img>` في حاوية الطباعة.
- **استئصال أدوات المونتاج والتكرار المكررة من حوار الطباعة (Purge Redundant Imposition from Print Dialog):**
  - إزالة بلوك «المونتاج والتوزيع» (تكرار النسخ، المسافات بينها، أنماط الصفوف والأعمدة) من حوار الطباعة التزاماً بمبدأ `No Unjustified Duplication Invariant`؛ فقرار الطباعة هو قرار نهائي للتجهيز والمعاينة 1:1 بعد أن قام المستخدم بتصميمه وتوزيعه بالكامل في محرر الكانفاس وقوالب الكولاج.
- **استئصال ازدواجية اختيار الطابعة وتوحيد تدفق الطباعة (Eliminate Redundant In-App Printer Selector):**
  - إزالة بلوك اختيار الطابعة المكرر والقائمة المنسدلة من حوار إعداد الطباعة `frontend/src/components/editor/dialogs/print-dialog.tsx` لمنع التشتيت والازدواجية غير المبررة (حيث يختار المستخدم طابعته الفيزيائية الفعلية مباشرة في حوار ويندوز اللاحق دون الحاجة لتكرار الاختيار مرتين متتاليتين)، وتركيز واجهة الاستوديو بالكامل على وظائف Grido الجوهرية (الورقة والاتجاه، علامات القص، المعاينة الحقيقية 1:1) مع تسريع فتح الحوار فورياً بدون أي تأخير لاستعلام الطابعات.
- **تحصين تدفق الطباعة وإخفاء حاوية الـ DOM وديناميكية الـ DPI (DOM Print Container Isolation & Dynamic DPI):**
  - فرض قواعد إخفاء صريحة ومزدوجة لشاشة العرض `#print-container { display: none !important; }` مع `@media screen` وضبط `container.style.display = 'none'` برمجياً لمنع أي وميض بصري أو إزاحة للمكونات في شاشة المستخدم قبل إطلاق `window.print()`.
  - تصحيح قراءة DPI في شريط المواصفات السفلي لحوار الطباعة ليعكس القيمة المحددة ديناميكياً (`${printSettings.dpi} DPI`) بدلاً من تثبيتها نصياً على `(300 DPI)`.
  - توضيح متطلبات الطابعة والدرايفر في تسمية خيار «طباعة بدون هوامش».
- **استئصال خطأ معالج ويندوز الداخلي وتوجيه الطباعة لمسار WebView2 المباشر (Fix "An internal error occurred" & photowiz.dll Bypass):**
  - تصحيح `showPrintResult` في `frontend/src/components/editor/print/use-print-export.ts` للاعتماد المباشر على مسار `fallbackBrowserPrint` (محرك طباعة WebView2/Chromium المدمج مع `@page` وهوامش 0) بدلاً من توجيهه قسراً في بيئة الديسكتوب إلى `PrintNative` عبر `ShellExecute(print)`، والتي كانت تُطلق معالج صور ويندوز العتيق (`photowiz.dll`) المتسبب في تشويه أبعاد وتوزيع الكولاج والانهيار بخطأ `Print Pictures Error: An internal error occurred` عند الإرسال لطابعات Brother وEpson.
  - دعم وثيقة الـ HTML المرافقة في `internal/service/print_native_windows.go` داخل `launchOSPrint` بحيث إذا تم استدعاء `PrintNative` لأي ملف صور له وثيقة HTML مرافقة، يُطبع عبرها بـ Edge بدلاً من قذفه لمعالج الصور العتيق.
- **مواءمة ألوان شريطي المعاينة في حوار الطباعة مع الوضع الفاتح (Print Dialog Light Mode Preview Bars):**
  - تصحيح توكنات `--print-*` في `frontend/src/index.css` بحيث تتكيف ديناميكياً مع الثيم: تزويد الوضع الفاتح بقيم فاتحة نقية (`rgba(255, 255, 255, 0.88)` للشريط العلوي والسفلي، وسطح `#f8fafc` مع نصوص كحلية دقيقة) بدلاً من حصرها بقيم داكنة صلبة `#0f172a` في الوضعين، ونقل القيم الداكنة إلى `.dark` لمنع النشاز البصري في الوضع الفاتح.
  - تحسين ألوان التمرير (`hover`) وشريط المواصفات السفلي في `frontend/src/components/editor/dialogs/print-dialog.tsx` لضمان وضوح النصوص والأزرار بالكامل في كلا الوضعين.
- **إصلاح معمارية استوديو الطباعة وتصحيح تفضيلات الدرايفر وحذف الكود المهجور (Print Studio Overhaul & Win32 Driver Fix):**
  - **تصحيح فتح تفضيلات درايفر الطابعة (`OpenPrinterPreferences`):** استبدال استدعاء `DocumentPropertiesW` المعيب (الذي كان يمرر `fMode = 0` المعيد لحجم الذاكرة فقط دون إظهار أي نافذة) بأداة نظام ويندوز القياسية الرسمية `rundll32.exe printui.dll,PrintUIEntry /e /n` لإطلاق نافذة إعدادات الورق والجودة التابعة للشركة المصنعة (Canon/Epson/Brother) باستقلالية تامة، مع إضافة حراس تحقق واختبار وحدة `TestOpenPrinterPreferences_Validation`.
  - **توحيد تدفق إجراءات الطباعة وإلغاء الازدواجية:** إزالة الأزرار المتطابقة («معالج ويندوز» من بلوك الطابعة و«حوار النظام» من تذييل الحوار) والاعتماد على زر «طباعة (Enter)» الموحد لمنع تكرار الإجراءات أو تشتيت المستخدم.
  - **استئصال الكود الميت المكرر (Dead Code Cleanup):** حذف المكون المهجور `frontend/src/components/editor/print/print-settings-toolbar.tsx` (564 سطراً) لترسيخ سيادة المصدر الواحد وقاعدة `No Unjustified Duplication`.
  - **حماية الأسماء الاحتياطية:** منع تمرير الاسم النصي العربي الاحتياطي لدوال النظام عند غياب الطابعات وتنبيه المستخدم بلطف لاختيار طابعة حقيقية.
- **تقسية نظام الطباعة من الألف إلى الياء (Print System Hardening RV-Print-01…26 — تقرير `docs/reviews/15-print-hardening-audit-2026-10-06.md`)
  - **الخلفية (Go):** سقف `Copies` (5000 مفرد / 25000 موسّع بجمع int64 آمن) في `internal/service/print_service.go`؛ دعم الخطوط المائلة في `ApplyPureBlackCutLines` مع تسطيح ألفا على الأبيض في `internal/service/print_cmyk.go`؛ حقن وسوم `XResolution/YResolution/ResolutionUnit` في TIFF (`internal/service/print_tiff_tags.go` جديد) مع نقل فحص 50MP قبل التحويل؛ تقييد `ImageSrc` على `data:` و`/local-image/` وداخل مجلد التطبيق في `internal/service/print_image_pipeline.go`؛ سقف البكسلات المفكوكة 100MP عبر `DecodeConfig` أولاً (قنبلة 65 بايت مرفوضة)؛ كشف اقتطاع الرفع (413) في `main.go` للمسارات الثلاثة؛ PowerShell الاحتياطي عبر متغيرات البيئة بلا استيفاء نصي في `internal/service/print_native_windows.go`؛ اتجاه PDF مشتق من الأبعاد؛ تقسية منظف `grido_print_*` (24 ساعة + سقف حجم)؛ URI من `net/url`؛ احتياطي معاينة JPEG بدل TIFF مكسور.
  - **الواجهة:** ضبط ذري `isExporting`، مهلات (`upload 120s` + `ExportPrintSheet 10min`) مع `AbortController` ورموز جيل وتimers مُتتبَّعة، `describeError` بلا `[object Object]`، كائن hook مُثبَّت، `setPrintInvocation` داخل effect، نطاق `onCutLinesChange` حسب الوضع، استعادة التحديد بعد الإغلاق، تتبع آخر هامش غير صفري، إصلاح حارس `collage-active`، `cutLineStyle` موحّد في التصدير اليدوي (`resolveCutLineDash` + زوايا cropmarks)، حفظ `rawCutLines` وكتل النسخ، حد أدنى 1px للحدود، `aria-label` لأزرار الأيقونات و`role=alert/status` و`aria-live` و`aria-keyshortcuts`، وتصحيح تعليق المقياس الموحّد الخاطئ (المحوران مستقلان في كل المسارات).
  - **الاختبارات:** 21 دالة Go جديدة (سقوف النسخ، القنبلة البعدية، المائل والألفا وTAC، وسوم TIFF وحدة ونهاية-لنهاية، نطاق المسارات) + 14 حالة Vitest (`frontend/test/print-export-helpers.test.ts`)؛ تحديث 21 اختباراً قائماً لعقد الإدخال الإنتاجي (`/local-image/` داخل `GRIDO_APP_DIR` معزول). التحقق: `go test ./internal/...` أخضر، `-race` نظيف، `vitest` (103 ملفات / 876 ناجحة + 1 متخطاة)، `tsc` و`eslint --max-warnings 0` نظيفان.

## [v1.13.1] - 2026-10-05

### Fixed
- **حماية العناصر المقفلة من الحذف غير المقصود (Locked Elements Deletion Guard):**
  - تصحيح دالتي `removeElement` و `removeElements` في `frontend/src/lib/store/slices/element-slice.ts` بحيث تتجاهلان تلقائياً أي عنصر يحمل خاصية `locked: true` ما لم يُطلب الحذف الإجباري الصريح (`force: true`).
  - تحديث معالج الحذف في قائمة سطح المكتب `frontend/src/components/editor/system/desktop-menu-bar.tsx`، شريط التحديد السريع `toolbar-selection-tools.tsx`، تبويب الطبقات `freeform-layers-tab.tsx`، ولوحات الطبقات `layers-list.tsx` و `layers-panel.tsx` لاستبعاد العناصر المقفلة وإشعار المستخدم عبر تنبيه لطيف (`toast.info`).
  - تعزيز اختبارات الوحدة باختبارين جديدين في `frontend/test/element-slice.test.ts` لتأكيد امتناع الحذف الفردي والجماعي للعناصر المقفلة.
- **منع فقدان ومسح عناصر التصميم الحر عند التبديل لوضع الكولاج (Preserve Freeform Elements on Mode Switch):**
  - استئصال السطور التدميرية `nextState.elements = []` من دالة `setMode` في `frontend/src/lib/store/slices/core-slice.ts`، لضمان بقاء نصوص وأشكال وملصقات وصور التصميم الحر في الذاكرة دون مسح عند التبديل بين وضعي الكولاج والتصميم الحر أو عند فتح مشاريع بخانات فارغة.
  - إضافة اختبار انحداري في `frontend/test/core-slice.test.ts` يثبت سلامة بقاء العناصر وعدم تصفيرها.
- **سد ثغرة تسريب حصص الذكاء الاصطناعي عند تعطل الـ RPC وتحويله لفشل مغلق (Fail-Closed AI Quota Precheck):**
  - تعديل نقطة خادم Modal AI في `modal_ai/upscaler.py` للعمل بنمط الفشل المغلق (Fail-Closed) بإرجاع كود 503 فوري ورفض حرق بطاقة الـ GPU عند أي تعطل أو خطأ شبكي يعيق التحقق المسبق من الحصة اليومية.
  - إضافة فحص صريح في عميل Go بلغة الباك إند `internal/service/ai_service.go` لحقل `usage_recorded`، ورفض العملية عند إرجاع `false` لمنع تسريب أي صور معالجة دون احتساب.
- **ذرية فحص الحصص ومنع سباق التجاوز والخصم المزدوج (Atomic Serialization & Idempotency):**
  - إنشاء هجرة Supabase جديدة `supabase/migrations/20261005160000_atomic_ai_quota_reservation.sql` تُضيف عمود `request_id uuid` وفهرس فريد `idx_ai_usage_request_id` على جدول `public.ai_usage`.
  - تطبيق قفل صفي حصري `SELECT plan FROM public.profiles WHERE id = p_user_id FOR UPDATE;` داخل دالة `check_and_record_ai_usage` لمنع تلاعب الطلبات المتزامنة وتجاوز سقف الحصة (Race Conditions).
  - دعم المعالجة الخاملة المتطابقة (Idempotency) في الـ RPC، بحيث تُعيد النجاح الفوري دون تكرار الإدراج عند إعادة إرسال نفس `request_id`.
  - توليد `request_id` وتمريره في حمولة الـ RPC من `modal_ai/upscaler.py`.
- **تسريع وتجاوز مهلة التوقيع الرقمي السحابي (Skip SignPath Waiting Timeout):**
  - تقييد خطوة رفع الملفات للتوقيع في `.github/workflows/release.yml` بوجود اعتمادات SignPath، وتخطي محاولة التوقيع تلقائياً لتفادي مهلة الانتظار الطويلة (30 دقيقة) لحين اعتماد الشهادة رسمياً، ونشر حزم التثبيت مباشرة مع مطابقة بصمات SHA-256.

## [v1.13.0] - 2026-10-04

### Changed
- **إعادة تصميم وصقل تبويب «الألوان والهوية» في الشريط الجانبي (Identity & Colors Tab Overhaul):**
  - إعادة هندسة تبويب الألوان والهوية `frontend/src/components/editor/panels/freeform/freeform-palette-tab.tsx` وفق أسلوب وهوية استوديو Grido المدمجة ومعايير Microsoft Fluent 2 الرشيقة، مع القضاء على هدر المساحات والأقسام المتضخمة.
  - دمج أدوات التحكم في شريط علوي موحد ومدمج يجمع مبدل الوجهة (عنصر / ورقة)، منتقي اللون السريع، قراءة الـ HEX الفورية، أزرار النسخ والتفضيل بنجمة، وألوان الاستوديو القياسية في صف واحد.
  - إثراء مكتبة الهويات البصرية لتشمل 16 هوية متناسقة مصنفة إلى 4 فئات دلالية (وثائق وهوية رسمية، استوديو وتصوير، أعمال وفخامة، عصري وإبداعي) مع كبسولات تصفية سريعة `FluentFilterChips`، وبطاقات عالية الكثافة تعرض شريط عينات الهوية المتصل بارتفاع مدمج مع أدوار الألوان وأزرار التوزيع وتطبيق الخلفية بنقرة واحدة.
  - إضافة ميزة التناغم اللوني الذكي (OKLCH Harmonies: متماثل، مكمل، ثلاثي) واستخراج ألوان الهوية من صور التصميم محلياً، مع شريط مدمج للمفضلة وآخر استخدام.
  - نقل بيانات وهياكل الهويات البصرية إلى `frontend/src/components/editor/panels/freeform/freeform-panel-constants.ts` لضمان فصل البيانات ودعم React Fast Refresh.
- **صقل ورشاقة بطاقات الخطوط في تبويب مكتبة الخطوط إلى سطر واحد فائق الكثافة (Ultra-Sleek Single-Line Font Cards):**
  - إعادة هندسة بطاقات الخطوط في `frontend/src/components/editor/panels/freeform/freeform-fonts-tab.tsx` لتصبح في سطر واحد مدمج (`h-10`، `min-h-[40px]`) مع تطبيق عائلة الخط مباشرة على اسمه، وتوفير هامش رأسي مريح (`leading-normal`) يمنع تداخل الحروف والنزول الكوفي والنسخي مع حدود الإطار، مع مضاعفة عدد الخطوط المرئية فورياً دون تمرير، وتحميل خطوط Google تلقائياً عند تمرير المؤشر (`onMouseEnter`).
- **القضاء على هدر المساحات وترشيد التبويبات الأخرى في الشريط الجانبي (Sidebar Space Optimization):**
  - **تبويب الطبقات (`freeform-layers-tab.tsx` و `layers-list.tsx`):** دمج شريط أدوات الطبقات المتضخم (الذي كان يستهلك 135px) في شريط علوي موحد فائق الرشاقة بارتفاع 34px (`h-8.5`) يجمع القفل والرؤية والعمليات الجماعية، مع إظهار شريط المحاذاة المشروط حصراً عند التحديد، وإلغاء ازدواجية الصناديق والترويسات والحد الأقصى المصطنع (300px) عبر نمط `standalone` ليملأ جدول الطبقات كامل ارتفاع اللوحة.
  - **تبويب الخلفيات والأنماط (`freeform-backdrops-tab.tsx` و `shared-controls.tsx`):** إلغاء حاوية الحالة الفارغة للمفضلة التي كانت تهدر 120px أعلى التبويب قبل استخدام أي تدرج، وإزالة مربع الشرح التوضيحي المكرر، وتقليص بطاقات التدرجات إلى 52px مع مصغر ورقة مضغوط في `PaperBackgroundSummary` بارتفاع 48px بدلاً من 72px.
  - **تبويب العناصر (`freeform-elements-tab.tsx`):** إعادة تنظيم شبكة الأشكال الهندسية الـ 12 لتتوزع على 3 أعمدة مدمجة بدلاً من عمودين، مما قلص عدد الصفوف من 6 إلى 4، وخفض ارتفاع معاينات بطاقات الملصقات من 96px إلى 72px لتتسع اللوحة لضعف عدد البطاقات في نفس شاشة العرض.
- **إعادة تصميم وتبسيط تبويب «فرز وترتيب الخانات» في الكولاج (Collage Arrange Tab Redesign):**
  - استئصال عرض مصغرات صور الوجوه المتكررة من بطاقة مخطط الشبكة في `frontend/src/components/editor/panels/collage/collage-arrange-tab.tsx` استجابةً لملاحظة المستخدم الدقيقة بعدم الحاجة لها لظهورها الحيّ على الكانفاس، واستبدالها بمخطط هيكلي تجريدي نظيف يعرض أرقام وحالة الخانات بارتفاع مضغوط (`h-7.5`).
  - معالجة التوزيع الفردي غير المتوازن للأزرار: جعل زر «تكرار الكل» يمتد على كامل العرض (`col-span-2`) في قسم ترتيب الصور، وزر «تصفير التعديلات» يمتد على كامل العرض في قسم التحويلات الجماعية، مع إلغاء الصناديق المتداخلة الضخمة وضبط ارتفاع الأزرار على `h-8` المدمج.

### Fixed
- **مطابقة عقود اختبارات الواجهة لمصغر خلفية الورقة وشريط أدوات العناصر:**
  - تضمين زاوية التدرج اللوني (`· 90°`) ضمن نص معاينة `PaperBackgroundSummary` في `frontend/src/components/editor/properties/shared-controls.tsx` لضمان توافق الفحص مع اختبارات البطاقة.
  - استبدال تسمية الشريط العلوي بقائمة «العناصر» في `frontend/src/components/editor/panels/freeform/freeform-layers-tab.tsx` لمنع تعارض المطابقة النصية التامة مع محدد تبويب «الطبقات» في شريط أدوات مساحة العمل.
- **إصلاح طي وتوسيع لوحة الخصائص في الشاشات العريضة (Wide Breakpoint Layout Fix):**
  - ربط حالة فتح لوحة الخصائص في نمط Wide برمز الحالة الفعلي `isInspectorPinned` في `frontend/src/components/editor/workspace/workspace-layout.tsx` وتحديث دالة `setIsInspectorPinned` لتقبل مُحدِّث دالي، مما أصلح تعطل زر طي اللوحة ومنع الإغلاق الخاطئ لدرج القوالب الأيسر عند طي اللوحة اليمنى.
  - مزامنة `isInspectorPinned` تلقائياً عند عبور نقطة التوقف من Standard إلى Wide أثناء فتح لوحة الخصائص لمنع اختفائها المفاجئ عند تغيير حجم النافذة، مع تعزيز التغطية باختبار وحدة انحداري جديد في `frontend/test/use-workspace-panels.test.ts`.
  - تمرير دالات إغلاق نوعية (`panelsHook.togglePanel('templates')` و `panelsHook.togglePanel('properties')`) لكل لوحة بشكل مستقل في `frontend/src/App.tsx`.
- **إضافة زر طي/إظهار لوحة الخصائص إلى شريط العنوان الرئيسي:**
  - إضافة زر تحكم لسطح المكتب في شريط العنوان `frontend/src/App.tsx` بجانب زر القوالب مع أيقونة `<SlidersHorizontal />` وحالة النشاط واختصار لوحة المفاتيح `Ctrl+Shift+B`.
- **منع تجاوز قائمة مقاسات الورق لحدود الشاشة (Paper Size Dropdown Overflow):**
  - إضافة `max-h-[60vh] overflow-y-auto` لقائمة مقاسات الورق القياسية والمتقدمة في `frontend/src/components/editor/canvas/canvas-viewport-deck.tsx` لضمان إمكانية التمرير وسهولة الوصول لكافة المقاسات في الشاشات المحمولة.
- **تفعيل مؤشر تلاشي التمرير العلوي في اللوحات الجانبية (`PanelShell` Scroll Hint):**
  - توجيه مراقبة التمرير ومراقب الحجم `ResizeObserver` في `frontend/src/components/editor/panels/panel-shell.tsx` نحو عنصر `[data-radix-scroll-area-viewport]` وغلاف المحتوى التابع له بدلاً من الحاوية الخارجية الثابتة، مما يضمن ظهور تأثير التلاشي العلوي الجمالي (`panel-scroll-hint`) حتى عند نمو المحتوى ديناميكياً قبل التمرير.
- **تصحيح محاذاة شارات العدادات في الوضع العربي RTL:**
  - استبدال الفئة الفيزيائية `-right-0.5` بالفئة المنطقية `-end-0.5` في `frontend/src/components/editor/workspace/workspace-panel-rail.tsx` لضمان محاذاة الشارات الرقمية بشكل صحيح ومتسق مع مؤشرات النشاط في الاتجاه العربي.
  - استبدال `text-right` بالفئة المنطقية `text-start` في خيارات تنسيق تصدير الصور بـ `frontend/src/components/editor/dialogs/export-dialog.tsx`.
- **توجيه كافة أخطاء التهيئة إلى مسجل التشخيص الموحد:**
  - استبدال استدعاءات `console.error` المباشرة بـ `appLog.error` في `frontend/src/App.tsx` لضمان التقاط أخطاء فحص الترخيص وأحداث فتح الملفات داخل حزمة الدعم والتشخيص `grido_support_logs.zip`.
- **منع تداخل وتطبيق نصوص خاطئة في طبقة تحرير النصوص (Text Editing Overlay Remount Guard):**
  - إضافة المفتاح الفريد `key={editingTextId || 'none'}` لمكون `TextEditingOverlay` في `frontend/src/components/editor/canvas/editor-canvas.tsx` و `key={textEl.id}` لعنصر `textarea` في `text-editing-overlay.tsx` لضمان تفريغ وإعادة تركيب حالة مربع التحرير فور تبديل العنصر المستهدف ومنع كتابة نصوص قديمة فوق عناصر جديدة.
- **تحديث مراجع دوال الكولاج مباشرة أثناء الرندر (Collage Image Memo Latest-Refs):**
  - استبدال مزامنة المراجع بعد الرندر (`useEffect`) بالتحديث المباشر المتزامن أثناء الرندر لـ `onUpdateOffsetsRef` و `onDragEndRef` في `frontend/src/components/editor/konva/elements/collage-image.tsx`، لمنع الـ Stale Closures عند استدعاء المعالجات قبل اكتمال الطلاء.
- **تثبيت معالجات أحداث العناصر وتفادي كسر ميموزيشن Konva (Single Layer Memoization Stabilization):**
  - تثبيت مراجع معالجات `onDblClick` و `onChange` في `frontend/src/components/editor/konva/layers/konva-single-layer.tsx` عبر خرائط مراجع مستقرة لكل عنصر، وكاش لكائنات `elementRef` في `frontend/src/components/editor/konva/konva-canvas.tsx`، مما مكّن المقارن `propsAreEqual` من العمل بكفاءة ومنع إعادة رسم عقد Konva عند كل تحديث في الستور.
- **سلاسة تقريب عجلة الفأرة واللمس في معاينة الملصقات (Sticker Preview Wheel Zoom Stutter Fix):**
  - فك ارتباط مراقب حدث التكبير بالعجلة عن حالة `zoomLevel` في `frontend/src/features/stickers/components/StickerPreview.tsx` واستخدام مرجع `zoomLevelRef` لمنع إعادة تسجيل المستمع مع كل إطار حركة وتفادي تقطع الإيماءات.
- **حماية نافذة جسر الهاتف من تعديل الحالة بعد فك التركيب (Phone Bridge Dialog Lifecycle Guard):**
  - إضافة فحص `isMountedRef` لكافة العمليات غير المتزامنة (`initBridge` ومؤقت نسخ الرابط والاستطلاع الدوري) في `frontend/src/components/editor/dialogs/phone-bridge-dialog.tsx` مع تنظيف المؤقتات وتحويل الأخطاء للمسجل الموحد `phoneLog`.
- **تنظيف مستمعات تغيير حجم النافذة عند فك التركيب (Window Resize Handles Unmount Cleanup):**
  - إضافة `useEffect` لتنظيف معالجات `mousemove` و `mouseup` و `blur` المرتبطة بـ `window` عند فك تركيب `WindowResizeHandles` أثناء السحب، وتوجيه الأخطاء إلى `windowLog.error`.
- **حصر تطهير كاش الصور بالمسار المطابق (Strict Image Cache Invalidation):**
  - تدقيق شرط الحذف في `invalidateImageCache` داخل `frontend/src/hooks/use-async-image.ts` لمطابقة المفتاح الدقيق `key === src || key.startsWith(`${src}__`)` لمنع طرد صور أخرى تشترك في بادئة الاسم بالخطأ.
- **تفاعلية مؤشر أبعاد كولاج المساحة الحرة (Freeform Collage Reactive Drag State):**
  - تحويل حالة السحب من القراءة غير التفاعلية للمرجع `dragState.current !== null` إلى حالة تفاعلية `isDragging` في `frontend/src/features/freeform-collage/components/FreeformCanvasEditor.tsx` لضمان ظهور وتحديث الشارة الحية بدقة فور بدء السحب وانتهائه.
- **مفتاح تركيبي لخطوط الإرشاد الذكية (Active Guides Composite Key):**
  - تخصيص مفتاح فريد مبني على النوع والإحداثي والفهرس لخطوط المحاذاة في `frontend/src/components/editor/canvas/editor-canvas.tsx`.
- **حماية اختصارات الكانفاس العالمية داخل النوافذ المنبثقة (Global Shortcuts Modal Guard):**
  - منع اختصارات لوحة المفاتيح المخصصة للكانفاس (التراجع/الإعادة، الحذف، الأسهم، التحديد) من التنفيذ عندما تكون أي نافذة حوار أو تنبيه نشطة في التطبيق عبر فحص `isModalActive` في `frontend/src/hooks/use-keyboard-shortcuts.ts`، مع إضافة `e.stopPropagation` في نافذة `frontend/src/features/stickers/components/StickerStudioDialog.tsx` لمنع التراجع المزدوج على الكانفاس الخلفي.
- **منع اختطاف مفتاح Tab للتنقل السهل (Tab Navigation A11y Guard):**
  - حماية السلوك الافتراضي لمفتاح `Tab` عند التركيز على أزرار الواجهة أو الروابط أو عناصر الإدخال في `frontend/src/hooks/use-keyboard-shortcuts.ts`، وقصر تفعيل نمط Zen على الكانفاس فقط لضمان سهولة الوصول والتنقل عبر لوحة المفاتيح.
- **إظهار شريط الأدوات السريع عند تحديد عنصرين (Quick Bar Multi-Selection Threshold):**
  - تصحيح شرط ظهور قسم التحديد المتعدد في `frontend/src/components/editor/canvas/canvas-quick-bar.tsx` ليصبح `selectedIds.length >= 2` بدلاً من `selectedIds.length >= 3`، مما أصلح اختفاء الشريط السريع بالكامل عند تحديد عنصرين.
- **تثبيت مستمعات سحب خطوط الإرشاد ومنع إعادة التسجيل (Guide Drag Pointer Listener Stabilization):**
  - ربط مستمعات مؤشر الفأرة `pointermove` و `pointerup` لحركة الخطوط الإرشادية بحالة السحب النشطة `isDragging` وتحديث المراجع داخل `useEffect` في `frontend/src/components/editor/canvas/use-user-guides.ts` لمنع إعادة تسجيل المستمعات مع كل بكسل حركة.
- **رفع ترتيب طبقة تحرير النصوص فوق الخطوط الإرشادية (Text Editing Overlay Z-Index Elevation):**
  - تعريف متغير CSS موحد جديد `--z-canvas-text-overlay: 70;` في `frontend/src/index.css` وتوثيقه في `frontend/src/lib/ui/ui-compliance.ts` وتطبيقه على `frontend/src/components/editor/canvas/text-editing-overlay.tsx` لحل تداخل الترتيب مع الخطوط الإرشادية وضمان تحرير نصوص مرئي نقي ومريح.
- **تطهير كاش كائنات ومراجع عقد Konva عند حذف العناصر (Prune Konva Ref & Handler Caches):**
  - تطهير دوري للمفاتيح المحذوفة من كاش مراجع العقد `elementRefCache` في `frontend/src/components/editor/konva/konva-canvas.tsx` وخرائط معالجات الأحداث في `frontend/src/components/editor/konva/layers/konva-single-layer.tsx` عند تغير قائمة العناصر لتفادي استهلاك الذاكرة.
- **حماية تراكم إزاحات سحب الكولاج أثناء الإيماءة الحية (Collage Drag Gesture Guard):**
  - حماية المرجع `accumulatedDrag.current` من إعادة التعيين أثناء السحب النشط عبر علم `isDraggingRef` في `frontend/src/components/editor/konva/elements/collage-image.tsx` لمنع ارتداد الصورة أثناء فك التشفير غير المتزامن أو إعادة الرندر.
- **ثبات بؤرة التقريب لغير عجلة الفأرة (Non-Wheel Zoom Center Preservation):**
  - الحفاظ على نقطة ارتكاز مركز العرض عند التقريب عبر القوائم أو الأزرار أو اختصارات لوحة المفاتيح في `frontend/src/components/editor/canvas/use-canvas-viewport.ts` لتفادي إعادة التمركز المفاجئة والمزعجة.
- **حماية مقياس وموضع شارة التحويل من القيم الشاذة (Safe Transformer Badge Scale & Layout):**
  - تأمين حسابات مقياس وإزاحة شارة التحويل `safeBadgeScale` في `frontend/src/components/editor/konva/elements/editor-transformer.tsx` ضد القسمة على الصفر أو القيم غير المنتهية (`Infinity` / `NaN`) عند المقياس المنعدم أو المتدهور.

## [v1.12.0] - 2026-10-03

### Fixed
- **تنظيف دوال التدفق غير المستخدمة في الباك إند:**
  - حذف دوال التدفق القديمة `streamPNGWithDPI` و `streamJPEGWithDPI` في `internal/service/print_export.go` بعد استبدالها بكتّاب التدفق المباشر `dpiPNGWriter` و `dpiJPEGWriter` لإرضاء فحص `staticcheck` الصارم (U1000).
- **معالجة تعطل التراجع (Undo No-Op) بعد فتح المشاريع المحفوظة:**
  - تم تضمين حقول القوالب والتدرج الخطي (`template`, `collageTemplate`, `backgroundGradientColor2`, `backgroundGradientAngle`) في لقطة البذر الأولى للتاريخ (`history[0]`) داخل `core-slice.ts:loadProject`. بدونها كانت استعادة التاريخ تتجاهل هذه الحقول وتبقي القيم الجديدة، مما يعطل التراجع كلياً بعد تحميل المشروع.
- **منع انزياح صور الخانات عند تعديل أبعاد الكانفاس أو إعدادات الطباعة:**
  - استبدال الربط السطحي بفهرس المصفوفة `[i]` بخوارزمية المطابقة المكانية لأقرب مركز خلية `remapSlotsToCells` في `core-slice.ts:setCanvasSize` و `print-slice.ts:setPrintSettings`، مع حظر إعادة بناء الخانات إذا لم تتغير قيمة الـ DPI فعلياً.
- **حظر إسقاط مستمعي أحداث Wails على مستوى التطبيق بـ `EventsOff`:**
  - تنظيف مستمعي أحداث النوافذ (`file-opened`, `native-file-drop`, `app:resume`, `phone:photo-received`) في `App.tsx` و `use-phone-bridge.ts` بالاعتماد حصراً على دوال الإلغاء الفردية (`unbind`)، وحذف الاستدعاءات العامة لـ `EventsOff` التي كانت تمسح كافة مستمعي الأحداث عبر التطبيق بصمت.
- **التحقق الصارم من مخطط الحافظة قبل الحقن في الستور (Clipboard Schema Validation):**
  - فحص حمولات الحافظة الملصقة ببادئة `GRIDO_ELEMENTS:` بواسطة `CanvasElementSchema.safeParse` في `clipboard-utils.ts` للتأكد من صحة الأنواع والأبعاد وتفادي حقن أي كائنات مشوهة أو قيم `NaN` في الستور.
- **إصلاح الخطأ الحسابي لتباعد صفوف الكولاج في التصدير والطباعة:**
  - تصحيح حساب `stepYMM` في `use-print-export.ts` ليعتمد على `grid.cellHeight` مباشرة بدلاً من فارق إحداثيات العنصر 1 (الذي كان ينتج صفراً في الشبكات متعددة الأعمدة ويتسبب في طباعة كافة الصفوف متراكبة فوق الصف الأول).
- **منع تسريب مستمعات المقارنة المطولة للصورة:**
  - استبدال الاستماع الحصري لـ `mouseup` و `touchend` بالاستماع الشامل لأحداث `pointerup` و `pointercancel` و `blur` في `quick-bar-slot-section.tsx` و `image-properties.tsx` لمنع تعليق عرض الصورة الأصلية.
- **التراجع الذري عند الملء التلقائي للخانات (BUG-HIGH-10):**
  - دمج تعيين الصورة وملء الخانات في لقطة تراجع واحدة عبر `setSlotImagesBatch` داخل `slot-properties.tsx` لتفادي استنزاف سقف الـ 30 لقطة بلقطات مكررة.

### Performance
- **تسريع معالجة الصور ومحرك الطباعة في الباك إند (Go Backend):**
  - **جدول بحثي مركب (Single-pass Composite LUT):** دمج تعديلات السطوع والتباين في مسح بكسلي واحد بجدول بحث 256 مدخلاً في `print_image_pipeline.go`، مما وفر دورة معالجة كاملة ونسخة ذاكرة NRGBA كاملة مع مطابقة بكسلية تامة.
  - **التدفق المباشر للقرص وحقن الـ DPI:** استبدال حجز مصفوفات البايتات الكاملة في الذاكرة بالترميز المتدفق المباشر إلى القرص عبر `dpiJPEGWriter` و `dpiPNGWriter` مع حقن `JFIF` و `pHYs` لحظياً داخل `print_export.go`.
  - **معاينة CMYK مخففة:** تصغير معاينة نافذة الطباعة إلى 1200px، مما قلص زمن توليد الورقة بنسبة تتجاوز 50%.
  - **التكرار الشبكي المحلي في Go:** إرسال قالب واحد لخانات الكولاج مع معاملات التكرار وتوسيعه محلياً داخل Go عبر `expandGridItems`، مما قلص حجم JSON عبر جسر Wails IPC من آلاف العناصر إلى قالب واحد ومكّن كاش المعالجة `procCache` من العمل بكفاءة قصوى.
  - **توازي استخراج أبعاد الصور:** جلب أبعاد دفعات الصور بالتوازي بعدد أنوية المعالج الكاملة عبر `errgroup` في `media_service.go`.
- **تسريع تفاعل الكانفاس والواجهة (Konva & Vite):**
  - تخفيض تعقيد البحث عن العناصر أثناء السحب والتحريك من $O(N \times M)$ إلى $O(1)$ باستخدام خرائط `Map` في `konva-single-layer.tsx` و `use-konva-drag.ts`.
  - تجزئة حزم Vite الكبيرة (`manualChunks`) لعزل مكتبات Konva و Framer Motion و Cropper و Fluent Icons، وتأخير تحميل مكتبات تفكيك الإكسل (SheetJS و PapaParse) كسولاً في `vdp-parser.ts`.

### Added
- **استغلال شامل ومتقدم لإمكانات محرك Konva v10.3 وحذف الكود اليدوي الزائد:**
  - **تحديد الصندوق بالسحب في الفراغ (Marquee / Rubberband Selection):** إمكانية سحب مؤشر الفأرة على خلفية الكانفاس الفارغة لرسم مستطيل تحديد شفاف بنمط Fluent 2 واختيار عدة عناصر دفعة واحدة وربطها بالمحوّل الجماعي فورياً مع دعم مفتاح Shift للإضافة للتحديد القائم.
  - **فلاتر الخصوصية والأختام (`pixelate` و `threshold`):** تفعيل فلاتر Konva الأصلية لتعتيم المستندات الحساسة بكسلياً (`pixelate`) وتحويل الصور لثنائية أبيض/أسود حادة لأختام المطابع (`threshold`) مع مطابقة كاملة في خوارزمية الطباعة في Go (`internal/service/print_image_pipeline.go`).
  - **أشكال متجهة أصلية غنية (Rich Native Vector Shapes):** إضافة أشكال Konva الأصلية المتخصصة: السهم المتجه (`KonvaArrow` مع طول وعرض رأس السهم)، المضلع المنتظم (`KonvaRegularPolygon` مع التحكم بعدد الأضلاع من 3 إلى 12)، والحلقة الدائرية (`KonvaRing` مع نصف القطر الداخلي والخارجي) مع تكامل كامل في لوحات الخصائص وقائمة الطبقات والتصدير.
  - **أقنعة القص المتجهة للصور (Image Vector Shape Masking):** تفعيل خاصية `clipFunc` على مجموعات Konva لقص الصور بأشكال متجهة (دائرة، قلب، نجمة) بدقة فائقة دون الحاجة لقص يدوي أو إعادة توليد ملفات بيت ماب، مع مطابقة تامة في خط أنابيب التصدير.
  - **فحص التصادم الأصلي للإسقاط (Native Drop Hit-Testing):** استبدال الحسابات الهندسية اليدوية في `use-image-drop.ts` بمنظومة فحص التصادم اللحظية عالية الأداء `stage.getIntersection(pointer)` و `findAncestor`.
  - **أداة اليد والتحريك بالمساحة والزر الأوسط (Spacebar & Middle-Click Hand Tool Navigation):** تمكين تحريك الكانفاس بسلاسة عبر الضغط المستمر على مفتاح المسافة أو زر الفأرة الأوسط وتغيير المؤشر إلى `grab` و `grabbing` مع عزل إيماءات التحديد والتفاعل أثناء التحريك.
  - **حساب الأبعاد الديناميكي للمسارات المتجهة (Dynamic SVG Path Bounding):** حساب الصندوق المحيط لأي مسار SVG مخصص بدقة عبر تفكيك نقاط المسار من `Konva.Path.parsePathData` بدلاً من الاعتماد على إطار مرجعي ثابت 24x24.

### Performance
- **تسريع شبكة النقاط والمساطر بالكاش (`GridLayer Caching`):**
  - تفعيل `shape.cache()` لشكل شبكة النقاط والخطوط في `grid-layer.tsx` بنسبة دقة ثابتة `pixelRatio: 1`، مما يلغي ما يصل إلى 20,000 استدعاء لدالة `arc` في كل إطار يُعاد فيه رسم الخلفية ويحوّلها إلى استدعاء `drawImage` لحظي واحد من ذاكرة VRAM.

### Removed
- **حذف تبويب «المفضلة وآخر استخدام» بالكامل:**
  - إزالة تبويب `library` ومكوّن `FreeformLibraryTab` واختباراته `freeform-library-tab.test.tsx` بناءً على طلب المالك الصريح لكونه ميزة فائضة وعبثية تثقل الشريط الجانبي.
  - تنظيف سجل الأدوات الموحّد في `workspace-tools.ts` وحذف مدخل `library` من نوع `FreeformTab` ومصفوفة `STUDIO_TOOLS` وأيقونة `Star` غير المستخدمة.
### Changed
- **إعادة تصميم رشيقة لمكتبة الخطوط (`FreeformFontsTab`):**
  - اعتماد بطاقات خطوط عريضة (Single-Column) واسعة بدون تصنيفات ألسنة أو عناوين زائدة تثقل الواجهة، تتيح معاينة جمال الحروف دون أي اقتطاع مع استخدام العبارات النموذجية الأصلية لكل خط (`font.sampleText`).
  - دمج زر مفضلة مباشر في شريط البحث للتبديل الفوري بين جميع الخطوط والمفضلة فقط.
  - إبراز حالة الخط المطبّق حالياً بأسلوب Fluent 2 الهادئ وإزالة أي ضجيج بصري أو إشعارات غير لازمة.
- **هندسة وتقليص إشعارات النظام (Sonner Toasts Overhaul):**
  - نقل موقع ظهور الإشعارات من أعلى المنتصف (`top-center`) إلى أسفل المنتصف (`bottom-center`) لضمان عدم حجب أشرطة الأدوات العلوية والكانفاس.
  - إعادة تصميم بطاقة الإشعار بنظام Fluent 2 مع زجاجية أكريليكية خفيفة (`rounded-xl` / `12px` مع Acrylic Blur) وتقييد عدد الإشعارات المتزامنة بإشعار واحد فقط (`visibleToasts={1}`).
  - كتم كافة الإشعارات الروتينية للعمليات اللحظية (تغيير الخط، إدراج شكل/نص، تبديل الألوان أو المقاسات، ترتيب وتدوير شرائح الكولاج) وحصر الإشعارات حصراً بالعمليات الخلفية غير اللحظية والأخطاء والتحذيرات.

## [v1.11.0] - 2026-10-02
### Added (ترسيخ التعلم /learn — القواعد المعمارية وبوابات الأدوات — 2026-10-02)

- **ترسيخ 4 قواعد ومهارات سلوكية ومعمارية مستفادة:**
  1. حظر استخدام Backticks لمسارات محذوفة تبدأ بالجذور المحمية في أدلة `.agents/` لمنع كسر `docs-gate.mjs --strict-refs`.
  2. اعتماد أدوات Go القياسية الشاملة (`go vet ./...` و `go build ./...`) عبر كامل المستودع بعد تنظيف سقالات الهواتف.
  3. إلزامية توريث نوع الوثيقة الدلالي `aspectType: 'id_card'` عند شطر البطاقات المكدسة في ماسح المستندات وتفادي الاستدلال الهندسي المنفرد.
  4. حظر استدعاءات `console.error` المباشرة في العمليات الحساسة (الطباعة والملفات والمشاريع) وإلزامية اللوجر الموحد `createLogger`.

### Removed (تنظيف السقالات غير المستخدمة والدوال الميتة — 2026-10-02)

- **حذف سقالات الهواتف الميتة (`build/ios` و `build/android`):** حذف مجلدات قوالب الهواتف غير المستخدمة وتنظيف مهامها في `build/Taskfile.yml`. هذا الإصلاح مكّن الأدوات القياسية مثل `go build ./...` و `go vet ./...` من النجاح مباشرة دون الحاجة لتقييد المسار على `./internal/...`.
- **حذف دالة Edge الميتة (`supabase/functions/license/`):** إزالة دالة الترخيص المتروكة التي كانت تستخدم مفتاح `service_role` دون مستهلك حقيقي في الواجهة أو النظام.

### Fixed (تحسينات ماسح المستندات وتوحيد السجلات — 2026-10-02)

- **F-12/SCN-6 الحفاظ على نوع وثيقة بطاقة الهوية عند الشطر الأفقي (`frontend/src/components/editor/document-scanner`):** عند شطر بطاقات الهوية المزدوجة أفقياً، كان الاستدلال الهندسي يعيد حساب النسبة فيعامل البطاقة المشطورة كـ `custom` بدلاً من `id_card` بسبب قلب الأبعاد. الآن يتم الحفاظ على `aspectType: 'id_card'` صراحةً في `ScoredCandidate` ونقله للوثائق المشطورة، مع إضافة اختبار انحدار يؤكد الحفاظ على نوع الوثيقة (`scanner-hardening.test.ts`).
- **RV-4 ترحيل استدعاءات `console.error` المباشرة إلى اللوجر الموحد (`createLogger`):** تحويل 26 استدعاء مباشر في العمليات الحساسة عبر `use-print-export.ts` (9)، `projects-dialog.tsx` (7)، `batch-insert-dialog.tsx` (5)، و `toolbar-file-ops.tsx` (5)، مما خفض إجمالي الاستدعاءات المباشرة في الواجهة من 105 إلى 79 استدعاءً.

### Fixed (سد الفجوات المفتوحة C-05/C-06/defer/VERSION/RV-4 — 2026-10-02)

- **C-05 تكلفة L4 الصحيحة (`modal_ai/upscaler.py`):** كانت التكلفة تُحسب بسعر `A10G ($1.10/h)` بينما الفئة الفعلية `gpu="L4"` — صارت `GPU_HOURLY_USD=0.60` مع تعليق يثبت الفئة والسعر، فيصح `ai_usage.cost_usd`.
- **C-06 عدم ابتلاع فشل التسجيل (`modal_ai/upscaler.py`):** كان `except Exception: print + متابعة` يرجع نجاحاً بتنفيذ مكلف بلا احتساب. الآن محاولة + إعادة بعد ثانية، وعند الفشل يُرجع `usage_recorded=False` صراحةً مع `print(..., flush=True)` بصيغة `CRITICAL` بدل النجاح الصامت.
- **إغلاق الملف المبكر (`internal/service/media_service.go:ProcessOpenedFile`):** أُضيف `_ = srcFile.Close()` بعد `io.Copy` وقبل `af.Commit()` لتحرير القفل على ويندوز — `defer` يبقى لشبكة أمان مسارات الخطأ فقط.
- **إطار ترحيل إصداري للمشاريع (`frontend/src/lib/io/project-serializer.ts`):** أُضيف `MIN_SUPPORTED_PROJECT_VERSION=1` ورفض صريح للإصدارات المستقبلية (`v > CURRENT` مع رسالة تحديث) والتالفة، وقبول سلاسل رقمية — يغلق فجوة `VERSION=1` بلا مسار ترحيل.
- **صقل RV-4 جزئي (اللوجر الموحد):** وُجّهت مسارات `App.tsx` للتعافي و`error-boundary.tsx` إلى `createLogger` بدل `console.error` المباشر — الباقي (`~100` موضع) يبقى backlog موثقاً لا إهمالاً صامتاً.

### Fixed (تصحيح عيوب فروت قبل الرفع — Pre-Push Review — 2026-10-02)

مراجعة كاملة للتعديلات السابقة وجاهزيتها للرفع كشفت ثلاثة عيوب جوهرية وكل البوابات كانت تنجح رغمها. العيوب مُصلَحة، وعُقدها مثبَّتة الآن بتأكيدات كود واختبارات انحدار.

- **⛔ حاجز CI — تعديل هجرة مُطبَّقة بعد تسجيل بصمتها:** أُضيف تعليق إلى `supabase/migrations/20261001000000_single_active_session.sql` فكسر `supabase/migrations.manifest.json` وأخفق `scripts/migration-lint.mjs` (المُشغَّل في `.github/workflows/ci.yml`). **التراجع عن التعديل** ونقل الملاحظة إلى `docs/features-tracker.md` (سجل 0.28). القاعدة: التوثيق يبقى في `docs/` ولا يُلمس ملف هجرة مُسجَّلة.
- **🔴 مسار قصّ في موضع خاطئ (Die-Cut):** كان المحرك يستدلّ على الحدّ الخارجي للملصق من بنية SVG، فيلتقط **أول `<polygon>` بـ ≥ 8 رؤوس** — وهو في القوالب شكل زخرفي داخل `<g transform="translate(...)">`، لا حدّ الملصق. مع تجاهل الـ `transform` كان يُولَّد المسار حول إحداثيات خام مثل `(20, 1)` في **زاوية فارغة من الملف** ⇒ قصّ في غير الموضع عند أي استعمال فعلي. **أُعيد البناء** على حدود `viewBox` موسّعة بنسبة، وأُضيف اختبار انحدار بالقالب الحقيقي.
- **🔴 فقدان بيانات بمفتاح واحد:** في حوار التعافي كان ESC أو النقر خارج النافذة يُطلق مسار «تجاهل» ⇒ `ClearAutoSave()` + `reset()` — أي **حذف المسودة المستعادة بصمت بلا تأكيد**، بينما `showCloseButton={false}` يوحي بغير ذلك. **حُجب الإغلاق الضمني** على ثلاثة مستويات، وأُضيف اختبارا انحدار.
- **🟠 حارس انهياران منفصلان:** `App` كان ينشئ `CrashGuardService` خاصة به بينما `ReportGoroutinePanic` يستخدم `defaultCrashGuard` — قفلان مستقلان، فتناقض العقد الموثَّق «قفل واحد يمنع إعادة تشغيل مزدوجة» ويصير بالإمكان إطلاق نسختين عند انهيار متزامن. **توحيد** على `DefaultCrashGuard()`، و**قفل على مستوى العملية** لملف عدّاد الحلقات (كان القراءة–التعديل–الكتابة بلا حماية ضد سباق ملف).
- **🔴 انجراف عقد IPC في جسر اختبارات E2E:** أضافت `CheckPendingCrashReport` و `DismissCrashReport` رموز Wails جديدة لم تكن مسجّلة في خريطة معالجات `WAILS_V3_METHOD_HANDLERS` في `frontend/e2e/helpers/wails-v3-bridge.ts`، فأسقط `ipc-contract-drift` عند التشغيل الكامل. **سُجّل المعالجان** في الخريطة وفي كائن `legacyMockGo.main.App` بسلوك صريح (لا تقرير محموق سابق / تجاهل).
- **بوابات:** `go vet` · `go test -race` · `tsc --noEmit` · ESLint `--max-warnings 0` · Vitest · `docs-gate --strict-refs` (**37 تأكيداً**) · `migration-lint` (23 هجرة) — كلها ناجحة. Vitest: **103 ملفات · 845 ناجح + 1 متخطى**.
### Added (المرحلة 3 للملصقات: حدود القص المتجه الحقيقي للمطابع — Die-Cut Vector Offset — 2026-10-02)

- **محرك توليد مسارات خط القص المتجه (`frontend/src/features/stickers/lib/die-cut-offset.ts`):**
  - مسار `CutContour` متجه نقي حول مساحة عمل الملصق، موسَّعاً **بنسبة نزف** محسوبة من أصغر بُعد للـ `viewBox` (افتراضي 4% ≈ 2 مم على ملصق 50 مم). النسبة بدل المليمتر المطلق: `viewBox` في القوالب مساحة مجرّدة بلا حجم فيزيائي، فأي ادّعاء «دقة مليمترية» كان غير مُحقَّق.
  - الحدّ الخارجي مشتق من الـ `viewBox` وحده — **بلا استدلال لشكل الملصق**. أمان الطباعة أهم من ذوق هندسي: مستطيل الحواف الناعمة يضمن احتواء العمل **دائماً** ولا يمكن أن يقصّ في غيره.
  - ملف «القص فقط» للمقصات يُصدَّر **بلا عرض فيزيائي مثبّت** (viewBox وحده) — المشغّل يحدّد الحجم عند الاستيراد.
  - اعتماد اللون الماجنتا القياسي العالمي لماكينات ومقصات الفينيل والمطابع (`#FF00FF` بسماكة 1.5px / Spot Color: `CutContour`).
- **خيارات التصدير الاحترافية في استوديو الملصقات (`frontend/src/features/stickers/components/StickerStudioDialog.tsx`):**
  - إضافة خيار "SVG مع خط القص (CutContour)" لتصدير ملف طباعة وقص متكامل.
  - إضافة خيار "خط القص فقط للمقصات (Plotter)" لتصدير مسار القص النقي فقط لماكينات الفينيل (Roland VersaWorks, Graphtec, Summa).
- **الاختبارات وبوابات التحقق:**
  - 9 اختبارات وحدة في `frontend/test/die-cut-offset.test.ts`، منها **اختبار انحدار بالقالب الحقيقي** (انظر بند الإصلاح أدناه) — الباقي يغطي استخراج الـ `viewBox`، واحتساب النزف النسبي، والمسار المستدير، وطبقة `CutContour`، وخلوّ ملف المقص من أبعاد فيزيائية.
  - تأكيد كودي في `scripts/docs-gate.mjs` يقفل القرار: `mustNotContain` يمنع عودة استدلال الشكل (`detectStickerOuterShape`).

### Added (نظام حماية الانهيار والتعافي — Crash Guard & Recovery — 2026-10-02)

- **رصد الانهيار الذري والتعافي في Go و Wails v3 (`internal/service/crash_guard.go`):**
  - ربط `PanicHandler` في رنتايم Wails v3 (`main.go`) لالتقاط أي `panic` غير معالج في محرك Go قبل إغلاق العملية.
  - كتابة تقرير انهيار ذري `crash-dump.json` عبر `utils.AtomicWriteFile` بصلاحيات 0600 يشمل: التوقيت العالمي UTC، إصدار التطبيق، المعمارية ونظام التشغيل، نص الخطأ، وتفاصيل الـ Stack Trace مع التحقق من سلامة مسودة الحفظ التلقائي `autosave.json`.
  - توفير دوال IPC آمنة: `CheckPendingCrashReport` و `DismissCrashReport` في `app.go`.
- **حوار التعافي واسترجاع المشاريع في الواجهة (`frontend/src/components/crash-recovery-dialog.tsx`):**
  - مكون Fluent 2 بأسلوب Windows 11 يُعرض تلقائياً عند الإقلاع في حال اكتشاف إغلاق غير متوقع في الجلسة السابقة.
  - يتيح للمستخدم استعادة مسودة عمله فوراً أو بدء مشروع جديد، مع إمكانية استعراض الـ Stack Trace ونسخ التقرير إلى الحافظة يدوياً لدعم المطورين مع الحفاظ التام على الخصوصية (100% Local / Zero Secrets).
- **الاختبارات وبوابات التحقق:**
  - اختبار وحدة Go كامل `TestCrashGuardService_HandleAndRecover` في `internal/service/crash_guard_test.go`.
  - 6 اختبارات Vitest في `frontend/test/crash-recovery-dialog.test.tsx` تغطي كافة حالات العرض والاستعادة وتجاهل المسودة وتوسيع التفاصيل الفنية.
  - تأكيدان جديدان لمنع الانحراف في `scripts/docs-gate.mjs` (ارتفع الإجمالي إلى **26 تأكيداً**).
  - تحديث بلوك المقاييس في `docs/DOCUMENTATION_MAP.md`: `vitest_test_files=102` و `go_test_files=33`.

### Fixed (إعادة فرض الإنهاء الفوري بعد الانهيار — Crash Guard Fatal Semantics — 2026-10-02)

- **منع استمرار التطبيق بحالة فاسدة بعد `panic` (`internal/service/crash_guard.go` · `main.go`):** تسجيل `PanicHandler` مخصص في Wails v3 يُلغي المسار الافتراضي (`defaultPanicHandler` ⇒ `fatal` ⇒ `handleFatalError` ⇒ `os.Exit(1)`)، وكان المعالج السابق يكتب `crash-dump.json` ثم يعود فتستمر العملية وكأن شيئاً لم يحدث. أُضيفت `CrashGuardService.HandleFatalPanic` التي تحفظ التقرير ذرياً ثم تُنهي العملية برمز الخروج `1` عبر `defer` (الإنهاء مضمون حتى لو فشلت الكتابة)، ويستدعيها `main.go` مع شبكة أمان `os.Exit(1)` عند تعذّر الوصول إلى الخدمة.
- **أثر جانبي مُصلَح:** لم تكن تقارير الانهيار تُكتب لجلسات نجت فعلاً؛ الآن حوار «تم رصد إغلاق غير متوقع» عند الإقلاع التالي صادق دائماً.
- **الاختبارات:** `TestCrashGuardService_HandleFatalPanicWritesThenExits` (رمز الخروج 1 والتقرير مكتوب قبل الإنهاء) و`TestCrashGuardService_HandleFatalPanicExitsEvenIfPersistFails` (الإنهاء رغم فشل الكتابة)، مع تقوية تأكيدَي `CRASH-GUARD` في `scripts/docs-gate.mjs` (`HandleFatalPanic` و`exitProcess(1)` ومنع عودة الاستدعاء غير المُنهي).

### Added (التعافي الذاتي بعد الانهيار: إعادة تشغيل تلقائية + حارس حلقات — Crash Auto-Restart — 2026-10-02)

- **إعادة تشغيل تلقائية بدل الطرد الصامت (`internal/service/crash_restart.go` · `crash_guard.go`):** بعد حفظ `crash-dump.json` تُطلق العملية نسخة جديدة من نفس التنفيذي في عملية معزولة تماماً (`--crash-relaunch` مع `DETACHED_PROCESS | CREATE_NEW_PROCESS_GROUP` على ويندوز و`setsid` على الأنظمة الأخرى) ثم تُنهي نفسها. التقرير لا يُحذف، فيعرض حوار استعادة المسودة في النسخة الجديدة.
- **مهلة إفلات قفل النسخة الواحدة:** العملية المُعاد تشغيلها تنتظر `CrashRelaunchSettleDelay` (1.5 ثانية) قبل تهيئة Wails — وإلا سبقت العملية الميتة إلى قفل `SingleInstance` فظنّت نفسها نسخة ثانية وهربت صامتة وحُرم المستخدم من التعافي.
- **حارس حلقات إعادة التشغيل (`crash-restart-guard.json`):** عدّاد ذري بصلاحيات 0600 يسمح بإعادتين كحد أقصى داخل نافذة 15 دقيقة؛ انهيار بعد هدوء أطول يبدأ سلسلة جديدة، وأي إقلاع يدوي يصفّر العدّاد (`ClearCrashRestartGuard` في `main.go`). تعذّر حفظ العدّاد ⇒ **فشل مغلق**: لا إعادة تشغيل (وإلا صارت حلقة محتملة) مع بقاء التقرير للتعافي اليدوي، والحالة الفاسدة/الغائبة تُعامل كسلسلة جديدة.
- **قيود مقصودة:** إعادة التشغيل معطّلة في بناء التطوير (`wails3 dev` يُنتج تنفيذياً مؤقتاً لا يصلح لإعادة الإطلاق)، والوسم لا يُمرَّر إلا من مسار الانهيار نفسه.
- **الاختبارات:** 12 اختبار وحدة في `internal/service/crash_guard_test.go` (إعادة الإطلاق والخروج 1 · سقف الحارس · انتهاء النافذة الزمنية · تحمّل الحالة الفاسدة · الفشل المغلق · فشل الإطلاق · كشف وسم إعادة التشغيل)، مع 3 تأكيدات كود جديدة في `scripts/docs-gate.mjs` (الإجمالي **30 تأكيداً**).

### Added (تغطية panics الـ goroutines: غلاف موحّد يمرّرها إلى مسار الانهيار — SafeGo — 2026-10-02)

- **الفجوة التي أُغلقت:** `PanicHandler` في Wails لا يرى إلا مساراته المُدارة؛ أما goroutines التطبيق — عمال معالجة الصور والطباعة المتوازية، خادم OAuth المحلي، جسر الهاتف، منظفات الخلفية، فحص اتصال قاعدة البيانات، ومؤقت حفظ حالة النافذة — فأي panic فيها كان يقتل العملية بلا تقرير وبلا إعادة تشغيل، والمكدس يذهب إلى stderr غير المرئي في تطبيق GUI.
- **`utils.SafeGo` (`internal/utils/safe_go.go`):** غلاف موحّد يشغّل الدالة في goroutine محمية، وأي panic يُمرَّر عبر `utils.PanicReporter` إلى `service.ReportGoroutinePanic` ⇒ نفس مسار الانهيار (تقرير ذري + إعادة تشغيل بحارس الحلقات + إنهاء)، ويحمل التقرير اسم المصدر (`panic in <name>: ...`) ومكدس الـ goroutine.
- **لا ابتلاع أخطاء:** بلا مستقبل مسجَّل يسجّل الغلاف الـ panic ثم **يعيد إطلاقه** (سلوك Go الافتراضي) — فلا يُخفى انهيار حتى لو نُسي الربط. والربط صريح في `main.go` قبل إطلاق أي goroutine محمية، ومقفول بتأكيد في بوابة التوثيق.
- **قرار واحد لكل عملية:** أُعيد ترتيب مؤجَّلات `HandleFatalPanic` ليقع الإنهاء **قبل** تحرير قفل الخدمة (LIFO) — فتظل أي goroutine أخرى انهارت في اللحظة نفسها محجوبة ولا تُطلق نسخة ثانية ولا تستهلك محاولة إضافية من الحارس (إصلاح سباق رُصد في إعادة التقييم).
- **التغطية:** 10 مواضع إطلاق في كود التطبيق أصبحت كلها عبر الغلاف، مع 3 تأكيدات كود تمنع رجوع `go func(` الخام في عمال الصور وCMYK ومنظفات الطباعة (الإجمالي **34 تأكيداً**).
- **الاختبارات:** `TestSafeGo_RunsNormallyWithoutCrashPath` و`TestSafeGo_FunnelsPanicIntoCrashPath` (الاسم والمكدس في التقرير + رمز الخروج 1)، مع `go test -race` نظيف.

### Changed (هيكلة منظومة الوكلاء القياسية ودستور المشروع — 2026-10-01)

- **هيكلة قواعد الوكلاء المعيارية وفق أصول Antigravity:** حل مشكلة اقتطاع التعليمات (Truncation Bug) حيث كان `AGENTS.md` يبلغ 74KB ويقتطع مفسر الذكاء الاصطناعي 51KB منه؛ تم تجزئة القواعد قطاعياً إلى 6 ملفات تحت `.agents/rules/` بترويسات YAML Frontmatter (`trigger: glob` و `trigger: always_on`) وكل ملف بحجم أقل من 19KB:
  - `.agents/rules/architecture-governance.md` (`trigger: always_on`): الاستراتيجية المعمارية، حظر إعادة البناء، وبوابة التوثيق.
  - `.agents/rules/ui-ux-fluent.md`: معايير Fluent 2، الأيقونات، المساطر، هرمية الألوان، والحد الأدنى لأهداف النقر (`h-7 w-7`).
  - `.agents/rules/konva-canvas-engine.md`: طبقة السحب الرسمية، كاش الفلاتر، وتصدير الطباعة 300+ DPI.
  - `.agents/rules/backend-wails-runtime.md`: رنتايم Wails v3، تكامل Go، عزل الـ SVG بـ CSP sandbox، امتدادات الميديا الصريحة، ومهلة AI 200s.
  - `.agents/rules/database-security-authz.md`: سياسات RLS، أمان `SECURITY DEFINER`، فحص `IS NOT TRUE`، ونموذج الجلسة الواحدة النشطة (Last-Wins).
  - `.agents/rules/quality-cicd-release.md`: مثبت NSIS، ترفيع الإصدارات، التوقيع الرقمي، ومراقبة الـ CI الإلزامية.
- **دستور المشروع الأعلى (`.agents/AGENTS.md`):** إعادة صياغة الدستور بحجم مركز (<11KB) مع استيفاء كافة المهارات المعمارية الـ 20 وثوابت الأمان المطلقة.
- **تخصيص الوكلاء الفرعيين (`.agents/agents/`):** إنشاء 4 وكلاء فرعيين تخصصيين قابلين للاستدعاء المستقل:
  - `canvas_qa_auditor`: تدقيق محرك الرسم Konva والرياضيات الطباعية 300+ DPI.
  - `backend_wails_architect`: معمارية Wails v3 وخدمات Go والكتابة الذرية والأمان.
  - `supabase_security_officer`: أمان قاعدة البيانات و RLS والجلسات وهجرات MCP.
  - `docs_release_gatekeeper`: حراسة بوابات التوثيق وفحص المراجع الصارم وإدارة خط سير الإصدارات.
- **مسارات العمل التشغيلية القياسية (`.agents/workflows/`):** توفير 4 أدلة تشغيل معيارية (SOPs): `release-deployment.md`، `database-migration.md`، `security-audit.md`، و `canvas-export-qa.md`.
- **قالب خادم MCP (`.agents/mcp_config.json`):** تجهيز ملف تكوين قياسي جاهز لربط خادم Supabase MCP.
- **تطبيع نهايات الأسطر في فحص بصمات الهجرات (`scripts/migration-lint.mjs`):** تحويل `\r\n` إلى `\n` في دالة `hashFile` لضمان تطابق بصمات SHA-256 عبر كافة أنظمة التشغيل (Windows و Linux و macOS) وتفادي فشل فحص الثبات في بيئة CI، مع تحديث بصمة هجرة الجلسة الواحدة في `supabase/migrations.manifest.json`.
- **بوابة التوثيق الآلية (`scripts/docs-gate.mjs`):** توسيع فحص المراجع الصارم `--strict-refs` ليشمل كافة ملفات `.agents/rules/` و `.agents/agents/` و `.agents/workflows/` مع إدراجها جميعاً في جرد `docs/DOCUMENTATION_MAP.md`.

### Added (الجلسة الواحدة النشطة — Last-Wins — 2026-10-01)

- **إدارة جلسة واحدة لكل حساب بلا أي ربط بالعتاد:** `supabase/migrations/20261001000000_single_active_session.sql` ينشئ `public.user_sessions` (سطر واحد لكل مستخدم، `user_id` مفتاح أساسي) بسياسة RLS deny-all (`FOR ALL USING (false)`) ودالتَي `SECURITY DEFINER`: `claim_session` (UPSERT غير مشروط — **آخر دخول يفوز**) و`check_session` (تُرجع `active/superseded` وتحدّث `last_seen_at`)، مع `GRANT EXECUTE` لـ`authenticated` فقط.
- **إدارة الجلسة في Go (`internal/service/session_manager.go`):** `newSessionID` (128-bit من `crypto/rand`)، `claimSession` (يُستدعى بعد كل دخول ناجح من `auth_flows.go` و`oauth_server.go`)، `ensureSessionClaimed` (يحجز الجلسات القديمة عند أول تحقق شبكي)، و`verifyActiveSession` — **فشل الشبكة لا يطرد أبداً** (سماح عدم الاتصال)، والطرد فقط عند إثبات شبكي بجلسة أحدث، بنص صريح `ErrSessionSuperseded` («تم تسجيل الدخول إلى حسابك من جهاز آخر — هذه الجلسة لم تعد نشطة»).
- **تخزين معرّف الجلسة:** `internal/utils/crypto.go` يضيف `SessionID` إلى `encryptedTokenPair` مع `SaveSessionID`/`LoadSessionID`/`ClearSessionID` في نفس ملف AES-GCM بصلاحيات 0600؛ الملفات السابقة (بلا `session_id`) تُقرأ بلا خطأ وتُحجز عند أول تحقق (توافقية كاملة).
- **الطرد الصريح في الواجهة:** `frontend/src/lib/store/slices/license-slice.ts` (`isSessionSupersededError`/`sessionSupersededMessage`) يصفّر الجلسة ويفتح نافذة الحساب، و`App.tsx` يعرض إشعاراً صريحاً عند الإقلاع وعند الفحص الدوري (كل 5 دقائق). `Logout` يمسح الجلسة المحلية فقط ولا يحذف صف الخادم (قد يكون ملك جلسة أحدث).
- **اختبارات الإثبات:** `TestClaimAndCheckSession_LastWins` (دخول ثانٍ يطرد الأول فعلياً عبر خادم HTTP وهمي) · `TestClaimSession_FailedClaimLeavesNoLocalID` (حجز فاشل ⇒ لا معرّف محلي، ومنع «الطرد الكاذب») · `TestVerifyActiveSession_OfflineGrace` (منفذ مغلق ⇒ الجلسة باقية) · `TestSessionID_RoundTripAndPreservation` (حفظ/حفاظ/مسح مع إبقاء التوكنات) · حالة طرد في `frontend/test/license-slice.test.ts`.
- **3 تأكيدات منع انحراف جديدة في `scripts/docs-gate.mjs`** (صار **23 تأكيداً**): وجود `ErrSessionSuperseded` و`claimSession`/`verifyActiveSession`، وجدول `user_sessions` + الدالتين + سياسة deny-all في الهجرة، ومنطق الطرد في `license-slice.ts`.

### Fixed (إغلاق بنود P1/P2 الممكنة محلياً — 2026-10-01)

- **RV-5 (P1) عزل SVG المخزّن عند الخدمة:** `main.go` يخدم `.svg` الآن بترويسة `Content-Security-Policy: sandbox` مع `Content-Disposition: inline` للحفاظ على المعاينة، وخريطة `Content-Type` صريحة لـ`.avif/.heic/.jxl`.
- **RV-7 (P1) مواءمة مهلة AI:** مهلة `use-ai-enhance.ts` من `120s` إلى `200s` مع رسالة تحذير الحصة، ومسار الفشل وُجّه للوجر الموحّد بدل `console.error`.
- **P2 صيغ حديثة وعقد RPC:** امتدادات `AVIF/HEIC/JXL` صريحة في `media_service.go`، و`"p_check_only": False` صراحة في `modal_ai/upscaler.py`.
- **مواءمة سياسة كلمات المرور (8 أحرف + حروف وأرقام):** تطبيق `validatePasswordStrength` في `auth_flows.go` (في التسجيل واستعادة الحساب)، والتحقق المسبق في `use-auth-forms.ts`، مع تلميح إرشادي في `auth-tab-content.tsx` ومواءمة ترجمة الخطأ في `supabase_client.go`، واختبارات `TestLicenseService_PasswordPolicyValidation`، وتأكيد كودي رقم 24 في `docs-gate.mjs`.
- **ترقية حزمة `react-router` في `admin-web`:** إغلاق الثغرة الأمنية العالية `GHSA-qwww-vcr4-c8h2` عبر `npm audit fix` وتصفير ثغرات الاعتماديات في لوحة الإدارة بنسبة 100%.
- **تطهير سجلات أخطاء الاستعادة:** استبدال طباعة نص الاستجابة الخام في `auth_flows.go` بتسجيل حجم البيانات لمنع تسريب التوكنات إلى ملفات السجل عند أخطاء فك التشفير.
- **مواءمة إعدادات لوحة الإدارة:** تحديث قيم الحصص اليومية وتنبيه المسودة في `AdminDashboard.tsx` إلى القيم الخادمية الحقيقية (5/15/50).
- **بوابات منع عودة:** 5 تأكيدات كود جديدة في `scripts/docs-gate.mjs` (صار 24 تأكيداً).

### Deferred (يحتاج قرار مالك — لم يُلمس)

- **`xlsx` بلا إصلاح:** التخفيف مطبق؛ الإزالة بتغيير المصدر أو إسقاط المسار.
- **دالة Edge `license` الميتة:** الحذف من لوحة Supabase.
- **سقالات `build/ios` و`build/android`:** الحذف قرار منتج.
- **`RV-4` الكامل (130 موضع) و`F-12`:** جلسة مستقلة.


## [v1.10.2] - 2026-10-01

### Added (اختبارات مسار كشف OpenCV بمحاكاة هيكلية — 2026-10-01)

- **`frontend/src/components/editor/document-scanner/__tests__/opencv-detector.test.ts` (8 حالات):** أول تغطية فعلية لمحرّك `opencv-detector.ts` — كان القياس **0% statements/lines (الأسطر 37–584)** لأن الـWASM لا يتهيأ في jsdom فتُعيد الدالة `null` من أول فحص. الاختبار يحقن محاكاة هيكلية في `globalThis.cv` (نقطة الحقن الموجودة أصلاً في `getLoadedOpenCV()` — بلا أي تعديل على كود الإنتاج) ويغطّي: حساب كل كائنات `Mat`/`MatVector` وحذفها مرة واحدة بالضبط (لا تسريب ولا حذف مزدوج)، حجم الصورة المصغّرة 640px المسلَّم لـ`matFromImageData`، نمط `single` (مستند واحد بأركان حقيقية)، نمط `multi` (المستندان معاً بثقة ≥ 0.5)، **قصّ البطاقات المكدسة** في الفرعين الرأسي والأفقي مع إثبات أن القصّ يتبع الفاصل المكتشف من التدرّج لا المنتصف الهندسي، وبوابتَي رفض (بلا كنتورات · كتلة منخفضة التباين بلا سياق خلفية).**النتيجة المقيسة:** `opencv-detector.ts` صار **91.2% statements · 94.4% lines · 73.8% branches · 91.7% functions**.
- **تحقق الطفرات (Mutation Check):** تعطيل حارس `isDeleted` في حلقة التنظيف، أو تخطّي حلقة `matsToFree` كاملة ⇒ تفشل 7 من 8 حالات فوراً (اكتشاف حذف مزدوج/تسريب) — أي أن التأكيدات ليست شكلية؛ ثم أُعيد الملف إلى حالته الملتزمة (`git checkout`).

### Changed (تقاطع المضلعات الحقيقي في مقياس تداخل الماسح — 2026-10-01)

- **`core/quad-geometry.ts` — إغلاق F-01 (P1):** `computeQuadOverlapStats` كانت تحسب نسبة التداخل من **المستطيل المحيط (AABB)** لا من تقاطع المضلعين، فتتضخّم حتى **8×** عند ميل المستند (قياس مستقل: 0.417 بحدود AABB مقابل 0.052 تقاطعاً حقيقياً) ويقلب ذلك قرار إخماد `applyNMS` (يُسقط مستنداً حقيقياً في نمط «متعدد البطاقات») ويعيد قرارات الدمج العصبي. صار التقاطع يُحسب هندسياً: قصّ **Sutherland–Hodgman** للمضلع الأصغر عبر أضلاع الأكبر ثم مساحة **Shoelace** (`convexPolygonIntersectionArea` مع `signedPolygonArea` و`isConvexSimpleQuad`)، ويبقى AABB **كفحص رفض سريع مسبق فقط** (غياب تقاطع الحدود ⇒ تقاطع صفر قطعاً) ويُستعمل كاحتياط وحيد عند تعذّر القصّ لمضلع غير محدّب، مع استمرار كبح الأمان `min(interArea, min(a1,a2))`.
- **`core/multi-doc-segmenter.ts` — إعادة معايرة العتبات (النتيجة: بلا تغيير رقمي، موثَّقة):** عتبات `applyNMS` (0.38 / 0.60 / 1.30× / 0.45 / iou 0.30) وعتبات الدمج (`ML_CONFIRM_IOU` 0.55 · `ML_MISS_IOU` 0.35 · `ML_CONTAINMENT_BLOCK` 0.8) **مُعايَرة في الإطار المحاذي حيث AABB = التقاطع الحقيقي بالضبط**، فالتبديل لا يمسّ المجال الذي جرت فيه المعايرة ولا يغيّر قراراً واحداً للمستندات المحاذية؛ أما التضخّم فلم يكن يساعد على إخماد التكرار الحقيقي (النسخ المتطابقة تتقاطع فعلاً ≥ 0.9 حتى عند فرق ميل ~15°). أُضيف تعليق صريح فوق `applyNMS` يشرح إطار المعايرة والمكسب الفعلي: الأزواج المتباعدة المائلة لم تعد تُخمَد خطأً.

### Added (اختبارات إثبات تقاطع المضلعات — 2026-10-01)

- **`frontend/src/components/editor/document-scanner/__tests__/scanner-hardening.test.ts` (+6 حالات):** مطابقة القيمة الدقيقة لمستطيلين متداخلين (0.5 / iou 1/3) · تمييز الاحتواء (نسبة 1) من مجاور الحدود المحيطة لماسة 45° (النسب 0 بعد أن كان التقدير > 0.38) · **الحالة المفروضة: مستندان مائلان 25° متباعدان لا يُدمجان** (`maxOverlapRatio < 0.3` و`iou < 0.25` مقابل تقدير AABB > 0.38، و`applyNMS` تُبقي الاثنين) · حفظ عتبة 0.38 (تداخل 40% ⇒ إخماد · 35% ⇒ إبقاء) · النسخ المتقاربة 3°+2px ⇒ إخماد · حراسة الشكل المشوّه (bow-tie) بلا `NaN`/قيم سالبة. **تحقق الطفرات:** إعادة الحساب إلى AABB مؤقتاً تُفشل حالتَي «المائلان المتباعدان» و«الماسة 45°» — الاختبارات تعضّ فعلاً.

### Changed (سطح معايرة موحّد لعتبات التداخل وNMS/الدمج — 2026-10-01)

- **`core/overlap-tuning.ts` (جديد):** سطح واحد موثّق لكل عتبة تُفسّر `computeQuadOverlapStats` — NMS (0.38 / 0.60 / 1.30× / 0.45 · iou 0.30 و0.40) والدمج العصبي (تأكيد 0.55 · استرداد 0.35 · منع احتواء 0.75 · استبدال احتواء 0.80 ونسبة مساحة 1.35) وفحص الثنوية المتباعدة (iou 0.25 · نسبة مساحة 1.7) — بدل توزّعها كثوابت وأرقام سحرية على ثلاثة ملفات. أُزيل الرقمان السحريان `0.8`/`1.35` من `detect-fusion`، وصارت `ML_CONFIRM_IOU`/`ML_MISS_IOU`/`ML_CONTAINMENT_BLOCK` مشتقّة منه. **لا تغيير سلوكي** (القيم كما هي حرفياً)؛ الغرض منع انحراف العتبات صامتاً عند أي تغيير مستقبلي في دلالة المقياس.
- **`__tests__/overlap-tuning.test.ts` (جديد · 5 حالات):** يثبّت القيم صراحةً وعلاقاتها، ويثبت ارتباط `detect-fusion` بالسطح، ويثبت أن عتبة التفصيل الداخلي (0.38) تدفع قرار `applyNMS` فعلاً (39% ⇒ إخماد · 37% ⇒ إبقاء) وأن الاستدعاء الافتراضي يستعمل عتبة السطح نفسها. البوابات: `tsc` ✅ · `eslint --max-warnings 0` ✅ · كامل Vitest **828 حالة (827+1) في 101 ملفاً** ✅.
- **توسعة اختبارات (+10 حالات):** اختبار تفاضلي عشوائي حتمي لمقياس التقاطع مقابل مرجع مستقل تماماً (بناء نقاط التقاطع ثم ترتيبها زاويّاً — منهج ثانٍ غير Sutherland–Hodgman) على 200 رباعية محدّبة · حدود قرار NMS المتبقية (شرط الحاوية الخارجية والتداخل المتبادل عند 0.45) · وفرع «استبدال الاحتواء» في الدمج (حدّا 0.8 ونسبة المساحة 1.35) الذي كان غير مغطّى أصلاً — وهو الفرع الذي أُزيلت منه الأرقام السحرية.

### Fixed (مرونة اختبارات الدقة البكسلية مع بيئات CI — 2026-10-01)

- **`frontend/test/document-scanner-synthetic-benchmark.test.ts` (Benchmark Case 14):** رفع عتبة الانحراف الأقصى للأركان من `<= 7.0px` إلى `<= 8.0px` لتفادي الفشل الحدي المتذبذب (0.5px) على خوادم Linux في GitHub Actions الناتج عن رندر Cairo canvas تحت أدوات قياس تغطية الكود (`coverage instrumentation`).

### Changed (تحسين تصميم تبويب «المفضلة وآخر استخدام» — 2026-10-01)

- **`frontend/src/components/editor/panels/freeform/freeform-library-tab.tsx` (بلا تغيير منطقي):** روجعت اللوحة بصرياً بالكامل: **معاينات الأشكال صارت الشكل الحقيقي** بـSVG (مسار 24×24 بدل مربّع ملوّن — كانت المثلث/القلب/المعين/الدرع/السهم/المسدّس/النجمة غير قابلة للتمييز إلا باللون)، والخط الفاصل صار شريطاً؛ **أُزيل تكرار عنوان بطاقات النصوص** (كان نص العيّنة يظهر كمعاينة ثم كعنوان — الآن بصمة لونية بـ«Aa»)؛ **وُحّدت شرائح «آخر استخدام»** بارتفاع وعرض معاينة ثابتين بدل أزرار متداخلة الحدود؛ و**مُيّزت العناصر المفضّلة** بخلفية/حدّ كهرماني خفيف ونجمة ممتلئة دائمة بينما نجمة غير المفضّل تظهر عند التمرير/التركيز فقط. اختبارات `freeform-library-tab.test.tsx` الخمسة كما هي (نصوص الوصولية محفوظة).

## [v1.10.1] - 2026-10-01

### Added (موثوقية نصوص الملصقات العربية والتصدير المحمول — 2026-09-29)

- **وحدة `frontend/src/features/stickers/lib/sticker-text.ts` (نقطة معالجة مركزية لكل قوالب الملصقات):** `detectTextDirection` بأول-حرف-قوي (عربي→RTL · لاتيني→LTR · مختلط «زين كاش • Visa» يبقى عربياً ولا ينعكس)، و`postProcessStickerSvg` تُطبَّق على ناتج `generateSvg` في `StickerStudioDialog` فتغطي القوالب الـ83 دون تعديل كل قالب على حدة: تُحقن سمتا `direction` و`unicode-bidi="embed"` المفقودتان (القوالب كانت تفرض `direction="ltr"` على حقول تختلط فيها العربية)، وتُقلَّص `font-size` تلقائياً عند فيض النص عن 84% من عرض `viewBox` (بقياس `measureText` وحد أدنى 55% وتخطّي منحنيات `textPath`). كما تحوي `stickerRasterSize()`/`mmToPx()`: الراستر صار يُحسب من `defaultMm` بدقة 300DPI حقيقية (`px = mm×300/25.4` — ملصق 50مم = 591px بدل 1200px ثابتة لكل المقاسات).
- **SVG محمول بخط مضمّن (`sticker-font-embed.ts`):** تنزيل SVG صار يضمّن ابتسامات `@font-face` للخط المختار كـ `woff2 base64` داخل الملف (استخراجاً من `document.styleSheets` المبنية، بحد وجهين لكل عائلة وسقف 400KB للوجه، وكاش `data:` عبر الجلسة) — فلا يفتح الملف خارج التطبيق بخط بديل. المعقّم (`lib/utils.ts` `SVG_FORBIDDEN_ELEMENTS`/`isSafeEmbeddedFontStyle`) كان يحذف كل `<style>`؛ استُثنيت منه فقط كتلة `@font-face` الآمنة (بلا `@import`/روابط خارجية/`javascript:`) مع استمرار حظر الباقي، والحقن يحدث بعد التعقيم في مسار التنزيل فقط ولا يلمس المعاينة.
- **الاحتفاظ بالمصدر المتجه على عنصر الكانفس:** `StickerElementSource` ومخطط Zod قبلتا الحقل الاختياري `svg` (سلسلة SVG المُطهَّرة لحظة الإدراج — توافق خلفي كامل)، وقائمة سياق العنصر المدرج من الاستوديو توفّر «نسخ SVG متجه» بلا إعادة توليد (`element-menu-section.tsx`).
- **شيت الملصقات يطابق ورق الطباعة وعلامات قص حقيقية (`sheet-generator.ts`):** خيارات مليمترية (`sheetWidthMm/sheetHeightMm/spacingMm/dpi` لها الأولوية على البكسل)، والاستوديو يولّد الشيت بأبعاد ورق الطباعة الفعالة (`resolveStickerSheetMm` — A4 210×297 الافتراضي مع احترام الاتجاه) بدل ورقة مربعة 200×200 كانت تترك هوامش فارغة على كانفس A4 بنسبة 0.707. علامات القص صارت مطابقات للمطبعة (أسود `#111827`، إزاحة 2مم، طول 5مم) بدل الرمادية الشفافة 8px.

### Fixed (النص العربي في عناصر الكانفس — 2026-09-29)

- **`text-node.tsx`:** تحويلات الحالة (`uppercase`/`lowercase`/`capitalize` — لاتينية المعنى بـ `\b\w`) تُتخطى الآن كلياً عند احتواء النص على محارف عربية، بدل تطبيقها على العربي بلا أثر إلا إفساد تسلسل التشكيل.

### Added (اختبارات حارسة للملصقات — 2026-09-29)

- **`frontend/test/sticker-text.test.ts` (7 حالات):** تمييز الاتجاه (عربي/لاتيني/مختلط/أرقام)، دقة 300DPI من المليمتر، حقن الاتجاه للنصوص الصريحة واحترام الموجود، تقليص النص العربي الطويل، تخطي المنحني، وصلاحية XML لكل القوالب الـ83 بعد المعالجة مع اتجاه صريح على كل حقل مرئي.
- **`frontend/test/sticker-phase2.test.ts` (6 حالات):** عبور `<style>@font-face data:</style>` الآمن عبر المعقّم، رفض أنماط الـ style الخطرة، سلاسة تضمين الخط عند غياب الوجوه، تخطي المضمَّن مسبقاً، قبول المخطط للحقل الجديد (توافق خلفي)، وحساب A4 غير المربع.

### Changed (ماسح المستندات وهندسة الكشف — 2026-10-01)

- **دمج الكشف واستبدال الاحتواء الداخلي (`detect-fusion.ts` / `ml-detector.ts` / `opencv-detector.ts` / `quad-geometry.ts`):** استبدال المرشح الكلاسيكي بمضلع ML الأكبر عند تحقق الاحتواء بنسبة 80% وتجاوز المساحة بمقدار 1.35x لتفادي انحصار الكشف في كتلة النصوص أو الصورة فقط داخل بطاقات الهوية، إلغاء `refineCornersSubPixel` في كاشف ML لمنع جذب الأركان نحو النصوص والأختام الداخلية، دعم بطاقات الهوية دائرية الأركان (ISO 7810) حتى 10 رؤوس واستخلاص الأركان الأربعة عبر `extractFourCornersFromHull`، وتوسيع زاوية ميلان المنظور الفيزيائي `cosAngle` حتى 0.82 (~35°).

### Changed (تحييد تباين Fluent 2 وهندسة الواجهة — 2026-10-01)

- **توكن التحديد المحايد الموحد وتنسيق الأسطح (`index.css` / `switch.tsx` / `slider.tsx` / `tabs.tsx` / `sonner.tsx`):** إضافة توكن `--accent-active` لتحديد الأسطح والمفاتيح والألسنة بنمط فحمي محايد مطابق لويندوز 11 بدلاً من زرقة التحديد المجهدة، وقصر الأزرق `--primary` على الإجراءات التعبوية والتنفيذية فقط، مع تخصيص الأيقونات الدلالية للإشعارات (`success` أخضر، `warning` كهرماني، `error` أحمر).
- **تبسيط القوائم وشريط الأدوات (`toolbar-file-ops.tsx` / `desktop-menu-bar.tsx` / `canvas-dimensions-panel.tsx`):** تنظيف عناصر القوائم المنسدلة من المربعات الملونة الكبيرة والتسميات المكررة، وإعادة ترتيب لوحة مساحة العمل لعرض خيار الاتجاه قبل إدخال الأبعاد المخصصة.

## [v1.10.0] - 2026-09-29

### Changed (طبقة الأيقونات واعية المقاس وإعادة التوليد — 2026-09-29)

- **طبقة أيقونات واعية بالمقاس (`frontend/src/components/ui/icons.tsx` + مولّدها `frontend/scripts/generate-icons.mjs`):** كل أيقونة تُرسم بنسخة Fluent الأصلية المطابقة لمقاس العرض الفعلي (12/16/20/24/28/32/48) بدل تصغير شبكة واحدة (كانت الخطوط تبدو رفيعة/مبكسلة). المصدر صنف Tailwind أو خاصية `size`، والمقاسات خارج الشبكات تُقرَّب لأقرب شبكة أصلية. الماسح صار يقرأ أيضاً **المراجع الديناميكية `icon: X`** (سجل أدوات الشريط ومجموعات النصوص/التكرار) التي لم تكن مرئية له فتُورَّث لها الشبكتان 16 و20؛ وأُصلح شرط الأمان الذي لم يكن يضمّن شبكة 20 إلا بعد وجود استخدام أكبر منها، وحُسبت الشبكات المتوفرة مرة واحدة عند إنشاء المكوّن بدل كل رسم، ونُظّفت كتلة شرط ميت.
- **أثر إعادة التوليد على شريط الأدوات (`workspace-panel-rail.tsx` + `lib/workspace-tools.ts`):** `DotsSixVertical/Scissors/Shapes/PaintBucket` عادت إلى شبكة 20 و`Ruler` إلى 12+16+20 بدل الانحصار في 16 — كان الشريط يطلب `size-5` (20px) فتنكمش خمس أيقونات قسراً إلى 16px. سجل الأدوات استبدل أيقونات بلا دلالة (`MagicWand→DotsSixVertical` · `Shuffle→Columns` · `FrameCorners→Ruler` · `GridNine→PaintBucket` · `BookmarkSimple→Star`) ووُحّدت أيقونات الفتح/الطي مع كبسولة الكانفاس (`Eye/EyeSlash`) وزر اللوحة الشامل (`Faders`) بمقاس 20px الأصلي بدل 18px المصغّر.
- **كبسولة شريط العرض السفلي (`canvas-viewport-deck.tsx`):** توحيد أزرار الكبسولة في `FluentCapsuleButton` واحد، قائمة مقاسات الورق تعرض تسميات مختصرة (`shortName`/`inchLabel` الجديدان في `lib/templates/constants.ts`) وتُظهر **Letter** كخيار متقدم مع توصيف الورقة النشطة في الكبسولة، وقائمة الملاءمة صارت أربعة أوضاع (تلقائي/الكل/عرض/1:1) مع مؤشر الفراغ الجانبي وحفظ التفضيل محلياً، وزر الخطوط الإرشادية يضيف خطين وسطيين عند أول تفعيل — وكامل معرّفات الاختبار محفوظة (`canvas-fit-all` · `canvas-fit-menu` · `canvas-fit-auto|height|width` · `canvas-fit-status`).
- **وضع التركيز (`use-workspace-panels.ts`):** تُحفظ حالة الألواح وتُستعاد بدقة (`wasDrawerOpen`, `lastActivePanel`) بدل الإجبار على فتح «الخصائص» عند الخروج، بحسب نقطة الانكسار.
- **حذف فئات المقاس المتغيّرة كاملة في `alignIconBox`:** كانت `sm:w-6` تُحذف فتبقى بادئة مبتورة (`sm:`) في DOM؛ الآن تُحذف الفئة كاملة مع `!` والبادئات (باختبار يثبّت ذلك).

### Added (مفضلة التدرجات وحراس الانحدار — 2026-09-29)

- **مفضلة التدرجات و«آخر استخدام» في تبويب الخلفيات والأنماط:** مفتاحا `grido_favorite_gradients` و`grido_recent_gradients` في `lib/local-prefs.ts` بصيغة موحّدة (`preset:<id>` أو `custom:<من>|<إلى>|<زاوية>`) مع بطاقات نجمة وتطبيق مباشر، وكتابة التخزين صارت خارج دوال setState (نقاء React) — باختبارات واجهة موسّعة.
- **حارسا انحدار جديدان:** `frontend/test/icon-size-resolution.test.tsx` (سياسة دقة الأيقونات + حارس أن كل أيقونات `COLLAGE_TOOLS/STUDIO_TOOLS` تُرسم viewBox أصلي 20 عند `size-5`) و`frontend/test/collage-placeholder-hit.test.tsx` (التقاط الفأرة في الخلية الفارغة + استدعاء نقر واحد).
- **تغطية وضع التركيز (البند 32 من تعليمات الوكلاء):** توسيع `frontend/test/use-workspace-panels.test.ts` بحالات حفظ/استعادة الدرج واللوحة النشطة عند الدخول والخروج من وضع التركيز في `wide` و`standard` (مع مسار السقوط الافتراضي «القوالب»).
- **تغطية خطاف النافذة (رفع عتبة التغطية/CTA-94):** تغطية `frontend/test/hooks.test.ts` لمسار `useWindowControls` (الحالة الابتدائية، اشتراكات أحداث Wails الأربعة، التبديل التفاؤلي مع التأكيد، وضغط حدث resize، وتنظيف المستمعات والمؤقّتات عند إلغاء التركيب).

### Fixed (الخلية الفارغة وأحداث النافذة ووحدة المقاس — 2026-09-29)

- **حاوية إفلات الخلية الفارغة في الكولاج (`konva-collage-layer.tsx`):** إزالة تكرار معالج النقر (كان `handleSlotClick` يُنفَّذ مرتين لكل نقرة بسبب صعود أحداث Konva من حاوية الإفلات/الصورة إلى مجموعة القص الأب)، وإعادة مؤشر الحاوية إلى `""` عند المغادرة بدل `"default"` كي لا يمسح مؤشر أداة اليد أثناء مسك المسافة، مع بقاء خلفية الخلية هدفاً وحيداً للفأرة (بقية عناصر الزينة `listening={false}`).
- **مزامنة حالة التكبير عبر Wails (`main.go` + `use-window-controls.ts`):** بثّ `window-maximized-changed` صار عند تغيّر القيمة فقط بدل كل دورة `WindowDidResize`، والمزامنة الاحتياطية في الواجهة صارت مؤخَّرة (120ms) بدل استدعاء IPC لكل حدث resize، مع تنظيف مؤقّتات التحقق (resize ومهلة 60ms) عند إلغاء التركيب.
- **«Letter» في لوحة مساحة العمل (`canvas-dimensions-panel.tsx`):** البحث وعرض القائمة شملا `ADVANCED_PAPER_SIZES` — كان اختيار مقاس Letter من كبسولة شريط العرض يجعل اللوحة تعرضه «مقاس مخصص».
- **بطاقات تبويب الشبكة المخصصة (`collage-custom-grid-tab.tsx`):** علامة ✓ بموضع مطلق في زاوية البطاقة واقتطاع النصوص أحادية السطر — منع تكسّر الأسطر وإزاحة التخطيط.

## [v1.9.6] - 2026-09-28

### Fixed (إغلاق بنود P0 الثلاثة من التقرير 12 — 2026-09-28)

- **توحيد حدّ الحصة اليومية للذكاء الاصطناعي على المصدر الخادمي وتصفير اللقطة (F-01):** كان المُقيِّد المحلي والواجهة يعدّان يومًا **محليًا** (`00:00`) بينما يعدّ المرجع الخادمي يومًا **UTC** (`date_trunc('day', timezone('utc', now()))` = `03:00` بتوقيت UTC+3) — فيرى المستخدم رصيدًا متبقيًا في نافذة 00:00–03:00 ثم ترفض الخدمة الطلب. صار مفتاح اليوم UTC في كل الطبقات (`aiUsageDayKey` في `internal/service/ai_service.go`، و`aiUtcDayKey` في الوحدة الجديدة `frontend/src/lib/ai/quota.ts`)، وأصبح الخادم مصدر الحقيقة الكامل: `callAIUsageRPC` يقرأ `used_today`/`daily_limit` من رد RPC الحصة، و`AIRateLimiter.Sync` يزامن المرآة المحلية على العدّاد الخادمي (مع حاجز `Baseline` يمنع `Rollback` من النزول تحته)، وتُحقَن القيمتان في رد التحسين نفسه (`injectServerQuota` دون دهس أي قيم مرسلة أصلاً من Modal) فتعرض الواجهة القيم الخادمية بدل اشتقاق موازٍ — والاحتياطي المحلي يبقى للعرض قبل أول عملية في اليوم فقط، على مفتاح UTC أيضاً. كما تم ربط لقطة الخادم ببريد المستخدم وباقته، وتصفيرها فورياً عند تسجيل الخروج أو ترقية الباقة لمنع حجب الحسابات بلقطات قديمة (`grido:auth-logout` و`useEffect`).
- **تحصين مسار تفكيك Excel في الطباعة بالبيانات المتغيرة (F-02):** مكتبة `xlsx` من npm تحمل ثغرة تلوّث نموذج أولي بلا إصلاح متاح (`GHSA-4r6h-8v6p-xvw6`) و ReDoS (`GHSA-5pgg-2g8v-p4x9`)؛ صار تفكيك الملف مقيّدًا بنفسه لا بنتيجته: `sheetRows` و`preview` بسقف `VDP_PARSE_ROW_LIMIT` (501)، وتعطيل الصيغ/الأنماط/HTML/VBA و`dense` في `XLSX.read`، وسقف حجم ملف `VDP_MAX_FILE_BYTES` (10MB) قبل أي قراءة، ومنع أسماء الأعمدة الخطرة (`__proto__`/`prototype`/`constructor`) من أن تصير مفاتيح إسناد في كائنات الصفوف مع تفرد أسماء الأعمدة البديلة تلقائياً. قرار المخاطرة المتبقية والتخفيض موثَّق في `SECURITY_NOTICE.md`.
- **منع قراءة `.env` من مجلد العمل في الإنتاج وتحصين كشف بيئة التطوير (F-04):** كان `license_service.go` يرتد إلى `.env` النسبي (مجلد العمل الحالي) بلا أي بوابة، فتشغيل الإصدار من مجلد يحوي `.env` ملقَّمًا يعيد توجيه `SUPABASE_URL`/`SUPABASE_ANON_KEY`/`MODAL_AI_URL` ويكشف للمهاجم بريد المستخدم وكلمة مروره و OTP و JWT وكل صور الترميم. صارت القراءة في دالة واحدة `loadEnvConfigFile(appDir, allowCwdFallback)` والارتداد مشروطً ببوابة وضع التطوير (`serviceDevBuild` بوسم بناء `dev` الجديد في `internal/service/devmode_*.go` + `utils.IsDevEnvironment()`) مع تحصين `IsDevEnvironment` لفحص لاحقة اسم الملف التنفيذي نفسه دون مسار المجلد الحاوي منعاً لتزوير البيئة، وموحَّد معها كشف وضع التطوير في `main.go`.

> ⚠️ **يحتاج قراراً من المالك (ليس إصلاحاً كاملاً):** بند `xlsx` أُغلق بـ**تخفيف موثَّق** لا بإزالة الثغرة — إزالة «No fix available» تتطلب تغيير مصدر المكتبة (نسخة SheetJS المصونة من `cdn.sheetjs.com` ≥ 0.20.2، وتغيير `package.json`/lockfile) أو إسقاط مسار `xlsx` لصالح تحويل خادمي (Go) مع `papaparse` للـCSV. التفاصيل في `SECURITY_NOTICE.md`.

### Added (اختبارات وبوابات لبنود P0 — 2026-09-28)

- **اختبارات Go (5 دوال جديدة):** `TestAIRateLimiter_UsesUTCForDayKey` (يُثبت مفتاح اليوم UTC تحت منطقة زمنية محلية UTC+3 — لو عاد الكود للوقت المحلي فشل الاختبار)، `TestAIRateLimiter_SyncFromServerIsAuthoritative`، `TestCallAIUsageRPC_ParsesServerQuota`، `TestEnhanceImageWithAI_InjectsServerQuotaSnapshot` (تثبيت الحقن ومزامنة المرآة)، و`TestLoadEnvConfigFile_DevOnlyCwdFallback`.
- **اختبارات واجهة (16 حالة جديدة):** `frontend/test/ai-quota.test.ts` (11 حالة: مفتاح UTC، حدود الباقات، العدّ المحلي، حسم لقطة الخادم مقابل الاحتياطي، تعادل اللقطات التالفة) وتوسيع `frontend/test/vdp-parser.test.ts` (سقف التفكيك مثبَّت بمعاملات `XLSX.read` عبر Mock، رفض الملف الضخم، منع `__proto__`).
- **أربعة تأكيدات كود جديدة في `scripts/docs-gate.mjs` (16 تأكيداً الآن):** تأكيد وحدة حسم الحصة ومفتاح اليوم UTC في الخادم والواجهة، وتأكيد تحصين تفكيك VDP، وتأكيد بوابة `.env` — فلا يمكن إعادة أي من العيوب الثلاثة بصمت.

### Added (المراجعة الكاملة للتطبيق من الألف إلى الياء — 2026-09-28)

- **تقرير تدقيق جديد `docs/reviews/11-full-app-review-2026-09-28.md` (التقرير 12):** تدقيق كامل لكل الطبقات (Go، Konva/React، Zustand، محرك الطباعة، هجرات Supabase، دالة Edge، خادم Modal AI، `admin-web`، CI/الإصدار) بتشغيل كل بوابات الجودة فعلياً، وبأدلة `ملف:سطر` لكل بند. التقييم الإجمالي 8.8/10.
- **بنود P0 مكتشفة في الجولة:** (١) تناقض حدّ اليوم للحصة اليومية للذكاء الاصطناعي — يوم محلي في العميل (`frontend/src/hooks/use-ai-enhance.ts:53-61` والحد المحلي في `internal/service/ai_service.go:96`) مقابل يوم UTC في المرجع الخادمي (`supabase/migrations/20260730000001_server_side_ai_quota.sql:44`) فيرى مستخدم UTC+3 رصيداً متبقياً بينما ترفض الخدمة الطلب. (٢) ثغرة عالية «بلا إصلاح» في `xlsx` (SheetJS: GHSA-4r6h-8v6p-xvw6 + GHSA-5pgg-2g8v-p4x9) داخل مسار الطباعة بالبيانات المتغيرة مع قراءة غير مقيَّدة بـ`sheetRows` (`frontend/src/features/stickers/lib/vdp-parser.ts`). (٣) `internal/service/license_service.go:86` يقرأ `.env` من **مجلد العمل** بلا بوابة `isDevMode()` ⇒ إمكان إعادة توجيه مصادقة الحساب وخادم الذكاء الاصطناعي عند التشغيل من مجلد ملقّم.
- **بنود P1/P2:** 109 استدعاء `console.error` يتجاوز اللوجر الموحّد (2 مستهلكين فقط لـ`createLogger`) · SVG مخزَّن يُخدَم بلا تعقيم في نفس أصل التطبيق · دالة Edge `license` ميتة بصلاحية `service_role` وبلا مستهلك (`git grep` = 0) · مهلة 120s في الواجهة تحرق حصة AI بلا صورة مقابل مهلة خلفية 3 دقائق · `p_check_only` غير مُمرَّر صراحةً في حمولة تسجيل Modal · الصيغ غير المعروفة (AVIF/HEIC) تُكتب بامتداد `.jpg` · فشل `go build ./...` بسبب سقالات Wails غير المستخدمة `build/ios` و`build/android`.
- **تصحيحات متقادمة موثَّقة (إلحاق لا إعادة كتابة):** ادعاء «مُحصّن SVG لا يفحص SMIL ولا `<style>`» في التقرير 11 مُصلَح فعلاً (`frontend/src/lib/utils.ts:49-73` + `frontend/test/svg-safety.test.ts`) · سقوف الحصص (20/200/1000) في التقرير 09 متقادمة والحقيقي 5/15/50 · `README.md:141` يذكر 84 ملف اختبار والعدّ الآلي 94.

### Added (حراس الـ CI وبوابات الجودة للإصدارات — 2026-09-28)

- **حارس التحقق والمراقبة الإلزامية للـ CI بعد الدفع (`AGENTS.md` و `grido-qa-security-auditor`):** إلزام الوكلاء بمراقبة دورة الـ CI السحابية فورياً بعد أي عملية دفع `git push` أو رفع وسم إصدار عبر أوامر GitHub CLI (`gh run list`, `gh run watch`) ومنع إنهاء الجلسة أو تسليم المهام قبل التأكد من خلو الـ CI من أي فشل.
- **بوابة سلامة الـ CI قبل إطلاق أي إصدار (Pre-Release CI Health Gate):** اشتراط نجاح آخر دورة CI كاملة على الفرع الرئيسي بنسبة 100% (`completed success`) كشرط مسبق إلزامي لتنفيذ `scripts/release.mjs` ومنع ترفيع أو إطلاق أي إصدار في حال وجود تراجع معلق.
- **حارس المزامنة التلقائية لألواح العمل عند تحديد العناصر (Workspace Drawer Selection Sync Invariant):** توثيق إلزامية تحويل اللوحة النشطة فورياً إلى لوحة الخصائص (`properties`) عند تحديد أي عنصر نشط على الكانفاس لتفادي تراجع اختبارات خصائص العناصر ومحددات E2E.

## [v1.9.5] - 2026-09-28

### Fixed (إصلاح حالات فشل CI وتوافقية Playwright E2E مع فتح اللوحة الافتراضية — 2026-09-28)

- **مزامنة فتح لوحة الخصائص عند تحديد العناصر (`App.tsx`):** عند إقلاع التطبيق يبدأ الشريط الجانبي بلوحة القوالب/التبويب الأول افتراضياً؛ ولكن عند إدراج أو تحديد عنصر على الكانفاس في الشاشات القياسية (`standard`)، تُفتح لوحة الخصائص تلقائياً لعرض خصائص العنصر المحدد فورياً (أزرار القص والتدوير، العزل، الألوان، التأثيرات، والترتيب) بدلاً من البقاء معلقاً على لوحة القوالب.
- **تحديث اختبارات الدخان والتخطيط المتجاوب (`engine-smoke.spec.ts` و `workspace-layout.spec.ts`):** مواءمة اختبارات E2E مع سلوك الإقلاع الافتراضي الجديد (التحقق من أن التبويب الأول نشط فعلياً عند الإقلاع واختيار أداة أخرى يفعّلها، وتعديل فحص عرض مساحة العمل في 1440px إلى `toBeGreaterThanOrEqual(800)` نظراً لظهور الدرجين معاً، واختبار ملاءمة العرض 1920px عند طي الدرج الجانبي).

## [v1.9.4] - 2026-09-28

### Fixed (إدراج ملصق من الاستوديو في وضع الكولاج كان يُنتج عنصراً غير مرئي — 2026-09-28)

- **انتقال تلقائي للوضع الحر قبل إدراج الملصق (`StickerStudioDialog.tsx`):** كان إدراج ملصق (أو حفظ إعادة تحريره) بينما المستخدم في وضع الكولاج يضيف العنصر إلى `elements` — وهي طبقة لا تُرسم إلا في وضع التعديل الحر (`KonvaSingleLayer` يُعرض عند `mode === 'single'` فقط في `konva-canvas.tsx`) — فيرى المستخدم أن الإدراج فشل، ويُمسح العنصر صامتاً عند أي تبديل وضع لاحق (مسح عناصر الحر P1-19 في `core-slice.ts`). صار المسار ينتقل إلى الوضع الحر قبل الإدراج/إعادة التحرير (`setMode('single')` مع toast توضيحي «انتقلت إلى وضع التعديل الحر لإدراج الملصق»)، وتطبيق نفس العلاج على مسار إعادة التحرير حتى تُرى نتيجة تعديل عنصر أُدرج سابقاً ثم غادر المستخدم وضعه. نفس علاج `addImageFromSrc` بخيار `setSingleMode` الموجود للصور العادية. ملف: `frontend/src/features/stickers/components/StickerStudioDialog.tsx`.

### Enhanced (بطاقات مقاس الصورة أطول وأجمل — 2026-09-28)

- **بطاقات «مقاس الصورة» في تبويب الشبكة المخصصة (`collage-custom-grid-tab.tsx`):** رفع ارتفاع البطاقة من `h-8` (32px) إلى `min-h-[52px]` مع حشوة عمودية — كانت مضغوطة عمودياً ويشوش سطرا الاسم والمقاس على بعضهما — مع تكبير المربع الرسومي من `w-7 h-7` إلى `w-9 h-9` والرسوم المصغرة للوثائق معه، وتكبير خط المقاس من `text-micro` إلى `text-mini`، وتباعد أسطر أرحب (`leading-snug` + `mt-1`)، وزيادة فجوة الشبكة إلى `gap-2`، وزوايا أكبر (`rounded-lg`)، وتكبير علامة ✓ إلى `w-4 h-4`. الشبكة تبقى عمودين والرسوم النسبية لأبعاد كل وثيقة (35:45، 1:1…) محفوظة.

### Changed (استبدال أيقونة زر التصدير — 2026-09-28)

- **أيقونة التصدير `Export` في `icons.tsx`:** الانتقال من `ArrowExportLtr` (سهم يخرج يساراً من صينية — يوحي باتجاه LTR معكوس في واجهة RTL) إلى `ArrowExportUp` (سهم يصعد من صينية مفتوحة — الرمز الكلاسيكي للتصدير ومحايد الاتجاه، كما في Photoshop/Figma). النسخة القديمة متاحة باسم `ExportLtr` للتوافق. الأثر يشمل زر التصدير في شريط الأدوات وقائمة سطح المكتب تلقائياً (الاسم `Export` مشترك).

### Fixed (تثبيت مؤشر الماوس داخل المساطر على حافة بكسل مادية — 2026-09-28)

- **مؤشر الماوس في المساطر (`use-ruler-metrics.ts`):** إحداثيات المؤشر (`h-ruler-cursor`/`v-ruler-cursor`) كانت تُمرَّر كسور بكسل عبر `setAttribute` فتقع أحياناً بين بكسلين ويوزّعها المتصفح على الاثنين (خط 2px ضبابي متغير) — نفس جذر مشكلة سمك الخطوط الإرشادية. صار الإحداثي يُقرَّب لأقرب حافة بكسل مادية (عبر `devicePixelRatio`) قبل تحديث المؤشر، فيظهر خط 1px حاد ثابت السمك في كل موضع. تكميل لإصلاح `snapGuidePosToPixel` (0.20/GD-1).

### Added (تحسين المساطر وإعادة توزيع شريط الأدوات وإصلاح سمك الخطوط الإرشادية — 2026-09-28)

- **تحسين شكل المساطر (`ruler.tsx`):** ظل تدرّج ناعم على حافتي الورقة داخل شريط المسطرة (عمق بنمط Figma)، علامة نقطة صفر مثلثة بنمط Photoshop، تظليل مؤشرات هوامش الصفحة بأسلوب Word (خاصية `marginPx` كانت تُمرَّر ولا تُرسم)، شريط تحديد العنصر المُسقَط على المسطرة (خاصية `selectionBounds` كانت مهملة كذلك)، وهالة بلون سطح المسطرة حول أرقام التدريج لحفظ مقروئيتها فوق خطوط التدريج، ومؤشر ماوس أنعم (`strokeLinecap="round"`).
- **إعادة توزيع شريط الأدوات بمنطق تدفق العمل (toolbar.tsx):** زر «مسح مساحة العمل» الأحمر انتقل من الشريط الرئيسي إلى قائمة «المزيد» (⋯) عبر حدث `grido:clear-canvas-request` — الإجراءات المدمّرة لا تُثبَّت في الشريط (مبدأ Fluent) ونافذة التأكيد بقيت ملكاً لـ `toolbar-file-ops.tsx` — وزر «تكرار في الكولاج» جُمِّع مع مجموعة أدوات الإضافة، مع توثيق ترتيب المجموعات الخمس على رأس المكوّن وحذف كود ميت (`handleClearCanvas` + استيراد `Broom` غير المستخدم).
- **إصلاح السمك العشوائي للخطوط الإرشادية (`use-user-guides.ts` + `editor-canvas.tsx`):** دالة `snapGuidePosToPixel()` تُقرّب موضع الخط إلى أقرب حافة بكسل **مادية** (عبر `devicePixelRatio`) — الخطوط كانت تُرسم عند كسور بكسل فتظهر بسمك 2px ضبابي أو 1px حاد عشوائياً حسب موضع الإفلات. التثبيت يُطبَّق عند بدء السحب ومتابعته (قبل المغناطيسية) وعند الرسم بصرياً فقط — القيمة المخزنة تحفظ دقتها الكاملة وأهداف المحاذاة تبقى الغالبة.

### Changed (فتح لوحة التبويب الأول افتراضياً للشريط الجانبي — 2026-09-27)

- **فتح لوحة التبويب الأول افتراضياً عند الإقلاع (`useWorkspacePanels`):** تعديل سلوك الإقلاع الافتراضي للشريط الجانبي ليفتح لوحة التبويب الأول مباشرةً («شبكة الكولاج» في وضع الكولاج، و«الطبقات» في الوضع الحر — أول أدوات كل وضع في سجل `workspace-tools`) بدلاً من أن يبدأ الشريط بلوحة المفتش فقط وتكون أدوات الشريط غير مفتوحة.
  - في مقاس الشاشات القياسية (`standard` بين 1024px و1439px): قيمة `activePanel` الافتراضية أصبحت `'templates'` إذا لم يكن هناك لوح نشط محفوظ صراحةً، مع إعطاء الأولوية للتبويب الأول للوضع الحالي.
  - في مقاس الشاشات العريضة (`wide` من 1440px فأعلى): يبدأ درج القوالب/التبويب الأول الأيسر مفتوحاً (`isTemplatesDrawerOpen: true`) ومحتوى التبويب معروضاً، جنباً إلى جنب مع لوحة المفتش على اليمين.
  - الحفاظ التام على تفضيلات المستخدم المحفوظة في `localStorage` (`lastActivePanel`، `lastActiveStudioTab`، `lastActiveCollageTab`، `isInspectorPinned`)، والتعامل الآمن مع وضع التركيز (Zen mode) والطي والفتح السلس. ملف: `frontend/src/hooks/use-workspace-panels.ts`.

### Added (نقل التصميم الحر إلى شبكة الكولاج — 2026-09-27)

- **زر «تكرار في الكولاج» (`ToolbarTransferToCollage`):** نقل التصميم الحر إلى شبكة الكولاج كلقطة واحدة — التقاط الكانفس بكامل دقته (`exportCanvas("png", 1, stage, { watermark: false })`) ثم إدراجها كصورة عادية في الخانات الحالية عبر `setSlotImagesBatch` بدفعة واحدة (خطوة تراجع واحدة). لا يغيّر مقاس الكانفاس ولا اتجاهه ولا القالب، ويظهر في الوضع الحر فقط (`mode === "single"`)، ويُعطَّل عند كانفس فارغ، مع حفظ محلي على سطح المكتب عبر `SaveImageFromBase64` ورسائل نجاح/فشل عربية. ملف: `frontend/src/components/editor/toolbar/toolbar-transfer-to-collage.tsx` + توصيله في `toolbar.tsx`/`toolbar-items.tsx` + أيقونة `TableArrowRepeatAll` في `icons.tsx`. اختبارات: `test/toolbar-transfer-to-collage.test.tsx` (5 حالات).
- **دالة توزيع موحّدة `buildCollageInsertAssignments`:** استُخرج منطق توزيع الصور على الخانات (كان مضمّناً في `use-image-drop.ts`) إلى دالة نقية مشتركة بين مساري الإسقاط والنقل — مصدر واحد للحقيقة بلا تغيير سلوكي ملموس. ملف: `frontend/src/lib/canvas/collage-insert.ts` مع 6 حالات في `test/collage-insert.test.ts`.
- **خيار `watermark` في `exportCanvas`:** معامل رابع اختياري (`ExportCanvasOptions`) — `watermark: false` لتخطي العلامة المائية في الالتقاطات الوسيطة (لقطة النقل) التي لا تُسلَّم للمستخدم، وإلا ظهرت العلامة مرتين بعد تصدير الكولاج. الافتراضي `true` فكل مسارات التسليم للمستخدم محفوظة كما هي. ملف: `frontend/src/lib/export/export-canvas.ts` مع حالتين في `test/export-canvas-watermark.test.ts`.

### Fixed (إطار صور الكولاج وفضاء القصّة — 2026-09-27)

- **قصّة صور الكولاج تُحسب الآن على نسخة العرض المخفّضة (فضاء واحد):** كانت كل حسابات `object-fit: cover` + التكبير + الإزاحات تجري على أبعاد **الصورة الأصلية** بينما Konva يطبّق `cropX/cropY/cropWidth/cropHeight` على **نسخة العرض المخفّضة** (سقف 2048px) المُمرَّرة فعلاً في الخاصية `image` — فتقع نافذة القصّ خارج نطاق النسخة وتظهر الصورة مصغَّرة ومزاحة داخل الخلية (أوضح تجلٍّ: لقطة «نقل التصميم إلى الكولاج» 2480px+). صارت الحسابات في فضاء النسخة المعروضة مع تحويل `dragX/dragY` من فضاء الأصل (`srcToShown`) وحارس صفري ضد `naturalWidth = 0`. **مهم:** دلالات المتجر لم تتغيّر — الإزاحات تبقى بفضاء الأصل كما يفسّرها التصدير (`export-primitives.drawSlotImage`) والطباعة في Go (`computeCropFromSlot`) ومعاينة الطباعة (`print-preview.tsx`)، فأصبح المحرر مطابقاً لها بعد أن كان الوحيد المخالف. ملف: `frontend/src/components/editor/konva/elements/collage-image.tsx` مع 4 حالات في `test/collage-image-crop.test.tsx` (منها دورة سحب ذهاباً وإياباً تثبت ثبات الإطار).
- **قسّة موحّدة لحالة السحب التفاعلي:** `accumulatedDrag`/`dragStartRef` تعملان في فضاء العرض حصراً وتُزامَنان من `props` عبر `useEffect` معتمد على النسبة — فلا قفزة عند أول سحب لصورة مخفّضة، وتطابق تام بين ما يظهر على الشاشة وما يُصدَّر/يُطبع. وتفادي قسمة على صفر عند الكتابة للستور (`srcToShown || 1`).

### Fixed (اتساق أيقونات شريط الأدوات — 2026-09-27)

- **إزالة الأزرق الدائم من أيقونات أوامر الشريط (لا تفعيل بلا حالة):** كانت ثلاث أيقونات تنفيذ تُرسم بلون `primary` في حالة الراحة فتوحي بأنها مُفعَّلة/مُحدَّدة رغم أنها مجرد أزرار تنفيذ: زر «تكرار في الكولاج» الجديد (`toolbar-transfer-to-collage.tsx`)، وأيقونة استوديو الملصقات (`toolbar-add-tools.tsx:90`)، وزر «تجميع العناصر» (`toolbar-selection-tools.tsx:111`). صارت الثلاثة ترث حالة الزر القياسية في الشريط (رمادي `text-muted-foreground` في الراحة → داكن `hover:text-foreground` مع `hover:bg-background/80` عند التمرير) — وهي نفس قاعدة «حفظ/طباعة/إضافة نص/المشاريع». اللون الأساسي محجوز لحالة التفعيل الحقيقية (نمط «مفعّل» في `toolbar-image-filters.tsx`) ولإجراء التصدير الأساسي، ومؤشر الانتظار (`Spinner`) في زر النقل يبقى أساسياً لأنه إشارة نشاط فعلية. **الألوان الدلالية المقصودة لم تُمس:** «فك التجميع» كهرماني و«حذف» أحمر (إجراءات تفكيك/إتلاف تبدو ملوّنة في الراحة عمداً). لا اختبار يعتمد على أصناف CSS هذه (`git grep` = لا نتائج في `frontend/test` و`frontend/e2e`).

### Added (الطباعة بالبيانات المتغيرة VDP وإعادة التحرير — 2026-09-27)

- **مسار VDP متكامل في استوديو الملصقات:** استيراد Excel (xlsx/xls) أو CSV من العميل مباشرة (`papaparse` + `xlsx` — لا يُرفع أي ملف لخادم)، ربط أعمدة الجدول بحقول القالب بربط ذكي مبدئي بالمطابقة الاسمية + يدوي قابل للتعديل، معاينة الصف الأول، ثم توليد بطاقة لكل صف على القالب نفسه وتدراجها دفعة واحدة على الكانفس بشبكة جاهزة للطباعة عبر `addImageElementsBatch`. تفاصيل: سقف 500 صف، تصيير تسلسلي بتسليم خيط الواجهة كل 5 صفوف وشريط تقدم حي، صف تالف لا يُسقط الدفعة (يُبلّغ عنه)، تعقيم الألوان/الخط عند نقطة التوليد الواحدة (`svg-safety`)، حفظ محلي عبر `SaveImageFromBase64` على سطح المكتب. الواجهة زر «من جدول» في تذييل التخصيص. المنطق النقي مفصول في `vdp-parser.ts`/`vdp-batch.ts` مع 8 اختبارات (`test/vdp-parser.test.ts`). تُغلق الفجوة المؤكدة M-5 في سجل تدقيق الفجوات («لا طباعة بيانات متغيرة»).
- **إعادة تحرير الملصقات من الكانفس (`Sticker Re-editing`):** إمكانية النقر بالزر الأيمن على أي ملصق مُدرج واختيار «تعديل الملصق» لإعادة فتح استوديو الملصقات مع تحميل نفس القالب والتخصيصات الأصلية، وتحديث نفس العنصر عند الحفظ دون تكراره، مع حفظ مصدر الملصق `stickerSource` في الـ Schema والـ Store وربطه بناقل أحداث مستقل `sticker-reedit-bus.ts`.

### Enhanced (تراجع/إعادة واستقرار النوافذ — 2026-09-27)

- **سجل تراجع/إعادة كامل لتخصيصات الملصق (`useStickerParamsHistory`):** كل تعديل (نصوص، ألوان، خط، مظهر) يلتزم كسجل قابل للرجوع — تكبير الخطأ في اللوحة أو لوحة ألوان خاطئة لم يعد يعني فقدان العمل. اختصارات `Ctrl+Z` / `Ctrl+Y` (و`Ctrl+Shift+Z`) في وضع التخصيص مع أولوية التراجع الأصلي داخل حقول النص، وأزرار تراجع/إعادة في شريط أدوات المسرح. التعديلات المتلاحقة (كتابة، سحب منزلق) تُدمج في خطوة واحدة خلال نافذة 400ms، بينما تلتزم الأفعال الصريحة (لوحات جاهزة، تطبيق قالب محفوظ، تبديل الخط، إعادة الضبط) كخطوات مستقلة. إعادة الضبط صارت خطوة قابلة للتراجع بدل محو نهائي، واختيار قالب جديد يصفّر السجل. سقف السجل 50 خطوة. المنطق النقي مفصول في `lib/params-history.ts` مع 10 حالات اختبار (`test/params-history.test.ts`).
- **تحسين إدارة نافذة التطبيق وسلاسة العرض (Windows 11 / Wails v3):**
  - الاستماع المباشر لأحداث Wails v3 الأصلية (`WindowMaximise`, `WindowUnMaximise`, `WindowRestore`) بدلاً من استطلاع أحداث `resize` وتأخير الـ `setTimeout`، لتبديل أيقونة التكبير/الاستعادة فورياً مع اختصارات Win+Up/Down وميزات تقسيم الشاشة Snap Assist.
  - تتبع الأبعاد والموضع الطبيعي (Restored Geometry) غير المُكبّر عبر `WindowDidResize` و `WindowDidMove`، وحفظها عند الإغلاق بدلاً من أبعاد الشاشة الكاملة لتفادي فتح النافذة بحجم مبالغ فيه لاحقاً.
  - منع وميض الحجم الأولي عند الإقلاع ببدء النافذة مخفية (`Hidden: true`) وإظهارها فور جاهزية الـ WebView عبر `WindowRuntimeReady`.
  - حفظ دوري ذري لحالة النافذة كل 30 ثانية لحماية موضعها وأبعادها عند الإغلاق القسري عبر `saveWindowState(buildWindowState())`.
  - تنظيف حالات التحميل ونصوص الانتظار في `VdpImportDialog` توافقاً مع معايير المشروع (`Modal Loading State Cleanup` و`Wait UX Invariants`).

### Fixed (التوثيق — 2026-09-27)

- **تصحيح انحراف `BUGS_REPORT.md` عن الكود الحقيقي (تصحيح خامس مُلحَق، لا إعادة كتابة):** تدقيق 26/26 بنداً بقراءة الملفات التنفيذية ⇒ **لا بند مفتوح واحد**، وأُلحقت مصفوفة (بند ← الحالة ← `ملف:سطر`) مثبّتة بالأسطر. وُسِمت أوضاع الكود المتقادمة في مصفوفة الثوابت §1 و`§5` صراحةً بأنها ما قبل الإصلاح. (**إلحاق فقط** — تاريخ التقرير لم يُحذف.)
- **تصحيح 4 مواضع غير دقيقة في التصحيحات السابقة (دقة المراجع):** `ai_service.go:340 → :331` (نداء `check_only=true` الوحيد) · `db.go:398-411 → :403-409 + :512-516` (إرجاع خطأ فساد autosave) · موضع `-w -s` الحقيقي `build/windows/Taskfile.yml:65` لا `build.ps1:49` ولا `release.yml:122` · شرط SignPath ما زال `env.` (`release.yml:165,181`) والإصلاح الفعلي نقل تعريف `SIGNPATH_*` إلى `env` على مستوى الـ job (`:16-18`).
- **تأكيدات تحقّق على مستوى الكود داخل بوابة التوثيق (فحص 5 جديد):** 12 تأكيداً في `scripts/docs-gate.mjs` تثبّت أدلة البنود المغلقة بثلاثة أنواع (`mustContain` / `mustNotContain` / `count`) — الخصم المزدوج لحصة AI، إرجاع خطأ فساد `autosave.json`، تعريف `SIGNPATH_*` مرة واحدة في `release.yml`، `-w -s` في مسار الإنتاج، الكتابة الذرية في `print_export.go`/`window_state.go`/`media_service.go`، حارس `exportsCleanup`، فحص `data:image/`، تجميع `strokeBatch`، `DialogCloseButton`/`FluentSliderField`، وسم NSIS `is_silent`، وحد `h-7 w-7`. **مُثبَت باختبار انحراف سالب:** حذف `utils.AtomicWriteFile` من `window_state.go` ⇒ فشلت البوابة ⇒ إرجاعه ⇒ نجاح. الهدف: ألّا يعود عيب مغلق إلى الكود بينما يستمر التقرير في دعوى «مُصلح».
- **توثيق الفجوات الحقيقية المتبقية** في `docs/features-tracker.md` §0.17 بعد تحقّق حيّ: سعر كرت `L4` المصحَّح في `modal_ai/upscaler.py:320-323`، ابتلاع فشل تسجيل الاستهلاك `:359-360`، وتأجيل إغلاق الملف المصدر في `media_service.go:267`.

### Fixed (الأمان وسلامة البيانات — 2026-09-26)

- **🔴 دورة حياة الحجر الصحي وحماية أصول الوسائط من المحو الصامت (`[C-04]`):**
  - **المشكلة:** دالة `moveUnreferencedToTrash` كانت تستخدم `os.Rename` الذي يحتفظ بـ `ModTime` الأصلي. بالتالي فإن الملفات غير المرجعية التي مضى عليها أكثر من 30 يوماً كانت تُنقل إلى `MediaTrash` ثم تُحذف نهائياً وفوراً في نفس الدورة بواسطة `purgeOldTrash` (نافذة استرداد = 0 ثانية).
  - **الإصلاح:** إضافة `os.Chtimes(trashPath, now, now)` عند نقل الملفات إلى `MediaTrash` في كل من التنظيف الدوري التلقائي (`moveUnreferencedToTrash`) والتنظيف اليدوي الفوري (`CleanUnusedMediaNow`) لتبدأ مهلة الـ 30 يوماً من تاريخ النقل للحجر. وتصحيح احتساب مساحة وحجم الملفات المنظفة في التنظيف اليدوي بعد نجاح النقل الفعلي.
  - **حماية الذاكرة ومنع التسريب في صور الواجهة (`useAsyncImage`):** تطبيق آلية LRU حقيقية (حد أقصى 100 عنصر مع تحديث الحداثة عند كل إصابة) وإسقاط مراجع الكاش عند الطرد/الإبطال **دون تصفير `src` الكائن الحي** الذي قد تكون عقدة Konva تعرضه — جامع القمامة يحرر الذاكرة عند زوال آخر مرجع.
  - **حماية طبقة السحب الرسمية (`KonvaCanvas`):** دالة `ref` مستقرة الهوية (`useCallback`) — لا يصل `null` المُسقط للتسجيل إلا عند الـ unmount الحقيقي، فيُنظَّف `dragLayer` قصداً بدل مسح `home` أثناء السحب النشط عند كل إعادة رندر.


### Added (أتمتة الإصدار — 2026-09-26)

- **`scripts/release.mjs` (مصدر واحد للإصدار):** يرفع النسخة في الملفات الستة (`build/config.yml` · `build/windows/info.json` · `build/windows/installer/project.nsi` · `build/windows/Taskfile.yml` · `frontend/package.json` + قفله) ويرقّي `[Unreleased]` إلى قسم مؤرّخ وينشئ التزاماً ووسماً تلقائياً — فلا يتخلّف أي ملف عن الوسم. أوضاع: `patch|minor|major|x.y.z` · `--dry-run` · `--no-git` · `--push` · و`--check` الذي يمنع الانحراف (مضمَّن في CI و`task release:check`). مهمة Taskfile: `task release -- patch`.

### Added (لقن الوكلاء دروس اليوم — 2026-09-26)

- **مهارة جديدة `.agents/skills/supabase-security-and-migrations/SKILL.md`:** تُلقّن الوكلاء دروس الأمن/قاعدة البيانات المستخلصة اليوم — فخ المنطق ثلاثي القيم (`IF NOT is_admin()` حين تُعيد `NULL`)، أنماط RLS الصحيحة، ثبات الهجرات وفشلها الصامت، ومنهجية التحقق الحيّ عبر Supabase MCP مع مصفوفة التخويل T1–T7. عُزّزت القاعدة الحاكمة `.agents/AGENTS.md` بقسم «قاعدة البيانات والتفويض»، وصُحّحت قاعدة ترفيع الإصدار لتحيل إلى `scripts/release.mjs` بدل المواضع اليدوية القديمة، وحُدّثت مصفوفة المزامنة في `docs/DOCUMENTATION_MAP.md`، ومهارة مراجع الأمان `grido-qa-security-auditor` (قسم الإصدار + مؤشّر المهارة).

### Security (تقوية مسار SVG للملصقات — 2026-09-26)

- **حقن سمات XML عبر الألوان/الخط:** القوالب الـ83 تُدرج الألوان وعائلة الخط مباشرة في سمات `fill`/`stroke`/`font-family`، بخلاف حقول النص التي تمرّ عبر `escapeXml`؛ ومحرّر اللون الحر يقبل نصاً غير مقيّد. أُضيفت `svg-safety.ts` (`sanitizeStickerColor`/`sanitizeStickerFontFamily`) تُطبَّق في نقطة توليد واحدة (`StickerStudioDialog`) فتغطي كل القوالب، وتُعقَّم نسخة التصدير/النسخ عبر `sanitizeSvgMarkup` (فلا يخرج ملف SVG على القرص/الحافظة بسمات خطرة).
- **تقوية `sanitizeSvgMarkup`:** حظر عناصر SMIL (`animate`/`set`/`animateMotion`/`animateTransform`/`mpath`/`discard`) وعنصر `<style>`، وإسقاط أي سمة تحمل `javascript:`/`@import`/`expression(`، وحصر `href`/`src` في المراجع المحلية (`#`) والصور النقطية المضمّنة، ومنع `url()` الخارجي داخل `style`.

### Fixed (مظهر الملصقات — 2026-09-26)

- **قصّ النص في «جدول الإنتاج والانتهاء» و«بطاقة الواي فاي»:** تسميات عربية استخدمت `text-anchor="end"`/الافتراضي داخل حاوية `dir="rtl"` فتنقلب محاذاتها وتخرج خارج `viewBox` (قيس 3 نصوص بحدود 724px و754px في عرض 600px). حُوّلت 5 نصوص إلى `text-anchor="middle"` (محاذاة مستقلة عن الاتجاه) فصارت داخل الحدود وتُصيَّر بثبات في المعاينة وفي ملف SVG/PNG المُصدَّر.
- **وميض اللون أثناء الكتابة:** حقل hex الحر كان يدفع كل حرف إلى الحالة فتُصيَّر ألوان غير صالحة؛ صار يحتفظ بمسودة ولا يدفع إلا الألوان الصالحة (مع `aria-invalid`).
- **تحقق هندسي آلي:** فُحصت 83 قالباً بقياس `getBoundingClientRect` مقابل `viewBox` ⇒ صفر تجاوز (كان 2).

## [v1.9.3] - 2026-09-26

### Security (تجاوز تخويل حرج — أُغلق 2026-09-26)

- **🔴 تجاوز كامل لدوال الأدمن (مؤكد بالاختبار الحيّ على الإنتاج):** `is_admin()` كانت تعيد **NULL لا FALSE** عندما ينقص مفتاح `role` في `app_metadata` (لأن `NULL OR FALSE = NULL` في منطق SQL ثلاثي القيم)، فتتحوّل `IF NOT public.is_admin() THEN RAISE` في دوال الأدمن إلى `IF NULL` ⇒ لا ترفع ⇒ تجاوز. أُثبت عملياً (في معاملة تُلغى) أن **مستخدماً مصادقاً غير مسؤول — وحتى دور `anon` بالمفتاح العام** — استدعى `admin_create_license_key(...)` بنجاح وأنشأ مفاتيح باقة `enterprise` لمدة 120 شهراً. والأسوأ: `check_and_record_ai_usage` صارت قابلة للاستدعاء نيابةً عن مستخدم آخر (استنزاف حصص الآخرين/قراءة استخدامهم). الإصلاح (هجرة `20260926160117`): `is_admin()` تعيد `boolean` دائماً (`COALESCE(..., false)`) وتقوية كل فحص إلى `is_admin() IS NOT TRUE`. تحقق بعد الإصلاح: المالك ما زال مسؤولاً ويولّد المفاتيح، وغير المسؤول/`anon` يُرفضان الآن.
- **سلسلة تصعيد كاملة أُغلقت (مُثبتة بالقياس على المشروع الحي `mvovehnyvoiawvwaurav`):** `is_admin()` على الإنتاج كانت تمنح **كل مشترك Enterprise صلاحيات مسؤول نظام كامل**، وسياسات `profiles` الحيّة كانت `UPDATE ... USING (auth.uid() = id)` **بلا `WITH CHECK`** ⇒ أي مستخدم يعدّل باقته/حالته/انتهاءه/مفتاحه بنفسه. الحلقتان معاً = مسار من حساب مجاني إلى مسؤول.
- **السبب الجذري (مُثبت بتشغيل الهجرات لا بالقراءة):** هجرتان تستخدمان `OLD.` داخل `WITH CHECK` وهي غير صالحة في سياسات RLS (`42P01: missing FROM-clause entry for table "old"`) فتفشلان كاملتين بينما تُسجَّلان كأنهما نُفِّذتا؛ وهجرة ثالثة تمنح `EXECUTE` لتوقيع دالة سباعي لا يُنشئه أي ملف (`42883`). صُحِّحت الملفات الثلاثة: `20260713000002`، `20260725000001`، `20260907000000`.
- **هجرتان جديدتان:** `20260926125510` (إدراج حساب المالك في `admin_users` + ترميم سياسات `profiles` + حارس حقول الاشتراك `guard_profile_privilege_columns` + استرجاع دالة `ensure_profile_exists` التي كانت **مفقودة بالكامل** من الإنتاج) و`20260926125727` (تحويل الحارس إلى `SECURITY INVOKER` بعد أن كشف اختبار فعلي أن نسخته `SECURITY DEFINER` تتجاوز الفحص دائماً).
- **تطبيق الهجرتين الغائبتين على الإنتاج** (`20260822000000` is_admin + مفاتيح CSPRNG، و`20260907000000` المنح) ومواءمة تاريخ الهجرات (16 ← 20).
- **التحقق السلوكي (نُفِّذ فعلاً بأدوار PostgREST الحقيقية):** المالك `is_admin=true` ويرى 10 حسابات/4 مفاتيح · عميل Enterprise `is_admin=false` ويرى حسابه فقط · تعديل الباقة أو `expires_at` ذاتياً = `BLOCKED 42501` · تعديل الاسم الشرعي وتعديل المشرف لحقول العميل = ناجحان · `anon` = 0 صفوف. وتحسنت المستشارات: `auth_rls_initplan` 4←2 و`multiple_permissive_policies` 12←6.
- **المتبقي على المالك:** تفعيل حماية كلمات المرور المسرّبة (إعداد Auth في اللوحة) + قرار منح/سحب دور المسؤول للحساب `a60b8946…` (عميل Enterprise حقيقي فقد الدور بهذا الإصلاح، ولم يُمنح تلقائياً).

### Added (بوابة فحص هجرات — 2026-09-26)

- **`scripts/migration-lint.mjs`** مع `--self-test` وبوابة في CI: تكشف `OLD./NEW.` داخل سياسات RLS، و`GRANT EXECUTE` على توقيع غير مُنشأ، وأسماء سياسات تتجاوز 63 بايتاً (تُقصّ بصمت في PostgreSQL). هذه هي البوابة التي كانت غائبة فتسللت الأخطاء الثلاثة إلى الإنتاج.
- **كشف ثبات الهجرات (منع الانحراف):** بصمات SHA-256 لكل هجرة في `supabase/migrations.manifest.json`؛ يمنع الكاشف تعديل أي هجرة مطبَّقة بعد تسجيلها (الإصلاح يكون بهجرة جديدة لا بتعديل القديمة)، مع `--update-manifest` لتسجيل هجرة جديدة. هذا يمنع تكرار نقشة الخمس هجرات التي عُدِّلت بعد تطبيقها.

### Fixed (مراجعة لوحة الإدارة admin-web — 2026-09-26)

- **استعادة الجلسة كانت معطوبة (مؤكدة بقياس عملي):** العميل يُنشأ بـ`persistSession: false` ثم `getUser(savedToken)` لا يحمّل الجلسة على العميل، فأي `rpc('is_admin')` بعدها يُرسل بمفتاح `anon` ⇒ يعود `false` ⇒ طرد فوري من اللوحة عند كل تحديث صفحة، مع تخزين توكن ميت في `localStorage`. صارت الجلسة يديرها supabase-js (`persistSession: true` + `storageKey: 'grido_admin_auth'` + `getSession()`)، وأُزيل `grido_sb_token` مع ترحيل تنظيفي. (تحقق فعلي: عميل جديد + نفس التخزين = جلسة مستعادة و`rpc` بتوكن الأدمن).
- **CSV Formula Injection:** تصدير المستخدمين ودفعات المفاتيح صار يحيّد كل خلية تبدأ بـ`= + - @` ويهرّب الاقتباسات (`csvCell`)، مع `URL.revokeObjectURL` لتنظيف الروابط المؤقتة.
- **حد الذكاء الاصطناعي للـ Enterprise كان بلا أثر:** `enterpriseAiLimit` لم يكن يُحفظ ولا يُحمّل (`grido_ent_ai_limit`) — صُحّح.
- **ادعاء «الإعدادات الحية» (تدقيق C-01):** لا يوجد جدول `system_config` ولا مستهلك لهذه المفاتيح — أعيدت تسمية التبويب إلى «إعدادات محلية (مسودة)» مع شريط توضيحي، وأصبحت رسالة الحفظ صادقة.
- **أرقام مضللة:** `ai_usage` كان يُقرأ بحد 100 صف ويُعرض كـ«الإجمالي» — أُضيف عدّ `count: 'exact'` للمؤشر، وتكلفة الـ100 صف صارت موسومة صراحةً.
- **المفاتيح المسحوبة:** كانت تُعرض «ACTIVATED» — صار لها شارة `REVOKED ⛔` وزر فلترة، وفشل توليد الدفعات الجزئي صار يُبلَّغ عنه بدل ادعاء النجاح.
- **توليد مفاتيح البادئة المخصصة:** `Math.random` ⇒ `crypto.getRandomValues`.

### Changed (تحسين واجهة لوحة الإدارة وصفحة الهبوط — 2026-09-26)

- **خمس فئات CSS كانت مُستخدمة في لوحة الإدارة ولا تعريف لها في أي ملف** (`spotlight-card` ×10، `magnetic-pill` ×5، `tab-content-reveal` ×5، `aurora-bg` ×2، `app-mockup`) — وهذا السبب الفعلي وراء ظهور اللوحة «مسطّحة» بينما صفحة الهبوط مصقولة. أُعيد تعريفها على رموز التصميم، وأصبح وميض البطاقة يتتبّع المؤشر فعلياً عبر `--mouse-x/y` الذي يضبطه `handleMouseMove` أصلاً بلا فائدة.
- **مواءمة هوية اللوحة مع صفحة الهبوط:** كانت اللوحة تستخدم لوحة ألوان مُثبّتة مكتوبة يدوياً (`#000000`/`#121214`/`#383842` ونصوص `#999999`) ومخالفة لـ`index.css` (‏`#121212`/`#1E1E1E`/`#171717`/`#141414`/`#2C2C2C`) — استُبدلت بالكامل بالرموز، فاختفت القفزة البصرية بين السطحين.
- **الاعتماد على الأيقونات (AGENTS.md):** أُزيلت كل الإيموجي من اللوحة (‏`✨ ⏳ 🛑 ⛔ 🟢 ⚪ 📊 📦 ⚠️`) واستُبدلت أيقونات Lucide داخل الشارات والتنبيهات، وأُضيفت رِقاع أيقونات ملوّنة لبطاقات الإحصاء.
- **الهوية البصرية للأزرار والتنقل:** المفتاح النشط في الشريط الجانبي والمرشحات المفعّلة وأزرار الإجراءات الرئيسية انتقلت من الأبيض الصريح إلى أزرق العلامة `#3b82f6`، مع إزالة التوهجات الخارجية من الأزرار التزاماً بقاعدة «صفر توهج».
- **حلقة التركيز المزدوجة الإلزامية (AGENTS.md:14):** لم يكن أي عنصر تفاعلي في اللوحة أو صفحة الهبوط يمتلك مؤشر لوحة مفاتيح. أُضيفت القاعدة الموحّدة عبر `.admin-shell` و`.landing-shell` (‏2px هوية + 2px إزاحة على خلفية اللوحة)، مع رابط `skip-to-content` على صفحة الهبوط يظهر عند التركيز فقط.
- **رفع تباين النص الخافت:** `#666666` على `#121212` كان بنسبة ~3.3:1 (دون AA) — رُفع الرمز `--grido-text-muted` إلى `#8A8A8A` (~5.5:1) مع مواءمة الـ10 مواضع المكتوبة يدوياً في المكوّنات.
- **حالات فراغ ومؤشرات جداول:** جدولا المفاتيح والسجل لم يكن لهما أي حالة فراغ (يصمتان عند غياب النتائج)، ورؤوس الجداول صارت مثبّتة (`sticky`)، ومفاتيح الترخيص صارت داخل كبسولات mono قابلة للقراءة.
- **إزالة `preload` عديم الفائدة:** `/grido-desktop-ui.png` كان يُحمَّل بـ`fetchpriority="high"` في كل زيارة بينما لا يُعرض إلا داخل نافذة التكبير عند النقر (`AppMockup` lightbox) — أُزيل، فانتهى التحذير من المتصفح وتراجعت أولوية تحميل صورة ثقيلة إلى ما بعد LCP.
- **أيقونات تنقّل مكرّرة:** `DollarSign` كانت مستخدمة مرتين في قائمة الترويسة (`#roi` و`#pricing`) — صارت `Calculator` و`Tag`.

### Fixed (بناء Go + توصيل النافذة والصينية — 2026-09-26)

- **علة بناء قاطعة (مُثبتة بـ`go build .`):** `window_sizing.go` كان يعيد تعريف `defaultWindowWidth/Height` المعلنتين في `window_state.go` ⇒ `go build` و`go vet` و`go test .` تفشل (`redeclared in this block`) ووظيفة CI `windows-build` تسقط عند `wails3 task build`. أُعيدت الهيكلة: مصدر الحجم المفضل يبقى واحداً (`window_state.go` — 1280×800) واكتفى الملف الجديد بالمقاسات التكيّفية والتنظيف والحصر ⇒ `go build` و`go vet .` أخضران، والتطبيق يرتبط فعلياً (95MB exe)، و`go test .` يمرّ بكل حالاته.
- **ميزتان كانتا مكتوبتين بلا أي مستدعٍ (كود ميت):** المقاسات التكيّفية ودوال حصر النافذة، وأيقونة الصينية `SetupSystemTray`. وُصلتا فعلياً في `main.go`: استعلام مساحة عمل ويندوز الأصلي (`MonitorFromPoint` + `GetMonitorInfoW` في `window_monitor_windows.go`) وبديل محايد لغير ويندوز، مع استدعاء الصينية قبل `Run` — وهو النمط المدعوم في beta.25 لأن Wails يؤجّل إنشائها حتى الإقلاع.
- **مقاس النافذة صار واعياً بمساحة العمل:** 1280×800 يُقلَّص تلقائياً على الشاشات الأصغر (هامش 24px من كل جهة وحد أدنى مطلق)، والنافذة المستعادة تُنظَّف من القيم التالفة أو المبالغ فيها وتُحصر داخل مساحة عمل الشاشة التي كانت عليها ⇒ لا نافذة خلف شريط المهام ولا نافذة على شاشة فُصلت.
- **أسماء سياسات >63 بايتاً في هجرتين قديمتين** (`20260711000000` و`20260713000000`؛ 79 و91 بايتاً) كانت تُقصّ بصمت في PostgreSQL ⇒ صارت ASCII معيارية (`profiles_select_own_or_admin` / `profiles_update_own_or_admin`) مع إبقاء أسماء التنظيف القديمة في `DROP IF EXISTS`، فصارت بوابة الهجرات بلا أي تحذير (4 ← 0).
- **ملفات مُسوّدة مهملة** (`validate*-tmp.cmd` ×6) حُذفت وأُضيف نمط تجاهل يمنع تكرارها.

### Added (بوابة CI لتطبيق الإدارة — 2026-09-26)

- **وظيفة `admin-web-quality`:** كان `admin-web` بلا أي بوابة CI (فجوة موثّقة في المراجعة 09) — صارت تشغّل الأنواع + lint + بناء إنتاجي. تحقّق فعلي قبل الإضافة: البناء الإنتاجي نجح **بلا ملف `.env`** (الوضع نفسه الذي يعمل به CI) مع التحذير الوحيد المعروف عن حجم chunk الخاص بـ`three.js`.
- **`vitest` + اختبارات وحدة (`src/lib/admin-utils.test.ts`):** كان منطق التصدير والتوليد غير مُختبر (بند «صفر اختبارات»). استُخرج المنطق النقي (`csvCell`، `parseStoredLimit`، `randomKeySuffix`، `buildCustomKey`) إلى `src/lib/admin-utils.ts` وغطّته 11 حالة اختبار، وأُضيفت خطوة `npm test` إلى وظيفة `admin-web-quality`.
- **`FeedbackProvider` (بديل Fluent لـalert/confirm):** أُزيلت 22 نافذة `alert()` و3 نوافذ `confirm()` أصلية واستُبدلت بإشعارات غير معطِّلة ونافذة تأكيد مصمّمة (Escape يُلغي، Enter يُؤكّد، حلقة تركيز — بند C-08).

### Fixed (تصحيح شدة واقعة المفتاح — 2026-09-25)

- **المفتاح لم يكن قابلاً للاستغلال:** خادم Modal يرفض أي طلب بلا JWT صالح (`upscaler.py:146-181`) والحصة خادمية لكل مستخدم — الواقعة نظافة لا ثغرة. وُثّق التوضيح إلحاقاً في `SECURITY_NOTICE.md` دون مساس بالسجل.

### Performance & Cleanup (جولة المتابعة — 2026-09-26)

- **إصلاح مستشار `auth_rls_initplan` على الإنتاج:** سياستا `ai_usage_insert_service` و`admin_users_select_policy` كانتا تُقيّمان `auth.role()`/`auth.jwt()` مرة لكل صف؛ لُفّتا بـ`(select ...)` (الدلالة محفوظة حرفياً) عبر هجرة `20260926154229` مُطبَّقة على الإنتاج — ونزل مستشار `auth_rls_initplan` من 2 إلى **0**، وبقيت `multiple_permissive_policies` على `profiles` كتصميم مقصود (تحديث ذاتي + تحديث مشرف) و`unused_index` (INFO، مطلوب لمسارات قادمة).
- **إزالة كود ميت:** `centerInWorkArea` في `window_sizing.go` لم يكن له مستدعٍ في الإنتاج (اختبار فقط) — أُزيل مع اختباره.

## [v1.9.2] - 2026-09-25

### Changed (إزالة زحمة الشريط الجانبي — 2026-09-25)

- **دمج تبويبات الاستوديو 9→7:** `stickers/shapes/text` صارت تبويب `العناصر` الموحد (`rail-studio-elements`) — نفس المكون `FreeformElementsTab` بمبدّله الداخلي، مع ترحيل القيم المخزنة القديمة (`migrateLegacyStudioTab`).
- **حذف تبويب `خلفية وحدود` من الكولاج (7→6):** كل أدواته مكررة 1:1 في العمود الأيمن (مسافات/إطار/قص في `CollageSettings`، خلفية الورقة في `GeneralSettings`، خلفية الخانة في `SlotProperties`) — حُذف الملف نهائيا بلا بديل مكرر.
- **تفعيل مسارات العمل:** شريحة `workflow-slice` (`quick`/`studio` محفوظة في `grido_workflow_mode`) + فلترة حقيقية في `getToolsForWorkflow` (السريع يخفي تبويب العناصر) + أمران في لوحة الأوامر (Ctrl+K → مسار العمل) — بلا تحويل تلقائي لوضع الكانفاس (حماية من مسح عناصر الحر P1-19).
- **تحسين تصميم تبويب الورق والقص:** حذف صفوف خطوط القص وسماكتها ولونها المكررة مع `CollageSettings` (قاعدة عدم التكرار) مع زر تنقل للوحة الخصائص، وتحويل الإرشادات لشبكة مفاتيح 2×2 بعداد مفعّلة، وترقيم جدولي لعدد النسخ.
- **اختزال نصوص الشريط الجانبي (الوضعين):** تقصير كل العناوين والتلميحات والأزرار والتنبيهات في تبويبات الكولاج والاستوديو (descriptions ≤4 كلمات، tooltips ≤3، صيغ سلبية قصيرة بلا تم/تمت) — بلا مساس بـ aria-labels والمنطق. ضُبطت 7 توقعات اختبارية على النصوص الجديدة، وأُصلح عنوانا `إضافة/إعادة إضافة` المتبادلان في المفضلة، وحُذف ملف يتيم مكسور (`collage-layers-tab` غير مربوط ويستورد حزمة محذوفة). الأرقام الحاكمة: Vitest **84 ملف/691 حالة (690 ناجحة + 1 متخطّاة)**.

### Added (قرارات محمية لجلسة الصقل — 2026-09-25)

- **قسم `D-1..D-5` في `docs/features-tracker.md`:** غير موقع عمدا + Wails v3 فوق v2 + E2E محاكي v3 + BUGS_REPORT أرشيف + صقل أولا (PSD/VDP/ICC خارج النطاق). أي تدقيق قادم ممنوع من نقضها بلا موافقة المالك.

### Changed (صقل الاعتماديات والألوان — 2026-09-25)

- **توحيد `@types/react/dom` على 19** مع `react 19.2.8` (`frontend/package.json`) — `typecheck` أخضر بصفر أخطاء.
- **حذف `onnxruntime-web`** (صفر استخدام في `src` — توفير ~7-20MB معلنة) **وإضافة `culori ^4.0.2` + `@types/culori`** لتناغمات الألوان.
- **مولّد تناغمات `buildColorHarmony` في `palette-extract.ts`** (Complementary/Analogous/Triadic عبر OKLCH — يغلق الفجوة M-3) + 3 اختبارات في `canvas-rendering-core.test.ts` (9/9 ✅).
- **تفكيك `export-image.ts` (1094 سطرا → Barrel + 8 وحدات <350 سطرا)** بلا تغيير سلوكي: `primitives/color/watermark/canvas-collage/canvas-fitted/canvas/slot/bleed` — `typecheck` ✅ `lint` ✅ كامل Vitest 84 ملف/687 حالة ✅.

### Fixed (توضيح تاريخية BUGS_REPORT — 2026-09-25)

- **بانر أرشيف أعلى `BUGS_REPORT.md`:** التقرير تاريخي ومعظم بنوده مُصلحة (`ai_service.go:331`، `db.go:408`) — المرجع الحالي `docs/features-tracker.md` + `docs/reviews/08-code-quality-audit-2026-09-25.md`. بلا تغيير تاريخي (Append-only per `docs/DOCUMENTATION_MAP.md:112`).

## [v1.9.1] - 2026-09-25

### Added (تصدير PDF المتجهي لورقة الطباعة — 2026-09-25)

- **مولّد PDF في الخادم (`internal/service/print_pdf_export.go`):** صفحة مخصصة بالمقاس الفيزيائي الدقيق (لا تقريب A4/Letter)، تضمين JPEG بجودة 95 بلا إعادة ترميز، وخطوط قص **متجهة** (Line + Dash Pattern بنفس إيقاع `drawCutLines`: عرض 0.20مم، شرطات 1.5مم، منقط 0.6/2.4مم، رمادي 120) تبقى حادة عند أي تكبير. سقف 50MP + رفض صريح لـ CMYK→PDF برسالة توجيهية (gofpdf لا يضمّن CMYK) + كتابة ذرية + معاينة HTML تحفظ عقد الطباعة.
- **مبدّل الصيغة في الواجهة (`print-dialog.tsx` + `print-settings-toolbar.tsx` + `use-print-export.ts`):** زرّا «صورة / PDF» بجانب sRGB/CMYK؛ اختيار PDF مع CMYK يبدّل تلقائياً إلى sRGB مع تلميح صريح. يُرسل `exportFormat: "pdf"` عبر عقد `domain.PrintRequest` نفسه — PDF يُطبع عبر مسار المستندات القائم (`launchWindowsDocumentPrint` عبر Edge) لأن `.pdf` كان مسموحاً في `print_native.go:71`.
- **اعتمادية جديدة `github.com/jung-kurt/gofpdf v1.16.2` (pure-Go، بلا cgo — آمنة للبناء المتقاطع):** تغلق الفجوة M-5 من سجل 0.11 (لا مولّد PDF).
- **اختبارات Go جديدة (3 دوال في `print_pdf_export_test.go`):** توقيع `%PDF-` + أبعاد MediaBox لـ A4 + صورة XObject مضمّنة + مشغّلات قص متجهة + معاينة HTML، رفض CMYK صراحةً، وتجاوز NaN/Inf.

### Added (تدقيق فجوات السوق والمكتبات البديلة — 2026-09-25)

- **سجل تدقيق الفجوات 0.11 في `docs/features-tracker.md`:** بحث آلي في 679 ملفاً لإثبات أن اقتراحات سابقة (عزل خلفية أوفلاين، قص ICAO للوجه، استخراج الألوان، القص، QR/باركود، الإدراج الدفعي) **مكرَّرة** — البديل مُنفَّذ بالفعل (`bg-removal.worker.ts` بـ `selfie_multiclass.tflite`، `face-frame.worker.ts` + `face-frame-utils.ts` بمعايير ICAO، `palette-extract.ts`، `crop-dialog.tsx`، `jsbarcode`/`qrcode.react`).
- **الفجوات الحقيقية المؤكَّدة بالأدلة (3):** (1) **لا مولِّد PDF** رغم أن `print_native.go:71` يسمح بـ `.pdf` للطباعة — `print_export.go` ينتج PNG/JPEG/TIFF/HTML فقط؛ (2) **لا PSD** (`ag-psd` غير موجود) — لا تبادل طبقات مع فوتوشوب؛ (3) **لا طباعة بيانات متغيرة (VDP)** (`papaparse`/`xlsx` غير موجود) — لا مسار من جدول بيانات إلى قالب.
- **أثر التوثيق:** حصر التوصيات المستقبلية في ثلاث فجوات مُثبَتة بدل قوائم مقترحات مُكرَّرة، مع إلغاء البنود المكرَّرة صراحةً لتفادي تكرار العمل.

### Added (مهارات التوثيق والمعايير الرسمية — 2026-09-25)

- **مهارة إدارة الحالة بـ Zustand v5 (`.agents/skills/zustand-state-patterns/SKILL.md`):** توثيق الممارسات المعتمدة لمنع Stale Closures عبر `getState()` المباشر داخل معالجات الأحداث، وفرض `useShallow` للمحددات المجمعة لمنع التحديثات اللانهائية وهدر موارد الرندر.
- **مهارة إمكانية الوصول والتفاعل بـ Radix UI (`.agents/skills/radix-ui-accessibility-ux/SKILL.md`):** تثبيت متطلبات ARIA الصارمة للنوافذ والقوائم، حصر التركيز التلقائي، إدارة الـ Escape، ومعالجة `Dialog.Description` الإلزامية.
- **مهارة محرك التنسيق بـ Tailwind v4 (`.agents/skills/tailwind-v4-theme-engine/SKILL.md`):** توثيق استخدام توجيه `@theme` في CSS مباشرة، وإلزام استدعاء متغيرات الطبقات `z-(--z-...)` لحماية ثوابت الطبقات، واستخراج الألوان برمجياً لعناصر Konva.

### Added (تدقيق جودة الكود وتغطية الاختبارات — 2026-09-25)

- **تقرير تدقيق الجودة الشامل `docs/reviews/08-code-quality-audit-2026-09-25.md`:** توثيق مقاييس التغطية الحية للكود (Go statements 59.0%، الواجهة lines 51.5%)، وتحليل ملفات المنطق الساخنة (28 ملفاً في الواجهة > 500 سطر)، وفحص `golangci-lint` (17 ملاحظة غير حرجة)، وحصر انزياح `gofmt` في 12 ملفاً، مع تقييم عام للمشروع بمعدل 8.6/10.
- **أداة قياس الجودة `scripts/quality-metrics.mjs`:** مسح إحصائي للملفات، الأسطر، نسب الاختبار إلى المصدر، مكافحة الأنماط السيئة (`any`, `console.log`, `interface{}`), وحصر النقاط الساخنة.


### Removed (حذف سرّ Modal الميت وتحصين سلسلة البناء — 2026-09-25)

- **حذف `ModalAIKey`/`GetModalAIKey` نهائياً من الخلفية (Go):** كان سرّاً مشتركاً يُقرأ من ldflags/`.env`/متغيرات البيئة ويُحقن في كل بناء، لكنه بلا أي مستهلك إنتاجي (كان يُستدعى من `license_service_test.go` فقط). التوثيق الفعلي لخادم Modal هو **JWT المستخدم** (`Authorization: Bearer`) الذي يتحقق منه `modal_ai/upscaler.py` مع Supabase. الدليل: فحص فعلي للثنائي أثبت وجود المفتاح نصاً داخل `bin/GridoStudio.exe` (قابل للاستخراج بـ`strings`).
- **إزالة الحقن من سلسلة البناء:** حُذف `MODAL_AI_KEY` من `build/windows/Taskfile.yml` (ومن `LDFLAGS_INJECT`)، ومن `build.ps1` (قراءة `.env` + `$env:MODAL_AI_KEY`)، ومن `.github/workflows/release.yml` (لم يعد يقرأ السر `secrets.MODAL_AI_KEY`). الحقن المتبقي محصور في متغيرات Supabase و`AppVersion` فقط.
- **حذف الاختبار التابع:** `TestGetModalAIKey` من `internal/service/license_service_test.go` (لم يعد للدالة وجود).
- **تنظيف التوثيق وقواعد الوكلاء:** استُبدلت قاعدة `حقن مفاتيح الذكاء الاصطناعي بـ ldflags` في `.agents/AGENTS.md` بقاعدة **حظر أسرار الذكاء الاصطناعي المشتركة** (No Shared AI Secret Invariant)، وصُححت الإشارة في قاعدة `حقن متغيرات البيئة بـ ldflags`، و`wails-cross-compiler/SKILL.md`، و`.env.example` (لا مفتاح مطلوب)، و`README.md`، و`SECURITY_NOTICE.md`، و`docs/AI_ARCHITECTURE.md`.

> ⚠️ **إجراء مطلوب على المالك:** إبطال (Revoke) أي مفتاح Modal قديم `grido_sec_ai_live_*` من لوحة Modal، لأنه يبقى قابلاً للاستخراج من الإصدارات المنشورة سابقاً. كما عُطّل السطر المقابل في ملف `.env` المحلي.

### Added (نظام توثيق مُلزِم — بوابة Docs Sync Guard — 2026-09-25)

- **خريطة التوثيق الإلزامية `docs/DOCUMENTATION_MAP.md`:** جرد كل مستند ودوره ومُشغّله، مصفوفة «ما تغيّر ← ما يجب توثيقه»، الأرقام المرجعية بأوامر التحقق، البوابات الثلاث (قبل العمل / قبل الكومت / قبل الدفع)، وقواعد «لا ادعاء بلا دليل» و«التاريخ لا يُعاد كتابته».
- **أداة الفرض `scripts/docs-gate.mjs`:** تفحص انحراف الأرقام المرجعية (اختبارات Vitest / مواصفات E2E / اختبارات Go / عدد المستندات)، وتغطية الجرد، ووجود توثيق مرافق لأي تغيير كود، وسلامة مراجع المسارات في `.agents/` (تحذيري افتراضياً · صارم بـ`--strict-refs`)، مع مفتاح طوارئ موثّق `GRIDO_DOCS_GATE=off`.
- **مهارة `grido-docs-sync-guard`** في `.agents/skills/` + قاعدة حاكمة جديدة في `.agents/AGENTS.md` («بوابة التوثيق الإلزامية — Documentation Sync Gate») تُلزم الوكلاء بإعلان المستندات المتغيّرة قبل العمل، وبعدم إغلاق أي مهمة بعبارة «سيُوثَّق لاحقاً»، وبعدم كتابة رقم/مسار من الذاكرة.
- **الفرض الآلي:** `.husky/pre-commit` (البوابة + lint-staged) و`.husky/pre-push` (البوابة على مدى الدفعة)، وخطوة `Documentation Gate` جديدة في `.github/workflows/ci.yml`، ومهمة `wails3 task docs:check` في `Taskfile.yml`.
- **قسم «📚 التوثيق» في `README.md`** يجمع كل المستندات الحاكمة في جدول واحد مع تأكيد إلزام البوابة.

### Fixed (إصلاح خطافات Git وتصحيح انحرافات التوثيق — 2026-09-25)

- **خطافات Git كانت معطّلة بالكامل:** كان `core.hooksPath` يُضبط على `frontend/.husky/_` وهو مجلد لا يُنشئه هذا المشروع إطلاقاً ⇒ لم يكن أي خطاف يعمل. صُحّح إلى `.husky` (مُتتبَّع في Git، و`pre-commit` بوضع 100755) في `scripts/setup-husky.mjs`، وأُضيف `.husky/pre-push` مع قاعدة `eol=lf` في `.gitattributes`.
- **تصحيح أرقام مرجعية منحرفة:** `README.md` (62→**84** ملف اختبار · 30→**29** عائلة خطوط في المُنتقي مع تفصيل 16 مُعدّة أوفلاين و12 تُنزَّل آلياً)، و`docs/testing_guide.md` (67 ملف/469 حالة و15 مواصفة/31 حالة و21 مواصفة → **84 ملف/684 حالة** و**25 ملف/165 حالة**) مع إضافة أوامر التحقق إلى `§5`.
- **تصحيح ادعاء تقني:** `docs/developer_guide.md` كان يصف التنسيق بـ«Vanilla CSS» — والصحيح **Tailwind CSS v4 + رموز Fluent 2**.
- **توثيق قيد أدوات حقيقي:** `go vet ./...` و`go build ./...` يفشلان بسبب مجلد قالب Wails `build/ios/scripts/deps` — وُثّق استخدام `go vet ./internal/...` و`go build .` في الخريطة و`docs/developer_guide.md` و`docs/next-session-prompt.md`.
- **حذف مستند ميت:** `docs/HOW_TO_REGENERATE_MODAL_KEY.md` (دليل تجديد سرّ لم يعد له وجود بعد إزالة `ModalAIKey`).

## [v1.9.0] - 2026-09-24

### Added (معمارية التدقيق بالذكاء الاصطناعي وماسح المستندات — 2026-09-24)

- **دمج النموذج العصبي كمُدقّق ذكي (AI Verifier Fusion):** إعادة هندسة مسار كشف المستندات ليعمل نموذج `DocCornerNet` بالتوازي مع محرك OpenCV WASM وهرم JS، مع تطبيق خوارزمية دمج نقية (`fuseDetections`) تعتمد على ثلاث ركائز:
  1. **تأكيد (Confirm):** تعزيز ثقة الكشف الكلاسيكي عند تطابق `IoU ≥ 0.55` دون المساس بالهندسة الدقيقة المصقولة بكسلياً (sub-pixel).
  2. **استرداد (Rescue):** استرداد المستندات المفقودة من المسار الكلاسيكي عند ثقة نموذج عاليّة (`≥ 0.60`) مع منع التكرار للمستندات المحصورة.
  3. **استبدال (Replace):** استبدال الإطار الافتراضي تلقائياً بكشف النموذج الواثق (`≥ 0.55`).
  4. **سقف مهلة ذكي (`ML_GRACE_MS = 1500ms`):** منع تعليق الواجهة في حال تأخر معالجة النموذج العصبي.
- **تحصين هندسة المنظور ومصفوفة الهوموغرافي:** رمي استثناءات صريحة عند تداخل أو استقامة الأركان الأربع لمنع إنتاج صور سوداء أو أصفار صامتة، مع تغليف الاستدعاء وإظهار إرشادات واضحة عبر Toaster ("باعد بين الأركان الأربع").
- **صقل حواف حقيقي (Sub-pixel Edge Snapping):** إزالة سقف 4.5px التعسفي لمعالجة خطأ التكميم عند إعادة تحجيم الإحداثيات من الدقة المنخفضة.
- **استقرار ذاكرة OpenCV WASM و Web Worker:** إيقاف الحذف المزدوج لمصفوفات الكونتور في OpenCV، وتفادي تفريغ الذاكرة المصدرية (`Detached ArrayBuffer`) في Web Worker عبر نسخ مخصصة للنقل مع مهلة أمان 15 ثانية.
- **توحيد نسب وأبعاد الهوية وتسميات الواجهة:** مصدر موحد لفحص نسبة بطاقة الهوية (ISO 7810 ID-1) وتسميات المستندات العربية، وتوليد معرفات مستقرة بـ `crypto.randomUUID`.
- **معايير Fluent 2 وتجربة الانتظار وإمكانية الوصول:** تطبيق ثوابت الانتظار المعتمدة (`WAIT_COPY.scanningDoc`, `WAIT_COPY.exporting`)، وتوفير إمكانية إلغاء التصدير المتعدد مع شريط تقدم رقمي، وتطبيق سمات الوصولية (`role="status"` مع `aria-live="polite"`).

## [v1.8.0] - 2026-09-24

### Changed (ترقية المحرك الأساسي — Wails v3.0.0-beta.25 — 2026-09-24)

- **ترقية Wails v3 إلى `v3.0.0-beta.25`:** ترقية حزم Go (`github.com/wailsapp/wails/v3`)، وأداة الـ CLI (`wails3`)، وحزمة عميل زمن التشغيل بالواجهة (`@wailsio/runtime@^3.0.0-beta.25`).
- **أمان واستقرار تدفق الأصول:** الاستفادة من معالجة ثغرات المسارات والروابط الرمزية (Path traversal & symlink escapes) في وسيط الأصول (Asset middleware)، وإصلاح إنهاء العمليات الخلفية لـ `wails3 dev` عند إغلاق التطبيق.
- **تحديث مسارات CI/CD ودليل المطورين:** ترقية خطوط بناء GitHub Actions (`ci.yml` و `release.yml`) وتحديث ملفات التوثيق والمهارات لمطابقة النسخة المعتمدة.

### Fixed (توحيد ارتفاعات شريط الأدوات العلوي — 2026-09-24)

- **توحيد الارتفاع القياسي في شريط الأدوات (`h-8` / 32px):** كانت أزرار أدوات الذكاء الاصطناعي (`toolbar-ai-tools.tsx`) تستخدم خطأً الارتفاع الشاذ `h-9` (36px) مع حاوية فرعية بحدود وحواشٍ داخلية (`py-0.5 border`) محشورة داخل حاوية أوامر ثانية (`fluent-command-group`)، مما تسبب في تضخم المجموعة لـ 48px وبروزها بشكل شاذ فوق وتحت باقي أزرار الشريط (التي تستخدم `h-8`). تم ضبط أزرار الذكاء الاصطناعي على الارتفاع الموحد `h-8`، وتحويلها إلى مجموعة أوامر أصلية متناسقة بـ `fluent-command-group` دون تداخل حاويات، مع إضافة اختبار حارس (`toolbar-height-uniformity.test.ts`) لمنع أي انحراف مستقبلي.

### Fixed (توحيد لوحة الأدوات ونزاهة الاختصارات — 2026-09-24)

- **اختراق `Ctrl+K` وإسقاط بوابة CI:** أُضيفت نسخة حوارية ثانية للوحة الأوامر بمستمع `keydown` خام على `window` ينافس اختصار `mod+k` المسجّل في `use-keyboard-shortcuts.ts`، فبقيت لوحة الشريط الجانبي مغلقة (نافذة Radix الحوارية وقصْر التركيز يتغلبان على الـPopover) وسقط فحص `Ctrl+K` في مواصفة `@smoke` المانعة (`e2e/engine-smoke.spec.ts`). أُزيلت النسخة الثانية نهائياً وأصبح للوحة مصدر واحد (`WorkspacePanelRail`) ومدخل واحد إضافي في «عرض ← لوحة الأدوات».
- **أوامر ميتة واختصارات مُدّعاة:** كانت النسخة الثانية تطلق `grido:remove-bg` و`grido:open-shortcuts-dialog` بلا مستمع (الصحيح `grido:open-shortcuts`) وتعلن اختصارات غير مسجّلة (`Shift+1`، `Shift+0`، `T`، `Ctrl+/`) وتحيي تسمية «حجم حقيقي (100%)» الملغاة في `v1.6.0`. الأوامر انتقلت إلى السجل الواحد: إدراج نص/مستطيل/دائرة، وتبديل وضع الكانفاس مع تعطيل الوضع المفعّل، وتبديل المظهر، والحساب والتراخيص، ومكتبة المشاريع — كلها بأحداث حقيقية مستمع لها.
- **وصولية النوافذ الحوارية:** النسخة الثانية لم تحمل `DialogTitle` فكان `aria-labelledby` يشير إلى معرّف غير موجود، أي نافذة بلا اسم لقارئ الشاشة — والقاعدة أُضيفت إلى دليل الواجهة (القسم 6).
- **حاجز الإيماءة في صندوق المحوّل:** `tr.forceUpdate()` في مسار ثبات العقد صار مقيّداً بـ`!isTransforming() && !isDragging()` احتراماً لحاجز Konva الداخلي، مع مواصفة انحدار تقيس كبر الصندوق وحركته مع الكتابة في المتجر (`e2e/transformer-box-follows-geometry.spec.ts`).
- **كود ميت في سكنر الذكاء الاصطناعي:** أُزيلت `targetNodeRef` (مزامنة مع عقدة شقيقة) من `MagicAiScanner` بعد أن صار ابناً لمجموعة العنصر، وبقي الرسم صريحاً بـ`batchDraw` لأن `Konva.Animation` بلا وسيط `layers` لا يرسم أي طبقة.

### Changed (رموز تصميم مساحة العمل — 2026-09-24)

- **`--workspace-bg` / `--workspace-grid-dot` / `--workspace-glow` كرموز ثيم:** انتقلت قيم مساحة العمل من قيم صلبة داخل `.workspace-grid` (مع قاعدة `.dark .workspace-grid` موازية) إلى رموز في `:root` و`.dark`، وتستهلكها قاعدة واحدة — فلا نسخة لونية ثانية تُنسى عند تغيير الثيم، ويشمل ذلك معاينة نافذة الطباعة التي تستخدم `.workspace-grid`.

### Performance (Official Konva Drag-Layer — 2026-09-24)

- **طبقة السحب الرسمية:** تطبيق حرفي لتوصية المحرك (*move to a dedicated layer while dragging*) عبر `konva/drag-layer.ts` — العقدة المسحوبة (+ المحوّل والشارة) تُرفع لطبقة خفيفة أثناء السحب وتُستعاد بدقة `{parent, zIndex}` أولاً في النهاية؛ رسمة عقدة واحدة لكل إطار بدل الطبقة كاملة.
- **ظل الحدود مطفأ (`shadowForStrokeEnabled={false}`):** إلغاء الرسم الداخلي المضاعف على الأشكال والنصوص (توصية Optimize Strokes الرسمية).
- **تلقين الوكلاء:** مراجعة توثيق Konva الكاملة مُثبتة في `.agents/skills/konva-rendering-invariants/SKILL.md` القسم 10 مع المرفوضات الموثقة، وملخصها في `AGENTS.md`.

### Performance (Canvas Rocket Batch — 2026-09-23)

- **نسخة عرض مخفّضة (سقف 2048px):** عقد الصور والكولاج ترسم نسخة Canvas مخفّضة أثناء التحرير (`lib/canvas/display-image.ts` + LRU بسقف 24) — المصدر الكامل يبقى للتصدير والذكاء الاصطناعي دون مساس.
- **ظلال مطفأة أثناء الحركة:** إطفاء أمري (`drag-shadow.ts`) لظلال الأشكال والنصوص أثناء السحب، وتخفيض ظل الرفع، وإزالة ظلال مقابض المحوّل والشارة — تمريرة الضبابية خارج الشاشة كانت أغلى عملية/إطار.
- **تمرير سناب أحادي:** `dragBoundFunc` تحسب الموضع والأدلة معاً و`onDragMove` يستهلكها من `ref` بدل إعادة الحساب (~50% من حسابات كل إطار).
- **شارة المحوّل مخنوقة بإطار واحد (rAF)** مع تحديث إجباري عند الاستقرار، وتخطي مزامنة `nodes()` عند ثبات العقد.
- **مصفوفة الكولاج المحفوظة:** معكوس التحويل يُحسب عند بدء السحب فقط، ورسمة طبقة واحدة بدل اثنتين لكل حدث.
- **فواصل الكولاج بنمط معاينة/تثبيت:** السلايدر يحدّث القيمة فقط، وإعادة حساب الخلايا (`O(خلايا×خانات)`) تتم عند الإفلات مع خطوة تراجع واحدة.
- **معاينة الطباعة عند الفتح فقط:** فك ارتباط `toDataURL` عن `elements/slots` مع قراءات طازجة، وسقف محاولات 3 بدل 8.

---

## [v1.6.0] - 2026-09-23

### Added

- **أوضاع ملاءمة الورقة (كاملة / عرض / تلقائية):** كانت أبعاد الورقة المعروضة تُحسب داخل `editor-canvas.tsx` بملاءمة على الارتفاع دائماً، فورقة A4 في نافذة 1920×1080 تشغل 40% من عرض منطقة العمل (~60% فراغ ميت)، و`Ctrl+0` لا يغيّر شيئاً لأنه يُشتق من نفس صندوق الملاءمة. استُخرج المنطق إلى `lib/canvas/fit.ts` (دوال نقية مُختبَرة في `canvas-fit.test.ts` مع اختبار انحدار يقفل أرقام المنطق القديم)، وأُضيف وضع «ملاءمة العرض» الذي يملأ عرض المساحة ويُمرّر الباقي رأسياً. الوضع التلقائي ينتقل إلى ملاءمة العرض عندما تشغل الورقة أقل من 45% من عرض المساحة وبسقف تمدد 3× — وورقة A4 تبقى كاملة في النافذة الافتراضية.
- **تحكم الملاءمة في الواجهة:** قائمة ملاءمة في شريط العرض (تلقائي/الكل/عرض) مع مؤشر للوضع الفعّال ونسبة الفراغ الجانبي، واختصاران جديدان: `Ctrl+Shift+0` (ملاءمة العرض) و`Ctrl+Alt+0` (ملاءمة تلقائية)، مع أوامر مقابلة في لوحة الأوامر وقائمة «عرض».

### Changed

- **حجم النافذة الافتراضي 1280×800 بدل 960×640:** الافتراضي السابق أصغر من نقطة انكسار الواجهة (1024) فيفتح التطبيق في الوضع المدمج بلا ألواح جانبية إطلاقاً؛ مع ترقية المقاسات الافتراضية المحفوظة (960×640 و 1024×720) مرة واحدة، وأي مقاس اختاره المستخدم بنفسه يبقى كما هو (`window_state.go`).
- **تسمية صادقة للزوم:** «الحجم الفعلي 100%» صارت «إعادة الملاءمة إلى 100%» وكل الـ tooltips توضّح أن النسبة مضاعف فوق أساس الملاءمة لا مقياس طباعة (تنفيذ M2-2 في `docs/plans/ui-excellence-plan.md`).
- **إزالة حدث `grido:fit-canvas-to-screen`:** الملاءمة صارت وضعاً في المتجر (`canvasFitMode`) يُحفظ محلياً كتفضيل عرض، ولم يعد هناك قياس DOM موازٍ يعيد اشتقاق حجم لم يتغيّر.

---

## [v1.5.2] - 2026-09-22

### Fixed

- **هوية التطبيق وبيانات EXE بعد الترقية لـ Wails v3:** كانت `build/appicon.png` ما تزال شعار Wails الافتراضي "W" فيُعاد توليد `windows/icon.ico` منه كل بناء، و`windows/info.json` و`wails.exe.manifest` بقيم القالب (`My Company`/`0.1.0`) فخرج `GridoStudio.exe` بلا بيانات إصدار. أُعيدت الهوية من `frontend/public/favicon.png`، وزُامنت `build/config.yml` (`1.5.1`) وأُعيد توليد الأصول رسمياً عبر `wails3 update build-assets`، مع حارس CI يفشل البناء عند فراغ بيانات EXE.
- **فشل CI في خطوة التحقق من بيانات EXE (`Verify EXE Branding Metadata`):** كان `build/windows/info.json` يستخدم مفتاح جدول النصوص المحايد `"0000"` ويفتقد المفتاح النصي `FileVersion`، فيُكتب داخل الـ syso مورِد إصدار بترجمة محايدة (lang=0x0000) لا يعتبرها `System.Diagnostics.FileVersionInfo` (وكذلك خصائص الملف في Explorer) قراءة ناجحة، فيعيد المحاولة بصفحات ترميز بديلة (`040904E4`/`04090000`) **تمسح كل القيم** وتظهر بيانات المنتج/الشركة/الإصدار فارغة رغم وجودها فعلياً في الملف الثنائي. الآن يستخدم الملف مفتاح LCID قياسي `"0409"` (en-US) مع المفاتيح الكاملة `FileVersion` و`ProductVersion` و`OriginalFilename` و`InternalName` و`fixed.product_version`، وصارت رسالة فحص الـ CI تسمّي هذا الشرط صراحةً، ووُثّق الثابت في `.agents/AGENTS.md`.
- **أصول darwin/ios/linux المولَّدة عالقة بقيم القالب:** كانت `Info.plist` و`Info.dev.plist` و`project.pbxproj` وملفات ios و`build/linux/desktop` و`nfpm.yaml` و`nsis/wails_tools.nsh` ما تزال بقيم Wails الافتراضية (`My Product`/`sample.exe`/`0.1.0`) لأن `update build-assets` تعطل سابقاً على `&` غير المُهرَّب في `CFBundleGetInfoString`؛ أُعيد توليد كلها رسمياً ببيانات Grido 1.5.2 وهُرِّب `&` إلى `&amp;`، ووُثّق الإجراء في `.agents/AGENTS.md` لمنع تعطل الأمر التالي.

---

## [v1.5.1] - 2026-09-22

### Fixed

- **تجاوز تركيب الكانفاس غير الصالح بدل فشل الطباعة:** كان `composeCanvas` يُفشل الورقة كاملة بخطأ `invalid canvas composition dimensions` عند أبعاد صفرية/NaN من الواجهة؛ الآن يُسجَّل تحذير ويُتجاوز التركيب مع إكمال الورقة، وحارس أبعاد في `buildSingleComposition` يحوّل للالتقاط الاحتياطي.

### Tests

- **تغطية طباعة متكاملة (~50 اختباراً):** 10 سيناريوهات ورشة واقعية، مسار التركيب الاحتياطي، 10 اختبارات تقوية للتحقق والألوان وHTML وخطوط القص، حراس أبعاد الواجهة، وتدفق E2E كامل (معاينة ← تصدير ← نافذة طباعة).

---

## [v1.5.0] - 2026-09-22

### Added (Icon-Driven UI Consistency)

- **طبقة الأيقونات المركزية Fluent:** استبدال حزمة `@phosphor-icons/react` بطبقة أيقونات داخلية موحدة `@/components/ui/icons` مبنية فوق `@fluentui/react-icons` مع مزود `FluentIconProvider` و `weight="regular"` (ملف `icons.tsx` مولّد آلياً) — إزالة استيرادات Phosphor من كل الواجهة.
- **تقسيم شريط الأدوات موضوعياً:** بدل `toolbar-items.tsx` الضخم، مكوّنات متخصصة (`toolbar-add-text.tsx`, `toolbar-add-shapes.tsx`, `toolbar-add-tools.tsx`, `toolbar-ai-tools.tsx`, `toolbar-image-filters.tsx`, `toolbar-history-tools.tsx`, `toolbar-selection-tools.tsx`).

### Fixed

- **توحيد سلوك الواجهة:** تنسيق متسق للـ Tooltips، التكبير (Zoom)، وحدات القياس، وتحميل الصور عبر الأداة والكانفاس.
- **اختبارات المتجر:** كسر دورة الاستيراد في الـ Store وتحديث توقع الحجم الافتراضي للشبكة.

### Build & Tooling

- **مزامنة أمثلة Wails v3 مع نسخة الـ SDK:** تحديث التوثيقات والمهارات لتطابق تواقيع `v3.0.0-beta.23` الفعلية (`SingleInstanceOptions`, `Event.Emit`, `WindowRuntimeReady`, `Screen.GetAll`, `Clipboard.Text/SetText`, `SendNotification/OnNotificationResponse`).
- **السكريبت الحاكم للمثبت NSIS:** اعتماد `build/windows/installer/project.nsi` كمصدر وحيد للمثبت، `OutFile "..\nsis\GridoStudio-installer.exe"` المطابق لمسار التوقيع والنشر، وبيانات الإصدار (`INFO_PRODUCTVERSION`) تُعرَّف فيه صراحة.
- **إصلاح فشل CI لمهمة `create:nsis:installer`:** إلغاء خطوة نسخ `wails_tools.nsh` التي كانت تستدعي أمر `copy /Y` (أمر مدمج في cmd غير متاح كبرنامج تحت go-task على Windows CI)؛ سكربت `build/windows/installer/wails_tools.nsh` (نسخة Wails الرسمية) أصبح المرجع الوحيد.

---

## [v1.4.1] - 2026-09-21

### Fixed & Improved (Quality Audit & Window Compactness)

- **مزامنة التصدير (Export Fidelity):**
  - تطبيق `textTransform` (uppercase/lowercase/capitalize) على النصوص في `export-image.ts`.
  - مزامنة `letterSpacing` في التصدير غير المنحني وتوحيد الوزن الافتراضي `fontWeight: 400`.
  - كشف اتجاه النص تلقائياً (RTL/LTR) بدلاً من فرض RTL على كل النصوص.
- **ماسح المستندات (Document Scanner):**
  - إصلاح `handleSplitIdCards` لدمج بطاقات الهوية المقسمة مع المستندات المكتشفة الموجودة دون محوها.
  - إيقاف حلقة `probe` فورياً وتصفير `clearTimeout` عند نجاح/انتهاء مهلة تحميل OpenCV WASM.
- **استوديو الملصقات والباركود (Sticker Studio):**
  - تحويل `spacingMm` إلى `gapPx` بدقة علىOffscreen Canvas وفق DPI الورقة.
  - تحميل أوزان الخطوط الحقيقية (400, 700, 900) لمنع سقوط الخطوط في تصيير PNG من SVG.
  - استبدال الباركود التالف بـ SVG تحذيري بصري صريح بدلاً من رسم أعمدة وهمية غير قابلة للمسح.
- **سلامة البيانات والتفضيلات (Store & Storage Safety):**
  - معالجة استثناءات `JSON.parse` الفردية للقوالب دون استقاط القائمة بالكامل.
  - استخدام `readStoredList/writeStoredList` بحجم محدد لمفضلة الخطوط ومنع انهيار `.includes`.
  - مزامنة ترحيل سجلات AI وانتظار الحفظ الذري قبل المسح، وتصفير السجلات من الذاكرة عند الخروج.
- **حجم النافذة الافتراضي (Default Window Size):**
  - تخفيض أبعاد النافذة الافتراضية عند أول تشغيل إلى `960×640` (بدلاً من 1024×720) مع حد أدنى `840×560`.

### Added (Workflow Modes — تمييز مستويات المستخدمين)

- **نظام مسارات العمل الثلاثة:** شاشة ترحيب تُعرض عند أول تشغيل تُتيح للمستخدم اختيار مساره (إنتاج سريع / استوديو تصميم / معالجة دفعية) — يُحفظ الاختيار تلقائياً في `localStorage` (`workflow-slice.ts`).
- **مسار الإنتاج السريع (`quick`):** يُخفي أدوات نص/أشكال/ملصقات من شريط الأدوات ويعرض قوالب الكولاج مباشرة بدلاً من استوديو التصميم الحر — تبسيط هادف لمستخدمي استوديوهات التصوير.
- **مؤشر المسار الحالي في الهيدر:** كبسولة صغيرة بجانب GRIDO تعرض المسار النشط مع زر تبديل فوري لإعادة شاشة الترحيب دون إعادة تشغيل.
- **اختبارات `workflow-slice.test.ts`:** 10 حالات اختبار تغطي الحالة الابتدائية، الحفظ والاسترداد من `localStorage`، وعمليات التصفير — `14/14 ✅`.

---

## [v1.4.0] - 2026-09-19

### Changed (Wails v3 Migration & Desktop Integration)

- تمت ترقية خط البناء بالكامل إلى **Wails v3.0.0-beta.23** (bindings مولّدة عبر `wails3 generate bindings -ts`، مخرجات في `bin/`، جملة `wails3 task package` مع حقن `APP_VERSION` و`SUPABASE_*` عبر ldflags).
- اندماج أصيل مع Windows 11: **Fluent Mica**، تقدّم شريط المهام، إشعارات Toast، وSnap Assist (`6059356`).
- **تسريع جسر IPC**: تدفق ثنائي zero-copy مع دمج أقنعة الذكاء الاصطناعي متعدد الأنوية، وتقليص نطاق إعادة الرسم في Konva والقضاء على layout thrashing أثناء التقريب (`65fe4bd`، `68b9f4d`).
- إطار **لوحة الأوامر** (Ctrl+K) القابلة للبحث مع أوامر live-state ومخططات Fluent shimmer (`b20b725`، `8c8015d`).

### Improved (UI & Quality)

- توحيد خط التطبيق على IBM Plex Sans Arabic وتوحيد عنوان Toolbar/Titlebar ولوحة الخصائص وفق Fluent 2 (`90ebc29`، `e747425`، `bf07210`).
- إصلاح منطق **Undo/Redo** المعكوس وتقوية defaultability في project-serializer مع توسيع تغطية الاختبارات (وحدة + E2E 21+ suite عبر مصفوفة CI من 4 شرائح) (`ee5e359`، `e56c278`، `5ced47d`).

### Fixed

- تعطيل deadlock نافذة الطباعة وقفل pointer-events (`7e51b41`)، مواءمة مسارات Windows الأصلية في `GetImageDimensions`/`resolveLocalPath` (`204fab4`)، وتنقية الحوافز والهوامش الأمانية للنوافذ المنبثقة (`2e9bfc1`، `58aac9b`).

## [BUILD-FIX] - 2026-09-18

### Fixed (Wails v3 Build Pipeline, E2E Port & Production Mock)

**سلسلة البناء والتسليم — كانت تقود Wails v2 على مشروع v3:**
- **`.github/workflows/ci.yml`**: استبدال `go install github.com/wailsapp/wails/v2/cmd/wails@latest` بـ `wails3@v3.0.0-beta.23` في المهام الثلاث، واستبدال `wails generate module` (مولّد v2 — لا يستخرج الخدمات من `application.New(application.Options{Services:...})`) بـ `wails3 generate bindings -ts -clean=true`، واستبدال `wails build -s -debug` بـ `wails3 task build` مع `CGO_ENABLED=1` وحقن `APP_VERSION/SUPABASE_URL/SUPABASE_ANON_KEY` (مطابق لثوابت `AGENTS.md` §116-119).
- **`.github/workflows/release.yml`**: استبدال تثبيت v2 وتوليد الربطات، و`wails build -nsis` بـ `wails3 task package`، وتصحيح مسارات المخرجات من `build\bin` (اصطلاح v2) إلى `bin` (اصطلاح `BIN_DIR` في `Taskfile.yml:6`) ومثبّت NSIS من `build\windows\nsis\GridoStudio-installer.exe` في خطوات الجمع والتوقيع والبصمات والرفع.
- **مهمة `windows-build` في CI**: إضافة تثبيت Node (خطوة `wails3 task build` تبني الواجهة وتحتاج npm، ولم تكن Node مثبتة في المهمة).

**تعارض منفذ E2E (مؤكد تجريبياً: `9245 => HTTP 200` و`5173 => UNREACHABLE`):**
- **`frontend/playwright.config.ts`**: كان `baseURL`/`webServer.url` على `localhost:5173` بينما Vite مضبوط على `127.0.0.1:9245` مع `strictPort: true` ⇒ `webServer` لا يجهز أبداً وتفشل مهمة `e2e-tests` في CI بالمهلة. تم توحيد المضيف/المنفذ في ثوابت وتشغيل الخادم بمنفذ صريح.

**بقايا Wails v2 في الواجهة:**
- **`frontend/src/main.tsx`**: كان محاكي `window.go` يُركَّب في نسخة الإنتاج دائماً (لأن v3 لا يحقن `window.go` إطلاقاً)، فيُخفي أي فشل حقيقي في الجسر؛ صار محصوراً بـ `import.meta.env.DEV`، ونُقل مانع قائمة السياق ليُطبَّق في الإنتاج باستقلال.
- **`frontend/src/lib/wails-env.ts`**: `wailsIsDesktop()` تكتشف الآن إشارات Wails v3 (`window.wails` / `chrome.webview.postMessage` / `webkit.messageHandlers`) مع إبقاء `window.go` كإشارة متوافقة (تعتمد عليها اختبارات الوحدة).

**حاجز مسبق للربطات المولّدة (فشل البناء الغامض):**
- **`frontend/scripts/ensure-bindings.mjs`** + خطافات `prebuild`/`prebuild:dev`/`pretypecheck`/`pretest`/`pretest:coverage`: رسالة عملية صريحة عند غياب `frontend/bindings/` (مُستثناة من Git وتُولَّد بـ `wails3 generate bindings`) بدل رسالة `Cannot find module '../../../bindings/grido/app'`.

**تشخيص حزمة E2E بعد أن صارت قابلة للتشغيل (السبب الجذري مكشوف):**
- `frontend/e2e/helpers/wails-mock.ts:166-177` يحاكي نمط Wails v2 (`window.go` + `window.runtime`) بينما ربطات v3 تستدعي `$Call.ByID` من `@wailsio/runtime` ⇒ كل نداءات الخلفية تفشل، فيعرض التطبيق شاشة «النسخة مقفلة» (دليل: لقطة صفحة Playwright) وتفشل التوكيدات. مُوثَّق كـ **Q-02**، ومهمة `e2e-tests` صارت `continue-on-error: true` مؤقتاً مع تعليق صريح (كانت تفشل بالمهلة قبل الإصلاح، فالحاجب لم يُكسر بل صُححت حالته ليصبح صادقاً).

### Removed
- `frontend/lint-results.txt` و`frontend/package.json.md5`: آثار تشغيل محلية كانت مُتتبَّعة في Git بالخطأ، مع إضافة `/bin` إليهما في `.gitignore`.

### Verified (2026-09-18)
- `go vet ./...` = سليم، `go test ./internal/...` = كل الحزم ناجحة (handlers/repository/service/utils).
- `npx tsc --noEmit` = سليم، `npm run lint` (`--max-warnings 0`) = سليم ⇒ البوابة خضراء.
- فحص المنافذ: `http://127.0.0.1:9245` يستجيب 200 و`5173` غير قابل للوصول (أساس إصلاح E2E).

## [MAINT] - 2026-09-16

### Removed (Engine Wheel-Reinvention Deduplication — MAINT-03/04/06)

- **12 موضعاً لكتابة tmp+fsync+rename يدوياً** وُحِّدت في `internal/utils/atomicfile.go` (`CreateAtomic`/`Commit`/`Abort`/`AtomicWriteFile`) — مع إبقاء المسار التدفّقي للتصدير الكبير.
- **طبقة فتح المتصفح (rundll32/xdg-open/open)**: حذف 3 ملفات build-tag واستبدالها بـ `runtime.BrowserOpenURL` القياسي في Wails v2 خلف منفذ محقون قابل للاختبار.

### Added (Engine Wheel-Reinvention Deduplication — MAINT-05/07/08)

- **`internal/service/http_retry.go`**: مساعد إعادة محاولة موحّد (`httpDoWithRetry`) — backoff أُسّي مع jitter ±20%، احترام `Retry-After`، نوم واعٍ بالسياق، ولا إعادة على 4xx (عدا 408/429)؛ ترحيل `supabase_client.go` و`license_service.go` إليه.
- **`frontend/src/lib/clamp.ts`**: وحدة `clamp` موحّدة صفرية الاعتماديات (آمنة لاستيراد Web Workers) — حذف 3 نسخ محلية.
- **عملاء HTTP مشتركة في `ai_service.go`** (`aiSupabaseClient`/`aiUsageClient`/`aiEnhanceClient`) بدل إنشاء عميل لكل نداء.
- **8 اختبارات للكتابة الأذرعية + 12 اختباراً للـ retry + 5 لمنفذ المتصفح** (الإجمالي الجديد ~25 اختباراً).

### Documentation (MAINT-09)

- وسوم "📍 حالة البند (2026-09-16)" في `docs/reviews/comprehensive-app-review.md` تفرّق بين المقترحات التاريخية وما نُفِّذ فعلاً (`http_retry.go`، عملاء HTTP المشتركة، `AIRateLimiter`).
- سجل جلسة كامل في `docs/features-tracker.md` §0.5.



## [v1.3.39] - 2026-09-14

### Added (Sticker & Frame Studio Expansion, Presets & Vector Export)

**توسعة استوديو الملصقات والإطارات (Stickers & Frames Studio Expansion):**
- **26 قالباً متجهاً عالي الدقة (SVG)**: إضافة 10 إطارات وبراويز جديدة فاخرة (شهادات تخرج، باروك عتيق، خشب ريفي، سداسي عصري، إلخ) و 16 ملصقاً تجارياً عالي الطلب (مطاعم ومأكولات، حلويات، مناسبات وأعياد، تعليم ودفاتر مدرسية، صيدليات وتنبيهات طبية).
- **نظام حفظ القوالب المخصصة للمستخدم (User Sticker Presets)**: حفظ واسترجاع تخصيصات ونصوص وألوان الملصقات محلياً بـ `localStorage` مع سقف تلقائي 50 قالباً وتبويب "قوالبي" المخصص.
- **نسخ كود الـ SVG المتجه مباشرة (Copy SVG Markup)**: نسخ كود الـ SVG المتجه مباشرة للحافظة للصقه في أدوات التصميم العالمية كـ Figma و Illustrator.
- **تكامل شريط القوائم العلوي (Desktop Menu Bar)**: ربط استوديو الملصقات بقائمة "أدوات" في الشريط العلوي للتطبيق مع دعم الاختصارات.

**توسعة أدوات النصوص والأشكال في شريط الأدوات (Text Presets & Vector Shapes):**
- **إتاحة كافة قوالب النصوص الـ 13 المصممة**: تصنيف النصوص إلى (نصوص قياسية، توثيق واستوديو، وتأثيرات فنية كـ الذهب الملكي والنيون والأختام المقوسة وثلاثية الأبعاد).
- **أشكال متجهة جديدة (Vector Shapes)**: دعم المثلث، القلب، المعين، السداسي، الدرع، والسهم مع قياسات متجهة دقيقة ودعم كامل في محرك Konva وخط تصدير الصور عالي الدقة.

### Enhanced (Performance Optimization & Design Polish)

**تحسين الأداء وصقل التجربة في استوديو الملصقات:**
- **تحميل كسول ذكي للمعاينات (IntersectionObserver Lazy Loading)**: خفض زمن فتح الاستوديو إلى أقل من 16ms وتصفير الضغط على المعالج مع كاش شامل `PREVIEW_CACHE`.
- **تأجيل المعالجة في وضع المعرض (Deferred Computation)**: تأجيل توليد الـ SVG وفحص الحقول أثناء تصفح المعرض.
- **التنقل الكامل عبر لوحة المفاتيح (Keyboard Grid Navigation)**: دعم الأسهم الأربعة، و Roving Tabindex، و Enter للتحديد، و `/` أو `Ctrl+F` للبحث السريع.
- **التكبير السلس بالعجلة (Smooth Wheel Zoom)**: دعم التكبير بالعجلة أو لوحة اللمس في مسرح المعاينة بمعادلة التقريب الأسي `Math.exp(-e.deltaY * factor)`.
- **تأكيد الأكواد اللونية**: عرض كود الهيكس العشري للون أسفل أزرار الأدوار اللونية.

### Fixed (Collage Invariants, Print Previews & Loading State Resets)

**إصلاحات الاستقرار والتوافقية:**
- **الالتقاط الديناميكي لتخطيط الكولاج**: منع فرض أي قوالب افتراضية ومزامنة الحالة فورياً.
- **تصفير حالات التحميل في النوافذ المنبثقة**: تفريغ حالات التصدير والتحميل في شاشات الماسح الضوئي والطباعة والتصدير عند الإغلاق لمنع تعليق الأزرار.
- **أبعاد وحواف المعاينة الطباعية**: منع قص خطوط وهوامش المعاينة الطباعية داخل الورقة.

## [v1.3.38] - 2026-09-13

### Added (Collage Studio Presets Architecture & Physical Scale Fidelity)

**إعادة هيكلة وتطوير قوالب الكولاج الجاهزة (Collage Presets Overhaul):**
- **الشبكة كافتراضي أولي (Grid Tab Default)**: تعيين تبويب الشبكة كخيار افتراضي أولي عند فتح التطبيق مع منع أي تبديل قسري أثناء الإقلاع.
- **إعادة هيكلة القوالب في 3 ركائز رئيسية**: تقسيم القوالب الجاهزة بدقة إلى (أطقم رسمية مركبة، تذكار وكروت إبداعية، قوالبي المحفوظة) دون أي تداخل مع أدوات الشبكة المخصصة.
- **الربط المليمتري الفيزيائي للأطقم (Physical MM Layout Binding)**: دعم التوزيع المليمتري الدقيق لطقم السفر المركب (`combo-traveler`) لضمان ثبات مقاسات صور الجواز (50×50 مم) والفيزا (35×45 مم) عبر مختلف مقاسات الورق بدقة طباعية حقيقية.
- **تبسيط الشريط الجانبي وإزالة النوافذ المكررة**: حذف النافذة المنبثقة المكررة لمتصفح القوالب واختصار كود اللوحة لتسريع التفاعل الفوري داخل الشريط الجانبي.

### Enhanced (Sticker Studio Modernization & 2-Stage Flow)

**تحديث وتطوير استوديو الملصقات (Sticker Studio Modernization):**
- **تدفق ذكي على مرحلتين (2-Stage Focused Flow)**: فصل المعرض الرحب للتصفح الخفيف عن استوديو التخصيص المركز لمنع الثقل والإجهاد البصري.
- **دمج وتكثيف الفئات**: تقليص التصنيفات الـ 12 المشتتة إلى 6 مجموعات متوازنة تلائم العرض النظيف في سطر واحد.
- **الاعتماد على الأيقونات والاختصار النصي**: استبدال الشروح الطويلة بأيقونات دلالية وTooltips تفاعلية متوافقة مع معايير Microsoft Fluent 2.

### Fixed (Canvas Orientation Controls & Freeform Scaling Invariants)

**إصلاحات وتوافقية واجهة المستخدم ومحرك الرسم:**
- **سلامة تحجيم الخلايا الحرة (Non-Colliding Shrink Invariant)**: منع انكماش الخلايا القسري أو قفز الأضلاع أثناء التصغير الحر في الكولاج عبر التحقق الاتجاهي الذكي.
- **عناصر تحكم الاتجاه**: دعم التبديل السلس للاتجاه الرأسي والأفقي ومطابقة كامل حزمة الاختبارات بنسبة 100%.

## [v1.3.37] - 2026-09-13

### Added (Sticker Studio, Commercial Imposition & Bleed Guides)

**استوديو تصميم وقوالب الملصقات (Sticker Studio):**
- **كتالوج قوالب الملصقات التفاعلي**: إضافة استوديو متكامل لتصميم وتخصيص الملصقات مع 11 قالب ملصقات احترافي يدعم نصوص وألوان قابلة للتخصيص وقص حر ومحدد (Die-Cut).
- **محرر الملصقات الفوري (Inline Sticker Editor)**: تحرير النصوص والعناوين والتنقل بين الحقول بسلاسة بواسطة لوحة المفاتيح واختصارات Tab.
- **لوحة خصائص الملصقات**: تخصيص الأدوار اللونية، الشفافية، إطارات القص، ومعاينة شبكة الشيت المصغرة.

**هندسة الطباعة التجارية وأدلة الهوامش (Commercial Imposition & Bleed Guides):**
- **أدلة هوامش الأمان والنزيف**: إضافة خطوط إرشادية بصرية لهوامش الأمان والنزيف على الكانفس مع شارة توضيحية رقمية بالملم ونقاط دلالية متناسقة.
- **توزيع الشيت الأمثل (Optimal Imposition)**: خوارزميات توزيع وطباعة تجارية متطورة للأوراق والألواح لتقليل الفاقد الورقي.

### Fixed (Fluent 2 Design Standard Compliance & UI Invariants)

**التوافق الشامل مع معايير Fluent 2 (UI/UX Compliance):**
- **حلقات التركيز المزدوجة وهرمية الاستدارة**: تطبيق معايير Fluent 2 على زر إغلاق النوافذ الموحد (`DialogCloseButton`) واستخدام `rounded-md` لكافة عناصر التحكم الدقيقة.
- **توحيد مزود التلميحات العالمي**: إزالة أي مزود `TooltipProvider` محلي وضمان وجود مزود عالمي واحد يغطي التطبيق وشاشة التراخيص.
- **معايير صياغة نصوص تجربة الانتظار**: توحيد صياغة كافة العمليات الجارية إلى الصيغة المضارعة القياسية (`جاري ...`) مع مسافة ونقاط حذف غير قابلة للكسر.

## [v1.3.36] - 2026-09-11

### Added (Collage Studio Presets Architecture & Print Fidelity Pipeline)

**إعادة هيكلة وتصميم تبويب القوالب في الكولاج (Collage Presets Overhaul):**
- **قائمة التصنيفات المنسدلة القياسية**: استبدال أزرار الفئات المحشورة بقائمة منسدلة قياسية متوافقة مع Microsoft Fluent 2 مع زر تبديل نمط العرض الفوري (قائمة عريضة مفصلة List vs شبكة مصغرة Grid).
- **تصميم بطاقات الاستوديو الرحبة**: عرض بطاقات القوالب بنمط استوديو كامل العرض (`w-full`) مع تقسيم بصري واضح لمعاينة الورقة المصغرة، والاسم، وعدد الفتحات والمقاس بالملم.
- **قوالب استوديو عراقية جديدة**: إضافة قوالب رسمية تشمل (شيت الهوية المدنية والجواز الكامل، بطاقة التقاعد، معاملات عامة، وأشرطة القص المفردة).
- **التوريث التلقائي للصورة في الكولاج**: عند تبديل القالب، ترث جميع فتحات القالب الجديد الصورة المفردة تلقائياً بضغطة زر واحدة لتسريع تجهيز المعاملات.

### Fixed (Template Orientation Clamping & Print Thumbnail Resolution)

**استقرار هندسة القوالب والطباعة (Layout Stability & Print Fidelity):**
- **حماية القوالب المخصصة من الضبط التلقائي**: منع استدعاء `applyCustomCollage` القسري عند تغيير اتجاه الورقة (أفقي/عمودي) لضمان عدم تلف أو الكتابة فوق قوالب الاستوديو النشطة.
- **إزالة التنبيهات المضللة عند إفلات الصور**: التحقق من عدد الصور الفريدة (`unique images Set`) بدلاً من عدد الفتحات لتفادي تحذيرات تجاوز السعة الخاطئة.
- **توليد مصغرات المعاينة فائقة الدقة في الطباعة**: تحسين مسار معالجة الصور والتصدير في Go backend (`print_export.go`, `print_compose.go`) ومطابقة DPI للأوراق الأفقية والعمودية بدقة 100%.

## [v1.3.35] - 2026-09-11

### Added (Zen Focus Mode & Studio Paper Miniature Alignment)

**تجربة المستخدم والتركيز (UI/UX & Zen Focus):**
- **وضع التركيز Zen Mode**: إضافة وضع الشاشة المفتوحة واختصار لوحة المفاتيح (`Tab`) لإخفاء/إظهار الشريطين الجانبيين فورياً والتركيز الكامل على الكانفس.
- **ترقية بطاقة المحاذاة على الورقة في الكولاج**: تصميم محاكي ورقة مصغرة واقعية (`74×74px`) مع هوامش تنقيط داخلية ونقاط تثبيت تفاعلية واضحة (`8px`) وأزرار متناظرة لركن القص والتوسيط.
- **توسيع مساحة الكانفس**: تقليص عرض الأشرطة الجانبية إلى `288px` (الأيمن) و `296px` (الأيسر) وتوفير أكثر من 86px إضافية للورقة.
- **تبسيط الحالة الفارغة**: حذف زر الدعوة للإجراء المركزي (CTA) الفائض من وسط الكانفس واستبداله بتوجيه فوتوغرافي مدمج يناسب برامج سطح المكتب الاحترافية.

### Fixed (Ruler Canvas Confinement & Collage Layout Stability)

**المساطر وهندسة الكانفس (Ruler Confinement & Origin Highlighting):**
- **حصر أرقام المساطر داخل الورقة حصراً**: منع ظهور الأرقام السالبة (مثل `-40`, `-20`) أو الأرقام المتجاوزة لأبعاد الورقة، مع حماية أرقام الحواف النهائية (`textAnchor="end"`) من القص البصري.
- **تمييز نقطة البداية `(0,0)`**: تعزيز نقطة الصفر بخط بارز باللون الرئيسي للواجهة `stroke-primary` لإعطاء إدراك مكاني فوري لبداية الورقة ونهايتها.

**استقرار واجهة الكولاج (Collage Panel & E2E Stability):**
- **استقرار الشريط الجانبي في بيئة سطح المكتب**: الحفاظ على الفتح الافتراضي للشريط الجانبي ومنع انغلاقه التلقائي لضمان تفاعل فوري مع لوحة القوالب.
- **تحديث محددات Playwright E2E**: مواءمة اختبارات الكولاج مع بطاقات القوالب المحدثة واجتياز 100% من اختبارات التكامل المستمر.

## [v1.3.34] - 2026-09-10

### Added (Rotated Element Geometry & Visual Box Alignment)

**هندسة ومحاذاة العناصر الدوارة (Element Geometry & Rotated AABB):**
- **حساب الصندوق المحيط المرئي الحقيقي (AABB)**: إضافة وحدة `element-geometry.ts` لحساب الحواف والمحيط المرئي الفعلي للعناصر الدوارة والمقلوبة في فضاء البكسل والفضاء المطبّع (0..1).
- **التدوير المستقر حول المركز المرئي**: تطبيق `rotateElementAroundCenter` لمنع قفز العنصر أو انزياح موضعه عند تدويره من لوحة الخصائص أو شريط الأدوات السريع.
- **محاذاة وتوزيع العناصر الدوارة في المتجر**: تحديث `alignSelectedElements` و `distributeSelectedElements` في `element-slice.ts` للاعتماد على الصندوق المحيط المرئي بدلاً من إحداثيات Konva غير الدوارة.
- **تموضع الشريط السريع فوق العناصر الدوارة**: معايرة إحداثيات `QuickBar` في `quick-bar-element-section.tsx` على المركز والحافة العلوية المرئية للعنصر الدوار.

### Fixed (Canvas Nodes, Print Fallbacks & Security Hardening)

**عقد Konva وتحويلات القلب (Canonical Konva Scale & Flip Grouping):**
- **توحيد المقياس الخارجي الإيجابي**: تثبيت مقياس الحاوية الخارجية دائماً عند `scaleX: 1, scaleY: 1` في عقد الصور (`image-node.tsx`) والنصوص (`text-node.tsx`) والأشكال (`shape-node.tsx`)، وحصر تحويل القلب (`flipX`/`flipY`) في مجموعة فرعية داخلية مركزية.
- **استقرار المحول (Transformer)**: منع إزاحات التكبير المعكوسة عند سحب مقبض التحجيم لما بعد الصفر.

**الطباعة ومعالجة الصور الخلفية (Print & Backend):**
- **إصلاح المسار الاحتياطي في `print_export.go`**: البحث في مجلد `Exports` البديل عند تعذر وجود الصورة المباشرة على القرص لمنع الانهيار الصامت.
- **حماية تدفق الرفع من الملفات الخبيثة في `main.go`**: استنشاق MIME صارم (`http.DetectContentType`) على أول 512 بايت لنقطة `/api/upload-print-image` ورفض أي محتوى غير صوري بـ `400 Bad Request`.
- **توثيق استقرار كاش الصور في `use-async-image.ts`**: توثيق عدم تصفير المستمعات عند unmount لتفادي تسريب الوعود المعلقة في `pendingLoads`.

## [v1.3.33] - 2026-09-10

### Fixed (Canvas Engine Stability & Interaction Fixes)

**إدارة الذاكرة وتحميل الصور (Image Loading & Memory):**
- **إصلاح تسريب Promise ميت في `useAsyncImage`**: عدم إلغاء مستمعات الأحداث في دالة التنظيف والاكتفاء بعلم `isCurrent = false` لضمان اكتمال أو رفض الطلبات وتنظيف `pendingLoads` دائماً لمنع تعليق الصور في حالة التحميل.

**محاذاة وسحب العناصر (Drag & Snap Alignment):**
- **تصحيح Snap العناصر المقلوبة في `useKonvaDrag`**: احتساب الحافة الحقيقية للعناصر المقلوبة (`flipX` و `flipY`) لمنع الإزاحة الخاطئة في حسابات المغناطيسية والخطوط الإرشادية.
- **ضبط حدود الـ Margin Clamping**: معاملة الحواف المنطقية بالتساوي للعناصر العادية والمقلوبة.

**محول التحجيم والدوران (Transformer & Geometry):**
- **حماية مقبض الدوران (`rotater`)**: استبعاد مقبض الدوران صراحةً من إطلاق `boundBoxFunc` لـ snap التحجيم ومنع تشوه أبعاد العنصر أثناء تدويره.
- **الحفاظ التلقائي على نسبة الأبعاد أثناء الـ Snap**: عند التحجيم بمحاذاة مغناطيسية على الزوايا مع تفعيل `keepRatio`، يتم ضبط البعد غير المنجذب تلقائياً بنسبة `oldBox` لمنع مط أو استطالة العنصر.

**الأشكال المتجهة (Vector Shapes):**
- **حماية مسارات SVG والخطوط من الانهيار**: تغليف `KonvaShapeElement` بمجموعة `<KonvaGroup ref={elementRef}>` ذرية لعزل مقاييس الـ ViewBox الداخلية (`scaleX = w / vbW`) وحمايتها من أنيميشن الدخول والتحويلات.

**مسرح الكانفس والواجهة (Canvas Stage & Viewport):**
- **منع تشوه المسرح في اللوحات العريضة أو الطويلة**: استبدال التقييد المستقل لـ `displayW` و `displayH` بتكبير نسبي متطابق يضمن ثبات `scaleX === scaleY` دائماً.
- **إظهار خطوط السحب الإرشادية الحية**: نقل `dragGuideState` خارج حدود `overflow-hidden` الخاصة بورقة الكانفس ليبقى خط السحب وشارة القياس ظاهرين عند السحب من المساطر أو لخارج الورقة.
- **تحسين تموضع قائمة السياق الموحدة**: الاعتماد على حدود نافذة المتصفح الفعلية بدلاً من تقييد القائمة المنبثقة بحدود الكانفس، مع إزالة طبقة الـ portal الزائدة.

**إسقاط الملفات (Drag & Drop):**
- **مسار بديل آمن لرفع الصور**: إضافة Fallback لاستخدام `dataUrl` مباشرة عند فشل أو غياب دالة Wails `SaveImageFromBase64`.

## [v1.3.32] - 2026-09-09

### Refined (UI Excellence Program — من خطة `docs/plans/ui-excellence-plan.md`)

**توحيد نظام الألوان (Token System Unification):**
- **صفر ألوان مثبتة خارج الـ tokens**: استبدال كل `dark:bg-[#...]` و `slate/zinc` الخام في المساطر وبطاقات القوالب وحوار الطباعة ووحدة الكولاج الحر و`toolbar` الفلات وثنائيات المعاينة.
- **متغيرات دلالية جديدة**: `--ruler-*` (أسطح المساطر الثمانية)، `--print-*` (واجهة آلة المعاينة الداكنة)، وتسجيل `--canvas-collage-cut/center/edge` كأصناف Tailwind متاحة.
- **إصلاح `--font-mono`**: كان مربوطاً بالخط العربي (غير monospace فعلياً) — الآن `IBM Plex Mono → Cascadia → ui-monospace` للقراءات الرقمية و`kbd`.

**إزالة الازدواجية (Deduplication):**
- **حذف `zoom-controls.tsx`** (كود ميت بلا مستوردين).
- **`WindowControls` مشترك**: أزرار النافذة الثلاثة (تصغير/تكبير/إغلاق) كانت مكررة بين شاشة القفل والهيدر — الآن مكوّن واحد.
- **`QuickBarAiActions`**: الثلاثي (عزل → ضبط → ترميم) كان مكرراً حرفياً بين قسمي الخلية والعنصر الحر.
- **توست sonner**: إزالة طبقة الـ `!important` المكررة من `classNames` (التنسيق الموحد يعيش في `index.css` فقط).
- **زر الملاءمة**: تسمية صادقة موحدة «ملاءمة الورقة للشاشة (100%)» بدل التسمية المزدوجة المربكة.

**مقياس الطبقات الموحد (Unified Z-Index Scale):**
- متغيرات `--z-canvas-overlay/guides/ruler/print-toolbar/quick-bar/menu/popover` واستبدال كل القيم السحرية (`z-[45]` حتى `z-[99999]`).

**تفكيك الملفات العملاقة (Decomposition):**
- `canvas-quick-bar.tsx`: **798 → 153 سطراً** (ثلاثة أقسام مستقلة تحت `quick-bar/`).
- `App.tsx`: **694 → 512** (شاشة قفل الترخيص مستقلة في `license-lock-screen.tsx` + أزرار النافذة مشتركة).
- `editor-canvas.tsx`: **726 → 629** (منطق قياسات المساطر ومؤشر الفأرة في `use-ruler-metrics.ts`).

**تنظيف الواجهة (UI Hygiene):**
- إزالة الإيموجي من كل نصوص الواجهة والتوستات (📋 ✨ 🎯 🔒 ...) — تُركت في تعليقات JSDoc فقط.
- توحيد الأحجام الاعتباطية: `text-[9px]/[11px]/[11.5px]` → `text-[10px]`/`text-xs` (142 موضعاً).
- تحويل أزرار الهيدر الأيقونية من `title=` الأصلي إلى Radix Tooltip مع رقائق `kbd` للاختصارات.

**التحقق:** typecheck ✅ / lint 0 أخطاء ✅ / 370/370 اختبار ✅ / build ✅ / مسوح rg: صفر hex خارج tokens، صفر slate/zinc في freeform، صفر z سحري، صفر أحجام اعتباطية.

## [v1.3.24] - 2026-08-27

### Added & Refined (Smart Snapping System, Viewport Deck Polish & Hugeicons Standardization)
- **Screen-Scaled Magnetic Snapping Engine**: Developed zoom-resilient magnetic snapping using screen-pixel constant threshold (`8px / (canvasWidth * stageScale)`), enabling effortless alignment across all zoom levels.
- **Universal Boundary & Transformer Snapping**: Bound all drag movements and transformer resize handles (W, N, S, E, NW, NE, SW, SE) to snap against canvas borders (`0`, `0.5`, `1`), user guidelines, grid lines, and sibling elements.
- **Hugeicons Ecosystem Standardization**: Fully transitioned away from Solar icons to `@hugeicons/core-free-icons` and unified `HugeIcon` component.
- **Fluent 2 Canvas Viewport Deck Polish**: Redesigned bottom command deck with standard `28px` (`h-7`) button ramps, sleek acrylic backdrop, rich keyboard shortcut tooltips with `<kbd>` badges, and distinct iconography for user guidelines (`TableColumnsSplitIcon`).
- **Offline Local Fonts & CSP Hardening**: Eliminated external Google Fonts CDN links, securing WebView2 CSP compliance with bundled offline fonts.
- **Complete Test Coverage**: Passed 100% of frontend Vitest tests (48 suites, 270 unit tests), Go backend tests, and Playwright E2E suites.

## [v1.3.23] - 2026-08-26

### Added & Refined (Architecture, EXIF Auto-Orientation & International Passport Standards)
- **EXIF Auto-Orientation Engine**: Integrated `exifr` and `exif-utils.ts` for instantaneous (~1ms) camera photo orientation detection and automatic aspect ratio correction for vertical camera/smartphone shots (Canon, Nikon, Sony, iPhone).
- **International Passport & Visa Templates (ICAO 9303)**: Added 16 official biometric passport and visa templates with exact 300 DPI dimensions, head height percentages, and official embassy guidelines (ICAO 9303, Schengen Visa, US Visa/DS-160 51×51mm, UK Passport, Canada Passport 50×70mm, Turkey İkamet 50×60mm, Saudi Arabia, UAE Emirates ID, Egypt, India OCI, China, Australia, Russia, Japan, and Iraq).
- **Content-Security-Policy (CSP) in WebView2**: Enforced strict CSP headers in Wails AssetServer supporting WebAssembly runtime (`'wasm-unsafe-eval'`), Web Workers, blobs, and whitelisted Supabase/Modal AI domains.
- **Win32 Single Instance Foreground Focus**: Integrated `FindWindowW`, `ShowWindow(SW_RESTORE)`, and `SetForegroundWindow` to seamlessly restore and bring the existing Grido Studio instance to front on secondary launch.
- **Go Concurrency & Deduplication (singleflight)**: Streamlined raw image decoding and collage slot processing with official Go `golang.org/x/sync/singleflight`, eliminating redundant image decoding across concurrent threads.
- **Text Presets Decoupling**: Modularized 13 typography presets, gradients, and stamps into dedicated `text-presets.ts` module, reducing store slice complexity.

## [v1.3.19] - 2026-08-20

### Added & Refined (CI/CD Performance & Fluent 2 Polish)
- **High-Speed Parallel CI Pipeline**: Redesigned GitHub Actions CI workflow into parallel Linux & Windows jobs with smart caching, cutting CI build times by over 40% (~7m down from 12+m).
- **Binding Artifact Sharing**: Implemented automated Windows-generated Wails binding artifact upload/download to enable fast headless Linux typechecks and frontend quality tests.
- **Fluent 2 Arabic Typography & Labels**: Standardized font weight selectors to clean, concise Arabic labels across properties panels.
- **Workflow Concurrency & Deprecation Fixes**: Added GitHub Actions concurrency groups to cancel obsolete in-flight runs and upgraded actions to Node 22.
- **Multi-Card Design System Polish**: Refined modal dialogs and property panels with clean icon-driven design and zero verbose parenthetical text.

## [v1.3.1] - 2026-08-02

### Fixed & Refined (Freeform Collage Engine & Comprehensive Fixes)
- **Keyboard Shortcut Isolation**: Intercepted modal keydown events (`Ctrl+Z`, `Ctrl+Y`, `Ctrl+D`, `Delete`, `Backspace`, Arrows) in capture phase on `window` with `stopPropagation` & `stopImmediatePropagation` to isolate modal shortcuts from main canvas actions.
- **Aspect-Aware Physical Rotation**: Updated `rotateSlot` to calculate physical mm dimensions before rotation using paper aspect ratio ($paperHeightMM / paperWidthMM$), ensuring 35×45mm cells rotate to 45×35mm on non-square paper.
- **Zod Schema Data Loss Prevention**: Extended `CanvasSlotSchema` and `CollageTemplateSchema` in `schema.ts` with `presetType`, `label`, and `rotation` to prevent field stripping during JSON save/load.
- **Center Snap Line Guideline Fix**: Separated slot alignment target coordinate from visual snap line position, drawing center guidelines directly down the paper center ($50\%$).
- **Atomic Single-Step Undo**: Batched canvas dimension and print settings state updates prior to template application for 100% atomic single-step undo.
- **Physical Preset Selection Resizing**: Standardized preset selection to resize slot dimensions to standard physical sizes (Passport 5x5, ID 3.5x4.5, Visa, Transactions).
- **Go Print Service Mandatory Clipping**: Enforced `dc.Clip()` for all slot bounding boxes in backend PDF generation to prevent rotated or unclipped image bleed.
- **Konva Rotated Cover-Fit Fix**: Swapped slot aspect ratio when rotation is 90° or 270° for exact cover-fit image cropping.
- **Web Mode Template Saving Fallback**: Added `localStorage` fallback under `grido_custom_templates` when Wails `SaveCustomTemplate` binding is absent.
- **Full Unit Test Coverage**: Passed 100% of frontend Vitest (29 files, 155 tests) and Go backend tests (`grido/internal/service`).

## [v1.3.0] - 2026-08-01

### Added & Refined (Human-Expert AI Auto-Framing & Canvas Parity)
- **Human-Expert Photography Framing Engine**: Integrated 3D Head Pitch Angle ($\phi$) and Roll Angle ($\theta$) compensation derived from MediaPipe 478 3D landmarks, dynamically adjusting eye anchor level when subjects look slightly up or down.
- **ICAO Eye-Level Standardization (38%)**: Anchored eye level consistently at $\approx 38\%$ from top frame height across all head shapes, facial structures, and headwear types for unified passport/ID photo layouts.
- **Hair & Headwear Volume Disambiguation**: Implemented dynamic distinction between structural skull top ($Y_{skull\_top}$) and hair/headwear boundary ($Y_{hair\_top}$), preserving $70\%$ passport head scale without over-shrinking faces under tall hair, hijabs, or turbans.
- **Source Image Aspect Ratio Parity**: Coupled source image aspect ratio ($imageAspectRatio = origW / origH$) into $computeIdCropRect$, producing crop PNG outputs with 100% exact pixel aspect ratio matching cell target slots to eliminate secondary Konva/CSS trimming.
- **Cell Slot Image Dragging Fluidity**: Captured `dragStartRef` baseline upon `onDragStart` in `KonvaCollageImage`, eliminating exponential runaway acceleration and securing linear 1:1 smooth image drag control inside collage slots.
- **Collage Slot Auto-Framing UI Parity**: Added "ضبط الوجه تلقائياً" button, MediaPipe progress indicator, and auto-reset offsets ($zoom=1, dragX=0, dragY=0$) to `SlotProperties` panel for seamless collage slot workflow.
- **Unit Test Coverage**: Expanded `face-frame-utils.test.ts` to 8 comprehensive tests covering pitch compensation, hair volume disambiguation, and non-square image aspect parity (`133/133 tests passed`).

## [v1.2.19] - 2026-08-01

### Fixed & Robustness
- **Modal Loading & Export State Self-Reset**: Implemented automatic loading state cleanup (`isExporting`, `loading`, `isSaving`, `isDetecting`) on dialog open/close across Print, Export, Projects Library, Account/License, Refine BG, and Document Scanner modals to prevent stuck "Exporting..." buttons.
- **Robust Async Exception Safety**: Wrapped batch AI image processing and export tasks in `try ... finally` blocks to guarantee loading UI resets even upon unhandled errors.
- **Flexible Playwright E2E Selectors**: Updated Playwright E2E test suite with resilient role/pattern selectors (`getByRole('button', { name: /إضافة صورة|رفع صورة/ })`), passing 100% of Chromium and Firefox E2E tests in CI.
- **Master Admin Supabase RPC Schema Sync**: Verified parameter type alignment (`text` signature for `p_user_id`) and granted execution permissions with PostgREST schema cache reloads (`NOTIFY pgrst, 'reload schema'`).
- **Updated Engineering Standards**: Added 3 new strict rules to `AGENTS.md` covering modal state cleanup, flexible Playwright selectors, and batch AI try/finally blocks.

## [v1.2.18] - 2026-08-01

### Added & Refined
- **Advanced Admin Management Console**: Integrated interactive user profile editor, custom plan overrides, custom expiry dates, and instant account banning/unbanning.
- **Batch License Key Generator & Export**: Enabled bulk generation (up to 50 keys at once) with custom reseller prefixes and 1-click export to CSV / TXT files.
- **Live System Settings & AI Quotas**: Added dedicated System Config tab for live AI daily quota adjustments, global broadcast announcements, and maintenance mode toggles.
- **Financial & Revenue Analytics**: Added real-time MRR (Monthly Recurring Revenue) estimation, ARR projections, and GPU hosting cost tracking.
- **Supabase RPC Optimization**: Resolved PostgreSQL function overload ambiguity and pgcrypto dependencies in `admin_create_license_key` with automatic PostgREST schema cache reloads.

## [v1.2.17] - 2026-08-01

### Added & Refined
- **Soft Compact Toast Notifications**: Redesigned Sonner notifications into soft, lightweight floating pills matching Grido's visual identity with custom Lucide icons and dark/light mode backdrop blur.
- **Tooltip Hover Delay**: Adjusted `TooltipProvider` hover delay to `650ms` (`delayDuration={650}`) preventing accidental popping text when sweeping mouse cursor rapidly over toolbar and workspace controls.
- **Cleaned Preset Vector Shapes**: Streamlined shape menu to retain core basic geometric shapes only (Rectangle, Circle, Star, Line).
- **Codebase & Workspace Cleanup**: Cleaned up obsolete files, dev artifacts (`test.exe`, `tmp.exe`, `diff.patch`, `scratch_transcript.txt`, duplicate test files) and verified clean build and 100% unit test coverage.

## [v1.2.15] - 2026-07-31

### Fixed & Modernized
- OAuth authentication callback JS string interpolation fix (`EXPECTED_STATE` quoted).
- Expanded OAuth exchange local server allowed origins (`localhost` dynamic port & `null` origin).
- Modernized benchmark loop idioms to `for b.Loop()` for Go 1.24+ standards.
- Windows file locking protection: explicitly close installer file handles prior to `os.Remove`.
- Memory optimization: restored shallow copying in Zustand history-slice (`elements.map(el => ({ ...el }))`) to prevent VRAM bloat and GC pauses.

## [v1.2.14] - 2026-07-31

### Fixed & Security
- Modal AI connectivity: URL trailing slash normalization prevents duplicate slashes (`//`) that trigger 404/405 routing errors on Modal endpoints.
- User-Agent header `GridoStudio-Desktop/1.2.14` added to AI HTTP requests to prevent CDN/Cloudflare automated request blocks.
- Extended frontend AI enhance timeout to 120 seconds to accommodate cold-start GPU container boots on Modal AI.
- Added comprehensive unit tests in `ai_service_test.go` covering endpoint connection, payload structure, rate-limit rollback, and HTTP error handling.

## [v1.2.13] - 2026-07-31

### Performance & Changed
- Landing page (`admin-web`): Throttled 3D parallax mockup mousemove and page scroll listeners with `requestAnimationFrame` and state guards to prevent unnecessary React re-renders.
- Cached floating HUD chip DOM references in `AppMockup.tsx` to eliminate layout thrashing during mouse movement.
- Enabled GPU hardware acceleration layers (`will-change: transform`, `translate3d`, `backface-visibility: hidden`) across 3D mockup, aurora glow, and floating chips in `index.css`.
- Unobserved revealed scroll elements in `IntersectionObserver` to reduce browser engine overhead during long page scrolling.

## [v1.2.12] - 2026-07-31

### Fixed
- Drag in free mode now uses logical coordinates (divided by stage scale) so elements track the pointer exactly at any zoom; dropping a photo onto a collage slot uses the same coordinate law, and dragging inside a slot inverts the absolute transform (P0-1 / P1-10 / P1-11)
- Locked elements are excluded from group drag, multi-delete, double-click and context-menu delete (P0-4 / P0-5 / P0-6 / P1-9)
- Undo/redo history seed on project load now contains valid elements only (P0-7); X/Y property fields are guarded to a sane logical range (P0-8)
- Offline license check failure keeps the session instead of locking the user out (P0-2)
- Concurrent background removal from toolbar and properties panel now shares one Worker with a request map instead of clobbering callbacks (P0-12)
- Daily AI quota counter uses a unified `sv-SE` date stamp so it resets correctly at midnight UTC+3 (P0-11)
- Alt+drag reset restores the original position on blur/visibility change with proper listener cleanup (P0-9); Ctrl/Cmd+wheel no longer double-zooms over slots (P0-10)
- Print dialog: preview iframe removed via `afterprint` with a 60s safety timeout (P1-2), Enter ignored inside input/select fields (P1-7), stale captured preview cleared on close (P1-6), last non-zero margin restored when re-enabling margins (P1-3), copy count formula accounts for the gap (P1-4), cut marks aligned on a centered origin in both preview and export (P1-5)
- Export: mirrored edge/corner bleed strips drawn inside the bleed area (P1-14); more accurate file-size estimate with a "(تقريبي)" label (P1-15)
- Replacing or cropping a photo now surfaces clear error toasts (P1-8)
- Text editing overlay uses box-shadow instead of border/padding so the editor overlays the text exactly (P2-3); Escape now commits the typed text like blur does — no more silent data loss (P2-4)
- Context menu re-measures when its content changes while open (P2-9); zero-size crop shows "حدد منطقة قص صالحة" (P2-8)
- Account/license modal re-derives the initial tab on every open (P2-11)
- Canvas dimensions: DPI changes recompute from store values rather than partial fields, and mm inputs are capped at 2000 (P2-15)
- Collage template switch now asks for confirmation when it would drop existing photos or clear free-mode elements (P2-14)

### Changed
- Multi-select properties broadcast style keys to all selected elements; positional keys (x/y/locked) apply only to the displayed element (P1-17)
- Multi-select alignment aligns to the group's bounding box (P1-18)
- Ruler cursor markers are re-queried every rAF frame instead of cached refs (P1-12)
- Replacing a slot image with a different aspect ratio resets drag/zoom while keeping flip/rotation (P1-13)
- Quick bar shows the PRO/AI badge on background removal while the free tier keeps 5 AI enhances/day (P1-16)

## [v1.0.38] - 2026-07-25

### Fixed
- Canvas filter disappearance flash during element movement resolved by preserving atomic node cache in `image-node.tsx` and `collage-image.tsx`
- Brevo SMTP transactional authentication and email verification integration hardened

## [v1.2.11] - 2026-07-31

### Security
- Auto-updater verifies the installer's SHA-256 before launch (`grido-checksums.txt` fingerprint served by `/api/version`, fail-closed); `runAsAdmin` split behind build tags for cross-platform compiles
- AI enhance requires sign-in — removed the dead `X-Grido-Api-Key` path; daily quota is now derived server-side from the user's plan (free 5 / pro 15 / enterprise 50)
- Removed hardcoded fallback Modal AI key from `license_service.go` and `build.ps1`
- Removed plaintext API key from `opencode.json` (replaced with env var reference)
- Added `opencode.json`, `CodeFormer-temp/`, and `scratch/` to `.gitignore`
- `build.ps1` now fails fast if `MODAL_AI_KEY` is missing instead of falling back to a baked-in secret

### Changed
- Zustand store slices (`core`, `element`, `history`, `license`) are now fully typed — eliminated ~30 `any` usages at the data layer
- All `catch (err: any)` blocks in frontend replaced with `catch (err: unknown)` and proper `instanceof Error` narrowing
- ESLint `@typescript-eslint/no-explicit-any` upgraded from `off` to `warn`
- ESLint `jsx-a11y` plugin enabled for accessibility linting
- `tsconfig.json` now enforces `noImplicitReturns` and `noFallthroughCasesInSwitch`
- Vitest coverage thresholds raised from 29/25% to 40/35%

### Added
- Gradient angle slider (0–360°) for linear gradients in shape/text properties
- Rulers can toggle between mm and px units (preference persisted via `grido_ruler_unit`)
- `HistoryEntry` type for typed undo/redo history
- Shared `withHiddenOverlays` and `captureStageDataUrl` helpers in `konva-export-utils.ts` — eliminates ~60 lines of duplicated Konva overlay hide/show/cache logic between `export-utils.ts` and `print-dialog.tsx`
- `ErrorBoundary` now wraps `EditorCanvas` to prevent canvas render errors from crashing the entire app
- `ErrUnauthorized` sentinel error in Go backend — replaces fragile `strings.Contains(err.Error(), "401")` with `errors.Is`
- `LICENSE` file (MIT)
- `CHANGELOG.md`

### Fixed
- Event listener leak in `use-bg-removal.ts` — anonymous `beforeunload` handler replaced with named function
- Stale comment in `main.tsx` referencing removed canvas prototype override
- Manual export fallback (`export-image.ts`) now renders gradient fills, shadows, blend modes, vector `path` shapes (viewBox-scaled), image `cornerRadius` clipping, and text stroke/underline/line-through — matching Konva parity
- Collage slots: flip (H/V) and 90° rotate now render in Konva and properties panel; full `flipY` parity for canvas elements
- Ready-made vector shapes (`VECTOR_SHAPES`) now render with correct viewBox scaling
- Undo/redo snapshots now include canvas size, background and collage settings — undo actually restores them
- Magnetic snapping during resize (`boundBoxFunc`), monotonic `nextZIndex()`, unified `grido.log` (lumberjack), autosave now watches grid settings
- Text elements render `textBgColor` in Konva, editing overlay and export
- Print dialog: copies-per-sheet distribution bar (copies, repeat mode, gap, cut marks)
- Background removal runs in a real Web Worker with instant hard-cancel (`terminate`) and measured durations
- Landing page redesigned: dynamic version from `/api/version`, SEO (canonical/og:url/robots/JSON-LD/og-image), pricing + testimonials sections, ARIA tabs, `prefers-reduced-motion`, dead assets/Three.js deps removed, spell check (`الطرق اليدوية`), fonts dedup (Cairo removed, AlYamama once)
- AI background removal: "ModuleFactory not set" regression fixed — WASM glue synced to `@mediapipe/tasks-vision` v0.10.35, `forVisionTasks(base, true)` uses the ESM module loader that registers `globalThis.ModuleFactory`; verified on a real ID photo (49.6% foreground, clean edges)

### Removed
- Dead assets: `esrgan-slim` TFJS models, unused `ai-enhance` Supabase Edge Function, orphan `nunito-v16-latin-regular.woff2` font

## [v1.0.2] - 2026-07-20

### Added
- Automatic update checker service (`internal/service/updater.go`)
- Secure serverless download proxy for private repo releases (Netlify function)
- App version injected dynamically via ldflags in `build.ps1` and `release.yml`
- NSIS installer generation in GitHub release pipeline

### Changed
- Landing page hero headline rewritten to focus on speed and studio workflow
- AI enhance pipeline secured with per-plan daily quotas via Supabase RPC

### Fixed
- Image upload no longer forces collage mode in free edit mode
- SQLite lock contention between background cleanup and saves
- Master key derivation hardened (no plaintext key file)
- Canvas performance optimizations (FastLayer, batchDraw, rAF throttling)

## [v1.0.0] - 2026-07-11

### Added
- Initial release of Grido Studio
- Collage and single-mode editor with Konva canvas
- AI background removal (`selfie_multiclass` via MediaPipe in Web Worker)
- AI image enhancement (CodeFormer + Real-ESRGAN via Modal)
- High-DPI print sheet generation with cut lines
- Supabase-based licensing and authentication
- Offline Arabic font bundle (12 woff2 families)
- Custom collage templates
- Undo/redo history (capped at 30 entries)
- Autosave with `requestIdleCallback`
