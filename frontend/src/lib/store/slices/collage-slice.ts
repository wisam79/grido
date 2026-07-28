import { StateCreator } from "zustand";
import { CanvasElement, CanvasSlot, PhotoTemplate, CollageTemplate } from "../types";
import { uid } from "../../utils";
import { COLLAGE_TEMPLATES, computeDynamicCollageCells, getEffectiveDpi } from "../../templates";

export interface CollageSlice {
  template: PhotoTemplate | null;
  collageTemplate: CollageTemplate | null;
  slots: CanvasSlot[];
  collageGap: number;
  collageMargin: number;
  collageRadius: number;
  collageShowCutLines: boolean;
  collageStrokeWidth: number;
  collageStrokeColor: string;

  setTemplate: (template: PhotoTemplate | null) => void;
  setCollageTemplate: (template: CollageTemplate | null) => void;
  setSlotImage: (slotId: string, src: string) => void;
  updateSlot: (slotId: string, patch: Partial<CanvasSlot>) => void;
  clearSlots: () => void;
  fillAllSlots: (src: string, sourceSlotId?: string) => void;
  fillRowSlots: (slotId: string, src: string) => void;
  fillColumnSlots: (slotId: string, src: string) => void;

  setCollageGap: (gap: number) => void;
  setCollageMargin: (margin: number) => void;
  setCollageRadius: (radius: number) => void;
  setCollageShowCutLines: (show: boolean) => void;
  setCollageStrokeWidth: (width: number) => void;
  setCollageStrokeColor: (color: string) => void;
}

const initialCollage = COLLAGE_TEMPLATES[0];

export function generateInitialSlots(): CanvasSlot[] {
  return initialCollage.cells.map((c, i) => ({
    id: "slot_" + i + "_" + Math.random().toString(36).slice(2, 9),
    cellIndex: i,
    x: c.x,
    y: c.y,
    w: c.w,
    h: c.h,
    filter: "none",
    brightness: 100,
    contrast: 100,
    saturation: 100,
    zoom: 1,
    dragX: 0,
    dragY: 0,
  }));
}

export const DEFAULT_COLLAGE_STATE = {
  template: null as PhotoTemplate | null,
  collageTemplate: initialCollage,
  slots: generateInitialSlots(),
  collageGap: 0,
  collageMargin: 0,
  collageRadius: 0,
  collageShowCutLines: false,
  collageStrokeWidth: 0,
  collageStrokeColor: "#000000",
};

type CollageCross = CollageSlice & {
  mode: string;
  canvasWidth: number;
  canvasHeight: number;
  backgroundColor: string;
  elements: CanvasElement[];
  selectedId: string | null;
  lastEditedImage: string | null;
  lastEditedImageAspect: number | null;
  history: any[];
  historyIndex: number;
  pushHistory: () => void;
  printSettings?: any;
};

export const createCollageSlice: StateCreator<CollageCross, [], [], CollageSlice> = (set, get) => ({
  ...DEFAULT_COLLAGE_STATE,

  setTemplate: (template) => {
    if (template) {
      const lastImg = get().lastEditedImage;
      const lastAspect = get().lastEditedImageAspect || 1;
      const elements: CanvasElement[] = [];
      if (lastImg) {
        const id = uid();
        let hPercent = 0.6;
        let wPercent = hPercent * (template.height / template.width) * lastAspect;

        if (wPercent > 0.8) {
          wPercent = 0.8;
          hPercent = (wPercent * (template.width / template.height)) / lastAspect;
        }

        elements.push({
          id,
          type: "image",
          x: 0.5 - wPercent / 2,
          y: 0.5 - hPercent / 2,
          width: wPercent,
          height: hPercent,
          rotation: 0,
          opacity: 1,
          zIndex: 10,
          imageSrc: lastImg,
          filter: "none",
          brightness: 100,
          contrast: 100,
          saturation: 100,
          blur: 0,
        });
      }
      set({
        template,
        mode: "single",
        canvasWidth: template.width,
        canvasHeight: template.height,
        backgroundColor: template.background,
        elements,
        slots: [],
        selectedId: elements[0]?.id || null,
        history: [{ elements, slots: [] }],
        historyIndex: 0,
      });
    } else {
      set({ template: null });
    }
  },

  setCollageTemplate: (template) => {
    if (template) {
      const currentWidth = get().canvasWidth || 2480;
      const currentHeight = get().canvasHeight || 3508;
      const storedDpi = get().printSettings?.dpi || 300;
      const dpi = getEffectiveDpi(currentWidth, currentHeight, storedDpi);

      let cells = template.cells;
      if (template.physicalLayout) {
        const dynamicCells = computeDynamicCollageCells(
          template,
          currentWidth,
          currentHeight,
          dpi,
          get().collageGap,
          get().collageMargin
        );
        if (dynamicCells) {
          cells = dynamicCells;
        }
      }

      const slots: CanvasSlot[] = cells.map((c, i) => {
        const existingSlot = get().slots[i];
        return {
          id: uid(),
          cellIndex: i,
          x: c.x,
          y: c.y,
          w: c.w,
          h: c.h,
          imageSrc: existingSlot?.imageSrc || undefined,
          filter: existingSlot?.filter || "none",
          brightness: existingSlot?.brightness || 100,
          contrast: existingSlot?.contrast || 100,
          saturation: existingSlot?.saturation || 100,
          zoom: existingSlot?.zoom || 1,
          dragX: existingSlot?.dragX || 0,
          dragY: existingSlot?.dragY || 0,
        };
      });
      set({
        collageTemplate: template,
        mode: "collage",
        slots,
        elements: [],
        selectedId: null,
        canvasWidth: currentWidth,
        canvasHeight: currentHeight,
        history: [{ elements: [], slots }],
        historyIndex: 0,
      });
    } else {
      set({ collageTemplate: null, slots: [] });
    }
  },

  setSlotImage: (slotId, src) => {
    set((state) => ({
      slots: state.slots.map((sl: CanvasSlot) =>
        sl.id === slotId
          ? {
              ...sl,
              imageSrc: src,
              filter: "none",
              brightness: 100,
              contrast: 100,
              saturation: 100,
            }
          : sl,
      ),
      lastEditedImage: src,
    }));
    get().pushHistory();
  },

  updateSlot: (slotId, patch) => {
    set((state) => ({
      slots: state.slots.map((sl: CanvasSlot) => (sl.id === slotId ? { ...sl, ...patch } : sl)),
    }));
  },

  clearSlots: () => {
    set((state) => ({
      slots: state.slots.map((sl: CanvasSlot) => ({ ...sl, imageSrc: undefined })),
    }));
    get().pushHistory();
  },

  fillAllSlots: (src, sourceSlotId) => {
    const targetSlot = sourceSlotId ? get().slots.find((sl) => sl.id === sourceSlotId) : null;
    set((state) => ({
      slots: state.slots.map((sl: CanvasSlot) => ({
        ...sl,
        imageSrc: src,
        filter: targetSlot?.filter || "none",
        brightness: targetSlot?.brightness ?? 100,
        contrast: targetSlot?.contrast ?? 100,
        saturation: targetSlot?.saturation ?? 100,
      })),
    }));
    get().pushHistory();
  },

  fillRowSlots: (slotId, src) => {
    const targetSlot = get().slots.find((sl) => sl.id === slotId);
    if (!targetSlot) return;
    set((state) => ({
      slots: state.slots.map((sl: CanvasSlot) =>
        Math.abs(Math.round(sl.y * 1000) - Math.round(targetSlot.y * 1000)) < 2
          ? {
              ...sl,
              imageSrc: src,
              filter: targetSlot.filter || "none",
              brightness: targetSlot.brightness ?? 100,
              contrast: targetSlot.contrast ?? 100,
              saturation: targetSlot.saturation ?? 100,
            }
          : sl
      ),
    }));
    get().pushHistory();
  },

  fillColumnSlots: (slotId, src) => {
    const targetSlot = get().slots.find((sl) => sl.id === slotId);
    if (!targetSlot) return;
    set((state) => ({
      slots: state.slots.map((sl: CanvasSlot) =>
        Math.abs(Math.round(sl.x * 1000) - Math.round(targetSlot.x * 1000)) < 2
          ? {
              ...sl,
              imageSrc: src,
              filter: targetSlot.filter || "none",
              brightness: targetSlot.brightness ?? 100,
              contrast: targetSlot.contrast ?? 100,
              saturation: targetSlot.saturation ?? 100,
            }
          : sl
      ),
    }));
    get().pushHistory();
  },

  setCollageGap: (gap) => {
    set((s) => {
      let adjustedSlots = s.slots || [];
      const collageTemplate = s.collageTemplate;
      const mode = s.mode;

      if (mode === "collage" && collageTemplate && collageTemplate.physicalLayout) {
        const storedDpi = s.printSettings?.dpi || 300;
        const dpi = getEffectiveDpi(s.canvasWidth, s.canvasHeight, storedDpi);
        const dynamicCells = computeDynamicCollageCells(
          collageTemplate,
          s.canvasWidth,
          s.canvasHeight,
          dpi,
          gap,
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
        collageGap: gap,
        slots: adjustedSlots,
      };
    });
    get().pushHistory();
  },

  setCollageMargin: (margin) => {
    set((s) => {
      let adjustedSlots = s.slots || [];
      const collageTemplate = s.collageTemplate;
      const mode = s.mode;

      if (mode === "collage" && collageTemplate && collageTemplate.physicalLayout) {
        const storedDpi = s.printSettings?.dpi || 300;
        const dpi = getEffectiveDpi(s.canvasWidth, s.canvasHeight, storedDpi);
        const dynamicCells = computeDynamicCollageCells(
          collageTemplate,
          s.canvasWidth,
          s.canvasHeight,
          dpi,
          s.collageGap,
          margin
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
        collageMargin: margin,
        slots: adjustedSlots,
      };
    });
    get().pushHistory();
  },
  setCollageRadius: (radius) => set({ collageRadius: radius }),
  setCollageShowCutLines: (show) => set({ collageShowCutLines: show }),
  setCollageStrokeWidth: (width) => set({ collageStrokeWidth: width }),
  setCollageStrokeColor: (color) => set({ collageStrokeColor: color }),
});
