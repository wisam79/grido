---
type: fix
scope: ui
related_files:
  - docs/plans/2026-11-13-comprehensive-ux-development-plan.md:1
  - docs/ux-acceptance/README.md:1
  - docs/ux-acceptance/manifest.template.json:1
  - docs/features-tracker.md:3
  - docs/DOCUMENTATION_MAP.md:34
  - docs/testing_guide.md:5
  - docs/reviews/25-ux-development-acceptance-2026-11-13.md:1
  - docs/reviews/README.md:34
  - docs/developer_guide.md:5
  - README.md:46
  - admin-web/design.md:11
  - frontend/src/components/editor/panels/collage/collage-custom-grid-tab.tsx:1
  - frontend/src/components/editor/panels/panel-shell.tsx:1
  - frontend/src/components/ui/blocks/fluent-section.tsx:1
  - frontend/src/components/ui/blocks/fluent-capsule-button.tsx:1
  - frontend/src/components/editor/properties/color-panel.tsx:1
  - frontend/src/components/editor/toolbar/toolbar.tsx:1
  - frontend/src/components/editor/canvas/canvas-viewport-deck.tsx:1
  - frontend/src/components/editor/canvas/canvas-rulers.tsx:1
  - frontend/src/components/editor/canvas/ruler.tsx:1
---
وثّق تطوير UX الجزئي لموجات 0–7 وإغلاق حزمة إصلاحات التشخيص ومواءمة التوثيق وتصحيح عيوب الواجهة المرئية: حلقة تمرير معرض الملصقات (`sticker-catalog.tsx`)، حارس فك التركيب وجلسة المستند (`arrange-tab.tsx`)، توحيد تبويبات المفتش والألواح (`variant="panel"` في `properties-panel.tsx` و`slot-properties.tsx` و`custom-collage-card.tsx`)، صقل `multi-selection-properties.tsx` وأهداف اللمس، ربط توكنات `--z-toast`/`--z-dialog`، مواءمة عقد ترويسة اللوح (`min-h-12`)، وإصلاح انعكاس أبعاد ونسبة تغطية الكولاج (`dir="ltr"` + وحدة `مم`)، تمييز مقاس فيزا أمريكية `51×51` (`us-visa`)، تثبيت تذييل الكولاج في `PanelShell`، توحيد محاذاة سهم `FluentSection`، تباين التبويب غير النشط (`FluentSegmentedControl`)، عنوان قسم `أبعاد الورقة` ووحدته (`general-settings.tsx`)، حدود وتوضيح باليت `ColorField`، إعادة ترتيب وتقليص شريط الأدوات العلوي (`toolbar.tsx`)، إزالة التكرار السفلي مع تبديل أيقونة الملاءمة التلقائية (`canvas-viewport-deck.tsx`)، وتمييز الحالة النشطة مع `aria-pressed` في `FluentCapsuleButton` وزر الزاوية (`canvas-scrollbars.tsx`) وتوحيد سمك المساطر وزواياها مع أشرطة التمرير المقابلة (`20px` عبر `CANVAS_RAIL_THICKNESS`).
أُغلق انحراف الجرد **174/32/67/6** (inventory20/assertions53) واجتازت بوابة `docsstrict` وفحوص `frontend` و`admin-web` الخفيفة والاختبارات المستهدفة، مع حذف الفرعين المحليين المدمجين والبقاء خطياً على `main`؛ تبقى `SaveRecovery`/الطباعة وهجرة `20261113155602` والـCI/E2E الكامل معلّقة دون commit/push قبل إذن المالك.
