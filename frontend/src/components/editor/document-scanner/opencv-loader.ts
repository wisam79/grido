/**
 * OpenCV.js lazy loader.
 *
 * - Loads the OpenCV WASM runtime on first use only.
 * - Applies a hard timeout to avoid hanging on slow networks / corrupt cache.
 * - Returns `null` permanently on any load or init failure so callers fall back
 *   to the pure-JS detection path.
 * - Retries are allowed on the next call; failure is not cached.
 */
import type cv from "@techstark/opencv-js";

export type CvRuntime = typeof cv;

let cached: CvRuntime | null = null;
let inFlight: Promise<CvRuntime | null> | null = null;

const LOAD_TIMEOUT_MS = 3_000;

/**
 * فحص فوري بدون أي انتظار لمعرفة ما إذا كان OpenCV جاهزاً ومحملاً مسبقاً
 */
export function getLoadedOpenCV(): CvRuntime | null {
  if (cached && (cached as any).Mat) return cached;
  const gCv = (globalThis as any).cv;
  if (gCv && typeof gCv.Mat === "function") {
    cached = gCv as CvRuntime;
    return cached;
  }
  return null;
}

export async function loadOpenCV(): Promise<CvRuntime | null> {
  if (cached) return cached;
  if (inFlight) return inFlight;

  inFlight = (async () => {
    try {
      let rawMod: any = null;
      try {
        const modPromise = import("@techstark/opencv-js");
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error("OpenCV WASM load timeout")), LOAD_TIMEOUT_MS);
        });
        rawMod = await Promise.race([modPromise, timeoutPromise]);
      } catch {
        rawMod = (globalThis as any).cv;
      }

      let candidate = rawMod?.default || rawMod || (globalThis as any).cv;

      if (!candidate || (!candidate.Mat && typeof candidate !== "function" && !(candidate instanceof Promise))) {
        if ((globalThis as any).cv) {
          candidate = (globalThis as any).cv;
        }
      }

      let cvRuntime: any = null;

      if (candidate && typeof candidate.then === "function") {
        try {
          cvRuntime = await candidate;
        } catch {
          cvRuntime = candidate;
        }
      } else if (typeof candidate === "function") {
        try {
          cvRuntime = await candidate();
        } catch {
          // If function call fails, use candidate object
          cvRuntime = candidate;
        }
      } else {
        cvRuntime = candidate;
      }

      let resolvedCv = cvRuntime && cvRuntime.Mat ? cvRuntime : (globalThis as any).cv;

      if (resolvedCv && typeof resolvedCv === "function") {
        try {
          resolvedCv = await resolvedCv();
        } catch {
          // ignore
        }
      }

      if (resolvedCv && typeof resolvedCv.Mat === "function") {
        cached = resolvedCv as CvRuntime;
        console.log("[OpenCV] Runtime successfully initialized");
        return cached;
      }

      // Fallback wait for onRuntimeInitialized
      const targetObj = resolvedCv || (globalThis as any).cv || candidate;
      if (targetObj) {
        await new Promise<void>((resolve, reject) => {
          let settled = false;
          const finish = () => {
            if (settled) return;
            settled = true;
            resolve();
          };
          if (typeof targetObj === "object") {
            targetObj.onRuntimeInitialized = finish;
          }
          if ((globalThis as any).Module) {
            (globalThis as any).Module.onRuntimeInitialized = finish;
          }
          const probe = () => {
            if (settled) return;
            const gCv = (globalThis as any).cv || targetObj;
            if (gCv && typeof gCv.Mat === "function") {
              cvRuntime = gCv;
              finish();
              return;
            }
            setTimeout(probe, 50);
          };
          probe();
          setTimeout(() => {
            if (!settled) reject(new Error("OpenCV WASM init timeout"));
          }, LOAD_TIMEOUT_MS);
        });

        const finalCv = (cvRuntime && cvRuntime.Mat ? cvRuntime : (globalThis as any).cv) as CvRuntime;
        if (finalCv && (finalCv as any).Mat) {
          cached = finalCv;
          console.log("[OpenCV] Runtime ready after onRuntimeInitialized");
          return finalCv;
        }
      }

      console.warn("[OpenCV] Mat constructor not found on loaded runtime");
      inFlight = null;
      return null;
    } catch (err) {
      console.warn("[OpenCV] failed to load, falling back to JS detector", err);
      inFlight = null;
      return null;
    }
  })();

  return inFlight;
}

/**
 * ⚡ استدعاء وتحميل مسبق لـ OpenCV WASM في الخلفية أثناء خمول التطبيق
 */
export function warmupOpenCV(): void {
  if (typeof window === "undefined") return;
  // Skip warmup in automated test runners to avoid blocking / slow timeouts
  const gProc = (globalThis as any).process;
  if (gProc && (gProc.env?.VITEST || gProc.env?.NODE_ENV === "test")) return;
  if (typeof WebAssembly === "undefined") return;
  void loadOpenCV().catch((err) => {
    console.debug("[OpenCV] Warmup deferred:", err);
  });
}
