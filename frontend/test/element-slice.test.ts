import { describe, it, expect, beforeEach } from 'vitest';

import { useEditorStore } from '../src/lib/editor-store';
import { SHAPE_CATALOG, QUICK_SHAPES, getShapeByPath } from '../src/lib/io/shape-catalog';
import { SHAPE_PATH_TRIANGLE, SHAPE_PATH_HEART, SHAPE_PATH_DIAMOND } from '../src/lib/io/svg-paths';

import type { TextElement, ShapeElement } from '../src/lib/store/types';

describe('ElementSlice Unit Tests', () => {
  beforeEach(() => {
    useEditorStore.getState().reset();
    useEditorStore.getState().setMode('single');
  });

  it('adds a text element with default parameters', () => {
    useEditorStore.getState().addTextElement('مرحباً بك');
    const elements = useEditorStore.getState().elements;

    expect(elements.length).toBe(1);
    expect(elements[0].type).toBe('text');
    expect((elements[0] as TextElement).text).toBe('مرحباً بك');
  });

  it('adds a shape element correctly', () => {
    useEditorStore.getState().addShapeElement('rect');
    const elements = useEditorStore.getState().elements;

    expect(elements.length).toBe(1);
    expect(elements[0].type).toBe('shape');
  });

  it('adds vector path shapes (triangle, heart, diamond) with svgPath and viewBox correctly', () => {
    // الكتالوج الموحّد هو مرجع القوائم — لا قوائم أشكال ثانية في الواجهات
    expect(SHAPE_CATALOG.length).toBeGreaterThanOrEqual(30);
    expect(QUICK_SHAPES.length).toBeGreaterThanOrEqual(12);
    expect(getShapeByPath(SHAPE_PATH_TRIANGLE)?.id).toBe('triangle');

    useEditorStore.getState().addShapeElement('path', SHAPE_PATH_TRIANGLE);
    let el = useEditorStore.getState().elements[0] as ShapeElement;
    expect(el.shape).toBe('path');
    expect(el.svgPath).toBe(SHAPE_PATH_TRIANGLE);

    useEditorStore.getState().addShapeElement('path', SHAPE_PATH_HEART);
    el = useEditorStore.getState().elements[1] as ShapeElement;
    expect(el.shape).toBe('path');
    expect(el.svgPath).toBe(SHAPE_PATH_HEART);

    useEditorStore.getState().addShapeElement('path', SHAPE_PATH_DIAMOND);
    el = useEditorStore.getState().elements[2] as ShapeElement;
    expect(el.shape).toBe('path');
    expect(el.svgPath).toBe(SHAPE_PATH_DIAMOND);
  });

  it('updates element properties', () => {
    useEditorStore.getState().addTextElement('نص جديد');
    const elId = useEditorStore.getState().elements[0].id;

    useEditorStore.getState().updateElement(elId, { text: 'نص معدل', fontSize: 32 });

    const updated = useEditorStore.getState().elements.find((e) => e.id === elId) as
      TextElement | undefined;
    expect(updated?.text).toBe('نص معدل');
    expect(updated?.fontSize).toBe(32);
  });

  it('removes an element by ID', () => {
    useEditorStore.getState().addTextElement('عنصر 1');
    const elId = useEditorStore.getState().elements[0].id;

    useEditorStore.getState().removeElement(elId);

    expect(useEditorStore.getState().elements.length).toBe(0);
    expect(useEditorStore.getState().selectedId).toBeNull();
  });

  it('does not remove locked element by default unless force is true', () => {
    useEditorStore.getState().addTextElement('عنصر مقفل');
    const elId = useEditorStore.getState().elements[0].id;
    useEditorStore.getState().updateElement(elId, { locked: true });

    // محاولة الحذف العادي
    useEditorStore.getState().removeElement(elId);
    expect(useEditorStore.getState().elements.length).toBe(1);

    // الحذف بالقوة
    useEditorStore.getState().removeElement(elId, true);
    expect(useEditorStore.getState().elements.length).toBe(0);
  });

  it('filters out locked elements during removeElements batch unless force is true', () => {
    useEditorStore.getState().addTextElement('عنصر عادي');
    useEditorStore.getState().addTextElement('عنصر مقفل');
    const idNormal = useEditorStore.getState().elements[0].id;
    const idLocked = useEditorStore.getState().elements[1].id;
    useEditorStore.getState().updateElement(idLocked, { locked: true });

    // محاولة حذف الاثنين معاً
    useEditorStore.getState().removeElements([idNormal, idLocked]);
    expect(useEditorStore.getState().elements.length).toBe(1);
    expect(useEditorStore.getState().elements[0].id).toBe(idLocked);

    // الحذف الإجباري للمقفل
    useEditorStore.getState().removeElements([idLocked], true);
    expect(useEditorStore.getState().elements.length).toBe(0);
  });

  it('duplicates an element', () => {
    useEditorStore.getState().addTextElement('عنصر أصلي');
    const origId = useEditorStore.getState().elements[0].id;

    useEditorStore.getState().duplicateElement(origId);

    const elements = useEditorStore.getState().elements as TextElement[];
    expect(elements.length).toBe(2);
    expect(elements[1].text).toBe('عنصر أصلي');
    expect(elements[1].id).not.toBe(origId);
  });

  it('reorders elements using bringToFront and sendToBack', () => {
    useEditorStore.getState().addTextElement('الأول');
    useEditorStore.getState().addTextElement('الثاني');

    const firstId = useEditorStore.getState().elements[0].id;
    const secondId = useEditorStore.getState().elements[1].id;

    useEditorStore.getState().bringToFront(firstId);
    const el1 = useEditorStore.getState().elements.find((e) => e.id === firstId);
    const el2 = useEditorStore.getState().elements.find((e) => e.id === secondId);
    expect(el1!.zIndex).toBeGreaterThan(el2!.zIndex);

    useEditorStore.getState().sendToBack(firstId);
    const el1Back = useEditorStore.getState().elements.find((e) => e.id === firstId);
    expect(el1Back!.zIndex).toBeLessThan(el2!.zIndex);
  });

  it.each(['bringToFront', 'sendToBack'] as const)(
    'moves a complete group with %s and leaves other z slots untouched',
    (action) => {
      for (const name of ['A', 'B', 'Below', 'Above'])
        useEditorStore.getState().addTextElement(name);
      const [a, b, below, above] = useEditorStore.getState().elements;
      useEditorStore.getState().updateElements([
        { id: below.id, patch: { zIndex: 5 } },
        { id: a.id, patch: { groupId: 'g', zIndex: 20 } },
        { id: b.id, patch: { groupId: 'g', zIndex: 30 } },
        { id: above.id, patch: { zIndex: 100 } },
      ]);
      useEditorStore.getState().pushHistory();
      const before = useEditorStore.getState();
      useEditorStore.getState()[action](a.id);
      const after = useEditorStore.getState();
      expect(after.elements[0].zIndex).toBeLessThan(after.elements[1].zIndex);
      expect(after.elements[2]).toBe(before.elements[2]);
      expect(after.elements[3]).toBe(before.elements[3]);
      if (action === 'bringToFront') expect(after.elements[0].zIndex).toBeGreaterThan(100);
      else expect(after.elements[1].zIndex).toBeLessThan(5);
      expect(after.historyIndex).toBe(before.historyIndex + 1);
      useEditorStore.getState()[action](b.id);
      expect(useEditorStore.getState().history).toBe(after.history);
      useEditorStore.getState().undo();
      expect(useEditorStore.getState().elements.map((el) => el.zIndex)).toEqual(
        before.elements.map((el) => el.zIndex),
      );
    },
  );

  it('steps complete neighbouring groups using only their existing z slots', () => {
    for (const name of ['A', 'B', 'C', 'D', 'Other'])
      useEditorStore.getState().addTextElement(name);
    const [a, b, c, d, other] = useEditorStore.getState().elements;
    useEditorStore.getState().updateElements([
      { id: a.id, patch: { groupId: 'g1', zIndex: 10 } },
      { id: b.id, patch: { groupId: 'g1', zIndex: 20 } },
      { id: c.id, patch: { groupId: 'g2', zIndex: 70 } },
      { id: d.id, patch: { groupId: 'g2', zIndex: 90 } },
      { id: other.id, patch: { zIndex: 200, locked: true } },
    ]);
    useEditorStore.getState().pushHistory();
    const before = useEditorStore.getState();
    expect(useEditorStore.getState().bringForward(a.id)).toBe(true);
    const after = useEditorStore.getState();
    expect(after.elements.map((el) => el.zIndex)).toEqual([70, 90, 10, 20, 200]);
    expect(after.elements[4]).toBe(before.elements[4]);
    expect(after.historyIndex).toBe(before.historyIndex + 1);
    expect(useEditorStore.getState().sendBackward(b.id)).toBe(true);
    expect(useEditorStore.getState().elements.map((el) => el.zIndex)).toEqual([
      10, 20, 70, 90, 200,
    ]);
  });

  it.each(['bringForward', 'sendBackward', 'bringToFront', 'sendToBack'] as const)(
    'rejects %s across a locked neighbour without changing its order or history',
    (action) => {
      for (const name of ['Below', 'Self', 'Above']) useEditorStore.getState().addTextElement(name);
      const [below, self, above] = useEditorStore.getState().elements;
      useEditorStore.getState().updateElements([
        { id: below.id, patch: { zIndex: 10, locked: true } },
        { id: self.id, patch: { zIndex: 30 } },
        { id: above.id, patch: { zIndex: 50, locked: true } },
      ]);
      const before = useEditorStore.getState();
      useEditorStore.getState()[action](self.id);
      expect(useEditorStore.getState().elements).toBe(before.elements);
      expect(useEditorStore.getState().history).toBe(before.history);
    },
  );

  it('rejects ambiguous interleaved group reorders and a group with any locked member', () => {
    for (const name of ['A', 'Between', 'B']) useEditorStore.getState().addTextElement(name);
    const [a, middle, b] = useEditorStore.getState().elements;
    useEditorStore.getState().updateElements([
      { id: a.id, patch: { groupId: 'g', zIndex: 10 } },
      { id: middle.id, patch: { zIndex: 20 } },
      { id: b.id, patch: { groupId: 'g', zIndex: 30 } },
    ]);
    const before = useEditorStore.getState();
    useEditorStore.getState().bringToFront(a.id);
    expect(useEditorStore.getState().bringForward(a.id)).toBe(false);
    expect(useEditorStore.getState().elements).toBe(before.elements);
    useEditorStore.getState().updateElements([{ id: b.id, patch: { zIndex: 15, locked: true } }]);
    const locked = useEditorStore.getState();
    useEditorStore.getState().sendToBack(a.id);
    expect(useEditorStore.getState().bringForward(a.id)).toBe(false);
    expect(useEditorStore.getState().elements).toBe(locked.elements);
    expect(useEditorStore.getState().history).toBe(locked.history);
  });

  it('updates image filters (brightness, contrast, saturation, cornerRadius)', () => {
    useEditorStore.getState().addImageElement('/local-image/sample.jpg', 1);
    const imgEl = useEditorStore.getState().elements[0];
    expect(imgEl.type).toBe('image');

    useEditorStore.getState().updateElement(imgEl.id, {
      brightness: 0.2,
      contrast: 0.1,
      saturation: 1.2,
      blur: 2,
      cornerRadius: 12,
    });

    const updated = useEditorStore.getState().elements.find((e) => e.id === imgEl.id) as any;
    expect(updated.brightness).toBe(0.2);
    expect(updated.contrast).toBe(0.1);
    expect(updated.saturation).toBe(1.2);
    expect(updated.blur).toBe(2);
    expect(updated.cornerRadius).toBe(12);
  });

  it('toggles locked state and flips element horizontally/vertically', () => {
    useEditorStore.getState().addImageElement('/local-image/sample.jpg', 1);
    const imgEl = useEditorStore.getState().elements[0];

    useEditorStore.getState().updateElement(imgEl.id, {
      locked: true,
      flipX: true,
      flipY: false,
    });

    const updated = useEditorStore.getState().elements.find((e) => e.id === imgEl.id) as any;
    expect(updated.locked).toBe(true);
    expect(updated.flipX).toBe(true);
    expect(updated.flipY).toBe(false);
  });

  it('groups elements and preserves their relative layout during alignment', () => {
    useEditorStore.getState().addTextElement('النص 1');
    useEditorStore.getState().addTextElement('النص 2');
    const [el1, el2] = useEditorStore.getState().elements;

    useEditorStore.getState().updateElement(el1.id, { x: 0.1, y: 0.2, width: 0.1, height: 0.1 });
    useEditorStore.getState().updateElement(el2.id, { x: 0.3, y: 0.2, width: 0.1, height: 0.1 });

    useEditorStore.getState().setSelectedIds([el1.id, el2.id]);
    useEditorStore.getState().groupSelectedElements();

    const grouped = useEditorStore.getState().elements;
    expect(grouped[0].groupId).toBeDefined();
    expect(grouped[0].groupId).toBe(grouped[1].groupId);

    // محاذاة المجموعة ككتلة واحدة للمنتصف
    useEditorStore.getState().alignSelectedElements('center');

    const aligned = useEditorStore.getState().elements;
    const initialRelativeDistance = 0.3 - 0.1; // 0.2
    const newRelativeDistance = aligned[1].x - aligned[0].x;

    // يجب أن تحافظ العناصر على المسافة النسبية بين بعضها تماماً
    expect(Math.abs(newRelativeDistance - initialRelativeDistance)).toBeLessThan(0.0001);
  });

  it('refuses regrouping partial or locked groups without changing selection or history', () => {
    useEditorStore.getState().addTextElement('A');
    useEditorStore.getState().addTextElement('B');
    useEditorStore.getState().addTextElement('C');
    const [a, b, c] = useEditorStore.getState().elements;
    useEditorStore.getState().updateElements([
      { id: a.id, patch: { groupId: 'original' } },
      { id: b.id, patch: { groupId: 'original' } },
    ]);
    for (const locked of [false, true]) {
      useEditorStore.getState().updateElement(b.id, { locked });
      useEditorStore.getState().setSelectedIds(locked ? [a.id, b.id, c.id] : [a.id, c.id]);
      const before = useEditorStore.getState();
      useEditorStore.getState().groupSelectedElements();
      const after = useEditorStore.getState();
      expect(after.elements).toBe(before.elements);
      expect(after.selectedIds).toBe(before.selectedIds);
      expect(after.history).toBe(before.history);
    }
  });

  it('groups only existing eligible IDs and normalizes selection to the new group', () => {
    useEditorStore.getState().addTextElement('A');
    useEditorStore.getState().addTextElement('B');
    useEditorStore.getState().addTextElement('Locked');
    const [a, b, locked] = useEditorStore.getState().elements;
    useEditorStore.getState().updateElement(locked.id, { locked: true });
    useEditorStore.getState().setSelectedIds([a.id, b.id, locked.id, 'stale']);
    useEditorStore.getState().groupSelectedElements();
    const after = useEditorStore.getState();
    expect(after.elements[0].groupId).toBeTruthy();
    expect(after.elements[1].groupId).toBe(after.elements[0].groupId);
    expect(after.elements[2].groupId).toBeUndefined();
    expect(after.selectedIds).toEqual([a.id, b.id]);
    expect(after.selectedId).toBe(b.id);
    const history = after.history;
    useEditorStore.getState().groupSelectedElements();
    expect(useEditorStore.getState().history).toBe(history);
  });

  it('does not manufacture a singleton group from stale or duplicate IDs', () => {
    useEditorStore.getState().addTextElement('A');
    const [a] = useEditorStore.getState().elements;
    useEditorStore.getState().setSelectedIds([a.id, a.id]);
    expect(useEditorStore.getState().selectedIds).toEqual([a.id]);
    useEditorStore.getState().setSelectedIds([a.id, 'stale']);
    const before = useEditorStore.getState();
    useEditorStore.getState().groupSelectedElements();
    expect(useEditorStore.getState().elements).toBe(before.elements);
    expect(useEditorStore.getState().history).toBe(before.history);
    // selectElement also serves collage slots, not just free elements.
    const slotId = useEditorStore.getState().slots[0].id;
    useEditorStore.getState().selectElement(slotId);
    expect(useEditorStore.getState().selectedId).toBe(slotId);
    expect(useEditorStore.getState().selectedIds).toEqual([slotId]);
  });

  it('ungroups a complete unlocked group but never splits a group containing a lock', () => {
    useEditorStore.getState().addTextElement('A');
    useEditorStore.getState().addTextElement('B');
    const [a, b] = useEditorStore.getState().elements;
    useEditorStore.getState().updateElements([
      { id: a.id, patch: { groupId: 'g' } },
      { id: b.id, patch: { groupId: 'g', locked: true } },
    ]);
    useEditorStore.getState().setSelectedIds([a.id]);
    const before = useEditorStore.getState();
    useEditorStore.getState().ungroupSelectedElements();
    expect(useEditorStore.getState().elements).toBe(before.elements);
    expect(useEditorStore.getState().history).toBe(before.history);
    useEditorStore.getState().updateElement(b.id, { locked: false });
    useEditorStore.getState().ungroupSelectedElements();
    expect(useEditorStore.getState().elements.every((el) => !el.groupId)).toBe(true);
  });

  it('preserves a surviving locked primary when batch deletion skips it', () => {
    useEditorStore.getState().addTextElement('A');
    useEditorStore.getState().addTextElement('Primary');
    useEditorStore.getState().addTextElement('C');
    const [a, primary, c] = useEditorStore.getState().elements;
    useEditorStore.getState().updateElement(primary.id, { locked: true });
    useEditorStore.setState({
      selectedIds: [primary.id, c.id, a.id],
      selectedId: primary.id,
    });
    expect(useEditorStore.getState().selectedId).toBe(primary.id);
    useEditorStore.getState().removeElements([a.id, primary.id]);
    expect(useEditorStore.getState().selectedIds).toEqual([primary.id, c.id]);
    expect(useEditorStore.getState().selectedId).toBe(primary.id);
  });

  it.each(['partial', 'locked'] as const)(
    'keeps %s groups atomic for alignment and distribution',
    (kind) => {
      for (const text of ['A', 'B', 'C', 'D']) useEditorStore.getState().addTextElement(text);
      const [a, b, c, d] = useEditorStore.getState().elements;
      useEditorStore.getState().updateElements([
        { id: a.id, patch: { groupId: 'g', x: 0.1 } },
        { id: b.id, patch: { groupId: 'g', x: 0.3, locked: kind === 'locked' } },
        { id: c.id, patch: { x: 0.55 } },
        { id: d.id, patch: { x: 0.8 } },
      ]);
      useEditorStore
        .getState()
        .setSelectedIds(kind === 'partial' ? [a.id, c.id, d.id] : [a.id, b.id, c.id, d.id]);
      const before = useEditorStore.getState();
      useEditorStore.getState().alignSelectedElements('left');
      useEditorStore.getState().distributeSelectedElements('horizontal');
      expect(useEditorStore.getState().elements).toBe(before.elements);
      expect(useEditorStore.getState().history).toBe(before.history);
    },
  );

  it('guarantees normalized and synchronized selectedId and selectedIds across all selection operations', () => {
    useEditorStore.getState().addTextElement('أ');
    useEditorStore.getState().addTextElement('ب');
    const [elA, elB] = useEditorStore.getState().elements;

    // Single select
    useEditorStore.getState().selectElement(elA.id);
    expect(useEditorStore.getState().selectedId).toBe(elA.id);
    expect(useEditorStore.getState().selectedIds).toEqual([elA.id]);

    // Multi-select via setSelectedIds
    useEditorStore.getState().setSelectedIds([elA.id, elB.id]);
    expect(useEditorStore.getState().selectedIds).toEqual([elA.id, elB.id]);
    expect(useEditorStore.getState().selectedId).toBe(elB.id);

    // Toggle out B should leave A and keep selectedId as A
    useEditorStore.getState().toggleElementSelection(elB.id);
    expect(useEditorStore.getState().selectedIds).toEqual([elA.id]);
    expect(useEditorStore.getState().selectedId).toBe(elA.id);

    // Deleting element A clears both
    useEditorStore.getState().removeElement(elA.id);
    expect(useEditorStore.getState().selectedIds).toEqual([]);
    expect(useEditorStore.getState().selectedId).toBeNull();
  });
});
