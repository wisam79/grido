---
type: fix
scope: ai
related_files:
  - modal_ai/upscaler.py:247
  - internal/service/ai_service.go:420
  - internal/service/ai_service_test.go:538
  - frontend/src/hooks/use-ai-enhance.ts:60
  - docs/AI_ARCHITECTURE.md:40
---

إصلاح تحول خلفيات الصور المعزولة (PNG) إلى خلفية سوداء عند الترميم أو التوضيح بالذكاء الاصطناعي: دعم قناة الألفا وعزل قناع الشفافية وتكبيره بـ Lanczos4 في خادم Modal AI (upscaler.py)، وفحص الشفافية وتشفير PNG في Go (ai_service.go)، وإضافة شبكة أمان في الواجهة (use-ai-enhance.ts) تعيد تطبيق قناع الشفافية الأصلي بدقة 1:1.
