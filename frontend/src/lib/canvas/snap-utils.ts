import { CanvasElement } from "@/lib/store/types";

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
export interface SnapTarget {
  value: number;
  origin: string;
}

/** نتيجة محاذاة محور واحد إلى أقرب خط شبكي — O(1) بلا مسح خطي */
export interface GridSnapAxis {
  /** قيمة المحاذاة (خط الشبكة المطلق في فضاء 0-1) أو null إذا لم تكن ضمن العتبة */
  snappedTo: number | null;
}

/**
 * 🧲 محاذاة قيمة إلى أقرب خط شبكي — O(1) رياضية مباشرة بدل حشر مئات الخطوط
 * في مصفوفات البحث الخطي (كان يفحص 600 هدف × 60 مرة/ثانية أثناء السحب).
 * القيم كلها نسبية (0-1) كسائر أهداف المحاذاة في هذا الملف.
 */
export function snapToGridAxis(value: number, gridStep: number, threshold: number): GridSnapAxis {
  if (gridStep <= 0) return { snappedTo: null };
  const k = Math.round(value / gridStep);
  const snapped = k * gridStep;
  return Math.abs(snapped - value) <= threshold ? { snappedTo: snapped } : { snappedTo: null };
}

/** خيارات محاذاة الشبكة الرياضية O(1) — تُحسب لكل حافة بدل حقن الخطوط في المصفوفات */
export interface GridSnapOptions {
  /** خطوة الشبكة النسبية على المحور X (gridSize/canvasWidth) — 0 يعني معطلة */
  stepX: number;
  /** خطوة الشبكة النسبية على المحور Y (gridSize/canvasHeight) */
  stepY: number;
}

export function getSnapPositionsWithTargets(
  x: number,
  y: number,
  w: number,
  h: number,
  vTargets: SnapTarget[],
  hTargets: SnapTarget[],
  thresholdX: number,
  thresholdY: number,
  resizeHandle: string | null = null,
  grid?: GridSnapOptions
): SnapResult {
  const guides: SnapGuide[] = [];
  let snappedX = x;
  let snappedY = y;
  let snappedW = w;
  let snappedH = h;

  // Snapping logic when MOVING
  if (!resizeHandle) {
    // 1. Move Snap X — الشبكة تُنافس رياضياً O(1) مع الأهداف الخطية
    let minDiffX = thresholdX;
    let bestVTarget = -1;

    if (grid && grid.stepX > 0) {
      for (const edge of [x, x + w / 2, x + w]) {
        const k = Math.round(edge / grid.stepX);
        const line = k * grid.stepX;
        const diff = Math.abs(edge - line);
        if (diff < minDiffX) {
          minDiffX = diff;
          snappedX = line - (edge === x ? 0 : edge === x + w / 2 ? w / 2 : w);
          bestVTarget = line;
        }
      }
    }

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

    // 2. Move Snap Y — الشبكة تُنافس رياضياً O(1) مع الأهداف الخطية
    let minDiffY = thresholdY;
    let bestHTarget = -1;

    if (grid && grid.stepY > 0) {
      for (const edge of [y, y + h / 2, y + h]) {
        const k = Math.round(edge / grid.stepY);
        const line = k * grid.stepY;
        const diff = Math.abs(edge - line);
        if (diff < minDiffY) {
          minDiffY = diff;
          snappedY = line - (edge === y ? 0 : edge === y + h / 2 ? h / 2 : h);
          bestHTarget = line;
        }
      }
    }

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

      if (grid && grid.stepX > 0) {
        const k = Math.round(rightX / grid.stepX);
        const line = k * grid.stepX;
        const diff = Math.abs(rightX - line);
        if (diff < minDiffX) {
          minDiffX = diff;
          snappedW = Math.max(0.05, line - x);
          bestVTarget = line;
        }
      }
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

      if (grid && grid.stepX > 0) {
        const k = Math.round(x / grid.stepX);
        const line = k * grid.stepX;
        const diff = Math.abs(x - line);
        if (diff < minDiffX) {
          minDiffX = diff;
          snappedX = line;
          snappedW = Math.max(0.05, rightX - line);
          bestVTarget = line;
        }
      }
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

      if (grid && grid.stepY > 0) {
        const k = Math.round(bottomY / grid.stepY);
        const line = k * grid.stepY;
        const diff = Math.abs(bottomY - line);
        if (diff < minDiffY) {
          minDiffY = diff;
          snappedH = Math.max(0.05, line - y);
          bestHTarget = line;
        }
      }
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

      if (grid && grid.stepY > 0) {
        const k = Math.round(y / grid.stepY);
        const line = k * grid.stepY;
        const diff = Math.abs(y - line);
        if (diff < minDiffY) {
          minDiffY = diff;
          snappedY = line;
          snappedH = Math.max(0.05, bottomY - line);
          bestHTarget = line;
        }
      }
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
  const vTargets: SnapTarget[] = [
    { value: 0, origin: "canvas" },
    { value: 0.5, origin: "canvas" },
    { value: 1, origin: "canvas" },
  ];
  const hTargets: SnapTarget[] = [
    { value: 0, origin: "canvas" },
    { value: 0.5, origin: "canvas" },
    { value: 1, origin: "canvas" },
  ];

  for (const el of elements) {
    if (el.id === dragId) continue;
    vTargets.push({ value: el.x, origin: "element" });
    vTargets.push({ value: el.x + el.width / 2, origin: "element" });
    vTargets.push({ value: el.x + el.width, origin: "element" });
    hTargets.push({ value: el.y, origin: "element" });
    hTargets.push({ value: el.y + el.height / 2, origin: "element" });
    hTargets.push({ value: el.y + el.height, origin: "element" });
  }

  return getSnapPositionsWithTargets(x, y, w, h, vTargets, hTargets, thresholdX, thresholdY, resizeHandle);
}
