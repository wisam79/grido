import {
  createContext, useCallback, useContext, useEffect, useMemo, useRef, useState,
} from 'react';
import type { ReactNode } from 'react';
import * as AlertDialog from '@radix-ui/react-alert-dialog';
import { CheckCircle2, AlertTriangle, Info, Ban } from 'lucide-react';
import { AccessibleDialog } from './accessible-dialog';

/** Non-blocking admin notifications and bounded, cancel-safe confirmations. */
type Variant = 'success' | 'error' | 'warning' | 'info';
interface Toast { id: number; message: string; variant: Variant }
export interface ConfirmOptions {
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
}
interface FeedbackApi {
  notify: (message: string, variant?: Variant) => void;
  confirmDialog: (message: string, options?: ConfirmOptions) => Promise<boolean>;
}
interface Confirmation {
  id: number;
  message: string;
  options: ConfirmOptions;
  trigger: HTMLElement | null;
  resolve: (value: boolean) => void;
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
  info: <Info className="w-5 h-5 text-brand-primary" aria-hidden="true" />,
};
const VARIANT_BORDER: Record<Variant, string> = {
  success: 'border-emerald-500/30', error: 'border-red-500/30',
  warning: 'border-amber-500/30', info: 'border-[#333333]',
};
const FOCUS_RING =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3b82f6] focus-visible:ring-offset-1 focus-visible:ring-offset-[#202020]';
const MAX_CONFIRMATIONS = 8;
const MAX_TOASTS = 5;

export function FeedbackProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [confirmReq, setConfirmReq] = useState<Confirmation | null>(null);
  const queueRef = useRef<Confirmation[]>([]);
  const timersRef = useRef(new Map<number, ReturnType<typeof setTimeout>>());
  const mountedRef = useRef(true);
  const idRef = useRef(0);
  const cancelButtonRef = useRef<HTMLButtonElement | null>(null);

  const dismiss = useCallback((id: number) => {
    clearTimeout(timersRef.current.get(id));
    timersRef.current.delete(id);
    if (mountedRef.current) setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);
  const notify = useCallback((message: string, variant: Variant = 'info') => {
    if (!mountedRef.current) return;
    const id = ++idRef.current;
    if (timersRef.current.size >= MAX_TOASTS) {
      const oldest = timersRef.current.keys().next().value;
      if (oldest !== undefined) dismiss(oldest);
    }
    timersRef.current.set(id, setTimeout(() => dismiss(id), 5000));
    setToasts((prev) => [...prev, { id, message, variant }].slice(-MAX_TOASTS));
  }, [dismiss]);
  const confirmDialog = useCallback((message: string, options: ConfirmOptions = {}) =>
    new Promise<boolean>((resolve) => {
      if (!mountedRef.current || queueRef.current.length >= MAX_CONFIRMATIONS) {
        resolve(false);
        return;
      }
      const active = document.activeElement;
      const trigger = queueRef.current[0]?.trigger ?? (active instanceof HTMLElement ? active : null);
      const request = { id: ++idRef.current, message, options: { ...options }, trigger, resolve };
      queueRef.current.push(request);
      if (queueRef.current.length === 1) setConfirmReq(request);
    }), []);
  const settle = useCallback((id: number, value: boolean) => {
    if (queueRef.current[0]?.id !== id) return;
    const request = queueRef.current.shift();
    request?.resolve(value);
    if (mountedRef.current) setConfirmReq(queueRef.current[0] ?? null);
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    const timers = timersRef.current;
    const queue = queueRef.current;
    return () => {
      mountedRef.current = false;
      for (const timer of timers.values()) clearTimeout(timer);
      timers.clear();
      for (const request of queue.splice(0)) request.resolve(false);
    };
  }, []);
  // The same Radix scope stays open between queued requests; reset to the safe action.
  useEffect(() => { if (confirmReq) cancelButtonRef.current?.focus(); }, [confirmReq]);

  const api = useMemo<FeedbackApi>(() => ({ notify, confirmDialog }), [notify, confirmDialog]);
  const options = confirmReq?.options ?? {};
  return (
    <FeedbackContext.Provider value={api}>
      {children}
      <div className="fixed top-4 left-4 z-(--z-toast) flex flex-col gap-2 w-[min(380px,90vw)] pointer-events-none" dir="rtl" aria-live="polite">
        {toasts.map((toast) => (
          <div key={toast.id} role="status" className={`admin-dialog-surface pointer-events-auto flex items-start gap-3 rounded-[6px] border bg-[#202020] p-3 text-xs text-[#f5f5f5] shadow-2xl ${VARIANT_BORDER[toast.variant]}`}>
            <span className="shrink-0 mt-0.5">{VARIANT_ICON[toast.variant]}</span>
            <span className="flex-1 leading-relaxed text-right">{toast.message}</span>
            <button type="button" onClick={() => dismiss(toast.id)} aria-label="إغلاق الإشعار" className={`shrink-0 rounded-[4px] p-1 text-[#a9afaf] hover:text-[#f5f5f5] hover:bg-white/[0.08] cursor-pointer ${FOCUS_RING}`}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" /></svg>
            </button>
          </div>
        ))}
      </div>
      <AccessibleDialog
        kind="alert"
        open={confirmReq !== null}
        onOpenChange={(open) => { if (!open && confirmReq) settle(confirmReq.id, false); }}
        title={<h2 className="sr-only">{options.danger ? 'تأكيد إجراء خطير' : 'تأكيد الإجراء'}</h2>}
        description={<div className="flex items-start gap-3"><span className="shrink-0 mt-0.5">{VARIANT_ICON[options.danger ? 'warning' : 'info']}</span><p className="flex-1 text-sm leading-relaxed text-right">{confirmReq?.message}</p></div>}
        initialFocusRef={cancelButtonRef}
        returnFocus={confirmReq?.trigger}
        overlayClassName="fixed inset-0 z-(--z-dialog) bg-black/70"
        contentClassName="admin-dialog-surface z-(--z-dialog) max-w-md rounded-[10px] border border-[#333333] bg-[#202020] p-5 text-[#f5f5f5] shadow-2xl"
      >
        <div className="mt-6 flex justify-start gap-3">
          <AlertDialog.Action asChild>
            <button type="button" onClick={() => { if (confirmReq) settle(confirmReq.id, true); }} className={`h-8 rounded-[4px] px-3.5 text-xs font-medium text-white cursor-pointer transition-colors ${FOCUS_RING} ${options.danger ? 'bg-[#c42b1c] hover:bg-[#d13438]' : 'admin-btn-primary'}`}>
              {options.confirmLabel ?? 'تأكيد'}
            </button>
          </AlertDialog.Action>
          <AlertDialog.Cancel asChild>
            <button ref={cancelButtonRef} type="button" className={`admin-btn-secondary h-8 rounded-[4px] px-3.5 text-xs font-medium text-[#f5f5f5] cursor-pointer ${FOCUS_RING}`}>
              {options.cancelLabel ?? 'إلغاء'}
            </button>
          </AlertDialog.Cancel>
        </div>
      </AccessibleDialog>
    </FeedbackContext.Provider>
  );
}
