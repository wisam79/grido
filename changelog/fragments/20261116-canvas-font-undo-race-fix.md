---
type: fix
scope: canvas
related_files:
  - frontend/src/lib/store/slices/history-slice.ts:269
  - frontend/src/components/editor/properties/panels/text/text-font-selector.tsx:67
  - frontend/src/lib/io/fonts.ts:584
  - frontend/src/components/editor/canvas/text-editing-overlay.tsx:181
  - frontend/src/components/ui/font-selector.tsx:22
---
إغلاق سباق إعادة الملاءمة مع `Undo/Redo` عند تحميل الخط البارد (`P1`) وتنظيفات `P2/P3`: فحص بصمة العنصر المتوقعة ولقطة التاريخ الملتزمة قبل تطبيق إعادة القياس المتأخرة، وإضافة `replaceCurrentHistoryEntry` في `history-slice.ts` لتحديث لقطة الالتزام مكانياً دون خطوة تراجع مزدوجة، واستخراج `faceMatches` في `isFontLoaded` مع استهلاكها في `TextEditingOverlay` لإلغاء وميض إخفاء المحرر عند جاهزية الخط، وتوحيد `DEFAULT_FAVORITE_FONTS` وفصل `loadRequests` عن `flatMap`.
