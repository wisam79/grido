import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
          'rounded-xl border p-3 fluent-specular transition-all duration-200',
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
            'flex items-center justify-between gap-2 select-none transition-all duration-200',
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
                  'p-1 rounded-md shrink-0 flex items-center justify-center transition-colors duration-200',
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
                <p className="text-micro text-muted-foreground truncate mt-0.5">{subtitle}</p>
              )}
            </div>
          </div>

          <div className="shrink-0 flex items-center gap-1.5">
            {action && (
              <div
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
                  'w-6 h-6 rounded-md flex items-center justify-center transition-all duration-200 shrink-0',
                  isOpen
                    ? 'bg-muted/70 text-foreground'
                    : 'bg-muted/40 group-hover/sec-header:bg-muted group-hover/sec-header:text-foreground text-muted-foreground/80',
                )}
              >
                <CaretDown
                  weight="bold"
                  className={cn(
                    'size-3.5 shrink-0 transition-transform duration-200 ease-out',
                    !isOpen && 'rotate-90 rtl:-rotate-90',
                  )}
                />
              </div>
            )}
          </div>
        </div>

        {/* Section Body Content مع أنميشن انزلاق وتلاشٍ سلس بنمط Fluent 2 */}
        <AnimatePresence initial={false}>
          {isOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{
                height: 'auto',
                opacity: 1,
                transition: {
                  height: { duration: 0.22, ease: [0.1, 0.9, 0.2, 1] },
                  opacity: { duration: 0.18, ease: 'easeOut' },
                },
              }}
              exit={{
                height: 0,
                opacity: 0,
                transition: {
                  height: { duration: 0.18, ease: [0.9, 0.1, 1, 1] },
                  opacity: { duration: 0.12, ease: 'easeIn' },
                },
              }}
              className="overflow-hidden"
            >
              <div className={cn('space-y-2.5', contentClassName)}>{children}</div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }),
);

FluentSection.displayName = 'FluentSection';
