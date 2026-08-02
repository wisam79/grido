import { useState, useEffect, useRef } from "react";
import { useEditorStore } from "@/lib/editor-store";
import { toast } from "sonner";
import { ApplyMaskToImage } from "../../wailsjs/go/main/App";
import { preloadImageIntoCache } from "./use-async-image";

/**
 * useBgRemoval — يشغّل عزل الخلفية داخل Web Worker حقيقي (bg-removal.worker.ts)
 * ليبقى الخيط الرئيسي حراً أثناء تحميل النموذج والاستدلال.
 * الإلغاء = terminate قسري فوري للـ Worker (يوقف حتى الاستدلال الجزئي ويحرر WebGL).
 */

let workerInstance: Worker | null = null;
let nextRequestId = 1;

// حالة «عملية جارية» مشتركة على مستوى الوحدة: الـ Worker واحد للتطبيق كله،
// لكن كل مثيل Hook كان يمتلك isBusyRef خاصاً — فكان مثيلان (الشريط السريع
// واللوحة الجانبية) يبدآن عمليتين على العامل نفسه ويُعاد تعيين onmessage
// فتضيع نتيجة الأولى. الحل: قفل مشترك + توزيع رسائل العامل على مالك requestId.
let busyRequestId = 0;

interface PendingBgRequest {
  onMessage: (msg: any) => void;
  onError: (message: string) => void;
}
const pendingBgRequests = new Map<number, PendingBgRequest>();

function getWorker(): Worker {
  if (!workerInstance) {
    workerInstance = new Worker(
      new URL("../workers/bg-removal.worker.ts", import.meta.url),
      { type: "module" }
    );
    // موزّع رسائل واحد ثابت — لا يُعاد تعيينه مع كل طلب جديد
    workerInstance.onmessage = (e: MessageEvent) => {
      const msg = e.data;
      if (!msg || typeof msg.requestId !== "number") return;
      pendingBgRequests.get(msg.requestId)?.onMessage(msg);
    };
    workerInstance.onerror = (e) => {
      for (const pending of pendingBgRequests.values()) {
        pending.onError(e.message || "فشل تشغيل عامل عزل الخلفية.");
      }
    };
  }
  return workerInstance;
}

function terminateWorker() {
  // أي مكالمة terminate تُسقط كل الطلبات المعلقة (العملية المشتركة تموت)
  pendingBgRequests.clear();
  busyRequestId = 0;
  if (workerInstance) {
    try { workerInstance.terminate(); } catch { /* ignore */ }
    workerInstance = null;
  }
}

// تنظيف الـ Worker عند إغلاق التطبيق لتحرير ذاكرة WebGL فوراً
if (typeof window !== "undefined") {
  const handleBeforeUnload = () => terminateWorker();
  window.addEventListener("beforeunload", handleBeforeUnload);
}

export function useBgRemoval(onUpdate: (id: string, patch: Partial<any>) => void) {
  const onUpdateRef = useRef(onUpdate);
  useEffect(() => {
    onUpdateRef.current = onUpdate;
  }, [onUpdate]);

  const [isRemovingBg, setIsRemovingBg] = useState(false);
  const [bgProgress, setBgProgress] = useState(0);
  const [bgProgressText, setBgProgressText] = useState("");
  const modelCachedRef = useRef(false);
  const activeRequestRef = useRef<number>(0);

  useEffect(() => {
    return () => {
      // عنصر مفكوك أثناء عملية جارية — نُسقط طلبه من السجل ونحرر القفل المشترك
      // إن كان هو مالكه (وإلا تبقى العمليات الأخرى محظورة للأبد).
      const reqId = activeRequestRef.current;
      if (reqId) {
        pendingBgRequests.delete(reqId);
        if (busyRequestId === reqId) busyRequestId = 0;
        activeRequestRef.current = 0;
      }
    };
  }, []);

  const handleCancelBgRemoval = () => {
    // 🛑 إلغاء قسري حقيقي: إنهاء الـ Worker يوقف الاستدلال فوراً حتى في منتصفه
    // (النموذج سيُعاد تحميله عند الاستخدام التالي — مقايضة مقبولة مقابل استجابة الواجهة).
    // terminateWorker يسقط كل الطلبات المعلقة من القفل المشترك.
    activeRequestRef.current = 0;
    terminateWorker();
    setIsRemovingBg(false);
    setBgProgress(0);
    setBgProgressText("");
    toast.info("تم إيقاف العملية.");
  };

  const handleRemoveBg = async (element: any) => {
    if (!element.imageSrc) return;

    // التحقق من صلاحية الترخيص
    const isLicenseActive = useEditorStore.getState().isLicenseActive;
    if (!isLicenseActive()) {
      toast.error("ميزة عزل الخلفية متوفرة فقط في الخطة الاحترافية (Pro).", {
        action: {
          label: "تفعيل الآن",
          onClick: () => {
            useEditorStore.getState().setAccountModalOpen(true);
          }
        }
      });
      return;
    }

    // القفل على مستوى الوحدة — أي مثيل Hook آخر يرى العملية الجارية
    if (busyRequestId !== 0) {
      toast.warning("هناك عملية إزالة خلفية قيد التنفيذ حالياً. يرجى الانتظار.");
      return;
    }

    if (typeof Worker === "undefined") {
      toast.error("بيئة التشغيل الحالية لا تدعم Web Workers المطلوبة لعزل الخلفية.");
      return;
    }

    setIsRemovingBg(true);
    setBgProgress(0);
    setBgProgressText("جاري التهيئة...");

    const requestId = nextRequestId++;
    busyRequestId = requestId;
    activeRequestRef.current = requestId;
    const worker = getWorker();
    const startedAt = performance.now();

    // إنهاء مشترك بين المسارات الثلاثة (نتيجة/خطأ/إلغاء خارجي)
    const settle = () => {
      pendingBgRequests.delete(requestId);
      if (busyRequestId === requestId) busyRequestId = 0;
      if (activeRequestRef.current === requestId) activeRequestRef.current = 0;
      setIsRemovingBg(false);
      setBgProgressText("");
      setBgProgress(0);
    };

    pendingBgRequests.set(requestId, {
      onError: (message: string) => {
        if (activeRequestRef.current !== requestId) return;
        settle();
        toast.error(message);
      },
      onMessage: async (msg: any) => {
        if (activeRequestRef.current !== requestId) return;

        if (msg.type === "progress") {
          setBgProgress(msg.percent);
          setBgProgressText(msg.text);
          return;
        }

        if (msg.type === "error") {
          settle();
          toast.error(msg.message);
          return;
        }

        if (msg.type === "result") {
          const { maskBase64, targetW, targetH, inferredMs } = msg.result as {
          maskBase64: string; targetW: number; targetH: number; inferredMs: number;
        };

        // مؤشر «العزل» يبقى ظاهراً حتى تُطبَّق النتيجة وتُفكّضغط في كاش الصور،
        // وبعدها نُسقط المؤشر في نفس الإطار — فلا تظهر «فجوة» بينه وبين الكانفس.
        try {
          setBgProgressText("تجهيز الصورة...");
          const localPath = await ApplyMaskToImage(element.imageSrc || "", maskBase64, targetW, targetH);
          await preloadImageIntoCache(localPath);

          // 🔒 تعيين originalImageSrc في المرّة الأولى فقط لمنع فقدان الصورة الأصلية
          const patch: Partial<any> = { imageSrc: localPath };
          if (!element.originalImageSrc) {
            patch.originalImageSrc = element.imageSrc;
          }
          onUpdateRef.current(element.id, patch);
          useEditorStore.getState().pushHistory();
          toast.success("تم عزل خلفية الصورة بنجاح ✨");

          // ⏱️ توثيق القياسات الفعلية بدلاً من القيم الثابتة (الاستدلال محلي — لا تكلفة سحابية)
          const totalSec = Math.round((performance.now() - startedAt) / 100) / 10;
          const user = useEditorStore.getState().user;
          useEditorStore.getState().logAiUsage({
            email: user?.email || "unknown",
            serviceName: "عزل الخلفية الذكي (AI Background Removal)",
            source: "Grido Studio Desktop (Windows)",
            durationSec: totalSec,
            costUsd: 0,
            status: "success",
          });
          modelCachedRef.current = true;
          if (inferredMs > 0) {
            // قياس زمن الاستدلال الخام متاح في وحدة التحكم للتشخيص
            console.debug(`[BG-Removal] inference: ${inferredMs}ms, total: ${totalSec}s`);
          }
        } catch (err) {
          console.error("Failed to apply background mask:", err);
          toast.error("فشل تجهيز الصورة النهائية بعد العزل.");
        } finally {
          // إسقاط المؤشر بعد تطبيق النتيجة (أو فشلها) — يحدث التبديل في نفس الدفعة
          settle();
        }
        }
      },
    });

    worker.postMessage({
      type: "segment",
      requestId,
      imageSrc: element.imageSrc,
      wasmBaseUrl: `${window.location.origin}/wasm`,
      modelUrl: `${window.location.origin}/models/selfie_multiclass.tflite`,
    });
  };

  return {
    isRemovingBg,
    bgProgress,
    bgProgressText,
    handleCancelBgRemoval,
    handleRemoveBg,
  };
}
