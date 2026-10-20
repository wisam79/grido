import type { DetectedDocument, DetectionMode, DetectionResult } from './types';
import { createLogger } from '@/lib/logger';

const logger = createLogger('detector-worker-client');

/**
 * عميل عامل الكشف: مسار واحد لكل من هرم الرؤية النقية (JS) ومحرك OpenCV.
 *
 * الهدف: إبقاء محرك OpenCV (WASM) وحسابات الكفاف خارج الخيط الرئيسي.
 * العامل يُنهي بجواره مع الماسح (release) فيُحرَّر كتل WASM من الذاكرة.
 */

export interface DetectorWorkerResponse {
  type: 'success' | 'opencv-success' | 'error';
  requestId: number;
  docs?: DetectedDocument[];
  result?: DetectionResult | null;
  error?: string;
}

interface PendingRequest {
  resolve: (response: DetectorWorkerResponse) => void;
  reject: (error: Error) => void;
  timer: ReturnType<typeof setTimeout>;
}

const WORKER_TIMEOUT_MS = 15_000;

export class DetectorWorkerClient {
  private worker: Worker | null = null;
  private nextRequestId = 1;
  private pending = new Map<number, PendingRequest>();

  /** هل يدعم العامل في هذه البيئة؟ */
  isAvailable(): boolean {
    return typeof window !== 'undefined' && typeof Worker !== 'undefined';
  }

  /** ينشئ العامل عند أول استخدام (بلا كلفة إن لم يُحتج إليه). */
  private ensureWorker(): Worker | null {
    if (this.worker) return this.worker;
    if (!this.isAvailable()) return null;

    try {
      const worker = new Worker(
        new URL('../../../../workers/document-detector.worker.ts', import.meta.url),
        { type: 'module' },
      );

      worker.onmessage = (event: MessageEvent<DetectorWorkerResponse>) => {
        const message = event.data;
        if (!message || typeof message.requestId !== 'number') return;
        const pending = this.pending.get(message.requestId);
        if (!pending) return;
        this.pending.delete(message.requestId);
        clearTimeout(pending.timer);
        pending.resolve(message);
      };

      worker.onerror = (event: ErrorEvent) => {
        const message = event.message || 'فشل عامل الكشف';
        this.terminate(new Error(message));
      };

      this.worker = worker;
      return worker;
    } catch (error) {
      logger.warn('Failed to initialize document detector worker:', error);
      this.worker = null;
      return null;
    }
  }

  /**
   * يرسل صورة مصغّرة (ImageData) إلى العامل. المخزن منقول (transfer) حتى لا
   * ننسخه، ونحتفظ بنسخة احتياطية للمتصل لأن النقل يُفرغ الأصل.
   */
  request(
    type: 'detect' | 'opencv',
    imgData: ImageData,
    options: { originalWidth: number; originalHeight: number; mode?: DetectionMode },
  ): Promise<DetectorWorkerResponse | null> {
    const worker = this.ensureWorker();
    if (!worker) return Promise.resolve(null);

    const requestId = this.nextRequestId++;
    const transferCopy = imgData.data.slice().buffer;

    return new Promise<DetectorWorkerResponse | null>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(requestId);
        reject(new Error('Document detector worker timed out'));
      }, WORKER_TIMEOUT_MS);

      this.pending.set(requestId, {
        resolve: (response) => {
          if (response.type === 'error') {
            reject(new Error(response.error || 'Detection failed'));
            return;
          }
          resolve(response);
        },
        reject,
        timer,
      });

      try {
        worker.postMessage(
          {
            type,
            requestId,
            buffer: transferCopy,
            sw: imgData.width,
            sh: imgData.height,
            originalWidth: options.originalWidth,
            originalHeight: options.originalHeight,
            mode: options.mode ?? 'multi',
          },
          [transferCopy],
        );
      } catch (error) {
        this.pending.delete(requestId);
        clearTimeout(timer);
        reject(error instanceof Error ? error : new Error('تعذّر إرسال طلب الكشف'));
      }
    });
  }

  /** تهيئة OpenCV داخل العامل مسبقاً (بلا كلفة على الخيط الرئيسي). */
  warmup(): void {
    const worker = this.ensureWorker();
    if (!worker) return;
    try {
      worker.postMessage({ type: 'warmup' });
    } catch {
      /* ignore */
    }
  }

  /** إنهاء العامل ورفض كل الطلبات المعلّقة (يمنع تعليق الوعود). */
  terminate(error: Error = new Error('تم إنهاء عامل الكشف')): void {
    const pending = Array.from(this.pending.values());
    this.pending.clear();
    for (const entry of pending) {
      clearTimeout(entry.timer);
      entry.reject(error);
    }

    if (this.worker) {
      try {
        this.worker.terminate();
      } catch {
        /* ignore */
      }
      this.worker = null;
    }
  }
}
