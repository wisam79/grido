import React from "react";
import { cn } from "@/lib/utils";

export interface FluentSectionProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "title"> {
  icon?: React.ReactNode;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  badge?: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
  contentClassName?: string;
  headerClassName?: string;
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
      ...props
    },
    ref
  ) {
    return (
      <div
        ref={ref}
        className={cn(
          "rounded-xl border border-border/80 dark:border-white/10 bg-card/90 dark:bg-card/70 backdrop-blur-md p-3 shadow-2xs fluent-specular transition-all duration-150",
          className
        )}
        {...props}
      >
        {/* Section Header */}
        <div
          className={cn(
            "flex items-center justify-between gap-2 pb-2.5 mb-2.5 border-b border-border/40 select-none",
            headerClassName
          )}
        >
          <div className="flex items-center gap-2 min-w-0">
            {icon && (
              <div className="p-1 rounded-md bg-primary/10 text-primary shrink-0 flex items-center justify-center">
                {icon}
              </div>
            )}
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-foreground truncate">
                  {title}
                </span>
                {badge}
              </div>
              {subtitle && (
                <p className="text-[10px] text-muted-foreground truncate mt-0.5">
                  {subtitle}
                </p>
              )}
            </div>
          </div>

          {action && <div className="shrink-0 flex items-center gap-1.5">{action}</div>}
        </div>

        {/* Section Body Content */}
        <div className={cn("space-y-2.5", contentClassName)}>
          {children}
        </div>
      </div>
    );
  })
);

FluentSection.displayName = "FluentSection";
