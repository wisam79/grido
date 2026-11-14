import { useRef, type ReactElement, type ReactNode, type RefObject } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import * as AlertDialog from '@radix-ui/react-alert-dialog';

interface AccessibleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  kind?: 'dialog' | 'alert';
  variant?: 'dialog' | 'drawer';
  title: ReactElement;
  description?: ReactElement;
  headerClassName?: string;
  closeButton?: ReactNode;
  overlayClassName: string;
  contentClassName: string;
  initialFocusRef?: RefObject<HTMLElement | null>;
  returnFocus?: HTMLElement | null;
  busy?: boolean;
  children: ReactNode;
}

function focus(element: HTMLElement | null | undefined): boolean {
  if (!element?.isConnected || element.matches(':disabled, [aria-disabled="true"]') ||
      element.closest('[inert], [hidden], [aria-hidden="true"]')) return false;
  element.focus({ preventScroll: true });
  return document.activeElement === element;
}

function focusRegion(element: HTMLElement): boolean {
  const previous = element.getAttribute('tabindex');
  if (previous === null) element.setAttribute('tabindex', '-1');
  const focused = focus(element);
  if (previous === null) {
    if (focused) element.addEventListener('blur', () => element.removeAttribute('tabindex'), { once: true });
    else element.removeAttribute('tabindex');
  }
  return focused;
}

/** Admin-local Radix shell. Callers retain their own layout and mutation ownership. */
export function AccessibleDialog({
  open, onOpenChange, kind = 'dialog', variant = 'dialog', title, description, headerClassName,
  closeButton, overlayClassName, contentClassName, initialFocusRef, returnFocus,
  busy = false, children,
}: AccessibleDialogProps) {
  const triggerRef = useRef<HTMLElement | null>(null);
  const regionRef = useRef<HTMLElement | null>(null);
  const Primitive = kind === 'alert' ? AlertDialog : Dialog;
  const heading = <Primitive.Title asChild>{title}</Primitive.Title>;
  const placementClassName =
    variant === 'drawer'
      ? 'fixed inset-y-0 left-0 w-full max-w-md h-dvh overflow-y-auto focus:outline-none'
      : 'fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[calc(100%-2rem)] max-h-[calc(100dvh-2rem)] overflow-y-auto focus:outline-none';

  return (
    <Primitive.Root open={open} onOpenChange={(nextOpen) => {
      if (nextOpen || !busy) onOpenChange(nextOpen);
    }}>
      <Primitive.Portal>
        <Primitive.Overlay className={overlayClassName} />
        <Primitive.Content
          dir="rtl"
          aria-busy={busy || undefined}
          {...(description ? {} : { 'aria-describedby': undefined })}
          className={`${placementClassName} ${contentClassName}`}
          onOpenAutoFocus={(event) => {
            const active = document.activeElement;
            triggerRef.current = returnFocus ?? (active instanceof HTMLElement ? active : null);
            regionRef.current = triggerRef.current?.closest<HTMLElement>('main, [role="main"]') ??
              document.querySelector<HTMLElement>('main, [role="main"]');
            if (initialFocusRef?.current && focus(initialFocusRef.current)) event.preventDefault();
          }}
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            // A queued/nested dialog may already own focus when this scope is removed.
            const activeDialog = document.querySelector<HTMLElement>('[role="dialog"], [role="alertdialog"]');
            if (activeDialog) {
              const focusInOpenDialog =
                document.activeElement instanceof HTMLElement &&
                Boolean(document.activeElement.closest('[role="dialog"], [role="alertdialog"]'));
              if (focusInOpenDialog) return;
              const ownerDialog = triggerRef.current?.closest<HTMLElement>('[role="dialog"], [role="alertdialog"]');
              if (ownerDialog && ownerDialog.isConnected && focus(triggerRef.current)) return;
              const dialogFallback = activeDialog.querySelector<HTMLElement>(
                'button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])',
              );
              if (!focus(dialogFallback)) focusRegion(activeDialog);
              return;
            }
            if (focus(triggerRef.current)) return;
            const region = regionRef.current?.isConnected ? regionRef.current :
              document.querySelector<HTMLElement>('main, [role="main"]');
            if (region && focusRegion(region)) return;
            const fallback = document.querySelector<HTMLElement>('button:not(:disabled), a[href], input:not(:disabled)');
            if (!focus(fallback)) focusRegion(document.body);
          }}
          onEscapeKeyDown={(event) => { if (busy) event.preventDefault(); }}
        >
          {headerClassName ? <div className={headerClassName}>{heading}{closeButton}</div> : heading}
          {description && <Primitive.Description asChild>{description}</Primitive.Description>}
          {children}
        </Primitive.Content>
      </Primitive.Portal>
    </Primitive.Root>
  );
}
