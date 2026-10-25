---
type: fix
scope: ui
related_files:
  - frontend/src/components/editor/workspace/workspace-layout.tsx:43
  - frontend/src/hooks/use-workspace-panels.ts:135
  - frontend/src/App.tsx:634
---

تثبيت التخطيط الثلاثي لمساحة العمل (شريط الأدوات والدرج الجانبي يساراً، والكانفاس وسطاً، ومفتش الخصائص يميناً) لكافة شاشات سطح المكتب ومنع انتقال أو قفز درج القوالب والأدوات إلى العمود الأيمن عند تغيير حجم النافذة أو الشاشات القياسية.