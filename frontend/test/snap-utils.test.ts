import { describe, it, expect } from "vitest";
import { getSnapPositions, getSnapPositionsWithTargets } from "../src/lib/snap-utils";
import { CanvasElement } from "../src/lib/editor-store";

describe("snap-utils - Magnetic Alignment (Snap to Grid/Guides) Tests", () => {
  const vTargets = [
    { value: 0.5, origin: "canvas" }, // Canvas center
    { value: 0.2, origin: "element" }, // Left edge of another element
  ];

  const hTargets = [
    { value: 0.5, origin: "canvas" }, // Canvas center
    { value: 0.3, origin: "element" }, // Top edge of another element
  ];

  it("should snap when close to a target coordinate within thresholds", () => {
    // When moving: input x = 0.199, threshold = 0.01. Target = 0.2
    const result = getSnapPositionsWithTargets(0.199, 0.1, 0.1, 0.1, vTargets, hTargets, 0.01, 0.01);
    expect(result.x).toBe(0.2); // Snapped to 0.2
    expect(result.guides).toContainEqual({ type: "v", coord: 0.2 });
  });

  it("should not snap when difference exceeds threshold", () => {
    // When moving: input x = 0.18, threshold = 0.01. Target = 0.2
    const result = getSnapPositionsWithTargets(0.18, 0.1, 0.1, 0.1, vTargets, hTargets, 0.01, 0.01);
    expect(result.x).toBe(0.18); // Unchanged
    expect(result.guides.length).toBe(0);
  });

  it("should support snapping center of the dragged element to vertical targets", () => {
    // Dragged center is at x + w/2 = 0.45 + 0.1/2 = 0.5. Target = 0.5
    const result = getSnapPositionsWithTargets(0.451, 0.1, 0.1, 0.1, vTargets, hTargets, 0.01, 0.01);
    expect(result.x).toBe(0.45); // Snapped so center is exactly 0.5
    expect(result.guides).toContainEqual({ type: "v", coord: 0.5 });
  });

  it("should snap right edge when resizing east (e)", () => {
    // Resize handle = "e". Initial x = 0.1, w = 0.099. Right edge x+w = 0.199. Target = 0.2
    const result = getSnapPositionsWithTargets(0.1, 0.1, 0.099, 0.1, vTargets, hTargets, 0.01, 0.01, "e");
    expect(result.w).toBe(0.1); // Snapped width (target 0.2 - x 0.1)
    expect(result.guides).toContainEqual({ type: "v", coord: 0.2 });
  });

  it("should collect targets from all other elements when using getSnapPositions", () => {
    const mockElements = [
      { id: "el1", type: "shape", shape: "rect", x: 0.1, y: 0.2, width: 0.3, height: 0.4, rotation: 0, opacity: 1, zIndex: 1 },
      { id: "el2", type: "text", text: "Drag me", x: 0.7, y: 0.7, width: 0.1, height: 0.1, rotation: 0, opacity: 1, zIndex: 2 },
    ] as any[] as CanvasElement[];

    const result = getSnapPositions("el2", 0.099, 0.5, 0.1, 0.1, mockElements, 0.01, 0.01);
    // Should snap to el1.x (0.1)
    expect(result.x).toBe(0.1);
    expect(result.guides).toContainEqual({ type: "v", coord: 0.1 });
  });
});
