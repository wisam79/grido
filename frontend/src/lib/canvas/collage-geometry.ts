import type { CanvasSlot } from '@/lib/store/types';

/**
 * Collage Geometry – Single Source of Truth
 * ========================================
 * هندسة شبكة الكولاج بالبكسل الكانفسي. يستهلكها مرسم Konva (`konva-collage-layer`)
 * والشريط السريع العائم (`canvas-quick-bar`) معاً، فلا تنحرف مواضع الخلايا
 * المعروضة عن الخلايا المرسومة فعلاً عند أي تغيير مستقبلي في قواعد الشبكة.
 */

export interface CollageGeometry {
  /** الهامش الداخلي */
  margin: number;
  /** الفجوة بين الخلايا */
  gap: number;
  /** عرض المساحة المتاحة للخلايا بعد الهوامش */
  availW: number;
  /** ارتفاع المساحة المتاحة للخلايا بعد الهوامش */
  availH: number;
}

/**
 * يتحقق مما إذا كان قالب الكولاج يملك إحداثيات خلايا محسوبة ومخبوزة مسبقاً
 * (تخطيط فيزيائي، كولاج حر، تعديل يدوي للخانات، أو نماذج أطقم بأبعاد محددة).
 * في هذه الحالات، تكون مواضع الخانات محددة بالفعل بالنسبة للكانفس فلا تُطبَّق
 * الهوامش أو الفجوات مرة ثانية في `getCollageGeometry`.
 */
export function isBakedCollageLayout(
  template:
    | {
        physicalLayout?: unknown;
        isBaked?: boolean;
        isManual?: boolean;
        metadata?: { kind?: string };
      }
    | null
    | undefined,
): boolean {
  if (!template) return false;
  return Boolean(
    template.physicalLayout ||
    template.isBaked ||
    template.isManual ||
    template.metadata?.kind === 'freeform',
  );
}

export function getCollageGeometry(
  canvasWidth: number,
  canvasHeight: number,
  collageMargin: number,
  collageGap: number,
  hasPhysicalLayout: boolean,
): CollageGeometry {
  // 📐 التخطيط الفيزيائي والمخبوز يحدّد مواضع الخلايا بنفسه: لا هوامش ولا فجوات مضاعفة
  const margin = hasPhysicalLayout ? 0 : collageMargin;
  const gap = hasPhysicalLayout ? 0 : collageGap;
  return {
    margin,
    gap,
    availW: canvasWidth - 2 * margin,
    availH: canvasHeight - 2 * margin,
  };
}

export interface SlotRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

/** مستطيل الخلية بالبكسل الكانفسي — المعادلة الحاكمة لكل من الرسم والتقاط الموضع */
export function getSlotRect(
  slot: Pick<CanvasSlot, 'x' | 'y' | 'w' | 'h'>,
  geo: CollageGeometry,
): SlotRect {
  return {
    left: geo.margin + slot.x * geo.availW + geo.gap / 2,
    top: geo.margin + slot.y * geo.availH + geo.gap / 2,
    width: Math.max(0, slot.w * geo.availW - geo.gap),
    height: Math.max(0, slot.h * geo.availH - geo.gap),
  };
}

export type AdjacentSlotDirection = 'top' | 'right' | 'bottom' | 'left';

export const ADJACENT_SLOT_DIRECTIONS: readonly AdjacentSlotDirection[] = [
  'top',
  'right',
  'bottom',
  'left',
];

const ADJACENT_EPSILON_BOUNDS = 1e-6;
const ADJACENT_OVERLAP_TOLERANCE_PX = 0.5;
const COORD_SNAP_TOLERANCE = 1e-3;

function slotRectsOverlap(a: SlotRect, b: SlotRect): boolean {
  return (
    a.left < b.left + b.width - ADJACENT_OVERLAP_TOLERANCE_PX &&
    a.left + a.width > b.left + ADJACENT_OVERLAP_TOLERANCE_PX &&
    a.top < b.top + b.height - ADJACENT_OVERLAP_TOLERANCE_PX &&
    a.top + a.height > b.top + ADJACENT_OVERLAP_TOLERANCE_PX
  );
}

/**
 * يستنتج الفجوة المطبّعة (0..1) بين الخلية المصدر وجيرانها المحاذين لها
 * عندما تكون الفجوة مدمجة داخل إحداثيات الخانات (تخطيطات مخصصة أو بعد التثبيت اليدوي).
 */
function inferNormalizedNeighborGaps(
  source: Pick<CanvasSlot, 'id' | 'x' | 'y' | 'w' | 'h'>,
  slots: ReadonlyArray<Pick<CanvasSlot, 'id' | 'x' | 'y' | 'w' | 'h'>>,
  geo: CollageGeometry,
): { gapX: number | null; gapY: number | null } {
  let minDx: number | null = null;
  let minDy: number | null = null;

  for (const other of slots) {
    if (other.id === source.id) continue;

    const overlapsVertically =
      other.y < source.y + source.h - ADJACENT_EPSILON_BOUNDS &&
      other.y + other.h > source.y + ADJACENT_EPSILON_BOUNDS;
    if (overlapsVertically) {
      let dx: number | null = null;
      if (other.x >= source.x + source.w - ADJACENT_EPSILON_BOUNDS) {
        dx = Math.max(0, other.x - (source.x + source.w));
      } else if (source.x >= other.x + other.w - ADJACENT_EPSILON_BOUNDS) {
        dx = Math.max(0, source.x - (other.x + other.w));
      }
      if (dx !== null && (minDx === null || dx < minDx)) {
        minDx = dx;
      }
    }

    const overlapsHorizontally =
      other.x < source.x + source.w - ADJACENT_EPSILON_BOUNDS &&
      other.x + other.w > source.x + ADJACENT_EPSILON_BOUNDS;
    if (overlapsHorizontally) {
      let dy: number | null = null;
      if (other.y >= source.y + source.h - ADJACENT_EPSILON_BOUNDS) {
        dy = Math.max(0, other.y - (source.y + source.h));
      } else if (source.y >= other.y + other.h - ADJACENT_EPSILON_BOUNDS) {
        dy = Math.max(0, source.y - (other.y + other.h));
      }
      if (dy !== null && (minDy === null || dy < minDy)) {
        minDy = dy;
      }
    }
  }

  // null يعني غياب جار قابل للقياس، بينما الصفر فجوة متلاصقة صريحة.
  let gapX = minDx;
  let gapY = minDy;

  if (minDx !== null && minDy === null && geo.availH > 0) {
    gapY = (minDx * geo.availW) / geo.availH;
  } else if (minDy !== null && minDx === null && geo.availW > 0) {
    gapX = (minDy * geo.availH) / geo.availW;
  }

  return { gapX, gapY };
}

/**
 * يحسب إحداثيات الخلية المجاورة المقترحة في الاتجاه المحدد بنفس المقاس الفيزيائي
 * للخلية المصدر، أو يُرجع `null` إذا كانت تتجاوز حدود الورقة أو تتداخل مع خلية قائمة.
 */
export function computeAdjacentSlotCandidate(
  source: Pick<CanvasSlot, 'id' | 'x' | 'y' | 'w' | 'h'>,
  direction: AdjacentSlotDirection,
  slots: ReadonlyArray<Pick<CanvasSlot, 'id' | 'x' | 'y' | 'w' | 'h'>>,
  geo: CollageGeometry,
  collageGap: number,
  hasPhysicalLayout: boolean,
): { x: number; y: number; w: number; h: number } | null {
  if (!(source.w > 0 && source.h > 0 && geo.availW > 0 && geo.availH > 0)) {
    return null;
  }

  let normGapX = 0;
  let normGapY = 0;

  if (geo.gap === 0) {
    // التخطيط الفيزيائي قد يصغّر الفجوة مع الخلايا؛ القياس الفعلي (حتى الصفر)
    // يسبق التفضيل المخزن، ويُنقل للمحور الآخر عبر البكسل لا كنسبة مطبّعة.
    const inferred = inferNormalizedNeighborGaps(source, slots, geo);
    const fallbackGap =
      hasPhysicalLayout && Number.isFinite(collageGap) ? Math.max(0, collageGap) : 0;
    normGapX = inferred.gapX ?? fallbackGap / geo.availW;
    normGapY = inferred.gapY ?? fallbackGap / geo.availH;
  }

  let nx = source.x;
  let ny = source.y;
  const nw = source.w;
  const nh = source.h;

  switch (direction) {
    case 'left':
      nx = source.x - nw - normGapX;
      break;
    case 'right':
      nx = source.x + source.w + normGapX;
      break;
    case 'top':
      ny = source.y - nh - normGapY;
      break;
    case 'bottom':
      ny = source.y + source.h + normGapY;
      break;
  }

  // مطابقة دقيقة مع إحداثيات الصفوف/الأعمدة القائمة لتفادي انحراف الفاصلة العائمة
  if (direction === 'left' || direction === 'right') {
    const alignedCol = slots.find(
      (s) =>
        s.id !== source.id &&
        Math.abs(s.x - nx) < COORD_SNAP_TOLERANCE &&
        Math.abs(s.w - nw) < COORD_SNAP_TOLERANCE,
    );
    if (alignedCol) nx = alignedCol.x;
  } else {
    const alignedRow = slots.find(
      (s) =>
        s.id !== source.id &&
        Math.abs(s.y - ny) < COORD_SNAP_TOLERANCE &&
        Math.abs(s.h - nh) < COORD_SNAP_TOLERANCE,
    );
    if (alignedRow) ny = alignedRow.y;
  }

  if (
    nx < -ADJACENT_EPSILON_BOUNDS ||
    ny < -ADJACENT_EPSILON_BOUNDS ||
    nx + nw > 1 + ADJACENT_EPSILON_BOUNDS ||
    ny + nh > 1 + ADJACENT_EPSILON_BOUNDS
  ) {
    return null;
  }

  const x = Math.max(0, nx);
  const y = Math.max(0, ny);
  const w = x + nw > 1 ? 1 - x : nw;
  const h = y + nh > 1 ? 1 - y : nh;

  const candidateRect = getSlotRect({ x, y, w, h }, geo);
  if (candidateRect.width < 1 || candidateRect.height < 1) {
    return null;
  }

  for (const other of slots) {
    if (slotRectsOverlap(candidateRect, getSlotRect(other, geo))) {
      return null;
    }
  }

  return { x, y, w, h };
}

/** يعيد قائمة الجهات المتاحة فعلياً لإضافة خلية مجاورة حول الخلية المحددة ضمن الورقة. */
export function getAvailableAdjacentSlotDirections(
  source: Pick<CanvasSlot, 'id' | 'x' | 'y' | 'w' | 'h'>,
  slots: ReadonlyArray<Pick<CanvasSlot, 'id' | 'x' | 'y' | 'w' | 'h'>>,
  geo: CollageGeometry,
  collageGap: number,
  hasPhysicalLayout: boolean,
): AdjacentSlotDirection[] {
  return ADJACENT_SLOT_DIRECTIONS.filter(
    (dir) =>
      computeAdjacentSlotCandidate(source, dir, slots, geo, collageGap, hasPhysicalLayout) !== null,
  );
}
