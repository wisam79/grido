---
name: wails-konva-hi-res-export
description: دليل مهارة التصدير فائق الدقة (300+ DPI) ومطابقة الإحداثيات بين Konva و Go Backend
---

# 🖨️ مهارة التصدير فائق الدقة والطباعة (Wails + Konva Hi-Res Export Pipeline)

يقدم هذا الدليل القواعد الصارمة لترحيل وتصيير الكانفاس بدقة الطباعة الاحترافية (300+ DPI) بين الواجهة الرسومية (Konva 10.3 / React) والواجهة الخلفية (Go Backend) دون فقدان أي بكسل أو تشويه للمقاييس.

---

## 📐 1. خريطة مطابقة الإحداثيات (Coordinate Space Mapping)

* الكانفاس في الواجهة يتعامل مع إحداثيات نسبية مطبعة: `x, y, width, height` محصورة بين `[0.0, 1.0]`.
* عند التصدير، يتم تمرير مصفوفة العناصر النسبية إلى محرك Go دون التقاط صور الشاشة المصغرة من المتصفح، أو تصديرها عبر Konva Stage بدقة عالية.
* في Go، يتم ضرب الإحداثيات بالنسبة لعرض وارتفاع المخرجات الحقيقية بالبكسل وفق أبعاد الورقة الفيزيائية:

$$\text{TargetPx} = \text{NormalizedCoord} \times \left(\frac{\text{DimensionMM}}{25.4} \times \text{DPI}\right)$$

```go
type ExportJob struct {
    WidthPx   int             `json:"widthPx"`
    HeightPx  int             `json:"heightPx"`
    DPI       int             `json:"dpi"`
    Elements  []CanvasElement `json:"elements"`
}

func (s *PrintService) RenderHiResCanvas(job ExportJob) (image.Image, error) {
    dc := gg.NewContext(job.WidthPx, job.HeightPx)
    for _, el := range job.Elements {
        realX := el.X * float64(job.WidthPx)
        realY := el.Y * float64(job.HeightPx)
        realW := el.Width * float64(job.WidthPx)
        realH := el.Height * float64(job.HeightPx)
        // تصيير بجودة فائقة بدون ضياع
        renderElement(dc, el, realX, realY, realW, realH)
    }
    return dc.Image(), nil
}
```

---

## ✂️ 2. هندسة خطوط القص والنزيف (Cut Lines & Bleed Integrity)

1. **قيد إحداثيات خطوط القص بحدود الورقة (Clamping Invariant):**
   - عند حساب خطوط القص بـ mm، يُمنع إرسال إحداثيات تتجاوز أبعاد الورقة الفيزيائية (`paperWidth` / `paperHeight`).
   - يجب إجبارياً قص الإحداثيات بـ:
     ```typescript
     const clampedX = Math.min(paperWidthMM, Math.max(0, calculatedX));
     const clampedY = Math.min(paperHeightMM, Math.max(0, calculatedY));
     ```
2. **مطابقة المعاينة للتصدير (Print Preview ↔ Export Parity):**
   - يجب أن ترسم معاينة الطباعة في المتصفح نفس خطوط القص والنزيف والفواصل والـ Offsets بنفس المعادلات المستخدمة في التصدير النهائي دون أي اختلاف بين وضعي Single و Collage.

---

## 🎨 3. كاش الفلاتر بدقة التصدير في Konva (High-DPI Filter Cache)

عند تصدير الكانفاس مباشرة من Konva Stage في الواجهة:
1. قم بحصر كافة العقد التي تحتوي على فلاتر مفعّلة (`node.isCached()`).
2. أعد بناء الكاش بدقة التصدير المستهدفة:
   ```typescript
   const targetRatio = Math.max(1, exportDPI / screenDPI);
   node.cache({ pixelRatio: targetRatio });
   ```
3. التقط الكانفاس بـ `stage.toCanvas({ pixelRatio: targetRatio })`.
4. في كتلة `finally`، استعد فوراً كاش الشاشة العادي (`pixelRatio: 1`) لحماية ذاكرة VRAM من الامتلاء.
