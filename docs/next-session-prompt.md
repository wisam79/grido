# برومت استكمال خطة Grido Studio — انسخه في محادثة جديدة

> انسخ كل ما يلي (من الخط الفاصل التالي حتى نهاية الملف) والصقه كأول رسالة في محادثة جديدة.

---

# استكمال خطة إصلاحات وتطوير Grido Studio

أنت تكمل عملاً في مشروع `C:\projects\grido` (Grido Studio — تطبيق سطح مكتب Wails v2: Go backend + React/TypeScript/Konva frontend + صفحة هبوط admin-web بـ React+Vite+Tailwind v4 على Netlify).

اقرأ أولاً هذه الملفات قبل أي كود: `.agents/AGENTS.md` (قواعد إلزامية)، `docs/features-tracker.md` (حالة الميزات والإصلاحات المنفذة والمتبقية)، وملف المهمة الحالية عند الحاجة.

## ما أُنجز في الجلسة السابقة (موجود في شجرة العمل — غير مُدمج بـ commit)

إصلاحات مكتملة ومختبرة (go test ✅ / vitest جزئي ✅ / typecheck ✅ / vite build ✅):

1. **L-1/L-4**: المحدِّث يتحقق من SHA-256 للمثبت قبل تشغيله (fail-closed عند عدم التطابق، تحذير+متابعة للإصدارات القديمة بلا بصمة) — `internal/service/updater.go` + فصل `runAsAdmin` لملفَي build-tag (`updater_windows.go`/`updater_other.go`). `UpdateInfo` صار فيه `sha256`، وُلّدت bindings من جديد بـ `wails generate module`، و`update-notifier.tsx` يمررها. `admin-web/netlify/functions/version.ts` يجلب البصمة من أصل `grido-checksums.txt` في الإصدار، و`.github/workflows/release.yml` يولّده عبر `Get-FileHash`.
2. **AI-2/AI-3**: الحد اليومي للـ AI يُشتق خادمياً من خطة المستخدم (لا ثقة بالعميل) — `internal/service/ai_service.go` (planLimitFree=5/Pro=15/Enterprise=50 مع كاش 5 دقائق بمفتاح hash التوكن + جلب الخطة عبر Supabase REST) + migration جديدة `supabase/migrations/20260730000000_server_side_ai_quota.sql` (RPC يشتق الحد من profiles.plan ويدعم `p_check_only`) + `modal_ai/upscaler.py` فيه فحص رصيد مسبق قبل حرق GPU + إزالة مسار `X-Grido-Api-Key` الميت (تسجيل الدخول إلزامي).
3. **L-3**: نظام تسجيل موحد — حُذف `internal/utils/logger.go`؛ `service/logger.go` يستخدم `utils.GetAppDir()` و`sync.Once`.
4. **E-1**: `textBgColor` يُصيَّر في Konva (Rect خلف النص في `text-node.tsx`) + `text-editing-overlay.tsx` + `export-image.ts`.
5. **E-2**: قلب(أفقي/عمودي)/تدوير 90° للخانات: أزرار في `slot-properties.tsx` + تصيير Group تحويل في `collage-image.tsx` + تمرير في `konva-collage-layer.tsx`. وتكافؤ `flipY` الكامل للعناصر (types + image/shape/text nodes + transformEnd في `konva-single-layer.tsx` + `use-konva-drag.ts` + معايرة `editor-transformer.tsx` + زر في `element-properties.tsx` + التصدير).
6. **E-3**: VECTOR_SHAPES حيّة — `lib/svg-paths.ts` (viewBox لكل شكل) + قياس `KonvaPath` في `shape-node.tsx` + قائمة «أشكال متجهة جاهزة» في `toolbar-items.tsx` (icons بـ emoji لأن lucide لا يحوي Instagram/Facebook).
7. **E-4**: `HistoryEntry` موسّع (canvasWidth/Height/backgroundColor/collage*) — `history-slice.ts` (captureSnapshot/restoreEntry) + `core-slice.ts` + تحديث mock في `history-slice.test.ts` (3 اختبارات خضراء).
8. **E-5**: مغناطيس أثناء Resize في `editor-transformer.tsx` `boundBoxFunc` (معايرة ذاتية oldBox↔فضاء منطقي، إعادة استخدام `getSnapPositionsWithTargets`، تخطي عند الدوران أو التحديد المتعدد، مسح المرشدات عند transformend).
9. **E-8**: `nextZIndex()` في `element-slice.ts` — تصاعدي رتيب بدل صيغة الصدفة (5 مواقع).
10. **L-2**: `use-autosave.ts` يراقب `gridType`/`snapToGrid`؛ استُبعد `showRuler` عمداً (تفضيل واجهة لا يُسلسل حسب AGENTS.md #68).
11. **P-1**: شريط «توزيع النسخ» في `print-dialog.tsx` (نسخ/ورقة 1–48 معطل خارج all + نمط تكرار all/row/column + فجوة 0–20مم + مفتاح خطوط قص).
12. **AI-1/AI-6**: Web Worker حقيقي `frontend/src/workers/bg-removal.worker.ts` (النموذج محمّل كسلاً، الإلغاء=terminate قسري يوقف الاستدلال فوراً) + قياس حقيقي للمدة وcostUsd=0 للمعالجة المحلية.

**قرارات يجب عدم نقضها:** `getSnapPositions` ليست ميتة (تستخدمها اختبارات)؛ حدود الحصة 5/15/50 متكررة عمداً في 3 مواضع متزامنة؛ ملفات `frontend/wailsjs/` مولّدة (gitignored).

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
cd C:\projects\grido && go test -race ./internal/... && go vet ./...
cd frontend && npm run test && npm run typecheck && npm run lint
cd ../admin-web && npm ci && npm run build && npm run lint
```
ثم حدّث `docs/features-tracker.md` بنتائجك.

### 7. ملاحظات نشر (لا تنفذها بلا إذن المستخدم)
تطبيق migration على Supabase، إعادة نشر upscaler.py على Modal، Tag إصدار جديد لاختبار التحديث end-to-end، وcommit/push (اطلب الإذن صراحةً قبل أي git mutation).

## أسلوب العمل
تغييرات دنيا مركزة، نمط كود المشروع الحالي، تعليقات عربية كما هو معتاد، لا تلمس الاختبارات إلا لإصلاح كسر واجهة، وعند أي شك في إحداثيات Konva استخدم المعايرة الذاتية لا الافتراض.
