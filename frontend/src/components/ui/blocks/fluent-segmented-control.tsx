import { motion } from 'framer-motion';
import React from 'react';

import { cn } from '@/lib/utils';

export interface SegmentedOption<T extends string = string> {
  id: T;
  label?: React.ReactNode;
  /** اسم وصول وصفي عند اختصار النص المرئي (مثال: «ضبط» ← «الألوان والضبط») */
  ariaLabel?: string;
  icon?: React.ReactNode;
  badge?: React.ReactNode;
  tooltip?: React.ReactNode;
  disabled?: boolean;
  className?: string;
}

export interface FluentSegmentedControlProps<T extends string = string> {
  value: T;
  onChange: (value: T) => void;
  options: SegmentedOption<T>[];
  size?: 'sm' | 'md' | 'lg';
  stacked?: boolean;
  /**
   * نمط العرض:
   * - `tabs` (افتراضي): شريط تبويبات مسطّح بخط سفلي — لأسفل الألواح.
   * - `field`: مفتاح اختيار مؤطّر داخل صف حقول — يشارك الحقول إطاراً واحداً
   *   فلا يظهر تبويب عارٍ وسط قائمة من الحقول.
   */
  variant?: 'tabs' | 'field';
  fullWidth?: boolean;
  className?: string;
  layoutId?: string;
  dir?: 'rtl' | 'ltr';
  /**
   * بادئة ربط الألواح (H11 من تدقيق 2026-10-08): عند تمريرها يحمل كل تبويب
   * `id="${idPrefix}-trigger-<id>"` و`aria-controls="${idPrefix}-content-<id>"`
   * فيرتبط باللوح المقابل بلا مرجع معلّق. بدونها كان `TabsContent` يشير إلى
   * معرّف trigger غير موجود (زر التبويب بلا id).
   */
  idPrefix?: string;
  /** اسم وصول للـ tablist نفسه (مثال: «أقسام الحساب») — axe يطلب tablist مسمّى */
  ariaLabel?: string;
}

export function FluentSegmentedControl<T extends string = string>({
  value,
  onChange,
  options,
  size = 'sm',
  stacked = false,
  variant = 'tabs',
  fullWidth = true,
  className,
  layoutId,
  dir = 'rtl',
  idPrefix,
  ariaLabel = 'تبويبات',
}: FluentSegmentedControlProps<T>) {
  const autoId = React.useId();
  const effectiveLayoutId = layoutId || `fluent-segmented-${autoId}`;
  const tablistId = `${effectiveLayoutId}-tablist`;

  /** تنقل لوحة المفاتيح بين التبويبات وفق نمط WAI-ARIA Tabs (أسهم → تغيير فوري للقيمة) */
  const handleTablistKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    if (!target.matches('[role="tab"]')) return;
    const enabled = options.filter((o) => !o.disabled);
    if (enabled.length < 2) return;
    const idx = enabled.findIndex((o) => o.id === (target as HTMLElement).dataset.tab);
    const isRtl = dir === 'rtl';
    let next = -1;
    const nextKey = isRtl ? 'ArrowLeft' : 'ArrowRight';
    const prevKey = isRtl ? 'ArrowRight' : 'ArrowLeft';
    if (e.key === nextKey) next = (idx + 1 + enabled.length) % enabled.length;
    else if (e.key === prevKey) next = (idx - 1 + enabled.length) % enabled.length;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = enabled.length - 1;
    if (next >= 0) {
      e.preventDefault();
      onChange(enabled[next].id);
      const container = e.currentTarget;
      requestAnimationFrame(() => {
        const tab = container.querySelector<HTMLButtonElement>(`[data-tab="${enabled[next].id}"]`);
        tab?.focus();
      });
    }
  };

  return (
    <div
      role="tablist"
      id={tablistId}
      tabIndex={-1}
      aria-label={ariaLabel}
      aria-orientation={stacked ? 'vertical' : 'horizontal'}
      onKeyDown={handleTablistKeyDown}
      className={cn(
        // سطح مكتب: تبويبات مسطّحة بخط سفلي بدل كبسولة بيضية عائمة — نمط
        // ألواح الخصائص في محررات سطح المكتب (Figma/Photoshop/Office).
        'flex items-center gap-0.5 select-none min-w-0 max-w-full',
        variant === 'field'
          ? 'flex-row gap-0.5 p-0.5 rounded-md border border-border/60 bg-muted/40'
          : stacked
            ? 'flex-col gap-0.5 p-0.5 rounded-md border border-border/60 bg-muted/40'
            : 'border-b border-border/60 rounded-none p-0',
        fullWidth ? 'w-full' : 'w-fit inline-flex',
        className,
      )}
      dir={dir}
    >
      {options.map((opt) => {
        const isActive = value === opt.id;
        const accessibleLabel =
          opt.ariaLabel ??
          (typeof opt.label === 'string'
            ? opt.label
            : typeof opt.tooltip === 'string'
              ? opt.tooltip
              : opt.id);

        const titleText =
          typeof opt.tooltip === 'string'
            ? opt.tooltip
            : typeof opt.label === 'string'
              ? opt.label
              : undefined;

        return (
          <button
            key={opt.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            id={idPrefix ? `${idPrefix}-trigger-${opt.id}` : undefined}
            aria-controls={idPrefix ? `${idPrefix}-content-${opt.id}` : undefined}
            data-tab={opt.id}
            data-testid={`segmented-${opt.id}`}
            aria-label={accessibleLabel}
            title={titleText}
            disabled={opt.disabled}
            tabIndex={isActive ? 0 : -1}
            onClick={() => onChange(opt.id)}
            className={cn(
              'relative flex items-center justify-center font-cairo cursor-pointer transition-colors duration-150 z-10 select-none min-w-0 overflow-hidden',
              'focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none',
              fullWidth ? 'flex-1' : 'shrink-0',
              stacked || variant === 'field'
                ? cn(
                    'flex-col gap-0.5 rounded-sm',
                    variant === 'field' ? 'h-7 px-2 text-xs' : 'h-10 px-1 text-mini',
                    isActive ? 'bg-card shadow-2xs' : 'hover:bg-accent/60',
                  )
                : cn(
                    'gap-1.5 rounded-none',
                    size === 'sm'
                      ? 'h-7 px-2 text-xs'
                      : size === 'lg'
                        ? 'h-9 px-3 text-xs font-bold'
                        : 'h-8 px-2.5 text-xs',
                    isActive ? 'bg-accent/40' : 'hover:bg-accent/50',
                  ),
              isActive ? 'text-foreground font-bold' : 'text-muted-foreground font-medium',
              opt.disabled && 'opacity-40 cursor-not-allowed pointer-events-none',
              opt.className,
            )}
          >
            {isActive && (
              <motion.div
                layoutId={effectiveLayoutId}
                className={
                  stacked || variant === 'field'
                    ? 'absolute inset-0 bg-card border border-border/80 dark:border-white/15 rounded-sm shadow-2xs -z-10'
                    : 'absolute inset-x-1 bottom-0 h-0.5 bg-primary rounded-full -z-10'
                }
                transition={{ duration: 0.12, ease: 'easeOut' }}
              />
            )}

            {opt.icon && <span className="shrink-0">{opt.icon}</span>}
            {opt.label && (
              <span className="truncate whitespace-nowrap min-w-0 select-none">{opt.label}</span>
            )}
            {opt.badge && <span className="shrink-0">{opt.badge}</span>}
          </button>
        );
      })}
    </div>
  );
}
