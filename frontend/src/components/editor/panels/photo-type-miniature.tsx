import React from "react";
import { cn } from "@/lib/utils";
import { Grid20Regular } from "@fluentui/react-icons";

export function PhotoTypeMiniature({ type, active }: { type: string; active: boolean }) {
  return (
    <div className={cn(
      "w-7 h-9 rounded-md border flex items-center justify-center mb-1 transition-all duration-200",
      active ? "border-primary/80 bg-primary/10 shadow-[0_0_8px_rgba(59,130,246,0.15)]" : "border-border/60 bg-muted/20"
    )}>
      {type === "stretch" ? (
        <Grid20Regular className={cn("w-3.5 h-3.5 transition-colors", active ? "text-primary" : "text-muted-foreground/60")} />
      ) : (
        <div className={cn(
          "rounded-[1px] border border-dashed transition-all duration-200",
          type === "visa" ? "w-4.5 h-4.5" : 
          type === "iq-general-id" ? "w-3.5 h-5.5" :
          type === "iq-national-id" ? "w-4 h-5.5" :
          type === "iq-civil-id" ? "w-4 h-5" : "w-4 h-4.5",
          active ? "border-primary/80 bg-primary/30" : "border-muted-foreground/50 bg-muted/40"
        )} />
      )}
    </div>
  );
}
