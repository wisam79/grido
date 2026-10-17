---
type: fix
scope: infra
related_files:
  - internal/service/phone_bridge_service.go:561
  - admin-web/src/pages/PhoneCameraPage.tsx:368
  - internal/service/updater.go:453
  - frontend/src/components/editor/system/update-notifier.tsx:111
---
منع تكرار استلام صور جسر الهاتف عبر سجل تتبع الكائنات المعالجة في رنتايم Go، وتسريع الالتقاط الفوري (0ms) من إطار الفيديو المباشر بضغط 0.85 وأبعاد 2560px، وإصلاح بث وقراءة تقدم تحميل تحديثات التطبيق.
