---
type: refactor
scope: ui
related_files:
  - frontend/src/components/editor/properties/shared-controls.tsx:634
  - frontend/src/components/editor/properties/general/canvas-dimensions-panel.tsx:464
  - frontend/src/components/ui/blocks/fluent-segmented-control.tsx:24
  - frontend/src/components/ui/blocks/fluent-setting-row.tsx:36
  - frontend/src/components/editor/properties/general-settings.tsx:33
---
ترتيب بصري أنيق لصفوف الخصائص: إزالة «لون مخصص» + أيقونة الفرشاة من أداة لون الخلفية (بقيت الرقعة والقيمة والقطارة)، ونمط «حقل» مؤطّر للمبدّلات المدمجة داخل صف الحقول بدل التبويب العاري، وإزالة تكرار وحدة القياس داخل حقلي العرض والارتفاع، وجعل وصف الصف يتبع عنوانه بدل أن يُدفع إلى الطرف المقابل.
