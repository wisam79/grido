import { CURATED_PALETTES } from '../constants';
import { pickDifferentOption, pickDifferentPalette } from '../lib/color-derivation';
import {
  composeParametricCardSvg,
  SURFACE_BACKGROUND_OPTIONS,
  SURFACE_FRAME_OPTIONS,
  SURFACE_ORNAMENT_OPTIONS,
  SURFACE_PATTERN_OPTIONS,
  type ParametricCardDefaults,
  type SurfaceBackgroundId,
} from '../lib/parametric-surfaces';

import type { StickerField, StickerParams, StickerTemplate } from '../types';

function randomizeCardParams(current: StickerParams): StickerParams {
  const nextBg = pickDifferentOption(
    SURFACE_BACKGROUND_OPTIONS,
    { id: (current.fields.bg as SurfaceBackgroundId) || 'aurora', label: '' },
    (a, b) => a.id === b.id,
  ).id;
  const nextPattern =
    SURFACE_PATTERN_OPTIONS[Math.floor(Math.random() * SURFACE_PATTERN_OPTIONS.length)].id;
  const nextFrame =
    SURFACE_FRAME_OPTIONS[Math.floor(Math.random() * SURFACE_FRAME_OPTIONS.length)].id;
  const nextOrnament =
    SURFACE_ORNAMENT_OPTIONS[Math.floor(Math.random() * SURFACE_ORNAMENT_OPTIONS.length)].id;
  const palette = pickDifferentPalette(CURATED_PALETTES, current.primaryColor);

  return {
    ...current,
    fields: {
      ...current.fields,
      bg: nextBg,
      pattern: nextPattern,
      frame: nextFrame,
      ornament: nextOrnament,
    },
    primaryColor: palette.primary,
    secondaryColor: palette.secondary,
    backgroundColor: palette.background,
    isTransparent: false,
  };
}

function createCardFields(defaults: ParametricCardDefaults): StickerField[] {
  return [
    {
      id: 'bg',
      label: 'الخلفية',
      type: 'select',
      presentation: 'pills',
      defaultValue: defaults.bg,
      options: SURFACE_BACKGROUND_OPTIONS.map((o) => ({ value: o.id, label: o.label })),
    },
    {
      id: 'pattern',
      label: 'النمط الهندسي',
      type: 'select',
      presentation: 'pills',
      defaultValue: defaults.pattern,
      options: SURFACE_PATTERN_OPTIONS.map((o) => ({ value: o.id, label: o.label })),
    },
    {
      id: 'frame',
      label: 'الإطار',
      type: 'select',
      presentation: 'pills',
      defaultValue: defaults.frame,
      options: SURFACE_FRAME_OPTIONS.map((o) => ({ value: o.id, label: o.label })),
    },
    {
      id: 'ornament',
      label: 'الزخرفة',
      type: 'select',
      presentation: 'pills',
      defaultValue: defaults.ornament,
      options: SURFACE_ORNAMENT_OPTIONS.map((o) => ({ value: o.id, label: o.label })),
    },
    {
      id: 'badgeText',
      label: 'شارة العنوان',
      type: 'text',
      defaultValue: defaults.badgeText,
    },
    {
      id: 'title',
      label: 'العنوان الرئيسي',
      type: 'text',
      defaultValue: defaults.title,
    },
    {
      id: 'subtitle',
      label: 'النص الفرعي',
      type: 'text',
      defaultValue: defaults.subtitle,
    },
    {
      id: 'footer',
      label: 'التذييل',
      type: 'text',
      defaultValue: defaults.footer,
    },
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
