import { blobToDataUrl } from '@/lib/canvas/canvas-blob';
import { uploadMediaBlob } from '@/lib/io/media-upload';
import { createLogger } from '@/lib/logger';
import { wailsIsDesktop } from '@/lib/wails-env';

import { buildStickerSvg } from './sticker-design/build-svg';
import { stickerRasterSize } from './sticker-text';
import { renderSvgToPngBlob } from './svg-rasterizer';
import { applyRowToParams } from './vdp-parser';

import type { StickerTemplate, StickerParams } from '@/features/stickers';

const logger = createLogger('vdp-batch');

/**
 * مولّد البطاقات الدفعية (VDP) — يُصيّر صفوف البيانات على قالب واحد
 * ويُسلّم كل صورة جاهزة فوراً عبر `onRendered`، بدل احتجاز مصفوفة صور
 * ضخمة. التصيير تسلسلي مع تقدّم وإلغاء حقيقيين.
 */

export interface VdpRenderProgress {
  done: number;
  total: number;
}

export interface VdpRenderOptions {
  /** إلغاء تعاوني بين الصفوف — لا يقطع التصيير الجاري قسراً. */
  signal?: AbortSignal;
  /**
   * مستقبل كل صورة ناجحة فور جاهزيتها. عند توفيره لا تُجمع الصور في
   * `pngUrls` إطلاقاً، وهو المسار الموصى به للدفعات الكبيرة.
   */
  onRendered?: (src: string, index: number) => void | Promise<void>;
}

export interface VdpRenderResult {
  pngUrls: string[];
  failedRows: number;
  aborted: boolean;
}

export async function renderVdpBatch(
  template: StickerTemplate,
  baseParams: StickerParams,
  rows: Record<string, string>[],
  mapping: Record<string, string>,
  onProgress?: (p: VdpRenderProgress) => void,
  options: VdpRenderOptions = {},
): Promise<VdpRenderResult> {
  const pngUrls: string[] = [];
  let failedRows = 0;
  let aborted = false;
  let done = 0;

  for (let i = 0; i < rows.length; i++) {
    if (options.signal?.aborted) {
      aborted = true;
      break;
    }

    onProgress?.({ done: i, total: rows.length });

    const rowParams = applyRowToParams(baseParams, mapping, rows[i]);

    let deliveredSrc: string | null = null;
    try {
      const svg = buildStickerSvg(template, rowParams);
      const { width, height } = stickerRasterSize(template.aspectRatio, template.defaultMm, 300);
      const pngBlob = await renderSvgToPngBlob(svg, width, height, [
        rowParams.fontFamily || 'Cairo',
      ]);
      if (options.signal?.aborted) {
        aborted = true;
        break;
      }

      deliveredSrc = await persistPng(pngBlob, template.id, i);
    } catch (err) {
      // صف تالف (بيانات ناقصة مثلاً) لا يُسقط الدفعة كاملة — نُكمل ونُبلغ
      logger.error(`VDP: فشل تصيير الصف ${i + 1}:`, err);
      failedRows++;
    }

    if (deliveredSrc === null) continue;

    // خطأ المستهلك ليس فشل صف بيانات — ينتشر ويُسقط الدفعة صريحاً بدل
    // احتسابه ضمن الصفوف التالفة ومواصلة المحاولة ونحن في الحالة نفسها.
    if (options.onRendered) {
      await options.onRendered(deliveredSrc, i);
    } else {
      pngUrls.push(deliveredSrc);
    }
    done++;

    // تسليم خيط الواجهة بين الصفوف — لا تجميد عند 500 صف
    if (i % 5 === 4) await new Promise((r) => setTimeout(r, 0));
  }

  if (!aborted) {
    onProgress?.({ done: rows.length, total: rows.length });
  } else {
    onProgress?.({ done, total: rows.length });
  }

  return { pngUrls, failedRows, aborted };
}

/** على سطح المكتب نرفع Blob ثنائياً ونحتفظ بالمسار فقط — في الويب Data URL. */
async function persistPng(blob: Blob, templateId: string, index: number): Promise<string> {
  if (wailsIsDesktop()) {
    try {
      const uploaded = await uploadMediaBlob(blob, `${templateId}-vdp-${index + 1}.png`);
      if (uploaded.imageSrc) return uploaded.imageSrc;
    } catch (e) {
      logger.error('VDP: فشل حفظ الصورة محلياً:', e);
    }
  }
  return blobToDataUrl(blob);
}
