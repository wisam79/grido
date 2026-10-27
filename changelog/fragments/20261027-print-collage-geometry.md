---
type: fix
scope: print
related_files:
  - frontend/src/lib/templates/grid-utils.ts:64
  - frontend/src/lib/templates/grid-utils.ts:337
  - frontend/src/components/editor/panels/collage/collage-grid-math.ts:68
  - frontend/src/components/editor/panels/collage/collage-grid-math.ts:104
  - frontend/src/lib/print/cut-lines-utils.ts:278
  - frontend/src/components/editor/print/print-payload-builder.ts:90
  - frontend/src/components/editor/print/print-payload-builder.ts:124
  - frontend/src/components/editor/print/print-preview.tsx:370
  - frontend/src/lib/export/export-canvas-collage.ts:212
  - frontend/src/lib/store/slices/collage-slice.ts:447
  - frontend/test/collage-grid-math.test.ts:1
  - frontend/src/lib/print/cut-lines-utils.test.ts:1
---
توحيد هندسة الكولاج بين باني الواجهة ومحرك المتجر: الصفر قيمة صريحة للفجوة والهامش بدل استبدالهما سراً بـ 2مم/4مم، وسعة الشبكة تحسب الهوامش والفواصل فلا تُوعد بشبكة تُصغَّر عند التطبيق، ومصدر واحد لمقاسات الخلايا بين المسارين بلا انحراف. إصلاح خطوط القص: حدود متلاصقة بخطأ عائم لا تُدمج فيختفي فاصلها، والتداخل الحقيقي يبقى مدموجاً، وخط النهاية الممتد يُحجب عن حمولة cropmarks (المعاينة والتصدير وGo) كي تنطبق زوايا القص على حدود الشبكة، ونسبة الخانة المطبوعة تُشتق من مستطيلها بعد الهامش والفجوة.
