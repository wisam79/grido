/// <reference lib="webworker" />
import { Scanner, scanDocument } from 'scanic';

/**
 * 🧵 عامل الكشف العصبي — المرحلة 3 من خطة ترحيل الماسح
 * (docs/plans/neural-scanner-warp-migration-spec.md §4.4).
 *
 * الاستدلال ORT WASM يعمل هنا كاملاً خارج الخيط الرئيسي (إصلاح C-3: كان
 * يعمل على خيط الواجهة). الابتلاع يصل بـtransfer من فضاء الابتلاع الثابت
 * 224×224 (سجل B2/B3) — العامل لا يلمس صوراً بدقة المصدر إطلاقاً.
 *
 * قواعد دورة الحياة (مهارة opencv-mediapipe-ai-tuner §6): العميل يقتل
 * العامل عند المهلة/العطل ولا يعيد استخدام عامل ميت — هنا نضمن الرد
 * السريع والرسائل المتوقعة فقط.
 */

interface MlDetectRequest {
  type: 'detect' | 'warmup';
  requestId: number;
  /** RGBA خام بفضاء الابتلاع الثابت (منقول — لا يصلح بعد الرد). */
  buffer?: ArrayBuffer;
  sw?: number;
  sh?: number;
  mode?: 'single' | 'multi';
  minScore?: number;
  assetBaseUrl?: string;
  modelUrl?: string;
  wasmPaths?: string;
  modelFetchTimeoutMs?: number;
}

interface MlDetectResponse {
  type: 'success' | 'error';
  requestId: number;
  /** corners في فضاء الابتلاع (0..224) — الرفع لفضاء المصدر على العميل. */
  corners?: Array<{ x: number; y: number }>;
  score?: number | null;
  error?: string;
}

let initializedKey = '';

function mlOptions(msg: MlDetectRequest) {
  const baseUrl = msg.assetBaseUrl ?? self.location.origin + '/models/scanic/';
  return {
    detector: 'ml' as const,
    mode: 'detect' as const,
    ml: {
      assetBaseUrl: baseUrl,
      modelUrl: msg.modelUrl ?? `${baseUrl}doccornernet_lean.ort`,
      wasmPaths: msg.wasmPaths ?? baseUrl,
      modelFetchTimeoutMs: msg.modelFetchTimeoutMs ?? 4000,
      minScore: msg.minScore,
    },
  };
}

function ensureInitialized(msg: MlDetectRequest): Promise<void> {
  const baseUrl = msg.assetBaseUrl ?? self.location.origin + '/models/scanic/';
  const modelUrl = msg.modelUrl ?? `${baseUrl}doccornernet_lean.ort`;
  const key = `${baseUrl}|${modelUrl}`;
  if (key === initializedKey) return Promise.resolve();
  const scanner = new Scanner(mlOptions(msg));
  return scanner.initialize().then(() => {
    initializedKey = key;
  });
}

self.onmessage = (event: MessageEvent<MlDetectRequest>) => {
  const msg = event.data;
  if (!msg || typeof msg.requestId !== 'number') return;

  if (msg.type === 'warmup') {
    ensureInitialized(msg)
      .then(() => {
        const res: MlDetectResponse = { type: 'success', requestId: msg.requestId };
        self.postMessage(res);
      })
      .catch((err: unknown) => {
        const res: MlDetectResponse = {
          type: 'error',
          requestId: msg.requestId,
          error: err instanceof Error ? err.message : 'ML warmup failed',
        };
        self.postMessage(res);
      });
    return;
  }

  // detect: الابتلاع وصل منقولاً — لا نسخة إضافية
  if (!msg.buffer || !msg.sw || !msg.sh) {
    const res: MlDetectResponse = {
      type: 'error',
      requestId: msg.requestId,
      error: 'ML ingest frame missing',
    };
    self.postMessage(res);
    return;
  }

  const run = async (): Promise<MlDetectResponse> => {
    await ensureInitialized(msg);
    const data = new Uint8ClampedArray(msg.buffer!);
    // ImageData القياسية تُقبل من scanDocument مباشرة (OffscreenCanvas 224 داخلياً)
    const image = new ImageData(data, msg.sw!, msg.sh!);
    const result = await scanDocument(image, mlOptions(msg));

    if (!result || !result.success || !result.corners) {
      return {
        type: 'success',
        requestId: msg.requestId,
        corners: [],
        score: result?.score ?? null,
      };
    }

    const corners = [
      result.corners.topLeft,
      result.corners.topRight,
      result.corners.bottomRight,
      result.corners.bottomLeft,
    ];
    for (const p of corners) {
      if (
        !p ||
        typeof p.x !== 'number' ||
        Number.isNaN(p.x) ||
        typeof p.y !== 'number' ||
        Number.isNaN(p.y)
      ) {
        return { type: 'success', requestId: msg.requestId, corners: [], score: null };
      }
    }
    return {
      type: 'success',
      requestId: msg.requestId,
      corners: corners.map((p) => ({ x: p.x, y: p.y })),
      score: typeof result.score === 'number' ? result.score : null,
    };
  };

  run()
    .then((res) => self.postMessage(res))
    .catch((err: unknown) => {
      const res: MlDetectResponse = {
        type: 'error',
        requestId: msg.requestId,
        error: err instanceof Error ? err.message : 'ML detection failed',
      };
      self.postMessage(res);
    });
};
