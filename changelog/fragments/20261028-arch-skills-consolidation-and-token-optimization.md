---
type: refactor
scope: docs
related_files:
  - .agents/AGENTS.md:43
  - .agents/skills/wails-v3-runtime-mastery/SKILL.md:1
  - .agents/skills/supabase-security-and-migrations/SKILL.md:1
  - .agents/skills/grido-qa-security-auditor/SKILL.md:1
  - docs/plans/sticker-studio-v2-plan.md:481
---
ترشيق وتوحيد معمارية المهارات التخصصية للوكلاء لتقليص استهلاك التوكنز: تقليص عدد المهارات من 25 إلى 18 مهارة مركزية عبر استئصال الازدواجية وحذف المهارات الزائدة (`fluent-design-system` لصالح `fluent2-design-system`)، ودمج مهارات Wails المتفرقة (المزامنة متعددة النوافذ، تدفق الأصول، تكامل ويندوز، ومراجع الانتقال) في مهارة `wails-v3-runtime-mastery` الشاملة، ودمج إجراءات الهجرات والتدقيق الأمني في `supabase-security-and-migrations` و`grido-qa-security-auditor` مع إبقاء أوامر `/database-migration` و`/security-audit`، وتحديث فهرس الدستور الأساسي في `AGENTS.md` بتصنيف هرمي سداسي واضح وروابط تشعبية نشطة.
