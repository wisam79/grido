import React from "react";
import { Layer, Rect } from "react-konva";
import { GridLayer } from "../elements/grid-layer";
import { ColumnsLayer } from "../elements/columns-layer";

interface KonvaBackgroundLayerProps {
  canvasWidth: number;
  canvasHeight: number;
  backgroundColor: string;
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
  return (
    <>
      {/* Background Color Layer */}
      <Layer>
        <Rect
          name="bg-rect"
          width={canvasWidth}
          height={canvasHeight}
          fill={backgroundColor === "transparent" ? undefined : backgroundColor}
        />
      </Layer>

      {/* Grid Layer */}
      {mode === "single" && (
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
      )}

      {/* Columns Layout Layer */}
      {mode === "single" && (
        <ColumnsLayer
          showColumns={showColumns}
          columnsMargin={columnsMargin}
          columnsGutter={columnsGutter}
          columnsCount={columnsCount}
          columnsColor={columnsColor}
          displayW={canvasWidth}
          displayH={canvasHeight}
        />
      )}
    </>
  );
});
