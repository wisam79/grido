/**
 * قياس أبعاد النص الطبيعي عبر عقدة Konva.Text معزولة (Offscreen).
 *
 * لا يجوز اشتقاق الارتفاع من عقدة العرض نفسها عندما يكون لها height ثابت:
 * Konva يتوقف عن إضافة الأسطر بعد تجاوز maxHeight (Text.js: `_shouldHandleEllipsis`)،
 * كما أن `textHeight` يساوي fontSize وليس ارتفاع الكتلة. لذلك نقيس على عقدة
 * بـ height='auto' دائماً ثم نمرّر الناتج للعرض والستور.
 */

import Konva from 'konva';

export interface TextMeasureSpec {
  text: string;
  fontFamily?: string;
  fontSize?: number;
  fontWeight?: number;
  fontStyle?: 'normal' | 'italic';
  lineHeight?: number;
  letterSpacing?: number;
  align?: 'left' | 'center' | 'right' | 'justify';
  wrap?: 'word' | 'char' | 'none';
  direction?: 'ltr' | 'rtl' | 'inherit';
}

/** يبني سلسلة fontStyle بنفس صيغة عقدة العرض تماماً (italic + weight). */
export function buildKonvaFontStyle(fontWeight?: number, fontStyle?: 'normal' | 'italic'): string {
  return [fontStyle === 'italic' ? 'italic' : '', fontWeight ? String(fontWeight) : '400']
    .filter(Boolean)
    .join(' ');
}

let measurer: Konva.Text | null = null;
let measurerUnavailable = false;

function getMeasurer(): Konva.Text | null {
  if (measurer) return measurer;
  if (measurerUnavailable) return null;
  try {
    measurer = new Konva.Text({ text: '', fontSize: 16, padding: 0 });
    return measurer;
  } catch {
    // بيئات بلا Canvas حقيقي (jsdom) — تعود القياسات null ليستخدم المتصل بديلاً
    measurerUnavailable = true;
    return null;
  }
}

function applySpec(
  node: Konva.Text,
  spec: TextMeasureSpec,
  widthPx: number | 'auto',
  wrap: 'word' | 'char' | 'none',
): void {
  node.setAttrs({
    text: spec.text ?? '',
    fontFamily: spec.fontFamily || 'sans-serif',
    fontSize: spec.fontSize || 16,
    fontStyle: buildKonvaFontStyle(spec.fontWeight, spec.fontStyle),
    lineHeight: spec.lineHeight ?? 1.2,
    letterSpacing: spec.letterSpacing || 0,
    align: spec.align || 'left',
    wrap,
    direction: spec.direction || 'inherit',
    padding: 0,
    textDecoration: '',
  });
  // width/height قد تكون 'auto' وهي غير مدرجة في أنواع TextConfig لهذا الإصدار
  node.setAttr('width', widthPx as unknown as number);
  node.setAttr('height', 'auto' as unknown as number);
  // setAttrs لا يعيد الحساب إذا كانت القيم مطابقة (مثلاً بعد تحميل خط جديد)،
  // لذلك نفرض إعادة القياس صراحةً حتى تلتقط المقاييس الخط النشط حالياً.
  (node as Konva.Text & { _setTextData?: () => void })._setTextData?.();
}

/** ارتفاع الكتلة الكامل بالبكسل لعرض معيّن، أو null إذا تعذّر القياس. */
export function measureTextHeightPx(spec: TextMeasureSpec, widthPx: number): number | null {
  if (!Number.isFinite(widthPx) || widthPx <= 0) return null;
  const node = getMeasurer();
  if (!node) return null;
  try {
    applySpec(node, spec, widthPx, spec.wrap || 'word');
    const height = node.height();
    return Number.isFinite(height) && height > 0 ? height : null;
  } catch {
    return null;
  }
}

/**
 * أوسع سطر بالبكسل دون التفاف (سطر واحد لكل \n)، أو null إذا تعذّر القياس.
 * تُستخدم لملاءمة صندوق النص تلقائياً مع نفس خط الكانفس.
 */
export function measureTextWidthPx(spec: TextMeasureSpec): number | null {
  const node = getMeasurer();
  if (!node) return null;
  try {
    applySpec(node, spec, 'auto', 'none');
    const width = node.getWidth();
    return Number.isFinite(width) && width > 0 ? width : null;
  } catch {
    return null;
  }
}
