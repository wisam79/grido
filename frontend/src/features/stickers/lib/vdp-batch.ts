import type { StickerTemplate, StickerParams } from '@/features/stickers';
import { renderSvgToPngDataUrl } from './svg-rasterizer';
import { sanitizeStickerColor, sanitizeStickerFontFamily } from './svg-safety';
import { applyRowToParams } from './vdp-parser';
import { wailsIsDesktop } from '@/lib/wails-env';
import { SaveImageFromBase64 } from '../../../../wailsjs/go/main/App';

/**
 * مولّد البطاقات الدفعية (VDP) — يُصيّر صفوف البيانات على قالب واحد
 * ويُرجع مصفوفة صور PNG جاهزة للإدراج الدفعي على الكانفس.
 * التصيير تسلسلي مع تمرير تقدّم لشريط التقدم — لا نُجمّد الواجهة بدفعات عملاقة.
 */

export interface VdpRenderProgress {
  done: number;
  total: number;
}

export interface VdpRenderResult {
  pngUrls: string[];
  failedRows: number;
}

export async function renderVdpBatch(
  template: StickerTemplate,
  baseParams: StickerParams,
  rows: Record<string, string>[],
  mapping: Record<string, string>,
  onProgress?: (p: VdpRenderProgress) => void,
): Promise<VdpRenderResult> {
  const pngUrls: string[] = [];
  let failedRows = 0;

  for (let i = 0; i < rows.length; i++) {
    onProgress?.({ done: i, total: rows.length });

    const rowParams = applyRowToParams(baseParams, mapping, rows[i]);

    // تعقيم القيم عند نقطة التوليد الواحدة — نفس حارس StickerStudioDialog
    const cleanFamily = sanitizeStickerFontFamily(rowParams.fontFamily || 'Cairo');
    const safeFamily = cleanFamily.includes(' ') ? `'${cleanFamily}'` : cleanFamily;
    const safeParams: StickerParams = {
      ...rowParams,
      primaryColor: sanitizeStickerColor(rowParams.primaryColor, template.defaultColors.primary),
      secondaryColor: sanitizeStickerColor(
        rowParams.secondaryColor,
        template.defaultColors.secondary,
      ),
      backgroundColor: sanitizeStickerColor(
        rowParams.backgroundColor,
        template.defaultColors.background,
      ),
      fontFamily: safeFamily,
    };

    try {
      const svg = template.generateSvg(safeParams);
      const png = await renderSvgToPngDataUrl(svg, 800, 800 / template.aspectRatio, [
        rowParams.fontFamily || 'Cairo',
      ]);
      pngUrls.push(await persistPng(png));
    } catch (err) {
      // صف تالف (بيانات ناقصة مثلاً) لا يُسقط الدفعة كاملة — نُكمل ونُبلغ
      console.error(`VDP: فشل تصيير الصف ${i + 1}:`, err);
      failedRows++;
    }

    // تسليم خيط الواجهة بين الصفوف — لا تجميد عند 500 صف
    if (i % 5 === 4) await new Promise((r) => setTimeout(r, 0));
  }

  onProgress?.({ done: rows.length, total: rows.length });
  return { pngUrls, failedRows };
}

/** على سطح المكتب نحفظ المسارات محلياً (نفس منطق الاستوديو) — في الويب data URLs مباشرة */
async function persistPng(dataUrl: string): Promise<string> {
  if (wailsIsDesktop() && dataUrl.startsWith('data:image/')) {
    try {
      const localPath = await SaveImageFromBase64(dataUrl);
      if (localPath) return localPath;
    } catch (e) {
      console.error('VDP: فشل حفظ الصورة محلياً:', e);
    }
  }
  return dataUrl;
}
