---
type: refactor
scope: ui
related_files:
  - frontend/src/lib/ui/ui-compliance.ts:23
  - frontend/src/components/ui/select.tsx:51
  - frontend/src/components/ui/dialog.tsx:77
  - frontend/src/components/editor/dialogs/phone-bridge-dialog.tsx:311
  - frontend/test/ui-compliance.test.ts:86
  - .agents/rules/ui-ux-fluent.md:14
---
جولة تسطيح الأسطح: توحيد الاستدارة على أساس 6px (‏`rounded-md` للسطوح الداخلية و`rounded-lg` للعائمة و`rounded-xl` للنوافذ فقط)، وإصلاح صنف ظل ميت (`shadow-fluent-24` غير معرّف في index.css)، وتوحيد AlertDialog مع Dialog، وتحديث القواعد والمهارة وإضافة حارس آلي يمنع الانحدار.
