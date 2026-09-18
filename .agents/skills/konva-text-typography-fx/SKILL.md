---
name: konva-text-typography-fx
description: دليل مهارة تصيير النصوص والخطوط الاحترافية وفلتر التمدد الشكلي للحدود في Konva
---

# ✍️ مهارة فنون وتصيير النصوص المتقدمة (Konva Typography & Text Effects)

يوفر هذا الدليل المعايير الصارمة لرسم النصوص والخطوط الاحترافية وتأثيرات الحدود والتوهج في Grido Studio.

---

## 🖋️ 1. معيار فلتر التمدد الشكلي للحدود (Morphological Text Stroke Dilation)

### القاعدة الصارمة:
يُمنع إجبارياً استخدام `ctx.strokeText` أو خاصية `stroke` الافتراضية في Konva للنصوص المتصلة (مثل الخط العربي أو الخطوط الإنجليزية المتصلة Cursive).
- **السبب:** رسم الحدود بشكل منفرد لكل حرف (Glyph) يولد زوايا حادة تقطع وصلات الحروف وتنزف داخل الأحرف المجاورة.
- **الحل المعتمد:** تطبيق الحدود عبر فلتر التمدد الشكلي الموحد المطبق على ظل الكلمة ككتلة واحدة مجمعة (`ensureTextStrokeFilter`).

```typescript
// تطبيق فلتر التمدد الشكلي للحدود الخارجية بدون تشويه وصلات الحروف
export function applyConnectedTextStroke(ctx: CanvasRenderingContext2D, text: string, strokeWidth: number, strokeColor: string) {
  // استخدام التمدد الشكلي الموحد على قناع الشفافية المصدرة
  ctx.save();
  ctx.shadowColor = strokeColor;
  ctx.shadowBlur = strokeWidth;
  // رسم النص وتكراره لإنشاء حدود ناعمة وموحدة دون تفتيت
  ctx.fillText(text, 0, 0);
  ctx.restore();
}
```

---

## 📐 2. الالتفاف التلقائي للنصوص بدون تذبذب (Auto-wrapping Invariants)

1. استخدم دائماً `wrap="word"` مع `ellipsis={false}` افتراضياً في Konva.
2. مرر `width` فقط بدون فرض `height` مسبق إلى عقدة `<Text>`.
3. لا تستخدم `useState` محلياً لتخزين ارتفاع النص؛ بل اقرأ `node.height()` في `useEffect` وادفع القيمة المطبعة للـ Store مباشرة.
