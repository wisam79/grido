---
type: fix
scope: canvas
related_files:
  - frontend/src/lib/filters/custom-filters.ts:16
  - frontend/src/lib/filters/konva-filters.ts:70
  - frontend/src/hooks/use-filter-cache.ts:223
---
إصلاح جذري لتطبيق مرشحات الصور (Filters) على كانفاس Konva لمطابقة معايير W3C CSS والعرض المصغر والتصدير بنسبة 100%: تصحيح استخراج نسبة السبيا `sepiaRatio` من خاصية العقدة لمنع تطبيق 100% سبيا قسرياً عند اختيار نضارة البشرة أو الألوان السينمائية، واعتماد مرشح السطوع المضاعف `Brightness` بدل الإزاحي (+15.3) الذي كان يفجر الهايلايتس ويحرق درجات البشرة، وتوحيد التباين والتشبع اللوني الخطي لمنع تشويه الألوان، مع استدعاء `batchDraw` فورياً عند إزالة المرشحات.
