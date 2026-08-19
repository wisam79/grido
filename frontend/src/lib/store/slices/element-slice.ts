import { StateCreator } from "zustand";
import { CanvasElement, ShapeElement, ImageElement } from "../types";
import { uid } from "../../utils";

export type TextPresetType = 
  | "heading" 
  | "subheading" 
  | "body" 
  | "badge" 
  | "watermark" 
  | "studio-date" 
  | "gold-luxury" 
  | "neon-glow" 
  | "stamp-circle" 
  | "3d-title" 
  | "outline-modern" 
  | "photographer-tag" 
  | "caption-card";

export interface ElementSlice {
  elements: CanvasElement[];
  selectedId: string | null;
  selectedIds: string[];
  editingTextId: string | null;
  clipboardElements: CanvasElement[];

  addImageElement: (src: string, imageAspectRatio?: number) => void;
  addTextElement: (text?: string) => void;
  addTextPreset: (preset: TextPresetType) => void;
  addShapeElement: (shape: ShapeElement["shape"], svgPath?: string) => void;
  updateElement: (id: string, patch: Partial<CanvasElement>) => void;
  updateElements: (patches: { id: string; patch: Partial<CanvasElement> }[]) => void;
  removeElement: (id: string) => void;
  removeElements: (ids: string[]) => void;
  duplicateElement: (id: string) => void;
  duplicateElements: (ids: string[]) => void;
  copySelectedElements: (targetIds?: string[]) => void;
  cutSelectedElements: (targetIds?: string[]) => void;
  pasteCopiedElements: (customElements?: CanvasElement[]) => void;
  bringToFront: (id: string) => void;
  sendToBack: (id: string) => void;
  selectElement: (id: string | null) => void;
  toggleElementSelection: (id: string) => void;
  groupSelectedElements: () => void;
  ungroupSelectedElements: () => void;
  setEditingTextId: (id: string | null) => void;
  autoFitTextWidth: (id: string, textWidthPx?: number) => void;
  centerElementHorizontally: (id: string) => void;
  centerElementVertically: (id: string) => void;
}

export const DEFAULT_ELEMENT_STATE = {
  elements: [] as CanvasElement[],
  selectedId: null as string | null,
  selectedIds: [] as string[],
  editingTextId: null as string | null,
  clipboardElements: [] as CanvasElement[],
};

/**
 * توليد zIndex تصاعدي رتيب خالٍ من التصادم —
 * بديل عن صيغة (length + Date.now + random) القديمة التي كانت قابلة للتكرار (E-8)
 */
export const nextZIndex = (elements: CanvasElement[]): number => {
  let max = 0;
  for (const el of elements) {
    if (el.zIndex > max) max = el.zIndex;
  }
  return max + 10;
};

type ElementCross = ElementSlice & {
  canvasWidth: number;
  canvasHeight: number;
  lastEditedImage: string | null;
  lastEditedImageAspect: number | null;
  pushHistory: () => void;
};

export const createElementSlice: StateCreator<ElementCross, [], [], ElementSlice> = (set, get) => ({
  ...DEFAULT_ELEMENT_STATE,

  addImageElement: (src, imageAspectRatio = 1) => {
    const id = uid();
    const state = get();

    let hPercent = 0.5;
    let wPercent = hPercent * (state.canvasHeight / state.canvasWidth) * imageAspectRatio;

    if (wPercent > 0.8) {
      wPercent = 0.8;
      hPercent = (wPercent * (state.canvasWidth / state.canvasHeight)) / imageAspectRatio;
    }

    const newEl: CanvasElement = {
      id,
      type: "image",
      x: 0.5 - wPercent / 2,
      y: 0.5 - hPercent / 2,
      width: wPercent,
      height: hPercent,
      rotation: 0,
      opacity: 1,
      zIndex: nextZIndex(state.elements),
      imageSrc: src,
      filter: "none",
      brightness: 100,
      contrast: 100,
      saturation: 100,
      blur: 0,
    };
    set((s) => ({
      elements: [...s.elements, newEl],
      selectedId: id,
      selectedIds: [id],
      lastEditedImage: src,
      lastEditedImageAspect: imageAspectRatio,
    }));
    get().pushHistory();
  },

  addTextElement: (text = "نص جديد") => {
    const id = uid();
    const state = get();
    const canvasW = state.canvasWidth || 2480;

    // قياس وتناسب عرض مربع النص مع طول النص بدقة لمنع المساحات الفارغة الشاسعة
    const fontSize = 32;
    const charWidth = fontSize * 0.9;
    const estimatedPx = Math.max(160, Math.min(canvasW * 0.6, text.length * charWidth + 60));
    const initialW = estimatedPx / canvasW;

    const newEl: CanvasElement = {
      id,
      type: "text",
      x: 0.5 - initialW / 2,
      y: 0.45,
      width: initialW,
      height: 0.05,
      rotation: 0,
      opacity: 1,
      zIndex: nextZIndex(get().elements),
      text,
      fontSize: 32,
      fontWeight: 700,
      color: "#1a1a2e",
      fontFamily: "\"IBM Plex Sans Arabic\", Cairo, Tajawal, sans-serif",
      textAlign: "center",
      textBgColor: "transparent",
      lineHeight: 1.2,
      letterSpacing: 0,
    };
    set((s) => ({ elements: [...s.elements, newEl], selectedId: id, selectedIds: [id] }));
    get().pushHistory();
  },

  addTextPreset: (preset: TextPresetType) => {
    const id = uid();
    const state = get();
    const canvasW = state.canvasWidth || 2480;

    let text = "نص جديد";
    let fontSize = 32;
    let fontWeight = 700;
    let color = "#0f172a";
    let fontFamily = "Cairo, sans-serif";
    let textBgColor = "transparent";
    let textBgRadius = 0;
    let textBgPadding = 0;
    let textBgBorderColor: string | undefined = undefined;
    let textBgBorderWidth: number | undefined = undefined;
    let opacity = 1;
    let rotation = 0;
    let height = 0.05;
    let stroke: string | undefined = undefined;
    let strokeWidth: number | undefined = undefined;
    let shadowColor: string | undefined = undefined;
    let shadowBlur: number | undefined = undefined;
    let shadowOffsetX: number | undefined = undefined;
    let shadowOffsetY: number | undefined = undefined;
    let shadowOpacity: number | undefined = undefined;
    let shadowGlow: boolean | undefined = undefined;
    let curve: number | undefined = undefined;
    let fillType: "solid" | "linear" | "radial" | undefined = "solid";
    let fillLinearGradientStartPoint: { x: number; y: number } | undefined = undefined;
    let fillLinearGradientEndPoint: { x: number; y: number } | undefined = undefined;
    let fillLinearGradientColorStops: Array<number | string> | undefined = undefined;

    switch (preset) {
      case "heading":
        text = "عنوان رئيسي";
        fontSize = 48;
        fontWeight = 800;
        fontFamily = "Cairo, sans-serif";
        color = "#0f172a";
        height = 0.07;
        break;
      case "subheading":
        text = "عنوان فرعي للتصميم";
        fontSize = 28;
        fontWeight = 600;
        fontFamily = "Almarai, sans-serif";
        color = "#334155";
        height = 0.05;
        break;
      case "body":
        text = "اكتب هنا وصفاً أو ملاحظات إضافية للتصميم...";
        fontSize = 18;
        fontWeight = 400;
        fontFamily = "\"IBM Plex Sans Arabic\", sans-serif";
        color = "#475569";
        height = 0.04;
        break;
      case "badge":
        text = "استوديو احترافي ★";
        fontSize = 20;
        fontWeight = 700;
        fontFamily = "Tajawal, sans-serif";
        color = "#ffffff";
        textBgColor = "#2563eb";
        textBgRadius = 999;
        textBgPadding = 10;
        height = 0.045;
        break;
      case "watermark":
        text = "GRIDO STUDIO · مسودة";
        fontSize = 36;
        fontWeight = 800;
        fontFamily = "Alexandria, sans-serif";
        color = "#94a3b8";
        opacity = 0.25;
        rotation = -35;
        height = 0.06;
        break;
      case "studio-date":
        text = `📅 ${new Date().toLocaleDateString("ar-EG", { year: "numeric", month: "long", day: "numeric" })}`;
        fontSize = 16;
        fontWeight = 600;
        fontFamily = "Cairo, sans-serif";
        color = "#1e293b";
        textBgColor = "rgba(241, 245, 249, 0.95)";
        textBgRadius = 8;
        textBgPadding = 8;
        height = 0.04;
        break;
      case "gold-luxury":
        text = "استوديو الفخامة للتصوير";
        fontSize = 42;
        fontWeight = 800;
        fontFamily = "Cairo, sans-serif";
        color = "#d97706";
        fillType = "linear";
        fillLinearGradientStartPoint = { x: 0, y: 0 };
        fillLinearGradientEndPoint = { x: 1, y: 1 };
        fillLinearGradientColorStops = [0, "#f59e0b", 0.5, "#fbbf24", 1, "#b45309"];
        shadowColor = "rgba(180, 83, 9, 0.45)";
        shadowBlur = 14;
        shadowOffsetY = 4;
        shadowOpacity = 0.6;
        height = 0.065;
        break;
      case "neon-glow":
        text = "GRIDO STUDIO ★";
        fontSize = 38;
        fontWeight = 800;
        fontFamily = "Alexandria, sans-serif";
        color = "#38bdf8";
        shadowColor = "#0284c7";
        shadowBlur = 20;
        shadowGlow = true;
        shadowOpacity = 0.9;
        stroke = "#0284c7";
        strokeWidth = 1.5;
        height = 0.06;
        break;
      case "stamp-circle":
        text = "★ استوديو التصوير المعتمد ★ 2026";
        fontSize = 26;
        fontWeight = 700;
        fontFamily = "Reem Kufi, sans-serif";
        color = "#dc2626";
        curve = 60;
        stroke = "#dc2626";
        strokeWidth = 0.8;
        height = 0.08;
        break;
      case "3d-title":
        text = "إصدار خاص وحصري";
        fontSize = 36;
        fontWeight = 900;
        fontFamily = "Changa, sans-serif";
        color = "#6366f1";
        shadowColor = "#312e81";
        shadowBlur = 0;
        shadowOffsetX = 4;
        shadowOffsetY = 4;
        shadowOpacity = 1;
        stroke = "#1e1b4b";
        strokeWidth = 1.2;
        height = 0.06;
        break;
      case "outline-modern":
        text = "MODERN DESIGN";
        fontSize = 44;
        fontWeight = 900;
        fontFamily = "Montserrat, sans-serif";
        color = "transparent";
        stroke = "#0f172a";
        strokeWidth = 2.5;
        height = 0.065;
        break;
      case "photographer-tag":
        text = "📸 تصوير الفنان: استوديو الإبداع";
        fontSize = 22;
        fontWeight = 600;
        fontFamily = "\"IBM Plex Sans Arabic\", sans-serif";
        color = "#475569";
        opacity = 0.9;
        height = 0.045;
        break;
      case "caption-card":
        text = "📍 استوديو التصوير · القاهرة";
        fontSize = 16;
        fontWeight = 600;
        fontFamily = "Tajawal, sans-serif";
        color = "#1e293b";
        textBgColor = "#f8fafc";
        textBgRadius = 8;
        textBgPadding = 8;
        textBgBorderColor = "#cbd5e1";
        textBgBorderWidth = 1.5;
        height = 0.04;
        break;
    }

    const charWidth = fontSize * 0.9;
    const estimatedPx = Math.max(160, Math.min(canvasW * 0.7, text.length * charWidth + 60));
    const initialW = estimatedPx / canvasW;

    const newEl: CanvasElement = {
      id,
      type: "text",
      x: 0.5 - initialW / 2,
      y: 0.45,
      width: initialW,
      height,
      rotation,
      opacity,
      zIndex: nextZIndex(get().elements),
      text,
      fontSize,
      fontWeight,
      color,
      fontFamily,
      textAlign: "center",
      textBgColor,
      textBgRadius,
      textBgPadding,
      textBgBorderColor,
      textBgBorderWidth,
      lineHeight: 1.2,
      letterSpacing: 0,
      stroke,
      strokeWidth,
      shadowColor,
      shadowBlur,
      shadowOffsetX,
      shadowOffsetY,
      shadowOpacity,
      shadowGlow,
      curve,
      fillType,
      fillLinearGradientStartPoint,
      fillLinearGradientEndPoint,
      fillLinearGradientColorStops,
    };

    set((s) => ({ elements: [...s.elements, newEl], selectedId: id, selectedIds: [id] }));
    get().pushHistory();
  },

  autoFitTextWidth: (id: string, textWidthPx?: number) => {
    const el = get().elements.find((x) => x.id === id);
    if (!el || el.type !== "text") return;

    const canvasW = get().canvasWidth || 2480;
    let newWidth = el.width;

    if (textWidthPx && textWidthPx > 0) {
      newWidth = Math.min(0.85, Math.max(0.04, (textWidthPx + 40) / canvasW));
    } else if (typeof document !== "undefined") {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.font = `${el.fontWeight || 400} ${el.fontSize || 32}px ${el.fontFamily || "Cairo"}`;
        const metrics = ctx.measureText(el.text || "");
        newWidth = Math.min(0.85, Math.max(0.04, (metrics.width + 48) / canvasW));
      }
    }

    set((s) => ({
      elements: s.elements.map((item: CanvasElement) => (item.id === id ? { ...item, width: newWidth } : item)),
    }));
    get().pushHistory();
  },

  centerElementHorizontally: (id: string) => {
    const el = get().elements.find((x) => x.id === id);
    if (!el) return;
    const newX = Math.max(0, 0.5 - el.width / 2);
    set((s) => ({
      elements: s.elements.map((item: CanvasElement) => (item.id === id ? { ...item, x: newX } : item)),
    }));
    get().pushHistory();
  },

  centerElementVertically: (id: string) => {
    const el = get().elements.find((x) => x.id === id);
    if (!el) return;
    const newY = Math.max(0, 0.5 - el.height / 2);
    set((s) => ({
      elements: s.elements.map((item: CanvasElement) => (item.id === id ? { ...item, y: newY } : item)),
    }));
    get().pushHistory();
  },

  addShapeElement: (shape, svgPath) => {
    const id = uid();
    const state = get();

    const isLine = shape === "line";
    const hPercent = isLine ? 0.03 : 0.3;
    const wPercent = 0.35 * (state.canvasHeight / state.canvasWidth);

    const newEl: CanvasElement = {
      id,
      type: "shape",
      x: 0.5 - wPercent / 2,
      y: 0.5 - hPercent / 2,
      width: wPercent,
      height: hPercent,
      rotation: 0,
      opacity: 1,
      zIndex: nextZIndex(state.elements),
      shape,
      fill: "#3b82f6",
      stroke: "#3b82f6",
      strokeWidth: isLine ? 4 : 0,
      radius: 8,
      svgPath,
    };
    set((s) => ({ elements: [...s.elements, newEl], selectedId: id, selectedIds: [id] }));
    get().pushHistory();
  },

  updateElement: (id, patch) => {
    set((s) => {
      const currentEl = s.elements.find((el: CanvasElement) => el.id === id);
      if (!currentEl) return {};

      // تخطي إعادة بناء المصفوفة عند عدم تغير أي قيمة (يحدث كثيراً مع تحديثات الـ drag المجمعة)
      const patchKeys = Object.keys(patch) as (keyof CanvasElement)[];
      let hasChanged = false;
      for (const key of patchKeys) {
        if (currentEl[key] !== patch[key]) {
          hasChanged = true;
          break;
        }
      }
      if (!hasChanged) return {};

      const nextElements = s.elements.map((el: CanvasElement) =>
        el.id === id ? { ...el, ...patch } as CanvasElement : el,
      );
      const isImg = currentEl.type === "image";
      const imgPatch = patch as Partial<ImageElement>;
      return {
        elements: nextElements,
        ...(isImg && imgPatch.imageSrc ? { lastEditedImage: imgPatch.imageSrc } : {}),
      };
    });
  },

  updateElements: (patches) => {
    set((s) => {
      const patchMap = new Map(patches.map((p) => [p.id, p.patch]));
      const nextElements = s.elements.map((el: CanvasElement) => {
        const patch = patchMap.get(el.id);
        return patch ? { ...el, ...patch } as CanvasElement : el;
      });
      const imageIds = new Set(s.elements.filter((e: CanvasElement) => e.type === "image").map((e) => e.id));
      const imageSrcPatch = patches.find(
        (p) => imageIds.has(p.id) && (p.patch as Partial<ImageElement>).imageSrc,
      ) as { id: string; patch: Partial<ImageElement> } | undefined;
      return {
        elements: nextElements,
        ...(imageSrcPatch ? { lastEditedImage: imageSrcPatch.patch.imageSrc } : {}),
      };
    });
  },

  removeElement: (id) => {
    set((s) => ({
      elements: s.elements.filter((el: CanvasElement) => el.id !== id),
      selectedId: s.selectedId === id ? null : s.selectedId,
      // [FIX #4] تنظيف selectedIds أيضاً لمنع الإشارة لعنصر محذوف
      selectedIds: s.selectedIds.filter((sid: string) => sid !== id),
    }));
    get().pushHistory();
  },

  removeElements: (ids) => {
    set((s) => ({
      elements: s.elements.filter((el: CanvasElement) => !ids.includes(el.id)),
      selectedId: ids.includes(s.selectedId || "") ? null : s.selectedId,
      selectedIds: s.selectedIds.filter((id: string) => !ids.includes(id)),
    }));
    get().pushHistory();
  },

  duplicateElement: (id) => {
    const el = get().elements.find((e: CanvasElement) => e.id === id);
    if (!el) return;
    const newId = uid();
    const copy: CanvasElement = {
      ...el,
      id: newId,
      groupId: undefined,
      x: Math.min(el.x + 0.05, 0.9),
      y: Math.min(el.y + 0.05, 0.9),
      zIndex: nextZIndex(get().elements),
    };
    set((s) => ({ elements: [...s.elements, copy], selectedId: newId, selectedIds: [newId] }));
    get().pushHistory();
  },

  duplicateElements: (ids) => {
    const nextElements = [...get().elements];
    const newSelectedIds: string[] = [];
    const sortedIds = [...ids].sort((a, b) => {
      const elA = nextElements.find((e: CanvasElement) => e.id === a);
      const elB = nextElements.find((e: CanvasElement) => e.id === b);
      return (elA?.zIndex || 0) - (elB?.zIndex || 0);
    });

    const groupMappings: Record<string, string> = {};

    sortedIds.forEach((id) => {
      const el = nextElements.find((e: CanvasElement) => e.id === id);
      if (!el) return;
      const newId = uid();

      let newGroupId = el.groupId;
      if (el.groupId) {
        if (!groupMappings[el.groupId]) {
          groupMappings[el.groupId] = `group-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
        }
        newGroupId = groupMappings[el.groupId];
      }

      const copy: CanvasElement = {
        ...el,
        id: newId,
        groupId: newGroupId,
        x: Math.min(el.x + 0.05, 0.9),
        y: Math.min(el.y + 0.05, 0.9),
        // تزايد رتيب لكل نسخة لضمان ترتيب فريد حتى مع التكرار الجماعي
        zIndex: nextZIndex(nextElements),
      };
      nextElements.push(copy);
      newSelectedIds.push(newId);
    });

    set({
      elements: nextElements,
      selectedId: newSelectedIds[newSelectedIds.length - 1] || null,
      selectedIds: newSelectedIds,
    });
    get().pushHistory();
  },

  copySelectedElements: (targetIds) => {
    const state = get();
    const idsToCopy = targetIds && targetIds.length > 0 ? targetIds : [...state.selectedIds];
    if (idsToCopy.length === 0 && state.selectedId) {
      idsToCopy.push(state.selectedId);
    }
    if (idsToCopy.length === 0) return;

    const toCopy = state.elements.filter((el: CanvasElement) => idsToCopy.includes(el.id));
    if (toCopy.length > 0) {
      const cloned = toCopy.map((el: CanvasElement) => ({ ...el }));
      set({ clipboardElements: cloned });

      try {
        if (cloned.length === 1 && cloned[0].type === "text") {
          const textVal = (cloned[0] as any).text || "";
          navigator.clipboard.writeText(textVal);
        } else {
          navigator.clipboard.writeText("GRIDO_ELEMENTS:" + JSON.stringify(cloned));
        }
      } catch (e) {
        // Safe fallback if clipboard write API fails or is restricted
      }
    }
  },

  cutSelectedElements: (targetIds) => {
    const state = get();
    const idsToCut = targetIds && targetIds.length > 0 ? targetIds : [...state.selectedIds];
    const finalIds = idsToCut.length > 0 ? idsToCut : (state.selectedId ? [state.selectedId] : []);
    if (finalIds.length === 0) return;

    const removableIds = finalIds.filter((id) => {
      const found = state.elements.find((e: CanvasElement) => e.id === id);
      return found && !found.locked;
    });

    if (removableIds.length === 0) return;

    const toCut = state.elements.filter((el: CanvasElement) => removableIds.includes(el.id));
    const cloned = toCut.map((el: CanvasElement) => ({ ...el }));
    set({ clipboardElements: cloned });

    try {
      if (cloned.length === 1 && cloned[0].type === "text") {
        const textVal = (cloned[0] as any).text || "";
        navigator.clipboard.writeText(textVal);
      } else {
        navigator.clipboard.writeText("GRIDO_ELEMENTS:" + JSON.stringify(cloned));
      }
    } catch (e) {
      // Safe fallback if clipboard write API fails
    }

    get().removeElements(removableIds);
  },

  pasteCopiedElements: (customElements) => {
    const state = get();
    const clipboard = customElements && customElements.length > 0 ? customElements : state.clipboardElements;
    if (!clipboard || clipboard.length === 0) return;

    const nextElements = [...state.elements];
    const newSelectedIds: string[] = [];
    const groupMappings: Record<string, string> = {};

    const sortedClipboard = [...clipboard].sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0));

    sortedClipboard.forEach((el) => {
      const newId = uid();

      let newGroupId = el.groupId;
      if (el.groupId) {
        if (!groupMappings[el.groupId]) {
          groupMappings[el.groupId] = `group-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
        }
        newGroupId = groupMappings[el.groupId];
      }

      const pasted: CanvasElement = {
        ...el,
        id: newId,
        groupId: newGroupId,
        x: Math.min(el.x + 0.03, 0.9),
        y: Math.min(el.y + 0.03, 0.9),
        zIndex: nextZIndex(nextElements),
      };

      nextElements.push(pasted);
      newSelectedIds.push(newId);
    });

    set({
      elements: nextElements,
      selectedId: newSelectedIds.length > 0 ? newSelectedIds[0] : null,
      selectedIds: newSelectedIds,
    });
    get().pushHistory();
  },

  bringToFront: (id) => {
    const maxZ = Math.max(0, ...get().elements.map((e: CanvasElement) => e.zIndex));
    get().updateElement(id, { zIndex: maxZ + 10 });
    get().pushHistory();
  },

  sendToBack: (id) => {
    const minZ = Math.min(0, ...get().elements.map((e: CanvasElement) => e.zIndex));
    get().updateElement(id, { zIndex: minZ - 10 });
    get().pushHistory();
  },

  selectElement: (id) => {
    if (!id) {
      set({ selectedId: null, selectedIds: [] });
      return;
    }
    const el = get().elements.find((e: CanvasElement) => e.id === id);
    if (el && el.groupId) {
      const groupElIds = get().elements
        .filter((e: CanvasElement) => e.groupId === el.groupId)
        .map((e: CanvasElement) => e.id);
      set({ selectedId: id, selectedIds: groupElIds });
    } else {
      set({ selectedId: id, selectedIds: [id] });
    }
  },

  toggleElementSelection: (id) => {
    set((s) => {
      const el = s.elements.find((e: CanvasElement) => e.id === id);
      if (!el) return {};

      const isSelected = s.selectedIds.includes(id);
      let nextSelected: string[];

      if (el.groupId) {
        const groupElIds = s.elements
          .filter((e: CanvasElement) => e.groupId === el.groupId)
          .map((e: CanvasElement) => e.id);

        if (isSelected) {
          nextSelected = s.selectedIds.filter((x: string) => !groupElIds.includes(x));
        } else {
          nextSelected = [...s.selectedIds, ...groupElIds];
        }
      } else {
        if (isSelected) {
          nextSelected = s.selectedIds.filter((x: string) => x !== id);
        } else {
          nextSelected = [...s.selectedIds, id];
        }
      }

      return {
        selectedIds: nextSelected,
        selectedId: nextSelected.length > 0 ? nextSelected[nextSelected.length - 1] : null,
      };
    });
  },

  groupSelectedElements: () => {
    const { selectedIds } = get();
    if (selectedIds.length < 2) return;

    const newGroupId = `group-${Date.now()}`;

    set((s) => ({
      elements: s.elements.map((el: CanvasElement) =>
        selectedIds.includes(el.id) ? { ...el, groupId: newGroupId } : el,
      ),
    }));
    get().pushHistory();
  },

  ungroupSelectedElements: () => {
    const { selectedIds, elements } = get();
    if (selectedIds.length === 0) return;

    const groupIdsToUngroup = elements
      .filter((el: CanvasElement) => selectedIds.includes(el.id) && el.groupId)
      .map((el: CanvasElement) => el.groupId as string);

    if (groupIdsToUngroup.length === 0) return;

    set((s) => ({
      elements: s.elements.map((el: CanvasElement) =>
        el.groupId && groupIdsToUngroup.includes(el.groupId)
          ? { ...el, groupId: undefined }
          : el,
      ),
    }));
    get().pushHistory();
  },

  setEditingTextId: (id) => set({ editingTextId: id }),
});
