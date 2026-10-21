---
type: refactor
scope: infra
related_files:
  - .editorconfig:1
  - .nvmrc:1
  - .gitattributes:1
  - scripts/commit-msg-lint.mjs:1
  - scripts/docs-gate.mjs:322
  - .husky/commit-msg:1
  - frontend/eslint.config.js:10
  - frontend/src/components/ui/blocks/fluent-slider-field.tsx:4
  - frontend/package.json:6
  - .github/workflows/ci.yml:70
  - docs/testing_guide.md:134
  - docs/DOCUMENTATION_MAP.md:77
---

اعتماد حزمة معايير الكود P0: توحيد التنسيق بـ`.editorconfig` وPrettier وgofmt، وتثبيت إصدار Node في `.nvmrc` يقرأه CI، وتعزيز ESLint بترتيب الاستيراد (`import-x/order`) واستيراد الأنواع الصريح ومنع المتغيرات غير المستخدمة و`no-console` خارج sink التسجيل، وإلزام Conventional Commits عبر خطاف `commit-msg`. أُضيفت بوابتا Prettier وgofmt إلى CI، ونُظّف الكود الميت الناتج عن تفعيل القواعد — بلا تغيير سلوكي في التطبيق. كما استُثنيت المسارات المُولَّدة والمُتجاهَلة من Git من فحص مراجع المسارات في الوضع الصارم `--strict-refs` فلا تغلق البوابةُ الصارمةُ الكومتَ بسبب مسارات لا وجود لها في المستودع.
