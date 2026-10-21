---
type: refactor
scope: ui
related_files:
  - frontend/src/components/editor/properties/color-panel.tsx:12
  - frontend/src/lib/workspace-tools.ts:37
  - frontend/src/components/editor/panels/freeform/freeform-studio-panel.tsx:79
  - frontend/src/components/editor/properties/shared-controls.tsx:24
  - frontend/src/lib/local-prefs.ts:6
  - frontend/test/workspace-tools.test.ts:68
  - frontend/e2e/studio-panels.spec.ts:40
---

حُذفت وجهة «الهوية البصرية» كلياً (الخطوط/الألوان/الخلفيات) بطلب المالك: بقيت وجهتا `content` و`paper` في الاستوديو، وحُذفت المكوّنات والبنية اليتيمة (ملخص خلفية الورقة، أحداث فتح لوحة الخصائص، تفضيلات التدرجات والخطوط، لوحات الهوية، واستخراج الألوان) مع تحديث الاختبارات وE2E. وفي شريط اللون صار للرقعة الحالية زر واحد يفتح المنتقي، وحُذفت أيقونة المنتقي المكررة، وتوزّعت العينات السريعة على العرض كاملاً بفاصل شعري وحلقة تحديد أوضح.
