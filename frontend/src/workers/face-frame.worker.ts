/**
 * face-frame.worker.ts — Web Worker لتأطير الوجه تلقائياً وفق مقاييس صور الهوية
 *
 * يكتشف الوجه عبر FaceLandmarker من MediaPipe (محلي 100%) ثم يقتصّ من الصورة
 * الأصلية الإطار الذي يجعل الوجه معيارياً (ارتفاعه ~75% من الإطار، ممركز،
 * مع هامش أعلى الرأس). كل المعالجة خارج الخيط الرئيسي فلا تتجمد الواجهة.
 */

import type { FaceLandmarker } from '@mediapipe/tasks-vision';
import { faceBoxFromLandmarks, computeIdCropRect } from '../lib/filters/face-frame-utils';

export interface FaceFrameResult {
  /** صورة PNG مقصوصة بصيغة Base64 */
  pngBase64: string;
  /** أبعاد الصورة الناتجة بالبكسل */
  outW: number;
  outH: number;
  /** زمن الكشف الفعلي بالمللي ثانية */
  detectedMs: number;
  /** كشف الوجه بنجاح لكن داخل/خارج الحدود — يُستخدم للتحذير */
  adjusted?: boolean;
}

interface FrameRequest {
  type: 'frame';
  requestId: number;
  imageSrc: string;
  wasmBaseUrl: string;
  modelUrl: string;
  /** نسبة أبعاد إطار الهوية (العرض/الارتفاع) */
  aspectRatio: number;
  /** كسر ارتفاع الوجه المطلوب داخل الإطار (افتراضي 0.75) */
  faceFraction?: number;
}

interface CancelRequest {
  type: 'cancel';
  requestId: number;
}

interface WarmupRequest {
  type: 'warmup';
  wasmBaseUrl: string;
  modelUrl: string;
}

type WorkerRequest = FrameRequest | CancelRequest | WarmupRequest;

const ctx: Worker = self as unknown as Worker;

const maxDim = 512; // ⚡ 512px: كشف فوري لمعالم الوجه (Face Mesh) في أقل من 50ms على CPU

let landmarkerPromise: Promise<FaceLandmarker> | null = null;
let activeRequestId = 0;
let currentLandmarker: FaceLandmarker | null = null;

async function getOrCreateLandmarker(
  wasmBaseUrl: string,
  modelUrl: string,
): Promise<FaceLandmarker> {
  if (!landmarkerPromise) {
    landmarkerPromise = (async () => {
      const { FilesetResolver, FaceLandmarker } = await import('@mediapipe/tasks-vision');
      // الـ Worker وحدة ES — يجب طلب نسخة Module من الـ WASM loader
      // التي تسجّل ModuleFactory على globalThis (نفس نهج عزل الخلفية).
      const vision = await FilesetResolver.forVisionTasks(wasmBaseUrl, true);
      // 🛡️ استخدام CPU (WASM SIMD) بشكل مباشر:
      // يمنع حجز الـ GPU Process والـ VRAM في WebView2 تماماً.
      const landmarker = await FaceLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: modelUrl,
          delegate: 'CPU',
        },
        runningMode: 'IMAGE',
        numFaces: 1,
        minFaceDetectionConfidence: 0.5,
      });
      currentLandmarker = landmarker;
      return landmarker;
    })().catch((err) => {
      landmarkerPromise = null;
      throw err;
    });
  }
  return landmarkerPromise;
}

/**
 * 🧊 تسخين حقيقي: نفس عقدة عزل الخلفية — ترجمة shaders الخاصة بـ TFLite GPU
 * delegate تحدث داخل أول استدعاء `detect()` لا عند `createFromOptions`،
 * فالتسخين يجب أن ينفّذ كشفاً فعلياً على صورة ضئيلة (لا وجوه فيها — الترجمة
 * تكتمل بغض النظر عن النتيجة). لا يمسّ activeRequestId ولا يُبلّغ تقدّماً.
 *
 * ⚠️ تشغيل واحد فقط (memoized) ولا يرفض أبداً: `detect()` غير قابلة للتداخل
 * على النسخة نفسها، و`handleFrame` تنتظرها قبل كشفها فلا يتداخلان.
 *
 * @returns وعد التسخين الجاري (أو المنتهي) — لا يرفض إطلاقاً.
 */
let warmupPromise: Promise<void> | null = null;

function runWarmup(wasmBaseUrl: string, modelUrl: string): Promise<void> {
  if (warmupPromise) return warmupPromise;
  warmupPromise = (async () => {
    const landmarker = await getOrCreateLandmarker(wasmBaseUrl, modelUrl);
    const size = 64;
    const canvas = new OffscreenCanvas(size, size);
    const c2d = canvas.getContext('2d');
    if (!c2d) return;
    const tiny = c2d.getImageData(0, 0, size, size);
    void landmarker.detect(tiny);
  })().catch((err) => {
    // لا يُفشل التسخين أي عملية حقيقية — يُتصفّر للسماح بمحاولة لاحقة
    warmupPromise = null;
    console.debug('[Face-Frame Worker] Warmup deferred:', err);
  });
  return warmupPromise;
}

function postProgress(requestId: number, percent: number, text: string) {
  ctx.postMessage({ type: 'progress', requestId, percent, text });
}

function postError(requestId: number, message: string) {
  ctx.postMessage({ type: 'error', requestId, message });
}

function postResult(requestId: number, result: FaceFrameResult) {
  ctx.postMessage({ type: 'result', requestId, result });
}

async function handleFrame(req: FrameRequest) {
  const { requestId } = req;
  activeRequestId = requestId;
  const isCancelled = () => activeRequestId !== requestId;

  try {
    postProgress(requestId, 10, 'جاري التأطير ... (10%)');
    const landmarker = await getOrCreateLandmarker(req.wasmBaseUrl, req.modelUrl);
    if (isCancelled()) return;

    postProgress(requestId, 30, 'جاري التأطير ... (30%)');
    const res = await fetch(req.imageSrc);
    const blob = await res.blob();
    const original = await createImageBitmap(blob);
    if (isCancelled()) {
      original.close();
      return;
    }

    const origW = original.width;
    const origH = original.height;

    // صورة مصغرة للكشف فقط (حماية الذاكرة) — الإحداثيات normalized فلا تتأثر.
    let detectW = origW;
    let detectH = origH;
    if (origW > maxDim || origH > maxDim) {
      const ratio = Math.min(maxDim / origW, maxDim / origH);
      detectW = Math.round(origW * ratio);
      detectH = Math.round(origH * ratio);
    }

    postProgress(requestId, 50, 'جاري التأطير ... (50%)');
    const offscreen = new OffscreenCanvas(detectW, detectH);
    const octx = offscreen.getContext('2d', { willReadFrequently: true });
    if (!octx) throw new Error('تعذر إنشاء سياق الرسم داخل الـ Worker');
    octx.drawImage(original, 0, 0, detectW, detectH);
    const imageData = octx.getImageData(0, 0, detectW, detectH);
    if (isCancelled()) return;

    // 🧊 لا تتداخل مع كشف التسخين على النسخة نفسها (وإن أُلغي الطلب أثناء
    // الانتظار ننسحب بلا عمل — الفرع أدناه يعيد فحص الإلغاء).
    if (warmupPromise) {
      await warmupPromise;
      if (isCancelled()) {
        original.close();
        return;
      }
    }

    const start = performance.now();
    const detection = landmarker.detect(imageData);
    const detectedMs = Math.round(performance.now() - start);

    const landmarks = detection.faceLandmarks?.[0];

    if (!landmarks || landmarks.length === 0) {
      original.close();
      throw new Error('لم يتم العثور على وجه في الصورة. تأكد من وضوح الوجه وإضاءته.');
    }
    if (isCancelled()) {
      original.close();
      return;
    }

    const imageAspectRatio = origW / origH;
    const faceBox = faceBoxFromLandmarks(landmarks, imageAspectRatio);
    const crop = computeIdCropRect(faceBox, req.aspectRatio, imageAspectRatio);

    postProgress(requestId, 75, 'جاري التأطير ... (75%)');
    let cropW = Math.max(1, Math.round(crop.width * origW));
    let cropH = Math.max(1, Math.round(crop.height * origH));
    const cropX = crop.x * origW;
    const cropY = crop.y * origH;

    // 🛡️ سقف أقصى لأبعاد الإطار المقتص (حماية الذاكرة ومنع تخصيص لوحات عملاقة ترهق المتصفح)
    const maxCropDim = 2048;
    if (cropW > maxCropDim || cropH > maxCropDim) {
      const scale = Math.min(maxCropDim / cropW, maxCropDim / cropH);
      cropW = Math.max(1, Math.round(cropW * scale));
      cropH = Math.max(1, Math.round(cropH * scale));
    }

    const outCanvas = new OffscreenCanvas(cropW, cropH);
    const outCtx = outCanvas.getContext('2d');
    if (!outCtx) throw new Error('تعذر إنشاء سياق القص داخل الـ Worker');
    outCtx.imageSmoothingEnabled = true;
    outCtx.imageSmoothingQuality = 'high';
    outCtx.drawImage(
      original,
      cropX,
      cropY,
      crop.width * origW,
      crop.height * origH,
      0,
      0,
      cropW,
      cropH,
    );
    original.close();
    if (isCancelled()) return;

    // 🧹 تحرير كائن Landmarker ومصفوفة WASM فوراً
    try {
      landmarker.close();
    } catch {
      /* ignore */
    }
    landmarkerPromise = null;
    currentLandmarker = null;

    postProgress(requestId, 90, 'جاري الإنهاء ... (90%)');
    const pngBlob = await outCanvas.convertToBlob({ type: 'image/png' });
    const buffer = new Uint8Array(await pngBlob.arrayBuffer());

    // تحويل البايتات إلى Base64 بحجم كتل آمن ومضاد لفيض المكدس
    const CHUNK_SIZE = 0x2000;
    let binary = '';
    for (let i = 0; i < buffer.length; i += CHUNK_SIZE) {
      binary += String.fromCharCode(...buffer.subarray(i, i + CHUNK_SIZE));
    }

    postResult(requestId, {
      pngBase64: btoa(binary),
      outW: cropW,
      outH: cropH,
      detectedMs,
    });
  } catch (err) {
    if (!isCancelled()) {
      const message = err instanceof Error ? err.message : String(err);
      postError(
        requestId,
        message.includes('fetch') || message.includes('network')
          ? 'فشل تحميل ملفات كشف الوجه.'
          : message,
      );
    }
  }
}

ctx.onmessage = (e: MessageEvent<WorkerRequest>) => {
  const data = e.data;
  if (data.type === 'frame') {
    void handleFrame(data);
  } else if (data.type === 'warmup') {
    // ⚡ تهيئة واستدعاء مسبق لنموذج الوجه **وكشف تجريبي** أثناء خمول التطبيق
    // (التفاصيل في runWarmup). لا يرفض ولا يتداخل.
    void runWarmup(data.wasmBaseUrl, data.modelUrl);
  } else if (data.type === 'cancel') {
    if (activeRequestId === data.requestId) {
      activeRequestId = 0;
    }
  }
};

// إتاحة الإغلاق النظيف لموارد WebGL عند إنهاء الـ Worker
const handleCloseEvent = () => {
  try {
    currentLandmarker?.close();
  } catch {
    /* ignore */
  }
};
ctx.addEventListener('close', handleCloseEvent);
