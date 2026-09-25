/* ═══════════════════════════════════════════════════════════════
   استخراج بالِتة ألوان من الصور — يعمل محلياً بلا أي إرسال للخارج.
   يُستخدم في لوحة «الألوان والهوية» لاستخراج هوية بصرية من صور العميل.
    ═══════════════════════════════════════════════════════════════ */

import { converter, formatHex } from 'culori';

/** حجم عيّنة التصغير قبل التحليل — 64×64 تكفي لتمثيل التوزيع اللوني بسرعة */
const SAMPLE_SIZE = 64;

/** عمق التكميم: 4 بتات لكل قناة (16 مستوى) — يجمّع الألوان المتقاربة في دلو واحد */
const BUCKET_BITS = 4;
const BUCKET_LEVELS = 1 << BUCKET_BITS;

function toHex(r: number, g: number, b: number): string {
  const part = (value: number) =>
    Math.max(0, Math.min(255, Math.round(value)))
      .toString(16)
      .padStart(2, '0');
  return `#${part(r)}${part(g)}${part(b)}`.toLowerCase();
}

interface Bucket {
  count: number;
  r: number;
  g: number;
  b: number;
}

/**
 * تكميم بكسلات RGBA إلى قائمة ألوان مرتّبة بالأهمية.
 * الأولوية لعدد البكسلات، مع وزن أعلى للألوان المشبعة فلا تطغى الخلفيات الرمادية.
 * دالة نقية (بلا DOM) لتكون قابلة للاختبار مباشرة.
 */
export function quantizePixels(data: Uint8ClampedArray | number[], count = 8): string[] {
  const buckets = new Map<number, Bucket>();
  const step = BUCKET_LEVELS;

  for (let i = 0; i + 3 < data.length; i += 4) {
    const a = data[i + 3];
    if (a < 125) continue; // تجاهل الشفاف وشبه الشفاف
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const key =
      ((r >> (8 - BUCKET_BITS)) * step + (g >> (8 - BUCKET_BITS))) * step +
      (b >> (8 - BUCKET_BITS));

    const bucket = buckets.get(key);
    if (bucket) {
      bucket.count++;
      bucket.r += r;
      bucket.g += g;
      bucket.b += b;
    } else {
      buckets.set(key, { count: 1, r, g, b });
    }
  }

  const scored = [...buckets.values()].map((bucket) => {
    const r = bucket.r / bucket.count;
    const g = bucket.g / bucket.count;
    const b = bucket.b / bucket.count;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    // التشبع بسيط: الفرق بين أعلى وأدنى قناة، والألوان الباهتة تُخفّض وزنها إلى الربع
    const saturation = max === 0 ? 0 : (max - min) / max;
    const weight = bucket.count * (0.25 + saturation * 0.75);
    return { hex: toHex(r, g, b), weight, count: bucket.count };
  });

  scored.sort((a, b) => b.weight - a.weight);

  const result: string[] = [];
  for (const item of scored) {
    if (result.includes(item.hex)) continue;
    // تجاهل الألوان شديدة القرب من لون مُختار سابقاً (فرق أقل من 24 لكل قناة)
    const tooClose = result.some((picked) => {
      const pr = parseInt(picked.slice(1, 3), 16);
      const pg = parseInt(picked.slice(3, 5), 16);
      const pb = parseInt(picked.slice(5, 7), 16);
      const r = parseInt(item.hex.slice(1, 3), 16);
      const g = parseInt(item.hex.slice(3, 5), 16);
      const b = parseInt(item.hex.slice(5, 7), 16);
      return Math.abs(pr - r) < 24 && Math.abs(pg - g) < 24 && Math.abs(pb - b) < 24;
    });
    if (tooClose) continue;
    result.push(item.hex);
    if (result.length >= count) break;
  }

  return result;
}

/** تحميل صورة كمصدر قابل للرسم — يفشل بصمت ويُعيد null */
function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const image = new Image();
    // الصور المحلية (data:/نفس الأصل) لا تحتاج CORS، والبعيدة تُطلب بوضع مجهول
    if (/^https?:/i.test(src)) image.crossOrigin = 'anonymous';
    image.onload = () => resolve(image);
    image.onerror = () => resolve(null);
    image.src = src;
  });
}

/** استخراج الألوان من صورة واحدة (يرجع [] عند فشل التحميل أو تعذّر الرسم) */
export async function extractPaletteFromSource(src: string, count = 8): Promise<string[]> {
  if (typeof document === 'undefined' || !src) return [];
  const image = await loadImage(src);
  if (!image) return [];

  try {
    const canvas = document.createElement('canvas');
    canvas.width = SAMPLE_SIZE;
    canvas.height = SAMPLE_SIZE;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return [];
    ctx.drawImage(image, 0, 0, SAMPLE_SIZE, SAMPLE_SIZE);
    const { data } = ctx.getImageData(0, 0, SAMPLE_SIZE, SAMPLE_SIZE);
    return quantizePixels(data, count);
  } catch {
    // صورة من أصل خارجي بلا CORS تُلوّث الكانفس — نتجاهلها بلا إسقاط اللوحة
    return [];
  }
}

/** استخراج بالِتة موحّدة من عدة صور (حتى 4) ودمج نتائجها بترتيب الأولوية */
export async function extractPaletteFromSources(srcs: string[], count = 8): Promise<string[]> {
  const unique = [...new Set(srcs.filter(Boolean))].slice(0, 4);
  if (unique.length === 0) return [];
  const results = await Promise.all(unique.map((src) => extractPaletteFromSource(src, count)));
  const merged: string[] = [];
  for (const palette of results) {
    for (const color of palette) {
      if (!merged.includes(color)) merged.push(color);
      if (merged.length >= count) return merged;
    }
  }
  return merged;
}

/* ═══════════════════════════════════════════════════════════════
   تناغمات الألوان — مولّد Complementary/Analogous/Triadic عبر OKLCH
   (يغلق الفجوة M-3: الاستخراج كان قائما والتناغم ناقصا).
   culori نقية بلا DOM — آمنة للاختبار المباشر.
   ═══════════════════════════════════════════════════════════════ */

export type ColorHarmonyKind = 'complementary' | 'analogous' | 'triadic';

const toOklch = converter('oklch');

/** توليد تناغم لوني من لون أساس بتدوير الصبغة في فضاء OKLCH (أدق طباعيا من HSL) */
export function buildColorHarmony(baseHex: string, kind: ColorHarmonyKind): string[] {
  const base = toOklch(baseHex);
  if (!base) return [baseHex];
  const { l, c, h } = base;
  const baseOut = formatHex(base);
  const rotate = (deg: number) =>
    formatHex({ mode: 'oklch', l, c, h: ((((h ?? 0) + deg) % 360) + 360) % 360 });
  switch (kind) {
    case 'complementary':
      return [baseOut, rotate(180)];
    case 'analogous':
      return [rotate(-30), baseOut, rotate(30)];
    case 'triadic':
      return [baseOut, rotate(120), rotate(240)];
  }
}
