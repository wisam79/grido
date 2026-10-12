import type { SlotAlignment, DistributionAxis, AutoPackStrategy } from '../../types';

export type ResizeHandle = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw';

export { type SlotAlignment, type DistributionAxis, type AutoPackStrategy };

export const MIN_SIZE = 0.04; // 4% الحد الأدنى للخلية
export const SNAP_STEP = 0.025; // 2.5% المغناطيس
export const SNAP_TOLERANCE = SNAP_STEP / 2; // 1.25% — نصف الخطوة
export const CENTER_SNAP_TOLERANCE = 0.02; // منتصف الورقة
