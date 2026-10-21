import { maxZIndex, minZIndex, normalizeSelection } from './types';
import { uid } from '../../../utils';

import type { ElementCross, ElementSlice } from './types';
import type { CanvasElement } from '../../types';
import type { StateCreator } from 'zustand';

export const createElementSelectionSlice: StateCreator<
  ElementCross,
  [],
  [],
  Pick<
    ElementSlice,
    | 'bringToFront'
    | 'sendToBack'
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
    const maxZ = maxZIndex(get().elements);
    get().updateElement(id, { zIndex: maxZ + 10 });
    get().pushHistory();
  },

  sendToBack: (id) => {
    const minZ = minZIndex(get().elements);
    get().updateElement(id, { zIndex: minZ - 10 });
    get().pushHistory();
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
    const visibleIds = get()
      .elements.filter((el) => el.visible !== false)
      .map((el) => el.id);
    set(normalizeSelection(visibleIds));
  },

  setSelectedIds: (ids: string[]) => {
    set(normalizeSelection(ids));
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

      return normalizeSelection(nextSelected, id);
    });
  },

  groupSelectedElements: () => {
    const { selectedIds } = get();
    if (selectedIds.length < 2) return;

    // uid() بدل `group-${Date.now()}`: معرّفان تاريخيان يتصادمان في نفس
    // المللي ثانية فتندمج مجموعتان مستقلتان في مجموعة واحدة (E-8)
    const newGroupId = uid();

    set((s) => ({
      elements: s.elements.map((el: CanvasElement) =>
        selectedIds.includes(el.id) ? { ...el, groupId: newGroupId } : el,
      ),
    }));
    get().pushHistory();
  },

  ungroupSelectedElements: () => {
    const { selectedIds, elements } = get();
    if (selectedIds.length === 0) return;

    const groupIdsToUngroup = elements
      .filter((el: CanvasElement) => selectedIds.includes(el.id) && el.groupId)
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
