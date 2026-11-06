import { useEffect } from 'react';
import { toast } from 'sonner';

import { LoadAutoSave, SaveAutoSave, ClearAutoSave } from '@bindings/grido/app';

import { useEditorStore } from '@/lib/editor-store';
import { getDocumentSession } from '@/lib/io/document-session';
import { buildProjectDocument, deserializeProjectFile } from '@/lib/io/project-serializer';
import { createLogger } from '@/lib/logger';
import { debounce } from '@/lib/utils';
import { toErrorMessage } from '@/lib/wails-error';
import type { EditorState } from '@/lib/editor-store';
import type { ProjectFileV1 } from '@/lib/io/project-serializer';

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
// الآن القائمة تُشتق حرفياً من مفاتيح مخرجات `buildProjectDocument` —
// المصدر الوحيد لما يُحفظ فعلاً في ملف المشروع (دون savedAt الزمني) —
// فأي حقل جديد يُراقب تلقائياً ولا يمكن للقائمة أن تنزلق عن المسلسل بعد اليوم.
// المفاتيح التي يضيفها المسلسل بنفسه ولا تقابل حالة متجر تُستثنى (لو رُوعبت
// لانطلق حفظٌ بلا معنى: savedAt جديد في كل نداء مثلاً).
const SERIALIZER_METADATA_KEYS = new Set(['version', 'savedAt', 'embeddedAssets']);

// One writer survives hook cleanup/remount. The tail covers complete operations,
// not a raw IPC promise whose continuation may start another write behind a flush.
let persistenceTail: Promise<void> = Promise.resolve();
let lastAccepted: { fingerprint: string; session: number } | null = null;
// Recovery actions may only delete the disk revision they originally offered.
let draftRevision = 0;

function queuePersistence<T>(operation: () => Promise<T>): Promise<T> {
  const result = persistenceTail.then(operation);
  // A failed operation must not poison subsequent saves/clears.
  persistenceTail = result.then(
    () => undefined,
    () => undefined,
  );
  return result;
}

const stampAcceptedPayload = (doc: Omit<ProjectFileV1, 'savedAt'>): string =>
  JSON.stringify({ ...doc, savedAt: new Date().toISOString() });

async function writeCurrentDraft(session: number): Promise<void> {
  if (session !== getDocumentSession()) return;
  // Sample only after taking writer ownership: queued payloads may already be stale.
  const doc = buildProjectDocument(useEditorStore.getState());
  if (isEmptyWorkspace(doc)) return;
  const fingerprint = JSON.stringify(doc);
  if (lastAccepted?.session === session && lastAccepted.fingerprint === fingerprint) return;

  await SaveAutoSave(stampAcceptedPayload(doc));
  draftRevision += 1;
  // An already-dispatched write cannot be cancelled, but cannot claim a new document.
  lastAccepted = session === getDocumentSession() ? { fingerprint, session } : null;
}

/**
 * Queue a clear behind existing writes and ahead of later saves. Reset callers
 * reset synchronously first, then call this helper with the new session. A clear
 * superseded by another reset/load is a no-op; recovery actions also pin a revision.
 * Returns whether the clear ran; backend failures still reject to the caller.
 */
export function clearAutoSave(
  expectedSession = getDocumentSession(),
  expectedRevision?: number,
): Promise<boolean> {
  return queuePersistence(async () => {
    if (expectedSession !== getDocumentSession()) return false;
    if (expectedRevision !== undefined && expectedRevision !== draftRevision) return false;
    await ClearAutoSave();
    draftRevision += 1;
    lastAccepted = null;
    return true;
  });
}

/** Flush current live content in the same ordered writer; never reject. */
export async function flushAutoSave(): Promise<boolean> {
  try {
    await queuePersistence(() => writeCurrentDraft(getDocumentSession()));
    return true;
  } catch (err) {
    logger.error('Failed to flush autosave draft', err);
    return false;
  }
}

export function useAutoSave() {
  // 1. استرجاع مسودة المشروع التلقائية عند تشغيل التطبيق
  useEffect(() => {
    let disposed = false;
    const loadSession = getDocumentSession();
    const loadedRevision = draftRevision;
    const clearOfferedDraft = () => clearAutoSave(loadSession, loadedRevision);

    const initAutoSave = async () => {
      try {
        const saved = await LoadAutoSave();
        if (disposed) return;
        if (saved) {
          try {
            const parsed = deserializeProjectFile(JSON.parse(saved));
            //
            // 🛡️ حارس قِدم: التحميل غير متزامن — إن كان المستخدم قد بدأ التحرير
            // أو فتح مشروعاً/أعد الضبط قبل وصول المسودة، فلا يحق لنا استبدال
            // حالته الحالية (كانت المسودة تطمس العمل الجديد بصمت).
            if (
              getDocumentSession() !== loadSession ||
              loadedRevision !== draftRevision ||
              !isPristineWorkspace()
            ) {
              // تدقيق 2026-11-03 (Bug#3): سباق ملف الإقلاع — وصول المسودة بعد بدء
              // العمل كان يُتجاهل بخيار حذف فقط، والحفظ المنظم المزاح يكتب فوق ملف
              // المسودة بعد ثانيتين فلا يبقى لها أثر على القرص. نلتقط نص المسودة
              // لحظة الإشعار (قبض على المحتوى قبل السباق) وزر «استعادة المسودة»
              // يطبّقه عبر نفس مسار التحميل أعلاه (parse + loadProject)؛ وإن تعذّر
              // التحليل عند النقر أُبلغ المستخدم بإخلاص بدل فشل صامت.
              const skippedDraft = saved;
              toast.info('تم تجاهل مسودة سابقة لأن العمل بدأ بالفعل', {
                action: {
                  label: 'استعادة المسودة',
                  onClick: () => {
                    try {
                      const parsed = deserializeProjectFile(JSON.parse(skippedDraft));
                      useEditorStore.getState().loadProject(parsed, parsed.projectId ?? null);
                      toast.info('تم استعادة مسودة العمل السابقة');
                    } catch (e) {
                      logger.error('Failed to restore skipped autosave draft', e);
                      toast.error('تعذّر استعادة المسودة', {
                        description:
                          'لم يعد يمكن قراءة محتواها الملتقط عند الإقلاع. أعد المحاولة بعد إعادة فتح التطبيق أو ابدأ مشروعاً جديداً.',
                      });
                    }
                  },
                },
                cancel: {
                  label: 'حذف المسودة',
                  onClick: () => {
                    void clearOfferedDraft().catch((err: unknown) => {
                      logger.error('Failed to clear stale autosave draft', err);
                    });
                  },
                },
              });
              return;
            }
            // 🛡️ تمرير `projectId` (تدقيق 2026-10-08): `loadProject` كان يهبط به
            // إلى null فيهبط `state.projectId || uid()` إلى صنع معرّف جديد — أي
            // حفظ بعد است المسودة يُنشئ مشروعاً مكرراً في المكتبة بدل تحديث الأصلي.
            useEditorStore.getState().loadProject(parsed, parsed.projectId ?? null);
            const restoredSession = getDocumentSession();
            toast.info('تم استعادة مسودة العمل السابقة تلقائياً', {
              action: {
                label: 'بدء من جديد',
                onClick: () => {
                  if (getDocumentSession() !== restoredSession) return;
                  useEditorStore.getState().reset();
                  void clearAutoSave().catch((err: unknown) => {
                    logger.error('Failed to clear autosave draft', err);
                  });
                },
              },
            });
          } catch (e) {
            // 🛡️ C6 من تدقيق 2026-10-08: المسودة التالفة كانت تُحذف صامتاً —
            // بايت واحد فاسد يُدمّر النسخة الوحيدة من عمل غير محفوظ بلا إشعار.
            // الآن نُبقي الملف كما هو (أول حفظ ناجح يكتب فوقه) ونُبلغ المستخدم،
            // والحذف صار قراراً يدوياً.
            logger.error('Failed to parse autosave draft — preserved on disk', e);
            toast.error('تعذّر قراءة مسودة العمل السابقة', {
              description: 'أُبقي الملف كما هو. أعد الفتح بعد إصلاح المشكلة أو امسحه يدوياً.',
              action: {
                label: 'مسح المسودة',
                onClick: () => {
                  void clearOfferedDraft().catch((err: unknown) => {
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
    void initAutoSave();
    return () => {
      disposed = true;
    };
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
    let pendingSave: number | null = null;
    let disposed = false;
    // عدّاد محاولات متتالية بلا نجاح — يمنع وميض إشعار عند كل تعديل لاحق
    let consecutiveFailures = 0;
    // مقبض requestIdleCallback المعلق — يُلغى عند تغيّر الجلسة وعند التنظيف
    let idleHandle: number | null = null;
    // (أ) جلسة المستند عند آخر جدولة — reset/loadProject يرفعان الجلسة عبر
    // document-session (مربوطة في core-slice) فيُلغى كل ما علّقه الحفظ القديم
    // فوراً ولا يُكتب محتوى من مستند سابق فوق المستند الجديد.
    let scheduledSession = getDocumentSession();

    const cancelPendingIdle = () => {
      if (
        idleHandle !== null &&
        typeof window !== 'undefined' &&
        typeof window.cancelIdleCallback === 'function'
      ) {
        window.cancelIdleCallback(idleHandle);
      }
      idleHandle = null;
    };

    // Coalesce background requests, but keep writer ownership shared with flush/clear.
    // Store only a session: content is sampled when the ordered operation starts.
    const saveDraft = async (session: number) => {
      if (isSaving) {
        pendingSave = session;
        return;
      }

      isSaving = true;
      try {
        await queuePersistence(() => writeCurrentDraft(session));
        consecutiveFailures = 0;
      } catch (err) {
        consecutiveFailures += 1;
        logger.error('Failed to save autosave draft', err);
        if (consecutiveFailures === 1 && session === getDocumentSession()) {
          toast.error(toErrorMessage(err, 'فشل حفظ مسودة العمل التلقائية'), {
            description: 'لن تُحفظ تعديلاتك حتى تُحل المشكلة (مساحة القرص مثلاً).',
          });
        }
      } finally {
        isSaving = false;
        // Cleanup's latest request is retained, but never a previous document's payload.
        if (pendingSave !== null) {
          const nextSession = pendingSave;
          pendingSave = null;
          if (nextSession === getDocumentSession()) void saveDraft(nextSession);
        }
      }
    };

    const handleStateChange = () => {
      const runSave = () => {
        idleHandle = null;
        if (disposed) return; // منع كتابة مسودة قديمة بعد إلغاء التنشيط
        // (ج) التسلسل من الحالة الحية (getState) لا من لقطة الجدولة — كانت
        // اللقطة الممسوكة وقت الجدولة تُكتب بعد reset/تحميل فتُحيي مسودة
        // محاها المستخدم، والآن تُرفض كتابة من جلسة أخرى أصلاً.
        if (getDocumentSession() !== scheduledSession) return;
        void saveDraft(scheduledSession);
      };

      if (typeof window !== 'undefined' && typeof window.requestIdleCallback === 'function') {
        // مقبض واحد معلق فقط — جدولة جديدة تلغي السابقة كي لا تتراكم الاستدعاءات
        cancelPendingIdle();
        idleHandle = window.requestIdleCallback(() => runSave(), { timeout: 1000 });
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
        watchedKeys = Object.keys(buildProjectDocument(state)).filter(
          (key) => !SERIALIZER_METADATA_KEYS.has(key),
        );
      }
      const stateRecord = state as unknown as Record<string, unknown>;
      return watchedKeys.map((key) => stateRecord[key]);
    };

    let lastDeps = getDeps(useEditorStore.getState());

    const unsubscribe = useEditorStore.subscribe((state) => {
      // (ب) رصد تغيّر الجلسة (reset/loadProject): إلغاء فوري لكل المؤقتات
      // المعلقة (debounce وidle) وإسقاط مسودة معلّقة من جلسة سابقة، مع مزامنة
      // قائمة المراقبة مع المستند الجديد دون جدولة حفظ له قبل أي تعديل.
      const session = getDocumentSession();
      if (session !== scheduledSession) {
        scheduledSession = session;
        debouncedSave.cancel();
        cancelPendingIdle();
        pendingSave = null;
        lastDeps = getDeps(state);
        return;
      }

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
      debouncedSave();
    });

    return () => {
      disposed = true;
      unsubscribe();
      debouncedSave.cancel();
      cancelPendingIdle(); // (هـ) الـ idle المعلق يُلغى كي لا يشغّل runSave بعد التنظيف
      // Final live-state request uses the same writer, including across remounts.
      void saveDraft(getDocumentSession());
    };
  }, []);
}
