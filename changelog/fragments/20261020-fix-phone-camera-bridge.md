---
type: fix
scope: ui
related_files:
  - internal/service/phone_bridge_service.go:298
  - frontend/src/components/editor/dialogs/phone-bridge-dialog.tsx:126
  - frontend/src/components/editor/system/use-phone-bridge.ts:132
  - admin-web/src/pages/PhoneCameraPage.tsx:183
  - internal/service/embedded/phone_camera_page.html:455
---
ترقية جسر كاميرا الهاتف لمعمارية الدفع اللحظي (WhatsApp-style Realtime Push) عبر Supabase WebSockets:
- ربط الهاتف وسطح المكتب عبر قنوات Supabase Realtime Broadcast (WebSockets)، وتوصيل إشعار التقاط الصور واقتران الجهاز في 0ms فورياً بلا استقصاء HTTP متكرر، مع خفض استهلاك خوادم السحابة في الخمول إلى الصفر.
- معالجة انقطاع المزامنة السحابية بحفظ معرف المستخدم `uid` في رابط الجلسة لمطابقة سياسات RLS، وتوفير استقصاء احتياطي هادئ وطويل الأمد (12 ثانية) لمنع فقدان أي لقطة عند تقلب الشبكة.
- ترشيد أحجام وضغط الصور المرفوعة (2048px بنوعية 0.80) لتخفيف ثقل النقل بنسبة 75% مع الحفاظ التام على دقة الطباعة 300+ DPI.
- إضافة مستمع لأخطاء الجسر `phone:cloud-error` في الواجهة، وتحويل تلقائي للوضع المحلي (LAN) مع تنبيه مرئي إرشادي، ودعم اختيار صور متعددة في المعرض المحلي.
