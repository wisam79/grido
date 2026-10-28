export interface StudioView {
  width: number;
  height: number;
}

export function fitStudioView(
  width: number,
  height: number,
  minimum: StudioView,
) {
  const aspect = Math.max(width, 1) / Math.max(height, 1);
  const halfHeight = Math.max(minimum.height / 2, minimum.width / (2 * aspect));
  return {
    left: -halfHeight * aspect,
    right: halfHeight * aspect,
    top: halfHeight,
    bottom: -halfHeight,
  };
}

export function studioPixelRatio(
  width: number,
  height: number,
  deviceRatio: number,
) {
  const area = Math.max(1, width * height);
  const ratio = Number.isFinite(deviceRatio) ? Math.max(1, deviceRatio) : 1;
  return Math.min(ratio, 2, Math.sqrt(1_500_000 / area));
}

export function clampStudioPointer(value: number) {
  return Math.max(-1, Math.min(1, value));
}

export function rgbToCmyk(
  red: number,
  green: number,
  blue: number,
): [number, number, number, number] {
  const r = Math.max(0, Math.min(255, red)) / 255;
  const g = Math.max(0, Math.min(255, green)) / 255;
  const b = Math.max(0, Math.min(255, blue)) / 255;
  const maximum = Math.max(r, g, b);
  if (maximum === 0) return [0, 0, 0, 1];
  return [
    (maximum - r) / maximum,
    (maximum - g) / maximum,
    (maximum - b) / maximum,
    1 - maximum,
  ];
}
