import { useRef, useEffect } from 'react';
import { toast } from 'sonner';
import { create } from 'zustand';

import { SaveImageFromBase64, EnhanceImageWithAI, GetImageDimensions } from '@bindings/grido/app';

import { commitAiImageResult, findLiveAiTarget } from '@/lib/ai/ai-result-commit';
import {
  aiPlanDailyLimit,
  parseQuotaSnapshotFromResponse,
  resolveAiQuota,
  type AiQuotaSnapshot,
} from '@/lib/ai/quota';
import { useRenderQuality } from '@/lib/canvas/render-quality';
import { useEditorStore } from '@/lib/editor-store';
import { getDocumentSession } from '@/lib/io/document-session';
import { createLogger } from '@/lib/logger';
import { useOperationStatusStore } from '@/lib/ui/operation-status';
import { toErrorMessage } from '@/lib/wails-error';

import type { AiImageDimensions } from '@/lib/ai/ai-result-commit';

interface AiEnhanceState {
  isEnhancing: boolean;
  enhanceProgress: number;
  enhanceProgressText: string;
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

export function resetAiEnhanceQuota(): void {
  useAiEnhanceState.setState({ serverQuota: null });
}

if (typeof window !== 'undefined') {
  window.addEventListener('grido:auth-logout', resetAiEnhanceQuota);
}

// 🛡️ الحصة اليومية تُحسم في وحدة واحدة (`@/lib/ai/quota`): لقطة الخادم أولاً،
// واحتياطي محلي على **يوم UTC** قبل أول عملية في اليوم — لا اشتقاق محلي موازٍ
// بيوم محلي (كان يعرض رصيداً متبقياً بينما يرفض الخادم الطلب — التدقيق 12/F-01).

function checkCanvasHasAlpha(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
): boolean {
  const { data } = ctx.getImageData(0, 0, width, height);
  for (let i = 3; i < data.length; i += 4) {
    if (data[i] < 255) return true;
  }
  return false;
}

function loadImageElement(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    const settle = (value: HTMLImageElement | null) => {
      clearTimeout(timer);
      img.onload = null;
      img.onerror = null;
      resolve(value);
    };
    const timer = setTimeout(() => settle(null), 10_000);
    img.onload = () => settle(img);
    img.onerror = () => settle(null);
    img.src = src;
  });
}

/** قياس المصدر الفعلي والناتج المحفوظ، بلا افتراض ×2 أو العودة لأصل أقدم. */
async function measureAiImageDimensions(src: string): Promise<AiImageDimensions> {
  let dimensions: AiImageDimensions;
  if (src.startsWith('/local-image/')) {
    const measured = await GetImageDimensions(src);
    dimensions = measured.isRotated
      ? { width: measured.height, height: measured.width }
      : { width: measured.width, height: measured.height };
  } else {
    // الأبعاد الطبيعية في المتصفح موجهة بـ EXIF بالفعل؛ لا ندوّرها مرة ثانية.
    const image = await loadImageElement(src);
    dimensions = { width: image?.naturalWidth ?? 0, height: image?.naturalHeight ?? 0 };
  }
  if (
    !Number.isFinite(dimensions.width) ||
    !Number.isFinite(dimensions.height) ||
    dimensions.width <= 0 ||
    dimensions.height <= 0
  ) {
    throw new Error('تعذر التحقق من أبعاد الصورة؛ لم تُطبّق النتيجة حفاظاً على قصّ الكولاج.');
  }
  return dimensions;
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
  const img = await loadImageElement(src);
  if (!img) throw new Error('تعذر تحميل الصورة للتحسين.');
  const width = img.naturalWidth || img.width;
  const height = img.naturalHeight || img.height;
  const scale = Math.min(1, maxDim / Math.max(width, height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(width * scale));
  canvas.height = Math.max(1, Math.round(height * scale));
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('تعذر تجهيز الصورة للتحسين.');
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  return checkCanvasHasAlpha(ctx, canvas.width, canvas.height)
    ? canvas.toDataURL('image/png')
    : canvas.toDataURL('image/jpeg', quality);
}

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

    const requestState = useEditorStore.getState();
    const target = { id: element.id, imageSrc: element.imageSrc };
    if (findLiveAiTarget(target.id)?.imageSrc !== target.imageSrc) return;
    const kind = requestState.elements.some((item) => item.id === target.id) ? 'element' : 'slot';
    const documentSession = getDocumentSession();
    const projectId = requestState.projectId;
    const userEmail = requestState.user?.email;
    const opId = useOperationStatusStore.getState().startOperation({
      type: 'ai_enhance',
      title: 'جاري ترميم الصورة ...',
      targetId: target.id,
      canCancel: false,
    });
    setIsEnhancing(true);
    useRenderQuality.getState().setEnhancingElementId(target.id);
    setEnhanceProgress(0);
    setEnhanceProgressText('جاري تجهيز الصورة ...');
    const AI_ENHANCE_TIMEOUT_MS = 200000;
    const started = performance.now();
    const deadline = started + AI_ENHANCE_TIMEOUT_MS;
    const withinDeadline = async <T>(operation: () => Promise<T>): Promise<T> => {
      const remaining = deadline - performance.now();
      const error = new Error('تأخر الطلب. تحقق من حصتك اليومية — قد تكون المحاولة احتُسبت.');
      if (remaining <= 0) throw error;
      let timer: ReturnType<typeof setTimeout> | undefined;
      try {
        return await Promise.race([
          operation(),
          new Promise<never>((_, reject) => {
            timer = setTimeout(() => reject(error), remaining);
          }),
        ]);
      } finally {
        clearTimeout(timer);
      }
    };

    let progressTimer: ReturnType<typeof setInterval> | null = null;
    try {
      setEnhanceProgress(10);
      setEnhanceProgressText('جاري فحص وتجهيز الصورة ...');
      const sourceDimensions = await withinDeadline(() =>
        measureAiImageDimensions(target.imageSrc),
      );
      const base64Image = target.imageSrc.startsWith('/local-image/')
        ? target.imageSrc
        : await withinDeadline(() => prepareImageForAiUpload(target.imageSrc));
      if (
        documentSession !== getDocumentSession() ||
        userEmail !== useEditorStore.getState().user?.email
      )
        return;

      setEnhanceProgress(25);
      setEnhanceProgressText('إرسال الصورة إلى سيرفر المعالجة ...');

      // عداد التقدم الديناميكي أثناء معالجة الخادم السحابي
      progressTimer = setInterval(() => {
        setEnhanceProgress((prev) => {
          if (prev < 45) {
            setEnhanceProgressText('كشف معالم الوجه ومحاذاة البكسلات ...');
            return prev + 5;
          }
          if (prev < 75) {
            setEnhanceProgressText('ترميم العيون والملامح وتكبير الدقة ...');
            return prev + 3;
          }
          if (prev < 90) {
            setEnhanceProgressText('إنهاء اللمسات الأخيرة واسترجاع النتيجة ...');
            return prev + 1;
          }
          return prev;
        });
      }, 350);

      const resultStr = await withinDeadline(() =>
        EnhanceImageWithAI(base64Image, requestState.user?.token || '', dailyLimit),
      );

      if (progressTimer) {
        clearInterval(progressTimer);
        progressTimer = null;
      }
      setEnhanceProgress(92);
      const result = JSON.parse(resultStr);
      if (
        !result ||
        typeof result.image !== 'string' ||
        !/^data:image\/(png|jpeg);base64,/.test(result.image)
      ) {
        throw new Error('أعاد خادم الترميم نتيجة غير صالحة.');
      }
      if (userEmail !== useEditorStore.getState().user?.email) return;
      const snapshot = parseQuotaSnapshotFromResponse(result, Date.now(), userEmail);
      if (snapshot) useAiEnhanceState.getState().setServerQuota(snapshot);
      const duration = result.execution_seconds;
      const cost = result.total_cost_usd ?? result.cost_usd;
      useEditorStore.getState().logAiUsage({
        email: userEmail || 'unknown',
        serviceName: 'ترميم الوجوه بالذكاء الاصطناعي (CodeFormer)',
        source: 'Grido Studio Desktop',
        durationSec:
          typeof duration === 'number' && Number.isFinite(duration) && duration >= 0
            ? duration
            : (performance.now() - started) / 1000,
        costUsd: typeof cost === 'number' && Number.isFinite(cost) && cost >= 0 ? cost : 0,
        status: 'success',
      });
      if (
        documentSession !== getDocumentSession() ||
        projectId !== useEditorStore.getState().projectId
      )
        return;
      const live = findLiveAiTarget(target.id);
      if (!live) {
        toast.info('تم إلغاء الترميم: العنصر لم يعد موجوداً.');
        return;
      }
      if (live.imageSrc !== target.imageSrc) {
        toast.info('تم إلغاء الترميم: تغيّرت الصورة أثناء المعالجة.');
        return;
      }
      setEnhanceProgress(96);
      setEnhanceProgressText('جاري تطبيق الصورة ...');
      const payload = await withinDeadline(() =>
        ensureTransparencyPreserved(target.imageSrc, result.image),
      );
      const imageSrc = await withinDeadline(() => SaveImageFromBase64(payload));
      const resultDimensions = await withinDeadline(() => measureAiImageDimensions(imageSrc));

      if (
        documentSession !== getDocumentSession() ||
        projectId !== useEditorStore.getState().projectId ||
        userEmail !== useEditorStore.getState().user?.email
      ) {
        return;
      }

      const commit = commitAiImageResult(
        target,
        imageSrc,
        onUpdateRef.current,
        kind === 'slot' ? { source: sourceDimensions, result: resultDimensions } : undefined,
      );
      if (commit === 'not-found') {
        toast.info('تم إلغاء الترميم: العنصر لم يعد موجوداً.');
        return;
      }
      if (commit === 'changed') {
        toast.info('تم إلغاء الترميم: تغيّرت الصورة أثناء المعالجة.');
        return;
      }
      setEnhanceProgress(100);
      toast.success('تم ترميم الصورة بنجاح وتطبيقها مباشرة! (يمكنك التراجع بـ Ctrl+Z)');
    } catch (err) {
      if (progressTimer) {
        clearInterval(progressTimer);
        progressTimer = null;
      }
      createLogger('ai-enhance').error('AI Enhance failed:', err);
      toast.error(toErrorMessage(err, 'فشل تحسين الصورة بالذكاء الاصطناعي'));
    } finally {
      if (progressTimer) {
        clearInterval(progressTimer);
        progressTimer = null;
      }
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
