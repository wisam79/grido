/**
 * document-detector.worker.ts — Web Worker لكشف حدود المستندات تلقائياً
 *
 * يقوم بتشغيل خوارزميات الرؤية الحاسوبية وهرم المقاييس المتعددة (Sobel, Canny, RANSAC)
 * في خيط معالجة خلفي مستقل دون تجميد الخيط الرئيسي للواجهة.
 *
 * يضيف أيضاً مسار OpenCV (WASM): مهمة 'opencv' تنفّذ كشف الكفاف على نفس
 * البكسلات التي كان يرسمها الخيط الرئيسي (640px) — فتخرج تهيئة WASM (نحو
 * 13MB) وحسابات الكفاف من الخيط الرئيسي، ويبقى الخيط الرئيسي خفيفاً.
 */

import { autoDetectAllDocumentCorners } from '../components/editor/document-scanner/core/document-detector';
import { detectDocumentsWithOpenCVFromImageData } from '../components/editor/document-scanner/core/opencv-detector';
import { loadOpenCV } from '../components/editor/document-scanner/opencv-loader';

import type {
  DetectedDocument,
  DetectionMode,
} from '../components/editor/document-scanner/core/types';

export interface DetectWorkerMessage {
  type: 'detect' | 'opencv' | 'warmup';
  requestId: number;
  buffer: ArrayBuffer;
  sw: number;
  sh: number;
  originalWidth: number;
  originalHeight: number;
  mode?: DetectionMode;
}

export interface DetectWorkerSuccessResponse {
  type: 'success';
  requestId: number;
  docs: DetectedDocument[];
}

export interface DetectWorkerOpenCvResponse {
  type: 'opencv-success';
  requestId: number;
  result: unknown;
}

export interface DetectWorkerErrorResponse {
  type: 'error';
  requestId: number;
  error: string;
}

export type DetectWorkerResponse =
  DetectWorkerSuccessResponse | DetectWorkerOpenCvResponse | DetectWorkerErrorResponse;

const ctx: Worker = self as unknown as Worker;

function postError(requestId: number, error: unknown) {
  ctx.postMessage({
    type: 'error',
    requestId,
    error: error instanceof Error ? error.message : String(error),
  });
}

async function handleOpenCv(data: DetectWorkerMessage) {
  const { requestId, buffer, sw, sh, originalWidth, originalHeight, mode } = data;
  try {
    const uint8 = new Uint8ClampedArray(buffer);
    const imgData = new ImageData(uint8, sw, sh);
    const result = await detectDocumentsWithOpenCVFromImageData(
      imgData,
      sw,
      sh,
      originalWidth,
      originalHeight,
      mode ?? 'multi',
    );
    ctx.postMessage({ type: 'opencv-success', requestId, result });
  } catch (err) {
    postError(requestId, err);
  }
}

ctx.onmessage = (e: MessageEvent<DetectWorkerMessage>) => {
  const data = e.data;
  if (!data) return;

  if (data.type === 'warmup') {
    // تهيئة OpenCV في الخلفية داخل العامل — بلا تجميد للخيط الرئيسي.
    void loadOpenCV();
    return;
  }

  if (data.type === 'opencv') {
    void handleOpenCv(data);
    return;
  }

  if (data.type !== 'detect') return;

  try {
    const { requestId, buffer, sw, sh, originalWidth, originalHeight } = data;
    const uint8 = new Uint8ClampedArray(buffer);
    const imgData = new ImageData(uint8, sw, sh);

    const docs = autoDetectAllDocumentCorners(imgData, sw, sh, originalWidth, originalHeight);

    ctx.postMessage({
      type: 'success',
      requestId,
      docs,
    });
  } catch (err) {
    postError(data.requestId, err);
  }
};
