import { COMPOSER_ICONS, renderComposerIconMarkup } from './composer-icons';
import { contrastRatio } from './sticker-a11y';
import { isArabicText } from './sticker-text';
import { escapeXml } from './svg-rasterizer';
import { scallopCirclePath, starPoints } from '../templates/svg-elements';

import type { StickerCutShape, StickerFinish, StickerParams } from '../types';

export type StampShapeId =
  'rosette' | 'burst' | 'shield' | 'hex' | 'ticket' | 'circle' | 'arch' | 'wax';

export type StampDecorId = 'stars' | 'confetti' | 'hearts' | 'none';

export const STAMP_SHAPE_OPTIONS: readonly { id: StampShapeId; label: string }[] = [
  { id: 'rosette', label: 'روزيت' },
  { id: 'burst', label: 'نجمي' },
  { id: 'shield', label: 'درع' },
  { id: 'hex', label: 'سداسي' },
  { id: 'ticket', label: 'تذكرة' },
  { id: 'circle', label: 'دائرة' },
  { id: 'arch', label: 'قوس' },
  { id: 'wax', label: 'شمعي' },
];

export const STAMP_DECOR_OPTIONS: readonly { id: StampDecorId; label: string }[] = [
  { id: 'stars', label: 'نجوم' },
  { id: 'confetti', label: 'قصاصات' },
  { id: 'hearts', label: 'قلوب' },
  { id: 'none', label: 'بدون' },
];

export const STAMP_ICON_FIELD_OPTIONS = COMPOSER_ICONS.map((icon) => ({
  value: icon.id,
  label: icon.label,
}));

interface StampLayoutSpec {
  iconY: number;
  iconR: number;
  topY: number;
  topArcR: number;
  mainY: number;
  mainSize: number;
  subY: number;
  subSize: number;
  ribbonW: number;
  maxW: number;
  topMaxW?: number;
}

const STAMP_LAYOUTS: Record<StampShapeId, StampLayoutSpec> = {
  rosette: {
    iconY: 100,
    iconR: 27,
    topY: 50,
    topArcR: 75,
    mainY: 159,
    mainSize: 23,
    subY: 186,
    subSize: 10.5,
    ribbonW: 132,
    maxW: 140,
  },
  burst: {
    iconY: 102,
    iconR: 22,
    topY: 62,
    topArcR: 58,
    mainY: 153,
    mainSize: 19,
    subY: 178,
    subSize: 9.5,
    ribbonW: 96,
    maxW: 100,
  },
  shield: {
    iconY: 103,
    iconR: 24,
    topY: 63,
    topArcR: 56,
    mainY: 154,
    mainSize: 20,
    subY: 180,
    subSize: 9.5,
    ribbonW: 100,
    maxW: 110,
  },
  hex: {
    iconY: 103,
    iconR: 27,
    topY: 58,
    topArcR: 70,
    mainY: 160,
    mainSize: 22,
    subY: 186,
    subSize: 10.5,
    ribbonW: 112,
    maxW: 136,
  },
  ticket: {
    iconY: 102,
    iconR: 26,
    topY: 60,
    topArcR: 66,
    mainY: 158,
    mainSize: 22,
    subY: 186,
    subSize: 10.5,
    ribbonW: 148,
    maxW: 150,
  },
  circle: {
    iconY: 102,
    iconR: 28,
    topY: 46,
    topArcR: 78,
    mainY: 161,
    mainSize: 23,
    subY: 188,
    subSize: 10.5,
    ribbonW: 134,
    maxW: 140,
  },
  arch: {
    iconY: 106,
    iconR: 27,
    topY: 60,
    topArcR: 68,
    mainY: 163,
    mainSize: 23,
    subY: 190,
    subSize: 10.5,
    ribbonW: 126,
    maxW: 128,
    topMaxW: 110,
  },
  wax: {
    iconY: 101,
    iconR: 26,
    topY: 49,
    topArcR: 73,
    mainY: 159,
    mainSize: 22,
    subY: 186,
    subSize: 10.5,
    ribbonW: 130,
    maxW: 134,
  },
};

function polygonPath(cx: number, cy: number, r: number, sides: number): string {
  const pts: string[] = [];
  for (let i = 0; i < sides; i += 1) {
    const a = -Math.PI / 2 + (i * Math.PI * 2) / sides;
    pts.push(`${(cx + r * Math.cos(a)).toFixed(1)},${(cy + r * Math.sin(a)).toFixed(1)}`);
  }
  return `M ${pts.join(' L ')} Z`;
}

export function getStampShapePath(shape: StampShapeId): string {
  switch (shape) {
    case 'rosette':
      return scallopCirclePath(120, 120, 91, 18, 1.09);
    case 'burst':
      return `M ${starPoints(120, 120, 20, 106, 86).split(' ').join(' L ')} Z`;
    case 'shield':
      return 'M 120,20 L 205,50 V 120 C 205,170 168,204 120,221 C 72,204 35,170 35,120 V 50 Z';
    case 'hex':
      return polygonPath(120, 120, 101, 6);
    case 'ticket':
      return 'M 50,30 H 190 A 20,20 0 0,1 210,50 V 100 A 12,12 0 0,0 210,124 V 190 A 20,20 0 0,1 190,210 H 50 A 20,20 0 0,1 30,190 V 124 A 12,12 0 0,0 30,100 V 50 A 20,20 0 0,1 50,30 Z';
    case 'circle':
      return 'M 20,120 A 100,100 0 1,1 220,120 A 100,100 0 1,1 20,120 Z';
    case 'arch':
      return 'M 64,214 H 176 Q 184,214 184,206 V 96 A 64,64 0 0,0 56,96 V 206 Q 56,214 64,214 Z';
    case 'wax':
      return scallopCirclePath(120, 120, 93, 26, 1.045);
  }
}

export function resolveStampV2CutShape(shape: StampShapeId = 'rosette'): StickerCutShape {
  if (shape === 'circle') {
    return { kind: 'circle', cx: 120, cy: 120, r: 100 };
  }
  return { kind: 'path', d: getStampShapePath(shape) };
}

function pickContrastInk(bgHex: string): string {
  const whiteScore = contrastRatio('#ffffff', bgHex);
  const darkScore = contrastRatio('#0f172a', bgHex);
  if (whiteScore === null || darkScore === null) return '#ffffff';
  return whiteScore >= darkScore ? '#ffffff' : '#0f172a';
}

function dottedRingMarkup(
  cx: number,
  cy: number,
  r: number,
  count: number,
  color: string,
  opacity: number,
): string {
  const dots: string[] = [];
  for (let i = 0; i < count; i += 1) {
    const a = (i / count) * Math.PI * 2;
    dots.push(
      `<circle cx="${(cx + r * Math.cos(a)).toFixed(1)}" cy="${(cy + r * Math.sin(a)).toFixed(1)}" r="1.6" fill="${color}" opacity="${opacity}"/>`,
    );
  }
  return dots.join('');
}

function sparkleMarkup(cx: number, cy: number, r: number, color: string, opacity: number): string {
  return `<path d="M ${cx},${cy - r} L ${cx + r * 0.28},${cy - r * 0.28} L ${cx + r},${cy} L ${cx + r * 0.28},${cy + r * 0.28} L ${cx},${cy + r} L ${cx - r * 0.28},${cy + r * 0.28} L ${cx - r},${cy} L ${cx - r * 0.28},${cy - r * 0.28} Z" fill="${color}" opacity="${opacity}"/>`;
}

function heartPath(cx: number, cy: number, size: number): string {
  const s = size / 24;
  const tx = cx - 12 * s;
  const ty = cy - 12 * s;
  return `<g transform="translate(${tx.toFixed(1)} ${ty.toFixed(1)}) scale(${s.toFixed(3)})"><path d="M12 21.3l-1.4-1.3C5.4 15.4 2 12.3 2 8.5 2 5.4 4.4 3 7.5 3c1.7 0 3.4.8 4.5 2.1C13.1 3.8 14.8 3 16.5 3 19.6 3 22 5.4 22 8.5c0 3.8-3.4 6.9-8.6 11.5L12 21.3z"/></g>`;
}

function decorMarkup(decor: StampDecorId, accent: string, ink: string): string {
  if (decor === 'stars') {
    return (
      sparkleMarkup(66, 86, 7, accent, 0.92) +
      sparkleMarkup(174, 86, 7, accent, 0.92) +
      sparkleMarkup(120, 204, 5, accent, 0.72)
    );
  }
  if (decor === 'confetti') {
    const bits: [number, number, number, number, boolean][] = [
      [60, 70, 7, 20, true],
      [180, 70, 6, -25, false],
      [44, 140, 5, 45, true],
      [196, 140, 7, 15, true],
      [66, 196, 6, -15, false],
      [174, 198, 5, 35, true],
      [120, 40, 4, 0, false],
      [92, 44, 5, 25, true],
    ];
    return bits
      .map(
        ([x, y, s, rot, useAccent]) =>
          `<rect x="${x}" y="${y}" width="${s}" height="${(s * 1.6).toFixed(1)}" rx="1.5" fill="${useAccent ? accent : ink}" opacity="0.82" transform="rotate(${rot} ${x + s / 2} ${y + s / 2})"/>`,
      )
      .join('');
  }
  if (decor === 'hearts') {
    return `<g fill="${accent}" opacity="0.88">${heartPath(66, 86, 13)}${heartPath(174, 86, 10)}${heartPath(120, 204, 8)}</g>`;
  }
  return '';
}

function innerDecorMarkup(shape: StampShapeId, pathD: string, accent: string): string {
  if (shape === 'rosette' || shape === 'circle' || shape === 'wax') {
    return (
      `<path d="${pathD}" fill="none" stroke="${accent}" stroke-width="2.4" opacity="0.88" transform="translate(120 120) scale(0.925) translate(-120 -120)"/>` +
      `<path d="${pathD}" fill="none" stroke="${accent}" stroke-width="1" opacity="0.4" transform="translate(120 120) scale(0.855) translate(-120 -120)"/>` +
      dottedRingMarkup(120, 120, shape === 'circle' ? 86 : 83, 20, accent, 0.55)
    );
  }
  if (shape === 'burst') {
    const innerStar = `M ${starPoints(120, 120, 20, 90, 74).split(' ').join(' L ')} Z`;
    return (
      `<path d="${innerStar}" fill="${accent}" opacity="0.14"/>` +
      `<circle cx="120" cy="120" r="72" fill="none" stroke="${accent}" stroke-width="2" opacity="0.82"/>` +
      `<circle cx="120" cy="120" r="67" fill="none" stroke="${accent}" stroke-width="1" opacity="0.35"/>`
    );
  }
  if (shape === 'shield') {
    return (
      `<path d="${pathD}" fill="none" stroke="${accent}" stroke-width="2.4" opacity="0.85" transform="translate(120 120) scale(0.92) translate(-120 -120)"/>` +
      `<path d="M 120,42 V 198" stroke="${accent}" stroke-width="1" opacity="0.14"/>`
    );
  }
  if (shape === 'hex') {
    return (
      `<path d="${pathD}" fill="none" stroke="${accent}" stroke-width="2.4" opacity="0.85" transform="translate(120 120) scale(0.9) translate(-120 -120)"/>` +
      `<path d="${polygonPath(120, 120, 88, 6)}" fill="none" stroke="${accent}" stroke-width="1" opacity="0.35"/>`
    );
  }
  if (shape === 'ticket') {
    return `<path d="${pathD}" fill="none" stroke="${accent}" stroke-width="2" opacity="0.8" transform="translate(120 120) scale(0.94) translate(-120 -120)"/>`;
  }
  return (
    `<path d="${pathD}" fill="none" stroke="${accent}" stroke-width="2.4" opacity="0.8" transform="translate(120 120) scale(0.94) translate(-120 -120)"/>` +
    `<rect x="58" y="186" width="124" height="20" rx="6" fill="${accent}" opacity="0.16"/>`
  );
}

function finishOpacities(finish: StickerFinish | undefined): { gloss: number; shade: number } {
  switch (finish) {
    case 'glossy':
      return { gloss: 0.62, shade: 0.38 };
    case 'matte':
      return { gloss: 0.14, shade: 0.18 };
    case 'holographic':
      return { gloss: 0.56, shade: 0.3 };
    default:
      return { gloss: 0.44, shade: 0.3 };
  }
}

export interface ComposeStampV2Defaults {
  shape: StampShapeId;
  icon: string;
  decor: StampDecorId;
  topText: string;
  mainText: string;
  subText: string;
}

/**
 * يبني ملصق SVG متكامل بالعمق واللمعان وإطار القص الأبيض (Die-cut)
 * مع قصّ كامل داخل الشكل وتوافق كامل مع محرر النقر وإعادة التحجيم.
 */
export function composeStampV2Svg(params: StickerParams, defaults: ComposeStampV2Defaults): string {
  const shapeRaw = params.fields.shape || defaults.shape;
  const shape: StampShapeId =
    shapeRaw in STAMP_LAYOUTS ? (shapeRaw as StampShapeId) : defaults.shape;
  const decorRaw = params.fields.decor || defaults.decor;
  const decor: StampDecorId =
    decorRaw === 'stars' || decorRaw === 'confetti' || decorRaw === 'hearts' || decorRaw === 'none'
      ? decorRaw
      : defaults.decor;
  const iconId = params.fields.icon || defaults.icon;

  const topText = params.fields.topText ?? defaults.topText;
  const mainText = params.fields.mainText ?? defaults.mainText;
  const subText = params.fields.subText ?? defaults.subText;

  const primary = params.primaryColor;
  const secondary = params.secondaryColor;
  const bgColor = params.backgroundColor;
  const transparentRibbon = params.isTransparent;
  const dieCut = params.dieCutBorder !== false;
  const fontFamily = params.fontFamily || 'Cairo';
  const fs = params.fontScale || 1;
  const L = STAMP_LAYOUTS[shape];
  const pathD = getStampShapePath(shape);

  const bodyInk = pickContrastInk(primary);
  const medallionInk = pickContrastInk(secondary);
  const ribbonFill = transparentRibbon ? 'none' : bgColor;
  const ribbonTextInk = transparentRibbon ? bodyInk : pickContrastInk(bgColor);
  const { gloss, shade } = finishOpacities(params.finish);
  const isHolo = params.finish === 'holographic';

  const { markup: iconBody, multiColor: isEmojiIcon } = renderComposerIconMarkup(
    iconId,
    120,
    L.iconY,
    iconId.startsWith('fluent-emoji-flat:') ? L.iconR * 1.55 : L.iconR * 1.12,
    medallionInk,
  );

  const topIsArabic = isArabicText(topText);
  const topSize = Math.min(13, 10.5 * fs);
  const mainSize = L.mainSize * fs;
  const subSize = L.subSize * fs;

  const ribbonH = 24;
  const ribbonR = ribbonH / 2;
  const ribbonX = 120 - L.ribbonW / 2;
  const ribbonTop = L.subY - 4 - ribbonH / 2;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240" width="240" height="240">
  <defs>
    <linearGradient id="v2-gloss" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="${gloss}"/>
      <stop offset="65%" stop-color="#ffffff" stop-opacity="0"/>
    </linearGradient>
    <linearGradient id="v2-shade" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#000000" stop-opacity="0"/>
      <stop offset="100%" stop-color="#000000" stop-opacity="${shade}"/>
    </linearGradient>
    ${
      isHolo
        ? `<linearGradient id="v2-holo" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#a855f7" stop-opacity="0.28"/>
      <stop offset="50%" stop-color="#06b6d4" stop-opacity="0.24"/>
      <stop offset="100%" stop-color="#ec4899" stop-opacity="0.28"/>
    </linearGradient>`
        : ''
    }
    <clipPath id="v2-clip"><path d="${pathD}"/></clipPath>
    <path id="v2-top-arc" d="M ${120 - L.topArcR},120 A ${L.topArcR},${L.topArcR} 0 0,1 ${120 + L.topArcR},120" fill="none"/>
  </defs>

  <g data-field-id="shape" data-color-role="primary">
    ${dieCut ? `<path d="${pathD}" fill="#ffffff" stroke="#ffffff" stroke-width="10" stroke-linejoin="round"/>` : ''}
    <path d="${pathD}" fill="${primary}"/>
    <g clip-path="url(#v2-clip)">
      <rect x="0" y="0" width="240" height="240" fill="url(#v2-shade)"/>
      ${isHolo ? '<rect x="0" y="0" width="240" height="240" fill="url(#v2-holo)"/>' : ''}
      <ellipse cx="120" cy="48" rx="122" ry="70" fill="url(#v2-gloss)"/>
    </g>
    ${innerDecorMarkup(shape, pathD, secondary)}
  </g>

  <g clip-path="url(#v2-clip)">
    <g data-field-id="decor" data-color-role="secondary">${decorMarkup(decor, secondary, bodyInk)}</g>

    ${
      topIsArabic
        ? `<text data-field-id="topText" data-max-width="${L.topMaxW || L.maxW}" x="120" y="${L.topY}" text-anchor="middle" font-family="${fontFamily}, sans-serif" font-size="${topSize.toFixed(1)}" font-weight="700" fill="${secondary}" opacity="0.96">${escapeXml(topText)}</text>`
        : `<text data-field-id="topText" data-max-width="${L.topMaxW || L.maxW}" font-family="${fontFamily}, sans-serif" font-size="${topSize.toFixed(1)}" font-weight="700" fill="${secondary}" letter-spacing="1.6" opacity="0.95"><textPath href="#v2-top-arc" startOffset="50%" text-anchor="middle">${escapeXml(topText)}</textPath></text>`
    }

    <g data-field-id="icon" data-color-role="secondary">
      <circle cx="120" cy="${L.iconY + 2}" r="${L.iconR + 1.5}" fill="#000000" opacity="0.22"/>
      ${
        isEmojiIcon
          ? `<circle cx="120" cy="${L.iconY}" r="${L.iconR}" fill="rgba(255,255,255,0.16)" stroke="${secondary}" stroke-width="1.6" opacity="0.9"/>`
          : `<circle cx="120" cy="${L.iconY}" r="${L.iconR}" fill="${secondary}"/><circle cx="120" cy="${L.iconY}" r="${L.iconR - 4}" fill="none" stroke="rgba(255,255,255,0.55)" stroke-width="1.4"/>`
      }
      ${iconBody}
    </g>

    <text aria-hidden="true" x="120" y="${(L.mainY + 1.4).toFixed(1)}" text-anchor="middle" font-family="${fontFamily}, sans-serif" font-size="${mainSize.toFixed(1)}" font-weight="800" fill="#000000" opacity="0.22">${escapeXml(mainText)}</text>
    <text data-field-id="mainText" data-max-width="${L.maxW}" x="120" y="${L.mainY}" text-anchor="middle" font-family="${fontFamily}, sans-serif" font-size="${mainSize.toFixed(1)}" font-weight="800" fill="${bodyInk}">${escapeXml(mainText)}</text>

    ${
      subText
        ? `<g data-color-role="background">
      <rect x="${ribbonX}" y="${ribbonTop + 2}" width="${L.ribbonW}" height="${ribbonH}" rx="${ribbonR}" fill="#000000" opacity="0.18"/>
      <rect x="${ribbonX}" y="${ribbonTop}" width="${L.ribbonW}" height="${ribbonH}" rx="${ribbonR}" fill="${ribbonFill}" stroke="${secondary}" stroke-width="1.2"/>
    </g>`
        : ''
    }
    <text data-field-id="subText" data-max-width="${L.ribbonW - 16}" x="120" y="${L.subY}" text-anchor="middle" font-family="${fontFamily}, sans-serif" font-size="${subSize.toFixed(1)}" font-weight="700" fill="${ribbonTextInk}">${escapeXml(subText)}</text>
  </g>
</svg>`;
}
