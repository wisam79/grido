# خطة إصلاح محاكي Wails v3 في اختبارات E2E (المهمة Q-02)

**تاريخ التشخيص:** 18 سبتمبر 2026 | **الحالة:** مفتوحة — جاهزة للتنفيذ | **المرجع:** `docs/development-plan/TASKS.md` (Q-02، Q-03)

---

## 1) المشكلة (مُشخَّصة بأدلة)

بعد إصلاح تعارض منفذ Vite (`playwright.config.ts`: 5173 ↔ 9245) صارت حزمة E2E **قابلة للتشغيل** لأول مرة:
`Running 31 tests using 1 worker`. لكن **كل** الاختبارات تفشل على التوكيد الأول:

```
Locator: getByText('Grido Studio | استوديو الهوية')  →  element(s) not found
```

**السبب الجذري (مؤكد بلقطة صفحة Playwright):** التطبيق يعرض **شاشة قفل الترخيص**:
```
heading [level=1]: Grido Studio | تفعيل الترخيص
heading [level=1]: النسخة مقفلة
paragraph: انتهت الفترة التجريبية. يرجى إدخال مفتاح التفعيل للمتابعة.
```

ولماذا؟ لأن `frontend/e2e/helpers/wails-mock.ts:166-177` يحاكي **نمط Wails v2**:

```ts
Object.defineProperty(window, 'go',       { value: mockGo, ... });       // v2 فقط
Object.defineProperty(window, 'runtime',  { value: mockRuntime, ... });  // v2 فقط
```

بينما ربطات المشروع الحالية **v3** تمر عبر `@wailsio/runtime`:
- `frontend/bindings/grido/app.ts:6` → `import { Call as $Call } from "@wailsio/runtime"`
- `frontend/bindings/grido/app.ts:19` → `$Call.ByID(3084559015, ...)`

فلا يقرأ `window.go` ولا `window.runtime` ⇒ **كل نداء خلفي يفشل** ⇒ `checkLicenseStatus` يفشل ⇒ `user = null` ⇒ شاشة القفل، وعدم وجود `Grido Studio | استوديو الهوية` في الرأس (المكوّن داخل `App.tsx:331` وهو `sr-only` ويظهر فقط في واجهة المحرر).

**دليل إضافي:** في بيئة المتصفح يطبع زمن تشغيل v3 تحذيره الخاص ويفشل النقل فعلياً:
```
⚠️ Browser Environment Detected — Only UI previews are available in the browser.
Wails SetClipboardText failed: [TypeError: fetch failed] ... ECONNREFUSED
```
أي أن النقل الحقيقي في v3 هو طلب شبكي/WML وليس `window.go`.

---

## 2) الحل المقترح (خياران مرتبان بالتوصية)

### الخيار A (موصى به) — محاكي نمط v3 على مستوى حزمة زمن التشغيل
1. أنشئ `frontend/e2e/mocks/wails-runtime-mock.ts` يُصدِّر `Call` مزيّفاً:
   - يحتفظ بخريطة `id → handler` مبنية على **معرّفات الاستدعاء الحقيقية** المستخرجة من
     `frontend/bindings/grido/**` (مثال: `ApplyMaskRaw = 3084559015`).
   - يمكن توليد الخريطة آلياً بسكربت `frontend/scripts/extract-call-ids.mjs` (regex على
     `\$Call\.ByID\((\d+)\)` داخل ملفات الربطات + أسماء الدوال المجاورة).
2. بإضافة علم بناء/تطوير `VITE_E2E=1` أضف alias في `frontend/vite.config.ts`:
   `'@wailsio/runtime' → './e2e/mocks/wails-runtime-mock.ts'` — يُستخدم في تشغيل Playwright فقط
   (عبر `webServer.env`) ولا يمسّ نسخة الإنتاج إطلاقاً.
3. أبقِ `setupWailsMock(page)` لتغطية `window.runtime`/الأحداث (أو انقله تدريجياً إلى المحاكي الجديد).
4. بدّل التوكيدات القديمة بأهداف مستقرة: `page.getByTestId('workspace-canvas-shell')` و
   `#canvas-area` بدل نص الرأس، لأن نص الرأس أصبح `sr-only` (`App.tsx:331`).

### الخيار B — عزل المسارات الخلفية في وضع E2E
عند `VITE_E2E=1`، استبدل وحدة `wailsjs/go/**` بـ alias إلى `e2e/mocks/wails-go-mock.ts` يُعيد
القيم الجاهزة مباشرة (بدون محاكاة النقل). أسرع تنفيذاً، لكنه يختبر الواجهة فقط ولا يلمس مسار
الربطات الحقيقي.

---

## 3) معايير القبول (تُحدِّث Q-02/Q-03)
- `npx playwright test --project=chromium` = **كل الاختبارات خضراء** (31 اختباراً حالياً).
- `npx playwright test --project=firefox` أخضر (أو موثَّق كدوري غير حاجب مع سبب).
- **إزالة `continue-on-error: true`** من مهمة `e2e-tests` في `.github/workflows/ci.yml:123`
  ليعود الحاجب فعّالاً (فشل E2E يمنع الدمج).
- لا يُرسل أي تعديل إلى محاكي الإنتاج: التأكد أن alias المحاكي محصور بعلم `VITE_E2E`.

## 4) أوامر التحقق
```powershell
cd C:\projects\grido\frontend
npx playwright test --project=chromium          # متوقع: 31 passed
npx playwright test --project=firefox
npm run build                                    # متوقع: نجاح دون أثر للمحاكي
```

## 5) ملاحظات تنفيذية
- المحاكي الحالي `wails-mock.ts` يحتوي أصلاً جميع الدوال المطلوبة كقيم إرجاع جاهزة — يمكن
  إعادة استخدام `mockGo` كمصدر للـ handlers داخل الخيار A (تحويل المفاتيح إلى معرّفات رقمية).
- لا تلمس `frontend/wailsjs/**` (جسور يدوية مُتتبَّعة) ولا `frontend/bindings/**` (مولَّدة، مُستثناة من Git).
- TASK الدائم: `frontend/e2e/helpers/wails-mock.ts` هو ملف **محاكي اختبار** وليس كود إنتاج.
