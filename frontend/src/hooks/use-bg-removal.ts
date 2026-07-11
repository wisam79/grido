import { useState, useEffect, useRef } from "react";
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

export function useBgRemoval(onUpdate: (id: string, patch: Partial<any>) => void) {
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

    try {
      // 1. تهيئة المحرك
      setBgProgressText("تحميل النموذج... (15%)");
      setBgProgress(15);
      const segmenter = await getSegmenter();
      if (!isWorkerBusyRef.current) return;

      // 2. تحميل وفك تشفير الصورة
      setBgProgressText("فك تشفير الصورة... (35%)");
      setBgProgress(35);
      const res = await fetch(element.imageSrc);
      const blob = await res.blob();
      if (!isWorkerBusyRef.current) return;
 
      const imageBitmap = await createImageBitmap(blob);
      setBgProgress(50);
 
      // 3. المعالجة المسبقة وتعديل المقاس
      setBgProgressText("المعالجة المسبقة... (65%)");
      setBgProgress(65);
      let targetW = imageBitmap.width;
      let targetH = imageBitmap.height;
      const maxDim = 512; // دقة معتدلة ومثالية جداً للتعرف على الحواف وسريعة للغاية
      if (targetW > maxDim || targetH > maxDim) {
        const ratio = Math.min(maxDim / targetW, maxDim / targetH);
        targetW = Math.round(targetW * ratio);
        targetH = Math.round(targetH * ratio);
      }
      const canvas = document.createElement("canvas");
      canvas.width = targetW;
      canvas.height = targetH;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Could not create canvas context");
      ctx.drawImage(imageBitmap, 0, 0, targetW, targetH);
      const imageData = ctx.getImageData(0, 0, targetW, targetH);
      if (!isWorkerBusyRef.current) return;
 
      // 4. التشغيل الفعلي للموديل
      setBgProgressText("عزل الخلفية... (80%)");
      setBgProgress(80);
      const result = segmenter.segment(imageData);
      const categoryMask = result.categoryMask;
      if (!categoryMask || !isWorkerBusyRef.current) return;
 
      // 5. تطبيق القناع وتكوين الصورة النهائية الشفافة
      setBgProgressText("توليد الصورة النهائية... (90%)");
      setBgProgress(90);
      
      const maskData = categoryMask.getAsUint8Array();
      const maskBytes = new Uint8Array(maskData.length);
      for (let i = 0; i < maskData.length; i++) {
        maskBytes[i] = maskData[i] > 0 ? 255 : 0;
      }
      
      const maskArray = Array.from(maskBytes);
 
      if (!isWorkerBusyRef.current) return;
 
      // 6. الحفظ في الخلفية عبر Go
      setBgProgressText("تجهيز الصورة...");
      setBgProgress(97);
      const localPath = await ApplyMaskToImage(element.imageSrc || "", maskArray, targetW, targetH);
 
      if (!isWorkerBusyRef.current) return;
 
      // 🔒 تعيين originalImageSrc في المرّة الأولى فقط لمنع فقدان الصورة الأصلية
      const patch: Partial<any> = { imageSrc: localPath };
      if (!element.originalImageSrc) {
        patch.originalImageSrc = element.imageSrc;
      }
      onUpdate(element.id, patch);
      modelCachedRef.current = true;

    } catch (err: any) {
      console.error("Background removal failed:", err);
      let errorMessage = err?.message || String(err);
      if (errorMessage.includes("fetch") || errorMessage.includes("network")) {
        errorMessage = "فشل تحميل ملفات معالجة الذكاء الاصطناعي.";
      }
      toast.error(errorMessage);
    } finally {
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
