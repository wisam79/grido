import { StateCreator } from "zustand";
import { EditorState } from "../index";

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
}

export const DEFAULT_GRID_STATE = {
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
};

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
});
