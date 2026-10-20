---
type: fix
scope: print
related_files:
  - internal/service/printer_gdi_windows.go:394
  - internal/service/printer_gdi_windows.go:620
  - frontend/src/components/editor/dialogs/print-dialog.tsx:70
  - frontend/src/components/editor/dialogs/print-dialog.tsx:395
  - frontend/src/components/editor/dialogs/print-dialog.tsx:770
---

- فرض تطابق `DmPaperSize` مع `DmFormName` في `configurePrinterDevMode` ومسح الحقل الافتراضي القديم لتفادي ارتداد درايفر الطابعة (مثل Microsoft Print to PDF) إلى قياس Letter عند طباعة A4.
- استيراد وعرض قوالب وأبعاد الورق المدعومة فعلياً من درايفر الطابعة الحية (`SupportedPaperInfo`) في حوار الطباعة مع ربط الاختيار مباشرة بمعرف القالب واسمه ودعم القوالب بدون حواف.
