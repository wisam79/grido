---
name: konva-freeform-collage-engine
description: دليل مهارة هندسة الكولاج والتقسيم الحر وحسابات المضلعات والخلايا وتفادي القفز الاصطدامي في Konva
---

# 📐 مهارة هندسة الكولاج والتقسيم الحر (Konva Freeform Collage Engine)

يقدم هذا الدليل المرجعي كافة الخوارزميات والمعايير الهندسية الخاصة بإدارة شبكات الكولاج الحر وتفاعل الخلايا داخل Grido Studio.

---

## 🏛️ 1. المبادئ الحاكمة لتحجيم الخلايا (Resizing Invariants)

### 1.1 كاشف العوائق الاتجاهي (Directional Obstacle Detection)
يُمنع استخدام خوارزميات دفع عامة لا تميز اتجاه الحركة. الحركة تنقسم إلى نمطين صارمين:

1. **الانكماش والتصغير (Shrinking):**
   - عندما يتحرك المقبض للداخل لتقليص حجم الخلية، يتحرك الضلع بسلاسة تامة ومستمرة بموجب إحداثيات الفأرة دون أي فحص للعقبات أو تداخلات الجيران.
   - التصغير يبتعد بطبيعته عن الحواف ولا يمكن أن يتسبب في اصطدام خارجي جديد.
   - الحد الأدنى الوحيد هو `MIN_SIZE` ومحيط الورقة.

2. **التوسيع والتمدد (Expanding):**
   - يفحص المحرك حصراً العوائق الواقعة في مسار الضلع المتوسع مباشرة.
   - يتم إيقاف التمدد بسلاسة لحظة ملامسة حافة الجار المقابلة دون قفز مفاجئ أو تراجع لأدنى حجم.

```typescript
export function computeDirectionalBounds(
  activeSlot: CollageSlot,
  handle: 'top' | 'bottom' | 'left' | 'right',
  delta: number,
  allSlots: CollageSlot[],
  minSize: number = 0.05
): number {
  if (delta < 0) {
    // تصغير سلس ومستمر
    return Math.max(activeSlot.size + delta, minSize);
  }
  
  // توسيع: كشف أقرب عقبة في المسار المباشر فقط
  const obstacleDistance = findNearestObstacleInDirection(activeSlot, handle, allSlots);
  return Math.min(activeSlot.size + delta, obstacleDistance);
}
```

---

## ⚡ 2. التقسيم الذكي للحاويات (Binary Space Partitioning - BSP)

عند تقسيم خلية إلى خليتين (أفقياً أو رأسياً):
- احتفظ بالهوية الذرية للخلية الأصلية وقسّم المساحة النسبية بدقة `(0.0 - 1.0)`.
- احسب إزاحة التباعد (Gap Spacing) كإزاحة بكسلية حقيقية مستقلة عن عامل التكبير.
- تأكد دائماً من أن مجموع أبعاد الخلايا الناتجة مع الفواصل يطابق أبعاد الحاوية الأصلية 100% لمنع تسريب البكسلات الفرعية.
