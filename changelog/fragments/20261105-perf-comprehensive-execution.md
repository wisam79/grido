---
type: perf
scope: canvas
related_files:
  - internal/service/memory_service.go:49
  - internal/service/print_service.go:99
  - internal/service/print_compose.go:188
  - internal/service/print_cmyk_tiff.go:110
  - internal/handlers/backup_handler.go:33
  - frontend/src/hooks/use-window-controls.ts:80
  - frontend/src/hooks/use-filter-cache.ts:132
  - frontend/src/lib/canvas/display-image.ts:161
  - frontend/src/components/editor/canvas/use-canvas-viewport.ts:318
  - frontend/src/components/editor/properties/collage-settings.tsx:131
---
تنفيذ خطة الأداء الشاملة عبر ثماني دفعات: سياسة ذاكرة موحدة بلا تقليم blur مع حارس عمل ثقيل، إلغاء مهام طباعة (CancelActivePrintJobs)، مسار مستطيل سريع بلا قناع صفحة كامل، بثّ TIFF/حقن DPI، مشتق عرض 2048px من Go بجلب الأصل عند الطلب فقط، فلتر مركّب بتمريرة واحدة مع سقف أسطح واعٍ بها، إلغاء صادق لعزل الخلفية وعامل الماسح، جلسة حفظ تلقائي ببصمة ثابتة، معاينة فواصل الكولاج الموجودة موصولة، تراكم zoom مصحح، نسخ احتياطي يبثّ مباشرة من Go، وتحميل مؤجل لحوارات وملصقات وباركود. عقود IPC جديدة توليدت ربطاتها وموكُّت في جسر E2E.
