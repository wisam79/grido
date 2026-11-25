# 🗺️ خريطة التوثيق الإلزامية — Grido Studio (Documentation Map & Sync Gate)

> **مصدر الحقيقة الوحيد لنظام التوثيق:** ما نوثّقه، وأين، وما تفرضه البوابة البرمجية [`scripts/docs-gate.mjs`](../scripts/docs-gate.mjs) و[`changelog/README.md`](../changelog/README.md).
> الأرشيف التاريخي للجلسات السابقة مفصول في [`docs/archive/documentation-map-history.md`](archive/documentation-map-history.md).

**آخر تحديث:** 2026-11-25 · **القاعدة الحاكمة:** `.agents/AGENTS.md` · **السجل:** `changelog/README.md`

---

## 1. جرد التوثيق (Doc Inventory)

| المستند / المجلد | الدور | متى يُحدَّث |
|---|---|---|
| `README.md` | واجهة المشروع: الميزات الظاهرة، المتطلبات، وأوامر البناء | عند تغيّر ميزة ظاهرة للمستخدم أو متطلبات/أوامر البناء |
| `CHANGELOG.md` | سجل التغييرات النشط (آخر 5 إصدارات + Unreleased) — **لا يُعدَّل يدوياً** | يُبنى تلقائياً من `changelog/fragments/` عند `scripts/release.mjs` |
| `CHANGELOG_ARCHIVE.md` | أرشيف الإصدارات قبل v1.14.6 | تلقائياً عند تجاوز سقف 5 إصدارات في `CHANGELOG.md` |
| `changelog/fragments/` | ذاكرة الوكيل: ملف واحد لكل جلسة كود (`type/scope/related_files`) | **مع كل تعديل كود سلوكي** |
| `changelog/README.md` | دليل وسكيمة Fragments | عند تعديل آلية Fragments |
| `docs/DOCUMENTATION_MAP.md` | هذا الملف: الجرد + مصفوفة المزامنة + الأرقام المرجعية `docs-metrics` | عند إضافة/حذف مستند في `docs/` أو تغيّر عدد ملفات الاختبار |
| `docs/developer_guide.md` | المعمارية الحالية لـ Go وReact وKonva ونظام الطباعة | عند تغيّر معمارية نظام فرعي أو عقد IPC أساسي |
| `docs/testing_guide.md` | هرم الاختبارات وجسر Wails v3 وأوامر التشغيل وقواعد الاختبار | عند تغيّر إعدادات/أوامر الاختبارات أو الجسر |
| `docs/AI_ARCHITECTURE.md` | مسار الذكاء الاصطناعي (Modal CPU / Supabase / الحصص) | عند تغيّر مسار AI أو حصصه |
| `docs/features-tracker.md` | مصفوفة الحالة الحية + الفجوات + القرارات المحمية (`D-1…D-7`) | عند تغيّر حالة ميزة رئيسية أو قرار محمي |
| `docs/next-session-prompt.md` | برومت استئناف مختصر عند تغيّر التوجه العام | عند تغيّر الأولويات أو التوجه العام |
| `SECURITY_NOTICE.md` | سجل الحوادث الأمنية (إلحاق مؤرّخ فقط) | عند حادثة/تسريب/تدوير أسرار |
| `BUGS_REPORT.md` | سجل العيوب التاريخي (إلحاق فقط) | عند إضافة تصحيح مؤرَّخ لبند مرصود |
| `.agents/AGENTS.md` | الدستور المختصر وقواعد الوكلاء العامة | عند تغيّر قاعدة حاكمة أو مهارة |
| `.agents/rules/` | 6 ملفات قواعد تخصصية محملة بـ triggers | عند إضافة/تعديل قاعدة تخصصية |
| `.agents/skills/` | 8 مهارات مركّزة في مجالات المشروع (`grido-ui-system`، `konva-canvas-and-export`، `wails-desktop-build`، `grido-qa-and-release`، `zustand-state-patterns`، `supabase-security-and-migrations`، `opencv-mediapipe-ai-tuner`، `grido-architecture-navigator`) | عند تغيّر تفصيل تنفيذي داخل مجال المهارة |
| `.agents/agents/` | تعريفات الوكلاء الفرعيين التخصصيين | عند تعديل أدوار الوكلاء |
| `.agents/workflows/` | مسارات التشغيل القياسية (`/polish-sprint`, `/canvas-export-qa`, `/database-migration`, `/release-deployment`, `/security-audit`) | عند تعديل مسار تشغيلي |
| `docs/archive/` | أرشيف السجلات التاريخية المفصولة عن المستندات الحية (`features-history.md`, `testing-history.md`, `developer-history.md`, `documentation-map-history.md`) | عند تدوير السجلات القديمة لتخفيف الملفات الحية |
| `docs/reviews/` | تقارير التدقيق المؤرَّخة | عند إضافة تقرير تدقيق جديد أو تعليم بند ✅ |
| `docs/development-plan/` | [`POLISH_ROADMAP.md`](development-plan/POLISH_ROADMAP.md) (المؤشر الحيّ) + [`TASKS.md`](development-plan/TASKS.md) التاريخي | عند تغيّر حالة مهمة نشطة أو المؤشر الحي |
| `docs/plans/` | خطط التنفيذ المحددة زمنياً | عند اعتماد خطة جديدة أو إغلاقها |
| `docs/ux-acceptance/` | حزمة وقالب قبول UX | عند تغيّر إجراءات/قياسات القبول |
| `docs/print-acceptance/` | حزمة وقالب قبول الطباعة الفيزيائية | عند تغيّر إجراءات/نتائج قبول الطابعة |
| `admin-web/design.md` | دستور تصميم صفحة الهبوط ولوحة الإدارة | عند تغيّر هوية أو تصميم الويب |
| `promo/remotion/README.md` | دليل الفيديو المحلي (داخل `promo/` المستثنى من Git) | عند تعديل إخراج الفيديو المحلي |

---

## 2. مصفوفة المزامنة المختصرة (Fragment-First Matrix)

> **المبدأ:** لا تُكرّر وصف نفس التغيير في 4 ملفات؛ الـ `fragment` هو السجل اليومي الوحيد للجلسة.

| نوع التغيير | التوثيق المطلوب في نفس الجلسة |
|---|---|
| أي تغيير كود روتيني / إصلاح / صقل | `changelog/fragments/YYYYMMDD-<scope>-<slug>.md` واحد فقط (+ سطر في `POLISH_ROADMAP.md` إن كان ضمن الخارطة) |
| إضافة/حذف ملف اختبار أو مستند `docs/*.md` | `changelog/fragments/` + تحديث `docs-metrics` أو الجرد في هذا الملف |
| ميزة ظاهرة جديدة للمستخدم أو تغيير بناء/بيئة | `changelog/fragments/` + `docs/features-tracker.md` + `README.md` |
| تغيير معماري كبير في Go/IPC أو مسار AI | `changelog/fragments/` + القسم المعني في `docs/developer_guide.md` أو `docs/AI_ARCHITECTURE.md` |
| تغيير هجرة/RLS/أمان Supabase | `changelog/fragments/` + `.agents/skills/supabase-security-and-migrations/SKILL.md` (+ `SECURITY_NOTICE.md` عند ثغرة حيّة) |
| تغيير قاعدة أو مهارة أو حذف/نقل ملف مرجعي | تحديث المرجع عبر `git grep` + `node scripts/docs-gate.mjs --strict-refs` |

---

## 3. البوابات الثلاث (Mandatory Gates)

1. **قبل البدء (Pre-Work):** للمهام التطويرية راجع `docs/development-plan/POLISH_ROADMAP.md` وشغّل `node scripts/changelog-collect.mjs` عند الحاجة؛ تحقّق من المسارات بالبحث لا من الذاكرة، ولا تنقض قراراً محمياً في `docs/features-tracker.md` بلا إذن صريح.
2. **قبل الكومت (Pre-Commit):** يُفرض عبر `.husky/pre-commit` و`.husky/commit-msg`:
   - `node scripts/docs-gate.mjs --strict-refs` (يفحص `docs-metrics` + الجرد + وجود `fragment` بسكيمة سليمة + مراجع `.agents/` + `53` تأكيداً في `CODE_ASSERTIONS`).
   - `lint-staged` / `npm --prefix frontend run format:check` و`lint` (`--max-warnings 0`) + `gofmt -l` + Conventional Commits.
3. **قبل الدفع وفي الـ CI (Pre-Push & CI):** `node scripts/docs-gate.mjs --push` (عبر `.husky/pre-push`) + خطوة `Documentation Gate` في `.github/workflows/ci.yml`.

---

## 4. الأرقام المرجعية (Baseline Metrics)

البلوك التالي يُفحص آلياً عبر `scripts/docs-gate.mjs` (عدد ملفات حتمي):

```docs-metrics
vitest_test_files=193
e2e_spec_files=32
go_test_files=69
docs_files=6
```

| المؤشر | القيمة الحالية / المرجع | أمر التحقق |
|---|---|---|
| حالات Vitest | وفق آخر CI كامل (`45420018601` / `45384798172`) | `npm --prefix frontend run test` (في CI) |
| حالات E2E | `32` ملف مواصفة (`chromium` + `firefox` + `webkit`) | `npx playwright test --list` (في CI) |
| اختبارات Go | `69` ملفاً (`internal/` + الجذر) | `go test ./internal/... -list "^Test"` |
| حصص AI اليومية (UTC) | `free 5` / `pro 15` / `enterprise 50` | `internal/service/ai_service.go` + `frontend/src/lib/ai/quota.ts` |

---

## 5. قواعد الانحراف والتحقق الآلي

- **الأرشيف لا يُعاد كتابته:** `CHANGELOG.md` (يُبنى بـ`scripts/release.mjs`), `CHANGELOG_ARCHIVE.md`, `BUGS_REPORT.md`, `docs/reviews/*`, و`docs/archive/*`.
- **تأكيدات الكود (`CODE_ASSERTIONS`):** لا يُحذف تأكيد أو يُخفّف صامتاً لإسكات فشل في `scripts/docs-gate.mjs`.

```bash
node scripts/docs-gate.mjs --strict-refs   # الفحص الكامل قبل الكومت
node scripts/docs-gate.mjs --push          # فحص الكومتات غير المدفوعة
node scripts/changelog-collect.mjs         # ملخص fragments غير المُصدرة
```

> مفتاح الطوارئ `GRIDO_DOCS_GATE=off` للحالات المبرَّرة فقط مع ذكر السبب في رسالة الكومت.

<!-- docs-gate:ignore-refs build/bin/, build/windows/nsis/, frontend/wailsjs/runtime/runtime (مسارات مخرجات بناء لا توجد قبل البناء + مرجع استيراد runtime) -->
