---
type: refactor
scope: auth
related_files:
  - frontend/src/lib/store/slices/license-slice.ts:156
---
غلاف موحد لإجراءات المصادقة المرتِّبة لملف تعريف في شريحة الترخيص: `runProfileAuthAction` يوحّد النمط المكرر يدوياً في ستة إجراءات (تسجيل حساب، دخول، دخول Google، تفعيل مفتاح، تحقق OTP، تعيين كلمة مرور جديدة — ~110 أسطر متطابقة البنية): تحميل ← نداء الربط ← رفض نتيجة فارغة برسالة السياق ← إبطال الفحص المعلق (`invalidateInFlightLicenseCheck`) ← تعيين الجلسة ← إعادة رمي الخطأ برسالة السياق نفسها. خيارا الانحراف الموثقان يحفظان سلوك `resendOTP` الأصلي المقصود (`applyProfile: false` — لا جلسة في مرحلة التسجيل، و`invalidateCheck: false` — لا إبطال فحص)، و`resetPassword` يبقى صريحاً لاختلاف شكله (بذري بلا ملف تعريف وتصفير تحميل في finally). سلوك محفوظ حرفياً بلا تغيير — تحقق 16/16 اختبار `license-slice.test.ts` عبر الـAPI العام، وتأكيد docs-gate على طرد الجلسة الملغاة (`isSessionSupersededError` / `accountModalOpen: true` / `ERR_SESSION_SUPERSEDED`) باقٍ في موضعه.
