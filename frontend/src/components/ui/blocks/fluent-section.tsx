import React, { useState } from "react";
import { cn } from "@/lib/utils";
import { ChevronDown16Regular } from "@fluentui/react-icons";

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
    ref
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
          "rounded-xl border border-border bg-card p-3 shadow-xs fluent-specular transition-all duration-150",
          className
        )}
        {...props}
      >
        {/* Section Header */}
        <div
          onClick={collapsible ? handleToggle : undefined}
          className={cn(
            "flex items-center justify-between gap-2 select-none",
            isOpen ? "pb-2.5 mb-2.5 border-b border-border/50" : "",
            collapsible && "cursor-pointer group/sec-header hover:opacity-90 transition-opacity",
            headerClassName
          )}
        >
          <div className="flex items-center gap-2 min-w-0">
            {icon && (
              <div className="p-1 rounded-md bg-primary/10 dark:bg-primary/20 text-primary border border-primary/20 shrink-0 flex items-center justify-center">
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

          <div className="shrink-0 flex items-center gap-1.5">
            {action && (
              <div
                onClick={(e) => {
                  if (collapsible) e.stopPropagation();
                }}
              >
                {action}
              </div>
            )}
            {collapsible && (
              <div className="p-0.5 rounded text-muted-foreground/70 group-hover/sec-header:text-foreground transition-colors">
                <ChevronDown16Regular
                  className={cn(
                    "size-3.5 shrink-0 transition-transform duration-200",
                    !isOpen && "rotate-90 rtl:-rotate-90"
                  )}
                />
              </div>
            )}
          </div>
        </div>

        {/* Section Body Content */}
        {isOpen && (
          <div className={cn("space-y-2.5 animate-in fade-in duration-150", contentClassName)}>
            {children}
          </div>
        )}
      </div>
    );
  })
);

FluentSection.displayName = "FluentSection";

