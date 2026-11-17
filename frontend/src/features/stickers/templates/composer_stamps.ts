import {
  composeStampV2Svg,
  resolveStampV2CutShape,
  STAMP_DECOR_OPTIONS,
  STAMP_ICON_FIELD_OPTIONS,
  STAMP_SHAPE_OPTIONS,
  type ComposeStampV2Defaults,
} from '../lib/stamp-composer-v2';

import type { StickerField, StickerTemplate } from '../types';

function createComposerFields(defaults: ComposeStampV2Defaults): StickerField[] {
  return [
    {
      id: 'shape',
      label: 'شكل الختم',
      type: 'select',
      defaultValue: defaults.shape,
      options: STAMP_SHAPE_OPTIONS.map((s) => ({ value: s.id, label: s.label })),
    },
    {
      id: 'icon',
      label: 'الأيقونة',
      type: 'select',
      defaultValue: defaults.icon,
      options: STAMP_ICON_FIELD_OPTIONS,
    },
    {
      id: 'decor',
      label: 'الزخرفة',
      type: 'select',
      defaultValue: defaults.decor,
      options: STAMP_DECOR_OPTIONS.map((d) => ({ value: d.id, label: d.label })),
    },
    {
      id: 'topText',
      label: 'النص العلوي',
      type: 'text',
      defaultValue: defaults.topText,
    },
    {
      id: 'mainText',
      label: 'العنوان الرئيسي',
      type: 'text',
      defaultValue: defaults.mainText,
    },
    {
      id: 'subText',
      label: 'الشريط السفلي',
      type: 'text',
      defaultValue: defaults.subText,
    },
  ];
}

const VERIFIED_DEFAULTS: ComposeStampV2Defaults = {
  shape: 'rosette',
  icon: 'ph:seal-check-fill',
  decor: 'stars',
  topText: 'PREMIUM QUALITY',
  mainText: 'موثوق',
  subText: 'جودة مضمونة 100%',
};

const BEST_SELLER_DEFAULTS: ComposeStampV2Defaults = {
  shape: 'burst',
  icon: 'ph:crown-fill',
  decor: 'stars',
  topText: 'BEST SELLER',
  mainText: 'الأكثر مبيعاً',
  subText: 'اختيار العملاء',
};

const HOT_DEAL_DEFAULTS: ComposeStampV2Defaults = {
  shape: 'burst',
  icon: 'ph:fire-fill',
  decor: 'stars',
  topText: 'LIMITED TIME',
  mainText: 'خصم 50%',
  subText: 'لفترة محدودة',
};

const EXPRESS_SHIP_DEFAULTS: ComposeStampV2Defaults = {
  shape: 'hex',
  icon: 'tabler:truck-delivery',
  decor: 'none',
  topText: 'EXPRESS',
  mainText: 'شحن سريع',
  subText: 'خلال 24 ساعة',
};

const HANDMADE_DEFAULTS: ComposeStampV2Defaults = {
  shape: 'shield',
  icon: 'ph:hand-heart-fill',
  decor: 'hearts',
  topText: 'HANDMADE',
  mainText: 'صُنع يدوياً',
  subText: 'بكل حب',
};

const COFFEE_DEFAULTS: ComposeStampV2Defaults = {
  shape: 'circle',
  icon: 'ph:coffee-fill',
  decor: 'none',
  topText: 'SPECIALTY COFFEE',
  mainText: 'قهوة مختصة',
  subText: 'محمّصة طازجة',
};

const KIDS_PARTY_DEFAULTS: ComposeStampV2Defaults = {
  shape: 'arch',
  icon: 'fluent-emoji-flat:party-popper',
  decor: 'confetti',
  topText: 'PARTY TIME',
  mainText: 'حفلة أطفال',
  subText: 'مرح ومفاجآت',
};

const EID_GIFT_DEFAULTS: ComposeStampV2Defaults = {
  shape: 'wax',
  icon: 'ph:gift-fill',
  decor: 'stars',
  topText: 'عيد مبارك',
  mainText: 'هدية العيد',
  subText: 'بكل محبة',
};

export const COMPOSER_STAMP_TEMPLATES: StickerTemplate[] = [
  {
    id: 'composer_stamp_custom',
    name: 'مركّب الأختام الحر v2',
    nameEn: 'Custom Stamp Composer v2',
    category: 'badges',
    shape: 'circle',
    description:
      'مركّب أختام تفاعلي: بدّل بين 8 أشكال و24 أيقونة متجهة و4 زخارف مع طبقات لمعان وحد قص أبيض',
    defaultWidth: 240,
    defaultHeight: 240,
    aspectRatio: 1,
    defaultMm: { width: 55, height: 55 },
    cutShape: resolveStampV2CutShape(VERIFIED_DEFAULTS.shape),
    defaultColors: {
      primary: '#1e3f63',
      secondary: '#f7d774',
      background: '#081628',
    },
    fields: createComposerFields(VERIFIED_DEFAULTS),
    generateSvg: (params) => composeStampV2Svg(params, VERIFIED_DEFAULTS),
  },
  {
    id: 'v2_stamp_best_seller',
    name: 'الأكثر مبيعاً v2',
    nameEn: 'Best Seller Burst v2',
    category: 'badges',
    shape: 'circle',
    description: 'ختم نجمي بارز بلمعان علوي وحد قص أبيض للأكثر مبيعاً',
    defaultWidth: 240,
    defaultHeight: 240,
    aspectRatio: 1,
    defaultMm: { width: 55, height: 55 },
    cutShape: resolveStampV2CutShape(BEST_SELLER_DEFAULTS.shape),
    defaultColors: {
      primary: '#991b1b',
      secondary: '#ffd166',
      background: '#5c0a18',
    },
    fields: createComposerFields(BEST_SELLER_DEFAULTS),
    generateSvg: (params) => composeStampV2Svg(params, BEST_SELLER_DEFAULTS),
  },
  {
    id: 'v2_stamp_hot_deal',
    name: 'عرض محدود 50% v2',
    nameEn: 'Hot Deal Burst v2',
    category: 'retail',
    shape: 'circle',
    description: 'شارة عرض ترويجي حار بطبقات عمق ولمعان قابلة لتبديل الشكل والأيقونة',
    defaultWidth: 240,
    defaultHeight: 240,
    aspectRatio: 1,
    defaultMm: { width: 55, height: 55 },
    cutShape: resolveStampV2CutShape(HOT_DEAL_DEFAULTS.shape),
    defaultColors: {
      primary: '#d97706',
      secondary: '#451a03',
      background: '#7c2d12',
    },
    fields: createComposerFields(HOT_DEAL_DEFAULTS),
    generateSvg: (params) => composeStampV2Svg(params, HOT_DEAL_DEFAULTS),
  },
  {
    id: 'v2_stamp_express_ship',
    name: 'شحن سريع 24 ساعة v2',
    nameEn: 'Express Shipping Hex v2',
    category: 'shipping',
    shape: 'square',
    description: 'ختم شحن سريع سداسي بأيقونة توصيل ولمعة مدمجة وحد قص',
    defaultWidth: 240,
    defaultHeight: 240,
    aspectRatio: 1,
    defaultMm: { width: 55, height: 55 },
    cutShape: resolveStampV2CutShape(EXPRESS_SHIP_DEFAULTS.shape),
    defaultColors: {
      primary: '#0e7490',
      secondary: '#7ee7f7',
      background: '#052733',
    },
    fields: createComposerFields(EXPRESS_SHIP_DEFAULTS),
    generateSvg: (params) => composeStampV2Svg(params, EXPRESS_SHIP_DEFAULTS),
  },
  {
    id: 'v2_stamp_handmade',
    name: 'صُنع يدوياً بكل حب v2',
    nameEn: 'Handmade Shield v2',
    category: 'packaging',
    shape: 'square',
    description: 'درع تغليف للحرف اليدوية بقلوب وأيقونة رعاية وحد قص أبيض',
    defaultWidth: 240,
    defaultHeight: 240,
    aspectRatio: 1,
    defaultMm: { width: 55, height: 55 },
    cutShape: resolveStampV2CutShape(HANDMADE_DEFAULTS.shape),
    defaultColors: {
      primary: '#be123c',
      secondary: '#fecdd3',
      background: '#6b0f2a',
    },
    fields: createComposerFields(HANDMADE_DEFAULTS),
    generateSvg: (params) => composeStampV2Svg(params, HANDMADE_DEFAULTS),
  },
  {
    id: 'v2_stamp_specialty_coffee',
    name: 'قهوة مختصة v2',
    nameEn: 'Specialty Coffee Seal v2',
    category: 'cafe',
    shape: 'circle',
    description: 'ختم دائري للمقاهي والمحامص مع ميدالية فنجان وقوس نصي علوي',
    defaultWidth: 240,
    defaultHeight: 240,
    aspectRatio: 1,
    defaultMm: { width: 55, height: 55 },
    cutShape: resolveStampV2CutShape(COFFEE_DEFAULTS.shape),
    defaultColors: {
      primary: '#6b4423',
      secondary: '#e8c39a',
      background: '#2a170a',
    },
    fields: createComposerFields(COFFEE_DEFAULTS),
    generateSvg: (params) => composeStampV2Svg(params, COFFEE_DEFAULTS),
  },
  {
    id: 'v2_stamp_kids_party',
    name: 'حفلة أطفال v2',
    nameEn: 'Kids Party Arch v2',
    category: 'kids',
    shape: 'square',
    description: 'شارة احتفالات بقوس علوي وإيموجي ملون وقصاصات ملصقة داخل الشكل',
    defaultWidth: 240,
    defaultHeight: 240,
    aspectRatio: 1,
    defaultMm: { width: 55, height: 55 },
    cutShape: resolveStampV2CutShape(KIDS_PARTY_DEFAULTS.shape),
    defaultColors: {
      primary: '#6d28d9',
      secondary: '#fde047',
      background: '#3b0f8f',
    },
    fields: createComposerFields(KIDS_PARTY_DEFAULTS),
    generateSvg: (params) => composeStampV2Svg(params, KIDS_PARTY_DEFAULTS),
  },
  {
    id: 'v2_stamp_eid_gift',
    name: 'هدية العيد v2',
    nameEn: 'Eid Gift Wax Seal v2',
    category: 'seasonal',
    shape: 'circle',
    description: 'ختم شمعي موسمي للعيد والهدايا مع إمكانية تخصيص الشكل والأيقونة',
    defaultWidth: 240,
    defaultHeight: 240,
    aspectRatio: 1,
    defaultMm: { width: 55, height: 55 },
    cutShape: resolveStampV2CutShape(EID_GIFT_DEFAULTS.shape),
    defaultColors: {
      primary: '#7e22ce',
      secondary: '#f0abfc',
      background: '#2e0a52',
    },
    fields: createComposerFields(EID_GIFT_DEFAULTS),
    generateSvg: (params) => composeStampV2Svg(params, EID_GIFT_DEFAULTS),
  },
];
