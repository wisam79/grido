import React from "react";
import { FastLayer, Rect } from "react-konva";

export const ColumnsLayer = React.memo(function ColumnsLayer({
  showColumns,
  columnsMargin,
  columnsGutter,
  columnsCount,
  columnsColor,
  displayW,
  displayH
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

  const cols = [];
  const availW = displayW - 2 * columnsMargin;
  const colW = (availW - (columnsCount - 1) * columnsGutter) / columnsCount;

  for (let i = 0; i < columnsCount; i++) {
    const xPos = columnsMargin + i * (colW + columnsGutter);
    cols.push(
      <Rect
        key={`col-${i}`}
        x={xPos}
        y={0}
        width={colW}
        height={displayH}
        fill={columnsColor}
      />
    );
  }

  return (
    <FastLayer listening={false} name="columns-layer">
      {cols}
    </FastLayer>
  );
});
