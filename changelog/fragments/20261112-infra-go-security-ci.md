---
type: security
scope: infra
related_files:
  - .github/workflows/ci.yml:12
  - .github/workflows/release.yml:109
  - frontend/test/sticker-studio.test.tsx:403
---
رفع أداة CI والإصدار إلى Go 1.26.11 لإغلاق GO-2026-6859 في `net/http`، وتثبيت مهلة مستهدفة لاختبار عزل معاينة الخط الذي نجح منفرداً وتذبذب فقط تحت التغطية الكاملة.
