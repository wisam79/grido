/**
 * هندسة مقابض محوّل Konva المشتركة بين الربط (editor-transformer) وتثبيت
 * التحويل في المتجر (konva-overlay-layer).
 *
 * القاعدة: زوايا النص الأربعة تُحجّم الكتلة تناسبياً (fontSize + العرض)، بينما
 * منتصفات الحواف تضبط بعداً واحداً — العرض فقط، لأن ارتفاع النص مشتق من محتواه.
 */
import type { TextResizeAnchor } from '@/lib/store/types';

const CORNER_ANCHORS: ReadonlySet<string> = new Set([
  'top-left',
  'top-right',
  'bottom-left',
  'bottom-right',
]);

export function isCornerAnchor(anchor: string | null | undefined): boolean {
  return typeof anchor === 'string' && CORNER_ANCHORS.has(anchor);
}

const OPPOSITE_CORNER: Record<TextResizeAnchor, TextResizeAnchor> = {
  'top-left': 'bottom-right',
  'top-right': 'bottom-left',
  'bottom-left': 'top-right',
  'bottom-right': 'top-left',
};

/**
 * الركن المقابل للمقبض المسحوب — هو الذي يجب أن يبقى ثابتاً بعد التحجيم.
 * أي مقبض غير زاوية (منتصف حافة/تدوير) لا يثبّت ركناً.
 */
export function oppositeCornerAnchor(anchor: string | null | undefined): TextResizeAnchor | null {
  return isCornerAnchor(anchor) ? OPPOSITE_CORNER[anchor as TextResizeAnchor] : null;
}

export interface TransformerBox {
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
}

/**
 * قيد الصندوق المحيط في `EditorTransformer.boundBoxFunc`:
 * - يحافظ على تدوير مقبض `rotater` الأصلي في Konva (`rotateAroundCenter`) بلا أي إسقاط.
 * - يسمح لزوايا النص بتحجيم الكتلة تناسبياً.
 * - يثبّت ارتفاع النص ويسقط إزاحة الأصل على المحور المحلي `x` لمقابض الحواف فقط.
 */
export function constrainTransformerBox(
  oldBox: TransformerBox,
  newBox: TransformerBox,
  isText: boolean,
  activeAnchor: string | null | undefined,
): TransformerBox {
  if (Math.abs(newBox.width) < 10) return oldBox;
  if (isText) {
    if (activeAnchor === 'rotater') {
      return newBox;
    }
    if (isCornerAnchor(activeAnchor)) {
      if (Math.abs(newBox.height) < 10) return oldBox;
      return newBox;
    }
    if (!Number.isFinite(oldBox.x) || !Number.isFinite(oldBox.y)) return newBox;
    const cos = Math.cos(newBox.rotation);
    const sin = Math.sin(newBox.rotation);
    const dx = newBox.x - oldBox.x;
    const dy = newBox.y - oldBox.y;
    const alongWidth = dx * cos + dy * sin;
    return {
      ...newBox,
      x: oldBox.x + alongWidth * cos,
      y: oldBox.y + alongWidth * sin,
      height: oldBox.height,
    };
  }
  if (Math.abs(newBox.height) < 10) return oldBox;
  return newBox;
}
