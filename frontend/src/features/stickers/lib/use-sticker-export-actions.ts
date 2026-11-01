import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';

import { createLogger } from '@/lib/logger';
import { toErrorMessage } from '@/lib/wails-error';

import { copyPngDataUrlToClipboard, copySvgCodeToClipboard } from './clipboard-utils';
import { generateDieCutContour, DEFAULT_BLEED_PERCENT } from './die-cut-offset';
import { embedStickerFonts } from './sticker-font-embed';
import { stickerRasterSize } from './sticker-text';
import { renderSvgToPngBlob, renderSvgToPngDataUrl, downloadBlob } from './svg-rasterizer';

import type { StickerParams, StickerTemplate } from '../types';
import type { RefObject } from 'react';

const logger = createLogger('use-sticker-export-actions');

interface UseStickerExportActionsParams {
  open: boolean;
  selectedTemplate: StickerTemplate;
  params: StickerParams;
  svgString: string;
  exportableSvg: string;
  /** حارس الإلغاء المشترك: لا تنزيل ولا رسالة نجاح بعد إغلاق النافذة */
  cancelledRef: RefObject<boolean>;
}

/**
 * مخارج التصدير في استوديو الملصقات (SVG مضمّن الخطوط، خط القص، المسار النقي
 * للبلوتر، PNG بـ300/600 DPI، نسخ الصورة ونسخ كود SVG) — كانت متمركزة داخل
 * sticker-studio-dialog. كل مسار يشارك شارة الانشغال و حارس الإلغاء.
 */
export function useStickerExportActions({
  open,
  selectedTemplate,
  params,
  svgString,
  exportableSvg,
  cancelledRef,
}: UseStickerExportActionsParams) {
  const [busyExport, setBusyExport] = useState(false);

  // Reset loading state on dialog close (rule: Modal loading state cleanup)
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!open) setBusyExport(false);
  }, [open]);

  const handleDownloadSvg = useCallback(async () => {
    try {
      setBusyExport(true);
      // تضمين الخط داخل الملف ليعمل خارج التطبيق — يسقط برشاقة للأصل عند الفشل
      const portable = await embedStickerFonts(exportableSvg || svgString, [
        params.fontFamily || 'Cairo',
      ]);
      if (cancelledRef.current) return;
      const blob = new Blob([portable], { type: 'image/svg+xml;charset=utf-8' });
      downloadBlob(blob, `${selectedTemplate.id}.svg`);
      toast.success(
        portable !== (exportableSvg || svgString) ? 'نُزّل SVG بخط مضمّن' : 'نُزّل ملف SVG',
      );
    } catch (err) {
      logger.error('SVG download failed:', err);
      toast.error(toErrorMessage(err, 'فشل تنزيل SVG'));
    } finally {
      setBusyExport(false);
    }
  }, [exportableSvg, svgString, selectedTemplate.id, params.fontFamily, cancelledRef]);

  const handleDownloadCutContour = useCallback(async () => {
    try {
      setBusyExport(true);
      const dieCut = generateDieCutContour(exportableSvg || svgString, {
        bleedPercent: DEFAULT_BLEED_PERCENT,
        // ✂️ الشكل المعلن من القالب يسبق مستطيل viewBox — دوائر الشارات تقص دائرةً
        cutShape: selectedTemplate.cutShape,
        physicalMm: selectedTemplate.defaultMm,
      });
      const portable = await embedStickerFonts(dieCut.fullSvgWithContour, [
        params.fontFamily || 'Cairo',
      ]);
      if (cancelledRef.current) return;
      const blob = new Blob([portable], { type: 'image/svg+xml;charset=utf-8' });
      downloadBlob(blob, `${selectedTemplate.id}-cutcontour.svg`);
      toast.success('نُزّل SVG مع طبقة خط القص (CutContour) للمطابع');
    } catch (err) {
      logger.error('Cut contour download failed:', err);
      toast.error(toErrorMessage(err, 'فشل تنزيل ملف خط القص'));
    } finally {
      setBusyExport(false);
    }
  }, [exportableSvg, svgString, selectedTemplate, params.fontFamily, cancelledRef]);

  const handleDownloadPureCutContour = useCallback(async () => {
    try {
      setBusyExport(true);
      const dieCut = generateDieCutContour(exportableSvg || svgString, {
        bleedPercent: DEFAULT_BLEED_PERCENT,
        cutShape: selectedTemplate.cutShape,
        physicalMm: selectedTemplate.defaultMm,
      });
      const blob = new Blob([dieCut.standaloneContourSvg], { type: 'image/svg+xml;charset=utf-8' });
      downloadBlob(blob, `${selectedTemplate.id}-plotter-contour.svg`);
      toast.success('نُزّل مسار خط القص النقي لماكينة القص (Plotter)');
    } catch (err) {
      logger.error('Plotter contour download failed:', err);
      toast.error(toErrorMessage(err, 'فشل تنزيل خط القص'));
    } finally {
      setBusyExport(false);
    }
  }, [exportableSvg, svgString, selectedTemplate]);

  const handleDownloadPng = useCallback(
    async (dpi: 300 | 600 = 300) => {
      try {
        setBusyExport(true);
        const { width, height } = stickerRasterSize(
          selectedTemplate.aspectRatio,
          selectedTemplate.defaultMm,
          dpi,
        );
        const pngBlob = await renderSvgToPngBlob(
          svgString,
          width,
          height,
          [params.fontFamily || 'Cairo'],
          { dpi },
        );
        if (cancelledRef.current) return;
        downloadBlob(pngBlob, `${selectedTemplate.id}-${dpi}dpi.png`);
        toast.success(
          dpi === 600 ? 'صُدّر PNG فائق الدقة (600 DPI)' : 'صُدّر PNG عالي الدقة (300 DPI)',
        );
      } catch (err) {
        logger.error('PNG export failed:', err);
        toast.error(toErrorMessage(err, 'فشل التصدير'));
      } finally {
        setBusyExport(false);
      }
    },
    [
      svgString,
      selectedTemplate.aspectRatio,
      selectedTemplate.defaultMm,
      selectedTemplate.id,
      params.fontFamily,
      cancelledRef,
    ],
  );

  const handleCopyImage = useCallback(async () => {
    try {
      setBusyExport(true);
      const { width, height } = stickerRasterSize(
        selectedTemplate.aspectRatio,
        selectedTemplate.defaultMm,
      );
      const pngUrl = await renderSvgToPngDataUrl(
        svgString,
        width,
        height,
        [params.fontFamily || 'Cairo'],
        { dpi: 300 },
      );
      const ok = await copyPngDataUrlToClipboard(pngUrl);
      if (cancelledRef.current) return;
      if (ok) {
        toast.success('نُسخت الصورة للحافظة');
      } else {
        await copySvgCodeToClipboard(exportableSvg);
        if (cancelledRef.current) return;
        toast.success('نُسخ كود SVG');
      }
    } catch (err) {
      logger.error('Image copy failed:', err);
      toast.error(toErrorMessage(err, 'فشل النسخ'));
    } finally {
      setBusyExport(false);
    }
  }, [
    svgString,
    selectedTemplate.aspectRatio,
    selectedTemplate.defaultMm,
    params.fontFamily,
    exportableSvg,
    cancelledRef,
  ]);

  const handleCopySvgCode = useCallback(async () => {
    try {
      const ok = await copySvgCodeToClipboard(exportableSvg);
      if (cancelledRef.current) return;
      if (ok) {
        toast.success('نُسخ كود SVG المتجه');
      } else {
        toast.error('تعذر نسخ SVG');
      }
    } catch (err) {
      logger.error('SVG code copy failed:', err);
      toast.error(toErrorMessage(err, 'فشل نسخ SVG'));
    }
  }, [exportableSvg, cancelledRef]);

  return {
    busyExport,
    handleDownloadSvg,
    handleDownloadCutContour,
    handleDownloadPureCutContour,
    handleDownloadPng,
    handleCopyImage,
    handleCopySvgCode,
  };
}
