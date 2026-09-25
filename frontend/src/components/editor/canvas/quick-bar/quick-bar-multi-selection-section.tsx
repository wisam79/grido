import React from "react";
import { Stack, ArrowsHorizontal, ArrowsVertical } from "@/components/ui/icons";
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
      {/* عدد التحديد انتقل إلى التلميح والاسم المُتاح بدل نص ظاهر — الشريط أيقونات فقط */}
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            aria-label={`${selectedIds.length} عناصر محددة`}
            className="flex h-6 w-6 items-center justify-center text-primary cursor-default"
          >
            <Stack className="w-3.5 h-3.5" weight="regular" />
          </span>
        </TooltipTrigger>
        <TooltipContent side="bottom">{selectedIds.length} عناصر محددة</TooltipContent>
      </Tooltip>

      <Separator orientation="vertical" className="h-3 bg-border/40" />

      {/* التوزيع المتساوي (عند تحديد 3 عناصر أو أكثر) */}
      {selectedIds.length >= 3 && (
        <>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => distributeSelectedElements("horizontal")}
                aria-label="توزيع أفقي"
                className="h-6 w-6 p-0 rounded-md hover:bg-accent"
              >
                <ArrowsHorizontal className="w-3.5 h-3.5" weight="bold" />
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
                aria-label="توزيع عمودي"
                className="h-6 w-6 p-0 rounded-md hover:bg-accent"
              >
                <ArrowsVertical className="w-3.5 h-3.5" weight="bold" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">توزيع عمودي</TooltipContent>
          </Tooltip>
        </>
      )}

    </>
  );
});
