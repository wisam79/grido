/**
 * Utility for drawing curved text along an arc on standard HTML5 Canvas 2D / Konva
 * Supports connected Arabic ligatures (via contextual shaping) and RTL flow.
 */
import { TEXT_COLOR_DEFAULT } from "./canvas-colors";
import { ensureTextStrokeFilter } from "./text-stroke-filter";

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
  stroke?: string;
  strokeWidth?: number;
  textAlign?: "left" | "center" | "right";
  curve: number; // -100 to 100
  letterSpacing?: number;
}

// Arabic contextual shapes: [isolated, initial, medial, final]
const ARABIC_FORMS_MAP: Record<string, (string | null)[]> = {
  "\u0621": ["\uFE80"], // Hamza
  "\u0622": ["\uFE81", null, null, "\uFE82"], // Alef with madda
  "\u0623": ["\uFE83", null, null, "\uFE84"], // Alef with hamza above
  "\u0624": ["\uFE85", null, null, "\uFE86"], // Waw with hamza
  "\u0625": ["\uFE87", null, null, "\uFE88"], // Alef with hamza below
  "\u0626": ["\uFE89", "\uFE8B", "\uFE8C", "\uFE8A"], // Yeh with hamza
  "\u0627": ["\uFE8D", null, null, "\uFE8E"], // Alef
  "\u0628": ["\uFE8F", "\uFE91", "\uFE92", "\uFE90"], // Beh
  "\u0629": ["\uFE93", null, null, "\uFE94"], // Teh marbuta
  "\u062A": ["\uFE95", "\uFE97", "\uFE98", "\uFE96"], // Teh
  "\u062B": ["\uFE99", "\uFE9B", "\uFE9C", "\uFE9A"], // Theh
  "\u062C": ["\uFE9D", "\uFE9F", "\uFEA0", "\uFE9E"], // Jeem
  "\u062D": ["\uFEA1", "\uFEA3", "\uFEA4", "\uFEA2"], // Hah
  "\u062E": ["\uFEA5", "\uFEA7", "\uFEA8", "\uFEA6"], // Khah
  "\u062F": ["\uFEA9", null, null, "\uFEAA"], // Dal
  "\u0630": ["\uFEAB", null, null, "\uFEAC"], // Thal
  "\u0631": ["\uFEAD", null, null, "\uFEAE"], // Reh
  "\u0632": ["\uFEAF", null, null, "\uFEB0"], // Zain
  "\u0633": ["\uFEB1", "\uFEB3", "\uFEB4", "\uFEB2"], // Seen
  "\u0634": ["\uFEB5", "\uFEB7", "\uFEB8", "\uFEB6"], // Sheen
  "\u0635": ["\uFEB9", "\uFEBB", "\uFEBC", "\uFEBA"], // Sad
  "\u0636": ["\uFEBD", "\uFEBF", "\uFEC0", "\uFEBE"], // Dad
  "\u0637": ["\uFEC1", "\uFEC3", "\uFEC4", "\uFEC2"], // Tah
  "\u0638": ["\uFEC5", "\uFEC7", "\uFEC8", "\uFEC6"], // Zah
  "\u0639": ["\uFEC9", "\uFECB", "\uFECC", "\uFECA"], // Ain
  "\u063A": ["\uFECD", "\uFECF", "\uFED0", "\uFECE"], // Ghain
  "\u0641": ["\uFED1", "\uFED3", "\uFED4", "\uFED2"], // Feh
  "\u0642": ["\uFED5", "\uFED7", "\uFED8", "\uFED6"], // Qaf
  "\u0643": ["\uFED9", "\uFEDB", "\uFEDC", "\uFEDA"], // Kaf
  "\u0644": ["\uFEDD", "\uFEDF", "\uFEE0", "\uFEDE"], // Lam
  "\u0645": ["\uFEE1", "\uFEE3", "\uFEE4", "\uFEE2"], // Meem
  "\u0646": ["\uFEE5", "\uFEE7", "\uFEE8", "\uFEE6"], // Noon
  "\u0647": ["\uFEE9", "\uFEEB", "\uFEEC", "\uFEEA"], // Heh
  "\u0648": ["\uFEED", null, null, "\uFEEE"], // Waw
  "\u0649": ["\uFEEF", null, null, "\uFEF0"], // Alef Maksura
  "\u064A": ["\uFEF1", "\uFEF3", "\uFEF4", "\uFEF2"], // Yeh
  "\u067E": ["\uFB56", "\uFB58", "\uFB59", "\uFB57"], // Peh
  "\u0686": ["\uFB7A", "\uFB7C", "\uFB7D", "\uFB7B"], // Tcheh
  "\u0698": ["\uFB8A", null, null, "\uFB8B"], // Jeh
  "\u06AF": ["\uFB92", "\uFB94", "\uFB95", "\uFB93"], // Gaf
};

// Lam-Alef ligatures: [isolated, final]
const LAM_ALEF_MAP: Record<string, [string, string]> = {
  "\u0622": ["\uFEF5", "\uFEF6"], // l + madda
  "\u0623": ["\uFEF7", "\uFEF8"], // l + hamza above
  "\u0625": ["\uFEF9", "\uFEFA"], // l + hamza below
  "\u0627": ["\uFEFB", "\uFEFC"], // l + alef
};

// Strips diacritics for shape matching while preserving them on the glyph
const TASHKEEL_REGEX = /[\u064B-\u065F\u0670]/g;

function shapeArabicGraphemes(text: string): string[] {
  const chars = Array.from(text);
  const out: string[] = [];

  for (let i = 0; i < chars.length; i++) {
    const rawCluster = chars[i];
    const baseChar = rawCluster.replace(TASHKEEL_REGEX, "");
    const diacritics = rawCluster.slice(baseChar.length);

    // Look behind & ahead ignoring spaces/diacritics
    let prevChar: string | null = null;
    for (let p = i - 1; p >= 0; p--) {
      const b = chars[p].replace(TASHKEEL_REGEX, "");
      if (b !== " ") { prevChar = b; break; }
      break; // Space breaks connection
    }

    let nextChar: string | null = null;
    for (let n = i + 1; n < chars.length; n++) {
      const b = chars[n].replace(TASHKEEL_REGEX, "");
      if (b !== " ") { nextChar = b; break; }
      break; // Space breaks connection
    }

    // Check Lam-Alef ligature
    if (baseChar === "\u0644" && nextChar && LAM_ALEF_MAP[nextChar]) {
      const prevShapes = prevChar && ARABIC_FORMS_MAP[prevChar];
      const prevConnects = prevShapes && (prevShapes[1] || prevShapes[2]);
      const shapedLigature = prevConnects ? LAM_ALEF_MAP[nextChar][1] : LAM_ALEF_MAP[nextChar][0];
      // #13 — إلحاق تشكيل الألف أيضاً (كان يُرمى مع تخطّي حرف الألف)
      const alefChar = chars[i + 1] || "";
      const alefBase = alefChar.replace(TASHKEEL_REGEX, "");
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
  if (typeof Intl !== "undefined" && typeof Intl.Segmenter === "function") {
    try {
      _cachedSegmenter = new Intl.Segmenter(undefined, { granularity: "grapheme" });
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

export function drawCurvedText(
  ctx: CanvasRenderingContext2D,
  options: CurvedTextOptions
) {
  const {
    text,
    width,
    height,
    fontSize,
    fontFamily,
    fontWeight = 400,
    fontStyle = "normal",
    color = TEXT_COLOR_DEFAULT,
    stroke,
    strokeWidth = 0,
    curve,
    letterSpacing = 0,
  } = options;

  if (!text || curve === 0) return;

  ctx.save();
  const fontStylePrefix = fontStyle === "italic" ? "italic " : "";
  ctx.font = `${fontStylePrefix}${fontWeight} ${fontSize}px ${fontFamily}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  const isArabic = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/.test(text);

  // Use shaped graphemes for Arabic, standard graphemes for Latin/other
  const glyphs = isArabic ? shapeArabicGraphemes(text) : extractGraphemes(text);
  const numGlyphs = glyphs.length;
  if (numGlyphs === 0) {
    ctx.restore();
    return;
  }

  // Calculate arc parameters
  // Positive curve: center below, arches upward ⌢
  // Negative curve: center above, arches downward ⌣
  const normalizedCurve = Math.max(-100, Math.min(100, curve));
  const curvatureRatio = Math.abs(normalizedCurve) / 100;
  const isUpward = normalizedCurve > 0;

  // Arc radius based on width and curvature
  const minRadius = Math.max(fontSize * 1.5, width * 0.4);
  const maxRadius = width * 3.5;
  const radius = maxRadius - curvatureRatio * (maxRadius - minRadius);

  // Measure glyph widths (in Arabic, reduce letter spacing slightly to ensure connecting ligatures touch)
  const glyphWidths: number[] = [];
  let totalTextWidth = 0;
  const effectiveSpacing = isArabic ? Math.min(0, letterSpacing) : letterSpacing;

  for (let i = 0; i < numGlyphs; i++) {
    const glyphW = ctx.measureText(glyphs[i]).width + effectiveSpacing;
    glyphWidths.push(glyphW);
    totalTextWidth += glyphW;
  }

  // Calculate total angular span
  const maxAngle = Math.PI * 1.6;
  const angularSpan = Math.min(maxAngle, totalTextWidth / radius);

  // Center of curvature
  const centerX = width / 2;
  const centerY = isUpward ? height / 2 + radius - fontSize / 2 : height / 2 - radius + fontSize / 2;

  // Start angle & step direction:
  // For LTR (Latin): starts from Left side, advances towards Right
  // For RTL (Arabic): starts from Right side, advances towards Left so it reads right-to-left naturally!
  // #7 — textAlign: left/right يُزيح نقطة البداية على القوس بنصف العرض الزاوي؛ center = الافتراضي
  const textAlign = options.textAlign || "center";
  const alignOffset = textAlign === "left"
    ? angularSpan / 2         // ابدأ من أقصى اليسار (نص بالكامل في النصف الأيمن)
    : textAlign === "right"
    ? -angularSpan / 2        // ابدأ من أقصى اليمين (نص بالكامل في النصف الأيسر)
    : 0;                      // center: متمركز على القوس (الوضع الافتراضي)

  let currentAngle: number;
  if (isArabic) {
    if (isUpward) {
      currentAngle = -Math.PI / 2 + (angularSpan / 2) + alignOffset; // Start top-right
    } else {
      currentAngle = Math.PI / 2 - (angularSpan / 2) - alignOffset; // Start bottom-right
    }
  } else {
    if (isUpward) {
      currentAngle = -Math.PI / 2 - (angularSpan / 2) + alignOffset; // Start top-left
    } else {
      currentAngle = Math.PI / 2 + (angularSpan / 2) - alignOffset; // Start bottom-left
    }
  }

  interface CharTransform {
    char: string;
    charX: number;
    charY: number;
    rotation: number;
  }
  const charTransforms: CharTransform[] = [];

  for (let i = 0; i < numGlyphs; i++) {
    const char = glyphs[i];
    const glyphW = glyphWidths[i];
    const charAngle = glyphW / radius;

    let midAngle: number;
    if (isArabic) {
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

    if (isArabic) {
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

  // تطبيق الحدود الموحدة عبر فلتر التمدد لمنع تشوه تقاطعات الحروف
  const filterId = stroke && strokeWidth > 0 ? ensureTextStrokeFilter(strokeWidth, stroke) : "";
  if (filterId) {
    ctx.filter = `url(#${filterId})`;
  }

  // رسم تعبئة النص فوق الخلفية مع الحدود الموحدة
  ctx.fillStyle = color;
  for (let i = 0; i < charTransforms.length; i++) {
    const { char, charX, charY, rotation } = charTransforms[i];
    ctx.save();
    ctx.translate(charX, charY);
    ctx.rotate(rotation);
    ctx.fillText(char, 0, 0);
    ctx.restore();
  }

  if (filterId) {
    ctx.filter = "none";
  }

  ctx.restore();
}
