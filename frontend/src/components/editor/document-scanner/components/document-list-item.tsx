import React from "react";
import { cn } from "@/lib/utils";
import { Check, X } from "@/components/ui/icons";
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

// عنصر قائمة مستند: ثلاثة أزرار شقيقة (اختيار/تضمين/حذف) داخل li —
// لا تداخل أزرار (كان div[role=button] يحوي button: مربك لقارئ الشاشة).
export const DocumentListItem = React.memo(function DocumentListItem({
  doc,
  index,
  isActive,
  isSelected,
  canDelete = false,
  onSelect,
  onToggleCheck,
  onDelete,
}: DocumentListItemProps) {
  return (
    <div
      role="listitem"
      className={cn(
        "min-h-8 px-2 py-1 flex items-center justify-between gap-1 rounded-md transition-all border text-xs select-none group focus-within:border-primary focus-visible:outline-none",
        isActive
          ? "bg-emerald-600/25 border-emerald-500 text-foreground font-bold shadow-xs"
          : "bg-background/40 border-emerald-500/20 text-foreground hover:bg-emerald-500/10"
      )}
    >
      <div className="flex items-center gap-2 min-w-0 flex-1">
        <button
          type="button"
          onClick={() => onToggleCheck(doc.id)}
          aria-pressed={isSelected}
          className={cn(
            "w-7 h-7 rounded flex items-center justify-center border transition-all cursor-pointer shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background",
            isSelected
              ? "bg-emerald-500 border-emerald-400 text-white shadow-2xs"
              : "border-muted-foreground/40 bg-background/60 hover:border-emerald-400"
          )}
          title={isSelected ? "إلغاء التضمين" : "تضمين في الإدراج"}
        >
          {isSelected && <Check size={13} weight="bold" />}
        </button>
        <button
          type="button"
          onClick={() => onSelect(index)}
          aria-current={isActive ? "true" : undefined}
          title={`تحديد ${doc.label}`}
          className="truncate flex items-center gap-1.5 flex-1 min-w-0 text-start cursor-pointer rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          <span className="w-4 h-4 rounded-full bg-black/20 dark:bg-white/10 flex items-center justify-center text-micro font-mono shrink-0 font-bold">
            {index + 1}
          </span>
          <span className="truncate font-medium">{doc.label}</span>
        </button>
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        <span dir="ltr" className="text-micro opacity-75 font-mono">
          {Math.round(doc.confidence * 100)}%
        </span>

        {canDelete && onDelete && (
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                aria-label={`حذف ${doc.label}`}
                onClick={() => onDelete(doc.id)}
                className="w-7 h-7 rounded flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 focus-visible:opacity-100 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                <X size={13} weight="bold" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="top">حذف</TooltipContent>
          </Tooltip>
        )}
      </div>
    </div>
  );
});
