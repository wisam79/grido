---
type: fix
scope: ui
related_files:
  - frontend/src/components/editor/dialogs/phone-bridge-dialog.tsx:101
  - frontend/src/components/editor/system/use-phone-bridge.ts:28
  - frontend/src/components/editor/toolbar/toolbar-file-ops.tsx:280
  - internal/service/phone_bridge_service.go:180
---
إصلاح انقطاع جلسة جسر كاميرا الهاتف عند إغلاق نافذة الـ QR لتمكين المصور من رؤية الكانفاس والتقاط الصور، مع إضافة مؤشر نشط في شريط الأدوات وزر إيقاف صريح، والتقدم التلقائي بين خانات الكولاج عند استلام الصور.
