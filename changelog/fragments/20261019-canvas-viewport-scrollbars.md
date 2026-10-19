---
type: feat
scope: canvas
related_files:
  - frontend/src/components/editor/canvas/canvas-scrollbars.tsx:1
  - frontend/src/components/editor/canvas/canvas-rulers.tsx:215
  - frontend/src/components/editor/canvas/editor-canvas.tsx:598
  - frontend/src/components/editor/canvas/use-canvas-viewport.ts:56
  - frontend/src/components/editor/canvas/canvas-viewport-deck.tsx:294
  - frontend/src/components/ui/blocks/fluent-capsule-button.tsx:40
  - frontend/src/components/editor/properties/general/canvas-dimensions-panel.tsx:430
  - frontend/src/components/editor/properties/general/grid-columns-panel.tsx:105
  - frontend/src/components/editor/canvas/index.ts:9
  - frontend/test/canvas-scrollbars.test.tsx:1
---
توازن بصري وتأطير رباعي كامل لمساحة الكانفاس (4-Sided Viewport Framing) بنمط Microsoft Fluent 2 فائق السرعة: إضافة شريطي تمرير تفاعليين (أفقي ورأسي بسُمك 20px مطابق للمساطر) بتصميم كبسولة ملساء عصرية (Fluent Pill) تتمدد بسلاسة عند التحويم خالية من أزرار الأسهم الكلاسيكية والحزوز، وتتكيف أحجامها ديناميكياً مع نسبة الورقة للنافذة والمدى الكلي للـ Pasteboard في نفس فريم الـ GPU، وإلغاء خلفية التظليل المربعة لأزرار الكبسولة النشطة والاكتفاء بتعبئة الأيقونة الصريحة (Icon Fill)، وترشيد أزرار لوح مساحة العمل بنمط Figma بدمج الاتجاه في زر تبديل مفرد ومنع تشوه نصوص التبويبات.
