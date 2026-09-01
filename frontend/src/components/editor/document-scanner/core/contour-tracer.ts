import { Point } from "./types";

/**
 * حساب المساحة المحددة لأي مضلع (Shoelace Formula)
 */
export function computePolygonArea(poly: Point[]): number {
  const n = poly.length;
  if (n < 3) return 0;
  let area = 0;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    area += poly[i].x * poly[j].y - poly[j].x * poly[i].y;
  }
  return Math.abs(area) * 0.5;
}

/**
 * حساب الغلاف المحدب لنقاط الكنتور (Monotone Chain Convex Hull Algorithm - O(N log N))
 */
export function convexHull(pts: Point[]): Point[] {
  if (pts.length <= 3) return pts.slice();

  const sorted = pts
    .slice()
    .sort((a, b) => (a.x === b.x ? a.y - b.y : a.x - b.x))
    .filter((p, i, arr) => i === 0 || p.x !== arr[i - 1].x || p.y !== arr[i - 1].y);

  if (sorted.length <= 3) return sorted;

  const cross = (o: Point, a: Point, b: Point) =>
    (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);

  const lower: Point[] = [];
  for (const p of sorted) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) {
      lower.pop();
    }
    lower.push(p);
  }

  const upper: Point[] = [];
  for (let i = sorted.length - 1; i >= 0; i--) {
    const p = sorted[i];
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) {
      upper.pop();
    }
    upper.push(p);
  }

  if (lower.length > 0) lower.pop();
  if (upper.length > 0) upper.pop();

  return lower.concat(upper);
}

/**
 * استخراج الكتل والحدود الخارجية المتصلة من القناع الثنائي (8-Connected Components)
 */
export function findConnectedContours(
  binImg: Uint8Array,
  w: number,
  h: number,
  minArea: number = 100
): Point[][] {
  const total = w * h;
  if (total <= 0 || w <= 0 || h <= 0) return [];

  const visited = new Uint8Array(total);
  const contours: Point[][] = [];

  const qX = new Int32Array(total);
  const qY = new Int32Array(total);

  const neighbors = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
    [1, 1],
    [-1, -1],
    [1, -1],
    [-1, 1],
  ];

  for (let y = 0; y < h; y++) {
    const rowOffset = y * w;
    for (let x = 0; x < w; x++) {
      const idx = rowOffset + x;
      if (binImg[idx] === 255 && visited[idx] === 0) {
        let head = 0;
        let tail = 0;
        let pixelCount = 0;

        qX[tail] = x;
        qY[tail] = y;
        tail++;
        visited[idx] = 1;

        const borderPts: Point[] = [];

        while (head < tail) {
          const cx = qX[head];
          const cy = qY[head];
          head++;
          pixelCount++;

          let isBorder = false;
          const cardinal = [
            [cx + 1, cy],
            [cx - 1, cy],
            [cx, cy + 1],
            [cx, cy - 1],
          ];

          for (let i = 0; i < 4; i++) {
            const [nx, ny] = cardinal[i];
            if (nx >= 0 && nx < w && ny >= 0 && ny < h) {
              const nidx = ny * w + nx;
              if (binImg[nidx] === 0) {
                isBorder = true;
              } else if (visited[nidx] === 0) {
                visited[nidx] = 1;
                qX[tail] = nx;
                qY[tail] = ny;
                tail++;
              }
            } else {
              isBorder = true;
            }
          }

          if (isBorder) {
            borderPts.push({ x: cx, y: cy });
          }
        }

        if (pixelCount >= minArea && borderPts.length >= 8) {
          contours.push(borderPts);
        }
      }
    }
  }

  return contours;
}
