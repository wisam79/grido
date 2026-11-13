/**
 * export-cmyk.ts — تصدير TIFF بفضاء ألوان CMYK عبر مسار الطباعة الخلفي.
 */
import * as domain from '@bindings/grido/internal/core/domain';
import { CancelPrintJob, ExportPrintSheet } from '@bindings/grido/internal/handlers/printhandler';

import {
  uploadPrintImage,
  withTimeout,
  EXPORT_TIMEOUT_MS,
} from '@/components/editor/print/print-transport';

import { exportCanvas } from './export-canvas';

import type Konva from 'konva';

export type CmykFormat = 'tiff';

export interface CmykPrintRequestParams {
  imageSrc: string;
  paperWidthMM: number;
  paperHeightMM: number;
  dpi: number;
  backgroundColor: string;
  format: CmykFormat;
}

function abortError(signal?: AbortSignal): Error {
  if (signal?.reason instanceof Error) return signal.reason;
  return new DOMException('تم إلغاء تصدير CMYK', 'AbortError');
}

function throwIfAborted(signal?: AbortSignal): void {
  if (signal?.aborted) throw abortError(signal);
}

function createJobId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `cmyk-${crypto.randomUUID()}`;
  }
  return `cmyk-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

/**
 * يبني طلب طباعة TIFF/CMYK لعنصر واحد يملأ الورقة تماماً.
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
    exportFormat: 'tiff',
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

/** اسم ملف آمن من مسار Go المطلق. */
export function basename(filePath: string): string {
  return String(filePath).split(/[\\/]/).pop() || '';
}

export interface RunCmykExportParams {
  stage: Konva.Stage | null;
  format?: CmykFormat;
  dpi: number;
  paperWidthMM: number;
  paperHeightMM: number;
  backgroundColor: string;
  signal?: AbortSignal;
}

export interface CmykExportResult {
  blob: Blob;
  sourceFilename: string;
}

export function isTiffBlobSignature(bytes: Uint8Array): boolean {
  if (bytes.length < 4) return false;
  const littleEndian =
    bytes[0] === 0x49 && bytes[1] === 0x49 && bytes[2] === 0x2a && bytes[3] === 0x00;
  const bigEndian =
    bytes[0] === 0x4d && bytes[1] === 0x4d && bytes[2] === 0x00 && bytes[3] === 0x2a;
  const littleBigTiff =
    bytes.length >= 8 &&
    bytes[0] === 0x49 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x2b &&
    bytes[3] === 0x00;
  const bigBigTiff =
    bytes.length >= 8 &&
    bytes[0] === 0x4d &&
    bytes[1] === 0x4d &&
    bytes[2] === 0x00 &&
    bytes[3] === 0x2b;
  return littleEndian || bigEndian || littleBigTiff || bigBigTiff;
}

export async function assertValidTiffBlob(blob: Blob, signal?: AbortSignal): Promise<void> {
  throwIfAborted(signal);
  if (blob.size < 4) {
    throw new Error('ملف CMYK TIFF الناتج فارغ أو غير مكتمل');
  }
  const signature = new Uint8Array(await blob.slice(0, 8).arrayBuffer());
  throwIfAborted(signal);
  if (!isTiffBlobSignature(signature)) {
    throw new Error('ملف CMYK الناتج ليس TIFF صالحاً');
  }
}

async function fetchTiffBlob(sourceFilename: string, signal?: AbortSignal): Promise<Blob> {
  if (typeof window === 'undefined' || !window.location?.origin) {
    throw new Error('بيئة التشغيل لا تسمح بقراءة ملف CMYK الناتج');
  }
  throwIfAborted(signal);
  const response = await fetch(
    `${window.location.origin}/local-image/${encodeURIComponent(sourceFilename)}`,
    { signal },
  );
  if (!response.ok) {
    throw new Error(`تعذر قراءة ملف CMYK الناتج (HTTP ${response.status})`);
  }
  const blob = await response.blob();
  await assertValidTiffBlob(blob, signal);
  return blob.type === 'image/tiff' ? blob : new Blob([blob], { type: 'image/tiff' });
}

function uploadPrintImageWithSignal(blob: Blob, signal?: AbortSignal): Promise<string> {
  // print-transport لا يملك معامل signal بعد؛ السباق يوقف هذه الجولة ويمنعها من
  // متابعة IPC، بينما طلب HTTP نفسه ينتهي وفق مهلة النقل الحالية.
  if (!signal) return uploadPrintImage(blob);
  throwIfAborted(signal);
  return new Promise((resolve, reject) => {
    let settled = false;
    const finish = (callback: () => void) => {
      if (settled) return;
      settled = true;
      signal.removeEventListener('abort', onAbort);
      callback();
    };
    const onAbort = () => finish(() => reject(abortError(signal)));
    signal.addEventListener('abort', onAbort, { once: true });
    uploadPrintImage(blob).then(
      (value) => finish(() => resolve(value)),
      (error) => finish(() => reject(error)),
    );
  });
}

/** ينفّذ تصدير TIFF/CMYK كاملاً ويعيد ملفاً حقيقياً غير فارغ. */
export async function runCmykExport(params: RunCmykExportParams): Promise<CmykExportResult> {
  const signal = params.signal;
  throwIfAborted(signal);

  const pngBlob = await exportCanvas('png', 1, params.stage);
  throwIfAborted(signal);
  if (!pngBlob || pngBlob.size === 0) {
    throw new Error('تعذر التقاط التصميم للتصدير');
  }

  const imageSrc = await uploadPrintImageWithSignal(pngBlob, signal);
  throwIfAborted(signal);

  const jobId = createJobId();
  const request = buildCmykPrintRequest({
    imageSrc,
    paperWidthMM: params.paperWidthMM,
    paperHeightMM: params.paperHeightMM,
    dpi: params.dpi,
    backgroundColor: params.backgroundColor,
    format: 'tiff',
  });
  // الربط المولد الحالي لا يعلن JobID بعد، لكن عقد Go الحي يقبله. نضيفه
  // دون تعديل الربطات المحمية حتى تتم إعادة توليدها من الوكيل المتكامل.
  Object.assign(request, { jobId });

  let abortRequested = false;
  const onAbort = () => {
    abortRequested = true;
    // إلغاء المهمة المملوكة لهذه الجولة فقط؛ لا نلمس مهام حوار الطباعة العامة.
    void CancelPrintJob(jobId).catch(() => {});
  };
  signal?.addEventListener('abort', onAbort, { once: true });

  let result: domain.PrintResult;
  try {
    const exportPromise = ExportPrintSheet(request);
    const abortableExport =
      signal && typeof exportPromise.cancelOn === 'function'
        ? exportPromise.cancelOn(signal)
        : exportPromise;
    result = await withTimeout(abortableExport, EXPORT_TIMEOUT_MS, 'تصدير CMYK');
  } catch (error) {
    if (abortRequested || signal?.aborted) throw abortError(signal);
    throw error;
  } finally {
    signal?.removeEventListener('abort', onAbort);
  }

  throwIfAborted(signal);
  if (!result?.success || !result.filePath) {
    throw new Error(result?.error || 'فشل توليد ملف CMYK');
  }

  const name = basename(result.filePath);
  if (!name || !/\.tiff?$/i.test(name)) {
    throw new Error('مسار ملف CMYK TIFF الناتج غير صالح');
  }

  const blob = await fetchTiffBlob(name, signal);
  throwIfAborted(signal);
  return { blob, sourceFilename: name };
}
