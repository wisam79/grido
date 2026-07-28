---
name: wails-cross-compiler
description: دليل بناء وتغليف وتصغير حجم تطبيق Grido Studio المكتوب بـ Wails & Go و NSIS
---

# 📦 مهارة البناء والتغليف الاحترافي (Wails Cross-Compiler & Packager)

استخدم هذه المهارة لإدارة عمليات التجميع، تصغير الحجم، وحقن متغيرات البناء في Grido Studio.

---

## 🛠️ 1. حقن متغيرات البناء (Ldflags Injection)

عند البناء المحلي أو عبر GitHub Actions، يجب دائماً حقن مفاتيح الخدمة ورقم الإصدار عبر خيارات `-ldflags`:

```powershell
$ldflags = "-s -w " +
  "-X grido/internal/service.AppVersion=$appVersion " +
  "-X grido/internal/service.SupabaseURL=$supabaseUrl " +
  "-X grido/internal/service.SupabaseAnonKey=$supabaseAnonKey " +
  "-X grido/internal/service.ModalAIKey=$modalAiKey"

wails build -platform windows/amd64 -nsis -ldflags $ldflags
```

---

## ⚙️ 2. تحسين مثبت الويندوز NSIS (NSIS Installer Invariants)

1. **الرمز الموحد للملف التنفيذي:**
   - يجب أن يظل اسم الملف التنفيذي موحداً بدون مسافات (`GridoStudio.exe`) لمنع تعطل التحديثات الصامتة.

2. **التنفيذ الصامت للأوامر في NSIS:**
   - يُمنع استخدام `ExecWait 'taskkill ...'` لتفادي ظهور نافذة CMD سوداء للمستخدم.
   - استخدم دائماً: `nsExec::ExecToStack 'taskkill /F /IM "GridoStudio.exe" /T'`.

3. **حفظ الترميز بـ UTF-8 BOM:**
   - ملف `project.nsi` يجب أن يُحفظ بترميز `UTF-8 with BOM` لتفادي أخطاء الـ Bad text encoding مع النصوص العربية.

---

## 🚀 3. ضغط وتصغير حجم الملف المحمول (UPX Compression Protocol)

- للحصول على أسرع زمن تشغيل وأصغر حجم ملف محمول، استخدم ضغط UPX بعد البناء:
  `upx --best --lzma build/bin/GridoStudio.exe`
