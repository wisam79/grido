---
type: fix
scope: ui
related_files:
  - frontend/scripts/download-fonts.js:14
  - frontend/src/index.css:11
  - frontend/src/offline-fonts.css:7
  - .github/workflows/release.yml:43
---

تضمين خط «ريدكس برو» (Readex Pro) محلياً داخل سكربت تنزيل الخطوط وحزمة offline-fonts.css، وإزالة خط المراعي نهائياً من سلاسل الخطوط في index.css، مع تسريع خط سير بناء وإصدار مثبت الويندوز من 20 دقيقة إلى 5 دقائق عبر تحسين الكاش وتفادي تكرار الاختبارات.
