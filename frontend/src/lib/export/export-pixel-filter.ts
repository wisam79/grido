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
import { applyPixelFilter, isPixelFilter } from '@/lib/filters/pixel-filters';
import { getRoundedPool } from './export-color';

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
