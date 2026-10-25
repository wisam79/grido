---
type: fix
scope: ui
related_files:
  - frontend/src/lib/workspace-tools.ts:295
  - frontend/src/hooks/use-workspace-panels.ts:47
  - frontend/test/workspace-tools.test.ts:154
  - frontend/test/editor-store.test.ts:141
---

تحسين تجربة مساحة العمل واللوحة اليسرى: تعيين التبويب الافتراضي للوضع الحر إلى «الطبقات» (Layers) لمعاينة وتنظيم عناصر الكانفاس، وتخفيض عتبة التخطيط الثنائي (Wide Layout) من 1440px إلى 1200px لبقاء لوحة الأدوات مستقلة يساراً ولوحة الخصائص يميناً على شاشات اللابتوب القياسية (1280px) دون إخفاء تلقائي متبادل.
