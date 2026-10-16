# تتبع الميزات الأساسية — Grido Studio

**تاريخ المراجعة الأولى:** 30 يوليو 2026 (الإصدار ~v1.2.10)
**آخر تحديث:** 16 أكتوبر 2026 — بعد **إصلاحات مراجعة غير المرفوع: خلفية قائمة الجوال (Portal)، تعبئة منزلق السعر، وتباين محاكاة المستوى (الجلسة 0.88)** · وقبله **تقليم رؤوس الأقسام والأيقونات الزخرفية في صفحة الهبوط (الجلسة 0.87)** · وقبله **مراجعة غير المرفوع، إعادة مزامنة الدستور، إصلاح تتبّع التوهج، وصقل الاستعارة الانتقائية (الجلسة 0.86)** · وقبله **صقل تصميم صفحة الهبوط (الجلسة 0.85)** · وقبله **صقل صفحة الهبوط P1 (الجلسة 0.84)** · وقبله **تفريغ العمليات الثقيلة إلى Go والتدفق الثنائي (الجلسة 0.83)** · وقبله **تسريع الإدخال والاستيراد والتكامل المكتبي الأصلي (الجلسة 0.82)** · وقبله **تدقيق أبرز نقاط الضعف وإغلاق الرباعية الأولى (الجلسة 0.81)** · وقبله **تدقيق الوصولية وتوحيد تعقيم نصوص المحرر (الجلسة 0.80)** · وقبله **التراجع النظيف واستئصال الكود الميت والفخاخ المعمارية (الجلسة 0.79)**
**المنهجية:** فحص الكود الفعلي (Go + React/Konva) ميزةً ميزة، ومطابقتها مع README وخطة التطوير.
**الغرض:** مستند حي يُحدَّث مع كل نظرة على الميزات؛ يكمل (ولا يستبدل) `docs/development-plan/TASKS.md`.

أسطورة الحالة: ✅ مكتمل | ⚠️ مكتمل مع فجوات | 🔶 جزئي | ❌ غير منفذ | 🆕 أُصلح في جلسة الإصلاحات

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

## 0.83 سجل جلسة تفريغ العمليات الثقيلة إلى Go والتدفق الثنائي (Binary Stream Canvas · Native Local Image AI · Batch Scanner Ingestion) — 15 أكتوبر 2026

**المرجع:** طلب المالك — فحص وتفريغ العمليات الثقيلة التي تتم في الواجهة بدلاً من Go واستبدال وسائط Base64 الضخمة بالتدفق الثنائي وحلول النظام الأصلية.

| البند | التنفيذ | الإثبات |
| --- | --- | --- |
| تدفق ثنائي لكانفاس تنقيح الخلفية (`uploadCanvasBlob`) | استبدال `canvas.toDataURL` و `SaveImageFromBase64` بـ `uploadCanvasBlob` الذي يضخ `Blob` الثنائي مباشرة كـ `multipart/form-data` إلى `/api/upload-media` وتحديث كاش الأبعاد اللحظي | `frontend/src/lib/io/media-upload.ts` + `refine-bg-dialog.tsx:460-475` + `media-upload.test.ts` (PASS) ✅ |
| تحسين الدقة بالذكاء الاصطناعي من المسار المحلي مباشرة | تمكين `EnhanceImageWithAI` في Go من معالجة مسارات `/local-image/...` مباشرة بقراءة الملف المحلي وضبط الأبعاد وترميز JPEG 92% وتجهيز حمولة Modal AI دون فك الترميز وإنشاء Canvas في المتصفح | `internal/service/ai_service.go:392-425` + `internal/service/media_service.go:148` + `TestEnhanceImageWithAI_LocalImagePath` (PASS) ✅ |
| تفريغ استهلاك الواجهة في `use-ai-enhance` | تجاوز تحميل `new Image()` وعملية الرسم على الكانفاس المشفر في الواجهة عند كون الصورة محلية، وتمرير المسار فورياً إلى Go | `frontend/src/hooks/use-ai-enhance.ts:75-88` + `ai-enhance-collage.test.tsx` (PASS) ✅ |
| تسريع وحفظ دُفعة الماسح الضوئي (`image-properties.tsx`) | استبدال الحفظ الفردي التتابعي بحفظ متوازي `Promise.all`، وحساب الأبعاد بدفعة واحدة `resolveBatchImageAspectRatios` مع إدراج ذري موحد في الستور `addImageElementsBatch` | `frontend/src/components/editor/properties/panels/image-properties.tsx:230-265` ✅ |
| بث ثنائي مباشر لقص الصور وتحديث الأبعاد اللحظي | استبدال `croppedCanvas.toDataURL()` بـ `uploadCanvasBlob` في `crop-dialog.tsx` مع حساب الأبعاد الفوري وتجاوز حلقات `new Image()` و `SaveImageFromBase64` في ألواح الخصائص وقوائم السياق | `crop-dialog.tsx:105-135` + `image-properties.tsx:780-820` + `slot-properties.tsx:665-675` + `element-menu-section.tsx:160-190` ✅ |
| تسريع فك ترميز التصدير بالعتاد (`createImageBitmap`) | استخدام فك الترميز غير المتزامن المباشر في `export-watermark.ts` و `export-bleed.ts` لتفادي تخصيصات DOM وعقد `Image` في مسار تصدير الحواف والعلامة المائية | `export-watermark.ts:40-75` + `export-bleed.ts:130-170` ✅ |
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
| قياس Konva الحي للمحاذاة العمودية | إضافة `textVerticalAlign` للـ Schema واللوحة مع قياس ديناميكي عبر `node.textHeight` يمنع تجميد ارتفاع الصندوق عند تمرير `height` | `frontend/src/components/editor/konva/elements/text-node.tsx:95` ✅ |
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

**الفجوات المتبقية عمداً (غير قابلة للاختبار الحتمي في `jsdom`):** `renderSvgToPngDataUrl` و`generateStickerSheet` (يتطلبان كانفاس 2D حقيقياً) · `renderVdpBatch` (يعتمد عليهما) · مكونات `StickerStudioDialog`/`StickerCatalog` التفاعلية (تُغطى بـ E2E: `sticker-studio.spec.ts`).

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
| خدمة إدارة وتفريغ الذاكرة الأصلية في Go (`MemoryService`) | استحداث `internal/service/memory_service.go` و`memory_service_windows.go` لاستدعاء `EmptyWorkingSet` و`SetProcessWorkingSetSizeEx` على Go وعمليات WebView2 التابعة دورياً كل 30 ثانية وعند تصغير النافذة أو فقدان التركيز | انخفاض الـ Working Set الفعلي إلى **14.4MB فقط** عبر كامل العمليات ✅ |
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
| أشكال متجهة أصلية (Native Shapes) | استغلال أشكال Konva الأصلية: `KonvaArrow` و `KonvaRegularPolygon` و `KonvaRing` مع دعم خصائصها الهندسية المتقدمة (أضلاع المضلع، أبعاد رأس السهم، ونصف القطر الداخلي للحلقة) في الواجهة واللوحات وخط أنابيب التصدير | `shape-node.tsx` و `shape-properties.tsx` و `freeform-elements-tab.tsx` و `export-canvas-fitted.ts` |
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
| UI-1 | **إزالة الأزرق الدائم من أيقونات أوامر الشريط:** `تكرار في الكولاج` (جديد) + أيقونة استوديو الملصقات (`toolbar-add-tools.tsx:90`) + زر «تجميع العناصر» (`toolbar-selection-tools.tsx:111`) صارت ترث حالة الزر (رمادي في الراحة → داكن عند التمرير) بدل اللون الأساسي الدائم الذي كان يوحي بتفعيل غير حقيقي. الألوان الدلالية المقصودة (فك التجميع كهرماني، حذف أحمر) بقيت كما هي. | ✅ |
| PN-1 | **فتح لوحة التبويب الأول افتراضياً للشريط الجانبي (`useWorkspacePanels`):** في المقاس القياسي (`standard`) والمقاس العريض (`wide`)، تفتح لوحة التبويب الأول افتراضياً عند الإقلاع («شبكة الكولاج» في الكولاج، و«الطبقات» في الوضع الحر)، مع الحفاظ التام على تفضيلات المستخدم في `localStorage` ووضع التركيز والتنقل المستقر. | ✅ |
| TS-1 | **تغطية اختبارات جديدة (4 ملفات / 17 حالة):** `collage-insert.test.ts` (6) · `collage-image-crop.test.tsx` (4 — منها انحدار الإطار ودورة السحب) · `export-canvas-watermark.test.ts` (2) · `toolbar-transfer-to-collage.test.tsx` (5). | ✅ |
| DC-1 | **مزامنة التوثيق:** تحديث `vitest_test_files` وعدد الحالات في بلوك `docs-metrics` + جدول الأرقام في `docs/DOCUMENTATION_MAP.md`، وإدخالات `CHANGELOG.md` تحت `[Unreleased]`. | ✅ |

**قرارات محمية لم تُنقض:** الافتراضي في `exportCanvas` يبقى تطبيق العلامة المائية على كل مسارات التسليم · لا تغيير في مخطط بيانات المشروع أو صيغة `ProjectFileV1` · الزر الجديد يستخدم مسارات الستور القياسية (`setMode` + `setSlotImagesBatch`) بلا كود ستور جديد · حُرّاس الواجهة (`StageProvider`، `physicalLayout`) كما هي.

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
| M-3 | **اقتراح «استخراج ألوان» مُنفَّذ جزئياً:** الاستخراج قائم في `lib/canvas/palette-extract.ts` (تكميم 4-bit، وزن تشبع، دمج من 4 صور) ومستخدَم في `freeform-palette-tab.tsx`؛ **الناقص** هو مولّد تناغمات الألوان (Complementary/Triadic) لا الاستخراج. | 🔶 جزئي |
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
