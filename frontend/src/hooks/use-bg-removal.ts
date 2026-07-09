import { useState, useEffect } from "react";
import { ImageElement } from "@/lib/editor-store";
import { FilesetResolver, ImageSegmenter } from "@mediapipe/tasks-vision";
import { toast } from "sonner";
import { ApplyMaskToImage } from "../../wailsjs/go/main/App";

let segmenterInstance: ImageSegmenter | null = null;

async function getSegmenter() {
  if (segmenterInstance) return segmenterInstance;

  const baseUrl = window.location.origin;
  const vision = await FilesetResolver.forVisionTasks(`${baseUrl}/wasm`);
  
  segmenterInstance = await ImageSegmenter.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath: `${baseUrl}/models/selfie_multiclass.tflite`,
      delegate: "GPU",
    },
    runningMode: "IMAGE",
    outputCategoryMask: true,
  });
  
  return segmenterInstance;
}

let isWorkerBusy = false;

export function useBgRemoval(onUpdate: (id: string, patch: Partial<ImageElement>) => void) {
  const [isRemovingBg, setIsRemovingBg] = useState(false);
  const [bgProgress, setBgProgress] = useState(0);
  const [bgProgressText, setBgProgressText] = useState("");

  useEffect(() => {
    return () => {
      if (isRemovingBg) {
        isWorkerBusy = false;
      }
    };
  }, [isRemovingBg]);

  const handleCancelBgRemoval = () => {
    setIsRemovingBg(false);
    isWorkerBusy = false;
    setBgProgress(0);
    setBgProgressText("");
    toast.info("تم إيقاف العملية.");
  };

  const handleRemoveBg = async (element: ImageElement) => {
    if (!element.imageSrc) return;
    if (isWorkerBusy) {
      toast.warning("هناك عملية إزالة خلفية قيد التنفيذ حالياً. يرجى الانتظار.");
      return;
    }

    // تنبيه المستخدم بالبدء في عزل الخلفية محلياً
    const isCached = !!(window as any).isModelCached;
    if (!isCached) {
      toast.info(
        "جاري تشغيل نموذج عزل الخلفية الذكي محلياً 100% بدون إنترنت.",
        { duration: 3000, id: "bg-model-notice" }
      );
    }

    setIsRemovingBg(true);
    isWorkerBusy = true;
    setBgProgress(0);
    setBgProgressText("جاري التهيئة...");

    try {
      // 1. تهيئة المحرك
      setBgProgressText("تحميل النموذج... (15%)");
      setBgProgress(15);
      const segmenter = await getSegmenter();
      if (!isWorkerBusy) return; // تم الإلغاء

      // 2. تحميل وفك تشفير الصورة
      setBgProgressText("فك تشفير الصورة... (35%)");
      setBgProgress(35);
      let blob: Blob;
      if (element.imageSrc.startsWith("data:")) {
        const [header, base64Data] = element.imageSrc.split(",");
        const mime = header.match(/:(.*?);/)?.[1] ?? "image/jpeg";
        const binary = atob(base64Data);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
          bytes[i] = binary.charCodeAt(i);
        }
        blob = new Blob([bytes], { type: mime });
      } else {
        const res = await fetch(element.imageSrc);
        blob = await res.blob();
      }
      if (!isWorkerBusy) return;

      const imageBitmap = await createImageBitmap(blob);
      setBgProgress(50);

      // 3. المعالجة المسبقة وتعديل المقاس
      setBgProgressText("المعالجة المسبقة... (65%)");
      setBgProgress(65);
      let targetW = imageBitmap.width;
      let targetH = imageBitmap.height;
      const maxDim = 384;
      if (targetW > maxDim || targetH > maxDim) {
        if (targetW > targetH) {
          targetH = Math.round((targetH * maxDim) / targetW);
          targetW = maxDim;
        } else {
          targetW = Math.round((targetW * maxDim) / targetH);
          targetH = maxDim;
        }
      }

      const canvas = document.createElement("canvas");
      canvas.width = targetW;
      canvas.height = targetH;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(imageBitmap, 0, 0, targetW, targetH);
      if (!isWorkerBusy) return;

      // 4. تشغيل التحليل بالذكاء الاصطناعي
      setBgProgressText("تحليل الذكاء الاصطناعي... (80%)");
      setBgProgress(80);
      
      // نقوم بالمعالجة داخل requestAnimationFrame لضمان استجابة وتحديث الواجهة للخطوة السابقة
      await new Promise((resolve) => requestAnimationFrame(resolve));
      if (!isWorkerBusy) return;

      const result = segmenter.segment(canvas);
      setBgProgress(90);

      // 5. استخراج القناع وتطبيقه وتنعيم الحواف
      setBgProgressText("تطبيق القناع... (92%)");
      setBgProgress(92);
      const mask = result.categoryMask!;
      const width = mask.width;
      const height = mask.height;
      const maskData = mask.getAsUint8Array();

      const maskCanvas = document.createElement("canvas");
      maskCanvas.width = width;
      maskCanvas.height = height;
      const maskCtx = maskCanvas.getContext("2d")!;
      const imgData = maskCtx.createImageData(width, height);

      for (let i = 0; i < maskData.length; i++) {
        const val = maskData[i] > 0 ? 255 : 0;
        const offset = i * 4;
        imgData.data[offset] = val;
        imgData.data[offset + 1] = val;
        imgData.data[offset + 2] = val;
        imgData.data[offset + 3] = 255;
      }
      maskCtx.putImageData(imgData, 0, 0);

      const dataUrl = maskCanvas.toDataURL("image/png");
      if (!isWorkerBusy) return;

      // 6. الحفظ في الخلفية عبر Go
      setBgProgressText("تجهيز الصورة...");
      setBgProgress(97);
      const localPath = await ApplyMaskToImage(element.imageSrc || "", dataUrl);

      if (!isWorkerBusy) return;

      onUpdate(element.id, { 
        imageSrc: localPath,
        originalImageSrc: element.originalImageSrc || element.imageSrc 
      });
      (window as any).isModelCached = true;

    } catch (err: any) {
      console.error("Background removal failed:", err);
      let errorMessage = err?.message || String(err);
      if (errorMessage.includes("fetch") || errorMessage.includes("network")) {
        errorMessage = "فشل تحميل ملفات معالجة الذكاء الاصطناعي.";
      }
      toast.error(errorMessage);
    } finally {
      setIsRemovingBg(false);
      isWorkerBusy = false;
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
