import { CanvasElement } from "./editor-store";

export interface SnapGuide {
  type: "v" | "h";
  coord: number; // 0 to 1 relative coordinate
}

export interface SnapResult {
  x: number;
  y: number;
  w: number;
  h: number;
  guides: SnapGuide[];
}

/**
 * Computes snapped coordinates (and active guides) for an element being dragged or resized.
 */
export function getSnapPositions(
  dragId: string,
  x: number,
  y: number,
  w: number,
  h: number,
  elements: CanvasElement[],
  thresholdX: number,
  thresholdY: number,
  resizeHandle: string | null = null
): SnapResult {
  // Collect vertical targets (X-axis lines to snap to)
  const vTargets = [
    { value: 0.5, origin: "canvas" }
  ];
  // Collect horizontal targets (Y-axis lines to snap to)
  const hTargets = [
    { value: 0.5, origin: "canvas" }
  ];

  for (const el of elements) {
    if (el.id === dragId) continue;
    
    // X targets from other elements (left, center, right)
    vTargets.push({ value: el.x, origin: "element" });
    vTargets.push({ value: el.x + el.width / 2, origin: "element" });
    vTargets.push({ value: el.x + el.width, origin: "element" });

    // Y targets from other elements (top, center, bottom)
    hTargets.push({ value: el.y, origin: "element" });
    hTargets.push({ value: el.y + el.height / 2, origin: "element" });
    hTargets.push({ value: el.y + el.height, origin: "element" });
  }

  const guides: SnapGuide[] = [];
  let snappedX = x;
  let snappedY = y;
  let snappedW = w;
  let snappedH = h;

  // Snapping logic when MOVING
  if (!resizeHandle) {
    // 1. Move Snap X
    let minDiffX = thresholdX;
    let bestVTarget = -1;

    for (const target of vTargets) {
      // Check left edge
      const diffLeft = Math.abs(x - target.value);
      if (diffLeft < minDiffX) {
        minDiffX = diffLeft;
        snappedX = target.value;
        bestVTarget = target.value;
      }
      // Check center
      const diffCenter = Math.abs((x + w / 2) - target.value);
      if (diffCenter < minDiffX) {
        minDiffX = diffCenter;
        snappedX = target.value - w / 2;
        bestVTarget = target.value;
      }
      // Check right edge
      const diffRight = Math.abs((x + w) - target.value);
      if (diffRight < minDiffX) {
        minDiffX = diffRight;
        snappedX = target.value - w;
        bestVTarget = target.value;
      }
    }
    if (bestVTarget !== -1) {
      guides.push({ type: "v", coord: bestVTarget });
    }

    // 2. Move Snap Y
    let minDiffY = thresholdY;
    let bestHTarget = -1;

    for (const target of hTargets) {
      // Check top edge
      const diffTop = Math.abs(y - target.value);
      if (diffTop < minDiffY) {
        minDiffY = diffTop;
        snappedY = target.value;
        bestHTarget = target.value;
      }
      // Check center
      const diffCenter = Math.abs((y + h / 2) - target.value);
      if (diffCenter < minDiffY) {
        minDiffY = diffCenter;
        snappedY = target.value - h / 2;
        bestHTarget = target.value;
      }
      // Check bottom edge
      const diffBottom = Math.abs((y + h) - target.value);
      if (diffBottom < minDiffY) {
        minDiffY = diffBottom;
        snappedY = target.value - h;
        bestHTarget = target.value;
      }
    }
    if (bestHTarget !== -1) {
      guides.push({ type: "h", coord: bestHTarget });
    }
  } 
  // Snapping logic when RESIZING
  else {
    const handle = resizeHandle.toLowerCase();
    
    // East side handles (e, ne, se) change width
    if (handle.includes("e")) {
      let minDiffX = thresholdX;
      let bestVTarget = -1;
      const rightX = x + w;

      for (const target of vTargets) {
        const diff = Math.abs(rightX - target.value);
        if (diff < minDiffX) {
          minDiffX = diff;
          snappedW = Math.max(0.05, target.value - x);
          bestVTarget = target.value;
        }
      }
      if (bestVTarget !== -1) guides.push({ type: "v", coord: bestVTarget });
    } 
    // West side handles (w, nw, sw) change x and width
    else if (handle.includes("w")) {
      let minDiffX = thresholdX;
      let bestVTarget = -1;
      const rightX = x + w;

      for (const target of vTargets) {
        const diff = Math.abs(x - target.value);
        if (diff < minDiffX) {
          minDiffX = diff;
          snappedX = target.value;
          snappedW = Math.max(0.05, rightX - target.value);
          bestVTarget = target.value;
        }
      }
      if (bestVTarget !== -1) guides.push({ type: "v", coord: bestVTarget });
    }

    // South side handles (s, se, sw) change height
    if (handle.includes("s")) {
      let minDiffY = thresholdY;
      let bestHTarget = -1;
      const bottomY = y + h;

      for (const target of hTargets) {
        const diff = Math.abs(bottomY - target.value);
        if (diff < minDiffY) {
          minDiffY = diff;
          snappedH = Math.max(0.05, target.value - y);
          bestHTarget = target.value;
        }
      }
      if (bestHTarget !== -1) guides.push({ type: "h", coord: bestHTarget });
    } 
    // North side handles (n, nw, ne) change y and height
    else if (handle.includes("n")) {
      let minDiffY = thresholdY;
      let bestHTarget = -1;
      const bottomY = y + h;

      for (const target of hTargets) {
        const diff = Math.abs(y - target.value);
        if (diff < minDiffY) {
          minDiffY = diff;
          snappedY = target.value;
          snappedH = Math.max(0.05, bottomY - target.value);
          bestHTarget = target.value;
        }
      }
      if (bestHTarget !== -1) guides.push({ type: "h", coord: bestHTarget });
    }
  }

  return {
    x: snappedX,
    y: snappedY,
    w: snappedW,
    h: snappedH,
    guides
  };
}
