import React, { useMemo } from "react";

interface HorizontalRulerProps {
  width: number;
  mmWidth: number;
}

export const HorizontalRuler = React.memo(function HorizontalRuler({ width, mmWidth }: HorizontalRulerProps) {
  const ticks = useMemo(() => {
    const pixelsPerMM = width / mmWidth;
    const items = [];
    let step = 1;
    if (pixelsPerMM < 1.2) {
      step = 10;
    } else if (pixelsPerMM < 2.5) {
      step = 5;
    }

    for (let i = 0; i <= mmWidth; i += step) {
      const x = i * pixelsPerMM;
      if (i % 10 === 0) {
        items.push(
          <g key={`h-10-${i}`}>
            <line 
              x1={x} 
              y1={8} 
              x2={x} 
              y2={24} 
              stroke="currentColor" 
              className="stroke-muted-foreground/60" 
              strokeWidth={1} 
            />
            <text 
              x={x + 2} 
              y={8} 
              fontSize={7} 
              className="fill-muted-foreground font-mono font-medium select-none"
            >
              {i}
            </text>
          </g>
        );
      } else if (i % 5 === 0) {
        items.push(
          <line 
            key={`h-5-${i}`} 
            x1={x} 
            y1={14} 
            x2={x} 
            y2={24} 
            stroke="currentColor" 
            className="stroke-muted-foreground/45" 
            strokeWidth={1} 
          />
        );
      } else {
        items.push(
          <line 
            key={`h-1-${i}`} 
            x1={x} 
            y1={18} 
            x2={x} 
            y2={24} 
            stroke="currentColor" 
            className="stroke-muted-foreground/30" 
            strokeWidth={1} 
          />
        );
      }
    }
    return items;
  }, [width, mmWidth]);

  return (
    <svg 
      width={width} 
      height={24} 
      className="bg-card text-card-foreground overflow-hidden border-b border-border"
    >
      {ticks}
      <line 
        id="h-ruler-cursor"
        x1={0} 
        y1={0} 
        x2={0} 
        y2={24} 
        stroke="#3b82f6" 
        strokeWidth={1.5} 
        strokeDasharray="2,2"
        style={{ display: "none" }}
      />
    </svg>
  );
});

interface VerticalRulerProps {
  height: number;
  mmHeight: number;
}

export const VerticalRuler = React.memo(function VerticalRuler({ height, mmHeight }: VerticalRulerProps) {
  const ticks = useMemo(() => {
    const pixelsPerMM = height / mmHeight;
    const items = [];
    let step = 1;
    if (pixelsPerMM < 1.2) {
      step = 10;
    } else if (pixelsPerMM < 2.5) {
      step = 5;
    }

    for (let i = 0; i <= mmHeight; i += step) {
      const y = i * pixelsPerMM;
      if (i % 10 === 0) {
        items.push(
          <g key={`v-10-${i}`}>
            <line 
              x1={8} 
              y1={y} 
              x2={24} 
              y2={y} 
              stroke="currentColor" 
              className="stroke-muted-foreground/60" 
              strokeWidth={1} 
            />
            <text 
              x={6} 
              y={y + 3} 
              fontSize={7} 
              className="fill-muted-foreground font-mono font-medium select-none text-right"
              transform={`rotate(-90, 6, ${y})`}
              textAnchor="middle"
            >
              {i}
            </text>
          </g>
        );
      } else if (i % 5 === 0) {
        items.push(
          <line 
            key={`v-5-${i}`} 
            x1={14} 
            y1={y} 
            x2={24} 
            y2={y} 
            stroke="currentColor" 
            className="stroke-muted-foreground/45" 
            strokeWidth={1} 
          />
        );
      } else {
        items.push(
          <line 
            key={`v-1-${i}`} 
            x1={18} 
            y1={y} 
            x2={24} 
            y2={y} 
            stroke="currentColor" 
            className="stroke-muted-foreground/30" 
            strokeWidth={1} 
          />
        );
      }
    }
    return items;
  }, [height, mmHeight]);

  return (
    <svg 
      width={24} 
      height={height} 
      className="bg-card text-card-foreground overflow-hidden border-l border-border"
    >
      {ticks}
      <line 
        id="v-ruler-cursor"
        x1={0} 
        y1={0} 
        x2={24} 
        y2={0} 
        stroke="#3b82f6" 
        strokeWidth={1.5} 
        strokeDasharray="2,2"
        style={{ display: "none" }}
      />
    </svg>
  );
});
