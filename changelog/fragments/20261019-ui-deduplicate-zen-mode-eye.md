---
type: refactor
scope: ui
related_files:
  - frontend/src/components/editor/canvas/canvas-viewport-deck.tsx:40
  - frontend/src/App.tsx:662
  - frontend/src/components/editor/workspace/workspace-panel-rail.tsx:574
---

إزالة أيقونة وضع التركيز (العين) المكررة من شريط أدوات الكانفاس السفلي، وتوحيد التحكم بوضع التركيز حصرياً في الشريط الجانبي (WorkspacePanelRail) واختصار Ctrl+. منعاً للازدواجية البصرية.
