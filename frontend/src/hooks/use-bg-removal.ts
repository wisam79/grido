import { useEffect, useRef } from 'react';
import { useEditorStore } from '@/lib/editor-store';
import { toast } from 'sonner';
import { ApplyMaskToImage } from '@bindings/grido/app';
import { commitAiImageResult } from '@/lib/ai/ai-result-commit';
import { preloadImageIntoCache } from './use-async-image';
import { fetchLocalApi } from '@/lib/local-api';
import { createLogger } from '@/lib/logger';
import { toErrorMessage } from '@/lib/wails-error';

const logger = createLogger('bg-removal');
import { useOperationStatusStore } from '@/lib/ui/operation-status';
import { triggerMemoryTrim } from '@/lib/memory-trim';
import { create } from 'zustand';

interface BgRemovalState {
  isRemovingBg: boolean;
  bgProgress: number;
  bgProgressText: string;
  setIsRemovingBg: (val: boolean) => void;
  setBgProgress: (val: number) => void;
  setBgProgressText: (val: string) => void;
}

export const useBgRemovalState = create<BgRemovalState>((set) => ({
  isRemovingBg: false,
  bgProgress: 0,
  bgProgressText: '',
  setIsRemovingBg: (val) => set({ isRemovingBg: val }),
  setBgProgress: (val) => set({ bgProgress: val }),
  setBgProgressText: (val) => set({ bgProgressText: val }),
}));

/**
 * useBgRemoval — يشغّل عزل الخلفية داخل Web Worker حقيقي (bg-removal.worker.ts)
 * ليبقى الخيط الرئيسي حراً أثناء تحميل النموذج والاستدلال.
 * الإلغاء = terminate قسري فوري للـ Worker (يوقف حتى الاستدلال الجزئي ويحرر WebGL).
 */

let workerInstance: Worker | null = null;
let nextRequestId = 1;

// حالة «عملية جارية» مشتركة على مستوى الوحدة: الـ Worker واحد للتطبيق كله،
// لكن كل مثيل Hook كان يمتلك isBusyRef خاصاً — فكان مثيلان (الشريط السريع
// واللوحة الجانبية) يبدآن عمليتين على العامل نفسه ويُعاد تعيين onmessage
// فتضيع نتيجة الأولى. الحل: قفل مشترك + توزيع رسائل العامل على مالك requestId.
let busyRequestId = 0;

// كاش الذاكرة اللحظي لنتائج العزل لنفس الصورة لمنع تكرار الاستدلال
const bgResultCache = new Map<string, string>();
if (typeof window !== 'undefined') {
  // مسح الكاش عند الخمول التام أو قبل إغلاق التطبيق
  window.addEventListener('beforeunload', () => bgResultCache.clear());
}

interface BgRemovalElement {
  id: string;
  imageSrc?: string;
  originalImageSrc?: string;
}

type BgRemovalPatch = Partial<BgRemovalElement>;

interface BgWorkerMessage {
  type: string;
  requestId?: number;
  percent?: number;
  text?: string;
  message?: string;
  result?: {
    maskBuffer?: ArrayBufferLike;
    maskBase64?: string;
    targetW: number;
    targetH: number;
    inferredMs: number;
  };
}

interface PendingBgRequest {
  onMessage: (msg: BgWorkerMessage) => void;
  onError: (message: string) => void;
}
const pendingBgRequests = new Map<number, PendingBgRequest>();

function getWorker(): Worker {
  if (!workerInstance) {
    workerInstance = new Worker(new URL('../workers/bg-removal.worker.ts', import.meta.url), {
      type: 'module',
    });
    // موزّع رسائل واحد ثابت — لا يُعاد تعيينه مع كل طلب جديد
    workerInstance.onmessage = (e: MessageEvent) => {
      const msg = e.data;
      if (!msg || typeof msg.requestId !== 'number') return;
      pendingBgRequests.get(msg.requestId)?.onMessage(msg);
    };
    workerInstance.onerror = (e) => {
      // 🛡️ العامل الميت كان يُعاد استخدامه للأبد: هذا المعالج كان يبلّغ الطلبات
      // المعلقة فقط، ويبقى `workerInstance` مرجعاً لعامل انهار — فأي طلب لاحق
      // يُرسل postMessage إلى عامل لا يرد أبداً، فيبقى مؤشر التقدم («جاري
      // العزل») ظاهراً بلا نهاية حتى يضغط المستخدم «إلغاء» بنفسه.
      // الإصلاح: نُنهي العامل المُتعطّل فوراً فيُبنى عامل جديد عند الطلب التالي.
      // (نلتقط الطلبات المعلقة قبل الإنهاء لأن terminateWorker يمسح السجل.)
      const message = e.message || 'فشل تشغيل عامل عزل الخلفية.';
      const pendingRequests = Array.from(pendingBgRequests.values());
      terminateWorker();
      for (const pending of pendingRequests) {
        pending.onError(message);
      }
    };
  }
  return workerInstance;
}

function terminateWorker() {
  // أي مكالمة terminate تُسقط كل الطلبات المعلقة (العملية المشتركة تموت)
  pendingBgRequests.clear();
  busyRequestId = 0;
  if (workerInstance) {
    try {
      workerInstance.terminate();
    } catch {
      /* ignore */
    }
    workerInstance = null;
  }
}

// تنظيف الـ Worker عند إغلاق التطبيق لتحرير ذاكرة WebGL فوراً
if (typeof window !== 'undefined') {
  const handleBeforeUnload = () => terminateWorker();
  window.addEventListener('beforeunload', handleBeforeUnload);
}

/**
 * ⚡ استدعاء مسبق للنموذج في الخلفية أثناء خمول التطبيق لتصفير زمن أول نقرة
 */
export function warmupBgRemovalWorker() {
  try {
    if (typeof window === 'undefined' || typeof Worker === 'undefined') return;
    const worker = getWorker();
    worker.postMessage({
      type: 'warmup',
      wasmBaseUrl: `${window.location.origin}/wasm`,
      modelUrl: `${window.location.origin}/models/selfie_multiclass.tflite`,
    });
  } catch (err) {
    console.debug('[useBgRemoval] Warmup skipped:', err);
  }
}

export function useBgRemoval(onUpdate: (id: string, patch: BgRemovalPatch) => void) {
  const onUpdateRef = useRef(onUpdate);
  useEffect(() => {
    onUpdateRef.current = onUpdate;
  }, [onUpdate]);

  const isRemovingBg = useBgRemovalState((s) => s.isRemovingBg);
  const bgProgress = useBgRemovalState((s) => s.bgProgress);
  const bgProgressText = useBgRemovalState((s) => s.bgProgressText);
  const setIsRemovingBg = useBgRemovalState((s) => s.setIsRemovingBg);
  const setBgProgress = useBgRemovalState((s) => s.setBgProgress);
  const setBgProgressText = useBgRemovalState((s) => s.setBgProgressText);
  const modelCachedRef = useRef(false);
  const activeRequestRef = useRef<number>(0);

  useEffect(() => {
    return () => {
      // نترك الطلب الجاري يستكمل في الخلفية دون إلغائه عند إغلاق القوائم المنبثقة (مثل ContextMenu)
    };
  }, []);

  const handleCancelBgRemoval = () => {
    // 🛑 إلغاء قسري حقيقي: إنهاء الـ Worker يوقف الاستدلال فوراً حتى في منتصفه
    // (النموذج سيُعاد تحميله عند الاستخدام التالي — مقايضة مقبولة مقابل استجابة الواجهة).
    // terminateWorker يسقط كل الطلبات المعلقة من القفل المشترك.
    activeRequestRef.current = 0;
    terminateWorker();
    setIsRemovingBg(false);
    setBgProgress(0);
    setBgProgressText('');
    useOperationStatusStore.getState().cancelActiveOperation();
    toast.info('تم إلغاء العملية.');
  };

  const handleRemoveBg = async (element: BgRemovalElement) => {
    if (!element.imageSrc) return;

    // التحقق من صلاحية الترخيص
    const isLicenseActive = useEditorStore.getState().isLicenseActive;
    if (!isLicenseActive()) {
      toast.error('ميزة عزل الخلفية متوفرة فقط في الخطة الاحترافية (Pro).', {
        action: {
          label: 'تفعيل الآن',
          onClick: () => {
            useEditorStore.getState().setAccountModalOpen(true);
          },
        },
      });
      return;
    }

    // ⚡ فحص الكاش الفوري: إذا عُزلت هذه الصورة مسبقاً، طبّق النتيجة في 0ms بلا استدلال
    if (element.imageSrc && bgResultCache.has(element.imageSrc)) {
      const cachedPath = bgResultCache.get(element.imageSrc)!;
      await preloadImageIntoCache(cachedPath);
      const commit = commitAiImageResult(element, cachedPath, onUpdateRef.current);
      if (commit === 'ok') {
        toast.success('تم تطبيق عزل الخلفية من الكاش فوراً ⚡');
        return;
      }
    }

    // القفل على مستوى الوحدة — أي مثيل Hook آخر يرى العملية الجارية
    if (busyRequestId !== 0) {
      toast.warning('جاري العزل ...');
      return;
    }

    if (typeof Worker === 'undefined') {
      toast.error('بيئة التشغيل الحالية لا تدعم Web Workers المطلوبة لعزل الخلفية.');
      return;
    }

    const opId = useOperationStatusStore.getState().startOperation({
      type: 'bg_removal',
      title: 'جاري عزل الخلفية ...',
      targetId: element.id,
      canCancel: true,
      onCancel: handleCancelBgRemoval,
    });

    setIsRemovingBg(true);
    setBgProgress(0);
    setBgProgressText('جاري التهيئة ...');

    const requestId = nextRequestId++;
    busyRequestId = requestId;
    activeRequestRef.current = requestId;
    const worker = getWorker();
    const startedAt = performance.now();

    // إنهاء مشترك بين المسارات الثلاثة (نتيجة/خطأ/إلغاء خارجي)
    // 🧹 تحرير فوري لكامل سياقات WebGL والذاكرة بإنهاء الـ Worker فور اكتمال المهمة
    const settle = () => {
      useOperationStatusStore.getState().finishOperation(opId);
      pendingBgRequests.delete(requestId);
      if (busyRequestId === requestId) busyRequestId = 0;
      if (activeRequestRef.current === requestId) activeRequestRef.current = 0;
      setIsRemovingBg(false);
      setBgProgressText('');
      setBgProgress(0);
      terminateWorker();
      triggerMemoryTrim();
    };

    pendingBgRequests.set(requestId, {
      onError: (message: string) => {
        if (activeRequestRef.current !== requestId) return;
        settle();
        toast.error(message);
      },
      onMessage: async (msg: BgWorkerMessage) => {
        if (activeRequestRef.current !== requestId) return;

        if (msg.type === 'progress') {
          setBgProgress(msg.percent ?? 0);
          setBgProgressText(msg.text ?? '');
          return;
        }

        if (msg.type === 'error') {
          settle();
          toast.error(msg.message);
          return;
        }

        if (msg.type === 'result') {
          const { maskBuffer, maskBase64, targetW, targetH, inferredMs } = msg.result as {
            maskBuffer?: ArrayBufferLike;
            maskBase64?: string;
            targetW: number;
            targetH: number;
            inferredMs: number;
          };

          // مؤشر «العزل» يبقى ظاهراً حتى تُطبَّق النتيجة وتُفكّضغط في كاش الصور،
          // وبعدها نُسقط المؤشر في نفس الإطار — فلا تظهر «فجوة» بينه وبين الكانفس.
          try {
            setBgProgressText('جاري تجهيز الصورة ...');
            let localPath: string;

            if (maskBuffer) {
              // ⚡ نقل ثنائي مباشر وخام عبر الجسر فائق السرعة دون أي تشفير Base64
              const url = `/api/apply-mask?src=${encodeURIComponent(element.imageSrc || '')}&w=${targetW}&h=${targetH}`;
              // 🔑 fetchLocalApi يضيف ترويسة توكن الجلسة التي تفرضها الخلفية على
              // مسارات /api (فحص الأصل وحده لا يحجب عملية محلية تُرسل طلباً مباشراً)
              const response = await fetchLocalApi(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/octet-stream' },
                body: maskBuffer as BodyInit,
              });
              if (!response.ok) {
                const errText = await response.text();
                throw new Error(errText || 'فشل معالجة القناع الثنائي عبر الجسر');
              }
              const data = await response.json();
              localPath = data.imageSrc;
            } else if (maskBase64) {
              // مسار احتياطي عبر Wails RPC في حال وصول Base64
              localPath = await ApplyMaskToImage(
                element.imageSrc || '',
                maskBase64,
                targetW,
                targetH,
              );
            } else {
              throw new Error('بيانات القناع مفقودة');
            }

            await preloadImageIntoCache(localPath);

            // 🛡️ حارس الطزاثة الموحّد (`commitAiImageResult`, H3 من تدقيق 2026-10-08):
            // العملية تستغرق ثوانيَ ودقائق، وقد يستبدل المستخدم الصورة أو يحذف
            // الهدف أو يتراجع أثناءها. يبحث المساعد في العناصر والخانات معاً،
            // ويتحقق أن الهدف ما زال موجوداً وصورته لم تتغيّر، ثم يطبّق الرقعة
            // ويدفع خطوة تراجع واحدة (كان البحث في elements وحده يُسقط نتائج الكولاج).
            const commit = commitAiImageResult(element, localPath, onUpdateRef.current);
            if (commit === 'not-found') {
              toast.info('تم إلغاء عزل الخلفية: العنصر لم يعد موجوداً.');
              return;
            }
            if (commit === 'changed') {
              toast.info('تم إلغاء عزل الخلفية: تغيّرت الصورة أثناء المعالجة.');
              return;
            }
            if (element.imageSrc) {
              bgResultCache.set(element.imageSrc, localPath);
            }
            toast.success('تم عزل خلفية الصورة بنجاح');

            // ⏱️ توثيق القياسات الفعلية بدلاً من القيم الثابتة (الاستدلال محلي — لا تكلفة سحابية)
            const totalSec = Math.round((performance.now() - startedAt) / 100) / 10;
            const user = useEditorStore.getState().user;
            useEditorStore.getState().logAiUsage({
              email: user?.email || 'unknown',
              serviceName: 'عزل الخلفية الذكي (AI Background Removal)',
              source: 'Grido Studio Desktop (Windows)',
              durationSec: totalSec,
              costUsd: 0,
              status: 'success',
            });
            modelCachedRef.current = true;
            if (inferredMs > 0) {
              // قياس زمن الاستدلال الخام متاح في وحدة التحكم للتشخيص
              console.debug(`[BG-Removal] inference: ${inferredMs}ms, total: ${totalSec}s`);
            }
          } catch (err) {
            logger.error('Failed to apply background mask:', err);
            toast.error(toErrorMessage(err, 'فشل تجهيز الصورة النهائية بعد العزل.'));
          } finally {
            // إسقاط المؤشر بعد تطبيق النتيجة (أو فشلها) — يحدث التبديل في نفس الدفعة
            settle();
          }
        }
      },
    });

    worker.postMessage({
      type: 'segment',
      requestId,
      imageSrc: element.imageSrc,
      wasmBaseUrl: `${window.location.origin}/wasm`,
      modelUrl: `${window.location.origin}/models/selfie_multiclass.tflite`,
    });
  };

  return {
    isRemovingBg,
    bgProgress,
    bgProgressText,
    handleCancelBgRemoval,
    handleRemoveBg,
  };
}
