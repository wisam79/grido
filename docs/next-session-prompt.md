# برومت استئناف خارطة الصقل الرئيسية — Grido Studio

> برومت حيّ لاستكمال العمل في محادثة أخرى. المصدر الحاكم هو «مؤشر الاستئناف الحي» داخل `docs/development-plan/POLISH_ROADMAP.md`؛ إذا تغيّر المؤشر، اتّبعه بدلاً من لقطة التسليم هنا.

---

استأنف العمل على خارطة الصقل الرئيسية لـ Grido Studio في `C:\projects\grido`، من «مؤشر الاستئناف الحي» في `docs/development-plan/POLISH_ROADMAP.md`، وفق البروتوكول الإلزامي في `.agents/AGENTS.md` و`.agents/rules/architecture-governance.md` و`.agents/workflows/polish-sprint.md`.

## لقطة التسليم المؤكدة

- أُغلقت `FF-01` و`FF-02` و`FF-03` و`FF-04`؛ التقدم `4/16`، والبند التالي `FF-05`.
- تنفيذ `FF-04` على `main`: الالتزام `92e26b8312ba73d36738ac2babb81dc85b8107f5`.
- CI الاعتيادي `45383702556` PASS، بما فيه الواجهة والخلفية وWindows وأجزاء Chromium الأربعة وWebKit.
- CI الكامل `45384798172` PASS، بما فيه جميع وظائف `Full CI gate (zero skipped required jobs)` المطلوبة.
- سجل الواجهة السحابي: 192 ملفاً، 2840 حالة ناجحة + حالة واحدة متخطاة؛ ليست كل الحالات ناجحة بلا استثناء.
- أدلة SHA وCI والتوثيق النهائي في الخارطة ودليل الاختبار. تحقق من `git status` و`git log`؛ لا تعتمد على برومت قديم أو فروع سابقة.
- لا تعد تنفيذ FF-01…04 ولا تفتح مهام الخطط التاريخية. لا تعدّل أو تضف إلى Git أي ملف محلي غير متتبّع مثل `3d-demo.svg` إن وُجد؛ افحص الشجرة أولاً.

## المطلوب في المحادثة الجديدة

1. نفّذ بوابة ما قبل العمل: اقرأ مؤشر الاستئناف والخريطة `docs/DOCUMENTATION_MAP.md` و`docs/features-tracker.md` و`changelog/README.md`، وشغّل `node scripts/changelog-collect.mjs`، ثم أعلن آخر بند مغلق والبند التالي وقائمة المستندات المتأثرة.
2. ابدأ `FF-05` — تهذيب الواجهة السياقية وQuickBar: إبراز بطاقة استوديو الملصقات (إعادة التحرير ونسخ SVG) في أعلى خصائص الملصق، وطي أدوات AI الفوتوغرافية عند اختيار ملصق، وإظهار إجراءات اللحظة بحسب النوع والتحديد: ضبط الكادر، تعديل الملصق، وتقنيع الصورة بالشكل.
3. افحص الكود قبل التعديل، خصوصاً:
   - `frontend/src/components/editor/properties/panels/image-properties.tsx`
   - `frontend/src/components/editor/canvas/quick-bar/quick-bar-element-section.tsx`
   - `frontend/src/components/editor/canvas/quick-bar/quick-bar-multi-selection-section.tsx`
4. أعد استخدام المصدر القائم: `requestStickerReedit` من `sticker-reedit-bus.ts`، وحالة القص الموضعي الحالية، و`getImageShapePair` من `frontend/src/lib/canvas/image-shape-fill.ts`، و`maskSelectedImageWithShape` من الستور. لا تنسخ منطق الالتقاط أو الدمج أو التراجع داخل QuickBar، ولا تضعف حراس `requireImageNodeIds` أو ملكية bitmap والمجموعات والأقفال.
5. التزم بمهارات UI/Fluent 2 وإمكانية الوصول والأداء وإدارة الحالة المرتبطة بالنطاق. احفظ المعمارية والمصدر الواحد، ودقة المصدر، وUndo الذرية؛ سياسة `fillPatternImage` بمشتق 2048px و`cutShapeType` كدليل فقط قرارات محمية.

## بروتوكول التحقق والإغلاق

- يُمنع `cd` أو full suite/coverage أو Playwright أو بناء التطبيق محلياً.
- شغّل ملفات Vitest المتأثرة منفردة ومتسلسلة، مع:
  `--maxWorkers=1 --no-file-parallelism --coverage.enabled=false`.
- الفحوص الخفيفة: `npm --prefix frontend run typecheck` و`lint` و`format:check` و`git diff --check`، واختبارات Go المستهدفة فقط إن تأثر Go.
- زامن التوثيق وجدول المهمة والمؤشر وسجل التسليم في الجلسة نفسها، وأنشئ fragment واحداً للبند، وحدّث الأعداد بالأمر الفعلي. لا تعدّل `CHANGELOG.md` يدوياً.
- يجب نجاح `node scripts/docs-gate.mjs --strict-refs` قبل الإغلاق، وإعادة فحص مصفوفة staged قبل الالتزام وبوابة الدفع قبل push.
- أفضّل تأمين كل مهمة فور إغلاقها على `main` ومراقبة CI حتى النجاح، لكن **اعرض ملخصاً واسألني قبل الالتزام والدفع لكل مهمة جديدة**؛ إذن رفع FF-04 لا يمتد إلى FF-05 أو بقية البنود.
- بعد الإذن والرفع، راقب النتائج الفعلية بـ `gh run list` و`gh run watch`، وسجّل SHA ومعرّفات CI الناجحة. ميّز الوظائف/الحالات المتخطاة وقيود العتاد عن النجاح، ولا تستنتج قبول OS/طابعة/خدمات فعلية من E2E ذات mocked Wails.
- أكمل بقية البنود بالتسلسل، مهمة واحدة في كل جولة وفق المؤشر، دون تجاوز معيار قبولها أو بدء التالية قبل اعتماد التسليم. لا تضف ميزات جانبية أو إصداراً أو tag أو نشراً أو تغييرات خدمات حية دون إذن مستقل.
