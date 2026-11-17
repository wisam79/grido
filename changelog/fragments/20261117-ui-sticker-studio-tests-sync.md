---
type: fix
scope: ui
related_files:
  - frontend/test/App.test.tsx:306
  - frontend/test/sticker-studio.test.tsx:385
  - frontend/e2e/studio-panels.spec.ts:39
---
مواءمة اختبارات لوح الاستوديو الافتراضي («الطبقات») ومسار فتح «استوديو الملصقات» المباشر في `App.test.tsx` و`studio-panels.spec.ts` مع ضبط مهلة اختبارات حوار الملصقات وتنظيفها في `sticker-studio.test.tsx` لتلافي انتهاء المهلة على CI.
