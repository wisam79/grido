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

function notifyProgress(key: string, current: number, total: number) {
  self.postMessage({ type: "progress", key, current, total });
}

async function loadModel() {
  if (model && processor) return;

  env.allowLocalModels = false;
  env.useBrowserCache = true;

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

async function removeBg(imageSrc: string): Promise<Blob> {
  await loadModel();

  // ── 1. Load image: handle base64 data URLs without fetch() ──────────────
  notifyProgress("compute:decode", 10, 100);
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
  notifyProgress("compute:decode", 30, 100);

  // ── 2. Preprocess ────────────────────────────────────────────────────────
  const { pixel_values } = await processor(image);
  notifyProgress("compute:preprocess", 50, 100);

  // ── 3. Model inference ───────────────────────────────────────────────────
  const { output } = await model({ input: pixel_values });
  notifyProgress("compute:inference", 75, 100);

  // ── 4. Resize mask to original image dimensions ──────────────────────────
  const mask = await RawImage.fromTensor(output[0].mul(255).to("uint8"))
    .resize(image.width, image.height);
  notifyProgress("compute:mask", 85, 100);

  // ── 5. Draw original image on OffscreenCanvas ─────────────────────────────
  //    Using createImageBitmap from the original blob avoids RGB/RGBA issues
  const canvas = new OffscreenCanvas(image.width, image.height);
  const ctx = canvas.getContext("2d")!;

  const sourceBlob = imageSrc.startsWith("data:")
    ? dataUrlToBlob(imageSrc)
    : await (await fetch(imageSrc)).blob();

  const bitmap = await createImageBitmap(sourceBlob);
  ctx.drawImage(bitmap, 0, 0, image.width, image.height);
  bitmap.close();

  // ── 6. Apply alpha mask channel ────────────────────────────────────────────
  const imgData = ctx.getImageData(0, 0, image.width, image.height);
  const maskData = mask.data as Uint8Array;
  for (let i = 0; i < maskData.length; i++) {
    imgData.data[i * 4 + 3] = maskData[i];
  }
  ctx.putImageData(imgData, 0, 0);
  notifyProgress("compute:mask", 100, 100);

  // ── 7. Export transparent PNG ─────────────────────────────────────────────
  return await canvas.convertToBlob({ type: "image/png" });
}

// Handle warmup requests (preload model silently)
self.onmessage = async (e: MessageEvent) => {
  const { type: msgType, imageSrc } = e.data;

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
    const blob = await removeBg(imageSrc);
    self.postMessage({ type: "success", blob });
  } catch (error: any) {
    let errorMessage = error?.message || String(error);

    if (errorMessage.includes("fetch") || errorMessage.includes("network") || errorMessage.includes("Failed to fetch")) {
      errorMessage = "فشل تحميل نموذج الذكاء الاصطناعي. تحقق من الاتصال بالإنترنت عند الاستخدام الأول.";
    } else if (errorMessage.includes("memory") || errorMessage.includes("allocation")) {
      errorMessage = "الذاكرة غير كافية. جرب صورة أصغر حجماً.";
    } else if (errorMessage.includes("ImageData") || errorMessage.includes("input data length")) {
      errorMessage = "تنسيق الصورة غير متوافق. جرب تحويلها إلى JPEG أو PNG.";
    }

    self.postMessage({ type: "error", error: errorMessage });
  }
};
