---
type: feat
scope: print
related_files:
  - frontend/src/lib/store/types.ts:289
  - frontend/src/lib/store/slices/print-slice.ts:28
  - frontend/src/components/editor/dialogs/print-dialog.tsx:939
  - frontend/src/components/editor/print/use-print-export.ts:436
  - frontend/test/print-export-payload.test.ts:336
---
خيار صيغة المخرجات في حوار الطباعة (sRGB): JPEG يبقى الافتراضي (أسرع ترميزاً وملف أصغر — جوهر RV-Print-05)، مع PNG اختياري للنصوص والباركود والملصقات بلا ضجيج ضغط. تعديل مقصود وموثق للقرار المحمي رقم 4 بقرار المالك في جلسة 1.67 — Go يدعم png في saveOutput مع حقن pHYs جاهزاً بلا أي تعديل باك-إند.
