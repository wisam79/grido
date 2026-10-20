---
type: feat
scope: ui
related_files:
  - frontend/src/components/editor/panels/panel-shell.tsx:1
  - frontend/src/components/editor/panels/properties-panel.tsx:1
  - frontend/src/components/editor/properties/element-properties.tsx:1
  - frontend/src/components/editor/properties/element/element-header-badge.tsx:1
  - frontend/src/components/ui/blocks/fluent-section.tsx:1
  - frontend/src/components/ui/blocks/fluent-segmented-control.tsx:1
---
إعادة تصميم أعمدة الخصائص لجميع الحالات: رأس سياقي يعرض نوع العنصر وأبعاده بالبكسل أو عدد التحديد المتعدد، مع إجراءَي إظهار وقفل دائمين خارج منطقة التعطيل.
التبويبات الأربعة صارت نصاً + أيقونة بأسماء وصول وصفية وشريط لاصق يبقى ظاهراً أثناء التمرير، ووُحّدت هرمية الأقسام في `FluentSection` (شارة أيقونة محايدة 24px، حدود أفتح، عنوان semibold) وإيقاع المسافات بين النص والصورة والشكل والخلايا والكولاج والإعدادات العامة.
التحقق: `tsc --noEmit` و`eslint` بلا أخطاء، واختبارات تبويبات الخصائص خضراء.
