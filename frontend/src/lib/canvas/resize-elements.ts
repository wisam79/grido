/**
 * lib/canvas/resize-elements — إعادة تموضع عناصر الوضع الحر عند تغيير مقاس الكانفس.
 *
 * إحداثيات العناصر نسبية (0..1) من أبعاد الكانفس، فتغيير المقاس بتعيين
 * `canvasWidth/canvasHeight` مباشرة يمطّ التصميم الحر ويشوّه نسبه. هذه الدالة
 * تحفظ الأبعاد بالبكسل وتُبقي التصميم متمركزاً في الورقة الجديدة — المصدر
 * الوحيد لهذا المنطق (يستخدمه `setCanvasSize` ومُطبِّق الكولاج الحر).
 */
import type { CanvasElement } from '../store/types';

export function recenterElementsOnResize(
  elements: CanvasElement[],
  oldW: number,
  oldH: number,
  newW: number,
  newH: number,
): CanvasElement[] {
  if (oldW === newW && oldH === newH) return elements;
  if (!(oldW > 0 && oldH > 0 && newW > 0 && newH > 0)) return elements;
  return elements.map((el) => ({
    ...el,
    x: (el.x * oldW + (newW - oldW) / 2) / newW,
    y: (el.y * oldH + (newH - oldH) / 2) / newH,
    width: (el.width * oldW) / newW,
    height: (el.height * oldH) / newH,
  }));
}
