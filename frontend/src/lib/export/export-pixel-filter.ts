/**
 * جسر مرشّحات البكسل بين Canvas 2D ومسار التصدير.
 *
 * threshold/pixelate يعملان على مستوى البكسل ولا يمكن تمثيلهما بـ CSS filter،
 * لذا يُرسم المحتوى أولاً في كانفس وسيط، ثم يُقرأ بـ getImageData وتُطبَّق
 * الخوارزمية (نفسها المستخدمة في فلاتر Konva وفي مسار Go للطباعة).
 *
 * الترتيب مقصود: الفلتر يُطبَّق قبل القلب/الدوران تماماً كما يفعل Konva
 * (الفلتر على صورة العقدة، ثم تحويل العقدة). كما يضمن الرسم في كانفس
 * وسيط بقاء الأقنعة والزوايا المستديرة سليمة — putImageData يتجاهل القص
 * وحواف الكانفس، فلو طُبِّق بعد ctx.clip() لتسرّب فوق القناع.
 */
import { applyPrintFilterOperation } from '@/lib/filters/custom-filters';
import { applyPixelFilter, isPixelFilter } from '@/lib/filters/pixel-filters';
import {
  getOrderedPrintFilterOperations,
  type PrintFilterAdjustments,
} from '@/lib/filters/print-filter-contract';

import { getRoundedPool } from './export-color';

export interface CanonicalFilterSource extends PrintFilterAdjustments {
  filter?: string;
}

/**
 * يرسم المحتوى أولاً ثم يطبق عقد الفلاتر القانوني نفسه المستخدم في Konva وGo.
 * هذا يتجنب اختلاف CanvasRenderingContext2D.filter بين Chromium وSkia/Konva.
 */
export function renderWithCanonicalPrintFilters(
  w: number,
  h: number,
  source: CanonicalFilterSource,
  draw: (ctx: CanvasRenderingContext2D) => void,
): HTMLCanvasElement | null {
  const pooled = getRoundedPool(w, h);
  if (!pooled) return null;
  const { canvas, ctx } = pooled;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.filter = 'none';
  draw(ctx);

  const operations = getOrderedPrintFilterOperations(source.filter, source);
  if (operations.length === 0) return canvas;
  const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
  for (const operation of operations) applyPrintFilterOperation(image, operation);
  ctx.putImageData(image, 0, 0);
  return canvas;
}

/**
 * يرسم المحتوى في كانفس وسيط بحجم (w,h) عبر draw، ثم يطبّق مرشّح البكسل
 * ويعيد الكانفس الوسيط الجاهز للرسم على الكانفس الهدف (يراعي القص والظل).
 * يعيد null إذا لم يكن المرشّح من نوع البكسل أو تعذّر إنشاء السياق.
 */
export function renderWithPixelFilter(
  w: number,
  h: number,
  filter: string | undefined,
  draw: (ctx: CanvasRenderingContext2D) => void,
): HTMLCanvasElement | null {
  if (!isPixelFilter(filter)) return null;
  const pooled = getRoundedPool(w, h);
  if (!pooled) return null;

  const { canvas, ctx } = pooled;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  draw(ctx);

  const width = canvas.width;
  const height = canvas.height;
  const image = ctx.getImageData(0, 0, width, height);
  if (applyPixelFilter(image.data, width, height, filter!)) {
    ctx.putImageData(image, 0, 0);
  }
  return canvas;
}
