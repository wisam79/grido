# Grido Studio — دستور وقواعد الوكلاء (Master Project Constitution)

> **دستور المشروع الأعلى للمساعدين الذكيين (AI Agents & Pair Programmers):**
> هذا الملف هو الوثيقة الحاكمة الدائمة لكافة جلسات العمل والتطوير في استوديو Grido.
> تُقسّم القواعد التخصصية تفصيلياً عبر مجلد القواعد `.agents/rules/` وفق معايير Google Antigravity وتُحمّل ديناميكياً بحسب نطاق الملفات المستهدفة، بينما تُفصَّل المهارات المعمارية في `.agents/skills/`.

---

## 1. هوية المشروع والتقنيات الأساسية (Project Stack)
- **المنصة:** تطبيق سطح مكتب احترافي متعدد المنصات لأنظمة Windows و macOS و Linux مخصص لاستوديوهات التصوير والمطابع ومصممي الهوية.
- **الواجهة الأمامية (Frontend):** React 19 + TypeScript + Vite + Tailwind CSS v4 + Zustand v5 + Microsoft Fluent 2 Design System.
- **محرك الكانفاس (Canvas Engine):** Konva + React-Konva مع معالجة رياضية فائقة الدقة للطباعة (300+ DPI).
- **الباك إند وسطح المكتب (Backend & Desktop Runtime):** Go 1.26 + Wails v3 (`v3.0.0`) + SQLite (عبر CGO).
- **الذكاء الاصطناعي السحابي (Cloud AI):** Modal AI (CodeFormer + Real-ESRGAN على خوادم A10G) مقترن مع Supabase Auth & DB.
- **لوحة الإدارة وصفحة الهبوط (Web & Admin):** React 19 + TypeScript + Vite + Tailwind CSS v4 منشور على GitHub Pages (`grido.cloud-ip.cc`).

---

## 2. الثوابت الأمنية والمعمارية المطلقة (Absolute Safety Invariants)
1. **حظر تشغيل أو اقتراح أمر `cd` مطلقاً:** يُمنع استخدام `cd` للتنقل بين المجلدات في أي صدفة (Shell)؛ حدد مسار العمل دائماً عبر المعامل `Cwd` أو المسارات الكاملة (محمي آلياً ومرفوض فورياً عبر خطاف Antigravity في [`.agents/hooks.json`](file:///c:/projects/grido/.agents/hooks.json)).
2. **الاعتماد الكلي على GitHub Actions ومنع إجهاد الجهاز المحلي:** يُمنع إجبارياً على أي وكيل تشغيل اختبارات E2E (Playwright) أو حزم اختبارات الوحدة الثقيلة أو محاكيات البناء محلياً (محمي آلياً بحظر تشغيل Playwright المحلي وتجاوز الـ hooks عبر [`.agents/hooks.json`](file:///c:/projects/grido/.agents/hooks.json)). التحقق يتم بدفع الكود (`git push origin main`) ومراقبة دورة الـ CI السحابية فورياً عبر `gh run list` و `gh run watch`. الاستثناء الوحيد المصرح به محلياً هو الفحص السريع الخفيف: `npm run lint` و `npm run typecheck` و `node scripts/docs-gate.mjs`.
3. **الكتابة الذرية للملفات وتفريغ القرص (Atomic Writes & fsync):** أي كتابة لملفات التكوين أو المشاريع أو تصدير الطباعة في Go يجب أن تمر عبر ملف مؤقت `.tmp` مع `defer os.Remove(tmp)` واستدعاء `f.Sync()` قبل استبدال الملف بـ `os.Rename`.
4. **حظر تسريب أو تخزين أسرار في الثنائي (No Shared Secrets):** يُمنع تشفير أي مفاتيح API أو أسرار مشتركة داخل الكود أو الثنائي؛ التوثيق للخدمات السحابية يعتمد حصراً على توكن المستخدم الفردي (`Authorization: Bearer <JWT>`).
5. **حظر إعادة البناء من الصفر (Zero-Rewrite Invariant):** يُمنع اقتراح أو بدء إعادة كتابة التطبيق بأطر عمل أخرى (Flutter/C#/Electron)؛ الحفاظ التام على محرك الكانفاس والرياضيات في React+Konva وترقية المنظومة تراكمياً.
6. **حظر ازدواجية الميزات والمنطق (No Unjustified Duplication):** أي قدرة مكررة مرتين في موضعين بلا مبرر منصة أو بيئة تشغيل تُعد عيباً تصميمياً يجب دمجه فورياً.

---

## 3. خريطة القواعد المعيارية (Rules Taxonomy & Dynamic Triggers)
تتوزع قواعد التطوير التخصصية في المجلد `.agents/rules/` وتُفعّل تلقائياً عبر مفسر Antigravity:

| ملف القاعدة | نطاق التفعيل (Trigger & Globs) | الموضوع والتركيز |
|---|---|---|
| [`.agents/rules/architecture-governance.md`](file:///c:/projects/grido/.agents/rules/architecture-governance.md) | `always_on` (دائم) | الاستراتيجية المعمارية، عزل الفروع، حظر الازدواجية، وسيادة المصدر الواحد وبوابة التوثيق |
| [`.agents/rules/ui-ux-fluent.md`](file:///c:/projects/grido/.agents/rules/ui-ux-fluent.md) | `glob`: `frontend/src/**/*.{ts,tsx,css}`, `admin-web/...` | نظام Fluent 2، الأيقونات، المساطر، ألوان ونوافذ الحوار، اختصارات لوحة الأدوات، وحارس تقليل النصوص (Text Minimalism Gate) |
| [`.agents/rules/konva-canvas-engine.md`](file:///c:/projects/grido/.agents/rules/konva-canvas-engine.md) | `glob`: `frontend/src/**/{konva,canvas,stickers}/**` | ثوابت Konva، طبقة السحب الرسمية، كاش الفلاتر، تحجيم الكولاج، وتصدير الطباعة 300+ DPI |
| [`.agents/rules/backend-wails-runtime.md`](file:///c:/projects/grido/.agents/rules/backend-wails-runtime.md) | `glob`: `internal/**/*.go`, `modal_ai/**`, `main.go` | معمارية JS ↔ Go، جسور Wails v3 IPC، مسارات Modal AI، تقييد الحصص، وأمان الملفات |
| [`.agents/rules/database-security-authz.md`](file:///c:/projects/grido/.agents/rules/database-security-authz.md) | `glob`: `supabase/**`, `internal/service/*auth*` | سياسات RLS، دوال `SECURITY DEFINER`، فحص `IS NOT TRUE`، أمان المصادقة والجلسة الواحدة |
| [`.agents/rules/quality-cicd-release.md`](file:///c:/projects/grido/.agents/rules/quality-cicd-release.md) | `glob`: `.github/**`, `scripts/**`, `build/**`, `Taskfile.yml` | أتمتة مثبت NSIS، حزم Wails v3، ترفيع الإصدارات، التوقيع الرقمي، ومراقبة CI الإلزامية |

---

## 4. فهرس المهارات المعمارية (Architectural Skills Index)
للحصول على توجيهات تفصيلية، استعن بالمهارات المرجعية المتخصصة في `.agents/skills/`:
- [`fluent2-design-system`](file:///c:/projects/grido/.agents/skills/fluent2-design-system/SKILL.md): معايير وتوكنات Microsoft Fluent 2.
- [`grido-ui-designer-guide`](file:///c:/projects/grido/.agents/skills/grido-ui-designer-guide/SKILL.md): دليل الواجهات وتجربة المستخدم والأيقونات والاختصارات.
- [`konva-rendering-invariants`](file:///c:/projects/grido/.agents/skills/konva-rendering-invariants/SKILL.md): ثوابت الرسم والأداء ومجموعات Konva وطبقة السحب الرسمية.
- [`konva-text-typography-fx`](file:///c:/projects/grido/.agents/skills/konva-text-typography-fx/SKILL.md): تصيير النصوص ودورة الارتفاع وجاهزية الخط ومطابقة التحرير وفلتر التمدد الشكلي للحدود (`dilate`).
- [`wails-konva-hi-res-export`](file:///c:/projects/grido/.agents/skills/wails-konva-hi-res-export/SKILL.md): تصدير الطباعة فائق الدقة ومطابقة الهندسة.
- [`wails-v3-runtime-mastery`](file:///c:/projects/grido/.agents/skills/wails-v3-runtime-mastery/SKILL.md): رنتايم وأحداث ونوافذ Wails v3.
- [`wails-v3-architecture-reference`](file:///c:/projects/grido/.agents/skills/wails-v3-architecture-reference/SKILL.md): سجل ومرجع الفروقات المعمارية لانتقال Grido Studio إلى Wails v3.
- [`wails-v3-multiwindow-sync`](file:///c:/projects/grido/.agents/skills/wails-v3-multiwindow-sync/SKILL.md): إدارة ومزامنة النوافذ المتعددة المستقلة وتدفق الحالة اللحظية.
- [`wails-v3-native-io-streaming`](file:///c:/projects/grido/.agents/skills/wails-v3-native-io-streaming/SKILL.md): تدفق البيانات الثنائية والميديا وحماية مسارات AssetServer.
- [`wails-v3-system-integration-ux`](file:///c:/projects/grido/.agents/skills/wails-v3-system-integration-ux/SKILL.md): الاندماج العميق مع Windows 11 ومعايير Fluent 2 الأصلية.
- [`wails-cross-compiler`](file:///c:/projects/grido/.agents/skills/wails-cross-compiler/SKILL.md): بناء وحزم التطبيق مع NSIS وتصغير الحجم.
- [`supabase-security-and-migrations`](file:///c:/projects/grido/.agents/skills/supabase-security-and-migrations/SKILL.md): تأمين RLS وهجرات Supabase والمصادقة.
- [`opencv-mediapipe-ai-tuner`](file:///c:/projects/grido/.agents/skills/opencv-mediapipe-ai-tuner/SKILL.md): تكامل نماذج الذكاء الاصطناعي ومعالجة صور الهوية.
- [`zustand-state-patterns`](file:///c:/projects/grido/.agents/skills/zustand-state-patterns/SKILL.md): أنماط Zustand v5 وتفادي Stale Closures.
- [`tailwind-v4-theme-engine`](file:///c:/projects/grido/.agents/skills/tailwind-v4-theme-engine/SKILL.md): هندسة سمات Tailwind v4.
- [`radix-ui-accessibility-ux`](file:///c:/projects/grido/.agents/skills/radix-ui-accessibility-ux/SKILL.md): أصول إمكانية الوصول ونوافذ Radix UI.
- [`grido-docs-sync-guard`](file:///c:/projects/grido/.agents/skills/grido-docs-sync-guard/SKILL.md): بوابات التوثيق الإلزامية والتحقق الآلي.
- [`grido-qa-security-auditor`](file:///c:/projects/grido/.agents/skills/grido-qa-security-auditor/SKILL.md): الجودة والأمان وهندسة الإصدارات.
- [`grido-architecture-navigator`](file:///c:/projects/grido/.agents/skills/grido-architecture-navigator/SKILL.md): خريطة الكود ومعمارية التدفق.
- [`grido-performance-checklist`](file:///c:/projects/grido/.agents/skills/grido-performance-checklist/SKILL.md): قائمة فحص الأداء السريعة.
- [`canvas-export-qa`](file:///c:/projects/grido/.agents/skills/canvas-export-qa/SKILL.md): فحص محرك الرسم وجودة التصدير فائق الدقة (300+ DPI) والقص والنزيف (`/canvas-export-qa`).
- [`database-migration`](file:///c:/projects/grido/.agents/skills/database-migration/SKILL.md): صياغة وفحص وتطبيق هجرات Supabase وتأمين RLS (`/database-migration`).
- [`release-deployment`](file:///c:/projects/grido/.agents/skills/release-deployment/SKILL.md): ترفيع وإطلاق الإصدارات ومزامنة التكوين والـ CI (`/release-deployment`).
- [`security-audit`](file:///c:/projects/grido/.agents/skills/security-audit/SKILL.md): الجولة الأمنية الدورية لفحص المصادقة والجلسات وتطهير السجلات (`/security-audit`).

---

## 5. بروتوكول بوابات التوثيق والتحقق (Mandatory Gate Protocol)
1. **قبل بدء أي عمل:** راجع `docs/DOCUMENTATION_MAP.md` و `changelog/README.md` وشغّل `node scripts/changelog-collect.mjs` لملخص التغييرات غير المُصدرة، ثم حدد المستندات المطلوبة في أول رد.
2. **قبل الكومت (Pre-Commit):** شغّل الفحص الآلي `node scripts/docs-gate.mjs --strict-refs` وأنشئ fragment واحد في `changelog/fragments/YYYYMMDD-<scope>-<slug>.md` (انظر `changelog/README.md` — يُمنع تعديل `CHANGELOG.md` يدوياً، يُبنى تلقائياً عند `scripts/release.mjs`). قبل ذلك: `npm --prefix frontend run format:check` و`npm --prefix frontend run lint` و`gofmt -l` على ملفات Go — الثلاثة مفروضة في CI. **رسائل الالتزام تخضع لـ Conventional Commits** عبر `.husky/commit-msg` (`scripts/commit-msg-lint.mjs`)، ويُمنع تجاوز الخطافات بـ`--no-verify`.
3. **بعد الدفع (Post-Push):** راقب خط سير العمل السحابي بـ `gh run list --limit 3` و `gh run watch` حتى تمام النجاح 100%.
