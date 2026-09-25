/**
 * ألوان وتدرجات التصدير — محلل خفيف مع كاش، وبناء تدرجات مطابقة لـ Konva.
 * مستخرجة من export-image.ts (P1 تفكيك الملفات) بلا أي تغيير سلوكي.
 * ملاحظة: الرسم متسلسل فمشاركة roundedPool آمنة — لا تصدير متوازٍ يشترك فيها.
 */
import type { CanvasElement } from '@/lib/editor-store';
import { gradientStart, gradientEnd } from '@/lib/canvas/canvas-colors';

// محلل ألوان خفيف مع كاش — يتجنب readback متزامن (getImageData) في كل استدعاء
// أثناء حلقات التصدير. الأنساق الغريبة تسقط على probe مشترك واحد (fallback).
const colorParseCache = new Map<string, [number, number, number, number]>();
let colorProbe: HTMLCanvasElement | null = null;

function parseColorToRGBA(color: string): [number, number, number, number] | null {
  const cached = colorParseCache.get(color);
  if (cached) return cached;
  const c = color.trim().toLowerCase();
  let parsed: [number, number, number, number] | null = null;
  if (c[0] === '#') {
    const hex = c.slice(1);
    let r = 0;
    let g = 0;
    let b = 0;
    let a = 255;
    if (hex.length === 3 || hex.length === 4) {
      r = parseInt(hex[0] + hex[0], 16);
      g = parseInt(hex[1] + hex[1], 16);
      b = parseInt(hex[2] + hex[2], 16);
      if (hex.length === 4) a = parseInt(hex[3] + hex[3], 16);
    } else if (hex.length === 6 || hex.length === 8) {
      r = parseInt(hex.slice(0, 2), 16);
      g = parseInt(hex.slice(2, 4), 16);
      b = parseInt(hex.slice(4, 6), 16);
      if (hex.length === 8) a = parseInt(hex.slice(6, 8), 16);
    }
    if (Number.isFinite(r + g + b + a)) parsed = [r, g, b, a];
  } else {
    const m = c.match(/^rgba?\(\s*([^)]+)\)$/);
    if (m) {
      const parts = m[1].split(',').map((s) => s.trim());
      if (parts.length === 3 || parts.length === 4) {
        const channel = (s: string) =>
          s.endsWith('%') ? (parseFloat(s) / 100) * 255 : parseFloat(s);
        const r = channel(parts[0]);
        const g = channel(parts[1]);
        const b = channel(parts[2]);
        let a = 255;
        if (parts.length === 4) {
          const av = parts[3];
          a = Math.round((av.endsWith('%') ? parseFloat(av) / 100 : parseFloat(av)) * 255);
        }
        if ([r, g, b, a].every((v) => Number.isFinite(v))) {
          parsed = [
            Math.max(0, Math.min(255, Math.round(r))),
            Math.max(0, Math.min(255, Math.round(g))),
            Math.max(0, Math.min(255, Math.round(b))),
            Math.max(0, Math.min(255, Math.round(a))),
          ];
        }
      }
    }
  }
  if (parsed) {
    if (colorParseCache.size > 512) colorParseCache.clear();
    colorParseCache.set(color, parsed);
  }
  return parsed;
}

// دمج الشفافية داخل أي لون CSS — Canvas2D لا يملك shadowOpacity منفصلة كما في Konva
export function colorWithAlpha(color: string, alpha: number): string {
  if (alpha >= 1) return color;
  const parsed = parseColorToRGBA(color);
  if (parsed) {
    const [r, g, b, a] = parsed;
    return `rgba(${r}, ${g}, ${b}, ${((a / 255) * alpha).toFixed(3)})`;
  }
  // fallback للأسماء والأنساق الغريبة (hsl/w names): probe واحد مشترك بدل كانفس لكل استدعاء
  if (!colorProbe) {
    colorProbe = document.createElement('canvas');
    colorProbe.width = colorProbe.height = 1;
  }
  const pctx = colorProbe.getContext('2d', { willReadFrequently: true });
  if (!pctx) return color;
  pctx.clearRect(0, 0, 1, 1);
  pctx.fillStyle = color;
  pctx.fillRect(0, 0, 1, 1);
  const [r, g, b, a] = pctx.getImageData(0, 0, 1, 1).data;
  const out: [number, number, number, number] = [r, g, b, a];
  if (colorParseCache.size > 512) colorParseCache.clear();
  colorParseCache.set(color, out);
  return `rgba(${r}, ${g}, ${b}, ${((a / 255) * alpha).toFixed(3)})`;
}

// كانفس وسيط مشترك لقص الزوايا المستديرة — يُعاد استخدامه بدل تخصيص
// كانفس بحجم الورقة الكامل لكل صورة داخل حلقة التصدير (الرسم متسلسل فالمشاركة آمنة)
let roundedPool: HTMLCanvasElement | null = null;
export function getRoundedPool(
  w: number,
  h: number,
): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } | null {
  if (!roundedPool) roundedPool = document.createElement('canvas');
  roundedPool.width = Math.max(1, Math.round(w));
  roundedPool.height = Math.max(1, Math.round(h));
  const octx = roundedPool.getContext('2d');
  if (!octx) return null;
  octx.filter = 'none';
  return { canvas: roundedPool, ctx: octx };
}

// بناء تعبئة تدرج (linear/radial) مطابقة لمنطق getFillProps في Konva — null تعني اللون الصلب
export function buildGradientFill(
  ctx: CanvasRenderingContext2D,
  el: CanvasElement,
  w: number,
  h: number,
): CanvasGradient | null {
  const addStops = (grad: CanvasGradient, stops?: Array<number | string>) => {
    const s = stops && stops.length >= 4 ? stops : [0, gradientStart(), 1, gradientEnd()];
    for (let i = 0; i + 1 < s.length; i += 2) {
      grad.addColorStop(Number(s[i]), String(s[i + 1]));
    }
  };
  if (el.fillType === 'linear') {
    const start = el.fillLinearGradientStartPoint || { x: 0, y: 0 };
    const end = el.fillLinearGradientEndPoint || { x: 1, y: 1 };
    const grad = ctx.createLinearGradient(start.x * w, start.y * h, end.x * w, end.y * h);
    addStops(grad, el.fillLinearGradientColorStops);
    return grad;
  }
  if (el.fillType === 'radial') {
    const start = el.fillRadialGradientStartPoint || { x: 0.5, y: 0.5 };
    const end = el.fillRadialGradientEndPoint || { x: 0.5, y: 0.5 };
    const rStart = el.fillRadialGradientStartRadius ?? 0;
    const rEnd = el.fillRadialGradientEndRadius ?? 0.5;
    const grad = ctx.createRadialGradient(
      start.x * w,
      start.y * h,
      rStart * Math.max(w, h),
      end.x * w,
      end.y * h,
      rEnd * Math.max(w, h),
    );
    addStops(grad, el.fillRadialGradientColorStops);
    return grad;
  }
  return null;
}
