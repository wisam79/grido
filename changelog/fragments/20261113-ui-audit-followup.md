---
type: fix
scope: ui
related_files:
  - .gitattributes:41
  - frontend/src/components/editor/panels/template-panel.tsx:42
  - frontend/src/components/editor/properties/element/tabs/arrange-tab.tsx:39
  - frontend/src/lib/store/slices/element/merge.ts:54
  - frontend/src/lib/canvas/konva-export-utils.ts:529
  - frontend/src/components/editor/dialogs/account/use-auth-forms.ts:60
  - admin-web/src/pages/admin/useAdminOperationOwnership.ts:13
  - frontend/src/features/freeform-collage/lib/slots/slot-resize.ts:340
  - admin-web/src/lib/phone-bridge-pairing.ts:33
  - admin-web/src/pages/PhoneCameraPage.tsx:244
  - frontend/test/template-panel.test.tsx:1
  - frontend/test/element-properties-tabs.test.tsx:1
  - frontend/src/lib/store/element-slice-merge.test.ts:1
  - frontend/test/konva-capture-selection.test.ts:1
  - frontend/test/account-license-modal.test.tsx:1
  - admin-web/src/pages/admin/__tests__/admin-mutation-ownership.test.tsx:1
  - frontend/test/freeform-collage.test.ts:1
  - admin-web/src/lib/phone-bridge-pairing.test.ts:26
  - frontend/test/export-bleed.test.ts:89
  - docs/reviews/24-ui-architecture-audit-disposition-2026-11-13.md:1
  - docs/reviews/README.md:32
  - docs/features-tracker.md:3
  - docs/testing_guide.md:5
  - docs/developer_guide.md:5
  - docs/AI_ARCHITECTURE.md:3
  - docs/DOCUMENTATION_MAP.md:109
---
إصلاح سلامة استيراد القوالب مع حفظ اللقطة المطبقة، ومسودات الأبعاد وإلغاء Escape، وعزل الالتقاط داخل القفل واستعادة الرؤية وحراسة مراجع مصادر الدمج؛ حراس أجيال auth UI وملكية عمليات الإدارة، ودوران الخلية بعامل واحد، وتمييز جاهزية نقل الهاتف عن إقرار desktop الاختياري.
توثيق التنفيذ والاختبارات المنفردة وحدودهما في التقرير 24 مع حفظ المصدر حرفياً واستثناء نهايات أسطره من تطبيع Git، وتصحيح 100%/500+/50 دون محو التاريخ أو تعديل fragment السابق/CHANGELOG. البوابات الخفيفة ناجحة وdocs-metrics166/31/67/6؛ migration-lint42/0 والهجرة LOCAL NOT APPLIED، ولا ادعاء بإغلاق كل P0 أو P1–P3 أو pixel/visual/full-suite acceptance.
