---
type: perf
scope: canvas
related_files:
  - internal/service/phone_bridge_service.go:121
  - internal/service/media_thumbnail.go:125
  - internal/service/embedded/phone_camera_page.html:562
  - admin-web/src/pages/PhoneCameraPage.tsx:472
  - frontend/src/components/editor/system/use-phone-bridge.ts:68
  - frontend/src/lib/canvas/image-dimensions.ts:41
---
تسريع انتقال الصور من كاميرا الهاتف إلى الكانفاس (السحابي والمحلي LAN): ضغط وتحجيم الصور على الهاتف حتى 2048px مع إلغاء إعادة الضغط المزدوج في الوضع السحابي وإصلاح مصافحة الاقتران وفك حجب حلقة الـ WebSocket، وإضافة مسار النسخ الذري المباشر في `EnsureThumbnail` للصور الموجهة ضمن السقف دون إعادة فك وترميز البكسلات، وحقن الأبعاد المسبقة مباشرة مع حدث `phone:photo-received` لتفادي جولات IPC الإضافية قبل الإدراج.
