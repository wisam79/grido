---
name: wails-v3-multiwindow-sync
description: دليل مهارة إدارة ومزامنة النوافذ المتعددة المستقلة في Wails v3 وتدفق الحالة اللحظية
---

# 🪟 مهارة إدارة ومزامنة النوافذ المتعددة (Wails v3 Multi-Window Sync)

يقدم هذا الدليل المرجعي المعايير المعمارية لإنشاء وإدارة النوافذ المستقلة (شاشة العميل، معاينة الطباعة، استوديو الأدوات) ومزامنة بياناتها فورياً.

---

## 🏛️ 1. إنشاء واستعادة النوافذ الذرية

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

عند تحديث الكانفاس في النافذة الرئيسية، يتم بث التحديثات إلى النوافذ الثانوية عبر قنوات الأحداث:

```typescript
// في النافذة الرئيسية (Sender):
export function syncCanvasToAuxiliary(windowName: string, state: Partial<CanvasState>) {
  window.wails?.Events?.Emit({
    name: `sync:canvas:${windowName}`,
    data: state,
  });
}

// في النافذة الثانوية (Receiver):
useEffect(() => {
  const unsub = window.wails?.Events?.On("sync:canvas:preview", (payload) => {
    updatePreviewStore(payload.data);
  });
  return () => unsub?.();
}, []);
```
