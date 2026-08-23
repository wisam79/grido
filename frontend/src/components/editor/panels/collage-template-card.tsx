import React from "react";
import { cn } from "@/lib/utils";
import { CollageTemplate } from "@/lib/templates";
import { Image as ImageIcon, Trash2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export const CollageTemplateCard = React.memo(function CollageTemplateCard({
  tpl,
  onSelect,
  isActive,
  onDelete,
}: {
  tpl: CollageTemplate;
  onSelect: (t: CollageTemplate) => void;
  isActive: boolean;
  onDelete?: (e: React.MouseEvent) => void;
}) {
  return (
    <div
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect(tpl);
        }
      }}
      onClick={() => onSelect(tpl)}
      className={cn(
        "group flex flex-col items-stretch gap-2.5 p-3 rounded-xl border transition-all duration-300 text-right relative overflow-hidden bg-card shadow-2xs hover:border-primary/50 hover:shadow-md active:scale-[0.98] cursor-pointer select-none fluent-specular focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 focus-visible:outline-none",
        isActive
          ? "border-2 border-primary bg-primary/5 shadow-xs"
          : "border-border/80 dark:border-white/10"
      )}
    >
      {/* Active Indicator Dot (Top Right) */}
      {isActive && (
        <span className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-primary z-10 animate-pulse" />
      )}

      {/* Delete Button (Top Left) */}
      {onDelete && (
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <button
              type="button"
              onClick={(e) => e.stopPropagation()}
              className="absolute top-2.5 left-2.5 z-10 w-6 h-6 rounded-md bg-destructive/10 hover:bg-destructive text-destructive hover:text-destructive-foreground flex items-center justify-center border border-destructive/20 transition-all cursor-pointer opacity-0 group-hover:opacity-100 shadow-xs focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 focus-visible:outline-none"
              title="حذف القالب"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </AlertDialogTrigger>
          <AlertDialogContent className="font-cairo text-right rounded-2xl border fluent-specular" dir="rtl" onClick={(e) => e.stopPropagation()}>
            <AlertDialogHeader>
              <AlertDialogTitle>حذف القالب</AlertDialogTitle>
              <AlertDialogDescription>
                هل أنت متأكد من حذف هذا القالب نهائياً؟ لا يمكن التراجع عن هذا الإجراء.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="font-cairo">
              <AlertDialogAction onClick={(e) => { e.stopPropagation(); onDelete(e); }} className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-md h-8 text-xs font-semibold">
                حذف نهائي
              </AlertDialogAction>
              <AlertDialogCancel onClick={(e) => e.stopPropagation()} className="mt-0 border-border rounded-md h-8 text-xs font-semibold">إلغاء</AlertDialogCancel>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

      {/* Collage Preview Frame */}
      <div className="aspect-square w-full bg-muted/40 dark:bg-muted/15 rounded-xl p-1.5 border border-border/40 relative shrink-0">
        <div className="w-full h-full relative overflow-hidden rounded-lg bg-background dark:bg-background shadow-inner border border-border/20">
          {tpl.cells.map((c, i) => (
            <div
              key={i}
              className={cn(
                "absolute border rounded-md flex items-center justify-center overflow-hidden transition-all duration-300",
                isActive
                  ? "bg-primary/10 border-primary/45"
                  : "bg-muted/60 dark:bg-muted/20 border-border group-hover:bg-accent/40 group-hover:border-primary/30"
              )}
              style={{
                left: `calc(${c.x * 100}% + 1px)`,
                top: `calc(${c.y * 100}% + 1px)`,
                width: `calc(${c.w * 100}% - 2px)`,
                height: `calc(${c.h * 100}% - 2px)`,
              }}
            >
              <ImageIcon className={cn(
                "w-1/3 h-1/3 transition-transform duration-300 group-hover:scale-110",
                isActive ? "text-primary/70" : "text-muted-foreground/45"
              )} />
            </div>
          ))}
        </div>
      </div>
      
      {/* Title & Info */}
      <div className="flex flex-col gap-1.5 mt-0.5 px-0.5">
        <div className={cn(
          "text-[10px] font-bold leading-tight truncate transition-colors duration-200",
          isActive ? "text-primary" : "text-foreground group-hover:text-primary"
        )}>
          {tpl.name}
        </div>
        <div className="flex items-center justify-between mt-0.5 border-t border-border/20 pt-2">
          <span className={cn(
            "px-1.5 py-0.5 rounded-md font-mono text-[9px] font-bold border transition-colors",
            isActive
              ? "bg-primary/15 text-primary border-primary/30"
              : "bg-muted text-muted-foreground border-border"
          )}>
            {tpl.slots} صور
          </span>
          <span className="text-[8px] font-bold text-muted-foreground">تخطيط تلقائي</span>
        </div>
      </div>
    </div>
  );
});
