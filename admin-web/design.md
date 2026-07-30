# Grido Studio — دستور التصميم البصري (Design System Reference)

> **النطاق:** هذه الوثيقة تحكم صفحة الهبوط التسويقية (Landing Page) لبرنامج **Grido Studio** — تطبيق سطح مكتب مخصص لأصحاب الاستوديوهات ومحلات التصوير لمعالجة وطباعة صور الهوية (صور المعاملات) واستعادة الوجوه بالذكاء الاصطناعي.
>
> **الغاية من الوثيقة:** أن تكون المرجع القياسي الوحيد الذي يعود إليه أي مطور أو مصمم يعمل على هذه الصفحة مستقبلاً، لضمان عدم انحراف الهوية البصرية عن طابعها السينمائي الداكن الفاخر مهما تعدد المساهمون في الكود.
>
> **حالة الوثيقة:** نسخة أولى (v1.0) — تُشتق منها جميع قرارات الواجهة اللاحقة، ولا تُكسر قواعدها إلا بقرار تصميمي واعٍ وموثق.

---

## جدول المحتويات

1. [الفلسفة البصرية (Design Philosophy)](#1)
2. [لوحة الألوان ورموز التصميم (Color Tokens)](#2)
3. [الطباعة (Typography)](#3)
4. [نظام الحركة والتفاعل (Motion & Micro-interactions)](#4)
5. [هيكلة التخطيط (Layout Architecture)](#5)
6. [معمارية المكونات (Component Architecture)](#6)
7. [اعتبارات RTL وإمكانية الوصول](#7)
8. [قواعد الالتزام الممنوعات (Do's & Don'ts)](#8)

---

<a id="1"></a>
## 1. الفلسفة البصرية (Design Philosophy)

### 1.1 الهوية المرجعية
الصفحة لا تُصمَّم كـ"موقع تسويقي" تقليدي، بل كواجهة نظام هندسي فاخر. المرجعيات الثلاث الأساسية:

| المرجع | ما نستعيره منه |
|---|---|
| **SpaceX** | الكتل النصية الضخمة، الفراغ الأسود المطلق، الشعور بالمهمة الحرجة (mission-critical) |
| **Vercel** | التباين الحاد أبيض/أسود، البطاقات الزجاجية الدقيقة الحواف |
| **Linear** | دقة الحركة (micro-motion)، الشعور بالسرعة والاستجابة الفورية للمؤشر |

### 1.2 المبادئ الحاكمة
- **الأحادية اللونية أولاً (Monochrome-First):** أي قرار لوني جديد يجب أن يُختبر أولاً بالتدرج الرمادي قبل التفكير بإدخال لون. اللون هو استثناء، وليس قاعدة.
- **التباين هو الزخرفة:** بما أنه لا توجد ألوان زاهية، فإن التباين الحاد بين الأبيض الناصع والأسود المطلق هو أداة الجذب البصري الوحيدة.
- **الصمت البصري:** الحدود (borders) يجب أن تكون بالكاد مرئية (`#383842`) — وظيفتها تنظيم الفراغ لا لفت الانتباه إليه.
- **كل حركة لها مبرر وظيفي:** لا تُضاف حركة لمجرد الزخرفة؛ كل تأثير (الظهور، التوهج، الطفو) يخدم إحساساً محدداً: الفخامة، السرعة، أو الاستجابة.

### 1.3 الشعور المستهدف (Emotional Target)
> الغموض (Mystery) → الفخامة (Premium) → السرعة (Speed) → الصرامة والاعتمادية (Rugged Reliability)

كل قرار تصميمي جديد يُختبر مقابل هذه الكلمات الأربع: هل يخدمها أم يُضعفها؟

---

<a id="2"></a>
## 2. لوحة الألوان ورموز التصميم (Color Tokens)

لا توجد لوحة ألوان "مبهرجة". اللوحة أحادية بالكامل (Monochromatic High-Contrast)، وتُبنى كمتغيرات CSS موحّدة:

```css
:root {
  /* الخلفيات — Surfaces */
  --color-bg-primary:    #000000; /* الخلفية الأساسية للصفحة */
  --color-bg-secondary:  #121214; /* خلفية الأقسام والبطاقات */
  --color-bg-elevated:   #18181b; /* ارتفاع طفيف اختياري للبطاقات النشطة/المحاورة */

  /* النصوص — Typography */
  --color-text-primary:    #ffffff; /* العناوين الرئيسية */
  --color-text-secondary:  #f0f0fa; /* النصوص الفرعية وفقرات الوصف */
  --color-text-tertiary:   #999999; /* البيانات الوصفية، التسميات، النصوص الثانوية */

  /* الحدود — Borders */
  --color-border-subtle:   #383842; /* الحد الافتراضي لكل العناصر المهيكلة */
  --color-border-glow:     rgba(255, 255, 255, 0.5); /* يُستخدم فقط ضمن تأثير التوهج المتتبع للمؤشر */

  /* إحداثيات المؤشر — تُحدَّث عبر JavaScript فقط، لا تُضبط يدوياً */
  --mouse-x: 50%;
  --mouse-y: 50%;
}
```

### 2.1 قواعد الاستخدام

| الرمز | الاستخدام المسموح | ممنوع في |
|---|---|---|
| `--color-bg-primary` | خلفية الصفحة الكاملة فقط | داخل البطاقات (تُستخدم `--color-bg-secondary` بدلاً منها لتمييزها عن الخلفية) |
| `--color-text-tertiary` (`#999999`) | تسميات، طوابع زمنية، نصوص مساعدة **بحجم ≥ 14px فقط** | عناوين، نصوص أزرار، أي نص أساسي |
| `--color-border-subtle` | كل حدود البطاقات والفواصل في الحالة الساكنة | أي حالة hover (تُستبدل بتوهج المؤشر، وليس بتغيير لون الحد بالكامل) |

### 2.2 نسب التباين (Contrast Ratios)
- أبيض `#ffffff` على أسود `#000000` → تباين مطلق (21:1)، يتجاوز WCAG AAA بلا مجهود.
- رمادي `#999999` على أسود `#000000` → تباين ≈ 5.9:1، يجتاز WCAG AA للنصوص العادية، **لكنه لا يجتاز AAA**. لهذا يُحظر استخدامه في نصوص أصغر من 14px أو في أي محتوى وظيفي حرج (أزرار، تحذيرات).

---

<a id="3"></a>
## 3. الطباعة (Typography)

### 3.1 مبدأ الطبقتين
النظام الطباعي مبني على تناقض متعمّد بين طبقتين:

1. **طبقة الكتلة (Display Layer):** عناوين ضخمة، ثقيلة الوزن (Black/Extrabold)، متقاربة الأحرف، تتصرف كـ"كتلة بصرية" لا كنص للقراءة.
2. **طبقة النظام (System Layer):** خط أحادي المسافة (Monospace) بأحرف كبيرة ومباعدة واسعة، يُستخدم في كل ما هو "بيانات نظام": الأزرار، التسميات، المؤشرات الرقمية.

### 3.2 مقياس الخطوط

| الاستخدام | الوزن | الحجم (Desktop) | tracking | ملاحظات |
|---|---|---|---|---|
| H1 (العنوان الرئيسي Hero) | 800–900 | 64–96px | tight | أقصى تباين بصري في الصفحة |
| H2 (عناوين الأقسام) | 800 | 40–56px | tight | تكرار بصري لإيقاع الـ H1 بحجم أصغر |
| Body (فقرات الوصف) | 400–500 | 16–18px | عادي | لون `--color-text-secondary` |
| UI Label / Button (النظام) | 500–600 | 12–13px | 1px–2px + UPPERCASE | خط Monospace حصراً |
| Meta / Caption | 400 | 12–14px | 0.5px | لون `--color-text-tertiary` |

### 3.3 توصية حزمة الخطوط (Font Stack)

```css
/* طبقة الكتلة — عناوين عربية */
--font-display-ar: "Cairo", "IBM Plex Sans Arabic", sans-serif; /* وزن 800/900 */

/* طبقة الكتلة — أرقام وعناصر لاتينية داخل العناوين (مثال: "3 ثوانٍ") */
--font-display-lat: "Inter", sans-serif; /* وزن 800، tracking: -0.02em */

/* طبقة النظام — Monospace للأزرار والتسميات */
--font-mono: "JetBrains Mono", "Space Mono", monospace;

/* نص المتن العربي */
--font-body-ar: "IBM Plex Sans Arabic", "Cairo", sans-serif; /* وزن 400/500 */
```

> ⚠️ **ملاحظة هندسية حرجة (خاصة بالعربية):** تأثير `tracking-tight` (تقارب الأحرف) يُصمَّم أصلاً لحروف لاتينية منفصلة. الخط العربي حروف متصلة، وتطبيق تباعد سالب عليه يكسر الأشكال الحرفية (ligatures) ويُنتج تراكباً بصرياً غير مقروء. لذلك:
> - العناوين العربية تحقق "الكتلة البصرية" عبر **الوزن الثقيل + الحجم الضخم فقط**، دون لمس الـ letter-spacing.
> - الـ `tracking-tight` يُطبَّق حصراً على الأرقام والعناصر اللاتينية الظاهرة داخل النص (أرقام، رمز العلامة التجارية إذا كُتب باللاتينية).
> - الـ `tracking-[1px]` إلى `[2px]` الموسّع في طبقة النظام (الأزرار/التسميات) يُطبَّق على النصوص الإنجليزية الكبيرة (UPPERCASE) فقط، وهو نمط شائع ومقبول في واجهات عربية تقنية كطبقة "إكسنت" لاتينية فوق محتوى عربي.

---

<a id="4"></a>
## 4. نظام الحركة والتفاعل (Motion & Micro-interactions)

هذا القسم هو جوهر هوية Grido Studio البصرية. أي تطبيق ناقص لهذه المواصفات يُعتبر خروجاً عن الهوية.

### 4.1 الظهور السينمائي عند التمرير (Cinematic Reveal)

**المواصفات:** مدة 1.2 ثانية، يبدأ العنصر بضبابية 8px وحجم 97%، وينتهي حاداً بحجمه الطبيعي 100%.

```css
@keyframes cinematicReveal {
  from {
    opacity: 0;
    filter: blur(8px);
    transform: scale(0.97);
  }
  to {
    opacity: 1;
    filter: blur(0);
    transform: scale(1);
  }
}

.reveal-on-scroll {
  animation: cinematicReveal 1.2s cubic-bezier(0.16, 1, 0.3, 1) forwards;
  animation-play-state: paused;
}

.reveal-on-scroll.is-visible {
  animation-play-state: running;
}
```

يُفعَّل الصنف `is-visible` عبر `IntersectionObserver` عند دخول العنصر نطاق الرؤية (threshold ≈ 0.2)، وليس عبر مستمع `scroll` مباشر (لأسباب الأداء).

### 4.2 الإضاءة المتتبعة للمؤشر (Smart Spotlight Glow)

الميزة الأبرز في الواجهة: البطاقات والأزرار تمتلك "سطحاً مغناطيسياً" يضيء تحت المؤشر تماماً كأنه كشاف ضوئي.

```css
.spotlight-card {
  position: relative;
  background: var(--color-bg-secondary);
  border: 1px solid var(--color-border-subtle);
  overflow: hidden;
  isolation: isolate;
}

.spotlight-card::before {
  content: "";
  position: absolute;
  inset: 0;
  background: radial-gradient(
    600px circle at var(--mouse-x) var(--mouse-y),
    rgba(255, 255, 255, 0.06),
    transparent 40%
  );
  opacity: 0;
  transition: opacity 0.3s ease;
  pointer-events: none;
  z-index: 0;
}

.spotlight-card:hover::before {
  opacity: 1;
}
```

```js
document.querySelectorAll('.spotlight-card').forEach((card) => {
  card.addEventListener('mousemove', (e) => {
    const rect = card.getBoundingClientRect();
    card.style.setProperty('--mouse-x', `${e.clientX - rect.left}px`);
    card.style.setProperty('--mouse-y', `${e.clientY - rect.top}px`);
  });
});
```

> **ملاحظة أداء:** استخدم `requestAnimationFrame` لتحديث المتغيرات عند وجود عدد كبير من البطاقات في نفس الشبكة، لتفادي إعادة الرسم المفرط (layout thrashing).

### 4.3 توهج الحواف الزجاجي (Border Mask-Composite Glow)

يُدمَج تأثير الإضاءة مع حافة البطاقة نفسها، بحيث تتوهج الحافة فقط في المنطقة القريبة من المؤشر:

```css
.spotlight-card::after {
  content: "";
  position: absolute;
  inset: 0;
  padding: 1px; /* سماكة التوهج على الحافة */
  border-radius: inherit;
  background: radial-gradient(
    250px circle at var(--mouse-x) var(--mouse-y),
    var(--color-border-glow),
    transparent 40%
  );
  -webkit-mask:
    linear-gradient(#fff 0 0) content-box,
    linear-gradient(#fff 0 0);
  -webkit-mask-composite: xor;
          mask-composite: exclude;
  opacity: 0;
  transition: opacity 0.3s ease;
  pointer-events: none;
}

.spotlight-card:hover::after {
  opacity: 1;
}
```

### 4.4 الأزرار المغناطيسية (Magnetic Pill CTAs)

أزرار الهيرو تتفاعل مع اقتراب المؤشر بانزياح خفيف (حتى 6–8px) نحو موضعه، بحركة زنبركية ناعمة:

```js
button.addEventListener('mousemove', (e) => {
  const rect = button.getBoundingClientRect();
  const relX = e.clientX - rect.left - rect.width / 2;
  const relY = e.clientY - rect.top - rect.height / 2;
  button.style.transform = `translate(${relX * 0.15}px, ${relY * 0.15}px)`;
});

button.addEventListener('mouseleave', () => {
  button.style.transform = 'translate(0, 0)';
});
```

مدة الانتقال عند `mouseleave`: `0.3s cubic-bezier(0.34, 1.56, 0.64, 1)` (overshoot خفيف يعطي إحساساً زنبركياً).

### 4.5 جدول توقيتات الحركة (Motion Timing Reference)

| التأثير | المدة | المنحنى |
|---|---|---|
| الظهور السينمائي (Cinematic Reveal) | 1.2s | `cubic-bezier(0.16, 1, 0.3, 1)` |
| توهج البطاقة عند hover | 0.3s | `ease` |
| الزر المغناطيسي (تتبّع) | فوري (transform مباشر) | — |
| الزر المغناطيسي (عودة) | 0.3s | `cubic-bezier(0.34, 1.56, 0.64, 1)` |
| طفو الأيقونات ثلاثية الأبعاد (loop) | 4–6s | `ease-in-out infinite alternate` |
| تبديل التبويبات (Features Tabs) | 0.4s | fade + reveal مصغّر |
| فتح/غلق الأكورديون (FAQ) | 0.3s | `ease` على `max-height`/`grid-template-rows` |

---

<a id="5"></a>
## 5. هيكلة التخطيط (Layout Architecture)

### 5.1 لا إطارات مقيدة (No Artboards)
المحتوى لا يُحصر داخل بطاقة مركزية بعرض ثابت. الخلفية السوداء تمتد دائماً بعرض الشاشة الكامل (full-bleed)، بينما يُقيَّد المحتوى الداخلي بحاوية قراءة مريحة:

```css
.section {
  width: 100%;
  background: var(--color-bg-primary);
  padding-block: clamp(80px, 10vw, 160px); /* إيقاع رأسي سينمائي فسيح */
}

.section__container {
  max-width: 1440px;
  margin-inline: auto;
  padding-inline: clamp(24px, 5vw, 64px);
}
```

### 5.2 الإيقاع الرأسي (Vertical Rhythm)
الفراغ العمودي الكبير بين الأقسام (80–160px حسب حجم الشاشة) جزء أساسي من "الشعور بالرحابة". لا تُختصر هذه المسافات لتوفير المساحة — الفراغ الأسود نفسه عنصر تصميمي، وليس مساحة ضائعة.

---

<a id="6"></a>
## 6. معمارية المكونات (Component Architecture)

### 6.1 قسم الترحيب (Hero Section)
- **العنوان:** "تنسيق صور المعاملات في 3 ثوانٍ فقط" — يطبّق مقياس H1 الكامل (طبقة الكتلة).
- **أزرار CTA:** زوج من الأزرار على شكل أقراص (pill): زر أساسي مصمت أبيض، وزر ثانوي بحدود شفافة (ghost) — كلاهما يطبّق سلوك "المغناطيسية" (4.4).
- **معاينة البرنامج (App Mockup):** لوحة زجاجية داكنة (Glassmorphism):
  ```css
  .app-mockup {
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid var(--color-border-subtle);
    backdrop-filter: blur(20px);
    border-radius: 16px;
  }
  ```
- **شريط الثقة:** صف شعارات/إحصائيات أسفل القسم، بشفافية منخفضة (opacity ≈ 0.6) وتسميات بخط Monospace كبير الأحرف.

### 6.2 قسم المزايا الحية (Features Tabs)
- تبديل بين تبويبين على الأقل: "تصميم الكولاج" و"ترميم الوجوه بالذكاء الاصطناعي".
- التبويب النشط يُميَّز بخط سفلي أو خلفية قرص صغيرة بخط Monospace UPPERCASE.
- عند التبديل، محتوى المعاينة (محاكاة حية لواجهة البرنامج) يُطبِّق نسخة مصغّرة من الظهور السينمائي (blur أخف، مدة أقصر ≈ 0.4s) بدلاً من قطع مفاجئ.

### 6.3 قسم المقارنة (Comparison Section)
- عرض مباشر ومتباين: "الطريقة التقليدية المتعبة" مقابل سرعة Grido Studio.
- الأرقام (الفروقات الزمنية) تُعرض بخط Monospace ضخم لتعزيز الإحساس بـ"بيانات نظام حقيقية" لا شعارات تسويقية.

### 6.4 شبكة المزايا (Benefits Grid)
- 5 بطاقات رأسية (مثال: دعم CMYK، معالجة ذكاء اصطناعي محلية 0% إنترنت... إلخ).
- كل بطاقة تطبّق `.spotlight-card` كاملاً (4.2 + 4.3).
- أيقونة ثلاثية الأبعاد لكل بطاقة تطفو ببطء (loop مستمر) وتكبر بشكل طفيف عند hover:
  ```css
  .benefit-icon {
    animation: float 5s ease-in-out infinite alternate;
    transition: transform 0.3s ease;
  }
  .spotlight-card:hover .benefit-icon {
    transform: scale(1.08);
  }
  @keyframes float {
    from { transform: translateY(0); }
    to   { transform: translateY(-8px); }
  }
  ```

### 6.5 سيناريوهات الاستخدام (Use-case Scenarios)
- بطاقات/كتل تروي حالات استخدام واقعية داخل الاستوديو (طباعة بطاقات مدرسية مجمّعة، ترميم صورة قديمة).
- تركيبة: صورة/معاينة + عنوان قصير + وصف سردي مختصر بلون `--color-text-secondary`.

### 6.6 الأسئلة الشائعة والشريط الختامي (FAQ + CTA Banner)
- الأكورديون بتصميم مبسّط للغاية: سؤال + أيقونة سهم تدور 180° عند الفتح، وانتقال ارتفاع ناعم (4.5).
- الشريط الختامي: كتلة كبيرة عالية التباين، عنوان دعوة مباشرة للتحميل، وزر CTA واحد كبير فقط — لا تشتيت بخيارات متعددة في نهاية الرحلة.

---

<a id="7"></a>
## 7. اعتبارات RTL وإمكانية الوصول

### 7.1 الاتجاه (RTL)
- الصفحة تُبنى بـ `dir="rtl"` بشكل أصلي، وليس كطبقة عكس لاحقة.
- إحداثيات `--mouse-x` / `--mouse-y` في تأثير الإضاءة **لا تتأثر بالاتجاه** (مبنية على موضع المؤشر الفعلي داخل العنصر)، فلا حاجة لأي تعديل خاص بها.
- الأيقونات الاتجاهية فقط (أسهم، chevrons) يجب أن تُعكَس أفقياً في RTL:
  ```css
  [dir="rtl"] .icon--directional {
    transform: scaleX(-1);
  }
  ```
- استخدام خصائص CSS المنطقية (`margin-inline-start/end`, `padding-inline`) بدلاً من `margin-left/right` في كل مكونات الشبكة، لتفادي أخطاء الانعكاس اليدوي.

### 7.2 إمكانية الوصول
- تباين الألوان مضمون بطبيعة اللوحة الأحادية (انظر 2.2)، لكن يُمنع النزول عن `--color-text-tertiary` كحد أدنى للتباين في أي نص وظيفي.
- يجب احترام `prefers-reduced-motion`: عند تفعيله، يُستبدل الظهور السينمائي (blur+scale) بتلاشي بسيط (`opacity` فقط)، وتُعطَّل حركة الطفو المستمرة للأيقونات:
  ```css
  @media (prefers-reduced-motion: reduce) {
    .reveal-on-scroll { animation: fadeIn 0.4s ease forwards; }
    .benefit-icon { animation: none; }
  }
  ```

---

<a id="8"></a>
## 8. قواعد الالتزام (Do's & Don'ts)

| ✅ افعل | ❌ لا تفعل |
|---|---|
| التزم بالتدرج الرمادي الأحادي في كل قرار لوني جديد | لا تُدخل لوناً مشبعاً (accent color) إلا لحالة وظيفية حرجة موثقة (مثل خطأ نظام) |
| طبّق منحنى `cubic-bezier(0.16, 1, 0.3, 1)` كتوقيع حركي موحّد لكل الظهورات | لا تستخدم `ease` أو `linear` العام في تأثيرات الظهور الرئيسية |
| استخدم توهج الإضاءة (glow) كبديل وحيد للظل | لا تضف `box-shadow` كلاسيكي بلون داكن أو ملوّن |
| اجعل الحواف بالكاد مرئية (`#383842`) في الحالة الساكنة | لا تُبرز حدود البطاقات بألوان فاتحة إلا ضمن تأثير التوهج المتتبع |
| طبّق شكل القرص (pill) على الأزرار فقط | لا تُعمِّم شكل القرص على البطاقات أو الحاويات الكبيرة |
| اعتمد على الوزن والحجم لبناء الكتلة البصرية في العناوين العربية | لا تطبّق `letter-spacing` سالب على نص عربي متصل |
| احترم `prefers-reduced-motion` دائماً | لا تفرض الحركة الكاملة على مستخدمين طلبوا تقليلها |

---

*نهاية الوثيقة — Grido Studio Design System v1.0*
