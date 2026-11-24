import { renderSvgToPngBlob } from '@/features/stickers/lib/svg-rasterizer';
import { blobToDataUrl } from '@/lib/canvas/canvas-blob';
import {
  isSvgImageSource,
  loadSanitizedSvgMarkup,
  parseSvgDimensions,
} from '@/lib/canvas/svg-logo';
import { uploadMediaBlob } from '@/lib/io/media-upload';
import { createLogger } from '@/lib/logger';

const logger = createLogger('svg-slot-compat');
const DEFAULT_SLOT_SVG_DIM = 1200;
const MAX_SLOT_SVG_DIM = 2048;

/**
 * يحول مصادر SVG إلى PNG عالي الدقة عند إدراجها داخل خانات الكولاج فقط
 * (الكولاج يعتمد على مسارات التركيب النقطية في Go)، مع الإبقاء على المصادر
 * غير المتجهة كما هي دون أي تعديل.
 */
export async function ensureSlotCompatibleSource(src: string): Promise<string> {
  if (!src || !isSvgImageSource(src)) return src;

  try {
    const markup = await loadSanitizedSvgMarkup(src);
    if (!markup) return src;

    const dims = parseSvgDimensions(markup);
    let width = dims?.width ?? DEFAULT_SLOT_SVG_DIM;
    let height = dims?.height ?? DEFAULT_SLOT_SVG_DIM;
    const maxSide = Math.max(width, height);
    if (maxSide < DEFAULT_SLOT_SVG_DIM || maxSide > MAX_SLOT_SVG_DIM) {
      const targetMax = maxSide < DEFAULT_SLOT_SVG_DIM ? DEFAULT_SLOT_SVG_DIM : MAX_SLOT_SVG_DIM;
      const scale = targetMax / maxSide;
      width = Math.max(1, Math.round(width * scale));
      height = Math.max(1, Math.round(height * scale));
    }

    const blob = await renderSvgToPngBlob(markup, width, height);
    if (blob.type === 'image/svg+xml') {
      return src;
    }
    try {
      const uploaded = await uploadMediaBlob(blob, 'svg-slot.png');
      if (uploaded.imageSrc) return uploaded.imageSrc;
    } catch (uploadErr) {
      logger.debug('Upload fallback to dataUrl for slot SVG conversion:', uploadErr);
    }
    return await blobToDataUrl(blob);
  } catch (err) {
    logger.warn('Failed to rasterize SVG for collage slot, keeping original source:', err);
    return src;
  }
}

export async function ensureSlotCompatibleSources(srcs: readonly string[]): Promise<string[]> {
  if (!srcs.length) return [];
  if (!srcs.some((src) => isSvgImageSource(src))) {
    return [...srcs];
  }
  return Promise.all(srcs.map((src) => ensureSlotCompatibleSource(src)));
}
