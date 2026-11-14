import React, { useState } from 'react';

import { CaretDown } from '@/components/ui/icons';
import { cn } from '@/lib/utils';

export interface FluentSectionProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  badge?: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
  contentClassName?: string;
  headerClassName?: string;
  collapsible?: boolean;
  defaultOpen?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export const FluentSection = React.memo(
  React.forwardRef<HTMLDivElement, FluentSectionProps>(function FluentSection(
    {
      title,
      subtitle,
      badge,
      action,
      children,
      className,
      contentClassName,
      headerClassName,
      collapsible = false,
      defaultOpen = true,
      open: controlledOpen,
      onOpenChange,
      ...props
    },
    ref,
  ) {
    const headingId = React.useId();
    const [uncontrolledOpen, setUncontrolledOpen] = useState(defaultOpen);
    const isControlled = controlledOpen !== undefined;
    const isOpen = isControlled ? controlledOpen : uncontrolledOpen;

    const handleToggle = () => {
      if (!collapsible) return;
      const next = !isOpen;
      if (!isControlled) {
        setUncontrolledOpen(next);
      }
      onOpenChange?.(next);
    };

    const heading = (
      <>
        {collapsible && (
          <span
            aria-hidden="true"
            title={isOpen ? 'طي القسم' : 'توسيع القسم'}
            className="size-4 flex items-center justify-center shrink-0 text-muted-foreground"
          >
            <CaretDown
              weight="bold"
              className={cn(
                'size-3.5 shrink-0 transition-transform duration-150 ease-out motion-reduce:transition-none',
                !isOpen && '-rotate-90 rtl:rotate-90',
              )}
            />
          </span>
        )}
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1.5 min-w-0">
            <span
              id={`${headingId}-title`}
              className={cn(
                'min-w-0 text-control font-semibold break-words [overflow-wrap:anywhere] transition-colors duration-150 motion-reduce:transition-none',
                isOpen
                  ? 'text-foreground'
                  : 'text-foreground/90 group-hover/sec-header:text-foreground',
              )}
            >
              {title}
            </span>
            {badge != null && (
              <span id={`${headingId}-badge`} className="shrink-0">
                {badge}
              </span>
            )}
          </span>
          {subtitle && (
            <span
              id={`${headingId}-subtitle`}
              className="block text-mini text-muted-foreground mt-0.5 leading-4 break-words [overflow-wrap:anywhere]"
            >
              {subtitle}
            </span>
          )}
        </span>
      </>
    );

    return (
      <div
        ref={ref}
        className={cn(
          'border-b border-border/40 py-3 first:pt-0 last:border-b-0 last:pb-0 transition-colors duration-150 motion-reduce:transition-none',
          !isOpen && 'opacity-90',
          className,
        )}
        {...props}
      >
        <div
          data-slot="ux-section-header"
          className={cn(
            'flex items-center justify-between gap-3 select-none min-h-7',
            isOpen ? 'mb-3' : 'mb-0',
            headerClassName,
          )}
        >
          {collapsible ? (
            <button
              type="button"
              onClick={handleToggle}
              aria-expanded={isOpen}
              aria-labelledby={[
                `${headingId}-title`,
                badge != null && `${headingId}-badge`,
                subtitle && `${headingId}-subtitle`,
              ]
                .filter(Boolean)
                .join(' ')}
              className="flex flex-1 min-w-0 min-h-7 coarse-touch-target items-center gap-2 py-1 text-start cursor-pointer group/sec-header rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background hover:bg-accent/50 transition-colors duration-150 motion-reduce:transition-none"
            >
              {heading}
            </button>
          ) : (
            <div className="flex flex-1 min-w-0 items-center gap-2 text-start">{heading}</div>
          )}
          {action && <div className="shrink-0 no-print">{action}</div>}
        </div>

        {isOpen && (
          <div
            className={cn(
              'space-y-3 motion-safe:animate-in motion-safe:fade-in motion-safe:duration-100',
              contentClassName,
            )}
          >
            {children}
          </div>
        )}
      </div>
    );
  }),
);

FluentSection.displayName = 'FluentSection';
