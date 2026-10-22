import { createElementAlignmentSlice } from './alignment';
import { createElementClipboardSlice } from './clipboard';
import { createElementCrudSlice } from './crud';
import { createImageElementsSlice } from './image-elements';
import { createElementMergeSlice } from './merge';
import { createElementSelectionSlice } from './selection';
import { createShapeElementsSlice } from './shape-elements';
import { createTextElementsSlice } from './text-elements';
import { DEFAULT_ELEMENT_STATE } from './types';

import type {
  BatchImageItem,
  ElementCross,
  ElementSlice,
  MergeResult,
  RasterizeResult,
  TextPresetType,
} from './types';
import type { StateCreator } from 'zustand';

export type {
  BatchImageItem,
  ElementCross,
  ElementSlice,
  MergeResult,
  RasterizeResult,
  TextPresetType,
};
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
  ...createElementMergeSlice(...a),
});
