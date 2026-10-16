---
type: fix
scope: ui
related_files:
  - admin-web/src/index.css:184
  - admin-web/src/index.css:211
  - admin-web/src/index.css:311
  - admin-web/src/index.css:364
  - admin-web/src/index.css:386
  - admin-web/src/components/landing/RoiCalculator.tsx:91
  - admin-web/src/components/landing/RoiCalculator.tsx:113
  - admin-web/src/components/landing/ComparisonSection.tsx:107
  - admin-web/src/components/landing/Header.tsx:65
  - admin-web/src/components/landing/Header.tsx:232
---

صقل صفحة الهبوط (P1): إصلاح اختفاء مقابض منزلقات حاسبة التوفير بفئة `.ds-range` جديدة (كان `appearance-none` بلا أنماط مقبض يحذف المقبض في Chromium/Firefox)، رفع تباين `#666`/`#737373` إلى `#8A8A8A` (WCAG AA)، حذف ~110 أسطر CSS ميتة (12 كلاسة/كتلة بلا أي مستهلك)، وتعطيل `scroll-behavior: smooth` عند `prefers-reduced-motion`. كذلك حُذف `admin-web/public/fonts/` (15 ملف Thmanyah woff2 ≈1.13MB بلا أي مرجع — متتبعة في Git وقابلة للاسترجاع)، وصُحّحت مراجع الفئات المحذوفة في `admin-web/design.md`. كذلك حُسّن هيدر صفحة الهبوط: مؤشر التنقل النشط صار صبغة زرقاء أنيقة بدل الحجب الأزرق الصلب (يبقى زر التحميل الأزرق الصلب الوحيد في الهيدر)، وتوحيد ألوان السطح (`#1A1A1A`/`#161616` ← توكن `#171717`)، وحد لامع علوي وظل أخف عند التمرير، وزر قائمة دائري متسق، وإغلاق قائمة الجوال بـ `Escape` مع `aria-controls`، و`scroll-padding-top: 6rem` لتعويض ارتفاع الهيدر اللاصق عند القفز لروابط المقاطع. وفي تطوير لاحق في الجلسة ذاتها، تحوّل مؤشر التنقل إلى Magic Pill منزلق يتبع المقطع النشط (قياس `offsetLeft/offsetWidth` عند تغيّر القسم وعند تغيّر حجم النافذة وجهوزية الخطوط)، وأُضيف شريط تقدم التمرير المتدرج أسفل الهيدر (تحديث عبر rAF مباشرة على DOM بلا إعادة رندر)، وخلفية معتمة تُغلق قائمة الجوال بالنقر مع دخول متتابع لعناصرها (`dropIn`)، ووميض Premium (`.cta-shine`) يكتسح زر التحميل عند التحويم في الواجهة المكتبية والدرج.
