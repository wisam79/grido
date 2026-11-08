---
type: feat
scope: canvas
related_files:
  - frontend/src/lib/canvas/viewport-geometry.ts:85
  - frontend/src/lib/canvas/fit.ts:166
  - frontend/src/components/editor/canvas/use-canvas-viewport.ts:72
  - frontend/src/components/editor/canvas/canvas-scrollbars.tsx:138
  - frontend/src/components/editor/canvas/canvas-quick-bar.tsx:165
---
ترقية محرك الكانفاس بهندسة Viewport مستقلة رياضياً (Viewport Geometry): فصل كاميرا العرض المؤقتة عن سجل المستند، ثبات نقطة المركز عند تغيير حجم النافذة واللوحات، تحويل مصفوفي متزامن لحظياً للمساطر والأغلفة والشريط السريع أثناء الزوم، وتطبيع مقياس بكسل الشاشة لـ CSS تحت تحجيم Windows.
