---
type: fix
scope: canvas
related_files:
  - frontend/src/components/editor/properties/collage-settings.tsx:75
  - frontend/src/components/editor/panels/collage/collage-custom-grid-tab.tsx:502
  - frontend/e2e/panel-geometry.spec.ts:63
---

تحديث تباعد وهوامش الكولاج لحظياً أثناء سحب السلايدر: استبدال `previewCollageGap` و `previewCollageMargin` بـ `setCollageGap` و `setCollageMargin` في `onChange` ليعيد الكانفاس حساب أبعاد الخانات لحظياً بمعدل 60fps أثناء السحب مع إبقاء تسجيل التراجع عند الإفلات في `onCommit`، وعزل الحد المنقط عن شبكة الارتكاز وتجاهل العناصر المطلقة في فحص هندسة الألواح المتساوية.
