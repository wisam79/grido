import { env } from "onnxruntime-web";
import { removeBackground } from "@imgly/background-removal";

self.onmessage = async (e: MessageEvent) => {
  const { imageSrc, baseUrl } = e.data;
  try {
    // Use baseUrl provided from main thread if available, fallback to self.location.origin
    const originUrl = baseUrl || self.location.origin;
    
    // Disable multi-threading and SIMD to avoid COOP/COEP issues in Wails WebView2
    env.wasm.numThreads = 1;
    env.wasm.simd = false;

    // Construct absolute URLs to avoid both CORS and "Invalid base URL" errors
    const publicPath = new URL("/models/", originUrl).href;
    const publicOrtPath = new URL("/onnxruntime-web-v2/", originUrl).href;
    env.wasm.wasmPaths = publicOrtPath;

    const resultBlob = await removeBackground(imageSrc, {
      publicPath: publicPath,
      proxyToWorker: false,
      progress: (key, current, total) => {
        self.postMessage({ type: "progress", key, current, total });
      },
    });
    self.postMessage({ type: "success", blob: resultBlob });
  } catch (error: any) {
    // Enhance error handling with descriptive messages
    let errorMessage = error.message || String(error);
    if (errorMessage.includes("fetch") || errorMessage.includes("Network") || errorMessage.includes("Failed to fetch")) {
      errorMessage = `فشل في تحميل النماذج (${errorMessage})`;
    } else if (errorMessage.toLowerCase().includes("memory") || errorMessage.includes("out of bounds") || errorMessage.includes("allocation")) {
      errorMessage = "الذاكرة غير كافية لمعالجة الصورة. جرب استخدام صورة أصغر حجماً.";
    }
    self.postMessage({ type: "error", error: errorMessage });
  }
};
