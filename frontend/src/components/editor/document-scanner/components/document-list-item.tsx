import React from "react";
import { cn } from "@/lib/utils";
import { Check, X } from "@phosphor-icons/react";
import { DetectedDocument } from "../core";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";

interface DocumentListItemProps {
  doc: DetectedDocument;
  index: number;
  isActive: boolean;
  isSelected: boolean;
  canDelete?: boolean;
  onSelect: (index: number) => void;
  onToggleCheck: (id: string) => void;
  onDelete?: (id: string) => void;
}

export const DocumentListItem: React.FC<DocumentListItemProps> = ({
  doc,
  index,
  isActive,
  isSelected,
  canDelete = false,
  onSelect,
  onToggleCheck,
  onDelete,
}) => {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onSelect(index)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect(index);
        }
      }}
      className={cn(
        "h-8 px-2 flex items-center justify-between rounded-md cursor-pointer transition-all border text-[11px] select-none group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        isActive
          ? "bg-emerald-600/25 border-emerald-500 text-foreground font-bold shadow-xs"
          : "bg-background/40 border-emerald-500/20 text-foreground hover:bg-emerald-500/10"
      )}
    >
      <div className="flex items-center gap-2 min-w-0">
        <button
          type="button"
          onClick={(e: React.MouseEvent) => {
            e.stopPropagation();
            onToggleCheck(doc.id);
          }}
          className={cn(
            "w-4 h-4 rounded flex items-center justify-center border transition-all cursor-pointer shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 focus-visible:ring-offset-background",
            isSelected
              ? "bg-emerald-500 border-emerald-400 text-white shadow-2xs"
              : "border-muted-foreground/40 bg-background/60 hover:border-emerald-400"
          )}
          title={isSelected ? "إلغاء تضمين هذا المستند" : "تضمين هذا المستند في الإدراج"}
        >
          {isSelected && <Check size={11} weight="bold" />}
        </button>
        <span className="truncate flex items-center gap-1.5">
          <span className="w-4 h-4 rounded-full bg-black/20 dark:bg-white/10 flex items-center justify-center text-[10px] font-mono shrink-0 font-bold">
            {index + 1}
          </span>
          <span className="truncate font-medium">{doc.label}</span>
        </span>
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        <span className="text-[10px] opacity-75 font-mono">
          {Math.round(doc.confidence * 100)}%
        </span>

        {canDelete && onDelete && (
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(doc.id);
                }}
                className="w-4 h-4 rounded flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors opacity-0 group-hover:opacity-100 cursor-pointer"
              >
                <X size={11} weight="bold" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="top">حذف هذا المستند</TooltipContent>
          </Tooltip>
        )}
      </div>
    </div>
  );
};

