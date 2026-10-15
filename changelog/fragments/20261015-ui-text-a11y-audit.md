---
type: feat
scope: ui
related_files:
  - frontend/src/lib/canvas/text-helpers.ts:1
  - frontend/src/components/editor/canvas/text-editing-overlay.tsx:40
  - frontend/src/components/editor/konva/elements/text-node.tsx:95
  - frontend/src/components/editor/dialogs/print-dialog.tsx:595
  - frontend/src/components/editor/properties/panels/text/text-type-tab.tsx:390
  - frontend/src/lib/store/slices/element/crud.ts:25
---

تدقيق شامل لوصولية واجهة المحرر (Fluent 2) وتوحيد تعقيم النصوص:
- إنشاء وحدة مركزية لثوابت وتعقيم النصوص (`text-helpers.ts`) بسقف 2000 حرف وتطهير محارف التحكم وتوحيد كشف العربية.
- تعقيم النصوص عند منافذ الـ Store (الإنشاء والتحرير، استيراد المشاريع، ولصق الحافظة الخارجية مع تنبيه الاقتطاع).
- دعم المحاذاة العمودية للنصوص (`textVerticalAlign: top | middle | bottom`) في المخطط واللوحة مع قياس ديناميكي لارتفاع أسطر Konva يمنع تجميد الصندوق.
- تحسين طبقة التحرير (Overlay) بانتظار جاهزية الخط عبر `document.fonts.ready` وضبط موضع المؤشر للنصوص الطويلة.
- إضافة حلقات التركيز للوحة المفاتيح (`focus-visible:ring-2`)، وأبعاد أزرار Fluent 2، وسمات `aria-label`/`aria-pressed` وحماية الصور عبر 25 ملفاً.
