---
name: grido-architecture-navigator
description: دليل معمارية وخريطة كود Grido Studio المكتوبة بـ (Wails + Go + React + Konva) لفهم تدفق البيانات والهياكل والمكونات فورياً
---

# 🗺️ خريطة ومعمارية Grido Studio (Architecture Navigator)

استخدم هذه المهارة لفهم تدفق البيانات، مواقع المكونات، والعلاقة بين Go Backend و React Frontend بلمحة واحدة.

---

## 🏗️ 1. الهيكل العام ودليل الملفات (Directory Layout)

### 🔹 Go Backend (`/internal` & `/main.go`)
- **[main.go](file:///c:/projects/grido/main.go):** مدخل التطبيق وتثبيت الـ Assets و Mime Types و Wails Runtime Options.
- **[app.go](file:///c:/projects/grido/app.go):** الواجهة الرئيسية الرابطة بين Wails والخدمات (App struct).
- **`internal/core/domain/`**: الهياكل الأساسية والأنواع (Domain Models):
  - [print.go](file:///c:/projects/grido/internal/core/domain/print.go): `PrintRequest`, `PrintItem`, `CutLine`, `PrintResult`.
  - [user.go](file:///c:/projects/grido/internal/core/domain/user.go): `UserProfile`, `LicenseInfo`.
  - [project.go](file:///c:/projects/grido/internal/core/domain/project.go): `ProjectData`, `CanvasElement`.
- **`internal/service/`**: خدمات المنطق والعمليات الخلفية (Services):
  - [print_service.go](file:///c:/projects/grido/internal/service/print_service.go): رسم الكولاج، التحويل إلى CMYK، التصدير لـ TIFF/PNG، وإدارة طباعة HTML.
  - [media_service.go](file:///c:/projects/grido/internal/service/media_service.go): استخراج أبعاد الصور `GetImageDimensions` والـ Local Image Handler.
  - [license_service.go](file:///c:/projects/grido/internal/service/license_service.go): الاتصال بـ Supabase (دخول البريد، OTP، Google OAuth، تفعيل الترخيص).
  - [ai_service.go](file:///c:/projects/grido/internal/service/ai_service.go): إزالة الخلفية وترميم الوجوه عبر Modal AI الخارجي أو MediaPipe المحلي.
  - [autosave_service.go](file:///c:/projects/grido/internal/service/autosave_service.go): الحفظ الذري الدوري لملفات المشاريع على القرص (`f.Sync()` + `os.Rename`).
- **`internal/repository/`**: حفظ البيانات المحلية في ملفات ومربعات SQLite / JSON.
- **`internal/utils/`**: الأدوات المساعدة: `GetAppDir()`, `OpenBrowser()`, `GetDeviceID()`.

---

### 🔹 React Frontend (`/frontend/src`)
- **`src/lib/store/`**: إدارة الحالة المركزية عبر Zustand (`useEditorStore`):
  - [editor-store.ts](file:///c:/projects/grido/frontend/src/lib/store/editor-store.ts): المتجر الرئيسي التجميعي للـ Slices.
  - `slices/core-slice.ts`: الأبعاد، العناصر، النمط (`mode`: `single` | `collage`), الألوان، الحفظ والتحميل.
  - `slices/history-slice.ts`: التراجع والإعادة (Undo/Redo) بنسخ سطحي محفّز.
  - `slices/license-slice.ts`: مصادقة المستخدم، التراخيص، والدخول عبر جوجل.
  - `slices/ui-slice.ts`: النوافذ المنبثقة، التكبير (Zoom)، المساطر، والحوارات.
- **`src/components/editor/`**: مكونات المحرر الرئيسي:
  - [editor-canvas.tsx](file:///c:/projects/grido/frontend/src/components/editor/editor-canvas.tsx): مساحة العمل والتفاعلات الرئيسية والسحب والإسقاط (Drop Zone).
  - `konva/konva-canvas.tsx`: محرك الرسم بـ Konva Stage & Layers.
  - `konva/konva-grid.tsx`: شبكة النقاط المحفزة رسومياً بـ `beginPath()` واحد.
  - `print-dialog.tsx`: نافذة إعدادات ورقة الطباعة واختيار sRGB / CMYK.
  - `account-license-modal.tsx`: نافذة الحساب والتراخيص وتأكيد المصادقة.
- **`wailsjs/go/`**: الواجهات المولدة تلقائياً بواسطة Wails للتواصل بين JS ↔ Go (`main/App` و `models.ts`).

---

## 🔄 2. تدفق البيانات والجسر التفاعلي (IPC Bridge Flow)

```mermaid
graph TD
    A["React UI (Events)"] -->|"useEditorStore.getState()"| B["Zustand Slice"]
    B -->|"Wails Async Call"| C["Go Handler / App struct"]
    C -->|"Go Service (Goroutines)"| D["Domain Processing / Disk / AI"]
    D -->|"Return Data / Error"| C
    C -->|"Resolve Promise (JSON/Model)"| B
    B -->|"Re-render UI"| A
```

### 💡 قواعد استدعاءات Wails الذهبية:
1. **استبقاء الأخطاء:** Wails يرجع الأخطاء كـ `string`. استخدم دائماً:
   `typeof err === "string" ? err : (err instanceof Error ? err.message : fallback)`
2. **منع Stale Closures:** داخل معالجات الأحداث غير المتزامنة (مثل `handleDrop`) استخدم دائماً `useEditorStore.getState()` لقراءة أحدث حالة مباشرة لحظة وقوع الحدث.

---

## 📁 3. بيئة الملفات والمجلدات الخاصة بالبرنامج (AppData & Temp)
- **مجلد البيانات الرئيسي:** يُجلب عبر `utils.GetAppDir()` (`%APPDATA%\GridoStudio` في الويندوز، أو `GRIDO_APP_DIR` للاختبارات).
- **التصديرات المؤقتة:** `GetAppDir()/Exports/` (تُنظف تلقائياً للملفات الأقدم من 24 ساعة).
- **الحفظ التلقائي:** `GetAppDir()/AutoSave/project_autosave.json`.
- **المعاينات المحلية:** الصور تُعرض في المتصفح عبر المسار المأمون `/local-image/<filename>` المفحوص ضد ثغرة Symlink & Path Traversal.
