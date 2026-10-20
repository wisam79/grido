---
type: refactor
scope: ui
related_files:
  - frontend/src/index.css:128
  - frontend/src/components/ui/dialog.tsx:77
  - frontend/src/components/ui/blocks/fluent-section.tsx:59
  - frontend/src/components/ui/blocks/fluent-segmented-control.tsx:92
  - frontend/src/components/editor/panels/panel-shell.tsx:80
---
إعادة تصميم الواجهة نحو طابع سطح المكتب الأصلي: خفض أساس نصف قطر `--radius` من 8px إلى 6px، وتحويل أقسام لوحة الخصائص إلى صفوف مسطّحة بخطوط شعرية بدل البطاقات العائمة، واستبدال الكبسولة التبويبية بخط سفلي، وتخفيف حواف النوافذ والقوائم المنبثقة مع تقليم الظلال والتباعد — 54 ملفاً.
