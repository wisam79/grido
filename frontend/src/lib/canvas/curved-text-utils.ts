/**
 * Utility for drawing curved text along an arc on standard HTML5 Canvas 2D / Konva
 * Supports connected Arabic ligatures (via contextual shaping) and RTL flow.
 */

import { TEXT_COLOR_DEFAULT } from './canvas-colors';
import { getCurvedTextMetrics } from './curved-text-metrics';
import { warmTextStrokeFilter } from './text-stroke-filter';
import { MAX_EXPORT_PIXELS } from '../export/export-limits';

import type { CanvasFillStyle, GlyphTransform } from './fill-paint';

/**
 * تعبئة النص المقوّس: لون/تدرج/نقش ثابت، أو دالة تُنتج التعبئة لكل حرف
 * لتبقى الصورة/التدرج في فضاء العنصر رغم دوران الحروف على القوس.
 */
export type CurvedTextFill =
  CanvasFillStyle | ((ctx: CanvasRenderingContext2D, glyph: GlyphTransform) => CanvasFillStyle);

export interface CurvedTextOptions {
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize: number;
  fontFamily: string;
  fontWeight?: number;
  fontStyle?: string;
  color?: string;
  fillStyle?: CurvedTextFill;
  /** مصنع تعبئة يربط التدرج/النقش بسياق الرسم الهدف (كانفاس مؤقت للحدود) */
  createFill?: (ctx: CanvasRenderingContext2D) => CurvedTextFill;
  stroke?: string;
  strokeWidth?: number;
  textAlign?: 'left' | 'center' | 'right';
  /** اتجاه الفقرة بقاعدة أول محرف قوي — يتحكم ببداية القوس لا بشكل الحروف */
  direction?: 'rtl' | 'ltr';
  curve: number; // -100 to 100
  letterSpacing?: number;
}

// Arabic contextual shapes: [isolated, initial, medial, final]
const ARABIC_FORMS_MAP: Record<string, (string | null)[]> = {
  '\u0621': ['\uFE80'], // Hamza
  '\u0622': ['\uFE81', null, null, '\uFE82'], // Alef with madda
  '\u0623': ['\uFE83', null, null, '\uFE84'], // Alef with hamza above
  '\u0624': ['\uFE85', null, null, '\uFE86'], // Waw with hamza
  '\u0625': ['\uFE87', null, null, '\uFE88'], // Alef with hamza below
  '\u0626': ['\uFE89', '\uFE8B', '\uFE8C', '\uFE8A'], // Yeh with hamza
  '\u0627': ['\uFE8D', null, null, '\uFE8E'], // Alef
  '\u0628': ['\uFE8F', '\uFE91', '\uFE92', '\uFE90'], // Beh
  '\u0629': ['\uFE93', null, null, '\uFE94'], // Teh marbuta
  '\u062A': ['\uFE95', '\uFE97', '\uFE98', '\uFE96'], // Teh
  '\u062B': ['\uFE99', '\uFE9B', '\uFE9C', '\uFE9A'], // Theh
  '\u062C': ['\uFE9D', '\uFE9F', '\uFEA0', '\uFE9E'], // Jeem
  '\u062D': ['\uFEA1', '\uFEA3', '\uFEA4', '\uFEA2'], // Hah
  '\u062E': ['\uFEA5', '\uFEA7', '\uFEA8', '\uFEA6'], // Khah
  '\u062F': ['\uFEA9', null, null, '\uFEAA'], // Dal
  '\u0630': ['\uFEAB', null, null, '\uFEAC'], // Thal
  '\u0631': ['\uFEAD', null, null, '\uFEAE'], // Reh
  '\u0632': ['\uFEAF', null, null, '\uFEB0'], // Zain
  '\u0633': ['\uFEB1', '\uFEB3', '\uFEB4', '\uFEB2'], // Seen
  '\u0634': ['\uFEB5', '\uFEB7', '\uFEB8', '\uFEB6'], // Sheen
  '\u0635': ['\uFEB9', '\uFEBB', '\uFEBC', '\uFEBA'], // Sad
  '\u0636': ['\uFEBD', '\uFEBF', '\uFEC0', '\uFEBE'], // Dad
  '\u0637': ['\uFEC1', '\uFEC3', '\uFEC4', '\uFEC2'], // Tah
  '\u0638': ['\uFEC5', '\uFEC7', '\uFEC8', '\uFEC6'], // Zah
  '\u0639': ['\uFEC9', '\uFECB', '\uFECC', '\uFECA'], // Ain
  '\u063A': ['\uFECD', '\uFECF', '\uFED0', '\uFECE'], // Ghain
  '\u0641': ['\uFED1', '\uFED3', '\uFED4', '\uFED2'], // Feh
  '\u0642': ['\uFED5', '\uFED7', '\uFED8', '\uFED6'], // Qaf
  '\u0643': ['\uFED9', '\uFEDB', '\uFEDC', '\uFEDA'], // Kaf
  '\u0644': ['\uFEDD', '\uFEDF', '\uFEE0', '\uFEDE'], // Lam
  '\u0645': ['\uFEE1', '\uFEE3', '\uFEE4', '\uFEE2'], // Meem
  '\u0646': ['\uFEE5', '\uFEE7', '\uFEE8', '\uFEE6'], // Noon
  '\u0647': ['\uFEE9', '\uFEEB', '\uFEEC', '\uFEEA'], // Heh
  '\u0648': ['\uFEED', null, null, '\uFEEE'], // Waw
  '\u0649': ['\uFEEF', null, null, '\uFEF0'], // Alef Maksura
  '\u064A': ['\uFEF1', '\uFEF3', '\uFEF4', '\uFEF2'], // Yeh
  '\u067E': ['\uFB56', '\uFB58', '\uFB59', '\uFB57'], // Peh
  '\u0686': ['\uFB7A', '\uFB7C', '\uFB7D', '\uFB7B'], // Tcheh
  '\u0698': ['\uFB8A', null, null, '\uFB8B'], // Jeh
  '\u06AF': ['\uFB92', '\uFB94', '\uFB95', '\uFB93'], // Gaf
};

// Lam-Alef ligatures: [isolated, final]
const LAM_ALEF_MAP: Record<string, [string, string]> = {
  '\u0622': ['\uFEF5', '\uFEF6'], // l + madda
  '\u0623': ['\uFEF7', '\uFEF8'], // l + hamza above
  '\u0625': ['\uFEF9', '\uFEFA'], // l + hamza below
  '\u0627': ['\uFEFB', '\uFEFC'], // l + alef
};

// Strips diacritics for shape matching while preserving them on the glyph
const TASHKEEL_REGEX = /[\u064B-\u065F\u0670]/g;

function shapeArabicGraphemes(text: string): string[] {
  const chars = Array.from(text);
  const out: string[] = [];

  for (let i = 0; i < chars.length; i++) {
    const rawCluster = chars[i];
    const baseChar = rawCluster.replace(TASHKEEL_REGEX, '');
    const diacritics = rawCluster.slice(baseChar.length);

    // Look behind & ahead ignoring spaces/diacritics
    let prevChar: string | null = null;
    for (let p = i - 1; p >= 0; p--) {
      const b = chars[p].replace(TASHKEEL_REGEX, '');
      if (b !== ' ') {
        prevChar = b;
        break;
      }
      break; // Space breaks connection
    }

    let nextChar: string | null = null;
    for (let n = i + 1; n < chars.length; n++) {
      const b = chars[n].replace(TASHKEEL_REGEX, '');
      if (b !== ' ') {
        nextChar = b;
        break;
      }
      break; // Space breaks connection
    }

    // Check Lam-Alef ligature
    if (baseChar === '\u0644' && nextChar && LAM_ALEF_MAP[nextChar]) {
      const prevShapes = prevChar && ARABIC_FORMS_MAP[prevChar];
      const prevConnects = prevShapes && (prevShapes[1] || prevShapes[2]);
      const shapedLigature = prevConnects ? LAM_ALEF_MAP[nextChar][1] : LAM_ALEF_MAP[nextChar][0];
      // #13 — إلحاق تشكيل الألف أيضاً (كان يُرمى مع تخطّي حرف الألف)
      const alefChar = chars[i + 1] || '';
      const alefBase = alefChar.replace(TASHKEEL_REGEX, '');
      const alefDiacritics = alefChar.slice(alefBase.length);
      out.push(shapedLigature + diacritics + alefDiacritics);
      i++; // Skip alef
      continue;
    }

    const forms = ARABIC_FORMS_MAP[baseChar];
    if (!forms) {
      out.push(rawCluster);
      continue;
    }

    const prevShapes = prevChar && ARABIC_FORMS_MAP[prevChar];
    const prevConnects = prevShapes && (prevShapes[1] || prevShapes[2]);
    const nextShapes = nextChar && ARABIC_FORMS_MAP[nextChar];
    const nextConnects = nextShapes && (nextShapes[0] || nextShapes[3]);

    let shaped: string;
    if (prevConnects && nextConnects && forms[2]) {
      shaped = forms[2]!; // Medial
    } else if (prevConnects && forms[3]) {
      shaped = forms[3]!; // Final
    } else if (nextConnects && forms[1]) {
      shaped = forms[1]!; // Initial
    } else {
      shaped = forms[0] || baseChar; // Isolated
    }

    out.push(shaped + diacritics);
  }

  return out;
}

// #14 — Segmenter كـ module-level singleton: يُنشأ مرة واحدة، لا في كل إطار رسم
let _cachedSegmenter: Intl.Segmenter | null = null;
function getGraphemeSegmenter(): Intl.Segmenter | null {
  if (_cachedSegmenter) return _cachedSegmenter;
  if (typeof Intl !== 'undefined' && typeof Intl.Segmenter === 'function') {
    try {
      _cachedSegmenter = new Intl.Segmenter(undefined, { granularity: 'grapheme' });
    } catch {
      // بيئة بدون دعم Segmenter — نرجع null ونستخدم Array.from fallback
    }
  }
  return _cachedSegmenter;
}

function extractGraphemes(text: string): string[] {
  const seg = getGraphemeSegmenter();
  if (seg) {
    try {
      return Array.from(seg.segment(text)).map((s) => s.segment);
    } catch {
      // fallback
    }
  }
  return Array.from(text);
}

const RTL_GRAPHEME_RE = /[\u0590-\u08FF\uFB1D-\uFDFF\uFE70-\uFEFF]/;
const DIGITS_RE = /^\p{Nd}+$/u;
const LETTER_RE = /\p{L}/u;

type GlyphDirection = 'rtl' | 'ltr' | 'neutral';

function graphemeDirection(grapheme: string): GlyphDirection {
  // الأرقام تُعرض بترتيب LTR داخل السطر العربي — تُعامل كجُزء LTR مستقل
  if (DIGITS_RE.test(grapheme)) return 'ltr';
  if (RTL_GRAPHEME_RE.test(grapheme) && LETTER_RE.test(grapheme)) return 'rtl';
  if (LETTER_RE.test(grapheme)) return 'ltr';
  return 'neutral';
}

/** تقسيم النص إلى مقاطع اتجاهية — المسافات والعلامات تتبع المقطع السابق */
function splitDirectionalRuns(text: string): { text: string; rtl: boolean }[] {
  const runs: { text: string; rtl: boolean }[] = [];
  let pending = '';

  for (const grapheme of extractGraphemes(text)) {
    const dir = graphemeDirection(grapheme);
    if (dir === 'neutral') {
      if (runs.length > 0) runs[runs.length - 1].text += grapheme;
      else pending += grapheme;
      continue;
    }
    const rtl = dir === 'rtl';
    const last = runs[runs.length - 1];
    if (last && last.rtl === rtl) {
      last.text += grapheme;
    } else {
      runs.push({ text: pending + grapheme, rtl });
      pending = '';
    }
  }

  if (pending) {
    if (runs.length > 0) runs[runs.length - 1].text += pending;
    else runs.push({ text: pending, rtl: false });
  }
  return runs;
}

/**
 * ترتيب الحروف بصرياً على القوس: المقاطع المخالفة لاتجاه الفقرة تُعكس
 * حتى يبقى ترتيب الحروف اللاتينية/العربية داخلها صحيحاً (Bidi مبسّط).
 */
function buildCurvedGlyphs(text: string, baseRtl: boolean): string[] {
  const glyphs: string[] = [];
  for (const run of splitDirectionalRuns(text)) {
    const shaped = run.rtl ? shapeArabicGraphemes(run.text) : extractGraphemes(run.text);
    if (run.rtl !== baseRtl) shaped.reverse();
    glyphs.push(...shaped);
  }
  return glyphs;
}

// 🛡️ M18: `drawCurvedText` يُنادى من sceneFunc — أي كل إطار سحب/زوم/تحويل.
// بناء فلتر الحد الموحّد يحدث مرة واحدة لكل (strokeWidth, stroke) عبر
// `warmTextStrokeFilter`، ثم يُقرأ المعرّف من الكاش بلا أي DOM query لكل إطار.
const strokeFilterCache = new Map<string, string>();

function resolveStrokeFilter(strokeWidth: number, stroke: string): string {
  const key = `${strokeWidth}|${stroke}`;
  const cached = strokeFilterCache.get(key);
  if (cached) return cached;
  const filterId = warmTextStrokeFilter(strokeWidth, stroke);
  if (filterId) strokeFilterCache.set(key, filterId);
  return filterId;
}

// كانفاس مؤقت واحد يُعاد استخدامه بدل تخصيص واحد لكل إطار سحب/زوم.
// ينمو عند الحاجة فقط دون تقليص متكرر عند تناوب ملصقين منحنيين مختلفي الأبعاد.
let scratchCanvas: HTMLCanvasElement | null = null;

function getScratchContext(
  width: number,
  height: number,
): { ctx: CanvasRenderingContext2D; w: number; h: number } | null {
  if (typeof document === 'undefined') return null;
  try {
    if (!scratchCanvas) scratchCanvas = document.createElement('canvas');
    const w = Math.max(1, Math.ceil(width));
    const h = Math.max(1, Math.ceil(height));
    if (scratchCanvas.width < w || scratchCanvas.height < h) {
      scratchCanvas.width = Math.max(scratchCanvas.width, w);
      scratchCanvas.height = Math.max(scratchCanvas.height, h);
    }
    const sctx = scratchCanvas.getContext('2d');
    if (!sctx) return null;
    sctx.setTransform(1, 0, 0, 1, 0, 0);
    sctx.clearRect(0, 0, w, h);
    return { ctx: sctx, w, h };
  } catch {
    return null;
  }
}

/** صندوق حبر الحرف حول نقطة التوسيط (textAlign=center, baseline=middle). */
interface GlyphInkBox {
  left: number;
  right: number;
  ascent: number;
  descent: number;
}

interface CharTransform {
  char: string;
  charX: number;
  charY: number;
  rotation: number;
}

interface CurvedGlyphLayout {
  charTransforms: CharTransform[];
  hasInkBounds: boolean;
  inkMinX: number;
  inkMinY: number;
  inkMaxX: number;
  inkMaxY: number;
}

const MAX_CURVED_CACHE_ENTRIES = 128;
const shapedGlyphsCache = new Map<string, string[]>();
const curvedLayoutCache = new Map<string, CurvedGlyphLayout>();

function getCachedCurvedGlyphs(text: string, isRtl: boolean): string[] {
  const key = `${isRtl ? 'r' : 'l'}|${text}`;
  const cached = shapedGlyphsCache.get(key);
  if (cached) return cached;
  const shaped = buildCurvedGlyphs(text, isRtl);
  if (shapedGlyphsCache.size >= MAX_CURVED_CACHE_ENTRIES) {
    const oldest = shapedGlyphsCache.keys().next().value;
    if (oldest !== undefined) shapedGlyphsCache.delete(oldest);
  }
  shapedGlyphsCache.set(key, shaped);
  return shaped;
}

/** قياس متوافق: بعض المحركات لا توفّر صناديق الحبر الفعلية في TextMetrics. */
function inkExtent(value: number | undefined, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

/**
 * مقياس الرسم الفعلي لسياق الهدف (بكسل النقطة: DPR أو نسبة تصدير/طباعة) من
 * مصفوفة التحويل الحالية. hypot يُبطل أثر التدوير والقلب.
 */
function getContextRenderScale(ctx: CanvasRenderingContext2D): number {
  try {
    if (typeof ctx.getTransform !== 'function') return 1;
    const m = ctx.getTransform();
    if (!m) return 1;
    const s = Math.max(Math.hypot(m.a, m.b), Math.hypot(m.c, m.d));
    return Number.isFinite(s) ? Math.max(1, s) : 1;
  } catch {
    return 1;
  }
}

export function drawCurvedText(ctx: CanvasRenderingContext2D, options: CurvedTextOptions) {
  const {
    text,
    width,
    height,
    fontSize,
    fontFamily,
    fontWeight = 400,
    fontStyle = 'normal',
    color = TEXT_COLOR_DEFAULT,
    fillStyle,
    stroke,
    strokeWidth = 0,
    curve,
    letterSpacing = 0,
  } = options;

  if (!text || curve === 0) return;

  ctx.save();
  const fontStylePrefix = fontStyle === 'italic' ? 'italic ' : '';
  ctx.font = `${fontStylePrefix}${fontWeight} ${fontSize}px ${fontFamily}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const isArabic = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/.test(text);
  // الشكل يعتمد على وجود الحروف العربية، أما اتجاه سير الحروف فعلى أول محرف قوي.
  const isRtl = options.direction ? options.direction === 'rtl' : isArabic;

  // تشكيل عربي + ترتيب بصري للمقاطع المختلطة (لاتيني داخل عربي والعكس)
  const glyphs = getCachedCurvedGlyphs(text, isRtl);
  const numGlyphs = glyphs.length;
  if (numGlyphs === 0) {
    ctx.restore();
    return;
  }

  // Calculate arc parameters
  // Positive curve: center below, arches upward ⌢
  // Negative curve: center above, arches downward ⌣
  const normalizedCurve = Math.max(-100, Math.min(100, curve));
  const isUpward = normalizedCurve > 0;
  const effectiveSpacing = isArabic ? 0 : letterSpacing;
  const textAlign = options.textAlign || 'center';

  // قياس الحرف الأول كسبار (probe) يضمن بطلان الكاش تلقائياً فور تغيّر قياسات الخط المحمّل
  const firstMetrics = ctx.measureText(glyphs[0]);
  const layoutKey = `${ctx.font}|${isRtl ? 'r' : 'l'}|${width}|${height}|${normalizedCurve}|${textAlign}|${effectiveSpacing}|${firstMetrics.width}|${text}`;
  let layout = curvedLayoutCache.get(layoutKey);

  if (!layout) {
    // Measure glyph widths. Arabic spacing is already zeroed in the shared render
    // state (positive values become extra word spaces); keep a guard here so a
    // direct caller cannot break ligatures by adding per-letter gaps.
    const glyphWidths: number[] = [];
    const glyphInk: GlyphInkBox[] = [];
    let totalTextWidth = 0;

    for (let i = 0; i < numGlyphs; i++) {
      const metrics = i === 0 ? firstMetrics : ctx.measureText(glyphs[i]);
      const advance = metrics.width;
      const glyphW = advance + effectiveSpacing;
      glyphWidths.push(glyphW);
      totalTextWidth += glyphW;
      // حبر الحرف حول نقطة التوسيط: أفقيّاً من -Left إلى +Right، ورأسيّاً من
      // -Ascent إلى +Descent؛ مع تقدير آمن حين تغيب القياسات الفعلية.
      glyphInk.push({
        left: inkExtent(metrics.actualBoundingBoxLeft, advance / 2),
        right: inkExtent(metrics.actualBoundingBoxRight, advance / 2),
        ascent: inkExtent(metrics.actualBoundingBoxAscent, fontSize * 0.9),
        descent: inkExtent(metrics.actualBoundingBoxDescent, fontSize * 0.4),
      });
    }

    const { radius, angularSpan, sagitta } = getCurvedTextMetrics(
      totalTextWidth,
      width,
      fontSize,
      normalizedCurve,
    );

    // Center of curvature — منتصف كتلة الحروف على القوس يساوي منتصف الصندوق،
    // فتكون كتلة النص متمركزة رأسياً وقابلة لاحتواء ارتفاع طبيعي = lineBox + sagitta.
    const centerX = width / 2;
    const centerY = isUpward
      ? height / 2 + radius - sagitta / 2
      : height / 2 - radius + sagitta / 2;

    // Start angle & step direction:
    // For LTR (Latin): starts from Left side, advances towards Right
    // For RTL (Arabic): starts from Right side, advances towards Left so it reads right-to-left naturally!
    // #7 — textAlign: left/right يُزيح نقطة البداية على القوس بنصف العرض الزاوي؛ center = الافتراضي
    const alignOffset =
      textAlign === 'left'
        ? angularSpan / 2 // ابدأ من أقصى اليسار (نص بالكامل في النصف الأيمن)
        : textAlign === 'right'
          ? -angularSpan / 2 // ابدأ من أقصى اليمين (نص بالكامل في النصف الأيسر)
          : 0; // center: متمركز على القوس (الوضع الافتراضي)

    let currentAngle: number;
    if (isRtl) {
      if (isUpward) {
        currentAngle = -Math.PI / 2 + angularSpan / 2 + alignOffset; // Start top-right
      } else {
        currentAngle = Math.PI / 2 - angularSpan / 2 - alignOffset; // Start bottom-right
      }
    } else {
      if (isUpward) {
        currentAngle = -Math.PI / 2 - angularSpan / 2 + alignOffset; // Start top-left
      } else {
        currentAngle = Math.PI / 2 + angularSpan / 2 - alignOffset; // Start bottom-left
      }
    }

    const charTransforms: CharTransform[] = [];
    let inkMinX = Infinity;
    let inkMinY = Infinity;
    let inkMaxX = -Infinity;
    let inkMaxY = -Infinity;

    for (let i = 0; i < numGlyphs; i++) {
      const char = glyphs[i];
      const glyphW = glyphWidths[i];
      const charAngle = glyphW / radius;

      let midAngle: number;
      if (isRtl) {
        // Step leftward
        midAngle = isUpward ? currentAngle - charAngle / 2 : currentAngle + charAngle / 2;
      } else {
        // Step rightward
        midAngle = isUpward ? currentAngle + charAngle / 2 : currentAngle - charAngle / 2;
      }

      const charX = centerX + Math.cos(midAngle) * radius;
      const charY = centerY + Math.sin(midAngle) * radius;
      const rotation = isUpward ? midAngle + Math.PI / 2 : midAngle - Math.PI / 2;

      charTransforms.push({ char, charX, charY, rotation });

      const ink = glyphInk[i];
      const cos = Math.cos(rotation);
      const sin = Math.sin(rotation);
      for (const localX of [-ink.left, ink.right]) {
        for (const localY of [-ink.ascent, ink.descent]) {
          const px = charX + localX * cos - localY * sin;
          const py = charY + localX * sin + localY * cos;
          if (px < inkMinX) inkMinX = px;
          if (py < inkMinY) inkMinY = py;
          if (px > inkMaxX) inkMaxX = px;
          if (py > inkMaxY) inkMaxY = py;
        }
      }

      if (isRtl) {
        if (isUpward) {
          currentAngle -= charAngle;
        } else {
          currentAngle += charAngle;
        }
      } else {
        if (isUpward) {
          currentAngle += charAngle;
        } else {
          currentAngle -= charAngle;
        }
      }
    }

    const hasInkBounds =
      Number.isFinite(inkMinX) &&
      Number.isFinite(inkMinY) &&
      Number.isFinite(inkMaxX) &&
      Number.isFinite(inkMaxY);

    layout = { charTransforms, hasInkBounds, inkMinX, inkMinY, inkMaxX, inkMaxY };
    if (curvedLayoutCache.size >= MAX_CURVED_CACHE_ENTRIES) {
      const oldest = curvedLayoutCache.keys().next().value;
      if (oldest !== undefined) curvedLayoutCache.delete(oldest);
    }
    curvedLayoutCache.set(layoutKey, layout);
  }

  const { charTransforms, hasInkBounds, inkMinX, inkMinY, inkMaxX, inkMaxY } = layout;

  // تطبيق الحدود الموحدة عبر فلتر التمدد لمنع تشوه تقاطعات الحروف.
  // الفلتر يُطبَّق على عملية رسم واحدة، لذا نرسم كل الحروف على كانفاس مؤقت
  // ثم نرسمه مرة واحدة — تطبيقه على كل حرف منفرداً كان يقطع الوصلات.
  const filterId = stroke && strokeWidth > 0 ? resolveStrokeFilter(strokeWidth, stroke) : '';

  const paintGlyphs = (target: CanvasRenderingContext2D, glyphFill: CurvedTextFill | undefined) => {
    for (const { char, charX, charY, rotation } of charTransforms) {
      target.save();
      target.translate(charX, charY);
      target.rotate(rotation);
      target.fillStyle =
        typeof glyphFill === 'function'
          ? glyphFill(target, { x: charX, y: charY, rotation: (rotation * 180) / Math.PI })
          : (glyphFill ?? color);
      target.fillText(char, 0, 0);
      target.restore();
    }
  };

  let unifiedStroke = false;
  if (filterId && typeof ctx.drawImage === 'function') {
    // حدود الكانفاس المؤقت تحيط بحبر الحروف المدوّرة لا بصندوق العنصر: القوس
    // يرفع/يخفض الحروف عمودياً وقد يتجاوز الحبر الصندوق فيُقصّ بصمت. نأخذ
    // اتحاد صناديق الحبر المحلية بعد تدويرها حول مركز كل حرف، ثم نضيف هامش
    // نصف قطر الفلتر كي يظهر التمدد كاملاً.
    const pad = Math.ceil(strokeWidth) + 2;
    // احتياط كامل الصندوق إن تعذّر حساب الاتحاد (لا يفترض ألا يحدث)
    const originX = hasInkBounds ? inkMinX - pad : -pad;
    const originY = hasInkBounds ? inkMinY - pad : -pad;
    const boxW = (hasInkBounds ? Math.max(1, inkMaxX - inkMinX) : width) + pad * 2;
    const boxH = (hasInkBounds ? Math.max(1, inkMaxY - inkMinY) : height) + pad * 2;
    // الرسم بمقياس النقطة الفعلي للهدف (DPR أو تصدير) ثم إعادته بحجمه
    // المنطقي؛ بدون ذلك يُكبَّر الرسم المؤقت بعد تجسيده فيبدو الحد رمادياً
    // على الشاشات عالية الدقة وفي ملفات الطباعة الكبيرة. سقف ميزانية البكسل
    // هو نفسه سقف التصدير، فيمنع تخصيص كانفاس مؤقت هائل لعنصر عملاق.
    const renderScale = Math.min(
      getContextRenderScale(ctx),
      Math.sqrt(MAX_EXPORT_PIXELS / Math.max(1, boxW * boxH)),
    );
    const scratch = getScratchContext(boxW * renderScale, boxH * renderScale);
    if (scratch) {
      const { ctx: offCtx, w: offW, h: offH } = scratch;
      // تحويل واحد: إحداثيات العنصر تبقى كما هي (وهو ما تتوقعه paintGlyphs
      // والتدرجات والنقوش) مع مقياس نقطة يساوي مقياس سياق الهدف.
      offCtx.setTransform(
        renderScale,
        0,
        0,
        renderScale,
        -renderScale * originX,
        -renderScale * originY,
      );
      offCtx.font = `${fontStylePrefix}${fontWeight} ${fontSize}px ${fontFamily}`;
      offCtx.textAlign = 'center';
      offCtx.textBaseline = 'middle';
      const offFill = options.createFill ? options.createFill(offCtx) : fillStyle;
      paintGlyphs(offCtx, offFill);
      ctx.save();
      ctx.filter = `url(#${filterId})`;
      ctx.drawImage(scratchCanvas!, 0, 0, offW, offH, originX, originY, boxW, boxH);
      ctx.restore();
      unifiedStroke = true;
    }
  }

  if (!unifiedStroke) {
    const paint = options.createFill ? options.createFill(ctx) : fillStyle;
    if (filterId) {
      ctx.filter = `url(#${filterId})`;
    }
    paintGlyphs(ctx, paint);
    if (filterId) {
      ctx.filter = 'none';
    }
  }

  ctx.restore();
}
