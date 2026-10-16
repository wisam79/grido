---
type: fix
scope: ui
related_files:
  - admin-web/src/pages/LandingPage.tsx:35
  - admin-web/src/index.css:372
  - admin-web/design.md:204
---

توهج البطاقات التابع للمؤشر في شبكة Bento (`spotlight-hover`) كان ثابتاً في المركز: المتتبّع العام في `LandingPage.tsx` يضبط `--mouse-x/y` لفئة `.spotlight-card` (بطاقات اللوحة) فقط، بينما بطاقات الهبوط الأربع تستعمل `.spotlight-hover` فتسقط على قيمة `50%` الافتراضية، مع أن `design.md` كان يوثّق الفرق كفجوة معروفة. وُسّع محدد `closest` إلى `'.spotlight-card, .spotlight-hover'` (سطر واحد؛ نفس آليات الأداء: rAF واحد وحدث passive وتحديث DOM مباشر بلا إعادة رندر) فصار التوهج يتبع المؤشر في بطاقات المميزات، وحُدّث دستور `admin-web/design.md` (§4-C و§7-B وسجل v2.1) من «فرق تنفيذي مسجَّل» إلى «سلوك منفَّذ».
