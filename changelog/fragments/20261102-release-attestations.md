---
type: changed
scope: infra
related_files:
  - .github/workflows/release.yml:29
  - .agents/skills/release-deployment/SKILL.md:1
---
إضافة إثبات المنشأ المشفر (Build Provenance — sigstore) لثنائيات الإصدار في `release.yml`: خطوة `actions/attest-build-provenance@v2` مثبتة بالـSHA تربط `GridoStudio.exe` والمثبت و`Setup.exe` النهائيين بتشغيلة CI هذه تحديداً (صلاحيات `id-token: write` + `attestations: write` مُحتكمتان على مستوى الوظيفة بأقل امتياز)، بمعزل تام عن توقيع SignPath التجاري وتعمل بلا شهادة — يُتحقق بها لاحقاً بـ`gh attestation verify <file> -R wisam79/grido`. تُكمّل `grido-checksums.txt` القائم: الـchecksums يثبت سلامة الملف، والإثبات يثبت أنه خرج من هذا المستودع وتشغيلة معينة. وُثّق في مهارة release-deployment (المرجع الوحيد للمسار). التحقق: docs-gate `--strict-refs` ناجح، وتأكيد docs-gate على `SIGNPATH_API_TOKEN` (مرة واحدة) باقٍ — الإضافة لم تمسه. التشغيل الفعلي بوابة سحابية: يُتحقق عند أول وسم قادم بأن الإثبات يظهر في تبويب Attestations للإصدار.
