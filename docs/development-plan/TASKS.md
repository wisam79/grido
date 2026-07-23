# قائمة المهام التنفيذية

الحالة: غير منفذة | قيد التنفيذ | محجوبة | مكتملة
الأولوية: P0 قبل النشر، P1 للإصدار التالي، P2 تحسين مخطط.

## P0 — أمان وإيقاف مخاطر الإصدار

| ID | المهمة | معيار القبول | الحالة |
| --- | --- | --- | --- |
| SEC-01 | تدوير سر Modal المكشوف وتعطيل fallback في Python | السر لا يوجد في المستودع أو bundle؛ endpoint القديم يرفضه | مكتملة |
| SEC-02 | بناء Edge Function لطلبات AI | JWT وحجم الصورة والحصة تتحقق خادمياً قبل Modal | غير منفذة |
| SEC-03 | تخزين حصة AI وaudit في قاعدة البيانات | لا يعتمد الحد أو السجل على localStorage | غير منفذة |
| SEC-04 | فصل admin role عن enterprise plan | حساب enterprise عادي يرفض كل admin queries وmutations | غير منفذة |
| SEC-05 | إصلاح واختبار RLS | staging tests تثبت منع تعديل plan/status/expires_at/license_key ذاتياً | غير منفذة |
| SEC-06 | نقل عمليات الإدارة الحساسة إلى RPC أو Edge Functions | إنشاء مفتاح وتمديد أو سحب الترخيص لا يتمان من client مباشرة | غير منفذة |
| SEC-07 | تحديث Go الأمني وإعادة govulncheck | أداة release على آخر patch آمن ولا توجد symbol findings | غير منفذة |

## P0 — جودة قابلة للإصدار

| ID | المهمة | معيار القبول | الحالة |
| --- | --- | --- | --- |
| Q-01 | إصلاح 6 أخطاء lint والـwarning | npm run lint يمر بلا أخطاء | مكتملة (0 errors, 112 warnings — jsx-a11y + no-explicit-any قديم) |
| Q-02 | إصلاح E2E لرفع الصور | Chromium وFirefox يمران، وmock يحتوي bindings اللازمة | غير منفذة |
| Q-03 | إضافة E2E Chromium إلى CI | فشل E2E يمنع merge | غير منفذة |
| Q-04 | توحيد أمر Go tests في CI | يستخدم go test . ./internal/... ولا يمسح node_modules | غير منفذة |
| Q-05 | إضافة coverage thresholds تدريجية | CI يمنع الهبوط عن baseline المتفق عليه | مكتملة (40/35) |

## P1 — سلامة البيانات والطباعة

| ID | المهمة | معيار القبول | الحالة |
| --- | --- | --- | --- |
| DATA-01 | إكمال schema لخصائص slots وrepeatMode | import/autosave/export لا يفقد flip أو rotation أو repeat mode | غير منفذة |
| DATA-02 | إصلاح selector الحفظ التلقائي | تعديل إعداد طباعة أو قالب فقط ينشئ autosave خلال المهلة | غير منفذة |
| DATA-03 | استدعاء Logout الخلفي | لا تعود جلسة مستخدم بعد logout وإعادة تشغيل وهمية | غير منفذة |
| DATA-04 | قرار وتنفيذ سلوك free plan | الرسالة والواجهة وGo تملك سياسة واحدة موثقة | غير منفذة |
| DATA-05 | media registry وquarantine | لا تحذف صورة مرجعية؛ الحذف النهائي بعد فترة سماح واختبار | غير منفذة |
| PRINT-01 | توحيد layout للمعاينة والbackend | نفس النسخ والتمركز في preview وPNG | غير منفذة |
| PRINT-02 | دعم crop/zoom/drag/border/radius في preview | fixture كولاج مركب يطابق الناتج ضمن tolerance | غير منفذة |
| PRINT-03 | توحيد skinGlow أو توثيق الفرق | لا يوجد فرق غير مقصود بين CSS وGo | غير منفذة |
| PRINT-04 | اختبار وحدات لدالة crop وvisual للطباعة | حالات aspect/zoom/drag وحالات متعددة النسخ مغطاة | غير منفذة |

## P1 — إدارة آمنة

| ID | المهمة | معيار القبول | الحالة |
| --- | --- | --- | --- |
| ADM-01 | مولد مفاتيح خادمي عشوائي قوي | مفاتيح 128-bit أو أكثر ولا يستخدم Math.random | غير منفذة |
| ADM-02 | حماية CSV من formula injection | كل خلية تبدأ بـ =,+,-,@ محايدة ومختبرة | غير منفذة |
| ADM-03 | إزالة السجل والنماذج الثابتة من الإنتاج | dashboard يعرض بيانات خادمية أو حالة فارغة صادقة | غير منفذة |

## P2 — الأداء وقابلية الصيانة

| ID | المهمة | معيار القبول | الحالة |
| --- | --- | --- | --- |
| PERF-01 | Worker فعلي لعزل الخلفية | inference لا يحجب التفاعل والإلغاء يمنع تطبيق النتيجة | غير منفذة |
| PERF-02 | lazy import لـMediaPipe والنماذج | لا تحمل مكتبة AI قبل طلب الميزة | غير منفذة |
| PERF-03 | خفض initial bundle ضمن ميزانية | الميزانية موثقة ويصدر build بلا تحذير chunk غير مبرر | غير منفذة |
| PERF-04 | إزالة TooltipProvider المكرر | يوجد مزود واحد في App.tsx | غير منفذة |
| MAINT-01 | تقليل any في Konva والطباعة | مسارات print وkonva تستعمل أنواعاً صريحة | مكتملة (store types + no-explicit-any: warn) |
| MAINT-02 | README وrelease checklist | تشغيل وبناء وتحقق من إصدار موثقة | مكتملة |
