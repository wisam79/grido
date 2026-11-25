---
name: konva-canvas-and-export
description: المرجع الموحد لمحرك Konva Canvas والنصوص العربية والطباعة فائقة الدقة (300+ DPI) وجودة التصدير (`/canvas-export-qa`)
---

# ⚡🖨️ محرك Konva والنصوص والتصدير فائق الدقة (Konva Canvas & Hi-Res Export)

يوحّد هذا الدليل ثوابت الرسم والأداء، وتصيير النصوص العربية والمنحنية، ومسار الطباعة والتصدير 300+ DPI (`/canvas-export-qa`).

---

## 1. الطبقات، الكاش، والسحب في Konva

- **ميزانية الطبقات (4 كحد أقصى):** (1) `KonvaBackgroundLayer` (`listening={false}` لكل الثوابت؛ يُمنع `FastLayer`)، (2) طبقة المحتوى (`KonvaSingleLayer` أو `KonvaCollageLayer` مع عزل hover في `CollageEmptySlotPlaceholder`)، (3) `KonvaOverlayLayer` (المحوّل، التحديد، أدلة السناب)، (4) طبقة السحب الرسمية `frontend/src/components/editor/konva/drag-layer.ts`.
- **طبقة السحب الرسمية (`Official Drag-Layer`):** `liftToDragLayer(nodes)` عند `onDragStart` (+ المحوّل وشارة الأبعاد)، و`dropFromDragLayer()` **أولاً** في `onDragEnd` قبل أي كتابة للـ store مع استعادة `{parent, zIndex}`.
- **الذاكرة والكاش وVRAM:**
  - لا تضع `x`/`y`/`dragX`/`dragY`/`zoom` في dependencies لـ `useEffect` الكاش (`node.cache()`).
  - ثبّت `pixelRatio` ولا تخفّضه أثناء Zoom/Pan؛ استخدم التقريب الأسي المتراكم محلياً `Math.exp(-e.deltaY * factor)`.
  - معادلة سقف الكاش تراعي الأسطح الثلاثة (scene+filter عند `pixelRatio` + hit عند 1): `4·W·H·(2r²+1) <= budget`، وتطبّق الفلاتر المتتالية عبر `composePixelFilters`.
  - عطّل ظل الحدود دائماً (`shadowForStrokeEnabled={false}`) وأطفئ الظلال أثناء السحب (`withShadowlessDrag` عبر `drag-shadow.ts`).
  - الصور الضخمة تُعرض عبر `getDisplayImage` (`frontend/src/lib/canvas/display-image.ts` بسقف 2048px)؛ التصدير وAI يعملان على المصدر الكامل دائماً.
- **المجموعات والتحويلات:**
  - أغلف أي خلفية أو قناع حول صورة داخل `<Group>` ذري واحد بموضع داخلي `x=0, y=0`؛ وأي أنيميشن داخل المجموعة (مثل `MagicAiScanner`) يبقى عند `(0,0)` ويدفع الرسم بنفسه (`group.getLayer()?.batchDraw()`).
  - أي `tr.forceUpdate()` يدوي يُحاط بالحاجز `if (!tr.isTransforming() && !tr.isDragging())`.
  - مجموعات `groupId` تتحرك وتُحاذى ككتلة واحدة؛ وفي `onTransformEnd` تُثبَّت أبعاد المجموعة صراحةً مع المسار الاحتياطي (عدا النص).
  - تحجيم خلايا الكولاج اتجاهي: التصغير حر بلا فحص عوائق، والتوسيع يفحص العقبات في مسار الضلع فقط.
  - ارسم الشبكات والخطوط المتكررة داخل `beginPath()` واحد مع `stroke()`/`fill()` واحد خارج الحلقة.

---

## 2. النصوص العربية، الجاهزية، والتحجيم

- **حدود النصوص المتصلة:** يُمنع `ctx.strokeText` أو `stroke` الافتراضي على العربية/Cursive؛ استعمل فلتر التمدد الشكلي `ensureTextStrokeFilter` (`feMorphology operator="dilate"` على `SourceAlpha`). النص المنحني يُرسم على كانفاس وسيط ثم يُطبّق الفلتر مرة واحدة.
- **الالتفاف والقياس:** `wrap="word"` و`ellipsis={false}` افتراضياً؛ مرّر `width` فقط لـ `<Text>` واقرأ الارتفاع من عقدة قياس معزولة بـ `height='auto'` عبر `measureTextHeightPx` (`frontend/src/lib/canvas/text-measure.ts`) ثم ادفعه للـ Store في `useEffect` (لا `useState` ولا `node.textHeight` أو `getTextHeight()`).
- **الاتجاه والتنسيق المشترك:** مصدر الحالة واحد (`resolveTextRenderState` في `frontend/src/lib/canvas/text-helpers.ts`) — الاتجاه بأول محرف قوي (`resolveTextDirection`)، تصفير `letterSpacing` للعربية في الاتجاهين، والخطوط تُنتظر عبر `document.fonts.load` بمفتاح `family + weight + style` وعينة عربية+لاتينية قبل القياس والتصدير.
- **نموذج التحجيم (`textSizing: 'auto' | 'fixed'`):** المستندات القديمة تُقرأ `'fixed'` عبر `resolveTextSizing`. المصدر الوحيد لحساب الصندوق هو `fitTextGeometry` (`frontend/src/lib/canvas/text-fit.ts`) بسقف `AUTO_TEXT_MAX_WIDTH_RATIO = 0.95` والحفاظ على المركز `−R(θ)·(Δw/2, 0)`. للنص 8 مقابض + تدوير: الزوايا تحجّم `fontSize` وتثبت `textResizeAnchor`، ومنتصفات الحواف تضبط العرض وتتحول إلى `'fixed'`.
- **تطابق المحرر والبديل:** محرر DOM يطابق حشوة وعرض ومظهر الكانفاس، والمسار الاحتياطي يطابق خط أساس `alphabetic` وإزاحة التزيين (`fontSize/15` و`fontSize/4`) وتدرج/ظل `colorWithAlpha`.

---

## 3. التصدير فائق الدقة (300+ DPI) والطباعة Direct GDI (`/canvas-export-qa`)

- **معادلة التطابق الإحداثي:** $\text{TargetPx} = \text{NormalizedCoord} \times (\frac{\text{DimensionMM}}{25.4} \times \text{DPI})$.
- **معاملة الالتقاط الذرية (`captureStageBlob` في `frontend/src/lib/canvas/konva-export-utils.ts`):**
  1. تسلسل الالتقاطات لكل Stage مع مهل الطابور والجاهزية و`toBlob` و`AbortSignal`.
  2. انتظار الخطوط والصور، ثم ترقية مشتقات 2048px وكاش الفلاتر داخل القفل فقط (`pixelRatio: Math.max(1, targetPixelRatio)`).
  3. إخفاء overlays وتصفير مصفوفة Stage مؤقتاً، واستعادة كل شيء في `finally` دائماً (مع انتظار `requestAnimationFrame` قبل الالتقاط وحفظ لون الخلفية الفعلي).
- **عقود القص والنزيف والفلاتر:**
  - قيد إحداثيات خطوط القص بحدود الورقة: `Math.min(paperWidthMM, Math.max(0, x))` في التصدير والمعاينة معاً؛ النزيف والعلامات تُطبّق كمعالجة لاحقة (`applyBleedAndCropMarks`) وتفشل صراحةً (fail-closed) عند العجز.
  - `single-print-composition.ts` و`print-payload-builder.ts` يطابقان `cover` وEXIF؛ وترتيب الفلاتر القانوني في `frontend/src/lib/filters/print-filter-contract.ts` (الوصفة ثم `brightness → contrast → saturation`) يطابق Go حرفياً.
  - حزمة `test-fixtures/print-rgba/` تُفحص بـ `node test-fixtures/print-rgba/generate-fixtures.mjs --verify` فقط (ممنوع auto-bless).
- **الصيغ والطباعة المباشرة:**
  - JPEG افتراضي وPNG اختياري (sRGB مع حقن DPI)، و**CMYK الحقيقي TIFF فقط**.
  - الطباعة النشطة عبر `PrintDirect` / Win32 GDI (يُمنع `window.print()` و`iframe`) وعقود `ResolvePrinterPlan` و`PollJobStatus` و`CancelSpoolJob` و`CancelPrintJob`.
  - `TestGDIPure_*` يثبت العقود البرمجية فقط؛ القبول الفيزيائي على عتاد حقيقي منفصل في `docs/print-acceptance/`.
