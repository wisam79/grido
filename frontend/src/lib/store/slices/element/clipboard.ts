import { nextZIndex, normalizeSelection } from './types';
import { uid } from '../../../utils';

import type { ElementCross, ElementSlice } from './types';
import type { CanvasElement, TextElement } from '../../types';
import type { StateCreator } from 'zustand';

export const createElementClipboardSlice: StateCreator<
  ElementCross,
  [],
  [],
  Pick<ElementSlice, 'copySelectedElements' | 'cutSelectedElements' | 'pasteCopiedElements'>
> = (set, get) => ({
  copySelectedElements: (targetIds) => {
    const state = get();
    const idsToCopy = targetIds && targetIds.length > 0 ? targetIds : [...state.selectedIds];
    if (idsToCopy.length === 0 && state.selectedId) {
      idsToCopy.push(state.selectedId);
    }
    if (idsToCopy.length === 0) return;

    const toCopy = state.elements.filter((el: CanvasElement) => idsToCopy.includes(el.id));
    if (toCopy.length > 0) {
      const cloned = toCopy.map((el: CanvasElement) => ({ ...el }));
      set({ clipboardElements: cloned });

      try {
        if (cloned.length === 1 && cloned[0].type === 'text') {
          const textVal = (cloned[0] as TextElement).text || '';
          navigator.clipboard.writeText(textVal);
        } else {
          navigator.clipboard.writeText('GRIDO_ELEMENTS:' + JSON.stringify(cloned));
        }
      } catch (e) {
        // Safe fallback if clipboard write API fails or is restricted
      }
    }
  },

  cutSelectedElements: (targetIds) => {
    const state = get();
    const idsToCut = targetIds && targetIds.length > 0 ? targetIds : [...state.selectedIds];
    const finalIds = idsToCut.length > 0 ? idsToCut : state.selectedId ? [state.selectedId] : [];
    if (finalIds.length === 0) return;

    const removableIds = finalIds.filter((id) => {
      const found = state.elements.find((e: CanvasElement) => e.id === id);
      return found && !found.locked;
    });

    if (removableIds.length === 0) return;

    const toCut = state.elements.filter((el: CanvasElement) => removableIds.includes(el.id));
    const cloned = toCut.map((el: CanvasElement) => ({ ...el }));
    set({ clipboardElements: cloned });

    try {
      if (cloned.length === 1 && cloned[0].type === 'text') {
        const textVal = (cloned[0] as TextElement).text || '';
        navigator.clipboard.writeText(textVal);
      } else {
        navigator.clipboard.writeText('GRIDO_ELEMENTS:' + JSON.stringify(cloned));
      }
    } catch (e) {
      // Safe fallback if clipboard write API fails
    }

    get().removeElements(removableIds);
  },

  pasteCopiedElements: (customElements) => {
    const state = get();
    const clipboard =
      customElements && customElements.length > 0 ? customElements : state.clipboardElements;
    if (!clipboard || clipboard.length === 0) return;

    const nextElements = [...state.elements];
    const newSelectedIds: string[] = [];
    const groupMappings: Record<string, string> = {};

    const sortedClipboard = [...clipboard].sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0));

    sortedClipboard.forEach((el) => {
      const newId = uid();

      let newGroupId = el.groupId;
      if (el.groupId) {
        if (!groupMappings[el.groupId]) {
          groupMappings[el.groupId] =
            `group-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
        }
        newGroupId = groupMappings[el.groupId];
      }

      const pasted: CanvasElement = {
        ...el,
        id: newId,
        groupId: newGroupId,
        x: Math.min(el.x + 0.03, 0.9),
        y: Math.min(el.y + 0.03, 0.9),
        zIndex: nextZIndex(nextElements),
      };

      nextElements.push(pasted);
      newSelectedIds.push(newId);
    });

    set({
      elements: nextElements,
      ...normalizeSelection(newSelectedIds, newSelectedIds[0]),
    });
    get().pushHistory();
  },
});
