---
type: perf
scope: canvas
related_files:
  - frontend/src/components/editor/dialogs/crop-dialog.tsx:105
  - frontend/src/components/editor/properties/panels/image-properties.tsx:777
  - frontend/src/components/editor/properties/slot-properties.tsx:666
  - frontend/src/components/editor/canvas/context-menu/element-menu-section.tsx:155
  - frontend/src/lib/export/export-watermark.ts:40
  - frontend/src/lib/export/export-bleed.ts:135
---

تسريع قص وتصدير الصور وإلغاء اختناقات Base64:
- استبدال `toDataURL` في `crop-dialog.tsx` بالضخ الثنائي المباشر `uploadCanvasBlob` كـ `multipart/form-data` مع مؤشر حفظ مرئي.
- تحديث فوري للأبعاد في ألواح الخصائص وقوائم السياق دون إنشاء عقد DOM `new Image()` وانتظار `onload`.
- تسريع فك ترميز التصدير عبر `createImageBitmap` المسرَّع بالعتاد في `export-watermark.ts` و `export-bleed.ts` مع احتياطي آمن.
