export type HsvColor = {
  h: number;
  s: number;
  v: number;
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function normalizeHexColor(value: string): string | null {
  const raw = value.trim().replace(/^#/, '');
  if (/^[0-9a-f]{3}$/i.test(raw)) {
    const expanded = raw
      .split('')
      .map((char) => char + char)
      .join('');
    return `#${expanded.toUpperCase()}`;
  }
  if (/^[0-9a-f]{6}$/i.test(raw)) {
    return `#${raw.toUpperCase()}`;
  }
  return null;
}

export function hexToHsv(hex: string, fallbackHue = 0): HsvColor {
  const normalized = normalizeHexColor(hex);
  if (!normalized) {
    return { h: fallbackHue, s: 0, v: 1 };
  }

  const r = parseInt(normalized.slice(1, 3), 16) / 255;
  const g = parseInt(normalized.slice(3, 5), 16) / 255;
  const b = parseInt(normalized.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;

  let h = fallbackHue;
  if (delta > 0) {
    if (max === r) h = ((g - b) / delta) % 6;
    else if (max === g) h = (b - r) / delta + 2;
    else h = (r - g) / delta + 4;
    h = (h * 60 + 360) % 360;
  }

  return {
    h,
    s: max === 0 ? 0 : delta / max,
    v: max,
  };
}

export function hsvToRgb({ h, s, v }: HsvColor): [number, number, number] {
  const hue = ((h % 360) + 360) % 360;
  const saturation = clamp(s, 0, 1);
  const value = clamp(v, 0, 1);
  const chroma = value * saturation;
  const sector = hue / 60;
  const x = chroma * (1 - Math.abs((sector % 2) - 1));

  let r = 0;
  let g = 0;
  let b = 0;
  if (sector < 1) [r, g, b] = [chroma, x, 0];
  else if (sector < 2) [r, g, b] = [x, chroma, 0];
  else if (sector < 3) [r, g, b] = [0, chroma, x];
  else if (sector < 4) [r, g, b] = [0, x, chroma];
  else if (sector < 5) [r, g, b] = [x, 0, chroma];
  else [r, g, b] = [chroma, 0, x];

  const match = value - chroma;
  return [
    Math.round((r + match) * 255),
    Math.round((g + match) * 255),
    Math.round((b + match) * 255),
  ];
}

export function hsvToHex(color: HsvColor): string {
  const [r, g, b] = hsvToRgb(color);
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b
    .toString(16)
    .padStart(2, '0')}`.toUpperCase();
}

export function wheelPointToHsv(
  x: number,
  y: number,
  size: number,
  value = 1,
  inset = 0,
): HsvColor {
  const center = size / 2;
  const radius = Math.max(1, center - inset);
  const dx = x - center;
  const dy = y - center;
  const distance = Math.hypot(dx, dy);

  return {
    h: distance < 0.001 ? 0 : ((Math.atan2(dx, -dy) * 180) / Math.PI + 360) % 360,
    s: clamp(distance / radius, 0, 1),
    v: clamp(value, 0, 1),
  };
}
