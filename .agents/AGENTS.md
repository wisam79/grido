# Grido Studio — دستور وقواعد الوكلاء (Master Project Constitution)

> وثيقة حاكمة مختصرة للعمل في Grido Studio. القواعد التخصصية في `.agents/rules/`، والتفاصيل العملية في 8 مهارات مركّزة تحت `.agents/skills/`.

---

## 1. هوية المشروع والتقنيات
- **التطبيق:** تطبيق سطح مكتب للطباعة والاستوديوهات (Windows / macOS / Linux).
- **الواجهة:** React 19 + TypeScript + Vite + Tailwind CSS v4 + Zustand v5 + Fluent 2 (`frontend/src`).
- **الكانفاس:** Konva + React-Konva للعرض التفاعلي والتصدير 300+ DPI.
- **الباك إند:** Go 1.26 + Wails v3 (`v3.0.0`) + SQLite (`CGO_ENABLED=1`).
- **السحابة وAI:** Modal CPU فقط (`modal_ai/upscaler.py` — YuNet + Real-ESRGAN 2x + CodeFormer ONNX؛ 180s Go / 200s واجهة بلا إعادة محاولة تلقائية) + Supabase Auth & RPC (تفاصيل: `.agents/skills/opencv-mediapipe-ai-tuner/SKILL.md` و`docs/AI_ARCHITECTURE.md`).
- **الويب والإدارة:** React 19 + TypeScript + Vite + Tailwind CSS v4 (`admin-web/src`).

---

## 2. الثوابت الأمنية والمعمارية المطلقة
1. **حظر `cd` قطعياً:** لا تستخدم `cd` في الصدفة؛ استخدم `Cwd` أو المسارات الكاملة (محمي في `.agents/hooks.json`).
2. **CI أولاً + اختبارات مستهدفة محلياً:** يُمنع تشغيل Playwright E2E أو الحزم الشاملة أو `--coverage` أو محاكيات البناء محلياً. المسموح محلياً: `lint` و`typecheck` و`format:check` و`docs-gate` والاختبارات المستهدفة لملف واحد فقط (`npx vitest run <file>` أو `go test -run <Test> ./internal/...`). التحقق الشامل يتم في GitHub Actions (`gh run list` / `gh run watch`).
3. **الكتابة الذرية في Go:** أي حفظ تكوين/مشروع/تصدير يمر بملف `.tmp` + `defer os.Remove(tmp)` + `f.Sync()` قبل `os.Rename`.
4. **لا أسرار مشتركة في الثنائي:** التوثيق السحابي يعتمد حصراً على توكن المستخدم (`Authorization: Bearer <JWT>`).
5. **لا إعادة كتابة من الصفر:** التطوير تراكمي فوق محرك React + Konva + Go الحالي.
6. **لا ازدواجية بلا مبرر:** وحّد المنطق المشترك في مصدر حقيقة واحد واحذف الكود الميت بلا مستوردين.
7. **مسار خطي على `main`:** لا فروع معلقة؛ التطوير الافتراضي مباشر ومستمر على `main`.

---

## 3. خريطة القواعد التخصصية (`.agents/rules/`)
| القاعدة | التفعيل | التركيز |
|---|---|---|
| [`.agents/rules/architecture-governance.md`](file:///c:/projects/grido/.agents/rules/architecture-governance.md) | `always_on` | الحوكمة، الحدود الطبقية، عدم الازدواجية، استئناف الصقل |
| [`.agents/rules/ui-ux-fluent.md`](file:///c:/projects/grido/.agents/rules/ui-ux-fluent.md) | `glob` (الواجهة والويب) | Fluent 2، التوكنز، الحوارات، الاختصارات، الوصولية |
| [`.agents/rules/konva-canvas-engine.md`](file:///c:/projects/grido/.agents/rules/konva-canvas-engine.md) | `glob` (Konva والتصدير) | الكاش وVRAM، طبقة السحب، النصوص، التصدير 300+ DPI |
| [`.agents/rules/backend-wails-runtime.md`](file:///c:/projects/grido/.agents/rules/backend-wails-runtime.md) | `glob` (Go / Wails / AI) | عقود Wails v3، مسارات `/api`، الأمان، مسار AI |
| [`.agents/rules/database-security-authz.md`](file:///c:/projects/grido/.agents/rules/database-security-authz.md) | `glob` (Supabase والمصادقة) | RLS، `SECURITY DEFINER`، `IS NOT TRUE`، الجلسة الواحدة |
| [`.agents/rules/quality-cicd-release.md`](file:///c:/projects/grido/.agents/rules/quality-cicd-release.md) | `glob` (CI والبناء) | مثبت NSIS، الترفيع، بوابات الجودة ومراقبة CI |

---

## 4. فهرس المهارات الموحّد (8 مهارات في `.agents/skills/`)
- [`grido-ui-system`](file:///c:/projects/grido/.agents/skills/grido-ui-system/SKILL.md): Fluent 2، Tailwind v4 `@theme`، Radix UI، الاختصارات، والحوارات.
- [`konva-canvas-and-export`](file:///c:/projects/grido/.agents/skills/konva-canvas-and-export/SKILL.md): ثوابت Konva، النصوص العربية، والتصدير والطباعة 300+ DPI (`/canvas-export-qa`).
- [`wails-desktop-build`](file:///c:/projects/grido/.agents/skills/wails-desktop-build/SKILL.md): رنتايم Wails v3، الربطات، البناء، ومثبت NSIS.
- [`grido-qa-and-release`](file:///c:/projects/grido/.agents/skills/grido-qa-and-release/SKILL.md): الجولة الأمنية (`/security-audit`) وإطلاق الإصدارات (`/release-deployment`).
- [`zustand-state-patterns`](file:///c:/projects/grido/.agents/skills/zustand-state-patterns/SKILL.md): شرائح Zustand v5، `useShallow`، وتفادي `Stale Closures`.
- [`supabase-security-and-migrations`](file:///c:/projects/grido/.agents/skills/supabase-security-and-migrations/SKILL.md): تأمين RLS و`SECURITY DEFINER` والهجرات (`/database-migration`).
- [`opencv-mediapipe-ai-tuner`](file:///c:/projects/grido/.agents/skills/opencv-mediapipe-ai-tuner/SKILL.md): مسار Modal AI، MediaPipe، وكاشف المستندات.
- [`grido-architecture-navigator`](file:///c:/projects/grido/.agents/skills/grido-architecture-navigator/SKILL.md): خريطة الملفات وتدفق البيانات بين Go وReact.

---

## 5. بروتوكول التوثيق المختصر (Lean Gate Protocol)
1. **عند بدء مهمة تطويرية:** راجع التوجه الحي ومؤشر الاستئناف في `docs/development-plan/POLISH_ROADMAP.md` وشغّل `node scripts/changelog-collect.mjs` عند الحاجة؛ لا تفتح بنوداً مؤجلة (`deferred`) أو فحصاً ملغىً تلقائياً دون طلب صريح. (للأسئلة النظرية البحتة أجب مباشرة دون حشو.)
2. **قبل الالتزام (Pre-Commit):** لأي تعديل كود، أنشئ **fragment واحداً** في `changelog/fragments/YYYYMMDD-<scope>-<slug>.md` (راجع `changelog/README.md` — لا تعدّل `CHANGELOG.md` يدوياً)، وحدّث المستند المعني **فقط** عند تغيّر نطاقه الفعلي وفق `docs/DOCUMENTATION_MAP.md`. مرّر `node scripts/docs-gate.mjs --strict-refs` + `format:check` + `lint` + `gofmt -l` + Conventional Commits (`.husky/commit-msg`). لا `--no-verify`.
3. **بعد الدفع (Post-Push):** راقب `gh run list --limit 3` و`gh run watch` حتى نجاح 100%.
