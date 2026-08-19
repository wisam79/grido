import { StateCreator } from "zustand";
import { CanvasElement, CanvasSlot, PhotoTemplate, CollageTemplate } from "../types";
import { uid } from "../../utils";
import { COLLAGE_TEMPLATES, computeDynamicCollageCells, getEffectiveDpi } from "../../templates";

// قياس نسبة أبعاد الصورة — لاستبدال قُصَّ الصور عند تغيّر الأبعاد
export function measureImageAspect(src: string): Promise<number> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img.width > 0 && img.height > 0 ? img.width / img.height : NaN);
    img.onerror = () => resolve(NaN);
    img.src = src;
  });
}

export interface CollageSlice {
  template: PhotoTemplate | null;
  collageTemplate: CollageTemplate | null;
  slots: CanvasSlot[];
  collageGap: number;
  collageMargin: number;
  collageRadius: number;
  collageShowCutLines: boolean;
  collageShowEndCutLine: boolean;
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
  setSlotImagesBatch: (assignments: { slotId: string; src: string }[], lastEditedSrc?: string | null) => void;

  setCollageGap: (gap: number) => void;
  setCollageMargin: (margin: number) => void;
  setCollageRadius: (radius: number) => void;
  setCollageShowCutLines: (show: boolean) => void;
  setCollageShowEndCutLine: (show: boolean) => void;
  setCollageStrokeWidth: (width: number) => void;
  setCollageStrokeColor: (color: string) => void;

  swapSlots: (slotIdA: string, slotIdB: string) => void;
  fillEmptySlots: (src: string, sourceSlotId?: string) => void;
  rotateSlot: (slotId: string, angleDelta?: number) => void;
  flipSlotX: (slotId: string) => void;
  flipSlotY: (slotId: string) => void;
  resetSlotAdjustments: (slotId: string) => void;
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
  collageShowEndCutLine: true,
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
          // الحفاظ على بيانات الخلية من القالب الحر (مقاس/تسمية/تدوير الصورة)
          presetType: c.presetType ?? existingSlot?.presetType,
          label: c.label ?? existingSlot?.label,
          rotation: c.rotation ?? existingSlot?.rotation ?? 0,
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
      });
      // لا نمسح سجل التراجع — التبديل يُسجل كخطوة واحدة قابلة للتراجع (إصلاح E-2)
      get().pushHistory();
    } else {
      set({ collageTemplate: null, slots: [] });
      get().pushHistory();
    }
  },

  setSlotImage: (slotId, src) => {
    const prev = get().slots.find((sl) => sl.id === slotId);
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

    // استبدال الصورة يُبقي إزاحات القص مضبوطة على أبعاد الصورة السابقة —
    // عند اختلاف نسبة الأبعاد نُصفّر dragX/dragY/zoom (مع إبقاء flip/rotation)
    if (!prev?.imageSrc || prev.imageSrc === src) return;
    void (async () => {
      const [prevAspect, nextAspect] = await Promise.all([
        measureImageAspect(prev.imageSrc!),
        measureImageAspect(src),
      ]);
      if (!Number.isFinite(prevAspect) || !Number.isFinite(nextAspect)) return;
      if (Math.abs(prevAspect - nextAspect) > 0.001) {
        // حارس قِدم: نتجاهل النتيجة إذا استُبدلت الصورة مجدداً أثناء القياس
        if (get().slots.find((sl) => sl.id === slotId)?.imageSrc !== src) return;
        get().updateSlot(slotId, { dragX: 0, dragY: 0, zoom: 1 });
        // التصحيح اللاحق يُسجل كخطوة تراجع مستقلة بدل تغيير صامت غير قابل للتراجع (إصلاح E-1)
        get().pushHistory();
      }
    })();
  },

  setSlotImagesBatch: (assignments, lastEditedSrc) => {
    if (assignments.length === 0) return;
    // التقاط القيم السابقة قبل التحديث — مقارنة ما بعد التحديث كانت
    // تبطل الكشف عن الاستبدالات دائماً (imageSrc أصبح يساوي الجديد)
    const prevBySlot = new Map(
      assignments.map((a) => [a.slotId, get().slots.find((sl) => sl.id === a.slotId)?.imageSrc])
    );
    set((state) => ({
      slots: state.slots.map((sl: CanvasSlot) => {
        const a = assignments.find((x) => x.slotId === sl.id);
        return a
          ? {
              ...sl,
              imageSrc: a.src,
              filter: "none",
              brightness: 100,
              contrast: 100,
              saturation: 100,
            }
          : sl;
      }),
      lastEditedImage: lastEditedSrc ?? state.lastEditedImage,
    }));
    // دفعة كاملة تُسجل كخطوة تراجع واحدة (الإسقاط المتعدد)
    get().pushHistory();

    // استبدالات تختلف نسبة أبعادها عن السابقة: تصفير إزاحات القص (مطابقة setSlotImage)
    const replaced = assignments.filter((a) => {
      const prev = prevBySlot.get(a.slotId);
      return !!prev && prev !== a.src;
    });
    if (replaced.length === 0) return;
    void (async () => {
      const results = await Promise.all(
        replaced.map(async (a) => {
          const [prevAspect, nextAspect] = await Promise.all([
            measureImageAspect(prevBySlot.get(a.slotId) || ""),
            measureImageAspect(a.src),
          ]);
          if (!Number.isFinite(prevAspect) || !Number.isFinite(nextAspect)) return null;
          if (Math.abs(prevAspect - nextAspect) <= 0.001) return null;
          return a.slotId;
        })
      );
      const candidates = results.filter((id): id is string => !!id);
      if (candidates.length === 0) return;
      // حارس قِدم: نتجاهل النتيجة إذا استُبدلت الصورة مجدداً أثناء القياس
      const toReset = candidates.filter((id) => {
        const a = assignments.find((x) => x.slotId === id);
        return a && get().slots.find((sl) => sl.id === id)?.imageSrc === a.src;
      });
      if (toReset.length === 0) return;
      set((state) => ({
        slots: state.slots.map((sl: CanvasSlot) =>
          toReset.includes(sl.id) ? { ...sl, dragX: 0, dragY: 0, zoom: 1 } : sl
        ),
      }));
      // التصحيح اللاحق يُسجل كخطوة تراجع مستقلة بدل تغيير صامت غير قابل للتراجع (إصلاح E-1)
      get().pushHistory();
    })();
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
        bgColor: targetSlot?.bgColor ?? sl.bgColor,
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
              bgColor: targetSlot.bgColor ?? sl.bgColor,
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
              bgColor: targetSlot.bgColor ?? sl.bgColor,
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
  setCollageRadius: (radius) => { set({ collageRadius: radius }); get().pushHistory(); },
  setCollageShowCutLines: (show) => { set({ collageShowCutLines: show }); get().pushHistory(); },
  setCollageShowEndCutLine: (show) => { set({ collageShowEndCutLine: show }); get().pushHistory(); },
  setCollageStrokeWidth: (width) => { set({ collageStrokeWidth: width }); get().pushHistory(); },
  setCollageStrokeColor: (color) => { set({ collageStrokeColor: color }); get().pushHistory(); },

  swapSlots: (slotIdA: string, slotIdB: string) => {
    if (!slotIdA || !slotIdB || slotIdA === slotIdB) return;
    const currentSlots = get().slots;
    const slotA = currentSlots.find((s) => s.id === slotIdA);
    const slotB = currentSlots.find((s) => s.id === slotIdB);
    if (!slotA || !slotB) return;

    set((state) => ({
      slots: state.slots.map((sl) => {
        if (sl.id === slotIdA) {
          return {
            ...sl,
            imageSrc: slotB.imageSrc,
            filter: slotB.filter || "none",
            brightness: slotB.brightness ?? 100,
            contrast: slotB.contrast ?? 100,
            saturation: slotB.saturation ?? 100,
            zoom: slotB.zoom ?? 1,
            dragX: slotB.dragX ?? 0,
            dragY: slotB.dragY ?? 0,
            flipX: slotB.flipX ?? false,
            flipY: slotB.flipY ?? false,
            rotation: slotB.rotation ?? 0,
            originalImageSrc: slotB.originalImageSrc,
            bgColor: slotB.bgColor,
          };
        }
        if (sl.id === slotIdB) {
          return {
            ...sl,
            imageSrc: slotA.imageSrc,
            filter: slotA.filter || "none",
            brightness: slotA.brightness ?? 100,
            contrast: slotA.contrast ?? 100,
            saturation: slotA.saturation ?? 100,
            zoom: slotA.zoom ?? 1,
            dragX: slotA.dragX ?? 0,
            dragY: slotA.dragY ?? 0,
            flipX: slotA.flipX ?? false,
            flipY: slotA.flipY ?? false,
            rotation: slotA.rotation ?? 0,
            originalImageSrc: slotA.originalImageSrc,
            bgColor: slotA.bgColor,
          };
        }
        return sl;
      }),
    }));
    get().pushHistory();
  },

  fillEmptySlots: (src: string, sourceSlotId?: string) => {
    if (!src) return;
    const sourceSlot = sourceSlotId ? get().slots.find((s) => s.id === sourceSlotId) : null;
    set((state) => ({
      slots: state.slots.map((sl) => {
        if (sl.imageSrc) return sl;
        return {
          ...sl,
          imageSrc: src,
          filter: sourceSlot?.filter || "none",
          brightness: sourceSlot?.brightness ?? 100,
          contrast: sourceSlot?.contrast ?? 100,
          saturation: sourceSlot?.saturation ?? 100,
          bgColor: sourceSlot?.bgColor ?? sl.bgColor,
        };
      }),
    }));
    get().pushHistory();
  },

  rotateSlot: (slotId: string, angleDelta: number = 90) => {
    set((state) => ({
      slots: state.slots.map((sl) => {
        if (sl.id !== slotId) return sl;
        const currentRot = sl.rotation || 0;
        const newRot = ((currentRot + angleDelta) % 360 + 360) % 360;
        return {
          ...sl,
          rotation: newRot,
          dragX: 0,
          dragY: 0,
        };
      }),
    }));
    get().pushHistory();
  },

  flipSlotX: (slotId: string) => {
    set((state) => ({
      slots: state.slots.map((sl) =>
        sl.id === slotId ? { ...sl, flipX: !sl.flipX } : sl
      ),
    }));
    get().pushHistory();
  },

  flipSlotY: (slotId: string) => {
    set((state) => ({
      slots: state.slots.map((sl) =>
        sl.id === slotId ? { ...sl, flipY: !sl.flipY } : sl
      ),
    }));
    get().pushHistory();
  },

  resetSlotAdjustments: (slotId: string) => {
    set((state) => ({
      slots: state.slots.map((sl) =>
        sl.id === slotId
          ? {
              ...sl,
              filter: "none",
              brightness: 100,
              contrast: 100,
              saturation: 100,
              zoom: 1,
              dragX: 0,
              dragY: 0,
              flipX: false,
              flipY: false,
              rotation: 0,
            }
          : sl
      ),
    }));
    get().pushHistory();
  },
});
