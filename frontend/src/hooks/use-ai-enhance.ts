import { useRef, useEffect } from 'react';
import { toast } from 'sonner';
import { SaveImageFromBase64, EnhanceImageWithAI } from '../../wailsjs/go/main/App';
import { useEditorStore } from '@/lib/editor-store';
import { toErrorMessage } from '@/lib/wails-error';
import { useOperationStatusStore } from '@/lib/ui/operation-status';
import { createLogger } from '@/lib/logger';
import { create } from 'zustand';
import {
  aiPlanDailyLimit,
  parseQuotaSnapshotFromResponse,
  resolveAiQuota,
  type AiQuotaSnapshot,
} from '@/lib/ai/quota';

interface AiEnhanceState {
  isEnhancing: boolean;
  enhanceProgress: number;
  enhanceProgressText: string;
  /** آخر لقطة حصة خادمية (used_today/daily_limit) — المصدر الحاكم للعرض */
  serverQuota: AiQuotaSnapshot | null;
  setIsEnhancing: (val: boolean) => void;
  setEnhanceProgress: (val: number | ((prev: number) => number)) => void;
  setEnhanceProgressText: (val: string) => void;
  setServerQuota: (snapshot: AiQuotaSnapshot | null) => void;
}

export const useAiEnhanceState = create<AiEnhanceState>((set) => ({
  isEnhancing: false,
  enhanceProgress: 0,
  enhanceProgressText: '',
  serverQuota: null,
  setIsEnhancing: (val) => set({ isEnhancing: val }),
  setEnhanceProgress: (val) =>
    set((state) => ({
      enhanceProgress: typeof val === 'function' ? val(state.enhanceProgress) : val,
    })),
  setEnhanceProgressText: (val) => set({ enhanceProgressText: val }),
  setServerQuota: (snapshot) => set({ serverQuota: snapshot }),
}));

/** تصفير لقطة الحصة الخادمية فوراً (عند الخروج أو تبديل الحساب). */
export function resetAiEnhanceQuota(): void {
  useAiEnhanceState.getState().setServerQuota(null);
}

if (typeof window !== 'undefined') {
  window.addEventListener('grido:auth-logout', resetAiEnhanceQuota);
}

// 🛡️ الحصة اليومية تُحسم في وحدة واحدة (`@/lib/ai/quota`): لقطة الخادم أولاً،
// واحتياطي محلي على **يوم UTC** قبل أول عملية في اليوم — لا اشتقاق محلي موازٍ
// بيوم محلي (كان يعرض رصيداً متبقياً بينما يرفض الخادم الطلب — التدقيق 12/F-01).

export async function prepareImageForAiUpload(
  src: string,
  maxDim = 2048,
  quality = 0.92,
): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
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

      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(src);
        return;
      }

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = () => resolve(src);
    img.src = src;
  });
}

import { useRenderQuality } from '@/lib/canvas/render-quality';

export function useAiEnhance(
  onUpdate: (id: string, patch: Partial<Record<string, unknown>>) => void,
) {
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
  const aiUsageLogs = useEditorStore((state) => state.aiUsageLogs);
  const serverQuota = useAiEnhanceState((state) => state.serverQuota);

  const quota = resolveAiQuota({
    snapshot: serverQuota,
    plan: user?.plan,
    logs: aiUsageLogs,
    userEmail: user?.email,
  });
  const dailyLimit = quota.limit;
  const dailyCount = quota.used;
  const remainingQuota = quota.remaining;

  // 🛡️ تصفير لقطة الخادم فوراً عند تسجيل الخروج أو تغير المستخدم أو ترقية الباقة
  useEffect(() => {
    const cur = useAiEnhanceState.getState().serverQuota;
    if (cur) {
      if (
        !user ||
        (cur.userEmail && user.email !== cur.userEmail) ||
        cur.limit !== aiPlanDailyLimit(user.plan)
      ) {
        useAiEnhanceState.getState().setServerQuota(null);
      }
    }
  }, [user]);

  const handleEnhance = async (element: {
    id: string;
    imageSrc?: string;
    originalImageSrc?: string;
  }) => {
    if (!element.imageSrc) {
      toast.error('لا توجد صورة للتحسين');
      return;
    }

    if (useAiEnhanceState.getState().isEnhancing) {
      toast.warning('جاري الترميم ...');
      return;
    }

    // 🔒 التحقق الدقيق من حد الاستهلاك اليومي المربوط بالحساب
    if (remainingQuota <= 0) {
      toast.warning(
        `وصلت للحد الأقصى اليومي لاستخدام الذكاء الاصطناعي (${dailyLimit} صور/يومياً). يتجدد الرصيد غداً`,
        {
          duration: 5000,
        },
      );
      return;
    }

    const opId = useOperationStatusStore.getState().startOperation({
      type: 'ai_enhance',
      title: 'جاري تحسين الصورة بالذكاء الاصطناعي ...',
      targetId: element.id,
      canCancel: false,
    });

    setIsEnhancing(true);
    useRenderQuality.getState().setEnhancingElementId(element.id);
    setEnhanceProgress(10);
    setEnhanceProgressText('جاري تجهيز الصورة ...');

    let progressTimer: ReturnType<typeof setInterval> | null = null;
    // لا يدعم ربط Wails الإلغاء الفعلي — نستبدل AbortController الوهمي بمهلة
    // حقيقية عبر Promise.race ليعود للمستخدم خطأ واضح بدل انتظار لا نهائي
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    try {
      setEnhanceProgress(20);
      const base64Image = await prepareImageForAiUpload(element.imageSrc, 2048, 0.92);

      const loadingMessages = [
        'جاري تجهيز النموذج ...',
        'جاري تجهيز الصورة ...',
        'جاري الترميم ...',
        'جاري معالجة التفاصيل ...',
        'جاري تحسين الجودة ...',
        'جاري الإنهاء ...',
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

      const token = user?.token || '';
      // RV-7: مهلة الواجهة كانت 120s بينما الخلفية 3 دقائق (aiEnhanceClient) وحاوية
      // Modal حتى 600s والتسجيل بعد المعالجة — فطلب بارد 130s كان يُظهر فشلاً بلا
      // صورة بينما يكتمل الخادم ويخصم الحصة. نمهل 200s (>180s خلفية + هامش) ليرى
      // المستخدم النتيجة متى نجحت، مع رسالة صريحة أن الحصة قد تكون احتُسبت.
      const AI_ENHANCE_TIMEOUT_MS = 200000;
      const timeoutPromise = new Promise<never>((_, reject) => {
        timeoutId = setTimeout(
          () =>
            reject(
              new Error(
                'استغرق الطلب وقتاً طويلاً. إن تكرر، تحقق من الرصيد المتبقي — قد تكون المحاولة احتُسبت على حصتك اليومية.',
              ),
            ),
          AI_ENHANCE_TIMEOUT_MS, // مواءمة مع مهلة الخلفية 3 دقائق + هامش
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

      // 📊 قيم الحصة الخادمية (used_today/daily_limit) تُعتمد فوراً كمصدر العرض
      const snapshot = parseQuotaSnapshotFromResponse(result, Date.now(), user?.email);
      if (snapshot) {
        useAiEnhanceState.getState().setServerQuota(snapshot);
      }

      if (result.image) {
        setEnhanceProgress(95);
        setEnhanceProgressText('جاري حفظ الصورة ...');
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
          email: currentUser?.email || 'unknown',
          serviceName: 'ترميم الوجوه بالذكاء الاصطناعي (CodeFormer)',
          source: 'Grido Studio Desktop (Windows)',
          durationSec: result.execution_seconds || 2.4,
          costUsd: result.total_cost_usd || 0.001329,
          status: 'success',
        });

        // 🌟 2. عرض إشعار النجاح الأنيق مع الرصيد الدقيق المتبقي — قراءة طازجة
        // من الستور لحظة الحدث (منع القراءات القديمة) بعد تسجيل العملية أعلاه:
        // لقطة الخادم أولاً، وإلا العدّاد المحلي (يوم UTC) الذي يشمل هذه العملية.
        const freshQuota = resolveAiQuota({
          snapshot: useAiEnhanceState.getState().serverQuota,
          plan: useEditorStore.getState().user?.plan,
          logs: useEditorStore.getState().aiUsageLogs,
          userEmail: useEditorStore.getState().user?.email,
        });
        const remText = ` (المتبقي اليوم: ${freshQuota.remaining}/${freshQuota.limit})`;
        toast.success(`تم ترميم وتحسين دقة الصورة بنجاح!${remText}`);
      }
    } catch (err) {
      if (progressTimer) clearInterval(progressTimer);
      if (timeoutId) clearTimeout(timeoutId);
      // RV-4: توجيه مسار الفشل للوجر الموحّد (سجل Go) بدل console المعزول
      createLogger('ai-enhance').error('AI Enhance failed:', err);
      if (err instanceof Error && /طويلاً/.test(err.message)) {
        toast.error(err.message);
      } else {
        const errorMsg = toErrorMessage(err, 'فشل تحسين الصورة بالذكاء الاصطناعي');
        toast.error(errorMsg);
      }
    } finally {
      useOperationStatusStore.getState().finishOperation(opId);
      setIsEnhancing(false);
      useRenderQuality.getState().setEnhancingElementId(null);
      setEnhanceProgress(0);
      setEnhanceProgressText('');
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
