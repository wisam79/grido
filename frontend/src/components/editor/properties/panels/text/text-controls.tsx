import React from 'react';

import { cn } from '@/lib/utils';

/**
 * عناصر تحكم موحّدة لتبويبات خصائص النص (التنسيق/التأثيرات):
 * مجموعة أزرار مؤطّرة واحدة (Fluent segmented) بدل أزرار متفرقة لكل خيار،
 * وصف «تسمية + تحكم» بعمود تسمية ثابت يطابق `FluentSliderField` المضمَّن،
 * وخلية معاينة بصرية للتأثيرات.
 */

const focusRing =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background';

export function ToggleGroup({
  label,
  className,
  children,
}: {
  label: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      role="group"
      aria-label={label}
      className={cn(
        'flex min-w-0 items-center gap-0.5 rounded-md border border-border/60 bg-muted/30 p-0.5',
        className,
      )}
    >
      {children}
    </div>
  );
}

export function ToggleItem({
  active,
  onClick,
  label,
  title,
  className,
  children,
}: {
  active: boolean;
  onClick: () => void;
  /** اسم الوصول — إلزامي لأن بعض الأزرار أيقونة فقط */
  label: string;
  title?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-pressed={active}
      title={title ?? label}
      className={cn(
        'inline-flex h-7 min-w-0 flex-1 items-center justify-center rounded-sm text-xs transition-colors duration-150 cursor-pointer select-none',
        focusRing,
        active
          ? 'bg-card font-bold text-primary shadow-2xs'
          : 'font-medium text-muted-foreground hover:bg-accent/60 hover:text-foreground',
        className,
      )}
    >
      {children}
    </button>
  );
}

/** صف «تسمية + تحكم» بعمود تسمية 80px (نفس `FluentSliderField` المضمَّن). */
export function ControlRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex min-h-7 items-center gap-2 text-xs select-none">
      <span className="w-20 shrink-0 truncate font-normal text-foreground/80" title={label}>
        {label}
      </span>
      <div className="flex min-w-0 flex-1 items-center justify-end">{children}</div>
    </div>
  );
}

/** خلية معاينة تأثير: «Aa» مرسومة بالتأثير نفسه + تسمية قصيرة. */
export function EffectTile({
  active,
  onClick,
  label,
  testId,
  children,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  testId?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      aria-label={label}
      title={label}
      data-testid={testId}
      className={cn(
        'group/tile flex min-w-0 flex-col items-center gap-1 cursor-pointer select-none',
        focusRing,
        'rounded-md',
      )}
    >
      <span
        className={cn(
          'flex h-12 w-full items-center justify-center overflow-hidden rounded-md border bg-background transition-colors duration-150',
          active
            ? 'border-primary ring-1 ring-primary/50'
            : 'border-border/60 group-hover/tile:border-foreground/30 group-hover/tile:bg-accent/30',
        )}
        aria-hidden="true"
      >
        {children}
      </span>
      <span
        className={cn(
          'max-w-full truncate text-micro leading-none transition-colors duration-150',
          active ? 'font-bold text-foreground' : 'text-muted-foreground',
        )}
      >
        {label}
      </span>
    </button>
  );
}
