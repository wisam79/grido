---
type: changed
scope: infra
related_files:
  - .github/workflows/release.yml:430
  - .agents/skills/release-deployment/SKILL.md:10
---
تضمين `continue-on-error: true` في خطوة إثبات المنشأ المشفر (Attest Build Provenance) داخل `release.yml`: يتيح لخط سير النشر إكمال بناء وتوزيع حزم الإصدار حتى في المستودعات الفردية الخاصة التي يقيد GitHub عليها خدمة Sigstore، مع استمرار عمل الإثبات فورياً عند جعل المستودع عاماً أو ترقيته لمنظمة.
