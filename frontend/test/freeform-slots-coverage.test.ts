import { describe, it, expect } from 'vitest';

import {
  newSlotId,
  snapToGrid,
  addDefaultSlot,
  slotsFromFile,
  moveSlot,
  moveSlots,
  moveSlotsWithinBounds,
  normalizeSlotSelection,
  distributeSlots,
  alignSlotsToEachOther,
  scaleSlotsByIds,
  autoPackSlots,
  parseLayoutFile,
  exportLayoutFile,
} from '../src/features/freeform-collage/lib/slots';

import type { FreeformSlot, FreeformLayoutFile } from '../src/features/freeform-collage/types';

const slot = (over: Partial<FreeformSlot> = {}): FreeformSlot => ({
  id: 's1',
  x: 0.1,
  y: 0.1,
  w: 0.3,
  h: 0.3,
  ...over,
});

describe('slots barrel — previously uncovered units', () => {
  it('newSlotId_generates_unique_prefixed_ids', () => {
    const ids = new Set(Array.from({ length: 50 }, () => newSlotId('slot_test')));
    expect(ids.size).toBe(50);
    for (const id of ids) expect(id.startsWith('slot_test_')).toBe(true);
  });

  it.each([
    [0.013, 0.025],
    [0.03, 0.025],
    [0.04, 0.05],
    [0, 0],
  ])('snapToGrid_snaps_%p_to_%p', (value, expected) => {
    expect(snapToGrid(value)).toBeCloseTo(expected, 10);
  });

  it('addDefaultSlot_appends_bounded_cell', () => {
    const next = addDefaultSlot([slot({ id: 'a', x: 0, y: 0, w: 0.5, h: 0.5 })]);
    expect(next).toHaveLength(2);
    const added = next[1];
    expect(added.w).toBe(0.35);
    expect(added.h).toBe(0.3);
    expect(added.x + added.w).toBeLessThanOrEqual(1 + 1e-9);
    expect(added.y + added.h).toBeLessThanOrEqual(1 + 1e-9);
  });

  it('slotsFromFile_assigns_fresh_ids_keep_geometry', () => {
    const file: FreeformLayoutFile = {
      format: 'grido-freeform',
      version: 1,
      name: 'مستورد',
      paperWidthMM: 100,
      paperHeightMM: 150,
      slots: [
        { x: 0.1, y: 0.2, w: 0.3, h: 0.4, presetType: 'passport', label: 'أ', rotation: 0 },
        { x: 0.5, y: 0.5, w: 0.2, h: 0.2, presetType: 'id', label: 'ب', rotation: 90 },
      ],
    };
    const out = slotsFromFile(file);
    expect(out).toHaveLength(2);
    expect(out[0].x).toBe(0.1);
    expect(out[1].rotation).toBe(90);
    expect(new Set(out.map((s) => s.id)).size).toBe(2);
  });

  it('moveSlots_empty_selection_returns_group_unchanged', () => {
    const group = [slot({ id: 'a' }), slot({ id: 'b', x: 0.5 })];
    const { slots, snapLines } = moveSlots(group, [], 0.2, 0.2);
    expect(slots).toEqual(group);
    expect(snapLines).toEqual([]);
  });

  it('moveSlots_single_target_matches_direct_move', () => {
    const group = [slot({ id: 'a' }), slot({ id: 'b', x: 0.5 })];
    const viaGroup = moveSlots(group, ['a'], 0.1, 0.05);
    const direct = moveSlot(group, 'a', 0.1, 0.05);
    expect(viaGroup.slots).toEqual(direct.slots);
    expect(viaGroup.snapLines).toEqual(direct.snapLines);
  });

  it('normalizes primary and secondary membership without duplicates or input mutation', () => {
    const secondary = ['b', 'a', 'b', 'c'];
    expect(normalizeSlotSelection('a', secondary)).toEqual({
      selectedSlotId: 'a',
      multiSelectedIds: ['b', 'c'],
      selectedIds: ['a', 'b', 'c'],
    });
    expect(secondary).toEqual(['b', 'a', 'b', 'c']);
    expect(normalizeSlotSelection('b', ['a', 'b', 'c']).selectedIds).toEqual(['b', 'a', 'c']);
    expect(normalizeSlotSelection(null, ['b', 'b'])).toEqual({
      selectedSlotId: 'b',
      multiSelectedIds: [],
      selectedIds: ['b'],
    });
    expect(normalizeSlotSelection(null)).toEqual({
      selectedSlotId: null,
      multiSelectedIds: [],
      selectedIds: [],
    });
  });

  it.each([
    { dx: 10, dy: 10, shiftX: 0.1, shiftY: 0.15 },
    { dx: -10, dy: -10, shiftX: -0.1, shiftY: -0.2 },
    { dx: 0.015, dy: -0.007, shiftX: 0.015, shiftY: -0.007 },
  ])('clamps a free group by one AABB delta ($dx, $dy)', ({ dx, dy, shiftX, shiftY }) => {
    const group = [
      slot({ id: 'a', x: 0.1, y: 0.2, w: 0.2, h: 0.3 }),
      slot({ id: 'b', x: 0.6, y: 0.65, w: 0.3, h: 0.2 }),
      slot({ id: 'outside', x: 0, y: 0.95, w: 0.05, h: 0.05 }),
    ];
    const moved = moveSlotsWithinBounds(group, ['b', 'a', 'a', 'missing'], dx, dy);
    for (const index of [0, 1]) {
      expect(moved[index].x - group[index].x).toBeCloseTo(shiftX);
      expect(moved[index].y - group[index].y).toBeCloseTo(shiftY);
      expect(moved[index].w).toBe(group[index].w);
      expect(moved[index].h).toBe(group[index].h);
      expect(moved[index].x).toBeGreaterThanOrEqual(-1e-12);
      expect(moved[index].y).toBeGreaterThanOrEqual(-1e-12);
      expect(moved[index].x + moved[index].w).toBeLessThanOrEqual(1 + 1e-12);
      expect(moved[index].y + moved[index].h).toBeLessThanOrEqual(1 + 1e-12);
    }
    expect(moved[1].x - moved[0].x).toBeCloseTo(0.5);
    expect(moved[1].y - moved[0].y).toBeCloseTo(0.45);
    expect(moved[2]).toBe(group[2]);
    expect(group[0].x).toBe(0.1);
    expect(group[1].y).toBe(0.65);
  });

  it('returns the same slots for empty, missing, zero, or edge-blocked movement', () => {
    const group = [slot({ id: 'a', x: 0.8, y: 0, w: 0.2, h: 0.2 })];
    expect(moveSlotsWithinBounds(group, [], 0.1, 0.1)).toBe(group);
    expect(moveSlotsWithinBounds(group, ['missing'], 0.1, 0.1)).toBe(group);
    expect(moveSlotsWithinBounds(group, ['a'], 0, 0)).toBe(group);
    expect(moveSlotsWithinBounds(group, ['a'], 0.005, -0.005)).toBe(group);
  });

  it('distributeSlots_pair_returns_unchanged_guard', () => {
    const pair = [slot({ id: 'a', x: 0 }), slot({ id: 'b', x: 0.7 })];
    expect(distributeSlots(pair, 'horizontal')).toEqual(pair);
  });

  it.each([
    ['right', 'b', 'x', 0.5],
    ['top', 'b', 'y', 0],
    ['bottom', 'b', 'y', 0.65],
    ['center-h', 'b', 'x', 0.2333],
    ['center-v', 'b', 'y', 0.3583],
  ] as const)('alignSlotsToEachOther_group_%p_moves_follower', (alignment, id, axis, expected) => {
    const trio: FreeformSlot[] = [
      slot({ id: 'a', x: 0, y: 0, w: 0.4, h: 0.3 }),
      slot({ id: 'b', x: 0.5, y: 0.4, w: 0.2, h: 0.2 }),
      slot({ id: 'c', x: 0.1, y: 0.6, w: 0.2, h: 0.25 }),
    ];
    const out = alignSlotsToEachOther(trio, ['a', 'b', 'c'], alignment);
    expect(out.find((s) => s.id === id)![axis]).toBeCloseTo(expected, 4);
  });

  it.each([0, -1])('scaleSlotsByIds_rejects_factor_%p', (factor) => {
    const group = [slot({ id: 'a' }), slot({ id: 'b', x: 0.5 })];
    expect(scaleSlotsByIds(group, ['a'], factor)).toEqual(group);
  });

  it.each([
    ['wallet-max', 210, 297],
    ['transactions-max', 100, 150],
    ['combo-family', 100, 150],
  ] as const)('autoPackSlots_strategy_%p_fills_paper', (strategy, paperW, paperH) => {
    const packed = autoPackSlots(strategy, paperW, paperH);
    expect(packed.length).toBeGreaterThanOrEqual(2);
    for (const s of packed) {
      expect(s.x).toBeGreaterThanOrEqual(0);
      expect(s.y).toBeGreaterThanOrEqual(0);
      expect(s.x + s.w).toBeLessThanOrEqual(1 + 1e-9);
      expect(s.y + s.h).toBeLessThanOrEqual(1 + 1e-9);
    }
    expect(new Set(packed.map((s) => s.id)).size).toBe(packed.length);
  });

  it('parseLayoutFile_sanitizes_hostile_import', () => {
    const hostile = JSON.stringify({
      format: 'grido-freeform',
      version: 1,
      name: 'x'.repeat(200),
      paperWidthMM: 100,
      paperHeightMM: 150,
      slots: [
        { x: 0, y: 0, w: 0.4, h: 0.4, label: 'L'.repeat(200), rotation: 45 },
        ...Array.from({ length: 5 }, (_, i) => ({ x: 0, y: 0, w: 0.1, h: 0.1, label: `s${i}` })),
      ],
    });
    const parsed = parseLayoutFile(hostile);
    expect(parsed).not.toBeNull();
    expect(parsed!.slots[0].rotation).toBe(0);
    expect(parsed!.slots[0].label!.length).toBeLessThanOrEqual(60);
    expect(parsed!.name.length).toBeLessThanOrEqual(80);
  });

  it.each([
    [
      'empty slots',
      '{"format":"grido-freeform","paperWidthMM":100,"paperHeightMM":150,"slots":[]}',
    ],
    [
      'tiny paper',
      '{"format":"grido-freeform","paperWidthMM":5,"paperHeightMM":150,"slots":[{"x":0,"y":0,"w":0.2,"h":0.2}]}',
    ],
    [
      'oversized slot count',
      `{"format":"grido-freeform","paperWidthMM":100,"paperHeightMM":150,"slots":[${Array.from(
        { length: 201 },
        () => '{"x":0,"y":0,"w":0.01,"h":0.01}',
      ).join(',')}]}`,
    ],
  ])('parseLayoutFile_rejects_%s', (_name, raw) => {
    expect(parseLayoutFile(raw)).toBeNull();
  });

  it('layout_export_roundtrip_through_new_barrel', () => {
    const slots = [slot({ presetType: 'passport', label: 'جواز', rotation: 0 })];
    const file = exportLayoutFile('برميل', 100, 150, slots);
    const parsed = parseLayoutFile(JSON.stringify(file));
    expect(parsed!.slots[0].w).toBeCloseTo(0.3, 4);
    expect(slotsFromFile(parsed!)).toHaveLength(1);
  });
});
