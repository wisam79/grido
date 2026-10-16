---
type: fix
scope: ui
related_files:
  - admin-web/src/index.css:326
  - admin-web/src/index.css:661
  - admin-web/src/components/landing/AppMockup.tsx:39
  - admin-web/src/components/landing/BentoGrid.tsx:26
  - admin-web/src/components/landing/AudienceSection.tsx:48
  - admin-web/src/components/landing/TestimonialsSection.tsx:18
  - admin-web/src/components/landing/PricingSection.tsx:145
  - admin-web/design.md:338
---

استعارة انتقائية من إتقان الصفحات التسويقية (Apple-style craft) ضمن هوية Fluent 2 ودون أي مساس باللوحة أو الخامات: (1) **كشف متتابع للبطاقات** عبر فئة `.reveal-stagger` — تأخير 80ms ثم +60ms لكل بطاقة، يرث منحنى الكشف الحالي، والمؤخرة على opacity/transform فقط كي لا يتأخر التحويم، مطبَّق على شبكة Bento و«من يستفيد» والآراء وضمانات التسعير؛ (2) **انضباط الحركة** — نافذة `AppMockup` تُجمّد حركاتها (`animation-play-state` عبر `.mockups-paused`) ودورتَي المرحلة والطباعة فور خروجها من الشاشة (IntersectionObserver بهامش 120px)، فتنتهي حلقات الليزر/النبض التي كانت تعمل خلف الكواليس؛ وحُذفت في المناسبة حركات mockup ميتة بلا أي مستهلك (`animate-mockup-scan-hud/wipe/beam/pulse` + keyframesها ≈47 سطراً)؛ (3) **كثافة تحريرية** — اقتباسات الآراء رُفعت من `text-xs sm:text-sm` إلى `text-sm sm:text-base` مع `leading-relaxed`. وُثّق الكل في دستور `admin-web/design.md` (§6 و§7 وسجل v2.2).
