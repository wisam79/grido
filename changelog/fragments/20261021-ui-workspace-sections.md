---
type: refactor
scope: ui
related_files:
  - frontend/src/lib/workspace-tools.ts:214
  - frontend/src/components/editor/workspace/workspace-panel-rail.tsx:396
  - frontend/src/components/editor/panels/freeform/freeform-studio-panel.tsx:45
  - frontend/src/components/editor/panels/custom-collage-card.tsx:273
  - frontend/src/hooks/use-workspace-panels.ts:94
  - frontend/src/hooks/use-keyboard-shortcuts.ts:274
  - frontend/e2e/studio-panels.spec.ts:12
---

تجميع أدوات الشريط الجانبي في ثلاث وجهات لكل وضع (محتوى/ورق/هوية للاستوديو، وشبكة/خانات/قص للكولاج) مع تبويبات داخلية دائمة، وإبقاء معرّفات التبويبات والتخزين دون هجرة، وتحويل Alt+1..9 إلى وجهات تُفعّل تبويبها الافتراضي.
