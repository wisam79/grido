---
type: fix
scope: ui
related_files:
  - frontend/src/components/editor/properties/panels/shape-properties.tsx:285
  - frontend/src/components/editor/properties/collage-settings.tsx:110
  - frontend/test/element-properties-tabs.test.tsx:68
  - frontend/e2e/single-photo.spec.ts:28
---
توحيد تسمية سلايدر استدارة الزوايا على «الزوايا» في خصائص الأشكال والكولاج (كما في خصائص الصور) منع تكرار «استدارة» داخل أقسام «الحدود والاستدارة» و«المسافات والاستدارة»، مع تحديث اختباري الوحدة وE2E اللذين كانا يتوقعان التسمية القديمة.
