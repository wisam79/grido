/**
 * Re-export consolidated clipboard utilities from canonical lib/io/clipboard-utils
 * plus shared sticker SVG copy/eligibility helpers.
 */
import { toast } from 'sonner';

import { copyPngDataUrlToClipboard, copySvgCodeToClipboard } from '@/lib/io/clipboard-utils';

import { getStickerTemplateById } from '../templates';

import { resolveStickerSvgSync } from './print-rerasterize';

import type { StickerElementSource } from '@/lib/store/types';

export { copyPngDataUrlToClipboard, copySvgCodeToClipboard };

export function canCopyStickerSvg(source: StickerElementSource | undefined): boolean {
  return Boolean(source && (source.svg?.trim() || getStickerTemplateById(source.templateId)));
}

export async function copyStickerSvgWithFeedback(
  source: StickerElementSource | undefined,
): Promise<boolean> {
  if (!source) {
    toast.error('تعذر نسخ SVG');
    return false;
  }
  const svg = resolveStickerSvgSync(source);
  if (!svg?.trim()) {
    toast.error('تعذر نسخ SVG');
    return false;
  }
  const ok = await copySvgCodeToClipboard(svg);
  if (ok) {
    toast.success('نُسخ SVG المتجه');
  } else {
    toast.error('تعذر نسخ SVG');
  }
  return ok;
}
