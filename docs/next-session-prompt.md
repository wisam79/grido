# برومت الاستئناف — Grido Studio

> **المرجع التنفيذي:** [`docs/development-plan/POLISH_ROADMAP.md`](development-plan/POLISH_ROADMAP.md) (لا مهمة تالية تلقائية؛ البنود العشرة `PR` / `ST` / `CP` مؤجلة بعد إغلاق `FF-01…FF-06` وإلغاء `AC-01` بطلب المالك).

## قبل بدء أي عمل تطويري
1. راجع `git status` و[`POLISH_ROADMAP.md`](development-plan/POLISH_ROADMAP.md) و[`DOCUMENTATION_MAP.md`](DOCUMENTATION_MAP.md)، وشغّل `node scripts/changelog-collect.mjs`.
2. نفّذ طلب المالك ضمن أصغر نطاق لازم دون تفعيل بنود مؤجلة أو استئناف فحوص ملغاة.
3. التزم بحظر `cd` وPlaywright المحلي وحزم الاختبار الكاملة (الفحوص المسموحة محلياً: `lint`, `typecheck`, `format:check`, `docs-gate`, والاختبارات المستهدفة لملف واحد).
4. أنشئ **fragment واحداً** في `changelog/fragments/` عند تعديل الكود، وتحقق من `node scripts/docs-gate.mjs --strict-refs`؛ واسأل المالك قبل `commit`/`push`.
