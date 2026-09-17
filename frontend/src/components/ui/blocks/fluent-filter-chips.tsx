import React from "react";
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
  variant?: "tint" | "subtle" | "brand";
  shape?: "rounded" | "pill";
  size?: "sm" | "md";
  className?: string;
  dir?: "rtl" | "ltr";
}

/**
 * مكوّن كبسولات ورقاقات التصفية الموحد وفق نظام تصميم Microsoft Fluent 2 القياسي
 * يوفر تناسقاً بصرياً في كافة لوحات وقوائم التطبيق بدلاً من الأكواد اليدوية المكررة.
 */
export function FluentFilterChips<T extends string = string>({
  value,
  onChange,
  options,
  variant = "tint",
  shape = "rounded",
  size = "sm",
  className,
  dir = "rtl",
}: FluentFilterChipsProps<T>) {
  return (
    <div
      role="tablist"
      aria-orientation="horizontal"
      className={cn(
        "flex items-center gap-1.5 overflow-x-auto scrollbar-none py-0.5 select-none min-w-0 max-w-full",
        className
      )}
      dir={dir}
    >
      {options.map((opt) => {
        const isActive = value === opt.id;
        const radiusClass = shape === "pill" ? "rounded-full" : "rounded-md";

        return (
          <button
            key={opt.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            disabled={opt.disabled}
            onClick={() => onChange(opt.id)}
            className={cn(
              "shrink-0 flex items-center transition-all cursor-pointer font-cairo whitespace-nowrap border select-none",
              "focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 focus-visible:outline-none",
              radiusClass,
              size === "sm"
                ? "h-7 px-2.5 text-mini gap-1.5"
                : "h-8 px-3 text-xs gap-2",
              // Variant styling according to Fluent 2 standards
              variant === "tint" &&
                (isActive
                  ? "bg-primary/15 text-primary border-primary/30 font-bold shadow-2xs"
                  : "bg-muted/40 hover:bg-muted/80 text-muted-foreground hover:text-foreground border-border/40 font-medium"),
              variant === "subtle" &&
                (isActive
                  ? "bg-card text-foreground border-border/80 shadow-2xs font-bold"
                  : "bg-transparent hover:bg-muted/50 text-muted-foreground hover:text-foreground border-transparent font-medium"),
              variant === "brand" &&
                (isActive
                  ? "bg-primary text-primary-foreground border-transparent shadow-2xs font-bold"
                  : "bg-muted/40 hover:bg-muted text-muted-foreground hover:text-foreground border-border/30 font-medium"),
              opt.disabled && "opacity-40 cursor-not-allowed pointer-events-none"
            )}
          >
            {opt.icon && <span className="shrink-0 [&>svg]:size-3.5">{opt.icon}</span>}
            <span>{opt.label}</span>
            {opt.count !== undefined && (
              <span
                className={cn(
                  "text-[10px] font-mono px-1.5 py-0.2 rounded font-bold shrink-0 transition-colors",
                  isActive
                    ? variant === "brand"
                      ? "bg-black/20 text-primary-foreground"
                      : "bg-primary/20 text-primary"
                    : "bg-muted text-muted-foreground"
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
