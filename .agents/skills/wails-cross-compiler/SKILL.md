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
$env:MODAL_AI_KEY = $modalAiKey

# 2. بناء الملف التنفيذي للإنتاج (المخرجات في bin/GridoStudio.exe):
wails3 task build

# 3. بناء مثبت الويندوز NSIS (المخرجات في build/windows/nsis/GridoStudio-installer.exe):
wails3 task package
```

> 🔒 يتم التعامل مع خيارات `-ldflags` تلقائياً عبر `build/windows/Taskfile.yml` لدمج `AppVersion` و `SupabaseURL` و `ModalAIKey` مع معلمات `-w -s -H windowsgui`.

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
