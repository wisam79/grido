---
type: test
scope: docs
related_files:
  - frontend/package.json:136
  - frontend/test/grid-utils.test.ts:329
  - frontend/test/collage-grid-math.test.ts:153
  - frontend/test/collage-image-crop.test.tsx:487
---
الدفعة 6 بند 1 — قوانين الخصائص fast-check داخل ملفات الاختبارات القائمة (لا ملفات جديدة حفاظاً على عدّاد docs-metrics): `fast-check` v4.10.2 devDependency، وأربعة قوانين: (1) `buildPhysicalGridCellsMM` في grid-utils.test.ts بقانونين — مدخلات منفذة: كل خلية ≥1مم وداخل الورقة، وضغط شديد (حتى ~13×): خلايا موجبة وداخل الورقة (الطور الثالث «التصغير التناسبي» يقلّص المحورين معاً فينزل خلايا W تحت 1مم — **سلوك مصمم كذلك** وليس عيباً)؛ (2) عكس `getSlotRect` round-trip في collage-grid-math.test.ts لأي هندسة (مستثنى النطاق المُقصى بحارس max(0,…) للخلايا الأصغر من الفجوة، والتسامح 5e-5 لمطابقة float32 للمولد)؛ (3) نافذة `computeSlotCrop` موجبة وداخل حدود الصورة دائماً لأي تحويل (zoom ≥1 — نطاق الواجهة؛ zoom<1 يوسّع النافذة خارج الصورة بحسب التصميم). القانون الرابع المطلوب (لا تداخل بعد الإزاحة وفجوات محفوظة) مؤجل: `tryDisplaceOverlappingCells` غير مُصدَّرة كدالة نقية وتُغطى سلوكياً عبر collage-slice/E2E — يحتاج شطر تصدير بنيوي في التزام مستقل. **اكتشاف موثق للمالك:** عند ضغط شديد جداً خارج نطاق الواجهة (ورقة هزلية <35مم) تنتج إزاحة مركزية سالبة طفيفة (-0.02مم) — خارج النطاق القابل للوصول، يُسجَّل للمعلومة. تحقق: 48/48 في الملفات الثلاثة، tsc، ESLint صفر تحذيرات، format، `npm audit --omit=dev` صفر ثغرات (البوابة غير متأثرة)، docs-gate --strict-refs.
