---
type: fix
scope: canvas
related_files:
  - frontend/src/lib/canvas/text-measure.ts:76
  - frontend/src/components/editor/konva/elements/text-node.tsx:134
  - frontend/src/components/editor/canvas/text-editing-overlay.tsx:106
  - frontend/src/lib/io/fonts.ts:403
  - frontend/src/lib/canvas/text-helpers.ts:64
  - frontend/src/lib/canvas/text-layout.ts:82
  - frontend/src/lib/canvas/curved-text-utils.ts:287
  - frontend/src/lib/export/export-canvas-fitted.ts:176
  - frontend/e2e/text-measure.spec.ts:75
---
أُصلح محرك النصوص الشامل: القياس على عقدة Konva.Text معزولة `height='auto'` ومزامنة الارتفاع بلا اقتطاع آخر سطر، وجاهزية الخطوط لكل وزن/نمط مع إعادة قياس عند وصول الوجه الفعلي، ومطابقة محرر DOM للكانفس في الشارة والمحاذاة الرأسية والأرقام والاتجاه وتركيب IME.
اعتمد اتجاه أول محرف قوي وتصفير تباعد العربية في الاتجاهين، وأُضيف للمسار الاحتياطي للتصدير كسر الكلمات الطويلة وخط الأساس الألفبائي وتزيين `fontSize/15` و`shadowOpacity`، وللنص المنحني حدود موحدة عبر كانفاس وسيط وترتيب bidi مبسّط.
