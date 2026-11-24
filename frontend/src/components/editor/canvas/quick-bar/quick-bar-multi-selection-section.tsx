import React from 'react';
import { useShallow } from 'zustand/react/shallow';

import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/huge-icon';
import { Stack, ArrowsHorizontal, ArrowsVertical, ShapeIntersect } from '@/components/ui/icons';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { useImageShapeMaskAction } from '@/hooks/use-image-shape-mask-action';
import { getImageShapePair } from '@/lib/canvas/image-shape-fill';
import { useEditorStore } from '@/lib/editor-store';

/**
 * QuickBarMultiSelectionSection — قسم التحديد المتعدد في الشريط السريع العائم.
 *
 * 🧭 خفيف ومحدد: يعرض عدد العناصر وإجراءات السياق المشتركة (قنّع بالشكل عند تحديد
 * صورة + شكل صالح، والتوزيع المتساوي عند 3 عناصر حرة فأكثر).
 * أما المحاذاة والتجميع والحذف فموطنها شريط الأدوات العلوي.
 */
interface QuickBarMultiSelectionSectionProps {
  selectedIds: string[];
}

export const QuickBarMultiSelectionSection = React.memo(function QuickBarMultiSelectionSection({
  selectedIds,
}: QuickBarMultiSelectionSectionProps) {
  const { mode, elements, distributeSelectedElements } = useEditorStore(
    useShallow((s) => ({
      mode: s.mode,
      elements: s.elements,
      distributeSelectedElements: s.distributeSelectedElements,
    })),
  );
  const canMaskWithShape = mode === 'single' && Boolean(getImageShapePair(elements, selectedIds));
  const { isMasking, triggerMaskImageWithShape } = useImageShapeMaskAction();

  return (
    <>
      {/* عداد التحديد */}
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            aria-label={`${selectedIds.length} عناصر محددة`}
            className="flex h-7 w-7 items-center justify-center text-primary cursor-default"
          >
            <Stack className="w-3.5 h-3.5" weight="regular" />
          </span>
        </TooltipTrigger>
        <TooltipContent side="bottom">{selectedIds.length} عناصر محددة</TooltipContent>
      </Tooltip>

      <Separator orientation="vertical" className="h-3 bg-border/40" />

      {canMaskWithShape && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              disabled={isMasking}
              onClick={() => void triggerMaskImageWithShape()}
              aria-label="قنّع بالشكل"
              className="h-7 w-7 p-0 rounded-md text-primary hover:bg-primary/10"
            >
              {isMasking ? (
                <Spinner className="w-3.5 h-3.5 text-primary" size={14} />
              ) : (
                <ShapeIntersect className="w-3.5 h-3.5" weight="bold" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">قنّع الصورة بهذا الشكل</TooltipContent>
        </Tooltip>
      )}

      {/* التوزيع المتساوي للعناصر الحرة فقط؛ هندسة خانات الكولاج مترابطة */}
      {mode === 'single' && selectedIds.length >= 3 && (
        <>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => distributeSelectedElements('horizontal')}
                aria-label="توزيع أفقي"
                className="h-7 w-7 p-0 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground"
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
                className="h-7 w-7 p-0 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground"
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
