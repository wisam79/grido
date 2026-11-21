---
type: fix
scope: build
related_files:
  - .github/workflows/ci.yml:1
  - .github/workflows/e2e-acceptance.yml:1
  - frontend/playwright.acceptance.config.ts:1
  - frontend/vitest.config.ts:28
  - frontend/e2e-acceptance/helpers/real-app.ts:127
  - admin-web/e2e-acceptance/phone-real.spec.ts:20
  - frontend/e2e/helpers/wails-mock.ts:1
  - frontend/e2e/helpers/wails-v3-bridge.ts:593
  - frontend/src/lib/canvas/text-stroke-filter.ts:1
  - frontend/src/lib/canvas/curved-text-utils.ts:667
  - runtime_harness_e2e.go:1
  - internal/service/runtime_dialog_e2e.go:1
  - scripts/e2e/report-run.mjs:1
  - scripts/e2e/report-playwright.cjs:51
  - scripts/e2e/report-infrastructure.mjs:1
  - scripts/e2e/supabase-fixture.mjs:1
  - frontend/src/hooks/use-filter-cache.ts:1
  - admin-web/vite.config.ts:25
---
بوابة قبول سحابية شاملة على فرع اختبار معزول: حزمة المتصفح المطابق Chromium على Ubuntu (4 شاردات بعد تقليص المصفوفة بقرار المالك 2026-11-21)، ورحلات GUI مع Go/SQLite والمخرجات الفعلية، وWebView2 أصلي ومصادقة/Storage/Realtime محلية مؤقتة؛ شهادات المسارات والقدرات المحجوبة منفصلة دون نشر إنتاج.
GitHub workflow registration/job-env blockers عولجت عبرCIالمسجلعلىtestrefوإعدادمسارbinaryداخلstepدونsecrets؛ R1errorsمحفوظةبالتقريروليستقبولاًنهائياً.
تقوية fixtures والنتائج لمنع نجاح IPC غير معروف أو حفظ مشروع مختلف، وإصلاح تداخل مؤقت الكاش الذي كشفه CI؛ نتائج التنفيذ التفصيلية وSHA والعيوب/القدرات في docs/reviews/28-real-e2e-acceptance-2026-11-20.md (IN PROGRESS، لا قبول نهائي قبل التشغيل).
