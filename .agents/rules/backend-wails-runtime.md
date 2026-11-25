---
trigger: glob
glob: "{internal/**/*.go,main.go,app.go,modal_ai/**/*,frontend/bindings/**/*,frontend/wailsjs/**/*,frontend/src/lib/wails/**/*}"
description: "قواعد بنية Wails v3 والباك إند بلغة Go والذكاء الاصطناعي والحصص"
---

# قواعد الباك إند ورنتايم Wails والذكاء الاصطناعي (Backend, Wails v3 & AI)

التفاصيل والأمثلة في `.agents/skills/wails-desktop-build/SKILL.md` و`.agents/skills/opencv-mediapipe-ai-tuner/SKILL.md`.

## الهندسة JS ↔ Go وأمان الملفات
- **توزيع المهام والحالة:** الحسابات الثقيلة وأبعاد الصور الأصلية للطباعة في Go، والتفاعلات اللحظية (MediaPipe/ألوان/معاينات) في المتصفح. لا تستخدم `setTimeout(..., 0)` لخداع Linter، ولا تصدّر ثوابت/مصفوفات من ملفات `.tsx` للمكونات (`react-refresh/only-export-components`)، واستخدم `useEditorStore.getState()` داخل المعالجات غير المتزامنة لتفادي `Stale Closures`.
- **سلامة القرص والشبكة:** في Go استخدم `.tmp` + `defer os.Remove(tmp)` + `f.Sync()` قبل `os.Rename`، وأغلق الملفات صراحةً (`f.Close()`) قبل القراءة/النقل الفوري على Windows. قيد الاستجابات بـ`io.LimitReader`، وافحص Symlinks بـ`filepath.EvalSymlinks` بعد تطبيع `\`→`/` وقبل المقارنة بـ`filepath.Clean`. استخدم `os.Stat` لـ`ModTime` على NTFS، و`GRIDO_APP_DIR` لعزل الاختبارات، و`frontend/src/lib/local-api.ts` (`fetchLocalApi`) مع `LocalApiGuard` لكل مسار `/api/*`. لا تبعيات نطاق (`domain`/`service`/`repository`) داخل `internal/utils` ولا أسرار مشفرة في `app.go` (مع فحص `.env` محلياً في التطوير فقط).

## عقود Wails v3 (`v3.0.0`)
- **التوافق والربطات:** طابق تواقيع `v3.0.0` (`SingleInstanceOptions{UniqueID}`, `app.Event.Emit`, `WindowRuntimeReady`, `Hidden: false` + `StartState`, `EventsOn` مع دالة إلغاء فردية لا `EventsOff`). ولّد الربطات بـ`wails3 generate bindings -ts -clean=true` إلى `frontend/bindings/grido/`، وأبقِ `frontend/wailsjs/**` جسوراً يدوية (لا `wails generate module` من v2). حدّث `frontend/e2e/helpers/wails-v3-bridge.ts` و`frontend/test/App.test.tsx` مع أي دالة Go جديدة لحماية `frontend/src/lib/wails/ipc-contract-drift.test.ts`. أضف `"build:dev": "vite build"` في `frontend/package.json`.
- **عزل الرنتايم والوسائط:** خدمات الأعمال وخادم الأصول تمر عبر `domain.RuntimeBridge` (`internal/core/domain/runtime.go` و`internal/service/runtime_wails.go`) لا `application.Get()`. أبقِ نصوص أخطاء Go في Zustand، وعزّل SVG بـ`Content-Security-Policy: sandbox` + `inline`، وحدّد امتدادات `.avif`/`.heic`/`.jxl` صراحةً، وتجنّب `Cache-Control: immutable` على `/local-image/` القابل للتبديل. جلسات الأجهزة الخارجية (كاميرا الهاتف) تستمر في الخلفية بعد إغلاق حوار الإعداد حتى إيقافها صراحةً.

## الذكاء الاصطناعي والحصص وتنظيف الوسائط
- **مسار Modal AI CPU:** لا GPU أو Torch في `modal_ai/upscaler.py`؛ الطلبات تمر مباشرة من العميل لـ Modal مع JWT المستخدم (لا Edge Function وسيط). ميزانية Go **180 ثانية** (`aiEnhancementBudget`) ومهلة الواجهة **200 ثانية** بلا إعادة محاولة تلقائية. النتائج تُطبَّق مباشرة عبر `commitAiImageResult` بحارس طزاثة (`document-session.ts`) وخطوة Undo واحدة.
- **الحصص والعمليات الدفعية:** استعمل حجزاً ذرياً `Reserve`/`Rollback` ولا تخلط فحص وزيادة منفصلين. اسحب `PUBLIC, anon` وامنح `authenticated, service_role` + `NOTIFY pgrst, 'reload schema'` لدوال RPC. اقفل الـ Batch AI على `pro`/`enterprise` مع فحص الرصيد و`try/finally`؛ طبّق منحنى S-Curve للتخلص من الهالة البيضاء؛ واحمِ كل حقول المراجع الستة (`elements, slots, template, collage_template, print_settings, editor_state`) في `cleanupProjects` (`internal/repository/media_cleanup.go`) بوضع fail-closed.
