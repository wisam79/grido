/**
 * sticker-font-embed.ts
 * تضمين خطوط الملصق داخل ملف SVG المصدّر (portable SVG).
 *
 * المشكلة: ملف SVG المصدّر يرجع `font-family: Cairo` فقط — خارج التطبيق
 * يسقط لخط بديل. الحل: استخراج `@font-face` من stylesheets الحالية
 * (تعرف الـ hashed URLs المبنية)، جلب `woff2`، وحقنها `data:` داخل `<style>`.
 * الحقن يحدث *بعد* التعقيم، والمحتوى المحقون مقيد بـ `@font-face/data:` فقط.
 */

const fontDataUrlCache = new Map<string, string>();

function cleanFamily(raw: string): string {
  return raw.split(',')[0].trim().replace(/['"]/g, '');
}

interface FaceInfo {
  family: string;
  weight: string;
  style: string;
  urls: string[];
}

function collectFontFaces(families: string[]): FaceInfo[] {
  const wanted = new Set(families.map((f) => cleanFamily(f).toLowerCase()).filter(Boolean));
  if (wanted.size === 0 || typeof document === 'undefined') return [];
  const out: FaceInfo[] = [];
  try {
    const sheets = Array.from(document.styleSheets);
    for (const sheet of sheets) {
      let rules: CSSRuleList | null = null;
      try {
        rules = sheet.cssRules;
      } catch {
        continue; // cross-origin stylesheet — غير قابلة للقراءة
      }
      if (!rules) continue;
      for (const rule of Array.from(rules)) {
        if (rule.type !== 5) continue; // FONT_FACE_RULE
        const css = rule.cssText || '';
        const famMatch = css.match(/font-family\s*:\s*['"]?([^;'"]+)/i);
        if (!famMatch) continue;
        const fam = famMatch[1].trim().replace(/['"]/g, '');
        if (!wanted.has(fam.toLowerCase())) continue;
        const urls: string[] = [];
        const urlRe = /url\(\s*['"]?([^)'"]+)['"]?\s*\)/gi;
        let m: RegExpExecArray | null;
        while ((m = urlRe.exec(css)) !== null) {
          const u = m[1];
          if (/^data:/i.test(u)) continue; // مضمن أصلاً — لا حاجة لجلبه
          if (/^(https?:|blob:)/i.test(u) && !u.startsWith(window.location.origin)) continue;
          urls.push(u);
        }
        if (urls.length === 0) continue;
        const wMatch = css.match(/font-weight\s*:\s*([^;]+)/i);
        const sMatch = css.match(/font-style\s*:\s*([^;]+)/i);
        out.push({
          family: fam,
          weight: (wMatch?.[1] || '400').trim(),
          style: (sMatch?.[1] || 'normal').trim(),
          urls,
        });
      }
    }
  } catch {
    return out;
  }
  // حد أعلى: وجهان لكل عائلة (400 + 700) لتفادي ملف ضخم
  const byFamily = new Map<string, FaceInfo[]>();
  for (const f of out) {
    const arr = byFamily.get(f.family.toLowerCase()) || [];
    if (arr.length < 2) arr.push(f);
    byFamily.set(f.family.toLowerCase(), arr);
  }
  return Array.from(byFamily.values()).flat();
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
    const res = await fetch(url);
    if (!res.ok) return null;
    const buf = await res.arrayBuffer();
    if (buf.byteLength === 0 || buf.byteLength > 400_000) return null;
    const ct = res.headers.get('content-type') || '';
    const mime = ct.includes('font') || ct.includes('octet') ? 'font/woff2' : 'font/woff2';
    const dataUrl = `data:${mime};base64,${arrayBufferToBase64(buf)}`;
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
  const faces = collectFontFaces(families);
  if (faces.length === 0) return svg;

  const blocks: string[] = [];
  for (const face of faces) {
    for (const url of face.urls.slice(0, 1)) {
      const dataUrl = await urlToDataUrl(new URL(url, document.baseURI).toString());
      if (!dataUrl) continue;
      const safeFam = face.family.replace(/['"<>]/g, '');
      blocks.push(
        `@font-face{font-family:'${safeFam}';font-style:${face.style};font-weight:${face.weight};src:url(${dataUrl}) format('woff2');}`,
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
