# 📦 Grido Studio Pro — Design System & UI Specification (v2.0)

> **Role / Owner:** Lead UI/UX Architect & Frontend Systems Engineer
> **Platform:** Desktop Web (Marketing Landing Page) & Admin Dashboard Shell (Wails/Go Native Reference)
> **Aesthetic Paradigm:** Microsoft Fluent 2 · Windows 11 Mica & Acrylic · Pure Neutral Charcoal
> **Localization & Direction:** Bi-directional First (Primary: Arabic `RTL` | Secondary: English `LTR`)
> **Status:** Production-Synced — كل قيمة ومواصفة في هذه الوثيقة مأخوذة من الكود المنفَّذ (`admin-web/src/index.css` والمكونات) مع مراجع `ملف:سطر` · آخر مزامنة: `2026-10-29`

---

## 📑 Table of Contents | فهرس المحتويات
1. [Product Context & Design Philosophy](#1-product-context--design-philosophy)
2. [Design Tokens (The Foundation)](#2-design-tokens-the-foundation)
3. [Typography System & Scale](#3-typography-system--scale)
4. [Fluent Materials, Geometry & Elevation](#4-fluent-materials-geometry--elevation)
5. [Core Component Library & States](#5-core-component-library--states)
6. [Landing Page UI Architecture (Section-by-Section Spec)](#6-landing-page-ui-architecture-section-by-section-spec)
7. [Physics-Based Motion & Micro-Interactions](#7-physics-based-motion--micro-interactions)
8. [Internationalization (RTL/LTR) & Accessibility (A11y)](#8-internationalization-rtlltr--accessibility-a11y)
9. [Architectural Changelog (سجل التحديثات التنفيذية)](#9-architectural-changelog-سجل-التحديثات-التنفيذية)

---

## 1. Product Context & Design Philosophy

- **Product Name:** Grido Studio Pro (استوديو جريدو برو)
- **Core Tagline:**
  *"استوديو متكامل لطباعة صور الهوية والفيزا، الكولاج، وتعديل الصور بدقة فائقة مع محرك ذكاء اصطناعي فوري وتجربة ويندوز 11 العصرية."*

### Design Philosophy | فلسفة التصميم
صُممت صفحة الهبوط الخاصة بـ **Grido Studio Pro** لتمنح المستخدم شعوراً فورياً بأنه يتفاعل مع تطبيق سطح مكتب أصيل (Native Windows 11 Desktop App) عالي الأداء يعمل داخل المتصفح. يرتكز النظام البصري على ثلاث ركائز أساسية:

1. **لغة تصميم Microsoft Fluent 2:** زوايا منحنية مدروسة (Radii)، عمق طبقي محاكٍ لخامات `Mica` و`Acrylic`، حد علوي مضيء بسمك `1px` (Specular Edge)، والتزام بشبكة أبعاد ثمانية (`8px Spatial Grid`).
2. **حيادية لونية مطلقة (`Pure Neutral Charcoal`):** درجات رمادي فحمي خالية من أي انحياز لوني (`#121212` – `#262626`) لضمان بروز الصور ودقة ألوان البشرة والطباعة دون تشويه بصري.
3. **إشارات لونية وظيفية عالية الدلالة (High-Signal Accents):** الأزرق الكهربائي `#3b82f6` لقيادة الإجراءات (CTAs) وعناصر الذكاء الاصطناعي، والأزرق الفاتح `#60a5fa` للقراءات والروابط، مع ألوان دلالية واضحة (`success` / `warning` / `error`).
4. **دستور "Zero Button Glow":** أُلغيت توهجات الأزرار الزرقاء نهائياً (`--material-shadow-glow` و`--grido-brand-glow` **غير موجودتين** في الكود) — العمق يتحقق بالطبقات والحدود والظلال الناعمة فقط (`index.css:73,127-132`).

---

## 2. Design Tokens (The Foundation)

القرارات البصرية مبنية على متغيرات دلالية معرّفة في `index.css`، ومربوطة بـ Tailwind CSS v4 عبر توجيه `@theme inline` (إعداد CSS-first — **لا يوجد `tailwind.config.js` في المشروع**).

### A. Core CSS Custom Properties — `index.css:36-81`
```css
:root {
  /* 1. Surfaces (Pure Charcoal) */
  --grido-workspace-canvas: #121212;   /* خلفية الصفحة الرئيسية */
  --grido-surface-sidebar:  #171717;   /* الأشرطة الجانبية وقشرة اللوحة */
  --grido-surface-card:     #1E1E1E;   /* البطاقات المرتفعة (ds-card) */
  --grido-surface-card-hover:#262626;  /* حالة تحويم البطاقات التفاعلية */
  --grido-surface-inset:    #141414;   /* البطاقات الغائرة وحقول الإدخال */

  /* 2. Borders & Specular */
  --grido-border-subtle:    #2C2C2C;   /* الحدود القياسية والفواصل */
  --grido-border-specular:  rgba(255, 255, 255, 0.08); /* حافة Windows 11 العلوية */

  /* 3. Brand Accents */
  --grido-brand-primary:    #3b82f6;   /* الأزرق الكهربائي الأساسي */
  --grido-brand-hover:      #2563eb;   /* الأزرق الداكن عند التحويم */
  --grido-brand-light:      #60a5fa;   /* أزرق فاتح للقراءات والروابط */

  /* 4. Typography Colors */
  --grido-text-primary:     #F5F5F5;   /* نص أساسي */
  --grido-text-secondary:   #9E9E9E;   /* نص فرعي */
  --grido-text-muted:       #8A8A8A;   /* تلميحات وحالات ثانوية */

  /* 5. Semantic Statuses */
  --grido-status-success:   #10b981;
  --grido-status-warning:   #f59e0b;
  --grido-status-error:     #ef4444;
}
```

### B. Tailwind v4 Mapping — `index.css:5-34`
```css
@theme inline {
  --font-sans: 'IBM Plex Sans Arabic', 'Cairo', 'Inter', system-ui, ...;
  --font-arabic: 'IBM Plex Sans Arabic', 'Cairo', sans-serif;
  --font-latin: 'Inter', 'Segoe UI Variable', system-ui, sans-serif;
  --font-mono: 'JetBrains Mono', 'Space Mono', ui-monospace, ...;

  --color-workspace: #121212;
  --color-sidebar:   #171717;
  --color-card:      #1E1E1E;
  --color-card-hover:#262626;
  --color-inset:     #141414;
  --color-border-subtle: #2C2C2C;
  --color-border-specular: rgba(255, 255, 255, 0.08);
  --color-brand-primary: #3b82f6;
  --color-brand-hover:   #2563eb;
  --color-brand-light:   #60a5fa;
  --color-text-primary:   #F5F5F5;
  --color-text-secondary: #9E9E9E;
  --color-text-muted:     #8A8A8A;
  --color-status-success: #10b981;
  --color-status-warning: #f59e0b;
  --color-status-error:   #ef4444;

  --breakpoint-xs: 24rem;
}
```

> **ممارسة معتمدة (جلسة 0.90):** الاستخدام الافتراضي في المكونات هو أدوات التوكنات مباشرة (`bg-sidebar`/`bg-card`/`bg-inset`, `border-border-subtle`, `text-text-primary/secondary/muted`, `brand-primary/hover/light`, `status-*` مع معدِّلات الشفافية `/15 /40 /70 /85`). القيم الحرفية مسموحة فقط في: لوحات الاستنساخ البصري (`AppMockup`، مشاهد `CMYK3DStack`/`Biometric3DCard`)، والاستعارات الدلالية المقصودة (أخضر واتساب `#25D366`، سماوي CMYK `#06b6d4`، تدرجات السماء `#38bdf8`). عند إعادة الاستخدام المتكرر يُفضَّل التجسيد في فئة مشتركة من `@layer components` (مثل `ds-card`/`ds-icon-tile`).

### C. Geometry & Radii — `index.css:66-71`
| التوكن | القيمة | الاستخدام |
| :--- | :--- | :--- |
| `--radius-sm` | `4px` | الشارات الصغيرة (Tags) |
| `--radius-md` | `8px` | الأزرار وحقول الإدخال |
| `--radius-lg` | `12px` | البطاقات الغائرة والحاويات الفرعية |
| `--radius-xl` | `16px` | بلاطات الأيقونات (`ds-icon-tile`) |
| `--radius-2xl` | `20px` | البطاقات القياسية (`ds-card`) وإطارات المحاكاة |

### D. Elevation (Shadows) — `index.css`
```css
--material-shadow-2: 0 2px 4px rgba(0, 0, 0, 0.3);      /* الساكن */
--material-shadow-4: 0 4px 8px rgba(0, 0, 0, 0.4);      /* التحويم/القوائم */
--material-shadow-8: 0 8px 16px rgba(0, 0, 0, 0.5);     /* العناصر العائمة/المحاكاة */
--material-shadow-16: 0 16px 40px rgba(0, 0, 0, 0.55);  /* النوافذ الحوارية */
```
**درجات ارتفاع مسمّاة (Fluent 2 Elevation Ramp)** — تُستبدل بها `shadow-*` الحرفية في العناصر العائمة: `.ds-elevate-rest` (2) · `.ds-elevate-raised` (4) · `.ds-elevate-overlay` (8) · `.ds-elevate-dialog` (16) — معرَّفة في `@layer components` (`index.css`).
لا يوجد توكن توهج — الإبراز يتم بالأزرق عند حدود التفاعل لا بظلال ملونة (Zero Button Glow).
**مستهلكوها:** أزرار الهيدر ودرج الجوال (`Header.tsx`) · زر التحميل العائم (`LandingPage.tsx`) · زر واتساب (`WhatsAppButton.tsx`).

---

## 3. Typography System & Scale

الخطوط تُحمَّل مرة واحدة عبر `<link>` في `index.html:52-55` (preconnect + `display=swap`): **Cairo** (`400–900`) للعناوين العرضية، **IBM Plex Sans Arabic** (`300–700`) لكافة نصوص الواجهة، **JetBrains Mono** (`400–800`) للأرقام والقراءات التقنية.

### A. Font Families (`index.css:87-115`)
1. **الافتراضي:** `html, body { font-family: var(--font-arabic); }` — IBM Plex Sans Arabic (`index.css:87-88`)، وكل العناوين ترثه مع `font-feature-settings` للتعليم العربي (`index.css:101-106`).
2. **`.font-display`:** Cairo بوزن `800` — مخصص للعناوين العرضية؛ المستهلك الحالي في **لوحة الإدارة** (Login, Sidebar, جداول) وليس في صفحة الهبوط (`index.css:108-111`).
3. **`.font-mono`:** JetBrains Mono بخاصية `!important` — لأرقام الخطوات والأسعار والإصدارات (`index.css:113-115`).

### B. Typographic Scale (منفَّذ فعلياً — لا فئات مخصصة)
> **ملاحظة معمارية:** الفئات القديمة (`text-hero`, `text-h1`, `text-h2`, `text-h3`, `text-body`) كانت بلا مستهلك وحُذفت من `index.css` (جلسة 0.84)؛ المقياس المعتمد هو أدوات Tailwind القياسية:

| العنصر (Role) | الفئات المنفَّذة | المرجع |
| :--- | :--- | :--- |
| **Hero Title** | `text-3xl sm:text-4xl md:text-5xl lg:text-[56px] font-black tracking-tight leading-[1.15] text-balance` (مع span `text-gradient-brand`) | `HeroSection.tsx:55-60` |
| **Section Header (H2)** | عنوان أبيض كبير **واحد** فقط لكل قسم: `text-2xl sm:text-4xl lg:text-5xl font-black tracking-tight` (مقاس `xl`) · `… lg:text-[40px] leading-[1.2]` (مقاس `lg` للأعمدة الضيقة) | `SectionHeader.tsx` |
| **Section Description (وصف القسم)** | **أُعيد بمقاس مصقول (جلسة 0.90):** `mt-3 text-xs sm:text-sm text-text-secondary leading-relaxed text-balance` — موسّط بعرض `max-w-2xl mx-auto` (افتراضي الأقسام الثمانية) أو `max-w-md` بمحاذاة البداية (`align="start"` في Windows 11)؛ الشارة (eyebrow) تبقى محذوفة (جلسة 0.87) | `SectionHeader.tsx:48-56` |
| **Hero Sub-headline** | `text-sm sm:text-base md:text-lg text-text-secondary leading-relaxed text-balance` (رُبط بالتوكن — جلسة 0.90) | `HeroSection.tsx:63-65` |
| **Card Title (H3)** | `text-sm sm:text-base font-bold text-white` | `AiSpotlightSection.tsx:223` |
| **Body / Desc** | `text-xs leading-relaxed text-text-secondary` (رُبط بالتوكن — جلسة 0.90) و`text-xs sm:text-sm` داخل البطاقات | `Windows11Section.tsx:57` |
| **Technical Readout** | `font-mono` لأرقام الخطوات `tabular-nums` والأسعار والإصدارات | `AiSpotlightSection.tsx:228` · `PricingSection.tsx:85` |

---

## 4. Fluent Materials, Geometry & Elevation

### A. Spatial Grid & Container Architecture
- **شبكة أساسية:** مضاعفات `8px` (`8px, 16px, 24px, 32px, 48px, 64px, 96px`).
- **الحاوية القياسية:** `max-w-6xl mx-auto px-4 sm:px-6 lg:px-8` في كل الأقسام.
- **إيقاع الأقسام:** `py-16 md:py-24 relative scroll-mt-20` لكل قسم مرتبط بالتنقل؛ الهيرو استثناء: `pt-8 pb-16 md:pt-14 md:pb-24` (`HeroSection.tsx:32`).
- **تعويض الهيدر اللاصق:** `scroll-padding-top: 6rem` على `html` (`index.css:415-420`).

### B. Production Surface Classes — كلها في `index.css`

```css
/* 1. الحافة المضيئة لطراز Windows 11 — index.css:121-124 */
.fluent-specular {
  border: 1px solid var(--grido-border-subtle);
  box-shadow: inset 0 1px 0 0 rgba(255, 255, 255, 0.08);
}

/* 2. بطاقة النظام القياسية — index.css:465-469 (داخل @layer components) */
.ds-card {
  background: var(--grido-surface-card);      /* #1E1E1E */
  border: 1px solid var(--grido-border-subtle);
  border-radius: var(--radius-2xl);           /* 20px */
}

/* 3. بطاقة غائرة (Inset) — index.css:472-476 */
.ds-card-inset {
  background: var(--grido-surface-inset);     /* #141414 */
  border: 1px solid var(--grido-border-subtle);
  border-radius: var(--radius-lg);            /* 12px */
}

/* 4. بلاطة أيقونة قياسية — index.css:480-488 */
.ds-icon-tile {
  background: var(--grido-surface-inset);
  border: 1px solid var(--grido-border-subtle);
  border-radius: var(--radius-xl);            /* 16px */
  display: flex; align-items: center; justify-content: center; flex-shrink: 0;
}

/* 5. إطار محاكاة نافذة التطبيق — index.css:570-577 */
.app-mockup {
  background: rgba(30, 30, 30, 0.88);
  backdrop-filter: blur(24px) saturate(115%);
  border: 1px solid var(--grido-border-subtle);
  border-radius: var(--radius-2xl);
  box-shadow: inset 0 1px 0 0 rgba(255, 255, 255, 0.08), var(--material-shadow-8);
}
```

### C. Visual Primitives (بدائيات الإبراز) — بعد v2.7
| الفئة | الوظيفة | المرجع |
| :--- | :--- | :--- |
| `.landing-card` | بطاقة قسم الهبوط القياسية: سطح card صلب + حد شعري + استدارة 12px بلا ظل افتراضي | `index.css` (طبقة components نطاق `.landing-shell`) |
| `.landing-visual` | إطار المعاينة الغائر: سطح inset بتدرج إضاءة علوي خافت + حد شعري + 12px، بلا ارتفاع مفروض | `index.css` |
| `.landing-switch` | مجموعة مبدّل عرض: أزرار مباشرة ≥44px مع حالة `[aria-pressed='true']` | `index.css` |
| `.landing-facts / .landing-fact` | صفوق معلومات مختصرة بفواصل شعرية منطقية | `index.css` |
| `.aurora-bg` | هالة محيطة (أزرق/بنفسجي خافت) — مستهلكها لوحة الإدارة فقط | `index.css` |
| `.spotlight-card` | بطاقة اللوحة مع وميض يتبع المؤشر (تُربط `--mouse-x/y` في مكوّنات الإدارة) | `index.css` |

> 🧹 **تنظيف v2.7:** حُذفت بدائيات الهبوط الميتة بعد إعادة التصميم: `.card-specular-edge` و`.text-gradient-brand` و`.spotlight-hover` (مع تتبّع المؤشر العام) و`.cta-shine` و`.ai-badge`/`.ai-badge-pulse` و`.ds-card`/`.ds-card-inset`/`.ds-icon-tile`/`.ds-card-interactive`/`.ds-elevate-*`/`.ds-focusable`/`.fluent-specular`/`.no-scrollbar` — تحقّق بلا مستهلكين في `admin-web/src`. تظل `.magnetic-pill` و`.tab-content-reveal` و`.aurora-bg` و`.app-mockup` و`.spotlight-card` حيّة في لوحة الإدارة.

### D. Layering Rule (@layer components) — `index.css:458-462`
بدائيات `.ds-card/.ds-card-inset/.ds-icon-tile/.btn-primary/.btn-secondary` مسجَّلة عمداً داخل `@layer components` كي تتغلب عليها utilities الطبقة المتأخرة عند الحاجة (طبقات Tailwind v4 تُحسم قبل النوعية). هذا ما يجعل أمثلة مثل `bg-sidebar` (`ComparisonSection.tsx:66`) و`border-brand-primary/40` (`ComparisonSection.tsx:103`) وحدود فتح الأسئلة (`FaqSection.tsx:78-79`) فعّالة. **أي بدائية CSS غير طبقية تُكتب مستقبلاً ستُلغي utilities بصمت — تُمنع.**

---

## 5. Core Component Library & States

### A. Interactive States Matrix (المنفَّذ فعلياً)

| المكون | الساكنة (Resting) | التحويم (Hover) | الضغط (Active) |
| :--- | :--- | :--- | :--- |
| **`.btn-primary`** `index.css:135-160` | `bg #3b82f6` · نص أبيض · `14px/600` · `radius-md` · `10px 22px` · ظل `0 1px 2px rgba(0,0,0,.3)` | `#2563eb` + `translateY(-1px)` | `scale(0.98)` |
| **`.btn-secondary`** `index.css:162-187` | `background: var(--grido-surface-card)` · حد `#2C2C2C` · `14px/500` · `10px 20px` (رُبط بالتوكن — جلسة 0.90) | `var(--grido-surface-card-hover)` + حد `white/20` + `translateY(-1px)` | `scale(0.98)` |
| **`.ds-card-interactive`** `index.css:491-500` | — | حد `white/20` + خلفية `#262626` | `scale(0.99)` |
| **`.ds-range`** `index.css:218-286` | مسار `8px` بخلفية `#141414` وحد subtle · مقبض `18px` بخلفية `--range-accent` | تمدد المقبض `scale(1.1)` | انضغاط `scale(0.95)` |
| **أزرار الهبوط** (`.btn-primary/.btn-secondary` داخل `.landing-shell`) | `min-height/min-width: 44px` + خلفية التوكن | تغيير لون فقط بلا رفع (`transform: none`) | بلا تحجيم |

أزرار الهيرو والبانرات تضيف فوق فئات الأساس أدوات الحركة: `hover:scale-105 active:scale-95` (`HeroSection.tsx:73,81`).

### B. Sliders (حاسبة التوفير)
- التعبئة حتى المقبض عبر `--range-fill` + `background-image` متدرج، مع انعكاس الاتجاه في RTL (`[dir='rtl'] .ds-range`) — `index.css:229-250`.
- لون المقبض يُمرَّر من المكوّن: `[--range-accent:var(--grido-brand-primary)]` للزبائن و`[--range-accent:var(--grido-status-success)]` للسعر (رُبطا بالتوكنات — جلسة 0.90) (`RoiCalculator.tsx`).

### C. Badges & Telemetry Pills — بعد v2.7
- أُزيلت `.ai-badge` و`.ai-badge-pulse` من الكود مع شارة إصدار الهيرو؛ يُعرض الإصدار نصاً في سطر أعلى العنوان (`HeroSection.tsx`).
- **وسوم الحالة:** وسم النجاح النصي `text-status-success bg-inset border-border-subtle` (مثال: `ComparisonSection.tsx`).
- **مبدّلات الهبوط:** `.landing-switch` مع `aria-pressed` هي الوسم التفاعلي الموحد (عرض المعاينة/المجسم، العملة، خطوات الجولة).

### D. Sticky Navigation Header (`Header.tsx`) — بعد v2.7
- **السطح:** `.landing-header` لاصق بخلفية `rgba(18,18,18,0.94)` + `blur(16px)` وحد سفلي شعري؛ ارتفاع ثابت `min-h-18` بلا حركة قياس.
- **الروابط:** 7 روابط مسطّحة `.landing-nav-link` (≥44px) مع `aria-current='location'` عبر scrollspy بـ IntersectionObserver: المميزات · الذكاء الاصطناعي · ويندوز 11 · الحاسبة · أمثلة الاستخدام · الأسعار · الأسئلة. حُذفت كبسولة Magic Pill المتحركة وشريط تقدم التمرير (آليتا قياس/تمرير كانا يعملان في كل حدث).
- **زر التحميل:** `.btn-primary` مع وقع الإصدار من `useAppVersion()` بلا fallback مُخترع (يُخفى سطر الإصدار إن غاب).
- **قائمة الجوال:** إفصاح غير نمطي (Non-modal disclosure) بـ `aria-expanded`/`aria-controls` و`hidden`، عناصر ≥44px، يُغلق بـ Escape أو النقر/التركيز خارجه أو التبديل إلى سطح المكتب `min-width: 80rem`.

### E. Admin Dashboard Shell (قشرة اللوحة)
- حلقة تركيز مزدوجة إلزامية: `0 0 0 2px canvas, 0 0 0 4px brand` على كل عنصر تفاعلي في `.admin-shell` و`.landing-shell` (`index.css:516-519,611-616`).
- بطاقة `spotlight-card` تتبع المؤشر، دخول محتوى التبويب `tab-content-reveal`، وصفوف جداول بانتقال هادئ (`index.css:528-605`).

---

## 6. Landing Page UI Architecture (Section-by-Section Spec)

### الهيكل العام — `LandingPage.tsx` (بعد v2.7)
- القشرة: `dir="rtl"` + `.landing-shell` + خلفية `--grido-workspace-canvas` (`LandingPage.tsx`).
- **رابط التخطي:** `.skip-to-content` أول عنصر تفاعلي (`LandingPage.tsx`).
- **ترتيب الأقسام:** Hero → Bento → AI → Windows 11 → ROI → Comparison → أمثلة الاستخدام → Pricing → FAQ → CTA Banner، وبعدها Footer + زر واتساب عائم + زر تحميل سفلي بعد تمرير `500px`.
- **إيقاع الأقسام:** `.landing-section` يوفر `3.5rem` رأسياً (`4.5rem` من `48rem`)، و`html { scroll-padding-top: 6rem }` يوفر تعويض الهيدر وحده — بلا مضاعفة `scroll-margin`.
- **الكشف عند التمرير:** تحسين اختياري على البطاقات فقط (`.landing-section .landing-card` — opacity `0.72→1` خلال 280ms)؛ المحتوى مرئي افتراضياً، وغياب IntersectionObserver أو تفعيل `prefers-reduced-motion` يُبقيه ظاهراً دائماً (`LandingPage.tsx:44-82`).
- **أُزيل:** تتبّع المؤشر العام للـ spotlight، وأغلفة `.reveal-on-scroll` المحوِّلة، والشريط العلوي المكرر؛ بقي زر التحميل العائم مخنوقاً بـ rAF مع إلغاء صحيح.

### Section 1: The Hero — `#top` (`HeroSection.tsx`) — بعد v2.7
- **الخلفية:** إضاءة CSS ثابتة `.landing-hero-light` (تدرج شعاعي + خطوط أعمدة مقنّعة) بدل مشهد Three.js الجوّي الذي حُذف مع `Hero3DScene.tsx` لتوفير حزمة WebGL كاملة على الخلفية.
- **سطر الإصدار:** نص واحد `Grido Studio لـ Windows · v{version}` بلا شارة نابضة.
- **العنوان:** «صور الهوية والطباعة،» + سطر `text-brand-light` «في استوديو واحد.»
- **الوصف:** عزل الخلفية وتجهيز صور الجوازات والفيزا وتوزيعها على ورقة الطباعة — بلا ادعاء عمل دون إنترنت مطلق.
- **صف الإجراءات:** أساسي «تحميل النسخة التجريبية مجاناً» + ثانوي «جولة في 3 خطوات» يفتح جولة `LandingModal` (حوار `<dialog>` أصلي بـ Portal وقفل تمرير متعدد المراجع واستعادة تركيز).
- **صف الحقائق:** `.landing-facts` — «عزل وطباعة محليان · ترخيص دائم بدفعة واحدة» (حُذفت ادعاءات الذاكرة والحجم غير المسندة).
- **العرض البصري:** `AppMockup` بمبدّل عرض ثنائي `.landing-switch` (المحاكاة التفاعلية / صورة البرنامج الفعلية) وزر «تكبير الواجهة» يفتح حوار اللقطة، وزر «إيقاف/تشغيل المحاكاة» — المحاكاة تتوقف خارج الشاشة وعند تقليل الحركة وخلف الحوار المفتوح (`paused={showTour}`).

### Section 2: Core Capabilities (Bento Grid) — `#capabilities` (`BentoGrid.tsx`) — بعد v2.7
- رأس `SectionHeader` بعنوان «من الصورة إلى ورقة الطباعة» ووصف مختصر غير ادعائي.
- شبكة `lg:grid-cols-12 gap-5` بأربع بطاقات `.landing-card` (سطوح صلبة بلا هوفر لوني ولا Specular ولا Spotlight):
  1. `lg:col-span-8` — تجهيز صور الهوية والفيزا: مبدّل «معاينة / مجسم 3D» بـ `aria-controls="identity-preview"`؛ المعاينة صورة + قائمة خطوات `ol` مرقّمة نصياً.
  2. `lg:col-span-4` — كولاج بمقاسك: مخطط شبكي `role="img"` بوصف عربي بدل أرقام مقاسات مكررة.
  3. `lg:col-span-4` — ملفاتك على جهازك: قائمة تعريفات `dl` بثلاثة صفوف (تخزين محلي · تخطيط وطباعة دون اتصال · معالجة سحابية عند الطلب) — صياغة صادقة بدل «معطل نهائياً».
  4. `lg:col-span-8` — ورقة جاهزة للطباعة: مبدّل «ورقة الطباعة / طبقات CMYK 3D» بـ `aria-controls="print-preview"`، وصفوف `dl` (مقاس قياسي أو مخصص · هوامش قابلة للضبط · خطوط قص تلقائية) بدل ادعاء 0.5mm الثابت.
- **المشاهد ثلاثية الأبعاد (v2.7):** `Biometric3DCard` بطاقة ID فاتحة توضيحية (جسم مستدير + نسيج Canvas + شريحة + إطار صورة + شعاع مسح) و`CMYK3DStack` أربع صفائح فصل لوني فوق ورقة طباعة، يشاركان محرك `src/lib/landing/` (كاميرا Orthographic ملائمة العرض، إضاءة RoomEnvironment، حلقة rAF بحد 30fps تتوقف خارج الشاشة، سحب/أسهم/`Home`، أزرار إيقاف وإعادة زاوية، بديل مصوّر عند فشل WebGL، وتفريغ كامل للموارد). الحد الأدنى للارتفاع `320px` والعرض الافتراضي للمعاينة المصوّرة.

### Section 3: AI Engine Spotlight — `#ai-engine` (`AiSpotlightSection.tsx`) — بعد v2.7
- رأس `SectionHeader`: «أدوات ذكية، والنتيجة تحت تحكمك» + وصف «عزل الخلفية وتحسين الصورة، مع ترميم سحابي اختياري عند الحاجة».
- بطاقة `.landing-card` واحدة (`lg:col-span-5` وسائط / `7` خطوات):
  - **مقياس قبل/بعد:** `role="slider"` كامل (أسهم، Home/End، PageUp/Down، `aria-valuetext` يقرأ نسبة الأصل/بعد المعالجة بشكل صحيح — الطبقة المقصوصة هي الأصل)، سحب Pointer مع `setPointerCapture` وإلغاء آمن، مقبض 44px، و`touch-pan-y` للتمرير العمودي.
  - **الخطوات:** قائمة `ol` مسطّحة بفواصل شعرية (إضافة الصورة → عزل وتحسين مع توضيح أن الترميم السحابي اختياري → تجهيز للطباعة) — بلا بطاقات متداخلة ولا أيقونات زخرفية.
- تسمية توضيحية تحت الصورة: «مثال توضيحي؛ النتيجة تختلف حسب الصورة».

### Section 4: Windows 11 Native Experience — `#windows-experience` (`Windows11Section.tsx`) — بعد v2.7
- تقسيم عمودين على `lg` بنص وصف مصقول وبطاقات صفوف مسطّحة بفواصل شعرية بدل بطاقات `ds-card` متداخلة.
- حُذفت الأرقام غير المسندة (`<120MB`، `118 MB`، «مطابقة ألوان 100%»، «100% أوفلاين») وصيغت الميزات كقدرات: واجهة داكنة مريحة، إقلاع سريع، حفظ تلقائي، توافق مع طابعات الاستوديو المثبتة في ويندوز — وتبقى ادعاءات الأداء لمستند قياس فعلي إن وُجد.

### Section 5: ROI Calculator — `#roi` (`RoiCalculator.tsx`) — بعد v2.7
- بطاقة `.landing-card` بعنوان «حاسبة الوقت والعائد التقديري» ووصف صريح: «سيناريو عمل افتراضي، وليس وعداً بالتوفير أو الربح».
- **مبدّل عملة** `.landing-switch` بحالة مرفوعة في `LandingPage` متزامنة مع قسم الأسعار (قرار محمي 2026-10-25). تبديل العملة يعيد سعر الطقم إلى قيمة العملة افتراضياً بشكل متزامن (`key={currency}`) ويحفظ عدد الزبائن.
- **منزلقان** `.ds-range` بارتفاع لمس 44px: «زبائن يومياً» `5–150` بخطوة `5` و«سعر الطقم» حسب نطاق العملة، مع `aria-valuetext` وربط `aria-describedby` بشرح الافتراضات.
- **النتائج:** `output` مسمّاة (`aria-labelledby`) بخط `font-mono tabular-nums`: الوقت = الزبائن × 5.5 دقيقة × 26 يوماً ÷ 60 (تقريب واحد نهائي)، والإيراد = الزبائن × السعر × 26 × 25% زيادة زبائن — والشرح يذكر «زيادة 25% في عدد الزبائن» لا «25% من الوقت».
- سطر الافتراضات أسفل البطاقة يوضح أنها توضيحية وليست قياساً لأداء البرنامج.

### Section 6: Speed & Legacy Comparison — `#comparison` (`ComparisonSection.tsx`) — بعد v2.7
- رأس `SectionHeader` بعنوان مقارنة مباشرة بين سير العمل اليدوي وأدوات جريدو.
- عمودان بصفوف مسطّحة بفواصل شعرية (بدون بطاقات متداخلة ولا وسوم إبراز رقمية): التقليدي — قص وتعديل يدوي، تحديد يدوي للخلفية، ترتيب ورقي غير محسوب، رفع صور لخوادم خارجية في الأدوات السحابية، اشتراكات دورية؛ جريدو — تجهيز أسرع بإجراءات أقل، عزل قابل للمراجعة والتعديل، هوامش وخطوط قص قابلة للضبط، عمل محلي مع خيارات سحابية اختيارية، رخصة دائمة بلا اشتراك.
- حُذفت الوسوم غير المسندة (`أسرع 90%`، `توفير 35%`، `مطابق لـ ICAO`، `أمان تام`) — تبقى ادعاءات المطابقة موثقة فقط إذا أُسندت إلى مرجع فعلي.

### Section 7: Usage Examples — `#testimonials` (`TestimonialsSection.tsx`) — بعد v2.7
- القسم صار «أمثلة استخدام» مصوغة من `USAGE_EXAMPLES` في `landing-content.ts` بدل شهادات زبائن: ثلاث بطاقات `.landing-card` تشرح سيناريوهات (صور الهوية والفيزا، ورقة متعددة الصور، عمل محلي وخيارات سحابية) مع توضيح مراجعة متطلبات الجهة المستلمة.
- حُذفت الأسماء والشخصيات والشارات («مرخّص») والأرقام غير المسندة؛ القسم لا يدّعي عملاء حقيقيين. راجع `changelog/fragments/` لتاريخ هذا القرار.

### Section 8: Pricing & Licensing — `#pricing` (`PricingSection.tsx`) — بعد v2.7
- رأس `SectionHeader`: «رخصة دائمة، بدفعة واحدة» + وصف «بلا اشتراكات دورية، مع تجربة مجانية قبل الشراء».
- **مبدّل عملة** `.landing-switch` بحالة مشتركة مع الحاسبة يحدّث السعر ورابط واتساب فوراً (قرار محمي 2026-10-25)؛ قيم `CURRENCIES` في `landing-content.ts` دون تغيير (IQD 75,000 · SAR 199 · USD 49).
- بطاقة سعر واحدة `lg:col-span-7` (`landing-card`): السعر الحالي `font-mono` بجانب السعر الأصلي مشطوباً `<del>`، ست مزايا بعلامات نصية صادقة (تحرير وطباعة محلية، ترميم سحابي اختياري، تصدير 300 DPI وCMYK، قوالب مقاسات، كولاج، هوامش وخطوط قص)، ثم زرّان: «طلب مفتاح الترخيص (<السعر> <العملة>)» عبر `wa.me` برسالة تحمل السعر والعملة، و«حمّل وجرّب مجاناً».
- عمود ضمانات `lg:col-span-5` بصفوف مسطّحة: التجربة على معداتك قبل الشراء · تحديثات مجانية مع الرخصة الدائمة · تفعيل ودعم مباشر.

### Section 9: FAQ — `#faq` (`FaqSection.tsx`) — بعد v2.7
- عمودان على `lg`: رأس + زر واتساب (`lg:col-span-5`) مقابل أكورديون (`lg:col-span-7`) داخل `.landing-card`.
- **ستة أسئلة** بأكورديون `aria-expanded` + `aria-controls` + `role="region"` مسمّى لكل جواب، تنقل أسهم/Home/End بين الأسئلة، أولها مفتوح افتراضياً، وأزرار الأسئلة ≥44px مع `motion-reduce:transition-none`.
- المحتوى صادق: التجربة المجانية أولاً، الأدوات السحابية الاختيارية تحتاج اتصالاً، توفر المقاسات يعتمد تعريف الطابعة، القوالب لا تضمن قبول الصورة (راجع الجهة المستلمة).

### Section 10: Closing CTA Banner — `CtaBanner.tsx` — بعد v2.7
- بطاقة `.landing-card` منسّطة بعنوان ختامي وزر تحميل أساسي وسطر ثانوي للتجربة المجانية — بلا هالة `aurora-bg` ولا ادعاء حجم المثبت.

### Footer (`Footer.tsx`) — بعد v2.7
- خلفية `--grido-surface-inset` + حد علوي شعري، شبكة هوية/تنقل/دعم وقانوني، روابط `aria` صحيحة — بلا شارة «جميع الأنظمة تعمل بكفاءة» أو رقم إصدار fallback مُخترع (وقع الإصدار يُعرض من مصدره أو يُحذف).

---

## 7. Physics-Based Motion & Micro-Interactions — بعد v2.7

### A. المنحنيات والمدد المنفَّذة فعلياً
| الاستخدام | المنحنى / المدة | المرجع |
| :--- | :--- | :--- |
| دخول بطاقات الأقسام (اختياري) | `landing-content-enter 0.28s ease-out` — opacity `0.72→1` فقط، والبطاقة مرئية قبلها | `index.css` · `LandingPage.tsx:44-82` |
| ظهور زر التحميل العائم | نفس المفتاح بمدة `0.18s` | `index.css` |
| ظهور الحوارات | `fadeIn 0.25s ease-out` | `index.css` |
| دخول محتوى تبويب الإدارة | `tabReveal 0.32s` | `index.css` |
| تفاعلات الأزرار والمبدّلات | `150ms` (لون/حدود فقط — بلا رفع أو تحجيم في الهبوط) | `index.css` |
| ليزر مسح الكشف في المحاكاة | `mockup-laser-sweep 2.0s` لا نهائية — تُجمَّد خارج الشاشة | `index.css` · `AppMockup.tsx` |
| مشاهد 3D | حلقة rAF بحد 30fps مع Frame-HMR: رسم عند الطلب فقط في الوضع الساكن، وتوقف كامل خارج الشاشة/خلف الحوار | `src/lib/landing/scene-loop.ts` |

### B. أداء الحركة
- حُذفت آليات القياس لكل حدث: كبسولة Magic Pill المتحركة، شريط تقدم التمرير، وتتبّع المؤشر العام — لا `getBoundingClientRect` في مسارات mousemove العامة.
- زر التحميل العائم يُحدث بحالة مخنوقة بـ rAF مع إلغاء صحيح (`LandingPage.tsx:23-41`)؛ دورة المحاكاة والمشاهد الثلاثية تتوقف عند `document.hidden` و`prefers-reduced-motion` وخارج الشاشة.
- الطبقات المتحركة تستعمل `will-change` بحدود واعية، ولا توجد حركات transform على أقسام كاملة.

### C. Reduced Motion (إلزامي) — `index.css`
- قاعدة عامة `0.01ms !important` لكل الحركات، وقاعدة نطاق `.landing-shell` تُلغي الحركات والانتقالات و`scroll-behavior` كلياً.
- على مستوى المنطق: محاكاة الهيرو تُولد معطلة مع تقليل الحركة (زر إيقاف معطّل بتوضيح)، ومشاهد 3D تعرض إطاراً ساكناً بلا دورة rAF، والكشف عند التمرير يُفصل مباشرة عند تغيّر الإعداد (`matchMedia('change')`).

---

## 8. Internationalization (RTL/LTR) & Accessibility (A11y)

### A. Bidirectional (RTL/LTR) Rules
- السمة `dir="rtl"` منضبطة في `index.html:2` ومكررة على قشرة الصفحة (`LandingPage.tsx:103`).
- **قاعدة إلزامية للكود الجديد:** الخصائص المنطقية أولاً — `ms-*/me-*`، `ps-*/pe-*`، `start-*/end-*`، `text-start/text-end`؛ أمثلة منفَّذة: `end-4` (`LandingPage.tsx`)، `inset-inline` (`index.css`)، `text-start` (`Windows11Section.tsx`, `FaqSection.tsx`).
- استثناءان مقصودان: `.cta-shine` (حركة وميض فيزيائية) و`.spotlight-hover`/`.spotlight-card` (إحداثيات مؤشر) تستعمل `left` — لأنها غير مرتبطة باتجاه القراءة.
- الأسهم الأيقونية الاتجاهية تُعكس حسب `dir` عند الاستخدام.

### B. Accessibility & Contrast Compliance — بعد v2.7
- **نسب التباين المحسوبة (WCAG 2.1 — تحقق 2026-10-16):**
  - `#F5F5F5` على `#121212` ≈ **17.4:1** (AAA).
  - `#9E9E9E` على `#121212` ≈ **7.1:1** (AAA للنص العادي).
  - `#9E9E9E` على `#1E1E1E` ≈ **6.2:1** (AA).
  - `#8A8A8A` على `#121212` ≈ **5.5:1** (AA) — رُفع من `#737373` في جلسة 0.84.
- **حلقات التركيز:** حلقة مزدوجة موحّدة على كل عنصر تفاعلي في `.landing-shell` (`outline 2px brand-light + إزاحة + ظل تفريغ`) ومثلها في `.admin-shell` (`index.css`).
- **أهداف اللمس:** كل عنصر تفاعلي في الهبوط ≥44px (أزرار، مبدّلات، روابط تنقل، أسئلة، مقابض المقارنة، أدوات المشاهد 3D).
- **لوحة المفاتيح:** مقياس المقارنة (`role="slider"`) بالأسهم وHome/End/PageUp/PageDown؛ أكورديون الأسئلة بتنقل أسهم/Home/End و`aria-controls`/`role="region"` مسمّاة؛ مشاهد 3D تقبل التركيز (سحب أو أسهم لإمالة المجسم و`Home` لإعادة الزاوية)؛ الحوارات `<dialog>` أصلية مع قفل تمرير متعدد المراجع واستعادة تركيز المصدر وإغلاق Escape/النقر على الخلفية.
- **مبدّلات العرض والعملة:** `role="group"` + `aria-label` + `aria-pressed` على كل زر؛ مبدّلا العرض في Bento يعلنان `aria-controls` لمعاينتيهما.
- **رابط التخطي:** `.skip-to-content` يظهر أولاً عند التنقل بـ`Tab`.

---

## 9. Architectural Changelog (سجل التحديثات التنفيذية)

| الإصدار | التاريخ | الملخص الهندسي |
| :--- | :--- | :--- |
| **v1.0** | `2026-10-01` | التأسيس الأولي لنظام التصميم ومواصفات صفحة الهبوط بطراز Fluent 2 (مسودة لوحة ألوان غير مطابقة للمنفَّذ). |
| **v1.1** | `2026-10-15` | **(جلسة 0.84):** تنظيف `index.css` بحذف فئات نصوص بلا مستهلك واعتماد مقياس Tailwind الأصلي، تثبيت `.fluent-specular` و`.app-mockup`، ورفع تباين النصوص إلى `#8A8A8A`. |
| **v2.0** | `2026-10-16` | **(جلسة 0.85 + إعادة مزامنة الدستور):** اعتماد بنية الأقسام الأحد عشر، وإعادة كتابة كل القيم والمواصفات من الكود الفعلي: لوحة التوكنات الصحيحة (`#121212/#1E1E1E/#141414/#2C2C2C` وأنصاف الأقطار حتى `20px`)، استبدال قسم `tailwind.config.js` بكتلة `@theme inline` الفعلية (Tailwind v4)، توثيق بدائيات 0.85 (`SectionHeader`, `ds-icon-tile`, `ds-card-interactive`, `.ds-range`, `.cta-shine`, Magic Pill، شريط التقدم)، إزالة ادعاءات غير منفَّذة (مبدّل اللغة، `shadow-brand-glow`، تتبع المؤشر في `spotlight-hover`)، وتوثيق بنية قسم الـAI المنفَّذة (`col-span-5/7`). |
| **v2.1** | `2026-10-16` | **(جلسة 0.86):** تفعيل تتبّع المؤشر لتوهج `.spotlight-hover` — توسيع محدد المتتبّع العام في `LandingPage.tsx:35` إلى `'.spotlight-card, .spotlight-hover'` فصار توهج بطاقات Bento يتبع المؤشر بدل الثبات مركزياً، وتحديث §4-C و§7-B من «فرق مسجَّل» إلى «سلوك منفَّذ». |
| **v2.2** | `2026-10-16` | **(جلسة 0.86 — استعارة انتقائية من إتقان الصفحات التسويقية):** كشف متتابع للبطاقات (`reveal-stagger` — انطلاق 80ms ثم +60ms على opacity/transform فقط)، تجميد حركات ودورات `AppMockup` خارج الشاشة (`.mockups-paused` + IO هامش 120px)، رفع كثافة اقتباسات الآراء إلى `text-sm sm:text-base`، وحذف حركات mockup ميتة (`scan-hud`/`wipe`/`beam`/`pulse` ≈47 سطراً بلا مستهلك). |
| **v2.3** | `2026-10-16` | **(جلسة 0.87):** تقليم رؤوس الأقسام والأيقونات — `SectionHeader` صار عنواناً أبيض **واحداً** (حذف الشارة/الوصف في الأقسام الثمانية)، وإزالة الأيقونات التزيينية (نجوم الآراء + حقل `rating`، شارات ترويجية عائمة، إيموجي الوسوم، أيقونات روابط التنقل/شريط الثقة/شارة الختام) وفق مبدأ Fluent 2 «الأيقونة ذات غرض دلالي لا زخرفي»، مع إزالة شريط تقدم الصفحة العلوي المكرّر. |
| **v2.4** | `2026-10-16` | **(جلسة 0.87 — سلّم الارتفاع بمرجع مهارة Fluent 2):** إدخال درجات ارتفاع مسمّاة (`.ds-elevate-rest/raised/overlay/dialog`) على التوكنات `--material-shadow-2/4/8/16`، وتطبيقها على عناصر الهبوط العائمة (أزرار الهيدر، درج الجوال، زر التحميل العائم، زر واتساب) مع إزالة توهج `#3b82f6` من أزرار الهيدر التزاماً بمبدأ Zero Button Glow. |
| **v2.5** | `2026-10-16` | **(جلسة 0.90 — إعادة وصف الأقسام وتوحيد التوكنات):** إعادة وصف واحد مختصر لكل قسم عبر `SectionHeader` الجديد (`description?: ReactNode` — `text-xs sm:text-sm text-text-secondary text-balance`، موسّط `max-w-2xl` أو `max-w-md` بمحاذاة البداية) للأقسام الثمانية، واستبدال كل القيم الحرفية القابلة للربط بأدوات التوكنات في 15 ملف هبوط (هيدر، هيرو، بنتو، AI، ويندوز، جمهور، ROI، مقارنة، آراء، أسعار، FAQ، ختام، فوتر، الصفحة) مع الإبقاء المقصود على لوحات الاستنساخ البصري (`AppMockup`/المشاهد 3D) والاستعارات (واتساب، CMYK)، وربط `.btn-secondary` بالتوكنات في `index.css`، وإسناد `role="group" aria-pressed` لمبدّلات بنتو. |
| **v2.6** | `2026-10-25` | **(جلسة 1.46 — CRO وتقصير الصفحة):** حذف `AudienceSection` (عشرة أقسام بدل أحد عشر)، ومبدّل عرض ثنائي في الهيرو بين المحاكاة التفاعلية ولقطة `/grido-desktop-ui.png` مع `role="group"`/`aria-pressed`، ومبدّل عملة ثانٍ متزامن أعلى قسم الأسعار بموافقة المالك (يستبدل قاعدة «المبدّل الوحيد» في v2.5)، ومسار شراء عبر واتساب يحمل السعر والعملة في الرسالة مع زر تجربة مجانية وسطر ضمانات وبطاقة ضمان ثالثة، وتوضيح التجربة المجانية في الهيرو/الأسئلة، وتصحيح ادعاءات حاسبة العائد والمقارنة والآراء (حذف 140 استوديو/99.4%). |
| **v2.7** | `2026-10-29` | **(جلسة 1.60 — إعادة بناء الهبوط والمجسمات):** إعادة بناء مشهدَي `Biometric3DCard` و`CMYK3DStack` على محرك مشترك `src/lib/landing/` (كاميرا ملائمة، إضاءة بيئية، حلقة 30fps توقف خارج الشاشة، سحب/أسهم، إيقاف/إعادة، بديل مصوّر عند فشل WebGL، تفريغ كامل) بإخراج بطاقة/صفائح توضيحية صادقة بدل الحلقات الزخرفية؛ حذف `Hero3DScene` وإضاءة CSS ثابتة؛ بدائيات `.landing-card/.landing-visual/.landing-switch/.landing-facts` بنطاق `.landing-shell` وحذف المستهلك الميت (`.ds-card*`, `.ds-icon-tile`, `.ds-elevate-*`, `.card-specular-edge`, `.text-gradient-brand`, `.spotlight-hover`, `.cta-shine`, `.ai-badge*`, `.fluent-specular`, `.no-scrollbar`)؛ حوار `<dialog>` مشترك (`LandingModal`) للجولة واللقطة المكبرة؛ توقيف محاكاة الهيرو خارج الشاشة/خلف الحوار/مع تقليل الحركة؛ حذف Magic Pill وشريط التقدم وتتبع المؤشر العام؛ أهداف لمس ≥44px وARIA موسّعة (FAQ، المقارنة، المشاهد)؛ تحويل الآراء إلى أمثلة استخدام وحذف الأرقام والادعاءات غير المسندة (Windows، المقارنة، الفوتر) مع الحفاظ على الأسعار ومسارات الشراء والتحميل ومبدّلَي العملة المتزامنين (قرار محمي). |
