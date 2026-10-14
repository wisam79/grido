/**
 * 🔍 viewport-culling.ts — إخفاء العناصر خارج العرض (Viewport Culling)
 *
 * التوثيق الرسمي (Very large scenes):
 * «Konva draws every node whether or not it lands inside the stage.
 *  Hide nodes outside it — visible(false) skips drawing AND hit testing,
 *  far cheaper than remove/re-add.»
 *
 * الاستراتيجية:
 * - لا نلمس getClientRect لكل عنصر كل إطار (مكلف عند 10k عقدة).
 * - نحسب صندوق العرض (view rect) من x/y/scale الـStage، ونقارن بصندوق العنصر المنطقي
 *   باستخدام نفس getElementPixelVisualBox المستخدم في marquee.
 * - نمرّر isOffscreen كبولين للطبقة التي تضعه على العنصر visible={ !isOffscreen }.
 * - طبقة المحتوى (single) فقط تُطبَّق؛ طبقة الكولاج قصّها مدمج في clipFunc أصلاً.
 */

export interface ViewRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function getStageViewRect(
  stageX: number,
  stageY: number,
  stageScale: number,
  viewportW: number,
  viewportH: number,
): ViewRect {
  const scale = stageScale > 0.0001 ? stageScale : 1;
  return {
    x: -stageX / scale,
    y: -stageY / scale,
    width: viewportW / scale,
    height: viewportH / scale,
  };
}

/** هامش (px منطقي) يبقي العناصر القريبة مرئية لتجنب وميض عند الحواف */
const CULL_MARGIN = 64;

export function isBoxOffscreen(
  elX: number,
  elY: number,
  elW: number,
  elH: number,
  rotation: number,
  view: ViewRect,
  margin = CULL_MARGIN,
): boolean {
  // صندوق بصري مدوّر (نفس الوظيفة في konva-single-layer لكن هنا بدون إنشاء React)
  // تبسيط: صندوق محوري (AABB) بعد الدوران — كافٍ لاختبار تقاطع سريع.
  const rad = ((rotation || 0) * Math.PI) / 180;
  if (rad === 0) {
    // بدون دوران — اختبار AABB مباشر
    return (
      elX + elW < view.x - margin ||
      elX > view.x + view.width + margin ||
      elY + elH < view.y - margin ||
      elY > view.y + view.height + margin
    );
  }
  // مع دوران: نحسب زوايا الصندوق المدوّر حول الأصل (x,y) كما في الطبقة
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const cornersX = [0, elW * cos, elW * cos - elH * sin, -elH * sin];
  const cornersY = [0, elW * sin, elW * sin + elH * cos, elH * cos];
  const minX = elX + Math.min(...cornersX);
  const maxX = elX + Math.max(...cornersX);
  const minY = elY + Math.min(...cornersY);
  const maxY = elY + Math.max(...cornersY);
  return (
    maxX < view.x - margin ||
    minX > view.x + view.width + margin ||
    maxY < view.y - margin ||
    minY > view.y + view.height + margin
  );
}
