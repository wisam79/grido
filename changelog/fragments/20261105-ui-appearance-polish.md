---
type: fix
scope: ui
related_files:
  - frontend/src/index.css:111
  - frontend/src/components/ui/button.tsx:8
  - frontend/src/components/ui/input.tsx:11
  - frontend/src/lib/utils.ts:17
  - frontend/src/components/editor/panels/freeform/freeform-elements-tab.tsx:276
  - frontend/src/features/stickers/components/sticker-catalog.tsx:160
  - frontend/src/components/editor/dialogs/export-dialog.tsx:580
  - frontend/src/components/editor/toolbar/toolbar.tsx:93
  - frontend/src/components/editor/toolbar/toolbar-file-ops.tsx:234
  - frontend/src/components/editor/toolbar/toolbar-history-tools.tsx:9
  - frontend/src/components/editor/toolbar/toolbar-transfer-to-collage.tsx:117
  - frontend/src/components/editor/properties/general/canvas-dimensions-panel.tsx:427
  - frontend/src/components/editor/properties/general/grid-columns-panel.tsx:94
  - frontend/src/components/editor/properties/general-settings.tsx:38
  - .husky/pre-commit:9
---
صقل شكلي للواجهة: تسميات وحقول أوضح، تباين أفضل للأزرار التعبوية، ومعاينات ملصقات وأشكال أكبر بأسطح محايدة وإطارات أقل. تبسيط حوار التصدير وجمع النزيف والقص مع الحفاظ على التحذيرات ومنطق التطبيق والبيانات.
توحيد طرفي شريط الأدوات: إدراج منقسم بحد مشترك، وأيقونات مشاريع وتراجع وإعادة متناسقة مع الحفظ والتصدير والطباعة؛ مقاس موحد 32×32 للأزرار الأيقونية، وخانة «المزيد» بمحاذاة عرض وحدّ الشريط الجانبي، دون تغيير الأوامر أو الاختصارات.
تحسين لوح إعدادات الورقة: تسميات عربية للعرض والارتفاع، حقول وحدود أوضح، وفصل هادئ بين المقاس والخلفية؛ تبسيط الشبكة والأعمدة والقص وإخراج التسميات فوق الحقول مع الحفاظ على القيم والتحويلات ومنتقي الألوان.
إبقاء خطاف ما قبل الالتزام فعالاً باستدعاء lint-staged المحلي مع `--cwd frontend` بدلاً من تغيير مجلد الصدفة، دون تجاوز ESLint أو Prettier.
