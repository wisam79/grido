import { useState, useEffect } from 'react';
import { toast } from 'sonner';

import {
  GetStartupFile,
  ProcessLocalImageFile,
  CheckPendingCrashReport,
  DismissCrashReport,
  ClearAutoSave,
} from '@bindings/grido/app';

import { buildCollageInsertAssignments } from '@/lib/canvas/collage-insert';
import {
  resolveImageAspectRatio,
  resolveBatchImageAspectRatios,
} from '@/lib/canvas/image-dimensions';
import { addImageFromSrc } from '@/lib/canvas/load-image';
import { useEditorStore } from '@/lib/editor-store';
import { createLogger } from '@/lib/logger';
import {
  isSessionSupersededError,
  sessionSupersededMessage,
} from '@/lib/store/slices/license-slice';
import { toErrorMessage } from '@/lib/wails-error';

import { EventsOn } from '../../wailsjs/runtime/runtime';

import type { CrashReport } from '@bindings/grido/internal/service/models';

const logger = createLogger('useAppBootstrap');

export interface AppBootstrapState {
  isInitializing: boolean;
  crashReport: CrashReport | null;
  handleRecoverCrash: () => Promise<void>;
  handleDismissCrash: () => Promise<void>;
}

export function useAppBootstrap(): AppBootstrapState {
  const [isInitializing, setIsInitializing] = useState(true);
  const [crashReport, setCrashReport] = useState<CrashReport | null>(null);

  const checkLicenseStatus = useEditorStore((state) => state.checkLicenseStatus);
  const setAccountModalOpen = useEditorStore((state) => state.setAccountModalOpen);

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
    try {
      if (typeof DismissCrashReport === 'function') {
        await DismissCrashReport();
      }
      if (typeof ClearAutoSave === 'function') {
        await ClearAutoSave();
      }
      useEditorStore.getState().reset();
    } catch (e) {
      logger.error('Failed to dismiss crash report:', e);
    }
    setCrashReport(null);
    toast.info('تم بدء مشروع جديد');
  };

  useEffect(() => {
    const check = async () => {
      try {
        const profile = await checkLicenseStatus();
        if (!profile || !profile.token) {
          setAccountModalOpen(true);
        }
        // ملء سجلات استخدام AI من AppData (مع ترحيل localStorage القديم)
        void useEditorStore.getState().hydrateAiUsageLogs();
        // فحص وجود صورة ممررة عند الإقلاع (مثل النقر بالزر الأيمن "فتح بواسطة" في ويندوز)
        try {
          if (typeof GetStartupFile === 'function') {
            const startupUrl = await GetStartupFile();
            if (startupUrl) void addImageFromSrc(startupUrl, { setSingleMode: true });
          }
        } catch (startupErr) {
          // تجاهل في بيئة الاختبارات (لا واجهة Wails) — وسجّل في الإنتاج
          // حتى لا يفشل فتح الملف بالنقر المزدوج بصمت تام.
          if (typeof GetStartupFile === 'function') {
            logger.error('Failed to open startup file:', startupErr);
            toast.error(toErrorMessage(startupErr, 'تعذّر فتح الملف الممرر عند الإقلاع'));
          }
        }
        // فحص وجود تقرير انهيار سابق من الرنتايم
        try {
          if (typeof CheckPendingCrashReport === 'function') {
            const report = await CheckPendingCrashReport();
            if (report) {
              setCrashReport(report);
            }
          }
        } catch (crashErr) {
          // تجاهل في بيئة الاختبارات (لا واجهة Wails) — وسجّل في الإنتاج.
          if (typeof CheckPendingCrashReport === 'function') {
            logger.error('Failed to check pending crash report:', crashErr);
          }
        }
      } catch (err) {
        // 🛡️ الجلسة الواحدة: الإقلاع قد يكشف طرداً — اعرض رسالة الطرد الصريحة
        // (نافذة الحساب تُفتح أصلاً من license-slice عند الطرد).
        if (isSessionSupersededError(err)) {
          toast.error(sessionSupersededMessage(err), { duration: 8000 });
        } else {
          logger.error('Failed to check license status during init:', err);
        }
      } finally {
        setIsInitializing(false);
      }
    };
    check();

    // Check periodically every 5 minutes to ensure dynamic state updates
    const intervalId = setInterval(
      () => {
        // 🛡️ الجلسة الواحدة: الفحص الدوري قد يطرد الجلسة — اعرض رسالة الطرد
        // الصريحة بدل ابتلاع الخطأ بصمت.
        checkLicenseStatus().catch((sessErr: unknown) => {
          if (isSessionSupersededError(sessErr)) {
            toast.error(sessionSupersededMessage(sessErr), { duration: 8000 });
          }
        });
      },
      5 * 60 * 1000,
    );

    return () => clearInterval(intervalId);
  }, [checkLicenseStatus, setAccountModalOpen]);

  /**
  /**
   * ⚡ تسخين النماذج: تم إلغاء التسخين المسبق الإجباري عند إقلاع التطبيق (Zero Early Allocation)
   * ليبقى استهلاك التطبيق في أدنى مستوياته (<100MB) ولا يُحمَّل النموذج إلا عند نقر المستخدم الفعلي.
   */
  useEffect(() => {
    // Zero background warmup on startup
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
            const images = data.images;
            const store = useEditorStore.getState();

            if (store.mode === 'collage') {
              const assignments = buildCollageInsertAssignments(
                store.slots,
                images,
                store.selectedId,
                Boolean(store.collageTemplate?.physicalLayout),
              );
              store.setSlotImagesBatch(assignments, images[0] || null);
            } else {
              if (images.length === 1) {
                void addImageFromSrc(images[0]);
              } else {
                let aspectMap: Map<string, number>;
                if (typeof resolveBatchImageAspectRatios === 'function') {
                  aspectMap = await resolveBatchImageAspectRatios(images);
                } else {
                  const aspects = await Promise.all(images.map((s) => resolveImageAspectRatio(s)));
                  aspectMap = new Map(images.map((s, idx) => [s, aspects[idx]]));
                }
                const items = images.map((src) => ({
                  src,
                  aspectRatio: aspectMap.get(src) || 1,
                }));
                store.addImageElementsBatch(items);
              }
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
    crashReport,
    handleRecoverCrash,
    handleDismissCrash,
  };
}
