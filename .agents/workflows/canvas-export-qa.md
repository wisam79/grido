# خطة وإجراءات فحص محرك الرسم وجودة التصدير (Canvas & Export QA Workflow)

> **مصدر الحقيقة الوحيد:** [مهارة `konva-canvas-and-export`](../skills/konva-canvas-and-export/SKILL.md) (القسم 3).

## متى يُشغَّل هذا المسار
- بعد تعديل يمس محرك Konva أو كاش الفلاتر أو التصدير 300+ DPI أو خطوط القص والنزيف.
- عند الطلب الصريح بأمر `/canvas-export-qa`.

## التنفيذ
1. راجع القسم 3 من المهارة المرجعية (معاملة `captureStageBlob`، قيد خطوط القص، تطابق المعاينة، وفحص `test-fixtures/print-rgba/generate-fixtures.mjs --verify`).
2. التحقق الشامل سحابي عبر GitHub Actions، والفحوص المحلية الخفيفة/المستهدفة فقط.
3. أي انحراف مكتشف يُوثَّق بتصحيح مؤرَّخ في `BUGS_REPORT.md` مع تأكيد `docs-gate` عند الإغلاق.
