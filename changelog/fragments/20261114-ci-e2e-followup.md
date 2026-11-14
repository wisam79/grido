---
type: fix
scope: ui
related_files:
  - frontend/src/components/editor/properties/multi-selection-properties.tsx:281
  - frontend/e2e/ux-keyboard.spec.ts:282
  - admin-web/e2e/ux-smoke.spec.ts:112
  - admin-web/e2e/ux-smoke.spec.ts:215
---
إصلاح إخفاقات اختبارات E2E في مسار CI: استبدال تغليف `<label>` حول `<select>` الفلاتر في `MultiSelectionProperties` بربط `htmlFor` لعدم إعادة توجيه حالة `<option value="" disabled>`، وتحديث لوحة اختبار الماسح الضوئي إلى مقاس أفقي 640×480 لتفادي التقسيم التلقائي للبطاقات المكدسة، وتمرير استجابة CSS فارغة لخطوط Google Fonts ومحاكاة بث Realtime REST (`POST /realtime/v1/api/broadcast` → `202`) داخل حارس الشبكة لاختبار دخان لوحة الإدارة.
