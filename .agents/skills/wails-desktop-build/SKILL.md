---
name: wails-desktop-build
description: المرجع الموحد لرنتايم Wails v3 (v3.0.0) وتدفق IPC والأمان وبناء حزم التطبيق ومثبت NSIS والـ CI
---

# 🚀 Wails v3 وبناء حزم سطح المكتب (Runtime, IPC & NSIS Build)

يجمع هذا الدليل عقود **Wails v3 (`github.com/wailsapp/wails/v3 v3.0.0`)** في Grido Studio وإعدادات البناء والتغليف ومثبت Windows NSIS.

---

## 1. عقود Wails v3 v3.0.0 الفعلية (SDK Parity)

- **التطبيق والنافذة:** `application.New(...)` مع `SingleInstance: &application.SingleInstanceOptions{UniqueID: ...}`، و`Hidden: false` + `StartState: application.WindowStateMaximised` (يُمنع `Hidden: true` مع `time.Sleep` + `Show()`).
- **الأحداث والنوافذ:** بث الأحداث عبر `app.Event.Emit(...)` (لا `EmitEvent`)، وحدث الجاهزية `events.Common.WindowRuntimeReady` (لا `WindowCreated`)، والشاشات `app.Screen.GetAll()`، والحافظة `app.Clipboard.Text()/SetText()`.
- **إلغاء الاشتراك في الواجهة:** مرّر الاستيراد عبر `frontend/wailsjs/runtime/runtime.ts` واحفظ دالة الإرجاع `unsubscribe` من `EventsOn`؛ يُمنع استدعاء `EventsOff` داخل `useEffect` cleanup.
- **الربطات والجسور:** ولّد الربطات إلى `frontend/bindings/grido/` عبر `wails3 generate bindings -ts -clean=true` (لا أدوات Wails v2). ملفات `frontend/wailsjs/**` جسور يدوية؛ عند تعديل خدمات Go، ولّد الربطات وحدّث محاكاة `frontend/e2e/helpers/wails-v3-bridge.ts` و`frontend/test/App.test.tsx` لتجنب فشل `ipc-contract-drift.test.ts`.
- **عزل الخدمات (`RuntimeBridge`):** خدمات الأعمال و`asset_server.go` لا تستدعي `application.Get()` مباشرة؛ تستخدم منفذ `domain.RuntimeBridge` (`internal/core/domain/runtime.go`) وجسر `internal/service/runtime_wails.go`.
- **السحب والإفلات الأصلي:** `native_image_drop.go` يقرأ `ctx.DropTargetDetails().X/Y` ويصفّي غير الصور قبل إرسال `start`/`complete`، وفي الواجهة يحمل الجذر `data-file-drop-target="true"` مع `stopPropagation()` في مناطق HTML5 لمنع التكرار.

---

## 2. أمان المسارات والأصول والـ IPC

- **مسارات `/api/*`:** تخضع لـ `service.LocalApiGuard` (فحص الأصل + ترويسة `X-Grido-Session` بمقارنة زمن ثابت via `App.GetLocalApiToken`)؛ في الواجهة يُستخدم `fetchLocalApi` (`frontend/src/lib/local-api.ts`) حصراً.
- **حماية `/local-image/*`:** طبّع `\` إلى `/` أولاً، استخرج `filepath.Base`، ثم تحقق بـ `filepath.EvalSymlinks` على الطرفين + `filepath.Clean` + `filepath.Separator`. أرسل `Content-Security-Policy: sandbox` و`Content-Disposition: inline` لملفات SVG.
- **الوسائط والمظهر:** تجنّب Base64 للميديا الكبيرة (مرّر Blob ثنائي إلى `/api/upload-media`). حدّد امتدادات صريحة (`image/avif`→`.avif`, `heic/heif`→`.heic`, `jxl`→`.jxl`). شريط العنوان يستعمل `--wails-draggable: drag` و`no-drag` للأزرار؛ `Logger: service.GlobalLogger` مع تعطيل سجل الأصول في الإنتاج.

---

## 3. البناء، المتغيرات، ومثبت NSIS

- **تفعيل CGO:** `CGO_ENABLED=1` إلزامي للبناء والتطوير لدعم `mattn/go-sqlite3`.
- **المتغيرات والأسرار:** تُحقن عبر `build/windows/Taskfile.yml` (`AppVersion`, `SupabaseURL`, `SupabaseAnonKey`, و`UPDATER_PUBLIC_KEY` العام للتحقق Ed25519 من بصمة `grido-checksums.txt.sig`). **يُمنع حقن أي سرّ مشترك لـ Modal AI** (المصادقة عبر JWT المستخدم فقط).
- **أوامر التشغيل:** `wails3 task dev` للتطوير · `wails3 task build` لإنتاج `bin/GridoStudio.exe` · `wails3 task package` لإنتاج `build/windows/nsis/GridoStudio-installer.exe`.
- **قواعد NSIS الحاكمة:**
  - السكريبت الحاكم الوحيد: `build/windows/installer/project.nsi` محفوظ بترميز **UTF-8 with BOM** (يُمنع استخدام قالب `build/windows/nsis/project.nsi`).
  - `APP_NAME: "GridoStudio"` بلا مسافات، وتنفيذ `taskkill` بصمت عبر `nsExec::ExecToStack` (لا `ExecWait`).
  - **الاحتفاظ ببيانات المستخدم:** يُمنع حذف `$APPDATA\GridoStudio` و`$LOCALAPPDATA\GridoStudio` في `uninstall`؛ الترقية تحفظها عبر `PreserveLegacyUserData`/`RestoreLegacyUserData`.
- **تكافؤ الـ CI:** Node مصدره `.nvmrc` (22)، خطوة توليد الربطات في `ci.yml` تعمل بـ `CGO_ENABLED: "0"`، ومهمة `validate-modal-ai` تفحص `modal_ai/test_upscaler.py`، و`windows-build` تشغّل `^TestGDIPure_` (بينما `e2e-acceptance.yml` منفصل عن النشر).
