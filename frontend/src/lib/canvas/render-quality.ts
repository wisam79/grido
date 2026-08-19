import { create } from "zustand";

interface RenderQualityState {
  isDraggingFilter: boolean;
  setIsDraggingFilter: (v: boolean) => void;
  enhancingElementId: string | null;
  setEnhancingElementId: (id: string | null) => void;
}

export const useRenderQuality = create<RenderQualityState>((set) => ({
  isDraggingFilter: false,
  setIsDraggingFilter: (v) => set({ isDraggingFilter: v }),
  enhancingElementId: null,
  setEnhancingElementId: (id) => set({ enhancingElementId: id }),
}));
