---
name: fluent2-design-system
description: دليل ونظام تصميم Microsoft Fluent 2 الشامل لتطبيقات ومواقع Grido Studio (Design Language, Tokens, Layout, Material, Elevation, Motion, Wait UX, Responsible AI, Shapes & Components)
---

# 🪟 دليل ونظام تصميم Microsoft Fluent 2 القياسي (Fluent 2 Design System Guide)

تم توثيق وتثبيت هذا الدليل كمرجع أساسي ودائم لمشاريع **Grido Studio** وفقاً للمواصفات والتوثيق الرسمي الصادر من Microsoft: [https://fluent2.microsoft.design/](https://fluent2.microsoft.design/).

---

## 🎯 1. المبادئ التصميمية الأساسية (Fluent 2 Core Principles)

1. **التكيف والتماسك (Adaptive & Cohesive):** تجربة استخدام موحدة ومألوفة تحترم إمكانيات ومعايير المنصة الأصلية (Windows 11 / Desktop / React).
2. **الهدف والوظيفة (Functional & Intentional):** كل حركة، فراغ، وظل يخدم وظيفة واضحة دون بهرجة زائدة أو عناصر تشتت المستخدم.
3. **الراحة البصرية والإيقاع (Roomy Visual Rhythm):** توزيع منظم للعناصر، مساحات تنفس بيضاء مدروسة، وتدرج هرمي للمعلومات (Progressive Disclosure).
4. **الوصول الشامل (Accessible by Design):** نسب تباين لونية عالية (WCAG AAA/AA)، أهداف لمس وتفاعل قياسية (Minimum 44×44px)، ودعم كامل لوضع تقليل الحركة (`prefers-reduced-motion`).

---

## 🏗️ 2. الهيكل المعماري للنظام (4-Tier UI Hierarchy & Design-to-Code)

وفقاً لمعايير Fluent 2، ينقسم النظام إلى 4 مستويات متكاملة:

| المستوى (Tier) | النطاق والوظيفة | التطبيق في Grido Studio |
| :--- | :--- | :--- |
| **1. Design Language** | المصدر الأساسي للتوكنز (الألوان، الإشعاع، المسافات، الخطوط) | متغيرات CSS و Tailwind Tokens لكافة الأوضاع (Light / Dark) |
| **2. Core UI Kits** | اللبنات الأساسية المطابقة 1-إلى-1 لكود React | عناصر التحكم الرئيسية (`Button`, `Input`, `Dialog`, `Card`, `Toolbar`) |
| **3. Copilot & AI Kits** | أنماط وتجارب الذكاء الاصطناعي وتوليد وتحسين الصور | أدوات المعالجة الذكية (`MagicAiScanner`، مؤشرات الترميم، شريط التوليد) |
| **4. Labs & Experimental** | الميزات والأدوات المبتكرة قيد التجربة | أدوات محرر الكانفس المتقدمة ومولد القوالب المخصصة |

> [!IMPORTANT]
> **قواعد مطابقة التصميم بالكود (Design-to-Code Handshake):**
> 1. لا يجوز تعشيش المكونات لأكثر من مستويين في شجرة الأصول (`<= 2 levels nesting`).
> 2. تطابق متطابق لخصائص المكونات البرمجية (`Props`):
>    - `appearance`: (`primary` | `secondary` | `outline` | `subtle` | `transparent`)
>    - `size`: (`small` | `medium` | `large`)
>    - `shape`: (`rounded` | `circular` | `square`)

---

## 📐 3. نظام التخطيط والمسافات (Layout & Spacing Ramp)

يتبع Fluent 2 قاعدة **4px Base Unit Scale** لجميع الهوامش والفراغات:

### سلم المسافات القياسي (Spacing Ramp)
| التوكن (Token) | القيمة | الاستخدام الموصى به |
| :--- | :---: | :--- |
| `sizeNone` | `0px` | إزالة المسافات |
| `size20` | `2px` | هوامش الأيقونات والحدود المجهرية |
| `size40` | `4px` | المسافة الأساسية بين العناصر شديدة الترابط |
| `size60` | `6px` | حشو الشرائح والأزرار الصغيرة |
| `size80` | `8px` | الفراغ الداخلي بين الأيقونة والنص، والأزرار |
| `size100` | `10px` | حشو الحقول والمدخلات |
| `size120` | `12px` | تباعد البطاقات والقوائم الداخلية |
| `size160` | `16px` | الحشو الداخلي للبطاقات والنوافذ الصغيرة |
| `size200` | `20px` | الفراغ بين كتل المحتوى المترابطة |
| `size240` | `24px` | هوامش الحاويات والألواح الجانبية |
| `size280` | `28px` | تباعد الأقسام الفرعية |
| `size320` | `32px` | هوامش شبكة الـ 12 عمود |
| `size360` | `36px` | تباعد العناوين الرئيسية |
| `size400` | `40px` | الفواصل بين المجموعات الكبرى |
| `size480` | `48px` | هوامش الشاشات المتوسطة |
| `size560` | `56px` | تباعد الأقسام الرأسية (Vertical Section Rhythm) |

### تقنيات الاستجابة الـ 5 (Responsive Techniques):
1. **Reposition:** إعادة ترتيب العناصر من مكدس عمودي إلى مسار قراءة أفقي.
2. **Resize:** تكييف أحجام الحاويات والمحاكيات مع الحفاظ على النسب البصرية.
3. **Reflow:** إعادة تدفق الأعمدة من 1-col إلى 2-col أو 3-col تلقائياً.
4. **Show/Hide:** إظهار تفاصيل إضافية في الشاشات العريضة وإخفائها في الشاشات الضيقة.
5. **Re-architect:** تفريع أو طي الهياكل المعقدة في شريط الأوامر (Command Bar).

---

## 🎨 4. نظام المواد والأسطح (Materials & Surfaces)

1. **Solid (الصلب Opaque):** الأسطح الأساسية المعتمة للبطاقات ومساحات العمل (`#080c15` للكانفس، `#101726` للبطاقات، `#162035` عند التحويم).
2. **Acrylic (الأكريليك Frosted Glass):** للأسطح العائمة والمؤقتة كشريط التنقل العلوي، القوائم المنبثقة، وشرائط الأدوات:
   ```css
   background: rgba(16, 23, 38, 0.82);
   backdrop-filter: blur(20px);
   border: 1px solid rgba(255, 255, 255, 0.08);
   ```
3. **Mica (الميكا - Windows 11 Foundation):** طبقة الخلفية المعتمة المصبوغة بلون سطح المكتب للنوافذ النشطة.
4. **Smoke (الدخان Scrim / Backdrop):** خلفية التعتيم للنوافذ المنبثقة والحوارات (`background: rgba(0, 0, 0, 0.65); backdrop-filter: blur(4px);`).

---

## 🌗 5. نظام الارتفاع والظلال (Elevation & Windows Distinctions)

يعتمد Fluent 2 على دمج ظلين: **Key Shadow** (اتجاهي حاد لتحديد الحواف) + **Ambient Shadow** (ناعم منتشر للبعد):

```css
/* Fluent 2 Elevation Shadow Tokens */
--fluent-shadow-2:  0 1.6px 3.6px 0 rgba(0,0,0,0.22), 0 0.3px 0.9px 0 rgba(0,0,0,0.18);
--fluent-shadow-4:  0 3.2px 7.2px 0 rgba(0,0,0,0.26), 0 0.6px 1.8px 0 rgba(0,0,0,0.20);
--fluent-shadow-8:  0 6.4px 14.4px 0 rgba(0,0,0,0.30), 0 1.2px 3.6px 0 rgba(0,0,0,0.24);
--fluent-shadow-16: 0 12.8px 28.8px 0 rgba(0,0,0,0.35), 0 2.4px 7.2px 0 rgba(0,0,0,0.28);
--fluent-shadow-28: 0 22.4px 50.4px 0 rgba(0,0,0,0.40), 0 4.2px 12.6px 0 rgba(0,0,0,0.32);
--fluent-shadow-64: 0 51.2px 115.2px 0 rgba(0,0,0,0.45), 0 9.6px 28.8px 0 rgba(0,0,0,0.36);
```

> [!NOTE]
> **قاعدة ويندوز الخاصة (Windows Distinction):**
> في بيئة ويندوز والوضع الداكن، يُستبدل الظل الحاد الداكن بإطار مضيء خفيف (Specular Stroke): `border: 1px solid rgba(255, 255, 255, 0.08)` مع ظل محيطي ناعم للعمق.

---

## 🔷 6. الأشكال والأطر (Shapes, Corner Radius & Strokes)

### الأشكال الـ 4 الأساسية:
1. **Rectangle:** للبطاقات، الأزرار، وحقول الإدخال.
2. **Circle:** للأفاتار، مؤشرات الحالة، وأزرار الإغلاق.
3. **Pill:** لعلامات الوسوم (Tags)، مسارات المنزلق (Sliders)، ومفاتيح التبديل (Switches).
4. **Beak:** لمؤشرات التلميحات المنبثقة (Popovers & Tooltips).

### سلم استدارة الحواف المعماري (Border Radius Hierarchy):
- `Small / Control (4px - 6px)`: `rounded-md` - لكافة عناصر التحكم التفاعلية الدقيقة: الأزرار، حقول الإدخال، القوائم المنسدلة، المفاتيح، وعناصر القوائم الداخلية.
- `Medium / Container (8px - 12px)`: `rounded-xl` - للبطاقات، ألواح الخصائص، مجموعات الأدوات، والحاويات الداخلية مع إطار `fluent-specular`.
- `Large / Modal (16px - 24px)`: `rounded-2xl` - للنوافذ الحوارية المنبثقة الكبرى (Modals & Dialogs) مع خلفية `fluent-smoke-backdrop` ومادة الأكريليك `fluent-acrylic`.
- `Circular (50% / 9999px)`: للأزرار الدائرية، الكبسولات، والأفاتار.

### سلم الارتفاعات والمقاسات القياسي (Standard Size Ramp):
| الارتفاع | الفئة (Category) | الاستخدام الموصى به |
| :---: | :--- | :--- |
| `h-7` (28px) | **Compact Controls** | الأزرار المدمجة داخل أشرطة الأدوات السريعة، القوائم المصغرة، والشرائح الفرعية |
| `h-8` (32px) | **Standard Controls** | الارتفاع الافتراضي الموحد لكافة حقول الإدخال (`Input`)، القوائم (`Select`)، والأزرار الثانوية |
| `h-9` (36px) | **Hero Action Buttons** | أزرار الإجراءات الرئيسية البارزة (مثل أزرار أدوات الذكاء الاصطناعي في لوحة الصورة) |
| `h-10` (40px) | **Large Primary Actions** | الأزرار الرئيسية الكبرى وأزرار الحفظ في أسفل النوافذ والمودالات |
| `h-12` (48px) | **Command / App Bars** | شريط التنقل العلوي، أشرطة الأوامر الرئيسية، والأدوات العائمة الكبرى |

### سلم سماكة الخطوط ومؤشر التركيز (Strokes & Dual Focus Ring):
- `Thin (1px)`: الحدود الافتراضية والفواصل.
- `Dual Focus Ring (2px + 2px offset)`: حلقة التركيز المزدوجة لإمكانية الوصول:
  ```css
  focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none
  ```
- `Thicker (3px - 4px)`: حلقات التحديد والأنيميشن التفاعلي.

---

## ⚡ 7. نظام الحركة والتفاعل (Motion & Curves)

### أزمنة الحركة القياسية:
- `Ultra-fast (50ms)`: لتأثيرات الضغط اللحظية (Button Pressed).
- `Faster (100ms)`: لتغيير ألوان التحويم (Hover).
- `Fast (150ms)`: لفتح وإغلاق القوائم الصغيرة والـ Tooltips.
- `Normal (250ms)`: لانتقالات النوافذ والبطاقات وتغيير القوالب.
- `Gentle (400ms)`: للحركات الكبرى وفتح الـ Drawers.
- `Slow (600ms)`: لحركات التلاشي والمشاهد التمهيدية.

### منحنيات التسارع (Easing Curves):
- **Spring (الزنبركي الطبيعي):** `cubic-bezier(0.1, 0.9, 0.2, 1)` للحركات التفاعلية والسحب.
- **Decelerate (التباطؤ عند الوصول):** `cubic-bezier(0, 0, 0.1, 1)` لدخول العناصر على الشاشة.
- **Accelerate (التسارع عند الخروج):** `cubic-bezier(0.9, 0.1, 1, 1)` لخروج وتلاشي العناصر.

---

## ⏳ 8. إطار عمل تجارب الانتظار والتحميل (Wait UX Framework & Dictionary)

| التوقيت المتوقع | المكون الموصى به | السلوك وصياغة النصوص |
| :--- | :--- | :--- |
| **أقل من ثانية ($< 1\text{s}$)** | **لا شيء (No Loader)** | يُمنع إظهار مؤشر تجنباً لوميض الشاشة المشتت (Flicker) |
| **1 إلى 3 ثوانٍ ($1\text{s} - 3\text{s}$)** | **Spinner دوّار** | فعل مستمر + مسافة غير قابلة للكسر + نقاط (`جاري الحفظ ...`) |
| **أكثر من 3 ثوانٍ ($> 3\text{s}$)** | **Determinate Progress Bar** | شريط نسبة مئوية مع وقت تقديري متبقي (`65% مكتمل - متبقي 4 ثوانٍ`) |
| **عمليات غير متزامنة بالخلفية** | **Progress Toast** | إشعار عائم يسمح بمواصلة العمل على الكانفاس |
| **تحميل هياكل المحتوى** | **Skeleton with Shimmer** | قوالب رمادية مع نبض ضوئي هادئ |

### قاموس صياغة نصوص الانتظار القياسي (Wait UX Arabic Dictionary):
- **الحفظ والتصدير:** `جاري الحفظ ...` ، `جاري التصدير بجودة عالية ...` ، `جاري إعداد الملف ...`
- **التطبيق والإنشاء:** `جاري التطبيق ...` ، `جاري إنشاء المشروع ...` ، `جاري تجهيز القالب ...`
- **الذكاء الاصطناعي والمعالجة:** `جاري العزل ...` ، `جاري المعالجة وتحسين الوضوح ...` ، `جاري مسح المستند ...` ، `جاري ضبط الوجه ...`
- **التحديثات والمزامنة:** `جاري تحميل التحديث ...` ، `جاري التثبيت وإعادة التشغيل ...` ، `جاري المزامنة ...`

---

## 🤖 9. إرشادات الذكاء الاصطناعي المسؤول (Responsible AI in UI/UX)

1. **الشفافية الكاملة (Be Transparent):** توضيح وجود الـ AI عبر شارات وأيقونات مخصصة، وإتاحة التحقق من المخرجات.
2. **منع الأنسنة (No Anthropomorphizing):** عدم ادعاء امتلاك الـ AI لعواطف أو آراء؛ تقرير النتائج والخطوات بلغة حقائق مجردة.
3. **وضع توقعات واقعية (Set Expectations):** إرفاق تنبيهات إخلاء مسؤولية واضحة ومباشرة.
4. **بقاء المستخدم في مركز التحكم (Keep Users in Control):** توفير إمكانية إلغاء العمليات، والتراجع (`Undo`)، والتحكم في إعدادات المعالجة.
5. **رسائل العمليات الدقيقة (Meaningful Latency Messaging):** توضيح ما يفعله النظام لحظياً (مثل: `جاري عزل الخلفية ...`، `جاري توحيد الإضاءة ...`).

---

## 📦 10. قاموس مكونات Fluent 2 المعتمدة (Component Suite)

- **عناصر الإدخال والتحكم:** `Button`, `Input`, `Combobox`, `Dropdown`, `Select`, `Checkbox`, `RadioGroup`, `Switch`, `Slider`, `SpinButton`, `TagPicker`.
- **الهيكل والتنظيم:** `Card`, `Dialog`, `Drawer`, `Accordion`, `Tablist`, `Toolbar`, `Nav`, `Tree`, `Divider`.
- **المؤشرات والتغذية الراجعة:** `Badge`, `Tag`, `Avatar`, `AvatarGroup`, `Persona`, `ProgressBar`, `Spinner`, `Skeleton`, `Toast`, `MessageBar`, `InfoLabel`, `Tooltip`, `Popover`.
- **المزود العام:** `FluentProvider` لإدارة وتخصيص السمات (Theming & Overrides).

---

## 🎛️ 11. المكونات النموذجية في الواجهة (Fluent 2 Component Patterns)

### أ. نافذة ويندوز 11 التفاعلية (Fluent Window Mockup)
```tsx
<div className="fluent-window rounded-2xl border border-white/10 bg-[#101726] shadow-2xl overflow-hidden">
  {/* Titlebar */}
  <div className="fluent-window-titlebar flex items-center justify-between px-4 py-2.5 bg-[#080c15]/90 border-b border-white/10">
    <div className="flex items-center gap-2">
      <span className="fluent-window-btn fluent-window-btn-close" />
      <span className="fluent-window-btn fluent-window-btn-minimize" />
      <span className="fluent-window-btn fluent-window-btn-maximize" />
    </div>
    <span className="text-xs font-semibold text-slate-400">Grido Studio Pro</span>
    <div className="w-12" />
  </div>
  {/* Content */}
  <div className="p-4">{/* Canvas / Editor */}</div>
</div>
```

### ب. شريط الأوامر والتحكم المقسم (Command Bar & Segmented Control)
```tsx
<div className="fluent-command-bar flex items-center gap-2 p-2 bg-[#101726] rounded-xl border border-white/10">
  <div className="fluent-segmented-control bg-[#080c15] p-1 rounded-lg border border-white/10 inline-flex">
    <button className="fluent-segmented-item active px-3 py-1 text-xs rounded-md bg-[#0078d4] text-white">
      35×45mm جواز
    </button>
    <button className="fluent-segmented-item px-3 py-1 text-xs rounded-md text-slate-400 hover:text-white">
      50×50mm فيزا
    </button>
  </div>
</div>
```

---

## 📋 12. قائمة فحص الجودة (Fluent 2 Quality Checklist)

عند تصميم أو تعديل أي شاشة:
- [ ] هل تم الالتزام بقاعدة المسافات (مضاعفات 4px)؟
- [ ] هل الأسطح العائمة تستخدم مادة الأكريليك `backdrop-blur-xl` مع `border-white/10`؟
- [ ] هل النوافذ والقوائم فوق مساحة الكانفاس تستخدم `React.createPortal`؟
- [ ] هل أزمنة الانتظار تتبع مصفوفة Wait UX بدقة (بدون وميض لما دون ثانية، وProgress Bar لما فوق 3 ثوانٍ)؟
- [ ] هل مؤشرات الذكاء الاصطناعي شفافة وغير مؤنسنة وتوفر للمستخدم إمكانية التراجع والتحكم؟
- [ ] هل تم احترام وضع تقليل الحركة (`prefers-reduced-motion`) وحد اللمس الأدنى 44×44px؟

