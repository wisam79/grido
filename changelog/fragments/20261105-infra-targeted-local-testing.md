---
type: feat
scope: infra
related_files:
  - .agents/AGENTS.md:21
  - .agents/rules/quality-cicd-release.md:30
  - .agents/skills/grido-qa-security-auditor/SKILL.md:78
  - scripts/agent-hook-pre-command.mjs:47
---
تحديث قواعد الوكلاء وخطافات الأمان للسماح بتشغيل الاختبارات المستهدفة الفردية محلياً (`npx --prefix frontend vitest run --root frontend <path>` أو `go test -run <Name> ./...`) مع الحفاظ التام على حظر الحزم الشاملة الثقيلة واختبارات E2E لحماية موارد الجهاز.