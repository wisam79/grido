---
name: wails-v3-migration
description: دليل وخارطة طريق ترقية مشروع Grido Studio إلى Wails v3 (Architecture, Multi-Window, Taskfile, Native Menus & Bindings)
---

# 🚀 دليل وخارطة طريق الترقية إلى Wails v3 (Wails v3 Migration Guide)

يقدم هذا الدليل المرجعي كافة الخطوات والمعايير الهندسية لترقية مشروع **Grido Studio** من Wails v2 إلى **Wails v3 (`v3.0.0-beta.x`)** بأمان تام وبدون أي انقطاع في وظائف الواجهة (React + Konva) أو خدمات Go.

---

## 🏛️ 1. المبادئ الحاكمة للهجرة (Core Migration Invariants)

1. **حظر التعديل المباشر على الإنتاج:** يُمنع بدء الهجرة على فرع `main`. يتم دائماً استخدام مساحة عمل منفصلة (`git worktree`).
2. **صفر تعديل على منطق الكانفاس والواجهة:** كود React و Zustand و Konva يبقى 100% متوافقاً دون أي إعادة كتابة للمنطق الرسومي.
3. **سلامة مسارات بث الميديا:** معالجات `/local-image/` و `/api/save-file` و `/api/upload-media` يجب نقلها بنفس قيود فحص الـ Symlink ورؤوس CSP المشددة.

---

## 🔄 2. الفروقات المعمارية الأساسية بين الإصدارين

| الخاصية | Wails v2 (الحالي) | Wails v3 (الجديد) |
| :--- | :--- | :--- |
| **الحزمة الرئيسية** | `github.com/wailsapp/wails/v2` | `github.com/wailsapp/wails/v3/pkg/application` |
| **نقطة الدخول** | `wails.Run(&options.App{...})` | `app := application.New(...)` |
| **إنشاء النوافذ** | نافذة رئيسية واحدة ضمن `options.App` | `app.NewWebviewWindowWithOptions(...)` (نوافذ متعددة أصلية) |
| **أداة البناء (CLI)** | `wails dev` / `wails build` | `wails3` CLI مع `Taskfile.yml` |
| **شريط المهام والقوائم** | إعدادات محدودة في ويندوز | `app.NewSystemTray()` و `app.NewMenu()` أصلية |
| **مكتبة عميل الواجهة** | ملفات `frontend/wailsjs/` المولدة | نظام Bindings جديد وعميل `@wailsio/runtime` |

---

## 🛠️ 3. خطوات التنفيذ التدريجية (Step-by-Step Runbook)

### الخطوة 1: عزل بيئة العمل (Worktree Isolation)
أنشئ بيئة عمل معزولة تماماً تتيح لك العمل ومقارنة النسختين محلياً:
```bash
git worktree add ../grido-v3 -b feature/wails-v3-migration
```

### الخطوة 2: تثبيت أدوات Wails 3 CLI
ثبّت إصدار بيتا الأحدث من أداة سطر الأوامر:
```bash
go install github.com/wailsapp/wails/v3/cmd/wails3@latest
```

### الخطوة 3: تحديث ملف `go.mod`
استبدل تبعية v2 بتبعية v3 داخل مجلد `grido-v3`:
```bash
go get github.com/wailsapp/wails/v3@latest
go mod tidy
```

### الخطوة 4: إعادة هيكلة `main.go`
في Wails v3، يتم فصل إنشاء التطبيق عن تكوين النوافذ:
```go
package main

import (
    "embed"
    "net/http"
    "github.com/wailsapp/wails/v3/pkg/application"
)

//go:embed all:frontend/dist
var assets embed.FS

func main() {
    // 1. تهيئة التطبيق
    app := application.New(application.Options{
        Name:        "Grido Studio",
        Description: "Professional Photo & Collage Studio",
        Services: []application.Service{
            application.NewService(projectHandler),
            application.NewService(printHandler),
            application.NewService(licenseHandler),
        },
        Assets: application.AssetOptions{
            Handler: customAssetHandler(assets),
        },
    })

    // 2. إنشاء النافذة الرئيسية مع خيارات التصميم بدون إطار
    mainWindow := app.NewWebviewWindowWithOptions(application.WebviewWindowOptions{
        Title:     "Grido Studio",
        Width:     1024,
        Height:    720,
        MinWidth:  900,
        MinHeight: 600,
        Frameless: true,
        Windows: application.WindowsWindow{
            BackdropType: application.None,
        },
    })

    // 3. تشغيل التطبيق
    err := app.Run()
    if err != nil {
        println("Error:", err.Error())
    }
}
```

### الخطوة 5: دعم النوافذ المتعددة المستقلة (Multi-Window)
لفتح نافذة معاينة الطباعة أو تفريغ الصور كشاشة ثانية مستقلة:
```go
func (a *App) OpenPrintPreviewWindow(url string) {
    previewWin := application.Get().NewWebviewWindowWithOptions(application.WebviewWindowOptions{
        Title:  "معاينة الطباعة",
        Width:  800,
        Height: 600,
        URL:    url,
    })
    previewWin.Show()
}
```

---

## 🛡️ 4. قائمة التحقق الأمني أثناء الترقية (Security Checklist)

- [ ] التأكد من تمرير رؤوس **Content-Security-Policy** المشددة الداعمة للـ WebAssembly (`wasm-unsafe-eval`).
- [ ] فحص مسارات الصور المحلية ضد هجمات **Symlink Path Traversal** عبر `filepath.EvalSymlinks`.
- [ ] التأكد من إخماد تكبير المتصفح الافتراضي عبر إعدادات الـ WebView2 للنافذة لتفادي تشوه أبعاد الكانفاس.
- [ ] الحفاظ على الحفظ الذري الدوري (`utils.CreateAtomic`) للمشاريع والملفات المصدرة.
