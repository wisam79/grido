# خطة وإجراءات ترفيع وإطلاق الإصدارات (Release Deployment Workflow)

> **مصدر الحقيقة الوحيد:** [مهارة `grido-qa-and-release`](../skills/grido-qa-and-release/SKILL.md) (القسم 2).

## متى يُشغَّل هذا المسار
- عند اعتماد المالك إصداراً جديداً (`node scripts/release.mjs patch`) أو بأمر `/release-deployment`.

## التنفيذ
1. تأكد من نجاح آخر دورة CI على `main` (`gh run list --limit 3`) ثم مرّر الفحوص المحلية الخفيفة (`docs-gate --strict-refs`, `format:check`, `lint`, `typecheck`, `gofmt -l`).
2. نفّذ `node scripts/release.mjs <bump>` ثم ادفع مع الوسوم (`git push origin main --tags`) وراقب `gh run watch` حتى نجاح 100%.
