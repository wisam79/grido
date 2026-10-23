---
type: fix
scope: infra
related_files:
  - .github/workflows/ci.yml:133
  - .github/workflows/ci.yml:235
  - .github/workflows/ci.yml:386
  - .github/workflows/ci.yml:619
---

تحصين خطوات تثبيت حزم لينكس في الـ CI بإضافة مهلات شبكة صارمة (15 ثانية و3 محاولات) لأوامر `apt-get` لمنع تعليق خوادم مرايا أوبونتو، وتخفيض مهلة E2E إلى 20 دقيقة.
