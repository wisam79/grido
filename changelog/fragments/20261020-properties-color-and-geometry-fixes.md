---
type: fix
scope: ui
related_files:
  - frontend/src/components/editor/properties/shared-controls.tsx:1
  - frontend/src/components/editor/properties/panels/shape-properties.tsx:1
  - frontend/src/components/editor/panels/collage/collage-paper-tools-tab.tsx:1
---
أُزيل التلميح الأصلي (native title) من زر تغيير اللون واستُبدل بتلميح Fluent داخل التطبيق يفتح أعلى الزر، فلا يتسرّب أسفل بطاقة «إطار الصور» أو يتراكب مع حدّها.
أُضيفت أسماء وصول لمفتاحَي «زوايا مستقلة» و«رأس في البداية» في تبويب تنسيق الشكل، واختُصر نص وضع التكرار المرئي إلى «الكل» مع إبقاء الاسم الوصفي «شبكة كاملة» في `aria-label` لمنع اقتطاع النص في لوح الورق.
التحقق: `tsc --noEmit` و`eslint --max-warnings 0` للملفات الثلاثة ناجحان؛ حارس هندسة الألواح (Playwright) يُتحقق منه في CI.
