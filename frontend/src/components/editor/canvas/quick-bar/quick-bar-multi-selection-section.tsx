import React from "react";
import { Stack, ArrowsHorizontal, ArrowsVertical } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { Separator } from "@/components/ui/separator";
import { useShallow } from "zustand/react/shallow";
import { useEditorStore } from "@/lib/editor-store";

/**
 * QuickBarMultiSelectionSection — قسم التحديد المتعدد.
 *
 * 🧭 يُبقي فقط ما لا يوجد في الشريط العلوي: **التوزيع المتساوي** وعددان
 * التحديد. المحاذاة والتجميع والتكرار والحذف انتقلت للشريط العلوي، لأن
 * وجودها في السطحين كان تكراراً محضاً (وقد أُزيل بعد قرار المستخدم).
 */
interface QuickBarMultiSelectionSectionProps {
  selectedIds: string[];
}

export const QuickBarMultiSelectionSection = React.memo(function QuickBarMultiSelectionSection({
  selectedIds,
}: QuickBarMultiSelectionSectionProps) {
  const { distributeSelectedElements } = useEditorStore(
    useShallow((s) => ({
      distributeSelectedElements: s.distributeSelectedElements,
    }))
  );

  return (
    <>
      <div className="flex items-center gap-1 text-xs font-bold px-1.5 text-primary">
        <Stack className="w-5 h-5" weight="regular" />
        <span>{selectedIds.length} عناصر</span>
      </div>

      <Separator orientation="vertical" className="h-4 bg-border/40" />

      {/* التوزيع المتساوي (عند تحديد 3 عناصر أو أكثر) */}
      {selectedIds.length >= 3 && (
        <>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => distributeSelectedElements("horizontal")}
                className="h-7 w-7 p-0 rounded-md hover:bg-accent"
              >
                <ArrowsHorizontal className="w-5 h-5" weight="bold" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">توزيع أفقي</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => distributeSelectedElements("vertical")}
                className="h-7 w-7 p-0 rounded-md hover:bg-accent"
              >
                <ArrowsVertical className="w-5 h-5" weight="bold" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">توزيع عمودي</TooltipContent>
          </Tooltip>
        </>
      )}

    </>
  );
});
