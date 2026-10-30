---
type: fix
scope: print
related_files:
  - frontend/src/lib/export/export-canvas-collage.ts:157
  - frontend/test/export-utils.test.ts:53
---
إضافة حارس أمان لدالة ctx.clip في تصدير الكانفاس لتفادي الاستدعاء عند غيابها في بيئات الاختبار والمحاكاة، وإضافة دالة clip إلى سياق المحاكاة في اختبارات التصدير.
