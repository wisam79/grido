---
name: wails-v3-runtime-mastery
description: دليل وخريطة مهارة Wails v3 الشاملة لتطبيقات سطح المكتب (Architecture, Multi-Window Sync, Asset Streaming, Security, Windows Fluent Integration, Drag & Drop, & IPC) — v3.0.0 GA
---

# 🚀 دليل احتراف محرك Wails v3 الشامل (Wails Runtime Mastery)

يقدم هذا الدليل المرجعي كافة التقنيات والمعايير الهندسية المعتمدة لاستغلال أقصى قدرات محرك **Wails v3** ودمجه بسلاسة مع الواجهة الرسومية (React + Konva) والأنظمة الأساسية (خاصة Windows 10/11).

> **الإصدار الفعلي:** `github.com/wailsapp/wails/v3 v3.0.0` (GA المستقرة)
> **أداة البناء:** `wails3` CLI مع `Taskfile.yml`
> **الحزمة الرئيسية:** `github.com/wailsapp/wails/v3/pkg/application`
> **جسور الواجهة المعتمدة:** `frontend/wailsjs/runtime/runtime.ts` كنقطة استيراد موحدة

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

## 🪟 2. إدارة ومزامنة النوافذ المتعددة (Multi-Window & Event Bus Sync)

### 2.1 إنشاء واستعادة النوافذ الذرية
```go
func (a *App) ShowOrCreateAuxiliaryWindow(name, title, route string, w, h int) *application.WebviewWindow {
    app := application.Get()
    if win, exists := app.Window.GetByName(name); exists {
        win.Restore()
        win.Show()
        win.Focus()
        return win
    }

    win := app.NewWebviewWindowWithOptions(application.WebviewWindowOptions{
        Name:      name,
        Title:     title,
        Width:     w,
        Height:    h,
        URL:       route,
        Frameless: true,
        Windows: application.WindowsWindow{
            BackdropType:           application.Mica,
            NonClientRegionSupport: true,
        },
    })
    return win
}
```

### 2.2 جسر المزامنة اللحظي (Event Bus Syncing)
عند تحديث الكانفاس في النافذة الرئيسية، يتم بث التحديثات إلى النوافذ الثانوية عبر قنوات الأحداث:

```typescript
// في النافذة الرئيسية (Sender):
// بث الأحداث عبر جسر wailsjs/runtime الموحد (EventsEmit) — الواجهة لا تستورد @wailsio/runtime مباشرة
import { EventsEmit } from "../wailsjs/runtime/runtime";

export function syncCanvasToAuxiliary(windowName: string, state: Partial<CanvasState>) {
  EventsEmit(`sync:canvas:${windowName}`, state);
}

// في النافذة الثانوية (Receiver):
import { EventsOn, EventsOff } from "@/wailsjs/runtime/runtime";

useEffect(() => {
  const unsubscribe = EventsOn("sync:canvas:preview", (payload) => {
    updatePreviewStore(payload.data);
  });
  return () => {
    if (typeof unsubscribe === "function") unsubscribe();
    else EventsOff("sync:canvas:preview");
  };
}, []);
```

---

## 🛡️ 3. الأمان المتقدم وتدفق الوسائط (Native I/O & Asset Server)

### 3.1 حماية مسارات الصور المحلية (Symlink Path Traversal)
> **النمط الإلزامي الموحد** (مطابق للتنفيذ الفعلي في `internal/service/media_service.go`):
> لا تمرّر مساراً كاملاً من العميل أبداً؛ استخرج اسم الملف فقط (`filepath.Base`)، ادمجه مع مجلد مسموح، ثم افحص الطرفين بـ `EvalSymlinks` وقارن بـ `filepath.Clean` على الطرفين مع `filepath.Separator` (لمنع تجاوز البادئة مثل `baseDir_evil`).

```go
func safeLocalImageHandler(w http.ResponseWriter, r *http.Request, baseDir string) {
    // 1. تطبيع الخطوط المائلة العكسية قبل أي استخراج
    normalized := strings.ReplaceAll(r.URL.Query().Get("file"), "\\", "/")

    // 2. استخراج اسم الملف فقط — يمنع أي مسار مطلق أو تجاوز مجلدات
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

    w.Header().Set("Cache-Control", "public, max-age=31536000, immutable")
    w.Header().Set("X-Content-Type-Options", "nosniff")
    http.ServeFile(w, r, resolved)
}
```

### 3.2 حظر Base64 للميديا الضخمة
* يُمنع تحويل صور الكاميرا أو المشاريع إلى Base64 لنقلها عبر RPC لتفادي إجهاد Garbage Collector وانفجار الذاكرة.
* يتم التعامل حصراً مع المسارات المحلية عبر معالج ميديا `wails://` أو التدفق الثنائي المباشر.

### 3.3 رؤوس CSP للـ WebView2
```go
const cspHeader = "default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; " +
    "style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; " +
    "connect-src 'self' https://api.supabase.io;"
```

---

## 🎨 4. الاندماج العميق مع Windows 11 و Fluent 2

### 4.1 شريط العنوان وسحب النافذة الأصلي
في كود Go:
```go
Windows: application.WindowsWindow{
    BackdropType:           application.Mica, // أو application.Acrylic
    NonClientRegionSupport: true,             // تفعيل السحب الأصلي من شريط العنوان
}
```

في كود React:
```tsx
// استخدام خاصية CSS المعتمدة لسحب النافذة عبر الويندوز مباشرة
<header className="h-12 flex items-center justify-between px-4" style={{ '--wails-draggable': 'drag' } as any}>
  <div className="flex items-center gap-2" style={{ '--wails-draggable': 'no-drag' } as any}>
    {/* عناصر التحكم والأزرار تستثنى من السحب */}
    <Logo />
    <MenuBar />
  </div>
</header>
```

### 4.2 السحب والإفلات الأصلي (Native File Drag & Drop)
```go
mainWindow.OnWindowEvent(events.Common.WindowFilesDropped, func(e *application.WindowEvent) {
    ctx := e.Context()
    if ctx == nil {
        return
    }
    files := ctx.DroppedFiles()
    processed, _ := app.mediaSvc.ProcessMultipleOpenedFiles(files)
    mainWindow.EmitEvent("native-file-drop", map[string]any{
        "images": processed,
    })
})
```

### 4.3 الإشعارات التفاعلية وصينية النظام (Notifications & System Tray)
```go
import "github.com/wailsapp/wails/v3/pkg/services/notifications"

// إشعارات ويندوز مع أزرار استجابة
notifSvc.SendNotificationWithActions(notifications.NotificationOptions{
    Title:      "اكتمل التصدير",
    Body:       fmt.Sprintf("تم تصدير %d صورة بنجاح.", count),
    CategoryID: "EXPORT_DONE",
})

// صينية النظام
tray := app.SystemTray.New()
tray.SetIcon(trayIconBytes)
tray.SetTooltip("Grido Studio")
tray.OnDoubleClick(func() {
    if win, ok := app.Window.GetByName("main"); ok { win.Show(); win.Focus() }
})
```

---

## 🛠️ 5. أوامر التشغيل وهندسة الربطات (CLI & Bindings Pipeline)

```powershell
# 1. تثبيت أداة Wails3 CLI الرسمية المعتمدة
go install github.com/wailsapp/wails/v3/cmd/wails3@v3.0.0

# 2. تشغيل وضع التطوير المحلي مع Hot Reload
wails3 task dev

# 3. توليد ربطات TypeScript بعد أي تعديل على دوال Go
wails3 generate bindings -ts -clean=true

# 4. بناء الملف التنفيذي للإنتاج محلياً
wails3 task build

# 5. بناء مثبت الويندوز NSIS للإنتاج
wails3 task package
```

### خط أنابيب الربطات والجسور:
1. **الربطات الأصلية (`frontend/bindings/`):** تُولّد تلقائياً عبر `wails3 generate bindings` ومستثناة من Git في `.gitignore`. تستخدم `$Call.ByID(...)` من `@wailsio/runtime`.
2. **جسور الواجهة (`frontend/wailsjs/`):** ملفات جسور يدوية متتبعة في Git تعيد تصدير الربطات وتوفر واجهة برمجية مستقرة للمكونات دون التأثر بإعادة التوليد.

---

## 🎯 6. قائمة فحص الجودة لمحرك Wails v3

- [x] الخدمات مسجّلة عبر `application.NewService(...)` في `Options.Services`
- [x] كاش WebView2 مخصص داخل AppData عبر `WebviewUserDataPath`
- [x] النافذة Frameless مع Mica أو Acrylic على Windows 11 و `NonClientRegionSupport: true`
- [x] شريط العنوان يستخدم `--wails-draggable: drag` مع `--wails-draggable: no-drag` لعناصر التحكم
- [x] قفل المثيل الفردي يوجه وسائط CLI للنافذة الأولى
- [x] فحص مسارات الصور ضد Symlink Path Traversal وتجنب Base64 للميديا الضخمة
- [x] جسور الأحداث في الواجهة تستورد حصراً من `frontend/wailsjs/runtime/runtime`
- [x] `CGO_ENABLED=1` في جميع مهام البناء (لدعم SQLite و CGO)
