---
type: fix
scope: ui
related_files:
  - frontend/src/components/editor/panels/freeform/freeform-panel-constants.ts:220
  - frontend/src/components/editor/panels/freeform/freeform-presets-tab.tsx:150
  - frontend/src/hooks/use-ai-enhance.ts:95
  - internal/service/ai_service.go:425
  - internal/service/ai_service_test.go:540
  - modal_ai/upscaler.py:250
---
امتثال حارس هندسة الألواح وتأمين شفافية PNG في معالجة الذكاء الاصطناعي: إزالة نصوص الشرح الطويلة المقتطعة في بطاقات مقاسات الورق (FreeformPresetsTab) للامتثال لفحص panel-geometry guard في Playwright E2E، وضمان حفظ قناة الشفافية Alpha Channel لصور PNG المفرغة في معالجة الذكاء الاصطناعي السحابي لمنع تحول الخلفية إلى اللون الأسود.
