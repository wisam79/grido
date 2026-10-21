import React, { useState } from 'react';

import { CaretDown } from '@/components/ui/icons';
import { cn } from '@/lib/utils';

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

    // سطح مكتب: قسم لوحة الخصائص صفٌّ مسطّح يفصله خط شعري — لا بطاقة
    // عائمة بحواف مستديرة وظل، وهي أقوى إشارة بصرية «ويب/جوال» في اللوحة.
    // الفاصل أقوى قليلاً (border/70)، وهو يقود المجموعة التالية: 12px أسفله
    // (قبل عنوان المجموعة) و18px فوقه (آخر صف في المجموعة السابقة + فاصل
    // المسافة) — فالمجموعة تُقرأ ككتلة مستقلة بدل أن تبدو الصفوف متراكمة.
    return (
      <div
        ref={ref}
        className={cn(
          'border-b border-border/70 pt-3 pb-2 first:pt-0 last:border-b-0 last:pb-0 transition-colors duration-150',
          !isOpen && 'opacity-90',
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
            'flex items-center justify-between gap-2 select-none min-h-6',
            isOpen ? 'mb-2.5' : 'mb-0',
            collapsible &&
              'cursor-pointer group/sec-header rounded-sm -mx-1 px-1 py-0.5 outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background hover:bg-accent/50',
            headerClassName,
          )}
        >
          <div className="flex items-center gap-1.5 min-w-0">
            {icon && (
              // أيقونة سطرية بلا شارة خلفية — كثافة ألواح سطح المكتب
              <span
                className={cn(
                  'shrink-0 flex items-center justify-center transition-colors duration-150',
                  '[&_svg]:size-3.5 [&_svg]:text-muted-foreground',
                  !isOpen && 'opacity-70',
                )}
              >
                {icon}
              </span>
            )}
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span
                  className={cn(
                    'text-xs font-bold truncate tracking-tight transition-colors duration-150',
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
                  'w-5 h-5 rounded-md flex items-center justify-center transition-colors duration-150 shrink-0',
                  isOpen
                    ? 'text-muted-foreground'
                    : 'text-muted-foreground/65 group-hover/sec-header:text-foreground',
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
