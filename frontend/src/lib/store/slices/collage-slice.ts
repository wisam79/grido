import { StateCreator } from "zustand";
import { CanvasElement, ImageElement, CanvasSlot, PhotoTemplate, CollageTemplate } from "../types";
import { uid } from "../../utils";
import { COLLAGE_TEMPLATES } from "../../templates";

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
  fillAllSlots: (src: string) => void;

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
      const firstImageEl = get().elements.find((e): e is ImageElement => e.type === "image");
      const lastEditedImage = firstImageEl?.imageSrc || get().lastEditedImage;
      const currentWidth = get().canvasWidth || 1200;
      const currentHeight = get().canvasHeight || 1200;

      const slots: CanvasSlot[] = template.cells.map((c, i) => ({
        id: uid(),
        cellIndex: i,
        x: c.x,
        y: c.y,
        w: c.w,
        h: c.h,
        imageSrc: lastEditedImage || undefined,
        filter: "none",
        brightness: 100,
        contrast: 100,
        saturation: 100,
      }));
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
        ...(lastEditedImage ? { lastEditedImage } : {}),
      });
    } else {
      set({ collageTemplate: null, slots: [] });
    }
  },

  setSlotImage: (slotId, src) => {
    set((s: any) => ({
      slots: s.slots.map((sl: CanvasSlot) =>
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
    set((s: any) => ({
      slots: s.slots.map((sl: CanvasSlot) => (sl.id === slotId ? { ...sl, ...patch } : sl)),
    }));
  },

  clearSlots: () => {
    set((s: any) => ({
      slots: s.slots.map((sl: CanvasSlot) => ({ ...sl, imageSrc: undefined })),
    }));
    get().pushHistory();
  },

  fillAllSlots: (src) => {
    set((s: any) => ({
      slots: s.slots.map((sl: CanvasSlot) => ({
        ...sl,
        imageSrc: src,
        filter: "none",
        brightness: 100,
        contrast: 100,
        saturation: 100,
      })),
    }));
    get().pushHistory();
  },

  setCollageGap: (gap) => set({ collageGap: gap }),
  setCollageMargin: (margin) => set({ collageMargin: margin }),
  setCollageRadius: (radius) => set({ collageRadius: radius }),
  setCollageShowCutLines: (show) => set({ collageShowCutLines: show }),
  setCollageStrokeWidth: (width) => set({ collageStrokeWidth: width }),
  setCollageStrokeColor: (color) => set({ collageStrokeColor: color }),
});
