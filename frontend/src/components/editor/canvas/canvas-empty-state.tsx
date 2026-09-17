import React from "react";
import { Button } from "@/components/ui/button";
import {
  UploadSimple,
  GridFour,
  Plus,
  Images,
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

export interface CanvasEmptyStateProps {
  mode: "single" | "collage" | "freeform";
  onOpenFile: () => void;
  onOpenTemplates?: () => void;
  className?: string;
}

/**
 * الحالة الفارغة التفاعلية لورقة الكانفس وفق معايير Fluent 2
 * توفر إمكانية البدء السريع بنقرتين كحد أقصى دون البحث في الأشرطة الجانبية.
 */
export const CanvasEmptyState = React.memo(function CanvasEmptyState({
  mode,
  onOpenFile,
  onOpenTemplates,
  className,
}: CanvasEmptyStateProps) {
  return (
    <div
      data-testid="canvas-empty-state"
      className={cn(
        "absolute inset-4 md:inset-8 z-20 flex flex-col items-center justify-center pointer-events-none select-none text-center font-cairo",
        className
      )}
    >
      <div className="flex flex-col items-center justify-center p-6 md:p-8 max-w-sm w-full rounded-2xl border-2 border-dashed border-primary/30 hover:border-primary/60 bg-card/60 hover:bg-card/90 dark:bg-black/30 dark:hover:bg-black/50 backdrop-blur-md transition-all shadow-fluent-8 group pointer-events-auto">
        <div className="w-14 h-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-3 group-hover:scale-105 group-hover:bg-primary/15 transition-all shadow-2xs">
          {mode === "collage" ? (
            <Images className="w-7 h-7" weight="duotone" />
          ) : (
            <UploadSimple className="w-7 h-7" weight="duotone" />
          )}
        </div>

        <h3 className="text-sm md:text-base font-bold text-foreground mb-1">
          {mode === "collage" ? "القالب بانتظار صورك" : "مساحة العمل جاهزة"}
        </h3>

        <p className="text-xs text-muted-foreground mb-4 max-w-xs leading-relaxed">
          {mode === "collage"
            ? "اسحب وأفلت الصور مباشرة في الخلايا، أو اختر قالباً مختلفاً."
            : "اسحب وأفلت الصور هنا، أو اضغط للبدء في التصميم."}
        </p>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            size="sm"
            onClick={onOpenFile}
            className="h-8 px-3.5 gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90 rounded-md font-bold text-xs shadow-xs cursor-pointer active:scale-95 transition-all"
          >
            <Plus className="w-4 h-4" weight="bold" />
            <span>{mode === "collage" ? "إدراج صور" : "فتح صورة"}</span>
          </Button>

          {mode === "collage" && onOpenTemplates && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onOpenTemplates}
              className="h-8 px-3 gap-1.5 border-border/80 text-foreground hover:bg-accent rounded-md font-semibold text-xs cursor-pointer active:scale-95 transition-all shadow-2xs"
            >
              <GridFour className="w-4 h-4 text-primary" weight="duotone" />
              <span>القوالب</span>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
});
