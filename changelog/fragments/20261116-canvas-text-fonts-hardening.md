---
type: fix
scope: canvas
related_files:
  - frontend/src/components/editor/properties/panels/text/text-font-selector.tsx:42
  - frontend/src/lib/store/slices/element/crud.ts:14
  - frontend/src/lib/store/slices/element/text-elements.ts:138
  - frontend/src/lib/export/export-canvas-fitted.ts:192
  - frontend/src/components/ui/font-selector.tsx:141
  - frontend/src/lib/io/fonts.ts:559
---
إغلاق المرحلة الثانية من تحسينات النصوص والخطوط (`T1–T6`): إعادة ملاءمة هندسة الصندوق (`fitTextGeometry`) فورياً وعند اكتمال تحميل الخط البارد مع حارس جيل وجلسة المستند في `TextFontSelector`، وتصفير الخصائص المتبقية (`letterSpacing` و`fontStyle` و`textDecoration` و`textTransform` وتعبئة التدرج الدائري والصورة) في `applyTextPreset` مع إدراج `strokeWidth` ضمن `TEXT_MEASURE_KEYS`، وفصل رسم إطار شارة النص عن تعبئة الخلفية في `export-canvas-fitted.ts`، وتفعيل المعاينة الحيّة عند التنقل بأسهم الكيبورد على عمود المفضلة وتهيئة المفضلة كسولياً في `FontSelector`، ودعم فحص الوزن والنمط في `isFontLoaded`.
