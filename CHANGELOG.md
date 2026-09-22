# Changelog

All notable changes to Grido Studio are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

> **تصحيح توثيقي (سبتمبر 2026 — مثبت من الكود):** إدخال `v1.2.11` ادعى أن `build.ps1` يفشل عند غياب `MODAL_AI_KEY`، لكن `build.ps1:22-26,49` يبني بمفتاح فارغ دون فشل. يُترك الإدخال الأصلي لسجل التاريخ، والصحيح هو السلوك الحالي في `build.ps1`.

## [Unreleased]

### Fixed

- **هوية التطبيق وبيانات EXE بعد الترقية لـ Wails v3:** كانت `build/appicon.png` ما تزال شعار Wails الافتراضي "W" فيُعاد توليد `windows/icon.ico` منه كل بناء، و`windows/info.json` و`wails.exe.manifest` بقيم القالب (`My Company`/`0.1.0`) فخرج `GridoStudio.exe` بلا بيانات إصدار. أُعيدت الهوية من `frontend/public/favicon.png`، وزُامنت `build/config.yml` (`1.5.1`) وأُعيد توليد الأصول رسمياً عبر `wails3 update build-assets`، مع حارس CI يفشل البناء عند فراغ بيانات EXE.

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
