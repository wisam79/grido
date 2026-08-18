import React from "react";
import { Layer, Shape } from "react-konva";

export const ColumnsLayer = React.memo(function ColumnsLayer({
  showColumns,
  columnsMargin,
  columnsGutter,
  columnsCount,
  columnsColor,
  displayW: canvasWidth,
  displayH: canvasHeight
}: {
  showColumns: boolean;
  columnsMargin: number;
  columnsGutter: number;
  columnsCount: number;
  columnsColor: string;
  displayW: number;
  displayH: number;
}) {
  if (!showColumns) return null;

  const availW = canvasWidth - 2 * columnsMargin;
  const colW = (availW - (columnsCount - 1) * columnsGutter) / columnsCount;

  return (
    <Layer listening={false} name="columns-layer" hitStrokeWidth={0}>
      <Shape
        sceneFunc={(context, _shape) => {
          context.fillStyle = columnsColor;
          context.beginPath();
          for (let i = 0; i < columnsCount; i++) {
            const xPos = columnsMargin + i * (colW + columnsGutter);
            context.rect(xPos, 0, colW, canvasHeight);
          }
          context.fill();
        }}
      />
    </Layer>
  );
});
