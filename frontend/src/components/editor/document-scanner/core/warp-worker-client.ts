import type { Point, ScannerFilterMode } from './types';

/**
 * عميل عامل الاستعدال: قناة واحدة مستقلة لكل نافذة ماسح.
 *
 * الهدف: تنفيذ الاستعدال خارج الخيط الرئيسي. الإلغاء يتم بإنهاء العامل
 * (terminate) لأن حلقة الاستعدال على 50MP لا تُقطَع cooperatively — الإنهاء
 * فوري ويحرّر ذاكرة العامل بالكامل. العامل لا يحتوي WASM ثقيلاً، فإعادة
 * إنشائه بعد الإلغاء رخيصة.
 */

export interface WarpJob {
  source: Blob;
  corners: Point[];
  targetW: number;
  targetH: number;
  filterMode: ScannerFilterMode;
  rotation: number;
}

export class WarpCancelledError extends Error {
  constructor(message = 'تم إلغاء عملية الاستعدال') {
    super(message);
    this.name = 'WarpCancelledError';
  }
}

interface PendingWarp {
  resolve: (blob: Blob) => void;
  reject: (error: Error) => void;
}

/** هل يدعم المتصفح/بيئة WebView2 المسار غير المتزامن؟ */
export function supportsWorkerWarp(): boolean {
  return (
    typeof Worker !== 'undefined' &&
    typeof OffscreenCanvas !== 'undefined' &&
    typeof createImageBitmap === 'function'
  );
}

export class WarpWorkerClient {
  private worker: Worker | null = null;
  private nextRequestId = 1;
  private pending = new Map<number, PendingWarp>();
  private disposed = false;

  warp(job: WarpJob): Promise<Blob> {
    if (this.disposed) {
      return Promise.reject(new WarpCancelledError('تم إغلاق عامل الاستعدال'));
    }

    let worker: Worker;
    try {
      worker = this.ensureWorker();
    } catch (error) {
      return Promise.reject(
        error instanceof Error ? error : new Error('تعذّر تشغيل عامل الاستعدال'),
      );
    }

    const requestId = this.nextRequestId++;
    return new Promise<Blob>((resolve, reject) => {
      this.pending.set(requestId, { resolve, reject });
      try {
        worker.postMessage({ type: 'warp', requestId, ...job });
      } catch (error) {
        this.pending.delete(requestId);
        reject(error instanceof Error ? error : new Error('تعذّر إرسال طلب الاستعدال'));
      }
    });
  }

  /** إلغاء كل الطلبات المعلّقة وإنهاء العامل فوراً. */
  cancel(): void {
    this.terminate(new WarpCancelledError());
  }

  /** إغلاق نهائي: لا يمكن إعادة استخدام العميل بعده. */
  dispose(): void {
    this.disposed = true;
    this.terminate(new WarpCancelledError('تم إغلاق نافذة الماسح'));
  }

  private ensureWorker(): Worker {
    if (this.worker) return this.worker;

    const worker = new Worker(
      new URL('../../../../workers/scanner-warp.worker.ts', import.meta.url),
      { type: 'module' },
    );

    worker.onmessage = (event: MessageEvent) => {
      const message = event.data as
        | { type: 'success'; requestId: number; blob: Blob }
        | { type: 'error'; requestId: number; error: string };
      if (!message || typeof message.requestId !== 'number') return;

      const pending = this.pending.get(message.requestId);
      if (!pending) return;
      this.pending.delete(message.requestId);

      if (message.type === 'success') {
        pending.resolve(message.blob);
      } else {
        pending.reject(new Error(message.error || 'فشل الاستعدال في الخلفية'));
      }
    };

    worker.onerror = (event: ErrorEvent) => {
      const message = event.message || 'فشل عامل الاستعدال';
      this.terminate(new Error(message));
    };

    this.worker = worker;
    return worker;
  }

  private terminate(error: Error): void {
    const pending = Array.from(this.pending.values());
    this.pending.clear();

    if (this.worker) {
      try {
        this.worker.terminate();
      } catch {
        /* ignore */
      }
      this.worker = null;
    }

    for (const entry of pending) {
      entry.reject(error);
    }
  }
}
