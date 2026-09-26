import { clsx, type ClassValue } from 'clsx';
import { extendTailwindMerge } from 'tailwind-merge';
import { IMAGE_FILTERS } from './templates';

/**
 * tailwind-merge لا يعرف المقياس الطباعي الدلالي المخصص في المشروع (mini/micro)
 * لأنّ isTshirtSize يتعرف على 2xs/3xs فقط، فيصنّفهما كـ«ألوان نص» (text-color)
 * فتأتي أي فئة لون لاحقة داخل cn() وتحذفهما بصمت — فيرجع النص إلى مقاس body
 * (15.5px) ويظهر أكبر وغير متناسق مع بقية الواجهة.
 * هذا التسجيل يجعل mini/micro مجموعة «حجم خط» أولاً، فيتصارعان مع text-xs
 * وليس مع الألوان.
 */
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      'font-size': [{ text: ['3xs', '2xs', 'micro', 'mini'] }],
    },
  },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export interface FilterableObject {
  filter?: string;
  brightness?: number;
  contrast?: number;
  saturation?: number;
  blur?: number;
}

export function buildCSSFilter(el: FilterableObject | undefined): string {
  if (!el) return 'none';
  const parts: string[] = [];
  const filterDef = IMAGE_FILTERS.find((f) => f.id === el.filter);
  if (filterDef && filterDef.css) parts.push(filterDef.css);
  if (el.brightness !== undefined && el.brightness !== 100)
    parts.push(`brightness(${el.brightness}%)`);
  if (el.contrast !== undefined && el.contrast !== 100) parts.push(`contrast(${el.contrast}%)`);
  if (el.saturation !== undefined && el.saturation !== 100)
    parts.push(`saturate(${el.saturation}%)`);
  if (el.blur && el.blur > 0) parts.push(`blur(${el.blur}px)`);
  return parts.join(' ') || 'none';
}

export const uid = () => crypto.randomUUID();

const SVG_FORBIDDEN_ELEMENTS = new Set([
  'script',
  'foreignobject',
  'iframe',
  'object',
  'embed',
  'handler',
  'audio',
  'video',
  'source',
  'track',
  'form',
  'input',
  'button',
  'textarea',
  'link',
  'meta',
  'base',
  // SMIL: قد تُحوّل `href` إلى `javascript:` أو تزرع معالجات أثناء التشغيل
  'animate',
  'animatemotion',
  'animatetransform',
  'set',
  'mpath',
  'discard',
  // عنصر الأنماط: @import واستدعاءات الشبكة
  'style',
]);

// مراجع داخلية (#id) وصور نقطية مضمّنة فقط — لا مراجع خارجية إطلاقاً
const SVG_SAFE_EMBEDDED_IMAGE = /^data:image\/(?:png|jpe?g|gif|webp);/i;
// سمات خطر بغضّ النظر عن الاسم (تُطبَّع المسافات قبل الفحص)
const SVG_DANGEROUS_ATTR = /javascript:|expression\s*\(|@import/i;
// style يحمّل مورداً خارجياً عبر url(...) غير محلي
const SVG_STYLE_EXTERNAL_URL = /url\s*\(\s*['"]?(?!#)/i;

function stripWhitespaceAndControlChars(value: string): string {
  let out = '';
  for (const ch of value) {
    const code = ch.codePointAt(0) ?? 0;
    if (code > 0x20) out += ch;
  }
  return out;
}

function isSafeSvgUrl(value: string): boolean {
  const trimmed = stripWhitespaceAndControlChars(value);
  if (!trimmed) return true;
  if (trimmed.startsWith('#')) return true;
  return SVG_SAFE_EMBEDDED_IMAGE.test(trimmed);
}

function scrubSvgElement(el: Element): void {
  const tag = el.tagName.toLowerCase();
  if (SVG_FORBIDDEN_ELEMENTS.has(tag)) {
    el.remove();
    return;
  }
  for (const attr of Array.from(el.attributes)) {
    const name = attr.name.toLowerCase();
    if (name.startsWith('on')) {
      el.removeAttribute(attr.name);
      continue;
    }
    // أي قيمة تحمل javascript:/@import/expression( تُحذف بغضّ النظر عن السمة
    if (SVG_DANGEROUS_ATTR.test(stripWhitespaceAndControlChars(attr.value))) {
      el.removeAttribute(attr.name);
      continue;
    }
    if (
      (name === 'href' || name === 'xlink:href' || name === 'src' || name === 'data') &&
      !isSafeSvgUrl(attr.value)
    ) {
      el.removeAttribute(attr.name);
      continue;
    }
    if (name === 'style' && SVG_STYLE_EXTERNAL_URL.test(attr.value)) {
      el.removeAttribute(attr.name);
    }
  }
  for (const child of Array.from(el.children)) {
    scrubSvgElement(child);
  }
}

export function sanitizeSvgMarkup(svg: string): string {
  if (!svg) return '';
  if (typeof DOMParser === 'undefined') {
    return svg
      .replace(
        /<\s*(script|foreignobject|iframe|object|embed|handler|style)\b[\s\S]*?<\s*\/\s*\1\s*>/gi,
        '',
      )
      .replace(/<\s*(?:animate|animatemotion|animatetransform|set|mpath|discard)\b[^>]*>/gi, '')
      .replace(/\son\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '')
      .replace(
        /\s[\w:-]+\s*=\s*(?:"[^"]*(?:javascript:|@import|expression\s*\()[^"]*"|'[^']*(?:javascript:|@import|expression\s*\()[^']*')/gi,
        '',
      )
      .replace(
        /(?:href|xlink:href|src)\s*=\s*(?:"(?!#|data:image\/)[^"]*"|'(?!#|data:image\/)[^']*')/gi,
        '',
      );
  }
  try {
    const doc = new DOMParser().parseFromString(svg, 'image/svg+xml');
    if (doc.querySelector('parsererror')) return '';
    const root = doc.documentElement;
    if (!root || root.tagName.toLowerCase() !== 'svg') return '';
    scrubSvgElement(root);
    return new XMLSerializer().serializeToString(root);
  } catch {
    return '';
  }
}

const SVG_SANITIZE_CACHE = new Map<string, string>();
const SVG_SANITIZE_CACHE_LIMIT = 256;

export function sanitizeSvgMarkupCached(svg: string): string {
  if (!svg) return '';
  const cached = SVG_SANITIZE_CACHE.get(svg);
  if (cached !== undefined) return cached;
  const clean = sanitizeSvgMarkup(svg);
  if (svg.length <= 200_000) {
    if (SVG_SANITIZE_CACHE.size >= SVG_SANITIZE_CACHE_LIMIT) {
      const oldest = SVG_SANITIZE_CACHE.keys().next().value;
      if (oldest !== undefined) SVG_SANITIZE_CACHE.delete(oldest);
    }
    SVG_SANITIZE_CACHE.set(svg, clean);
  }
  return clean;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function debounce<T extends (...args: any[]) => any>(fn: T, delay: number) {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  const debounced = (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => {
      fn(...args);
      timeout = null;
    }, delay);
  };
  debounced.cancel = () => {
    if (timeout) {
      clearTimeout(timeout);
      timeout = null;
    }
  };
  return debounced;
}
