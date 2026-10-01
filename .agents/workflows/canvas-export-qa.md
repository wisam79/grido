# خطة وإجراءات فحص محرك الرسم وجودة التصدير (Canvas & Export QA Workflow)

> **الهدف:** توفير مسار فحص واختبار دوري للتحقق من دقة ومطابقة تصدير الطباعة فائق الدقة (300+ DPI)، وكاش الفلاتر، وتفادي وميض الكانفاس.

---

## 1. فحص كاش الفلاتر بنسبة التصدير (High-DPI Filter Cache Check)
عند استخدام `captureStageDataUrl` في `frontend/src/lib/canvas/konva-export-utils.ts`:
- التحقق من حصر العناصر المفلترة والمحفوظة في الكاش (`node.isCached()`).
- إعادة بناء الكاش بالنسبة المستهدفة للتصدير `pixelRatio: Math.max(1, targetPixelRatio)`.
- استعادة كاش الشاشة العادي فوراً داخل كتلة `finally`.

---

## 2. فحص قيد خطوط القص والنزيف بحدود الورقة (Cut Lines Bounds Check)
- التأكد من قيد إحداثيات خطوط القص بـ `Math.min(paperHeight, ...)` و `Math.min(paperWidth, ...)`.
- مطابقة رسم خطوط القص وشبكات المعاينة في `PrintDialog` لهندسة التصدير الفعلية 1:1.

---

## 3. فحص ثبات الـ pixelRatio أثناء التكبير والسحب (Canvas Stability Check)
- التأكد من ثبات `pixelRatio` الخاص بـ Konva Stage عند أي حدث `zoom` أو `pan`.
- التحقق من تطبيق التحجيم الأسي الناعم `Math.exp(-e.deltaY * factor)` وتجميع الهدف محلياً لتجنب التقطيع (Stuttering).

---

## 4. فحص فلتر التمدد الشكلي للنصوص المتصلة (Morphological Stroke Check)
- التأكد من استدعاء `ensureTextStrokeFilter` للنصوص التي تمتلك حدوداً (Stroke).
- التحقق من استخدام فلتر `feMorphology` عبر القناة المجمعة `SourceAlpha` لمنع المثلثات والنتوءات الحادة بين الحروف المتصلة.

---

## 5. فحص طبقة السحب الرسمية (Official Drag-Layer Check)
- التأكد من رفع العناصر النشطة والمحوّل لشارة الأبعاد إلى طبقة السحب المخصصة (`liftToDragLayer`).
- التأكد من إسقاط العقدة وإعادتها لطبقتها الأصلية (`dropFromDragLayer`) مع استعادة `{parent, zIndex}` قبل كتابة أي إحداثيات للـ store.
