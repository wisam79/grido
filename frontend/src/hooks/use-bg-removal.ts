import { useState, useEffect, useRef } from "react";
import { ImageElement, useEditorStore } from "@/lib/editor-store";
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
    outputCategoryMask: false,
    outputConfidenceMasks: true,
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
      const maxDim = 1024; // دقة ممتازة تعطي تفاصيل عالية جداً للحواف والشعر مع الحفاظ على الأداء
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
      const confidenceMasks = result.confidenceMasks;
      if (!confidenceMasks || confidenceMasks.length === 0 || !isWorkerBusyRef.current) return;
 
      // 5. تطبيق القناع وتكوين الصورة النهائية الشفافة
      setBgProgressText("توليد الصورة النهائية... (90%)");
      setBgProgress(90);
      
      // confidenceMasks[0] هي نسبة احتمالية أن يكون البكسل "خلفية"
      const bgMaskData = confidenceMasks[0].getAsFloat32Array();
      const maskBytes = new Uint8Array(bgMaskData.length);
      
      for (let i = 0; i < bgMaskData.length; i++) {
        const fgProb = 1.0 - bgMaskData[i];
        
        // استخدام عتبة بسيطة لتنظيف الشوائب مع الحفاظ على نعومة الحواف (Anti-aliasing)
        if (fgProb < 0.05) {
          maskBytes[i] = 0;
        } else if (fgProb > 0.95) {
          maskBytes[i] = 255;
        } else {
          maskBytes[i] = Math.round(fgProb * 255);
        }
      }
      
      // تحويل مصفوفة Uint8Array إلى Base64 بسرعة البرق باستخدام كتل (Chunks) لتفادي تجاوز الحد الأقصى للمكدس
      const CHUNK_SIZE = 0x8000; // 32768
      const chunks = [];
      for (let i = 0; i < maskBytes.length; i += CHUNK_SIZE) {
        chunks.push(String.fromCharCode.apply(null, Array.from(maskBytes.subarray(i, i + CHUNK_SIZE))));
      }
      const b64Mask = btoa(chunks.join(""));
 
      if (!isWorkerBusyRef.current) return;
 
      // 6. الحفظ في الخلفية عبر Go
      setBgProgressText("تجهيز الصورة...");
      setBgProgress(97);
      const localPath = await ApplyMaskToImage(element.imageSrc || "", b64Mask, targetW, targetH);
 
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
