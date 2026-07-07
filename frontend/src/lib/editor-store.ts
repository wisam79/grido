import { create } from "zustand";
import Konva from "konva";
import { PhotoTemplate, CollageTemplate, COLLAGE_TEMPLATES, PHOTO_TEMPLATES } from "./templates";
import { uid } from "./utils";

export interface ProjectStateData {
  mode: EditorMode;
  canvasWidth: number;
  canvasHeight: number;
  backgroundColor: string;
  elements?: CanvasElement[];
  slots?: CanvasSlot[];
  template?: PhotoTemplate | null;
  collageTemplate?: CollageTemplate | null;
  printSettings?: PrintSettings;
}

// === أنواع العناصر على الكانفس ===
export type ElementType = "image" | "text" | "shape";

export interface CanvasElement {
  id: string;
  type: ElementType;
  x: number; // النسبة من 0 إلى 1 على الكانفس
  y: number;
  width: number; // النسبة
  height: number;
  rotation: number;
  opacity: number;
  zIndex: number;
  locked?: boolean;
  visible?: boolean;
  // خصائص الصورة
  imageSrc?: string;
  filter?: string; // معرف الفلتر
  brightness?: number; // 100 = الأصلي
  contrast?: number;
  saturation?: number;
  blur?: number;
  // خصائص النص
  text?: string;
  fontSize?: number;
  fontWeight?: number;
  color?: string;
  fontFamily?: string;
  textAlign?: "right" | "center" | "left";
  textBgColor?: string;
  lineHeight?: number;
  letterSpacing?: number;
  // خصائص الشكل
  shape?: "rect" | "ellipse" | "line" | "star";
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  radius?: number;
}

export interface CanvasSlot {
  id: string;
  cellIndex: number;
  x: number;
  y: number;
  w: number;
  h: number;
  imageSrc?: string;
  filter?: string;
  brightness?: number;
  contrast?: number;
  saturation?: number;
}

export type EditorMode = "single" | "collage";

export interface PrintSettings {
  paperId: string;
  paperWidthMM: number;
  paperHeightMM: number;
  marginMM: number;
  gapMM?: number; // المسافة بين الصور بالمليمتر
  dpi: number;
  copiesPerSheet: number; // عدد النسخ في الورقة الواحدة
  showCutLines: boolean;
  orientation: "portrait" | "landscape";
}

interface EditorState {
  projectId: string | null;
  mode: EditorMode;
  template: PhotoTemplate | null;
  collageTemplate: CollageTemplate | null;
  elements: CanvasElement[];
  slots: CanvasSlot[];
  selectedId: string | null;
  canvasWidth: number; // بكسل (العرض)
  canvasHeight: number; // بكسل
  backgroundColor: string;
  printSettings: PrintSettings;
  lastEditedImage: string | null; // آخر صورة تم تعديلها أو تحميلها
  history: { elements: CanvasElement[]; slots: CanvasSlot[] }[];
  historyIndex: number;

  // تخصيصات الكولاج
  collageGap: number;
  collageMargin: number;
  collageRadius: number;
  collageShowCutLines: boolean;
  collageStrokeWidth: number;
  collageStrokeColor: string;

  // إعدادات الشبكة والمحاذاة
  showGrid: boolean;
  gridSize: number;
  gridColor: string;
  gridType: "lines" | "dots";
  snapToGrid: boolean;

  setMode: (mode: EditorMode) => void;
  setTemplate: (template: PhotoTemplate | null) => void;
  setCollageTemplate: (template: CollageTemplate | null) => void;
  setLastEditedImage: (src: string | null) => void;
  setCanvasSize: (w: number, h: number) => void;
  setBackgroundColor: (c: string) => void;

  // دوال تعديل تخصيصات الكولاج
  setCollageGap: (gap: number) => void;
  setCollageMargin: (margin: number) => void;
  setCollageRadius: (radius: number) => void;
  setCollageShowCutLines: (show: boolean) => void;
  setCollageStrokeWidth: (width: number) => void;
  setCollageStrokeColor: (color: string) => void;

  // دوال إعدادات الشبكة والمحاذاة
  setShowGrid: (show: boolean) => void;
  setGridSize: (size: number) => void;
  setGridColor: (color: string) => void;
  setGridType: (type: "lines" | "dots") => void;
  setSnapToGrid: (snap: boolean) => void;

  addImageElement: (src: string) => void;
  addTextElement: (text?: string) => void;
  addShapeElement: (shape: CanvasElement["shape"]) => void;
  updateElement: (id: string, patch: Partial<CanvasElement>) => void;
  removeElement: (id: string) => void;
  duplicateElement: (id: string) => void;
  bringToFront: (id: string) => void;
  sendToBack: (id: string) => void;
  selectElement: (id: string | null) => void;

  setSlotImage: (slotId: string, src: string) => void;
  updateSlot: (slotId: string, patch: Partial<CanvasSlot>) => void;
  clearSlots: () => void;
  fillAllSlots: (src: string) => void;

  setPrintSettings: (patch: Partial<PrintSettings>) => void;



  // مرجع Konva Stage للتصدير بدقة عالية
  stageRef: Konva.Stage | null;
  setStageRef: (ref: Konva.Stage | null) => void;

  pushHistory: () => void;
  undo: () => void;
  redo: () => void;
  reset: () => void;
  loadProject: (project: ProjectStateData, projectId?: string | null) => void;
}




const defaultPrint: PrintSettings = {
  paperId: "a4",
  paperWidthMM: 210,
  paperHeightMM: 297,
  marginMM: 5,
  gapMM: 2,
  dpi: 300,
  copiesPerSheet: 1,
  showCutLines: true,
  orientation: "portrait",
};

const initialCollage = COLLAGE_TEMPLATES[0];
const initialSlots: CanvasSlot[] = initialCollage.cells.map((c, i) => ({
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

export const useEditorStore = create<EditorState>((set, get) => ({
  projectId: null,
  mode: "collage",
  template: null,
  collageTemplate: initialCollage,
  elements: [],
  slots: initialSlots,
  selectedId: null,
  canvasWidth: 1200,
  canvasHeight: 1200,
  backgroundColor: "#FFFFFF",
  printSettings: defaultPrint,
  lastEditedImage: null,
  history: [{ elements: [], slots: initialSlots }],
  historyIndex: 0,



  stageRef: null,
  setStageRef: (ref) => set({ stageRef: ref }),

  // تخصيصات الكولاج
  collageGap: 0,
  collageMargin: 0,
  collageRadius: 0,
  collageShowCutLines: false,
  collageStrokeWidth: 0,
  collageStrokeColor: "#000000",

  // قيم الشبكة والمحاذاة الافتراضية
  showGrid: false,
  gridSize: 50,
  gridColor: "rgba(0, 0, 0, 0.08)",
  gridType: "lines",
  snapToGrid: false,

  setMode: (mode) => set({ mode, selectedId: null }),

  setShowGrid: (showGrid) => set({ showGrid }),
  setGridSize: (gridSize) => set({ gridSize }),
  setGridColor: (gridColor) => set({ gridColor }),
  setGridType: (gridType) => set({ gridType }),
  setSnapToGrid: (snapToGrid) => set({ snapToGrid }),

  setTemplate: (template) => {
    if (template) {
      const lastImg = get().lastEditedImage;
      const elements: CanvasElement[] = [];
      if (lastImg) {
        const id = uid();
        elements.push({
          id,
          type: "image",
          x: 0.15,
          y: 0.15,
          width: 0.7,
          height: 0.7,
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
      const firstImageEl = get().elements.find((e) => e.type === "image");
      const lastEditedImage = firstImageEl?.imageSrc || get().lastEditedImage;

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
        canvasWidth: 1200,
        canvasHeight: 1200,
        history: [{ elements: [], slots }],
        historyIndex: 0,
        ...(lastEditedImage ? { lastEditedImage } : {}),
      });
    } else {
      set({ collageTemplate: null, slots: [] });
    }
  },

  setLastEditedImage: (src) => set({ lastEditedImage: src }),

  setCanvasSize: (w, h) => set({ canvasWidth: w, canvasHeight: h }),
  setBackgroundColor: (c) => set({ backgroundColor: c }),

  setCollageGap: (gap) => set({ collageGap: gap }),
  setCollageMargin: (margin) => set({ collageMargin: margin }),
  setCollageRadius: (radius) => set({ collageRadius: radius }),
  setCollageShowCutLines: (show) => set({ collageShowCutLines: show }),
  setCollageStrokeWidth: (width) => set({ collageStrokeWidth: width }),
  setCollageStrokeColor: (color) => set({ collageStrokeColor: color }),

  addImageElement: (src) => {
    const id = uid();
    const newEl: CanvasElement = {
      id,
      type: "image",
      x: 0.15,
      y: 0.15,
      width: 0.7,
      height: 0.7,
      rotation: 0,
      opacity: 1,
      zIndex: (get().elements.length + 1) * 10,
      imageSrc: src,
      filter: "none",
      brightness: 100,
      contrast: 100,
      saturation: 100,
      blur: 0,
    };
    get().pushHistory();
    set((s) => ({ elements: [...s.elements, newEl], selectedId: id, lastEditedImage: src }));
  },

  addTextElement: (text = "نص جديد") => {
    const id = uid();
    const newEl: CanvasElement = {
      id,
      type: "text",
      x: 0.25,
      y: 0.4,
      width: 0.5,
      height: 0.1,
      rotation: 0,
      opacity: 1,
      zIndex: (get().elements.length + 1) * 10,
      text,
      fontSize: 32,
      fontWeight: 700,
      color: "#1a1a2e",
      fontFamily: "'IBM Plex Sans Arabic', Cairo, Tajawal, sans-serif",
      textAlign: "center",
      textBgColor: "transparent",
      lineHeight: 1.2,
      letterSpacing: 0,
    };
    get().pushHistory();
    set((s) => ({ elements: [...s.elements, newEl], selectedId: id }));
  },

  addShapeElement: (shape) => {
    const id = uid();
    const newEl: CanvasElement = {
      id,
      type: "shape",
      x: 0.3,
      y: 0.3,
      width: 0.4,
      height: 0.4,
      rotation: 0,
      opacity: 1,
      zIndex: (get().elements.length + 1) * 10,
      shape,
      fill: "#6366f1",
      stroke: "#000000",
      strokeWidth: 0,
      radius: 8,
    };
    get().pushHistory();
    set((s) => ({ elements: [...s.elements, newEl], selectedId: id }));
  },

  updateElement: (id, patch) => {
    set((s) => {
      const nextElements = s.elements.map((el) =>
        el.id === id ? { ...el, ...patch } : el
      );
      const targetEl = nextElements.find((e) => e.id === id);
      const isImg = targetEl && targetEl.type === "image";
      return {
        elements: nextElements,
        ...(isImg && patch.imageSrc ? { lastEditedImage: patch.imageSrc } : {}),
      };
    });
  },

  removeElement: (id) => {
    get().pushHistory();
    set((s) => ({
      elements: s.elements.filter((el) => el.id !== id),
      selectedId: s.selectedId === id ? null : s.selectedId,
    }));
  },

  duplicateElement: (id) => {
    const el = get().elements.find((e) => e.id === id);
    if (!el) return;
    const newId = uid();
    const copy: CanvasElement = {
      ...el,
      id: newId,
      x: Math.min(el.x + 0.05, 0.9),
      y: Math.min(el.y + 0.05, 0.9),
      zIndex: (get().elements.length + 1) * 10,
    };
    get().pushHistory();
    set((s) => ({ elements: [...s.elements, copy], selectedId: newId }));
  },

  bringToFront: (id) => {
    const maxZ = Math.max(0, ...get().elements.map((e) => e.zIndex));
    get().updateElement(id, { zIndex: maxZ + 10 });
  },

  sendToBack: (id) => {
    const minZ = Math.min(0, ...get().elements.map((e) => e.zIndex));
    get().updateElement(id, { zIndex: minZ - 10 });
  },

  selectElement: (id) => set({ selectedId: id }),

  setSlotImage: (slotId, src) => {
    get().pushHistory();
    set((s) => ({
      slots: s.slots.map((sl) =>
        sl.id === slotId
          ? {
              ...sl,
              imageSrc: src,
              filter: "none",
              brightness: 100,
              contrast: 100,
              saturation: 100,
            }
          : sl
      ),
      lastEditedImage: src,
    }));
  },

  updateSlot: (slotId, patch) => {
    set((s) => ({
      slots: s.slots.map((sl) =>
        sl.id === slotId ? { ...sl, ...patch } : sl
      ),
    }));
  },

  clearSlots: () => {
    get().pushHistory();
    set((s) => ({
      slots: s.slots.map((sl) => ({ ...sl, imageSrc: undefined })),
    }));
  },

  fillAllSlots: (src) => {
    get().pushHistory();
    set((s) => ({
      slots: s.slots.map((sl) => ({
        ...sl,
        imageSrc: src,
        filter: "none",
        brightness: 100,
        contrast: 100,
        saturation: 100,
      })),
    }));
  },

  setPrintSettings: (patch) =>
    set((s) => ({ printSettings: { ...s.printSettings, ...patch } })),

  pushHistory: () => {
    const { elements, slots, history, historyIndex } = get();
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push({
      elements: structuredClone(elements),
      slots: structuredClone(slots),
    });
    // حد 50 خطوة
    if (newHistory.length > 50) newHistory.shift();
    set({ history: newHistory, historyIndex: newHistory.length - 1 });
  },

  undo: () => {
    const { history, historyIndex } = get();
    if (historyIndex <= 0) return;
    const prev = history[historyIndex - 1];
    set({
      elements: structuredClone(prev.elements),
      slots: structuredClone(prev.slots),
      historyIndex: historyIndex - 1,
      selectedId: null,
    });
  },

  redo: () => {
    const { history, historyIndex } = get();
    if (historyIndex >= history.length - 1) return;
    const next = history[historyIndex + 1];
    set({
      elements: structuredClone(next.elements),
      slots: structuredClone(next.slots),
      historyIndex: historyIndex + 1,
      selectedId: null,
    });
  },

  reset: () => {
    set({
      projectId: null,
      mode: "collage",
      template: null,
      collageTemplate: initialCollage,
      elements: [],
      slots: initialSlots,
      selectedId: null,
      canvasWidth: 1200,
      canvasHeight: 1200,
      backgroundColor: "#FFFFFF",
      history: [{ elements: [], slots: initialSlots }],
      historyIndex: 0,
      stageRef: null,
      showGrid: false,
      gridSize: 50,
      gridColor: "rgba(0, 0, 0, 0.08)",
      gridType: "lines",
      snapToGrid: false,
    });
  },

  loadProject: (project: ProjectStateData, projectId: string | null = null) => {
    // استعادة الأيقونات والمكونات الأصلية للقوالب المطابقة من قاعدة البيانات
    const restoredTemplate = project.template
      ? PHOTO_TEMPLATES.find((t) => t.id === project.template?.id) || project.template
      : null;
    const restoredCollageTemplate = project.collageTemplate
      ? COLLAGE_TEMPLATES.find((t) => t.id === project.collageTemplate?.id) || project.collageTemplate
      : null;

    set({
      projectId,
      mode: project.mode || "single",
      canvasWidth: project.canvasWidth,
      canvasHeight: project.canvasHeight,
      backgroundColor: project.backgroundColor || "#FFFFFF",
      elements: project.elements || [],
      slots: project.slots || [],
      template: restoredTemplate,
      collageTemplate: restoredCollageTemplate,
      printSettings: project.printSettings ? { ...defaultPrint, ...project.printSettings } : defaultPrint,
      selectedId: null,
      history: [{ elements: project.elements || [], slots: project.slots || [] }],
      historyIndex: 0,
      showGrid: (project as any).showGrid ?? false,
      gridSize: (project as any).gridSize ?? 50,
      gridColor: (project as any).gridColor ?? "rgba(0, 0, 0, 0.08)",
      gridType: (project as any).gridType ?? "lines",
      snapToGrid: (project as any).snapToGrid ?? false,
    });
  },
}));
