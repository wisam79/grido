/**
 * sticker-text.ts
 * معالجة مركزية لنصوص الملصقات: اتجاه تلقائي + ملاءمة مقاس + دقة حقيقية.
 *
 * تُطبق كنقطة واحدة بعد `generateSvg` في `StickerStudioDialog` فتغطي
 * كل القوالب (~83) دون تعديل كل ملف قالب على حدة.
 */

export const STICKER_DPI = 300;
export const MM_PER_INCH = 25.4;

const ARABIC_CHAR = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;
const ARABIC_STRONG = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/;
const LATIN_STRONG = /[A-Za-z]/;

export function isArabicText(text: string): boolean {
  return ARABIC_CHAR.test(text);
}

/**
 * أول حرف قوي يقرر الاتجاه (خوارزمية Unicode المبسطة):
 * عربي أولاً → rtl، لاتيني أولاً → ltr، بلا حروف → rtl إن وجد عربي لاحقاً.
 */
export function detectTextDirection(text: string): 'rtl' | 'ltr' {
  const plain = text.replace(/&(?:amp|lt|gt|quot|apos);/g, ' ');
  for (const ch of plain) {
    if (ARABIC_STRONG.test(ch)) return 'rtl';
    if (LATIN_STRONG.test(ch)) return 'ltr';
  }
  return ARABIC_CHAR.test(plain) ? 'rtl' : 'ltr';
}

export function mmToPx(mm: number, dpi: number = STICKER_DPI): number {
  return Math.max(1, Math.round((mm * dpi) / MM_PER_INCH));
}

/** أبعاد الراستر الحقيقية من مقاس القالب بالمليمتر (لا 1200 ثابت). */
export function stickerRasterSize(
  aspectRatio: number,
  defaultMm?: { width: number; height: number },
  dpi: number = STICKER_DPI,
): { width: number; height: number } {
  const mmW = defaultMm?.width && defaultMm.width > 0 ? defaultMm.width : 50;
  const width = mmToPx(mmW, dpi);
  const safeAspect = aspectRatio && isFinite(aspectRatio) && aspectRatio > 0 ? aspectRatio : 1;
  const height = Math.max(1, Math.round(width / safeAspect));
  return { width, height };
}

let _measureCtx: CanvasRenderingContext2D | null | undefined;

function getMeasureCtx(): CanvasRenderingContext2D | null {
  if (_measureCtx !== undefined) return _measureCtx;
  try {
    if (typeof document === 'undefined') {
      _measureCtx = null;
      return null;
    }
    const canvas = document.createElement('canvas');
    _measureCtx = canvas.getContext('2d');
  } catch {
    _measureCtx = null;
  }
  return _measureCtx;
}

/** تقدير عرض النص؛ canvas عند توفره وإلا تقدير 0.6× لكل محرف. */
export function estimateTextWidth(
  text: string,
  fontSize: number,
  fontFamily: string,
  fontWeight: string | number,
): number {
  const plain = text.replace(/<[^>]*>/g, '').replace(/&(?:amp|lt|gt|quot|apos);/g, 'm');
  if (!plain) return 0;
  const ctx = getMeasureCtx();
  if (ctx) {
    try {
      ctx.font = `${fontWeight || 400} ${fontSize}px ${fontFamily || 'sans-serif'}`;
      return ctx.measureText(plain).width;
    } catch {
      // fallback أدناه
    }
  }
  return plain.length * fontSize * 0.6;
}

function stripTags(inner: string): string {
  return inner
    .replace(/<[^>]*>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

/**
 * تطبيع عربي للبحث: توحيد الهمزات والألفات والتاء المربوطة والياء،
 * وإسقاط التشكيل والتطويل، مع lower-case للاتينية — فيُطابَق «أحمد» مع «احمد».
 */
export function normalizeArabicQuery(raw: string): string {
  return (raw || '')
    .toLowerCase()
    .replace(/[\u064B-\u0652\u0670]/g, '')
    .replace(/\u0640/g, '')
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * فضّ تضارب معرّفات SVG عند عرض عدة قوالب في DOM واحد (المعرض + المعاينة):
 * يُبادئ كل `id="X"` و`url(#X)` و`href="#X"` بالبادئة المعطاة، ويُتجاهل
 * ما سُبق فضّه بنفس البادئة (idempotent) فلا يتضاعف عند إعادة التمرير.
 */
export function namespaceStickerSvgIds(svg: string, ns: string): string {
  if (!svg || !ns) return svg;
  const safeNs = ns.replace(/[^a-zA-Z0-9_-]/g, '');
  if (!safeNs) return svg;
  let out = svg.replace(/\bid="([^"]+)"/g, (m, id: string) =>
    id.startsWith(`${safeNs}-`) ? m : `id="${safeNs}-${id}"`,
  );
  out = out.replace(/url\(#([^)"']+)\)/g, (m, id: string) =>
    id.startsWith(`${safeNs}-`) ? m : `url(#${safeNs}-${id})`,
  );
  out = out.replace(/(href="#)([^"]+)"/g, (m, pre: string, id: string) =>
    id.startsWith(`${safeNs}-`) ? m : `${pre}${safeNs}-${id}"`,
  );
  return out;
}

export interface StickerSvgPostProcessOptions {
  /** بادئة فضّ تضارب المعرّفات (مثل معرّف القالب) — تُطبَّق بعد باقي المعالجات */
  namespace?: string;
}

function stripArabicLetterSpacing(attrs: string, dir: 'rtl' | 'ltr'): string {
  // تباعد الحروف يفكّك اتصال الحروف العربية (الوصل إجباري) فيُزال للنص RTL فقط،
  // ويُبقى للاتينية حيث يُستخدم للترويسات المتباعدة عمداً (PREMIUM ونحوها).
  if (dir !== 'rtl') return attrs;
  return attrs.replace(/\s*letter-spacing="[^"]*"/g, '');
}

/**
 * معالجة لاحقة لسلسلة SVG:
 * 1) حقن `direction/unicode-bidi` المفقودة حسب محتوى كل `<text>`.
 * 2) تقليص `font-size` عند فيض العرض عن ~84% من الـ viewBox (تخطي منحنيات textPath).
 * 3) إسقاط `letter-spacing` عن النص العربي (يفكّك الوصل) مع إبقائه للاتيني.
 * 4) فضّ تضارب المعرّفات اختيارياً عبر `options.namespace` لعرض آمن متعدد النسخ.
 */
export function postProcessStickerSvg(svg: string, options?: StickerSvgPostProcessOptions): string {
  if (!svg || !svg.includes('<text')) {
    return options?.namespace ? namespaceStickerSvgIds(svg, options.namespace) : svg;
  }
  const vb = svg.match(/viewBox="0 0 ([\d.]+) ([\d.]+)"/);
  const vbW = vb ? parseFloat(vb[1]) || 500 : 500;
  const maxWidth = vbW * 0.84;

  const processed = svg.replace(
    /<text([^>]*)>([\s\S]*?)<\/text>/g,
    (full, attrs: string, inner: string) => {
      if (inner.includes('<textPath')) {
        // منحني: اتجاه فقط بلا تغيير مقاس (القوس لا يُقاس خطياً)
        const dir = detectTextDirection(stripTags(inner));
        const nextAttrs = stripArabicLetterSpacing(attrs, dir);
        if (/direction\s*=/.test(nextAttrs)) {
          return nextAttrs === attrs ? full : `<text${nextAttrs}>${inner}</text>`;
        }
        return `<text${nextAttrs} direction="${dir}" unicode-bidi="embed">${inner}</text>`;
      }
      const plain = stripTags(inner).trim();
      const dir = /direction\s*=/.test(attrs)
        ? /direction="rtl"/.test(attrs)
          ? ('rtl' as const)
          : ('ltr' as const)
        : detectTextDirection(plain);
      let nextAttrs = stripArabicLetterSpacing(attrs, dir);
      if (!/direction\s*=/.test(nextAttrs)) {
        nextAttrs += ` direction="${dir}" unicode-bidi="embed"`;
      }
      const fsMatch = nextAttrs.match(/font-size="([\d.]+)"/);
      if (fsMatch && plain.length > 4) {
        const base = parseFloat(fsMatch[1]);
        if (base > 0 && isFinite(base)) {
          const famMatch = nextAttrs.match(/font-family="([^"]*)"/);
          const wMatch = nextAttrs.match(/font-weight="([^"]*)"/);
          const family = famMatch
            ? famMatch[1].split(',')[0].replace(/['"]/g, '').trim()
            : 'sans-serif';
          const weight = wMatch ? wMatch[1] : '400';
          const measured = estimateTextWidth(plain, base, family, weight);
          if (measured > maxWidth) {
            const fitted = Math.max(
              Math.floor(base * 0.55),
              Math.floor((base * maxWidth) / measured),
            );
            if (fitted < base) {
              nextAttrs = nextAttrs.replace(/font-size="[\d.]+"/, `font-size="${fitted}"`);
            }
          }
        }
      }
      if (nextAttrs === attrs) return full;
      return `<text${nextAttrs}>${inner}</text>`;
    },
  );

  return options?.namespace ? namespaceStickerSvgIds(processed, options.namespace) : processed;
}
