import { StateCreator } from "zustand";
import { EditorState } from "../index";
import { PrintSettings } from "../types";
import { computeDynamicCollageCells, getEffectiveDpi } from "../../templates";
import { uid } from "../../utils";

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
  showCutLines: false,
  showEndCutLine: true,
  cutLineStyle: "dashed",
  orientation: "portrait",
  fitToPage: true,
  repeatMode: "all",
};

export const createPrintSlice: StateCreator<EditorState, [], [], PrintSlice> = (set) => ({
  printSettings: DEFAULT_PRINT_SETTINGS,
  printImageSrc: null,
  setPrintImageSrc: (src) => set({ printImageSrc: src }),
  setPrintSettings: (patch) =>
    set((s) => {
      const newSettings = { ...s.printSettings, ...patch };
      let adjustedSlots = s.slots || [];
      const mode = s.mode;
      const collageTemplate = s.collageTemplate;

      if (mode === "collage" && collageTemplate && collageTemplate.physicalLayout) {
        const storedDpi = newSettings.dpi || 300;
        const dpi = getEffectiveDpi(s.canvasWidth, s.canvasHeight, storedDpi);
        const dynamicCells = computeDynamicCollageCells(
          collageTemplate,
          s.canvasWidth,
          s.canvasHeight,
          dpi,
          s.collageGap,
          s.collageMargin
        );
        if (dynamicCells) {
          adjustedSlots = dynamicCells.map((c, i) => {
            const existingSlot = (s.slots || [])[i] || {};
            return {
              ...existingSlot,
              id: existingSlot.id || uid(),
              cellIndex: i,
              x: c.x,
              y: c.y,
              w: c.w,
              h: c.h,
            };
          });
        }
      }

      return {
        printSettings: newSettings,
        slots: adjustedSlots,
      };
    }),
});
