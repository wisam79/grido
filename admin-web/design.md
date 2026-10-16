# 📦 Grido Studio Pro — Design System & UI Specification (v2.0)

> **Role / Owner:** Lead UI/UX Architect & Frontend Systems Engineer
> **Platform:** Desktop Web (Marketing Landing Page) & Admin Dashboard Shell (Wails/Go Native Reference)
> **Aesthetic Paradigm:** Microsoft Fluent 2 · Windows 11 Mica & Acrylic · Pure Neutral Charcoal
> **Localization & Direction:** Bi-directional First (Primary: Arabic `RTL` | Secondary: English `LTR`)
> **Status:** Production-Synced — كل قيمة ومواصفة في هذه الوثيقة مأخوذة من الكود المنفَّذ (`admin-web/src/index.css` والمكونات) مع مراجع `ملف:سطر` · آخر مزامنة: `2026-10-16`

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

### C. Visual Primitives (بدائيات الإبراز)
| الفئة | الوظيفة | المرجع |
| :--- | :--- | :--- |
| `.card-specular-edge` | حد علوي لامع متدرج (`inset-inline: 12%`) عبر `::before` | `index.css:382-393` |
| `.aurora-bg` | هالة محيطة ثنائية (أزرق/بنفسجي خافت) بشفافية عالية | `index.css:560-567` |
| `.text-gradient-brand` | تدرج نصي `#ffffff → #93c5fd → #38bdf8` | `index.css:374-379` |
| `.spotlight-hover` | توهج دائري خافت **يتبع المؤشر** داخل البطاقة عند التحويم (`::after` + `--mouse-x/y`) | `index.css:396-412` |
| `.spotlight-card` | بطاقة اللوحة مع وميض يتبع المؤشر (يُربط بمستمعي `--mouse-x/y`) | `index.css:528-557` |

> ✅ **سلوك منفَّذ:** التوهج يتبع المؤشر فعلياً — المتتبّع العام في `LandingPage.tsx:35-39` يضبط `--mouse-x/y` للعنصر المطابق لـ`closest('.spotlight-card, .spotlight-hover')` عبر rAF وبلا إعادة رندر، وعند غياب حركة المؤشر يسقط التدرج على المركز `50%` (القيمة الافتراضية لـ`--mouse-x/y` في `:root` — `index.css:79`).

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
| **`.cta-shine`** `index.css:190-211` | — | وميض ضوئي يكتسح الزر (`::after`, 0.55s) | — |
| **`.magnetic-pill`** `index.css:580-590` | — | `translateY(-1px)` | `scale(0.98)` |

أزرار الهيرو والبانرات تضيف فوق فئات الأساس أدوات الحركة: `hover:scale-105 active:scale-95` (`HeroSection.tsx:73,81`).

### B. Sliders (حاسبة التوفير)
- التعبئة حتى المقبض عبر `--range-fill` + `background-image` متدرج، مع انعكاس الاتجاه في RTL (`[dir='rtl'] .ds-range`) — `index.css:229-250`.
- لون المقبض يُمرَّر من المكوّن: `[--range-accent:var(--grido-brand-primary)]` للزبائن و`[--range-accent:var(--grido-status-success)]` للسعر (رُبطا بالتوكنات — جلسة 0.90) (`RoiCalculator.tsx`).

### C. Badges & Telemetry Pills
- **`.ai-badge`:** كبسولة `rgba(30,30,30,0.85)` + حد subtle + نص `#60a5fa` + `blur(12px)` (`index.css:289-302`).
- **`.ai-badge-pulse`:** صبغة زرقاء `rgba(59,130,246,0.12)` + حد `rgba(59,130,246,0.35)` + نقطة نابضة — يُستعمل في شارة إصدار الهيرو (`index.css:305-309` · `HeroSection.tsx:49-52`).
- **وسوم الحالة:** وسم النجاح النصي `text-status-success bg-inset border-border-subtle` (رُبط بالتوكنات — جلسة 0.90؛ أمثلة: `ComparisonSection.tsx:108`).

### D. Sticky Navigation Header (`Header.tsx`)
- **السطح:** شفاف في الأعلى، وعند التمرير `bg-workspace/80 backdrop-blur-2xl` + حد سفلي `white/[0.08]` + حد علوي مضيء داخلي `inset 0 1px 0 rgba(255,255,255,0.05)` وظل ناعم (`Header.tsx:100`).
- **مؤشر التنقل (Magic Pill):** كبسولة زرقاء شفافة `bg-brand-primary/15 border-brand-primary/30` تُقاس وتُموضع عند تغيّر المقطع النشط / resize / جهوزية الخطوط عبر `offsetLeft/offsetWidth` (`Header.tsx:135`) — وليس حجباً أزرق صلباً.
- **الروابط:** 7 روابط في كبسولة `bg-sidebar/85` (`Header.tsx:131`): المميزات · الذكاء الاصطناعي · ويندوز 11 · الحاسبة · الآراء · الأسعار · الأسئلة — مع `scrollspy`.
- **زر التحميل:** كبسولة زرقاء `bg-brand-primary hover:bg-brand-hover` مع `.cta-shine`، ووقع الإصدار من `useAppVersion()` مع fallback `v2.4`. **لا يوجد مبدّل لغة (AR/EN) في المنفَّذ.**
- **شريط تقدم التمرير:** `2px` أسفل الهيدر، تدرج `from-brand-primary via-[#38bdf8] to-brand-primary` (سماوي السماء يُبقي حرفياً — جلسة 0.90)، يُحدَّث عبر rAF على DOM مباشرة بلا إعادة رندر، `origin-right` للاتجاه العربي (`Header.tsx:237`).
- **قائمة الجوال:** خلفية معتمة تُغلق بالنقر + درج `bg-sidebar/95` بدخول متتابع `animate-dropIn` (تأخير 35ms/عنصر) + إغلاق `Escape` + `aria-controls="mobile-nav"` (`Header.tsx:198`).

### E. Admin Dashboard Shell (قشرة اللوحة)
- حلقة تركيز مزدوجة إلزامية: `0 0 0 2px canvas, 0 0 0 4px brand` على كل عنصر تفاعلي في `.admin-shell` و`.landing-shell` (`index.css:516-519,611-616`).
- بطاقة `spotlight-card` تتبع المؤشر، دخول محتوى التبويب `tab-content-reveal`، وصفوف جداول بانتقال هادئ (`index.css:528-605`).

---

## 6. Landing Page UI Architecture (Section-by-Section Spec)

### الهيكل العام — `LandingPage.tsx`
- القشرة: `dir="rtl"` + `.landing-shell` + خلفية `bg-workspace` + `selection:bg-brand-primary/30` (رُبطا بالتوكنات — جلسة 0.90) (`LandingPage.tsx:102-105`).
- **رابط التخطي:** `.skip-to-content` أول عنصر تفاعلي (`LandingPage.tsx:107-109` · `index.css:617-635`).
- **شريط تقدم الصفحة:** مقتصر على شريط أسفل `Header` (يُكتب على DOM عبر rAF)؛ أُزيل الشريط الثابت العلوي المكرّر ذو `3px` (جلسة 0.87) — `LandingPage.tsx`.
- **ترتيب الأقسام:** Hero → Bento → AI → Windows 11 → Audience → ROI → Comparison → Testimonials → Pricing → FAQ → CTA Banner (`LandingPage.tsx:122-177`)، وبعدها Footer + زر واتساب عائم + زر تحميل سفلي يظهر بعد تمرير `500px` (`LandingPage.tsx:180-195`).
- **كشف عند التمرير:** أغلفة `.reveal-on-scroll` مع IntersectionObserver (`threshold 0.05`, `rootMargin 40px`)؛ قسم الهيرو وحده يبدأ `is-visible` ثابتاً (`LandingPage.tsx:82-99,124-126`) وBento يُكشف متتابعاً عند الإقلاع كبقية الأقسام.

### Section 1: The Hero — `#top` (`HeroSection.tsx`)
- **الخلفية:** مشهد Three.js جوّي (`Hero3DScene` lazy داخل `ErrorBoundary`) + فينييت علوي شعاعي `rgba(59,130,246,0.06)`.
- **شارة الإصدار:** `ai-badge ai-badge-pulse` + نقطة `animate-pulse` ونص «{الإصدار}» فقط (أُزيلت لاحقة «• محرك ذكاء اصطناعي محلي فوري» — جلسة 0.87).
- **العنوان:** «استوديو متكامل لصور الهوية والطباعة» + سطر متدرج «عزل، تجهيز، وطباعة في ثوانٍ معدودة» (55-60).
- **الوصف:** هندسة معايير ICAO والعزل والتوزيع الشبكي و«محلياً 100% دون إنترنت» (63-65).
- **صف الإجراءات:** أساسي «تحميل مجاني لـ Windows» + ثانوي «جولة سريعة: 3 خطوات فقط» يفتح `TourModal` بثلاث خطوات حقيقية (69-85 · 114-119).
- **شريط الثقة:** `ds-card-inset` بثلاث إشارات نصية بفواصل نقطية بلا أيقونات (جلسة 0.87): سير عمل أسرع · خفيف `<120MB` · مطابق ICAO.
- **العرض البصري:** `AppMockup` — نافذة ويندوز 11 كاملة بسير عمل متحرك (تأطير → عزل → تجهيز) (`AppMockup.tsx`).

### Section 2: Core Capabilities (Bento Grid) — `#capabilities` (`BentoGrid.tsx`)
- رأس موحّد عبر `SectionHeader` بعنوان «كل ما يحتاجه استوديو التصوير» ووصف «أربع قدرات أساسية تغطي دورة العمل كاملة — من الصورة الخام إلى ورقة الطباعة الجاهزة» (جلسة 0.90).
- شبكة `lg:grid-cols-12 gap-5` بأربع بطاقات `ds-card + card-specular-edge + spotlight-hover` بكشف متتابع (`reveal-stagger` — تأخير 80ms ثم +60ms/بطاقة):
  1. `lg:col-span-8` — توليد صور الهوية والفيزا (هوفر أزرق `brand-primary/40`، معاينة 3D كسولة `Biometric3DCard`).
  2. `lg:col-span-4` — صانع الكولاج الذكي (معاينة شبكية `CMYK3DStack`، هوفر أزرق، معاينة `flex-1`).
  3. `lg:col-span-4` — خصوصية تامة وعمل بدون إنترنت (هوفر أخضر `status-success/40`، لوحة «الاتصال السحابي: معطل»).
  4. `lg:col-span-8` — أدوات مراكز الطباعة (هوفر كهرماني `status-warning/40`، خطوط القص والهوامش).

### Section 3: The AI Engine Spotlight — `#ai-engine` (`AiSpotlightSection.tsx`)
- رأس `SectionHeader`: «محرك الذكاء الاصطناعي الثنائي» + وصف «ثلاث خطوات تلقائية تحوّل صورة الزبون الخام إلى طقم طباعة معتمد — دون أي تعديل يدوي» (جلسة 0.90).
- بطاقة `ds-card` واحدة على شبكة 12 عموداً (`pt-5, gap-6 lg:gap-8 items-center`):
  - **الوسائط (`lg:col-span-5`):** مقياس قبل/بعد تفاعلي `aspect-[3/4]` بـ `role="slider"` كامل (أسهم، Home/End، PageUp/Down، `aria-valuenow/valuetext`) (`:124-189`)؛ تحت `lg` يُقيَّد `max-w-sm mx-auto`.
  - **مسار الخطوات (`lg:col-span-7`):** قائمة `ol` عمودية من 3 بطاقات؛ كل بطاقة: بلاطة أيقونة `ds-icon-tile` + عنوان + وصف + شريط سفلي (`border-t`) يحمل الوسم التقني فقط (أُزيلت علامة النجاح المكررة — جلسة 0.87).
- **الخطوة البارزة تتبع المقبض لحظياً** (`activeStep = sliderPos > 66 ? 0 : sliderPos > 33 ? 1 : 2`، `:76-81`) مع `aria-current="step"` وحدود زرقاء `border-brand-primary/50` عند التفعيل (`:192`).
- **الانضباط اللوني:** أزرق العلامة + الأخضر الدلالي فقط.

### Section 4: Windows 11 Native Experience — `#windows-experience` (`Windows11Section.tsx`)
- تقسيم `lg:col-span-6/6` (`gap-8 lg:gap-12 items-center`).
- **عمود النص:** `SectionHeader` (align start, size lg) بعنوان «برنامج خفيف وسريع، لا يثقل جهازك» + وصف «تجربة سطح مكتب أصلية على ويندوز: إقلاع فوري، استهلاك أخف من 120MB، وحفظ تلقائي مستمر» + 4 بطاقات `ds-card` ببلاطات أيقونات: واجهة داكنة · إقلاع لحظي (`<120MB`) · حفظ تلقائي · توافق طابعات DNP/Epson/Canon.
- **عمود العرض:** بطاقة «كفاءة تشغيل الاستوديو» `max-w-lg`: شريط ذاكرة `118 MB` أخضر، مطابقة ألوان 100%، حفظ تلقائي مفعّل، وتذييل «ويندوز 11 و10 و7 · 100% أوفلاين».

### Section 5: Target Audience Segmentation — `#audience` (`AudienceSection.tsx`)
- `SectionHeader`: «من يستفيد من استوديو جريدو؟» + وصف «أربعة مسارات عمل مصمّمة لمن يقف خلف الكاميرا أو الطابعة يومياً — كل مسار بميزاته الجاهزة» (جلسة 0.90).
- 4 بطاقات `ds-card` (`sm:grid-cols-2 lg:grid-cols-4` بكشف متتابع `reveal-stagger`): استوديوهات التصوير · مراكز الطباعة · المصممون · الأفراد — كل بطاقة: بلاطة أيقونة + عنوان + قائمة مزايا بعلامات خضراء (أُزيل الدور اللاتيني والوصف — جلسة 0.87).

### Section 6: ROI Calculator — `#roi` (`RoiCalculator.tsx`)
- بطاقة `ds-card` بأسلوب الهيرو + شارة «حاسبة التوفير والعائد».
- **منزلقان** `.ds-range`: «زبائن يومياً» `5–150` (أزرق، تعبئة `--range-fill` محسوبة) و«سعر الطقم» حسب العملة (أخضر).
- **مبدّل العملة** الوحيد في الصفحة (`IQD/SAR/USD`) بحالة مرفوعة في `LandingPage` وتسري على قسم الأسعار (`LandingPage.tsx:23,150`).
- **النتائج:** شبكتان: الوقت الموفر شهرياً وأرباح إضافية تقديرية (0.25 زبون/سعر/26 يوم) بخط `font-mono`.

### Section 7: Speed & Legacy Comparison — `#comparison` (`ComparisonSection.tsx`)
- رأس `SectionHeader`: «لماذا يختار المحترفون استوديو جريدو؟» + وصف «مقارنة مباشرة بين سير العمل التقليدي وما يوفره استوديو جريدو في كل صورة تُطبع» (جلسة 0.90).
- عمودان `lg:grid-cols-2 items-stretch`:
  - «البرامج والطرق التقليدية» — `ds-card bg-sidebar` (رُبط بالتوكن — جلسة 0.90)، 5 عيوب بعلامات حمراء.
  - «استوديو جريدو» — `ds-card border-brand-primary/40`، 5 مزايا بعلامات خضراء ووسوم إبراز (`أسرع 90%`, `توفير 35%`…) (أُزيلت شارة «الخيار الأسرع للاستوديوهات» العائمة — جلسة 0.87).

### Section 8: Testimonials — `#testimonials` (`TestimonialsSection.tsx`)
- رأس `SectionHeader`: «ماذا يقول أصحاب الاستوديوهات؟» + وصف «شهادات حقيقية من استوديوهات ومراكز طباعة تعتمد على جريدو في عملها اليومي» (جلسة 0.90).
- 3 بطاقات `md:grid-cols-3` (`ds-card` بكشف متتابع `reveal-stagger`): وسم مقياس أخضر، اقتباس بعلامة `Quote` بنص `text-sm sm:text-base leading-relaxed`، وتذييل بمعرّف أحرف (`ds-icon-tile font-mono`)، اسم، استوديو، وموقع (أُزيلت النجوم وحقل `rating` — جلسة 0.87).

### Section 9: Pricing & Licensing — `#pricing` (`PricingSection.tsx`)
- رأس `SectionHeader`: «استثمر مرة واحدة، واستفد للأبد» + وصف «دفعة واحدة بلا اشتراكات — رخصة دائمة مع تحديثات مجانية للأبد» (جلسة 0.90).
- شبكة `lg:grid-cols-12 gap-6 lg:gap-8 items-stretch`: **بطاقة السعر `lg:col-span-7`** + **لوحة الضمانات `lg:col-span-5`**.
- بطاقة السعر: شارة «ترخيص مدى الحياة (Lifetime)» عائمة أعلى الحد، حد أزرق `border-brand-primary/40`، السعر الحالي بخط `font-mono text-4xl sm:text-5xl font-black` وبجانبه السعر الأصلي مشطوباً `line-through`، ثم 9 مزايا بعلامات خضراء، وزر أساسي بعرض كامل «تحميل وتفعيل رخصتك الآن».
- لوحة الضمانات: بطاقتا `ds-card` أفقيتان (`items-center` بكشف متتابع `reveal-stagger`): استثمار لمرة واحدة · تفعيل فوري ودعم فني — ببلاطات `ds-icon-tile w-11 h-11`.

### Section 10: FAQ — `#faq` (`FaqSection.tsx`)
- رأس `SectionHeader`: «أسئلة يتكرر سماعها من الاستوديوهات» + وصف «إجابات مباشرة عن العمل دون إنترنت، الطباعة، التفعيل، والمعايير الدولية» (جلسة 0.90).
- عمودان `lg:grid-cols-12 gap-8 lg:gap-12 items-start`: رأس + صندوق واتساب (`lg:col-span-5`) مقابل أكورديون (`lg:col-span-7`).
- الأكورديون: `ds-card ds-card-interactive` + `aria-expanded`، الخيار الأول مفتوح افتراضياً (`openIdx = 0`)، حالة الفتح بحد أزرق `border-brand-primary/40` ودوران `ChevronDown 180°` (`FaqSection.tsx:78-79`).

### Section 11: Closing CTA Banner — `CtaBanner.tsx`
- هالة `aurora-bg` محيطة + بطاقة `ds-card card-specular-edge` منسّطة: «سرّع عمل استوديو التصوير اليوم»، زر أساسي بعرض تلقائي، وسطر «حجم البرنامج ~45 MB» (بلا أيقونة — جلسة 0.87).

### Footer (`Footer.tsx`)
- خلفية `bg-inset` + حد علوي `border-border-subtle` (رُبطا بالتوكنات — جلسة 0.90)، شبكة `md:grid-cols-12` (هوية `5` · تنقل `3` · دعم وقانوني `4`)، شارة نظام خضراء تتضمن `displayVersion` (`v2.4` fallback)، وسطرا حقوق النشر ونوع المنصة.

---

## 7. Physics-Based Motion & Micro-Interactions

### A. المنحنيات والمدد المنفَّذة فعلياً
| الاستخدام | المنحنى / المدة | المرجع |
| :--- | :--- | :--- |
| دخول عند التمرير (Scroll Reveal) | `0.6s cubic-bezier(0.22, 1, 0.36, 1)` + `translateY(14px→0)` | `index.css:314-324` |
| كشف متتابع لبطاقات الشبكات (Stagger) | نفس المنحنى؛ انطلاق `80ms` ثم `+60ms` لكل بطاقة — المؤخرة على opacity/transform فقط (التحويم بلا تأخير) | `index.css:326-348` + شبكات Bento/الجمهور/الآراء/الضمانات |
| دخول قائمة الجوال | `dropIn 0.28s` بنفس المنحنى + تأخير متتابع 35ms/عنصر | `index.css:359-366` · `Header.tsx:206` |
| ظهور عام (fadeIn) | `0.25s ease-out` | `index.css:350-357` |
| دخول محتوى تبويب اللوحة | `tabReveal 0.32s` | `index.css:593-600` |
| تفاعلات الأزرار الدقيقة | `150ms` (لون/حدود/تحويل) | `index.css:149,176` |
| وميض CTA | `left 0.55s ease` | `index.css:190-211` |
| ليزر مسح الكشف في المحاكاة | `mockup-laser-sweep 2.0s` لا نهائية — تُجمَّد خارج الشاشة | `index.css:640-666` · `AppMockup.tsx:39-54` |
| تجميد حركة المحاكاة خارج الشاشة | `IntersectionObserver` بهامش 120px يضيف `.mockups-paused` فتُوقف `animation-play-state` لكل شجرة النافذة | `AppMockup.tsx:39-54,120-122` |

### B. أداء الحركة
- شريط تقدم الهيدر يُكتب على DOM عبر rAF بلا إعادة رندر (`Header.tsx`)؛ أُزيل شريط الصفحة الأعلى المكرّر (جلسة 0.87) وبقي زر التحميل العائم يُظهر بحالة مخنوقة بـ rAF (`LandingPage.tsx`).
- تتبع المؤشر (`.spotlight-card` و`.spotlight-hover`) عبر `requestAnimationFrame` مع حدث `passive` (`LandingPage.tsx:26-52`).
- الطبقات المتحركة تستعمل `will-change` بحدود واعية (`reveal-on-scroll`, شريط التقدم).
- حركات المحاكاة لا تعمل خارج الشاشة: `AppMockup` يُجمَّد (حركةً ودورتَي المرحلة والطباعة) عند تجاوزه `rootMargin: 120px`.

### C. Reduced Motion (إلزامي) — `index.css:440-450`
```css
@media (prefers-reduced-motion: reduce) {
  html { scroll-behavior: auto; }
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

## 8. Internationalization (RTL/LTR) & Accessibility (A11y)

### A. Bidirectional (RTL/LTR) Rules
- السمة `dir="rtl"` منضبطة في `index.html:2` ومكررة على قشرة الصفحة (`LandingPage.tsx:103`).
- **قاعدة إلزامية للكود الجديد:** الخصائص المنطقية أولاً — `ms-*/me-*`، `ps-*/pe-*`، `start-*/end-*`، `text-start/text-end`؛ أمثلة منفَّذة: `end-4` (`LandingPage.tsx`)، `inset-inline` (`index.css`)، `text-start` (`Windows11Section.tsx`, `FaqSection.tsx`).
- استثناءان مقصودان: `.cta-shine` (حركة وميض فيزيائية) و`.spotlight-hover`/`.spotlight-card` (إحداثيات مؤشر) تستعمل `left` — لأنها غير مرتبطة باتجاه القراءة.
- الأسهم الأيقونية الاتجاهية تُعكس حسب `dir` عند الاستخدام.

### B. Accessibility & Contrast Compliance
- **نسب التباين المحسوبة (WCAG 2.1 — تحقق 2026-10-16):**
  - `#F5F5F5` على `#121212` ≈ **17.4:1** (AAA).
  - `#9E9E9E` على `#121212` ≈ **7.1:1** (AAA للنص العادي).
  - `#9E9E9E` على `#1E1E1E` ≈ **6.2:1** (AA).
  - `#8A8A8A` على `#121212` ≈ **5.5:1** (AA) — رُفع من `#737373` في جلسة 0.84.
- **حلقات التركيز:** حلقة مزدوجة موحّدة `0 0 0 2px canvas + 0 0 0 4px #3b82f6` لكل عنصر تفاعلي في `.landing-shell` و`.admin-shell` (`index.css:611-616,516-519`)، وفئة `.ds-focusable` للعناصر المخصصة (`index.css:504-508`).
- **لوحة المفاتيح:** مقياس المقارنة يدعم الأسهم وHome/End/PageUp/PageDown (`AiSpotlightSection.tsx:42-62`)؛ إغلاق قائمة الجوال بـ`Escape`؛ استخدام `aria` صحيح: `aria-controls`, `aria-expanded`, `aria-current="step"`, `aria-pressed` لمبدّل العملة ومجموعتي مبدّلات بنتو (`role="group"` + `aria-label` — جلسة 0.90), و`aria-label` لكل زر أيقوني.
- **رابط التخطي:** `.skip-to-content` يظهر أولاً عند التنقل بـ`Tab` (`LandingPage.tsx:107-109`).

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
