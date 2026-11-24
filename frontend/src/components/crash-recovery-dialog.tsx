import React, { useState, useRef, useEffect } from 'react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { WarningOctagon, Copy, Check } from '@/components/ui/icons';
import { createLogger } from '@/lib/logger';

import type { CrashReport } from '../../bindings/grido/internal/service/models';

const logger = createLogger('crash-recovery-dialog');

interface CrashRecoveryDialogProps {
  open: boolean;
  report: CrashReport | null;
  onRecover: () => void | Promise<void>;
  onDismiss: () => void | Promise<void>;
}

export const CrashRecoveryDialog: React.FC<CrashRecoveryDialogProps> = ({
  open,
  report,
  onRecover,
  onDismiss,
}) => {
  const [copied, setCopied] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const pendingRef = useRef(false);
  const mountedRef = useRef(false);
  const sessionRef = useRef(0);
  // 🛡️ مؤقّت إخفاء شارة «تم النسخ» يُحفظ في ref ويُلغى عند إلغاء التركيب —
  // بدونه يطلق setState على مكوّن مفكوك (تحذير React) ولو أُغلق الحوار مبكراً
  const copiedTimerRef = useRef<number | null>(null);

  useEffect(() => {
    sessionRef.current += 1;
    if (copiedTimerRef.current !== null) clearTimeout(copiedTimerRef.current);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCopied(false);
    setShowDetails(false);
    setActionError(null);
    return () => {
      sessionRef.current += 1;
    };
  }, [open, report]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (copiedTimerRef.current !== null) clearTimeout(copiedTimerRef.current);
    };
  }, []);

  if (!report) return null;

  // 🛡️ لا يُغلق الحوار إلا بقرار صريح من المستخدم.
  // بدون هذا الحجب، يُطلق ESC أو النقر خارج النافذة دالة تغيير حالة الحوار
  // ⇒ onDismiss() ⇒ ClearAutoSave() + reset() فيتلف العمل المستعاد بصمت بلا تأكيد.
  // showCloseButton={false} وحده لا يكفي: يخفي زر X فقط ولا يعطّل إغلاق Radix.
  const blockImplicitDismiss = (event: Event | KeyboardEvent) => event.preventDefault();

  const handleAction = async (fn: () => void | Promise<void>) => {
    if (pendingRef.current || !open) return;
    const session = sessionRef.current;
    pendingRef.current = true;
    setIsPending(true);
    setActionError(null);
    try {
      await fn();
    } catch (error) {
      logger.error('Crash recovery action failed:', error);
      if (mountedRef.current && session === sessionRef.current) {
        setActionError('تعذّر إكمال الإجراء. حاول مرة أخرى.');
      }
    } finally {
      // The backend action cannot be cancelled; reopening must not start a second one.
      pendingRef.current = false;
      if (mountedRef.current) setIsPending(false);
    }
  };

  const handleCopy = async () => {
    const session = sessionRef.current;
    const text = `--- Grido Studio Crash Report ---
Time: ${report.timestamp}
Version: ${report.app_version}
OS: ${report.os} (${report.arch})
Has Autosave: ${report.has_autosave}
Error: ${report.error}

Stack Trace:
${report.stack_trace}
---------------------------------`;

    try {
      await navigator.clipboard.writeText(text);
      if (!mountedRef.current || session !== sessionRef.current) return;
      setCopied(true);
      if (copiedTimerRef.current !== null) clearTimeout(copiedTimerRef.current);
      copiedTimerRef.current = window.setTimeout(() => {
        copiedTimerRef.current = null;
        setCopied(false);
      }, 2000);
    } catch (err) {
      logger.error('Failed to copy crash report:', err);
    }
  };

  return (
    <Dialog open={open}>
      <DialogContent
        className="max-w-md w-full font-cairo bg-card border border-border/80 rounded-xl p-5 shadow-fluent-16 fluent-specular"
        dir="rtl"
        showCloseButton={false}
        onEscapeKeyDown={blockImplicitDismiss}
        onPointerDownOutside={blockImplicitDismiss}
        onInteractOutside={blockImplicitDismiss}
      >
        <DialogHeader className="space-y-3 text-center sm:text-start">
          <div className="mx-auto sm:mx-0 w-12 h-12 bg-warning/10 text-warning rounded-full flex items-center justify-center shrink-0">
            <WarningOctagon className="w-6 h-6" />
          </div>
          <div>
            <DialogTitle className="text-base font-bold text-foreground">
              تم رصد إغلاق غير متوقع
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
              {report.has_autosave ? 'مسودة مشروعك محفوظة.' : ''}
            </DialogDescription>
          </div>
        </DialogHeader>

        <div className="space-y-2.5 my-2">
          <div className="flex items-center justify-between text-micro font-mono bg-muted/60 px-3 py-1.5 rounded-lg border border-border/40">
            <span className="text-muted-foreground">الإصدار: {report.app_version}</span>
            <span className="text-muted-foreground">
              {report.os}/{report.arch}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => setShowDetails(!showDetails)}
              className="text-micro font-medium text-primary hover:underline cursor-pointer"
            >
              {showDetails ? 'إخفاء التفاصيل الفنية ▲' : 'عرض التفاصيل الفنية (Stack Trace) ▼'}
            </button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCopy}
              className="h-7 px-2 text-micro gap-1.5 text-muted-foreground hover:text-foreground"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-success" />
                  <span className="text-success font-bold">تم النسخ</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>نسخ التقرير</span>
                </>
              )}
            </Button>
          </div>

          {showDetails && (
            <div
              className="text-micro font-mono bg-muted/80 p-3 rounded-lg text-start overflow-auto max-h-36 text-destructive border border-destructive/15 select-all leading-normal"
              dir="ltr"
            >
              <div className="font-bold mb-1 text-foreground">{report.error}</div>
              <pre className="whitespace-pre-wrap break-all text-muted-foreground text-micro">
                {report.stack_trace}
              </pre>
            </div>
          )}
        </div>

        {actionError && (
          <p role="alert" className="text-xs text-destructive">
            {actionError}
          </p>
        )}
        <DialogFooter className="flex flex-col-reverse sm:flex-row gap-2 pt-2 sm:justify-start">
          {report.has_autosave ? (
            <>
              <Button
                variant="default"
                size="sm"
                disabled={isPending}
                onClick={() => void handleAction(onRecover)}
                className="w-full sm:w-auto h-8 px-4 text-xs font-bold shadow-xs cursor-pointer"
              >
                استعادة المسودة
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={isPending}
                onClick={() => void handleAction(onDismiss)}
                className="w-full sm:w-auto h-8 px-3 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
              >
                تجاهل المسودة
              </Button>
            </>
          ) : (
            <Button
              variant="default"
              size="sm"
              disabled={isPending}
              onClick={() => void handleAction(onDismiss)}
              className="w-full sm:w-auto h-8 px-4 text-xs font-bold cursor-pointer"
            >
              متابعة
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
