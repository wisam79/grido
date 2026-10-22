---
type: feat
scope: ui
related_files:
  - frontend/src/components/editor/panels/freeform/freeform-text-tab.tsx:1
  - frontend/src/components/editor/panels/freeform/freeform-elements-tab.tsx:68
  - frontend/src/components/editor/panels/freeform/freeform-studio-panel.tsx:26
  - frontend/src/lib/store/slices/element/text-elements.ts:56
  - frontend/src/lib/store/slices/element/types.ts:49
  - frontend/src/lib/templates/text-presets.ts:65
  - frontend/test/element-slice-text.test.ts:198
---

إعادة هيكلة وبناء تبويب النصوص واستوديو الطباعة الحرة بهوية فاخرة تتوافق مع نظام Fluent 2 واستوديوهات التصوير: استبدال الرموز التعبيرية القديمة بمعاينات حية واقعية فائقة الدقة (WYSIWYG) للتأثيرات الملكية والفويل الذهبي والتوثيق، وإضافة محرر النصوص السريع الاختياري (Composer) في ترويسة اللوحة، مع دعم الكشف الذكي عن النص المحدد على الكانفاس لتطبيق النمط فورياً عليه بنقرة واحدة عبر دالة الستور الجديدة applyTextPreset مع حفظ محتواه وموقعه، أو إدراجه في المنتصف مباشرة.
