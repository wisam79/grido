import { clampChroma, converter, formatHex, parse } from 'culori';

import { contrastRatio } from './sticker-a11y';

const toOklch = converter('oklch');

function clampNumber(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/**
 * يشتق لوناً متناغماً بإزاحة الإضاءة (Lightness) وتدرج التشبع في فضاء OKLCH
 * مع حصْر الناتج داخل نطاق sRGB لتفادي قفزات الصبغة أو القيم غير الصالحة.
 */
export function shiftLightnessHex(hex: string, deltaL: number, chromaScale = 1): string {
  const parsed = parse(hex);
  if (!parsed) return hex;
  const oklch = toOklch(parsed);
  if (!oklch) return hex;

  const next = clampChroma(
    {
      ...oklch,
      l: clampNumber((oklch.l ?? 0.5) + deltaL, 0.06, 0.96),
      c: Math.max(0, (oklch.c ?? 0) * chromaScale),
    },
    'oklch',
  );
  return formatHex(next) ?? hex;
}

export interface SurfaceGradientStops {
  light: string;
  base: string;
  deep: string;
}

/** يشتق تدرجاً ثلاثياً ناعماً لسطح الملصق أو البطاقة انطلاقاً من لون واحد. */
export function deriveSurfaceGradient(baseHex: string): SurfaceGradientStops {
  const parsed = parse(baseHex);
  const base = parsed ? (formatHex(parsed) ?? baseHex) : baseHex;
  return {
    light: shiftLightnessHex(base, 0.07, 0.95),
    base,
    deep: shiftLightnessHex(base, -0.11, 1.05),
  };
}

export interface MetallicStops {
  highlight: string;
  base: string;
  shadow: string;
}

/** يشتق تدرجاً معدنياً ثنائي التباين للميداليات والشارات من اللون الثانوي. */
export function deriveMetallicPair(accentHex: string): MetallicStops {
  const parsed = parse(accentHex);
  const base = parsed ? (formatHex(parsed) ?? accentHex) : accentHex;
  return {
    highlight: shiftLightnessHex(base, 0.09, 0.92),
    base,
    shadow: shiftLightnessHex(base, -0.12, 1.04),
  };
}

/** يختار حبر النص الأعلى تبايناً وفق WCAG 2.1 فوق خلفية معينة. */
export function pickAccessibleInk(
  bgHex: string,
  lightCandidate = '#ffffff',
  darkCandidate = '#0f172a',
): string {
  const lightScore = contrastRatio(lightCandidate, bgHex);
  const darkScore = contrastRatio(darkCandidate, bgHex);
  if (lightScore === null || darkScore === null) return lightCandidate;
  return lightScore >= darkScore ? lightCandidate : darkCandidate;
}

export interface DerivedSurfacePalette {
  primaryLight: string;
  primaryBase: string;
  primaryDeep: string;
  accentLight: string;
  accentBase: string;
  accentDark: string;
  bgBase: string;
  bgDeep: string;
  bodyInk: string;
  accentInk: string;
  bgInk: string;
}

/** يبني لوحة اشتقاق لوني موحدة من الألوان الثلاثة الأساسية التي اختارها المستخدم. */
export function deriveSurfacePalette(
  primaryColor: string,
  secondaryColor: string,
  backgroundColor: string,
): DerivedSurfacePalette {
  const surface = deriveSurfaceGradient(primaryColor);
  const metallic = deriveMetallicPair(secondaryColor);
  const bg = deriveSurfaceGradient(backgroundColor);

  return {
    primaryLight: surface.light,
    primaryBase: surface.base,
    primaryDeep: surface.deep,
    accentLight: metallic.highlight,
    accentBase: metallic.base,
    accentDark: metallic.shadow,
    bgBase: bg.base,
    bgDeep: bg.deep,
    bodyInk: pickAccessibleInk(surface.base),
    accentInk: pickAccessibleInk(metallic.base),
    bgInk: pickAccessibleInk(bg.base),
  };
}

/** يختار عنصراً عشوائياً مختلفاً عن القيمة الحالية عند توفّر أكثر من خيار. */
export function pickDifferentOption<T>(
  items: readonly T[],
  current: T,
  isSame: (a: T, b: T) => boolean,
): T {
  if (items.length <= 1) return items[0];
  const candidate = items[Math.floor(Math.random() * items.length)];
  if (!isSame(candidate, current)) return candidate;
  const idx = items.indexOf(candidate);
  return items[(idx + 1) % items.length];
}

/** يختار لوحة ألوان مختلفة عن اللون الأساسي الحالي مع الحفاظ على التناسق. */
export function pickDifferentPalette<
  T extends { primary: string; secondary: string; background: string },
>(palettes: readonly T[], currentPrimary: string): T {
  return pickDifferentOption(
    palettes,
    { primary: currentPrimary, secondary: '', background: '' } as T,
    (a, b) => a.primary.toLowerCase() === b.primary.toLowerCase(),
  );
}
