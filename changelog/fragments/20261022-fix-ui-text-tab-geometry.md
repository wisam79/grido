---
type: fix
scope: ui
related_files:
  - frontend/src/components/editor/panels/freeform/freeform-text-tab.tsx:437
  - frontend/src/lib/templates/text-presets.ts:398
---

إصلاح هندسة لوحة تبويب النصوص واقتطاع النصوص (Panel Geometry Guard): استبدال truncate بـ break-words في بطاقات الأنماط لمنع احتساب النصوص الطويلة كمقتطعة، واستخدام تسميات موجزة رصينة للكبسولات (عناوين، توثيق، تأثيرات، تراكيب) لتلائم سقف العرض (56px للكبسولة)، واعتماد قياسات الخط المنهجية text-2xs وtext-micro بدل القياسات الاعتباطية.
