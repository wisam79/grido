import React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export interface SegmentedOption<T extends string = string> {
  id: T;
  label?: React.ReactNode;
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
  size?: "sm" | "md" | "lg";
  stacked?: boolean;
  fullWidth?: boolean;
  className?: string;
  layoutId?: string;
  dir?: "rtl" | "ltr";
}

export function FluentSegmentedControl<T extends string = string>({
  value,
  onChange,
  options,
  size = "sm",
  stacked = false,
  fullWidth = true,
  className,
  layoutId,
  dir = "rtl",
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
    const isRtl = dir === "rtl";
    let next = -1;
    const nextKey = isRtl ? "ArrowLeft" : "ArrowRight";
    const prevKey = isRtl ? "ArrowRight" : "ArrowLeft";
    if (e.key === nextKey) next = (idx + 1 + enabled.length) % enabled.length;
    else if (e.key === prevKey) next = (idx - 1 + enabled.length) % enabled.length;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = enabled.length - 1;
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
      aria-orientation={stacked ? "vertical" : "horizontal"}
      onKeyDown={handleTablistKeyDown}
      className={cn(
        "flex items-center gap-1 bg-muted/70 dark:bg-black/40 p-1 rounded-xl border border-border/70 dark:border-white/10 select-none shadow-inner fluent-specular min-w-0 max-w-full",
        fullWidth ? "w-full" : "w-fit inline-flex",
        className
      )}
      dir={dir}
    >
      {options.map((opt) => {
        const isActive = value === opt.id;
        const accessibleLabel =
          typeof opt.label === "string"
            ? opt.label
            : typeof opt.tooltip === "string"
              ? opt.tooltip
              : opt.id;

        const titleText =
          typeof opt.tooltip === "string"
            ? opt.tooltip
            : typeof opt.label === "string"
              ? opt.label
              : undefined;

        return (
          <button
            key={opt.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            data-tab={opt.id}
            data-testid={`segmented-${opt.id}`}
            aria-label={accessibleLabel}
            title={titleText}
            disabled={opt.disabled}
            tabIndex={isActive ? 0 : -1}
            onClick={() => onChange(opt.id)}
            className={cn(
              "relative flex items-center justify-center font-cairo cursor-pointer rounded-md transition-colors duration-150 z-10 select-none min-w-0 overflow-hidden",
              "focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none",
              fullWidth ? "flex-1" : "shrink-0",
              stacked
                ? "flex-col gap-0.5 h-10 px-1 text-mini leading-tight"
                : cn(
                    "gap-1.5",
                    size === "sm" ? "h-7 px-2 text-xs" : size === "lg" ? "h-9 px-3 text-xs font-bold" : "h-8 px-2.5 text-xs"
                  ),
              isActive
                ? "text-foreground font-bold shadow-2xs"
                : "text-muted-foreground hover:text-foreground font-medium",
              opt.disabled && "opacity-40 cursor-not-allowed pointer-events-none",
              opt.className
            )}
          >
            {isActive && (
              <motion.div
                layoutId={effectiveLayoutId}
                className="absolute inset-0 bg-card border border-border/80 dark:border-white/15 rounded-md shadow-xs -z-10"
                transition={{ type: "spring", stiffness: 500, damping: 35 }}
              />
            )}

            {opt.icon && <span className="shrink-0">{opt.icon}</span>}
            {opt.label && <span className="truncate whitespace-nowrap min-w-0 select-none">{opt.label}</span>}
            {opt.badge && <span className="shrink-0">{opt.badge}</span>}
          </button>
        );
      })}
    </div>
  );
}
