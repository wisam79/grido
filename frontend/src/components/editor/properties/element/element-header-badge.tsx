import { CanvasElement } from "@/lib/editor-store";
import { Button } from "@/components/ui/button";
import { Sparkle, LockSimple } from "@phosphor-icons/react";

export interface ElementHeaderBadgeProps {
  element: CanvasElement;
  selectedIds: string[];
  onUnlock: () => void;
}

export function ElementHeaderBadge({ element, selectedIds, onUnlock }: ElementHeaderBadgeProps) {
  const isMulti = selectedIds.length > 1 && selectedIds.includes(element.id);

  return (
    <>
      {isMulti && (
        <div className="bg-primary/10 border border-primary/20 text-primary p-2.5 rounded-xl flex items-center justify-between text-xs font-semibold mb-2 animate-in fade-in slide-in-from-top-1 duration-200 fluent-specular">
          <div className="flex items-center gap-2">
            <Sparkle className="w-3.5 h-3.5 shrink-0 text-primary" weight="fill" />
            <span>تحديد متعدد ({selectedIds.length})</span>
          </div>
          <span className="text-micro text-muted-foreground/90 font-medium">تنسيق يشمل الكل</span>
        </div>
      )}

      {element.locked && (
        <div className="bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 p-2.5 rounded-xl flex items-center justify-between text-xs font-semibold mb-2 animate-in fade-in slide-in-from-top-1 duration-200 fluent-specular">
          <div className="flex items-center gap-2">
            <LockSimple className="w-3.5 h-3.5 shrink-0" weight="fill" />
            <span>عنصر مقفل</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onUnlock}
            className="h-7 px-2 text-micro bg-amber-500/15 enabled:hover:bg-amber-500/25 border border-amber-500/20 rounded-md transition-colors cursor-pointer text-amber-700 dark:text-amber-300 font-bold"
          >
            إلغاء القفل
          </Button>
        </div>
      )}
    </>
  );
}
