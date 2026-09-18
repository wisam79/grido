---
name: konva-gesture-touch-transformer
description: دليل مهارة محولات التحجيم والتفاعل اللمسي والسحب الجماعي والتكبير السلس في Konva
---

# 🖐️ مهارة محولات التحجيم والتفاعل الحركي واللمسي (Konva Gestures & Transformers)

يوفر هذا الدليل القواعد الخاصة بإيماءات اللمس والـ Pinch-to-zoom ومحولات العناصر المتعددة داخل Grido Studio.

---

## 🏛️ 1. التكبير السلس غير الخانق (Smooth Accumulated Zooming)

* يُمنع قراءة Zoom من الـ Store مباشرة أثناء الـ Wheel.
* يتم تجميع الهدف المحسوب محلياً واستخدام التقريب الأسي:
$$\text{Zoom}_{\text{new}} = \text{Zoom}_{\text{target}} \times e^{-\Delta y \times \text{factor}}$$

```typescript
let accumulatedZoom = currentZoom;
export function handleSmoothWheel(e: KonvaEventObject<WheelEvent>, stage: Konva.Stage) {
  e.evt.preventDefault();
  const factor = 0.0015;
  accumulatedZoom *= Math.exp(-e.evt.deltaY * factor);
  accumulatedZoom = Math.min(Math.max(accumulatedZoom, 0.1), 10);
  requestAnimationFrame(() => {
    stage.scale({ x: accumulatedZoom, y: accumulatedZoom });
    stage.batchDraw();
  });
}
```

---

## 📦 2. سلامة سحب المجموعات المجمعة (Composite Group Alignment & Dragging)

* عند تجميع عدة عناصر في `groupId`، يجب معاملة المجموعة ككتلة ذرية واحدة (`Composite Bounding Box`).
* تُزاح جميع العناصر بنفس المقدار النسبي `(dx, dy)` دون تطبيق المحاذاة على كل عنصر فرعي لمنع التداخل أو قفز العناصر.
