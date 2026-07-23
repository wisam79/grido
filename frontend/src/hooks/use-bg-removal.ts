import { useState, useEffect, useRef } from "react";
import { useEditorStore } from "@/lib/editor-store";
import { FilesetResolver, ImageSegmenter } from "@mediapipe/tasks-vision";
import { toast } from "sonner";
import { ApplyMaskToImage } from "../../wailsjs/go/main/App";

// [FIX #3] تخزين الـ Promise نفسها (لا النتيجة) لمنع race condition عند استدعاءات متزامنة
let segmenterPromise: Promise<ImageSegmenter> | null = null;

async function getSegmenter() {
  if (!segmenterPromise) {
    const baseUrl = window.location.origin;
    segmenterPromise = (async () => {
      const vision = await FilesetResolver.forVisionTasks(`${baseUrl}/wasm`);
      return ImageSegmenter.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: `${baseUrl}/models/selfie_multiclass.tflite`,
          delegate: "GPU",
        },
        runningMode: "IMAGE",
        outputCategoryMask: false,
        outputConfidenceMasks: true,
      });
    })().catch((err) => {
      // إعادة تعيين الـ Promise عند الفشل للسماح بإعادة المحاولة
      segmenterPromise = null;
      throw err;
    });
  }
  return segmenterPromise;
}

if (typeof window !== "undefined") {
  window.addEventListener("beforeunload", () => {
    if (segmenterPromise) {
      segmenterPromise.then((seg) => {
        try { seg.close(); } catch (e) { /* Ignore errors during unload */ }
      }).catch(() => {});
    }
  });
}

export function useBgRemoval(onUpdate: (id: string, patch: Partial<any>) => void) {
  const onUpdateRef = useRef(onUpdate);
  useEffect(() => {
    onUpdateRef.current = onUpdate;
  }, [onUpdate]);

  const [isRemovingBg, setIsRemovingBg] = useState(false);
  const [bgProgress, setBgProgress] = useState(0);
  const [bgProgressText, setBgProgressText] = useState("");
  const isWorkerBusyRef = useRef(false);
  const modelCachedRef = useRef(false);

  useEffect(() => {
    return () => {
      isWorkerBusyRef.current = false;
    };
  }, []);

  const handleCancelBgRemoval = () => {
    setIsRemovingBg(false);
    isWorkerBusyRef.current = false;
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

    if (isWorkerBusyRef.current) {
      toast.warning("هناك عملية إزالة خلفية قيد التنفيذ حالياً. يرجى الانتظار.");
      return;
    }

    if (!modelCachedRef.current) {
      toast.info(
        "جاري تشغيل نموذج عزل الخلفية الذكي محلياً 100% بدون إنترنت.",
        { duration: 3000, id: "bg-model-notice" }
      );
    }

    setIsRemovingBg(true);
    isWorkerBusyRef.current = true;
    setBgProgress(0);
    setBgProgressText("جاري التهيئة...");

    let imageBitmap: ImageBitmap | null = null;
    let canvas: HTMLCanvasElement | null = null;

    try {
      // [FIX #1] استخدام علامة isCancelled بدلاً من early-return داخل try
      // الـ early-return كان يتجاوز الـ finally مما يُجمّد الـ UI للأبد
      let isCancelled = false;

      // 1. تهيئة المحرك
      setBgProgressText("تحميل النموذج... (15%)");
      setBgProgress(15);
      const segmenter = await getSegmenter();
      if (!isWorkerBusyRef.current) isCancelled = true;

      if (!isCancelled) {
        // 2. تحميل وفك تشفير الصورة
        setBgProgressText("فك تشفير الصورة... (35%)");
        setBgProgress(35);
        const res = await fetch(element.imageSrc);
        const blob = await res.blob();
        if (!isWorkerBusyRef.current) isCancelled = true;

        if (!isCancelled) {
          imageBitmap = await createImageBitmap(blob);
          setBgProgress(50);

          // 3. المعالجة المسبقة وتعديل المقاس
          setBgProgressText("المعالجة المسبقة... (65%)");
          setBgProgress(65);
          let targetW = imageBitmap.width;
          let targetH = imageBitmap.height;
          const maxDim = 1024; // دقة ممتازة تعطي تفاصيل عالية جداً للحواف والشعر مع الحفاظ على الأداء
          if (targetW > maxDim || targetH > maxDim) {
            const ratio = Math.min(maxDim / targetW, maxDim / targetH);
            targetW = Math.round(targetW * ratio);
            targetH = Math.round(targetH * ratio);
          }
          canvas = document.createElement("canvas");
          canvas.width = targetW;
          canvas.height = targetH;
          const ctx = canvas.getContext("2d");
          if (!ctx) throw new Error("Could not create canvas context");
          ctx.drawImage(imageBitmap, 0, 0, targetW, targetH);

          // Close imageBitmap early as it is no longer needed
          imageBitmap.close();
          imageBitmap = null;

          const imageData = ctx.getImageData(0, 0, targetW, targetH);
          if (!isWorkerBusyRef.current) isCancelled = true;

          if (!isCancelled) {
            // 4. التشغيل الفعلي للموديل
            setBgProgressText("عزل الخلفية... (80%)");
            setBgProgress(80);
            const result = segmenter.segment(imageData);

            // [FIX #2] إغلاق نتيجة MediaPipe دائماً لمنع تسريب WebGL textures
            let maskBytes: Uint8Array | null = null;
            try {
              const confidenceMasks = result.confidenceMasks;
              if (!confidenceMasks || confidenceMasks.length === 0 || !isWorkerBusyRef.current) {
                isCancelled = true;
              } else {
                // 5. تطبيق القناع وتكوين الصورة النهائية الشفافة
                setBgProgressText("توليد الصورة النهائية... (90%)");
                setBgProgress(90);

                // confidenceMasks[0] هي نسبة احتمالية أن يكون البكسل "خلفية"
                const bgMaskData = confidenceMasks[0].getAsFloat32Array();
                maskBytes = new Uint8Array(bgMaskData.length);

                for (let i = 0; i < bgMaskData.length; i++) {
                  const fgProb = 1.0 - bgMaskData[i];

                  // تضييق نطاق التنعيم لمنع التغبيش الداخلي (Inward blur) وحماية ملامح الصورة
                  // أي بكسل يتأكد الذكاء الاصطناعي بنسبة أكثر من 60% أنه للشخص، يجعله صلباً تماماً (يحمي الوجه والتفاصيل)
                  // أي بكسل بنسبة أقل من 20% يتم حذفه تماماً
                  if (fgProb < 0.2) {
                    maskBytes[i] = 0;
                  } else if (fgProb > 0.6) {
                    maskBytes[i] = 255;
                  } else {
                    // التدرج الناعم يطبق فقط على الحافة الدقيقة (بين 20% و 60%)
                    const normalized = (fgProb - 0.2) / (0.6 - 0.2);
                    // دالة Smoothstep لجعل التدرج طبيعياً جداً
                    const smooth = normalized * normalized * (3 - 2 * normalized);
                    maskBytes[i] = Math.round(smooth * 255);
                  }
                }
              }
            } finally {
              // إغلاق WebGL textures دائماً بصرف النظر عن النتيجة
              try { result.close(); } catch (e) { /* Ignore */ }
            }

            if (!isCancelled && maskBytes) {
              // تحويل مصفوفة Uint8Array إلى Base64 بسرعة البرق باستخدام كتل (Chunks) لتفادي تجاوز الحد الأقصى للمكدس
              const CHUNK_SIZE = 0x8000; // 32768
              const chunks = [];
              for (let i = 0; i < maskBytes.length; i += CHUNK_SIZE) {
                chunks.push(String.fromCharCode.apply(null, Array.from(maskBytes.subarray(i, i + CHUNK_SIZE))));
              }
              const b64Mask = btoa(chunks.join(""));

              if (!isWorkerBusyRef.current) isCancelled = true;

              if (!isCancelled) {
                // 6. الحفظ في الخلفية عبر Go
                setBgProgressText("تجهيز الصورة...");
                setBgProgress(97);
                const localPath = await ApplyMaskToImage(element.imageSrc || "", b64Mask, targetW, targetH);

                if (isWorkerBusyRef.current) {
                  // 🔒 تعيين originalImageSrc في المرّة الأولى فقط لمنع فقدان الصورة الأصلية
                  const patch: Partial<any> = { imageSrc: localPath };
                  if (!element.originalImageSrc) {
                    patch.originalImageSrc = element.imageSrc;
                  }
                  onUpdateRef.current(element.id, patch);
                  useEditorStore.getState().pushHistory();

                  const user = useEditorStore.getState().user;
                  useEditorStore.getState().logAiUsage({
                    email: user?.email || "unknown",
                    serviceName: "عزل الخلفية الذكي (AI Background Removal)",
                    source: "Grido Studio Desktop (Windows)",
                    durationSec: 1.8,
                    costUsd: 0.0005,
                    status: "success",
                  });
                  modelCachedRef.current = true;
                }
              }
            }
          }
        }
      }

    } catch (err: any) {
      console.error("Background removal failed:", err);
      let errorMessage = err?.message || String(err);
      if (errorMessage.includes("fetch") || errorMessage.includes("network")) {
        errorMessage = "فشل تحميل ملفات معالجة الذكاء الاصطناعي.";
      }
      // لا تُظهر رسالة خطأ إذا كانت العملية ألغيت يدوياً
      if (isWorkerBusyRef.current) {
        toast.error(errorMessage);
      }
    } finally {
      // [FIX #1] هذا الـ finally يُنفَّذ دائماً بصرف النظر عن أي early-return سابق
      if (imageBitmap) {
        try { imageBitmap.close(); } catch { /* ignore cleanup error */ }
      }
      if (canvas) {
        canvas.width = 0;
        canvas.height = 0;
      }
      setIsRemovingBg(false);
      isWorkerBusyRef.current = false;
      setBgProgressText("");
      setBgProgress(0);
    }
  };

  return {
    isRemovingBg,
    bgProgress,
    bgProgressText,
    handleCancelBgRemoval,
    handleRemoveBg,
  };
}
