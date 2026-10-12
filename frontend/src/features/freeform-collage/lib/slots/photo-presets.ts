import type { PhotoPresetType } from '../../types';
export { PHOTO_PRESET_LABELS } from '../mixed-presets';
import { PHOTO_PRESET_LABELS } from '../mixed-presets';

/**
 * خريطة أبعاد المقاسات القياسية بالمليمتر — المصدر الموحد: القياسات العراقية
 * الرسمية (جواز 35×45، هوية أحوال 32×40، شنغن 35×45) المطابقة لقوالب
 * `lib/templates/photo-templates.ts`. أي انحراف هنا يعني طباعة بمقاس خاطئ.
 */
export const PHOTO_PRESET_DIMENSIONS_MM: Record<PhotoPresetType, { w: number; h: number }> = {
  passport: { w: 35, h: 45 },
  id: { w: 35, h: 45 },
  visa: { w: 35, h: 45 },
  'iq-national-id': { w: 35, h: 45 },
  'iq-civil-id': { w: 32, h: 40 },
  'iq-general-id': { w: 40, h: 60 },
  'iq-transactions': { w: 30, h: 40 },
  'portrait-4x6': { w: 40, h: 60 },
  'photo-10x15': { w: 100, h: 150 },
  wallet: { w: 54, h: 86 },
  photobooth: { w: 45, h: 35 },
  custom: { w: 35, h: 45 },
};

void PHOTO_PRESET_LABELS;
