import React from "react";
import { Stack, Copy, Trash, BoundingBox, ArrowsHorizontal, ArrowsVertical } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { Separator } from "@/components/ui/separator";
import { useShallow } from "zustand/react/shallow";
import { useEditorStore } from "@/lib/editor-store";
import {
  AlignLeftIcon,
  AlignCenterHorizontalIcon,
  AlignRightIcon,
  AlignTopIcon,
  AlignCenterVerticalIcon,
  AlignBottomIcon,
} from "@/components/ui/alignment-icons";

/**
 * QuickBarMultiSelectionSection — قسم التحديد المتعدد (محاذاة/توزيع/تجميع/تكرار/حذف)
 * 🧭 كان مضمّناً بالكامل في canvas-quick-bar.
 */
interface QuickBarMultiSelectionSectionProps {
  selectedIds: string[];
}

const ALIGN_BUTTONS: { key: string; icon: React.ComponentType<{ className?: string }>; label: string }[] = [
  { key: "left", icon: AlignLeftIcon, label: "محاذاة لليسار" },
  { key: "center", icon: AlignCenterHorizontalIcon, label: "محاذاة للوسط أفقياً" },
  { key: "right", icon: AlignRightIcon, label: "محاذاة لليمين" },
  { key: "top", icon: AlignTopIcon, label: "محاذاة للأعلى" },
  { key: "middle", icon: AlignCenterVerticalIcon, label: "محاذاة للمنتصف عمودياً" },
  { key: "bottom", icon: AlignBottomIcon, label: "محاذاة للأسفل" },
];

export const QuickBarMultiSelectionSection = React.memo(function QuickBarMultiSelectionSection({
  selectedIds,
}: QuickBarMultiSelectionSectionProps) {
  const { alignSelectedElements, distributeSelectedElements, groupSelectedElements, duplicateElements, removeElements } = useEditorStore(
    useShallow((s) => ({
      alignSelectedElements: s.alignSelectedElements,
      distributeSelectedElements: s.distributeSelectedElements,
      groupSelectedElements: s.groupSelectedElements,
      duplicateElements: s.duplicateElements,
      removeElements: s.removeElements,
    }))
  );

  return (
    <>
      <div className="flex items-center gap-1 text-xs font-bold px-1.5 text-primary">
        <Stack className="w-4.5 h-4.5" weight="regular" />
        <span>{selectedIds.length} عناصر</span>
      </div>

      <Separator orientation="vertical" className="h-4 bg-border/40" />

      {/* أزرار المحاذاة */}
      {ALIGN_BUTTONS.map(({ key, icon: Icon, label }) => (
        <Tooltip key={key}>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => alignSelectedElements(key as never)}
              className="h-7 w-7 p-0 rounded-md hover:bg-accent"
            >
              <Icon className="w-4.5 h-4.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">{label}</TooltipContent>
        </Tooltip>
      ))}

      {/* التوزيع المتساوي (عند تحديد 3 عناصر أو أكثر) */}
      {selectedIds.length >= 3 && (
        <>
          <Separator orientation="vertical" className="h-4 bg-border/40" />

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => distributeSelectedElements("horizontal")}
                className="h-7 w-7 p-0 rounded-md hover:bg-accent"
              >
                <ArrowsHorizontal className="w-4.5 h-4.5" weight="bold" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">توزيع أفقي متساوٍ</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => distributeSelectedElements("vertical")}
                className="h-7 w-7 p-0 rounded-md hover:bg-accent"
              >
                <ArrowsVertical className="w-4.5 h-4.5" weight="bold" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">توزيع عمودي متساوٍ</TooltipContent>
          </Tooltip>
        </>
      )}

      <Separator orientation="vertical" className="h-4 bg-border/40" />

      {/* تجميع */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            onClick={groupSelectedElements}
            className="h-7 w-7 p-0 rounded-md hover:bg-accent"
          >
            <BoundingBox className="w-4.5 h-4.5" weight="bold" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">تجميع العناصر (Group)</TooltipContent>
      </Tooltip>

      {/* تكرار */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => duplicateElements(selectedIds)}
            className="h-7 w-7 p-0 rounded-md hover:bg-accent"
          >
            <Copy className="w-4.5 h-4.5" weight="regular" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">تكرار العناصر</TooltipContent>
      </Tooltip>

      {/* حذف */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => removeElements(selectedIds)}
            className="h-7 w-7 p-0 rounded-md text-destructive hover:bg-destructive/10"
          >
            <Trash className="w-4.5 h-4.5" weight="regular" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">حذف العناصر</TooltipContent>
      </Tooltip>
    </>
  );
});
