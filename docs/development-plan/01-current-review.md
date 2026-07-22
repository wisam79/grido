# خط أساس المراجعة الحالية

**تاريخ الفحص:** 21 يوليو 2026
**النطاق:** Wails/Go، React/Konva، الطباعة، التخزين المحلي، AI، Admin Web، Supabase migrations، الاختبارات والاعتمادات.
**خارج النطاق:** لم يتم الاتصال ببيئة Supabase الإنتاجية أو تغيير أي إعداد سحابي.

## الفحوصات المنفذة

| الفحص | النتيجة | الملاحظة |
| --- | --- | --- |
| Go tests | ناجح | go test وgo test -race للمجلد internal ناجحان |
| Typecheck للواجهة | ناجح | TypeScript بلا أخطاء |
| Vitest | ناجح | 36 اختباراً في 9 ملفات |
| بناء frontend | ناجح بتحذير | main bundle: 1.38MB غير مضغوط، 415KB gzip |
| lint للواجهة | فاشل | 6 أخطاء و1 تحذير |
| Playwright | فاشل | 4 من 6 فاشلة؛ مسار رفع الصورة لا يصل إلى الحالة المتوقعة |
| Admin build | ناجح بتحذيرين | dependency وcatch غير معالجان |
| npm audit للإنتاج | ناجح | لا ثغرات npm إنتاجية في frontend أو admin-web |
| Go vulnerability scan | يحتاج معالجة | أداة البناء المحلية go1.26.4 متأثرة بثغرة TLS مصححة في go1.26.5 |

## نقاط القوة

- طبقات Go مفصولة بوضوح: handlers/services/repository/domain.
- طباعة Go تتحقق من DPI والأبعاد ومساحة البكسل، ولديها cache ومعالجة متوازية.
- حماية أولية جيدة للملفات المحلية: حد الحجم، MIME، وأسماء معزولة داخل Media.
- serializer موحد موجود بالفعل بين autosave وJSON وSQLite.
- تنظيف Canvas في GridLayer يلتزم بتجميع مسارات الرسم ولا يستدعي fill أو stroke داخل الحلقة.

## المخاطر المؤكدة

### SEC-01 — فصل الصلاحية الإدارية عن خطة الاشتراك مفقود

كل حساب enterprise يمر عبر فحص الإدارة في Admin Web، ودالة is_admin في قاعدة البيانات تعتمد الخطة نفسها. النتيجة: عميل enterprise يمكنه قراءة المستخدمين والمفاتيح وتعديلها وإنشاء مفاتيح جديدة.

العلاج: role أو claim إداري مستقل لا يمكن للمستخدم تعديله، ثم تبديل Admin Web وRLS وRPC إليه.

### SEC-02 — سر خدمة AI وحصتها تحت تحكم العميل

المفتاح موجود في JavaScript وفي fallback لخدمة Modal؛ كما أن العداد اليومي في localStorage. يمكن استخراج المفتاح، استدعاء endpoint مباشرة، وتجاوز الحصة.

العلاج: تدوير السر فوراً، إزالة fallback، وتوجيه كل طلب إلى Edge Function تتحقق من JWT والحصة وحجم الطلب قبل الاتصال بـModal.

### SEC-03 — سياسة RLS المقترحة غير قابلة للاعتماد دون اختبار ترحيل

تستعمل migration المتأخرة OLD.plan وOLD.status داخل WITH CHECK. يجب اختبارها على PostgreSQL أو Supabase staging؛ كما أن منع تعديل plan/status وحده لا يحمي expires_at أو license_key.

العلاج: منع تعديل حقول الترخيص من العميل عبر privileges أو RPC مخصص، ووضع اختبار RLS للتصعيد والتمديد الذاتي.

### REL-01 — بوابة الإصدار الحمراء

lint يفشل، E2E تفشل، وCI لا يشغّل E2E. السبب المباشر في E2E هو mock ناقص لـOpenMultipleFiles، مع فحص wrapper بدلاً من binding الحقيقي.

العلاج: إصلاح الكود والـmock، ثم تشغيل Chromium E2E في CI كحد أدنى.

### REL-02 — معاينة الكولاج لا تمثل مخرج الطباعة

المعاينة تمدد كولاجاً واحداً داخل مساحة الورقة وتتجاهل النسخ، التمركز، crop وzoom وdrag، والحدود ونصف القطر، بينما backend يرسم blocks متكررة محسوبة بالمليمتر.

العلاج: استخراج layout وcrop إلى دوال مشتركة قابلة للاختبار، وتمرير خصائص الحدود والزوايا إلى المعاينة.

### DATA-01 — autosave لا يراقب كل الحالة القابلة للحفظ

المراقبة تتجاهل template وcollageTemplate وprintSettings وإعدادات الشبكة/الأعمدة وcollageShowCutLines. تغيير هذه القيم فقط قد لا يصل إلى autosave.

العلاج: selector واحد مبني على DTO المتسلسل أو مقارنة stable لنسخة المشروع كاملة.

### DATA-02 — serializer لا يحافظ على كل خصائص الحالة

CanvasSlot يدعم flipX وflipY وrotation، وPrintSettings يدعم repeatMode، لكن ProjectSchema لا يحتفظ بها. الاستيراد أو autosave يمكن أن يزيلها.

العلاج: استكمال Zod schema وإضافة اختبارات round-trip.

### REL-03 — Logout ظاهري فقط

logoutAccount يمسح Zustand ولا يستدعي LicenseHandler.Logout، لذلك تبقى الجلسة المشفرة المحلية ويمكن استعادتها بعد إعادة التشغيل.

العلاج: استدعاء handler، ومعالجة الفشل، ثم اختبار إعادة تشغيل وهمي.

### PERF-01 — إزالة الخلفية حاجبة للإطار الرئيسي

MediaPipe segment يستدعى مباشرة من hook، وليس داخل Worker فعلي، وزر الإلغاء لا يستطيع إيقاف inference المتزامن فوراً.

العلاج: Worker مع OffscreenCanvas أو transferable، lazy import لـMediaPipe، وبروتوكول cancel حقيقي.

## مخاطر متوسطة

- media cleanup يعتمد على تحليل JSON بدلاً من registry للمراجع.
- سجل AI المسمى Live Audit يحتوي بيانات ثابتة ومحلية، وليس سجلاً خادمياً موثوقاً.
- CSV في لوحة الإدارة لا يحمي من formula injection، والمفاتيح تولد بـMath.random.
- استخدام any واسع، وTooltipProvider مكرر، ولا توجد thresholds للتغطية.
- الخطة المجانية محددة بثلاثة مشاريع في Go، بينما واجهة التطبيق تقفل الوصول لغير المرخص؛ يلزم قرار منتج موحد.
