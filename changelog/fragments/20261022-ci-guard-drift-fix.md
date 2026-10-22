---
type: fix
scope: ui
related_files:
  - frontend/src/components/editor/panels/collage/collage-autofill-tab.tsx:304
  - frontend/src/components/editor/panels/collage/collage-autofill-tab.tsx:460
  - frontend/test/icon-size-resolution.test.tsx:75
---

انحرافان كشفتهما شبكة CI الكاملة ولم تكشفهما الاستهدافات المحلية: لوحة «تعبئة وفرز الخانات» كانت تستخدم حجم خط اعتباطي `text-[9px]` يخالف حارس R-series (المقياس `--text-*` فقط)، فاستُبدل بـ`text-2xs` وهو 9px حرفياً بلا تغيير بصري؛ وحارس دقة الأيقونات كان يثبّت `Sparkle` على شبكة 24 أسقطها المولّد لأن أقصى استعمال فعلي للأيقونة 16px، فصار التأكيد يقيس أولوية خاصية `size` على الأصناف بشبكة متاحة فعلاً (20 مقابل صنف 14) بدل تثبيت جردٍ لم يعد موجوداً.
