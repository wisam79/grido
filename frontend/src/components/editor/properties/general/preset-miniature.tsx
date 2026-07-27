import { cn } from "@/lib/utils";

export function PresetMiniature({ id, active }: { id: string; active: boolean }) {
  const isLandscape = ["4x6", "5x7"].includes(id);
  const isOther = !["a4", "4x6", "a5", "a3", "5x7"].includes(id) && id !== "custom";

  return (
    <div className={cn(
      "w-7 h-7 rounded-md border flex items-center justify-center mb-1.5 transition-all duration-200",
      active ? "border-primary/80 bg-primary/10 shadow-[0_0_8px_rgba(59,130,246,0.15)]" : "border-border/60 bg-muted/20"
    )}>
      {isOther ? (
        <div className="relative w-4 h-4 flex items-center justify-center">
          <div className="absolute w-3.5 h-4.5 border border-muted-foreground/45 rounded-[1px] bg-muted/30 -rotate-6 translate-x-[-1.5px]" />
          <div className={cn("absolute w-3.5 h-4.5 border rounded-[1px] rotate-6 translate-x-[1.5px] transition-all", active ? "border-primary bg-primary/20" : "border-muted-foreground/60 bg-muted/40")} />
        </div>
      ) : (
        <div className={cn(
          "rounded-[2px] border transition-all duration-200",
          isLandscape ? "w-5 h-3.5" : "w-3.5 h-5",
          active ? "border-primary/80 bg-primary/30" : "border-muted-foreground/50 bg-muted/40"
        )} />
      )}
    </div>
  );
}
