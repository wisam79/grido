---
trigger: glob
glob: "{frontend/src/components/editor/konva/**/*,frontend/src/lib/canvas/**/*,frontend/src/lib/export/**/*,frontend/src/components/editor/canvas/**/*,frontend/src/features/stickers/**/*,frontend/src/components/editor/dialogs/print-dialog.tsx}"
description: "قواعد محرك الرسم Konva Canvas والأداء والذاكرة والتصدير عالي الدقة"
---

# قواعد محرك الرسم والكانفاس (Konva Canvas & Hi-Res Export)

التفاصيل والأمثلة في `.agents/skills/konva-canvas-and-export/SKILL.md`.

## الأداء والذاكرة والكانفاس
- **المجموعات والسحب:** مجموعات `groupId` تُحاذى وتُحرّك ككتلة ذرية؛ استخدم طبقة السحب الرسمية `frontend/src/components/editor/konva/drag-layer.ts` (`liftToDragLayer` ثم `dropFromDragLayer` أولاً قبل كتابة الـ store). إحاطة أي `tr.forceUpdate()` يدوي بحاجز `if (!tr.isTransforming() && !tr.isDragging())` (`frontend/e2e/transformer-box-follows-geometry.spec.ts`).
- **الكاش وVRAM:** عطّل ظل الحدود (`shadowForStrokeEnabled={false}`) وأطفئ الظلال أثناء السحب (`withShadowlessDrag`). ارسم الصور الكبيرة عبر `getDisplayImage` (سقف 2048px) للعرض فقط، وأبقِ التصدير والـ AI على المصدر الكامل. ثبّت `pixelRatio` ولا تغيّره أثناء الزوم؛ جمّع الزوم محلياً بـ`Math.exp(-e.deltaY * factor)`. لا تضع `dragX`/`dragY`/`zoom` في dependencies لـ `node.cache()`.
- **الطبقات والـ DOM:** يُمنع `FastLayer` (استعمل `<Layer listening={false}>`)، جمّع مسارات الرسم المتكررة داخل `beginPath()` واحد مع `stroke()`/`fill()` خارج الحلقة، غلّف المكونات الثقيلة بـ `React.memo`+`useMemo`، استخدم `elements.map(el => ({...el}))` في التاريخ، `TooltipProvider` واحد في `App.tsx`، وكاش صور عالمي في Hooks.
- **العقد الذرية والنصوص:** الخلفيات والأقنعة داخل `<Group>` واحد عند `x=0, y=0` (ومثلها أنيميشن `MagicAiScanner` دون قراءة إحداثيات الأب) مع تمرير `width`/`height` صراحةً ومسار احتياطي في `onTransformEnd`. للنصوص: `wrap="word"` و`ellipsis={false}` دون `useState` للارتفاع التلقائي (قِس via `useEffect` وادفع للـ Store)، وطبّق الحدود المتصلة بفلتر التمدد `ensureTextStrokeFilter` (`dilate`) لا `ctx.strokeText`.
- **تحجيم الكولاج والاستقبال التسلسلي:** التصغير في الخلايا حر بلا فحص عوائق، والتوسيع يفحص العقبات في مسار الضلع فقط. في الكولاج يملأ الاستقبال الخانة المحددة/الفارغة الأولى وينقل التحديد للتالية؛ وفي التصميم الحر يحسب النسبة ويتمركز وسط الورقة.

## التصدير والطباعة 300+ DPI
- **معاملة الالتقاط والقرارات المحمية:** كل التقاط Konva يمر بـ`captureStageBlob` واستعادة كل تغيير في `finally`. تبقى الثوابت المحمية: `fillPatternImage` على 2048px، `cutShapeType` دليل لا clipping، ولا ICC/soft proof حالياً.
- **معالجة الطباعة وخطوط القص:** النزيف وعلامات القص تُطبق كمعالجة لاحقة (`applyBleedAndCropMarks`). أعد بناء كاش الفلاتر عند التصدير بنسبة `Math.max(1, targetPixelRatio)` واستعده في `finally`. قيّد خطوط القص بحدود الورقة (`Math.min(paperWidth/Height, ...)`) وطابق المعاينة للتصدير في كل الأوضاع.
- **Direct Win32 GDI والسبول:** المسار النشط يرسل sRGB (JPEG افتراضياً، PNG اختيارياً مع حقن DPI) إلى `PrintDirect` (يُمنع `window.print()`/`iframe`)؛ **CMYK الحقيقي TIFF فقط**. احسب خطوة الشبكة من `cellWidth`/`cellHeight`، عطّل كاش الفلاتر أثناء تحريك المحوّل، انتظر `requestAnimationFrame` قبل الالتقاط، احفظ `backgroundColor`، وتابع حالة السبول حتى terminal قبل تحرير `SetTaskbarProgress(0)` و`setExporting(false)`.
