export interface GridLayoutItem {
  id?: string;
  src: string;
  aspectRatio: number;
  // Optional custom copies count for batch passport/transaction mode
  copies?: number;
}

export interface GridLayoutOptions {
  canvasWidth: number;
  canvasHeight: number;
  columns?: number;
  gapPx?: number;
  marginPx?: number;
  centerLastRow?: boolean;
  layoutMode?: "grid" | "cascade" | "stack";
}

export interface PlacedGridElement {
  src: string;
  aspectRatio: number;
  x: number; // normalized [0, 1]
  y: number; // normalized [0, 1]
  width: number; // normalized [0, 1]
  height: number; // normalized [0, 1]
}

/**
 * Calculates optimal columns count based on item count and canvas aspect ratio
 */
export function calculateOptimalColumns(
  count: number,
  canvasWidth: number,
  canvasHeight: number
): number {
  if (count <= 1) return 1;
  if (count === 2) return canvasWidth >= canvasHeight ? 2 : 1;
  if (count === 3) return canvasWidth >= canvasHeight ? 3 : 2;
  if (count === 4) return 2;

  const canvasAspect = canvasWidth / Math.max(canvasHeight, 1);
  const rawCols = Math.round(Math.sqrt(count * canvasAspect));
  return Math.max(1, Math.min(count, rawCols));
}

/**
 * Computes placement for multiple images on canvas
 */
export function computeSmartGridLayout(
  items: Array<{ src: string; aspectRatio?: number }>,
  options: GridLayoutOptions
): PlacedGridElement[] {
  const {
    canvasWidth,
    canvasHeight,
    columns,
    gapPx = 20,
    marginPx = 40,
    centerLastRow = true,
    layoutMode = "grid",
  } = options;

  const N = items.length;
  if (N === 0) return [];

  const normMarginX = Math.min(0.2, marginPx / Math.max(canvasWidth, 1));
  const normMarginY = Math.min(0.2, marginPx / Math.max(canvasHeight, 1));
  const normGapX = gapPx / Math.max(canvasWidth, 1);
  const normGapY = gapPx / Math.max(canvasHeight, 1);

  // 1. Stack mode: Center all items (legacy)
  if (layoutMode === "stack") {
    return items.map((item) => {
      const aspect = item.aspectRatio || 1;
      let hPercent = 0.5;
      let wPercent = hPercent * (canvasHeight / canvasWidth) * aspect;
      if (wPercent > 0.8) {
        wPercent = 0.8;
        hPercent = (wPercent * (canvasWidth / canvasHeight)) / aspect;
      }
      return {
        src: item.src,
        aspectRatio: aspect,
        x: 0.5 - wPercent / 2,
        y: 0.5 - hPercent / 2,
        width: wPercent,
        height: hPercent,
      };
    });
  }

  // 2. Cascade mode: Staircase staggered layout
  if (layoutMode === "cascade") {
    const baseW = 0.4;
    return items.map((item, idx) => {
      const aspect = item.aspectRatio || 1;
      const baseH = (baseW * (canvasWidth / canvasHeight)) / aspect;
      const stepX = 0.04;
      const stepY = 0.04;
      const startX = normMarginX + (idx % 10) * stepX;
      const startY = normMarginY + (idx % 10) * stepY;
      return {
        src: item.src,
        aspectRatio: aspect,
        x: Math.min(1 - baseW - normMarginX, startX),
        y: Math.min(1 - baseH - normMarginY, startY),
        width: baseW,
        height: baseH,
      };
    });
  }

  // 3. Grid mode
  const cols = columns && columns > 0
    ? Math.min(N, columns)
    : calculateOptimalColumns(N, canvasWidth, canvasHeight);

  const rows = Math.ceil(N / cols);

  const availW = Math.max(0.1, 1 - 2 * normMarginX);
  const availH = Math.max(0.1, 1 - 2 * normMarginY);

  const cellW = (availW - (cols - 1) * normGapX) / cols;
  const cellH = (availH - (rows - 1) * normGapY) / rows;

  const results: PlacedGridElement[] = [];

  for (let i = 0; i < N; i++) {
    const item = items[i];
    const aspect = item.aspectRatio && item.aspectRatio > 0 ? item.aspectRatio : 1;

    const row = Math.floor(i / cols);
    const col = i % cols;

    // Number of items in current row
    const itemsInThisRow = Math.min(cols, N - row * cols);
    let rowOffsetX = 0;
    if (centerLastRow && itemsInThisRow < cols) {
      rowOffsetX = ((cols - itemsInThisRow) * (cellW + normGapX)) / 2;
    }

    const cellX = normMarginX + rowOffsetX + col * (cellW + normGapX);
    const cellY = normMarginY + row * (cellH + normGapY);

    const cellPxW = cellW * canvasWidth;
    const cellPxH = cellH * canvasHeight;
    const cellAspect = cellPxW / Math.max(cellPxH, 1);

    let imgPxW = cellPxW;
    let imgPxH = cellPxH;

    if (aspect > cellAspect) {
      // Image is wider than cell -> fit width, scale height
      imgPxW = cellPxW;
      imgPxH = cellPxW / aspect;
    } else {
      // Image is taller than cell -> fit height, scale width
      imgPxH = cellPxH;
      imgPxW = cellPxH * aspect;
    }

    const normW = imgPxW / canvasWidth;
    const normH = imgPxH / canvasHeight;

    // Center image inside its cell
    const x = cellX + (cellW - normW) / 2;
    const y = cellY + (cellH - normH) / 2;

    results.push({
      src: item.src,
      aspectRatio: aspect,
      x: Math.max(0, Math.min(1 - normW, x)),
      y: Math.max(0, Math.min(1 - normH, y)),
      width: normW,
      height: normH,
    });
  }

  return results;
}
