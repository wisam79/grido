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
          if (gridType === "lines") {
            context.strokeStyle = gridColor;

            // 1. Minor lines
            context.lineWidth = 0.4;
            context.globalAlpha = gridOpacity;
            context.beginPath();
            for (let i = 0; i <= numH; i++) {
              if (gridSubdivisions > 0 && i % gridSubdivisions === 0) continue;
              context.moveTo(0, i * gridSize);
              context.lineTo(displayW, i * gridSize);
            }
            for (let j = 0; j <= numW; j++) {
              if (gridSubdivisions > 0 && j % gridSubdivisions === 0) continue;
              context.moveTo(j * gridSize, 0);
              context.lineTo(j * gridSize, displayH);
            }
            context.stroke();

            // 2. Major lines
            if (gridSubdivisions > 0) {
              context.lineWidth = 0.8;
              context.globalAlpha = Math.min(gridOpacity * 2.2, 0.9);
              context.beginPath();
              for (let i = 0; i <= numH; i += gridSubdivisions) {
                context.moveTo(0, i * gridSize);
                context.lineTo(displayW, i * gridSize);
              }
              for (let j = 0; j <= numW; j += gridSubdivisions) {
                context.moveTo(j * gridSize, 0);
                context.lineTo(j * gridSize, displayH);
              }
              context.stroke();
            }
          } else {
            context.fillStyle = gridColor;

            // 1. Minor dots
            context.globalAlpha = gridOpacity;
            context.beginPath();
            for (let i = 0; i <= numH; i++) {
              for (let j = 0; j <= numW; j++) {
                const isMajor = gridSubdivisions > 0 && (i % gridSubdivisions === 0 || j % gridSubdivisions === 0);
                if (isMajor) continue;
                const x = j * gridSize;
                const y = i * gridSize;
                context.moveTo(x + 0.8, y);
                context.arc(x, y, 0.8, 0, Math.PI * 2);
              }
            }
            context.fill();

            // 2. Major dots
            if (gridSubdivisions > 0) {
              context.globalAlpha = Math.min(gridOpacity * 1.5, 0.9);
              context.beginPath();
              for (let i = 0; i <= numH; i++) {
                for (let j = 0; j <= numW; j++) {
                  const isMajor = i % gridSubdivisions === 0 || j % gridSubdivisions === 0;
                  if (!isMajor) continue;
                  const x = j * gridSize;
                  const y = i * gridSize;
                  context.moveTo(x + 1.5, y);
                  context.arc(x, y, 1.5, 0, Math.PI * 2);
                }
              }
              context.fill();
            }
          }
        }}
      />
    </FastLayer>
  );
});
