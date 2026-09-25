import { describe, it, expect } from 'vitest';
import {
  collectFilled,
  emptySrcMatrix,
  isSrc,
  placeSources,
  reverseColumnsWithinFilled,
  reverseRowsWithinFilled,
  shuffleWithinFilled,
  srcMatricesEqual,
  transposeIndexMap,
  type SrcMatrix,
} from '../src/components/editor/panels/collage/collage-arrange-ops';

/**
 * عمليات ترتيب شبكة الكولاج — الانحدار الذي تحرسه هذه الاختبارات:
 * كان تخطّي الخانات الفارغة (`undefined`) في التنفيذ يترك الصورة القديمة
 * في مكانها **ويضع نسخة منها في خانة أخرى** ⇒ صورتان متطابقتان بعد «عكس»
 * أو «خلط» على شبكة غير ممتلئة. القاعدة الآن: التبادل بين الخانات الممتلئة
 * فقط، والفارغ يبقى فارغاً.
 */

/** عدد مرات ظهور كل مصدر — لا مصدر يظهر مرتين */
const sourceCounts = (matrix: SrcMatrix): Map<string, number> => {
  const counts = new Map<string, number>();
  for (const row of matrix) {
    for (const src of row) {
      if (isSrc(src)) counts.set(src, (counts.get(src) ?? 0) + 1);
    }
  }
  return counts;
};

describe('collage-arrange-ops — عكس الصفوف/الأعمدة على شبكة غير ممتلئة', () => {
  it('عكس الصفوف لا يكرّر صوراً ولا يملأ خانة فارغة', () => {
    const matrix: SrcMatrix = [['A', undefined, 'B', undefined]];
    const next = reverseRowsWithinFilled(matrix);

    expect(next).toEqual([['B', undefined, 'A', undefined]]);
    expect(sourceCounts(next)).toEqual(new Map([['A', 1], ['B', 1]]));
  });

  it('عكس صف فيه صورة واحدة يترك الشبكة كما هي', () => {
    // العطب القديم كان هنا بالضبط: [A, فارغ] ⇒ [فارغ, A] ثم تخطّي الفارغ
    // يُنتج [A, A].
    const matrix: SrcMatrix = [['A', undefined]];
    expect(reverseRowsWithinFilled(matrix)).toEqual([['A', undefined]]);
  });

  it('عكس الأعمدة يعمل على الصفوف الممتلئة فقط', () => {
    const matrix: SrcMatrix = [['A'], [undefined], ['B'], [undefined]];
    const next = reverseColumnsWithinFilled(matrix);

    expect(next).toEqual([['B'], [undefined], ['A'], [undefined]]);
    expect(sourceCounts(next)).toEqual(new Map([['A', 1], ['B', 1]]));
  });
});

describe('collage-arrange-ops — الخلط العشوائي', () => {
  it('تبديل حقيقي: لا تكرار ولا فقدان، والمواضع الممتلئة لا تتغيّر', () => {
    const matrix: SrcMatrix = [
      ['A', undefined, 'B'],
      [undefined, 'C', undefined],
    ];
    // rng صفري ⇒ Fisher–Yates يعكس الترتيب حتماً (خطوتان بمعامل j=0)
    const next = shuffleWithinFilled(matrix, () => 0);

    expect(next).toEqual([
      ['B', undefined, 'C'],
      [undefined, 'A', undefined],
    ]);
    expect(sourceCounts(next)).toEqual(new Map([['A', 1], ['B', 1], ['C', 1]]));
    expect(collectFilled(next).positions).toEqual(collectFilled(matrix).positions);
  });

  it('rng لا يُبدّل شيئاً ⇒ المصفوفة تعود كما هي', () => {
    const matrix: SrcMatrix = [
      ['A', 'B'],
      ['C', 'D'],
    ];
    const next = shuffleWithinFilled(matrix, () => 0.999);
    expect(srcMatricesEqual(next, matrix)).toBe(true);
    expect(next.flat().filter(isSrc).sort()).toEqual(['A', 'B', 'C', 'D']);
  });
});

describe('collage-arrange-ops — خريطة التبديل (صفوف ↔ أعمدة)', () => {
  it('تنقل كل صورة من (صف، عمود) إلى (عمود، صف) لا بالفهرس', () => {
    const matrix: SrcMatrix = [
      ['A', 'B', 'C'],
      ['D', 'E', 'F'],
    ];
    const map = transposeIndexMap(2, matrix);

    // الشبكة الجديدة 3×2 ⇒ المفهرس = newRow * 2 + newCol
    expect([...map.entries()].sort((a, b) => a[0] - b[0])).toEqual([
      [0, 'A'],
      [1, 'D'],
      [2, 'B'],
      [3, 'E'],
      [4, 'C'],
      [5, 'F'],
    ]);
  });

  it('الخانات الفارغة لا تنتج صورة', () => {
    const map = transposeIndexMap(2, [
      [undefined, 'B'],
      [undefined, undefined],
    ]);
    expect([...map.entries()]).toEqual([[2, 'B']]);
  });
});

describe('collage-arrange-ops — أدوات مساعدة', () => {
  it('isSrc يرفض الفارغ والسلسلة الصفرية الطول', () => {
    expect(isSrc('a.jpg')).toBe(true);
    expect(isSrc('')).toBe(false);
    expect(isSrc(undefined)).toBe(false);
    expect(isSrc(null)).toBe(false);
  });

  it('emptySrcMatrix بالأبعاد المطلوبة ومحمي من الأبعاد السالبة', () => {
    expect(emptySrcMatrix(2, 3)).toEqual([
      [undefined, undefined, undefined],
      [undefined, undefined, undefined],
    ]);
    expect(emptySrcMatrix(-1, -1)).toEqual([]);
  });

  it('placeSources يضع المصادر في مواضعها ويتجاهل الفائض', () => {
    const base = emptySrcMatrix(1, 3);
    const next = placeSources(base, [{ row: 0, col: 2 }], ['A', 'B']);
    expect(next).toEqual([[undefined, undefined, 'A']]);
  });

  it('srcMatricesEqual يميّز أبعاداً وقيماً مختلفة', () => {
    expect(srcMatricesEqual([['A']], [['A']])).toBe(true);
    expect(srcMatricesEqual([['A']], [['B']])).toBe(false);
    expect(srcMatricesEqual([['A']], [['A', 'B']])).toBe(false);
    expect(srcMatricesEqual([['A']], [])).toBe(false);
  });
});
