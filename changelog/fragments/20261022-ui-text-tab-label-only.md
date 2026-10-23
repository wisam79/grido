---
type: refactor
scope: ui
related_files:
  - frontend/src/components/editor/panels/freeform/freeform-text-tab.tsx:18
  - frontend/src/lib/templates/text-presets.ts:13
  - frontend/src/lib/store/slices/element/text-elements.ts:55
  - frontend/test/freeform-text-tab.test.tsx:8
---
أُعيد بناء تبويب النصوص كقائمة إدراج واحدة: زر «إضافة نص» يبدأ التحرير المباشر، ومجموعتان فقط (أنماط النص/توثيق الاستوديو) بصفوف 32px وتسميات موحّدة بلا معاينات أو بيانات خط تقنية.
حُذفت الأنماط الاستعراضية الثمانية وشريط الفلاتر والمحرر السريع، وبقيت الشارة والختم في لوحة الخصائص فقط؛ ويُطبَّق النمط على النص المحدد عبر شارة سياق، وزر + يُدرج عنصراً جديداً دائماً.
