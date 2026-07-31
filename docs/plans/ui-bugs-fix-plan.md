# خطة إصلاح أخطاء الواجهة الشاملة — Grido Studio

**تاريخ الإعداد:** 31 يوليو 2026 (مساءً) | **موعد التنفيذ المخطط:** صباح الغد
**مصدر الأخطاء:** تدقيق آلي شامل بثلاثة وكلاء متوازيين (Konva/Kanvas) + (لوحات/حوارات) + (hooks/store/app-shell)، ثم **تحقق يدوي شخصي** من كل بند حرج ضد الكود قبل توثيقه هنا.
**الحالة:** جاهزة للتنفيذ — كل بند فيه موضعه الدقيق وكيفية إصلاحه.

---

## 0. تعليمات الجلسة التنفيذية (اقرأها أولاً)

1. اقرأ `.agents/AGENTS.md` (قواعد إلزامية) و`docs/features-tracker.md` (ما أُنجز سابقاً) قبل أي تعديل.
2. **تغييرات دنيا مركزة** — كل بند يُصلَّح بأقل كود، بأسلوب المشروع وتعليقاته العربية.
3. **لا تلمس الاختبارات إلا لكسر واجهة** (وعندها حدّث المحاكاة فقط حسب AGENTS.md #31).
4. بعد كل دفعة إصلاحات: `npm run typecheck && npm run test` من مجلد `frontend`.
5. في النهاية شغّل بروتوكول التحقق الكامل (القسم 6) ثم حدّث `docs/features-tracker.md` و`CHANGELOG.md`.

### قرارات سابقة يُمنع نقضها
- `getSnapPositions` **ليست** كوداً ميتاً (تستخدمها الاختبارات).
- حصص AI: `5/15/50` مكررة عمداً في 3 مواضع متزامنة: `ai_service.go` + `use-ai-enhance.ts` + migration `20260730000000`.
- ملفات `frontend/wailsjs/` مولّدة (gitignored) — لا تعدّلها يدوياً.
- محظورات صفحة الهبوط: `/api/download`، `/api/version`، `public/_redirects`، `netlify.toml`، `public/callback/`، `dir="rtl"`، `sample-passport.png`.
- مغناطيس التحجيم في `editor-transformer.tsx boundBoxFunc` يستخدم «المعايرة الذاتية» (E-5) — لا تغيّر فلسفتها عند إصلاح `dragBoundFunc` (البند P0-1 له منهج مختلف: تحويل صريح للإحداثيات).

### ما أُصلح في جلسة التدقيق نفسها (موجود في شجرة العمل — للعلم)
- E-6 (تصدير يدوي كامل)، E-7 (زاوية تدرج + مساطر px)، حذف أصول ميتة، توحيد README/CHANGELOG، إعادة تصميم صفحة الهبوط كاملة، **إصلاح حرج: `ModuleFactory not set`** (مزامنة wasm مع tasks-vision v0.10.35 + `forVisionTasks(base, true)`)، `updateElement` يتخطى الرقعات الفارغة (أداء)، مزامنة خلفية النص لحظياً أثناء السحب (أحداث Konva)، تسخين كاش الصورة قبل تبديلها بعد العزل.

---

## 1. الأولوية P0 — حرجة ومؤكدة (نفّذها بالترتيب)

### P0-1) فوضى إحداثيات `dragBoundFunc` — الأخطر
**الملف:** `frontend/src/hooks/use-konva-drag.ts:60-96`
**المؤكد:** Konva يمرر لـ `dragBoundFunc` إحداثيات **مطلقة** (بعد scale الـ Stage) ويغذّي القيمة المعادة في `setAbsolutePosition`. المسرح معرّف بـ `scaleX={displayW / canvasWidth}` و`scaleY={displayH / canvasHeight}` (`konva-canvas.tsx:205-209`) ≈ 0.2–0.6 ولا يكون 1 أبداً.
**الأعراض:**
- مع `snapToGrid`: `Math.round(xAbs / gridSize) * gridSize` يقرّب إحداثيات *شاشية* على شبكة *منطقية* → العنصر يقفز بخطوات `gridSize/scale` عملاقة (تأرجح مرئي).
- حدود السحب `Math.max(-canvasWidth*0.25, min(canvasWidth*1.25 - elW, xAbs))` مكتوبة ببكسلات منطقية على قيمة شاشية → الالتصاؤ الأيسر/العلوي شبه معطّل ويمكن إخراج العنصر كلياً خارج الكانفس؛ وحلقة القص في `konva-single-layer.tsx:55-62` تخفيه فيصبح **غير قابل للاسترداد بالفأرة**.
- مرجعية صحيحة موجودة داخل المشروع: `collage-image.tsx:139-164` يحوّل عبر `node.getAbsolutePosition()` وقسمة على `stageScale` — **انسخ نفس النمط**.
**الإصلاح:** في بداية `dragBoundFunc` حوّل `pos` إلى الفضاء المنطقي (اقسم على `stageScale = canvasWidth / displayW` — مرّر `stageScale` كوسيط أو احسبه من `node.getStage().scaleX()`)، نفّذ كل الـ snap/clamp في الفضاء المنطقي، ثم أعد التحويل للمطلق قبل الإرجاع. مسح المرشدات عند انتهاء drag كما هو.
**التحقق:** فعّل snap-to-grid بشبكة 50px، اسحب عنصراً على zoom ~30% و~200% — لا قفزات، يلتصق بدقة، ولا يمكن إخراجه خلف 25% من حواف الكانفس. راجع سلوك المرشدات بصرياً قبل/بعد.

### P0-2) قفل التطبيق لنفسه عند أي خطأ شبكة (ترخيص)
**الملفات:** `frontend/src/App.tsx:95-113`، `frontend/src/lib/store/slices/license-slice.ts:74-85`
**المؤكد:** `checkLicenseStatus` في فرع `catch` ينفذ `set({ user: null })`؛ والاستدعاءات تحدث: عند الإقلاع (سطر 95)، وكل 5 دقائق (سطر 108). أي انقطاع لحظي (WiFi رمشة) يصفّر المستخدم → `App.tsx` يعرض شاشة القفل ويخفي المحرر بالكامل.
**الإصلاح:** في `license-slice.ts:80-84` — **لا تصفّر المستخدم عند فشل الشبكة**: اجعل `catch` يبقي `user` الحالي (offline grace) ويصفّر `licenseLoading` فقط، مع `console.error`. التصفير يحدث فقط عند ردّ خادم صريح بأن الترخيص غير صالح (إن وُجد كود حالة كهذا في `LicenseHandler`).
**التحقق:** فعّل وضع الطيران بعد الإقلاع وانتظر 10 دقائق — المحرر يبقى مفتوحاً.

### P0-3) أنيميشن الدخول يدمّر `flipY`
**الملفات:** `image-node.tsx:62-63`، `text-node.tsx:58-59`، `shape-node.tsx:65-66`
**المؤكد:** `node.to({ ..., scaleX: element.flipX ? -1 : 1, scaleY: 1 })` — يعيد flipX لكن **يجبر scaleY=1**. عنصر `flipY:true` في مشروع محمّل يظهر منعكساً خاطئاً ومزاحاً رأسياً (مرسوم من (y+height)·H بـ scaleY -1) حتى أول تفاعل.
**الإصلاح:** `scaleY: element.flipY === true ? -1 : 1` في المواضع الثلاثة.
**التحقق:** اعكس نصاً عمودياً، احفظ المشروع، أعد فتحه — يظهر صحيحاً فوراً.

### P0-4) السحب الجماعي يحرك العناصر المقفلة
**الملف:** `frontend/src/hooks/use-konva-drag.ts:98-166` و`168-208`
**المؤكد:** `onDragMove` يحرك كل `selectedIds` بلا فحص `locked` (يقارن فقط بالعنصر القائد)؛ و`onDragEnd` يكتب `{x,y}` للجميع بلا فلترة. حماية `draggable={!element.locked}` تمنع القائد فقط.
**الإصلاح:** في `onDragStart` استبعد معرفات المقفلة من `dragStartPositionsRef`؛ وفي `onDragEnd` رشّح `selectedIds.filter(id => !elements.find(e => e.id===id)?.locked)` قبل بناء الرقعات (قراءة من `useEditorStore.getState()`).
**التحقق:** اقفل صورة، حددها مع نص، اسحب — المقفلة لا تتحرك وundo متسق.

### P0-5) Delete/Backspace يحذف المقفل بلا سؤال
**الملفات:** `frontend/src/hooks/use-keyboard-shortcuts.ts:23-31` وأيضاً قائمة السياق `context-menu.tsx` (مسار delete)
**المؤكد:** لا فحص `locked` قبل `removeElement(s)`؛ بينما الأسهم (نفس الملف) تفحص `!el.locked`. أيضاً: useHotkeys لا يتجاهل أزرار UI المركّزة — الضغط على Backspace بعد النقر على زر في شريط الأدوات العائم (target=BUTTON) يحذف التحديد.
**الإصلاح:** رشّح المقفلة من القائمة قبل الحذف في المكانين؛ إن بقي شيء مُحذوف نفّذه وبإشعار. أضف `ignoreEventWhen` (أو ما يكافئه في v5 من react-hotkeys-hook) يتجاهل `closest('button,[role="menu"],[role="menuitem"]')`.
**التحقق:** اقفل عنصراً، Delete — يبقى. انقر زر شريط ثم Backspace — لا يحذف شيئاً.

### P0-6) النقر المزدوج يحرر العناصر المقفلة
**الملف:** `frontend/src/components/editor/editor-canvas.tsx` (دالة `handleDoubleClick`)
**المؤكد:** لا فحص `el.locked` قبل فتح تحرير النص (`setEditingTextId`) أو استبدال صورة. السحب والـ transformer يحترمان القفل — التقدير مكسور.
**الإصلاح:** `if (el.locked) return;` في أول `handleDoubleClick` (ونفسه لمسار استبدال الصورة).
**التحقق:** اقفل نصاً، نقرة مزدوجة — لا تُفتح نافذة التحرير.

### P0-7) بذرة التاريخ بعناصر غير مفلترة في `loadProject`
**الملف:** `frontend/src/lib/store/slices/core-slice.ts:289-301`
**المؤكد:** `elements` الحية = `validElements` (سطر 262-269) بينما `history[0]` = `(project.elements || [])` الخام (سطر 290). تراجع واحد بعد أول تعديل يعيد العنصر التالف (NaN width) للكانفس → يُقصّ بصمت في طبقة الرسم ويُحفظ تلقائياً في المسودة إلى الأبد.
**الإصلاح:** استبدل السطر 290 بـ `elements: validElements`.
**التحقق:** مشروع فيه عنصر واحد تالف يدوياً (عدّل JSON) → افتحه، عدّل شيئاً، Ctrl+Z — لا يظهر العنصر التالف.

### P0-8) حقول X/Y تُطلق NaN وتنقل العنصر للأصل
**الملف:** `frontend/src/components/editor/properties/element-properties.tsx:207,217`
**المؤكد:** `Number("")`=0 (نقل للزاوية صامتاً) و`Number("-")`=NaN (كسر إحداثيات العنصر: hit-testing/تصدير). بخلاف W/H اللذين فيهما `Math.max(0.05, ...)`.
**الإصلاح:** `const v = Number(e.target.value); if (Number.isFinite(v)) onUpdate(element.id, { x: Math.max(-1, Math.min(2, v/100)) })` (ونفسه للـ y).
**التحقق:** امسح حقل X ثم اكتب "-" — لا نقل ولا NaN في الـ store.

### P0-9) Alt عالق → الغاء المغناطيس بصمت
**الملف:** `frontend/src/components/editor/konva/konva-canvas.tsx:127-140`
**المؤكد:** `altPressedRef` يُضبط بـ keydown/keyup فقط؛ مع Alt+Tab يُسرق الـ keyup → يبقى `true` → كل السحوبات اللاحقة بلا مغناطيس (`use-konva-drag.ts:61,99`) بلا أي إشعار.
**الإصلاح:** أضف reset عند `window blur` و`visibilitychange` في نفس الـ effect (أو الأفضل: اقرأ `e.evt.altKey` لحظياً في معالجات السحب بدل المرجع الملتصق).
**التحقق:** Alt+Tab أثناء جلستك ثم اسحب — المغناطيس يعمل.

### P0-10) Ctrl+wheel فوق خانة يكبّر الكانفس والصورة معاً
**الملف:** `frontend/src/components/editor/konva/konva-canvas.tsx:65-72` (`handleSlotWheel`)
**المؤكد:** لا فحص modifier → مع Ctrl (إيماءة تكبير الكانفس) يحدث تكبيران في نفس الحدث + `pushHistory` إضافية.
**الإصلاح:** `if (e.evt.ctrlKey || e.evt.metaKey) return;` في أول `handleSlotWheel`.
**التحقق:** حدد خانة فيها صورة، Ctrl+عجلة — يتكبّر الكانفس فقط.

### P0-11) عدّاد حصة AI يتكسر عند منتصف الليل المحلي (UTC+X)
**الملفات:** `frontend/src/hooks/use-ai-enhance.ts` (موضعا حساب اليوم) و`license-slice.ts:60` (طابع السجل)
**المؤكد:** `logAiUsage` يختم بـ `toLocaleString("sv-SE")` (محلي) بينما `getTodayUsageCount` يقارن بـ `new Date().toISOString().split("T")[0]` (UTC). في UTC+3: 00:00–03:00 محلي = أحداث «الغد» لا تُحتسب → تجاوز الحصة، و«يتجدد غداً» فعلياً 03:00.
**الإصلاح:** وحّد الثلاثة على مفتاح يوم محلي واحد: `new Date().toLocaleDateString("sv-SE")` في كل من `getTodayUsageCount` وحساب «المتبقي اليوم» في `use-ai-enhance.ts` (يبقى عرض المتبقي = limit - count دون تغيير). **لا تغيّر 5/15/50** (قرار موثق).
**التحقق:** اضبط ساعة النظام 00:30 (UTC+3) — عدّاد اليوم يبدأ صفراً فعلياً.

### P0-12) ازدواجية «مشغول» في `use-bg-removal` — مثيلان، عامل واحد
**الملف:** `frontend/src/hooks/use-bg-removal.ts`
**المؤكد:** `workerInstance`/`nextRequestId` على مستوى الوحدة لكن `isBusyRef` لكل مثيل Hook. `canvas-quick-bar` و`image-properties`/`slot-properties` مركّبان معاً للعنصر نفسه؛ ضغط الزر من المثيل الثاني يعيد كتابة `worker.onmessage` فيضيع نتيجة الأول (مؤشر معلق للأبد)، وإلغاؤه يقتل عملية الثاني (`terminate` مشترك).
**الإصلاح:** انقل حالة الانشغال والطلب النشط لمستوى الوحدة: `let busyRequestId = 0` مشترك؛ `handleRemoveBg` يقارنه قبل البدء (يتساوى مع تغيير صفر)، و`onmessage` يوزع النتيجة لمالك الـ requestId المسجّل. تلميح: خزّن `{ requestId, resolve }` قيد التشغيل في خريطة واحدة على مستوى الوحدة بدل تكليف `onmessage` لكل مكالمة.
**التحقق:** ابدأ العزل من الشريط السريع، وقبل النهاية جرّب نفس الفعل من اللوحة الجانبية — الثاني يرفض برسالة «عملية جارية»، الأول يكمل.

---

## 2. الأولوية P1 — عالية/متوسطة

| # | البند | الملف:الموضع | الإصلاح المقصود |
|---|---|---|---|
| P1-1 | حساب DPI للطباعة يتبع `stage.width()` | `print-dialog.tsx:234-236` | **تحقق أولاً بالتشغيل** (اطبع A4 على zoom مختلف وقارن أبعاد الصورة الناتجة): إن ثبت التبعية للعرض، اجعل النسبة `canvasWidth / stage.attrs.scaleX / docLogicalWidth` من قيم معروفة في الـ store بدل `stage.width()` |
| P1-2 | iframe الطباعة يُزال بعد 1s → صفحة فارغة | `print-dialog.tsx:291-353` | انقل الإزالة لحدث `afterprint` على `iframe.contentWindow` + مهلة أمان 60 ثانية فقط |
| P1-3 | `isFullPage` يصفر الهوامش، وزر «بدون هوامش» يعيد لـ 5mm ثابتة | `use-print-layout.ts:36-37` + `print-dialog.tsx:447` | خزّن آخر هامش غير صفري في `useState` واستعده عند الإطفاء؛ الصفر التلقائي فقط عندما doc≈paper **ولم** يضبط المستخدم هامشاً يدوياً |
| P1-4 | `repeatMode row/column` يحسب الفجوة مرتين ولا سقف 48 | `use-print-layout.ts:70-82` | `cols = floor((availW + gapMM) / cellW)` (ونفسه للصفوف)؛ قصّ العدد الناتج عند سقف حوار 48 |
| P1-5 | خطوط القص غير متطابقة بين المعاينة والتصدير | `print-dialog.tsx` (buildCollageItems/buildSingleItems) + `print-preview.tsx:169-195` | وحّد نقطة الأصل المركزية في دالة واحدة تُستخدم في الثلاثة (collage export + single export + preview) |
| P1-6 | التقاط المعاينة يسبق القفل/يطلق state بعده | `print-dialog.tsx:95-139` | علم `cancelled` داخل قفل `setTimeout` ينهي المهمة بصمت؛ صفّر `previewImageSrc` متزامناً عند القفل بدل `queueMicrotask` |
| P1-7 | Enter داخل عناصر النموذج يشغّل الطباعة | `print-dialog.tsx:86-89` | أول المعالج: تجاهل إن كان `e.target.closest('input,select,textarea,button,[role=combobox]')` |
| P1-8 | فشل استبدال الصورة بلعتام | `slot-properties.tsx:94-98` و`image-properties.tsx:384-388` (crop onerror) | `toast.error("فشل تغيير الصورة")`؛ وفي onerror القص: لا `onUpdate` (+ لا history) لكن أظهر خطأ للمستخدم |
| P1-9 | حذف قائمة السياق الجماعي بلا فلتر `locked` | `context-menu.tsx` (مسار removeElements) | `selectedIds.filter(locked)` قبل `removeElements` (تكرار P0-5 في الواجهة الأخرى) |
| P1-10 | اختبار إسقاط الكولاج يتجاهل `collageMargin/gap` | `editor-canvas.tsx:425-537` (`handleDrop`) | حوّل لإحداثيات منطقية واطبق نفس قانون الطبقة: `relX = (clientX-rect.left-marginPx)/availWPx` — نفس حساب `konva-collage-layer.tsx:70-76` |
| P1-11 | زحزحة قص الخانة معكوسة مع flip/دوران | `collage-image.tsx:139-164` | دوّر متجه الدلتا بـ `-rotation` واعكس المحاور للقلب قبل تحويلها لإزاحات القص (استخدم معكوس التحويل المطلق للعقدة) |
| P1-12 | مؤشر المساطر يموت بعد تبديلها (refs منفصلة) | `editor-canvas.tsx:318-360` + `canvas-rulers.tsx` | لا تعتّم المراجع المعشوشة: أعد `getElementById` داخل الـ rAF أو امسح الـ ref عند تغير `showRuler` |
| P1-13 | استبدال صورة خانة يبقي القص القديم (زاوية مثبتة) | `collage-slice.ts:191-208` (`setSlotImage`) | صفّر `dragX/dragY/zoom` (ابقِ flip/rotation) عند اختلاف نسبة الأبعاد |
| P1-14 | النزيف يُرسم إطاراً أبيض بدل تمديد أطراف التصميم | `lib/export/export-image.ts` (`applyBleedAndCropMarks`) | مدّد محتوى الصورة للنزيف بمرآة الحواف (drawImage مكررة من أشرطة الحافة) قبل علامات القص؛ علامات القص خارج حافة القص حصراً داخل النزيف |
| P1-15 | تقدير حجم JPG/PNG خادع التفاؤل | `export-dialog.tsx:213-215` | ارفع معامل JPG لـ ~0.35 وPNG لـ ~0.6 مع لصاقة «تقدير تقريبي» أو أخفِ الرقم |
| P1-16 | تعارض سياسة بوابة AI بين الشريط واللوحة | `canvas-quick-bar.tsx` + `use-ai-enhance.ts:124` + `image-properties.tsx:236` | **قرار مطلوب منك أولاً:** جعل `handleEnhance` يفحص `isLicenseActive()` كما في bg-removal؟ (المجاني عنده 5/يوم خادمياً — ربما مقصود). طبّق شارة PRO في الشريط السريع مطابقة للوحة |
| P1-17 | لوحة الخصائص مع تعدد التحديد تبثّ لكل العناصر | `element-properties.tsx:34-52` (+ properties-panel fan-out) | عند `selectedIds.length > 1`: اعرض اللوحة للعنصر الأخير فقط واملأ `onUpdate` ليستهدفه وحده، أو اجعل البثّ لمفاتيح أسلوبية حصراً (وليس x/y/locked) |
| P1-18 | محاذاة العناصر تعمل على عنصر واحد مع تعدد التحديد | `toolbar-items.tsx:232-249` (`alignElement`) | عند تعدد: طبّق المحاذاة على `selectedIds` نسبة لحدود التحديد (أو للكانفس بثبات) |
| P1-19 | (تحقق يدوي) عناصر الوضع الحر لا تظهر في تصدير الكولاج | `export-image.ts` حلقة الكولاج | **خطوة تحقق:** ارسم نصاً في وضع single ثم صدّر من وضع الكولاج — إن غاب النص: القرار التصميمي «الوضعان منفصلان» أصلاً، وثّقه فقط، لا «إصلاح» |

---

## 3. الأولوية P2 — دنيا (أجّلها بعد P0/P1 إن ضاق الوقت)

1. `editor-transformer.tsx:181-184` — حد الأدنى بـ `&&` يسمح بانهيار محور واحد لعنصر شبه خفي: استبدلها بـ `||` وحد أدنى ~8px منطقية على المحور المُحجَّم.
2. `konva-single-layer.tsx:116-182` — كتابة `flipX` من إشارة scale عند عبور المرسى فوق بعضه لعنصر مقلوب أصلاً: تجريب XOR فقط عند العبور الحقيقي (موثقة SPECULATIVE — أثبتها يدوياً أولاً).
3. `text-editing-overlay.tsx:44-58` — padding/border 2px تزيح التحرير عن العرض الدقيق: صفّر padding واستبدل الحد بـ `box-shadow`.
4. `text-editing-overlay.tsx:76-79` — **Escape يفقد المكتوب بصمت**: التزم نفس منطق onBlur (commit) ثم أغلق.
5. `magic-ai-scanner.tsx:57` — إطار واحد من إزاحة البداية للعناصر المقلوبة: مزامنة موضع المجموعة من العقدة الهدف متزامناً عند التركيب.
6. `konva-collage-layer.tsx:103-106` — لمس: خانة فارغة لا تفتح ملف بالنقر المزدوج (أضف `onDblTap`)، و`onTouchEnd` يبدل التحديد بعد تمرير (قيّده بحركة دنيا).
7. `refine-bg-dialog.tsx:47-98,358` — Space عالق بعد القفل (reset في cleanup)، وفرشاة الاسترجاع pattern-stroke تُعتّم المفاصل (ارسم بـ stamping بدل stroke).
8. `crop-dialog.tsx:70-82` — مساحة صفرية: إفشل صامت → `toast.error("حدد منطقة قص صالحة")`؛ وتحقق `template.width` px من نوع القالب (سطر 37).
9. `context-menu.tsx:132-140` — `menuSize` قد يبقى قديماً: صفّره عند الإغلاق أو مفتّحه بـ target.id.
10. `use-window-controls.ts:11-16` — كشف التكبير استدلالي: استخدم `WindowIsMaximised()` من runtime Wails إن كان متاحاً في bindings.
11. `account-license-modal.tsx:75-81` — تبويبة أولية قديمة بعد دخول خلفي: استمدّها عند الفتح (`useEffect` على `accountModalOpen`).
12. `use-async-image.ts:107-110` — LRU قد يُخرج صورة معروضة حالياً: ثبّت (pin) `imageSrc` الحالية للعناصر وقت الإخراج.
13. `update-notifier.tsx:50-65,36-45` — عطل شبكة وسط التنزيل = قفل حوار بلا إلغاء: زر إلغاء + watchdog؛ سجّل `EventsOn` قبل `CheckForUpdate` واستخدم دوال إلغاء الاشتراك المعادة.
14. عنصر جديد: **عناصر الوضع الحر تُرسل قبل/بعد تبديل قالب الكولاج بدون تأكيد** (من تقرير الحوارات — `setCollageTemplate` يسقط الصور الزائدة ويعيد تعيين التاريخ): حوّلها P1 إن مسّت بيانات المستخدم — **وجوب**: حوار تأكيد عند إسقاط صور موجودة.
15. `canvas-dimensions-panel.tsx:100-112` — DPI من حقول جزئية وبدون سقف mm: اقطف عند 2000mm، واحسب من قيم الـ store لا من الحقول.

---

## 4. بنود أبلغ عنها الوكلاء وهي **كاذبة الإنذار** — لا تُصلحها
- تجميع حلقات `useEffect`/تداخل observers عامة (متحقق منها سابقاً).
- `onChange` في PopoverColorPicker بدون حراسة (محمي بفحص الإغلاق).
- `Steps 4` في print-preview: مطابقة للتصميم المرجعي (ليس خطأ).
- [AUDIT] الخلاصة: باقي المزاعم غير الموثقة أعلاه إما متكررة أو موسومة SPECULATIVE بدون دليل كود.

---

## 5. ترتيب التنفيذ المقترح صباحاً (≈4–6 ساعات)

1. **الحزمة أ (حركات الكانفس):** P0-1 (dragBoundFunc) ثم P0-9 (Alt) ثم P0-10 (Ctrl+wheel) → نفس الملفات واختبار بصري فوري. ⏱ ~60 د.
2. **الحزمة ب (القفل):** P0-4 + P0-5 + P0-6 + P1-9 (فلترة موحدة في مساعد `canInteract(el)` في `element-slice.ts` أو `lib/permissions.ts`). ⏱ ~45 د.
3. **الحزمة ج (الواجهة/الحالة):** P0-2 (ترخيص)، P0-3 (flipY)، P0-7 (تاريخ)، P0-8 (X/Y)، P0-12 (bg-removal)، P0-11 (تاريخ الحصص). ⏱ ~75 د.
4. **الحزمة د (طباعة/تصدير):** P1-1→P1-8 + P1-14 + P1-15. ⏱ ~90 د.
5. **الحزمة هـ (البقية P1):** P1-10→P1-18 + قرار P1-16. ⏱ ~60 د.
6. **تحقق كامل + توثيق** (القسم 6). ⏱ ~45 د.

---

## 6. بروتوكول التحقق النهائي (إلزامي)

```powershell
cd C:\projects\grido
go test -race ./internal/... ; go vet ./...
cd frontend
npm run test      # يجب 117/117 أو أكثر (لا إضافة اختبارات إلا لكسر واجهة)
npm run typecheck
npm run lint      # 0 أخطاء
npm run build
cd ..\admin-web
npm run build; npm run lint
```

**فحوص يدوية إلزامية بعد الحزم:**
- سحب مع snap-to-grid على zoom 30% و200% (P0-1, P0-9, P0-10).
- قفل + سحب جماعي + Delete + double-click (P0-4..6).
- مشروع بعنصر flipY → حفظ → إعادة فتح (P0-3).
- طباعة 3× معاينة: A4 تزامن فيها cut lines بين preview وتصدير (P1-1,5,2,3).
- ترخيص: وضع طيران 10 دقائق → لا قفل (P0-2).
- عزل خلفية من الشريط واللوحة بالتزامن (P0-12).
- عدّاد AI عند 00:30 محلي UTC+3 (P0-11).

ثم حدّث `docs/features-tracker.md` (أضف «جلسة إصلاح الواجهة 🅒» بالبنود) و`CHANGELOG.md` تحت `[Unreleased]`.
