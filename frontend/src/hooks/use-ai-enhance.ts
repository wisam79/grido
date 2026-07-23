import { useState, useRef, useEffect } from "react";
import { toast } from "sonner";
import { SaveImageFromBase64, EnhanceImageWithAI } from "../../wailsjs/go/main/App";
import { useEditorStore } from "@/lib/editor-store";
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

function getTodayUsageCount(): number {
  try {
    const todayStr = new Date().toISOString().split("T")[0]; // e.g. "2026-07-19"
    const user = useEditorStore.getState().user;
    const userEmail = user?.email || "unknown";
    const logs = useEditorStore.getState().aiUsageLogs || [];

    // تصفية وحساب الطلبات الفعلية المكتملة بنجاح اليوم للحساب الحالي
    const dbCount = logs.filter((log) => {
      const logDate = log.timestamp ? log.timestamp.substring(0, 10) : "";
      const isToday = logDate === todayStr || logDate === todayStr.replace(/-/g, "/");
      const isEnhance = log.serviceName && (log.serviceName.includes("ترميم") || log.serviceName.includes("GFPGAN"));
      const isUser = !log.email || log.email === userEmail;
      return isToday && isEnhance && isUser && log.status === "success";
    }).length;

    // دعم الاحتياط من localStorage لتلافي أي انقطاع
    const saved = localStorage.getItem("grido_ai_daily_usage");
    let localCount = 0;
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed.date === todayStr) {
        localCount = parsed.count || 0;
      }
    }

    return Math.max(dbCount, localCount);
  } catch (err) {
    console.error("Failed to calculate today's usage:", err);
    return 0;
  }
}

function incrementLocalDailyUsage() {
  try {
    const todayStr = new Date().toISOString().split("T")[0];
    const current = getTodayUsageCount();
    const updated = { date: todayStr, count: current + 1 };
    localStorage.setItem("grido_ai_daily_usage", JSON.stringify(updated));
  } catch (err) {
    console.error("Failed to save local daily usage:", err);
  }
}

export function useAiEnhance(onUpdate: (id: string, patch: Partial<any>) => void) {
  const onUpdateRef = useRef(onUpdate);
  useEffect(() => {
    onUpdateRef.current = onUpdate;
  }, [onUpdate]);

  const [isEnhancing, setIsEnhancing] = useState(false);
  const [enhanceProgress, setEnhanceProgress] = useState(0);
  const [enhanceProgressText, setEnhanceProgressText] = useState("");

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

    // 🔒 التحقق الدقيق من حد الاستهلاك اليومي المربوط بالحساب
    if (remainingQuota <= 0) {
      toast.warning(`وصلت للحد الأقصى اليومي لاستخدام الذكاء الاصطناعي (${dailyLimit} صور/يومياً). يتجدد الرصيد غداً 🕛`, {
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

      const loadingMessages = [
        "جاري إيقاظ خوادم الذكاء الاصطناعي... 💤",
        "يتم الآن تهيئة معالجات الرسوميات (GPU)... 🚀",
        "جاري تحميل نماذج الترميم المتقدمة... 🧠",
        "تتم الآن معالجة تفاصيل الوجه والملامح... ✨",
        "يتم تحليل البيانات واستعادة البيكسلات المفقودة... 👁️",
        "جاري إزالة التشويش وتوضيح الخلفية... 🖼️",
        "نقوم باللمسات الأخيرة وتحسين الجودة... 🎨",
        "العملية توشك على الانتهاء، شكراً لصبرك... ⏳"
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
      const resultStr = await EnhanceImageWithAI(base64Image, token, dailyLimit);

      clearInterval(progressTimer);
      clearTimeout(timeoutId);

      const result = JSON.parse(resultStr);

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

        // 🌟 1. زيادة العداد المحلي الاحتياطي
        incrementLocalDailyUsage();

        // 🌟 2. توثيق وتسجيل الطلب في سجلات تدقيق قاعدة البيانات الحية
        const currentUser = useEditorStore.getState().user;
        useEditorStore.getState().logAiUsage({
          email: currentUser?.email || "unknown",
          serviceName: "ترميم الوجوه بالذكاء الاصطناعي (CodeFormer)",
          source: "Grido Studio Desktop (Windows)",
          durationSec: result.execution_seconds || 2.4,
          costUsd: result.total_cost_usd || 0.001329,
          status: "success",
        });

        // 🌟 3. عرض إشعار النجاح الأنيق للمستخدم مع الرصيد الدقيق المتبقي
        const updatedCount = getTodayUsageCount();
        const remText = ` (المتبقي اليوم: ${Math.max(0, dailyLimit - updatedCount)}/${dailyLimit})`;
        toast.success(`تم ترميم وتحسين دقة الصورة بنجاح ✨${remText}`);
      }
    } catch (err) {
      if (progressTimer) clearInterval(progressTimer);
      clearTimeout(timeoutId);
      console.error("AI Enhance failed:", err);
      if (err instanceof Error && err.name === "AbortError") {
        toast.error("استغرق الطلب وقتاً طويلاً. أعد المحاولة مرة أخرى.");
      } else {
        const errorMsg = typeof err === "string" ? err : (err instanceof Error ? err.message : "فشل تحسين الصورة بالذكاء الاصطناعي");
        toast.error(errorMsg);
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
    dailyLimit,
    handleEnhance,
  };
}
