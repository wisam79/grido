---
type: fix
scope: ui
related_files:
  - frontend/test/layers-list.test.tsx:18
  - frontend/test/collage-custom-grid-tab.test.tsx:197
  - frontend/src/components/editor/properties/layers-list.tsx:558
  - frontend/src/components/editor/properties/general-settings.tsx:49
---

وُوفّقت اختبارات الحالة الفارغة للطبقات ولوحة إعدادات الورقة مع الحد الأدنى البصري المعتمد: التحقق من تسمية الأيقونة الوصولية وغياب ترويسة «مساحة العمل» بدل النصوص المرئية المحذوفة عمداً، فصار الملفان 17/17 بعد فشلهما.
