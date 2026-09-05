import { useRef, useEffect } from "react";
import { toast } from "sonner";
import { SaveImageFromBase64, EnhanceImageWithAI } from "../../wailsjs/go/main/App";
import { useEditorStore } from "@/lib/editor-store";
import { create } from "zustand";

interface AiEnhanceState {
  isEnhancing: boolean;
  enhanceProgress: number;
  enhanceProgressText: string;
  setIsEnhancing: (val: boolean) => void;
  setEnhanceProgress: (val: number | ((prev: number) => number)) => void;
  setEnhanceProgressText: (val: string) => void;
}

export const useAiEnhanceState = create<AiEnhanceState>((set) => ({
  isEnhancing: false,
  enhanceProgress: 0,
  enhanceProgressText: "",
  setIsEnhancing: (val) => set({ isEnhancing: val }),
  setEnhanceProgress: (val) =>
    set((state) => ({
      enhanceProgress: typeof val === "function" ? val(state.enhanceProgress) : val,
    })),
  setEnhanceProgressText: (val) => set({ enhanceProgressText: val }),
}));
// 🌟 حساب الحد اليومي الديناميكي بحسب نوع باقة الحساب وصلاحية الأدمن
export function getUserDailyLimit(): number {
  try {
    const user = useEditorStore.getState().user;
    
    // خطة Enterprise ➔ 50 صورة يومياً
    if (user?.plan === "enterprise") {
      return 50;
    }
    // خطة PRO الاحترافية ➔ 15 صورة يومياً
    if (user?.plan === "pro") {
      return 15;
    }
  } catch (err) {
    console.error("Failed to calculate plan limit:", err);
  }
  // الحساب العادي / المجاني ➔ 5 صور يومياً
  return 5;
}

export function getTodayUsageCount(): number {
  try {
    // مفتاح اليوم المحلي (sv-SE يعطي "YYYY-MM-DD" محلياً) — يطابق طابع logAiUsage
    // المحلي ويتجنب انزياح UTC عند منتصف الليل (الحصة تتجدد 00:00 محلياً فعلياً).
    const todayStr = new Date().toLocaleDateString("sv-SE"); // e.g. "2026-07-19"
    const user = useEditorStore.getState().user;
    const userEmail = user?.email || "unknown";
    const logs = useEditorStore.getState().aiUsageLogs || [];

    // تصفية وحساب الطلبات الفعلية المكتملة بنجاح اليوم للحساب الحالي
    return logs.filter((log) => {
      const logDate = log.timestamp ? log.timestamp.substring(0, 10) : "";
      const isToday = logDate === todayStr || logDate === todayStr.replace(/-/g, "/");
      const isEnhance = log.serviceName && (log.serviceName.includes("ترميم") || log.serviceName.includes("GFPGAN"));
      const isUser = !log.email || log.email === userEmail;
      return isToday && isEnhance && isUser && log.status === "success";
    }).length;
  } catch (err) {
    console.error("Failed to calculate today's usage:", err);
    return 0;
  }
}

export async function prepareImageForAiUpload(src: string, maxDim = 2048, quality = 0.92): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      let w = img.naturalWidth || img.width;
      let h = img.naturalHeight || img.height;

      if (w > maxDim || h > maxDim) {
        if (w > h) {
          h = Math.round((h * maxDim) / w);
          w = maxDim;
        } else {
          w = Math.round((w * maxDim) / h);
          h = maxDim;
        }
      }

      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        resolve(src);
        return;
      }

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL("image/jpeg", quality));
    };
    img.onerror = () => resolve(src);
    img.src = src;
  });
}

import { useRenderQuality } from "@/lib/canvas/render-quality";

export function useAiEnhance(onUpdate: (id: string, patch: Partial<Record<string, unknown>>) => void) {
  const onUpdateRef = useRef(onUpdate);
  useEffect(() => {
    onUpdateRef.current = onUpdate;
  }, [onUpdate]);

  const {
    isEnhancing,
    enhanceProgress,
    enhanceProgressText,
    setIsEnhancing,
    setEnhanceProgress,
    setEnhanceProgressText,
  } = useAiEnhanceState();

  // قراءة الحد اليومي الديناميكي بناءً على الحساب والسياسة
  const user = useEditorStore((state) => state.user);
  const dailyLimit = getUserDailyLimit();
  const dailyCount = getTodayUsageCount();
  const remainingQuota = Math.max(0, dailyLimit - dailyCount);

  const handleEnhance = async (element: { id: string; imageSrc?: string; originalImageSrc?: string }) => {
    if (!element.imageSrc) {
      toast.error("لا توجد صورة للتحسين");
      return;
    }

    if (useAiEnhanceState.getState().isEnhancing) {
      toast.warning("هناك عملية ترميم جارية بالفعل، يرجى الانتظار...");
      return;
    }

    // 🔒 التحقق الدقيق من حد الاستهلاك اليومي المربوط بالحساب
    if (remainingQuota <= 0) {
      toast.warning(`وصلت للحد الأقصى اليومي لاستخدام الذكاء الاصطناعي (${dailyLimit} صور/يومياً). يتجدد الرصيد غداً 🕛`, {
        duration: 5000,
      });
      return;
    }

    setIsEnhancing(true);
    useRenderQuality.getState().setEnhancingElementId(element.id);
    setEnhanceProgress(10);
    setEnhanceProgressText("جاري تجهيز الصورة وتحسين أبعاد الرفع ...");

    let progressTimer: ReturnType<typeof setInterval> | null = null;
    // لا يدعم ربط Wails الإلغاء الفعلي — نستبدل AbortController الوهمي بمهلة
    // حقيقية عبر Promise.race ليعود للمستخدم خطأ واضح بدل انتظار لا نهائي
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    try {
      setEnhanceProgress(20);
      const base64Image = await prepareImageForAiUpload(element.imageSrc, 2048, 0.92);

      const loadingMessages = [
        "جاري إيقاظ خوادم الذكاء الاصطناعي ... 💤",
        "جاري تهيئة معالجات الرسوميات (GPU) ... 🚀",
        "جاري تحميل نماذج الترميم المتقدمة ... 🧠",
        "جاري معالجة تفاصيل الوجه والملامح ... ✨",
        "جاري تحليل البيانات واستعادة البيكسلات المفقودة ... 👁️",
        "جاري إزالة التشويش وتوضيح الخلفية ... 🖼️",
        "جاري وضع اللمسات الأخيرة وتحسين الجودة ... 🎨",
        "جاري إنهاء العملية، شكراً لصبرك ... ⏳"
      ];

      setEnhanceProgress(15);
      setEnhanceProgressText(loadingMessages[0]);

      let ticks = 0;
      progressTimer = setInterval(() => {
        ticks++;
        setEnhanceProgress((prev) => (prev < 90 ? prev + 2 : prev));
        
        // تغيير الرسالة كل 4 ثواني تقريباً (5 دورات * 800 مللي ثانية)
        const msgIndex = Math.floor(ticks / 5);
        if (msgIndex < loadingMessages.length) {
          setEnhanceProgressText(loadingMessages[msgIndex]);
        }
      }, 800);

      const token = user?.token || "";
      const timeoutPromise = new Promise<never>((_, reject) => {
        timeoutId = setTimeout(
          () => reject(new Error("استغرق الطلب وقتاً طويلاً. أعد المحاولة مرة أخرى.")),
          120000 // مهلة 120 ثانية للبارد على الخادم السحابي
        );
      });
      const resultStr = await Promise.race([
        EnhanceImageWithAI(base64Image, token, dailyLimit),
        timeoutPromise,
      ]);

      clearInterval(progressTimer);
      progressTimer = null;
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = null;

      const result = JSON.parse(resultStr);

      if (result.image) {
        setEnhanceProgress(95);
        setEnhanceProgressText("حفظ الصورة المحسنة محلياً...");
        const localPath = await SaveImageFromBase64(result.image);

        const patch: Partial<Record<string, unknown>> = { imageSrc: localPath };
        if (!element.originalImageSrc) {
          patch.originalImageSrc = element.imageSrc;
        }

        onUpdateRef.current(element.id, patch);
        useEditorStore.getState().pushHistory();
        setEnhanceProgress(100);

        // 🌟 1. توثيق وتسجيل الطلب في سجلات تدقيق قاعدة البيانات الحية
        const currentUser = useEditorStore.getState().user;
        useEditorStore.getState().logAiUsage({
          email: currentUser?.email || "unknown",
          serviceName: "ترميم الوجوه بالذكاء الاصطناعي (CodeFormer)",
          source: "Grido Studio Desktop (Windows)",
          durationSec: result.execution_seconds || 2.4,
          costUsd: result.total_cost_usd || 0.001329,
          status: "success",
        });

        // 🌟 2. عرض إشعار النجاح الأنيق للمستخدم مع الرصيد الدقيق المتبقي
        const updatedCount = getTodayUsageCount();
        const remText = ` (المتبقي اليوم: ${Math.max(0, dailyLimit - updatedCount)}/${dailyLimit})`;
        toast.success(`تم ترميم وتحسين دقة الصورة بنجاح ✨${remText}`);
      }
    } catch (err) {
      if (progressTimer) clearInterval(progressTimer);
      if (timeoutId) clearTimeout(timeoutId);
      console.error("AI Enhance failed:", err);
      if (err instanceof Error && /طويلاً/.test(err.message)) {
        toast.error(err.message);
      } else {
        const errorMsg = typeof err === "string" ? err : (err instanceof Error ? err.message : "فشل تحسين الصورة بالذكاء الاصطناعي");
        toast.error(errorMsg);
      }
    } finally {
      setIsEnhancing(false);
      useRenderQuality.getState().setEnhancingElementId(null);
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
    dailyLimit,
    handleEnhance,
  };
}
