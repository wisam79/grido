import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { WarningOctagon, Copy, Check } from '@/components/ui/icons';
import type { CrashReport } from '../../bindings/grido/internal/service/models';

interface CrashRecoveryDialogProps {
  open: boolean;
  report: CrashReport | null;
  onRecover: () => void;
  onDismiss: () => void;
}

export const CrashRecoveryDialog: React.FC<CrashRecoveryDialogProps> = ({
  open,
  report,
  onRecover,
  onDismiss,
}) => {
  const [copied, setCopied] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  if (!report) return null;

  // 🛡️ لا يُغلق الحوار إلا بقرار صريح من المستخدم.
  // بدون هذا الحجب، يُطلق ESC أو النقر خارج النافذة دالة تغيير حالة الحوار
  // ⇒ onDismiss() ⇒ ClearAutoSave() + reset() فيتلف العمل المستعاد بصمت بلا تأكيد.
  // showCloseButton={false} وحده لا يكفي: يخفي زر X فقط ولا يعطّل إغلاق Radix.
  const blockImplicitDismiss = (event: Event | KeyboardEvent) => event.preventDefault();

  const handleCopy = async () => {
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
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy crash report:', err);
    }
  };

  return (
    <Dialog open={open}>
      <DialogContent
        className="max-w-md w-full font-cairo bg-card/95 backdrop-blur-2xl border border-border/80 rounded-2xl p-6 shadow-fluent-24 fluent-specular"
        dir="rtl"
        showCloseButton={false}
        onEscapeKeyDown={blockImplicitDismiss}
        onPointerDownOutside={blockImplicitDismiss}
        onInteractOutside={blockImplicitDismiss}
      >
        <DialogHeader className="space-y-3 text-center sm:text-right">
          <div className="mx-auto sm:mx-0 w-12 h-12 bg-amber-500/10 text-amber-500 dark:bg-amber-400/15 dark:text-amber-400 rounded-full flex items-center justify-center shrink-0">
            <WarningOctagon className="w-6 h-6" />
          </div>
          <div>
            <DialogTitle className="text-base font-bold text-foreground">
              تم رصد إغلاق غير متوقع
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
              {report.has_autosave
                ? 'واجه التطبيق إغلاقاً مفاجئاً في الجلسة السابقة، ولكن تم تأمين مسودة مشروعك بنجاح. يمكنك استعادة العمل فوراً أو بدء مشروع جديد.'
                : 'واجه التطبيق إغلاقاً مفاجئاً في الجلسة السابقة. يمكنك الاطلاع على التفاصيل الفنية ونسخها للمطور.'}
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
                  <Check className="w-3.5 h-3.5 text-emerald-500" />
                  <span className="text-emerald-500 font-bold">تم النسخ</span>
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
              className="text-micro font-mono bg-muted/80 p-3 rounded-lg text-left overflow-auto max-h-36 text-destructive border border-destructive/15 select-all leading-normal"
              dir="ltr"
            >
              <div className="font-bold mb-1 text-foreground">{report.error}</div>
              <pre className="whitespace-pre-wrap break-all text-muted-foreground text-[10px]">
                {report.stack_trace}
              </pre>
            </div>
          )}
        </div>

        <DialogFooter className="flex flex-col-reverse sm:flex-row gap-2 pt-2 sm:justify-start">
          {report.has_autosave ? (
            <>
              <Button
                variant="default"
                size="sm"
                onClick={onRecover}
                className="w-full sm:w-auto h-8 px-4 text-xs font-bold shadow-xs cursor-pointer"
              >
                استعادة المسودة ومتابعة العمل
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={onDismiss}
                className="w-full sm:w-auto h-8 px-3 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
              >
                تجاهل والبدء بمشروع جديد
              </Button>
            </>
          ) : (
            <Button
              variant="default"
              size="sm"
              onClick={onDismiss}
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
