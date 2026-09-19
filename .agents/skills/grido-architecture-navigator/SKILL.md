---
name: grido-architecture-navigator
description: دليل معمارية وخريطة كود Grido Studio المكتوبة بـ (Wails + Go + React + Konva) لفهم تدفق البيانات والهياكل والمكونات فورياً
---

# 🗺️ خريطة ومعمارية Grido Studio (Architecture Navigator)

استخدم هذه المهارة لفهم تدفق البيانات، مواقع المكونات، والعلاقة بين Go Backend و React Frontend بلمحة واحدة.

---

## 🏗️ 1. الهيكل العام ودليل الملفات (Directory Layout)

### 🔹 Go Backend (`/internal` & `/main.go`)
- **[main.go](file:///c:/projects/grido/main.go):** مدخل التطبيق في Wails v3 (`application.New`) وتثبيت الـ Assets Handler ومعالجات الميديا والخدمات (`application.NewService`) وخيارات النافذة الأصلية.
- **[app.go](file:///c:/projects/grido/app.go):** الواجهة الرئيسية الرابطة بين Wails والخدمات (App struct المعرض للواجهة).
- **`internal/core/domain/`**: الهياكل الأساسية والأنواع (Domain Models):
  - [print.go](file:///c:/projects/grido/internal/core/domain/print.go): `PrintRequest`, `PrintItem`, `CutLine`, `PrintResult`, `CanvasComposition`.
  - [license.go](file:///c:/projects/grido/internal/core/domain/license.go): `UserProfile`, `LicenseRepository` (المصادقة والترخيص والخطط).
  - [project.go](file:///c:/projects/grido/internal/core/domain/project.go): `Project`, `ProjectRepository`.
  - [template.go](file:///c:/projects/grido/internal/core/domain/template.go): قوالب الورق والأجهزة المعيارية.
  - [json_text.go](file:///c:/projects/grido/internal/core/domain/json_text.go): أنواع مساعدة لتسلسل JSON.
- **`internal/handlers/`**: معالجات Wails v3 المعرضة للواجهة (مثل `licensehandler`, `projecthandler`, `printhandler`, `backuphandler`) — كل معالج جديد هنا يتطلب توليد الربطات ومعالج Mock في جسر الاختبارات (انظر حارس انحراف العقود في AGENTS.md).
- **`internal/service/`**: خدمات المنطق والعمليات الخلفية (Services):
  - [print_service.go](file:///c:/projects/grido/internal/service/print_service.go): رسم الكولاج، التحويل إلى CMYK (`print_cmyk.go`)، التصدير لـ TIFF/PNG، والطباعة الأصلية (`print_native.go`).
  - [media_service.go](file:///c:/projects/grido/internal/service/media_service.go): استخراج أبعاد الصور `GetImageDimensions` ومعالج `/local-image/` الآمن ضد Path Traversal.
  - [license_service.go](file:///c:/projects/grido/internal/service/license_service.go): الاتصال بـ Supabase (دخول البريد، OTP، Google OAuth عبر `auth_flows.go` و `oauth_server.go`، تفعيل الترخيص).
  - [ai_service.go](file:///c:/projects/grido/internal/service/ai_service.go): إزالة الخلفية وترميم الوجوه عبر Modal AI الخارجي والتحقق من الحصص خادمياً.
  - [autosave_service.go](file:///c:/projects/grido/internal/service/autosave_service.go): الحفظ الذري الدوري لملفات المشاريع على القرص (`f.Sync()` + `os.Rename`).
  - [updater.go](file:///c:/projects/grido/internal/service/updater.go): التحقق من التحديثات السحابية ومطابقة بصمة SHA-256 والتحديث الصامت.
  - [logger.go](file:///c:/projects/grido/internal/service/logger.go): نظام التدوين والتسجيل الموحد (Lumberjack) وتصدير السجلات.
  - ملفات إضافية: `project_service.go` (حفظ وتحميل المشاريع)، `backup_service.go` (النسخ الاحتياطي والاستيراد)، `phone_bridge_service.go` (جسر الهاتف)، `image_processor.go` (المعالجة الثنائية)، `http_retry.go` (إعادة المحاولة مع Backoff)، `zip.go` (أرشفة النسخ الاحتياطي).
- **`internal/repository/`**: حفظ البيانات المحلية في ملفات ومربعات SQLite / JSON.
- **`internal/utils/`**: الأدوات المساعدة: `GetAppDir()`, `OpenBrowser()`, `GetDeviceID()`.

---

### 🔹 React Frontend (`/frontend/src`)
- **`src/lib/`**: المكتبات والخدمات المنطقية المنظمة حسب الاختصاص:
  - **`store/`**: إدارة الحالة المركزية عبر Zustand (`useEditorStore`):
    - [index.ts](file:///c:/projects/grido/frontend/src/lib/store/index.ts): المتجر الرئيسي التجميعي للـ Slices السبعة.
    - `slices/core-slice.ts`: الأبعاد، الورق المعياري، DPI، النمط (`mode`: `single` | `collage`)، الألوان، والحفظ والتحميل.
    - `slices/element-slice.ts`: إدارة وإضافة وتعديل وحذف وتأمين العناصر الحرة (صور، نصوص، أشكال) والتحويلات.
    - `slices/collage-slice.ts`: قوالب الكولاج، تعيين الصور في الخانات، التحويلات (`dragX`, `dragY`, `zoom`, `flip`, `rotation`)، والفواصل.
    - `slices/grid-slice.ts`: إعدادات الشبكة الإرشادية والأعمدة والمحاذاة المغناطيسية (`snapToGrid`).
    - `slices/history-slice.ts`: التراجع والإعادة (Undo/Redo) بنسخ سطحي محفّز وسقف 30 لقطة.
    - `slices/license-slice.ts`: مصادقة المستخدم، التراخيص، الحصص اليومية، والدخول عبر جوجل.
    - `slices/print-slice.ts`: إعدادات الطباعة، الهوامش، النزيف (Bleed)، وتوزيع النسخ وخطوط القص.
  - **`print/`**: محركات الطباعة والقص (`print-layout-math.ts`, `cut-lines-utils.ts`, `single-print-composition.ts`).
  - **`canvas/`**: هندسة الكانفاس والمحاذاة والتصدير (`snap-utils.ts`, `stage-context.tsx`, `render-quality.ts`, `konva-export-utils.ts`).
  - **`filters/`**: فلاتر الصور وتأطير الوجوه الذكي (`custom-filters.ts`, `konva-filters.ts`, `face-frame-utils.ts`).
  - **`io/`**: خدمات الملفات والحافظة والخطوط والمشاريع (`file-dialog-utils.ts`, `clipboard-utils.ts`, `project-serializer.ts`, `fonts.ts`).
  - **`templates/`**: قوالب الهوية والكولاج وشبكات الطباعة القياسية.
- **`src/components/editor/`**: مكونات المحرر المنظمة هرمياً:
  - **`dialogs/`**: النوافذ المنبثقة (`print-dialog.tsx`, `export-dialog.tsx`, `crop-dialog.tsx`, `refine-bg-dialog.tsx`, `projects-dialog.tsx`, `account-license-modal.tsx`, `keyboard-shortcuts-dialog.tsx`).
  - **`panels/`**: الألواح الجانبية وبطاقات القوالب (`template-panel.tsx`, `properties-panel.tsx`, `layers-panel.tsx`, `collage-template-card.tsx`, `custom-collage-card.tsx`, `photo-type-miniature.tsx`).
  - **`toolbar/`**: شريط الأدوات وعمليات الملفات (`toolbar.tsx`, `toolbar-items.tsx`, `toolbar-file-ops.tsx`).
  - **`system/`**: خدمات النظام ونوافذ ويندوز (`update-notifier.tsx`, `window-resize-handles.tsx`).
  - **`canvas/`**: مساحة العمل والكانفاس (`editor-canvas.tsx`, `context-menu.tsx`, `canvas-rulers.tsx`, `canvas-quick-bar.tsx`, `text-editing-overlay.tsx`).
  - **`properties/`**: لوحات التحكم بالخصائص والألوان والتأثيرات (`element-properties.tsx`, `slot-properties.tsx`, `collage-settings.tsx`, `gradient-picker.tsx`, `shared-controls.tsx`).
  - **`konva/`**: محرك الرسم بـ Konva (`konva-canvas.tsx`, `konva-grid.tsx`, عقد العناصر `elements/`).
- **`frontend/bindings/`**: الربطات الأصلية المولدة تلقائياً بواسطة Wails v3 عبر أمر `wails3 generate bindings -ts -clean=true` (مستثناة من Git).
- **`frontend/wailsjs/`**: **جسور يدوية متتبعة في Git** تعيد التصدير من `frontend/bindings/` لضمان توافقية الاستيرادات وسهولة الصيانة (مثل `wailsjs/go/main/App.ts` → `bindings/grido/app`).

---

## 🔄 2. تدفق البيانات والجسر التفاعلي (IPC Bridge Flow in Wails v3)

```mermaid
graph TD
    A["React UI (Events / Components)"] -->|"useEditorStore.getState()"| B["Zustand Slice / Action"]
    B -->|"Wails v3 Runtime ($Call.ByID)"| C["Go Service / App struct"]
    C -->|"Go Goroutines / Handlers"| D["Domain Services / SQLite / Disk / AI"]
    D -->|"Return Result / Error"| C
    C -->|"Resolve Promise (@wailsio/runtime)"| B
    B -->|"Reactive State Update"| A
```

### 💡 قواعد استدعاءات Wails v3 الذهبية:
1. **استبقاء الأخطاء:** Wails يرجع الأخطاء كـ `string`. استخدم دائماً:
   `typeof err === "string" ? err : (err instanceof Error ? err.message : fallback)`
2. **منع Stale Closures:** داخل معالجات الأحداث غير المتزامنة (مثل `handleDrop` أو الحفظ التلقائي) استخدم دائماً `useEditorStore.getState()` لقراءة أحدث حالة مباشرة لحظة وقوع الحدث.
3. **أحداث الرنتايم في الواجهة تمر عبر جسور `wailsjs/runtime/runtime`** (`EventsOn`, `EventsOff`, ...) وليس عبر `window.wails` أو استيراد مباشر من `@wailsio/runtime` داخل مكونات الواجهة — جسور `wailsjs/` هي نقطة الاستيراد الموحدة التي تعيد التصدير من الربطات المولدة.
4. **توليد وصيانة الربطات:** عند إضافة أي دالة جديدة في `app.go` أو خدمات Go، ولّد الربطات فوراً بالأمر:
   `wails3 generate bindings -ts -clean=true`
   ولا تستخدم إطلاقاً أدوات Wails v2 القديمة، وسجّل معالج Mock للدالة الجديدة في `frontend/e2e/helpers/wails-v3-bridge.ts` (انظر حارس انحراف العقود في AGENTS.md).

---

## 📁 3. بيئة الملفات والمجلدات الخاصة بالبرنامج (AppData & Temp)
- **مجلد البيانات الرئيسي:** يُجلب عبر `utils.GetAppDir()` (`%APPDATA%\GridoStudio` في الويندوز، أو `GRIDO_APP_DIR` للاختبارات).
- **التصديرات المؤقتة:** `GetAppDir()/Exports/` (تُنظف تلقائياً للملفات الأقدم من 24 ساعة).
- **الحفظ التلقائي:** `GetAppDir()/AutoSave/project_autosave.json`.
- **المعاينات المحلية:** الصور تُعرض في المتصفح عبر المسار المأمون `/local-image/<filename>` المفحوص ضد ثغرة Symlink & Path Traversal.
