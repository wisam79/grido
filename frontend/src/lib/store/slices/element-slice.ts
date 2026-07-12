import { StateCreator } from "zustand";
import { CanvasElement, ShapeElement, ImageElement } from "../types";
import { uid } from "../../utils";

export interface ElementSlice {
  elements: CanvasElement[];
  selectedId: string | null;
  selectedIds: string[];
  editingTextId: string | null;

  addImageElement: (src: string, imageAspectRatio?: number) => void;
  addTextElement: (text?: string) => void;
  addShapeElement: (shape: ShapeElement["shape"], svgPath?: string) => void;
  updateElement: (id: string, patch: Partial<CanvasElement>) => void;
  updateElements: (patches: { id: string; patch: Partial<CanvasElement> }[]) => void;
  removeElement: (id: string) => void;
  removeElements: (ids: string[]) => void;
  duplicateElement: (id: string) => void;
  duplicateElements: (ids: string[]) => void;
  bringToFront: (id: string) => void;
  sendToBack: (id: string) => void;
  selectElement: (id: string | null) => void;
  toggleElementSelection: (id: string) => void;
  groupSelectedElements: () => void;
  ungroupSelectedElements: () => void;
  setEditingTextId: (id: string | null) => void;
}

export const DEFAULT_ELEMENT_STATE = {
  elements: [] as CanvasElement[],
  selectedId: null as string | null,
  selectedIds: [] as string[],
  editingTextId: null as string | null,
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
      zIndex: (state.elements.length + 1) * 10,
      imageSrc: src,
      filter: "none",
      brightness: 100,
      contrast: 100,
      saturation: 100,
      blur: 0,
    };
    set((s: any) => ({
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
    const newEl: CanvasElement = {
      id,
      type: "text",
      x: 0.35,
      y: 0.45,
      width: 0.3,
      height: 0.05,
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
    set((s: any) => ({ elements: [...s.elements, newEl], selectedId: id, selectedIds: [id] }));
    get().pushHistory();
  },

  addShapeElement: (shape, svgPath) => {
    const id = uid();
    const state = get();

    const hPercent = 0.3;
    const wPercent = hPercent * (state.canvasHeight / state.canvasWidth);

    const newEl: CanvasElement = {
      id,
      type: "shape",
      x: 0.5 - wPercent / 2,
      y: 0.5 - hPercent / 2,
      width: wPercent,
      height: hPercent,
      rotation: 0,
      opacity: 1,
      zIndex: (state.elements.length + 1) * 10,
      shape,
      fill: "#3b82f6",
      stroke: "#000000",
      strokeWidth: 0,
      radius: 8,
      svgPath,
    };
    set((s: any) => ({ elements: [...s.elements, newEl], selectedId: id, selectedIds: [id] }));
    get().pushHistory();
  },

  updateElement: (id, patch) => {
    set((s: any) => {
      const nextElements = s.elements.map((el: CanvasElement) =>
        el.id === id ? { ...el, ...patch } : el,
      );
      const targetEl = nextElements.find((e: CanvasElement) => e.id === id);
      const isImg = targetEl && targetEl.type === "image";
      const imgPatch = patch as Partial<ImageElement>;
      return {
        elements: nextElements,
        ...(isImg && imgPatch.imageSrc ? { lastEditedImage: imgPatch.imageSrc } : {}),
      };
    });
  },

  updateElements: (patches) => {
    set((s: any) => {
      const nextElements = s.elements.map((el: CanvasElement) => {
        const patchObj = patches.find((p) => p.id === el.id);
        return patchObj ? { ...el, ...patchObj.patch } : el;
      });
      const imageSrcPatch = patches.find(
        (p) => (p.patch as Partial<ImageElement>).imageSrc && s.elements.find((e: CanvasElement) => e.id === p.id)?.type === "image",
      ) as { id: string; patch: Partial<ImageElement> } | undefined;
      return {
        elements: nextElements,
        ...(imageSrcPatch ? { lastEditedImage: imageSrcPatch.patch.imageSrc } : {}),
      };
    });
  },

  removeElement: (id) => {
    set((s: any) => ({
      elements: s.elements.filter((el: CanvasElement) => el.id !== id),
      selectedId: s.selectedId === id ? null : s.selectedId,
    }));
    get().pushHistory();
  },

  removeElements: (ids) => {
    set((s: any) => ({
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
      ...JSON.parse(JSON.stringify(el)),
      id: newId,
      groupId: undefined,
      x: Math.min(el.x + 0.05, 0.9),
      y: Math.min(el.y + 0.05, 0.9),
      zIndex: (get().elements.length + 1) * 10,
    };
    set((s: any) => ({ elements: [...s.elements, copy], selectedId: newId, selectedIds: [newId] }));
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
        ...JSON.parse(JSON.stringify(el)),
        id: newId,
        groupId: newGroupId,
        x: Math.min(el.x + 0.05, 0.9),
        y: Math.min(el.y + 0.05, 0.9),
        zIndex: (nextElements.length + 1) * 10,
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
    set((s: any) => {
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

    set((s: any) => ({
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

    set((s: any) => ({
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
