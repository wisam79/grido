---
type: fix
scope: infra
related_files:
  - internal/repository/media_cleanup.go:21
  - internal/service/quit_coordinator.go:1
  - internal/service/memory_service.go:200
  - app.go:117
  - main.go:208
  - system_tray.go:18
  - frontend/src/hooks/use-quit-protocol.ts:1
  - frontend/src/hooks/use-autosave.ts:112
  - frontend/src/hooks/use-window-controls.ts:127
  - frontend/src/components/editor/system/quit-save-failed-dialog.tsx:1
  - frontend/src/App.tsx:240
  - frontend/src/components/editor/canvas/use-image-drop.ts:38
  - frontend/src/features/stickers/components/vdp-import-dialog.tsx:255
  - frontend/src/components/editor/dialogs/account/license-tab-content.tsx:198
---
توحيد بروتوكول الإغلاق النظيف في Wails v3 ومعالجة سباق تنظيف الوسائط وسباقات المؤقت وفشل الحفظ النهائي وحفظ آخر تعديل وترتيب تحرير الموارد (`RV-LIFE-01…06`)، وتطبيق توصيات Wails v3 الرسمية (توصيل `Logger` و`WebviewUserDataPath` و`SystemDidWake` و`DevToolsEnabled`/`WindowDidMoveDebounceMS`، وتحرير `desktopSvc`، وعزل `data-file-drop-target`، وتوجيه الروابط الخارجية عبر `BrowserOpenURL`).
