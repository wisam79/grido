---
name: grido-qa-security-auditor
description: دليل الجودة والأمان والاختبار وتوليد الإصدارات السحابية (QA, Security Audit, Automated Tests & Release Pipeline)
---

# 🛡️ دليل فحص الأمان واختبارات الجودة والإصدارات (QA & Security Auditor)

استخدم هذا الدليل لضمان خلو أي تعديل من الثغرات الأمنية، التحقق عبر الاختبارات التلقائية، وإطلاق الإصدارات السحابية بنجاح.

---

## 🔒 1. فحص قواعد الأمان والحماية الإلزامية (Security Guardrails)

عند كتابة أو تعديل أي كود في Go backend أو التعامل مع شبكة الملفات، تأكد من تطبيق المعايير التالية:

1. **الوقاية من Path Traversal وعبر الـ Symlinks:**
   - أي دالة تحول مسار ويب (مثل `/local-image/`) إلى مسار نظام ملفات، يجب إجبارياً استخدام `filepath.EvalSymlinks` والتحقق من النطاق:
     ```go
     resolved, err := filepath.EvalSymlinks(targetPath)
     if err != nil || !strings.HasPrefix(filepath.Clean(resolved), filepath.Clean(mediaDir)) {
         http.Error(w, "Access denied", http.StatusForbidden)
         return
     }
     ```

2. **تقييد القراءة القصوى للاستجابات (LimitReader for Unbounded IO):**
   - يُمنع استخدام `io.ReadAll(resp.Body)` مباشرة لحماية الذاكرة من هجمات Memory Exhaustion.
   - استخدم دائماً: `io.ReadAll(io.LimitReader(resp.Body, 50*1024*1024))`.

3. **الكتابة الذرية السليمة على القرص (Atomic Disk Writes & fsync):**
   - عند كتابة ملف مؤقت `.tmp` قبل نقله بـ `os.Rename`:
     - استدعِ `f.Sync()` وحفظ البيانات على القرص قبل `f.Close()`.
     - أضف `defer os.Remove(tmpPath)` لتنظيف الملفات في حال حدوث Panic.

4. **إدارة الأسرار والمفاتيح (Secrets Management):**
   - يُمنع تشفير مفاتيح API داخل الكود. يتم قراءتها كمتغيرات بيئة وحقنها بـ `-ldflags` أثناء البناء.

---

## 🧪 2. خطة الاختبار التلقائي السحابي المستمر (Continuous Cloud CI/CD Pipeline)

تطبيقاً لمعيار **الصفر إجهاد للجهاز المحلي والاعتماد الكلي على GitHub Actions** (`Pure GitHub Actions CI Invariant` — الاستثناء الوحيد: `lint` و `typecheck` مسموحان ومطلوبان محلياً قبل رفع الإصدارات):
يُمنع إجبارياً تشغيل اختبارات E2E (Playwright) أو حزم الاختبارات الثقيلة على جهاز المستخدم المحلي. بدلاً من ذلك، يُعتمد سير العمل السحابي الحصري التالي عبر GitHub CLI:

```bash
# 1. إيداع التعديلات ودفعها للفرع الرئيسي
git add -A
git commit -m "feat/fix: ..."
git push origin main

# 2. استعراض ومراقبة دورة الاختبارات السحابية الجارية فورياً
gh run list --limit 3
gh run watch <run-id> --interval 10

# 3. في حال حدوث أي فشل، استخراج سجلات الفشل الدقيقة دون تحميل كامل السجل
gh run view <run-id> --log-failed
```

تشمل دورة الـ CI السحابية المتكاملة 4 وظائف متوازية (Parallel Jobs) في `.github/workflows/ci.yml`:
1. **`validate-frontend` (Frontend Quality & Tests):** فحص الأنواع الصارم (`tsc`) + ESLint (`--max-warnings 0`) + 70 ملف اختبار وحدة بـ Vitest مع حساب التغطية وحارس انحراف عقود الـ IPC (`frontend/src/lib/wails/ipc-contract-drift.test.ts`).
2. **`validate-backend` (Backend Quality & Tests):** فحص `go vet` و `staticcheck` وحزمة اختبارات Go الكاملة.
3. **`e2e-tests` (Playwright E2E Sharding, 4 Shards):** مصفوفة تشظية رباعية تشغل 21 ملف اختبار E2E في أقل من دقيقتين بالتوازي.
4. **`windows-build` (Windows Build Verification):** تجميع التطبيق الأصلي بـ CGO وتشغيل اختبارات النواة الأصلية على نظام Windows حقيقي (`windows-latest`).

### أوامر الاختبار الموجهة وسريعة التنفيذ (Targeted Test Commands)

لتسريع دورة التطوير ومنع استنزاف الوقت بتشغيل كامل الحزمة عند كل تعديل طفيف، يجب استخدام الأوامر الموجهة بحسب المجال:

| الأمر | النطاق والمجال | الملفات المستهدفة |
| :--- | :--- | :--- |
| `npm run test:unit` | اختبارات الوحدة العامة السريعة | تشغيل بدون تقرير التغطية الثقيل |
| `npm run test:print` | محرك ومنظومة الطباعة والقص | `print-layout-math`, `use-print-layout`, `cut-lines`, `single-print`, `print-physical-parity` |
| `npm run test:canvas` | هندسة الكانفاس والتحويلات | `element-geometry`, `units`, `canvas-rendering-core`, `canvas-fit` |
| `npm run test:store` | إدارة الحالة لـ Zustand | كافة شرائح `store/slices/*` و `editor-store` |
| `npm run test:scanner` | خوارزميات الماسح الضوئي | `document-scanner`, `perspective-transform`, `benchmark` |
| `npm run test:ipc` | حارس انحراف الربطات و IPC | `ipc-contract-drift.test.ts` |
| `npm run test:components` | مكونات واجهة المستخدم | كافة ملفات `test/*.test.tsx` |
| `task test:print` | اختبار تكاملي موحد للطباعة | يشمل اختبارات Go للطباعة + اختبارات Frontend معاً |
| `task test:backend:cover` | تغطية كود Go الكاملة | توليد `coverage.out` لخدمات ومعالجات الخلفية |
| `task test:backend:race` | كشف تعارضات التزامن في Go | `go test -race ./internal/...` |

### إطار مصانع الاختبارات المشتركة (Test Factories & Clean Store Reset)

عند كتابة أي اختبار جديد للواجهة أو عناصر الكانفاس، استخدم المصانع المركزية في `frontend/test/helpers/test-factories.ts`:
- `createMockImageElement(overrides)`: توليد عنصر صورة بخصائص سليمة ومطابقة للمخطط.
- `createMockTextElement(overrides)`: توليد عنصر نص بمحاذاة وخطوط قياسية.
- `createMockShapeElement(overrides)`: توليد أشكال هندسية سليمة.
- `createMockPrintSettings(overrides)`: توليد إعدادات طباعة قياسية.
- `createMockCanvasContext(w, h)`: محاكاة 2D Context في الذاكرة لفحص بكسلات الرسم.
- `resetEditorStore()`: تفريغ وإعادة ضبط مخزن Zustand لحالته النقية في `beforeEach` لمنع تسرب البيانات بين الاختبارات.

### التحقق البكسلي والثنائي لمخرجات الطباعة فائقة الدقة (300 DPI & Pixel Verification)

عند تعديل هندسة الطباعة أو خطوط القص أو عناصر الشبكة، لا تكتفِ بفحص بصري يدوي:
1. اكتب اختبار Go (`GeneratePrintSheet`) يتحقق برمجياً من وجود بكسلات الخط المتوقع عند الإحداثيات المحسوبة (`mm × DPI / 25.4`)، مع فحص الخلفية لضمان عدم رسم أي خط خارج حدود الورقة.
2. **التحقق الثنائي لترويسة JFIF APP0:** تأكد برمجياً من سلامة ترويسة الـ JPEG بالتحقق من وجود قطعة APP0 وبايتات الكثافة (`Xdensity` و `Ydensity` عند الإزاحات 14 و 16 في مصفوفة البايتات) وأن وحدات القياس مضبوطة على `1` (Dots Per Inch) لضمان احترام الطابعات الفيزيائية لأبعاد الورقة.
3. **مطابقة الأبعاد الفيزيائية 1:1:** الحفاظ على اختبار `frontend/test/print-physical-parity.test.ts` واختبار `frontend/test/use-print-layout.test.ts` للتحقق من عدم تكبير صور الهوية وجوازات السفر (35x45mm) إلى كامل الورقة عند `fitToPage: false`.

### حارس انحراف عقود Wails v3 IPC (IPC Contract Drift Guard)

يجب الحفاظ على اختبار `frontend/src/lib/wails/ipc-contract-drift.test.ts` الذي يضمن مطابقة 100% بين كافة معرّفات الدوال الرقمية (`$Call.ByID`) المولدة في `frontend/bindings/grido/**` ومعالجات المحاكاة المسجلة في `frontend/e2e/helpers/wails-v3-bridge.ts` (خريطة `WAILS_V3_METHOD_HANDLERS` وجسر التوافق العكسي `legacyMockGo`). عند إضافة أي دالة جديدة في `App` أو الخدمات:
1. ولّد الربطات فوراً بـ `wails3 generate bindings -ts -clean=true`.
2. سجّل معالج Mock برقم المعرف الجديد في الموقعين المذكورين أعلاه حتى لا يفشل الـ E2E برسالة `Unhandled methodID`.

### مصفوفة التشظية السحابية السريعة (Playwright 4-Shard Parallel Pipeline)

لتجنب استنزاف وقت الـ CI وتشغيل مصفوفة E2E كاملة بدون أي تضحية (Zero-Compromise Fast Pipeline):
- يتم تشغيل اختبارات Playwright E2E سحابياً عبر 4 خوادم متزامنة (`matrix.shardIndex: [1, 2, 3, 4]`) باستخدام الأمر:
  ```bash
  npx playwright test --shard=${{ matrix.shard }}/${{ matrix.total-shards }}
  ```
- هذا النمط يقلص زمن تنفيذ اختبارات E2E من أكثر من 4.5 دقائق إلى **أقل من دقيقتين** بالتوازي مع تنفيذ 100% من الاختبارات.

### اختبارات النواة الأصلية على Windows (Windows Native Integration Tests)

لضمان سلامة مسارات الملفات ذات الخطوط المائلة العكسية (`C:\...`) وسلوك نظام التشغيل الحقيقي:
- يجب تشغيل اختبارات Go الحساسة للمسارات والطباعة على خادم Windows حقيقي (`windows-latest`) داخل الـ CI:
  ```powershell
  go test -v -run "TestMediaService_CrossPlatformAndWindowsPaths|TestPrintService_HiRes300DPI_A4_FullScaleVerification|TestPrintNative_.*" ./internal/service/...
  ```
- هذا يضمن خلو التطبيق من أي انزلاق بين بيئات التطوير والتشغيل الفعلي.

---

## 🚀 3. سير عمل التحديثات وإصدار التنسيقات (Release Tagging Workflow)

عند التوجيه لرفع إصدار جديد للتطبيق (`vX.Y.Z`):

1. **الفحص المسبق الصارم (Pre-flight Quality Check):** تشغيل `npm run lint` و `npm run typecheck` في مجلد `frontend`، والتأكد من عدم وجود أي خطأ أو تحذير (`0 errors, 0 warnings`) قبل الشروع في الترفيع.
2. **تحديث السكريبت المحلي:** تحديث القيمة الاحتياطية لـ `$appVersion` في `build.ps1` إلى `vX.Y.Z`.
3. **الحفظ والإيداع:** تنفيذ `git add .` ثم `git commit -m "release: vX.Y.Z - ..."`.
4. **إنشاء الوسم:** تشغيل `git tag -a vX.Y.Z -m "Release vX.Y.Z: ..."`.
5. **الدفع لبدء البناء السحابي:** تشغيل `git push origin main --tags`.
6. **النتيجة:** يقوم سيرفر GitHub Actions تلقائياً ببدء بناء النسخة وتوليد `GridoStudio-installer.exe` ونشرها في صفحة Releases على GitHub.

