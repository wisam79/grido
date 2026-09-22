import React from "react";
import { cn } from "@/lib/utils";

/**
 * FluentKbd — كبسولة الاختصار الموحدة (كانت 13 نسخة متطابقة حرفياً:
 * `px-1 py-0.5 text-micro font-mono bg-muted/80 rounded border border-border`).
 * النص دائماً LTR حتى داخل واجهة RTL.
 */
export const FluentKbd = React.memo(function FluentKbd({
  keys,
  className,
}: {
  keys: string;
  className?: string;
}) {
  return (
    <kbd
      dir="ltr"
      className={cn(
        "px-1 py-0.5 text-micro font-mono bg-muted/80 rounded border border-border whitespace-nowrap",
        className
      )}
    >
      {keys}
    </kbd>
  );
});
