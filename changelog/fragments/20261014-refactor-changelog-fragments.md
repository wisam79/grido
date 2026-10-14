---
type: refactor
scope: docs
related_files:
  - CHANGELOG.md:1
  - CHANGELOG_ARCHIVE.md:1
  - changelog/README.md:1
  - scripts/release.mjs:1
  - scripts/docs-gate.mjs:1
  - scripts/changelog-collect.mjs:1
---

تحويل سجل التغييرات إلى معمارية Fragments — تقسيم CHANGELOG إلى نشط (آخر 5 إصدارات) + أرشيف، وإنشاء changelog/fragments/ بسكيما صارمة (type/scope/related_files)، وتحويل release.mjs ليجمع الـ fragments تلقائياً عند الترفيع مع تقليم الأقدم إلى الأرشيف.
