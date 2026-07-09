import { StateCreator } from "zustand";
import { EditorState } from "../index";
import { PrintSettings } from "../types";

export interface PrintSlice {
  printSettings: PrintSettings;
  printImageSrc: string | null;
  setPrintImageSrc: (src: string | null) => void;
  setPrintSettings: (patch: Partial<PrintSettings>) => void;
}

export const DEFAULT_PRINT_SETTINGS: PrintSettings = {
  paperId: "a4",
  paperWidthMM: 210,
  paperHeightMM: 297,
  marginMM: 5,
  gapMM: 2,
  dpi: 300,
  copiesPerSheet: 1,
  showCutLines: true,
  orientation: "portrait",
  fitToPage: true,
};

export const createPrintSlice: StateCreator<EditorState, [], [], PrintSlice> = (set) => ({
  printSettings: DEFAULT_PRINT_SETTINGS,
  printImageSrc: null,
  setPrintImageSrc: (src) => set({ printImageSrc: src }),
  setPrintSettings: (patch) =>
    set((s) => ({ printSettings: { ...s.printSettings, ...patch } })),
});
