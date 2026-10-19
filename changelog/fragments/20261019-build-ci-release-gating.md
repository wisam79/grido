---
type: fix
scope: build
related_files:
  - .github/workflows/release.yml:31-100
  - .github/workflows/release.yml:287-334
  - .github/workflows/release.yml:396-420
  - internal/service/zip.go:13-22
  - internal/service/zip.go:66-86
  - internal/server/asset_server.go:191-210
  - internal/server/dpi_patch.go
  - internal/repository/media_cleanup.go:316-322
  - internal/service/session_manager.go:102-105
  - internal/service/auth_flows.go:83,185,257,345
  - internal/service/license_service.go:305
---
إغلاق بوابة النشر: لا يُنشَر إصدار على تزام سقطت عليه دورة CI (خطوة "بوابة صحة CI" قبل الرفع، مع مهلة وفشل صريح عند السقوط)، وإزالة البديل الوهمي للمثبت (فشل صريح عند غياب مثبت NSIS)، ونقل أسرار SignPath إلى خطوات التوقيع وحدها مع ظهور مرة واحدة في الملف، وتوليد توقيع Ed25519 لبصمات التحديث (grido-checksums.txt.sig)، وفشل صريح عند غياب المخرجات الموقّعة. إصلاحات back-end: استبعاد ملف الأرشيف الهدف من نفسه عند ضغط سجلات الدعم مع إرجاع أخطاء الإغلاق، وحقن كثافة DPI (pHYs/JFIF) لصادرات PNG/JPEG عبر /api/save-file، وحماية التنظيف اليدوي للوسائط بحد أدنى للعمر 24 ساعة، ومسح معرّف الجلسة المحلي عند فشل الحفظ بعد الحجز الخادمي، وتجنب تسجيل استجابات المصادقة والجسم الخام لمسار الذكاء الاصطناعي في السجلات.
