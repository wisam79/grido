/**
 * Shared SVG construction helpers for sticker templates.
 * Produces path data and icon markup (24x24 grid) for rich, designed stickers.
 */

export function starPoints(
  cx: number,
  cy: number,
  spikes: number,
  outerR: number,
  innerR: number,
  startAngle = -Math.PI / 2
): string {
  const pts: string[] = [];
  for (let i = 0; i < spikes * 2; i++) {
    const r = i % 2 === 0 ? outerR : innerR;
    const a = startAngle + (i * Math.PI) / spikes;
    pts.push(`${(cx + r * Math.cos(a)).toFixed(1)},${(cy + r * Math.sin(a)).toFixed(1)}`);
  }
  return pts.join(" ");
}

export function scallopCirclePath(
  cx: number,
  cy: number,
  r: number,
  bumps: number,
  bulge = 1.14
): string {
  const step = (Math.PI * 2) / bumps;
  const pt = (a: number, rr: number) =>
    `${(cx + rr * Math.cos(a)).toFixed(1)},${(cy + rr * Math.sin(a)).toFixed(1)}`;
  let d = `M ${pt(0, r)}`;
  for (let i = 0; i < bumps; i++) {
    const a0 = i * step;
    const mid = a0 + step / 2;
    d += ` Q ${pt(mid, r * bulge)} ${pt((i + 1) * step, r)}`;
  }
  return d + " Z";
}

export function sunRaysPath(
  cx: number,
  cy: number,
  rInner: number,
  rOuter: number,
  rays: number,
  angularFill = 0.32
): string {
  const step = (Math.PI * 2) / rays;
  const half = step * angularFill;
  const polar = (a: number, r: number) => ({
    x: cx + r * Math.cos(a),
    y: cy + r * Math.sin(a),
  });
  let d = "";
  for (let i = 0; i < rays; i++) {
    const a = i * step;
    const p1 = polar(a - half, rInner);
    const p2 = polar(a, rOuter);
    const p3 = polar(a + half, rInner);
    d += `M ${p1.x.toFixed(1)} ${p1.y.toFixed(1)} L ${p2.x.toFixed(1)} ${p2.y.toFixed(1)} L ${p3.x.toFixed(1)} ${p3.y.toFixed(1)} Z `;
  }
  return d.trim();
}

export function regularPolygonPoints(
  cx: number,
  cy: number,
  r: number,
  sides: number,
  rotation = -Math.PI / 2
): string {
  const pts: string[] = [];
  for (let i = 0; i < sides; i++) {
    const a = rotation + (i * Math.PI * 2) / sides;
    pts.push(`${(cx + r * Math.cos(a)).toFixed(1)},${(cy + r * Math.sin(a)).toFixed(1)}`);
  }
  return pts.join(" ");
}

export function speechBubblePath(
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
  tailHeight: number,
  tailWidth: number
): string {
  const xa = x + w * 0.2;
  const xb = xa + tailWidth;
  return [
    `M ${x + r},${y}`,
    `H ${x + w - r}`,
    `Q ${x + w},${y} ${x + w},${y + r}`,
    `V ${y + h - r}`,
    `Q ${x + w},${y + h} ${x + w - r},${y + h}`,
    `H ${xb}`,
    `L ${xa},${y + h + tailHeight}`,
    `L ${xa},${y + h}`,
    `H ${x + r}`,
    `Q ${x},${y + h} ${x},${y + h - r}`,
    `V ${y + r}`,
    `Q ${x},${y} ${x + r},${y}`,
    "Z",
  ].join(" ");
}

export function runningStitchCircle(
  cx: number,
  cy: number,
  r: number,
  stroke: string,
  strokeWidth = 3,
  dash = "10 7"
): string {
  return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${stroke}" stroke-width="${strokeWidth}" stroke-dasharray="${dash}" stroke-linecap="round"/>`;
}

type IconRenderer = (fill: string) => string;

const ICONS: Record<string, IconRenderer> = {
  heart: (f) =>
    `<path d="M12 21.3l-1.4-1.3C5.4 15.4 2 12.3 2 8.5 2 5.4 4.4 3 7.5 3c1.7 0 3.4.8 4.5 2.1C13.1 3.8 14.8 3 16.5 3 19.6 3 22 5.4 22 8.5c0 3.8-3.4 6.9-8.6 11.5L12 21.3z" fill="${f}"/>`,
  sparkle: (f) => `<path d="M12 2l2.3 7.7L22 12l-7.7 2.3L12 22l-2.3-7.7L2 12l7.7-2.3z" fill="${f}"/>`,
  star: (f) =>
    `<path d="M12 2.5l2.8 5.9 6.4.8-4.7 4.4 1.2 6.4L12 17l-5.7 3 1.2-6.4L2.8 9.2l6.4-.8L12 2.5z" fill="${f}"/>`,
  coffee: (f) =>
    `<path d="M5 9h11v4a5 5 0 0 1-5 5h-1a5 5 0 0 1-5-5V9z" fill="${f}"/>` +
    `<path d="M17.5 10h.9a2.6 2.6 0 0 1 0 5.2h-1" fill="none" stroke="${f}" stroke-width="2" stroke-linecap="round"/>` +
    `<path d="M8 2.5q-1.2 1.6 0 3.2M12 2.5q-1.2 1.6 0 3.2" fill="none" stroke="${f}" stroke-width="1.8" stroke-linecap="round"/>`,
  wifi: (f) =>
    `<g stroke="${f}" stroke-width="2.4" stroke-linecap="round" fill="none">` +
    `<path d="M3.5 9.5a12.4 12.4 0 0 1 17 0"/><path d="M6.8 13a8 8 0 0 1 10.4 0"/><path d="M10 16.4a4 4 0 0 1 4 0"/></g>` +
    `<circle cx="12" cy="19.6" r="1.9" fill="${f}"/>`,
  flame: (f) =>
    `<path d="M12 2C8.7 7.8 5 10.2 5 14.5a7 7 0 0 0 14 0C19 10.2 15.3 7.8 12 2z" fill="${f}"/>`,
  leaf: (f) =>
    `<path d="M20 4C9.5 5 4 10.5 4 20c9.5-1 15-6.5 16-16z" fill="${f}"/>` +
    `<path d="M6.5 17.5C9.5 12.5 13 9 17.5 6.5" fill="none" stroke="${f}" stroke-width="1.6" stroke-linecap="round"/>`,
  gift: (f) =>
    `<rect x="2" y="7.5" width="20" height="4.5" rx="1.2" fill="${f}"/>` +
    `<rect x="4" y="12" width="16" height="9" rx="1.5" fill="${f}"/>` +
    `<rect x="10.6" y="7.5" width="2.8" height="13.5" fill="#ffffff" opacity="0.85"/>` +
    `<path d="M12 7.5C10 3.5 5.5 3.5 5.5 5.5 5.5 6.8 8 7.5 12 7.5zm0 0c2-4 6.5-4 6.5-2 0 1.3-2.5 2-6.5 2z" fill="${f}"/>`,
  pin: (f) =>
    `<path d="M12 2a8 8 0 0 0-8 8c0 4.2 8 12 8 12s8-7.8 8-12a8 8 0 0 0-8-8zm0 11a3 3 0 1 1 0-6 3 3 0 0 1 0 6z" fill="${f}" fill-rule="evenodd"/>`,
  phone: (f) =>
    `<rect x="7" y="2" width="10" height="20" rx="2.5" fill="${f}"/>` +
    `<rect x="10" y="18.2" width="4" height="1.4" rx="0.7" fill="#ffffff" opacity="0.9"/>` +
    `<rect x="10.2" y="4.5" width="3.6" height="0.9" rx="0.45" fill="#ffffff" opacity="0.6"/>`,
  snowflake: (f) =>
    `<g stroke="${f}" stroke-width="1.8" stroke-linecap="round" fill="none">` +
    `<path d="M12 3v18"/><path d="M4.2 7.5l15.6 9"/><path d="M19.8 7.5l-15.6 9"/></g>` +
    `<circle cx="12" cy="12" r="2.2" fill="${f}"/>`,
};

export function iconMarkup(
  name: keyof typeof ICONS | string,
  x: number,
  y: number,
  size: number,
  fill: string,
  colorRole?: string
): string {
  const render = ICONS[name];
  if (!render) return "";
  const role = colorRole ? ` data-color-role="${colorRole}"` : "";
  return `<g transform="translate(${x},${y}) scale(${(size / 24).toFixed(3)})"${role}>${render(fill)}</g>`;
}

export function curvedTextPathDefs(
  idPrefix: string,
  cx: number,
  cy: number,
  r: number
): string {
  return (
    `<path id="${idPrefix}-top" d="M ${cx - r},${cy} A ${r},${r} 0 0,1 ${cx + r},${cy}" fill="none"/>` +
    `<path id="${idPrefix}-bottom" d="M ${cx - r},${cy} A ${r},${r} 0 0,0 ${cx + r},${cy}" fill="none"/>`
  );
}

/**
 * Detect fields that have NO clickable visual element in the generated SVG.
 * Such fields (e.g. a QR URL encoded inside the QR image itself) must stay
 * accessible in the inspector even when all other fields are click-editable.
 */
export function findHiddenFieldIds(svgString: string, fieldIds: string[]): string[] {
  return fieldIds.filter((id) => !svgString.includes(`data-field-id="${id}"`));
}
