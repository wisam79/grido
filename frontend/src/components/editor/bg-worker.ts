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

  const progressCb = (p: any) => {
    if (p.status === "progress" && p.total) {
      const pct = Math.round((p.loaded / p.total) * 80);
      notifyProgress("fetch:model", pct, 100);
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

  notifyProgress("fetch:model", 85, 100);

  processor = await AutoProcessor.from_pretrained(MODEL_ID, {
    progress_callback: (p: any) => {
      if (p.status === "progress" && p.total) {
        const pct = 85 + Math.round((p.loaded / p.total) * 12);
        notifyProgress("fetch:processor", pct, 100);
      }
    },
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

  // حفظ الأبعاد الأصلية للصورة
  const originalW = image.width;
  const originalH = image.height;

  // تصغير الصورة تلقائياً إذا كانت ضخمة لحماية الذاكرة وتسريع المعالجة
  const MAX_DIM = 2048;
  if (image.width > MAX_DIM || image.height > MAX_DIM) {
    let newW, newH;
    if (image.width > image.height) {
      newW = MAX_DIM;
      newH = Math.round((image.height * MAX_DIM) / image.width);
    } else {
      newH = MAX_DIM;
      newW = Math.round((image.width * MAX_DIM) / image.height);
    }
    image = await image.resize(newW, newH);
  }
  notifyProgress("compute:decode", 30, 100, elementId);

  // ── 2. Preprocess ────────────────────────────────────────────────────────
  const { pixel_values } = await processor(image);
  notifyProgress("compute:preprocess", 50, 100, elementId);

  // ── 3. Model inference ───────────────────────────────────────────────────
  const { output } = await model({ input: pixel_values });
  notifyProgress("compute:inference", 75, 100, elementId);

  // ── 4. Resize mask to original image dimensions ──────────────────────────
  const mask = await RawImage.fromTensor(output[0].mul(255).to("uint8"))
    .resize(originalW, originalH);
  notifyProgress("compute:mask", 85, 100, elementId);

  // ── 5. Draw original image on OffscreenCanvas ─────────────────────────────
  //    Using createImageBitmap from the original blob avoids RGB/RGBA issues
  const canvas = new OffscreenCanvas(originalW, originalH);
  const ctx = canvas.getContext("2d")!;

  const sourceBlob = imageSrc.startsWith("data:")
    ? dataUrlToBlob(imageSrc)
    : await (await fetch(imageSrc)).blob();

  const bitmap = await createImageBitmap(sourceBlob);
  ctx.drawImage(bitmap, 0, 0, originalW, originalH);
  bitmap.close();

  // ── 6. Apply alpha mask channel ────────────────────────────────────────────
  const imgData = ctx.getImageData(0, 0, originalW, originalH);
  const maskData = mask.data as Uint8Array;
  for (let i = 0; i < maskData.length; i++) {
    imgData.data[i * 4 + 3] = maskData[i];
  }
  ctx.putImageData(imgData, 0, 0);
  notifyProgress("compute:mask", 100, 100, elementId);

  // ── 7. Export transparent PNG ─────────────────────────────────────────────
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
