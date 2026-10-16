---
type: feat
scope: print
related_files:
  - internal/service/printer_gdi_windows.go:1
  - internal/service/printer_gdi_other.go:1
  - internal/handlers/print_handler.go:94
  - frontend/src/components/editor/print/use-print-export.ts:488
  - frontend/src/components/editor/dialogs/print-dialog.tsx:617
---
إضافة محرك الطباعة المباشرة الأصلية لنظام Windows عبر Win32 GDI Spooler API (CreateDCW و StretchDIBits بدقة 300+ DPI)، مع دعم الطباعة بدون حواف وخيار الطباعة الصامتة الفورية في حوار الطباعة.
