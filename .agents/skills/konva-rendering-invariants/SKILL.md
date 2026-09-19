---
name: konva-rendering-invariants
description: دليل مهارة موحد لثوابت الرسم والأداء في Konva (الطبقات، الكاش و VRAM، الزوم السلس، المجموعات الذرية، النصوص، الفلاتر، الكولاج الحر) في Grido Studio
---

# ⚡ مهارة ثوابت الرسم والأداء في Konva (Konva Rendering Invariants)

يوحّد هذا الدليل المهارات القديمة (`konva-canvas-optimizer`, `konva-gesture-touch-transformer`, `konva-layer-composite-filters`, `konva-freeform-collage-engine`) في مرجع واحد. القواعد المشتركة مع `.agents/AGENTS.md` موجودة هنا بصيغة مفصلة، وAGENTS.md هو الملخص الإلزامي — عند أي تعديل على قاعدة، عدّلها هنا أولاً ثم زامن الملخص في AGENTS.md.

---

## 🧱 1. الكاش وذاكرة VRAM (Cache & VRAM Rules)

1. **حظر إدراج إحداثيات السحب في تبعيات الكاش:** يُمنع إضافة `x`, `y`, `dragX`, `dragY`, أو `zoom` كمصفوفة تبعيات للـ `useEffect` الذي يستدعي `node.cache()`. استدعاء الكاش أثناء السحب يعيد إنشاء القوام (Texture) في VRAM بكل فريم ويؤدي للتقطيع.
2. **التعديل الذكي للـ Cache:** فعّل `node.cache()` فقط على العناصر التي تحتوي فلاتر معقدة (مثل CSS Filters أو أغطية الألوان)، وتجنّب استدعاءه أثناء حركات السحب والإسقاط النشطة.
3. **تثبيت الـ pixelRatio:** يُمنع تعديل أو خفض `pixelRatio` الخاص بـ Konva Stage ديناميكياً أثناء Zoom/Pan لتفادي إعادة تخصيص VRAM ومسح السياق وتذبذب البكسلات الفرعية (Subpixel Jitter). الاعتماد دائماً على التحجيم الأسي الناعم للـ CSS/Stage.

---

## 🚫 2. الطبقات المهملة وفصل الاهتمامات (Layers)

1. **استبدال FastLayer:** استخدام `<Layer listening={false}>` دائماً بدلاً من `FastLayer` المهملة (Deprecated) لتفادي تحذيرات الـ Console وضمان التوافقية مع محرك Konva الحديث.
2. **فصل الطبقة الثابتة عن التفاعلية:** احتفظ بعناصر الشبكة والمساطر في `Layer` منفصل عن عناصر الصور والنصوص التفاعلية، مع `listening={false}` على طبقة الشبكة والمساطر لمنع حساب تداخل المؤشر (Hit Graph) على آلاف النقاط.

---

## 🖐️ 3. التكبير السلس غير الخانق (Smooth Accumulated Zooming)

* يُمنع قراءة Zoom من الـ Store مباشرة أثناء الـ Wheel؛ يتم تجميع الهدف المحسوب محلياً واستخدام التقريب الأسي:

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

* استخدم `transform: scale(zoom)` على الحاوية الخارجية (Wrapper Div) عند تدوير عجلة الفأرة لتجنب إعادة حساب أبعاد كافة عناصر Stage في React.
* فعّل `listening={false}` لجميع العناصر أثناء الـ Pinch-to-zom لضمان 60 إطاراً في الثانية.

---

## 📦 4. المجموعات الذرية والسحب المجمّع (Atomic Groups & Composite Dragging)

1. **الذرات المجمعة:** عند إضافة خلفية `<Rect>` أو قناع حول صورة، غلّفهما إجبارياً داخل `<Group>` واحد مع وضع العناصر الداخلية في `x=0, y=0`، وتعيين الـ `ref` ومقابض السحب والتحويل للمجموعة نفسها لضمان تحركها ككتلة ذرية واحدة دون انفصال.
2. **عزل إحداثيات الأنيميشن الداخلية:** أي أنيميشن (مثل مؤشر المسح الذكي `MagicAiScanner`) موضوع داخل `<Group>` ذي موضع `(x, y)` يجب أن يظل عند الإحداثيات المحلية `(0, 0)` لمنع الإزاحة المزدوجة (Double Offset).
3. **سحب المجموعات المجمعة:** عند تجميع عدة عناصر في `groupId`، تعامل مع المجموعة ككتلة ذرية واحدة (`Composite Bounding Box`)؛ تُزاح جميع العناصر بنفس المقدار النسبي `(dx, dy)` دون تطبيق المحاذاة على كل عنصر فرعي لمنع التداخل أو قفز العناصر.
4. **أبعاد المجموعات القابلة للتحجيم:** عقد `<Group>` لا تستنتج أبعادها تلقائياً للمحولات (Transformers)؛ مرّر `width` و`height` صراحةً، وفي `onTransformEnd` استخدم المسار الاحتياطي `(typeof node.width === "function" && node.width() > 0) ? node.width() : el.width * canvasWidth`.

---

## ✍️ 5. النصوص والتايبوغرافي (Text & Typography)

1. **فلتر التمدد الشكلي للحدود (Morphological Stroke Dilation):** يُمنع إجبارياً استخدام `ctx.strokeText` أو خاصية `stroke` الافتراضية في Konva للنصوص المتصلة (العربية أو Cursive)؛ رسم الحدود لكل حرف (Glyph) يولّد أوتاداً حادة تقطع وصلات الحروف. الحل المعتمد هو فلتر التمدد الشكلي الموحد على قناة الشفافية المجمعة (`SourceAlpha` عبر `ensureTextStrokeFilter`) للكلمة ككتلة واحدة، في الكانفاس المباشر وعند التصدير.
2. **الالتفاف التلقائي بدون تذبذب:** استخدم دائماً `wrap="word"` مع `ellipsis={false}` (ويُمنع `wrap="none"` + `ellipsis={true}` الذي يقطع النصوص بنقاط حذف)، ومرّر `width` فقط بدون فرض `height` مسبق.
3. **منع useState للأبعاد التلقائية:** لا تخزّن ارتفاع النص المحسوب في `useState` محلي (دورات render مزدوجة وتذبذب بصري)؛ اقرأ `node.height()` داخل `useEffect` وادفع القيمة المُطبَّعة مباشرة للـ Store عبر `onChange({ height: pixelHeight / canvasHeight })`.

---

## 🎨 6. تجميع المسارات والسياق (Path Batching & Canvas Context)

1. **التجميع في المسارات:** عند رسم شبكات أو خطوط متكررة، اجمع المسارات في `beginPath()` واحد واستدعِ `fill()`/`stroke()` مرة واحدة خارج التكرار. يُمنع الاستدعاء داخل الحلقة. (نصيحة: استخدم `context.moveTo(x + r, y)` قبل كل `arc` لكسر المسار يدوياً ورسم آلاف النقاط بـ fill واحد).
2. **تثبيت خصائص السياق خارج الحلقة:** لا تغيّر `globalAlpha` أو `fillStyle` داخل الحلقة بدون ضرورة.
3. **سياق القراءة المتكرر:** عند إنشاء سياق 2D مخصص للمعالجة البكسلية استخدم `{ willReadFrequently: true }`، واستخدم `OffscreenCanvas` في الـ Worker Threads للحسابات الثقيلة (الألوان السائدة، المسح الذكي).

---

## 📐 7. هندسة الكولاج الحر (Freeform Collage Engine)

### 7.1 كاشف العوائق الاتجاهي (Directional Obstacle Detection)
يُمنع استخدام خوارزميات دفع عامة لا تميز اتجاه الحركة (`pushOutOfOthers`). الحركة نمطان صارمان:

1. **الانكماش والتصغير (Shrinking):** يتحرك الضلع بسلاسة تامة ومستمرة وفق إحداثيات الفأرة **دون أي فحص للعقبات** (التصغير يبتعد بطبيعته عن الحواف ولا يخلق اصطداماً جديداً)، مع الالتزام بحد `MIN_SIZE` ومحيط الورقة فقط.
2. **التوسيع والتمدد (Expanding):** تفحص الخوارزمية حصراً العقبات الواقعة في مسار الضلع المتوسع (أمام الحافة مباشرة مع تقاطع على المحور العمودي)، ويتوقف التمدد بسلاسة عند ملامسة حافة الجار دون قفز أو تراجع قسري.

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

### 7.2 التقسيم الذكي للحاويات (Binary Space Partitioning)
عند تقسيم خلية إلى خليتين (أفقياً أو رأسياً):
- احتفظ بالهوية الذرية للخلية الأصلية وقسّم المساحة النسبية بدقة `(0.0 - 1.0)`.
- احسب إزاحة التباعد (Gap Spacing) كإزاحة بكسلية حقيقية مستقلة عن عامل التكبير.
- تأكد أن مجموع أبعاد الخلايا الناتجة مع الفواصل يطابق أبعاد الحاوية الأصلية 100% لمنع تسريب البكسلات الفرعية.

---

## 🖨️ 8. تصدير الفلاتر بدقة عالية (High-DPI Filter Export)

1. ارتقِ بدقة كاش كافة العناصر المفلترة (`node.isCached()`) إلى `pixelRatio: Math.max(1, targetPixelRatio)` قبل التقاط `stage.toCanvas()`.
2. استعد كاش الشاشة الأصلي الخفيف (`restoreScreenCache` / `pixelRatio: 1`) في كتلة `finally` لحماية VRAM أثناء التحرير.

---

## 🔍 9. قائمة فحص سريعة عند تعديل أي مكون Konva

- [ ] هل `useEffect` الكاش يراقب إحداثيات سحب أو زوم؟ → اعزلها فوراً.
- [ ] هل يوجد `FastLayer`؟ → استبدلها بـ `<Layer listening={false}>`.
- [ ] هل الزوم يقرأ من الـ Store داخل الـ Wheel؟ → جمّع الهدف محلياً بالتقريب الأسي.
- [ ] هل خلفية/قناع خارج `<Group>` ذري؟ → غلّفهما مع `x=0, y=0` داخلياً.
- [ ] هل نص يستخدم `wrap="none"` أو `useState` لارتفاع محسوب؟ → طبّق قواعد القسم 5.
- [ ] هل `fill()/stroke()` داخل حلقة؟ → جمّع المسارات في مسار واحد.
- [ ] هل تحجيم خلية كولاج يفحص العقبات عند التصغير؟ → أزل الفحص (القسم 7.1).
