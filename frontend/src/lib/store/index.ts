import { create } from "zustand";
import { createCoreSlice, CoreSlice } from "./slices/core-slice";
import { createElementSlice, ElementSlice } from "./slices/element-slice";
import { createCollageSlice, CollageSlice } from "./slices/collage-slice";
import { createGridSlice, GridSlice } from "./slices/grid-slice";
import { createPrintSlice, PrintSlice } from "./slices/print-slice";
import { createHistorySlice, HistorySlice } from "./slices/history-slice";

export type EditorState = CoreSlice & ElementSlice & CollageSlice & GridSlice & PrintSlice & HistorySlice;

export type { ImageElement, TextElement, ShapeElement } from "./types";

export const useEditorStore = create<EditorState>()((...a) => ({
  ...createCoreSlice(...a),
  ...createElementSlice(...a),
  ...createCollageSlice(...a),
  ...createGridSlice(...a),
  ...createPrintSlice(...a),
  ...createHistorySlice(...a),
}));
