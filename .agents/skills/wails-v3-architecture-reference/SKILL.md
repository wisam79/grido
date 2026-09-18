---
name: wails-v3-architecture-reference
description: سجل ومرجع الفروقات المعمارية لانتقال Grido Studio إلى Wails v3 (Architecture, Multi-Window, Taskfile, Native Menus & Bindings)
---

# 📚 سجل ومرجع التحول إلى Wails v3 (Wails v3 Migration Reference)

> **الحالة:** تم اعتماد وانتقال المشروع بالكامل إلى **Wails v3 (`v3.0.0-beta.23`)**.  
> يُستخدم هذا الملف كمرجع توثيقي لفهم الفروقات المعمارية، نظام المهام، خط أنابيب الربطات، وكيفية عمل النظام المعتمد حالياً.

---

## 🔄 1. جدول الفروقات المعمارية والتشغيلية الشامل

| الخاصية | Wails v2 (سابقاً - ملغى) | Wails v3 (المعتمد حالياً في Grido) |
| :--- | :--- | :--- |
| **الحزمة الرئيسية في Go** | `github.com/wailsapp/wails/v2` | `github.com/wailsapp/wails/v3/pkg/application` |
| **نقطة الدخول والتشغيل** | `wails.Run(&options.App{...})` | `app := application.New(...)` متبوعاً بـ `app.Run()` |
| **إنشاء النوافذ وتعددها** | نافذة رئيسية واحدة مشفرة ضمن الخيارات | `app.NewWebviewWindowWithOptions(...)` (دعم كامل للنوافذ المتعددة) |
| **أداة البناء وإدارة المهام** | `wails dev` / `wails build` | `wails3` CLI عبر محرك المهام `Taskfile.yml` |
| **ملف التكوين الرئيسي** | `wails.json` (مهمل ومتروك) | `Taskfile.yml` و `build/config.yml` |
| **مسار المخرجات التنفيذية** | `build/bin/GridoStudio.exe` | `bin/GridoStudio.exe` (محدد بـ `BIN_DIR: "bin"`) |
| **مسار مخرجات المثبت (NSIS)** | `build/bin/GridoStudio-installer.exe` | `build/windows/nsis/GridoStudio-installer.exe` |
| **توليد ربطات الواجهة (TS)** | `wails generate module` | `wails3 generate bindings -ts -clean=true` |
| **مجلد الربطات الفعلي** | `frontend/wailsjs/` مباشرة | `frontend/bindings/grido/` (مستثنى من Git) |
| **دور مجلد `frontend/wailsjs/`**| كان مولّداً تلقائياً | **جسور إعادة تصدير يدوية متتبعة في Git** |
| **عميل زمن التشغيل بالواجهة** | `window.runtime` / `wailsjs/runtime` | `@wailsio/runtime` (استدعاء بـ `$Call.ByID`) و `window.wails` |
| **دورة حياة ظهور النوافذ** | شائعة بـ `Hidden: true` + `Show()` | إجبارياً `Hidden: false` مع `WindowStateMaximised` أو `Normal` |
| **تكامل ويندوز 11 و Fluent 2**| دعم محدود | `Mica` / `Acrylic` أصلي مع `NonClientRegionSupport: true` |

---

## 🛠️ 2. أوامر العمليات الرسمية في Wails v3 (Standard CLI Commands)

```powershell
# 1. تثبيت أداة Wails3 CLI الرسمية المعتمدة
go install github.com/wailsapp/wails/v3/cmd/wails3@v3.0.0-beta.23

# 2. تشغيل وضع التطوير المحلي مع Hot Reload
wails3 task dev

# 3. توليد ربطات TypeScript بعد أي تعديل على دوال Go
wails3 generate bindings -ts -clean=true

# 4. بناء الملف التنفيذي للإنتاج محلياً
wails3 task build

# 5. بناء مثبت الويندوز NSIS للإنتاج
wails3 task package
```

---

## 🧱 3. هندسة الربطات والجسور (Bindings & Shims Pipeline)

1. **الربطات الأصلية (`frontend/bindings/`):**
   - تُولّد محلياً عبر أداة Wails3 CLI.
   - مستثناة بالكامل من Git في `.gitignore`.
   - تستخدم محرك النقل السريع عبر المعرفات الرقمية `$Call.ByID(...)` من حزمة `@wailsio/runtime`.

2. **الجسور المتتبعة (`frontend/wailsjs/`):**
   - ملفات TypeScript متتبعة ومحفوظة في مستودع Git.
   - مهمتها إعادة تصدير الربطات الأصلية لضمان عدم كسر الاستيرادات في مكونات الواجهة ومتاجر Zustand.
   - مثال (`frontend/wailsjs/go/main/App.ts`):
     ```typescript
     export * from "../../../bindings/grido/app";
     ```
   - **قاعدة ذهبية:** يُمنع إجبارياً حذف هذه الملفات أو محاولة إعادة توليدها بأمر Wails v2 القديم (`wails generate module`).

3. **حاجز التحقق المسبق (`ensure-bindings.mjs`):**
   - قبل أي أمر `typecheck` أو `build`، يتحقق السكريبت من وجود `frontend/bindings/grido/app.ts`. إذا غاب، يعطي تعليمات واضحة للمطور بتوليدها بـ `wails3 generate bindings -ts -clean=true`.

---

## 🏛️ 4. المعايير الهندسية الثابتة بعد التحول (Invariants)

1. **كود الواجهة والكانفاس:** بقاء كود React و Zustand و Konva متوافقاً تماماً ومستقلاً عن طبقة النظام.
2. **بث الميديا وحماية المسارات:** معالجات `/local-image/` تعمل تحت فحص `filepath.EvalSymlinks` ورؤوس أمان تمنع Path Traversal.
3. **CGO في بيئة ويندوز:** البناء يتطلب دائماً `CGO_ENABLED=1` لضمان عمل محرك SQLite (`mattn/go-sqlite3`).
4. **ظهور النوافذ:** الاعتماد دائماً على `Hidden: false` مع ضبط الحالة الافتراضية للنافذة لمنع التعليق.
5. **سحب شريط العنوان:** تفعيل `NonClientRegionSupport: true` في Go واستخدام `--wails-draggable: drag` في CSS.
