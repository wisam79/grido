import React from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface FluentEmptyStateProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "title"> {
  icon: React.ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
  actionLabel?: React.ReactNode;
  actionIcon?: React.ReactNode;
  onAction?: () => void;
  actionLoading?: boolean;
}

export const FluentEmptyState = React.memo(
  React.forwardRef<HTMLDivElement, FluentEmptyStateProps>(function FluentEmptyState(
    {
      icon,
      title,
      description,
      actionLabel,
      actionIcon,
      onAction,
      actionLoading,
      className,
      ...props
    },
    ref
  ) {
    return (
      <div
        ref={ref}
        className={cn(
          "flex flex-col items-center justify-center text-center p-6 rounded-xl border border-dashed border-border/80 bg-muted/20 dark:bg-muted/10 font-cairo select-none space-y-3",
          className
        )}
        {...props}
      >
        <div className="p-3 rounded-2xl bg-primary/10 text-primary border border-primary/20 shadow-2xs">
          {icon}
        </div>

        <div className="space-y-1 max-w-xs">
          <h4 className="text-xs font-bold text-foreground">{title}</h4>
          {description && (
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              {description}
            </p>
          )}
        </div>

        {actionLabel && onAction && (
          <Button
            variant="outline"
            size="sm"
            onClick={onAction}
            disabled={actionLoading}
            className="h-8 text-xs font-semibold rounded-md border-border/80 bg-background/80 hover:bg-accent hover:border-primary/40 gap-1.5 shadow-2xs cursor-pointer"
          >
            {actionIcon}
            <span>{actionLabel}</span>
          </Button>
        )}
      </div>
    );
  })
);

FluentEmptyState.displayName = "FluentEmptyState";
