import { create } from "zustand";

interface RenderQualityState {
  isDraggingFilter: boolean;
  setIsDraggingFilter: (v: boolean) => void;
}

export const useRenderQuality = create<RenderQualityState>((set) => ({
  isDraggingFilter: false,
  setIsDraggingFilter: (v) => set({ isDraggingFilter: v }),
}));
