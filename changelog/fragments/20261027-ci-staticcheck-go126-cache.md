---
type: fix
scope: build
related_files:
  - .github/workflows/ci.yml:265
---

تحديث إصدار staticcheck ومفتاح كاشه في CI ليتوافق مع Go 1.26: ترقية `staticcheck` إلى `v0.8.2` (الداعمة رسمياً لـ Go 1.26+) وتضمين `${{ env.GO_VERSION }}` في مفتاح الكاش لمنع استرجاع ثنائيات مبنية بإصدار Go سابق.
