---
type: refactor
scope: ui
related_files:
  - admin-web/src/pages/admin/__tests__/admin-integrated.test.ts:1
  - admin-web/src/pages/admin/components/DashboardHeader.tsx:22
  - admin-web/src/pages/admin/components/EditUserModal.tsx:43
  - admin-web/src/pages/admin/components/KeysTable.tsx:84
  - admin-web/src/pages/admin/components/LoginForm.tsx:88
  - admin-web/src/pages/admin/components/SettingsForm.tsx:51
  - admin-web/src/pages/admin/components/Sidebar.tsx:35
  - admin-web/src/pages/admin/components/StatsBreakdown.tsx:43
  - admin-web/src/pages/admin/components/StatsCards.tsx:48
  - admin-web/src/pages/admin/components/UsageLogsTable.tsx:17
  - admin-web/src/pages/admin/components/UsersTable.tsx:49
  - admin-web/public/sitemap.xml:9
  - .github/workflows/deploy-pages.yml:52
  - admin-web/src/lib/version.ts:4
  - .agents/AGENTS.md:15
---
تدقيق احترازي نهائي لموقع الهبوط ولوحة الإدارة قبل الإطلاق: تعريب شامل واحترافي لكافة نصوص وأزرار وفلاتر ومؤشرات لوحة الإدارة بصياغة عربية رصينة ومختصرة ملائمة للتصميم، كتابة حزمة اختبارات متكاملة معزولة للوحة الإدارة (18 اختباراً في الذاكرة دون المساس ببيانات الإنتاج)، تعزيز وصولية نافذة تعديل المشترك، إضافة مسارات الخصوصية والشروط لخريطة الموقع، وتأمين مسار /admin على GitHub Pages.
