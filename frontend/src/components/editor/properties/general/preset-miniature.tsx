import { cn } from "@/lib/utils";

export function PresetMiniature({ id, active }: { id: string; active: boolean }) {
  const isOther = !["a4", "4x6", "a5", "a3", "5x7"].includes(id) && id !== "custom";

  return (
    <div
      className={cn(
        "w-7 h-7 rounded-md border flex items-center justify-center mb-1 transition-all duration-200",
        active
          ? "border-primary/80 bg-primary/10 shadow-[0_0_8px_rgba(59,130,246,0.2)]"
          : "border-border/60 bg-muted/20"
      )}
    >
      {isOther ? (
        <div className="relative w-4 h-4 flex items-center justify-center">
          <div className="absolute w-3.5 h-4.5 border border-muted-foreground/45 rounded-[1px] bg-muted/30 -rotate-6 -translate-x-0.5" />
          <div
            className={cn(
              "absolute w-3.5 h-4.5 border rounded-[1px] rotate-6 translate-x-0.5 transition-all",
              active ? "border-primary bg-primary/25" : "border-muted-foreground/60 bg-muted/40"
            )}
          />
        </div>
      ) : id === "a3" ? (
        // A3: Large ISO Sheet (Tall 1:1.41)
        <div
          className={cn(
            "w-4 h-5.5 rounded-[2px] border transition-all duration-200 relative flex items-center justify-center",
            active ? "border-primary/90 bg-primary/25" : "border-muted-foreground/50 bg-muted/40"
          )}
        >
          <div className={cn("w-2.5 h-[1px]", active ? "bg-primary/50" : "bg-muted-foreground/30")} />
        </div>
      ) : id === "a4" ? (
        // A4: Standard ISO Sheet (1:1.41)
        <div
          className={cn(
            "w-3.5 h-5 rounded-[2px] border transition-all duration-200 relative flex items-center justify-center",
            active ? "border-primary/90 bg-primary/25" : "border-muted-foreground/50 bg-muted/40"
          )}
        >
          <div className={cn("w-2 h-[1px]", active ? "bg-primary/50" : "bg-muted-foreground/30")} />
        </div>
      ) : id === "a5" ? (
        // A5: Compact ISO Sheet
        <div
          className={cn(
            "w-3 h-4 rounded-[1.5px] border transition-all duration-200",
            active ? "border-primary/90 bg-primary/25" : "border-muted-foreground/50 bg-muted/40"
          )}
        />
      ) : id === "4x6" ? (
        // 4x6 Photo: Landscape 3:2 Photo Print Frame
        <div
          className={cn(
            "w-5.5 h-3.5 rounded-[2px] border transition-all duration-200 relative flex items-center justify-center",
            active ? "border-primary/90 bg-primary/25" : "border-muted-foreground/50 bg-muted/40"
          )}
        >
          <div className={cn("w-3.5 h-1.5 rounded-[1px] border border-dashed", active ? "border-primary/40" : "border-muted-foreground/30")} />
        </div>
      ) : id === "5x7" ? (
        // 5x7 Photo: Wider 7:5 Photo Print Frame
        <div
          className={cn(
            "w-5 h-3.5 rounded-[2px] border transition-all duration-200 relative flex items-center justify-center",
            active ? "border-primary/90 bg-primary/25" : "border-muted-foreground/50 bg-muted/40"
          )}
        >
          <div className={cn("w-3 h-1.5 rounded-[1px] border border-dashed", active ? "border-primary/40" : "border-muted-foreground/30")} />
        </div>
      ) : (
        <div
          className={cn(
            "w-3.5 h-5 rounded-[2px] border transition-all duration-200",
            active ? "border-primary/80 bg-primary/30" : "border-muted-foreground/50 bg-muted/40"
          )}
        />
      )}
    </div>
  );
}
