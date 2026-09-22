import React from "react";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { FluentKbd } from "./fluent-kbd";
import { cn } from "@/lib/utils";

export interface FluentCapsuleButtonProps {
  icon: React.ReactNode;
  label: string;
  tooltip: React.ReactNode;
  shortcut?: string;
  active?: boolean;
  onClick?: () => void;
  testId?: string;
  className?: string;
}

/**
 * FluentCapsuleButton — زر الكبسولة الأيقوني الموحد لشرائط الأدوات المدمجة
 * (كان ~12 نسخة متطابقة في canvas-viewport-deck وحدها: نفس الكلاسات ونفس
 * قالب Tooltip+Ctrl+kbd). الحالة النشطة بلون primary، والخاملة muted.
 */
export const FluentCapsuleButton = React.memo(function FluentCapsuleButton({
  icon,
  label,
  tooltip,
  shortcut,
  active = false,
  onClick,
  testId,
  className,
}: FluentCapsuleButtonProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={onClick}
          data-testid={testId}
          aria-label={label}
          className={cn(
            "w-7 h-7 flex items-center justify-center rounded-md transition-all duration-150 cursor-pointer",
            "focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none active:scale-95 border border-transparent",
            active
              ? "text-primary hover:bg-primary/10"
              : "text-muted-foreground/75 hover:text-foreground hover:bg-muted/60",
            className
          )}
        >
          {icon}
        </button>
      </TooltipTrigger>
      <TooltipContent
        side="top"
        sideOffset={8}
        align="center"
        className="font-cairo text-xs font-semibold py-1 px-2.5 shadow-fluent-8"
      >
        <div className="flex items-center gap-1.5">
          <span>{tooltip}</span>
          {shortcut && <FluentKbd keys={shortcut} />}
        </div>
      </TooltipContent>
    </Tooltip>
  );
});
