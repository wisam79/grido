import React from "react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { HugeIcon } from "@/components/ui/huge-icon";
import { HelpCircleIcon } from "@hugeicons/core-free-icons";

export interface FluentSettingRowProps extends React.HTMLAttributes<HTMLDivElement> {
  label: React.ReactNode;
  description?: React.ReactNode;
  tooltip?: string;
  icon?: React.ReactNode;
  control?: React.ReactNode;
  children?: React.ReactNode;
  layout?: "horizontal" | "vertical";
}

export const FluentSettingRow = React.memo(
  React.forwardRef<HTMLDivElement, FluentSettingRowProps>(function FluentSettingRow(
    {
      label,
      description,
      tooltip,
      icon,
      control,
      children,
      layout = "horizontal",
      className,
      ...props
    },
    ref
  ) {
    const actionElement = control || children;

    if (layout === "vertical") {
      return (
        <div ref={ref} className={cn("space-y-1.5", className)} {...props}>
          <div className="flex items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-1.5 font-semibold text-foreground/90">
              {icon && <span className="text-primary shrink-0">{icon}</span>}
              <span>{label}</span>
              {tooltip && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      className="text-muted-foreground/70 hover:text-foreground cursor-pointer"
                      aria-label="مزيد من المعلومات"
                    >
                      <HugeIcon icon={HelpCircleIcon} size={14} />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="text-xs font-cairo">
                    {tooltip}
                  </TooltipContent>
                </Tooltip>
              )}
            </div>
            {description && (
              <span className="text-[10px] text-muted-foreground">{description}</span>
            )}
          </div>
          {actionElement}
        </div>
      );
    }

    return (
      <div
        ref={ref}
        className={cn(
          "flex items-center justify-between gap-3 py-1 text-xs select-none",
          className
        )}
        {...props}
      >
        <div className="flex items-center gap-2 min-w-0">
          {icon && <span className="text-primary shrink-0">{icon}</span>}
          <div className="min-w-0 text-right">
            <div className="flex items-center gap-1.5 font-semibold text-foreground/90">
              <span className="truncate">{label}</span>
              {tooltip && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      className="text-muted-foreground/70 hover:text-foreground cursor-pointer inline-flex"
                      aria-label="مزيد من المعلومات"
                    >
                      <HugeIcon icon={HelpCircleIcon} size={14} />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="text-xs font-cairo">
                    {tooltip}
                  </TooltipContent>
                </Tooltip>
              )}
            </div>
            {description && (
              <p className="text-[10px] text-muted-foreground truncate leading-tight mt-0.5">
                {description}
              </p>
            )}
          </div>
        </div>

        {actionElement && <div className="shrink-0 flex items-center">{actionElement}</div>}
      </div>
    );
  })
);

FluentSettingRow.displayName = "FluentSettingRow";
