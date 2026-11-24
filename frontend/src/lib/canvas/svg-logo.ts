import { isSafeCssColor } from '@/features/stickers/lib/svg-safety';
import { sanitizeSvgMarkup } from '@/lib/utils';

const SVG_DATA_URL_PREFIX = /^data:image\/svg\+xml\b/i;
const SVG_PATH_EXTENSION = /\.svg$/i;
const NON_TINT_COLOR_VALUES = new Set([
  'transparent',
  'none',
  'currentcolor',
  'inherit',
  'initial',
  'unset',
  'revert',
]);
const SVG_STYLE_PRESENTATION_PROPS = new Set([
  'fill',
  'fill-opacity',
  'fill-rule',
  'clip-rule',
  'stroke',
  'stroke-width',
  'stroke-linecap',
  'stroke-linejoin',
  'stroke-miterlimit',
  'stroke-dasharray',
  'stroke-dashoffset',
  'stroke-opacity',
  'opacity',
  'stop-color',
  'stop-opacity',
  'color',
]);
const TINT_EXCLUDED_ANCESTORS = new Set(['mask', 'clippath', 'filter', 'pattern', 'image']);
const UNSAFE_CSS_VALUE = /javascript:|vbscript:|expression\s*\(|@import/i;
const EXTERNAL_CSS_URL = /url\s*\(\s*['"]?(?!#)/i;
const SVG_MIN_NORMALIZED_PX = 1024;
const SVG_MARKUP_CACHE_LIMIT = 64;

const svgMarkupCache = new Map<string, string>();
const pendingSvgLoads = new Map<string, Promise<string | null>>();

export function isSvgImageSource(src: string | undefined | null): boolean {
  if (!src || typeof src !== 'string') return false;
  const trimmed = src.trim();
  if (!trimmed) return false;
  if (SVG_DATA_URL_PREFIX.test(trimmed)) return true;
  const withoutQuery = trimmed.split(/[?#]/, 1)[0];
  return SVG_PATH_EXTENSION.test(withoutQuery);
}

export function isSafeSvgTintColor(color: string | undefined | null): boolean {
  if (!color || typeof color !== 'string') return false;
  const trimmed = color.trim();
  if (!trimmed || NON_TINT_COLOR_VALUES.has(trimmed.toLowerCase())) return false;
  return isSafeCssColor(trimmed);
}

export function sanitizeSvgTintColor(color: string | undefined | null): string | undefined {
  if (!isSafeSvgTintColor(color)) return undefined;
  const trimmed = color!.trim();
  if (trimmed.startsWith('#')) {
    return trimmed.toUpperCase();
  }
  return trimmed;
}

function parseCssDeclarations(raw: string): Map<string, string> {
  const map = new Map<string, string>();
  for (const part of raw.split(';')) {
    const colonIdx = part.indexOf(':');
    if (colonIdx <= 0) continue;
    const prop = part.slice(0, colonIdx).trim().toLowerCase();
    const val = part.slice(colonIdx + 1).trim();
    if (!prop || !val) continue;
    map.set(prop, val);
  }
  return map;
}

function serializeCssDeclarations(map: Map<string, string>): string {
  const entries: string[] = [];
  for (const [prop, val] of map) {
    if (val) entries.push(`${prop}:${val}`);
  }
  return entries.join(';');
}

function matchesSimplePart(el: Element, part: string): boolean {
  const trimmed = part.trim();
  if (!trimmed || /[:[\]()>*+~]/.test(trimmed)) return false;

  let rest = trimmed;
  let tagReq: string | null = null;
  let idReq: string | null = null;
  const classReqs: string[] = [];

  const firstMarker = rest.search(/[.#]/);
  if (firstMarker === -1) {
    tagReq = rest.toLowerCase();
    rest = '';
  } else if (firstMarker > 0) {
    tagReq = rest.slice(0, firstMarker).toLowerCase();
    rest = rest.slice(firstMarker);
  }

  while (rest.length > 0) {
    const marker = rest[0];
    const nextIdx = rest.slice(1).search(/[.#]/);
    const token = nextIdx === -1 ? rest.slice(1) : rest.slice(1, nextIdx + 1);
    if (!token) return false;
    if (marker === '#') {
      if (idReq !== null) return false;
      idReq = token;
    } else {
      classReqs.push(token);
    }
    rest = nextIdx === -1 ? '' : rest.slice(nextIdx + 1);
  }

  if (tagReq && tagReq !== '*' && el.tagName.toLowerCase() !== tagReq) return false;
  if (idReq !== null && el.getAttribute('id') !== idReq) return false;
  if (classReqs.length > 0) {
    const clsAttr = el.getAttribute('class');
    if (!clsAttr) return false;
    const elClasses = new Set(clsAttr.trim().split(/\s+/));
    for (const req of classReqs) {
      if (!elClasses.has(req)) return false;
    }
  }
  return true;
}

function matchesDescendantSelector(root: Element, el: Element, selector: string): boolean {
  const parts = selector.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return false;
  if (!matchesSimplePart(el, parts[parts.length - 1])) return false;

  let current: Element | null = el.parentElement;
  for (let i = parts.length - 2; i >= 0; i -= 1) {
    const part = parts[i];
    let matched: Element | null = null;
    while (current) {
      if (matchesSimplePart(current, part)) {
        matched = current;
        break;
      }
      if (current === root) break;
      current = current.parentElement;
    }
    if (!matched) return false;
    current = matched === root ? null : matched.parentElement;
  }
  return true;
}

function inlineSafeSvgStyles(root: Element): void {
  const styleNodes = Array.from(root.querySelectorAll('style'));
  if (styleNodes.length === 0) return;

  const allElements = [root, ...Array.from(root.querySelectorAll('*'))];
  const mergedRules = new Map<Element, Map<string, string>>();

  for (const styleEl of styleNodes) {
    const rawCss = styleEl.textContent || '';
    if (!rawCss.trim()) continue;

    const cleanCss = rawCss.replace(/\/\*[\s\S]*?\*\//g, '').replace(/@import[^;]*;?/gi, '');
    const ruleRegex = /([^{}@]+)\{([^{}]*)\}/g;
    let match: RegExpExecArray | null;
    while ((match = ruleRegex.exec(cleanCss)) !== null) {
      const selectorGroup = match[1].trim();
      const body = match[2].trim();
      if (!selectorGroup || !body) continue;
      if (UNSAFE_CSS_VALUE.test(selectorGroup) || EXTERNAL_CSS_URL.test(selectorGroup)) continue;

      const parsedDecls = parseCssDeclarations(body);
      const safeProps: Array<[string, string]> = [];
      for (const [prop, val] of parsedDecls) {
        if (!SVG_STYLE_PRESENTATION_PROPS.has(prop)) continue;
        if (UNSAFE_CSS_VALUE.test(val) || EXTERNAL_CSS_URL.test(val)) continue;
        safeProps.push([prop, val]);
      }
      if (safeProps.length === 0) continue;

      const selectors = selectorGroup
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      for (const selector of selectors) {
        for (const el of allElements) {
          if (el.tagName.toLowerCase() === 'style') continue;
          if (!matchesDescendantSelector(root, el, selector)) continue;
          let targetMap = mergedRules.get(el);
          if (!targetMap) {
            targetMap = new Map<string, string>();
            mergedRules.set(el, targetMap);
          }
          for (const [prop, val] of safeProps) {
            targetMap.set(prop, val);
          }
        }
      }
    }
  }

  for (const [el, cssProps] of mergedRules) {
    const inlineProps = parseCssDeclarations(el.getAttribute('style') || '');
    for (const [prop, val] of cssProps) {
      if (!inlineProps.has(prop)) {
        inlineProps.set(prop, val);
      }
    }
    const serialized = serializeCssDeclarations(inlineProps);
    if (serialized) {
      el.setAttribute('style', serialized);
    }
  }
}

export function parseSvgLengthPx(raw: string | null | undefined): number | null {
  if (!raw || typeof raw !== 'string') return null;
  const trimmed = raw.trim().toLowerCase();
  if (!trimmed || trimmed.endsWith('%')) return null;

  const units: Array<[string, number]> = [
    ['px', 1],
    ['pt', 96 / 72],
    ['pc', 16],
    ['in', 96],
    ['cm', 96 / 2.54],
    ['mm', 96 / 25.4],
  ];

  let numPart = trimmed;
  let scale = 1;
  for (const [suffix, factor] of units) {
    if (trimmed.endsWith(suffix)) {
      numPart = trimmed.slice(0, -suffix.length).trim();
      scale = factor;
      break;
    }
  }

  if (!/^[+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?$/i.test(numPart)) return null;
  const val = Number(numPart);
  if (!Number.isFinite(val) || val <= 0) return null;
  const px = val * scale;
  return Number.isFinite(px) && px > 0 ? px : null;
}

export function parseSvgViewBox(
  raw: string | null | undefined,
): { minX: number; minY: number; width: number; height: number } | null {
  if (!raw || typeof raw !== 'string') return null;
  const parts = raw
    .trim()
    .split(/[\s,]+/)
    .filter(Boolean);
  if (parts.length !== 4) return null;
  const nums = parts.map(Number);
  if (nums.some((n) => !Number.isFinite(n))) return null;
  if (nums[2] <= 0 || nums[3] <= 0) return null;
  return { minX: nums[0], minY: nums[1], width: nums[2], height: nums[3] };
}

function normalizeSvgDimensions(w: number, h: number): { width: number; height: number } | null {
  if (!Number.isFinite(w) || !Number.isFinite(h) || w <= 0 || h <= 0) return null;
  const maxSide = Math.max(w, h);
  const isFractional = w !== Math.trunc(w) || h !== Math.trunc(h);
  let outW = w;
  let outH = h;
  if (maxSide < SVG_MIN_NORMALIZED_PX || isFractional) {
    const scale = SVG_MIN_NORMALIZED_PX / maxSide;
    outW *= scale;
    outH *= scale;
  }
  return {
    width: Math.max(1, Math.round(outW)),
    height: Math.max(1, Math.round(outH)),
  };
}

export function parseSvgDimensions(svgMarkup: string): { width: number; height: number } | null {
  if (!svgMarkup || typeof svgMarkup !== 'string') return null;

  let widthAttr: string | null = null;
  let heightAttr: string | null = null;
  let viewBoxAttr: string | null = null;

  if (typeof DOMParser !== 'undefined') {
    try {
      const doc = new DOMParser().parseFromString(svgMarkup, 'image/svg+xml');
      if (!doc.querySelector('parsererror')) {
        const root = doc.documentElement;
        if (root && root.tagName.toLowerCase() === 'svg') {
          widthAttr = root.getAttribute('width');
          heightAttr = root.getAttribute('height');
          viewBoxAttr = root.getAttribute('viewBox');
        }
      }
    } catch {
      // fallback below
    }
  }

  if (widthAttr === null && heightAttr === null && viewBoxAttr === null) {
    const openMatch = svgMarkup.match(/<svg\b([^>]*)>/i);
    if (!openMatch) return null;
    const attrs = openMatch[1];
    widthAttr = attrs.match(/\bwidth\s*=\s*["']([^"']+)["']/i)?.[1] ?? null;
    heightAttr = attrs.match(/\bheight\s*=\s*["']([^"']+)["']/i)?.[1] ?? null;
    viewBoxAttr = attrs.match(/\bviewBox\s*=\s*["']([^"']+)["']/i)?.[1] ?? null;
  }

  const wVal = parseSvgLengthPx(widthAttr);
  const hVal = parseSvgLengthPx(heightAttr);
  const vb = parseSvgViewBox(viewBoxAttr);

  let rawW: number | null = null;
  let rawH: number | null = null;
  if (wVal !== null && hVal !== null) {
    rawW = wVal;
    rawH = hVal;
  } else if (vb !== null) {
    if (wVal !== null) {
      rawW = wVal;
      rawH = wVal * (vb.height / vb.width);
    } else if (hVal !== null) {
      rawH = hVal;
      rawW = hVal * (vb.width / vb.height);
    } else {
      rawW = vb.width;
      rawH = vb.height;
    }
  }

  if (rawW === null || rawH === null) return null;
  return normalizeSvgDimensions(rawW, rawH);
}

export function parseSvgAspectRatio(svgMarkup: string): number | null {
  const dims = parseSvgDimensions(svgMarkup);
  if (!dims || !(dims.width > 0) || !(dims.height > 0)) return null;
  const ratio = dims.width / dims.height;
  return Number.isFinite(ratio) && ratio > 0 ? ratio : null;
}

export function normalizeAndSanitizeSvgMarkup(rawSvg: string): string {
  if (!rawSvg || typeof rawSvg !== 'string') return '';
  if (typeof DOMParser === 'undefined') {
    return sanitizeSvgMarkup(rawSvg);
  }
  try {
    const doc = new DOMParser().parseFromString(rawSvg, 'image/svg+xml');
    if (doc.querySelector('parsererror')) return '';
    const root = doc.documentElement;
    if (!root || root.tagName.toLowerCase() !== 'svg') return '';

    inlineSafeSvgStyles(root);

    if (!root.getAttribute('xmlns')) {
      root.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    }
    if (!root.getAttribute('viewBox')) {
      const w = parseSvgLengthPx(root.getAttribute('width'));
      const h = parseSvgLengthPx(root.getAttribute('height'));
      if (w !== null && h !== null) {
        root.setAttribute('viewBox', `0 0 ${w} ${h}`);
      }
    }

    const serialized = new XMLSerializer().serializeToString(root);
    return sanitizeSvgMarkup(serialized);
  } catch {
    return '';
  }
}

function decodeBase64Utf8(base64Payload: string): string | null {
  try {
    const clean = base64Payload.replace(/\s+/g, '');
    if (typeof atob === 'function') {
      const binary = atob(clean);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i += 1) {
        bytes[i] = binary.charCodeAt(i);
      }
      return new TextDecoder('utf-8').decode(bytes);
    }
    if (typeof Buffer !== 'undefined') {
      return Buffer.from(clean, 'base64').toString('utf8');
    }
    return null;
  } catch {
    return null;
  }
}

function encodeBase64Utf8(text: string): string {
  if (typeof btoa === 'function' && typeof TextEncoder !== 'undefined') {
    const bytes = new TextEncoder().encode(text);
    let binary = '';
    for (let i = 0; i < bytes.length; i += 1) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(text, 'utf8').toString('base64');
  }
  return '';
}

export function decodeSvgDataUrl(dataUrl: string): string | null {
  if (!dataUrl || typeof dataUrl !== 'string') return null;
  const trimmed = dataUrl.trim();
  if (!SVG_DATA_URL_PREFIX.test(trimmed)) return null;
  const commaIdx = trimmed.indexOf(',');
  if (commaIdx < 0) return null;
  const header = trimmed.slice(0, commaIdx).toLowerCase();
  const payload = trimmed.slice(commaIdx + 1);
  if (header.includes(';base64')) {
    return decodeBase64Utf8(payload);
  }
  try {
    return decodeURIComponent(payload);
  } catch {
    return payload;
  }
}

export function encodeSvgDataUrl(svgMarkup: string): string {
  const b64 = encodeBase64Utf8(svgMarkup);
  if (b64) {
    return `data:image/svg+xml;base64,${b64}`;
  }
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgMarkup)}`;
}

export function sanitizeSvgDataUrl(dataUrl: string): string | null {
  const decoded = decodeSvgDataUrl(dataUrl);
  if (!decoded) return null;
  const clean = normalizeAndSanitizeSvgMarkup(decoded);
  if (!clean) return null;
  return encodeSvgDataUrl(clean);
}

export function ensureSvgRasterDimensions(
  svgMarkup: string,
  targetWidth: number,
  targetHeight: number,
): string {
  if (!svgMarkup || !(targetWidth > 0) || !(targetHeight > 0)) return svgMarkup;
  const w = Math.max(1, Math.round(targetWidth));
  const h = Math.max(1, Math.round(targetHeight));

  if (typeof DOMParser === 'undefined') {
    return svgMarkup;
  }
  try {
    const doc = new DOMParser().parseFromString(svgMarkup, 'image/svg+xml');
    if (doc.querySelector('parsererror')) return svgMarkup;
    const root = doc.documentElement;
    if (!root || root.tagName.toLowerCase() !== 'svg') return svgMarkup;

    if (!root.getAttribute('viewBox')) {
      const origW = parseSvgLengthPx(root.getAttribute('width'));
      const origH = parseSvgLengthPx(root.getAttribute('height'));
      if (origW !== null && origH !== null) {
        root.setAttribute('viewBox', `0 0 ${origW} ${origH}`);
      } else {
        root.setAttribute('viewBox', `0 0 ${w} ${h}`);
      }
    }
    root.setAttribute('width', String(w));
    root.setAttribute('height', String(h));
    return new XMLSerializer().serializeToString(root);
  } catch {
    return svgMarkup;
  }
}

function isNonPaintValue(val: string | null | undefined): boolean {
  if (!val) return true;
  const lower = val.trim().toLowerCase();
  return lower === '' || lower === 'none' || lower === 'transparent';
}

function isPaintServerRef(val: string | null | undefined): boolean {
  if (!val) return false;
  return /^url\s*\(\s*['"]?#/i.test(val.trim());
}

function isExcludedSubtree(el: Element, root: Element): boolean {
  let cur: Element | null = el;
  while (cur && cur !== root) {
    if (TINT_EXCLUDED_ANCESTORS.has(cur.tagName.toLowerCase())) {
      return true;
    }
    cur = cur.parentElement;
  }
  return false;
}

export function applySvgLogoTint(sanitizedSvg: string, tintColor?: string): string {
  const safeTint = sanitizeSvgTintColor(tintColor);
  if (!safeTint || !sanitizedSvg) return sanitizedSvg;
  if (typeof DOMParser === 'undefined') return sanitizedSvg;

  try {
    const doc = new DOMParser().parseFromString(sanitizedSvg, 'image/svg+xml');
    if (doc.querySelector('parsererror')) return sanitizedSvg;
    const root = doc.documentElement;
    if (!root || root.tagName.toLowerCase() !== 'svg') return sanitizedSvg;

    const rootStyle = parseCssDeclarations(root.getAttribute('style') || '');
    root.setAttribute('color', safeTint);
    if (rootStyle.has('color')) {
      rootStyle.set('color', safeTint);
    }

    const effectiveRootFill = rootStyle.get('fill') ?? root.getAttribute('fill');
    const rootIsNoneOrTrans =
      effectiveRootFill !== null &&
      effectiveRootFill !== undefined &&
      isNonPaintValue(effectiveRootFill);
    if (!rootIsNoneOrTrans && !isPaintServerRef(effectiveRootFill)) {
      root.setAttribute('fill', safeTint);
      if (rootStyle.has('fill')) {
        rootStyle.set('fill', safeTint);
      }
    }

    if (rootStyle.has('stroke')) {
      const s = rootStyle.get('stroke');
      if (!isNonPaintValue(s) && !isPaintServerRef(s)) {
        rootStyle.set('stroke', safeTint);
      }
    } else if (root.hasAttribute('stroke')) {
      const s = root.getAttribute('stroke');
      if (!isNonPaintValue(s) && !isPaintServerRef(s)) {
        root.setAttribute('stroke', safeTint);
      }
    }

    const serializedRootStyle = serializeCssDeclarations(rootStyle);
    if (serializedRootStyle) root.setAttribute('style', serializedRootStyle);

    const descendants = Array.from(root.querySelectorAll('*'));
    for (const el of descendants) {
      if (isExcludedSubtree(el, root)) continue;

      const tag = el.tagName.toLowerCase();
      const styleMap = parseCssDeclarations(el.getAttribute('style') || '');

      if (tag === 'stop') {
        const stopColorAttr = el.getAttribute('stop-color');
        const stopColorStyle = styleMap.get('stop-color');
        const effectiveStop = stopColorStyle ?? stopColorAttr;
        if (
          effectiveStop === null ||
          effectiveStop === undefined ||
          !isNonPaintValue(effectiveStop)
        ) {
          if (styleMap.has('stop-color')) {
            styleMap.set('stop-color', safeTint);
          } else {
            el.setAttribute('stop-color', safeTint);
          }
        }
      } else {
        if (styleMap.has('color')) {
          styleMap.set('color', safeTint);
        }
        if (el.hasAttribute('color')) {
          el.setAttribute('color', safeTint);
        }

        if (styleMap.has('fill')) {
          const f = styleMap.get('fill');
          if (!isNonPaintValue(f) && !isPaintServerRef(f)) {
            styleMap.set('fill', safeTint);
          }
        }
        if (el.hasAttribute('fill')) {
          const f = el.getAttribute('fill');
          if (!isNonPaintValue(f) && !isPaintServerRef(f)) {
            el.setAttribute('fill', safeTint);
          }
        }

        if (styleMap.has('stroke')) {
          const s = styleMap.get('stroke');
          if (!isNonPaintValue(s) && !isPaintServerRef(s)) {
            styleMap.set('stroke', safeTint);
          }
        }
        if (el.hasAttribute('stroke')) {
          const s = el.getAttribute('stroke');
          if (!isNonPaintValue(s) && !isPaintServerRef(s)) {
            el.setAttribute('stroke', safeTint);
          }
        }
      }

      if (el.hasAttribute('style')) {
        const nextStyle = serializeCssDeclarations(styleMap);
        if (nextStyle) el.setAttribute('style', nextStyle);
        else el.removeAttribute('style');
      }
    }

    return sanitizeSvgMarkup(new XMLSerializer().serializeToString(root));
  } catch {
    return sanitizedSvg;
  }
}

export function primeSvgMarkupCache(src: string, sanitizedSvg: string): void {
  if (!src || !sanitizedSvg) return;
  if (svgMarkupCache.has(src)) {
    svgMarkupCache.delete(src);
  } else if (svgMarkupCache.size >= SVG_MARKUP_CACHE_LIMIT) {
    const oldest = svgMarkupCache.keys().next().value;
    if (oldest !== undefined) svgMarkupCache.delete(oldest);
  }
  svgMarkupCache.set(src, sanitizedSvg);
}

export function peekCachedSvgMarkup(src: string | undefined | null): string | null {
  if (!src || !isSvgImageSource(src)) return null;
  const cached = svgMarkupCache.get(src);
  if (cached !== undefined) {
    svgMarkupCache.delete(src);
    svgMarkupCache.set(src, cached);
    return cached;
  }
  if (SVG_DATA_URL_PREFIX.test(src.trim())) {
    const decoded = decodeSvgDataUrl(src);
    if (!decoded) return null;
    const clean = normalizeAndSanitizeSvgMarkup(decoded);
    if (clean) {
      primeSvgMarkupCache(src, clean);
      return clean;
    }
  }
  return null;
}

export async function loadSanitizedSvgMarkup(src: string): Promise<string | null> {
  if (!src || !isSvgImageSource(src)) return null;
  const immediate = peekCachedSvgMarkup(src);
  if (immediate) return immediate;

  const pending = pendingSvgLoads.get(src);
  if (pending) return pending;

  const job = (async () => {
    try {
      if (typeof fetch !== 'function') return null;
      const response = await fetch(src);
      if (!response.ok) return null;
      const raw = await response.text();
      const clean = normalizeAndSanitizeSvgMarkup(raw);
      if (!clean) return null;
      primeSvgMarkupCache(src, clean);
      return clean;
    } catch {
      return null;
    } finally {
      pendingSvgLoads.delete(src);
    }
  })();

  pendingSvgLoads.set(src, job);
  return job;
}

export function clearSvgLogoCache(): void {
  svgMarkupCache.clear();
  pendingSvgLoads.clear();
}
