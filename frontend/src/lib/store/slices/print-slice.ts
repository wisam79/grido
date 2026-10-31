import { remapSlotsToCells } from './collage-slice';
import { computeDynamicCollageCells, getEffectiveDpi } from '../../templates';

import type { EditorState } from '../index';
import type { PrintSettings } from '../types';
import type { StateCreator } from 'zustand';

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
  colorSpace: 'sRGB',
  outputFormat: 'jpeg',
  fitToPage: false,
  repeatMode: 'all',
  gridAlign: 'top-left',
};

export const createPrintSlice: StateCreator<EditorState, [], [], PrintSlice> = (set, get) => ({
  printSettings: DEFAULT_PRINT_SETTINGS,
  printImageSrc: null,
  setPrintImageSrc: (src) => set({ printImageSrc: src }),
  // 🛡️ H4 من تدقيق 2026-10-08: إعادة بناء الخانات كانت تجري بلا `pushHistory`
  // بينما `printSettings` نفسه غائب عن اللقطات — أي تغيير DPI كان يرجّع
  // الخانات بـ Ctrl+Z ويُبقي الـ DPI الجديد. اللقطة الآن تغطي الحقلين معاً.
  // 🛡️ مُحدِّث نقي: الدفع المؤجل بـ setTimeout داخل set() كان مزدوج التنفيذ
  // في StrictMode ويلتقط لقطة من حالة مستقبلية (ويُصفّر redo خطأً عند تراجع
  // بينهما) — الحساب خارج المُحدِّث ثم set() واحدة ثم دفع متزامن.
  setPrintSettings: (patch) => {
    const s = get();
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

    set({
      printSettings: newSettings,
      slots: adjustedSlots,
    });
    if (dpiChanged) {
      get().pushHistory();
    }
  },
});
