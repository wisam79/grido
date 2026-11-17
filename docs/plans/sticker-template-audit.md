# تدقيق قوالب الملصقات — تقرير آلي

> مُولَّد بـ `node scripts/sticker-template-audit.mjs`. لا يُعدَّل يدوياً.

## الإجمالي

- القوالب: **208**
- لديها `defaultMm` صريح: **208**
- بلا مقاس فيزيائي صريح: **0**
- مراسي `data-field-id`: **707**
- مراسي `data-color-role`: **1176**
- نداءات `generateSvg`: **208**

## التوزيع حسب الملف

| الملف | القوالب | defaultMm | بلا مقاس | field-id | color-role |
|---|---:|---:|---:|---:|---:|
| `addons.ts` | 22 | 22 | 0 | 70 | 44 |
| `badges.ts` | 7 | 7 | 0 | 21 | 17 |
| `barcodes.ts` | 4 | 4 | 0 | 11 | 12 |
| `beauty.ts` | 6 | 6 | 0 | 17 | 48 |
| `business_cards.ts` | 20 | 20 | 0 | 103 | 88 |
| `cafe.ts` | 6 | 6 | 0 | 18 | 53 |
| `composer_stamps.ts` | 8 | 8 | 0 | 0 | 0 |
| `craft_cards.ts` | 20 | 20 | 0 | 78 | 168 |
| `events_cards.ts` | 20 | 20 | 0 | 83 | 255 |
| `frames.ts` | 14 | 14 | 0 | 28 | 48 |
| `greeting.ts` | 6 | 6 | 0 | 17 | 38 |
| `kids.ts` | 6 | 6 | 0 | 17 | 50 |
| `packaging.ts` | 4 | 4 | 0 | 12 | 19 |
| `retail.ts` | 5 | 5 | 0 | 16 | 27 |
| `retail_cards.ts` | 20 | 20 | 0 | 88 | 123 |
| `safety.ts` | 4 | 4 | 0 | 12 | 12 |
| `seasonal.ts` | 5 | 5 | 0 | 15 | 36 |
| `shipping.ts` | 5 | 5 | 0 | 14 | 20 |
| `social.ts` | 6 | 6 | 0 | 18 | 28 |
| `social_cards.ts` | 20 | 20 | 0 | 69 | 90 |

## قوالب بلا مقاس فيزيائي صريح

لا يوجد — كل القوالب تملك `defaultMm`.
