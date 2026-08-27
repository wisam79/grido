import React from "react";
import { Button, ButtonProps } from "@/components/ui/button";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { Loading03Icon } from "@hugeicons/core-free-icons";
import { HugeIcon } from "@/components/ui/huge-icon";
import { cn } from "@/lib/utils";

export interface FluentIconButtonProps extends Omit<ButtonProps, "size"> {
  icon?: React.ReactNode;
  tooltip?: string;
  tooltipSide?: "top" | "bottom" | "left" | "right";
  size?: "compact" | "default" | "hero";
  loading?: boolean;
  active?: boolean;
}

export const FluentIconButton = React.memo(
  React.forwardRef<HTMLButtonElement, FluentIconButtonProps>(function FluentIconButton(
    {
      icon,
      tooltip,
      tooltipSide = "bottom",
      size = "default",
      loading = false,
      active = false,
      children,
      className,
      disabled,
      ...props
    },
    ref
  ) {
    const sizeClasses = {
      compact: "h-7 px-2 text-[11px] gap-1",
      default: "h-8 px-2.5 text-xs gap-1.5",
      hero: "h-9 px-3 text-xs font-bold gap-2",
    }[size];

    const button = (
      <Button
        ref={ref}
        disabled={disabled || loading}
        className={cn(
          sizeClasses,
          "rounded-md font-cairo cursor-pointer transition-all duration-150 select-none shadow-2xs",
          "focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none",
          active && "bg-primary text-primary-foreground font-bold shadow-xs",
          className
        )}
        {...props}
      >
        {loading ? (
          <HugeIcon icon={Loading03Icon} size={14} className="w-3.5 h-3.5 animate-spin shrink-0" />
        ) : (
          icon && <span className="shrink-0">{icon}</span>
        )}
        {children}
      </Button>
    );

    if (!tooltip) return button;

    return (
      <Tooltip>
        <TooltipTrigger asChild>
          {disabled ? <span className="inline-flex cursor-not-allowed">{button}</span> : button}
        </TooltipTrigger>
        <TooltipContent side={tooltipSide} className="text-xs font-cairo font-medium">
          {tooltip}
        </TooltipContent>
      </Tooltip>
    );
  })
);

FluentIconButton.displayName = "FluentIconButton";
