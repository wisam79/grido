import { StateCreator } from "zustand";
import { CanvasElement, ShapeElement, ImageElement } from "../types";
import { uid } from "../../utils";
import { computeSmartGridLayout } from "../../canvas/grid-layout-math";
import { TextPresetType, TEXT_PRESETS } from "../../templates";

export type { TextPresetType };

export interface BatchImageItem {
  src: string;
  aspectRatio?: number;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
}

export interface ElementSlice {
  elements: CanvasElement[];
  selectedId: string | null;
  selectedIds: string[];
  editingTextId: string | null;
  clipboardElements: CanvasElement[];

  addImageElement: (src: string, imageAspectRatio?: number) => void;
  addImageElementsBatch: (
    items: BatchImageItem[],
    options?: {
      layoutMode?: "grid" | "cascade" | "stack";
      columns?: number;
      gapPx?: number;
      marginPx?: number;
      centerLastRow?: boolean;
    }
  ) => void;
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
  selectAllElements: () => void;
  setSelectedIds: (ids: string[]) => void;
  toggleElementSelection: (id: string) => void;
  groupSelectedElements: () => void;
  ungroupSelectedElements: () => void;
  setEditingTextId: (id: string | null) => void;
  autoFitTextWidth: (id: string, textWidthPx?: number) => void;
  centerElementHorizontally: (id: string) => void;
  centerElementVertically: (id: string) => void;
  alignSelectedElements: (alignment: "left" | "center" | "right" | "top" | "middle" | "bottom") => void;
  distributeSelectedElements: (axis: "horizontal" | "vertical") => void;
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

  addImageElementsBatch: (items, options) => {
    if (!items || items.length === 0) return;
    const state = get();
    const canvasWidth = state.canvasWidth || 2480;
    const canvasHeight = state.canvasHeight || 3508;

    // Check if items already have fully specified layout coordinates
    const hasPredefinedCoords = items.every(
      (it) => it.x !== undefined && it.y !== undefined && it.width !== undefined && it.height !== undefined
    );

    const placedItems = hasPredefinedCoords
      ? items.map((it) => ({
          src: it.src,
          aspectRatio: it.aspectRatio || 1,
          x: it.x!,
          y: it.y!,
          width: it.width!,
          height: it.height!,
        }))
      : computeSmartGridLayout(items, {
          canvasWidth,
          canvasHeight,
          columns: options?.columns,
          gapPx: options?.gapPx,
          marginPx: options?.marginPx,
          centerLastRow: options?.centerLastRow ?? true,
          layoutMode: options?.layoutMode ?? "grid",
        });

    let currentZ = nextZIndex(state.elements);
    const newElements: CanvasElement[] = placedItems.map((placed) => {
      const elId = uid();
      const el: CanvasElement = {
        id: elId,
        type: "image",
        x: placed.x,
        y: placed.y,
        width: placed.width,
        height: placed.height,
        rotation: 0,
        opacity: 1,
        zIndex: currentZ,
        imageSrc: placed.src,
        filter: "none",
        brightness: 100,
        contrast: 100,
        saturation: 100,
        blur: 0,
      };
      currentZ += 10;
      return el;
    });

    const newIds = newElements.map((e) => e.id);
    const lastItem = items[items.length - 1];

    set((s) => ({
      elements: [...s.elements, ...newElements],
      selectedId: newIds[0] ?? null,
      selectedIds: newIds,
      lastEditedImage: lastItem?.src ?? s.lastEditedImage,
      lastEditedImageAspect: lastItem?.aspectRatio ?? s.lastEditedImageAspect,
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

    const config = TEXT_PRESETS[preset] || TEXT_PRESETS.heading;
    const text = config.getText();
    const fontSize = config.fontSize;

    const charWidth = fontSize * 0.9;
    const estimatedPx = Math.max(160, Math.min(canvasW * 0.7, text.length * charWidth + 60));
    const initialW = estimatedPx / canvasW;

    const newEl: CanvasElement = {
      id,
      type: "text",
      x: 0.5 - initialW / 2,
      y: 0.45,
      width: initialW,
      height: config.height,
      rotation: config.rotation ?? 0,
      opacity: config.opacity ?? 1,
      zIndex: nextZIndex(get().elements),
      text,
      fontSize,
      fontWeight: config.fontWeight,
      color: config.color,
      fontFamily: config.fontFamily,
      textAlign: "center",
      textBgColor: config.textBgColor ?? "transparent",
      textBgRadius: config.textBgRadius ?? 0,
      textBgPadding: config.textBgPadding ?? 0,
      textBgBorderColor: config.textBgBorderColor,
      textBgBorderWidth: config.textBgBorderWidth,
      lineHeight: 1.2,
      letterSpacing: 0,
      stroke: config.stroke,
      strokeWidth: config.strokeWidth,
      shadowColor: config.shadowColor,
      shadowBlur: config.shadowBlur,
      shadowOffsetX: config.shadowOffsetX,
      shadowOffsetY: config.shadowOffsetY,
      shadowOpacity: config.shadowOpacity,
      shadowGlow: config.shadowGlow,
      curve: config.curve,
      fillType: config.fillType ?? "solid",
      fillLinearGradientStartPoint: config.fillLinearGradientStartPoint,
      fillLinearGradientEndPoint: config.fillLinearGradientEndPoint,
      fillLinearGradientColorStops: config.fillLinearGradientColorStops,
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
        let textToMeasure = el.text || "";
        if (el.arabicNumerals) {
          textToMeasure = textToMeasure.replace(/\d/g, (d) => "٠١٢٣٤٥٦٧٨٩"[parseInt(d, 10)]);
        }
        const fontStylePrefix = el.fontStyle === "italic" ? "italic " : "";
        ctx.font = `${fontStylePrefix}${el.fontWeight || 400} ${el.fontSize || 32}px ${el.fontFamily || "Cairo, Tajawal, sans-serif"}`;
        const metrics = ctx.measureText(textToMeasure);
        const letterSpacingExtra = (el.letterSpacing || 0) * textToMeasure.length;
        const totalW = metrics.width + Math.max(0, letterSpacingExtra);
        newWidth = Math.min(0.95, Math.max(0.04, (totalW + 48) / canvasW));
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
    const basePx = Math.min(state.canvasWidth, state.canvasHeight) * 0.25;
    const wPx = isLine ? basePx * 1.5 : basePx;
    const hPx = isLine ? Math.max(16, basePx * 0.05) : basePx;

    const wPercent = wPx / state.canvasWidth;
    const hPercent = hPx / state.canvasHeight;

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

  selectAllElements: () => {
    const visibleIds = get().elements.filter((el) => el.visible !== false).map((el) => el.id);
    set({
      selectedId: visibleIds.length === 1 ? visibleIds[0] : null,
      selectedIds: visibleIds,
    });
  },

  setSelectedIds: (ids: string[]) => {
    set({
      selectedId: ids.length === 1 ? ids[0] : null,
      selectedIds: ids,
    });
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

  alignSelectedElements: (alignment) => {
    const state = get();
    const targetIds = state.selectedIds.length > 0 ? state.selectedIds : (state.selectedId ? [state.selectedId] : []);
    const elementsToAlign = state.elements.filter((e: CanvasElement) => targetIds.includes(e.id) && !e.locked);
    if (elementsToAlign.length === 0) return;

    // تقسيم العناصر إلى وحدات منطقية (مجموعات متماسكة أو عناصر مفردة)
    const unitMap = new Map<string, CanvasElement[]>();
    let ungroupedCounter = 0;

    elementsToAlign.forEach((el) => {
      const key = el.groupId ? `group_${el.groupId}` : `single_${ungroupedCounter++}`;
      if (!unitMap.has(key)) {
        unitMap.set(key, []);
      }
      unitMap.get(key)!.push(el);
    });

    const units = Array.from(unitMap.values());
    const isSingleUnit = units.length === 1;

    let overallMinX = Math.min(...elementsToAlign.map(e => e.x));
    let overallMaxX = Math.max(...elementsToAlign.map(e => e.x + e.width));
    let overallMinY = Math.min(...elementsToAlign.map(e => e.y));
    let overallMaxY = Math.max(...elementsToAlign.map(e => e.y + e.height));

    if (isSingleUnit) {
      // محاذاة الوحدة الواحدة بالنسبة لحدود الكانفس الكاملة (0..1)
      overallMinX = 0;
      overallMaxX = 1;
      overallMinY = 0;
      overallMaxY = 1;
    }

    const overallCenterX = (overallMinX + overallMaxX) / 2;
    const overallCenterY = (overallMinY + overallMaxY) / 2;

    const patches: { id: string; patch: Partial<CanvasElement> }[] = [];

    units.forEach((unitElements) => {
      const uMinX = Math.min(...unitElements.map(e => e.x));
      const uMaxX = Math.max(...unitElements.map(e => e.x + e.width));
      const uMinY = Math.min(...unitElements.map(e => e.y));
      const uMaxY = Math.max(...unitElements.map(e => e.y + e.height));
      const uWidth = uMaxX - uMinX;
      const uHeight = uMaxY - uMinY;

      let dx = 0;
      let dy = 0;

      switch (alignment) {
        case "left":
          dx = overallMinX - uMinX;
          break;
        case "center":
          dx = (overallCenterX - uWidth / 2) - uMinX;
          break;
        case "right":
          dx = (overallMaxX - uWidth) - uMinX;
          break;
        case "top":
          dy = overallMinY - uMinY;
          break;
        case "middle":
          dy = (overallCenterY - uHeight / 2) - uMinY;
          break;
        case "bottom":
          dy = (overallMaxY - uHeight) - uMinY;
          break;
      }

      unitElements.forEach((el) => {
        patches.push({
          id: el.id,
          patch: {
            x: el.x + dx,
            y: el.y + dy,
          },
        });
      });
    });

    get().updateElements(patches);
    get().pushHistory();
  },

  distributeSelectedElements: (axis) => {
    const state = get();
    const targetIds = state.selectedIds.length >= 3 ? state.selectedIds : [];
    const elementsToDistribute = state.elements.filter((e: CanvasElement) => targetIds.includes(e.id) && !e.locked);
    if (elementsToDistribute.length < 3) return;

    const patches: { id: string; patch: Partial<CanvasElement> }[] = [];

    if (axis === "horizontal") {
      const sorted = [...elementsToDistribute].sort((a, b) => a.x - b.x);
      const first = sorted[0];
      const last = sorted[sorted.length - 1];
      const totalSpan = (last.x + last.width) - first.x;
      const totalWidths = sorted.reduce((sum, el) => sum + el.width, 0);
      const remainingSpace = totalSpan - totalWidths;
      const gap = remainingSpace / (sorted.length - 1);

      let currentX = first.x;
      sorted.forEach((el, index) => {
        if (index === 0 || index === sorted.length - 1) {
          currentX += el.width + gap;
        } else {
          patches.push({
            id: el.id,
            patch: { x: currentX },
          });
          currentX += el.width + gap;
        }
      });
    } else {
      const sorted = [...elementsToDistribute].sort((a, b) => a.y - b.y);
      const first = sorted[0];
      const last = sorted[sorted.length - 1];
      const totalSpan = (last.y + last.height) - first.y;
      const totalHeights = sorted.reduce((sum, el) => sum + el.height, 0);
      const remainingSpace = totalSpan - totalHeights;
      const gap = remainingSpace / (sorted.length - 1);

      let currentY = first.y;
      sorted.forEach((el, index) => {
        if (index === 0 || index === sorted.length - 1) {
          currentY += el.height + gap;
        } else {
          patches.push({
            id: el.id,
            patch: { y: currentY },
          });
          currentY += el.height + gap;
        }
      });
    }

    if (patches.length > 0) {
      get().updateElements(patches);
      get().pushHistory();
    }
  },
});
