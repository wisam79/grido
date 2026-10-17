---
type: fix
scope: print
related_files:
  - frontend/src/components/editor/print/use-print-export.ts:515
  - frontend/src/components/editor/dialogs/print-dialog.tsx:1112
  - internal/service/printer_gdi_windows.go:388
  - internal/service/printer_gdi_windows.go:607
---
إصلاح مشكلة قص أعلى ورقة الطباعة في الطباعة المباشرة عبر Win32 GDI:
1. إزالة تفعيل الحواف الصفرية التلقائي الخاطئ (effectiveMarginMM === 0) وربطه حصراً بقوالب الورق التي تدعم الحواف الصفرية في درايفر الطابعة.
2. إعطاء الأولوية لمعرفات قوالب ويندوز القياسية (DMPAPER_A4 = 9) لمنع سقوط الدرايفرات الافتراضية مثل Microsoft Print to PDF في مقاس Letter.
3. منع الإزاحات السالبة نهائياً (destX >= 0, destY >= 0) واعتماد نمط الاحتواء والتوسيط (Contain) لحماية محتوى الورقة ورؤوس الصور من القص الميكانيكي.
