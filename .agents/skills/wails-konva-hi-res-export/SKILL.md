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

## 🎨 3. معاملة التقاط Konva وكاش الفلاتر (Capture Transaction & Filter Cache)

عند تصدير الكانفاس عبر `captureStageBlob`:
1. يُسلسل الالتقاط لكل Stage ويُحاط انتظار الدور/الجاهزية/`toBlob` بمهل و`AbortSignal`.
2. تُرقّى مشتقات العرض 2048px وبدائل الصور ويُعاد قياس القص داخل القفل فقط.
3. تُحفظ نسبة كاش الشاشة المقاسة وتُرقّى العقد المفلترة ضمن ميزانية 256MiB قبل `stage.toCanvas`.
4. تُخفى overlays ويُصفّر موضع/مقياس Stage مؤقتاً.
5. داخل `finally` تُستعاد المصفوفة والصور/القص والكاش والرؤية وlease الأصل حتى عند الخطأ أو الإلغاء.

---

## 🧪 4. `cover` والفلاتر والـfixtures المستقلة

- `single-print-composition.ts` يصرّح `imageFit: 'cover'`، و`print-payload-builder.ts` يحسب نافذة القص من أبعاد المصدر بعد EXIF مرة واحدة؛ preflight يقيس DPI من النافذة المرئية، وGo يستهلك حقول القص الصريحة.
- ترتيب الفلاتر القانوني مصدره `frontend/src/lib/filters/print-filter-contract.ts`: وصفة الأساس ثم brightness → contrast → saturation. النظير في Go يجب أن يبقى حرفياً متزامناً.
- `test-fixtures/print-rgba/` حزمة مواصفة مستقلة: استعمل `node test-fixtures/print-rgba/generate-fixtures.mjs --verify` فقط. ممنوع إعادة توليد expected bytes من الإنتاج أو auto-bless في CI.

---

## 🩸 5. النزيف واللون وصيغ الإخراج

- النزيف الموجب fail-closed عند أي عجز؛ الصفر فقط يعيد Blob الإدخال نفسه. fallback الحفظ لا يحفظ ملفاً فارغاً.
- sRGB: JPEG افتراضي للطباعة وPNG اختياري مدعوم مع DPI. CMYK الحقيقي: TIFF فقط؛ CMYK JPEG/PNG مرفوضان.
- لا ICC أو soft proof حالياً. `fillPatternImage` يبقى على مشتق 2048px، و`cutShapeType` دليل/بيانات مشروع لا clipping تلقائياً.

---

## 🖨️ 6. Direct GDI والخطة والإلغاء

- المسار النشط يولد الصورة ثم يستعمل `PrintDirect`/Win32 GDI؛ لا `iframe` ولا `window.print()`.
- عقود الخلفية: `ResolvePrinterPlan` للمطلوب/المطبق والمساحة القابلة للطباعة، `PollJobStatus` حتى terminal، `CancelSpoolJob` لمهمة السبول، و`CancelPrintJob(jobID)` لتوليد الورقة قبل السبول.
- وجود واردات أو refs في الواجهة لا يثبت اكتمال orchestration: تحقق من الاستدعاء الفعلي للخطة، تمرير JobID، تثبيت معرف السبول، والتعامل مع الحالات النهائية، ثم شغّل الاختبارات المستهدفة/CI.
- `TestGDIPure_*` بلا طابعة حقيقية؛ القبول الفيزيائي منفصل وفق `docs/print-acceptance/` ويبقى Pending حتى دليل عتاد المالك.
