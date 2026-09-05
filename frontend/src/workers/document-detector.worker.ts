/**
 * document-detector.worker.ts — Web Worker لكشف حدود المستندات تلقائياً
 *
 * يقوم بتشغيل خوارزميات الرؤية الحاسوبية وهرم المقاييس المتعددة (Sobel, Canny, RANSAC)
 * في خيط معالجة خلفي مستقل دون تجميد الخيط الرئيسي للواجهة.
 */

import { autoDetectAllDocumentCorners } from "../components/editor/document-scanner/core/document-detector";
import type { DetectedDocument } from "../components/editor/document-scanner/core/types";

export interface DetectWorkerMessage {
  type: "detect";
  requestId: number;
  buffer: ArrayBuffer;
  sw: number;
  sh: number;
  originalWidth: number;
  originalHeight: number;
}

export interface DetectWorkerSuccessResponse {
  type: "success";
  requestId: number;
  docs: DetectedDocument[];
}

export interface DetectWorkerErrorResponse {
  type: "error";
  requestId: number;
  error: string;
}

export type DetectWorkerResponse = DetectWorkerSuccessResponse | DetectWorkerErrorResponse;

const ctx: Worker = self as unknown as Worker;

ctx.onmessage = (e: MessageEvent<DetectWorkerMessage>) => {
  const data = e.data;
  if (!data || data.type !== "detect") return;

  try {
    const { requestId, buffer, sw, sh, originalWidth, originalHeight } = data;
    const uint8 = new Uint8ClampedArray(buffer);
    const imgData = new ImageData(uint8, sw, sh);

    const docs = autoDetectAllDocumentCorners(imgData, sw, sh, originalWidth, originalHeight);

    ctx.postMessage({
      type: "success",
      requestId,
      docs,
    });
  } catch (err) {
    ctx.postMessage({
      type: "error",
      requestId: data.requestId,
      error: err instanceof Error ? err.message : String(err),
    });
  }
};
