/* ═══════════════════════════════════════════════════════════════
   عمليات ترتيب شبكة الكولاج — دوال نقية بلا React ولا متجر.

   كانت منطقاً مضمّناً في collage-arrange-tab، وفيه عطب واحد مشترك:
   التعامل مع الخانات الفارغة بـ`undefined` ثم توزيع الصور على كل
   الخانات بالتتابع. عند شبكة غير ممتلئة كان `undefined` يُتخطّى في
   التنفيذ فتبقى صور قديمة في مكانها **وتتكرر** في الخانات الأولى
   (خلط 1×3 بصورتين ينتج صورتين متطابقتين بدل تبديل موضعهما).

   القاعدة هنا: العمليات تتبادل **مواضع الخانات الممتلئة فقط**؛
   والخانة الفارغة تبقى فارغة دائماً.
   ═══════════════════════════════════════════════════════════════ */

/** مصفوفة مصادر الصور: `undefined` تعني خانة فارغة */
export type SrcMatrix = (string | undefined)[][];

export interface CellPosition {
  row: number;
  col: number;
}

/** هل القيمة مصدر صورة فعلي؟ */
export function isSrc(value: string | undefined | null): value is string {
  return typeof value === "string" && value.length > 0;
}

/** مصفوفة فارغة بالأبعاد المطلوبة */
export function emptySrcMatrix(rows: number, cols: number): SrcMatrix {
  return Array.from({ length: Math.max(0, rows) }, () =>
    Array.from({ length: Math.max(0, cols) }, () => undefined as string | undefined)
  );
}

/** مواضع الخانات الممتلئة ومصادرها، بترتيب الصفوف ثم الأعمدة */
export function collectFilled(matrix: SrcMatrix): {
  positions: CellPosition[];
  sources: string[];
} {
  const positions: CellPosition[] = [];
  const sources: string[] = [];
  matrix.forEach((row, r) =>
    row.forEach((src, c) => {
      if (isSrc(src)) {
        positions.push({ row: r, col: c });
        sources.push(src);
      }
    })
  );
  return { positions, sources };
}

/** يبني مصفوفة جديدة بنفس أبعاد الأصل ثم يضع المصادر في المواضع المعطاة */
export function placeSources(
  base: SrcMatrix,
  positions: CellPosition[],
  sources: readonly string[]
): SrcMatrix {
  const next = base.map((row) => row.map(() => undefined as string | undefined));
  positions.forEach((pos, i) => {
    const src = sources[i];
    if (src !== undefined && next[pos.row] && pos.col < next[pos.row].length) {
      next[pos.row][pos.col] = src;
    }
  });
  return next;
}

/** عكس ترتيب الصور داخل كل صف — الخانات الفارغة لا تتحرك ولا تُملأ */
export function reverseRowsWithinFilled(matrix: SrcMatrix): SrcMatrix {
  return matrix.map((row) => {
    const filled = row.filter(isSrc);
    const reversed = [...filled].reverse();
    let cursor = 0;
    return row.map((src) => (isSrc(src) ? reversed[cursor++] : undefined));
  });
}

/** عكس ترتيب الصور داخل كل عمود — الخانات الفارغة لا تتحرك ولا تُملأ */
export function reverseColumnsWithinFilled(matrix: SrcMatrix): SrcMatrix {
  const rows = matrix.length;
  const cols = rows > 0 ? matrix[0].length : 0;
  const next = emptySrcMatrix(rows, cols);

  for (let col = 0; col < cols; col++) {
    const filledRows: number[] = [];
    for (let row = 0; row < rows; row++) {
      if (isSrc(matrix[row][col])) filledRows.push(row);
    }
    const values = filledRows.map((row) => matrix[row][col] as string).reverse();
    filledRows.forEach((row, i) => {
      next[row][col] = values[i];
    });
  }
  return next;
}

/**
 * خلط عشوائي (Fisher–Yates) يتبادل مواضع الصور الممتلئة فقط — فالناتج
 * تبديل حقيقي (permutation) بلا تكرار ولا فقدان، والفارغ يبقى فارغاً.
 */
export function shuffleWithinFilled(
  matrix: SrcMatrix,
  rng: () => number = Math.random
): SrcMatrix {
  const { positions, sources } = collectFilled(matrix);
  const shuffled = [...sources];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return placeSources(matrix, positions, shuffled);
}

/** هل المصفوفتان متطابقتان تماماً؟ (لاستبعاد خطوات تراجع فارغة) */
export function srcMatricesEqual(a: SrcMatrix, b: SrcMatrix): boolean {
  if (a.length !== b.length) return false;
  for (let r = 0; r < a.length; r++) {
    if (a[r].length !== (b[r]?.length ?? 0)) return false;
    for (let c = 0; c < a[r].length; c++) {
      if ((a[r][c] ?? null) !== (b[r][c] ?? null)) return false;
    }
  }
  return true;
}

/**
 * خريطة التبديل الحقيقي بين الصفوف والأعمدة: الخانة (row, col) تنتقل إلى
 * (col, row) في الشبكة الجديدة.
 *
 * الربط بالفهرس (`existingSlots[i]`) — وهو ما يفعله `setCollageTemplate` —
 * **ليس** تبديلاً: في شبكة 2×3 → 3×2 يذهب المفهرس 1 من (0,1) إلى (0,1) من
 * الشبكة الجديدة، أي أن الصور تتشتّت بلا علاقة بالتبديل المطلوب.
 *
 * @param rows عدد صفوف الشبكة الحالية
 * @returns خريطة `مفهرس الخانة الجديدة → مصدر الصورة`
 */
export function transposeIndexMap(rows: number, matrix: SrcMatrix): Map<number, string> {
  const map = new Map<number, string>();
  // الشبكة الجديدة فيها `rows` عموداً (أعمدة القديم صارت صفوفاً)
  const nextCols = Math.max(1, rows);
  matrix.forEach((row, r) =>
    row.forEach((src, c) => {
      if (isSrc(src)) map.set(c * nextCols + r, src);
    })
  );
  return map;
}
