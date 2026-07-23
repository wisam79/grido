import { StateCreator } from "zustand";
import { EditorMode, ProjectFileV1, CanvasElement, CanvasSlot, PrintSettings, HistoryEntry } from "../types";
import { PhotoTemplate, CollageTemplate, COLLAGE_TEMPLATES, PHOTO_TEMPLATES, computeDynamicCollageCells, getEffectiveDpi } from "../../templates";
import { generateInitialSlots } from "./collage-slice";
import { DEFAULT_PRINT_SETTINGS } from "./print-slice";
import { uid } from "../../utils";

export interface CoreSlice {
  projectId: string | null;
  mode: EditorMode;
  canvasWidth: number;
  canvasHeight: number;
  backgroundColor: string;
  lastEditedImage: string | null;
  lastEditedImageAspect: number | null;

  setMode: (mode: EditorMode) => void;
  setCanvasSize: (w: number, h: number) => void;
  setBackgroundColor: (c: string) => void;
  setLastEditedImage: (src: string | null) => void;
  setLastEditedImageAspect: (aspect: number | null) => void;
  reset: () => void;
  loadProject: (project: ProjectFileV1, projectId?: string | null) => void;
  canvasZoom: number;
  setCanvasZoom: (zoom: number | ((prev: number) => number)) => void;
}

export const DEFAULT_CORE_STATE = {
  projectId: null as string | null,
  mode: "collage" as EditorMode,
  canvasWidth: 2480,
  canvasHeight: 3508,
  backgroundColor: "#FFFFFF",
  lastEditedImage: null as string | null,
  lastEditedImageAspect: null as number | null,
  canvasZoom: 1,
};

type CoreSliceCross = CoreSlice & {
  elements: CanvasElement[];
  selectedId: string | null;
  selectedIds: string[];
  editingTextId: string | null;
  slots: CanvasSlot[];
  template: PhotoTemplate | null;
  collageTemplate: CollageTemplate | null;
  printSettings: PrintSettings;
  printImageSrc: string | null;
  showGrid: boolean;
  gridSize: number;
  gridColor: string;
  gridOpacity: number;
  gridSubdivisions: number;
  gridType: "lines" | "dots";
  snapToGrid: boolean;
  showColumns: boolean;
  columnsCount: number;
  columnsColor: string;
  columnsMargin: number;
  columnsGutter: number;
  showRuler: boolean;
  history: HistoryEntry[];
  historyIndex: number;
  collageGap: number;
  collageMargin: number;
  collageRadius: number;
  collageShowCutLines: boolean;
  collageStrokeWidth: number;
  collageStrokeColor: string;
  pushHistory: () => void;
};

export const createCoreSlice: StateCreator<CoreSliceCross, [], [], CoreSlice> = (set, get) => ({
  ...DEFAULT_CORE_STATE,

  setMode: (mode) => {
    set((s) => {
      const nextState: Partial<CoreSliceCross> = { mode, selectedId: null };
      
      // إذا تم الانتقال لوضع الكولاج وكانت الخانات فارغة، نقوم بإعادة بناء الخلايا لتجنب ظهور الكانفس فارغاً
      if (mode === "collage" && (!s.slots || s.slots.length === 0)) {
        const template = s.collageTemplate || COLLAGE_TEMPLATES[0];
        const currentWidth = s.canvasWidth || 2480;
        const currentHeight = s.canvasHeight || 3508;
        const storedDpi = s.printSettings?.dpi || 300;
        const dpi = getEffectiveDpi(currentWidth, currentHeight, storedDpi);

        let cells = template.cells;
        if (template.physicalLayout) {
          const dynamicCells = computeDynamicCollageCells(
            template,
            currentWidth,
            currentHeight,
            dpi,
            s.collageGap || 0,
            s.collageMargin || 0
          );
          if (dynamicCells) {
            cells = dynamicCells;
          }
        }

        nextState.slots = cells.map((c: { x: number; y: number; w: number; h: number }, i: number) => ({
          id: uid(),
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
        
        nextState.elements = []; // مسح عناصر التعديل الحر عند العودة للكولاج
      }
      
      return nextState;
    });
  },

  setCanvasSize: (w, h) => {
    const oldW = get().canvasWidth;
    const oldH = get().canvasHeight;
    if (oldW === w && oldH === h) return;

    const adjustedElements = get().elements.map((el: CanvasElement) => {
      const oldPxX = el.x * oldW;
      const oldPxY = el.y * oldH;
      const oldPxW = el.width * oldW;
      const oldPxH = el.height * oldH;

      const newPxX = oldPxX + (w - oldW) / 2;
      const newPxY = oldPxY + (h - oldH) / 2;

      return {
        ...el,
        x: newPxX / w,
        y: newPxY / h,
        width: oldPxW / w,
        height: oldPxH / h,
      };
    });

    const collageTemplate = get().collageTemplate;
    const mode = get().mode;
    let adjustedSlots = get().slots || [];

    if (mode === "collage" && collageTemplate) {
      if (collageTemplate.physicalLayout) {
        const storedDpi = get().printSettings?.dpi || 300;
        const dpi = getEffectiveDpi(w, h, storedDpi);
        const dynamicCells = computeDynamicCollageCells(
          collageTemplate,
          w,
          h,
          dpi,
          get().collageGap,
          get().collageMargin
        );
        if (dynamicCells) {
          adjustedSlots = dynamicCells.map((c, i) => {
            const existingSlot = (get().slots || [])[i] || {};
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
    }

    set({
      canvasWidth: w,
      canvasHeight: h,
      elements: adjustedElements,
      slots: adjustedSlots,
    });
    get().pushHistory();
  },

  setBackgroundColor: (c) => set({ backgroundColor: c }),

  setLastEditedImage: (src) => set({ lastEditedImage: src }),
  setLastEditedImageAspect: (aspect) => set({ lastEditedImageAspect: aspect }),
  setCanvasZoom: (zoom) => set((state) => ({
    canvasZoom: typeof zoom === "function" ? zoom(state.canvasZoom) : zoom
  })),

  reset: () => {
    const freshSlots = generateInitialSlots();
    set({
      projectId: null,
      mode: "collage" as EditorMode,
      canvasWidth: 2480,
      canvasHeight: 3508,
      backgroundColor: "#FFFFFF",
      lastEditedImage: null,
      lastEditedImageAspect: null,
      elements: [],
      selectedId: null,
      selectedIds: [],
      editingTextId: null,
      template: null,
      collageTemplate: COLLAGE_TEMPLATES[0],
      slots: freshSlots,
      collageGap: 0,
      collageMargin: 0,
      collageRadius: 0,
      collageShowCutLines: false,
      collageStrokeWidth: 0,
      collageStrokeColor: "#000000",
      showGrid: false,
      gridSize: 50,
      gridColor: "#000000",
      gridOpacity: 0.15,
      gridSubdivisions: 5,
      gridType: "lines" as const,
      snapToGrid: false,
      showColumns: false,
      columnsCount: 12,
      columnsColor: "rgba(239, 68, 68, 0.08)",
      columnsMargin: 20,
      columnsGutter: 12,
      showRuler: true,
      printSettings: DEFAULT_PRINT_SETTINGS,
      printImageSrc: null,
      history: [{ elements: [], slots: freshSlots }],
      historyIndex: 0,
    });
  },

  loadProject: (project: ProjectFileV1, projectId: string | null = null) => {
    const restoredTemplate = project.template
      ? (PHOTO_TEMPLATES.find((t) => t.id === project.template?.id) as PhotoTemplate | undefined) || (project.template as unknown as PhotoTemplate)
      : null;
    const restoredCollageTemplate = project.collageTemplate
      ? (COLLAGE_TEMPLATES.find((t) => t.id === project.collageTemplate?.id) as CollageTemplate | undefined) || (project.collageTemplate as unknown as CollageTemplate)
      : null;

    set({
      projectId,
      mode: project.mode || "single",
      canvasWidth: project.canvasWidth,
      canvasHeight: project.canvasHeight,
      backgroundColor: project.backgroundColor || "#FFFFFF",
      elements: (project.elements || []) as CanvasElement[],
      slots: (project.slots && project.slots.length > 0 ? project.slots : (project.mode === "collage" ? generateInitialSlots() : [])) as CanvasSlot[],
      template: restoredTemplate,
      collageTemplate: restoredCollageTemplate,
      printSettings: project.printSettings
        ? { ...DEFAULT_PRINT_SETTINGS, ...project.printSettings }
        : DEFAULT_PRINT_SETTINGS,
      selectedId: null,
      selectedIds: [],
      editingTextId: null,
      history: [{ 
        elements: (project.elements || []) as CanvasElement[], 
        slots: (project.slots && project.slots.length > 0 ? project.slots : (project.mode === "collage" ? generateInitialSlots() : [])) as CanvasSlot[]
      }],
      historyIndex: 0,
      showGrid: project.showGrid ?? false,
      gridSize: project.gridSize ?? 50,
      gridColor: project.gridColor ?? "#000000",
      gridOpacity: project.gridOpacity ?? 0.15,
      gridSubdivisions: project.gridSubdivisions ?? 5,
      gridType: project.gridType ?? "lines",
      snapToGrid: project.snapToGrid ?? false,
      showColumns: project.showColumns ?? false,
      columnsCount: project.columnsCount ?? 12,
      columnsColor: project.columnsColor ?? "rgba(239, 68, 68, 0.08)",
      columnsMargin: project.columnsMargin ?? 20,
      columnsGutter: project.columnsGutter ?? 12,
      collageGap: project.collageGap ?? 0,
      collageMargin: project.collageMargin ?? 0,
      collageRadius: project.collageRadius ?? 0,
      collageShowCutLines: project.collageShowCutLines ?? false,
      collageStrokeWidth: project.collageStrokeWidth ?? 0,
      collageStrokeColor: project.collageStrokeColor ?? "#000000",
    });
  },
});
