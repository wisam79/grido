import { pickDifferentOption } from '../lib/color-derivation';
import { selectField, textField } from '../lib/field-builders';
import {
  composeParametricCardSvg,
  SURFACE_BACKGROUND_OPTIONS,
  SURFACE_FRAME_OPTIONS,
  SURFACE_ORNAMENT_OPTIONS,
  SURFACE_PATTERN_OPTIONS,
  type ParametricCardDefaults,
  type SurfaceBackgroundId,
} from '../lib/parametric-surfaces';
import { randomOptionId, randomizeSurfaceParams } from '../lib/randomize-params';

import type { StickerField, StickerParams, StickerTemplate } from '../types';

function randomizeCardParams(current: StickerParams): StickerParams {
  return randomizeSurfaceParams(current, {
    bg: pickDifferentOption(
      SURFACE_BACKGROUND_OPTIONS,
      { id: (current.fields.bg as SurfaceBackgroundId) || 'aurora', label: '' },
      (a, b) => a.id === b.id,
    ).id,
    pattern: randomOptionId(SURFACE_PATTERN_OPTIONS),
    frame: randomOptionId(SURFACE_FRAME_OPTIONS),
    ornament: randomOptionId(SURFACE_ORNAMENT_OPTIONS),
  });
}

function createCardFields(defaults: ParametricCardDefaults): StickerField[] {
  return [
    selectField(
      'bg',
      'الخلفية',
      'pills',
      defaults.bg,
      SURFACE_BACKGROUND_OPTIONS.map((o) => ({ value: o.id, label: o.label })),
    ),
    selectField(
      'pattern',
      'النمط الهندسي',
      'pills',
      defaults.pattern,
      SURFACE_PATTERN_OPTIONS.map((o) => ({ value: o.id, label: o.label })),
    ),
    selectField(
      'frame',
      'الإطار',
      'pills',
      defaults.frame,
      SURFACE_FRAME_OPTIONS.map((o) => ({ value: o.id, label: o.label })),
    ),
    selectField(
      'ornament',
      'الزخرفة',
      'pills',
      defaults.ornament,
      SURFACE_ORNAMENT_OPTIONS.map((o) => ({ value: o.id, label: o.label })),
    ),
    textField('badgeText', 'شارة العنوان', defaults.badgeText),
    textField('title', 'العنوان الرئيسي', defaults.title),
    textField('subtitle', 'النص الفرعي', defaults.subtitle),
    textField('footer', 'التذييل', defaults.footer),
  ];
}

const SQUARE_CARD_DEFAULTS: ParametricCardDefaults = {
  layout: 'square',
  bg: 'aurora',
  pattern: 'dots',
  frame: 'classic',
  ornament: 'diamond',
  badgeText: 'عرض خاص',
  title: 'مجموعة الموسم',
  subtitle: 'تصميم حصري بجودة طباعة عالية',
  footer: 'متاح لفترة محدودة',
};

const PORTRAIT_CARD_DEFAULTS: ParametricCardDefaults = {
  layout: 'portrait',
  bg: 'arch',
  pattern: 'quatrefoil',
  frame: 'ornate',
  ornament: 'laurel',
  badgeText: 'إصدار مميز',
  title: 'تهنئة وذوق',
  subtitle: 'بطاقة إهداء قابلة للتخصيص الكامل',
  footer: 'صُنع بكل اهتمام',
};

export const COMPOSER_CARD_TEMPLATES: StickerTemplate[] = [
  {
    id: 'card_composer_square',
    name: 'مركّب البطاقات المربع',
    nameEn: 'Square Card Composer',
    category: 'retail',
    shape: 'square',
    description:
      'مركّب بطاقات تفاعلي يجمع 8 خلفيات متجهية و6 أنماط و6 إطارات و6 زخارف مع نصوص متجاوبة',
    defaultWidth: 360,
    defaultHeight: 360,
    aspectRatio: 1,
    defaultMm: { width: 100, height: 100 },
    cutShape: { kind: 'roundedRect', x: 0, y: 0, width: 360, height: 360, rx: 18 },
    randomizeParams: randomizeCardParams,
    autoContrastInk: true,
    defaultColors: {
      primary: '#1e3f63',
      secondary: '#f7d774',
      background: '#081628',
    },
    fields: createCardFields(SQUARE_CARD_DEFAULTS),
    generateSvg: (params) => composeParametricCardSvg(params, SQUARE_CARD_DEFAULTS),
  },
  {
    id: 'card_composer_portrait',
    name: 'مركّب بطاقات العروض العمودية',
    nameEn: 'Portrait Promo Card Composer',
    category: 'social',
    shape: 'rect',
    description:
      'بطاقة عروض وإهداء عمودية بخامات متجهية متعددة الطبقات وإطارات وزخارف قابلة للتبديل',
    defaultWidth: 360,
    defaultHeight: 520,
    aspectRatio: 360 / 520,
    defaultMm: { width: 90, height: 130 },
    cutShape: { kind: 'roundedRect', x: 0, y: 0, width: 360, height: 520, rx: 18 },
    randomizeParams: randomizeCardParams,
    autoContrastInk: true,
    defaultColors: {
      primary: '#7e22ce',
      secondary: '#f0abfc',
      background: '#2e0a52',
    },
    fields: createCardFields(PORTRAIT_CARD_DEFAULTS),
    generateSvg: (params) => composeParametricCardSvg(params, PORTRAIT_CARD_DEFAULTS),
  },
];
