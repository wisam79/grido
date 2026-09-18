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

---

## 🔧 5. إرشادات التشغيل والتصحيح الحرجة (Critical Troubleshooting & Invariants)

1. **انغلاق النافذة فور تشغيلها (Window Closes Immediately):**
   - **السبب الجذري:** بناء المشروع بـ `CGO_ENABLED=0` على الويندوز. حزمة `gorm.io/driver/sqlite` (`mattn/go-sqlite3`) تتطلب CGO بشكل إلزامي، ودونه تُترجم إلى كود Stub ينهار فورياً عند `repository.InitDB()`.
   - **الحل:** التأكد من توفر مترجم MinGW GCC وضبط `CGO_ENABLED: '1'` في `build/windows/Taskfile.yml` و `build.ps1`.

2. **وضع التطوير يفتح في المتصفح فقط ولا تظهر نافذة التطبيق (`wails3 task dev`):**
   - **السبب الجذري:** انهيار العملية التنفيذية لـ Go في الخلفية (بسبب CGO أو خطأ `build:dev` مفقود)، بينما يستمر خادم Vite بالعمل في المتصفح على المنفذ `9245`.
   - **الحل:** مراجعة ملف السجل `%AppData%\Roaming\GridoStudio\logs\grido.log`، وإضافة `"build:dev": "vite build"` داخل `frontend/package.json`.

3. **حقن متغيرات البيئة عبر ldflags في Wails v3:**
   - قوالب Wails v3 لا تحقن متغيرات `.env` تلقائياً. يجب إضافتها صراحة في `build/windows/Taskfile.yml`:
     ```yaml
     LDFLAGS_INJECT: '{{if .APP_VERSION}} -X grido/internal/service.AppVersion={{.APP_VERSION}}{{end}}{{if .SUPABASE_URL}} -X grido/internal/service.SupabaseURL={{.SUPABASE_URL}}{{end}}{{if .SUPABASE_ANON_KEY}} -X grido/internal/service.SupabaseAnonKey={{.SUPABASE_ANON_KEY}}{{end}}{{if .MODAL_AI_KEY}} -X grido/internal/service.ModalAIKey={{.MODAL_AI_KEY}}{{end}}'
     ```
   - مع تفعيل `dotenv: ['.env']` في `Taskfile.yml` الرئيسي ومزامنة `.env` في أي مساحة عمل Worktree جديدة.

4. **دورة حياة ظهور النوافذ في Wails v3:**
   - تجنب استخدام `Hidden: true` متبوعاً بـ `time.Sleep` و `mainWindow.Show()` في goroutine منفصلة.
   - استخدم دائماً `Hidden: false` مع `winOptions.StartState = application.WindowStateMaximised` أو `WindowStateNormal`.

5. **تنظيف تحذيرات `uname` و `tail` على الويندوز:**
   - في `Taskfile.yml`، استبعد قوالب `ios` و `android` من قسم `includes` لمنع تشغيل استعلامات Bash على بيئة Windows.

---

## ⚡ 6. دليل القدرات الخارقة المتقدمة في Wails v3 (Wails v3 Advanced Capabilities & Recipes)

يقدم هذا القسم نماذج تنفيذية برمجية جاهزة للاستخدام لاستثمار كامل قدرات محرك Wails v3 داخل Grido Studio:

### 1. معمارية النوافذ المتعددة المستقلة (Multi-Window Architecture)
في Wails v3، لم نعد محصورين بنافذة واحدة. يمكن فتح شاشات مستقلة لمعاينة الطباعة، أدوات الذكاء الاصطناعي، أو شاشة العميل:

```go
// فتح نافذة معاينة الطباعة على شاشة ثانية
func (a *App) OpenPrintPreviewWindow(previewData any) {
    app := application.Get()
    
    // فحص ما إذا كانت النافذة مفتوحة مسبقاً لإيقاظها
    if win, exists := app.Window.GetByName("print-preview"); exists {
        win.Restore()
        win.Focus()
        return
    }

    previewWin := app.Window.NewWithOptions(application.WebviewWindowOptions{
        Name:   "print-preview",
        Title:  "معاينة الطباعة - Grido Studio",
        Width:  1100,
        Height: 800,
        MinWidth: 800,
        MinHeight: 600,
        URL:    "/print-preview",
        Windows: application.WindowsWindow{
            BackdropType: application.Mica,
        },
    })
    
    // إرسال البيانات للنافذة الجديدة فور جهوزيتها
    previewWin.OnWindowEvent(events.Common.WindowRuntimeReady, func(_ *application.WindowEvent) {
        previewWin.EmitEvent("init-print-data", previewData)
    })
}
```

### 2. دعم خامات Windows 11 الأصلية (Native Mica & Acrylic Backdrops)
لتطبيق خامة Mica أو Acrylic الشفافة الأصلية لويندوز 11 المتوافقة مع معيار Fluent 2:
```go
winOptions := application.WebviewWindowOptions{
    Frameless:        true,
    BackgroundType:   application.BackgroundTypeTranslucent,
    BackgroundColour: application.NewRGBA(0, 0, 0, 0), // شفافية كاملة
    Windows: application.WindowsWindow{
        BackdropType:           application.Mica, // أو application.Acrylic
        NonClientRegionSupport: true, // سحب سلس لشريط العنوان الأصلي
    },
}
```

### 3. الإشعارات التفاعلية لنظام التشغيل (Windows Toast Notifications)
إرسال تنبيهات أصلية من ويندوز عند اكتمال تصدير كميات كبيرة من الصور أو انتهاء معالجة الذكاء الاصطناعي:
```go
import "github.com/wailsapp/wails/v3/pkg/services/notifications"

func (a *App) NotifyExportComplete(exportDir, previewImagePath string, count int) {
    notificationSvc := notifications.New()
    
    notificationSvc.Send(&notifications.NotificationOptions{
        Title:    "اكتمل التصدير بنجاح",
        Subtitle: "Grido Studio",
        Body:     fmt.Sprintf("تم تصدير %d صورة بدقة طباعة فائقة.", count),
        Attachments: []notifications.NotificationAttachment{
            {
                URL: previewImagePath, // معاينة مصغرة داخل الإشعار
            },
        },
        Actions: []notifications.NotificationAction{
            {
                Identifier: "OPEN_FOLDER",
                Label:      "فتح مجلد الحفظ",
            },
        },
    }, func(response *notifications.NotificationResponse) {
        if response.ActionIdentifier == "OPEN_FOLDER" {
            application.Get().Browser.OpenURL(exportDir)
        }
    })
}
```

### 4. تكامل صينية النظام (System Tray & Background Processing)
إبقاء التطبيق يعمل في الخلفية لمعالجة مهام الذكاء الاصطناعي مع قائمة وصول سريعة:
```go
func SetupSystemTray(app *application.App) {
    tray := app.SystemTray.New()
    tray.SetIcon(trayIconBytes)
    tray.SetTooltip("Grido Studio - محرر الصور والكولاج")

    trayMenu := app.NewMenu()
    trayMenu.Add("إظهار التطبيق").OnClick(func(_ *application.Context) {
        if win, ok := app.Window.GetByName("main"); ok {
            win.Show()
            win.Focus()
        }
    })
    trayMenu.AddSeparator()
    trayMenu.Add("إنهاء Grido").OnClick(func(_ *application.Context) {
        app.Quit()
    })

    tray.SetMenu(trayMenu)
    tray.OnDoubleClick(func() {
        if win, ok := app.Window.GetByName("main"); ok {
            win.Show()
            win.Focus()
        }
    })
}
```

### 5. إلغاء العمليات الخلفية المتزامن (Cancellable RPC via Context)
في Wails v3، أي دالة Go تستقبل `ctx context.Context` يمكن إلغاؤها من الواجهة فورياً:
```go
// في Go Backend
func (s *ImageService) ProcessBatchAI(ctx context.Context, photoIDs []string) error {
    for _, id := range photoIDs {
        select {
        case <-ctx.Done():
            return errors.New("تم إلغاء العملية بواسطة المستخدم")
        default:
            // متابعة المعالجة
        }
    }
    return nil
}
```
وفي الواجهة الأمامية عبر TypeScript:
```typescript
// استدعاء قابل للإلغاء بضغطة زر
const call = ImageService.ProcessBatchAI(selectedIds);

// عند نقر المستخدم على زر "إلغاء":
cancelBtn.onclick = () => {
    call.cancel();
};
```

### 6. دفق البيانات اللحظي المباشر (Bidirectional Streams)
لدفق تقدم المعالجة أو نقل البيانات دون تعليق الـ Event Bus:
```go
app.HandleStream("ai-progress-stream", func(conn *application.StreamConn) {
    defer conn.Close()
    for progress := range aiProgressChan {
        _ = conn.SendJSON(map[string]any{
            "percent": progress.Percent,
            "stage": progress.CurrentStage,
        })
    }
})
```


