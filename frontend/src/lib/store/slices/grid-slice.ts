import { StateCreator } from "zustand";
import { EditorState } from "../index";

export type RulerUnit = "mm" | "cm" | "in" | "px";

export interface UserGuide {
  id: string;
  type: "h" | "v";
  pos: number; // 0 to 1 relative to canvas dimension
}

export interface GridSlice {
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
  rulerUnit: RulerUnit;
  userGuides: UserGuide[];
  showUserGuides: boolean;

  setShowGrid: (show: boolean) => void;
  setGridSize: (size: number) => void;
  setGridColor: (color: string) => void;
  setGridOpacity: (opacity: number) => void;
  setGridSubdivisions: (subdivisions: number) => void;
  setGridType: (type: "lines" | "dots") => void;
  setSnapToGrid: (snap: boolean) => void;
  setShowColumns: (show: boolean) => void;
  setColumnsCount: (count: number) => void;
  setColumnsColor: (color: string) => void;
  setColumnsMargin: (margin: number) => void;
  setColumnsGutter: (gutter: number) => void;
  setShowRuler: (show: boolean) => void;
  setRulerUnit: (unit: RulerUnit) => void;
  addUserGuide: (guide: { id?: string; type: "h" | "v"; pos: number }) => void;
  updateUserGuide: (id: string, pos: number) => void;
  removeUserGuide: (id: string) => void;
  clearUserGuides: () => void;
  setShowUserGuides: (show: boolean) => void;
}

export const DEFAULT_GRID_STATE = {
  showGrid: false,
  gridSize: 50,
  gridColor: "#000000",
  gridOpacity: 0.15,
  gridSubdivisions: 5,
  gridType: "lines" as const,
  snapToGrid: true,
  showColumns: false,
  columnsCount: 12,
  columnsColor: "rgba(239, 68, 68, 0.08)",
  columnsMargin: 20,
  columnsGutter: 12,
  showRuler: true,
  rulerUnit: "mm" as RulerUnit,
  userGuides: [] as UserGuide[],
  showUserGuides: true,
};

let guideCounter = 0;

export const createGridSlice: StateCreator<EditorState, [], [], GridSlice> = (set) => ({
  ...DEFAULT_GRID_STATE,

  setShowGrid: (showGrid) => set({ showGrid }),
  setGridSize: (gridSize) => set({ gridSize }),
  setGridColor: (gridColor) => set({ gridColor }),
  setGridOpacity: (gridOpacity) => set({ gridOpacity }),
  setGridSubdivisions: (gridSubdivisions) => set({ gridSubdivisions }),
  setGridType: (gridType) => set({ gridType }),
  setSnapToGrid: (snapToGrid) => set({ snapToGrid }),
  setShowColumns: (showColumns) => set({ showColumns }),
  setColumnsCount: (columnsCount) => set({ columnsCount }),
  setColumnsColor: (columnsColor) => set({ columnsColor }),
  setColumnsMargin: (columnsMargin) => set({ columnsMargin }),
  setColumnsGutter: (columnsGutter) => set({ columnsGutter }),
  setShowRuler: (showRuler) => set({ showRuler }),
  setRulerUnit: (rulerUnit) => set({ rulerUnit }),
  addUserGuide: ({ id, type, pos }) =>
    set((state) => {
      const newGuide: UserGuide = {
        id: id || `guide-${Date.now()}-${++guideCounter}`,
        type,
        pos: Math.min(1, Math.max(0, pos)),
      };
      return { userGuides: [...state.userGuides, newGuide] };
    }),
  updateUserGuide: (id, pos) =>
    set((state) => ({
      userGuides: state.userGuides.map((g) =>
        g.id === id ? { ...g, pos: Math.min(1, Math.max(0, pos)) } : g
      ),
    })),
  removeUserGuide: (id) =>
    set((state) => ({
      userGuides: state.userGuides.filter((g) => g.id !== id),
    })),
  clearUserGuides: () => set({ userGuides: [] }),
  setShowUserGuides: (showUserGuides) => set({ showUserGuides }),
});
