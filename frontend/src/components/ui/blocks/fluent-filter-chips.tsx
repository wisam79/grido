import React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export interface FilterChipOption<T extends string = string> {
  id: T;
  label: React.ReactNode;
  icon?: React.ReactNode;
  count?: number | string;
  badge?: React.ReactNode;
  disabled?: boolean;
}

export interface FluentFilterChipsProps<T extends string = string> {
  value: T;
  onChange: (value: T) => void;
  options: FilterChipOption<T>[];
  variant?: "subtle" | "tint" | "brand";
  shape?: "rounded" | "pill";
  size?: "sm" | "md";
  className?: string;
  layoutId?: string;
  dir?: "rtl" | "ltr";
}

/**
 * مكوّن كبسولات ورقاقات التصفية الموحد وفق نظام تصميم Microsoft Fluent 2 القياسي
 * يوفر تناسقاً بصرياً مطابقاً لـ FluentSegmentedControl (مسار داكن مع كرت بطاقة مرتفع ومتحرك).
 */
export function FluentFilterChips<T extends string = string>({
  value,
  onChange,
  options,
  variant = "subtle",
  shape = "rounded",
  size = "sm",
  className,
  layoutId,
  dir = "rtl",
}: FluentFilterChipsProps<T>) {
  const autoId = React.useId();
  const effectiveLayoutId = layoutId || `fluent-chips-${autoId}`;

  return (
    <div
      role="tablist"
      aria-orientation="horizontal"
      className={cn(
        "flex items-center gap-1 bg-muted/70 dark:bg-black/40 p-1 rounded-xl border border-border/70 dark:border-white/10 fluent-specular shadow-inner overflow-x-auto scrollbar-none select-none min-w-0 max-w-full touch-pan-x",
        className
      )}
      dir={dir}
    >
      {options.map((opt) => {
        const isActive = value === opt.id;
        const radiusClass = shape === "pill" ? "rounded-full" : "rounded-md";
        const isFullWidth = className?.includes("w-full") || className?.includes("justify-between");

        return (
          <button
            key={opt.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            disabled={opt.disabled}
            onClick={() => onChange(opt.id)}
            className={cn(
              "relative flex items-center justify-center transition-all duration-150 cursor-pointer whitespace-nowrap select-none active:scale-[0.98] z-10",
              "focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 focus-visible:outline-none",
              isFullWidth ? "flex-1" : "shrink-0",
              radiusClass,
              size === "sm"
                ? "h-7 px-2.5 text-xs gap-1.5"
                : "h-8 px-3 text-xs gap-2",
              isActive
                ? "text-foreground font-bold shadow-2xs"
                : "text-muted-foreground hover:text-foreground font-medium",
              opt.disabled && "opacity-40 cursor-not-allowed pointer-events-none"
            )}
          >
            {isActive && (
              <motion.div
                layoutId={effectiveLayoutId}
                className={cn(
                  "absolute inset-0 -z-10 shadow-xs",
                  radiusClass,
                  variant === "brand"
                    ? "bg-primary text-primary-foreground shadow-primary/25"
                    : "bg-card border border-border/80 dark:border-white/15"
                )}
                transition={{ type: "spring", stiffness: 500, damping: 35 }}
              />
            )}

            {opt.icon && <span className="shrink-0 [&>svg]:size-3.5">{opt.icon}</span>}
            <span className="truncate whitespace-nowrap select-none">{opt.label}</span>
            {opt.count !== undefined && (
              <span
                className={cn(
                  "text-[10px] font-mono px-1.5 py-0.2 rounded-full font-bold shrink-0 transition-colors border",
                  isActive
                    ? "bg-muted text-foreground border-border/70"
                    : "bg-muted/50 text-muted-foreground border-border/40"
                )}
              >
                {opt.count}
              </span>
            )}
            {opt.badge && <span className="shrink-0">{opt.badge}</span>}
          </button>
        );
      })}
    </div>
  );
}
