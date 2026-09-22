---
name: wails-v3-runtime-mastery
description: دليل وخريطة مهارة Wails v3 الشاملة لتطبيقات سطح المكتب (Architecture, Runtime APIs, Security Hardening, Windows Fluent Integration, Drag & Drop, Multi-Monitor & IPC) — المشروع يعمل حالياً على v3.0.0-beta.23
---

# 🚀 دليل احتراف محرك Wails v3 الشامل (Wails Runtime Mastery)

يقدم هذا الدليل المرجعي كافة التقنيات والمعايير الهندسية المعتمدة لاستغلال أقصى قدرات محرك **Wails v3** ودمجه بسلاسة مع الواجهة الرسومية (React + Konva) والأنظمة الأساسية (خاصة Windows 10/11).

> **الإصدار الفعلي:** `github.com/wailsapp/wails/v3 v3.0.0-beta.23`
> **أداة البناء:** `wails3` CLI مع `Taskfile.yml`
> **الحزمة الرئيسية:** `github.com/wailsapp/wails/v3/pkg/application`

---

## 🏛️ 1. المعمارية ودورة حياة التطبيق (Lifecycle & Architecture)

### 1.1 إنشاء التطبيق والنافذة الرئيسية
في Wails v3، يُفصل إنشاء التطبيق عن تكوين النوافذ:

```go
package main

import (
    "embed"
    "github.com/wailsapp/wails/v3/pkg/application"
)

//go:embed all:frontend/dist
var assets embed.FS

func main() {
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

    mainWindow := app.NewWebviewWindowWithOptions(application.WebviewWindowOptions{
        Title:     "Grido Studio",
        Name:      "main",
        Width:     1280,
        Height:    800,
        MinWidth:  900,
        MinHeight: 600,
        Frameless: true,
        Windows: application.WindowsWindow{
            BackdropType:           application.Mica,
            NonClientRegionSupport: true,
        },
    })
    _ = mainWindow

    if err := app.Run(); err != nil {
        println("Error:", err.Error())
    }
}
```

### 1.2 دورة حياة النافذة في Wails v3
```go
mainWindow.OnWindowEvent(events.Common.WindowRuntimeReady, func(_ *application.WindowEvent) {
    // معادل OnDomReady — الواجهة جاهزة
})

mainWindow.OnWindowEvent(events.Common.WindowClosing, func(e *application.WindowEvent) {
    // معادل OnBeforeClose — اعتراض الإغلاق
    saveWindowState(mainWindow)
})
```

**قاعدة ثابتة:** استخدم `Hidden: false` مع `StartState = application.WindowStateMaximised` دائماً، وتجنب `Hidden: true` + `time.Sleep` + `Show()` في goroutine.

### 1.3 قفل المثيل الفردي (Single Instance Lock)
```go
app := application.New(application.Options{
    SingleInstance: &application.SingleInstanceOptions{
        UniqueID: "grido-studio-single-instance-lock-v1",
        OnSecondInstanceLaunch: func(secondInstanceData application.SecondInstanceData) {
            if win, ok := application.Get().Window.GetByName("main"); ok {
                win.UnMinimise()
                win.Show()
                win.Focus()
            }
            for _, arg := range secondInstanceData.Args {
                if isImageFile(arg) {
                    application.Get().Event.Emit("file-opened", arg)
                }
            }
        },
    },
})
```

---

## 🛡️ 2. الأمان المتقدم (Windows Security & WebView2)

### 2.1 حماية مسارات الصور المحلية (Symlink Path Traversal)
> **النمط الإلزامي الموحد** (مطابق للتنفيذ الفعلي في `internal/service/media_service.go`):
> لا تمرّر مساراً كاملاً من العميل أبداً؛ استخرج اسم الملف فقط (`filepath.Base`)، ادمجه مع مجلد مسموح، ثم افحص الطرفين بـ `EvalSymlinks` وقارن بـ `filepath.Clean` على الطرفين مع `filepath.Separator` (لمنع تجاوز البادئة مثل `baseDir_evil`).

```go
func safeLocalImageHandler(w http.ResponseWriter, r *http.Request, baseDir string) {
    // 1. تطبيع الخطوط المائلة العكسية قبل أي استخراج (انظر Cross-Platform Path Normalization)
    normalized := strings.ReplaceAll(r.URL.Query().Get("file"), "\\", "/")

    // 2. استخراج اسم الملف فقط — يمنع أي مسار مطلق أو \r
    filename := filepath.Base(filepath.Clean(strings.TrimPrefix(normalized, "/local-image/")))

    // 3. البناء داخل المجلد المسموح فقط
    fullPath := filepath.Join(baseDir, filename)

    // 4. فحص Symlinks على الطرفين مع حد فاصل صريح
    resolved, err := filepath.EvalSymlinks(fullPath)
    if err != nil {
        resolved = fullPath
    }
    resolvedBase, err := filepath.EvalSymlinks(baseDir)
    if err == nil {
        baseDir = resolvedBase
    }
    if !strings.HasPrefix(filepath.Clean(resolved), filepath.Clean(baseDir)+string(filepath.Separator)) {
        http.Error(w, "Access denied", http.StatusForbidden)
        return
    }

    w.Header().Set("X-Content-Type-Options", "nosniff")
    http.ServeFile(w, r, resolved)
}
```

### 2.2 رؤوس CSP للـ WebView2
```go
const cspHeader = "default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; " +
    "style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; " +
    "connect-src 'self' https://api.supabase.io;"
```

---

## ⚡ 3. واجهات وقت التشغيل (Runtime APIs)

### 3.1 النوافذ المتعددة (Multi-Window)
```go
func (a *App) OpenPrintPreviewWindow(previewData any) {
    app := application.Get()
    if win, exists := app.Window.GetByName("print-preview"); exists {
        win.Restore(); win.Focus(); return
    }
    previewWin := app.NewWebviewWindowWithOptions(application.WebviewWindowOptions{
        Name:   "print-preview",
        Title:  "معاينة الطباعة - Grido Studio",
        Width:  1100, Height: 800,
        URL:    "/print-preview",
        Windows: application.WindowsWindow{BackdropType: application.Mica},
    })
    previewWin.OnWindowEvent(events.Common.WindowRuntimeReady, func(_ *application.WindowEvent) {
        previewWin.EmitEvent("init-print-data", previewData)
    })
}
```

### 3.2 خامات Windows 11 الأصلية (Mica & Acrylic)
```go
Windows: application.WindowsWindow{
    BackdropType:           application.Mica, // أو application.Acrylic
    NonClientRegionSupport: true,
}
```

### 3.3 السحب والإفلات الأصلي (Native File Drag & Drop)
```go
mainWindow.OnWindowEvent(events.Common.WindowFilesDropped, func(e *application.WindowEvent) {
    ctx := e.Context()
    if ctx == nil {
        return
    }
    files := ctx.DroppedFiles() // سياق أحداث النافذة لا يوفر إحداثيات المؤشر
    processed, _ := app.mediaSvc.ProcessMultipleOpenedFiles(files)
    mainWindow.EmitEvent("native-file-drop", map[string]any{
        "images": processed,
    })
})
```

### 3.4 الإشعارات الأصلية (Windows Toast Notifications)
```go
import "github.com/wailsapp/wails/v3/pkg/services/notifications"

// استخدم SendNotificationWithActions مع فئة مسجلة مسبقاً (RegisterNotificationCategory)
// لربط الأزرار، واستقبل النقرات عبر OnNotificationResponse (انظر التنفيذ الفعلي في
// internal/service/desktop_windows.go و app.go)
notifSvc.SendNotificationWithActions(notifications.NotificationOptions{
    Title: "اكتمل التصدير",
    Body:  fmt.Sprintf("تم تصدير %d صورة بنجاح.", count),
    CategoryID: "EXPORT_DONE", // فئة مسجلة عبر RegisterNotificationCategory
})
```

### 3.5 صينية النظام (System Tray)
```go
func SetupSystemTray(app *application.App) {
    tray := app.SystemTray.New()
    tray.SetIcon(trayIconBytes)
    tray.SetTooltip("Grido Studio")

    menu := app.NewMenu()
    menu.Add("إظهار التطبيق").OnClick(func(_ *application.Context) {
        if win, ok := app.Window.GetByName("main"); ok { win.Show(); win.Focus() }
    })
    menu.AddSeparator()
    menu.Add("إنهاء").OnClick(func(_ *application.Context) { app.Quit() })
    tray.SetMenu(menu)
    tray.OnDoubleClick(func() {
        if win, ok := app.Window.GetByName("main"); ok { win.Show(); win.Focus() }
    })
}
```

### 3.6 الشاشات المتعددة والحافظة
```go
// الشاشات
screens := application.Get().Screen.GetAll()
// screen.Size.Width, screen.Size.Height, screen.IsPrimary

// الحافظة
text, _ := application.Get().Clipboard.Text() // تعيد (string, bool)
application.Get().Clipboard.SetText("نص منسوخ")
```

---

## 📡 4. جسر الأحداث وإلغاء العمليات (IPC & Cancellable RPC)

| النمط | الاستخدام | التوجيه |
|:---|:---|:---|
| **RPC (Go Service Bind)** | فتح الملفات، الحفظ، البيانات | دوال تُرجع `(result, error)` |
| **EmitEvent / OnWindowEvent** | إشعارات خلفية، اكتمال معالجة | أحداث غير متزامنة |
| **AssetServer Handler** | بث الصور والملفات الضخمة | HTTP مع `Cache-Control` |
| **Cancellable Context** | عمليات AI طويلة | `ctx.Done()` في goroutine |

```go
// Go — قابل للإلغاء من الواجهة
func (s *ImageService) ProcessBatchAI(ctx context.Context, photoIDs []string) error {
    for _, id := range photoIDs {
        select {
        case <-ctx.Done():
            return errors.New("تم إلغاء العملية")
        default:
            // متابعة المعالجة
        }
    }
    return nil
}
```

```typescript
// TypeScript
const call = ImageService.ProcessBatchAI(selectedIds);
cancelBtn.onclick = () => call.cancel();
```

---

## 🔧 5. أخطاء شائعة وحلولها

| المشكلة | السبب | الحل |
|:---|:---|:---|
| النافذة تنغلق فوراً | `CGO_ENABLED=0` مع `go-sqlite3` | تأكد من GCC + `CGO_ENABLED: '1'` في Taskfile |
| وضع التطوير يفتح المتصفح فقط | انهيار Go في الخلفية | راجع `%AppData%\GridoStudio\logs\grido.log` |
| متغيرات البيئة لا تُحقن | Wails v3 لا يحقنها تلقائياً | استخدم `ldflags` صريحة في `Taskfile.yml` |
| تحذيرات `uname`/`tail` | قوالب ios/android في includes | استبعدها من `Taskfile.yml` |

---

## 🎯 6. قائمة تحقق الجودة

- [x] الخدمات مسجّلة عبر `application.NewService(...)` في `Options.Services`
- [x] كاش WebView2 مخصص داخل AppData عبر `WebviewUserDataPath`
- [x] النافذة Frameless مع Mica أو Acrylic على Windows 11
- [x] قفل المثيل يوجه وسائط CLI للنافذة الأولى
- [x] فحص مسارات الصور ضد Symlink Path Traversal
- [x] دعم السحب والإفلات عبر `WindowFilesDropped`
- [x] استعادة موضع النافذة مشروطة بوجود النقطة داخل شاشة متصلة
- [x] رؤوس CSP تدعم `wasm-unsafe-eval`
- [x] `CGO_ENABLED=1` في جميع مهام البناء
