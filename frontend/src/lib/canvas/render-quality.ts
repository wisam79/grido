import { create } from 'zustand';

interface RenderQualityState {
  isDraggingFilter: boolean;
  draggingFilterId: string | null;
  setIsDraggingFilter: (v: boolean, targetId?: string | null) => void;
  enhancingElementId: string | null;
  setEnhancingElementId: (id: string | null) => void;
}

export const useRenderQuality = create<RenderQualityState>((set) => ({
  isDraggingFilter: false,
  draggingFilterId: null,
  setIsDraggingFilter: (v, targetId = null) =>
    set({ isDraggingFilter: v, draggingFilterId: v ? (targetId ?? null) : null }),
  enhancingElementId: null,
  setEnhancingElementId: (id) => set({ enhancingElementId: id }),
}));
