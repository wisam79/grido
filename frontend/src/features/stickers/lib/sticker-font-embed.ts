/**
 * sticker-font-embed.ts
 * تضمين خطوط الملصق داخل ملف SVG المصدّر (portable SVG).
 *
 * المشكلة: ملف SVG المصدّر يرجع `font-family: Cairo` فقط — خارج التطبيق
 * يسقط لخط بديل. الحل: استخراج `@font-face` من stylesheets الحالية
 * (تعرف الـ hashed URLs المبنية)، جلب `woff2`، وحقنها `data:` داخل `<style>`.
 * الحقن يحدث *بعد* التعقيم، والمحتوى المحقون مقيد بـ `@font-face/data:` فقط.
 */

import { loadGoogleFont, resolveSupportedFontWeight } from '@/lib/io/fonts';

/** القوالب تحمل أوزانها داخل SVG، وليس في StickerParams. */
export function getStickerFontWeights(svg: string): readonly number[] {
  const weights = new Set([400]);
  for (const match of svg.matchAll(/<[^>]*\bfont-weight\s*=\s*["'](\d+|bold|normal)["'][^>]*>/gi)) {
    weights.add(match[1] === 'bold' ? 700 : match[1] === 'normal' ? 400 : Number(match[1]));
  }
  return [...weights].sort((a, b) => a - b);
}

/** تحميل الوجوه الفعلية كلها قبل قياس/معاينة الملصق، بلا تسميك صناعي مفترض. */
export async function loadStickerFont(
  family: string,
  requestedWeights: readonly number[],
): Promise<boolean> {
  const weights = [
    ...new Set(requestedWeights.map((weight) => resolveSupportedFontWeight(family, weight))),
  ];
  try {
    const loaded = await Promise.all(
      weights.map((weight) => loadGoogleFont(family, weight, 'normal')),
    );
    return loaded.every(Boolean);
  } catch {
    return false;
  }
}

const fontDataUrlCache = new Map<string, string>();

function cleanFamily(raw: string): string {
  return raw.split(',')[0].trim().replace(/['"]/g, '');
}

interface FaceInfo {
  family: string;
  weight: string;
  style: string;
  unicodeRange: string;
  urls: string[];
}

function resolveAllowedUrl(raw: string, base: string, googleOrigin: string): string | null {
  try {
    const url = new URL(raw, base);
    if (url.username || url.password) return null;
    const sameOrigin = url.origin === window.location.origin;
    return (sameOrigin && /^(https?:|wails:)$/.test(url.protocol)) || url.origin === googleOrigin
      ? url.href
      : null;
  } catch {
    return null;
  }
}

async function extractSheetFontFaceRules(sheet: CSSStyleSheet): Promise<string[]> {
  const rulesText: string[] = [];
  try {
    const rules = sheet.cssRules;
    if (rules) {
      for (const rule of Array.from(rules)) {
        if (rule.type === 5 && /src\s*:/i.test(rule.cssText || '')) {
          rulesText.push(rule.cssText);
        }
      }
    }
  } catch {
    // CSSOM يمنع قراءة Google CSS العابرة للأصل؛ نجلبها عبر CORS من الأصل المحدد فقط.
    const href =
      sheet.href && resolveAllowedUrl(sheet.href, document.baseURI, 'https://fonts.googleapis.com');
    if (!href || new URL(href).origin !== 'https://fonts.googleapis.com') return [];
    try {
      const response = await fetch(href, { credentials: 'omit', redirect: 'error' });
      if (!response.ok || Number(response.headers.get('content-length')) > 100_000) return [];
      if (response.url && new URL(response.url).origin !== 'https://fonts.googleapis.com')
        return [];
      const css = await response.text();
      if (css.length > 100_000) return [];
      return css.match(/@font-face\s*\{[^}]*\}/gi) ?? [];
    } catch {
      return [];
    }
  }
  if (rulesText.length === 0) {
    const rawCss = sheet.ownerNode?.textContent || '';
    const matches = rawCss.match(/@font-face\s*\{[^}]*\}/gi);
    if (matches) rulesText.push(...matches);
  }
  return rulesText;
}

async function collectFontFaces(families: string[]): Promise<FaceInfo[]> {
  const wanted = new Set(families.map((f) => cleanFamily(f).toLowerCase()).filter(Boolean));
  if (wanted.size === 0 || typeof document === 'undefined') return [];
  const out: FaceInfo[] = [];
  try {
    const sheets = Array.from(document.styleSheets);
    for (const sheet of sheets) {
      if (sheet.href) {
        const url = new URL(sheet.href, document.baseURI);
        if (
          url.origin === 'https://fonts.googleapis.com' &&
          !url.searchParams
            .getAll('family')
            .some((family) => wanted.has(family.split(':')[0].toLowerCase()))
        )
          continue;
      }
      for (const css of await extractSheetFontFaceRules(sheet)) {
        const famMatch = css.match(/font-family\s*:\s*['"]?([^;'"]+)/i);
        if (!famMatch) continue;
        const fam = famMatch[1].trim().replace(/['"]/g, '');
        if (!wanted.has(fam.toLowerCase())) continue;
        const urls: string[] = [];
        const urlRe = /url\(\s*['"]?([^)'"]+)['"]?\s*\)/gi;
        let m: RegExpExecArray | null;
        while ((m = urlRe.exec(css)) !== null) {
          const url = resolveAllowedUrl(
            m[1],
            sheet.href || document.baseURI,
            'https://fonts.gstatic.com',
          );
          if (url) urls.push(url);
        }
        if (urls.length === 0) continue;
        const wMatch = css.match(/font-weight\s*:\s*([^;}]+)/i);
        const sMatch = css.match(/font-style\s*:\s*([^;}]+)/i);
        const rangeMatch = css.match(/unicode-range\s*:\s*([^;}]+)/i);
        const weight = (wMatch?.[1] || '400').trim();
        const style = (sMatch?.[1] || 'normal').trim();
        const unicodeRange = (rangeMatch?.[1] || '').trim();
        // هذه الواصفات يعاد تركيبها بعد التعقيم؛ لا نحقن CSS خاماً من الشبكة.
        if (!/^(?:normal|bold|\d{1,4}(?:\s+\d{1,4})?)$/i.test(weight)) continue;
        if (!/^(?:normal|italic|oblique)$/i.test(style)) continue;
        if (unicodeRange && !/^U\+[0-9a-f?-]+(?:\s*,\s*U\+[0-9a-f?-]+)*$/i.test(unicodeRange))
          continue;
        out.push({ family: fam, weight, style, unicodeRange, urls });
      }
    }
  } catch {
    return out;
  }
  // One weight can span several script subsets; dropping faces changes the exported typography.
  return out;
}

function arrayBufferToBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let binary = '';
  const CHUNK = 8192;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return btoa(binary);
}

async function urlToDataUrl(url: string): Promise<string | null> {
  const cached = fontDataUrlCache.get(url);
  if (cached) return cached;
  try {
    const res = await fetch(url, { credentials: 'omit', redirect: 'error' });
    if (!res.ok || Number(res.headers.get('content-length')) > 400_000) return null;
    if (res.url && !resolveAllowedUrl(res.url, document.baseURI, 'https://fonts.gstatic.com'))
      return null;
    const buf = await res.arrayBuffer();
    if (buf.byteLength < 4 || buf.byteLength > 400_000) return null;
    // لا نسمّي HTML/خط آخر woff2 لمجرد امتداد الرابط.
    if (new DataView(buf).getUint32(0) !== 0x774f4632) return null;
    const dataUrl = `data:font/woff2;base64,${arrayBufferToBase64(buf)}`;
    fontDataUrlCache.set(url, dataUrl);
    return dataUrl;
  } catch {
    return null;
  }
}

/** هل كتلة <style> آمنة؟ @font-face بـ data: فقط — بلا @import/url خارجي/javascript. */
export function isSafeFontFaceStyle(css: string): boolean {
  const low = css.toLowerCase();
  if (/javascript:|expression\s*\(|@import/i.test(css)) return false;
  if (/url\s*\(\s*['"]?(?!data:)/i.test(css)) return false;
  return /@font-face/i.test(css) && low.includes('font-family');
}

/** يضمّن الخطوط في SVG — يرجع الأصل عند أي فشل (لا يكسر التصدير أبداً). */
export async function embedStickerFonts(svg: string, families: string[]): Promise<string> {
  if (!svg || typeof document === 'undefined' || families.length === 0) return svg;
  if (/<style[^>]*>[\s\S]*@font-face/i.test(svg)) return svg; // مضمن مسبقاً
  const faces = await collectFontFaces(families);
  if (faces.length === 0) return svg;

  const blocks: string[] = [];
  for (const face of faces) {
    for (const url of face.urls) {
      const dataUrl = await urlToDataUrl(url);
      if (!dataUrl) continue;
      const safeFam = face.family.replace(/[\\'"<>;{}\r\n]/g, '');
      const range = face.unicodeRange ? `unicode-range:${face.unicodeRange};` : '';
      blocks.push(
        `@font-face{font-family:'${safeFam}';font-style:${face.style};font-weight:${face.weight};${range}src:url(${dataUrl}) format('woff2');}`,
      );
      break;
    }
  }
  if (blocks.length === 0) return svg;
  const styleTag = `<style>${blocks.join('')}</style>`;
  const m = svg.match(/<svg[^>]*>/);
  if (!m) return svg;
  const insertAt = (m.index || 0) + m[0].length;
  return svg.slice(0, insertAt) + styleTag + svg.slice(insertAt);
}
