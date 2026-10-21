/// <reference lib="webworker" />

/**
 * scanner-warp.worker.ts — عامل استعدال المنظور والتصدير خارج الخيط الرئيسي.
 *
 * يستقبل صورة المصدر كـ Blob، ويفكّها بـ createImageBitmap (مع تطبيق اتجاه
 * EXIF)، ثم ينفّذ الاستعدال والفلاتر والتدوير على OffscreenCanvas، ويُرجع
 * الناتج Blob جاهزاً للإدراج. كل العمل الثقيل يحدث هنا فلا تتجمّد الواجهة
 * على صور 50MP.
 */

import { warpSourceImage } from '../components/editor/document-scanner/core/warp-pipeline';

import type { Point, ScannerFilterMode } from '../components/editor/document-scanner/core/types';

export interface ScannerWarpRequest {
  type: 'warp';
  requestId: number;
  source: Blob;
  corners: Point[];
  targetW: number;
  targetH: number;
  filterMode: ScannerFilterMode;
  rotation: number;
}

export type ScannerWarpResponse =
  | { type: 'success'; requestId: number; blob: Blob }
  | { type: 'error'; requestId: number; error: string };

const ctx = self as unknown as DedicatedWorkerGlobalScope;

function postError(requestId: number, error: string) {
  const message: ScannerWarpResponse = { type: 'error', requestId, error };
  ctx.postMessage(message);
}

/** يحوّل كانفاس العامل إلى Blob (convertToBlob متاح على OffscreenCanvas). */
async function canvasToBlob(
  canvas: {
    convertToBlob?: (options?: { type?: string }) => Promise<Blob>;
    toBlob?: (cb: (b: Blob | null) => void, type?: string) => void;
  },
  type: string,
): Promise<Blob> {
  if (typeof canvas.convertToBlob === 'function') {
    return canvas.convertToBlob({ type });
  }
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob?.((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('Canvas produced an empty Blob'));
    }, type);
  });
}

async function handleWarp(request: ScannerWarpRequest) {
  const { requestId } = request;

  let bitmap: ImageBitmap | null = null;
  try {
    bitmap = await createImageBitmap(request.source, { imageOrientation: 'from-image' });

    const canvas = warpSourceImage(bitmap, bitmap.width, bitmap.height, {
      corners: request.corners,
      targetW: request.targetW,
      targetH: request.targetH,
      filterMode: request.filterMode,
      rotation: request.rotation,
    });

    const blob = await canvasToBlob(canvas as never, 'image/png');
    const response: ScannerWarpResponse = { type: 'success', requestId, blob };
    ctx.postMessage(response);
  } catch (error) {
    postError(requestId, error instanceof Error ? error.message : String(error));
  } finally {
    bitmap?.close();
  }
}

ctx.onmessage = (event: MessageEvent<ScannerWarpRequest>) => {
  const request = event.data;
  if (!request || request.type !== 'warp') return;
  void handleWarp(request);
};
