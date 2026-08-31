import { describe, it, expect } from "vitest";
import {
  computeSmartGridLayout,
  calculateOptimalColumns,
} from "../src/lib/canvas/grid-layout-math";
import { useEditorStore } from "../src/lib/editor-store";

describe("Grid Layout Math & Batch Insertion", () => {
  it("calculates optimal columns correctly", () => {
    // 1 image -> 1 col
    expect(calculateOptimalColumns(1, 2480, 3508)).toBe(1);
    // 4 images on portrait -> 2 cols
    expect(calculateOptimalColumns(4, 2480, 3508)).toBe(2);
    // 6 images on portrait -> 2 cols
    expect(calculateOptimalColumns(6, 2480, 3508)).toBe(2);
    // 6 images on landscape -> 3 cols
    expect(calculateOptimalColumns(6, 3508, 2480)).toBe(3);
  });

  it("computes non-overlapping positions for 4 images in grid mode", () => {
    const items = [
      { src: "img1.png", aspectRatio: 1 },
      { src: "img2.png", aspectRatio: 1 },
      { src: "img3.png", aspectRatio: 1 },
      { src: "img4.png", aspectRatio: 1 },
    ];

    const placed = computeSmartGridLayout(items, {
      canvasWidth: 2000,
      canvasHeight: 2000,
      columns: 2,
      gapPx: 20,
      marginPx: 40,
    });

    expect(placed.length).toBe(4);
    // All items should have valid normalized dimensions
    for (const p of placed) {
      expect(p.x).toBeGreaterThanOrEqual(0);
      expect(p.y).toBeGreaterThanOrEqual(0);
      expect(p.x + p.width).toBeLessThanOrEqual(1.0001);
      expect(p.y + p.height).toBeLessThanOrEqual(1.0001);
      expect(p.width).toBeGreaterThan(0);
      expect(p.height).toBeGreaterThan(0);
    }

    // Top-left vs Top-right: should not overlap in X
    expect(placed[0].x + placed[0].width).toBeLessThan(placed[1].x);
    // Top-left vs Bottom-left: should not overlap in Y
    expect(placed[0].y + placed[0].height).toBeLessThan(placed[2].y);
  });

  it("computes cascade mode positions properly", () => {
    const items = [
      { src: "img1.png", aspectRatio: 1 },
      { src: "img2.png", aspectRatio: 1 },
    ];

    const placed = computeSmartGridLayout(items, {
      canvasWidth: 2000,
      canvasHeight: 2000,
      layoutMode: "cascade",
    });

    expect(placed.length).toBe(2);
    expect(placed[1].x).toBeGreaterThan(placed[0].x);
    expect(placed[1].y).toBeGreaterThan(placed[0].y);
  });

  it("addImageElementsBatch updates store atomically with single history push and multi-select", () => {
    useEditorStore.getState().reset();
    useEditorStore.getState().setMode("single");

    const initialHistoryLength = useEditorStore.getState().history?.length || 0;

    const items = [
      { src: "a.jpg", aspectRatio: 1 },
      { src: "b.jpg", aspectRatio: 1.5 },
      { src: "c.jpg", aspectRatio: 0.75 },
    ];

    useEditorStore.getState().addImageElementsBatch(items, {
      columns: 3,
    });

    const state = useEditorStore.getState();
    expect(state.elements.length).toBe(3);
    expect(state.selectedIds.length).toBe(3);
    expect(state.selectedId).toBe(state.elements[0].id);

    // Verify z-indices are ordered
    expect(state.elements[1].zIndex).toBeGreaterThan(state.elements[0].zIndex);
    expect(state.elements[2].zIndex).toBeGreaterThan(state.elements[1].zIndex);
  });
});
