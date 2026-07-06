# خطة إصلاح شاملة — Grido Studio

> **مبدأ العمل:** التركيز على إصلاح وتحسين الموجود فقط. لا إضافة ميزات جديدة.

---

## (أ) أولويات التصحيح — إصلاح الثبات

### ❏ P1.01 — إصلاح "فقد خطوات التراجع"

**الوصف:** بعض الطرق التي يتم فيها تعديل حالة الكانفس لا تُسجّل في التاريخ (Undo/Redo).

**الملفات المتأثرة:**
- `frontend/src/hooks/use-keyboard-shortcuts.ts` — تعديل عبر الأسهم لا يسجل `pushHistory` إلا عند `keyup`. إذا تم حدف العنصر أو تحميل مشروع قبل رفع المفتاح، فإن التعديل يُفقد.
- `frontend/src/components/editor/konva/konva-canvas.tsx` — Transformer يدفع `pushHistory()` على `transformEnd`، لكن `URLImage` يدفع فقط عشرة `y` — لا تاريخ.
- `frontend/src/components/editor/properties-panel.tsx` ولوحة الخصائص — التعديلات المباشرة (مثل تغيير اللون أو الحجم عبر Slider) لا تدفع `pushHistory` على الإطلاق!

**الإصلاح:**
1. إضافة `pushHistory()` في نهاية تغيير عنصر `KonvaTextElement` عبر `textChange` و `dblclick`.
2. جعل `ElementProperties` و `SlotProperties` تسجل طوالة `pushHistory` بعد انتهاء تعديل مفرد (مثلاً عند ي. ضعط Slider).
3. تغيير تتبع الأرقام ل... يتحسك في حы وɗ ... `keyup`. أو حفظ `initialState` عند `keydown` ومقارنته عند `keyup`.
4. إنشاء helper `withHistory(action)` تُستخدم لكل الطرق: `const withHistory = (fn: () => void) => { fn(); pushHistory(); };`

---

### ❏ P1.02 — استهلاك ذاكرة التراجع (History Bloat)

**الوصف:** يتم تخزين `structuredClone` كامل للـ state في كل خطوة (50 خطوة). مع صور كبيرة في elements/slots، يمكن أن تصل الذاكرة إلى 100-200MiB.

**الإصلاح:**
1. استثناء روابط الصور من `pushHistory` — معالجة موجودة جزئياً (`cacheImage`/`restoreImage`) في `editor-store.ts`. لكن هناك ثغرة: عندما يكون الحجم الكلي للـ state كبيراً.
2. تخزين Diff بدلاً من Snapshot: بدلاً من تخزين `{elements, slots}` كاملة، تخزين `{elements: action, prevState}` أو استخدام `immer` patches.
3. أو حد أصغر: تقليد الحد إلى 20 خطوة بدلاً من 50 للمشاريع الكبيرة (عندما يتجاوز عدد العناصر 50 عنصر).

---

### ❏ P1.03 — عدم تثبيت الوضوح

**الوصف:** `use-theme.ts` لا يحفظ الوضوح المحدد. عند إعادة التشغيل يعود دائماً إلى "light".

**الملفات:**
- `frontend/src/hooks/use-theme.ts` — لا يوجد `localStorage`.

**الإصلاح:**
1. قراءة `theme` من `localStorage` عند التهيئة.
2. كتابة `theme` إلى `localStorage` عند `toggleTheme`.
3. تطبيق `dark` class على `document.documentElement` بناءً على القيمة المخزنة (وليس فقط `useEffect` بعد التهيئة).

---

### ❏ P1.04 — SQLite WAL Mode

**الوصف:** `repository.InitDB()` يفتح SQLite بدون WAL، مما يزيد من احتمالية `database is locked` عند الوصول المتزامن.

**الملفات:**
- `internal/repository/db.go`

**الإصلاح:**
1. إضافة `_journal_mode=WAL` إلى connection string أو تنفيذ `db.Exec("PRAGMA journal_mode=WAL")` بعد فتح الاتصال.
2. إضافة `db.Exec("PRAGMA foreign_keys=ON")` للتأكد من التحكم في المفاتيح الأجنبية.

---

### ❏ P1.05 — عدم دقة تعب بنية الكون

**الوصف:** `use-window-controls.ts` يكتشف حالة "تكبير" عبر مقارنة حجم النافذة bScreen — ولا دقة.

**الملفات:**
- `frontend/src/hooks/use-window-controls.ts`

**الإصلاح:**
1. `main.go` يدفع `isMaximised` عبر `windowState` إلى الكَون، لكن لا يوجد `runtime.WindowIsMaximised()` الجديد يُستخدم قبل ذلك.
2. أو بدلاً من مقارنة `window.outerWidth >= window.screen.availWidth`، استخدام `WindowIsMaximised` من Wails runtime عند `onResize` callback.

---

## (ب) أولويات التحسين — لكود أنظف وأداء أعلى

### ❏ P2.01 — تحسين أمان الأنواع (Type Safety)

**الأنواع `any` الهامة:**
- `frontend/src/lib/editor-store.ts:132` — `stageRef: any`
- `frontend/src/components/editor/konva/konva-canvas.tsx:16` — `trRef = useRef<any>(null)`
- `frontend/src/components/editor/konva/konva-canvas.tsx:17` — `elementsRefs = useRef<Record<string, any>>($)`
- `frontend/src/components/editor/konva/konva-elements.tsx:66` — `elementRef: React.MutableRefObject<any>` — يمكن إستبداله بـ `React.MutableRefObject<Konva.Node>`.
- `frontend/src/print-dialog.tsx:142` — `(window as any).go.handlers.PrintHandler`

**الإصلاح:**
1. تعريف interface في `wailsjs/go/models.ts` (إذا مسموح بذلك) أو في ملف `.d.ts` معين.
2. إنشاء ملف `frontend/src/types/global.ts` يُعرّف:
   ```typescript
   import Konva from 'konva';
   interface Window {
     go?: {
       main: { App: { ... } },
       handlers: { ProjectHandler: { ... }, PrintHandler: { ... } }
     };
   }
   ```
3. استخدام `Konva.Stage` و `Konva.Transformer` و `Konva.Node` بدلاً من `any`.

---

### ❏ P2.02 — تحسين ذاكرة التصوير / PrintService

**الوصف:**في `internal/service/print_service.go`:
- `imageCache` يحذف عنصر عشوائياً عند الوصول للحد.
- `processedCache` يحذف عشوائياً.
- لا يوجد cleanup للصور المعالجة بعد الإنتهاء.

**الإصلاح:**
1. استخدام `container/list` أو map يدوي لـ LRU حقيقي.
2. أو استخدام `sync.Map` بدلاً من `map` + `sync.Mutex` لآمان أفضل في جميع الحالات.
3. تنظيف الكاش (`defer` أو `defer func`) بعد إنهاء `GeneratePrintSheet`.

---

### ❏ P2.03 — تقليل عمليات إعادة الرسم (Konva)

**الوصف:** في `konva-elements.tsx` عند تغيير filter (brightness/contrast/blur)، يتم إعادة cache كل مرة — مكلف.

**الإصلاح:**
1. عزل تغييرات الـ filter children من حركة عنصر.
2. استخدام `useMemo` أو `React.memo` لمنع إعادة render عندما لا يتغير element.
3. التأكد من أن `elementRef.current.cache()` يتم فقط عند تغيير `image` وليس عند كل `filter` change.

---

### ❏ P2.04 — تحسين Auto-save

**الوصف:** يتم تسلسل الـ state كاملًا إلى JSON كل ثانيتين حتى لو لم يتغير شيء جوهري.

**الملفات:**
- `frontend/src/App.tsx` (useEffect للـ autosave)

**الإصلاح:**
1. حساب hash (أو مقارنة JSON.stringify أسرع) للـ currentState vs lastSaved.
2. أو استخدام `isDirty` flag يُضبط عند أي `set()` ثقة في استدعاء:
   ```typescript
   isDirtyRef.current = true; // عند أي pushHistory أو set
   useEffect(() => {
     if (!isDirtyRef.current) return;
     const timer = setTimeout(() => { SaveAutoSave(); isDirtyRef.current = false; }, 2000);
     return () => clearTimeout(timer);
   }, [/* listen to relevant deps */]);
   ```

---

## (ج) تكبير التجربة — لمسات سطح المكتب

### ❏ P3.01 — مفتاح Escape لإلغاء التحديد وإغلاق Dialog

**الملفات:**
- `frontend/src/App.tsx` — أضف مستمع مفتاح `Escape` ينفّذ:
  1. إذا كان Dialog مفتوح (`isDialogOpen`), أغلقه.
  2. وإلاً، `selectElement(null)` لإلغاء تحديد العنصر.

---

### ❏ P3.02 — اختصارات Ctrl+O (فتح) و Ctrl+N (جديد)

**الملفات:**
- `frontend/src/hooks/use-keyboard-shortcuts.ts`

**الإصلاح:**
```typescript
// Ctrl+O = فتح ملف مشروع
if ((e.ctrlKey || e.metaKey) && e.key === "o") {
  e.preventDefault();
  document.getElementById('load-project-input')?.click();
}
// Ctrl+N = مسح الكانفس
if ((e.ctrlKey || e.metaKey) && e.key === "n") {
  e.preventDefault();
  // confirm clear canvas
}
```

---

## (د) الاختبارات — ضمان الجودة

### ❏ P4.01 — اختبارات وحدات لـ Store و Snap و Export

**الأهداف:**
1. **`editor-store.test.ts:`**
   - تنفيذ `undo()` بعد `addImageElement` يجب أن يُرجع `elements.length` إلى 0.
   - `redo()` بعد `undo()` يجب أن يُعيد العنصر.
   - `loadProject` يجب أن تستعيد القالب والعناصر.
   - `cacheImage` يجب أن يقلّل الذاكرة كرةً عن وجه.

2. **`snap-utils.test.ts:`**
   - التحقق من أن `getSnapPositions` يُلحق "v" و "h" guides.
   - التحقق من أن عنصراً قريباً من الحافة يُلتفّت إلى `x=0`.
   - التحقق من أن snap handle يعمل في حالة التمدد (resize).

3. **`export-utils.test.ts:`**
   - `exportCanvas` يُرجع `Blob` válido عند format="png".
   - `exportCanvas` يُرجع `Blob` válido عند format="jpg" و quality 50%.

---

## (هـ) المعايير المهنية — تحسينات عامة

### ❏ P5.01 — إزالة جميع `console.error` و `console.warn` غير الضرورية

**الملفات:** `editor-canvas.tsx`, `export-utils.ts`, `print-dialog.tsx`، إلخ.

**الإصلاح:**
- إحلال `console.error` بـ `slog.Error` أو تجاهلهم في Production.
- إضافة `if (process.env.NODE_ENV === "development")` حول `console.log`.

---

### ❏ P5.02 — توحيد آلية حفظ الحالة المتسقة

**الملفات:**
- `app.go` — `SaveAutoSave` و `LoadAutoSave`
- `window_state.go` — `loadWindowState` و `saveWindowState`
- `frontend/src/App.tsx` — useEffect للـ autosave

**المشكلة:** `saveWindowState` يكتب JSON مباشرة `window.json` دون معالجة أخطاء، و `SaveAutoSave` يكتب `autosave.json`.

**الإصلاح:**
- إضافة معالجة أخطاء تامة (retry مع exponential backoff).
- التأكد من أن `LoadAutoSave` يتحقق من ذلك أن `BLOB` شكل وBLOB... فقط خطوات الواجدإصلاح لل qar qalzal قسم.

---

## (و) خارطة الطريق التنفيذية

| **المرحلة** | **المهام** | **المدة** |
|:---|:---|:---|
| **الأسبوع 1** | P1.01 (Undo ثبات), P1.03 (الوضوح), P1.04 (WAL), P1.05 (Maximize) | 3 أيام |
| **الأسبوع 2** | P2.01 (Type Safety), P2.04 (Auto-save ذكي), P3.01 (Escape), P3.02 (Ctrl+O/N) | 3 أيام |
| **الأسبوع 3** | P2.02 (Print Cache), P2.03 (Konva Rerenders), P5.01 (Console cleanup) | 3 أيام |
| **الأسبوع 4** | P1.02 (History memory), P4.01 (Tests), P5.02 (Error handling) | 3 أيام |

---

## الأدوات التالية

- **Type checking:** `npm run typecheck` — تشغيل قبل بناء كل مرحلة.
- **Linting:** `npm run lint` — للتأكد من أمان الأنواع.
- **Tests:** `npm test` — لكل تعديل في Store أو Snap.
- **Build:** `wails build` — للتأكد من أن التعديلات لا تكسر التجميع.
