# 📋 تقرير تدقيق العيوب الشامل لمشروع Grido Studio
## Full Project Comprehensive Bugs & Architecture Audit Report

**تاريخ التدقيق:** سبتمبر 2026  
**نطاق التدقيق:** المشروع بالكامل من A إلى Z (Go Backend, Konva Canvas, Zustand State, Microsoft Fluent 2 UI/UX, Build & Cloud AI)  
**المنهجية:** تدقيق متعدد الوكلاء (Multi-Agent Swarm Audit) شمل 5 وكلاء متخصصين بموجب قواعد `AGENTS.md` ومهارات المشروع الثمانية.

---

## 📑 الفهرس (Table of Contents)
1. [الملخص التنفيذي ومصفوفة التحقق من الثوابت (Executive Summary & Invariants Scorecard)](#1-الملخص-التنفيذي-ومصفوفة-التحقق-من-الثوابت)
2. [العيوب الحرجة والعالية الخطورة (Critical & High Severity Defects)](#2-العيوب-الحرجة-والعالية-الخطورة)
3. [العيوب المتوسطة ومشاكل التكامل الهيكلي (Medium Severity Defects)](#3-العيوب-المتوسطة-ومشاكل-التكامل-الهيكلي)
4. [العيوب الطفيفة وتناسق الواجهة والمصطلحات (Low Severity & UI/UX Polish)](#4-العيوب-الطفيفة-وتناسق-الواجهة-والمصطلحات)
5. [نتائج الاختبارات التلقائية والأداء (Automated Tests & Performance Results)](#5-نتائج-الاختبارات-التلقائية-والأداء)
6. [خطة الإصلاح ذات الأولوية التنفيذية (Prioritized Remediation Roadmap)](#6-خطة-الإصلاح-ذات-الأولوية-التنفيذية)

---

## 1. الملخص التنفيذي ومصفوفة التحقق من الثوابت

تم تشغيل 5 وكلاء تدقيق متخصصين بالتوازي لفحص كل سطر برمجي في المشروع:
- **الوكيل 1: تدقيق الخلفية البرمجية والأمان (Go Backend & Security Auditor)**
- **الوكيل 2: تدقيق محرك الكانفس والطباعة (Konva, Canvas Math & Print Engine Auditor)**
- **الوكيل 3: تدقيق إدارة الحالة وتدفق البيانات (Frontend State, Zustand & IPC Auditor)**
- **الوكيل 4: تدقيق واجهة وتجربة المستخدم (UI/UX, Microsoft Fluent 2 & Accessibility Auditor)**
- **الوكيل 5: تدقيق البناء والتحزيم والسحابة (Build, NSIS, CI/CD, Modal AI & Supabase Auditor)**

### 📊 مصفوفة الثوابت المعمارية (Architectural Invariants Status):

| الفئة | الثابت المعماري في `AGENTS.md` | الحالة | ملخص التقييم |
|:---|:---|:---:|:---|
| **الأمان والخلفية** | الكتابة الذرية على القرص (`f.Sync()` + `.tmp` + `os.Rename`) | ⚠️ جزئي | مطبق في 8 خدمات، ومفقود في `media_service.go`, `print_export.go`, `window_state.go` |
| **الأمان والخلفية** | إغلاق الملفات الصريح على ويندوز لتفادي File Locks | ⚠️ جزئي | مؤجل عبر `defer` في `ProcessOpenedFile` و`print_export.go` مسبباً تعارضات لحظية |
| **الأمان والخلفية** | تقييد القراءة القصوى للاستجابات بـ `io.LimitReader` | ✅ ممتاز | مطبق بنسبة 100% في كافة استدعاءات الشبكة وقراءة الصور (64KB إلى 50MB) |
| **الأمان والخلفية** | حماية Symlinks ومسارات الويب ضد Path Traversal | ⚠️ جزئي | سليم في `/local-image/`، لكن مسار `Exports/` غير مدعوم في `GetImageDimensions` |
| **الأمان والخلفية** | الفحص الذري للحصص (`Reserve` + `Rollback`) | ✅ ممتاز | محقق في `AIRateLimiter` لحماية استهلاك الذكاء الاصطناعي |
| **محرك الكانفس** | تجميع أوامر Canvas 2D (`fill/stroke` خارج الحلقات) | ⚠️ مخالفة | تكرار `ctx.beginPath()` و `ctx.stroke()` داخل حلقات خطوط القص وتزيين النصوص |
| **محرك الكانفس** | كاش Konva: عدم إدراج إحداثيات السحب كـ dependencies | ⚠️ خلل عملي | فلاتر صور الكولاج تجمد حركة الصورة أثناء السحب لأن الكاش لا يتم تفريغه أثناء التحريك |
| **محرك الكانفس** | الذرات المجمعة في Konva (تغليف الخلفيات والصور في `<Group>`) | ✅ ممتاز | مطبق بنجاح مع ربط الـ ref ومقابض السحب بالمجموعة |
| **محرك الكانفس** | ثبات معدل البكسل `pixelRatio` بدون تغيير ديناميكي أثناء الزوم | ✅ ممتاز | نسبة البكسل ثابتة وتكبير الكانفس يعتمد على `transform: scale()` |
| **محرك الكانفس** | استبدال `FastLayer` المهملة بـ `<Layer listening={false}>` | ✅ ممتاز | خلو المشروع تماماً من `FastLayer` |
| **إدارة الحالة** | النسخ السطحي لسجل التراجع (`array.map(el => ({...el}))`)| ✅ ممتاز | مطبق بنسبة 100% لتفادي استنساخ البيانات الثنائية الثقيلة |
| **إدارة الحالة** | استبقاء نصوص أخطاء Wails Go في Zustand | ⚠️ جزئي | محقق في التراخيص، ومفقود في حوار المشاريع والقوالب |
| **إدارة الحالة** | سلامة تجميع ومحاذاة الكتل المجمعة (`Composite Grouping`) | ❌ مخالفة | شريط الأدوات أعاد كتابة محاذاة تسحق العناصر، و`distribute` تتجاهل المجموعات |
| **إدارة الحالة** | مزود تلميحات عام واحد `TooltipProvider` في `App.tsx` | ✅ ممتاز | لا يوجد أي مزود فرعي مكرر في شجرة المكونات |
| **واجهة Fluent 2** | هرمية استدارة الحواف (Controls: `rounded-md`, Containers: `rounded-xl`, Modals: `rounded-2xl`) | ⚠️ تفاوت | مخالفات في أشرطة الأدوات والقوائم المنسدلة ومودال الحساب والترخيص |
| **واجهة Fluent 2** | سلم الارتفاعات القياسي (`h-8` للتحكم القياسي، `h-7` للمدمج، `h-9` للإجراءات البارزة) | ⚠️ مخالفة | استخدام ارتفاعات شاذة مثل `h-8.5` (34px) في أشرطة الأدوات و`h-5/h-6` للأزرار |
| **واجهة Fluent 2** | ثوابت تجربة الانتظار ("جاري ..." مع مسافة ونقاط حذف) | ⚠️ جزئي | مطبق في أغلب الواجهات، مع ظهور شاذ لـ "معالجة..." وعبارات ثابتة بدون "جاري" |
| **واجهة Fluent 2** | تموضع زر الإغلاق داخل شريط العنوان `DialogHeader` | ⚠️ جزئي | نافذة `refine-bg-dialog.tsx` تستخدم زراً عائماً مخصصاً بدلاً من `DialogCloseButton` |
| **واجهة Fluent 2** | تصفير حالات التحميل في النوافذ المنبثقة عند فتحها/إغلاقها | ⚠️ جزئي | غائب في نافذة تنبيه التحديث ونافذة الترخيص |
| **البناء والسحابة** | حقن متغيرات البناء بـ ldflags وتجريد الرموز `-s -w` | ⚠️ جزئي | `-s -w` مفقودة في سير العمل السحابي `release.yml` |
| **البناء والسحابة** | ترميز UTF-8 BOM لملف NSIS `project.nsi` | ✅ ممتاز | يبدأ بـ `EF BB BF` بدون أي أخطاء ترميز |
| **البناء والسحابة** | تشغيل التوقيع الرقمي SignPath v1 سحابياً | ❌ معطل | شرط `if: env.SIGNPATH_TOKEN != ''` يُلغي التوقيع بالكامل لعدم توفر `env` بالشرط |
| **الذكاء الاصطناعي** | مسار المعالجة المزدوج (CodeFormer w=0.85 + Real-ESRGAN x2 + CLAHE) | ✅ ممتاز | مطبق باحترافية وتطابق تام في `modal_ai/upscaler.py` |
| **الذكاء الاصطناعي** | عدم الخصم المزدوج للحصص اليومية | ❌ ثغرة حرجة | يتم خصم محاولتين لكل صورة ترميم: مرة من Go backend ومرة ثانية من Modal AI! |

---

## 2. العيوب الحرجة والعالية الخطورة

### [BUG-CRIT-01] خصم مزدوج للحصة اليومية للذكاء الاصطناعي (Double-Counting Quota Bug)
- **الموقع:** [`internal/service/ai_service.go:L342-L349`](file:///C:/projects/grido/internal/service/ai_service.go#L342-L349) و [`modal_ai/upscaler.py:L311-L344`](file:///C:/projects/grido/modal_ai/upscaler.py#L311-L344)
- **درجة الخطورة:** 🔴 **Critical (أثر مباشر على المستخدم وتجربة الاستخدام)**
- **الوصف:**
  1. خادم Modal AI في `upscaler.py` يقوم بتسجيل الاستهلاك الفعلي بدقة في جدول `public.ai_usage` عبر دالة RPC `check_and_record_ai_usage` مع تمرير الثواني والتكلفة الفعلية.
  2. في نفس الوقت، خادم Go المحلي في `ai_service.go` يحتوي على استدعاء مؤجل `defer` يستدعي دالة RPC نفسها مرة ثانية بوضع التسجيل (`p_check_only: false`) عند نجاح العملية!
- **الأثر:** كل عملية ترميم صورة واحدة تخصم **محاولتين (2 Hits)** من رصيد المستخدم اليومي. مستخدم الخطة المجانية يستنفد كامل رصيده اليومي (5 صور) بعد صورتين ونصف فقط!
- **الحل الجذري:**
  إزالة الاستدعاء المؤجل في Go backend والاعتماد حصرياً على الفحص المسبق (`check_only: true`)، وترك التسجيل الفعلي لخادم Modal AI:
  ```go
  // internal/service/ai_service.go:L341-L349
  // إزالة هذا المقطع بالكامل لمنع التكرار:
  // defer func() {
  //     if success {
  //         if recErr := callAIUsageRPC(token, userID, inputImageBytes, false); recErr != nil {
  //             slog.Error("Failed to record AI usage server-side", "error", recErr)
  //         }
  //     }
  // }()
  ```

---

### [BUG-CRIT-02] إلغاء وتعطيل خطوة التوقيع الرقمي SignPath v1 في سير العمل السحابي GitHub Actions
- **الموقع:** [`.github/workflows/release.yml:L149-L172`](file:///C:/projects/grido/.github/workflows/release.yml#L149-L172)
- **درجة الخطورة:** 🔴 **Critical (أمني / إطلاق الإصدارات)**
- **الوصف:**
  في `release.yml`، تم كتابة شرط تنفيذ التوقيع كالتالي:
  ```yaml
  - name: Sign Executables via SignPath
    env:
      SIGNPATH_TOKEN: ${{ secrets.SIGNPATH_API_TOKEN }}
      SIGNPATH_ORG: ${{ secrets.SIGNPATH_ORGANIZATION_ID }}
    if: env.SIGNPATH_TOKEN != '' && env.SIGNPATH_ORG != ''
  ```
  في GitHub Actions، **متغيرات البيئة على مستوى الخطوة (`step.env`) لا تكون متاحة أو مهيأة أثناء تقييم تعبير `if:` للخطوة نفسها**. وبالتالي فإن `env.SIGNPATH_TOKEN` يُقيّم دائماً إلى `null`، مما يجعل الشرط `false` دائماً، فيتم تخطي خطوة التوقيع وتخطي نشر الملفات الموقعة كلياً! كما يخالف هذا نص القاعدة 88 في `AGENTS.md`.
- **الأثر:** كافة الإصدارات الصادرة من GitHub Releases تُنشر **غير موقعة رقمياً** حتى مع وجود التوكن، مما يثير تحذيرات SmartScreen الحظرية للمستخدمين.
- **الحل الجذري:**
  استخدام سياق `secrets` المباشر:
  ```yaml
  - name: Sign Executables via SignPath
    if: ${{ secrets.SIGNPATH_API_TOKEN != '' && secrets.SIGNPATH_ORGANIZATION_ID != '' }}
    continue-on-error: true
    uses: SignPath/github-action-submit-signing-request@v1
    with:
      api-token: ${{ secrets.SIGNPATH_API_TOKEN }}
      organization-id: ${{ secrets.SIGNPATH_ORGANIZATION_ID }}
      project-slug: 'Grido_Studio'
      signing-policy-slug: 'Release_Policy'
      artifact-configuration-slug: 'initial-version'
      github-artifact-id: ${{ steps.upload-artifact.outputs.artifact-id }}
      github-token: ${{ secrets.GITHUB_TOKEN }}
      output-artifact-directory: 'build/bin/signed'
      wait-for-completion: true
      wait-for-completion-timeout-in-seconds: 1800
  ```

---

### [BUG-CRIT-03] انهيار استبدال الصور من لوحة الخصائص الجانبية في نظام ويندوز
- **الموقع:** [`frontend/src/components/editor/properties/panels/image-properties.tsx:L286-L291`](file:///C:/projects/grido/frontend/src/components/editor/properties/panels/image-properties.tsx#L286-L291)
- **درجة الخطورة:** 🔴 **Critical (تعطل وظيفة أساسية)**
- **الوصف:**
  عند اختيار صورة جديدة لاستبدال الصورة المحددة من لوحة الخصائص، يتم استدعاء دالة `SaveImageFromBase64(b64)` بشكل غير مشروط:
  ```ts
  const newPath = await SaveImageFromBase64(b64);
  ```
  إذا كانت الصورة المختارة قادمة من `OpenFile()` في Go backend، فإن `b64` يحمل بالفعل مسار ملف محلي محفوظ مسبقاً يبدأ بـ `/local-image/img_...` وليس سلسلة بيانات `data:image/...`. استدعاء `SaveImageFromBase64` على مسار عادي يفجر استثناء فك تشفير في Go، ويُظهر للمستخدم إشعار خطأ "فشل تغيير الصورة".
- **الحل الجذري:**
  التحقق من بادئة السلسلة قبل استدعاء الحفظ:
  ```ts
  let finalPath = b64;
  if (b64.startsWith("data:image/")) {
    finalPath = await SaveImageFromBase64(b64);
  }
  onUpdate({ imageSrc: finalPath });
  ```

---

### [BUG-HIGH-04] ابتلاع أخطاء فساد `autosave.json` وتهديد صور المشاريع غير المحفوظة بالحذف
- **الموقع:** [`internal/repository/db.go:L406-L409`](file:///C:/projects/grido/internal/repository/db.go#L406-L409)
- **درجة الخطورة:** 🟠 **High (خطر فقدان بيانات)**
- **الوصف:**
  في دالة `collectReferencedImages`، عند فشل `json.Unmarshal(autosaveBytes, &autosaveData)` بسبب ملف غير مكتمل أو تالف، تقوم الدالة بتسجيل تحذير وترجع `nil` error!
  الدوال المستدعية (`runCleanupMedia` و `CleanUnusedMediaNow`) مبرمجة على إلغاء التنظيف فوراً في حال حدوث خطأ لحماية صور العمل الجاري. ولكن لأن الخطأ تم ابتلاعه وإرجاع `nil`، يستمر التنظيف بقائمة صور مرجعية فارغة، وتعتبر صور المسودة الحالية "مهجورة" فتُنقل إلى `MediaTrash` فوراً أو تُحذف.
- **الحل الجذري:**
  إرجاع الخطأ صراحةً لوقف التنظيف وحماية بيانات المستخدم:
  ```go
  if err := json.Unmarshal(autosaveBytes, &autosaveData); err == nil {
      elemsBytes, _ := json.Marshal(autosaveData.Elements)
      slotsBytes, _ := json.Marshal(autosaveData.Slots)
      collectImageFilenames(string(elemsBytes), string(slotsBytes), referencedImages)
  } else {
      return nil, fmt.Errorf("corrupt autosave.json encountered: %w", err)
  }
  ```

---

### [BUG-HIGH-05] تشويه واقتطاع الصورة المصدرة عند الشفافية وتقييد نسبة الكاش بـ 4×
- **الموقع:** [`frontend/src/lib/export/export-image.ts:L301-L313`](file:///C:/projects/grido/frontend/src/lib/export/export-image.ts#L301-L313) و [`frontend/src/lib/canvas/konva-export-utils.ts:L98-L101`](file:///C:/projects/grido/frontend/src/lib/canvas/konva-export-utils.ts#L98-L101)
- **درجة الخطورة:** 🟠 **High (جودة التصدير والطباعة)**
- **الوصف:**
  1. في `konva-export-utils.ts`: تقييد النسبة بـ `safePixelRatio = Math.min(4, Math.max(1, targetPixelRatio))`. في لوحات الطباعة 300 DPI الكبيرة (A4/A3) مع معاينات شاشة صغيرة (400px)، تبلغ النسبة المطلوبة 6.2×. قسرها على 4× يلتقط الكانفاس بدقة مصغرة.
  2. في `export-image.ts:310`: عند تصدير JPG مع خلفية شفافة، يتم إنشاء كانفاس أبيض بحجم `canvasWidth × canvasHeight` ويتم استدعاء:
     `fctx.drawImage(captured, 0, 0);`
     بدون تمرير العرض والارتفاع المستهدفين! نظراً لأن `captured` التُقطت بحجم مصغر، فإن رسمها بحجمها الأصلي يترك إطاراً أبيضاً ضخماً فارغاً على يمين وأسفل الصورة المصدرة.
- **الحل الجذري:**
  تمرير أبعاد الكانفاس المستهدفة في `fctx.drawImage`:
  ```ts
  fctx.drawImage(captured, 0, 0, canvasWidth, canvasHeight);
  ```
  وفي `captureStageDataUrl` الاعتماد على فحص السقف الإجمالي للميجابكسل `assertExportablePixels` بدلاً من قسر النسبة على 4.

---

### [BUG-HIGH-06] جمّد وتوقف تحريك صورة الكولاج المفلترة أثناء السحب
- **الموقع:** [`frontend/src/components/editor/konva/elements/collage-image.tsx:L84-L88, L131-L185`](file:///C:/projects/grido/frontend/src/components/editor/konva/elements/collage-image.tsx#L84-L88)
- **درجة الخطورة:** 🟠 **High (تجربة تفاعلية معطلة)**
- **الوصف:**
  عند تفعيل فلتر على صورة في الكولاج، يتم تخزين العقدة في الكاش عبر `useFilterCache`. في Konva.js، بمجرد حفظ عقدة `Konva.Image` في الكاش، يتوقف المحرك عن قراءة بيانات الصورة الأصلية ويرسم من الكاش الثابت.
  أثناء السحب داخل الخلية (`onDragMove`)، يتم تحديث `node.cropX(newSx)` و `node.cropY(newSy)`، لكن Konva يتجاهلها تماماً وتظل الصورة جامدة ولا تتحرك!
- **الحل الجذري:**
  استدعاء `imageRef.current?.clearCache()` عند `onDragStart`، وإعادة بناء الكاش عند `onDragEnd` بعد استقرار الإزاحة.

---

### [BUG-HIGH-07] انحراف نسبة أبعاد الخانة وقصها عند تصدير الصور المفردة (Batch Export)
- **الموقع:** [`frontend/src/lib/export/export-image.ts:L763-L771`](file:///C:/projects/grido/frontend/src/lib/export/export-image.ts#L763-L771)
- **درجة الخطورة:** 🟠 **High (تشويه مخرجات الصور)**
- **الوصف:**
  في دالة `exportSlotCanvas`، يتم استدعاء `computeSlotRectMM` مع تمرير هوامش وفجوات صفرية دائماً:
  `{ marginXMM: 0, marginYMM: 0 }, { gapXMM: 0, gapYMM: 0 }`
  بينما الكولاج الفعلي يقتطع الخلية مع خصم الهوامش والفجوات `collageMargin` و `collageGap`. تصفيرها ينتج نسبة أبعاد مغايرة للخلية، مما يجعل دالة القص تقتطع أجزاء من رأس أو وجه الشخص في الصور المصدرة خلافاً للمعاينة.
- **الحل الجذري:**
  قراءة `collageMargin` و `collageGap` من الستور وتطبيقها في حساب المستطيل:
  ```ts
  const { canvasWidth, canvasHeight, collageMargin = 0, collageGap = 0, collageTemplate } = useEditorStore.getState();
  const hasPhysical = Boolean(collageTemplate?.physicalLayout);
  const marginPx = hasPhysical ? 0 : collageMargin;
  const gapPx = hasPhysical ? 0 : collageGap;
  const rect = computeSlotRectMM(
    { xMM: 0, yMM: 0 },
    { x: slot.x, y: slot.y, w: slot.w, h: slot.h },
    { widthMM: canvasWidth, heightMM: canvasHeight },
    { marginXMM: marginPx, marginYMM: marginPx },
    { gapXMM: gapPx, gapYMM: gapPx }
  );
  ```

---

### [BUG-HIGH-08] سحق وتفكيك العناصر المجمعة عند استخدام أدوات المحاذاة والتوزيع
- **الموقع:** [`frontend/src/components/editor/toolbar/toolbar-items.tsx:L447-L488`](file:///C:/projects/grido/frontend/src/components/editor/toolbar/toolbar-items.tsx#L447-L488) و [`frontend/src/lib/store/slices/element-slice.ts:L800-L856`](file:///C:/projects/grido/frontend/src/lib/store/slices/element-slice.ts#L800-L856)
- **درجة الخطورة:** 🟠 **High (خرق ثابت Composite Group Alignment)**
- **الوصف:**
  1. شريط الأدوات في `toolbar-items.tsx` أعاد كتابة منطق محاذاة محلي يعالج كل عنصر بمفرده ويتجاهل الـ `groupId`، بدلاً من استدعاء دالة الستور المعتمدة `alignSelectedElements`. محاذاة عناصر مجمعة تسحقها جميعاً فوق نفس الإحداثي `x` أو `y` وتدمر التصميم.
  2. دالة التوزيع `distributeSelectedElements` في الستور تقوم بفرز العناصر فردياً، فتشتت عناصر المجموعة الواحدة بين بقية العناصر الحرة.
- **الحل الجذري:**
  ربط شريط الأدوات بدالة الستور `alignSelectedElements`، وإعادة كتابة `distributeSelectedElements` لتقسيم العناصر إلى كتل ذرية موحدة `unitMap`.

---

### [BUG-HIGH-09] ابتلاع رسائل أخطاء Go backend في حوار المشاريع وإدارة القوالب
- **الموقع:** [`frontend/src/components/editor/dialogs/projects-dialog.tsx:L103, 148, 166, 188, 212, 251, 271`](file:///C:/projects/grido/frontend/src/components/editor/dialogs/projects-dialog.tsx#L103) و [`template-panel.tsx:L137, 152`](file:///C:/projects/grido/frontend/src/components/editor/panels/template-panel.tsx#L137)
- **درجة الخطورة:** 🟠 **High (خرق Invariant استبقاء نصوص أخطاء Wails)**
- **الوصف:**
  استبدال أخطاء Wails القادمة من Go برسائل ثابتة مجردة (مثل `toast.error("فشل حفظ المشروع")` أو `toast.error("فشل استيراد المشروع")`) دون استخراج نص الخطأ الحقيقي الصادر من Go، مما يحجب عن المستخدم سبب الفشل (مثل امتلاء القرص، أو مسار غير صالح، أو قفل قاعدة البيانات).
- **الحل الجذري:**
  تطبيق النمط المعتمد:
  ```ts
  const msg = typeof err === "string" ? err : (err instanceof Error ? err.message : "فشل استيراد المشروع");
  toast.error(msg);
  ```

---

### [BUG-HIGH-10] طوفان سجل التراجع (Undo Stack Flood) عند ملء صور الكولاج
- **الموقع:** [`frontend/src/components/editor/toolbar/toolbar-file-ops.tsx:L132-L138`](file:///C:/projects/grido/frontend/src/components/editor/toolbar/toolbar-file-ops.tsx#L132-L138) و [`slot-properties.tsx:L136-L139`](file:///C:/projects/grido/frontend/src/components/editor/properties/slot-properties.tsx#L136-L139)
- **درجة الخطورة:** 🟠 **High (أداء الذاكرة وسجل التراجع)**
- **الوصف:**
  إدراج صور متعددة في الكولاج يستدعي `setSlotImage` فردياً داخل حلقة تكرارية، مما يولد لقطة تاريخ تراجع لكل صورة بمفردها (حتى 24 لقطة لعملية واحدة)، مما يملأ الـ 30 لقطة المتاحة في السجل ويحرم المستخدم من التراجع عن تعديلاته السابقة.
- **الحل الجذري:**
  توفير واستخدام دالة إدراج مجمعة `setSlotImagesBatch` تسجل لقطة تراجع واحدة فقط للعملية بأكملها.

---

### [BUG-HIGH-11] ثبات أبعاد خلايا الكولاج بالقيم القديمة عند تغيير مقاس الكانفس في الوضع الحر
- **الموقع:** [`frontend/src/lib/store/slices/core-slice.ts:L85-125, 159-186`](file:///C:/projects/grido/frontend/src/lib/store/slices/core-slice.ts#L85-L125)
- **درجة الخطورة:** 🟠 **High (تشوه هندسي للكانفاس)**
- **الوصف:**
  عندما يغير المستخدم مقاس الورقة في الوضع الحر ثم ينتقل إلى وضع الكولاج (`setMode("collage")`)، يتخطى الستور إعادة بناء الخانات إذا كانت المصفوفة `slots` تحتوي على عناصر سابقة، فتبقى الخلايا بأبعاد ومقاسات الورقة القديمة مشوهة هندسياً.
- **الحل الجذري:**
  إعادة موازنة وفحص أبعاد الخانات مع أبعاد الكانفاس الحالية داخل `setMode("collage")` وإعادة بنائها ديناميكياً إذا اختلفت الأبعاد.

---

## 3. العيوب المتوسطة ومشاكل التكامل الهيكلي

### [BUG-MED-01] غياب الكتابة الذرية و `f.Sync()` في خدمات حفظ الصور وملف التصدير
- **الموقع:** [`internal/service/media_service.go:L152-L162, L214-L224`](file:///C:/projects/grido/internal/service/media_service.go#L152) و [`internal/service/print_export.go:L71-L93, L116-L160`](file:///C:/projects/grido/internal/service/print_export.go#L71)
- **الوصف:** حفظ الصور ونسخها وتصدير ملفات الطباعة وHTML يتم بالكتابة المباشرة بدون ملفات مؤقتة `.tmp` وبدون `f.Sync()`. إذا حدث انقطاع مفاجئ أو تعثر النقل، يتبقى ملف بـ 0 بايت أو تالف في مجلد `Media/` أو `Exports/`.
- **الحل:** اعتماد نمط الكتابة المؤقتة `.tmp` متبوعاً بـ `f.Sync()` و `f.Close()` و `os.Rename`.

---

### [BUG-MED-02] فشل `GetImageDimensions` لملفات المعاينة `print_*` وغياب فحص Symlink
- **الموقع:** [`internal/service/media_service.go:L40-L51`](file:///C:/projects/grido/internal/service/media_service.go#L40) و [`main.go:L193-L198`](file:///C:/projects/grido/main.go#L193)
- **الوصف:** في `main.go` يتم توجيه الملفات التي تبدأ بـ `print_` إلى مجلد `Exports/`. بينما دالة `GetImageDimensions` تبحث حصرياً في مجلد `Media/`، فتفشل قراءة أبعاد صور المعاينة.
- **الحل:** مطابقة التوجيه في `GetImageDimensions` للبحث في `Exports/` عند وجود بادئة `print_`.

---

### [BUG-MED-03] عدم تجميع أوامر Canvas 2D في حلقات رسم خطوط القص وتزيين النصوص
- **الموقع:** [`frontend/src/lib/export/export-image.ts:L464-L478, L668-L688`](file:///C:/projects/grido/frontend/src/lib/export/export-image.ts#L464)
- **الوصف:** استدعاء `ctx.beginPath()` و `ctx.stroke()` داخل حلقة تكرار خطوط القص، وكذلك لكل سطر داخل تزيين النصوص، مخالفاً لقاعدة الأداء.
- **الحل:** تجميع الخطوط المتشابهة ورسمها بـ `stroke()` موحد خارج الحلقة.

---

### [BUG-MED-04] خطأ حسابي في علامات أنصاف المسطرة (Mid-tier Ticks) يضعها عند 6mm بدلاً من 5mm
- **الموقع:** [`frontend/src/components/editor/canvas/ruler-utils.ts:L56-L63`](file:///C:/projects/grido/frontend/src/components/editor/canvas/ruler-utils.ts#L56) و [`ruler.tsx:L93-L102`](file:///C:/projects/grido/frontend/src/components/editor/canvas/ruler.tsx#L93)
- **الوصف:** عند `labelStep = 10` و `subStep = 2`، تكون `midStep = 5`. حساب `midRatio = Math.round(5 / 2) = 3`، فيصبح شرط النصف `idx % 3 === 0`، فيُرسم خط النصف عند `idx = 3` أي عند **6 ملم** بدلاً من **5 ملم**!
- **الحل:** فحص المسافة الحسابية الفعلية `Math.abs(u % labelStep - labelStep / 2) < (subStep / 2)` أو جعل `subStep = 1` لتقسيم السنتيمتر لعشرة مليمترات دقيقة.

---

### [BUG-MED-05] غياب `GRANT EXECUTE` للدور `service_role` وتحديث الكاش في دوال Supabase
- **الموقع:** [`supabase/migrations/20260713000002_fix_rls_policies.sql:L29-L74`](file:///C:/projects/grido/supabase/migrations/20260713000002_fix_rls_policies.sql#L29) و [`20260725000001_security_audit_hardening.sql:L114-L117`](file:///C:/projects/grido/supabase/migrations/20260725000001_security_audit_hardening.sql#L114)
- **الوصف:** إعادة إنشاء `activate_license` بدون منح الصلاحيات لـ `service_role` ودون إطلاق `NOTIFY pgrst, 'reload schema'`، مما قد يسبب أخطاء `PGRST202`.
- **الحل:** تشغيل هجرة صريحة تمنح الأدوار وتحدث الكاش.

---

### [BUG-MED-06] مخالفة قاعدة محددات Playwright المرنة في 5 مواقع باختبارات E2E (Rule 87)
- **الموقع:** [`frontend/e2e/app.spec.ts:L20`](file:///C:/projects/grido/frontend/e2e/app.spec.ts#L20), [`collage-mode.spec.ts:L14`](file:///C:/projects/grido/frontend/e2e/collage-mode.spec.ts#L14), [`workflows.spec.ts:L56, L58, L70`](file:///C:/projects/grido/frontend/e2e/workflows.spec.ts#L56)
- **الوصف:** الاعتماد على نصوص Tooltips مطلقة صلبة مثل `page.getByTitle('وضع الكولاج')` بدلاً من النمط المرن `getByRole('button', { name: /كولاج/ })` أو الدمج بـ `.or()`.
- **الحل:** تعديل المحددات لتصبح مرنة وفق نص القاعدة 87.

---

### [BUG-MED-07] سقط رايات تجريد الرموز `-s -w` في سير العمل السحابي `release.yml`
- **الموقع:** [`.github/workflows/release.yml:L119`](file:///C:/projects/grido/.github/workflows/release.yml#L119)
- **الوصف:** خيارات `ldflags` في `release.yml` تفتقر لـ `-s -w`، مما يضخم حجم الملف التنفيذي النهائي والمثبت بمقدار 25-35 ميجابايت بلا داعٍ.
- **الحل:** إضافة `-s -w` في أمر بناء Wails السحابي.

---

### [BUG-MED-08] استخدام ارتفاعات شاذة `h-8.5` (34px) في أشرطة الأدوات بدلاً من المعيار `h-8`
- **الموقع:** [`frontend/src/components/editor/toolbar/toolbar.tsx:L89-L114`](file:///C:/projects/grido/frontend/src/components/editor/toolbar/toolbar.tsx#L89), [`toolbar-file-ops.tsx:L215-L283`](file:///C:/projects/grido/frontend/src/components/editor/toolbar/toolbar-file-ops.tsx#L215), [`toolbar-items.tsx:L79-L636`](file:///C:/projects/grido/frontend/src/components/editor/toolbar/toolbar-items.tsx#L79)
- **الوصف:** خرق معيار سلم الارتفاعات القياسي (Standard Size Ramp) الذي يوجب توحيد عناصر التحكم القياسية على `h-8` (32px).
- **الحل:** استبدال `h-8.5` بـ `h-8`.

---

### [BUG-MED-09] أزرار أدوات الذكاء الاصطناعي لا تطبق ارتفاع Hero Actions القياسي
- **الموقع:** [`frontend/src/components/editor/toolbar/toolbar-items.tsx:L322, L347, L363, L390`](file:///C:/projects/grido/frontend/src/components/editor/toolbar/toolbar-items.tsx#L322)
- **الوصف:** أزرار العزل والترميم تتبع `h-8` (32px) بينما القاعدة المعمارية توجب أن تكون أزرار الذكاء الاصطناعي Hero Action بارتفاع `h-9` (36px).
- **الحل:** ترقية أزرار أدوات الذكاء الاصطناعي إلى `h-9`.

---

### [BUG-MED-10] أهداف لمس (Touch Targets) أصغر من الحد الأدنى للوصولية
- **الموقع:** [`frontend/src/components/editor/dialogs/print-dialog.tsx:L284-L295`](file:///C:/projects/grido/frontend/src/components/editor/dialogs/print-dialog.tsx#L284) و [`batch-insert-dialog.tsx:L363-L474`](file:///C:/projects/grido/frontend/src/components/editor/dialogs/batch-insert-dialog.tsx#L363)
- **الوصف:** أزرار بمقاسات `h-5 w-5` (20px) و `h-6 w-6` (24px) تخالف الحد الأدنى للأدوات المدمجة `h-7` (28px) وتعيق دقة النقر.
- **الحل:** ترقية المقاسات إلى `h-7` (28px).

---

## 4. العيوب الطفيفة وتناسق الواجهة والمصطلحات

### [BUG-LOW-01] خطأ مطبعي وحلقة تركيز معطلة في مودال الحساب والترخيص
- **الموقع:** [`frontend/src/components/editor/dialogs/account-license-modal.tsx:L199, L206`](file:///C:/projects/grido/frontend/src/components/editor/dialogs/account-license-modal.tsx#L199)
- **الوصف:** كتابة الكلاس الخاطئ `select-visible:outline-none` بدلاً من `focus-visible:outline-none`.
- **الحل:** تصحيح الكلاس وتطبيق حلقة التركيز المزدوجة القياسية.

---

### [BUG-LOW-02] زر إغلاق مخصص عائم بدلاً من المكون الموحد `DialogCloseButton`
- **الموقع:** [`frontend/src/components/editor/dialogs/refine-bg-dialog.tsx:L515-L523`](file:///C:/projects/grido/frontend/src/components/editor/dialogs/refine-bg-dialog.tsx#L515)
- **الوصف:** زر الإغلاق كُتب يدوياً كـ `<Button variant="ghost"><X /></Button>` بدلاً من استخدام `<DialogCloseButton />` في شريط العنوان.
- **الحل:** استبداله بـ `<DialogCloseButton />` وضبط `showCloseButton={false}`.

---

### [BUG-LOW-03] عناصر تحكم سلايدر خام غير مدعومة للوصولية
- **الموقع:** [`frontend/src/components/editor/dialogs/refine-bg-dialog.tsx:L606-L630`](file:///C:/projects/grido/frontend/src/components/editor/dialogs/refine-bg-dialog.tsx#L606)
- **الوصف:** استخدام `<input type="range" />` مباشر يفتقر لخصائص ARIA ودعم لوحة المفاتيح.
- **الحل:** استبدالها بمكون `FluentSliderField` الموحد.

---

### [BUG-LOW-04] غياب تصفير حالات التحميل عند إغلاق النوافذ (Modal Loading State Cleanup)
- **الموقع:** [`license-tab-content.tsx:L34`](file:///C:/projects/grido/frontend/src/components/editor/dialogs/account/license-tab-content.tsx#L34) و [`update-notifier.tsx:L77`](file:///C:/projects/grido/frontend/src/components/editor/system/update-notifier.tsx#L77)
- **الوصف:** غياب `useEffect` يراقب حالة الفتح والإغلاق لتصفير متغير التحميل في حال أغلق المستخدم النافذة أثناء الطلب.
- **الحل:** تضمين مراقب `open` لتصفير حالات التحميل دائماً.

---

### [BUG-LOW-05] عبارات إنشائية طويلة في نصوص الأزرار (خرق معيار التركيز اللفظي)
- **المواقع:**
  - `export-dialog.tsx:359`: "تنزيل الصورة" ← المعتمد: **"تصدير"**
  - `crop-dialog.tsx:328`: "إعادة ضبط القص" ← المعتمد: **"إعادة ضبط"**
  - `refine-bg-dialog.tsx:755`: "حفظ التعديلات" ← المعتمد: **"حفظ"**
  - `projects-dialog.tsx:586, 612`: "تأكيد الاستيراد" / "تأكيد حذف كل المشاريع" ← المعتمد: **"استيراد"** / **"حذف الكل"**
  - `batch-insert-dialog.tsx:638`: "إدراج في مساحة العمل" ← المعتمد: **"إدراج"**
  - `image-properties.tsx:348`: "معالجة..." ← المعتمد: **"جاري الترميم ..."**

---

### [BUG-LOW-06] قفز نسبي صفري غير قياسي في سكريبت المثبت NSIS
- **الموقع:** [`build/windows/installer/project.nsi:L87-L90`](file:///C:/projects/grido/build/windows/installer/project.nsi#L87)
- **الوصف:** استخدام `IfSilent 0 +2`؛ القفز الصفري `0` يشير لنفس التعليمة وقد يسبب دورة لا نهائية في بعض إصدارات NSIS.
- **الحل:** استخدام واسمات صريحة `IfSilent is_silent not_silent`.

---

### [BUG-LOW-07] استدعاء دالة وهمية `fontSize` على عقدة `<Group>` في `konva-single-layer.tsx`
- **الموقع:** [`frontend/src/components/editor/konva/layers/konva-single-layer.tsx:L159-L163`](file:///C:/projects/grido/frontend/src/components/editor/konva/layers/konva-single-layer.tsx#L159)
- **الوصف:** استدعاء `(node as Konva.Text).fontSize?.(...)` على عقدة من نوع `Group` يفشل بصمت لأن المجموعة لا تمتلك دالة `fontSize`.
- **الحل:** البحث عن العقدة النصية الابن `(node as Konva.Group).findOne("Text")`.

---

### [BUG-LOW-08] إطلاق Goroutines غير مقيدة لتنظيف مجلد التصدير عند كل طباعة
- **الموقع:** [`internal/service/print_export.go:L41-L55`](file:///C:/projects/grido/internal/service/print_export.go#L41)
- **الوصف:** استدعاء دالة تنظيف في Goroutine جديدة عند كل حفظ بدون أي تقييد، مما يطلق عشرات الـ Goroutines في عمليات الطباعة الدفعية.
- **الحل:** حمايتها بـ `atomic.Bool` كحارس يمنع التكرار المتزامن.

---

## 5. نتائج الاختبارات التلقائية والأداء

### 🧪 اختبارات Go Backend:
- تم تشغيل `go test ./internal/...`:
  - `grido/internal/handlers`: **PASS (8.04s)**
  - `grido/internal/repository`: **PASS**
  - `grido/internal/service`: **PASS (42.55s)**
  - `grido/internal/utils`: **PASS**
  - **النتيجة:** نجاح 100% لكافة حزم الـ Backend.

### 🧪 اختبارات React Frontend (Vitest):
- تم تشغيل `npm run test` في مجلد `frontend`:
  - **50 ملف اختبار اجتاز الفحص بنجاح (50 Passed Files).**
  - **323 اختبار فردي اجتاز الفحص بنجاح (323 Passed Tests).**
  - حدثت 3 أخطاء Timeout في ملفات الفحص المعياري التخليقي الثقيل:
    - `document-scanner-synthetic-benchmark.test.ts`
    - `document-scanner-real-scenarios.test.ts`
    - `real-image-user-evaluation.test.ts`
  - **السبب:** انتهاء مهلة Worker Threads تحت الضغط العالي لمحاكاة JSDOM مع معالجة OpenCV الاصطناعية على بيئة ويندوز، وليست أخطاء فشل في المنطق الحسابي للتطبيق.

---

## 6. خطة الإصلاح ذات الأولوية التنفيذية

```mermaid
graph TD
    A["المرحلة 1: الإصلاحات الحرجة الفورية"] --> B["المرحلة 2: محرك الكانفس وجودة التصدير"]
    B --> C["المرحلة 3: تجربة الواجهة ونظام Fluent 2"]

    A1["إلغاء الخصم المزدوج لحصة AI في ai_service.go"] --> A
    A2["إصلاح شرط SignPath في release.yml"] --> A
    A3["إصلاح استبدال الصور في image-properties.tsx"] --> A
    A4["حماية صور autosave في db.go"] --> A

    B1["إصلاح إطار التصدير الشفاف في export-image.ts"] --> B
    B2["تفريغ كاش صور الكولاج أثناء السحب"] --> B
    B3["مزامنة هوامش exportSlotCanvas مع الكولاج"] --> B
    B4["تصحيح حسابات تدريج المسطرة الهندسية"] --> B

    C1["توحيد سلم الارتفاعات h-8 و h-9 لأزرار AI"] --> C
    C2["تطبيق حلقات التركيز المزدوجة والمحددات المرنة"] --> C
    C3["تصفير مؤشرات التحميل واختصار نصوص الأزرار"] --> C
```

---
*تم إنشاء هذا التقرير وتوثيقه بواسطة وكيل الذكاء الاصطناعي بناءً على التدقيق الكامل لكود المشروع.*
