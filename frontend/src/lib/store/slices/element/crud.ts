import { sanitizeText } from '@/lib/canvas/text-helpers';

import { nextZIndex, normalizeSelection } from './types';
import { uid } from '../../../utils';

import type { ElementCross, ElementSlice } from './types';
import type { CanvasElement, ImageElement, TextElement } from '../../types';
import type { StateCreator } from 'zustand';

export const createElementCrudSlice: StateCreator<
  ElementCross,
  [],
  [],
  Pick<
    ElementSlice,
    | 'updateElement'
    | 'updateElements'
    | 'removeElement'
    | 'removeElements'
    | 'duplicateElement'
    | 'duplicateElements'
  >
> = (set, get) => ({
  updateElement: (id, patch) => {
    set((s) => {
      const currentEl = s.elements.find((el: CanvasElement) => el.id === id);
      if (!currentEl) return {};

      // P0: تعقيم النص عند أي تحديث نصي — يمنع دخول محارف تحكم/نص ضخم للـ store
      let effectivePatch: Partial<CanvasElement> = patch;
      if (
        (currentEl.type === 'text' || (patch as Partial<TextElement>).text !== undefined) &&
        typeof (patch as Partial<TextElement>).text === 'string'
      ) {
        const sanitized = sanitizeText((patch as Partial<TextElement>).text as string);
        if (sanitized !== (patch as Partial<TextElement>).text) {
          effectivePatch = { ...patch, text: sanitized } as Partial<CanvasElement>;
        }
      }

      // تخطي إعادة بناء المصفوفة عند عدم تغير أي قيمة (يحدث كثيراً مع تحديثات الـ drag المجمعة)
      const patchKeys = Object.keys(effectivePatch) as (keyof CanvasElement)[];
      let hasChanged = false;
      for (const key of patchKeys) {
        if (currentEl[key] !== effectivePatch[key]) {
          hasChanged = true;
          break;
        }
      }
      if (!hasChanged) return {};

      const nextElements = s.elements.map((el: CanvasElement) =>
        el.id === id ? ({ ...el, ...effectivePatch } as CanvasElement) : el,
      );
      const isImg = currentEl.type === 'image';
      const imgPatch = patch as Partial<ImageElement>;
      return {
        elements: nextElements,
        ...(isImg && imgPatch.imageSrc ? { lastEditedImage: imgPatch.imageSrc } : {}),
      };
    });
  },

  updateElements: (patches) => {
    set((s) => {
      // P0: تعقيم أي patch نصي جماعي قبل التطبيق
      const sanitizedPatches = patches.map((p) => {
        const t = (p.patch as Partial<TextElement>).text;
        if (typeof t === 'string') {
          const s2 = sanitizeText(t);
          if (s2 !== t) return { ...p, patch: { ...p.patch, text: s2 } as Partial<CanvasElement> };
        }
        return p;
      });
      const patchMap = new Map(sanitizedPatches.map((p) => [p.id, p.patch]));
      const nextElements = s.elements.map((el: CanvasElement) => {
        const patch = patchMap.get(el.id);
        return patch ? ({ ...el, ...patch } as CanvasElement) : el;
      });
      const imageIds = new Set(
        s.elements.filter((e: CanvasElement) => e.type === 'image').map((e) => e.id),
      );
      const imageSrcPatch = patches.find(
        (p) => imageIds.has(p.id) && (p.patch as Partial<ImageElement>).imageSrc,
      ) as { id: string; patch: Partial<ImageElement> } | undefined;
      return {
        elements: nextElements,
        ...(imageSrcPatch ? { lastEditedImage: imageSrcPatch.patch.imageSrc } : {}),
      };
    });
  },

  removeElement: (id, force = false) => {
    const el = get().elements.find((e: CanvasElement) => e.id === id);
    if (el?.locked && !force) return;
    set((s) => {
      const remainingIds = s.selectedIds.filter((sid: string) => sid !== id);
      return {
        elements: s.elements.filter((item: CanvasElement) => item.id !== id),
        ...normalizeSelection(remainingIds, s.selectedId === id ? null : s.selectedId),
      };
    });
    get().pushHistory();
  },

  removeElements: (ids, force = false) => {
    const targetSet = new Set(ids);
    set((s) => {
      const remainingIds = s.selectedIds.filter((id: string) => {
        if (!targetSet.has(id)) return true;
        const el = s.elements.find((e: CanvasElement) => e.id === id);
        return Boolean(el?.locked && !force);
      });
      return {
        elements: s.elements.filter((el: CanvasElement) => {
          if (!targetSet.has(el.id)) return true;
          return Boolean(el.locked && !force);
        }),
        ...normalizeSelection(
          remainingIds,
          targetSet.has(s.selectedId || '') ? null : s.selectedId,
        ),
      };
    });
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
    set((s) => ({
      elements: [...s.elements, copy],
      ...normalizeSelection(newId),
    }));
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
          groupMappings[el.groupId] =
            `group-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
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
      ...normalizeSelection(newSelectedIds),
    });
    get().pushHistory();
  },
});
