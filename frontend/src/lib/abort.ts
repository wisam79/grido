/**
 * lib/abort — المصدر الوحيد لأدوات الإلغاء المشتركة بين مسارات التصدير.
 *
 * كان `abortError` و`throwIfAborted` و`isAbortError` تُعاد كتابتها محلياً في
 * أربعة ملفات بنفس الجسم ونصوص عربية مختلفة. الآن الجسم واحد، والنص يُمرَّر
 * مرة واحدة عند إنشاء المجموعة.
 */

export interface AbortHelpers {
  /** خطأ الإلغاء لهذا المسار: signal.reason إن وُجد، وإلا DOMException بالنص المعطى. */
  abortError(signal?: AbortSignal): Error;
  /** يرمي خطأ الإلغاء عندما يكون الإشارة ملغاة. */
  throwIfAborted(signal?: AbortSignal): void;
  /** هل الخطأ ناتج عن إلغاء هذه الإشارة؟ */
  isAbortError(error: unknown, signal?: AbortSignal): boolean;
}

/**
 * @param message نص DOMException الافتراضي لهذا المسار.
 * @param preferSignalReason تفضيل `signal.reason` (Error) قبل إنشاء DOMException؛
 *   يُعطَّل في المسارات التي يلزمها عقد DOMException ثابت.
 */
export function createAbortHelpers(message: string, preferSignalReason = true): AbortHelpers {
  const abortError = (signal?: AbortSignal): Error => {
    if (preferSignalReason && signal?.reason instanceof Error) return signal.reason;
    return new DOMException(message, 'AbortError');
  };

  return {
    abortError,
    throwIfAborted: (signal) => {
      if (signal?.aborted) throw abortError(signal);
    },
    isAbortError: (error, signal) =>
      signal?.aborted === true || (error instanceof DOMException && error.name === 'AbortError'),
  };
}

/**
 * نسخة تحافظ على عقد DOMException ثابت (تتجاهل `signal.reason`) للمسارات التي
 * يلزمها خطأ إلغاء موحّد مهما كان سبب الإشارة. تُقرأ بالاسم فلا يُمرَّر منطقي مجرّد.
 */
export function createDomAbortHelpers(message: string): AbortHelpers {
  return createAbortHelpers(message, false);
}
