/**
 * ملاءمة صندوق النص مع محتواه — مصدر واحد للقياس والهندسة.
 *
 * الوضع `auto` يجعل العرض يلتصق بأطول سطر والارتفاع بحجم الكتلة الفعلي،
 * والوضع `fixed` يثبّت العرض فقط ويُبقي الارتفاع متكيفاً مع المحتوى.
 * افتراضياً تحافظ التعديلات على مركز العرض (مع مراعاة الدوران) وعلى أعلى
 * الصندوق؛ أما نص حُجّمت زاويته فيحمل `textResizeAnchor` فيُثبَّت ذلك الركن
 * بدلاً من المركز عبر كل إعادة قياس لاحقة.
 */

import { curvedTextNaturalHeightPx } from './curved-text-metrics';
import { resolveTextRenderState } from './text-helpers';
import { measureTextHeightPx, measureTextWidthPx } from './text-measure';

import type { TextMeasureSpec } from './text-measure';
import type { TextElement, TextResizeAnchor } from '@/lib/store/types';

/** أقل عرض لصندوق نص قابل للتحجيم بمقابض الحواف */
export const AUTO_TEXT_MIN_WIDTH_PX = 24;
/** أقصى عرض تلقائي كنسبة من عرض الكانفس — يحمي من سطر عابر للورقة */
export const AUTO_TEXT_MAX_WIDTH_RATIO = 0.95;

export type TextSizing = 'auto' | 'fixed';

export interface TextStyleSource {
  text: string;
  fontSize?: number;
  fontWeight?: number;
  fontStyle?: 'normal' | 'italic';
  fontFamily?: string;
  lineHeight?: number;
  letterSpacing?: number;
  textAlign?: 'right' | 'center' | 'left';
  textTransform?: TextElement['textTransform'];
  arabicNumerals?: boolean;
  wrap?: TextElement['wrap'];
  curve?: number;
  strokeWidth?: number;
}

export interface TextFitSource extends TextStyleSource {
  width: number;
  height: number;
  x: number;
  y: number;
  rotation?: number;
  textSizing?: TextSizing;
}

export interface TextFitGeometry {
  /** أبعاد الصندوق المنسوبة للكانفس */
  width: number;
  height: number;
  /** موضع جديد يحافظ على مركز العرض وأعلى الصندوق */
  x: number;
  y: number;
  widthPx: number;
  heightPx: number;
  /** false إذا تعذر القياس (بيئة بلا Canvas) وأُبقيت الأبعاد الحالية */
  measured: boolean;
}

export function resolveTextSizing(source: Pick<TextFitSource, 'textSizing'>): TextSizing {
  return source.textSizing === 'auto' ? 'auto' : 'fixed';
}

/**
 * إزاحة أصل الصندوق بالبكسل (في فضاء الكانفس) التي تُبقي ركن الارتساء ثابتاً
 * عند تغيّر أبعاد الصندوق. الركن يُحدَّد في فضاء الصندوق المحلي ثم يُسقَط على
 * متجهَي المحورين بعد الدوران، فتبقى النتيجة صحيحة لأي زاوية.
 *
 * بلا ركن ارتساء: السلوك التاريخي — العرض ينمو حول المركز، والارتفاع للأسفل.
 */
export function resolveTextBoxAnchorOffsetPx(
  anchor: TextResizeAnchor | undefined,
  oldWidthPx: number,
  oldHeightPx: number,
  newWidthPx: number,
  newHeightPx: number,
  rotationDeg = 0,
): { dxPx: number; dyPx: number } {
  const rad = (rotationDeg * Math.PI) / 180;
  const ux = Math.cos(rad);
  const uy = Math.sin(rad);
  const vx = -Math.sin(rad);
  const vy = Math.cos(rad);

  let localDx: number;
  let localDy = 0;
  if (anchor) {
    // يمين ← الحافة اليمنى ثابتة فتُزاح الأصل بمقدار فرق العرض كاملاً.
    localDx = anchor.endsWith('right') ? oldWidthPx - newWidthPx : 0;
    // أسفل ← الحافة السفلية ثابتة؛ أعلى ← الأصل لا يتحرك رأسياً.
    localDy = anchor.startsWith('bottom') ? oldHeightPx - newHeightPx : 0;
  } else {
    localDx = (oldWidthPx - newWidthPx) / 2;
  }

  return {
    dxPx: localDx * ux + localDy * vx,
    dyPx: localDx * uy + localDy * vy,
  };
}

export function clampAutoTextWidthPx(widthPx: number, canvasWidth: number): number {
  const safeCanvas = Number.isFinite(canvasWidth) && canvasWidth > 0 ? canvasWidth : widthPx;
  const maxPx = Math.max(AUTO_TEXT_MIN_WIDTH_PX, safeCanvas * AUTO_TEXT_MAX_WIDTH_RATIO);
  return Math.min(Math.max(AUTO_TEXT_MIN_WIDTH_PX, widthPx), maxPx);
}

function buildMeasureSpec(source: TextStyleSource, text: string): TextMeasureSpec {
  const state = resolveTextRenderState({
    text,
    arabicNumerals: source.arabicNumerals,
    letterSpacing: source.letterSpacing,
    textTransform: source.textTransform,
  });
  return {
    text: state.text,
    fontFamily: source.fontFamily || 'sans-serif',
    fontSize: source.fontSize || 16,
    fontWeight: source.fontWeight,
    fontStyle: source.fontStyle,
    lineHeight: source.lineHeight ?? 1.2,
    letterSpacing: state.letterSpacing,
    align: source.textAlign || 'center',
    wrap: source.wrap || 'word',
    direction: state.direction,
  };
}

/** عرض أطول سطر بلا التفاف، مع هامش أمان لسمك الحد. */
export function measureTextNaturalWidthPx(source: TextStyleSource, text?: string): number | null {
  const measured = measureTextWidthPx({
    ...buildMeasureSpec(source, text ?? source.text),
    wrap: 'none',
  });
  if (measured == null) return null;
  return Math.ceil(measured + Math.max(0, source.strokeWidth || 0)) + 2;
}

/** ارتفاع كتلة النص عند عرض معيّن — مستقيم أو منحنٍ. */
export function measureTextContentHeightPx(
  source: TextStyleSource,
  widthPx: number,
  text?: string,
): number | null {
  if (!Number.isFinite(widthPx) || widthPx <= 0) return null;
  const spec = buildMeasureSpec(source, text ?? source.text);
  const curve = source.curve || 0;
  if (curve !== 0) {
    const totalTextWidthPx = measureTextWidthPx({ ...spec, wrap: 'none' });
    if (totalTextWidthPx == null) return null;
    return curvedTextNaturalHeightPx(
      totalTextWidthPx,
      widthPx,
      source.fontSize || 16,
      curve,
      source.lineHeight ?? 1.2,
      source.strokeWidth || 0,
    );
  }
  return measureTextHeightPx(spec, widthPx);
}

/**
 * أبعاد وموضع الصندوق الملائم للمحتوى. يُرجع القيم الحالية كما هي إذا تعذر
 * القياس، فلا تُتلف هندسة مستند في بيئة اختبار بلا Canvas.
 */
export function fitTextGeometry(
  source: TextFitSource,
  canvasWidth: number,
  canvasHeight: number,
): TextFitGeometry | null {
  if (!(canvasWidth > 0) || !(canvasHeight > 0)) return null;

  const sizing = resolveTextSizing(source);
  const oldWidthPx = Math.max(1, source.width * canvasWidth);
  const oldHeightPx = Math.max(1, source.height * canvasHeight);
  const naturalWidthPx = measureTextNaturalWidthPx(source);
  const widthPx =
    sizing === 'auto'
      ? naturalWidthPx == null
        ? oldWidthPx
        : clampAutoTextWidthPx(naturalWidthPx, canvasWidth)
      : oldWidthPx;
  const contentHeightPx = measureTextContentHeightPx(source, widthPx);
  const heightPx = contentHeightPx ?? oldHeightPx;

  // توسّع العرض يتمحور حول مركزه؛ الارتفاع ينمو للأسفل. مع الدوران تُزاح
  // الأصل بمقدار نصف فرق العرض عكس اتجاه المحور المحلي.
  const deltaWidthPx = widthPx - oldWidthPx;
  const rad = ((source.rotation || 0) * Math.PI) / 180;
  const x = source.x - (Math.cos(rad) * deltaWidthPx) / 2 / canvasWidth;
  const y = source.y - (Math.sin(rad) * deltaWidthPx) / 2 / canvasHeight;

  return {
    width: widthPx / canvasWidth,
    height: heightPx / canvasHeight,
    x,
    y,
    widthPx,
    heightPx,
    measured: naturalWidthPx != null || contentHeightPx != null,
  };
}
