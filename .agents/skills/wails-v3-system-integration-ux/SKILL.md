---
name: wails-v3-system-integration-ux
description: دليل مهارة الاندماج العميق مع Windows 11 وتطبيق معايير Fluent 2 الأصلية في Wails v3
---

# 🪟 مهارة التكامل مع نظام Windows 11 و Fluent 2 (Wails v3 System UX Integration)

يقدم هذا الدليل المعايير الهندسية لربط واجهة التطبيق مع مزايا نظام ويندوز 11 الأصلي وشريط العنوان وصينية النظام.

---

## 🎨 1. شريط العنوان المخصص وسحب النافذة الأصلي (Custom Titlebar & Non-Client Dragging)

في Wails v3 مع معايير Fluent 2:
```go
mainWindow := app.NewWebviewWindowWithOptions(application.WebviewWindowOptions{
    Frameless: true,
    Windows: application.WindowsWindow{
        BackdropType:           application.Mica,
        NonClientRegionSupport: true, // تفعيل السحب الأصلي لشريط العنوان
    },
})
```

في كود الـ React:
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

---

## 🔔 2. الإشعارات التفاعلية وصينية النظام (Toast Notifications & Tray)
* استخدم خدمة `notifications.New()` لإرسال إشعارات ويندوز الأصلية مع روابط سريعة لفتح مجلدات الحفظ.
* استخدم `app.SystemTray.New()` لضمان بقاء مهام المعالجة الدفعية في الخلفية مع توفير قوائم وصول سريعة.
