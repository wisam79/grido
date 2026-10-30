/* ═══════════════════════════════════════════════════════════════
   تخطيط توزيع صور الكولاج — دوال نقية بلا React ولا متجر.

   كان التوزيع يعتمد `cellIndex` (يفسد بعد تبديل المحاور أو تغيير
   القالب) والخلط `sort(() => Math.random() - 0.5)` (انحياز معروف
   ويُفقد القدرة على معاينة النتيجة قبل التطبيق). هنا:
   - الشبكة تُستنبط هندسياً من x/y بعد تقريب ثلاث خانات عشرية.
   - الخلط Fisher–Yates بمولّد بذرة ⇒ معاينة ثابتة وقابلة لإعادة
     التوليد بدل أن تتغيّر مع كل رسم.
   - التوزيع بلا تكرار يُرجع إحصاءات صريحة (ستُملأ / تبقى / بلا صورة)
     بدل إسقاط الصور الزائدة بصمت.
   ═══════════════════════════════════════════════════════════════ */

export type FillMode = 'empty' | 'all';
export type FillOrder = 'row' | 'column';

export interface FillSlotLike {
  id: string;
  x: number;
  y: number;
  imageSrc?: string;
}

export interface GridCell {
  slotId: string;
  row: number;
  col: number;
  imageSrc: string | undefined;
}

export interface SlotGrid {
  rows: number;
  cols: number;
  /** matrix[row][col] — null لخلية غائبة (الشبكات المنتظمة لا تُنتجها) */
  matrix: (GridCell | null)[][];
}

export interface FillAssignment {
  slotId: string;
  src: string;
  /** 1-based ترتيب التعبئة — يُعرض على خريطة النتيجة */
  order: number;
}

export interface FillPlanStats {
  targetCount: number;
  fillCount: number;
  /** خانات ممتلئة لن تُمَس (وضع «الفارغة فقط» أو ما بعد نفاد الصور) */
  preservedCount: number;
  /** خانات ممتلئة سيُستبدل محتواها (وضع «كل الخانات») */
  overwriteCount: number;
  /** خانات مستهدفة ستبقى بلا صورة بعد التطبيق */
  skippedCount: number;
  /** مرات إعادة استخدام صورة — عند تفعيل التكرار */
  repeats: number;
}

export interface FillPlan {
  grid: SlotGrid;
  /** كل الخانات بترتيب التعبئة الهندسي (صفوف أو أعمدة) */
  ordered: GridCell[];
  targets: GridCell[];
  assignments: FillAssignment[];
  /** الصور بترتيب الاستخدام (بعد الخلط إن فُعّل) */
  pool: string[];
  /** Display occurrence → source occurrence, including identical paths. */
  poolIndices: number[];
  stats: FillPlanStats;
}

export interface FillPlanInput {
  slots: readonly FillSlotLike[];
  mode: FillMode;
  order: FillOrder;
  images: readonly string[];
  repeat: boolean;
  shuffle: boolean;
  seed?: number;
}

const COORDINATE_PRECISION = 1000;
const roundCoordinate = (value: number) =>
  Math.round(value * COORDINATE_PRECISION) / COORDINATE_PRECISION;

/** بنية الشبكة من الهندسة الفعلية — لا من `cellIndex` الذي قد يكون قديماً */
export function buildSlotGrid(slots: readonly FillSlotLike[]): SlotGrid {
  if (slots.length === 0) return { rows: 0, cols: 0, matrix: [] };

  const xValues = [...new Set(slots.map((slot) => roundCoordinate(slot.x)))].sort((a, b) => a - b);
  const yValues = [...new Set(slots.map((slot) => roundCoordinate(slot.y)))].sort((a, b) => a - b);
  const colOf = new Map(xValues.map((x, index) => [x, index]));
  const rowOf = new Map(yValues.map((y, index) => [y, index]));

  const matrix: (GridCell | null)[][] = yValues.map(() => xValues.map((): GridCell | null => null));

  for (const slot of slots) {
    const row = rowOf.get(roundCoordinate(slot.y));
    const col = colOf.get(roundCoordinate(slot.x));
    if (row === undefined || col === undefined) continue;
    // مركز مكرر غير متوقع في شبكة منتظمة — الأولى تفوز ولا تتكرر الخانة
    if (matrix[row][col]) continue;
    matrix[row][col] = { slotId: slot.id, row, col, imageSrc: slot.imageSrc };
  }

  return { rows: yValues.length, cols: xValues.length, matrix };
}

/** ترتيب التعبئة الهندسي: صف بصف، أو عمود بعمود (يسار→يمين / أعلى→أسفل) */
export function orderedCells(grid: SlotGrid, order: FillOrder): GridCell[] {
  const ordered: GridCell[] = [];
  if (order === 'row') {
    for (const row of grid.matrix) {
      for (const cell of row) if (cell) ordered.push(cell);
    }
    return ordered;
  }
  for (let col = 0; col < grid.cols; col++) {
    for (let row = 0; row < grid.rows; row++) {
      const cell = grid.matrix[row]?.[col];
      if (cell) ordered.push(cell);
    }
  }
  return ordered;
}

export function selectTargets(ordered: readonly GridCell[], mode: FillMode): GridCell[] {
  return mode === 'empty' ? ordered.filter((cell) => !cell.imageSrc) : [...ordered];
}

/** مولّد أرقام عشوائية ببذرة ثابتة (Mulberry32) — خفيف ونقي */
export function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

/** خلط Fisher–Yates بلا انحياز — لا يعدّل المصفوفة الأصلية */
export function shuffleWithRng<T>(items: readonly T[], rng: () => number): T[] {
  const next = [...items];
  for (let i = next.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [next[i], next[j]] = [next[j], next[i]];
  }
  return next;
}

export { AUTOFILL_IMAGE_LIMIT } from '@/lib/schema';

/** نقل عنصر داخل قائمة — يعيد نسخة جديدة حتى عند الرفض لتفادي تعديل الأصل */
export function moveListItem<T>(items: readonly T[], from: number, to: number): T[] {
  if (from === to || from < 0 || to < 0 || from >= items.length || to >= items.length) {
    return [...items];
  }
  const next = [...items];
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return next;
}

export function buildFillPlan({
  slots,
  mode,
  order,
  images,
  repeat,
  shuffle,
  seed = 1,
}: FillPlanInput): FillPlan {
  const grid = buildSlotGrid(slots);
  const ordered = orderedCells(grid, order);
  const targets = selectTargets(ordered, mode);

  const sourceIndices = images.flatMap((src, index) => (src.length > 0 ? [index] : []));
  const poolIndices = shuffle ? shuffleWithRng(sourceIndices, mulberry32(seed)) : sourceIndices;
  const pool = poolIndices.map((index) => images[index]);

  const assignments: FillAssignment[] = [];
  let repeats = 0;

  if (pool.length > 0 && targets.length > 0) {
    const fillLimit = repeat ? targets.length : Math.min(targets.length, pool.length);
    for (let index = 0; index < fillLimit; index++) {
      assignments.push({
        slotId: targets[index].slotId,
        src: pool[index % pool.length],
        order: index + 1,
      });
      if (index >= pool.length) repeats += 1;
    }
  }

  const assignedIds = new Set(assignments.map((assignment) => assignment.slotId));
  const preservedCount = ordered.filter(
    (cell) => !!cell.imageSrc && !assignedIds.has(cell.slotId),
  ).length;
  const overwriteCount = mode === 'all' ? targets.filter((cell) => !!cell.imageSrc).length : 0;
  const skippedCount = targets.filter(
    (cell) => !cell.imageSrc && !assignedIds.has(cell.slotId),
  ).length;

  return {
    grid,
    ordered,
    targets,
    assignments,
    pool,
    poolIndices,
    stats: {
      targetCount: targets.length,
      fillCount: assignments.length,
      preservedCount,
      overwriteCount,
      skippedCount,
      repeats,
    },
  };
}
