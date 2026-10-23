---
type: fix
scope: infra
related_files:
  - .github/workflows/ci.yml:171
  - .github/workflows/ci.yml:232
  - .github/workflows/ci.yml:429
  - .github/workflows/ci.yml:654
---

إلغاء تثبيت حزم `apt` الثقيلة (`libgtk-4-dev` و`libwebkitgtk-6.0-dev` و`playwright install-deps chromium`) من وظيفة الفرونت إند والشاردز الأربعة للـ E2E عبر تشغيل `wails3 generate bindings` بوضع `CGO_ENABLED=0`، واستبعاد مرآة `azure.archive.ubuntu.com` المبطّئة مع ضبط مهلات `/etc/apt/apt.conf.d/99ci-fast` في `validate-backend` و`webkit-smoke`.
