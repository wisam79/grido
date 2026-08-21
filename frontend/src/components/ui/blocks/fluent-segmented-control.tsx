import React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export interface SegmentedOption<T extends string = string> {
  id: T;
  label: React.ReactNode;
  icon?: React.ReactNode;
  badge?: React.ReactNode;
  disabled?: boolean;
}

export interface FluentSegmentedControlProps<T extends string = string> {
  value: T;
  onChange: (value: T) => void;
  options: SegmentedOption<T>[];
  size?: "sm" | "md";
  className?: string;
  layoutId?: string;
}

export function FluentSegmentedControl<T extends string = string>({
  value,
  onChange,
  options,
  size = "sm",
  className,
  layoutId = "fluent-segmented-pill",
}: FluentSegmentedControlProps<T>) {
  const isSm = size === "sm";

  return (
    <div
      className={cn(
        "flex items-center gap-1 bg-muted/60 dark:bg-muted/30 backdrop-blur-md p-1 rounded-xl border border-black/5 dark:border-white/10 select-none fluent-specular",
        className
      )}
      dir="rtl"
    >
      {options.map((opt) => {
        const isActive = value === opt.id;

        return (
          <button
            key={opt.id}
            type="button"
            disabled={opt.disabled}
            onClick={() => onChange(opt.id)}
            className={cn(
              "relative flex-1 flex items-center justify-center gap-1.5 font-cairo cursor-pointer rounded-md transition-all duration-150 z-10 select-none",
              "focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 focus-visible:outline-none",
              isSm ? "h-7 px-2.5 text-[11px]" : "h-8 px-3 text-xs",
              isActive
                ? "text-primary font-bold shadow-2xs"
                : "text-muted-foreground hover:text-foreground",
              opt.disabled && "opacity-40 cursor-not-allowed pointer-events-none"
            )}
          >
            {isActive && (
              <motion.div
                layoutId={layoutId}
                className="absolute inset-0 bg-background dark:bg-card border border-black/5 dark:border-white/10 rounded-md shadow-xs -z-10"
                transition={{ type: "spring", stiffness: 500, damping: 35 }}
              />
            )}

            {opt.icon && <span className="shrink-0">{opt.icon}</span>}
            <span className="truncate">{opt.label}</span>
            {opt.badge && <span className="shrink-0">{opt.badge}</span>}
          </button>
        );
      })}
    </div>
  );
}
