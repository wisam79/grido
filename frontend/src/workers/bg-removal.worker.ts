/**
 * bg-removal.worker.ts — Web Worker لعزل الخلفية
 *
 * ينقل كامل خط المعالجة (تحميل النموذج، فك تشفير الصورة، تغيير المقاس،
 * الاستدلال، وتوليد بايتات القناع) خارج الخيط الرئيسي لمنع تجميد الواجهة.
 * الإلغاء الحقيقي يتحقق بإنهاء الـ Worker (terminate) من الجهة المضيفة.
 */

import type { ImageSegmenter } from "@mediapipe/tasks-vision";

export interface BgRemovalResult {
  maskBase64: string;
  targetW: number;
  targetH: number;
  inferredMs: number;
}

interface SegmentRequest {
  type: "segment";
  requestId: number;
  imageSrc: string;
  wasmBaseUrl: string;
  modelUrl: string;
}

interface CancelRequest {
  type: "cancel";
  requestId: number;
}

interface WarmupRequest {
  type: "warmup";
  wasmBaseUrl: string;
  modelUrl: string;
}

type WorkerRequest = SegmentRequest | CancelRequest | WarmupRequest;

const ctx: Worker = self as unknown as Worker;

const maxDim = 1024; // دقة عالية للحواف والشعر مع الحفاظ على الأداء (مطابق للمسار السابق)

let segmenterPromise: Promise<ImageSegmenter> | null = null;
let activeRequestId = 0;
let currentSegmenter: ImageSegmenter | null = null;

async function getOrCreateSegmenter(wasmBaseUrl: string, modelUrl: string): Promise<ImageSegmenter> {
  if (!segmenterPromise) {
    segmenterPromise = (async () => {
      const { FilesetResolver, ImageSegmenter } = await import("@mediapipe/tasks-vision");
      // الـ Worker وحدة ES (type: "module") فلا يملك importScripts — يجب طلب نسخة Module
      // من الـ WASM loader (vision_wasm_module_internal.js) التي تسجّل ModuleFactory على
      // globalThis عند import، وإلا يرمي FilesetResolver خطأ "ModuleFactory not set".
      const vision = await FilesetResolver.forVisionTasks(wasmBaseUrl, true);
      let seg: ImageSegmenter;
      try {
        seg = await ImageSegmenter.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: modelUrl,
            delegate: "GPU",
          },
          runningMode: "IMAGE",
          outputCategoryMask: false,
          outputConfidenceMasks: true,
        });
      } catch (gpuErr) {
        console.warn("GPU delegate failed for ImageSegmenter, falling back to CPU:", gpuErr);
        seg = await ImageSegmenter.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: modelUrl,
            delegate: "CPU",
          },
          runningMode: "IMAGE",
          outputCategoryMask: false,
          outputConfidenceMasks: true,
        });
      }
      currentSegmenter = seg;
      return seg;
    })().catch((err) => {
      segmenterPromise = null;
      throw err;
    });
  }
  return segmenterPromise;
}

function postProgress(requestId: number, percent: number, text: string) {
  ctx.postMessage({ type: "progress", requestId, percent, text });
}

function postError(requestId: number, message: string) {
  ctx.postMessage({ type: "error", requestId, message });
}

function postResult(requestId: number, result: BgRemovalResult) {
  ctx.postMessage({ type: "result", requestId, result });
}

async function handleSegment(req: SegmentRequest) {
  const { requestId } = req;
  activeRequestId = requestId;
  const isCancelled = () => activeRequestId !== requestId;

  try {
    // 1. تهيئة النموذج (يُحمّل مرة واحدة داخل عمر الـ Worker)
    postProgress(requestId, 15, "جاري تحميل النموذج ... (15%)");
    const segmenter = await getOrCreateSegmenter(req.wasmBaseUrl, req.modelUrl);
    if (isCancelled()) return;

    // 2. جلب الصورة وفك تشفيرها داخل الـ Worker
    postProgress(requestId, 35, "جاري فك تشفير الصورة ... (35%)");
    const res = await fetch(req.imageSrc);
    const blob = await res.blob();
    let imageBitmap = await createImageBitmap(blob);
    if (isCancelled()) {
      imageBitmap.close();
      return;
    }

    // 3. تغيير المقاس قبل الاستدلال لحماية الذاكرة
    postProgress(requestId, 55, "جاري المعالجة المسبقة ... (55%)");
    let targetW = imageBitmap.width;
    let targetH = imageBitmap.height;
    if (targetW > maxDim || targetH > maxDim) {
      const ratio = Math.min(maxDim / targetW, maxDim / targetH);
      targetW = Math.round(targetW * ratio);
      targetH = Math.round(targetH * ratio);
    }

    const offscreen = new OffscreenCanvas(targetW, targetH);
    const octx = offscreen.getContext("2d", { willReadFrequently: true });
    if (!octx) throw new Error("تعذر إنشاء سياق الرسم داخل الـ Worker");
    octx.drawImage(imageBitmap, 0, 0, targetW, targetH);
    imageBitmap.close();
    imageBitmap = null as unknown as ImageBitmap;

    const imageData = octx.getImageData(0, 0, targetW, targetH);
    if (isCancelled()) return;

    // 4. الاستدلال الفعلي مع قياس المدة الحقيقي
    postProgress(requestId, 75, "جاري عزل الخلفية ... (75%)");
    const start = performance.now();
    const result = segmenter.segment(imageData);
    const inferredMs = Math.round(performance.now() - start);

    let maskBytes: Uint8Array | null = null;
    try {
      const confidenceMasks = result.confidenceMasks;
      if (!confidenceMasks || confidenceMasks.length === 0) {
        throw new Error("لم يتمكن النموذج من تحديد الشخص في الصورة");
      }

      postProgress(requestId, 90, "جاري توليد الصورة النهائية ... (90%)");
      const bgMaskData = confidenceMasks[0].getAsFloat32Array();
      maskBytes = new Uint8Array(bgMaskData.length);

      for (let i = 0; i < bgMaskData.length; i++) {
        const fgProb = 1.0 - bgMaskData[i];
        // توازن دقيق ومحسوب (0.35 إلى 0.68): إزالة حافة البكسلات البيضاء دون اقتطاع الشعر أو الملابس
        if (fgProb < 0.35) {
          maskBytes[i] = 0;
        } else if (fgProb > 0.68) {
          maskBytes[i] = 255;
        } else {
          const normalized = (fgProb - 0.35) / (0.68 - 0.35);
          const smooth = normalized * normalized * (3 - 2 * normalized); // Smoothstep S-curve
          maskBytes[i] = Math.round(smooth * 255);
        }
      }
    } finally {
      try { result.close(); } catch { /* تجاهل أخطاء الإغلاق */ }
    }

    if (isCancelled()) return;

    // تحويل بايتات القناع إلى Base64 بحجم كتل آمن ومضاد لفيض المكدس (Call Stack Overflow Protection)
    postProgress(requestId, 95, "تجهيز القناع... (95%)");
    const CHUNK_SIZE = 0x2000; // 8192 - حجم مثالي وآمن كلياً في محركات JS
    let binary = "";
    for (let i = 0; i < maskBytes.length; i += CHUNK_SIZE) {
      binary += String.fromCharCode(...maskBytes.subarray(i, i + CHUNK_SIZE));
    }

    postResult(requestId, { maskBase64: btoa(binary), targetW, targetH, inferredMs });
  } catch (err) {
    if (!isCancelled()) {
      const message = err instanceof Error ? err.message : String(err);
      postError(requestId, message.includes("fetch") || message.includes("network")
        ? "فشل تحميل ملفات معالجة الذكاء الاصطناعي."
        : message);
    }
  }
}

ctx.onmessage = (e: MessageEvent<WorkerRequest>) => {
  const data = e.data;
  if (data.type === "segment") {
    void handleSegment(data);
  } else if (data.type === "warmup") {
    // ⚡ تهيئة واستدعاء مسبق للنموذج أثناء خمول التطبيق لتصفير زمن أول نقرة
    void getOrCreateSegmenter(data.wasmBaseUrl, data.modelUrl).catch((err) => {
      console.debug("[BG-Removal Worker] Warmup deferred:", err);
    });
  } else if (data.type === "cancel") {
    // إبطال أي عملية جارية بنفس الـ id (الإلغاء القسري الكامل يتم عبر terminate من المضيف)
    if (activeRequestId === data.requestId) {
      activeRequestId = 0;
    }
  }
};

// إتاحة الإغلاق النظيف لموارد WebGL عند إنهاء الـ Worker
ctx.addEventListener("close", () => {
  try { currentSegmenter?.close(); } catch { /* ignore */ }
});
