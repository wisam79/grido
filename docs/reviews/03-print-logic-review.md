# 🖨️ تقرير مراجعة منطق الطباعة — Grido Studio

**تاريخ المراجعة:** 20 يوليو 2026
**النطاق:** تحليل مفصّل لنظام الطباعة (Frontend + Go backend + المعاينة)
**المُراجع:** Grido Code Review Agent

> هذا التقرير يحلل منطق الطباعة بالكامل من تكوين الطلب في الواجهة حتى الرسم النهائي في Go، ويقارن المعاينة (CSS) بالمخرج النهائي (Go) لتحديد عدم التطابقات.

## الملفات المراجعة

### Frontend (React/TypeScript)
- `frontend/src/components/editor/print-dialog.tsx` — تجميع الطلب وتشغيل الطباعة
- `frontend/src/components/editor/print/print-preview.tsx` — معاينة CSS
- `frontend/src/hooks/use-print-layout.ts` — حساب الأبعاد والتكرار
- `frontend/src/lib/store/slices/print-slice.ts` — إعدادات الطباعة الافتراضية
- `frontend/src/lib/utils.ts` — `buildCSSFilter` للمعاينة
- `frontend/src/lib/templates/constants.ts` — تعريفات الفلاتر CSS
- `frontend/src/components/editor/properties/slot-properties.tsx` — خصائص الخلية
- `frontend/src/components/editor/konva/elements/collage-image.tsx` — منطق crop في Konva

### Backend (Go)
- `internal/core/domain/print.go` — تعريفات `PrintItem`, `PrintRequest`, `CutLine`, `PrintResult`
- `internal/service/print_service.go` — المنطق الكامل (validation + rendering + filters)
- `internal/handlers/print_handler.go` — طبقة ربط Wails
- `internal/service/print_service_test.go` — اختبارات Go

---

## 📐 نظرة معمارية على نظام الطباعة

نظام الطباعة يتكون من **طبقتين متكاملتين** مع **مسارين مختلفين**:

```
┌─ Frontend (React/Konva) ─────────────────────────┐
│  print-dialog.tsx ← تجميع الطلب                   │
│  use-print-layout.ts ← حساب الأبعاد والتكرار      │
│  print-preview.tsx ← معاينة CSS                   │
└────────────────────┬─────────────────────────────┘
                     │ Wails binding
┌─ Backend (Go) ─────▼─────────────────────────────┐
│  print_handler.go ← طبقة رقيقة                   │
│  print_service.go ← validation + rendering        │
│  print_service_test.go ← اختبارات                │
└──────────────────────────────────────────────────┘
```

### المساران:

| المسار | Collage Mode | Single Mode |
|--------|-------------|-------------|
| **المصدر** | slots منفصلة | `stage.toDataURL()` snapshot |
| **المعاينة** | slots HTML منفصلة | snapshot JPEG |
| **المعالجة** | Go per-image (crop/filter) | صورة واحدة مكررة |

---

## 🔴 مشاكل حرجة (تسبب عدم تطابق المعاينة مع المخرج)

### 1. عدم تطابق الفلاتر بين المعاينة (CSS) والطباعة (Go)

**المواقع:**
- `frontend/src/lib/templates/constants.ts:26-34` (CSS للمعاينة)
- `internal/service/print_service.go:90-135` (Go للمخرج النهائي)

الفلاتر مُعرّفة بـ **قيم مختلفة** في مكانين:

| الفلتر | CSS (المعاينة) | Go (المخرج النهائي) | التطابق |
|--------|----------------|---------------------|---------|
| `skinGlow` | `brightness(1.06) contrast(0.94) saturate(1.08) sepia(10%)` | brightness+6, contrast-6, sat+8, sepia 0.10, **+ blur على البشرة فقط** | ❌ Go يضيف blur على البشرة |
| `cinematic` | `contrast(1.1) saturate(1.15) sepia(5%) brightness(1.02)` | contrast+10, sat+15, sepia 0.05, brightness+2 | ✅ متطابق تقريباً |
| `monoPro` | `grayscale(100%) contrast(1.25) brightness(1.02)` | grayscale + contrast+25 + brightness+2 | ✅ |
| `clarity` | `contrast(1.22) saturate(1.2) brightness(0.98)` | contrast+22, sat+20, brightness-2 | ✅ تقريباً |

**المشكلة الأكبر:** `skinGlow` في Go يطبق `applySkinGlowBlur` (تنعيم بشرة انتقائي عبر كشف لون البشرة في `print_service.go:180-236`) بينما المعاينة CSS لا تفعل ذلك. النتيجة المطبوعة ستختلف بصرياً عما يراه المستخدم.

**الأثر:** المستخدم يرى معاينة، يطبع، ويحصل على نتيجة مختلفة (خصوصاً مع `skinGlow`).

**الإصلاح:** توحيد المنطق — إمّا:
- إزالة `applySkinGlowBlur` من Go (لمطابقة CSS) — الأسرع
- أو إضافة تأثير مماثل في Konva (أصعب، يتطلب custom filter)

---

### 2. حساب `dpiRatio` في Single Mode خاطئ

**الموقع:** `print-dialog.tsx:295-297`

```js
const exportDpi = printSettings.dpi || 300;
const dpiRatio = exportDpi / 300;  // ← خطأ
const targetPixelRatio = (canvasWidth / stage.width()) * dpiRatio;
```

**المشكلة:** `dpiRatio = exportDpi / 300` يفترض أن الكانفس الأصلي مصمم دائماً لـ **300 DPI**. لكن القوالب لها `dpi` مختلف:

- جواز السفر العراقي: `dpi: 300` ✓
- لكن لو طلب المستخدم `printSettings.dpi = 600`، فإن `dpiRatio = 2`، مما يضاعف الدقة.
- لكن لو كان القالب نفسه مصمم لـ 600 DPI (canvasWidth/Height محسوب لـ 600)، فإن `dpiRatio = 600/300 = 2` سيعطي دقة **1200 DPI فعلياً** بدلاً من 600.

**الصحيح:**
```js
const templateDpi = template?.dpi || 300;
const dpiRatio = exportDpi / templateDpi;
```

هذا موجود فعلاً في `use-print-layout.ts:21` (`const dpi = template ? template.dpi : printSettings.dpi`) لكن **لم يُستخدم** في حساب `targetPixelRatio`.

**الأثر:** الطباعة بدقة غير متوقعة، أو OOM إذا تضاعفت الدقة بشكل غير مقصود.

---

### 3. المعاينة في Collage mode لا تتطابق مع المخرج النهائي في التمركز

**المواقع:**
- `print-preview.tsx:48-116` (المعاينة)
- `print-dialog.tsx:171-175` (الـ backend logic)

**المعاينة (HTML):**
```jsx
<div className="w-full h-full relative overflow-hidden">
  {slots.map((slot) => (
    <div style={{ left: `${left_pct}%`, top: `${top_pct}%`, ... }}>
      <img style={{ objectFit: "fill" }} />
```
المعاينة تملأ **100% من حاوية منطقة الطباعة** بالنسب المئوية، فتمدد الكولاج لملء المساحة كاملة.

**الـ backend (Go):**
```js
const gridWidth = cols * imageWidthMM + ...;
const offsetX = mMM + Math.max(0, availableWidthMM - gridWidth) / 2;
// blockXMM = offsetX + col * (imageWidthMM + gapMM)
```
الـ backend يرسم الكولاج بـ **أبعاد فعلية** (`imageWidthMM × imageHeightMM`) **متمركزة** في المنطقة المتاحة.

**عدم التطابق:** لو كان الكولاج أصغر من المنطقة المتاحة (مثلاً كولاج 100×100mm على ورقة A4)، المعاينة ستمدده ليملأ المنطقة، لكن المخرج النهائي سيرسمه بـ 100×100mm في المنتصف مع هوامش بيضاء.

**الأثر:** المستخدم يرى معاينة تملأ الورقة، لكن المطبوع يحتوي هوامش بيضاء كبيرة غير متوقعة.

**الإصلاح:** المعاينة في الكولاج يجب أن تحترم `imageWidthMM/imageHeightMM` وتمركز الكولاج بنفس منطق الـ backend.

---

### 4. `cornerRadius` و `borderWidth` لا يظهرون في معاينة الكولاج

**المواقع:**
- `print-preview.tsx:85` (معاينة)
- `print-dialog.tsx:269-271` (backend)

**المعاينة:**
```jsx
style={{ borderRadius: "2px" }}  // ← ثابت، لا يحترم collageRadius
```

**الـ backend:**
```js
items.push(domain.PrintItem.createFrom({
  ...
  cornerRadiusMM: radiusMM,      // ← من collageRadius
  borderWidthMM: borderWMM,      // ← من collageStrokeWidth
  borderColor: borderColor,      // ← من collageStrokeColor
}));
```

**عدم التطابق:** المستخدم يضبط زوايا مستديرة وحدود في إعدادات الكولاج، يرى في المعاينة زوايا ثابتة 2px بدون حدود، لكن المطبوع النهائي يحتوي الزوايا والحدود الفعلية.

**الإصلاح:** تمرير `collageRadius` و `collageStrokeWidth` و `collageStrokeColor` لـ `SheetPreview` وتطبيقها على كل slot div:
```tsx
style={{
  borderRadius: `${collageRadius * zoom}px`,
  border: collageStrokeWidth > 0 ? `${collageStrokeWidth * zoom}px solid ${collageStrokeColor}` : "none",
}}
```

---

## 🟠 مشاكل عالية الأولوية

### 5. منطق `isFullPage` يتجاهل اختيار المستخدم للهوامش

**الموقع:** `use-print-layout.ts:36-37`

```js
const isFullPage = originalImageWidthMM >= paperWidth - 1 && originalImageHeightMM >= paperHeight - 1;
const effectiveMarginMM = isFullPage ? 0 : printSettings.marginMM;
```

لو صمم المستخدم كانفس بحجم A4 كامل، ثم اختار `marginMM = 5` عبر toggle "طباعة بدون هوامش" (إيقاف)، فإن `isFullPage = true` يجبر `effectiveMarginMM = 0` متجاهلاً اختيار المستخدم.

**الأثر:** المستخدم يطلب هوامش لكن لا يحصل عليها. سلوك مفاجئ.

**الإصلاح:** إزالة منطق `isFullPage` التلقائي، أو جعله استرشادياً مع تحذير بدلاً من فرض.

---

### 6. `repeatMode` موجود في المنطق لكن مكشوف جزئياً

**المواقع:**
- `use-print-layout.ts:44,70-82` (منطق)
- `print-slice.ts:25` (default "all")

المنطق يدعم `"all" | "row" | "column"` لكن لا يوجد UI في `print-dialog.tsx` للتحكم به. القيمة دائماً الافتراضية `"all"`.

**الأثر:** ميزة معطلة. المستخدم لا يستطيع اختيار "تكرار في صف واحد" أو "عمود واحد" رغم أن المنطق موجود.

**الإصلاح:** إضافة selector في `print-dialog.tsx` لاختيار `repeatMode`:
```tsx
<Select value={printSettings.repeatMode} onValueChange={(v) => setPrintSettings({ repeatMode: v })}>
  <SelectItem value="all">تكرار في الشبكة</SelectItem>
  <SelectItem value="row">صف واحد</SelectItem>
  <SelectItem value="column">عمود واحد</SelectItem>
</Select>
```

---

### 7. `actualRows` محسوب مرتين بشكل قد يختلف

**المواقع:**
- `use-print-layout.ts:81` (يُمرر كـ `rows` prop)
- `print-dialog.tsx:172,370` (يعيد حسابه)
- `print-preview.tsx:187` (يستخدم `rows` الممرر)

```js
// use-print-layout.ts (يُمرر كـ rows prop)
rows = Math.ceil(actualCopies / Math.max(1, cols));

// print-dialog.tsx (يعيد حسابه)
const actualRows = Math.ceil(actualCopies / cols);

// print-preview.tsx (يستخدم rows الممرر)
for (let i = 1; i < rows; i++) { ... }
```

في `use-print-layout.ts` يوجد `Math.max(1, cols)` لحماية ضد القسمة على صفر، لكن في `print-dialog.tsx:172` و `370` لا توجد هذه الحماية. لو كان `cols = 0` (مستحيل نظرياً بسبب `Math.max(1,...)` في use-print-layout، لكن لو تلاعب المستخدم بالقيم) سيحدث `Infinity`.

**الأثر:** خطر منخفض لكنه عدم اتساق في الكود.

**الإصلاح:** استخدام `rows` المُمرر من `use-print-layout` بدلاً من إعادة الحساب في `print-dialog.tsx`.

---

### 8. تنظيف ملفات `print_` قد يحذف ملفات قيد الاستخدام

**الموقع:** `print_service.go:491-500`

```go
if files, err := os.ReadDir(outDir); err == nil {
  for _, f := range files {
    if time.Since(info.ModTime()) > 24*time.Hour {
      _ = os.Remove(filepath.Join(outDir, f.Name()))
    }
  }
}
```

يُنفّذ **متزامناً** في كل استدعاء `GeneratePrintSheet`. لو كان المستخدم طبع ورقة قبل 23:59 ساعة وما زال حوار الطباعة مفتوحاً، ثم طلب طباعة جديدة، قد يُحذف ملف الـ HTML القديم قبل إغلاق الحوار.

**الأثر:** نادر لكنه قد يسبب فشل طباعة صامتة لورقة سابقة.

**الإصلاح:** نقل التنظيف لـ background goroutine أو استخدام threshold أحدث من 25 ساعة:
```go
go cleanupOldExports(outDir)  // غير متزامن
```

---

### 9. `setTimeout` في طباعة HTML قد يُزيل iframe مبكراً

**الموقع:** `print-dialog.tsx:404-410`

```js
setTimeout(() => {
  iframe.contentWindow?.focus();
  iframe.contentWindow?.print();
  setTimeout(() => {
    document.body.removeChild(iframe);  // ← بعد 1 ثانية
  }, 1000);
}, 500);
```

`window.print()` في معظم المتصفحات **متزامن** (يحظر حتى إغلاق حوار الطباعة). لكن في WebView2 قد يكون السلوك مختلفاً، خاصة مع طابعات شبكية بطيئة أو "طباعة إلى PDF". لو أغلق المستخدم حوار الطباعة بعد >1 ثانية، قد يكون الـ iframe قد حُذف.

**الأثر:** فشل الطباعة الصامتة في حالات حافة.

**الإصلاح:** استخدام `window.onafterprint`:
```js
iframe.contentWindow!.onafterprint = () => document.body.removeChild(iframe);
iframe.contentWindow!.print();
// fallback في حالة عدم دعم onafterprint
setTimeout(() => {
  if (document.body.contains(iframe)) document.body.removeChild(iframe);
}, 30000);
```

---

## 🟡 مشاكل متوسطة الأولوية

### 10. منطق crop للـ collage لا يُختبر

**الموقع:** `print-dialog.tsx:224-253`

منطق crop المعقد (حساب `sw`, `sh`, `defaultSx`, `defaultSy`, `dragXClamped`, `sx`, `sy`) **غير مغطى بأي اختبار**. الـ Go test (`print_service_test.go`) يختبر فقط الـ validation والرسم الأساسي، لا منطق crop نفسه.

**المقارنة مع Konva:** منطق crop في `collage-image.tsx:91-122` **متطابق** تقريباً مع `print-dialog.tsx`:

```js
// collage-image.tsx (Konva - ما يراه المستخدم)
const imgAspect = image.width / image.height;
const slotAspect = width / height;
let sw = image.width, sh = image.height;
if (imgAspect > slotAspect) sw = image.height * slotAspect;
else sh = image.width / slotAspect;
sw = sw / zoom; sh = sh / zoom;
const defaultSx = imgAspect > slotAspect ? (image.width - sw) / 2 : 0;
...
const sx = Math.round(defaultSx + dragXClamped);
```

```js
// print-dialog.tsx (Go backend - ما يُطبع)
const imgAspect = imgSize.w / imgSize.h;
const slotAspect = (slot.w * canvasWidth) / (slot.h * canvasHeight);
let sw = imgSize.w, sh = imgSize.h;
if (imgAspect > slotAspect) sw = imgSize.h * slotAspect;
else sh = imgSize.w / slotAspect;
sw = sw / zoomVal; sh = sh / zoomVal;
const defaultSx = imgAspect > slotAspect ? (imgSize.w - sw) / 2 : 0;
...
const sx = defaultSx + dragXClamped;
```

**ملاحظة إيجابية:** المنطق **متطابق**، وهذا ممتاز. لكن:
1. Konva يستخدم `Math.round` على `sx/sy/sw/sh`، بينما print-dialog لا يستخدم. قد يسبب اختلاف 1px.
2. `slotAspect` في Konva = `width / height` (بكسل العرض)، في print-dialog = `(slot.w * canvasWidth) / (slot.h * canvasHeight)` (بكسل الكانفس الأصلي). متطابق رياضياً لأن `width/height` في Konva = `(slot.w * canvasWidth) / (slot.h * canvasHeight)`.

**الإصلاح:** إضافة `Math.round` في print-dialog للمطابقة، واستخراج منطق crop كدالة مستقلة قابلة للاختبار:
```ts
// lib/crop-utils.ts
export function computeCrop(imgW, imgH, slotAspect, zoom, dragX, dragY) {
  // ... المنطق الحالي
}
```
ثم اختبارها بـ Vitest مع حالات: aspect ratios مختلفة، zoom عالي، drag خارج الحدود.

---

### 11. `maxDragX/maxDragY` قد يكون صفراً مع zoom عالٍ

**المواقع:**
- `print-dialog.tsx:246-247`
- `collage-image.tsx:112-113`

```js
const maxDragX = (imgSize.w - sw) / 2;
const maxDragY = (imgSize.h - sh) / 2;
```

عند `zoomVal = 3` (300%)، يصغر `sw`/`sh` لثلث الحجم. لو كانت الصورة الأصلية 100×100px، `sw = 33`، `maxDragX = (100-33)/2 = 33`. منطقي.

لكن لو كانت الصورة الأصلية **مساوية** لـ slot aspect مع zoom = 1، فإن `sw = imgSize.w`، `maxDragX = 0`. عندئذ `dragXClamped = 0` دائماً، والمستخدم لا يستطيع السحب. هذا **سلوك صحيح** (لا فائدة من السحب لو لم تكن هناك مساحة)، لكن لا يوجد feedback للمستخدم بأن السحب غير متاح.

**الإصلاح:** تعطيل مؤشر السحب أو إظهار tooltip "لا توجد مساحة للتحريك" عندما `maxDragX === 0 && maxDragY === 0`.

---

### 12. `buildCSSFilter` لا يطبق في معاينة Single mode

**الموقع:** `print-preview.tsx:151-159` (Single mode)

```jsx
{previewImageSrc ? (
  <img src={previewImageSrc} style={{ objectFit: "fill" }} />
) : ...}
```

في Single mode، المعاينة تعرض `previewImageSrc` (snapshot من Konva) **بدون أي CSS filter**. لكن الـ snapshot نفسه من `stage.toDataURL()` يلتقط الفلاتر المطبقة في Konva. هذا **صحيح** فعلاً لأن الفلاتر مدمجة في الـ snapshot.

لكن في الـ backend، الـ PrintItem للـ Single mode يمرر `filter: "none"`:
```js
items.push(domain.PrintItem.createFrom({
  imageSrc: localPath,
  filter: "none",  // ← الفلاتر مدمجة في الصورة
  ...
}));
```

هذا **صحيح** — لا يجب إعادة تطبيق الفلاتر. ✅

**النتيجة:** Single mode صحيح بالكامل. لا مشكلة هنا.

---

### 13. `resolveLocalPath` في print_service لا يتحقق من path traversal

**الموقع:** `print_service.go:68-75`

```go
func resolveLocalPath(src string) string {
  if strings.HasPrefix(src, "/local-image/") {
    filename := filepath.Base(filepath.Clean(strings.TrimPrefix(src, "/local-image/")))
    appDir := utils.GetAppDir()
    return filepath.Join(appDir, "Media", filename)
  }
  return src
}
```

`filepath.Base` يستخرج اسم الملف فقط، فلا يمكن تجاوز المجلد. ✅ آمن.

لكن لو مرّ `src` **غير** مسبوق بـ `/local-image/` (مثل مسار مطلق `/etc/passwd`)، يُعاد كما هو. هذا قد يكون خطراً لو استطاع المستخدم تمرير `imageSrc` عشوائي عبر JSON project مستورد. لكن:
1. الـ asset handler في `main.go` يخدم فقط `/local-image/`
2. `validatePrintRequest` يتحقق من وجود الملف فقط (`os.Stat`)

**الأثر:** خطر منخفض، لكن يُفضل إضافة تحقق أن المسار داخل `Media` أو `Exports`.

**الإصلاح:**
```go
func resolveLocalPath(src string) string {
  if strings.HasPrefix(src, "/local-image/") {
    filename := filepath.Base(filepath.Clean(strings.TrimPrefix(src, "/local-image/")))
    appDir := utils.GetAppDir()
    mediaDir := filepath.Join(appDir, "Media")
    resolved := filepath.Join(mediaDir, filename)
    // تحقق إضافي أن المسار النهائي داخل Media
    if !strings.HasPrefix(resolved, mediaDir+string(filepath.Separator)) {
      return ""  // أو إرجاع خطأ
    }
    return resolved
  }
  return src
}
```

---

## 🟢 نقاط إيجابية تستحق الإشادة

### 1. منطق crop متطابق بين Konva و Backend

كما أوضحت في المشكلة #10، منطق crop (object-fit: cover + zoom + drag) **مطابق** بين ما يراه المستخدم في Konva وما يُطبع في Go. هذا إنجاز مهم يضمن أن "ما تراه هو ما تطبعه" فيما يخص التمركز والتكبير.

### 2. validation صارم ومختبر

`validatePrintRequest` (`print_service.go:253-287`) يتحقق من:
- DPI (50-600)
- أبعاد الورقة (10-1000mm)
- عدد العناصر (≤1000)
- **int64 overflow**: `int64(widthPx)*int64(heightPx) > 144000000`
- وجود ملفات الصور

الاختبارات (`print_service_test.go:125-176`) تغطي كل هذه الحالات. ✅

### 3. LRU cache ذكي للصور

`imageCache` (8 صور raw) + `processedCache` (16 معالجة) (`print_service.go:289-299`) يقللان إعادة التحميل والمعالجة للتكرار في الكولاج. المفاتيح تشمل كل المعاملات (brightness, contrast, filter, crop, target size).

### 4. معالجة متوازية مع تحديد التزامن

```go
g.SetLimit(runtime.NumCPU())
```
يمنع استنزاف الذاكرة عبر تحديد عدد الـ goroutines المتزامنة (`print_service.go:611-615`).

### 5. PNG pHYs chunk لـ DPI دقيق

`setPngDPI` (`print_service.go:678-718`) يضيف chunk الـ pHYs لملف PNG لضمان أن الطابعة تقرأ DPI الصحيح. المنطق صحيح (موضع الإدراج بعد IHDR + CRC).

### 6. HTML wrapper يتجاهل عارض الصور الافتراضي

طباعة عبر `<iframe>` + `window.print()` بـ `@page size` (`print_service.go:525-580`) يضمن طباعة بالمليمترات الدقيقة، متجاوزاً عارض الصور الافتراضي في Windows الذي قد يتجاهل DPI.

### 7. تنظيف تلقائي للمخرجات القديمة

حذف ملفات `Exports` الأقدم من 24 ساعة (`print_service.go:491-500`) يمنع امتلاء القرص.

---

## 📊 ملخص المشاكل حسب الأولوية

| # | المشكلة | الأولوية | الأثر |
|---|---------|---------|------|
| 1 | عدم تطابق فلتر `skinGlow` (CSS vs Go blur) | 🔴 حرجة | معاينة ≠ مطبوع |
| 2 | `dpiRatio = exportDpi / 300` بدلاً من `/ template.dpi` | 🔴 حرجة | دقة خاطئة / OOM |
| 3 | معاينة الكولاج لا تتمركز كالـ backend | 🔴 حرجة | معاينة ≠ مطبوع |
| 4 | `cornerRadius`/`borderWidth` غائبة من المعاينة | 🔴 حرجة | معاينة ≠ مطبوع |
| 5 | `isFullPage` يتجاهل اختيار المستخدم للهوامش | 🟠 عالية | سلوك مفاجئ |
| 6 | `repeatMode` غير مكشوف في UI | 🟠 عالية | ميزة معطلة |
| 7 | `actualRows` محسوب بشكل غير متسق | 🟠 عالية | خطر حافة |
| 8 | تنظيف `print_` قد يحذف ملفات قيد الاستخدام | 🟠 عالية | فشل طباعة |
| 9 | `setTimeout` قد يزيل iframe مبكراً | 🟠 عالية | فشل طباعة |
| 10 | منطق crop غير مختبر + `Math.round` ناقص | 🟡 متوسطة | اختلاف 1px |
| 11 | لا feedback عند تعذر السحب (zoom=1, same aspect) | 🟡 متوسطة | UX |
| 13 | `resolveLocalPath` لا يتحقق من المسار الكامل | 🟡 منخفضة | خطر منخفض |

---

## 💡 التوصيات

### إصلاحات فورية (ساعة عمل):
1. **#2:** تغيير `const dpiRatio = exportDpi / 300` → `exportDpi / (template?.dpi || 300)`
2. **#4:** تمرير `collageRadius`/`collageStrokeWidth`/`collageStrokeColor` لـ `SheetPreview`
3. **#10:** إضافة `Math.round` لـ `sx/sy/sw/sh` في `print-dialog.tsx`

### إصلاحات قصيرة المدى (يوم عمل):
4. **#1:** توحيد فلتر `skinGlow` (إزالة `applySkinGlowBlur` من Go أو إضافته لـ Konva)
5. **#3:** إعادة كتابة معاينة الكولاج لتحترم `imageWidthMM` وتمركز كالـ backend
6. **#5:** إزالة `isFullPage` التلقائي أو جعله تحذيراً
7. **#9:** استخدام `onafterprint` بدلاً من `setTimeout`

### إصلاحات متوسطة المدى:
8. **#6:** إضافة UI selector لـ `repeatMode`
9. **#10:** كتابة اختبارات وحدة لمنطق crop (مستخرج كدالة مستقلة)
10. **#8:** نقل تنظيف `Exports` لـ background goroutine

---

## 🏁 الخلاصة

الأساس المنطقي للطباعة **قوي ومتسق** بين Konva و Go في معظم الأجزاء (خصوصاً منطق crop). المشاكل الرئيسية تتركز في **عدم تطابق المعاينة مع المخرج النهائي** (الفلاتر، التمركز، الزوايا) وهي قابلة للإصلاح بدون إعادة بناء.

أكبر خطر هو **#2 (dpiRatio خاطئ)** لأنه قد يسبب OOM عند طلب دقة عالية على قالب بدقة مختلفة. يجب إصلاحه أولاً.

الـ validation و LRU cache والمعالجة المتوازية و PNG pHYs chunk كلها مُنفذة بشكل ممتاز وتستحق الإشادة.
