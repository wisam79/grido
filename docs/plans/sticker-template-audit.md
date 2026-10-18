# تدقيق قوالب الملصقات — تقرير آلي

> مُولَّد بـ `node scripts/sticker-template-audit.mjs`. لا يُعدَّل يدوياً.

## الإجمالي

- القوالب: **83**
- لديها `defaultMm` صريح: **42**
- بلا مقاس فيزيائي صريح: **41**
- مراسي `data-field-id`: **240**
- مراسي `data-color-role`: **161**
- نداءات `generateSvg`: **83**

## التوزيع حسب الملف

| الملف | القوالب | defaultMm | بلا مقاس | field-id | color-role |
|---|---:|---:|---:|---:|---:|
| `addons.ts` | 22 | 4 | 18 | 70 | 29 |
| `badges.ts` | 7 | 0 | 7 | 23 | 16 |
| `barcodes.ts` | 4 | 0 | 4 | 11 | 8 |
| `beauty.ts` | 3 | 3 | 0 | 8 | 6 |
| `cafe.ts` | 3 | 3 | 0 | 9 | 7 |
| `frames.ts` | 14 | 11 | 3 | 28 | 14 |
| `greeting.ts` | 3 | 3 | 0 | 10 | 6 |
| `kids.ts` | 3 | 3 | 0 | 9 | 8 |
| `packaging.ts` | 4 | 0 | 4 | 12 | 10 |
| `retail.ts` | 5 | 5 | 0 | 16 | 16 |
| `safety.ts` | 4 | 4 | 0 | 12 | 12 |
| `seasonal.ts` | 3 | 3 | 0 | 9 | 8 |
| `shipping.ts` | 5 | 0 | 5 | 14 | 13 |
| `social.ts` | 3 | 3 | 0 | 9 | 8 |

## قوالب بلا مقاس فيزيائي صريح

| الملف | المعرّف |
|---|---|
| `addons.ts` | `badge_verified_trust` |
| `addons.ts` | `badge_handmade_love` |
| `addons.ts` | `badge_eco_friendly` |
| `addons.ts` | `badge_best_seller` |
| `addons.ts` | `greeting_grad_cap` |
| `addons.ts` | `greeting_order_appreciation` |
| `addons.ts` | `food_hot_pizza` |
| `addons.ts` | `food_shawarma_grill` |
| `addons.ts` | `food_oriental_sweets` |
| `addons.ts` | `food_natural_honey` |
| `addons.ts` | `greeting_eid_mubarak` |
| `addons.ts` | `greeting_wedding_congrats` |
| `addons.ts` | `greeting_baby_welcome` |
| `addons.ts` | `greeting_jummah_blessed` |
| `addons.ts` | `school_notebook_label` |
| `addons.ts` | `school_star_student` |
| `addons.ts` | `medical_rx_pharmacy` |
| `addons.ts` | `medical_keep_cold` |
| `badges.ts` | `seal_gold_guarantee` |
| `badges.ts` | `seal_premium_ribbon` |
| `badges.ts` | `seal_handmade_craft` |
| `badges.ts` | `seal_organic_natural` |
| `badges.ts` | `seal_sale_burst` |
| `badges.ts` | `seal_quality_approved` |
| `badges.ts` | `seal_limited_edition` |
| `barcodes.ts` | `barcode_code128` |
| `barcodes.ts` | `barcode_ean13` |
| `barcodes.ts` | `barcode_qr_custom` |
| `barcodes.ts` | `barcode_warehouse_box` |
| `frames.ts` | `frame_baroque_ornate` |
| `frames.ts` | `frame_wooden_rustic` |
| `frames.ts` | `frame_hexagonal_geometric` |
| `packaging.ts` | `packaging_expiry_dates` |
| `packaging.ts` | `packaging_thank_you` |
| `packaging.ts` | `packaging_open_here` |
| `packaging.ts` | `packaging_eco_recycle` |
| `shipping.ts` | `shipping_fragile` |
| `shipping.ts` | `shipping_this_way_up` |
| `shipping.ts` | `shipping_keep_dry` |
| `shipping.ts` | `shipping_heavy_package` |
| `shipping.ts` | `shipping_do_not_stack` |
