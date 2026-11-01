---
type: refactor
scope: ui
related_files:
  - frontend/src/features/stickers/components/sticker-properties.tsx:101
  - frontend/src/features/stickers/components/sticker-design-tab.tsx:1
  - frontend/src/features/stickers/components/sticker-sheet-tab.tsx:1
  - frontend/src/features/stickers/components/sticker-presets-tab.tsx:1
---
تفكيك لوح خصائص الملصق (718 سطراً — منطقه رفيع وكتلته الـJSX) إلى ثلاثة مكوّنات تبويب شقيقة بنمط الميزة: `sticker-design-tab` (النصوص والألوان مع زر الدور اللوني ولوحات الألوان المنتقاة وقسم المظهر بخياراته الـ4) و`sticker-sheet-tab` (معاينة الشبكة المصغرة والملاءمة التلقائية وقوالب الشبكة والمنزلقات الثلاثة) و`sticker-presets-tab` (حفظ التخصيص وقائمة القوالب المحفوظة بحذفها وتطبيقها). المكوّن الأصلي يبقى قائد الحالة: حساب تحذير التباين، حفظ/حذف/تطبيق القوالب المحفوظة عبر preset-utils، وملاءمة الشيت التلقائية. الـJSX منقول حرفياً بلا تعديل وAPI المكوّن العام ثابت. تحقق: 39/39 اختبار الملصقات المستهدفة، tsc، ESLint `--max-warnings 0`، format، docs-gate.
