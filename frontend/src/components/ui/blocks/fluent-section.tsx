import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { CaretDown } from '@/components/ui/icons';

export interface FluentSectionProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> {
  icon?: React.ReactNode;
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
      icon,
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

    return (
      <div
        ref={ref}
        className={cn(
          'rounded-xl border p-3 fluent-specular transition-colors duration-150',
          isOpen
            ? 'bg-card border-border dark:border-white/10 shadow-xs'
            : 'bg-card/75 border-border/70 hover:border-border/90 hover:bg-card/95 shadow-2xs',
          className,
        )}
        {...props}
      >
        {/* Section Header */}
        <div
          onClick={collapsible ? handleToggle : undefined}
          onKeyDown={
            collapsible
              ? (e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleToggle();
                  }
                }
              : undefined
          }
          role={collapsible ? 'button' : undefined}
          tabIndex={collapsible ? 0 : undefined}
          aria-expanded={collapsible ? isOpen : undefined}
          className={cn(
            'flex items-center justify-between gap-2 select-none',
            isOpen ? 'pb-2.5 mb-2.5 border-b border-border/50' : 'pb-0 mb-0',
            collapsible &&
              'cursor-pointer group/sec-header rounded-md outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background',
            headerClassName,
          )}
        >
          <div className="flex items-center gap-2 min-w-0">
            {icon && (
              // شارة الأيقونة محايدة — التباين يعكس حالة التوسيع بدون ألوان دخيلة
              <div
                className={cn(
                  'p-1 rounded-md shrink-0 flex items-center justify-center transition-colors duration-150',
                  isOpen
                    ? 'bg-muted text-foreground border border-border/80'
                    : 'bg-muted/60 dark:bg-white/5 text-muted-foreground border border-border/60',
                )}
              >
                {icon}
              </div>
            )}
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span
                  className={cn(
                    'text-xs font-bold truncate transition-colors duration-150',
                    isOpen
                      ? 'text-foreground'
                      : 'text-foreground/90 group-hover/sec-header:text-foreground',
                  )}
                >
                  {title}
                </span>
                {badge}
              </div>
              {subtitle && (
                // بلا `truncate`: وصف القسم نصّي قصير ولا يجوز بتره (كان يقتطع
                // مثل «الحد الأقصى 6×5 صور (30)» في لوح بعرض ~296px)
                <p className="text-micro text-muted-foreground mt-0.5 leading-tight">{subtitle}</p>
              )}
            </div>
          </div>

          <div className="shrink-0 flex items-center gap-1.5">
            {action && (
              <div
                className="no-print"
                role="presentation"
                onClick={(e) => {
                  if (collapsible) e.stopPropagation();
                }}
              >
                {action}
              </div>
            )}
            {collapsible && (
              <div
                title={isOpen ? 'طي القسم' : 'توسيع القسم'}
                className={cn(
                  'w-6 h-6 rounded-md flex items-center justify-center transition-colors duration-150 shrink-0',
                  isOpen
                    ? 'bg-muted/70 text-foreground'
                    : 'bg-muted/40 group-hover/sec-header:bg-muted group-hover/sec-header:text-foreground text-muted-foreground/80',
                )}
              >
                <CaretDown
                  weight="bold"
                  className={cn(
                    'size-3.5 shrink-0 transition-transform duration-150 ease-out',
                    !isOpen && 'rotate-90 rtl:-rotate-90',
                  )}
                />
              </div>
            )}
          </div>
        </div>

        {/* Section Body Content — فوري وخفيف وأنيق بنمط وتلاشٍ رشيق */}
        {isOpen && (
          <div className={cn('space-y-2.5 animate-in fade-in duration-100', contentClassName)}>
            {children}
          </div>
        )}
      </div>
    );
  }),
);

FluentSection.displayName = 'FluentSection';
