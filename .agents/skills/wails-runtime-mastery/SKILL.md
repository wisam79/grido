---
name: wails-runtime-mastery
description: دليل وخريطة مهارة Wails v2 الشاملة لتطبيقات سطح المكتب (Architecture, Runtime APIs, Security Hardening, Windows Fluent Integration, Drag & Drop, Multi-Monitor & IPC)
---

# 🚀 دليل احتراف محرك Wails v2 الشامل (Wails Runtime Mastery)

يقدم هذا الدليل المرجعي كافة التقنيات والمعايير الهندسية المعتمدة لاستغلال أقصى قدرات محرك **Wails v2** ودمجه بسلاسة مع الواجهة الرسومية (React + Konva) والأنظمة الأساسية (خاصة Windows 10/11).

---

## 🏛️ 1. المعمارية ودورة حياة التطبيق (Lifecycle & Architecture)

### 1.1 إدارة السياق الموحد (`context.Context`)
* سياق Wails (`ctx`) الذي يُمرر إلى `OnStartup(ctx)` هو المحرك الرئيسي لكافة عمليات وقت التشغيل (`runtime.*`).
* **القاعدة:** يجب تمرير وحفظ هذا السياق داخل الـ Struct الرئيسي (`App.ctx`) وتوزيعه على كافة الخدمات التي تحتاج للتفاعل مع الواجهة أو النظام (مثل `phoneBridgeSvc`, `licenseSvc`, `updater`).
* **دورة الحياة الكاملة:**
  1. `OnStartup`: استعادة حالة وموضع النافذة، ربط المستمعين، وتنظيف المهام المؤقتة بالخلفية.
  2. `OnDomReady`: إظهار النافذة بعد اكتمال جاهزية الـ DOM لتجنب الوميض الأولي (`StartHidden: true` ثم `WindowShow(ctx)`).
  3. `OnBeforeClose`: اعتراض رغبة المستخدم بالإغلاق للتأكد من حفظ المشاريع أو التنبيه.
  4. `OnShutdown`: حفظ موضع وأبعاد النافذة ذرياً (`window.json`)، إغلاق قواعد البيانات (`CloseDB`)، وإيقاف الخدمات المجدولة.

### 1.2 قفل المثيل الفردي المتطور (`SingleInstanceLock`)
استخدم قفل المثيل المدمج في Wails بدلاً من ملفات القفل اليدوية أو الميوتكس المعقد:
```go
SingleInstanceLock: &options.SingleInstanceLock{
    UniqueId: "grido-studio-single-instance-lock-v1",
    OnSecondInstanceLaunch: func(data options.SecondInstanceData) {
        // إيقاظ وإظهار النافذة الحالية
        wailsruntime.WindowUnminimise(app.ctx)
        wailsruntime.WindowShow(app.ctx)
        // تمرير وسائط سطر الأوامر (مثل فتح صورة جديدة) للنافذة النشطة
        if len(data.Args) > 0 {
            for _, arg := range data.Args {
                if isImageFile(arg) {
                    wailsruntime.EventsEmit(app.ctx, "file-opened", arg)
                }
            }
        }
    },
},
```

---

## 🛡️ 2. الأمان المتقدم وتحصين بيئة ويندوز (Windows Security & WebView2)

### 2.1 الحماية من هجمات حقن المكتبات (DLL Preloading / Hijacking Protection)
في أنظمة ويندوز، ابحث عن المكتبات في مسارات النظام الآمنة ومجلد التطبيق فقط:
```go
Windows: &windows.Options{
    DLLSearchPaths: windows.DLLSearchSafeCurrentDirs | 
                    windows.DLLSearchSystem32 | 
                    windows.DLLSearchApplicationDir,
    // ...
}
```

### 2.2 منع تعارض التكبير والإيماءات في WebView2 (Zoom & Gesture Invariants)
عند بناء تطبيقات رسومية أو محررات كانفاس (مثل Konva):
* عطل التكبير الافتراضي للمتصفح `IsZoomControlEnabled: false` لمنع تشوه واجهة المستخدم بنقر `Ctrl + Scroll`.
* عطل تقريب اللمس `DisablePinchZoom: true` لضمان استجابة الكانفاس الحصرية لإيماءات اللمس.
* فعل إخماد إعادة التحجيم `ResizeDebounceMS: 10` لضمان نعومة استجابة النافذة أثناء السحب والتحجيم.

### 2.3 عزل ومزامنة السكون (Power Suspend & Resume)
تفاعل مع أوضاع توفير الطاقة لتفادي تعليق اتصالات الشبكة:
```go
OnSuspend: func() {
    wailsruntime.EventsEmit(app.ctx, "app:suspend")
},
OnResume: func() {
    wailsruntime.EventsEmit(app.ctx, "app:resume")
},
```

---

## ⚡ 3. واجهات وقت التشغيل المتقدمة (Runtime APIs)

### 3.1 السحب والإفلات الأصلي فائق الأداء (Native File Drag & Drop)
بدلاً من قراءة الملفات عبر HTML5 FileReader وتحويلها إلى Base64 ثقيل في الذاكرة:
1. فعل ميزة السحب في خيارات التطبيق:
   ```go
   DragAndDrop: &options.DragAndDrop{
       EnableFileDrop: true,
       DisableWebViewDrop: false,
   }
   ```
2. استقبل المسارات الفعلية مباشرة عبر Go:
   ```go
   wailsruntime.OnFileDrop(ctx, func(x, y int, paths []string) {
       // معالجة الملفات محلياً في Go بدون استهلاك للـ Base64
       processedImages, _ := app.mediaSvc.ProcessMultipleOpenedFiles(paths)
       wailsruntime.EventsEmit(ctx, "native-file-drop", map[string]any{
           "x": x, "y": y, "images": processedImages,
       })
   })
   ```

### 3.2 دعم الشاشات المتعددة (Multi-Monitor Awareness)
استخدم `wailsruntime.ScreenGetAll(ctx)` للحصول على أبعاد ودقة ومعدل تحديث كافة الشاشات المتصلة للتأكد من تموضع النوافذ المنبثقة والمعاينة بدقة.

### 3.3 الحافظة الأصلية (Native Clipboard Fallback)
يوفر Wails وصولاً فورياً لنظام الحافظة دون قيود أذونات المتصفح:
* `wailsruntime.ClipboardGetText(ctx)`
* `wailsruntime.ClipboardSetText(ctx, text)`

---

## 📡 4. أفضل ممارسات جسر الأحداث (Wails IPC Bridge)

| النمط | الاستخدام الأمثل | التوجيه |
|:---|:---|:---|
| **Wails RPC (Go Bind)** | استدعاءات البيانات، فتح الملفات، الحفظ | دوال صريحة تُرجع `(result, error)` |
| **EventsEmit / EventsOn** | إشعارات الخلفية، اكتمال المعالجة، السحب، السكون | أحداث غير متزامنة مع تنظيف `EventsOff` دائماً |
| **AssetServer HTTP Handler** | بث الصور والفيديوهات والملفات الضخمة | تدفق ثنائي مع رؤوس `Cache-Control` و `nosniff` |

---

## 🎯 5. قائمة تحقق الجودة لتطبيقات Wails

- [x] السياق مربوط وموزع على الخدمات بنمط Dependency Injection.
- [x] مسار كاش WebView2 مخصص داخل AppData عبر `WebviewUserDataPath`.
- [x] النافذة بدون إطار Frameless مع تفعيل إزاحة وظلال ويندوز الأصلية (`DisableFramelessWindowDecorations: false`).
- [x] قفل المثيل الموحد يوجه وسائط سطر الأوامر للنافذة الأولى.
- [x] تأمين الـ DLLs ضد هجمات الـ Preloading.
- [x] دعم السحب والإفلات الأصلي بمسارات الملفات المباشرة.
- [x] استعادة الموضع السابق مشروطة بوجود النقطة داخل شاشة متصلة فعلياً.
