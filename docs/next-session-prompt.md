# برومت استكمال خطة Grido Studio — انسخه في محادثة جديدة

> انسخ كل ما يلي (من الخط الفاصل التالي حتى نهاية الملف) والصقه كأول رسالة في محادثة جديدة.

---

# استكمال خطة إصلاحات وتطوير Grido Studio

أنت تكمل عملاً في مشروع `C:\projects\grido` (Grido Studio — تطبيق سطح مكتب Wails v3: Go backend + React/TypeScript/Konva frontend + صفحة هبوط admin-web بـ React+Vite+Tailwind v4 على Netlify).

اقرأ أولاً هذه الملفات قبل أي كود: `.agents/AGENTS.md` (قواعد إلزامية)، `docs/DOCUMENTATION_MAP.md` (**خريطة التوثيق الإلزامية — الجرد + مصفوفة المزامنة + الأرقام المرجعية + البوابات**)، `docs/features-tracker.md` (حالة الميزات والإصلاحات المنفذة والمتبقية)، وملف المهمة الحالية عند الحاجة.

> 🔒 **إلزام:** قبل بدء العمل أعلن المستندات التي سيتغيّرها العمل، وقبل أي كومت/دفع شغّل `node scripts/docs-gate.mjs --strict-refs` (مفروض آلياً عبر `.husky/pre-commit` و`.husky/pre-push` وخطوة `Documentation Gate` في CI). **لا رقم من الذاكرة** — الأرقام المرجعية في الخريطة القسم 4 بأوامرها.

## ما أُنجز في الجلسة السابقة (موجود في شجرة العمل — تم التحقق منه بالقياس الميداني)

1. **معمارية إدارة الذاكرة وتخفيض استهلاك الرام (Native Memory Management & Working Set Compaction):**
   - حذف وسائط Chromium المسببة لتضخم الـ GPU Process (`--enable-gpu-rasterization` و`--enable-zero-copy` و`--ignore-gpu-blocklist`) في `main.go`.
   - حظر التحميل المسبق لـ OpenCV WASM عند الإقلاع (`Zero Early Allocation`) في `use-app-bootstrap.ts` و`opencv-loader.ts`.
   - استحداث خدمة `MemoryService` في Go (`internal/service/memory_service.go` و`memory_service_windows.go`) مع استدعاء `EmptyWorkingSet` و`SetProcessWorkingSetSizeEx` على Go وشجرة عمليات WebView2 التابعة دورياً كل 30 ثانية وعند تصغير النافذة أو فقدان التركيز.
   - إضافة مسار `/api/trim-memory` واستدعاء `triggerMemoryTrim` في الواجهة فور انتهاء عزل الخلفية وتأطير الوجه وإغلاق حوارات التصدير والطباعة والماسح الضوئي.
   - **النتيجة الحية المقاسة:** انخفاض الـ Working Set الفعلي للرام من أكثر من 1.3GB إلى قرابة 14.4MB عبر كامل العمليات، وانخفاض الذاكرة المحجوزة للرندر من 630MB إلى أقل من 80MB.

**قرارات يجب عدم نقضها:** `getSnapPositions` ليست ميتة (تستخدمها اختبارات)؛ حدود الحصة 5/15/50 متكررة عمداً في 3 مواضع متزامنة؛ ملفات `frontend/wailsjs/` **جسور يدوية مُتتبَّعة في Git** (وليست مولّدة) تعيد التصدير من `frontend/bindings/` المولَّدة والمُستثناة — **لا تشغّل `wails generate module` (أمر v2) ولا تعدّل `wailsjs/` يدوياً**؛ التوليد الصحيح: `wails3 generate bindings -ts -clean=true`.

## المهام المتبقية (نفّذها بالترتيب)

### 1. E-6 — استكمال مسار التصدير الاحتياطي اليدوي
الملف: `frontend/src/lib/export/export-image.ts` (حلقة العناصر ~السطور 323-384). أضف: `ctx.shadow*`, `globalCompositeOperation`, تدرجات fillType (linear/radial) للأشكال, رسم `path` عبر Path2D بقياس viewBox (استخدم VECTOR_SHAPES كما في shape-node), قص cornerRadius للصور (clip مثل الخانات), إطار النص (strokeText) وزخرفته (underline/line-through يدوياً). خلفية النص وflipY أُضيفا فعلاً.

### 2. E-7 — زاوية التدرج
الملف: `frontend/src/components/editor/properties/gradient-picker.tsx` — أضف سلايدر زاوية (0-360°) للتدرج الخطي يحدّث `fillLinearGradientStartPoint/EndPoint` (حساب من المركز بالزاوية).

### 3. تجميليات صغيرة
- خيار وحدة mm/px في `ruler.tsx` (عرض بديل للتدرجات).
- حذف الأصول الميتة: `frontend/public/models/esrgan-slim/` (AI-4)، `supabase/functions/ai-enhance/` (AI-5)، `frontend/src/assets/fonts/nunito-v16-latin-regular.woff2` (L-5) — تحقق أولاً بغrep من غياب أي مرجع لها.

### 4. توحيد انحرافات README/CHANGELOG مع الكود
README: `selfie_multiclass.tflite` بدل RMBG-1.4 (مع Web Worker — صار صحيحاً الآن)، 1024px بدل 2048، 12 عائلة خط بدل 26، الحصص 5/15/50 بدل 3/25/100. CHANGELOG: سقف التراجع 30 بدل 20. ثم أضف قسماً جديداً في CHANGELOG تحت [Unreleased] يوثق إصلاحات هذه الجلسة بإيجاز.

### 5. إعادة تصميم صفحة الهبوط — «احترافية بشكل خيالي»
المكان: `C:\projects\grido\admin-web`. دستور التصميم الإلزامي: `admin-web/design.md` (SpaceX/Vercel/Linear — أحادية داكنة، حركة وظيفية، RTL).

**مشاكل واجبة الإصلاح (اكتُشفت بالمراجعة):**
- classes ميتة: `brand-*` (ألوان التوهج/الأزرار لا تعمل أصلاً في Tailwind v4)، `xs:` breakpoint، `bg-ink-950` — عرّفها في `@theme` داخل `index.css` أو صحّحها.
- رقم الإصدار 1.2.3 مشفر يدوياً في 3 مواضع (HeroSection, CtaBanner) — اجلبه من `/api/version`.
- `og:image` يشير لملف غير موجود — أنشئ `public/og-image.jpg` (1200×630) أو صحح المسار؛ ازدواج title/meta بين index.html وLandingPage؛ أضف canonical/og:url/robots/JSON-LD.
- أداء: `mousemove` عام ينفذ `getBoundingClientRect()` لكل بطاقة في كل حدث — خزّن البطاقات أو راقب الأقرب فقط، مع `passive: true`.
- خطوط: Cairo محمّل وغير مستخدم + AlYamama مستورد مرتين (main.tsx وindex.css) — احذف الزائد؛ عرّف font-mono حقيقي أو صححه لخطوط النظام.
- a11y: أدوار ARIA للتبويبات في FeaturesTabs/Testimonials، `aria-label` لسلايدر قبل/بعد، رابط «تخطَّ إلى المحتوى».
- أصول ميتة: `src/App.css`, `src/assets/hero.png/react.svg/vite.svg`, `public/favicon.svg`, `public/icons.svg`, `public/dribbble-3d-demo.mp4`, 5 ملفات `.jpg` مكررة من PNG، مكوّنا Three.js الميتان (`Embedded3D.tsx`, `StudioHero3D.tsx`) + اعتماديات `three`, `@react-three/fiber`, `@react-three/drei`, `@types/three` (احذفها من package.json).
- نص «أسرع من الطرق التنفيذية» → «اليدوية»؛ روابط فوتر `href="#"` — انقلها لصفحات فعلية أو احذفها.
- `tailwind.config.js` غير مقروء في v4 (إلا بـ @config) — انقل محتواه لـ `@theme` أو احذفه.

**محظورات لا تمسّها أبداً:** مسارات `/api/download` و`/api/version` وتوجيهات `public/_redirects` و`netlify.toml`، ملف `public/callback/index.html` (OAuth)، `dir="rtl"`، أصول `sample-passport.png` و`favicon.png`، ومتغيرات `VITE_SUPABASE_*` و`GITHUB_TOKEN`.

**مستوى الإبداع المطلوب:** Hero سينمائي غير مسبوق محلياً (إخراج خط رئيسي درامي، تأثيرات ضوئية طبقية، Mockup ثلاثي الأبعاد متفاعل محسوس الجودة)، أقسام: مميزات/سيناريوهات/مقارنة/أسعار/شهادات/FAQ/CTA بنسخ بيعي قوي مباشر (سرعة ونتائج لأصحاب الاستوديوهات والمطابع — القاعدة 49 في AGENTS.md). حافظ على نظام الحركات الحالي (spotlight/magnetic/reveal/aurora) وحسّنه، واحترم `prefers-reduced-motion`. تجاوبية كاملة (بديل موبايل فعلي للـ Mockup).

### 6. التحقق الشامل النهائي
```bash
cd C:\projects\grido && go test -race ./internal/... && go vet ./internal/... && go build .
cd frontend && npm run test && npm run typecheck && npm run lint
cd ../admin-web && npm ci && npm run build && npm run lint
```
> ℹ️ `go vet ./...` و`go build ./...` يعملان بصورة تامة بعد تنظيف سقالات الهواتف غير المستخدمة (`build/ios` و`build/android`).
ثم حدّث `docs/features-tracker.md` بنتائجك.

### 7. ملاحظات نشر (لا تنفذها بلا إذن المستخدم)
تطبيق migration على Supabase، إعادة نشر upscaler.py على Modal، Tag إصدار جديد لاختبار التحديث end-to-end، وcommit/push (اطلب الإذن صراحةً قبل أي git mutation).

## أسلوب العمل
تغييرات دنيا مركزة، نمط كود المشروع الحالي، تعليقات عربية كما هو معتاد، لا تلمس الاختبارات إلا لإصلاح كسر واجهة، وعند أي شك في إحداثيات Konva استخدم المعايرة الذاتية لا الافتراض.
