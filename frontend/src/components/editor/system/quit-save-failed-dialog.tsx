import React from 'react';

import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { WarningOctagon } from '@/components/ui/icons';

import type { QuitProtocolState } from '@/hooks/use-quit-protocol';

interface QuitSaveFailedDialogProps {
  quitState: QuitProtocolState;
  onRetry: () => void;
  onCancel: () => void;
  onQuitWithoutSaving: () => void;
}

/**
 * حوار القرار الصريح عند تعذّر إتمام الحفظ التلقائي النهائي قبل الإغلاق (RV-LIFE-01):
 * يمنع الخروج الصامت وفقدان آخر تعديل، ويمنح المستخدم قراراً واضحاً:
 * إعادة المحاولة، إلغاء الإغلاق والعودة للمحرر، أو الخروج الصريح دون حفظ.
 */
export const QuitSaveFailedDialog: React.FC<QuitSaveFailedDialogProps> = ({
  quitState,
  onRetry,
  onCancel,
  onQuitWithoutSaving,
}) => {
  const open = quitState.phase === 'failed';
  if (!open) return null;

  return (
    <AlertDialog open={open}>
      <AlertDialogContent
        className="max-w-md font-cairo"
        dir="rtl"
        onEscapeKeyDown={(event) => {
          event.preventDefault();
          onCancel();
        }}
      >
        <AlertDialogHeader className="space-y-3 text-center sm:text-start">
          <div className="mx-auto sm:mx-0 w-11 h-11 rounded-full bg-destructive/12 text-destructive flex items-center justify-center shrink-0">
            <WarningOctagon className="w-6 h-6" />
          </div>
          <AlertDialogTitle>تعذّر حفظ التعديلات الأخيرة قبل الإغلاق</AlertDialogTitle>
          <AlertDialogDescription className="text-xs leading-relaxed">
            {quitState.errorMessage}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter className="gap-2 sm:justify-between">
          <Button type="button" variant="destructive" onClick={onQuitWithoutSaving}>
            الخروج دون حفظ
          </Button>
          <div className="flex flex-col-reverse gap-2 sm:flex-row">
            <Button type="button" variant="outline" onClick={onCancel}>
              إلغاء الإغلاق
            </Button>
            <Button type="button" onClick={onRetry}>
              إعادة المحاولة
            </Button>
          </div>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
