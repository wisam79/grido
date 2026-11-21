import { buildElementLayerMovePatches, canArrangeSelection } from '@/lib/selection-properties';

import { normalizeSelection } from './types';
import { uid } from '../../../utils';

import type { ElementCross, ElementSlice } from './types';
import type { CanvasElement } from '../../types';
import type { StateCreator } from 'zustand';

/** A one-step reorder swaps complete unlocked layer units, not individual group members. */
function stepPastNeighbour(get: () => ElementCross, id: string, direction: 1 | -1): boolean {
  const patches = buildElementLayerMovePatches(
    get().elements,
    id,
    direction === 1 ? 'forward' : 'backward',
  );
  if (!patches.length) return false;
  get().updateElements(patches);
  return true;
}

export const createElementSelectionSlice: StateCreator<
  ElementCross,
  [],
  [],
  Pick<
    ElementSlice,
    | 'bringToFront'
    | 'sendToBack'
    | 'bringForward'
    | 'sendBackward'
    | 'selectElement'
    | 'selectAllElements'
    | 'setSelectedIds'
    | 'toggleElementSelection'
    | 'groupSelectedElements'
    | 'ungroupSelectedElements'
    | 'setEditingTextId'
  >
> = (set, get) => ({
  bringToFront: (id) => {
    const patches = buildElementLayerMovePatches(get().elements, id, 'front');
    if (!patches.length) return;
    get().updateElements(patches);
    get().pushHistory();
  },

  sendToBack: (id) => {
    const patches = buildElementLayerMovePatches(get().elements, id, 'back');
    if (!patches.length) return;
    get().updateElements(patches);
    get().pushHistory();
  },

  bringForward: (id) => {
    if (!stepPastNeighbour(get, id, 1)) return false;
    get().pushHistory();
    return true;
  },

  sendBackward: (id) => {
    if (!stepPastNeighbour(get, id, -1)) return false;
    get().pushHistory();
    return true;
  },

  selectElement: (id) => {
    if (!id) {
      set(normalizeSelection([]));
      return;
    }
    const el = get().elements.find((e: CanvasElement) => e.id === id);
    if (el && el.groupId) {
      const groupElIds = get()
        .elements.filter((e: CanvasElement) => e.groupId === el.groupId)
        .map((e: CanvasElement) => e.id);
      set(normalizeSelection(groupElIds, id));
    } else {
      set(normalizeSelection(id));
    }
  },

  selectAllElements: () => {
    // مطابقة تحديد المستطيل في الكانفاس: استبعاد العناصر المقفلة والمخفية (audit-11)
    const selectableIds = get()
      .elements.filter((el) => !el.locked && el.visible !== false)
      .map((el) => el.id);
    set(normalizeSelection(selectableIds));
  },

  setSelectedIds: (ids: string[]) => {
    set(normalizeSelection([...new Set(ids)]));
  },

  toggleElementSelection: (id) => {
    set((s) => {
      const el = s.elements.find((e: CanvasElement) => e.id === id);
      if (!el) return {};

      const isSelected = s.selectedIds.includes(id);
      let nextSelected: string[];

      if (el.groupId) {
        const groupElIds = s.elements
          .filter((e: CanvasElement) => e.groupId === el.groupId)
          .map((e: CanvasElement) => e.id);

        if (isSelected) {
          nextSelected = s.selectedIds.filter((x: string) => !groupElIds.includes(x));
        } else {
          nextSelected = [...s.selectedIds, ...groupElIds];
        }
      } else {
        if (isSelected) {
          nextSelected = s.selectedIds.filter((x: string) => x !== id);
        } else {
          nextSelected = [...s.selectedIds, id];
        }
      }

      return normalizeSelection([...new Set(nextSelected)], id);
    });
  },

  groupSelectedElements: () => {
    const { selectedIds, selectedId, elements } = get();
    if (!canArrangeSelection(elements, selectedIds)) return;
    const targets = new Set(selectedIds);
    const unlockedIds = elements
      .filter((el) => targets.has(el.id) && !el.locked)
      .map((el) => el.id);
    if (unlockedIds.length < 2) return;
    const selectedElements = elements.filter((el) => unlockedIds.includes(el.id));
    if (
      selectedElements[0].groupId &&
      selectedElements.every((el) => el.groupId === selectedElements[0].groupId)
    ) {
      return;
    }

    // uid() بدل `group-${Date.now()}`: معرّفان تاريخيان يتصادمان في نفس
    // المللي ثانية فتندمج مجموعتان مستقلتان في مجموعة واحدة (E-8)
    const newGroupId = uid();
    const unlockedSet = new Set(unlockedIds);

    set((s) => ({
      elements: s.elements.map((el: CanvasElement) =>
        unlockedSet.has(el.id) ? { ...el, groupId: newGroupId } : el,
      ),
      ...normalizeSelection(unlockedIds, selectedId),
    }));
    get().pushHistory();
  },

  ungroupSelectedElements: () => {
    const { selectedIds, elements } = get();
    if (selectedIds.length === 0) return;

    const lockedGroups = new Set(
      elements
        .filter((el: CanvasElement) => el.groupId && el.locked)
        .map((el: CanvasElement) => el.groupId as string),
    );
    const groupIdsToUngroup = elements
      .filter(
        (el: CanvasElement) =>
          selectedIds.includes(el.id) && el.groupId && !lockedGroups.has(el.groupId),
      )
      .map((el: CanvasElement) => el.groupId as string);

    if (groupIdsToUngroup.length === 0) return;

    set((s) => ({
      elements: s.elements.map((el: CanvasElement) =>
        el.groupId && groupIdsToUngroup.includes(el.groupId) ? { ...el, groupId: undefined } : el,
      ),
    }));
    get().pushHistory();
  },

  setEditingTextId: (id) => set({ editingTextId: id }),
});
