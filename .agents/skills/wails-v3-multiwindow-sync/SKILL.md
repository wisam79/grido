---
name: wails-v3-multiwindow-sync
description: دليل مهارة إدارة ومزامنة النوافذ المتعددة المستقلة في Wails v3 وتدفق الحالة اللحظية
---

# 🪟 مهارة إدارة ومزامنة النوافذ المتعددة (Wails v3 Multi-Window Sync)

يقدم هذا الدليل المرجعي المعايير المعمارية لإنشاء وإدارة النوافذ المستقلة (شاشة العميل، معاينة الطباعة، استوديو الأدوات) ومزامنة بياناتها فورياً.

---

## 🏛️ 1. إنشاء واستعادة النوافذ الذرية

> **تنبيه توافق:** الأمثلة أدناه تعكس نمط API العام في Wails v3 (beta). عند التنفيذ الفعلي في هذا المشروع، تحقق دائماً من التواقيع الدقيقة في نسخة الـ SDK المثبتة (`go.mod`: `v3.0.0-beta.25`) ومثال `main.go` الحقيقي قبل النسخ — أسماء دوال الوصول للنوافذ والأحداث تتغير بين إصدارات الـ beta.

```go
func (a *App) ShowOrCreateAuxiliaryWindow(name, title, route string, w, h int) *application.WebviewWindow {
    app := application.Get()
    
    // التحقق من وجود النافذة مسبقاً لإيقاظها
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
            BackdropType: application.Mica,
        },
    })
    return win
}
```

---

## 📡 2. جسر المزامنة اللحظي (Event Bus Syncing)

> **تنبيه توافق:** كذلك هنا — تحقق من تواقيع `EventsEmit`/`EventsOn` في جسر `frontend/wailsjs/runtime/runtime.ts` المعتمد في المشروع قبل نسخ أي نمط.

عند تحديث الكانفاس في النافذة الرئيسية، يتم بث التحديثات إلى النوافذ الثانوية عبر قنوات الأحداث:

```typescript
// في النافذة الرئيسية (Sender):
// بث الأحداث عبر جسر wailsjs/runtime الموحد (EventsEmit) — الواجهة لا تستورد @wailsio/runtime مباشرة
import { EventsEmit } from "../wailsjs/runtime/runtime";

export function syncCanvasToAuxiliary(windowName: string, state: Partial<CanvasState>) {
  EventsEmit(`sync:canvas:${windowName}`, state);
}

// في النافذة الثانوية (Receiver):
// الاستيراد الموحد عبر جسر wailsjs/runtime (انظر grido-architecture-navigator)
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
