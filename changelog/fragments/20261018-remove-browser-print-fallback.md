---
type: changed
scope: print
related_files:
  - frontend/src/components/editor/print/use-print-export.ts:60
  - frontend/src/components/editor/dialogs/print-dialog.tsx:180
---
استئصال حوار طباعة المتصفح (window.print) واعتماد الطباعة الأصلية المباشرة عبر Win32 GDI بنسبة 100% مع تحويل مسار CMYK لتصدير ملفات TIFF للمطابع.
