import React, { useMemo } from "react";
import { Layer, Rect } from "react-konva";
import { GridLayer } from "../elements/grid-layer";
import { ColumnsLayer } from "../elements/columns-layer";
// 🎨 هندسة تدرج الورقة موحّدة مع التصدير (lib/canvas/gradient-geometry)
import { gradientPixelPoints } from "@/lib/canvas/gradient-geometry";

interface KonvaBackgroundLayerProps {
  canvasWidth: number;
  canvasHeight: number;
  backgroundColor: string;
  /** لون نهاية التدرج — غيابه يعني تعبئة مصمتة */
  backgroundGradientColor2?: string | null;
  /** زاوية التدرج الخطي بالدرجات (0° = يسار→يمين مع عقارب الساعة) */
  backgroundGradientAngle?: number;
  mode: "single" | "collage";
  showGrid: boolean;
  gridSize: number;
  gridColor: string;
  gridOpacity: number;
  gridSubdivisions: number;
  gridType: "lines" | "dots";
  showColumns: boolean;
  columnsMargin: number;
  columnsGutter: number;
  columnsCount: number;
  columnsColor: string;
}

export const KonvaBackgroundLayer = React.memo(function KonvaBackgroundLayer({
  canvasWidth,
  canvasHeight,
  backgroundColor,
  backgroundGradientColor2,
  backgroundGradientAngle = 135,
  mode,
  showGrid,
  gridSize,
  gridColor,
  gridOpacity,
  gridSubdivisions,
  gridType,
  showColumns,
  columnsMargin,
  columnsGutter,
  columnsCount,
  columnsColor,
}: KonvaBackgroundLayerProps) {
  // 🎨 نقاط التدرج بالبكسل حول مركز الورقة — `gradientPixelPoints` هي نفس الدالة
  // التي يستخدمها `exportCanvas`، فلا يختلف امتداد/اتجاه التدرج بين المعاينة
  // والناتج المصدَّر (تمرير النسب 0-1 مباشرة إلى Konva يحصر التدرج في 1px).
  const hasGradient = Boolean(
    backgroundGradientColor2 &&
      backgroundColor !== "transparent" &&
      backgroundGradientColor2 !== "transparent"
  );
  const gradient = useMemo(
    () => gradientPixelPoints(backgroundGradientAngle, canvasWidth, canvasHeight),
    [backgroundGradientAngle, canvasWidth, canvasHeight]
  );

  return (
    <>
      {/* Background Color / Gradient Layer */}
      <Layer listening={false}>
        <Rect
          name="bg-rect"
          width={canvasWidth}
          height={canvasHeight}
          // التدرج والمصمت حصريان — Konva يعطي أولوية fill المصمت إن حضر معه التدرج
          fill={!hasGradient && backgroundColor !== "transparent" ? backgroundColor : undefined}
          fillLinearGradientStartPoint={hasGradient ? gradient.start : undefined}
          fillLinearGradientEndPoint={hasGradient ? gradient.end : undefined}
          fillLinearGradientColorStops={hasGradient ? [0, backgroundColor, 1, backgroundGradientColor2 as string] : undefined}
          listening={false}
          perfectDrawEnabled={false}
        />
      </Layer>

      {/* Grid Layer */}
      <GridLayer
        showGrid={showGrid}
        gridSize={gridSize}
        gridColor={gridColor}
        gridOpacity={gridOpacity}
        gridSubdivisions={gridSubdivisions}
        gridType={gridType}
        displayW={canvasWidth}
        displayH={canvasHeight}
      />

      {/* Columns Layout Layer */}
      <ColumnsLayer
        showColumns={showColumns}
        columnsMargin={columnsMargin}
        columnsGutter={columnsGutter}
        columnsCount={columnsCount}
        columnsColor={columnsColor}
        displayW={canvasWidth}
        displayH={canvasHeight}
      />
    </>
  );
});
