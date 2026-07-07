# دليل التنفيذ

## 1. إصلاح خط الجودة

نفذ هذا المسار قبل أي تعديل كبير.

الأوامر المرجعية:

```powershell
cd C:\projects\grido\frontend
npm run lint
npm run typecheck
npm test
npm run build
npm run test:e2e
```

خطوات التنفيذ:

1. ابدأ بـ lint لأنه يعطي أخطاء محددة.
2. عالج `no-empty` في Konva بإزالة catch الفارغ أو تسجيل تحذير خفيف.
3. عالج `set-state-in-effect` في `print-area.tsx` و`general-settings.tsx` بتحويل القيم المشتقة إلى `useMemo` أو بتأجيل التحديث داخل callback/transition حسب الحاجة.
4. عالج `react-hooks/refs` في `shared-controls.tsx` باستخدام نمط initialization آمن أو `useMemo`.
5. نظف imports غير المستخدمة.
6. بعد نجاح lint شغل typecheck/tests/build.

ملاحظات:

- لا تخفض قواعد lint لتخفي المشكلة.
- أبق `@typescript-eslint/no-explicit-any` كما هو مؤقتًا، لكن افتح مهمة مستقلة لتقليل `any`.

## 2. إصلاح CI

التعديل المقترح:

- تحديث Go إلى 1.23.x في workflow.
- إضافة steps:

```yaml
- name: Run Go Tests
  run: go test ./internal/... .

- name: Lint Frontend
  working-directory: ./frontend
  run: npm run lint
```

لـ e2e:

- شغله بعد إصلاح الاختبارات.
- ابدأ بـ Chromium فقط في CI لتقليل الزمن، ثم أضف Firefox لاحقًا.

مشكلة `go test ./...`:

- بعد `npm ci` قد يلتقط Go package داخل `frontend/node_modules`.
- الحل الأفضل: استخدم packages محددة (`go test . ./internal/...`) أو انقل frontend خارج نطاق Go module، وهذا غير مطلوب الآن.

## 3. ترقية Vite/esbuild

لا تستخدم `npm audit fix --force` مباشرة على الفرع الرئيسي.

خطوات آمنة:

1. أنشئ فرع ترقية.
2. ارفع `vite` و`@vitejs/plugin-react` معًا.
3. راجع `vite.config.ts` لأن المشروع يستخدم Wails وworker بصيغة ES.
4. شغل:

```powershell
npm install
npm run typecheck
npm run lint
npm test
npm run build
npm run test:e2e
npm audit --audit-level=moderate
```

5. إن ظهرت مشاكل Wails asset server، اختبر `wails dev` و`wails build`.

## 4. بناء serializer موحد

ملف مقترح: `frontend/src/lib/project-serializer.ts`.

مكونات الملف:

- `CURRENT_PROJECT_VERSION = 1`.
- `ProjectFileSchema`.
- `serializeEditorState(state)`.
- `deserializeProjectFile(raw)`.
- `domainProjectToProjectFile(project)`.
- `projectFileToDomainProject(file, id, name)`.

قواعد مهمة:

- لا تحفظ دوال أو مكونات React داخل template. احفظ `templateId` و`collageTemplateId` ثم استعدها من القوائم المحلية.
- لا تستخدم `z.any()` إلا كممر legacy مؤقت.
- أضف migrations:

```ts
function migrateProject(raw: unknown): ProjectFileV1 {
  // legacy without version -> normalize to v1
}
```

اختبارات مطلوبة:

- مشروع يحتوي صورة ونص وشكل وshadow وgrid.
- مشروع كولاج مع gap/margin/radius/stroke.
- ملف legacy بدون version.
- ملف مع JSON غير صالح.

## 5. توحيد الطباعة والتصدير

المسار المفضل قصير المدى:

1. استخدم Konva stage لتوليد snapshot نهائي كامل.
2. أرسل الصورة النهائية إلى Go print service كعنصر واحد متكرر على الورقة.
3. أبق Go service مسؤولًا عن layout الورقة فقط.

لماذا:

- يقلل فرق التصيير بين browser canvas وGo.
- يدعم النصوص والأشكال والظلال والمرشحات فورًا.
- يبسط الاختبارات.

تعديلات Go المطلوبة:

- أضف validation قبل `gg.NewContext`.
- ضع حدودًا مثل:
  - DPI بين 72 و600.
  - paper width/height ضمن نطاق معروف.
  - `widthPx * heightPx` تحت حد آمن.
  - عدد العناصر تحت حد آمن.

اختبارات:

- snapshot فيه نص فوق صورة.
- print request بحجم خطر يرجع error.
- print request بصورة غير موجودة يرجع error واضح.

## 6. إزالة الخلفية

اختر أحد المسارين.

مسار online-first:

- أبق `allowLocalModels = false`.
- أضف UI يوضح أن أول استخدام يحتاج إنترنت.
- أضف retry/cancel.
- أضف حد حجم قبل worker.

مسار offline:

- عدل `download-models.cjs` ليحمل ملفات النموذج والruntime.
- ضعها تحت `frontend/public/models` أو مسار assets مناسب.
- فعل `env.allowLocalModels = true`.
- اضبط `env.localModelPath`.
- وثق حجم التطبيق المتوقع.

في كلا المسارين:

- اكتب contract لرسائل worker.
- لا ترسل base64 ضخم بلا قياس؛ استخدم Blob/ObjectURL أو downscale.
- حرر الموارد بعد الاستخدام.

## 7. إدارة الوسائط

المشكلة الحالية أن التنظيف يبحث في JSON strings ثم يحذف مباشرة.

تنفيذ آمن:

1. أضف جدول `media_refs` أو ملف registry.
2. عند إضافة صورة، سجل filename وcreatedAt.
3. عند حفظ مشروع أو autosave، حدث المراجع.
4. عند التنظيف، انقل الملفات غير المرجعية إلى `MediaTrash`.
5. احذف نهائيًا بعد فترة سماح.

اختبارات:

- صورة مستخدمة في autosave لا تحذف.
- صورة مستخدمة في مشروع DB لا تحذف.
- صورة غير مستخدمة حديثة لا تحذف.
- صورة غير مستخدمة قديمة تنتقل للحجر ثم تحذف.

## 8. تحسين الأداء

ابدأ بما يعطي أثرًا سريعًا:

- `React.lazy` للحوارات: PrintDialog, ExportDialog, ProjectsDialog.
- تحميل worker عند أول طلب إزالة خلفية.
- فصل transformers في chunk مستقل.
- مراجعة re-render لمكونات الخصائص باستخدام selectors أصغر.

قياس:

- قارن حجم `dist/assets/index...js` قبل/بعد.
- قارن زمن فتح الصفحة في Playwright.
- سجل عدد re-renders فقط عند الحاجة باستخدام React Profiler محليًا.

## 9. توثيق الإصدار

أضف لاحقًا:

- `README.md` حقيقي.
- `docs/release-checklist.md`.
- `docs/manual-smoke-test.md`.

حد أدنى للـ smoke test:

- فتح التطبيق.
- إضافة صورة.
- إضافة نص وشكل.
- حفظ مشروع في DB.
- إغلاق وفتح واسترجاع المشروع.
- تصدير PNG.
- إنشاء ورقة طباعة.
- تجربة إزالة الخلفية أو فشلها اللطيف.
