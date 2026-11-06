---
type: fix
scope: ui
related_files:
  - frontend/src/hooks/use-autosave.ts:60
  - frontend/src/components/editor/dialogs/projects-dialog.tsx:178
  - frontend/src/components/editor/dialogs/export-dialog.tsx:176
  - frontend/src/components/editor/print/use-print-export.ts:126
  - frontend/src/components/editor/dialogs/crop-dialog.tsx:140
  - frontend/src/components/editor/dialogs/refine-bg-dialog.tsx:568
  - frontend/src/components/editor/properties/panels/image-properties.tsx:726
  - frontend/src/components/editor/properties/slot-properties.tsx:834
  - frontend/src/hooks/use-workspace-panels.ts:86
  - frontend/src/App.tsx:157
  - frontend/src/components/ui/blocks/fluent-slider-field.tsx:120
  - internal/repository/media_cleanup.go:150
  - internal/service/backup_service.go:183
  - frontend/test/image-dialog-lifecycle.test.tsx:1
---
جلسة تصحيح شاملة بمنهجية red→green أغلقت 9 عيوب مؤكدة: كاتب مسودة موحد يمنع محو مسودة أحدث بنتيجة قديمة، مرساة حفظ يدوي على اللقطة المرسلة مع Undo صادق، إبطال تصدير/طباعة معلقَين عند الإغلاق والإلغاء، ترحيل تنظيف الوسائط بالمفاتيح بدل OFFSET فلا تُنقل صورة حية، تحقق كامل قبل استيراد النسخ الاحتياطية فلا تُمحى المكتبة بمدخل تالف، حراسة نتائج القص والتعديل اليدوي بعد الإلغاء/الاستبدال، وضع التركيز يغلب إعادة فتح الخصائص، والتزام فوري لتعديل المنزلق قبل التراجع. التقرير: docs/reviews/22-app-debugging-2026-11-06.md.
