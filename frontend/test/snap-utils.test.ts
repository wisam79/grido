import { describe, it, expect } from "vitest";
import { getSnapPositions, getSnapPositionsWithTargets } from "../src/lib/canvas/snap-utils";
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

  it("should snap to canvas boundary edges (0, 1) and center (0.5)", () => {
    // Near left edge (0)
    const leftRes = getSnapPositions("el1", 0.003, 0.1, 0.1, 0.1, [], 0.01, 0.01);
    expect(leftRes.x).toBe(0);
    expect(leftRes.guides).toContainEqual({ type: "v", coord: 0 });

    // Near right edge (1) with width 0.2: x should snap to 0.8
    const rightRes = getSnapPositions("el1", 0.798, 0.1, 0.2, 0.1, [], 0.01, 0.01);
    expect(rightRes.x).toBe(0.8);
    expect(rightRes.guides).toContainEqual({ type: "v", coord: 1 });

    // Near top edge (0)
    const topRes = getSnapPositions("el1", 0.1, 0.004, 0.1, 0.1, [], 0.01, 0.01);
    expect(topRes.y).toBe(0);
    expect(topRes.guides).toContainEqual({ type: "h", coord: 0 });

    // Near bottom edge (1) with height 0.15: y should snap to 0.85
    const bottomRes = getSnapPositions("el1", 0.1, 0.848, 0.1, 0.15, [], 0.01, 0.01);
    expect(bottomRes.y).toBe(0.85);
    expect(bottomRes.guides).toContainEqual({ type: "h", coord: 1 });
  });

  it("should snap when resizing west (w), north (n), and south (s)", () => {
    // Resize west: handle = "w". Left edge should snap to 0.2
    const westRes = getSnapPositionsWithTargets(0.198, 0.1, 0.3, 0.3, vTargets, hTargets, 0.01, 0.01, "w");
    expect(westRes.x).toBe(0.2);
    expect(westRes.guides).toContainEqual({ type: "v", coord: 0.2 });

    // Resize south: handle = "s". Bottom edge (y + h = 0.1 + 0.198 = 0.298) should snap to 0.3
    const southRes = getSnapPositionsWithTargets(0.1, 0.1, 0.3, 0.198, vTargets, hTargets, 0.01, 0.01, "s");
    expect(southRes.h).toBe(0.2);
    expect(southRes.guides).toContainEqual({ type: "h", coord: 0.3 });

    // Resize north: handle = "n". Top edge should snap to 0.3
    const northRes = getSnapPositionsWithTargets(0.1, 0.298, 0.3, 0.3, vTargets, hTargets, 0.01, 0.01, "n");
    expect(northRes.y).toBe(0.3);
    expect(northRes.guides).toContainEqual({ type: "h", coord: 0.3 });
  });
});
