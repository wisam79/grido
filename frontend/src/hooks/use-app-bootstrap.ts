import { useState, useEffect, useRef, useCallback } from 'react';
import { toast } from 'sonner';

import {
  GetStartupFile,
  ProcessLocalImageFile,
  CheckPendingCrashReport,
  DismissCrashReport,
} from '@bindings/grido/app';

import { clearAutoSave } from '@/hooks/use-autosave';
import { buildCollageInsertPlan } from '@/lib/canvas/collage-insert';
import { resolveBatchImageAspectRatios } from '@/lib/canvas/image-dimensions';
import { addImageFromSrc } from '@/lib/canvas/load-image';
import { useEditorStore } from '@/lib/editor-store';
import { getDocumentSession } from '@/lib/io/document-session';
import { createLogger } from '@/lib/logger';
import {
  isLicenseCheckInvalidatedError,
  isSessionSupersededError,
  sessionSupersededMessage,
} from '@/lib/store/slices/license-slice';
import { toErrorMessage } from '@/lib/wails-error';

import { EventsOn } from '../../wailsjs/runtime/runtime';

import type { CrashReport } from '@bindings/grido/internal/service/models';

const logger = createLogger('useAppBootstrap');
const SLOW_INITIALIZATION_MS = 4000;

export type AppInitializationStatus = 'checking' | 'slow' | 'error' | 'ready';

export interface AppBootstrapState {
  isInitializing: boolean;
  initializationStatus: AppInitializationStatus;
  retryInitialization: () => void;
  crashReport: CrashReport | null;
  handleRecoverCrash: () => Promise<void>;
  handleDismissCrash: () => Promise<void>;
}

export function useAppBootstrap(): AppBootstrapState {
  const [initializationStatus, setInitializationStatus] =
    useState<AppInitializationStatus>('checking');
  const [initializationAttempt, setInitializationAttempt] = useState(0);
  const [crashReport, setCrashReport] = useState<CrashReport | null>(null);
  const retryAvailableRef = useRef(false);
  const isInitializing = initializationStatus !== 'ready';

  const checkLicenseStatus = useEditorStore((state) => state.checkLicenseStatus);
  const setAccountModalOpen = useEditorStore((state) => state.setAccountModalOpen);

  const retryInitialization = useCallback(() => {
    if (!retryAvailableRef.current) return;
    retryAvailableRef.current = false;
    setInitializationStatus('checking');
    setInitializationAttempt((attempt) => attempt + 1);
  }, []);

  const handleRecoverCrash = async () => {
    try {
      if (typeof DismissCrashReport === 'function') {
        await DismissCrashReport();
      }
    } catch (e) {
      logger.error('Failed to dismiss crash report:', e);
    }
    setCrashReport(null);
    // 🛡️ صدق الرسائل: هذا المسار يُسقط التقرير فقط — التحميل الفعلي بيد
    // useAutoSave عند الإقلاع، فلا ندّعي استعادة تحققنا منها.
    toast.success('تمت متابعة العمل على المسودة الحالية');
  };

  const handleDismissCrash = async () => {
    const session = getDocumentSession();
    try {
      if (typeof DismissCrashReport === 'function') {
        await DismissCrashReport();
      }
      // Do not reset a project opened while the report was being dismissed.
      if (getDocumentSession() !== session) return;
      useEditorStore.getState().reset();
      const resetSession = getDocumentSession();
      // Queue immediately after reset: old writes drain before the clear, while
      // edits made during the clear are saved after it, never erased by it.
      await clearAutoSave(resetSession);
      if (getDocumentSession() !== resetSession) return;
    } catch (e) {
      logger.error('Failed to dismiss crash report:', e);
    } finally {
      setCrashReport(null);
    }
    toast.info('تم بدء مشروع جديد');
  };

  useEffect(() => {
    let cancelled = false;
    retryAvailableRef.current = false;
    // المهلة تنبيه عرض فقط؛ لا تُنتج ملف ترخيص فارغاً ولا تنهي التهيئة.
    const slowTimer = setTimeout(() => {
      if (!cancelled) setInitializationStatus('slow');
    }, SLOW_INITIALIZATION_MS);

    const bootstrap = async () => {
      let licenseResolved = false;
      while (!cancelled && !licenseResolved) {
        try {
          // الخلفية قد تعيد ترخيصاً محلياً متحققاً وفق سياسة عدم الاتصال.
          // خطأ IPC ليس نتيجة ترخيص، فلا نستبدله بحالة قديمة من الواجهة.
          const profile = await checkLicenseStatus({ throwOnError: true });
          if (cancelled) return;
          if (!profile || !profile.token) setAccountModalOpen(true);
          licenseResolved = true;
        } catch (err) {
          if (cancelled) return;
          // تغيرت الجلسة أثناء الطلب: انتظر فحص جيلها الحالي، لا نتيجة الطلب القديم.
          if (isLicenseCheckInvalidatedError(err)) continue;
          if (isSessionSupersededError(err)) {
            toast.error(sessionSupersededMessage(err), { duration: 8000 });
            licenseResolved = true;
          } else {
            clearTimeout(slowTimer);
            logger.error('Failed to check license status during init:', err);
            retryAvailableRef.current = true;
            setInitializationStatus('error');
            return;
          }
        }
      }
      if (cancelled) return;

      // ملء سجلات استخدام AI من AppData (مع ترحيل localStorage القديم)
      void useEditorStore.getState().hydrateAiUsageLogs();
      // فحص وجود صورة ممررة عند الإقلاع (مثل النقر بالزر الأيمن "فتح بواسطة" في ويندوز)
      try {
        if (typeof GetStartupFile === 'function') {
          const startupUrl = await GetStartupFile();
          if (cancelled) return;
          if (startupUrl) void addImageFromSrc(startupUrl, { setSingleMode: true });
        }
      } catch (startupErr) {
        if (cancelled) return;
        // تجاهل في بيئة الاختبارات (لا واجهة Wails) — وسجّل في الإنتاج
        // حتى لا يفشل فتح الملف بالنقر المزدوج بصمت تام.
        if (typeof GetStartupFile === 'function') {
          logger.error('Failed to open startup file:', startupErr);
          toast.error(toErrorMessage(startupErr, 'تعذّر فتح الملف الممرر عند الإقلاع'));
        }
      }
      if (cancelled) return;
      // فحص وجود تقرير انهيار سابق من الرنتايم
      try {
        if (typeof CheckPendingCrashReport === 'function') {
          const report = await CheckPendingCrashReport();
          if (cancelled) return;
          if (report) setCrashReport(report);
        }
      } catch (crashErr) {
        if (cancelled) return;
        // تجاهل في بيئة الاختبارات (لا واجهة Wails) — وسجّل في الإنتاج.
        if (typeof CheckPendingCrashReport === 'function') {
          logger.error('Failed to check pending crash report:', crashErr);
        }
      }

      clearTimeout(slowTimer);
      if (!cancelled) setInitializationStatus('ready');
    };
    void bootstrap();

    return () => {
      cancelled = true;
      retryAvailableRef.current = false;
      clearTimeout(slowTimer);
    };
  }, [checkLicenseStatus, setAccountModalOpen, initializationAttempt]);

  useEffect(() => {
    // لا يبدأ الفحص الدوري قبل اكتمال الإقلاع أو أثناء انتظار إعادة المحاولة.
    if (isInitializing) return;
    const intervalId = setInterval(
      () => {
        checkLicenseStatus().catch((sessErr: unknown) => {
          if (isSessionSupersededError(sessErr)) {
            toast.error(sessionSupersededMessage(sessErr), { duration: 8000 });
          }
        });
      },
      5 * 60 * 1000,
    );

    return () => clearInterval(intervalId);
  }, [checkLicenseStatus, isInitializing]);

  /**
   * ⚡ محرك العزل الأصلي (ONNX) لا يُهيَّأ عند الإقلاع: التهيئة الفعلية تحدث
   * عند أول استخدام لا عند الإقلاع (lazy init عبر ensureInitialized داخل
   * خدمة RemoveBackground في Go) — Zero Early Allocation بلا تسخين خلفي
   * ولا تخصيص مبكر للذاكرة.
   */
  useEffect(() => {
    // لا تسخين خلفي عند الإقلاع — تهيئة محرك العزل مؤجّلة حتى أول استخدام
  }, []);

  // ⚡ الاستماع لأحداث محرك Wails وقت التشغيل (Runtime Events):
  // 1. فتح ملف عبر سطر الأوامر أو مثيل ثانٍ للتطبيق (file-opened)
  // 2. السحب والإفلات المباشر للملفات من سطح المكتب (native-file-drop)
  // 3. استئناف النظام من وضع السكون (app:resume)
  useEffect(() => {
    let unbindFileOpened: (() => void) | undefined;
    let unbindFileDrop: (() => void) | undefined;
    let unbindResume: (() => void) | undefined;

    if (typeof EventsOn === 'function') {
      try {
        unbindFileOpened = EventsOn('file-opened', async (filePath: string) => {
          if (!filePath) return;
          try {
            const src =
              typeof ProcessLocalImageFile === 'function'
                ? await ProcessLocalImageFile(filePath)
                : filePath;
            if (src) void addImageFromSrc(src, { setSingleMode: true });
          } catch (err) {
            logger.error('Failed to open file from Wails event:', err);
          }
        });

        unbindFileDrop = EventsOn(
          'native-file-drop',
          async (data: { x?: number; y?: number; images: string[] }) => {
            if (!data || !data.images || data.images.length === 0) return;
            try {
              const images = data.images;
              const store = useEditorStore.getState();

              if (store.mode === 'collage') {
                const targetSlotId =
                  store.selectedId && store.slots.some((slot) => slot.id === store.selectedId)
                    ? store.selectedId
                    : null;
                const plan = buildCollageInsertPlan(store.slots, images, {
                  targetSlotId,
                  scope: targetSlotId ? 'target' : 'empty',
                });
                await store.setSlotImagesBatch(plan.assignments, images[0] || null);
                if (plan.remaining.length > 0) store.appendPendingCollageImages(plan.remaining);
              } else {
                if (images.length === 1) {
                  await addImageFromSrc(images[0]);
                } else {
                  const aspectMap = await resolveBatchImageAspectRatios(images);
                  const items = images.map((src) => ({
                    src,
                    aspectRatio: aspectMap.get(src) || 1,
                  }));
                  store.addImageElementsBatch(items);
                }
              }
            } catch (err) {
              logger.error('Failed to process native file drop:', err);
              toast.error(toErrorMessage(err, 'تعذّر إدراج الصور المسحوبة'));
            }
          },
        );

        unbindResume = EventsOn('app:resume', () => {
          void checkLicenseStatus();
        });
      } catch (err) {
        logger.warn('Wails runtime EventsOn not available in this environment:', err);
      }
    }

    return () => {
      unbindFileOpened?.();
      unbindFileDrop?.();
      unbindResume?.();
    };
  }, [checkLicenseStatus]);

  return {
    isInitializing,
    initializationStatus,
    retryInitialization,
    crashReport,
    handleRecoverCrash,
    handleDismissCrash,
  };
}
