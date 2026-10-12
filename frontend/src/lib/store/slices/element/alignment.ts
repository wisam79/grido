import type { StateCreator } from 'zustand';
import {
  calculateAlignmentPatches,
  calculateDistributionPatches,
} from '../../../canvas/element-alignment';
import type { ElementCross, ElementSlice } from './types';

export const createElementAlignmentSlice: StateCreator<
  ElementCross,
  [],
  [],
  Pick<ElementSlice, 'alignSelectedElements' | 'distributeSelectedElements'>
> = (set, get) => ({
  alignSelectedElements: (alignment) => {
    const state = get();
    const targetIds =
      state.selectedIds.length > 0 ? state.selectedIds : state.selectedId ? [state.selectedId] : [];
    if (targetIds.length === 0) return;

    const patches = calculateAlignmentPatches(
      state.elements,
      targetIds,
      alignment,
      state.canvasWidth,
      state.canvasHeight,
    );

    if (patches.length > 0) {
      get().updateElements(patches);
      get().pushHistory();
    }
  },

  distributeSelectedElements: (axis) => {
    const state = get();
    const targetIds = state.selectedIds.length >= 3 ? state.selectedIds : [];
    if (targetIds.length < 3) return;

    const patches = calculateDistributionPatches(
      state.elements,
      targetIds,
      axis,
      state.canvasWidth,
      state.canvasHeight,
    );

    if (patches.length > 0) {
      get().updateElements(patches);
      get().pushHistory();
    }
  },
});
