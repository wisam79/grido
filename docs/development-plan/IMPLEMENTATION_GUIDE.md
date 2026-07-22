# دليل تنفيذ الإصلاحات الحرجة

هذا الدليل يحدد شكل الحل، لا يختصر معايير القبول في TASKS.md.

## 1. فصل الصلاحية الإدارية

لا تستخدم plan = enterprise كبديل لدور إداري.

التنفيذ المقترح:

1. أضف claim إداري لا يعدله العميل، مثل app_metadata.role = admin، أو جدول admin_users لا يمكن تعديله إلا عبر service role.
2. أنشئ دالة is_admin تقرأ هذا المصدر فقط وتعمل بـsecurity definer مع search_path مقيد.
3. غيّر سياسات profiles وlicense_keys لتستدعي is_admin الجديدة.
4. انقل create-key وextend-license وrevoke-license إلى RPC أو Edge Function تتحقق من الدور.
5. اجعل Admin Web يقرأ الدور من claim موثوق، وليس من plan في profiles.

اختبارات staging المطلوبة:

- مستخدم free لا يقرأ إلا صفه.
- مستخدم pro وenterprise لا يقرأان قائمة المستخدمين أو المفاتيح.
- مدير يقرأ ويدير البيانات المصرح بها.
- المستخدم لا يغيّر plan أو status أو expires_at أو license_key مباشرة.

## 2. تأمين خدمة تحسين الصور

سر موجود في العميل يعد سراً مكشوفاً؛ لا يكفي نقله إلى متغير Vite.

التنفيذ المقترح:

1. دوّر السر في Modal فوراً واحذف default secret من Python.
2. أنشئ Edge Function تتلقى JWT والصورة أو مرجعها.
3. تحقق من المستخدم والخطة والحصة اليومية داخل transaction أو RPC ذري.
4. تحقق من Content-Length وحجم base64 وحجم البكسل بعد فك الصورة.
5. تستدعي Edge Function Modal بسر محفوظ في environment server-side.
6. تسجل الاستخدام والنتيجة في جدول ai_usage؛ يستمد dashboard منه البيانات.

ضوابط مقترحة:

- حد bytes قبل فك base64.
- حد عرض وارتفاع ومساحة بكسل بعد فك الصورة.
- rate limit لكل مستخدم وجهاز.
- timeout وidempotency key للطلب.
- لا ترجع رسالة استثناء Python الخام للعميل.

## 3. تثبيت RLS

قبل تطبيق migration على الإنتاج:

1. شغّل Supabase محلياً أو على staging.
2. طبّق migrations من صفر.
3. أنشئ مستخدمين عاديين ومديراً وحساب enterprise غير إداري.
4. اختبر SQL/API لكل SELECT وUPDATE وINSERT على profiles وlicense_keys.
5. اجعل حقول الترخيص قابلة للتعديل فقط من RPC security definer أو service role.

لا تعتمد على مقارنة OLD وNEW في policy من دون اختبار Postgres حقيقي. عند الحاجة لمقارنة قيم قبل/بعد استخدم trigger أمني أو امنع صلاحية UPDATE على الأعمدة الحساسة.

## 4. إصلاح E2E وطبقة Wails

المشكلة الحالية ليست فقط في selector؛ wrapper المصدّر موجود دائماً، حتى حين لا توفره mock runtime.

التنفيذ:

1. أنشئ adapter واحداً للـWails يتأكد من window.go.main.App.OpenMultipleFiles قبل النداء.
2. في Playwright وفر OpenMultipleFiles وOpenFile وجميع bindings المستخدمة.
3. اجعل اختبار الرفع ينتظر إضافة عنصر إلى store أو ظهور خصائص الصورة، لا مجرد click.
4. شغّل Chromium في CI. استخدم Firefox كتحقق دوري حتى يستقر زمنه.

## 5. إصلاح autosave وserializer

التنفيذ:

1. اجعل serializableProjectSelector يعيد كل الحقول التي يعيدها serializeEditorState.
2. اعتمد stable serialization أو equality مناسباً لتحديد التغيير.
3. أضف flipX وflipY وrotation إلى CanvasSlotSchema وrepeatMode إلى PrintSettingsSchema.
4. لا تحفظ بيانات غير معروفة بصمت إن كانت تؤثر في المخرج؛ ارفضها أو رحلها صراحة.
5. أضف round-trip tests لمسارات JSON وSQLite وautosave.
6. عند logout استدع LicenseHandler.Logout ثم امسح Zustand فقط إذا نجح أو بعد رسالة خطأ واضحة.

## 6. توحيد معاينة وطباعة الكولاج

التنفيذ:

1. استخرج حساب block positions وactualCopies والصفوف والأعمدة إلى دالة pure مشتركة.
2. استخرج crop cover مع zoom وdrag إلى دالة pure مشتركة بين Konva وطلب Go.
3. اجعل SheetPreview يرسم كل block لا كولاجاً واحداً ممتداً.
4. مرر collageRadius وcollageStrokeWidth وcollageStrokeColor للمعاينة.
5. اتخذ قراراً واحداً لفلتر skinGlow: إزالة blur من Go أو تنفيذ مكافئ في المعاينة.
6. استخدم onafterprint مع timeout احتياطي أطول لإزالة iframe، لا timeout ثابت قصير.

اختبارات:

- كولاج أصغر من مساحة الورقة.
- أكثر من نسخة في صفوف وأعمدة.
- صورة landscape وportrait مع zoom وdrag.
- زوايا وحدود وفلاتر.
- مقارنة visual أو pixel مع tolerance موثق.

## 7. أداء Konva وAI

- لا تغير GridLayer ليستخدم fill أو stroke داخل حلقات الرسم.
- أي مكون كثيف DOM أو SVG يجب أن يبقى React.memo وأن يحسب المصفوفات بـuseMemo.
- أبق TooltipProvider واحداً في App.tsx.
- حمّل MediaPipe ديناميكياً داخل مسار AI.
- انقل inference إلى Worker؛ يرسل worker progress وresult أو cancelled، ويغلق الموارد دائماً.
- لا تستخدم setTimeout(..., 0) كبديل لتصميم state صحيح في autosave.

## 8. أوامر التحقق قبل إغلاق أي مرحلة

من جذر المشروع:

    go test . ./internal/...
    go test -race ./internal/...
    go vet ./...
    go run golang.org/x/vuln/cmd/govulncheck@latest ./...

من frontend:

    npm run lint
    npm run typecheck
    npm test
    npm run test:coverage
    npm run build
    npm run test:e2e

ومن admin-web:

    npm run lint
    npm run build

ثم طبّق migration على staging، ونفّذ اختبارات RLS، وابن تطبيق Wails كاملاً قبل الإصدار.
