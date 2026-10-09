import { StateCreator } from 'zustand';
import { EditorState } from '../index';
import { PrintSettings } from '../types';
import { computeDynamicCollageCells, getEffectiveDpi } from '../../templates';
import { remapSlotsToCells } from './collage-slice';

export interface PrintSlice {
  printSettings: PrintSettings;
  printImageSrc: string | null;
  setPrintImageSrc: (src: string | null) => void;
  setPrintSettings: (patch: Partial<PrintSettings>) => void;
}

export const DEFAULT_PRINT_SETTINGS: PrintSettings = {
  paperId: 'canvas',
  paperWidthMM: 210,
  paperHeightMM: 297,
  marginMM: 0,
  gapMM: 2,
  dpi: 300,
  copiesPerSheet: 1,
  showCutLines: false,
  showEndCutLine: true,
  cutLineStyle: 'dashed',
  orientation: 'portrait',
  fitToPage: false,
  repeatMode: 'all',
  gridAlign: 'top-left',
};

export const createPrintSlice: StateCreator<EditorState, [], [], PrintSlice> = (set, get) => ({
  printSettings: DEFAULT_PRINT_SETTINGS,
  printImageSrc: null,
  setPrintImageSrc: (src) => set({ printImageSrc: src }),
  setPrintSettings: (patch) =>
    set((s) => {
      const newSettings = { ...s.printSettings, ...patch };
      let adjustedSlots = s.slots || [];
      const mode = s.mode;
      const collageTemplate = s.collageTemplate;
      // تغيير الـ DPI يعيد بناء هندسة الخانات فعلياً — يستحق خطوة تراجع
      const dpiChanged = patch.dpi !== undefined && patch.dpi !== s.printSettings.dpi;

      if (mode === 'collage' && collageTemplate && collageTemplate.physicalLayout && dpiChanged) {
        const storedDpi = newSettings.dpi || 300;
        const dpi = getEffectiveDpi(s.canvasWidth, s.canvasHeight, storedDpi);
        const dynamicCells = computeDynamicCollageCells(
          collageTemplate,
          s.canvasWidth,
          s.canvasHeight,
          dpi,
          s.collageGap,
          s.collageMargin,
        );
        if (dynamicCells) {
          adjustedSlots = remapSlotsToCells(s.slots || [], dynamicCells);
        }
      }

      // 🛡️ H4 من تدقيق 2026-10-08: إعادة بناء الخانات كانت تجري بلا `pushHistory`
      // بينما `printSettings` نفسه غائب عن اللقطات — أي تغيير DPI كان يرجّع
      // الخانات بـ Ctrl+Z ويُبقي الـ DPI الجديد. اللقطة الآن تغطي الحقلين معاً.
      if (dpiChanged) {
        setTimeout(() => get().pushHistory(), 0);
      }

      return {
        printSettings: newSettings,
        slots: adjustedSlots,
      };
    }),
});
