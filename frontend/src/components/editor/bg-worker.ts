/**
 * bg-worker.ts - RMBG-1.4 Background Removal Worker
 * Uses @huggingface/transformers with WebGPU acceleration (WASM fallback)
 * Model: briaai/RMBG-1.4 - Industry-leading portrait background removal
 */

import {
  AutoModel,
  AutoProcessor,
  RawImage,
  env,
} from "@huggingface/transformers";

let model: any = null;
let processor: any = null;

const MODEL_ID = "briaai/RMBG-1.4";

let lastProgressTime = 0;
let lastProgressKey = "";

function notifyProgress(key: string, current: number, total: number, elementId?: string) {
  const now = Date.now();
  // إرسال التحديث فوراً إذا اكتمل التقدم، أو تغيرت المرحلة، أو مضى 100 مللي ثانية لمنع إغراق الواجهة بالرسائل
  if (current === total || key !== lastProgressKey || now - lastProgressTime > 100) {
    lastProgressTime = now;
    lastProgressKey = key;
    self.postMessage({ type: "progress", key, current, total, elementId });
  }
}

async function loadModel() {
  if (model && processor) return;

  env.allowLocalModels = false;
  env.useBrowserCache = true;
  
  // خنق عدد خيوط المعالجة لـ WASM لمنع تجمد الواجهة واستهلاك كامل طاقة المعالج (CPU Starvation)
  if (env.backends && env.backends.onnx && env.backends.onnx.wasm) {
    env.backends.onnx.wasm.numThreads = 1;
  }

  notifyProgress("fetch:model", 0, 100);

  const fileProgress: Record<string, { loaded: number; total: number }> = {};

  const progressCb = (p: any) => {
    if (p.status === "progress" && p.file && p.total) {
      fileProgress[p.file] = { loaded: p.loaded, total: p.total };

      let totalLoaded = 0;
      let totalSize = 0;
      for (const file in fileProgress) {
        totalLoaded += fileProgress[file].loaded;
        totalSize += fileProgress[file].total;
      }

      if (totalSize > 0) {
        const pct = Math.round((totalLoaded / totalSize) * 98);
        notifyProgress("fetch:model", pct, 100);
      }
    }
  };

  try {
    model = await AutoModel.from_pretrained(MODEL_ID, {
      device: "webgpu",
      progress_callback: progressCb,
    });
  } catch {
    model = await AutoModel.from_pretrained(MODEL_ID, {
      device: "wasm",
      progress_callback: progressCb,
    });
  }

  processor = await AutoProcessor.from_pretrained(MODEL_ID, {
    progress_callback: progressCb,
  });

  notifyProgress("fetch:model", 100, 100);
}

/**
 * Convert a base64 data URL or a regular URL to a Blob.
 * This avoids fetch() restrictions inside Web Workers for data: URLs.
 */
function dataUrlToBlob(dataUrl: string): Blob {
  const [header, base64Data] = dataUrl.split(",");
  const mime = header.match(/:(.*?);/)?.[1] ?? "image/jpeg";
  const binary = atob(base64Data);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new Blob([bytes], { type: mime });
}

async function removeBg(imageSrc: string, elementId?: string): Promise<Blob> {
  await loadModel();

  // ── 1. Load image: handle base64 data URLs without fetch() ──────────────
  notifyProgress("compute:decode", 10, 100, elementId);
  let image: RawImage;
  if (imageSrc.startsWith("data:")) {
    const blob = dataUrlToBlob(imageSrc);
    const blobUrl = URL.createObjectURL(blob);
    try {
      image = await RawImage.fromURL(blobUrl);
    } finally {
      URL.revokeObjectURL(blobUrl);
    }
  } else {
    image = await RawImage.fromURL(imageSrc);
  }
  notifyProgress("compute:decode", 25, 100, elementId);

  // ── 2. Preprocess: Resize image to 1024x1024 for speed and memory efficiency
  const maskInputImage = await image.resize(1024, 1024);
  const { pixel_values } = await processor(maskInputImage);
  notifyProgress("compute:preprocess", 50, 100, elementId);

  // ── 3. Model inference ───────────────────────────────────────────────────
  const { output } = await model({ input: pixel_values });
  notifyProgress("compute:inference", 75, 100, elementId);

  // ── 4. Create Grayscale Mask ─────────────────────────────────────────────
  const mask = await RawImage.fromTensor(output[0].mul(255).to("uint8"));
  notifyProgress("compute:mask", 85, 100, elementId);

  // Draw the mask on a canvas of the mask's dimensions
  const canvas = new OffscreenCanvas(mask.width, mask.height);
  const ctx = canvas.getContext("2d")!;
  const imgData = ctx.createImageData(mask.width, mask.height);
  const maskData = mask.data as Uint8Array;
  
  for (let i = 0; i < maskData.length; i++) {
    const val = maskData[i];
    const offset = i * 4;
    imgData.data[offset] = val;
    imgData.data[offset + 1] = val;
    imgData.data[offset + 2] = val;
    imgData.data[offset + 3] = 255;
  }
  ctx.putImageData(imgData, 0, 0);
  notifyProgress("compute:mask", 100, 100, elementId);

  // Export the mask as a tiny PNG
  return await canvas.convertToBlob({ type: "image/png" });
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = "";
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  const chunk = 8192;
  for (let i = 0; i < len; i += chunk) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk) as any);
  }
  return self.btoa(binary);
}

// Handle warmup requests (preload model silently)
self.onmessage = async (e: MessageEvent) => {
  const { type: msgType, imageSrc, elementId } = e.data;

  if (msgType === "warmup") {
    try {
      await loadModel();
      self.postMessage({ type: "warmup_done" });
    } catch {
      // Warmup failure is silent — will retry on actual use
    }
    return;
  }

  try {
    const blob = await removeBg(imageSrc, elementId);
    const arrayBuffer = await blob.arrayBuffer();
    const base64 = arrayBufferToBase64(arrayBuffer);
    self.postMessage({ type: "success", base64, mimeType: "image/png", elementId });
  } catch (error: any) {
    let errorMessage = error?.message || String(error);

    if (errorMessage.includes("fetch") || errorMessage.includes("network") || errorMessage.includes("Failed to fetch")) {
      errorMessage = "فشل تحميل نموذج الذكاء الاصطناعي. تحقق من الاتصال بالإنترنت عند الاستخدام الأول.";
    } else if (errorMessage.includes("memory") || errorMessage.includes("allocation")) {
      errorMessage = "الذاكرة غير كافية. جرب صورة أصغر حجماً.";
    } else if (errorMessage.includes("ImageData") || errorMessage.includes("input data length")) {
      errorMessage = "تنسيق الصورة غير متوافق. جرب تحويلها إلى JPEG أو PNG.";
    }

    self.postMessage({ type: "error", error: errorMessage, elementId });
  }
};
