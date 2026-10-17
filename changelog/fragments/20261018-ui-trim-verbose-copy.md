---
type: refactor
scope: ui
related_files:
  - frontend/src/components/crash-recovery-dialog.tsx:95
  - frontend/src/components/editor/dialogs/export-dialog.tsx:549
  - frontend/src/components/editor/print/print-transport.ts:43
  - frontend/src/components/editor/dialogs/print-dialog.tsx:948
  - frontend/src/components/editor/panels/collage/collage-paper-tools-tab.tsx:115
  - frontend/src/hooks/use-ai-enhance.ts:171
---
تقليص وحذف النصوص الطويلة والمكررة في واجهة المحرر (مسح آلي أنتج 80 مرشحاً): حذف كامل للعبارات التي لا تضيف معلومة (وصف حوار الاستعادة عند غياب مسودة، ومربع تحذير RGB في حوار التصدير، ووصف صف «خطوط النزيف»، وسطر sRGB/CMYK المكرر في حوار الطباعة)، وتقصير رسائل الطباعة والتصدير والذكاء الاصطناعي والحفظ التلقائي وسلة الوسائط والأزرار والتلميحات وفق قاعدتي الاختصار وصفر الحشو — مع مزامنة الاختبارات المرتبطة بالنصوص المتغيرة.
