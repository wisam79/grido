import React from "react";
import { FastLayer, Shape } from "react-konva";

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
    <FastLayer listening={false} name="columns-layer" hitStrokeWidth={0}>
      <Shape
        sceneFunc={(context, _shape) => {
          context.fillStyle = columnsColor;
          for (let i = 0; i < columnsCount; i++) {
            const xPos = columnsMargin + i * (colW + columnsGutter);
            context.fillRect(xPos, 0, colW, canvasHeight);
          }
          context.closePath();
        }}
      />
    </FastLayer>
  );
});
