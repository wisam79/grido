---
type: fix
scope: canvas
related_files:
  - frontend/src/components/editor/canvas/use-canvas-viewport.ts:24
  - frontend/src/hooks/use-canvas-zoom.ts:25
  - frontend/src/components/editor/canvas/canvas-viewport-deck.tsx:436
  - frontend/test/canvas-viewport-bounds.test.ts:297
---
إصلاح أزرار ملائمة الكانفاس وإعادة التوسيط التلقائي: تصفير إزاحة التحريك (pan) فورياً عند اختيار أي وضع ملائمة أو ضغط Ctrl+0/1، تصحيح مبدأ الإحداثيات الافتراضية لمنع قطع النصف العلوي للورقة في وضع ملاءمة العرض والحجم الفعلي، ومزامنة حالة وشارة التفعيل في شريط العرض.
