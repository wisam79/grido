import { useRef, useEffect } from 'react';
import { toast } from 'sonner';
import { SaveImageFromBase64, EnhanceImageWithAI } from '@bindings/grido/app';
import { useEditorStore } from '@/lib/editor-store';
import { toErrorMessage } from '@/lib/wails-error';
import { commitAiImageResult } from '@/lib/ai/ai-result-commit';
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

/**
 * يفحص ما إذا كان الكانفاس يحتوي على بكسلات شفافة (قناة ألفا < 250).
 * فحص عينات سريعة كل 16 بكسل لتفادي أي إجهاد للـ CPU/DOM.
 */
function checkCanvasHasAlpha(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
): boolean {
  try {
    const imgData = ctx.getImageData(0, 0, width, height);
    const data = imgData.data;
    for (let i = 3; i < data.length; i += 16) {
      if (data[i] < 250) {
        return true;
      }
    }
  } catch {
    return false;
  }
  return false;
}

function loadImageElement(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

/**
 * شبكة أمان العميل (Client-Side Transparency Safeguard):
 * إذا كانت الصورة الأصلية تحتوي على بكسلات شفافة (قص / عزل خلفية)،
 * ولكن خادم الذكاء الاصطناعي أعادها بدون شفافية (بخلفية سوداء JPEG)،
 * تُعاد زراعة قناع الشفافية الأصلي فوق الصورة المرممة باستخدام destination-in
 * بنعومة ومطابقة أبعاد 1:1.
 */
export async function ensureTransparencyPreserved(
  originalSrc: string,
  enhancedDataUrl: string,
): Promise<string> {
  // إذا كانت الصورة المحسنة تأتي كـ PNG وفيها شفافية بالفعل، لا حاجة للمعالجة
  if (enhancedDataUrl.startsWith('data:image/png')) {
    const testImg = await loadImageElement(enhancedDataUrl);
    if (testImg) {
      const testCanvas = document.createElement('canvas');
      testCanvas.width = testImg.naturalWidth || testImg.width;
      testCanvas.height = testImg.naturalHeight || testImg.height;
      const testCtx = testCanvas.getContext('2d');
      if (testCtx) {
        testCtx.drawImage(testImg, 0, 0);
        if (checkCanvasHasAlpha(testCtx, testCanvas.width, testCanvas.height)) {
          return enhancedDataUrl;
        }
      }
    }
  }

  // فحص ما إذا كانت الصورة الأصلية ذات خلفية شفافة
  const origImg = await loadImageElement(originalSrc);
  if (!origImg) return enhancedDataUrl;

  const origCanvas = document.createElement('canvas');
  const origW = origImg.naturalWidth || origImg.width;
  const origH = origImg.naturalHeight || origImg.height;
  origCanvas.width = origW;
  origCanvas.height = origH;
  const origCtx = origCanvas.getContext('2d');
  if (!origCtx) return enhancedDataUrl;

  origCtx.drawImage(origImg, 0, 0);
  const origHasAlpha = checkCanvasHasAlpha(origCtx, origW, origH);
  if (!origHasAlpha) {
    return enhancedDataUrl;
  }

  // الصورة الأصلية مقصوصة/شفافة ولكن النتيجة تفتقر للشفافية
  const enhancedImg = await loadImageElement(enhancedDataUrl);
  if (!enhancedImg) return enhancedDataUrl;

  const outCanvas = document.createElement('canvas');
  const outW = enhancedImg.naturalWidth || enhancedImg.width;
  const outH = enhancedImg.naturalHeight || enhancedImg.height;
  outCanvas.width = outW;
  outCanvas.height = outH;
  const outCtx = outCanvas.getContext('2d');
  if (!outCtx) return enhancedDataUrl;

  // 1. رسم الصورة المرممة
  outCtx.drawImage(enhancedImg, 0, 0, outW, outH);

  // 2. تطبيق قناع الشفافية الأصلي بدقة الأبعاد عبر destination-in
  outCtx.globalCompositeOperation = 'destination-in';
  outCtx.imageSmoothingEnabled = true;
  outCtx.imageSmoothingQuality = 'high';
  outCtx.drawImage(origImg, 0, 0, outW, outH);

  // 3. تصدير صورة PNG شفافة مطابقة للأصل
  return outCanvas.toDataURL('image/png');
}

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

      // فحص وجود قناة ألفا للحفاظ على الشفافية بصيغة PNG
      const hasAlpha = checkCanvasHasAlpha(ctx, w, h);
      if (hasAlpha) {
        resolve(canvas.toDataURL('image/png'));
      } else {
        resolve(canvas.toDataURL('image/jpeg', quality));
      }
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

    // 🛡️ خانة العمليات واحدة: عزل/تأطير جارٍ على أي عنصر يمنع بدء ترميم
    // متزامن (وإلا كتبت النتيجتان فوق بعضهما — last-write-wins صامت).
    const busyOpEnhance = useOperationStatusStore.getState().activeOperation;
    if (busyOpEnhance) {
      toast.warning(busyOpEnhance.title);
      return;
    }

    // 🔒 التحقق الدقيق من حد الاستهلاك اليومي المربوط بالحساب
    if (remainingQuota <= 0) {
      toast.warning(`وصلت الحد اليومي للذكاء الاصطناعي (${dailyLimit} صور/يومياً). يتجدد غداً`, {
        duration: 5000,
      });
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
      let base64Image: string;
      if (element.imageSrc.startsWith('/local-image/')) {
        // 🚀 مسار Go المباشر: نمرر مسار الصورة المحلي لـ Go ليقرأه ويهيئه ذاتياً
        // دون الحاجة لفتح DOM Image وتخصيص Canvas وتشفيره بـ toDataURL في المتصفح
        base64Image = element.imageSrc;
      } else {
        base64Image = await prepareImageForAiUpload(element.imageSrc, 2048, 0.92);
      }

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
          () => reject(new Error('تأخر الطلب. تحقق من حصتك اليومية — قد تكون المحاولة احتُسبت.')),
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
        // 🛡️ حماية الشفافية: استعادة قناع الشفافية الأصلي في حال تحول الخلفية لأسود
        const finalImagePayload = await ensureTransparencyPreserved(element.imageSrc, result.image);
        const localPath = await SaveImageFromBase64(finalImagePayload);

        // 🛡️ حارس الطزاثة الموحّد (`commitAiImageResult`, H3 من تدقيق 2026-10-08):
        // دورة الترميم السحابية تستغرق دقائق، فيُلغى التطبيق بصمت إن استُبدلت
        // الصورة أو تم التراجع أثناء الانتظار. يبحث المساعد في العناصر والخانات
        // معاً، ويتحقق من بقاء الهدف وطزاجة صورته، ثم يطبّق الرقعة ويدفع خطوة
        // تراجع واحدة (كان البحث في elements وحده يُسقط نتائج الكولاج).
        const commit = commitAiImageResult(element, localPath, onUpdateRef.current);
        if (commit === 'not-found') {
          toast.info('تم إلغاء الترميم: العنصر لم يعد موجوداً.');
          return;
        }
        if (commit === 'changed') {
          toast.info('تم إلغاء الترميم: تغيّرت الصورة أثناء المعالجة.');
          return;
        }
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
