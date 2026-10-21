/**
 * export-cmyk.ts — تصدير فضاء ألوان CMYK (TIFF/JPEG) عبر مسار الطباعة الخلفي الموجود.
 *
 * التفكيك: يُلتقط الكانفاس الحالي كصورة PNG (نفس مسار التصدير RGB بالضبط، بنفس
 * الدقة)، ثم يُرفع ويُرسل إلى Go عبر `ExportPrintSheet` مع
 * `colorSpace: "cmyk"` — وهو المسار الوحيد الذي يحوّل الألوان إلى CMYK.
 * يعيد Go مسار ملف `print_*` في مجلد Exports، وهو مخدوم عبر `/local-image/`
 * فنقرؤه كـ Blob ليُحفظ في مكان يختاره المستخدم.
 *
 * هذا يجعل مخرج CMYK مطابقاً بكسل-بكسل لمخرج RGB (قبل التحويل).
 */
import type Konva from 'konva';
import * as domain from '@bindings/grido/internal/core/domain';
import { ExportPrintSheet } from '@bindings/grido/internal/handlers/printhandler';
import { exportCanvas } from './export-canvas';
import {
  uploadPrintImage,
  withTimeout,
  EXPORT_TIMEOUT_MS,
} from '@/components/editor/print/print-transport';

export type CmykFormat = 'tiff' | 'jpeg';

export interface CmykPrintRequestParams {
  imageSrc: string;
  paperWidthMM: number;
  paperHeightMM: number;
  dpi: number;
  backgroundColor: string;
  format: CmykFormat;
}

/**
 * يبني طلب طباعة CMYK لعنصر واحد يملأ الورقة تماماً (بلا خطوط قص ولا نسخ) —
 * أي «صورة الكانفاس الحالية» محوّلةً إلى CMYK. دالة نقية قابلة للاختبار.
 */
export function buildCmykPrintRequest(params: CmykPrintRequestParams): domain.PrintRequest {
  const landscape = params.paperWidthMM > params.paperHeightMM;
  return domain.PrintRequest.createFrom({
    paperWidthMM: params.paperWidthMM,
    paperHeightMM: params.paperHeightMM,
    marginMM: 0,
    gapMM: 0,
    dpi: params.dpi,
    backgroundColor: params.backgroundColor,
    showCutLines: false,
    colorSpace: 'cmyk',
    exportFormat: params.format,
    orientation: landscape ? 'landscape' : 'portrait',
    cutLines: [],
    items: [
      domain.PrintItem.createFrom({
        imageSrc: params.imageSrc,
        x: 0,
        y: 0,
        w: params.paperWidthMM,
        h: params.paperHeightMM,
        filter: 'none',
        brightness: 100,
        contrast: 100,
        saturation: 100,
        zoom: 1,
        dragX: 0,
        dragY: 0,
        copies: 1,
        copyCols: 1,
        copyStepX: 0,
        copyStepY: 0,
      }),
    ],
  });
}

/** اسم ملف آمن من مسار Go المطلق (`C:\...\Exports\print_123.tif` ← `print_123.tif`). */
export function basename(filePath: string): string {
  return String(filePath).split(/[\\/]/).pop() || '';
}

export interface RunCmykExportParams {
  stage: Konva.Stage | null;
  format: CmykFormat;
  dpi: number;
  paperWidthMM: number;
  paperHeightMM: number;
  backgroundColor: string;
}

export interface CmykExportResult {
  blob: Blob;
  sourceFilename: string;
}

/**
 * ينفّذ تصدير CMYK كاملاً ويعيد بلوب الملف الناتج (ليحفظه المستدعي في مكانه).
 * يرمي عند أي فشل برسالة عربية صريحة.
 */
export async function runCmykExport(params: RunCmykExportParams): Promise<CmykExportResult> {
  // 1) التقاط الكانفاس (نفس دقة مسار RGB: pixelRatio=1)
  const pngBlob = await exportCanvas('png', 1, params.stage);
  if (!pngBlob) {
    throw new Error('تعذر التقاط التصميم للتصدير');
  }

  // 2) رفعه إلى Exports ليصبح مساراً يستطيع Go قراءته
  const imageSrc = await uploadPrintImage(pngBlob);

  // 3) التحويل إلى CMYK داخل Go (المسار الخلفي الموجود)
  const request = buildCmykPrintRequest({
    imageSrc,
    paperWidthMM: params.paperWidthMM,
    paperHeightMM: params.paperHeightMM,
    dpi: params.dpi,
    backgroundColor: params.backgroundColor,
    format: params.format,
  });
  const result = await withTimeout(ExportPrintSheet(request), EXPORT_TIMEOUT_MS, 'تصدير CMYK');
  if (!result?.success || !result.filePath) {
    throw new Error(result?.error || 'فشل توليد ملف CMYK');
  }

  // 4) قراءة الملف الناتج (اسمه `print_*` فيخدُمه مسار /local-image/)
  const name = basename(result.filePath);
  if (!name) {
    throw new Error('مسار ملف CMYK الناتج غير صالح');
  }
  if (typeof window === 'undefined' || !window.location?.origin) {
    throw new Error('بيئة التشغيل لا تسمح بقراءة الملف الناتج');
  }
  const resp = await fetch(`${window.location.origin}/local-image/${encodeURIComponent(name)}`);
  if (!resp.ok) {
    throw new Error(`تعذر قراءة ملف CMYK الناتج (HTTP ${resp.status})`);
  }
  const blob = await resp.blob();
  return { blob, sourceFilename: name };
}
