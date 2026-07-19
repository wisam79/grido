import React from "react";
import { FastLayer, Shape } from "react-konva";

export const GridLayer = React.memo(function GridLayer({
  showGrid,
  gridSize,
  gridColor,
  gridOpacity,
  gridSubdivisions,
  gridType,
  displayW,
  displayH
}: {
  showGrid: boolean;
  gridSize: number;
  gridColor: string;
  gridOpacity: number;
  gridSubdivisions: number;
  gridType: "lines" | "dots";
  displayW: number;
  displayH: number;
}) {
  if (!showGrid || gridSize <= 0) return null;

  const numH = Math.ceil(displayH / gridSize);
  const numW = Math.ceil(displayW / gridSize);

  return (
    <FastLayer listening={false} name="grid-layer">
      <Shape
        sceneFunc={(context, shape) => {
          context.beginPath();
          if (gridType === "lines") {
            for (let i = 0; i <= numH; i++) {
              const isMajor = gridSubdivisions > 0 && i % gridSubdivisions === 0;
              context.moveTo(0, i * gridSize);
              context.lineTo(displayW, i * gridSize);
              context.strokeStyle = gridColor;
              context.lineWidth = isMajor ? 0.8 : 0.4;
              context.globalAlpha = isMajor ? Math.min(gridOpacity * 2.2, 0.9) : gridOpacity;
              context.stroke();
              context.beginPath();
            }
            for (let j = 0; j <= numW; j++) {
              const isMajor = gridSubdivisions > 0 && j % gridSubdivisions === 0;
              context.moveTo(j * gridSize, 0);
              context.lineTo(j * gridSize, displayH);
              context.strokeStyle = gridColor;
              context.lineWidth = isMajor ? 0.8 : 0.4;
              context.globalAlpha = isMajor ? Math.min(gridOpacity * 2.2, 0.9) : gridOpacity;
              context.stroke();
              context.beginPath();
            }
          } else {
            context.fillStyle = gridColor;
            for (let i = 0; i <= numH; i++) {
              for (let j = 0; j <= numW; j++) {
                const isMajor = gridSubdivisions > 0 && (i % gridSubdivisions === 0 || j % gridSubdivisions === 0);
                const radius = isMajor ? 1.5 : 0.8;
                const alpha = isMajor ? Math.min(gridOpacity * 2.2, 0.9) : gridOpacity;
                context.globalAlpha = alpha;
                context.beginPath();
                context.arc(j * gridSize, i * gridSize, radius, 0, Math.PI * 2);
                context.fill();
              }
            }
          }
        }}
      />
    </FastLayer>
  );
});
