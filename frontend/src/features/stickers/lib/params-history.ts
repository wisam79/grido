import { useCallback, useRef, useState } from 'react';
import type { StickerParams } from '../types';

/**
 * سجل تراجع/إعادة لتخصيصات الملصق — الصورة العقلية كآلات تصميم المحترفة:
 * كل تعديل ملتزم يدفع الحالة السابقة إلى `past`، وكل تراجع يريح `future`.
 * المنطق النقي (createParamsBuffer/pushParams/undoParams/redoParams) مفصول
 * عن الـ hook ليُختبر مباشرة بلا تصيير.
 */

/** سقف السجل — كافٍ لجلسة تخصيص كاملة دون نمو غير محدود */
export const STICKER_HISTORY_LIMIT = 50;

/** نافذة الدمج الزمني: التعديلات المتلاحقة (كتابة نص، سحب منزلق) تلتزم كخطوة واحدة */
export const HISTORY_COALESCE_MS = 400;

export interface ParamsBuffer {
  past: StickerParams[];
  present: StickerParams;
  future: StickerParams[];
}

export function createParamsBuffer(initial: StickerParams): ParamsBuffer {
  return { past: [], present: initial, future: [] };
}

/** التزام: يدفع الحالة الحالية إلى الماضي ويقطع مستقبل التراجع المعطل */
export function pushParams(buffer: ParamsBuffer, next: StickerParams): ParamsBuffer {
  const past = [...buffer.past, buffer.present];
  return {
    past:
      past.length > STICKER_HISTORY_LIMIT ? past.slice(past.length - STICKER_HISTORY_LIMIT) : past,
    present: next,
    future: [],
  };
}

/** دمج بلا دفع: يُستخدم عند التعديلات المتلاحقة داخل نافذة الدمج */
export function coalesceParams(buffer: ParamsBuffer, next: StickerParams): ParamsBuffer {
  return { ...buffer, present: next };
}

export function undoParams(buffer: ParamsBuffer): {
  buffer: ParamsBuffer;
  undone: StickerParams | null;
} {
  if (buffer.past.length === 0) return { buffer, undone: null };
  const previous = buffer.past[buffer.past.length - 1];
  return {
    buffer: {
      past: buffer.past.slice(0, -1),
      present: previous,
      future: [buffer.present, ...buffer.future],
    },
    undone: previous,
  };
}

export function redoParams(buffer: ParamsBuffer): {
  buffer: ParamsBuffer;
  redone: StickerParams | null;
} {
  if (buffer.future.length === 0) return { buffer, redone: null };
  const [next, ...rest] = buffer.future;
  return {
    buffer: {
      past: [...buffer.past, buffer.present],
      present: next,
      future: rest,
    },
    redone: next,
  };
}

export interface StickerParamsHistory {
  params: StickerParams;
  canUndo: boolean;
  canRedo: boolean;
  /** تعديل حي: يُدمج مع سابقه إذا جاء داخل نافذة الدمج (كتابة/سحب) */
  setParams: (next: StickerParams | ((prev: StickerParams) => StickerParams)) => void;
  /** التزام صريح كخطوة مستقلة (لوحات ألوان، إعادة ضبط، تطبيق قالب محفوظ) */
  commitParams: (next: StickerParams | ((prev: StickerParams) => StickerParams)) => void;
  /** سياق جديد كلياً (اختيار قالب آخر) — يصفّر السجل */
  resetParams: (next: StickerParams) => void;
  undo: () => void;
  redo: () => void;
}

export function useStickerParamsHistory(initial: () => StickerParams): StickerParamsHistory {
  const [buffer, setBuffer] = useState<ParamsBuffer>(() => createParamsBuffer(initial()));
  const lastCommitAt = useRef<number>(0);

  const apply = useCallback(
    (
      next: StickerParams | ((prev: StickerParams) => StickerParams),
      mode: 'coalesce' | 'commit',
    ) => {
      setBuffer((prev) => {
        const resolved = typeof next === 'function' ? next(prev.present) : next;
        if (resolved === prev.present) return prev;
        const now = Date.now();
        const shouldCoalesce =
          mode === 'coalesce' && now - lastCommitAt.current < HISTORY_COALESCE_MS;
        lastCommitAt.current = now;
        return shouldCoalesce ? coalesceParams(prev, resolved) : pushParams(prev, resolved);
      });
    },
    [],
  );

  const setParams = useCallback<StickerParamsHistory['setParams']>(
    (next) => apply(next, 'coalesce'),
    [apply],
  );

  const commitParams = useCallback<StickerParamsHistory['commitParams']>(
    (next) => apply(next, 'commit'),
    [apply],
  );

  const resetParams = useCallback<StickerParamsHistory['resetParams']>((next) => {
    lastCommitAt.current = 0;
    setBuffer(createParamsBuffer(next));
  }, []);

  const undo = useCallback(() => {
    lastCommitAt.current = 0;
    setBuffer((prev) => undoParams(prev).buffer);
  }, []);

  const redo = useCallback(() => {
    lastCommitAt.current = 0;
    setBuffer((prev) => redoParams(prev).buffer);
  }, []);

  return {
    params: buffer.present,
    canUndo: buffer.past.length > 0,
    canRedo: buffer.future.length > 0,
    setParams,
    commitParams,
    resetParams,
    undo,
    redo,
  };
}
