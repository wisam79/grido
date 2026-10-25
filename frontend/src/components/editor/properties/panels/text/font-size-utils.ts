/** سلم أحجام الطباعة: أزرار −/+ تقفز للدرجة التالية كما في محررات التصميم. */
export const FONT_SIZE_STEPS = [
  8, 10, 12, 14, 16, 18, 20, 24, 28, 32, 36, 40, 48, 56, 64, 72, 96, 120, 144, 180, 200, 240, 300,
];
export const FONT_SIZE_MIN = 6;
export const FONT_SIZE_MAX = 500;

export function clampFontSize(value: number): number {
  return Math.min(FONT_SIZE_MAX, Math.max(FONT_SIZE_MIN, Math.round(value)));
}

export function nextFontSizeStep(current: number, direction: 1 | -1): number {
  if (direction > 0) {
    return FONT_SIZE_STEPS.find((step) => step > current) ?? clampFontSize(current + 10);
  }
  for (let i = FONT_SIZE_STEPS.length - 1; i >= 0; i -= 1) {
    if (FONT_SIZE_STEPS[i] < current) return FONT_SIZE_STEPS[i];
  }
  return clampFontSize(current - 1);
}
