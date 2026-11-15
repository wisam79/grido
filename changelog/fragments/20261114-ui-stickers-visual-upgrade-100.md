---
type: feat
scope: ui
related_files:
  - frontend/src/features/stickers/types.ts:18
  - frontend/src/features/stickers/constants.tsx:35
  - frontend/src/features/stickers/templates/index.ts:146
  - frontend/src/features/stickers/components/sticker-catalog.tsx:37
  - frontend/src/features/stickers/templates/svg-elements.ts:122
  - frontend/src/features/stickers/templates/business_cards.ts:84
  - frontend/src/features/stickers/templates/social_cards.ts:7
  - frontend/src/features/stickers/templates/retail_cards.ts:14
  - frontend/src/features/stickers/templates/events_cards.ts:29
  - frontend/src/features/stickers/templates/craft_cards.ts:14
  - frontend/src/features/stickers/templates/retail.ts:1
  - frontend/src/features/stickers/templates/packaging.ts:1
  - frontend/src/features/stickers/templates/shipping.ts:1
  - frontend/src/features/stickers/templates/social.ts:1
  - frontend/src/features/stickers/templates/cafe.ts:1
  - frontend/src/features/stickers/templates/beauty.ts:1
  - frontend/src/features/stickers/templates/greeting.ts:1
  - frontend/src/features/stickers/templates/kids.ts:1
  - frontend/src/features/stickers/templates/seasonal.ts:1
  - frontend/src/features/stickers/templates/addons.ts:1
  - frontend/test/sticker-templates.test.ts:356
  - docs/plans/sticker-template-audit.md:1
---

ترقية وتوسيع مكتبة قوالب الملصقات والبطاقات إلى **200 قالب** متكامل (100 ملصق + 100 بطاقة مصمّمة) مع تحسين الجودة البصرية وتعميم خطوط القص الصريحة (`cutShape`) وضبط محاذاة النصوص وتحسين أداء البحث والمعرض.
- ترقية التصميم البصري للقوالب المسطحة في فئات `retail` (5 قوالب) و`packaging` (4 قوالب) و`shipping` (5 قوالب) و`social` (3 قوالب) باستخدام التدرجات والزخارف الحرفية (`ticketStubPath` و`cornerBracketsMarkup` و`starRowMarkup`) وإزالة الألوان الثابتة المتعارضة.
- إضافة **17 ملصقاً جديداً** في الفئات الأقل تمثيلاً (`social` +3، `cafe` +3، `beauty` +3، `greeting` +3، `kids` +3، `seasonal` +2) مع مقاسات فيزيائية `defaultMm` ومراسي `data-field-id` و`data-color-role` كاملة وتوطين عراقي أصيل.
- إضافة **100 بطاقة مصمّمة احترافية** عبر 5 ملفات (`business_cards.ts` و`social_cards.ts` و`retail_cards.ts` و`events_cards.ts` و`craft_cards.ts`) مع شريحة فلتر `بطاقات وتصاميم` (`cards`) ذات أولوية في `constants.tsx`، وفهرس بحث مسبق التطبيع `SEARCH_INDEX` في `templates/index.ts`، وسقف LRU بمقدار `160` في `PREVIEW_CACHE` داخل `sticker-catalog.tsx` مع إبطال تلقائي وإعادة تصيير للمعاينات المولّدة قبل جاهزية مولدات QR/الباركود (`UNREADY_PREVIEW_IDS`)، وإزالة أي تسمية خارجية وضبط محاذاة RTL/LTR والتوسيط العمودي (`dominant-baseline="central"`) وحاويات الأيقونات والإطارات الداخلية الدقيقة وفصل التداخلات الناتجة عن تصيير Cairo (في `cafe_iced_latte_cup` و`cafe_dessert_patisserie` و`retail_bogo_free` و`retail_national_product` و`greeting_floral_wreath` و`seasonal_eid_lantern` و3 بطاقات).
- تعميم تعريف خط القص الهندسي `cutShape` عبر جميع القوالب والبطاقات و`addons.ts` والتحقق منه ومن محاذاة النصوص عبر `sticker-templates.test.ts` و`sticker-template-audit.mjs` (**200 قالب / 200 defaultMm / 0 بلا مقاس**).
