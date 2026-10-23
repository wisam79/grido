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
