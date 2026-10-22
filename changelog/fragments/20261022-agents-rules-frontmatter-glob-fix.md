---
type: fix
scope: docs
related_files:
  - .agents/rules/backend-wails-runtime.md
  - .agents/rules/database-security-authz.md
  - .agents/rules/konva-canvas-engine.md
  - .agents/rules/quality-cicd-release.md
  - .agents/rules/ui-ux-fluent.md
  - docs/DOCUMENTATION_MAP.md
---

تصحيح ترويسات YAML Frontmatter لملفات القواعد الخمسة في `.agents/rules/` من `globs:` (مصفوفة) إلى `glob:` (نصي بنمط الأقواس المجمعة)، لإصلاح خطأ فشل التحميل `cannot unmarshal !!seq into string` في محرك Antigravity، مع تحديث الرقم المرجعي لملفات Vitest في خريطة التوثيق.
