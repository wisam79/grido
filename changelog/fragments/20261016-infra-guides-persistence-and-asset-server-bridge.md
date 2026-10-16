---
type: refactor
scope: infra
related_files:
  - frontend/src/lib/schema.ts:241
  - frontend/src/lib/io/project-serializer.ts:74
  - frontend/src/lib/store/slices/core-slice.ts:371
  - internal/core/domain/runtime.go:19
  - internal/service/runtime_wails.go:35
  - internal/server/asset_server.go:124
---
**توافق حفظ المشاريع (واجهة):** توسيع `ProjectSchema` بمخطط `UserGuideSchema` وإدراج 9 حقول مفقودة من دورة الحفظ/التحميل (`showRuler`, `rulerUnit`, `userGuides`, `showUserGuides`, `lockUserGuides`, `showBleedGuides`, `bleedMarginMM`, `safeMarginMM`, `cutShapeType`)؛ وتضمينها في `serializeEditorState` مع قيم افتراضية متوافقة في `migrateProject`؛ واستعادتها في `loadProject` مع تنظيف وفحص دقيق لخطوط الإرشاد وتصفيرها بالكامل في `reset()`، مما يضمن بقاء خطوط الإرشاد وهوامش القص للطباعة عبر دورات الحفظ وإعادة الفتح.

**تجريد حوار حفظ الملفات (خلفية):** توسيع واجهة `domain.RuntimeBridge` بدالة `SaveFileDialog` ونوع `FileFilter`، وتنفيذها في `WailsRuntimeBridge` وحقن المنفذ في `AssetServer`، مما يعزل آخر موضع يستدعي رنتايم Wails مباشرة ويحمي خادم الأصول من الذعر عند تشغيله خارج بيئة الواجهة.
