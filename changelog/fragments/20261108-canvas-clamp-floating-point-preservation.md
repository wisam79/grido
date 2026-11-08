---
type: fix
scope: canvas
related_files:
  - frontend/src/lib/canvas/element-geometry.ts:186
---

تفادي تراكم أخطاء الفاصلة العائمة في clampElementPositionToCanvas بإعادة الموضع الأصلي للعنصر مباشرة عندما يكون داخل حدود الورقة دون قسمة كسرية.
