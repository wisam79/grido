import { useState, useRef, useEffect } from "react";
import { toast } from "sonner";
import { SaveImageFromBase64 } from "../../wailsjs/go/main/App";
import { useEditorStore } from "@/lib/editor-store";

export const MODAL_ENDPOINT_URL = "https://wisamsamir78--grido-ai-upscaler-imageenhancer-enhance.modal.run";
export const DAILY_AI_LIMIT = 5;

function getTodayString() {
  return new Date().toISOString().split("T")[0];
}

function getDailyUsage(): { date: string; count: number } {
  try {
    const saved = localStorage.getItem("grido_ai_daily_usage");
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed.date === getTodayString()) {
        return parsed;
      }
    }
  } catch (err) {
    console.error("Failed to parse daily usage:", err);
  }
  return { date: getTodayString(), count: 0 };
}

function incrementDailyUsage() {
  const current = getDailyUsage();
  const updated = { date: getTodayString(), count: current.count + 1 };
  try {
    localStorage.setItem("grido_ai_daily_usage", JSON.stringify(updated));
  } catch (err) {
    console.error("Failed to save daily usage:", err);
  }
  return updated;
}

export function useAiEnhance(onUpdate: (id: string, patch: Partial<any>) => void) {
  const onUpdateRef = useRef(onUpdate);
  onUpdateRef.current = onUpdate;

  const [isEnhancing, setIsEnhancing] = useState(false);
  const [enhanceProgress, setEnhanceProgress] = useState(0);
  const [enhanceProgressText, setEnhanceProgressText] = useState("");
  const [dailyCount, setDailyCount] = useState(() => getDailyUsage().count);

  useEffect(() => {
    setDailyCount(getDailyUsage().count);
  }, []);

  const remainingQuota = Math.max(0, DAILY_AI_LIMIT - dailyCount);

  const handleEnhance = async (element: { id: string; imageSrc?: string; originalImageSrc?: string }) => {
    if (!element.imageSrc) {
      toast.error("لا توجد صورة للتحسين");
      return;
    }

    // 🔒 التحقق من حد الاستهلاك اليومي
    if (remainingQuota <= 0) {
      toast.warning(`وصلت للحد الأقصى اليومي لاستخدام الذكاء الاصطناعي (${DAILY_AI_LIMIT} صور/يومياً). يتجدد الرصيد غداً 🕛`, {
        duration: 5000,
      });
      return;
    }

    setIsEnhancing(true);
    setEnhanceProgress(10);
    setEnhanceProgressText("جاري تجهيز الصورة...");

    let progressTimer: any = null;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000); // 60s timeout

    try {
      let base64Image = element.imageSrc;

      if (!base64Image.startsWith("data:image/")) {
        setEnhanceProgress(25);
        const response = await fetch(element.imageSrc);
        const blob = await response.blob();
        base64Image = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
      }

      setEnhanceProgress(45);
      setEnhanceProgressText("ترميم وتوضيح الملامح عبر GPU السحابي...");

      progressTimer = setInterval(() => {
        setEnhanceProgress((prev) => (prev < 85 ? prev + 5 : prev));
      }, 350);

      const apiResponse = await fetch(MODAL_ENDPOINT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Grido-Api-Key": "grido_sec_ai_v1_98234791283749",
        },
        body: JSON.stringify({ image: base64Image }),
        signal: controller.signal,
      });

      clearInterval(progressTimer);
      clearTimeout(timeoutId);

      if (!apiResponse.ok) {
        throw new Error(`خطأ من السيرفر: ${apiResponse.statusText}`);
      }

      const result = await apiResponse.json();

      if (result.error) {
        throw new Error(result.error);
      }

      if (result.image) {
        setEnhanceProgress(95);
        setEnhanceProgressText("حفظ الصورة المحسنة محلياً...");
        const localPath = await SaveImageFromBase64(result.image);

        const patch: Partial<any> = { imageSrc: localPath };
        if (!element.originalImageSrc) {
          patch.originalImageSrc = element.imageSrc;
        }

        onUpdateRef.current(element.id, patch);
        useEditorStore.getState().pushHistory();
        setEnhanceProgress(100);

        // 🌟 زيادة عداد الاستهلاك اليومي
        const newUsage = incrementDailyUsage();
        setDailyCount(newUsage.count);

        const user = useEditorStore.getState().user;
        useEditorStore.getState().logAiUsage({
          email: user?.email || "wisamsamir78@gmail.com",
          serviceName: "ترميم الوجوه بالذكاء الاصطناعي (GFPGAN v1.4)",
          source: "Grido Studio Desktop (Windows)",
          durationSec: result.execution_seconds || 2.4,
          costUsd: result.total_cost_usd || 0.001329,
          status: "success",
        });

        const costInfo = result.total_cost_usd ? ` (${result.execution_seconds ?? 0}ث | $${result.total_cost_usd})` : "";
        const remText = ` · المتبقي اليوم: ${Math.max(0, DAILY_AI_LIMIT - newUsage.count)}/10`;
        toast.success(`تم ترميم وتحسين دقة الصورة بنجاح ✨${costInfo}${remText}`);
      }
    } catch (err: any) {
      if (progressTimer) clearInterval(progressTimer);
      clearTimeout(timeoutId);
      console.error("AI Enhance failed:", err);
      if (err.name === "AbortError") {
        toast.error("استغرق الطلب وقتاً طويلاً. أعد المحاولة مرة أخرى.");
      } else {
        toast.error(err.message || "فشل تحسين الصورة بالذكاء الاصطناعي");
      }
    } finally {
      setIsEnhancing(false);
      setEnhanceProgress(0);
      setEnhanceProgressText("");
    }
  };

  return {
    isEnhancing,
    enhanceProgress,
    enhanceProgressText,
    dailyCount,
    remainingQuota,
    dailyLimit: DAILY_AI_LIMIT,
    handleEnhance,
  };
}
