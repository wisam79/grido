---
type: fix
scope: print
related_files:
  - frontend/src/lib/canvas/konva-export-utils.ts:651
  - frontend/src/lib/filters/print-filter-contract.ts:47
  - internal/service/print_service.go:662
  - internal/service/printer_gdi_windows.go:1108
  - docs/print-acceptance/README.md:1
---
وثّق ونفّذ إغلاق عقود cover والفلاتر ومعاملة الالتقاط والنزيف وCMYK TIFF والتدرج وإلغاء generation/spool وخطة GDI ومراقبة الحالة وبوابة الأداء، مع بقاء القبول الفيزيائي للطابعة Pending حتى تشغيل عتاد المالك.
