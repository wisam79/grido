---
type: fix
scope: canvas
related_files:
  - frontend/src/lib/store/slices/collage-slice.ts:250
  - frontend/src/lib/canvas/collage-geometry.ts:18
  - frontend/src/lib/io/project-hydrator.ts:150
  - frontend/src/index.css:11
---
منع تصفير الهوامش والتباعد الافتراضية للكولاج (2mm تباعد / 3mm هوامش) عند تعديل الخانات أو اختيار قوالب محددة أو تحميل المشاريع عبر تقديم معيار `isBakedCollageLayout` واستعادة القيم السليمة ذاتياً، وتفضيل خط 'IBM Plex Sans Arabic' في مقدمة تسلسل خطوط الواجهة.
