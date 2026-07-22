# تقرير التحقق — خط الأساس الجديد

**تاريخ التشغيل:** 21 يوليو 2026
**الغرض:** توثيق الحالة قبل تنفيذ خطة الإصلاح، وليس إعلان اكتمال الخطة.

## النتائج

| الأمر أو الفحص | النتيجة | التفاصيل |
| --- | --- | --- |
| go test ./... | ناجح | اجتاز، لكنه يلتقط حزمة Go داخل frontend/node_modules؛ لا يستخدم كأمر CI الرئيسي |
| go test -race ./internal/... | ناجح | لا races مكتشفة في اختبارات internal |
| go vet ./... | ناجح | لا مخرجات |
| frontend typecheck | ناجح | TypeScript بلا أخطاء |
| frontend unit tests | ناجح | 36 اختباراً في 9 ملفات |
| frontend coverage | ناجح لكن منخفض | Statements 30.62%، Branches 26.33% |
| frontend build | ناجح بتحذير | main bundle 1.38MB، وتحذير Vite للـchunk الكبير |
| frontend lint | فاشل | 6 أخطاء و1 تحذير |
| frontend E2E | فاشل | 4 فاشلة و2 ناجحة عبر Chromium وFirefox |
| admin lint/build | ناجح بتحذيرين | build ناجح؛ dependency وcatch warning |
| npm audit production | ناجح | لا ثغرات production في frontend أو admin-web |
| govulncheck | فاشل | go1.26.4 متأثر بـGO-2026-5856؛ ثابت في go1.26.5 |

## تفسير فشل E2E

اختبارات الرفع تزود OpenFile فقط، بينما ToolbarFileOps يستدعي OpenMultipleFiles لأن wrapper المصدّر موجود. ينتهي النداء بخطأ في mock، فلا تضاف صورة، ثم تفشل توقعات خصائص الصورة. يلزم إصلاح mock وطبقة اكتشاف الـbinding، وليس إطالة timeout.

## فحوصات يجب إضافتها بعد الإصلاح

1. اختبار RLS من حساب free وpro وenterprise غير إداري ومدير.
2. اختبار استدعاء AI بدون JWT وبحصة منتهية وملف كبير.
3. round-trip لمشروع كامل عبر autosave وJSON وSQLite.
4. visual test لمعاينة الكولاج مقابل PNG الطباعة.
5. E2E لرفع صورة وحفظ مشروع واسترجاعه وتسجيل الخروج.
6. govulncheck باستخدام نفس toolchain الذي يبني artifact النهائي.

## شرط الانتقال إلى إصدار

لا يصدر build قبل أن تكون بنود SEC-01 إلى SEC-07 وQ-01 إلى Q-04 مكتملة، مع تسجيل نتائج الأوامر في هذا الملف وتوقيع اختبار RLS على staging.
