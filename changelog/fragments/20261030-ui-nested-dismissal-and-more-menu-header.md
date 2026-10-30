---
type: fix
scope: ui
related_files:
  - frontend/src/components/ui/dialog.tsx:60
  - frontend/src/components/editor/toolbar/toolbar.tsx:150
---
حماية النوافذ الحوارية من الإغلاق العرضي عند النقر على الخلفية المعتمة أو إغلاق القوائم المنبثقة فوقها بجعل `closeOnOutsideClick=false` افتراضياً في `DialogContent` واقتصار الإغلاق على الأزرار الصريحة، واستعادة عنوان «خيارات المستند» في قائمة المزيد بشريط الأدوات.
