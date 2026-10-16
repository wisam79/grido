---
type: fix
scope: ui
related_files:
  - admin-web/src/components/landing/SectionHeader.tsx:41
  - admin-web/src/components/landing/BentoGrid.tsx:17
  - admin-web/src/components/landing/ComparisonSection.tsx:60
  - admin-web/src/components/landing/PricingSection.tsx:49
  - admin-web/src/components/landing/Windows11Section.tsx:35
  - admin-web/src/components/landing/FaqSection.tsx:40
  - admin-web/src/components/landing/AiSpotlightSection.tsx:89
  - admin-web/src/components/landing/AudienceSection.tsx:40
  - admin-web/src/components/landing/TestimonialsSection.tsx:10
  - admin-web/src/components/landing/CtaBanner.tsx:11
  - admin-web/src/components/landing/RoiCalculator.tsx:37
  - admin-web/src/components/landing/HeroSection.tsx:93
  - admin-web/src/components/common/TourModal.tsx:101
  - admin-web/src/index.css:431
  - admin-web/src/index.css:448
  - admin-web/src/components/landing/AiSpotlightSection.tsx:102
  - admin-web/src/components/landing/AiSpotlightSection.tsx:196
  - admin-web/src/components/landing/PricingSection.tsx:148
  - admin-web/src/components/landing/BentoGrid.tsx:163
  - admin-web/src/components/landing/BentoGrid.tsx:208
  - admin-web/src/components/landing/CtaBanner.tsx:8
  - admin-web/src/components/landing/RoiCalculator.tsx:98
  - admin-web/src/index.css:222
  - admin-web/src/index.css:235
---

صقل تصميم صفحة الهبوط عبر إزالة فراغات ميتة وتقوية التسلسل البصري. قسم محرك الذكاء الاصطناعي كان بطاقة بعرض كامل تحوي وسائط `max-w-md` (448px) موسّطة فيبقى ~330px فراغاً على كل جانب، والخطوات الثلاث في صف منفصل تحته؛ أصبح عمودين متوازنين (وسائط 5/12 + مسار خطوات عمودي 7/12) فأُلغيت الفراغات وقُصّ ~300px من طول الصفحة، مع `max-w-sm` تحت `lg` كي لا تتضخم الصورة عند التراص. بطاقات ضمانات التسعير تحوّلت من رأسية بـ `justify-between` تدفع العنوان للأعلى والوصف للأسفل (فتحة ~70px في المنتصف) إلى صف أفقي موسّط رأسياً. في Bento أخذت معاينات «صانع الكولاج» و«خصوصية تامة» `flex-1` فامتصت ارتفاع الصف بدل ترك فراغ أسفلها. أُضيف هالة `aurora-bg` وحدّ لامع `card-specular-edge` لشريط الدعوة الختامي بدل صندوق مسطّح. ولمنزلقات حاسبة التوفير تعبئة مسار حتى المقبض عبر `--range-fill` مع تدرّج معاكس في RTL (`[dir='rtl'] .ds-range`) فصار موضع القيمة داخل مداها مقروءاً بصرياً.

بعدها وُحّدت بدائيات القسم: `SectionHeader` جديد يختصر شريط (شارة + عنوان + وصف) الذي كان مكرراً يدوياً في 8 مكونات بفروق عرضية (مقياس عنوان 48px/40px/30px، حجم وصف 12px/14px، هامش سفلي 40/48/28px، عرض حاوية 672px/768px) — الآن مقياس واحد مع متغيّرات مُسمّاة `align`/`size`/`gap`، وعرض العنوان 768px منفصل عن عرض الوصف 672px كي لا ينكسر سطر العنوان ولا يتغيّر لفّ الوصف. واعتُمد `ds-card` في 18 موضعاً و`ds-icon-tile` الجديدة في 9 مواضع بدل السلاسل اليدوية `rounded-2xl bg-[#1E1E1E] border border-[#2C2C2C]` و`rounded-xl bg-[#141414] border ...` (تحقّق: `rounded-2xl` يساوي `--radius-2xl` = 20px فالتوحيد مطابق بصرياً، وأنصاف الأقطار بقيت 20px للبطاقات و16px للبلاطات).

الإصلاح البنيوي الأهم: بدائيات CSS كانت **غير طبقية** فتغلب utilities في Tailwind v4 (تُحسم الطبقات قبل النوعية)، ما جعل `.ds-card` يبتلع `hover:border-*` و`bg-[#171717]` ويُعطّل حدّ الفتح الأزرق في الأسئلة الشائعة. نُقلت `.ds-card`/`.ds-card-inset`/`.ds-card-interactive`/`.ds-icon-tile` إلى `@layer components` فتغلّبت utilities الطبقة المتأخرة عند الحاجة — وهو ما أصلح أربع حالات تحويم وحدّ بطاقة المقارنة الأزرق وحالة الفتح في الأسئلة (تحقّق حيّ: `borderTopColor` = أزرق 40% بعد الإصلاح، وخلفية بطاقة «الطرق التقليدية» = `rgb(23,23,23)`). ونُظّف شريط الثقة في الهيرو من `rounded-2xl border border-[#2C2C2C]/70` المكررين فوق `ds-card-inset` بعد أن صارا فعّالين بالطبقة الجديدة، فبقي نصف القطر 12px كما كان. التحقق: `tsc -b` و`vite build` و`oxlint` (0/0) و`vitest` (14/14) و`docs-gate` تمر كلها، وقياس حي عند 480/1920: لا تجاوز أفقي، كل عناوين الأقسام سطر واحد، وارتفاع الصفحة 9876 ← 9862.
