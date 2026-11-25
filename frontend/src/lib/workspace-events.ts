/**
 * أسماء أحداث النافذة (CustomEvent على window) — مصدر الحقيقة الوحيد.
 *
 * كانت مكتوبة نصّاً صريحاً في 21 ملفاً (145 موضعاً)؛ أي خطأ حرفي واحد
 * يجعل dispatch بلا مستمع وزرّاً صامتاً. كل حدث له ثابت واحد هنا.
 * الوحدة التي تُطلق الحدث تعيد تصديره باسمها الدلالي (مثل
 * `RESET_CANVAS_PAN_EVENT`) كي يبقى المستمع يصف نيّته لا نصّ الحدث.
 */
export const WORKSPACE_EVENTS = {
  authLogout: 'grido:auth-logout',
  canvasViewTransform: 'grido:canvas-view-transform',
  checkUpdates: 'grido:check-updates',
  clearCanvasRequest: 'grido:clear-canvas-request',
  flushCanvasView: 'grido:flush-canvas-view',
  openAccount: 'grido:open-account',
  openBatchInsertDialog: 'grido:open-batch-insert-dialog',
  openExportDialog: 'grido:open-export-dialog',
  openFileDialog: 'grido:open-file-dialog',
  openPhoneBridge: 'grido:open-phone-bridge',
  openPrintDialog: 'grido:open-print-dialog',
  openProjectsDialog: 'grido:open-projects-dialog',
  openPropertiesPanel: 'grido:open-properties-panel',
  openShortcuts: 'grido:open-shortcuts',
  openStickersDialog: 'grido:open-stickers-dialog',
  openToolLauncher: 'grido:open-tool-launcher',
  panelTransition: 'grido:panel-transition',
  reeditStickerElement: 'grido:reedit-sticker-element',
  resetCanvasPan: 'grido:reset-canvas-pan',
  selectCollageTab: 'grido:select-collage-tab',
  selectStudioTab: 'grido:select-studio-tab',
  toggleLeftSidebar: 'grido:toggle-left-sidebar',
  toggleRightSidebar: 'grido:toggle-right-sidebar',
  toggleTheme: 'grido:toggle-theme',
  toggleZenMode: 'grido:toggle-zen-mode',
  uiZoomIn: 'grido:ui-zoom-in',
  uiZoomOut: 'grido:ui-zoom-out',
  uiZoomReset: 'grido:ui-zoom-reset',
} as const;
