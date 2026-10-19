---
type: refactor
scope: ui
related_files:
  - frontend/src/components/ui/blocks/fluent-slider-field.tsx:174
  - frontend/src/components/ui/blocks/fluent-setting-row.tsx:37
  - frontend/src/components/editor/properties/panels/image-properties.tsx:77
  - frontend/src/components/editor/properties/element/shared/shadow-glow-section.tsx:19
---
تحسين التدرج الهرمي لطباعة الواجهة وتخفيف سُمك خطوط المنزلقات والإعدادات (Typography Hierarchy Refinement): معالجة مشكلة سقوط `font-semibold` على الوزن العريض (700 Bold) في خط Readex Pro، وتحويل تسميات الحقول والمنزلقات إلى الوزن الطبيعي `font-normal` (400 Regular) وشارات القيم إلى أرقام جدولية مونوغرافية أنيقة `tabular-nums` لإبراز عناوين الأقسام وتحقيق مظهر مكتبي راقٍ متناسق مع معايير Microsoft Fluent 2.
