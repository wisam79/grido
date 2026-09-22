import React from "react";
import { useEditorStore } from "@/lib/editor-store";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
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
} from "@phosphor-icons/react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { GeometricShapesIcon } from "@/components/ui/image-icons";
import { FluentTooltip as TooltipBtn } from "@/components/ui/blocks";
import {
  SHAPE_PATH_TRIANGLE,
  SHAPE_PATH_HEART,
  SHAPE_PATH_DIAMOND,
  SHAPE_PATH_HEXAGON,
  SHAPE_PATH_SHIELD,
  SHAPE_PATH_ARROW,
} from "@/lib/io/svg-paths";

interface ShapeDef {
  label: string;
  kind: "rect" | "ellipse" | "star" | "line" | "path";
  path?: string;
  Icon: Icon;
  iconWeight?: "bold" | "fill" | "regular";
  sw: string;
  hover: string;
}

const SHAPE_GROUPS: { header: string; items: ShapeDef[] }[] = [
  {
    header: "أشكال هندسية",
    items: [
      { label: "مستطيل", kind: "rect", Icon: Square, sw: "bg-primary/10 text-primary", hover: "hover:bg-accent/80" },
      { label: "دائرة", kind: "ellipse", Icon: Circle, sw: "bg-indigo-500/15 text-indigo-500", hover: "hover:bg-indigo-500/10" },
      { label: "مثلث", kind: "path", path: SHAPE_PATH_TRIANGLE, Icon: Triangle, iconWeight: "fill", sw: "bg-emerald-500/15 text-emerald-500", hover: "hover:bg-emerald-500/10" },
      { label: "معين", kind: "path", path: SHAPE_PATH_DIAMOND, Icon: Diamond, iconWeight: "fill", sw: "bg-cyan-500/15 text-cyan-500", hover: "hover:bg-cyan-500/10" },
      { label: "سداسي", kind: "path", path: SHAPE_PATH_HEXAGON, Icon: Hexagon, iconWeight: "fill", sw: "bg-violet-500/15 text-violet-500", hover: "hover:bg-violet-500/10" },
    ],
  },
  {
    header: "رموز وتأطير",
    items: [
      { label: "نجمة", kind: "star", Icon: Star, iconWeight: "fill", sw: "bg-amber-500/15 text-amber-500", hover: "hover:bg-amber-500/10" },
      { label: "قلب", kind: "path", path: SHAPE_PATH_HEART, Icon: Heart, iconWeight: "fill", sw: "bg-rose-500/15 text-destructive", hover: "hover:bg-rose-500/10" },
      { label: "درع", kind: "path", path: SHAPE_PATH_SHIELD, Icon: Shield, iconWeight: "fill", sw: "bg-blue-500/15 text-blue-500", hover: "hover:bg-blue-500/10" },
      { label: "سهم", kind: "path", path: SHAPE_PATH_ARROW, Icon: ArrowRight, iconWeight: "bold", sw: "bg-teal-500/15 text-teal-500", hover: "hover:bg-teal-500/10" },
      { label: "خط", kind: "line", Icon: LineSegment, sw: "bg-orange-500/15 text-orange-500", hover: "hover:bg-orange-500/10" },
    ],
  },
];

/** قائمة الأشكال — كانت 10 عناصر مكررة الهيكل بألوان مضمّنة يدوياً. */
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
      <DropdownMenuContent align="start" className="w-48 max-h-[460px] overflow-y-auto font-cairo rounded-2xl backdrop-blur-2xl bg-popover/95 border border-border/80 dark:border-white/10 shadow-fluent-16 p-1.5 space-y-1">
        {SHAPE_GROUPS.map((group, gi) => (
          <React.Fragment key={group.header}>
            {gi > 0 && <Separator className="my-1 bg-border/50" />}
            <div className="px-2.5 py-1 text-mini font-bold text-muted-foreground/70 uppercase tracking-wider select-none">
              {group.header}
            </div>
            {group.items.map((shape) => (
              <DropdownMenuItem
                key={shape.label}
                onClick={() =>
                  shape.kind === "path"
                    ? addShapeElement("path", shape.path)
                    : addShapeElement(shape.kind)
                }
                className={`flex items-center gap-2.5 p-2 text-xs rounded-xl cursor-pointer transition-colors ${shape.hover}`}
              >
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${shape.sw}`}>
                  <shape.Icon className="w-4 h-4" weight={shape.iconWeight} />
                </div>
                <span className="font-semibold text-foreground">{shape.label}</span>
              </DropdownMenuItem>
            ))}
          </React.Fragment>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
});
