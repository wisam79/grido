---
type: fix
scope: ui
related_files:
  - admin-web/src/components/landing/Header.tsx:109
---

إزالة الإطار الزخرفي حول شعار التطبيق في هيدر صفحة الهبوط: حُذفت الحاوية بالكامل (التدرّج الخلفي + `border-white/10` + `shadow-inner` + `p-1` + `rounded-xl`) وبقي الشعار عارياً بمقاسه الأصلي، مع نقل أثر الرفع `group-hover:scale-105` إلى الصورة نفسها — امتداد لمبدأ تقليم الزخرفة المعتمد في الجلسة 0.87.
