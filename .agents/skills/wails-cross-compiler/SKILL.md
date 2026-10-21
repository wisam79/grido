---
name: wails-cross-compiler
description: دليل بناء وتغليف وتصغير حجم تطبيق Grido Studio المكتوب بـ Wails & Go و NSIS
---

# 📦 مهارة البناء والتغليف الاحترافي (Wails Cross-Compiler & Packager)

استخدم هذه المهارة لإدارة عمليات التجميع، تصغير الحجم، وحقن متغيرات البناء في Grido Studio.

---

## 🛠️ 1. حقن متغيرات البناء في Wails v3 (Ldflags & Taskfile Invariants)

في Wails v3، يتم حقن المفاتيح عبر متغيرات البيئة المعرفة في `Taskfile.yml` و `build/windows/Taskfile.yml`:

```powershell
# 1. إعداد متغيرات البيئة قبل البناء (أو الاعتماد على build.ps1)
$env:CGO_ENABLED = "1"
$env:APP_VERSION = $appVersion
$env:SUPABASE_URL = $supabaseUrl
$env:SUPABASE_ANON_KEY = $supabaseAnonKey
# 🔏 اختياري: مفتاح Ed25519 العام (base64) لفرض التحقق من توقيع المثبت.
# تركه فارغاً = السلوك القديم (بصمة SHA-256 وحدها) مع تحذير في سجل التطبيق.
$env:UPDATER_PUBLIC_KEY = ""

# 2. بناء الملف التنفيذي للإنتاج (المخرجات في bin/GridoStudio.exe):
wails3 task build

# 3. بناء مثبت الويندوز NSIS (المخرجات في build/windows/nsis/GridoStudio-installer.exe):
wails3 task package
```

> 🔒 يتم التعامل مع خيارات `-ldflags` تلقائياً عبر `build/windows/Taskfile.yml` لدمج `AppVersion` و `SupabaseURL` و `SupabaseAnonKey` و `UPDATER_PUBLIC_KEY` مع معلمات `-w -s -H windowsgui`.
> 🔏 **مفتاح التوقيع عام لا سرّ:** `UPDATER_PUBLIC_KEY` يُقرأ في سير عمل الإصدار من `vars.UPDATER_PUBLIC_KEY` (متغيّر مستودع) لا من `secrets`، لأنه يُشحن داخل الثنائي عن قصد للتحقق من توقيع المثبت. تهيئته تجعل التوقيع **إلزامياً** (Fail-closed): غياب الملف الموقَّع أو عدم مطابقته يرفض التثبيت ويحذف الملف قبل أي تنفيذ. نشر التوقيع يتم بأصل `grido-checksums.txt.sig` بجانب ملف البصمات (يُقرأ في `admin-web/netlify/functions/version.ts` ويُمرَّر في حقل `signature`)، والتوقيع يكون على بصمة المثبت الخام (32 بايتاً) لا على الملف كاملاً.
> 🔒 **لا يوجد سرّ Modal في البناء:** توثيق خادم الذكاء الاصطناعي يتم عبر JWT المستخدم فقط (تدقيق `C-02`) — يُمنع إعادة إضافة `MODAL_AI_KEY`/`GRIDO_AI_SECRET_KEY` إلى البناء أو الأسرار.

---

## ⚙️ 2. تحسين مثبت الويندوز NSIS (NSIS Installer Invariants)

1. **الرمز الموحد للملف التنفيذي:**
   - يجب أن يظل اسم الملف التنفيذي موحداً بدون مسافات (`GridoStudio.exe`) ومطابقاً لـ `APP_NAME: "GridoStudio"` في `Taskfile.yml` و `PRODUCT_EXECUTABLE` في `project.nsi`.

2. **التنفيذ الصامت للأوامر في NSIS:**
   - يُمنع استخدام `ExecWait 'taskkill ...'` لتفادي ظهور نافذة CMD سوداء للمستخدم.
   - استخدم دائماً: `nsExec::ExecToStack 'taskkill /F /IM "GridoStudio.exe" /T'`.

3. **السكريبت الحاكم للمثبت (Source of Truth):**
   - سكريبت NSIS الحاكم الوحيد هو `build/windows/installer/project.nsi` مع `OutFile "..\nsis\..."` المُخرج إلى المسار المستهلك (`build/windows/nsis/GridoStudio-installer.exe`) في التوقيع والنشر. قالب `build/windows/nsis/project.nsi` مخلفات Wails الافتراضية — يُمنع بناء المثبت منه أو تعديله.
   - مهمة `create:nsis:installer` مُنسّقة على المجلد الحاكم (`dir: build/windows/installer`) مع توليد `webview2bootstrapper` في جذر المجلد قبل `makensis`؛ وسكربت `wails_tools.nsh` المعتمَد هو نسخة `build/windows/installer/wails_tools.nsh` (نسخة Wails الرسمية) — يُمنع إضافة أي خطوة نسخ لسكربت `wails_tools.nsh` (أمر `copy`/`cp` ليس برنامجاً قابلاً للتنفيذ تحت go-task على Windows CI).

4. **حفظ الترميز بـ UTF-8 BOM:**
   - ملف `project.nsi` يجب أن يُحفظ بترميز `UTF-8 with BOM` لتفادي أخطاء الـ Bad text encoding مع النصوص العربية.

---

## 🚀 3. ضغط وتصغير حجم الملف المحمول (UPX Compression Protocol)

- للحصول على أسرع زمن تشغيل وأصغر حجم ملف محمول، استخدم ضغط UPX بعد البناء على مسار Wails v3 الرسمي:
  `upx --best --lzma bin/GridoStudio.exe`

---

## 🧰 4. تكافؤ سلسلة الأدوات مع CI (Toolchain Parity)

- **Node مصدره `.nvmrc`** (22) — يقرأه `ci.yml` عبر `node-version-file`، و`frontend/package.json` يعلن `engines.node >=22`. لا تكرر رقم الإصدار في أكثر من ملف.
- **بوابات ما قبل الدفع المطابقة للـCI:** `npm --prefix frontend run format:check` (Prettier لـ`src/test/e2e` وملفات الإعداد) · `npm --prefix frontend run lint` · `git ls-files -z '*.go' | xargs -0 gofmt -l` (يجب أن يعود فارغاً).
- **رسائل الالتزام** تتبع Conventional Commits عبر `.husky/commit-msg` → `scripts/commit-msg-lint.mjs` — استخدم `type(scope): وصفاً عربياً موجزاً` (مثال: `refactor(build): توحيد بوابة gofmt في CI`).
- **`.gitattributes`** يثبّت `lf` ويستثني الأصول الثنائية (`*.exe`, `*.dll`, `*.msi`, `*.onnx`, `*.wasm`...) من التطبيع، و**`.editorconfig`** يحكم المسافات (Tab في Go) — لا تعطّل أي منهما محلياً.
