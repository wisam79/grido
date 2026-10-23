---
type: fix
scope: infra
related_files:
  - .github/workflows/ci.yml:156
  - .github/workflows/ci.yml:234
  - .github/workflows/ci.yml:418
  - .github/workflows/ci.yml:646
---

إلغاء تثبيت حزم `apt` الثقيلة (`libgtk-4-dev` و`libwebkitgtk-6.0-dev` و`playwright install-deps chromium`) من وظيفة الفرونت إند والشاردز الأربعة للـ E2E عبر تثبيت وتشغيل `wails3` بوضع `CGO_ENABLED=0` (مفتاح كاش `cgo0-v2`)، واستبعاد مرآة `azure.archive.ubuntu.com` المبطّئة مع ضبط مهلات `/etc/apt/apt.conf.d/99ci-fast` في `validate-backend` و`webkit-smoke`.
