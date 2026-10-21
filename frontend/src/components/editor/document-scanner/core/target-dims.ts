import { MAX_EXPORT_PIXELS } from '@/lib/export/export-limits';

import type { DocumentAspectType } from './types';

export interface TargetDims {
  targetW: number;
  targetH: number;
}

/**
 * تنازل تدريجي متساوٍ للبعدين عند تجاوز سقف البكسل الموحّد (50MP):
 * نسبة تصغير √(السقف/المساحة) تحافظ على النسبة البصرية وتمنع تخصيص
 * Canvas بحجم يستهلك مئات الميجابايت (كان maxEdgeW غير مسقوف إطلاقاً،
 * فصورة 48MP قد تطلب كانفاس استعدال ~69MP).
 */
export function clampToPixelBudget(
  width: number,
  height: number,
  maxPixels: number = MAX_EXPORT_PIXELS,
): TargetDims {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    return { targetW: width, targetH: height };
  }
  if (width * height <= maxPixels) {
    return { targetW: width, targetH: height };
  }
  const scale = Math.sqrt(maxPixels / (width * height));
  return {
    targetW: Math.max(1, Math.floor(width * scale)),
    targetH: Math.max(1, Math.floor(height * scale)),
  };
}

/**
 * جدول الأبعاد الحقيقية لكل نوع مستند (معاينة/تصدير) — مصدر واحد بدل
 * سلسلة if/else المبعثرة، مع سقف البكسل الموحّد قبل أي تخصيص Canvas.
 */
export function resolveTargetDims(
  docAspect: DocumentAspectType,
  isPreview: boolean,
  maxEdgeW: number,
  maxEdgeH: number,
): TargetDims {
  if (docAspect === 'a4_p') {
    if (isPreview) return { targetW: 620, targetH: 877 };
    const baseW = Math.max(1400, maxEdgeW);
    return clampToPixelBudget(baseW, Math.round(baseW * Math.SQRT2));
  }
  if (docAspect === 'a4_l') {
    if (isPreview) return { targetW: 877, targetH: 620 };
    const baseW = Math.max(1980, maxEdgeW);
    return clampToPixelBudget(baseW, Math.round(baseW / Math.SQRT2));
  }
  if (docAspect === 'id_card') {
    if (isPreview) return { targetW: 500, targetH: 315 };
    const baseW = Math.max(1200, maxEdgeW);
    return clampToPixelBudget(baseW, Math.round(baseW / (85.6 / 53.98)));
  }
  if (docAspect === 'square') {
    const avg = isPreview ? 600 : Math.max(1200, Math.round((maxEdgeW + maxEdgeH) / 2));
    return clampToPixelBudget(avg, avg);
  }
  if (isPreview) {
    const s = Math.min(1, 800 / Math.max(maxEdgeW, maxEdgeH, 1));
    return { targetW: Math.round(maxEdgeW * s), targetH: Math.round(maxEdgeH * s) };
  }
  return clampToPixelBudget(maxEdgeW, maxEdgeH);
}
