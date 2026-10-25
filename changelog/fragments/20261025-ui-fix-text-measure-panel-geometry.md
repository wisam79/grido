---
type: fix
scope: ui
related_files:
  - frontend/src/components/editor/properties/panels/text/text-type-tab.tsx:143
  - frontend/e2e/text-measure.spec.ts:10
---

إصلاح اختبارات E2E لقياس النصوص وهندسة ألواح الخصائص: استبدال شبكة `grid-cols-[4fr_3fr]` بأزرار مرنة `flex` للامتثال لمدقق استواء شبكات الألواح الجانبية، وتحديث خطوات ضبط حجم الخط في اختبارات قياس النص الحقيقي للتعامل مع مكون `FontSizeField` الرقمي الجديد بدلاً من القائمة المنسدلة القديمة.
