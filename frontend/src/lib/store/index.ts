import { create } from 'zustand';

import { createCollageSlice } from './slices/collage-slice';
import { createCoreSlice } from './slices/core-slice';
import { createElementSlice } from './slices/element-slice';
import { createGridSlice } from './slices/grid-slice';
import { createHistorySlice } from './slices/history-slice';
import { createLicenseSlice } from './slices/license-slice';
import { createPrintSlice } from './slices/print-slice';
import { createWorkflowSlice } from './slices/workflow-slice';

import type { CollageSlice } from './slices/collage-slice';
import type { CoreSlice } from './slices/core-slice';
import type { ElementSlice } from './slices/element-slice';
import type { GridSlice } from './slices/grid-slice';
import type { HistorySlice } from './slices/history-slice';
import type { LicenseSlice } from './slices/license-slice';
import type { PrintSlice } from './slices/print-slice';
import type { WorkflowSlice } from './slices/workflow-slice';

export type EditorState = CoreSlice &
  ElementSlice &
  CollageSlice &
  GridSlice &
  PrintSlice &
  HistorySlice &
  LicenseSlice &
  WorkflowSlice;

export type { ImageElement, TextElement, ShapeElement } from './types';

export const useEditorStore = create<EditorState>()((...a) => ({
  ...createCoreSlice(...a),
  ...createElementSlice(...a),
  ...createCollageSlice(...a),
  ...createGridSlice(...a),
  ...createPrintSlice(...a),
  ...createHistorySlice(...a),
  ...createLicenseSlice(...a),
  ...createWorkflowSlice(...a),
}));
