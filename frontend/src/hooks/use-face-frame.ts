import { useState, useEffect, useRef } from "react";
import { useEditorStore } from "@/lib/editor-store";
import { toast } from "sonner";
import { SaveImageFromBase64 } from "../../wailsjs/go/main/App";
import { preloadImageIntoCache } from "./use-async-image";
import type { CanvasElement, CanvasSlot } from "@/lib/store/types";

/**
 * useFaceFrame — يضبط مقاس وموضع الوجه تلقائياً وفق معايير صور الهوية
 * داخل Web Worker حقيقي (face-frame.worker.ts) ليبقى الخيط الرئيسي حراً.
 * ميزة محلية 100% (بدون خادم/تكلفة) — متاحة لجميع المستخدمين بدون بوابة ترخيص.
 * الإلغاء = terminate قسري فوري للـ Worker.
 */

export type FramingPatch = Partial<any>;

interface FrameWorkerProgressMessage {
  type: "progress";
  requestId: number;
  percent: number;
  text: string;
}
interface FrameWorkerErrorMessage {
  type: "error";
  requestId: number;
  message: string;
}
interface FrameWorkerResultMessage {
  type: "result";
  requestId: number;
  result: {
    pngBase64: string;
    outW: number;
    outH: number;
    detectedMs: number;
  };
}
type FrameWorkerMessage = FrameWorkerProgressMessage | FrameWorkerErrorMessage | FrameWorkerResultMessage;

let workerInstance: Worker | null = null;
let nextRequestId = 1;

// قفل مشترك على مستوى الوحدة (نفس نهج عزل الخلفية) — Worker واحد للتطبيق كله،
// وكل المثيلات (الشريط السريع + لوحة الخصائص) تشارك سجل الطلبات المعلقة.
let busyFrameRequestId = 0;

interface PendingFrameRequest {
  onMessage: (msg: FrameWorkerMessage) => void;
  onError: (message: string) => void;
}
const pendingFrameRequests = new Map<number, PendingFrameRequest>();

function getWorker(): Worker {
  if (!workerInstance) {
    workerInstance = new Worker(
      new URL("../workers/face-frame.worker.ts", import.meta.url),
      { type: "module" }
    );
    workerInstance.onmessage = (e: MessageEvent) => {
      const msg = e.data as FrameWorkerMessage | undefined;
      if (!msg || typeof msg.requestId !== "number") return;
      pendingFrameRequests.get(msg.requestId)?.onMessage(msg);
    };
    workerInstance.onerror = (e) => {
      for (const pending of pendingFrameRequests.values()) {
        pending.onError(e.message || "فشل تشغيل عامل ضبط الوجه.");
      }
    };
  }
  return workerInstance;
}

function terminateWorker() {
  pendingFrameRequests.clear();
  busyFrameRequestId = 0;
  if (workerInstance) {
    try {
      workerInstance.terminate();
    } catch {
      /* ignore */
    }
    workerInstance = null;
  }
}

// تنظيف الـ Worker عند إغلاق التطبيق لتحرير ذاكرة WebGL فوراً
if (typeof window !== "undefined") {
  const handleBeforeUnload = () => terminateWorker();
  window.addEventListener("beforeunload", handleBeforeUnload);
}

/**
 * ⚡ استدعاء مسبق لنموذج كشف الوجه في الخلفية أثناء خمول التطبيق
 */
export function warmupFaceFrameWorker() {
  try {
    if (typeof window === "undefined" || typeof Worker === "undefined") return;
    const worker = getWorker();
    worker.postMessage({
      type: "warmup",
      wasmBaseUrl: `${window.location.origin}/wasm`,
      modelUrl: `${window.location.origin}/models/face_landmarker.task`,
    });
  } catch (err) {
    console.debug("[useFaceFrame] Warmup skipped:", err);
  }
}

type FramingTarget = CanvasElement | CanvasSlot;

export function useFaceFrame(onUpdate: (id: string, patch: FramingPatch) => void) {
  const onUpdateRef = useRef(onUpdate);
  useEffect(() => {
    onUpdateRef.current = onUpdate;
  }, [onUpdate]);

  const [isFraming, setIsFraming] = useState(false);
  const [frameProgress, setFrameProgress] = useState(0);
  const [frameProgressText, setFrameProgressText] = useState("");
  const modelCachedRef = useRef(false);
  const activeRequestRef = useRef<number>(0);

  useEffect(() => {
    return () => {
      const reqId = activeRequestRef.current;
      if (reqId) {
        pendingFrameRequests.delete(reqId);
        if (busyFrameRequestId === reqId) busyFrameRequestId = 0;
        activeRequestRef.current = 0;
      }
    };
  }, []);

  const handleCancelFrame = () => {
    activeRequestRef.current = 0;
    terminateWorker();
    setIsFraming(false);
    setFrameProgress(0);
    setFrameProgressText("");
    toast.info("تم إيقاف العملية.");
  };

  const handleFrameFace = async (target: FramingTarget) => {
    const imageSrc = "imageSrc" in target ? target.imageSrc : undefined;
    if (!imageSrc) return;

    if (busyFrameRequestId !== 0) {
      toast.warning("هناك عملية ضبط وجه قيد التنفيذ حالياً. يرجى الانتظار.");
      return;
    }

    if (typeof Worker === "undefined") {
      toast.error("بيئة التشغيل الحالية لا تدعم Web Workers المطلوبة لضبط الوجه.");
      return;
    }

    setIsFraming(true);
    setFrameProgress(0);
    setFrameProgressText("جاري التهيئة ...");

    const requestId = nextRequestId++;
    busyFrameRequestId = requestId;
    activeRequestRef.current = requestId;
    const worker = getWorker();
    const startedAt = performance.now();

    const settle = () => {
      pendingFrameRequests.delete(requestId);
      if (busyFrameRequestId === requestId) busyFrameRequestId = 0;
      if (activeRequestRef.current === requestId) activeRequestRef.current = 0;
      setIsFraming(false);
      setFrameProgressText("");
      setFrameProgress(0);
    };

    pendingFrameRequests.set(requestId, {
      onError: (message: string) => {
        if (activeRequestRef.current !== requestId) return;
        settle();
        toast.error(message);
      },
      onMessage: async (msg: FrameWorkerMessage) => {
        if (activeRequestRef.current !== requestId) return;

        if (msg.type === "progress") {
          setFrameProgress(msg.percent);
          setFrameProgressText(msg.text);
          return;
        }

        if (msg.type === "error") {
          settle();
          toast.error(msg.message);
          return;
        }

        if (msg.type === "result") {
          const { pngBase64, outW, outH, detectedMs } = msg.result;

          try {
            setFrameProgressText("حفظ الصورة المقتصة...");
            const dataUrl = `data:image/png;base64,${pngBase64}`;
            const localPath = await SaveImageFromBase64(dataUrl);
            await preloadImageIntoCache(localPath);

            const patch: FramingPatch = { imageSrc: localPath };
            if ("originalImageSrc" in target && !target.originalImageSrc) {
              patch.originalImageSrc = imageSrc;
            }
            // في وضع الكولاج: الصورة المقتصة تطابق نسبة الخلية تماماً
            // فتصبح الإزاحة والزوم السابقة غير ضرورية — نُصفرهما لتطابق مثالي.
            if (!("width" in target)) {
              patch.zoom = 1;
              patch.dragX = 0;
              patch.dragY = 0;
            }
            onUpdateRef.current(target.id, patch);
            useEditorStore.getState().pushHistory();

            modelCachedRef.current = true;
            const totalSec = Math.round((performance.now() - startedAt) / 100) / 10;
            console.debug(`[Face-Frame] detection: ${detectedMs}ms, crop: ${outW}x${outH}, total: ${totalSec}s`);
            toast.success("تم ضبط مقاس الوجه وموضعه وفق معايير الهوية.");
          } catch (err) {
            console.error("Failed to save framed image:", err);
            toast.error("فشل حفظ الصورة بعد ضبط الوجه.");
          } finally {
            settle();
          }
        }
      },
    });

    // نسبة أبعاد إطار الهوية الحالي (صندوق العنصر/الخلية بالبكسل)
    const state = useEditorStore.getState();
    const canvasW = state.canvasWidth || 1;
    const canvasH = state.canvasHeight || 1;
    const isSlotTarget = !("width" in target);
    let aspectRatio = 1;
    if (isSlotTarget) {
      const slot = target as CanvasSlot;
      aspectRatio = (slot.w * canvasW) / (slot.h * canvasH);
    } else {
      const el = target as CanvasElement;
      aspectRatio = (el.width * canvasW) / (el.height * canvasH);
    }
    if (!(aspectRatio > 0) || !Number.isFinite(aspectRatio)) {
      aspectRatio = 1;
    }

    worker.postMessage({
      type: "frame",
      requestId,
      imageSrc,
      wasmBaseUrl: `${window.location.origin}/wasm`,
      modelUrl: `${window.location.origin}/models/face_landmarker.task`,
      aspectRatio,
    });
  };

  return {
    isFraming,
    frameProgress,
    frameProgressText,
    handleCancelFrame,
    handleFrameFace,
  };
}
