import {
  deriveSurfacePalette,
  pickAccessibleInk,
  type DerivedSurfacePalette,
} from './color-derivation';
import { escapeXml } from './svg-rasterizer';
import { starPoints } from '../templates/svg-elements';

import type { StickerFinish, StickerParams } from '../types';

export type SurfaceBackgroundId =
  'aurora' | 'rays' | 'waves' | 'halftone' | 'arch' | 'sunburst' | 'terrazzo' | 'duotone';

export type SurfacePatternId = 'none' | 'dots' | 'grid' | 'chevron' | 'quatrefoil' | 'hex';

export type SurfaceFrameId = 'none' | 'classic' | 'rounded' | 'ornate' | 'artdeco' | 'brackets';

export type SurfaceOrnamentId = 'none' | 'diamond' | 'laurel' | 'arabesque' | 'sparkles' | 'crown';

export const SURFACE_BACKGROUND_OPTIONS: readonly { id: SurfaceBackgroundId; label: string }[] = [
  { id: 'aurora', label: 'شفق' },
  { id: 'rays', label: 'أشعة' },
  { id: 'waves', label: 'موجات' },
  { id: 'halftone', label: 'هافتون' },
  { id: 'arch', label: 'أقواس' },
  { id: 'sunburst', label: 'شمس' },
  { id: 'terrazzo', label: 'تيرازو' },
  { id: 'duotone', label: 'ثنائي' },
];

export const SURFACE_PATTERN_OPTIONS: readonly { id: SurfacePatternId; label: string }[] = [
  { id: 'none', label: 'بدون' },
  { id: 'dots', label: 'نقاط' },
  { id: 'grid', label: 'شبكة' },
  { id: 'chevron', label: 'شيفرون' },
  { id: 'quatrefoil', label: 'مغربي' },
  { id: 'hex', label: 'سداسي' },
];

export const SURFACE_FRAME_OPTIONS: readonly { id: SurfaceFrameId; label: string }[] = [
  { id: 'none', label: 'بدون' },
  { id: 'classic', label: 'كلاسيكي' },
  { id: 'rounded', label: 'ناعم' },
  { id: 'ornate', label: 'مزخرف' },
  { id: 'artdeco', label: 'ديكو' },
  { id: 'brackets', label: 'زوايا' },
];

export const SURFACE_ORNAMENT_OPTIONS: readonly { id: SurfaceOrnamentId; label: string }[] = [
  { id: 'none', label: 'بدون' },
  { id: 'diamond', label: 'ماسي' },
  { id: 'laurel', label: 'غار' },
  { id: 'arabesque', label: 'أرابيسك' },
  { id: 'sparkles', label: 'بريق' },
  { id: 'crown', label: 'تاج' },
];

function hashSeed(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i += 1) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function createPrng(seed: number): () => number {
  let s = seed >>> 0 || 1;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function renderBackgroundLayer(
  id: SurfaceBackgroundId,
  w: number,
  h: number,
  p: DerivedSurfacePalette,
): { defs: string; body: string } {
  const cx = w / 2;
  const cy = h / 2;

  switch (id) {
    case 'aurora': {
      const defs = [
        `<linearGradient id="pc-bg-lin" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="${p.primaryBase}"/><stop offset="100%" stop-color="${p.primaryDeep}"/></linearGradient>`,
        `<radialGradient id="pc-bg-r1" cx="18%" cy="16%" r="72%"><stop offset="0%" stop-color="${p.primaryLight}" stop-opacity="0.92"/><stop offset="100%" stop-color="${p.primaryLight}" stop-opacity="0"/></radialGradient>`,
        `<radialGradient id="pc-bg-r2" cx="84%" cy="22%" r="64%"><stop offset="0%" stop-color="${p.accentBase}" stop-opacity="0.72"/><stop offset="100%" stop-color="${p.accentBase}" stop-opacity="0"/></radialGradient>`,
        `<radialGradient id="pc-bg-r3" cx="54%" cy="92%" r="72%"><stop offset="0%" stop-color="${p.accentLight}" stop-opacity="0.52"/><stop offset="100%" stop-color="${p.accentLight}" stop-opacity="0"/></radialGradient>`,
      ].join('');
      const body = [
        `<rect width="${w}" height="${h}" fill="url(#pc-bg-lin)"/>`,
        `<rect width="${w}" height="${h}" fill="url(#pc-bg-r1)"/>`,
        `<rect width="${w}" height="${h}" fill="url(#pc-bg-r2)"/>`,
        `<rect width="${w}" height="${h}" fill="url(#pc-bg-r3)"/>`,
      ].join('');
      return { defs, body };
    }

    case 'rays': {
      const rays: string[] = [];
      const count = 20;
      const radius = Math.hypot(w, h);
      for (let i = 0; i < count; i += 1) {
        const a0 = (Math.PI * 2 * i) / count;
        const a1 = (Math.PI * 2 * (i + 0.52)) / count;
        const x0 = cx + Math.cos(a0) * radius;
        const y0 = cy + Math.sin(a0) * radius;
        const x1 = cx + Math.cos(a1) * radius;
        const y1 = cy + Math.sin(a1) * radius;
        const fill = i % 2 === 0 ? p.primaryLight : p.accentBase;
        const opacity = i % 2 === 0 ? '0.24' : '0.16';
        rays.push(
          `<path d="M ${cx} ${cy} L ${x0.toFixed(1)} ${y0.toFixed(1)} L ${x1.toFixed(1)} ${y1.toFixed(1)} Z" fill="${fill}" opacity="${opacity}"/>`,
        );
      }
      const defs = `<radialGradient id="pc-bg-rays" cx="50%" cy="50%" r="72%"><stop offset="0%" stop-color="${p.accentLight}" stop-opacity="0.48"/><stop offset="100%" stop-color="${p.primaryDeep}" stop-opacity="0.15"/></radialGradient>`;
      return {
        defs,
        body: `<rect width="${w}" height="${h}" fill="${p.primaryDeep}"/>${rays.join('')}<rect width="${w}" height="${h}" fill="url(#pc-bg-rays)"/>`,
      };
    }

    case 'waves': {
      const defs = `<linearGradient id="pc-bg-wave" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="${p.primaryDeep}"/><stop offset="100%" stop-color="${p.primaryBase}"/></linearGradient>`;
      const colors = [p.primaryBase, p.primaryLight, p.accentDark, p.accentBase];
      const waves: string[] = [];
      for (let i = 0; i < 4; i += 1) {
        const y = Math.round(h * (0.28 + i * 0.17));
        const amp = 26;
        const step = w / 4;
        const path = [
          `M 0 ${y}`,
          `Q ${(step * 0.5).toFixed(1)} ${y - amp} ${step.toFixed(1)} ${y}`,
          `T ${(step * 2).toFixed(1)} ${y}`,
          `T ${(step * 3).toFixed(1)} ${y}`,
          `T ${w} ${y}`,
          `V ${h} H 0 Z`,
        ].join(' ');
        waves.push(
          `<path d="${path}" fill="${colors[i]}" opacity="${(0.84 - i * 0.14).toFixed(2)}"/>`,
        );
      }
      return {
        defs,
        body: `<rect width="${w}" height="${h}" fill="url(#pc-bg-wave)"/>${waves.join('')}`,
      };
    }

    case 'halftone': {
      const defs = `<radialGradient id="pc-bg-ht" cx="50%" cy="45%" r="78%"><stop offset="0%" stop-color="${p.primaryBase}"/><stop offset="100%" stop-color="${p.primaryDeep}"/></radialGradient>`;
      const dots: string[] = [];
      const spacing = 22;
      const fx = w * 0.4;
      const fy = h * 0.34;
      for (let y = 12; y < h; y += spacing) {
        for (let x = 12; x < w; x += spacing) {
          const dist = Math.hypot(x - fx, y - fy);
          const r = Math.max(0.9, 7.6 - dist / 46);
          dots.push(
            `<circle cx="${x}" cy="${y}" r="${r.toFixed(1)}" fill="${p.accentLight}" opacity="0.34"/>`,
          );
        }
      }
      return {
        defs,
        body: `<rect width="${w}" height="${h}" fill="url(#pc-bg-ht)"/>${dots.join('')}`,
      };
    }

    case 'arch': {
      const defs = `<linearGradient id="pc-bg-arch" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="${p.primaryBase}"/><stop offset="100%" stop-color="${p.primaryDeep}"/></linearGradient>`;
      const colors = [p.primaryLight, p.accentDark, p.accentBase, p.primaryBase];
      const arcs: string[] = [];
      for (let i = 0; i < 4; i += 1) {
        const insetX = 28 + i * 28;
        const aw = w - insetX * 2;
        const r = aw / 2;
        const topY = Math.round(h * 0.14) + i * 24;
        const d = `M ${insetX} ${h} V ${topY + r} A ${r} ${r} 0 0 1 ${insetX + aw} ${topY + r} V ${h} Z`;
        arcs.push(`<path d="${d}" fill="${colors[i]}" opacity="${(0.82 - i * 0.14).toFixed(2)}"/>`);
      }
      return {
        defs,
        body: `<rect width="${w}" height="${h}" fill="url(#pc-bg-arch)"/>${arcs.join('')}`,
      };
    }

    case 'sunburst': {
      const defs = `<radialGradient id="pc-bg-sb" cx="50%" cy="46%" r="72%"><stop offset="0%" stop-color="${p.accentLight}" stop-opacity="0.72"/><stop offset="55%" stop-color="${p.primaryLight}" stop-opacity="0.28"/><stop offset="100%" stop-color="${p.primaryDeep}" stop-opacity="0"/></radialGradient>`;
      const rays: string[] = [];
      const radius = Math.hypot(w, h);
      for (let i = 0; i < 28; i += 1) {
        const a0 = (Math.PI * 2 * i) / 28;
        const a1 = (Math.PI * 2 * (i + 0.48)) / 28;
        const x0 = cx + Math.cos(a0) * radius;
        const y0 = cy + Math.sin(a0) * radius;
        const x1 = cx + Math.cos(a1) * radius;
        const y1 = cy + Math.sin(a1) * radius;
        rays.push(
          `<path d="M ${cx} ${cy} L ${x0.toFixed(1)} ${y0.toFixed(1)} L ${x1.toFixed(1)} ${y1.toFixed(1)} Z" fill="${p.accentBase}" opacity="0.16"/>`,
        );
      }
      return {
        defs,
        body: `<rect width="${w}" height="${h}" fill="${p.primaryBase}"/>${rays.join('')}<rect width="${w}" height="${h}" fill="url(#pc-bg-sb)"/>`,
      };
    }

    case 'terrazzo': {
      const rnd = createPrng(hashSeed(`terrazzo-${w}x${h}`));
      const palette = [p.primaryLight, p.accentBase, p.accentLight, p.bgBase];
      const chips: string[] = [];
      for (let i = 0; i < 32; i += 1) {
        const px = rnd() * w;
        const py = rnd() * h;
        const size = 7 + rnd() * 14;
        const sides = 3 + Math.floor(rnd() * 3);
        const pts: string[] = [];
        for (let j = 0; j < sides; j += 1) {
          const ang = (Math.PI * 2 * j) / sides + rnd();
          const rad = size * (0.6 + rnd() * 0.55);
          pts.push(
            `${(px + Math.cos(ang) * rad).toFixed(1)},${(py + Math.sin(ang) * rad).toFixed(1)}`,
          );
        }
        chips.push(
          `<path d="M ${pts.join(' L ')} Z" fill="${palette[i % palette.length]}" opacity="${(0.32 + rnd() * 0.36).toFixed(2)}"/>`,
        );
      }
      return {
        defs: '',
        body: `<rect width="${w}" height="${h}" fill="${p.primaryDeep}"/>${chips.join('')}`,
      };
    }

    case 'duotone': {
      const defs = [
        `<radialGradient id="pc-bg-d1" cx="24%" cy="28%" r="64%"><stop offset="0%" stop-color="${p.primaryLight}" stop-opacity="0.95"/><stop offset="100%" stop-color="${p.primaryLight}" stop-opacity="0"/></radialGradient>`,
        `<radialGradient id="pc-bg-d2" cx="80%" cy="76%" r="64%"><stop offset="0%" stop-color="${p.accentBase}" stop-opacity="0.88"/><stop offset="100%" stop-color="${p.accentBase}" stop-opacity="0"/></radialGradient>`,
        `<radialGradient id="pc-bg-d3" cx="72%" cy="16%" r="52%"><stop offset="0%" stop-color="${p.accentLight}" stop-opacity="0.62"/><stop offset="100%" stop-color="${p.accentLight}" stop-opacity="0"/></radialGradient>`,
      ].join('');
      const body = [
        `<rect width="${w}" height="${h}" fill="${p.primaryDeep}"/>`,
        `<rect width="${w}" height="${h}" fill="url(#pc-bg-d1)"/>`,
        `<rect width="${w}" height="${h}" fill="url(#pc-bg-d2)"/>`,
        `<rect width="${w}" height="${h}" fill="url(#pc-bg-d3)"/>`,
      ].join('');
      return { defs, body };
    }
  }
}

function renderPatternLayer(
  id: SurfacePatternId,
  w: number,
  h: number,
  strokeColor: string,
  accentColor: string,
): { defs: string; body: string } {
  if (id === 'none') return { defs: '', body: '' };

  let tileW = 28;
  let tileH = 28;
  let tile = '';

  switch (id) {
    case 'dots':
      tileW = 24;
      tileH = 24;
      tile = `<circle cx="6" cy="6" r="2.4" fill="${strokeColor}"/><circle cx="18" cy="18" r="2.4" fill="${strokeColor}"/><circle cx="18" cy="6" r="1.1" fill="${accentColor}"/><circle cx="6" cy="18" r="1.1" fill="${accentColor}"/>`;
      break;
    case 'grid':
      tileW = 24;
      tileH = 24;
      tile = `<path d="M 24 0 H 0 V 24" fill="none" stroke="${strokeColor}" stroke-width="1"/>`;
      break;
    case 'chevron':
      tileW = 28;
      tileH = 20;
      tile = `<path d="M 0 16 L 14 4 L 28 16" fill="none" stroke="${strokeColor}" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>`;
      break;
    case 'quatrefoil':
      tileW = 36;
      tileH = 36;
      tile = `<circle cx="18" cy="9" r="7" fill="none" stroke="${strokeColor}" stroke-width="1.5"/><circle cx="18" cy="27" r="7" fill="none" stroke="${strokeColor}" stroke-width="1.5"/><circle cx="9" cy="18" r="7" fill="none" stroke="${strokeColor}" stroke-width="1.5"/><circle cx="27" cy="18" r="7" fill="none" stroke="${strokeColor}" stroke-width="1.5"/>`;
      break;
    case 'hex':
      tileW = 30;
      tileH = 32;
      tile = `<path d="M 15 1 L 28 8.5 V 23.5 L 15 31 L 2 23.5 V 8.5 Z" fill="none" stroke="${strokeColor}" stroke-width="1.4"/>`;
      break;
  }

  return {
    defs: `<pattern id="pc-pat" width="${tileW}" height="${tileH}" patternUnits="userSpaceOnUse">${tile}</pattern>`,
    body: `<rect width="${w}" height="${h}" fill="url(#pc-pat)" opacity="0.22"/>`,
  };
}

function renderFrameLayer(
  id: SurfaceFrameId,
  w: number,
  h: number,
  strokePrimary: string,
  strokeAccent: string,
): string {
  if (id === 'none') return '';
  const pad = 20;
  const fw = w - pad * 2;
  const fh = h - pad * 2;

  switch (id) {
    case 'classic': {
      const pts = [
        [pad, pad],
        [w - pad, pad],
        [pad, h - pad],
        [w - pad, h - pad],
      ];
      const squares = pts
        .map(
          ([x, y]) =>
            `<rect x="${x - 5}" y="${y - 5}" width="10" height="10" rx="1.5" fill="${strokeAccent}"/>`,
        )
        .join('');
      return (
        `<rect x="${pad}" y="${pad}" width="${fw}" height="${fh}" fill="none" stroke="${strokePrimary}" stroke-width="2.4"/>` +
        `<rect x="${pad + 8}" y="${pad + 8}" width="${fw - 16}" height="${fh - 16}" fill="none" stroke="${strokeAccent}" stroke-width="1" opacity="0.72"/>` +
        squares
      );
    }

    case 'rounded':
      return (
        `<rect x="${pad}" y="${pad}" width="${fw}" height="${fh}" rx="24" fill="none" stroke="${strokePrimary}" stroke-width="2.8"/>` +
        `<rect x="${pad + 9}" y="${pad + 9}" width="${fw - 18}" height="${fh - 18}" rx="17" fill="none" stroke="${strokeAccent}" stroke-width="1.2" opacity="0.78"/>`
      );

    case 'ornate': {
      const corners = [
        [0, 0, 1, 1],
        [w, 0, -1, 1],
        [0, h, 1, -1],
        [w, h, -1, -1],
      ]
        .map(
          ([tx, ty, sx, sy]) =>
            `<g transform="translate(${tx} ${ty}) scale(${sx} ${sy})">` +
            `<path d="M 28 28 Q 48 28 48 48 M 28 28 Q 28 48 48 48 M 28 28 Q 40 28 40 40" fill="none" stroke="${strokeAccent}" stroke-width="2" stroke-linecap="round"/>` +
            `<circle cx="28" cy="28" r="4" fill="${strokeAccent}"/>` +
            `</g>`,
        )
        .join('');
      return (
        `<rect x="24" y="24" width="${w - 48}" height="${h - 48}" fill="none" stroke="${strokePrimary}" stroke-width="2"/>` +
        `<rect x="34" y="34" width="${w - 68}" height="${h - 68}" fill="none" stroke="${strokeAccent}" stroke-width="0.9" opacity="0.58"/>` +
        corners
      );
    }

    case 'artdeco': {
      return [
        [0, 0, 1, 1],
        [w, 0, -1, 1],
        [0, h, 1, -1],
        [w, h, -1, -1],
      ]
        .map(
          ([tx, ty, sx, sy]) =>
            `<g transform="translate(${tx} ${ty}) scale(${sx} ${sy})">` +
            `<path d="M 14 54 H 26 V 38 H 38 V 26 H 54 V 14 H 14 Z" fill="${strokePrimary}" opacity="0.88"/>` +
            `<path d="M 14 42 H 32 V 14" fill="none" stroke="${strokeAccent}" stroke-width="1.4"/>` +
            `</g>`,
        )
        .join('');
    }

    case 'brackets': {
      const arm = 40;
      const x1 = pad;
      const y1 = pad;
      const x2 = w - pad;
      const y2 = h - pad;
      return (
        `<path d="M ${x1} ${y1 + arm} V ${y1} H ${x1 + arm} M ${x2 - arm} ${y1} H ${x2} V ${y1 + arm} M ${x1} ${y2 - arm} V ${y2} H ${x1 + arm} M ${x2 - arm} ${y2} H ${x2} V ${y2 - arm}" fill="none" stroke="${strokePrimary}" stroke-width="3.2" stroke-linecap="square"/>` +
        `<path d="M ${x1 + 10} ${y1 + 24} V ${y1 + 10} H ${x1 + 24} M ${x2 - 24} ${y1 + 10} H ${x2 - 10} V ${y1 + 24} M ${x1 + 10} ${y2 - 24} V ${y2 - 10} H ${x1 + 24} M ${x2 - 24} ${y2 - 10} H ${x2 - 10} V ${y2 - 24}" fill="none" stroke="${strokeAccent}" stroke-width="1.3"/>`
      );
    }
  }
}

function renderOrnamentLayer(
  id: SurfaceOrnamentId,
  cx: number,
  cy: number,
  scale: number,
  mainStroke: string,
  accentFill: string,
): string {
  if (id === 'none') return '';
  let inner = '';

  switch (id) {
    case 'diamond':
      inner =
        `<path d="M 44 120 H 98 M 142 120 H 196" stroke="${mainStroke}" stroke-width="2.8" stroke-linecap="round"/>` +
        `<path d="M 120 104 L 136 120 L 120 136 L 104 120 Z" fill="${accentFill}"/>` +
        `<circle cx="44" cy="120" r="4" fill="${accentFill}"/><circle cx="196" cy="120" r="4" fill="${accentFill}"/>`;
      break;

    case 'laurel': {
      const leaves: string[] = [];
      for (let i = 0; i < 6; i += 1) {
        const a = -2.1 + i * 0.28;
        const x = 120 + Math.cos(a) * 58;
        const y = 128 + Math.sin(a) * 58;
        const rot = (a * 180) / Math.PI + 90;
        leaves.push(
          `<ellipse cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" rx="10" ry="4.4" fill="${mainStroke}" transform="rotate(${rot.toFixed(1)} ${x.toFixed(1)} ${y.toFixed(1)})"/>`,
        );
        const x2 = 120 - Math.cos(a) * 58;
        leaves.push(
          `<ellipse cx="${x2.toFixed(1)}" cy="${y.toFixed(1)}" rx="10" ry="4.4" fill="${mainStroke}" transform="rotate(${(-rot).toFixed(1)} ${x2.toFixed(1)} ${y.toFixed(1)})"/>`,
        );
      }
      inner = `${leaves.join('')}<circle cx="120" cy="112" r="5" fill="${accentFill}"/>`;
      break;
    }

    case 'arabesque':
      inner =
        `<rect x="86" y="86" width="68" height="68" fill="none" stroke="${mainStroke}" stroke-width="2.2"/>` +
        `<rect x="86" y="86" width="68" height="68" fill="none" stroke="${mainStroke}" stroke-width="2.2" transform="rotate(45 120 120)"/>` +
        `<circle cx="120" cy="120" r="24" fill="none" stroke="${accentFill}" stroke-width="2"/>` +
        `<polygon points="${starPoints(120, 120, 8, 16, 7)}" fill="${accentFill}" opacity="0.88"/>`;
      break;

    case 'sparkles': {
      const spark = (sx: number, sy: number, r: number, col: string) =>
        `<path d="M ${sx} ${sy - r} Q ${sx + r * 0.24} ${sy - r * 0.24} ${sx + r} ${sy} Q ${sx + r * 0.24} ${sy + r * 0.24} ${sx} ${sy + r} Q ${sx - r * 0.24} ${sy + r * 0.24} ${sx - r} ${sy} Q ${sx - r * 0.24} ${sy - r * 0.24} ${sx} ${sy - r} Z" fill="${col}"/>`;
      inner =
        spark(120, 118, 28, accentFill) +
        spark(76, 134, 14, mainStroke) +
        spark(166, 108, 12, mainStroke);
      break;
    }

    case 'crown':
      inner =
        `<path d="M 74 142 L 66 94 L 96 114 L 120 82 L 144 114 L 174 94 L 166 142 Z" fill="${accentFill}" stroke="${mainStroke}" stroke-width="2.2" stroke-linejoin="round"/>` +
        `<rect x="74" y="144" width="92" height="10" rx="4" fill="${mainStroke}"/>`;
      break;
  }

  return `<g transform="translate(${cx} ${cy}) scale(${scale.toFixed(3)}) translate(-120 -120)">${inner}</g>`;
}

function finishOverlayMarkup(
  finish: StickerFinish | undefined,
  w: number,
  h: number,
): { defs: string; body: string } {
  switch (finish) {
    case 'glossy':
      return {
        defs: `<linearGradient id="pc-finish-gloss" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#ffffff" stop-opacity="0.34"/><stop offset="55%" stop-color="#ffffff" stop-opacity="0"/></linearGradient>`,
        body: `<ellipse cx="${w / 2}" cy="${Math.round(h * 0.14)}" rx="${Math.round(w * 0.65)}" ry="${Math.round(h * 0.34)}" fill="url(#pc-finish-gloss)"/>`,
      };
    case 'matte':
      return {
        defs: '',
        body: `<rect width="${w}" height="${h}" fill="#000000" opacity="0.06"/>`,
      };
    case 'holographic':
      return {
        defs: `<linearGradient id="pc-finish-holo" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#a855f7" stop-opacity="0.22"/><stop offset="50%" stop-color="#06b6d4" stop-opacity="0.18"/><stop offset="100%" stop-color="#ec4899" stop-opacity="0.22"/></linearGradient>`,
        body: `<rect width="${w}" height="${h}" fill="url(#pc-finish-holo)"/>`,
      };
    default:
      return {
        defs: `<linearGradient id="pc-finish-std" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#ffffff" stop-opacity="0.14"/><stop offset="50%" stop-color="#ffffff" stop-opacity="0"/></linearGradient>`,
        body: `<rect width="${w}" height="${Math.round(h * 0.45)}" fill="url(#pc-finish-std)"/>`,
      };
  }
}

export interface ParametricCardDefaults {
  layout: 'square' | 'portrait';
  bg: SurfaceBackgroundId;
  pattern: SurfacePatternId;
  frame: SurfaceFrameId;
  ornament: SurfaceOrnamentId;
  badgeText: string;
  title: string;
  subtitle: string;
  footer: string;
}

/**
 * يبني بطاقة/ملصقاً متجهياً متعدد الطبقات من خلفية ونمط وإطار وزخرفة ونصوص متجاوبة
 * خالٍ تماماً من فلاتر SVG النقطية المكلفة (`feTurbulence` / `feDisplacementMap`).
 */
export function composeParametricCardSvg(
  params: StickerParams,
  defaults: ParametricCardDefaults,
): string {
  const isPortrait = defaults.layout === 'portrait';
  const w = 360;
  const h = isPortrait ? 520 : 360;
  const cx = w / 2;

  const bgRaw = params.fields.bg || defaults.bg;
  const bgId: SurfaceBackgroundId = SURFACE_BACKGROUND_OPTIONS.some((o) => o.id === bgRaw)
    ? (bgRaw as SurfaceBackgroundId)
    : defaults.bg;

  const patRaw = params.fields.pattern || defaults.pattern;
  const patId: SurfacePatternId = SURFACE_PATTERN_OPTIONS.some((o) => o.id === patRaw)
    ? (patRaw as SurfacePatternId)
    : defaults.pattern;

  const frameRaw = params.fields.frame || defaults.frame;
  const frameId: SurfaceFrameId = SURFACE_FRAME_OPTIONS.some((o) => o.id === frameRaw)
    ? (frameRaw as SurfaceFrameId)
    : defaults.frame;

  const ornRaw = params.fields.ornament || defaults.ornament;
  const ornId: SurfaceOrnamentId = SURFACE_ORNAMENT_OPTIONS.some((o) => o.id === ornRaw)
    ? (ornRaw as SurfaceOrnamentId)
    : defaults.ornament;

  const badgeText = params.fields.badgeText ?? defaults.badgeText;
  const title = params.fields.title ?? defaults.title;
  const subtitle = params.fields.subtitle ?? defaults.subtitle;
  const footer = params.fields.footer ?? defaults.footer;

  const palette = deriveSurfacePalette(
    params.primaryColor,
    params.secondaryColor,
    params.backgroundColor,
  );
  const transparent = params.isTransparent;
  const dieCut = params.dieCutBorder !== false;
  const fontFamily = params.fontFamily || 'Cairo';
  const fs = params.fontScale || 1;

  const textInk = transparent ? palette.primaryBase : pickAccessibleInk(palette.primaryDeep);
  const framePrimary = transparent ? palette.primaryBase : palette.accentLight;
  const frameAccent = palette.accentBase;
  const pillFill = transparent ? 'none' : palette.bgBase;
  const pillInk = transparent ? palette.primaryBase : palette.bgInk;

  const bgLayer = transparent ? { defs: '', body: '' } : renderBackgroundLayer(bgId, w, h, palette);
  const patLayer = renderPatternLayer(
    patId,
    w,
    h,
    transparent ? palette.primaryBase : palette.accentLight,
    palette.accentBase,
  );
  const finishLayer = transparent
    ? { defs: '', body: '' }
    : finishOverlayMarkup(params.finish, w, h);

  const badgeY = isPortrait ? 82 : 64;
  const badgeH = isPortrait ? 28 : 26;
  const badgeW = isPortrait ? 148 : 136;
  const badgeX = cx - badgeW / 2;
  const badgeTextY = badgeY + badgeH / 2;

  const ornY = isPortrait ? 172 : 130;
  const ornScale = isPortrait ? 0.5 : 0.42;

  const titleY = isPortrait ? 276 : 196;
  const titleSize = (isPortrait ? 36 : 32) * fs;
  const subY = isPortrait ? 330 : 240;
  const subSize = (isPortrait ? 17 : 15.5) * fs;
  const footerY = isPortrait ? 438 : 298;
  const footerSize = (isPortrait ? 13.5 : 12.5) * fs;

  const scrimDef = transparent
    ? ''
    : `<radialGradient id="pc-scrim" cx="50%" cy="54%" r="60%"><stop offset="0%" stop-color="${palette.primaryDeep}" stop-opacity="0.62"/><stop offset="100%" stop-color="${palette.primaryDeep}" stop-opacity="0.16"/></radialGradient>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">
  <defs>
    <clipPath id="pc-clip"><rect x="0" y="0" width="${w}" height="${h}" rx="18"/></clipPath>
    ${bgLayer.defs}
    ${patLayer.defs}
    ${scrimDef}
    ${finishLayer.defs}
  </defs>
  <g clip-path="url(#pc-clip)">
    <g data-color-role="primary">
      <g data-field-id="bg">${bgLayer.body}</g>
      <g data-field-id="pattern">${patLayer.body}</g>
      ${transparent ? '' : `<rect width="${w}" height="${h}" fill="url(#pc-scrim)"/>`}
      ${finishLayer.body}
    </g>
    <g data-color-role="secondary">
      <g data-field-id="frame">${renderFrameLayer(frameId, w, h, framePrimary, frameAccent)}</g>
      <g data-field-id="ornament">${renderOrnamentLayer(ornId, cx, ornY, ornScale, framePrimary, frameAccent)}</g>
    </g>
    ${
      badgeText
        ? `<g data-color-role="background">
      <rect x="${badgeX}" y="${badgeY}" width="${badgeW}" height="${badgeH}" rx="${badgeH / 2}" fill="${pillFill}" stroke="${frameAccent}" stroke-width="1.3"/>
      <text data-field-id="badgeText" data-max-width="${badgeW - 20}" x="${cx}" y="${badgeTextY}" dominant-baseline="central" text-anchor="middle" font-family="${fontFamily}, sans-serif" font-size="${(12 * fs).toFixed(1)}" font-weight="700" fill="${pillInk}">${escapeXml(badgeText)}</text>
    </g>`
        : ''
    }
    <text data-field-id="title" data-max-width="268" x="${cx}" y="${titleY}" dominant-baseline="central" text-anchor="middle" font-family="${fontFamily}, sans-serif" font-size="${titleSize.toFixed(1)}" font-weight="800" fill="${textInk}">${escapeXml(title)}</text>
    <text data-field-id="subtitle" data-max-width="258" x="${cx}" y="${subY}" dominant-baseline="central" text-anchor="middle" font-family="${fontFamily}, sans-serif" font-size="${subSize.toFixed(1)}" font-weight="600" fill="${textInk}" opacity="0.9">${escapeXml(subtitle)}</text>
    <text data-field-id="footer" data-max-width="244" x="${cx}" y="${footerY}" dominant-baseline="central" text-anchor="middle" font-family="${fontFamily}, sans-serif" font-size="${footerSize.toFixed(1)}" font-weight="700" fill="${frameAccent}">${escapeXml(footer)}</text>
    ${dieCut ? `<rect x="4" y="4" width="${w - 8}" height="${h - 8}" rx="15" fill="none" stroke="#ffffff" stroke-width="4" opacity="0.9"/>` : ''}
  </g>
</svg>`;
}
