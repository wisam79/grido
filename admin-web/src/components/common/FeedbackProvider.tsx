import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { ReactNode } from 'react';
import { CheckCircle2, AlertTriangle, Info, Ban } from 'lucide-react';

/**
 * FeedbackProvider — بديل Fluent 2 موحّد لـ`alert()`/`confirm()` في لوحة الإدارة.
 *
 * الدافع (مراجعة 09، بند C-08): كانت اللوحة تستخدم 22 نافذة `alert()` و3 نوافذ
 * `confirm()` أصلية — تُوقف التفاعل، غير قابلة للتنسيق، ومحجوبة في بعض السياقات.
 * هنا إشعارات غير معطِّلة (toasts) ونافذة تأكيد مصمّمة قابلة للتخطّي بمفتاح Escape.
 */

type Variant = 'success' | 'error' | 'warning' | 'info';

interface Toast {
  id: number;
  message: string;
  variant: Variant;
}

export interface ConfirmOptions {
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
}

interface FeedbackApi {
  notify: (message: string, variant?: Variant) => void;
  confirmDialog: (message: string, options?: ConfirmOptions) => Promise<boolean>;
}

const FeedbackContext = createContext<FeedbackApi | null>(null);

// eslint-disable-next-line react-refresh/only-export-components
export function useFeedback(): FeedbackApi {
  const ctx = useContext(FeedbackContext);
  if (!ctx) throw new Error('useFeedback must be used within a FeedbackProvider');
  return ctx;
}

const VARIANT_ICON: Record<Variant, ReactNode> = {
  success: <CheckCircle2 className="w-5 h-5 text-emerald-400" aria-hidden="true" />,
  error: <Ban className="w-5 h-5 text-red-400" aria-hidden="true" />,
  warning: <AlertTriangle className="w-5 h-5 text-amber-400" aria-hidden="true" />,
  info: <Info className="w-5 h-5 text-[#3b82f6]" aria-hidden="true" />,
};

const VARIANT_BORDER: Record<Variant, string> = {
  success: 'border-emerald-500/30',
  error: 'border-red-500/30',
  warning: 'border-amber-500/30',
  info: 'border-[#2C2C2C]',
};

const FOCUS_RING =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3b82f6] focus-visible:ring-offset-2 focus-visible:ring-offset-[#1E1E1E]';

export function FeedbackProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [confirmReq, setConfirmReq] = useState<{ message: string; options: ConfirmOptions } | null>(null);
  const resolverRef = useRef<((value: boolean) => void) | null>(null);
  const idRef = useRef(0);
  const confirmButtonRef = useRef<HTMLButtonElement | null>(null);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const notify = useCallback(
    (message: string, variant: Variant = 'info') => {
      const id = ++idRef.current;
      setToasts((prev) => [...prev, { id, message, variant }]);
      setTimeout(() => dismiss(id), 5000);
    },
    [dismiss],
  );

  const confirmDialog = useCallback(
    (message: string, options: ConfirmOptions = {}) =>
      new Promise<boolean>((resolve) => {
        resolverRef.current = resolve;
        setConfirmReq({ message, options });
      }),
    [],
  );

  const settle = useCallback((value: boolean) => {
    resolverRef.current?.(value);
    resolverRef.current = null;
    setConfirmReq(null);
  }, []);

  // Escape يُلغي، Enter يُؤكّد — وتركيز أولي على زر التأكيد.
  useEffect(() => {
    if (!confirmReq) return;
    confirmButtonRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        settle(false);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        settle(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [confirmReq, settle]);

  const api = useMemo<FeedbackApi>(() => ({ notify, confirmDialog }), [notify, confirmDialog]);
  const options = confirmReq?.options ?? {};

  return (
    <FeedbackContext.Provider value={api}>
      {children}

      {/* الإشعارات — غير معطِّلة، أعلى يسار الشاشة (RTL) */}
      <div
        className="fixed top-4 left-4 z-[100] flex flex-col gap-2 w-[min(380px,90vw)] pointer-events-none"
        dir="rtl"
        aria-live="polite"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            role="status"
            className={`pointer-events-auto flex items-start gap-3 rounded-xl border bg-[#1E1E1E] p-3.5 text-sm text-white shadow-2xl ${VARIANT_BORDER[t.variant]}`}
          >
            <span className="shrink-0 mt-0.5">{VARIANT_ICON[t.variant]}</span>
            <span className="flex-1 leading-relaxed text-right">{t.message}</span>
            <button
              type="button"
              onClick={() => dismiss(t.id)}
              aria-label="إغلاق الإشعار"
              className={`shrink-0 rounded-md p-1 text-white/60 hover:text-white hover:bg-white/10 ${FOCUS_RING}`}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        ))}
      </div>

      {/* نافذة التأكيد */}
      {confirmReq && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/70 p-4" dir="rtl">
          <div
            role="alertdialog"
            aria-modal="true"
            aria-describedby="grido-confirm-message"
            className="w-full max-w-md rounded-xl border border-[#2C2C2C] bg-[#1E1E1E] p-6 text-white shadow-2xl"
          >
            <div className="flex items-start gap-3">
              <span className="shrink-0 mt-0.5">{VARIANT_ICON[options.danger ? 'warning' : 'info']}</span>
              <p id="grido-confirm-message" className="flex-1 text-sm leading-relaxed text-right">
                {confirmReq.message}
              </p>
            </div>
            <div className="mt-6 flex justify-start gap-3">
              <button
                ref={confirmButtonRef}
                type="button"
                onClick={() => settle(true)}
                className={`rounded-lg px-4 py-2 text-sm font-medium text-white ${FOCUS_RING} ${
                  options.danger ? 'bg-red-600 hover:bg-red-500' : 'bg-[#3b82f6] hover:bg-[#2f6fe0]'
                }`}
              >
                {options.confirmLabel ?? 'تأكيد'}
              </button>
              <button
                type="button"
                onClick={() => settle(false)}
                className={`rounded-lg border border-[#2C2C2C] bg-white/5 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-white/10 ${FOCUS_RING}`}
              >
                {options.cancelLabel ?? 'إلغاء'}
              </button>
            </div>
          </div>
        </div>
      )}
    </FeedbackContext.Provider>
  );
}
