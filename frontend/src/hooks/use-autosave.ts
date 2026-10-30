import { useEffect } from 'react';
import { toast } from 'sonner';

import { LoadAutoSave, SaveAutoSave, ClearAutoSave } from '@bindings/grido/app';

import { useEditorStore } from '@/lib/editor-store';
import { deserializeProjectFile, serializeEditorState } from '@/lib/io/project-serializer';
import { createLogger } from '@/lib/logger';
import { debounce } from '@/lib/utils';
import { toErrorMessage } from '@/lib/wails-error';
import type { EditorState } from '@/lib/editor-store';

type EditorStoreSnapshot = EditorState;

const logger = createLogger('useAutoSave');

/**
 * هل مساحة العمل ما زالت كما وُلدت (لا عناصر، لا صور خانات، لا مشروع محمّل،
 * لا خطوة تراجع)؟ يُستخدم لمنع مسودة قديمة من طمس عمل بدأه المستخدم،
 * ويُعاد استخدامه في نافذة المشاريع لتأكيد استبدال عمل غير محفوظ
 * بتحميل مشروع آخر — فالحارس واحد لا يزيد تكراراً بين الموضعين.
 */
export function isPristineWorkspace(): boolean {
  const s = useEditorStore.getState();
  return (
    s.projectId === null && isEmptyWorkspace(s) && s.historyIndex === 0 && s.history.length <= 1
  );
}

function isEmptyWorkspace(data: {
  elements: unknown[];
  slots?: unknown[];
  autofillImages?: string[];
  collagePendingImages?: string[];
}): boolean {
  return (
    (data.autofillImages?.length ?? 0) === 0 &&
    (data.collagePendingImages?.length ?? 0) === 0 &&
    data.elements.length === 0 &&
    (!data.slots || data.slots.every((s) => !(s as { imageSrc?: string }).imageSrc))
  );
}

// ─── مصدر قائمة مراقبة الحفظ التلقائي ─────────────────────────────────────
// كانت القائمة (getDeps) مكتوبة يدوياً فتنزلق عن المسلسل: كل حقل يُضاف
// لملف المشروع (userGuides، showRuler، rulerUnit، lockUserGuides،
// showBleedGuides، bleedMarginMM، safeMarginMM، cutShapeType، projectId …)
// كان يحتاج تعديلاً في موضعين — وما سُقط منه فُقدت تعديلاته بلا حفظ.
// الآن القائمة تُشتق حرفياً من مفاتيح مخرجات `serializeEditorState` —
// المصدر الوحيد لما يُحفظ فعلاً في ملف المشروع — فأي حقل جديد يُراقب
// تلقائياً ولا يمكن للقائمة أن تنزلق عن المسلسل بعد اليوم.
// المفاتيح التي يضيفها المسلسل بنفسه ولا تقابل حالة متجر تُستثنى (لو رُوعبت
// لانطلق حفظٌ بلا معنى: savedAt جديد في كل نداء مثلاً).
const SERIALIZER_METADATA_KEYS = new Set(['version', 'savedAt', 'embeddedAssets']);

// ─── التفريغ النهائي قبل إغلاق النافذة (H5 من تدقيق 2026-10-08) ────────────
// كان المسار القديم يعتمد على كتابة عائمة غير منتظرة داخل تنظيف React تسابق
// `Quit()`: أي تعديل في آخر ثانيتين قبل الإغلاق يُفقد. صار التفريغ دالة
// قابلة للانتظار يستدعيها مُغلِّق النافذة (ومستمع beforeunload احتياطاً).
let flushInFlight: Promise<void> | null = null;
// 🛡️ مسار كتابة واحد: آخر سلسلة مكتوبة على القرص — مشتركة بين التفريغ
// والحفظ المنظم (كانتا متغيرين منفصلين فيسمح بكتابة قديمة فوق أحدث).
let lastWrittenString = '';
// الكتابة الجارية للحفظ المنظم — ينتظرها التفريغ قبل التسلسل من جديد.
let saveDraftInFlight: Promise<void> | null = null;

/**
 * كتابة فورية للحالة الحالية على القرص. تُعيد true إذا لا يوجد ما يُكتب أو
 * نجحت الكتابة، وfalse عند الفشل — الاستدعاء لا يرمي أبداً.
 */
export async function flushAutoSave(): Promise<boolean> {
  if (flushInFlight) {
    return flushInFlight.then(() => true).catch(() => false);
  }

  const state = useEditorStore.getState();
  const projectData = serializeEditorState(state);
  if (isEmptyWorkspace(projectData)) return true;

  // انتظر كتابة منظمة جارية ثم أعد التسلسل — لئلا تُكتب لقطة أقدم فوق أحدث.
  if (saveDraftInFlight) {
    try {
      await saveDraftInFlight;
    } catch {
      /* مسجلة في مسارها */
    }
  }

  const freshState = useEditorStore.getState();
  const freshData = serializeEditorState(freshState);
  if (isEmptyWorkspace(freshData)) return true;

  const currentString = JSON.stringify(freshData);
  if (currentString === lastWrittenString) return true;

  flushInFlight = (async () => {
    await SaveAutoSave(currentString);
    lastWrittenString = currentString;
  })();

  try {
    await flushInFlight;
    return true;
  } catch (err) {
    logger.error('Failed to flush autosave draft', err);
    return false;
  } finally {
    flushInFlight = null;
  }
}

export function useAutoSave() {
  // 1. استرجاع مسودة المشروع التلقائية عند تشغيل التطبيق
  useEffect(() => {
    // 🛡️ حارس إعادة التركيب/StrictMode: الجلب الأساسي يغيّر حالة المتجر، فلو
    // نُفِّذ مرتين يقرأ الحارس الثاني حالة لم يعد فيها «مساحة نقية» ويُظهر
    // إشعاراً كاذباً بعرض حذف مسودة المستخدم (M42 من تدقيق 2026-10-08).
    let draftLoaded = false;

    const initAutoSave = async () => {
      try {
        const saved = await LoadAutoSave();
        if (saved) {
          try {
            const parsed = deserializeProjectFile(JSON.parse(saved));
            if (draftLoaded) return;
            //
            // 🛡️ حارس قِدم: التحميل غير متزامن — إن كان المستخدم قد بدأ التحرير
            // أو فتح مشروعاً/أعد الضبط قبل وصول المسودة، فلا يحق لنا استبدال
            // حالته الحالية (كانت المسودة تطمس العمل الجديد بصمت).
            if (!isPristineWorkspace()) {
              draftLoaded = true;
              toast.info('تم تجاهل مسودة سابقة لأن العمل بدأ بالفعل', {
                action: {
                  label: 'حذف المسودة',
                  onClick: () => {
                    void ClearAutoSave().catch((err: unknown) => {
                      logger.error('Failed to clear stale autosave draft', err);
                    });
                  },
                },
              });
              return;
            }
            draftLoaded = true;
            // 🛡️ تمرير `projectId` (تدقيق 2026-10-08): `loadProject` كان يهبط به
            // إلى null فيهبط `state.projectId || uid()` إلى صنع معرّف جديد — أي
            // حفظ بعد است المسودة يُنشئ مشروعاً مكرراً في المكتبة بدل تحديث الأصلي.
            useEditorStore.getState().loadProject(parsed, parsed.projectId ?? null);
            toast.info('تم استعادة مسودة العمل السابقة تلقائياً', {
              action: {
                label: 'بدء من جديد',
                onClick: () => {
                  useEditorStore.getState().reset();
                  void ClearAutoSave().catch((err: unknown) => {
                    logger.error('Failed to clear autosave draft', err);
                  });
                  lastWrittenString = '';
                },
              },
            });
          } catch (e) {
            // 🛡️ C6 من تدقيق 2026-10-08: المسودة التالفة كانت تُحذف صامتاً —
            // بايت واحد فاسد يُدمّر النسخة الوحيدة من عمل غير محفوظ بلا إشعار.
            // الآن نُبقي الملف كما هو (أول حفظ ناجح يكتب فوقه) ونُبلغ المستخدم،
            // والحذف صار قراراً يدوياً.
            draftLoaded = true;
            logger.error('Failed to parse autosave draft — preserved on disk', e);
            toast.error('تعذّر قراءة مسودة العمل السابقة', {
              description: 'أُبقي الملف كما هو. أعد الفتح بعد إصلاح المشكلة أو امسحه يدوياً.',
              action: {
                label: 'مسح المسودة',
                onClick: () => {
                  void ClearAutoSave().catch((err: unknown) => {
                    logger.error('Failed to clear corrupt autosave draft', err);
                  });
                },
              },
            });
          }
        }
      } catch (err) {
        logger.error('Failed to load autosave', err);
      }
    };
    initAutoSave();
  }, []);

  // 2. تفريغ نهائي احتياطي عند إعادة التحميل/الخروج (لا يمكن انتظار النتيجة هنا)
  useEffect(() => {
    const handler = () => {
      void flushAutoSave();
    };
    window.addEventListener('beforeunload', handler);
    window.addEventListener('pagehide', handler);
    return () => {
      window.removeEventListener('beforeunload', handler);
      window.removeEventListener('pagehide', handler);
    };
  }, []);

  // 2. المراقبة والحفظ التلقائي المنظم في الخلفية (بعد ثانيتين من توقف أي تفاعل)
  useEffect(() => {
    let isSaving = false;
    let pendingSaveState: string | null = null;
    let disposed = false;
    // عدّاد محاولات متتالية بلا نجاح — يمنع وميض إشعار عند كل تعديل لاحق
    let consecutiveFailures = 0;

    // دالة الحفظ الفعلي للمسودة بشكل متسلسل لحماية الملفات من التلف
    const saveDraft = async (stateString: string) => {
      if (isSaving) {
        pendingSaveState = stateString;
        return;
      }

      isSaving = true;
      try {
        // 🛡️ انتظر تفريغاً جارياً ثم أعد التسلسل من المتجر — لئلا تُكتب
        // اللقطة الممررة (الأقدم) فوق ما كتبه التفريغ للتو.
        let payload = stateString;
        if (flushInFlight) {
          try {
            await flushInFlight;
          } catch {
            /* مسجل في مسار التفريغ */
          }
          const fresh = JSON.stringify(serializeEditorState(useEditorStore.getState()));
          if (fresh === lastWrittenString) return;
          payload = fresh;
        }
        saveDraftInFlight = SaveAutoSave(payload);
        await saveDraftInFlight;
        lastWrittenString = payload;
        consecutiveFailures = 0;
      } catch (err) {
        // 🛡️ H6 من تدقيق 2026-10-08: فشل الحفظ التلقائي (امتلاء القرص، تجاوز
        // سقف الحمولة) كان يُطبع في وحدة التحكم فقط فيتوقف الحفظ صامتاً بينما
        // يظن المستخدم أن عمله محفوظ. الآن يُعلَن صراحةً مع نص الخطأ الحقيقي.
        consecutiveFailures += 1;
        logger.error('Failed to save autosave draft', err);
        if (consecutiveFailures === 1) {
          toast.error(toErrorMessage(err, 'فشل حفظ مسودة العمل التلقائية'), {
            description: 'لن تُحفظ تعديلاتك حتى تُحل المشكلة (مساحة القرص مثلاً).',
          });
        }
      } finally {
        isSaving = false;
        saveDraftInFlight = null;
        // السلسلة تفرّغ آخر مسودة معلّقة حتى بعد إلغاء التنشيط (كتابة نهائية
        // بأحدث حالة) — الحارس ضد القِدم هو فحص disposed في runSave فقط
        if (pendingSaveState !== null) {
          const nextState = pendingSaveState;
          pendingSaveState = null;
          saveDraft(nextState);
        }
      }
    };

    const handleStateChange = (state: EditorStoreSnapshot) => {
      const runSave = () => {
        if (disposed) return; // منع كتابة مسودة قديمة بعد إلغاء التنشيط
        const projectData = serializeEditorState(state);
        const isEmptyCanvas = isEmptyWorkspace(projectData);

        if (isEmptyCanvas) {
          // مساحة العمل فارغة تماماً (تم مسح الكانفس أو الإعادة للوضع الافتراضي) — لا نحفظ مسودة فارغة
          return;
        }

        const currentString = JSON.stringify(projectData);
        if (currentString === lastWrittenString) {
          return; // تخطي إذا لم تتغير مساحة العمل فعلياً
        }
        saveDraft(currentString);
      };

      if (typeof window !== 'undefined' && typeof window.requestIdleCallback === 'function') {
        window.requestIdleCallback(() => runSave(), { timeout: 1000 });
      } else {
        // debounce سبق أن انتظر توقف التفاعل؛ لا نضيف مهمة صفّية إضافية.
        runSave();
      }
    };

    // تأخير فحص وحفظ البيانات بالكامل لثانيتين بعد توقف حركة السحب/التعديل
    const debouncedSave = debounce(handleStateChange, 2000);

    // قائمة المراقبة مشتقة من المسلسل (انظر SERIALIZER_METADATA_KEYS أعلاه):
    // تُحسب مرة واحدة أولّ تحديث حالة ثم تُعاد استخدامها — مفتاح ناقص في
    // المسلسل يعني نصاً يُشتق من كوده لا من قائمة يدوية قابلة للنسيان.
    let watchedKeys: string[] | null = null;
    const getDeps = (state: EditorStoreSnapshot): unknown[] => {
      if (!watchedKeys) {
        watchedKeys = Object.keys(serializeEditorState(state)).filter(
          (key) => !SERIALIZER_METADATA_KEYS.has(key),
        );
      }
      const stateRecord = state as unknown as Record<string, unknown>;
      return watchedKeys.map((key) => stateRecord[key]);
    };

    let lastDeps = getDeps(useEditorStore.getState());

    const unsubscribe = useEditorStore.subscribe((state) => {
      const currentDeps = getDeps(state);

      let changed = false;
      for (let i = 0; i < currentDeps.length; i++) {
        if (currentDeps[i] !== lastDeps[i]) {
          changed = true;
          break;
        }
      }

      if (!changed) return;

      lastDeps = currentDeps;
      debouncedSave(state);
    });

    return () => {
      disposed = true;
      unsubscribe();
      debouncedSave.cancel();
      // حفظ فوري للحالة الحالية قبل إلغاء التنشيط لمنع فقدان أي تعديلات
      const currentState = useEditorStore.getState();
      const projectData = serializeEditorState(currentState);
      const isEmptyCanvas = isEmptyWorkspace(projectData);

      if (!isEmptyCanvas) {
        const currentString = JSON.stringify(projectData);
        if (currentString !== lastWrittenString) {
          if (isSaving) {
            pendingSaveState = currentString;
          } else {
            saveDraft(currentString);
          }
        }
      }
    };
  }, []);
}
