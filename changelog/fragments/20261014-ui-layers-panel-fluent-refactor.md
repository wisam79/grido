---
type: fix
scope: ui
related_files:
  - frontend/src/components/editor/properties/layers-list.tsx:46
  - frontend/src/components/editor/panels/freeform/freeform-layers-tab.tsx:40
  - frontend/test/layers-list.test.tsx:21
  - frontend/src/index.css:11
---
إصلاح مشاكل تبويب الطبقات: إزالة DragOverlay المسبب لانزياح الطبقة خارج موضع المؤشر في RTL، وقفل سحب الطبقات حصرياً على المحور الرأسي Y، وإدماج أدوات التحكم داخل بطاقة السطر دون إطار عائم، وإبقاء أزرار الإظهار والقفل ظاهرة دائماً، وحل مشكلة بتر أسماء الطبقات وتحديث نمط سلة المهملات وفق معايير Fluent 2.
