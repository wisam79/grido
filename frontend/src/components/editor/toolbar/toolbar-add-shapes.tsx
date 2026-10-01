import React from 'react';
import { useEditorStore } from '@/lib/editor-store';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  CaretDown,
  Square,
  Circle,
  Triangle,
  Diamond,
  Hexagon,
  Star,
  Heart,
  Shield,
  ArrowRight,
  LineSegment,
  type Icon,
} from '@/components/ui/icons';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import { GeometricShapesIcon } from '@/components/ui/image-icons';
import { FluentTooltip as TooltipBtn } from '@/components/ui/blocks';
import {
  SHAPE_PATH_TRIANGLE,
  SHAPE_PATH_HEART,
  SHAPE_PATH_DIAMOND,
  SHAPE_PATH_HEXAGON,
  SHAPE_PATH_SHIELD,
  SHAPE_PATH_ARROW,
} from '@/lib/io/svg-paths';

interface ShapeDef {
  label: string;
  kind: 'rect' | 'ellipse' | 'star' | 'line' | 'path';
  path?: string;
  Icon: Icon;
  iconWeight?: 'bold' | 'fill' | 'regular';
}

const SHAPE_GROUPS: { header: string; items: ShapeDef[] }[] = [
  {
    header: 'أشكال هندسية',
    items: [
      { label: 'مستطيل', kind: 'rect', Icon: Square },
      { label: 'دائرة', kind: 'ellipse', Icon: Circle },
      {
        label: 'مثلث',
        kind: 'path',
        path: SHAPE_PATH_TRIANGLE,
        Icon: Triangle,
        iconWeight: 'fill',
      },
      { label: 'معين', kind: 'path', path: SHAPE_PATH_DIAMOND, Icon: Diamond, iconWeight: 'fill' },
      { label: 'سداسي', kind: 'path', path: SHAPE_PATH_HEXAGON, Icon: Hexagon, iconWeight: 'fill' },
    ],
  },
  {
    header: 'رموز وتأطير',
    items: [
      { label: 'نجمة', kind: 'star', Icon: Star, iconWeight: 'fill' },
      { label: 'قلب', kind: 'path', path: SHAPE_PATH_HEART, Icon: Heart, iconWeight: 'fill' },
      { label: 'درع', kind: 'path', path: SHAPE_PATH_SHIELD, Icon: Shield, iconWeight: 'fill' },
      { label: 'سهم', kind: 'path', path: SHAPE_PATH_ARROW, Icon: ArrowRight, iconWeight: 'bold' },
      { label: 'خط', kind: 'line', Icon: LineSegment },
    ],
  },
];

/** قائمة الأشكال — أيقونة الشكل نفسها + اسمها (بلا صناديق ملونة) */
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
        className="w-40 max-h-[420px] overflow-y-auto font-cairo rounded-xl backdrop-blur-2xl bg-popover/95 border border-border/80 dark:border-white/10 shadow-fluent-16 p-1"
      >
        {SHAPE_GROUPS.map((group, gi) => (
          <React.Fragment key={group.header}>
            {gi > 0 && <Separator className="my-1 bg-border/50" />}
            <div className="px-2 py-1 text-mini font-bold text-muted-foreground/70 select-none">
              {group.header}
            </div>
            {group.items.map((shape) => (
              <DropdownMenuItem
                key={shape.label}
                onClick={() =>
                  shape.kind === 'path'
                    ? addShapeElement('path', shape.path)
                    : addShapeElement(shape.kind)
                }
                className="flex items-center gap-2.5 px-2 py-1.5 text-xs rounded-md cursor-pointer transition-colors"
              >
                <shape.Icon
                  className="w-4 h-4 shrink-0 text-muted-foreground"
                  weight={shape.iconWeight}
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
