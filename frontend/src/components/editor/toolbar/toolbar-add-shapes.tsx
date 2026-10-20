import React from 'react';
import { useEditorStore } from '@/lib/editor-store';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { CaretDown } from '@/components/ui/icons';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import { GeometricShapesIcon } from '@/components/ui/image-icons';
import { FluentTooltip as TooltipBtn } from '@/components/ui/blocks';
import { SHAPE_CATEGORIES, shapesInCategory } from '@/lib/io/shape-catalog';
import { ShapeGlyph } from '@/components/editor/shapes/shape-glyph';

/**
 * قائمة إضافة الأشكال — تُبنى من كتالوج الأشكال الموحّد (shape-catalog)
 * بمعاينة هندسية حقيقية لكل شكل بدل أيقونات تقريبية منفصلة.
 */
export const AddShapesDropdown = React.memo(function AddShapesDropdown() {
  const addShapeElement = useEditorStore((state) => state.addShapeElement);

  return (
    <DropdownMenu>
      <TooltipBtn content="إضافة شكل">
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            data-testid="toolbar-add-shape"
            className="h-8 px-3 text-muted-foreground hover:text-foreground hover:bg-background/80 rounded-md transition-all cursor-pointer gap-1"
            aria-label="إضافة شكل"
          >
            <GeometricShapesIcon className="w-5 h-5" />
            <CaretDown className="w-3.5 h-3.5 opacity-60" />
          </Button>
        </DropdownMenuTrigger>
      </TooltipBtn>
      <DropdownMenuContent
        align="start"
        className="w-44 max-h-[460px] overflow-y-auto font-cairo rounded-xl backdrop-blur-2xl bg-popover/95 border border-border/80 dark:border-white/10 shadow-fluent-16 p-1"
      >
        {SHAPE_CATEGORIES.map((group, gi) => (
          <React.Fragment key={group.id}>
            {gi > 0 && <Separator className="my-1 bg-border/50" />}
            <div className="px-2 py-1 text-mini font-bold text-muted-foreground/70 select-none">
              {group.label}
            </div>
            {shapesInCategory(group.id).map((shape) => (
              <DropdownMenuItem
                key={shape.id}
                onClick={() =>
                  addShapeElement(shape.kind, shape.path, {
                    aspect: shape.aspect,
                    defaults: shape.defaults,
                  })
                }
                className="flex items-center gap-2.5 px-2 py-1.5 text-xs rounded-md cursor-pointer transition-colors"
              >
                <ShapeGlyph
                  kind={shape.kind}
                  path={shape.path}
                  sides={shape.defaults?.sides}
                  starPoints={shape.defaults?.starPoints}
                  doubleArrow={shape.defaults?.pointerAtBeginning === true}
                  className="w-4 h-4 shrink-0 text-muted-foreground"
                />
                <span className="font-medium text-foreground">{shape.label}</span>
              </DropdownMenuItem>
            ))}
          </React.Fragment>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
});
