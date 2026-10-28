---
type: feat
scope: canvas
related_files:
  - frontend/src/lib/canvas/collage-slot-content.ts:1
  - frontend/src/lib/export/collage-preflight.ts:1
  - frontend/src/lib/store/slices/collage-slice.ts:1
  - frontend/src/lib/io/project-serializer.ts:1
  - internal/service/autosave_service.go:1
  - internal/core/domain/project.go:1
---

تحسين شامل لبيئة وسير عمل الكولاج وسلامة البيانات: نقل حزمة تعديلات الصور كاملة مع الصورة عند إعادة الترتيب والفرز دون تصفيرها، استبدال ذري مع لقطة تاريخ واحدة لمنع تضخم سجل التراجع، مساواة حفظ المكتبة في SQLite بحفظ ملف المشروع JSON عبر حقل `EditorState` لحفظ أبعاد وخلفيات كلا الوضعين، إضافة محرك الفحص المسبق `collage-preflight` لمنع التصدير الناقص أو الصور التالفة والتنبيه بالدقة المنخفضة، دعم حفظ الصور الفائضة في قائمة الانتظار، وتمكين التحديد المتعدد واختصارات لوحة المفاتيح المخصصة للكولاج.
