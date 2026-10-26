---
type: refactor
scope: ui
related_files:
  - frontend/src/components/editor/panels/collage/collage-custom-grid-tab.tsx:434
  - frontend/src/components/editor/panels/collage/collage-custom-grid-tab.tsx:488
  - frontend/src/components/editor/panels/collage/collage-custom-grid-tab.tsx:543
  - frontend/test/collage-custom-grid-tab.test.tsx:144
---
تبسيط تبويب شبكة الكولاج بطلب المالك: حذف زرَي «ركن القص» و«توسيط» وبطاقة حالة «الشبكة مطبقة» من التذييل، وتوسيط مصفوفة المحاذاة وتكبير أهدافها، وحذف شارة المقاس المكررة من رأس «مقاس الصورة» لأن المقاس ظاهر في الخيار المحدد.
