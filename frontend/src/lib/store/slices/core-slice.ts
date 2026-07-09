import { StateCreator } from "zustand";
import { EditorMode, ProjectFileV1 } from "../types";
import { PHOTO_TEMPLATES, COLLAGE_TEMPLATES } from "../../templates";
import { generateInitialSlots } from "./collage-slice";
import { DEFAULT_PRINT_SETTINGS } from "./print-slice";

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
}

export const DEFAULT_CORE_STATE = {
  projectId: null as string | null,
  mode: "collage" as EditorMode,
  canvasWidth: 1200,
  canvasHeight: 1200,
  backgroundColor: "#FFFFFF",
  lastEditedImage: null as string | null,
  lastEditedImageAspect: null as number | null,
};

type CoreSliceCross = CoreSlice & {
  elements: any[];
  selectedId: string | null;
  selectedIds: string[];
  editingTextId: string | null;
  slots: any[];
  template: any;
  collageTemplate: any;
  printSettings: any;
  printImageSrc: any;
  showGrid: boolean;
  gridSize: number;
  gridColor: string;
  gridOpacity: number;
  gridSubdivisions: number;
  gridType: string;
  snapToGrid: boolean;
  showColumns: boolean;
  columnsCount: number;
  columnsColor: string;
  columnsMargin: number;
  columnsGutter: number;
  showRuler: boolean;
  history: any[];
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

  setMode: (mode) => set({ mode, selectedId: null }),

  setCanvasSize: (w, h) => {
    const oldW = get().canvasWidth;
    const oldH = get().canvasHeight;
    if (oldW === w && oldH === h) return;

    const adjustedElements = get().elements.map((el: any) => {
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

    set({
      canvasWidth: w,
      canvasHeight: h,
      elements: adjustedElements,
    });
    get().pushHistory();
  },

  setBackgroundColor: (c) => set({ backgroundColor: c }),

  setLastEditedImage: (src) => set({ lastEditedImage: src }),
  setLastEditedImageAspect: (aspect) => set({ lastEditedImageAspect: aspect }),

  reset: () => {
    const freshSlots = generateInitialSlots();
    set({
      projectId: null,
      mode: "collage" as EditorMode,
      canvasWidth: 1200,
      canvasHeight: 1200,
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
      ? PHOTO_TEMPLATES.find((t: any) => t.id === project.template?.id) || project.template
      : null;
    const restoredCollageTemplate = project.collageTemplate
      ? COLLAGE_TEMPLATES.find((t: any) => t.id === project.collageTemplate?.id) || project.collageTemplate
      : null;

    set({
      projectId,
      mode: project.mode || "single",
      canvasWidth: project.canvasWidth,
      canvasHeight: project.canvasHeight,
      backgroundColor: project.backgroundColor || "#FFFFFF",
      elements: project.elements || [],
      slots: project.slots || generateInitialSlots(),
      template: restoredTemplate,
      collageTemplate: restoredCollageTemplate,
      printSettings: project.printSettings
        ? { ...DEFAULT_PRINT_SETTINGS, ...project.printSettings }
        : DEFAULT_PRINT_SETTINGS,
      selectedId: null,
      selectedIds: [],
      editingTextId: null,
      history: [{ elements: project.elements || [], slots: project.slots || generateInitialSlots() }],
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
