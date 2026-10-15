import { useEffect, useRef } from 'react';
import { useEditorStore } from '@/lib/editor-store';
import { toast } from 'sonner';
import { SaveImageFromBase64 } from '@bindings/grido/app';
import { preloadImageIntoCache } from './use-async-image';
import { useOperationStatusStore } from '@/lib/ui/operation-status';
import { triggerMemoryTrim } from '@/lib/memory-trim';
import type { CanvasElement, CanvasSlot } from '@/lib/store/types';
import { create } from 'zustand';
import { createLogger } from '@/lib/logger';
import { toErrorMessage } from '@/lib/wails-error';

const logger = createLogger('use-face-frame');

interface FaceFrameState {
  isFraming: boolean;
  frameProgress: number;
  frameProgressText: string;
  setIsFraming: (val: boolean) => void;
  setFrameProgress: (val: number | ((prev: number) => number)) => void;
  setFrameProgressText: (val: string) => void;
}

export const useFaceFrameState = create<FaceFrameState>((set) => ({
  isFraming: false,
  frameProgress: 0,
  frameProgressText: '',
  setIsFraming: (val) => set({ isFraming: val }),
  setFrameProgress: (val) =>
    set((state) => ({
      frameProgress: typeof val === 'function' ? val(state.frameProgress) : val,
    })),
  setFrameProgressText: (val) => set({ frameProgressText: val }),
}));

/**
 * useFaceFrame — يضبط مقاس وموضع الوجه تلقائياً وفق معايير صور الهوية
 * داخل Web Worker حقيقي (face-frame.worker.ts) ليبقى الخيط الرئيسي حراً.
 * ميزة محلية 100% (بدون خادم/تكلفة) — متاحة لجميع المستخدمين بدون بوابة ترخيص.
 * الإلغاء = تسوية كل الطلبات المعلقة ثم terminate فوري للـ Worker.
 */

export type FramingPatch = Partial<Record<string, unknown>>;

interface FrameWorkerProgressMessage {
  type: 'progress';
  requestId: number;
  percent: number;
  text: string;
}
interface FrameWorkerErrorMessage {
  type: 'error';
  requestId: number;
  message: string;
}
interface FrameWorkerResultMessage {
  type: 'result';
  requestId: number;
  result: {
    pngBase64: string;
    outW: number;
    outH: number;
    detectedMs: number;
  };
}
type FrameWorkerMessage =
  FrameWorkerProgressMessage | FrameWorkerErrorMessage | FrameWorkerResultMessage;

let workerInstance: Worker | null = null;
let nextRequestId = 1;

// قفل مشترك على مستوى الوحدة (نفس نهج عزل الخلفية) — Worker واحد للتطبيق كله،
// وكل المثيلات (الشريط السريع + لوحة الخصائص) تشارك سجل الطلبات المعلقة.
let busyFrameRequestId = 0;

// عدّاد المستهلكين الأحياء: يمنع فكّ تركيب نسخة واحدة (مثلاً لوحة الخصائص عند
// إلغاء التحديد) من قتل عمل نسخة أخرى جارية وإسقاط callbacksها بصمت.
let activeConsumers = 0;

interface PendingFrameRequest {
  onMessage: (msg: FrameWorkerMessage) => void;
  onError: (message: string) => void;
  onCancelled: () => void;
}
const pendingFrameRequests = new Map<number, PendingFrameRequest>();

function getWorker(): Worker {
  if (!workerInstance) {
    workerInstance = new Worker(new URL('../workers/face-frame.worker.ts', import.meta.url), {
      type: 'module',
    });
    workerInstance.onmessage = (e: MessageEvent) => {
      const msg = e.data as FrameWorkerMessage | undefined;
      if (!msg || typeof msg.requestId !== 'number') return;
      pendingFrameRequests.get(msg.requestId)?.onMessage(msg);
    };
    workerInstance.onerror = (e) => {
      // 🛡️ نفس عقدة عزل الخلفية: لا يجوز إبقاء مرجع عامل انهار — الطلب التالي
      // سيرسل postMessage إلى عامل لا يرد فيبقى مؤشر التقدم معلّقاً بلا نهاية.
      // نُنهي العامل المُتعطّل فوراً (بعد التقاط الطلبات المعلقة) فيُبنى غيره.
      const message = e.message || 'فشل تشغيل عامل ضبط الوجه.';
      const pendingRequests = Array.from(pendingFrameRequests.values());
      terminateWorker();
      for (const pending of pendingRequests) {
        pending.onError(message);
      }
    };
  }
  return workerInstance;
}

function terminateWorker() {
  pendingFrameRequests.clear();
  busyFrameRequestId = 0;
  if (workerInstance) {
    try {
      workerInstance.terminate();
    } catch {
      /* ignore */
    }
    workerInstance = null;
  }
}

/**
 * إلغاء صريح شامل (زر الإلغاء): يُسوّي كل طلب معلّق على مستهلكه أولاً —
 * لا تُسقط أي callback بصمت خلاف terminateWorker المجرد — ثم يُنهي العامل
 * ويعيد حالة الواجهة المشتركة ويُغلق خانة العملية (إن كانت عملية تأطير).
 */
function cancelActiveFrameFlow() {
  const pendingRequests = Array.from(pendingFrameRequests.values());
  terminateWorker();
  const ui = useFaceFrameState.getState();
  ui.setIsFraming(false);
  ui.setFrameProgress(0);
  ui.setFrameProgressText('');
  // لا نلمس إلا عملية التأطير — ولو تغيّرت خانة العمليات لنوع آخر لأي سبب
  const activeOperation = useOperationStatusStore.getState().activeOperation;
  if (activeOperation?.type === 'face_frame') {
    useOperationStatusStore.getState().finishOperation(activeOperation.id);
  }
  for (const pending of pendingRequests) {
    pending.onCancelled();
  }
  toast.info('تم إلغاء العملية.');
}

// تنظيف الـ Worker عند إغلاق التطبيق لتحرير ذاكرة WebGL فوراً
if (typeof window !== 'undefined') {
  const handleBeforeUnload = () => terminateWorker();
  window.addEventListener('beforeunload', handleBeforeUnload);
}

/**
 * ⚡ استدعاء مسبق لنموذج كشف الوجه في الخلفية أثناء خمول التطبيق
 */
export function warmupFaceFrameWorker() {
  try {
    if (typeof window === 'undefined' || typeof Worker === 'undefined') return;
    const worker = getWorker();
    worker.postMessage({
      type: 'warmup',
      wasmBaseUrl: `${window.location.origin}/wasm`,
      modelUrl: `${window.location.origin}/models/face_landmarker.task`,
    });
  } catch (err) {
    console.debug('[useFaceFrame] Warmup skipped:', err);
  }
}

type FramingTarget = CanvasElement | CanvasSlot;

export function useFaceFrame(onUpdate: (id: string, patch: FramingPatch) => void) {
  const onUpdateRef = useRef(onUpdate);
  useEffect(() => {
    onUpdateRef.current = onUpdate;
  }, [onUpdate]);

  const {
    isFraming,
    frameProgress,
    frameProgressText,
    setIsFraming,
    setFrameProgress,
    setFrameProgressText,
  } = useFaceFrameState();
  const modelCachedRef = useRef(false);
  const activeRequestRef = useRef<number>(0);
  // 🛡️ معرّف العملية العامة النشطة — يُصفَّى عند إلغاء التركيب حتى لا تعلق
  // خانة العمليات (isFraming + activeOperation) بلا مستوطن.
  const activeOpRef = useRef<string | null>(null);

  useEffect(() => {
    activeConsumers += 1;
    return () => {
      activeConsumers -= 1;
      let releasedOwnWork = false;
      // 🧹 طلب هذه النسخة وحده يُزال — طلبات النسخ الأخرى تبقى حية في السجل المشترك
      const reqId = activeRequestRef.current;
      if (reqId) {
        pendingFrameRequests.delete(reqId);
        if (busyFrameRequestId === reqId) busyFrameRequestId = 0;
        activeRequestRef.current = 0;
        releasedOwnWork = true;
      }
      // 🛡️ (جلسة 0.76) فك النسخة المالكة يُنهي عمليتها النشطة حتى لا تعلق خانة العمليات
      if (activeOpRef.current) {
        useOperationStatusStore.getState().finishOperation(activeOpRef.current);
        activeOpRef.current = null;
        releasedOwnWork = true;
      }
      if (releasedOwnWork) {
        setIsFraming(false);
        setFrameProgress(0);
        setFrameProgressText('');
      }
      // 🧹 (جلسة 0.68) يُطلق العامل فور خلو السجل من أي عمل معلّق، أو عند مغادرة
      // آخر مستهلك دون عمل — دون قتل عمل معلّق لنسخة أخرى.
      if (pendingFrameRequests.size === 0 && (releasedOwnWork || activeConsumers <= 0)) {
        terminateWorker();
      }
    };
    // المُحدِّثات zustand مستقرة الهوية — التنظيف لمرة واحدة عند الفك فقط.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // إلغاء المستخدم الصريح — من أي نسخة (شريط سريع أو لوحة خصائص): مجرى مشترك
  // يُسوّي الطلبات المعلقة ثم يُنهي العامل، بلا حذف صامت ولا تكرار إشعارات.
  const handleCancelFrame = cancelActiveFrameFlow;

  const handleFrameFace = async (target: FramingTarget) => {
    const imageSrc = 'imageSrc' in target ? target.imageSrc : undefined;
    if (!imageSrc) return;

    if (busyFrameRequestId !== 0) {
      toast.warning('جاري التأطير ...');
      return;
    }

    // 🛡️ خانة العمليات واحدة: عزل/ترميم جارٍ يمنع بدء تأطير متزامن
    // (وإلا كتبت النتيجتان فوق بعضهما — last-write-wins صامت).
    const busyOpFrame = useOperationStatusStore.getState().activeOperation;
    if (busyOpFrame) {
      toast.warning(busyOpFrame.title);
      return;
    }

    if (typeof Worker === 'undefined') {
      toast.error('بيئة التشغيل الحالية لا تدعم Web Workers المطلوبة لضبط الوجه.');
      return;
    }

    const targetId = 'id' in target ? (target as { id: string }).id : undefined;
    const opId = useOperationStatusStore.getState().startOperation({
      type: 'face_frame',
      title: 'جاري ضبط وتأطير الوجه ...',
      targetId,
      canCancel: true,
      onCancel: cancelActiveFrameFlow,
    });

    setIsFraming(true);
    setFrameProgress(0);
    setFrameProgressText('جاري التهيئة ...');

    const requestId = nextRequestId++;
    busyFrameRequestId = requestId;
    activeRequestRef.current = requestId;
    activeOpRef.current = opId;
    const worker = getWorker();
    const startedAt = performance.now();

    // 🧹 تحرير فوري لكامل سياقات WebGL والذاكرة بإنهاء الـ Worker فور اكتمال المهمة
    const settle = () => {
      useOperationStatusStore.getState().finishOperation(opId);
      activeOpRef.current = null;
      pendingFrameRequests.delete(requestId);
      if (busyFrameRequestId === requestId) busyFrameRequestId = 0;
      if (activeRequestRef.current === requestId) activeRequestRef.current = 0;
      setIsFraming(false);
      setFrameProgressText('');
      setFrameProgress(0);
      // 🧹 (جلسة 0.68) تحرير فوري لسياقات WebGL فور خلو السجل من أي عمل معلّق
      if (pendingFrameRequests.size === 0) terminateWorker();
      triggerMemoryTrim();
    };

    pendingFrameRequests.set(requestId, {
      onError: (message: string) => {
        if (activeRequestRef.current !== requestId) return;
        settle();
        toast.error(message);
      },
      onCancelled: () => {
        if (activeRequestRef.current !== requestId) return;
        settle();
      },
      onMessage: async (msg: FrameWorkerMessage) => {
        if (activeRequestRef.current !== requestId) return;

        if (msg.type === 'progress') {
          setFrameProgress(msg.percent);
          setFrameProgressText(msg.text);
          return;
        }

        if (msg.type === 'error') {
          settle();
          toast.error(msg.message);
          return;
        }

        if (msg.type === 'result') {
          const { pngBase64, outW, outH, detectedMs } = msg.result;

          try {
            setFrameProgressText('جاري حفظ الصورة المقتصة ...');
            const dataUrl = `data:image/png;base64,${pngBase64}`;
            const localPath = await SaveImageFromBase64(dataUrl);
            await preloadImageIntoCache(localPath);

            const patch: FramingPatch = { imageSrc: localPath };
            if ('originalImageSrc' in target && !target.originalImageSrc) {
              patch.originalImageSrc = imageSrc;
            }
            // في وضع الكولاج: الصورة المقتصة تطابق نسبة الخلية تماماً
            // فتصبح الإزاحة والزوم السابقة غير ضرورية — نُصفرهما لتطابق مثالي.
            if (!('width' in target)) {
              patch.zoom = 1;
              patch.dragX = 0;
              patch.dragY = 0;
            }
            onUpdateRef.current(target.id, patch);
            useEditorStore.getState().pushHistory();

            modelCachedRef.current = true;
            const totalSec = Math.round((performance.now() - startedAt) / 100) / 10;
            console.debug(
              `[Face-Frame] detection: ${detectedMs}ms, crop: ${outW}x${outH}, total: ${totalSec}s`,
            );
            toast.success('تم ضبط مقاس الوجه وموضعه وفق معايير الهوية.');
          } catch (err) {
            logger.error('Failed to save framed image:', err);
            toast.error(toErrorMessage(err, 'فشل حفظ الصورة بعد ضبط الوجه.'));
          } finally {
            settle();
          }
        }
      },
    });

    // نسبة أبعاد إطار الهوية الحالي (صندوق العنصر/الخلية بالبكسل)
    const state = useEditorStore.getState();
    const canvasW = state.canvasWidth || 1;
    const canvasH = state.canvasHeight || 1;
    const isSlotTarget = !('width' in target);
    let aspectRatio = 1;
    if (isSlotTarget) {
      const slot = target as CanvasSlot;
      aspectRatio = (slot.w * canvasW) / (slot.h * canvasH);
    } else {
      const el = target as CanvasElement;
      aspectRatio = (el.width * canvasW) / (el.height * canvasH);
    }
    if (!(aspectRatio > 0) || !Number.isFinite(aspectRatio)) {
      aspectRatio = 1;
    }

    worker.postMessage({
      type: 'frame',
      requestId,
      imageSrc,
      wasmBaseUrl: `${window.location.origin}/wasm`,
      modelUrl: `${window.location.origin}/models/face_landmarker.task`,
      aspectRatio,
    });
  };

  return {
    isFraming,
    frameProgress,
    frameProgressText,
    handleCancelFrame,
    handleFrameFace,
  };
}
