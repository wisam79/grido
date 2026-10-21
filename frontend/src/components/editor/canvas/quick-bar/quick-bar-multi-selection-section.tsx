import React from 'react';
import { useShallow } from 'zustand/react/shallow';

import { Button } from '@/components/ui/button';
import { Stack, ArrowsHorizontal, ArrowsVertical } from '@/components/ui/icons';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { useEditorStore } from '@/lib/editor-store';

/**
 * QuickBarMultiSelectionSection — قسم التحديد المتعدد في الشريط السريع العائم.
 *
 * 🧭 خفيف ومحدد: يعرض عدد العناصر والتوزيع المتساوي فقط (عند 3 عناصر فأكثر).
 * أما المحاذاة والتجميع والحذف فموطنها شريط الأدوات العلوي.
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
    })),
  );

  return (
    <>
      {/* عداد التحديد */}
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
                onClick={() => distributeSelectedElements('horizontal')}
                aria-label="توزيع أفقي"
                className="h-6 w-6 p-0 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground"
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
                onClick={() => distributeSelectedElements('vertical')}
                aria-label="توزيع عمودي"
                className="h-6 w-6 p-0 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground"
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
