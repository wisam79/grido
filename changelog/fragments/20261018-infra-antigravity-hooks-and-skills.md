---
type: feat
scope: infra
related_files:
  - .agents/hooks.json:1
  - scripts/agent-hook-pre-command.mjs:1
  - scripts/agent-hook-session-start.mjs:1
  - .agents/skills/canvas-export-qa/SKILL.md:1
  - .agents/skills/database-migration/SKILL.md:1
  - .agents/skills/release-deployment/SKILL.md:1
  - .agents/skills/security-audit/SKILL.md:1
  - .agents/AGENTS.md:20
---
تفعيل بيئة Antigravity الحديثة بإنشاء خطافات دورة الحياة البرمجية (.agents/hooks.json) لحظر أوامر cd وتشغيل Playwright محلياً وتجاوز الـ hooks آلياً، وترقية مسارات العمل القديمة إلى مهارات Skills تدعم أوامر السلاش المباشرة.
