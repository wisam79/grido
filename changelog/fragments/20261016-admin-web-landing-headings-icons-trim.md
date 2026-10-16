---
type: refactor
scope: ui
related_files:
  - admin-web/src/components/landing/SectionHeader.tsx
  - admin-web/src/components/landing/HeroSection.tsx
  - admin-web/src/components/landing/BentoGrid.tsx
  - admin-web/src/components/landing/AiSpotlightSection.tsx
  - admin-web/src/components/landing/Windows11Section.tsx
  - admin-web/src/components/landing/AudienceSection.tsx
  - admin-web/src/components/landing/ComparisonSection.tsx
  - admin-web/src/components/landing/TestimonialsSection.tsx
  - admin-web/src/components/landing/PricingSection.tsx
  - admin-web/src/components/landing/FaqSection.tsx
  - admin-web/src/components/landing/CtaBanner.tsx
  - admin-web/src/components/landing/Header.tsx
  - admin-web/src/components/landing/WhatsAppButton.tsx
  - admin-web/src/index.css
  - admin-web/src/data/landing-content.ts
  - admin-web/design.md
---

تقليم رؤوس الأقسام والأيقونات الزخرفية في صفحة الهبوط وفق مبدأ Fluent 2 (الأيقونة ذات غرض دلالي لا زخرفي):
`SectionHeader` صار عنواناً أبيض كبيراً واحداً فقط — حُذفت الشارة (eyebrow) والوصف من الأقسام الثمانية كلها (كانت ثلاث طبقات نصية متنافسة في رأس كل قسم).
وأُزيلت الأيقونات/العناصر التزيينية الزائدة: أيقونات روابط التنقل في درج الجوال، وأيقونات شريط الثقة في الهيرو، ونجوم تقييم الآراء مع حقل `rating` في `landing-content.ts`، والشارة الترويجية العائمة «الخيار الأسرع للاستوديوهات»، وشارة «نتائج حقيقية»، وإيموجي الوسوم (✨/📷/✓)، وعلامة النجاح الخضراء المكررة في مسار خطوات قسم الـAI، وأيقونة `ShieldCheck` في شارة الختام. بقيت الأيقونات ذات الغرض فقط (أزرار التحميل/التشغيل، مبدّل 3D، سهم الأكورديون، بلاطات هوية البطاقات، علامات ✓/✗ في المقارنة، أيقونات الخطوات).

وبمرجع مهارة `fluent-design-system` المُثبّتة، أُدخل سلّم ارتفاع مسمّى (`.ds-elevate-rest/raised/overlay/dialog`) على التوكنات `--material-shadow-2/4/8/16` في `@layer components`، وطُبّق على عناصر الهبوط العائمة (أزرار الهيدر، درج الجوال، زر التحميل العائم، زر واتساب) مع إزالة توهج `#3b82f6` من أزرار الهيدر التزاماً بمبدأ Zero Button Glow.
