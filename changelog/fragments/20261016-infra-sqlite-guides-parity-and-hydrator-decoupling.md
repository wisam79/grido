---
type: refactor
scope: infra
related_files:
  - internal/core/domain/project.go:41
  - internal/repository/db_test.go:27
  - frontend/src/lib/io/project-hydrator.ts:89
  - frontend/src/lib/io/project-serializer.ts:240
  - frontend/src/lib/store/slices/core-slice.ts:373
---
**توافق حفظ خطوط الإرشاد في قاعدة البيانات (خلفية):** إضافة الحقول التسعة لمساطر وخطوط الإرشاد وهوامش القص للطباعة (`ShowRuler`, `RulerUnit`, `UserGuides`, `ShowUserGuides`, `LockUserGuides`, `ShowBleedGuides`, `BleedMarginMM`, `SafeMarginMM`, `CutShapeType`) إلى هيكل `domain.Project` في Go وقاعدة بيانات SQLite مع فحص حفظها واسترجاعها التام في اختبارات `db_test.go` وتحديث ربطات TypeScript المناظرة، مما يضمن بقاء خطوط الإرشاد وهوامش القص عند الحفظ في مكتبة المشاريع المحلية.

**تجريد مهيئ ومطهر المشاريع (واجهة):** استخراج أكثر من 285 سطراً من منطق التحقق والتطهير وتفريد المعرفات وتسوية الكولاج من `core-slice.ts` إلى وحدة نقية مستقلة `frontend/src/lib/io/project-hydrator.ts`، مع تعزيز التحويل الثنائي في `project-serializer.ts` واختبارات شاملة في `project-serializer.test.ts`، مما يقلص حجم `core-slice.ts` بنسبة 44% ويعزل منطق تهيئة المشاريع ليصبح قابلاً للاختبار البرمجي النقي.
