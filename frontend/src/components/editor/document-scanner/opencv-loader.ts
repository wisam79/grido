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
import type { CvRuntimeLike } from "./core/cv-types";
import { createLogger } from "@/lib/logger";

export type CvRuntime = typeof cv;

const logger = createLogger("OpenCV");

let cached: CvRuntime | null = null;
let inFlight: Promise<CvRuntime | null> | null = null;

const LOAD_TIMEOUT_MS = 3_000;

/** Minimal structural probe used to confirm a candidate is the cv runtime. */
function hasMatConstructor(value: unknown): value is CvRuntimeLike {
  return (
    !!value &&
    typeof value === "object" &&
    typeof (value as CvRuntimeLike).Mat === "function"
  );
}

interface GlobalWithCv {
  cv?: unknown;
  Module?: { onRuntimeInitialized?: () => void };
  process?: { env?: Record<string, string | undefined> };
}

function getGlobal(): GlobalWithCv {
  return globalThis as unknown as GlobalWithCv;
}

/**
 * فحص فوري بدون أي انتظار لمعرفة ما إذا كان OpenCV جاهزاً ومحملاً مسبقاً
 */
export function getLoadedOpenCV(): CvRuntime | null {
  if (hasMatConstructor(cached)) return cached;
  const gCv = getGlobal().cv;
  if (hasMatConstructor(gCv)) {
    cached = gCv as unknown as CvRuntime;
    return cached;
  }
  return null;
}

export async function loadOpenCV(): Promise<CvRuntime | null> {
  if (cached) return cached;
  if (inFlight) return inFlight;

  inFlight = (async () => {
    try {
      let rawMod: unknown = null;
      try {
        const modPromise = import("@techstark/opencv-js");
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error("OpenCV WASM load timeout")), LOAD_TIMEOUT_MS);
        });
        rawMod = await Promise.race([modPromise, timeoutPromise]);
      } catch {
        rawMod = getGlobal().cv;
      }

      const modRecord = rawMod as { default?: unknown } | null;
      let candidate: unknown = modRecord?.default || rawMod || getGlobal().cv;

      if (!candidate || !hasMatConstructor(candidate)) {
        if (getGlobal().cv) {
          candidate = getGlobal().cv;
        }
      }

      let cvRuntime: unknown = null;

      const thenable = candidate as { then?: unknown } | null;
      if (candidate && typeof thenable?.then === "function") {
        try {
          cvRuntime = await candidate;
        } catch {
          cvRuntime = candidate;
        }
      } else if (typeof candidate === "function") {
        try {
          cvRuntime = await (candidate as () => unknown)();
        } catch {
          // If function call fails, use candidate object
          cvRuntime = candidate;
        }
      } else {
        cvRuntime = candidate;
      }

      let resolvedCv: unknown = hasMatConstructor(cvRuntime) ? cvRuntime : getGlobal().cv;

      if (typeof resolvedCv === "function") {
        try {
          resolvedCv = await (resolvedCv as () => unknown)();
        } catch {
          // ignore
        }
      }

      if (hasMatConstructor(resolvedCv)) {
        cached = resolvedCv as unknown as CvRuntime;
        logger.info("Runtime successfully initialized");
        return cached;
      }

      // Fallback wait for onRuntimeInitialized
      const targetObj = (resolvedCv || getGlobal().cv || candidate) as
        | { onRuntimeInitialized?: () => void }
        | null
        | undefined;
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
          const gModule = getGlobal().Module;
          if (gModule) {
            gModule.onRuntimeInitialized = finish;
          }
          const probe = () => {
            if (settled) return;
            const gCv = getGlobal().cv || targetObj;
            if (hasMatConstructor(gCv)) {
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

        const finalCv = (hasMatConstructor(cvRuntime) ? cvRuntime : getGlobal().cv) as unknown as CvRuntime | undefined;
        if (finalCv && hasMatConstructor(finalCv)) {
          cached = finalCv;
          logger.info("Runtime ready after onRuntimeInitialized");
          return finalCv;
        }
      }

      logger.warn("Mat constructor not found on loaded runtime");
      inFlight = null;
      return null;
    } catch (err) {
      logger.warn("failed to load, falling back to JS detector", err);
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
  const gProc = getGlobal().process;
  if (gProc && (gProc.env?.VITEST || gProc.env?.NODE_ENV === "test")) return;
  if (typeof WebAssembly === "undefined") return;
  void loadOpenCV().catch((err) => {
    logger.debug("Warmup deferred:", err);
  });
}
