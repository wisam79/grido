---
type: refactor
scope: ui
related_files:
  - admin-web/src/components/landing/SectionHeader.tsx:48
  - admin-web/src/components/landing/BentoGrid.tsx:17
  - admin-web/src/components/landing/AiSpotlightSection.tsx:96
  - admin-web/src/components/landing/Windows11Section.tsx:37
  - admin-web/src/components/landing/AudienceSection.tsx:32
  - admin-web/src/components/landing/ComparisonSection.tsx:60
  - admin-web/src/components/landing/TestimonialsSection.tsx:10
  - admin-web/src/components/landing/PricingSection.tsx:44
  - admin-web/src/components/landing/FaqSection.tsx:42
  - admin-web/src/components/landing/HeroSection.tsx:63
  - admin-web/src/components/landing/Header.tsx:100
  - admin-web/src/components/landing/RoiCalculator.tsx:106
  - admin-web/src/components/landing/CtaBanner.tsx:17
  - admin-web/src/components/landing/Footer.tsx:9
  - admin-web/src/pages/LandingPage.tsx:95
  - admin-web/src/index.css:163
  - admin-web/src/index.css:435
---

توحيد هوية صفحة الهبوط على التوكنات المعرّفة في `@theme` بدل تكرار قيم hex في المكونات: أُبدلت الخلفيات `#121212/#171717/#1E1E1E/#262626/#141414` بأدوات `bg-workspace/bg-sidebar/bg-card/bg-card-hover/bg-inset`، والحدود `#2C2C2C` بـ`border-border-subtle`، والنصوص `#F5F5F5/#9E9E9E/#8A8A8A` بـ`text-text-primary/secondary/muted`، والأزرق `#3b82f6/#2563eb/#60a5fa` بـ`brand-primary/brand-hover/brand-light`، والأخضر/الكهرماني/الأحمر بـ`status-success/warning/error` — عبر 14 مكوّناً في `landing/` وصفحة `LandingPage`. استُثنيت عن قصد لوحات `AppMockup` و`CMYK3DStack` و`Biometric3DCard` (نسخة طبق الأصل من واجهة التطبيق ومشاهد ثلاثية الأبعاد ببصرياتها الخاصة) وأخضر واتساب التجاري `#25D366`. صُحّح انحراف خارج النظام: `#A3A3A3` في وصف الهيرو، و`#D4D4D4` في المقارنة والأسئلة الشائعة، و`text-slate-300` في Bento، وحدود `#333333/#242424`، وروابط التذييل `text-blue-400` ← `text-brand-light`، ونُقلت تعبئة منزلقات الحاسبة إلى `var(--grido-brand-primary)` و`var(--grido-status-success)`.

عاد سطر الدعم الواحد الاختياري إلى `SectionHeader` (`description`) بمقياس واحد `text-xs sm:text-sm text-text-secondary` وعرضين مضبوطين (672px موسّط / 448px بمحاذاة البداية) في ثمانية أقسام — دون إحياء شارة الـeyebrow أو الوصف المتعدد الذي حُذف في 0.87. وزمناً: أُضيفت دلالات وصول لمبدّلي العرض في Bento (`role="group"` + `aria-pressed` + `type="button"`)، وأُعيد ربط `.btn-secondary` وthumb شريط التمرير في `index.css` بمتغيّرات `--grido-*`. التحقق: `oxlint` (0/0) و`tsc -b` و`vite build` و`vitest` (14/14) تمر كلها.
