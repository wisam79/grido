import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogCloseButton,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/huge-icon";
import { cn } from "@/lib/utils";

export type FluentModalSize = "sm" | "md" | "lg" | "xl" | "2xl" | "full";

export interface FluentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  size?: FluentModalSize;
  icon?: React.ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
  headerBadge?: React.ReactNode;
  headerAction?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  cancelText?: string;
  confirmText?: string;
  confirmIcon?: React.ReactNode;
  onConfirm?: () => void;
  isConfirmLoading?: boolean;
  confirmLoadingText?: string;
  confirmDisabled?: boolean;
  contentClassName?: string;
  headerClassName?: string;
  footerClassName?: string;
}

const SIZE_CLASSES: Record<FluentModalSize, string> = {
  sm: "w-[92vw] sm:max-w-[480px]",
  md: "w-[92vw] sm:max-w-[620px]",
  lg: "w-[94vw] sm:max-w-[840px]",
  xl: "w-[96vw] sm:max-w-[1060px]",
  "2xl": "w-[96vw] sm:max-w-[1280px]",
  full: "w-[98vw] sm:max-w-[1440px] h-[92vh]",
};

export const FluentModal = React.memo(function FluentModal({
  open,
  onOpenChange,
  size = "md",
  icon,
  title,
  description,
  headerBadge,
  headerAction,
  children,
  footer,
  cancelText = "إلغاء",
  confirmText,
  confirmIcon,
  onConfirm,
  isConfirmLoading = false,
  confirmLoadingText,
  confirmDisabled = false,
  contentClassName,
  headerClassName,
  footerClassName,
}: FluentModalProps) {
  const hasCustomFooter = footer !== undefined;
  const hasDefaultFooter = Boolean(onConfirm || confirmText);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        dir="rtl"
        showCloseButton={false}
        className={cn(
          "max-h-[90vh] flex flex-col p-0 overflow-hidden bg-card/95 backdrop-blur-2xl border border-border/80 dark:border-white/10 rounded-2xl shadow-fluent-28 font-cairo fluent-specular transition-all duration-150 gap-0",
          SIZE_CLASSES[size],
          contentClassName
        )}
      >
        {/* Header with integrated title bar and close button */}
        <DialogHeader
          className={cn(
            "px-6 py-4 border-b border-border/40 bg-muted/20 shrink-0",
            headerClassName
          )}
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              {icon && (
                <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 border border-primary/20">
                  {icon}
                </div>
              )}
              <div className="min-w-0 text-start">
                <div className="flex items-center gap-2">
                  <DialogTitle className="text-sm font-bold text-foreground truncate">
                    {title}
                  </DialogTitle>
                  {headerBadge}
                </div>
                {description && (
                  <DialogDescription className="text-xs text-muted-foreground mt-0.5 truncate">
                    {description}
                  </DialogDescription>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {headerAction}
              <DialogCloseButton />
            </div>
          </div>
        </DialogHeader>

        {/* Modal Body */}
        <div className="flex-1 overflow-hidden flex flex-col min-h-0">
          {children}
        </div>

        {/* Modal Footer */}
        {hasCustomFooter ? (
          footer
        ) : hasDefaultFooter ? (
          <DialogFooter
            className={cn(
              "px-6 py-3 border-t border-border/40 bg-muted/20 flex items-center justify-end gap-2.5 sm:justify-end shrink-0",
              footerClassName
            )}
          >
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              disabled={isConfirmLoading}
              className="h-8 px-4 rounded-md text-xs font-medium"
            >
              {cancelText}
            </Button>

            <Button
              type="button"
              size="sm"
              onClick={onConfirm}
              disabled={isConfirmLoading || confirmDisabled}
              className="h-8 px-4 rounded-md text-xs font-medium gap-1.5 min-w-[100px]"
            >
              {isConfirmLoading ? (
                <>
                  <Spinner className="w-4 h-4 animate-spin" />
                  <span>{confirmLoadingText || "يُعالج ..."}</span>
                </>
              ) : (
                <>
                  {confirmIcon}
                  <span>{confirmText}</span>
                </>
              )}
            </Button>
          </DialogFooter>
        ) : null}
      </DialogContent>
    </Dialog>
  );
});

FluentModal.displayName = "FluentModal";
