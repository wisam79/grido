---
type: fix
scope: canvas
related_files:
  - frontend/src/lib/schema.ts:178
  - frontend/src/lib/io/project-hydrator.ts:150
  - frontend/src/components/editor/properties/slot-properties.tsx:844
  - frontend/src/components/editor/toolbar/toolbar-selection-tools.tsx:104
  - frontend/src/hooks/use-keyboard-shortcuts.ts:502
  - internal/service/print_image_pipeline.go:572
---
إصلاح سبعة عيوب في وضع الكولاج: حفظ التباعد الصفري وصيغة PNG، وضبط القص والتراجع، وعزل أوامر الخانات عن العناصر الحرة، وتصحيح إزاحة الأسهم مع الدوران والقلب، وتطبيع EXIF قبل قص الطباعة في Go. أُضيفت حالات انحدار داخل ملفات الاختبارات القائمة.
