---
type: fix
scope: ui
related_files:
  - frontend/src/components/editor/system/desktop-menu-bar.tsx:196
  - frontend/src/App.tsx:258
  - frontend/src/index.css:414
  - frontend/eslint.config.js:41
---

استئصال مربعات المتصفح الافتراضية وحل تقليص النافذة:
1. استُبدل `window.confirm` الأخير في `desktop-menu-bar.tsx` بحوار تأكيد أصيل `AlertDialog` وفق معايير Fluent 2 لتفادي ظهور مربع `wails.localhost says`، مع تفعيل قاعدة `'no-alert': 'error'` في ESLint لمنع أي استدعاء متصفح مستقبلاً.
2. حُلّت مشكلة تقليص النافذة (Unmaximise / Layout Shift):
   - حصر حدث النقر المزدوج على خلفية شريط العنوان فقط ومنع تصعيده من أزرار القوائم ومبدّل الأوضاع (`كولاج` و`تعديل حر`)، فلم يعد النقر المزدوج على الأقسام أو الحوارات يفك تكبير النافذة.
   - إلغاء إزاحة الـ scrollbar التي يحقنها Radix UI في الـ body عند فتح أي نافذة حوار (`--removed-body-scroll-bar-size: 0px`) لمنع انكماش أو اهتزاز واجهة سطح المكتب.
