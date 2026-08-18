---
name: fluent2-design-system
description: دليل ونظام تصميم Microsoft Fluent 2 الشامل لتطبيقات ومواقع Grido Studio (Design Language, Tokens, Layout, Material, Elevation, Motion, Shapes & Components)
---

# 🪟 دليل نظام تصميم Microsoft Fluent 2 (Fluent 2 Design System Guide)

تم توثيق وتثبيت هذا الدليل كمهارة ومرجع أساسي ودائم لمشاريع **Grido Studio** وفقاً للمواصفات الرسمية الصادرة من Microsoft: [https://fluent2.microsoft.design/](https://fluent2.microsoft.design/).

---

## 🎯 1. المبادئ التصميمية الأساسية (Fluent 2 Core Principles)

1. **التكيف والتماسك (Adaptive & Cohesive):** تجربة استخدام موحدة ومألوفة تحترم إمكانيات ومعايير المنصة (Windows 11 / Web / React).
2. **الهدف والوظيفة (Functional & Intentional):** كل حركة، فراغ، وظل يخدم وظيفة واضحة دون بهرجة زائدة أو عناصر تشتت المستخدم.
3. **الراحة البصرية والإيقاع (Roomy Visual Rhythm):** توزيع منظم للعناصر، مساحات تنفس بيضاء مدروسة، وتدرج هرمي للمعلومات (Progressive Disclosure).
4. **الوصول الشامل (Accessible by Design):** نسب تباين لونية عالية (WCAG AAA/AA)، أهداف لمس قياسية (Minimum 44×44px)، ودعم كامل لوضع تقليل الحركة (`prefers-reduced-motion`).

---

## 📐 2. نظام التخطيط والمسافات (Layout & Global Spacing Ramp)

يتبع Fluent 2 قاعدة **4px Base Unit Scale** لجميع الهوامش والفراغات الداخلية والخارجية:

### سلم المسافات القياسي (Spacing Ramp)
| التوكن (Token) | القيمة (Value) | الاستخدام الموصى به |
| :--- | :--- | :--- |
| `sizeNone` | `0px` | إزالة المسافات |
| `size20` | `2px` | هوامش الأيقونات والحدود المجهرية |
| `size40` | `4px` | المسافة الأساسية بين العناصر المرتبطة جداً |
| `size60` | `6px` | حشو الشرائح والأزرار الصغيرة |
| `size80` | `8px` | الفراغ الداخلي بين الأيقونة والنص، والأزرار |
| `size100` | `10px` | حشو الحقول والمدخلات |
| `size120` | `12px` | تباعد البطاقات والقوائم الداخلية |
| `size160` | `16px` | الحشو الداخلي للبطاقات والنوافذ الصغيرة |
| `size200` | `20px` | الفراغ بين كتل المحتوى المترابطة |
| `size240` | `24px` | هوامش الحاويات والبطاقات الكبيرة |
| `size280` | `28px` | تباعد الأقسام الفرعية |
| `size320` | `32px` | هوامش شبكة الـ 12 عمود |
| `size360` | `36px` | تباعد العناوين الرئيسية |
| `size400` | `40px` | الفواصل بين المجموعات الكبرى |
| `size480` | `48px` | هوامش الشاشات المتوسطة |
| `size560` | `56px` | تباعد الأقسام الرأسية (Vertical Section Rhythm) |

### نقاط التوقف وشبكة الأعمدة (Breakpoints & 12-Column Grid)
- **Small (`< 479px`):** عمود واحد، هوامش 16px.
- **Medium (`480px - 639px`):** شبكة 2 أعمدة، هوامش 20px.
- **Large (`640px - 1023px`):** شبكة 2-3 أعمدة، هوامش 24px.
- **X-Large (`1024px - 1365px`):** شبكة 12 عمود / 2-4 كروت متجاورة، هوامش 32px.
- **XX-Large (`1366px - 1919px`):** الحاوية القصوى (`1280px` أو `1440px`).
- **XXX-Large (`1920px+`):** توسيط الحاوية مع هوامش جانبية مرنة.

### تقنيات الاستجابة الـ 5 (5 Responsive Techniques)
1. **Reposition:** إعادة ترتيب العناصر من مكدس عمودي (Mobile) إلى مسار قراءة أفقي طبيعي (Desktop).
2. **Resize:** تكييف أحجام الحاويات والمحاكيات مع الحفاظ على النسب البصرية.
3. **Reflow:** إعادة تدفق الأعمدة من 1-col إلى 2-col أو 3-col تلقائياً.
4. **Show/Hide:** إظهار تفاصيل إضافية (مثل أبعاد المليمتر وبيانات EXIF) في الشاشات العريضة وإخفائها في الشاشات الضيقة.
5. **Re-architect:** تفريع أو طي الهياكل المعقدة في أدوات التحكم وشريط الأوامر (Command Bar).

---

## 🎨 3. نظام المواد والأسطح (Materials & Surfaces)

1. **Solid (الصلب Opaque):**
   - الأسطح الأساسية المعتمة للبطاقات ومساحات العمل (`#080c15` للكانفس، `#101726` للبطاقات، `#162035` عند التحويم).
2. **Acrylic (الأكريليك الزجاجي Frosted Glass):**
   - للأسطح العائمة والمؤقتة مثل شريط التنقل العلوي، القوائم المنسدلة، وشرائط الأدوات:
   - `background: rgba(16, 23, 38, 0.82); backdrop-filter: blur(20px); border: 1px solid rgba(255, 255, 255, 0.08);`.
3. **Mica (الميكا - Windows 11 Foundation):**
   - طبقة الخلفية المعتمة المصبوغة بلون سطح المكتب للنوافذ النشطة.
4. **Smoke (الدخان المعتم Scrim / Backdrop):**
   - خلفية التعتيم للنوافذ المنبثقة والحوارات (`background: rgba(0, 0, 0, 0.65); backdrop-filter: blur(4px);`).

---

## 🌗 4. نظام الارتفاع والظلال (Elevation & Multi-Layer Shadows)

يعتمد Fluent 2 على دمج ظلين معاً: **ظل حاد اتجاهي (Key Shadow)** لتحديد حواف العنصر + **ظل ناعم منتشر (Ambient Shadow)** للدلالة على الارتفاع والبعد:

```css
/* Fluent 2 Elevation Shadow Tokens */
--fluent-shadow-2:  0 1.6px 3.6px 0 rgba(0,0,0,0.22), 0 0.3px 0.9px 0 rgba(0,0,0,0.18);
--fluent-shadow-4:  0 3.2px 7.2px 0 rgba(0,0,0,0.26), 0 0.6px 1.8px 0 rgba(0,0,0,0.20);
--fluent-shadow-8:  0 6.4px 14.4px 0 rgba(0,0,0,0.30), 0 1.2px 3.6px 0 rgba(0,0,0,0.24);
--fluent-shadow-16: 0 12.8px 28.8px 0 rgba(0,0,0,0.35), 0 2.4px 7.2px 0 rgba(0,0,0,0.28);
--fluent-shadow-28: 0 22.4px 50.4px 0 rgba(0,0,0,0.40), 0 4.2px 12.6px 0 rgba(0,0,0,0.32);
--fluent-shadow-brand: 0 8px 30px rgba(0, 120, 212, 0.35), 0 2px 8px rgba(0, 120, 212, 0.2);
```

> [!NOTE]
> **قاعدة ويندوز الخاصة (Windows Distinction):**
> في بيئة ويندوز والوضع الداكن، يُفضل استبدال الظل الحاد الداكن بإطار مضيء خفيف (Specular Stroke): `border: 1px solid rgba(255, 255, 255, 0.08)` مع `box-shadow` ناعم للعمق.

---

## 🔷 5. الأشكال والأطر (Shapes, Corner Radius & Strokes)

### الأشكال الـ 4 الأساسية:
1. **Rectangle:** للبطاقات، الأزرار، وحقول الإدخال.
2. **Circle:** للأفاتار، مؤشرات الحالة، وأزرار الإغلاق.
3. **Pill:** لعلامات الوسوم (Tags)، مسارات المنزلق (Sliders)، ومفاتيح التبديل (Switches).
4. **Beak:** لمؤشرات التلميحات المنبثقة (Popovers & Tooltips).

### سلم استدارة الحواف (Corner Radius Ramp)
- `None`: `0px` (أشرطة التبويب وشريط المهام).
- `Small`: `2px - 4px` (الشارات الصغيرة وحقول الإدخال المضغوطة).
- `Medium`: `6px - 8px` (الأزرار القياسية، القوائم، والبطاقات الصغيرة).
- `Large`: `12px` (البطاقات، النوافذ، والحاويات).
- `X-Large / 2X-Large`: `16px - 24px` (النوافذ المنبثقة وحاويات الـ Hero).
- `Circular`: `9999px / 50%` (الأزرار الدائرية، الكبسولات، والأفاتار).

### سلم سماكة الخطوط (Strokes)
- `Thin`: `1px` (الحدود الافتراضية والفواصل).
- `Thick`: `2px` (حالة التركيز Focus Ring، والحدود النشطة).
- `Thicker`: `3px - 4px` (حلقات التحديد والأنيميشن).

---

## ⚡ 6. نظام الحركة والتفاعل (Motion & Curves)

### أزمنة الحركة (Duration Tokens)
- `Ultra-fast (50ms)`: لتأثيرات الضغط اللحظية (Button Pressed).
- `Faster (100ms)`: لتغيير ألوان التحويم (Hover).
- `Fast (150ms)`: لفتح وإغلاق القوائم الصغيرة والـ Tooltips.
- `Normal (250ms)`: لانتقالات النوافذ والبطاقات وتغيير القوالب.
- `Gentle (400ms)`: للحركات الكبرى وفتح الـ Drawers.
- `Slow (600ms)`: لحركات التلاشي والمشاهد التمهيدية.

### منحنيات التسارع (Easing Curves)
- **Spring (الزنبركي الطبيعي):** `cubic-bezier(0.1, 0.9, 0.2, 1)` (للحركات التفاعلية).
- **Decelerate (التباطؤ عند الوصول):** `cubic-bezier(0, 0, 0.1, 1)` (لدخول العناصر على الشاشة).
- **Accelerate (التسارع عند الخروج):** `cubic-bezier(0.9, 0.1, 1, 1)` (لخروج وتلاشي العناصر).

---

## 🎛️ 7. المكونات النموذجية في الواجهة (Fluent 2 Component Patterns)

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

### ج. تأثير الضوء الكاشف (Fluent Reveal Effect)
تفعيل التوهج الديناميكي للحدود المتتبعة لحركة مؤشر الماوس عبر `.fluent-reveal` و CSS Variables `--mouse-x`, `--mouse-y`.

---

## 📋 8. قائمة الفحص السريع (Fluent 2 Checklist)

عند تصميم أو تعديل أي شاشة:
- [ ] هل تم استخدام درجات الألوان القياسية (`#0078d4` للعلامة التجارية و `#080c15` للسطح الأساسي)؟
- [ ] هل المسافات الداخلية والخارجية مضاعفات للرقم 4px؟
- [ ] هل النوافذ والقوائم العائمة تستخدم مادة الأكريليك `backdrop-blur-xl`؟
- [ ] هل الظلال تستخدم النظام المزدوج (Ambient + Key) مع حدود Specular Stroke دقيقة؟
- [ ] هل تم احترام وضع تقليل الحركة (`prefers-reduced-motion`)؟
- [ ] هل جميع الأزرار والروابط التفاعلية تحقق حد اللمس الأدنى 44×44px؟
