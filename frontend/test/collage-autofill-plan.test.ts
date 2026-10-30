import { describe, it, expect } from 'vitest';

import {
  buildFillPlan,
  buildSlotGrid,
  moveListItem,
  orderedCells,
  shuffleWithRng,
  mulberry32,
} from '../src/components/editor/panels/collage/collage-autofill-plan';

import type { FillSlotLike } from '../src/components/editor/panels/collage/collage-autofill-plan';

/** شبكة 2×2 بترتيب صفوف: A B / - - (الخانتان السفليتان فارغتان) */
const grid2x2 = (): FillSlotLike[] => [
  { id: 's0', x: 0, y: 0, imageSrc: 'A' },
  { id: 's1', x: 0.5, y: 0, imageSrc: 'B' },
  { id: 's2', x: 0, y: 0.5 },
  { id: 's3', x: 0.5, y: 0.5 },
];

describe('buildSlotGrid + orderedCells', () => {
  it('يستنبط الشبكة من الهندسة ويتجاهل cellIndex', () => {
    const slots: FillSlotLike[] = [
      { id: 'bottom-right', x: 0.5, y: 0.5 },
      { id: 'top-left', x: 0, y: 0 },
      { id: 'bottom-left', x: 0, y: 0.5 },
      { id: 'top-right', x: 0.5, y: 0 },
    ];

    const grid = buildSlotGrid(slots);
    expect(grid.rows).toBe(2);
    expect(grid.cols).toBe(2);
    expect(orderedCells(grid, 'row').map((cell) => cell.slotId)).toEqual([
      'top-left',
      'top-right',
      'bottom-left',
      'bottom-right',
    ]);
  });

  it('يرتّب الأعمدة عموداً بعمود لا صفاً بصف', () => {
    const slots: FillSlotLike[] = [
      { id: 'r0c2', x: 0.66, y: 0 },
      { id: 'r1c0', x: 0, y: 0.5 },
      { id: 'r0c1', x: 0.33, y: 0 },
      { id: 'r1c2', x: 0.66, y: 0.5 },
      { id: 'r0c0', x: 0, y: 0 },
      { id: 'r1c1', x: 0.33, y: 0.5 },
    ];

    const grid = buildSlotGrid(slots);
    expect(orderedCells(grid, 'column').map((cell) => cell.slotId)).toEqual([
      'r0c0',
      'r1c0',
      'r0c1',
      'r1c1',
      'r0c2',
      'r1c2',
    ]);
  });

  it('يتعامل مع الإحداثيات العشرية بعد التقريب', () => {
    const slots: FillSlotLike[] = [
      { id: 'b', x: 0.5000001, y: 0.5 },
      { id: 'a', x: 0.4999999, y: 0.5 },
    ];
    const grid = buildSlotGrid(slots);
    expect(grid.cols).toBe(1);
    expect(grid.rows).toBe(1);
  });
});

describe('buildFillPlan — الفارغة فقط', () => {
  it('يستهدف الخانات الفارغة فقط ويحفظ الممتلئة', () => {
    const plan = buildFillPlan({
      slots: grid2x2(),
      mode: 'empty',
      order: 'row',
      images: ['X', 'Y'],
      repeat: false,
      shuffle: false,
    });

    expect(plan.targets.map((cell) => cell.slotId)).toEqual(['s2', 's3']);
    expect(plan.assignments.map((assignment) => assignment.src)).toEqual(['X', 'Y']);
    expect(plan.stats).toMatchObject({
      targetCount: 2,
      fillCount: 2,
      preservedCount: 2,
      overwriteCount: 0,
      skippedCount: 0,
      repeats: 0,
    });
  });

  it('بلا تكرار: الصور الناقصة تترك خانات فارغة بإحصاء صريح', () => {
    const plan = buildFillPlan({
      slots: grid2x2(),
      mode: 'empty',
      order: 'row',
      images: ['X'],
      repeat: false,
      shuffle: false,
    });

    expect(plan.assignments).toHaveLength(1);
    expect(plan.stats.skippedCount).toBe(1);
    expect(plan.stats.preservedCount).toBe(2);
  });

  it('مع التكرار: يوزّع دورياً ويعدّ الاستخدامات المكررة', () => {
    const plan = buildFillPlan({
      slots: grid2x2(),
      mode: 'empty',
      order: 'row',
      images: ['X'],
      repeat: true,
      shuffle: false,
    });

    expect(plan.assignments.map((assignment) => assignment.src)).toEqual(['X', 'X']);
    expect(plan.stats.repeats).toBe(1);
    expect(plan.stats.skippedCount).toBe(0);
  });
});

describe('buildFillPlan — كل الخانات', () => {
  it('يستبدل الممتلئة ويحسب الاستبدالات والمنسكبة', () => {
    const plan = buildFillPlan({
      slots: grid2x2(),
      mode: 'all',
      order: 'row',
      images: ['X', 'Y', 'Z'],
      repeat: false,
      shuffle: false,
    });

    expect(plan.stats).toMatchObject({
      targetCount: 4,
      fillCount: 3,
      overwriteCount: 2,
      preservedCount: 0,
      skippedCount: 1,
    });
    expect(plan.assignments.map((assignment) => assignment.order)).toEqual([1, 2, 3]);
  });

  it('مع التكرار يملأ كل الخانات ويعدّ الدورة الزائدة', () => {
    const plan = buildFillPlan({
      slots: grid2x2(),
      mode: 'all',
      order: 'row',
      images: ['X', 'Y', 'Z'],
      repeat: true,
      shuffle: false,
    });

    expect(plan.stats.fillCount).toBe(4);
    expect(plan.stats.skippedCount).toBe(0);
    expect(plan.stats.repeats).toBe(1);
  });
});

describe('الخلط بالبذرة', () => {
  it('نفس البذرة تعطي نفس الترتيب، والبذرة المختلفة تغيّره', () => {
    const input = {
      slots: grid2x2(),
      mode: 'all' as const,
      order: 'row' as const,
      images: ['A', 'B', 'C', 'D', 'E'],
      repeat: true,
      shuffle: true,
    };

    const first = buildFillPlan({ ...input, seed: 7 });
    const second = buildFillPlan({ ...input, seed: 7 });
    const third = buildFillPlan({ ...input, seed: 8 });

    expect(first.pool).toEqual(second.pool);
    expect(third.pool).not.toEqual(first.pool);
  });

  it('الخلط تبديل كامل بلا فقدان أو تكرار', () => {
    const source = ['A', 'B', 'C', 'D', 'E', 'F'];
    const shuffled = shuffleWithRng(source, mulberry32(42));
    expect([...shuffled].sort()).toEqual([...source].sort());
    expect(shuffled).toHaveLength(source.length);
    expect(source).toEqual(['A', 'B', 'C', 'D', 'E', 'F']);
  });
});

describe('moveListItem', () => {
  it('تنقل عنصراً إلى الأمام والخلف دون تعديل الأصل', () => {
    const source = ['A', 'B', 'C'];
    expect(moveListItem(source, 0, 2)).toEqual(['B', 'C', 'A']);
    expect(moveListItem(source, 2, 0)).toEqual(['C', 'A', 'B']);
    expect(source).toEqual(['A', 'B', 'C']);
  });

  it('تتجاهل الفهارس غير الصالحة', () => {
    const source = ['A', 'B'];
    expect(moveListItem(source, -1, 1)).toEqual(['A', 'B']);
    expect(moveListItem(source, 0, 5)).toEqual(['A', 'B']);
    expect(moveListItem(source, 1, 1)).toEqual(['A', 'B']);
  });
});
