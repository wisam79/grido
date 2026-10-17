---
type: feat
scope: print
related_files:
  - internal/service/printer_gdi_windows.go:394
  - internal/core/domain/print.go:109
  - frontend/src/components/editor/print/use-print-export.ts:518
  - frontend/src/components/editor/dialogs/print-dialog.tsx:447
---
فرض مقاس الورق المحدد من المستخدم على ناتج الطباعة المباشرة في ويندوز: تمرير معرف الورقة الرقمي المعتمد من الدرايفر واستعلام قدرات الطابعة آلياً عبر DeviceCapabilities وتوسيع المطابقة المعيارية للأبعاد القياسية.
