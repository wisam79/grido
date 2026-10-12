import type { StateCreator } from 'zustand';
import { DEFAULT_ELEMENT_STATE } from './types';
import type { BatchImageItem, ElementCross, ElementSlice } from './types';
import type { TextPresetType } from './types';
import { createImageElementsSlice } from './image-elements';
import { createTextElementsSlice } from './text-elements';
import { createShapeElementsSlice } from './shape-elements';
import { createElementCrudSlice } from './crud';
import { createElementClipboardSlice } from './clipboard';
import { createElementSelectionSlice } from './selection';
import { createElementAlignmentSlice } from './alignment';

export type { BatchImageItem, ElementCross, ElementSlice, TextPresetType };
export {
  DEFAULT_ELEMENT_STATE,
  maxZIndex,
  minZIndex,
  nextZIndex,
  normalizeSelection,
} from './types';

export const createElementSlice: StateCreator<ElementCross, [], [], ElementSlice> = (...a) => ({
  ...DEFAULT_ELEMENT_STATE,
  ...createImageElementsSlice(...a),
  ...createTextElementsSlice(...a),
  ...createShapeElementsSlice(...a),
  ...createElementCrudSlice(...a),
  ...createElementClipboardSlice(...a),
  ...createElementSelectionSlice(...a),
  ...createElementAlignmentSlice(...a),
});
