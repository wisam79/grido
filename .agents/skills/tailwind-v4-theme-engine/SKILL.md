---
name: tailwind-v4-theme-engine
description: معايير وهندسة محرك التنسيق والتصميم Tailwind CSS v4 في Grido Studio (CSS-first configuration, @theme directive, CSS variables, and modern responsive design)
---

# 🎨 محرك التنسيق والتصميم بـ Tailwind CSS v4 (Tailwind v4 Theme Engine)

تحدد هذه المهارة المعايير الهندسية المعاصرة للتعامل مع محرك التنسيق **Tailwind CSS v4** داخل مشروع Grido Studio.
المرجع الرسمي: [Tailwind CSS v4 Documentation](https://tailwindcss.com/docs).

---

## 🚀 1. المبادئ الجوهرية لـ Tailwind v4 (CSS-First Architecture)

1. **التهيئة عبر CSS المباشر (No JS Config File):**
   - تم الاستغناء نهائياً عن ملف `tailwind.config.js` التقليدي.
   - كامل إعدادات الألوان والخطوط والأبعاد والطبقات تُعرّف مباشرة داخل `index.css` باستخدام توجيه `@theme`.
2. **المتغيرات الأصلية (Native CSS Variables):**
   - كافة توكنز Tailwind تتحول تلقائياً إلى متغيرات CSS نقية يمكن استدعاؤها في أي مكان بالواجهة أو داخل محرك Konva الرسومي.
3. **أداء تجميع فائق عبر Vite:**
   - المحرك مدمج مباشرة عبر `@tailwindcss/postcss` أو إضافة Vite الرسمية دون تحميل مسبق أو تعقيد في شجرة الـ Build.

---

## 🎨 2. هيكلة متغيرات الثيم (`@theme` Directive Anatomy)

جميع التوكنز التابعة لنظام تصميم Grido Studio (المستوحاة من Fluent 2) تُدرج داخل بلوك `@theme` في `frontend/src/index.css`:

```css
@import "tailwindcss";

@theme {
  /* الخطوط */
  --font-sans: "Segoe UI", system-ui, -apple-system, sans-serif;

  /* مؤشرات الطبقات الصارمة (Z-Index Scales) */
  --z-canvas-overlay: 45;
  --z-guides: 60;
  --z-ruler: 100;
  --z-print-toolbar: 150;
  --z-quick-bar: 500;
  --z-menu: 1000;
  --z-popover: 1500;
  --z-modal: 2000;

  /* توكنز الألوان المعيارية */
  --color-primary: var(--primary);
  --color-primary-foreground: var(--primary-foreground);
  --color-background: var(--background);
  --color-foreground: var(--foreground);
}
```

---

## 🛠️ 3. القواعد الحاكمة وصيغ الاستخدام المعتمدة في Grido Studio

### أ) استدعاء مؤشرات الارتفاع والطبقات (`z-index`):
- ✅ **الصحيح:** استخدام كلاس متغير الثيم الصريح:
  `z-(--z-quick-bar)` أو `z-(--z-popover)`
- ❌ **المحظور قطيعاً:** استخدام قيم سحرية اعتباطية:
  `z-[9999]` أو `z-50` عشوائي يُخفي القوائم أو يؤدي إلى تداخل النوافذ مع الكانفاس.

### ب) الرسوم المتحركة والتدرجات (Motion & Gradients):
- استخدام حزمة `tw-animate-css` أو تعريف الـ Keyframes داخل CSS مباشرة.
- في خلفيات الكانفاس وشريط المعاينة، استخدم تدرجات الـ CSS النظيفة التي لا تعيق تسريع العتاد (GPU Acceleration).

### ج) التوافق مع وضع تقليل الحركة (Accessibility & Reduced Motion):
- كل حركة انتقالية أو وميض يجب أن تحترم كلاس `motion-reduce:`:
  ```html
  <div className="transition-transform duration-200 motion-reduce:transition-none">
  ```

---

## ⚡ 4. التناغم بين Tailwind v4 ومحرك Konva

نظراً لأن كائنات Konva تُرسم داخل عنصري `<canvas>` مستقلين ولا تخضع لقواعد CSS مباشرة:
1. عند الحاجة لتطبيق لون ثيم ديناميكي على عنصر Konva (مثل لون التحديد أو حدود المسطرة)، استخرج القيمة برمجياً عبر:
   ```typescript
   const primaryColor = getComputedStyle(document.documentElement).getPropertyValue('--color-primary').trim();
   ```
2. لا تقم بحساب الألوان يدويّاً إذا كانت معرفة في متغيرات الجذر (`:root` أو `@theme`).
