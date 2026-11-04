import { lazy, Suspense, useState } from 'react';

import { CrashRecoveryDialog } from '@/components/crash-recovery-dialog';
import { AccountLicenseModal } from '@/components/editor/dialogs/account-license-modal';
import { KeyboardShortcutsDialog } from '@/components/editor/dialogs/keyboard-shortcuts-dialog';
import { StickerStudioHost } from '@/components/editor/dialogs/sticker-studio-host';
import { UpdateNotifier } from '@/components/editor/system/update-notifier';
import { ErrorBoundary } from '@/components/error-boundary';
import { Skeleton } from '@/components/ui/skeleton';
import { Toaster as SonnerToaster } from '@/components/ui/sonner';
import {
  notifyFreeformTemplateSaved,
  setFreeformDialogOpen,
  useFreeformDialogState,
} from '@/features/freeform-collage/lib/freeform-dialog-state';

import type { CrashReport } from '@bindings/grido/internal/service/models';

const ExportDialog = lazy(() =>
  import('@/components/editor/dialogs/export-dialog').then((module) => ({
    default: module.ExportDialog,
  })),
);

const PrintDialog = lazy(() =>
  import('@/components/editor/dialogs/print-dialog').then((module) => ({
    default: module.PrintDialog,
  })),
);

// محرر الكولاج الحر ثقيل (أدوات/قص/معاينة) ولا يلزم عند الإقلاع: يُحمَّل عند
// أول فتح فقط. يبقى مركّباً بعد ذلك حتى لا تُفقد حركة الإغلاق.
const FreeformCollageModal = lazy(() =>
  import('@/features/freeform-collage').then((module) => ({
    default: module.FreeformCollageModal,
  })),
);

/** هيكل تحميل بسيط يُعرض أثناء تفكيك الحوارات الكسولة (تصدير/طباعة) */
export function DialogLazyFallback() {
  return (
    <div
      role="status"
      aria-label="جاري التحميل ..."
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-[2px]"
    >
      <div className="w-[min(480px,90vw)] rounded-lg border border-border/60 bg-background/95 p-5 space-y-3 shadow-2xl fluent-specular">
        <Skeleton className="h-6 w-1/2" />
        <Skeleton className="h-3 w-3/4" />
        <div className="grid grid-cols-2 gap-2 pt-2">
          <Skeleton className="h-16 rounded-md" />
          <Skeleton className="h-16 rounded-md" />
        </div>
        <Skeleton className="h-8 w-full rounded-md" />
      </div>
    </div>
  );
}

export interface AppDialogsHostProps {
  exportOpen: boolean;
  onExportOpenChange: (open: boolean) => void;
  printOpen: boolean;
  onPrintOpenChange: (open: boolean) => void;
  crashReport: CrashReport | null;
  onRecoverCrash: () => Promise<void>;
  onDismissCrash: () => Promise<void>;
}

export function AppDialogsHost({
  exportOpen,
  onExportOpenChange,
  printOpen,
  onPrintOpenChange,
  crashReport,
  onRecoverCrash,
  onDismissCrash,
}: AppDialogsHostProps) {
  const freeformOpen = useFreeformDialogState((state) => state.open);
  const [freeformMounted, setFreeformMounted] = useState(freeformOpen);
  // ضبط حالة مشتقة أثناء التصيير (نمط React المعتمد) بدل setState داخل أثر:
  // يبقى المكوّن مركّباً بعد أول فتح حتى تُحفظ حركة الإغلاق.
  if (freeformOpen && !freeformMounted) setFreeformMounted(true);

  // 🚀 نفس نمط freeformMounted للحوارات الثقيلة: كان ExportDialog وPrintDialog
  // يُركَّبان بمجرد تحميل المنطقة المرخصة رغم open=false فتُطلب حزمهما الكسولة
  // الفورية عند الإقلاع. يُركَّبان عند أول فتح فقط ويبقيان مركَّبين بعد ذلك
  // حفاظاً على حركة الإغلاق — بلا تغيير في open/onOpenChange/Boundary/Suspense.
  const [exportMounted, setExportMounted] = useState(exportOpen);
  const [printMounted, setPrintMounted] = useState(printOpen);
  if (exportOpen && !exportMounted) setExportMounted(true);
  if (printOpen && !printMounted) setPrintMounted(true);

  return (
    <>
      {freeformMounted && (
        <ErrorBoundary>
          <Suspense fallback={null}>
            <FreeformCollageModal
              open={freeformOpen}
              onOpenChange={setFreeformDialogOpen}
              onTemplateSaved={notifyFreeformTemplateSaved}
            />
          </Suspense>
        </ErrorBoundary>
      )}

      {/* نافذة التصدير */}
      {exportMounted && (
        <ErrorBoundary>
          <Suspense fallback={exportOpen ? <DialogLazyFallback /> : null}>
            <ExportDialog open={exportOpen} onOpenChange={onExportOpenChange} />
          </Suspense>
        </ErrorBoundary>
      )}

      {/* نافذة إعدادات الطباعة */}
      {printMounted && (
        <ErrorBoundary>
          <Suspense fallback={printOpen ? <DialogLazyFallback /> : null}>
            <PrintDialog open={printOpen} onOpenChange={onPrintOpenChange} />
          </Suspense>
        </ErrorBoundary>
      )}

      <AccountLicenseModal />
      <UpdateNotifier />
      <StickerStudioHost />
      <CrashRecoveryDialog
        open={crashReport !== null}
        report={crashReport}
        onRecover={onRecoverCrash}
        onDismiss={onDismissCrash}
      />

      <SonnerToaster position="bottom-center" duration={2000} offset={20} />
      <KeyboardShortcutsDialog />
    </>
  );
}
