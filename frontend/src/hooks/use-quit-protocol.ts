import { useCallback, useEffect, useRef, useState } from 'react';

import { RequestGracefulQuit, RespondGracefulQuit } from '@bindings/grido/app';

import { toErrorMessage } from '@/lib/wails-error';

import { flushAutoSaveForQuit } from './use-autosave';
import { EventsOn, Quit } from '../../wailsjs/runtime/runtime';

export type QuitPhase = 'idle' | 'saving' | 'failed' | 'confirming';
export type QuitFailureReason = 'save-failed' | 'edits-unsettled';

export interface QuitProtocolState {
  phase: QuitPhase;
  requestId: number;
  errorMessage: string;
  reason: QuitFailureReason;
}

const INITIAL_QUIT_STATE: QuitProtocolState = {
  phase: 'idle',
  requestId: 0,
  errorMessage: '',
  reason: 'save-failed',
};

function extractQuitRequestId(payload: unknown): number {
  if (typeof payload === 'number' && Number.isFinite(payload) && payload > 0) {
    return payload;
  }
  if (payload && typeof payload === 'object' && 'requestId' in payload) {
    const raw = (payload as { requestId: unknown }).requestId;
    const parsed = Number(raw);
    if (Number.isFinite(parsed) && parsed > 0) {
      return parsed;
    }
  }
  return 0;
}

async function commitActiveTextInput(): Promise<void> {
  if (typeof document === 'undefined') return;
  const active = document.activeElement;
  if (active instanceof HTMLTextAreaElement || active instanceof HTMLInputElement) {
    active.blur();
    // السماح لمعالج onBlur المتزامن بتثبيت تعديل النص في Zustand قبل أخذ اللقطة النهائية
    await Promise.resolve();
  }
}

let quitStageQueue: Promise<unknown> = Promise.resolve();

function notifyBackendQuitStage(
  requestId: number,
  action: 'saving' | 'failed' | 'cancel' | 'confirm',
): Promise<boolean> {
  if (requestId <= 0) return Promise.resolve(false);
  // تسلسل نداءات مرحلة الإغلاق عبر سلسلة واحدة يمنع وصول "saving" إلى Go بعد "failed" أو "cancel"
  const next = quitStageQueue.then(async () => {
    try {
      return await RespondGracefulQuit(requestId, action);
    } catch {
      return false;
    }
  });
  quitStageQueue = next.catch(() => false);
  return next;
}

async function finalizeQuit(requestId: number): Promise<void> {
  if (requestId > 0) {
    const confirmed = await notifyBackendQuitStage(requestId, 'confirm');
    if (confirmed) return;
  }
  try {
    Quit();
  } catch {
    // بيئة بلا جسر Wails
  }
}

/**
 * نقطة الإدخال الموحّدة لطلب الإغلاق من واجهة التطبيق (زر الإغلاق المخصّص):
 * تمر عبر Go QuitCoordinator تماماً مثل Alt+F4 وزر صينية النظام، مع تراجع
 * آمن فقط عند غياب جسر Go (بيئة متصفح تطوير مستقلة).
 */
export async function requestAppClose(): Promise<void> {
  try {
    await RequestGracefulQuit();
  } catch {
    try {
      await commitActiveTextInput();
      await flushAutoSaveForQuit();
    } finally {
      try {
        Quit();
      } catch {
        // بيئة بلا جسر Wails
      }
    }
  }
}

/**
 * useQuitProtocol — المستمع الموحّد لبروتوكول الإغلاق النظيف (`app:quit-requested`).
 * يدير تفريغ المسودة النهائي، التحقق من عدم تغيّر المستند أثناء الكتابة، وعرض
 * قرار صريح للمستخدم عند فشل الحفظ بدل إغلاق التطبيق وفقدان التعديل الأخير.
 */
export function useQuitProtocol() {
  const [quitState, setQuitState] = useState<QuitProtocolState>(INITIAL_QUIT_STATE);
  const phaseRef = useRef<QuitPhase>('idle');
  const requestIdRef = useRef<number>(0);
  const attemptRef = useRef<number>(0);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const updateState = useCallback((next: QuitProtocolState) => {
    phaseRef.current = next.phase;
    requestIdRef.current = next.requestId;
    if (mountedRef.current) {
      setQuitState(next);
    }
  }, []);

  const runFlushAttempt = useCallback(
    async (reqId: number) => {
      const attempt = ++attemptRef.current;
      updateState({
        phase: 'saving',
        requestId: reqId,
        errorMessage: '',
        reason: 'save-failed',
      });

      if (reqId > 0) {
        void notifyBackendQuitStage(reqId, 'saving');
      }

      await commitActiveTextInput();
      const result = await flushAutoSaveForQuit();

      if (!mountedRef.current || attemptRef.current !== attempt || phaseRef.current !== 'saving') {
        return;
      }

      if (result.ok && result.converged) {
        updateState({
          phase: 'confirming',
          requestId: reqId,
          errorMessage: '',
          reason: 'save-failed',
        });
        await finalizeQuit(reqId);
        return;
      }

      if (reqId > 0) {
        void notifyBackendQuitStage(reqId, 'failed');
      }

      const reason: QuitFailureReason = result.ok ? 'edits-unsettled' : 'save-failed';
      const errorMessage = result.ok
        ? 'استمر تعديل المستند أثناء كتابة النسخة النهائية، لذا تعذّر تثبيت الحفظ الأخير قبل الإغلاق.'
        : toErrorMessage(
            result.error,
            'تعذّر حفظ مسودة العمل التلقائية قبل إغلاق التطبيق (تحقق من مساحة القرص أو الصلاحيات).',
          );

      updateState({
        phase: 'failed',
        requestId: reqId,
        errorMessage,
        reason,
      });
    },
    [updateState],
  );

  useEffect(() => {
    const unsubQuit = EventsOn('app:quit-requested', (payload?: unknown) => {
      if (phaseRef.current !== 'idle') {
        return;
      }
      const reqId = extractQuitRequestId(payload);
      void runFlushAttempt(reqId);
    });

    return () => {
      if (typeof unsubQuit === 'function') unsubQuit();
    };
  }, [runFlushAttempt]);

  const retryQuitSave = useCallback(() => {
    if (phaseRef.current !== 'failed') return;
    const reqId = requestIdRef.current;
    void runFlushAttempt(reqId);
  }, [runFlushAttempt]);

  const cancelQuit = useCallback(() => {
    if (phaseRef.current !== 'failed' && phaseRef.current !== 'saving') return;
    const reqId = requestIdRef.current;
    attemptRef.current += 1;
    updateState(INITIAL_QUIT_STATE);
    if (reqId > 0) {
      void notifyBackendQuitStage(reqId, 'cancel');
    }
  }, [updateState]);

  const quitWithoutSaving = useCallback(() => {
    if (phaseRef.current !== 'failed') return;
    const reqId = requestIdRef.current;
    attemptRef.current += 1;
    updateState({
      phase: 'confirming',
      requestId: reqId,
      errorMessage: '',
      reason: 'save-failed',
    });
    void finalizeQuit(reqId);
  }, [updateState]);

  return {
    quitState,
    retryQuitSave,
    cancelQuit,
    quitWithoutSaving,
  };
}
