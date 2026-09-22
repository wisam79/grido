import React from "react";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { FluentKbd } from "./fluent-kbd";

export interface FluentTooltipProps {
  content: React.ReactNode;
  shortcut?: string;
  side?: "top" | "bottom" | "left" | "right";
  className?: string;
  children: React.ReactNode;
}

/**
 * FluentTooltip — غلاف التلميح الموحد (كان معرّفاً بثلاث نسخ: TooltipBtn في
 * toolbar-items وtoolbar-file-ops + عشرات الكتل اليدوية في inspector و
 * slot-properties). يمرّر side/className كما هي — صفر تغيير بصري — مع دعم
 * اختياري لشارة الاختصار الموحدة بدل نص "(Ctrl+X)" اليدوي.
 */
export const FluentTooltip = React.memo(function FluentTooltip({
  content,
  shortcut,
  side = "bottom",
  className,
  children,
}: FluentTooltipProps) {
  // R36: حقن aria-label تلقائياً من نص التلميح (كان موجوداً في نسخة
  // layers-list فقط) — لا يُكتب فوق تسمية موجودة.
  const labeledChild =
    React.isValidElement<{ "aria-label"?: string }>(children) &&
    typeof content === "string" &&
    !children.props["aria-label"]
      ? React.cloneElement(children, { "aria-label": content })
      : children;
  return (
    <Tooltip>
      <TooltipTrigger asChild>{labeledChild}</TooltipTrigger>
      <TooltipContent side={side} className={className}>
        {shortcut ? (
          <div className="flex items-center gap-1.5">
            <span>{content}</span>
            <FluentKbd keys={shortcut} />
          </div>
        ) : (
          content
        )}
      </TooltipContent>
    </Tooltip>
  );
});
