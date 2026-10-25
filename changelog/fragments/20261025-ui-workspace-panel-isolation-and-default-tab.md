---
type: fix
scope: ui
related_files:
  - frontend/src/lib/workspace-tools.ts:295
  - frontend/src/hooks/use-workspace-panels.ts:47
  - frontend/test/workspace-tools.test.ts:154
  - frontend/test/editor-store.test.ts:141
---

تحسين تجربة مساحة العمل واللوحة اليسرى: تعيين التبويب الافتراضي للوضع الحر إلى «الطبقات» (Layers) لمعاينة وتنظيم عناصر الكانفاس فور فتح الوضع الحر، مع تثبيت عتبة التخطيط القياسية (Standard Layout عند 1440px) لحماية مساحة الكانفاس الواسعة (>600px) ومنع انحشار الألواح على شاشات اللابتوب القياسية (1280px).
