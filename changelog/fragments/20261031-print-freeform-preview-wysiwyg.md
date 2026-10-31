---
type: fix
scope: print
related_files:
  - frontend/src/components/editor/dialogs/print-dialog.tsx:566
  - frontend/src/lib/canvas/konva-export-utils.ts:70
---
إصلاح دقة معاينة الوضع الحر في حوار الطباعة (True Resolution WYSIWYG): إلغاء تقليص العرض القديم (targetWidth=400px) والضغط المشوش (JPEG 0.8) الذي كان يتسبب في مط الصورة وضبابيتها في نافذة المعاينة. الآن المعاينة تعكس الدقة الحقيقية الكاملة للكانفاس (1:1 وبصيغة PNG نقية دون فقدان) مع ترقية مصادر الصور للعقد الأصلية عبر upgradeImagesToFullResolution، وسقف أمان 4096px للكانفسات الفائقة.
