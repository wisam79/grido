import { describe, it, expect } from 'vitest';
import { buildCollageInsertAssignments } from '@/lib/canvas/collage-insert';
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

  it('قالب طباعة فيزيائي بصورة واحدة يعبّئ كل الخانات', () => {
    const slots = [slot('a'), slot('b', 'old')];
    const result = buildCollageInsertAssignments(slots, ['master'], null, true);

    expect(result).toEqual([
      { slotId: 'a', src: 'master' },
      { slotId: 'b', src: 'master' },
    ]);
  });

  it('القالب العادي دون خانات فارغة يضع الصورة في أول خانة بدل تجاهلها', () => {
    const slots = [slot('a', 'old-a'), slot('b', 'old-b')];
    const result = buildCollageInsertAssignments(slots, ['master'], null, false);

    expect(result).toEqual([{ slotId: 'a', src: 'master' }]);
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
