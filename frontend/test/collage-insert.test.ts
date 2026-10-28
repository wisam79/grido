import { describe, it, expect } from 'vitest';

import { buildCollageInsertAssignments, buildCollageInsertPlan } from '@/lib/canvas/collage-insert';

import type { CanvasSlot } from '@/lib/store/types';

/** خانة بحد أدنى من الحقول — الدالة لا تلمس سوى id/imageSrc */
const slot = (id: string, imageSrc?: string): CanvasSlot =>
  ({ id, cellIndex: 0, x: 0, y: 0, w: 0.5, h: 0.5, imageSrc }) as CanvasSlot;

describe('buildCollageInsertAssignments — توزيع الصور على خانات الكولاج', () => {
  it('يضع الصورة في الخانة المستهدفة أولاً', () => {
    const slots = [slot('a'), slot('b'), slot('c')];
    const result = buildCollageInsertAssignments(slots, ['img'], 'b', false);

    expect(result).toEqual([{ slotId: 'b', src: 'img' }]);
  });

  it('بعد الخانة المستهدفة تُوزَّع بقية الصور على الخانات الفارغة', () => {
    const slots = [slot('a'), slot('b', 'old'), slot('c')];
    const result = buildCollageInsertAssignments(slots, ['one', 'two'], 'c', false);

    expect(result).toEqual([
      { slotId: 'c', src: 'one' },
      { slotId: 'a', src: 'two' },
    ]);
  });

  it('قالب طباعة فيزيائي بصورة واحدة يعبّئ كل الخانات (تكرار صريح)', () => {
    const slots = [slot('a'), slot('b', 'old')];
    const result = buildCollageInsertAssignments(slots, ['master'], null, true);

    expect(result).toEqual([
      { slotId: 'a', src: 'master' },
      { slotId: 'b', src: 'master' },
    ]);
  });

  it('الإدراج العام دون استهداف لا يستبدل شبكة ممتلئة — الصور تبقى متبقية', () => {
    const slots = [slot('a', 'old-a'), slot('b', 'old-b')];
    const result = buildCollageInsertAssignments(slots, ['master'], null, false);

    expect(result).toEqual([]);
  });

  it('لا يكرّر الصورة على قالب عادي فيه خانات فارغة (بخلاف القالب الفيزيائي)', () => {
    const slots = [slot('a'), slot('b')];
    const result = buildCollageInsertAssignments(slots, ['master'], null, false);

    expect(result).toEqual([{ slotId: 'a', src: 'master' }]);
  });

  it('قائمة خانات فارغة تُنتج توزيعاً فارغاً', () => {
    expect(buildCollageInsertAssignments([], ['master'], null, true)).toEqual([]);
  });
});

describe('buildCollageInsertPlan — نتيجة كاملة بمتبقي وإحصاء', () => {
  it('يحفظ الصور الزائدة عن السعة في remaining بدل إسقاطها بصمت', () => {
    const plan = buildCollageInsertPlan([slot('a'), slot('b')], ['one', 'two', 'three'], {
      scope: 'empty',
    });

    expect(plan.assignments).toHaveLength(2);
    expect(plan.remaining).toEqual(['three']);
    expect(plan.replaced).toBe(0);
  });

  it('يستبدل الصور الفارغة فقط افتراضياً ويبقي الممتلئة محفوظة', () => {
    const plan = buildCollageInsertPlan(
      [slot('a', 'kept'), slot('b'), slot('c')],
      ['one', 'two', 'three'],
      { scope: 'empty' },
    );

    expect(plan.assignments.map((a) => a.slotId).sort()).toEqual(['b', 'c']);
    expect(plan.preserved).toBe(1);
    expect(plan.remaining).toEqual(['three']);
  });

  it('وضع all يستبدل كل الخانات ويحصي الاستبدال', () => {
    const plan = buildCollageInsertPlan([slot('a', 'old')], ['new'], { scope: 'all' });

    expect(plan.assignments).toEqual([{ slotId: 'a', src: 'new' }]);
    expect(plan.replaced).toBe(1);
  });

  it('التكرار الصريح يعيد استخدام المصادر دورياً بلا متبقي', () => {
    const plan = buildCollageInsertPlan([slot('a'), slot('b'), slot('c')], ['one'], {
      scope: 'all',
      repeat: true,
    });

    expect(plan.assignments).toHaveLength(3);
    expect(plan.remaining).toEqual([]);
  });

  it('النطاق المستهدف يبدأ بالخانة المحددة ثم يملأ بقية الخانات بالترتيب', () => {
    const plan = buildCollageInsertPlan(
      [slot('a', 'old-a'), slot('b'), slot('c', 'old-c')],
      ['one', 'two', 'three'],
      { targetSlotId: 'b', scope: 'target' },
    );

    expect(plan.assignments).toEqual([
      { slotId: 'b', src: 'one' },
      { slotId: 'a', src: 'two' },
      { slotId: 'c', src: 'three' },
    ]);
    expect(plan.replaced).toBe(2);
    expect(plan.remaining).toEqual([]);
  });
});
