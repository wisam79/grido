# مراجعة التطبيق الحالية

## نطاق القراءة

تمت مراجعة بنية Wails/Go، واجهة React/TypeScript، التخزين المحلي، التصدير، الطباعة، إزالة الخلفية، الاختبارات، CI، الاعتمادات، وملفات الإعداد. لم يتم تعديل الكود أثناء المراجعة؛ الإضافة الوحيدة هي مجلد الخطة هذا.

## نقاط قوة

- بنية Go مفهومة: handlers ثم services ثم repository، مع واجهات دومين واضحة في `internal/core/domain`.
- SQLite مهيأ بخيارات عملية مثل WAL وbusy timeout وforeign keys في `internal/repository/db.go:44`.
- حماية أولية عند رفع الصور: حد حجم 50MB وفحص MIME في `app.go:68` و`app.go:98`.
- Wails asset server يقيد `/local-image/` إلى أسماء ملفات داخل مجلد Media ويفحص MIME في `main.go:92` و`main.go:116`.
- يوجد حفظ تلقائي واسترجاع مسودة في `frontend/src/hooks/use-autosave.ts:38`.
- توجد اختبارات Go وخط أساس من اختبارات Vitest.

## مشاكل حرجة

### 1. خط الجودة لا يمر كاملًا

الأثر: لا يمكن اعتبار أي تغيير جاهزًا بثقة لأن lint وe2e يفشلان.

الدليل:

- `npm run lint` يفشل بـ 6 أخطاء و12 تحذيرًا.
- `npm run test:e2e` يفشل 6/6.
- اختبار ONNX يبحث عن ملف غير موجود في `frontend/e2e/bg-removal.spec.ts:6`.
- اختبارات e2e تعتمد محددات قديمة مثل `button:has-text("رفع صورة")` في `frontend/e2e/app.spec.ts:54`.

العلاج المختصر:

- إصلاح أخطاء lint أولًا.
- تحديث mocks والمحددات في Playwright لتطابق UI الحالي وKonva canvas.
- حذف/استبدال اختبار ONNX القديم باختبار يناسب `@huggingface/transformers`.

### 2. CI لا يحمي التطبيق بما يكفي

الأثر: يمكن دمج تغييرات تفشل lint أو Go tests أو e2e. كما أن نسخة Go في CI لا تطابق المشروع.

الدليل:

- `go.mod:3` يستخدم Go 1.23.0.
- `.github/workflows/ci.yml:20` يستخدم Go 1.21.
- CI يشغل typecheck وunit tests وWails build فقط، ولا يشغل lint أو `go test` أو e2e.

العلاج المختصر:

- تحديث Go في CI إلى 1.23.x أو تعديل `go.mod` إن كان المشروع يجب أن يدعم 1.21.
- إضافة jobs أو steps: `go test`, `npm run lint`, smoke e2e.
- تجنب `go test ./...` غير المقيد بعد `npm ci` لأنه يلتقط Go package داخل `frontend/node_modules`.

### 3. ثغرات npm عبر Vite/esbuild

الأثر: بيئة التطوير معرضة لثغرة dev server، و`npm audit` يفشل.

الدليل:

- `npm audit --audit-level=moderate` وجد 3 vulnerabilities.
- Vite مثبت فعليًا 3.2.11، وآخر متاح في وقت الفحص 8.1.3.
- `frontend/package.json:104` يثبت `vite` على نطاق قديم، و`frontend/package.json:88` يستخدم `@vitejs/plugin-react` 2.x.

العلاج المختصر:

- ترقية Vite/plugin-react بشكل مخطط لا عبر `npm audit fix --force` مباشرة.
- تنفيذ فرع ترقية مع typecheck/build/e2e.
- مراجعة توافق Wails/Vite بعد الترقية.

### 4. الطباعة عالية الدقة لا تطابق دائمًا ما يراه المستخدم

الأثر: المستخدم قد يضيف نصوصًا أو أشكالًا أو تعديلات ثم يحصل على ملف طباعة لا يحتوي إلا على الصورة الأولى في الوضع المفرد.

الدليل:

- `frontend/src/components/editor/print-dialog.tsx:154` يستدعي backend print مباشرة.
- في الوضع المفرد، التجهيز يلتقط `firstImage` فقط، ولا يرسل بقية العناصر النصية/الأشكال.
- خدمة الطباعة في Go تستقبل `PrintItem` بصورة فقط في `internal/core/domain/print.go`.

العلاج المختصر:

- توحيد مسار الطباعة مع صورة canvas النهائية من Konva أو توسيع Go renderer لدعم كل العناصر.
- إضافة اختبار pixel/snapshot يثبت أن النصوص والأشكال تظهر في ملف الطباعة.

## مشاكل عالية الأولوية

### 5. مخطط المشروع غير مكتمل وغير موحد

الأثر: حقول متقدمة قد تضيع عند autosave/load أو عند استيراد JSON، خصوصًا الظلال، الزوايا، blend modes، وإعدادات كولاج مخصصة.

الدليل:

- `CanvasElement` يحتوي `shadowColor`, `cornerRadius`, `globalCompositeOperation` في `frontend/src/lib/editor-store.ts:58`.
- `ProjectSchema` لا يذكر هذه الحقول في `frontend/src/lib/schema.ts:66`.
- `template` و`collageTemplate` معرفان كـ `z.any()` في `frontend/src/lib/schema.ts:73`.
- `loadProject` يستخدم casts مثل `(project as any)` في `frontend/src/lib/editor-store.ts:618`.

العلاج المختصر:

- بناء DTO موحد للمشروع مع `version`.
- توسيع Zod schemas لكل حقول الحالة الحالية.
- إضافة migrations من الإصدارات القديمة.

### 6. مسارات الحفظ والتحميل متفرقة

الأثر: سلوك "حفظ"، "تصدير JSON"، "مكتبة المشاريع"، و"autosave" ليس مبنيًا على عقد بيانات واحد.

الدليل:

- `App.tsx:131` يربط زر الحفظ بـ `saveProjectAsJSON`.
- `toolbar.tsx:146` لديه `handleSaveProject` منفصل يستخدم browser download.
- `projects-dialog.tsx` يحفظ قاعدة البيانات بصيغة domain.Project مختلفة.
- `export-utils.ts:342` يبني JSON مستقلًا.

العلاج المختصر:

- إنشاء `project-serializer.ts` يحوي `toProjectFile`, `fromProjectFile`, `toDomainProject`, `fromDomainProject`.
- جعل كل المسارات تستخدمه.

### 7. إزالة الخلفية تعتمد على الإنترنت وقت الاستخدام

الأثر: تجربة أول استخدام معرضة للفشل أو التأخير، ولا يوجد مسار offline واضح رغم وجود `.gitignore` يشير إلى نماذج محلية.

الدليل:

- `frontend/src/components/editor/bg-worker.ts:17` يستخدم `briaai/RMBG-1.4`.
- `env.allowLocalModels = false` في `frontend/src/components/editor/bg-worker.ts:35`.
- سكربت `frontend/scripts/download-models.cjs` placeholder ولا يحمل نماذج.
- اختبار e2e القديم يبحث عن ONNX runtime assets غير موجودة.

العلاج المختصر:

- اختيار استراتيجية رسمية: online-first مع شاشة تنزيل واضحة، أو bundled local model.
- إن كان offline مطلوبًا: تنزيل assets أثناء build وتفعيل `allowLocalModels`.
- إضافة cancel/retry وقيود حجم للصورة قبل تشغيل النموذج.

### 8. توليد الطباعة بدون حدود موارد واضحة

الأثر: طلبات DPI/أبعاد كبيرة يمكن أن تستهلك ذاكرة كبيرة أو تسبب تجمدًا.

الدليل:

- `GeneratePrintSheet` يحسب `widthPx` و`heightPx` مباشرة من mm وDPI في `internal/service/print_service.go:85`.
- لا توجد validation قبل `gg.NewContext(widthPx, heightPx)` في `internal/service/print_service.go:88`.

العلاج المختصر:

- إضافة validation للـ DPI والأبعاد وعدد العناصر ومساحة البكسل القصوى.
- إرجاع خطأ مفهوم للمستخدم قبل إنشاء canvas ضخم.

### 9. تنظيف الوسائط قد يحذف ملفات لازالت مطلوبة

الأثر: صور محفوظة في مشاريع غير ممثلة بالشكل المتوقع، أو مسودة لم تحفظ بعد، قد تفقد الملف بعد مرور نافذة الزمن.

الدليل:

- `CleanupUnusedMedia` يعمل دوريًا في `internal/repository/db.go:137`.
- يعتمد على قراءة `Elements` و`Slots` كنصوص JSON فقط.
- يحذف مباشرة عبر `os.Remove` في `internal/repository/db.go:247`.

العلاج المختصر:

- إنشاء media registry أو جدول MediaRefs.
- تطبيق quarantine قبل الحذف النهائي.
- إضافة اختبارات تنظيف الوسائط.

## مشاكل متوسطة

### 10. استخدام واسع لـ `any`

الأثر: يزيد احتمال فقدان حقول أو كسر عقود البيانات دون اكتشاف مبكر.

أمثلة:

- `frontend/src/components/editor/print/print-preview.tsx:18`.
- `frontend/src/components/editor/konva/konva-elements.tsx:23`.
- `frontend/src/components/editor/bg-worker.ts:14`.
- `frontend/src/components/editor/print-dialog.tsx:154`.

العلاج: تعريف أنواع مشتركة لكل طلبات Wails، print preview، رسائل worker، وKonva refs.

### 11. حجم الحزم والتحذيرات

الأثر: بدء التشغيل أبطأ واستهلاك ذاكرة أكبر.

الدليل:

- build أنتج `assets/index...js` بحجم 993.37 KiB و`assets/bg-worker...js` بحجم 814.51 KiB.
- Vite حذر من chunks أكبر من 500 KiB.

العلاج:

- lazy-load dialogs وAI worker وheavy libs.
- فصل transformers/konva/export في chunks واضحة.
- قياس startup بعد كل تغيير.

### 12. الاختبارات لا تغطي أهم المخاطر

الأثر: مسارات مثل الطباعة النهائية، حفظ/تحميل المشاريع، autosave migration، وتنظيف الوسائط غير محمية.

الدليل:

- اختبارات Go الحالية تركز happy path.
- Vitest الحالي 10 اختبارات فقط.
- e2e فاشلة وغير متزامنة مع UI الحالي.

العلاج:

- إضافة اختبارات عقد للـ serializer.
- اختبارات pixel للتصدير والطباعة.
- e2e smoke بدل رحلة ضخمة هشة.

### 13. أذونات السجل واسعة

الأثر: على أنظمة متعددة المستخدمين قد تكون سجلات التطبيق قابلة للقراءة/الكتابة أكثر من اللازم.

الدليل:

- `internal/utils/logger.go:15` يستخدم `0666`.

العلاج:

- استخدام `0600` للسجلات المحلية.
- إضافة تدوير حجم log أو حد أقصى.

### 14. mock runtime داخل التطبيق قد يخفي مشاكل تكامل

الأثر: تشغيل الواجهة خارج Wails يصبح مفيدًا للتطوير، لكنه قد يخفي غياب bindings أو يكسر e2e بطريقة صامتة.

الدليل:

- `frontend/src/main.tsx:7` ينشئ `window.go` mock عند غياب Wails.

العلاج:

- نقل mocks إلى طبقة dev/test صريحة.
- جعل production build يفشل بوضوح إذا غابت bindings المطلوبة.

## مشاكل منخفضة وأعمال تحسين

- README ما زال قالب Wails الافتراضي ولا يشرح المنتج أو أوامر الاختبار.
- لا توجد سياسة versioning واضحة لملفات المشروع.
- بعض رسائل الأخطاء تذهب إلى console فقط بدل toast/action للمستخدم.
- منع context menu عالميًا قد يضعف تجربة النصوص والتصحيح الإملائي.
- لا توجد مؤشرات تغطية أو عتبات coverage.
- لا توجد وثيقة release checklist أو smoke test يدوي.
