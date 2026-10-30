import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X, ChevronRight, ChevronLeft } from "lucide-react";
import { acquireLandingDialog } from "../../lib/landing/dialog-state";

export interface TourStep {
  title: string;
  description: string;
}

interface LandingModalProps {
  title: string;
  onClose: () => void;
  children: ReactNode;
  wide?: boolean;
}

export function LandingModal({
  title,
  onClose,
  children,
  wide = false,
}: LandingModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const onCloseRef = useRef(onClose);
  const titleId = useId();
  const backdropPointer = useRef<number | null>(null);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const opener =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    dialog.showModal();
    const releaseDialog = acquireLandingDialog();
    closeRef.current?.focus({ preventScroll: true });
    return () => {
      if (dialog.open) dialog.close();
      releaseDialog();
      if (opener?.isConnected) opener.focus({ preventScroll: true });
    };
  }, []);

  return createPortal(
    <dialog
      ref={dialogRef}
      dir="rtl"
      aria-labelledby={titleId}
      className="landing-shell fixed inset-0 m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-2xl overflow-auto rounded-xl border border-border-subtle bg-card p-0 text-text-primary shadow-2xl backdrop:bg-black/75 backdrop:backdrop-blur-sm"
      style={wide ? { maxWidth: "72rem" } : undefined}
      onCancel={(event) => {
        event.preventDefault();
        onCloseRef.current();
      }}
      onPointerDown={(event) => {
        backdropPointer.current =
          event.target === event.currentTarget ? event.pointerId : null;
      }}
      onPointerCancel={() => {
        backdropPointer.current = null;
      }}
      onPointerUp={(event) => {
        if (
          backdropPointer.current === event.pointerId &&
          event.target === event.currentTarget
        ) {
          const rect = event.currentTarget.getBoundingClientRect();
          if (
            event.clientX < rect.left ||
            event.clientX > rect.right ||
            event.clientY < rect.top ||
            event.clientY > rect.bottom
          )
            onCloseRef.current();
        }
        backdropPointer.current = null;
      }}
    >
      <div className="flex items-center justify-between gap-4 border-b border-border-subtle px-4 py-2 sm:px-5">
        <h2 id={titleId} className="text-sm font-semibold leading-relaxed">
          {title}
        </h2>
        <button
          ref={closeRef}
          type="button"
          onClick={onClose}
          aria-label="إغلاق النافذة"
          className="flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-lg text-text-secondary transition-colors hover:bg-card-hover hover:text-white"
        >
          <X aria-hidden="true" className="size-4" />
        </button>
      </div>
      {children}
    </dialog>,
    document.body,
  );
}

interface TourModalProps {
  open: boolean;
  onClose: () => void;
  steps: TourStep[];
  title: string;
}

function TourContent({
  onClose,
  steps,
}: Pick<TourModalProps, "onClose" | "steps">) {
  const [current, setCurrent] = useState(0);
  const index = Math.min(current, steps.length - 1);
  const step = steps[index];
  const isLast = index === steps.length - 1;
  return (
    <div className="p-4 sm:p-6">
      <div
        aria-live="polite"
        aria-atomic="true"
        className="flex min-h-44 flex-col items-center justify-center px-2 py-6 text-center"
      >
        <span className="mb-3 text-xs text-brand-light">
          خطوة {index + 1} من {steps.length}
        </span>
        <h3 className="mb-2 text-lg font-semibold text-text-primary">
          {step.title}
        </h3>
        <p className="max-w-md text-sm leading-relaxed text-text-secondary">
          {step.description}
        </p>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border-subtle pt-4">
        <button
          type="button"
          onClick={() => setCurrent(Math.max(0, index - 1))}
          disabled={index === 0}
          className="btn-secondary disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ChevronRight aria-hidden="true" className="size-4" />
          السابق
        </button>
        <div
          role="group"
          aria-label="خطوات الجولة"
          className="order-last flex w-full justify-center sm:order-none sm:w-auto"
        >
          {steps.map((item, itemIndex) => (
            <button
              key={item.title}
              type="button"
              aria-pressed={itemIndex === index}
              aria-label={`الخطوة ${itemIndex + 1}: ${item.title}`}
              onClick={() => setCurrent(itemIndex)}
              className="flex size-11 cursor-pointer items-center justify-center rounded-lg hover:bg-card-hover"
            >
              <span
                aria-hidden="true"
                className={`size-2 rounded-full ${itemIndex === index ? "bg-brand-light" : "bg-text-muted/45"}`}
              />
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={isLast ? onClose : () => setCurrent(index + 1)}
          className="btn-primary"
        >
          {isLast ? "إنهاء الجولة" : "التالي"}
          {!isLast && <ChevronLeft aria-hidden="true" className="size-4" />}
        </button>
      </div>
    </div>
  );
}

export function TourModal({ open, onClose, steps, title }: TourModalProps) {
  if (!open || steps.length === 0) return null;
  return (
    <LandingModal title={title} onClose={onClose}>
      <TourContent onClose={onClose} steps={steps} />
    </LandingModal>
  );
}
