import React from "react";

interface HorizontalRulerProps {
  width: number;
  mmWidth: number;
  cursorX: number | null;
}

export function HorizontalRuler({ width, mmWidth, cursorX }: HorizontalRulerProps) {
  const pixelsPerMM = width / mmWidth;
  const ticks = [];
  
  // Decide tick density to prevent overlapping
  let step = 1;
  if (pixelsPerMM < 1.2) {
    step = 10;
  } else if (pixelsPerMM < 2.5) {
    step = 5;
  }

  for (let i = 0; i <= mmWidth; i += step) {
    const x = i * pixelsPerMM;
    if (i % 10 === 0) {
      // 10mm tick (1cm)
      ticks.push(
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
      // 5mm tick
      ticks.push(
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
      // 1mm tick
      ticks.push(
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

  return (
    <svg 
      width={width} 
      height={24} 
      className="bg-card text-card-foreground overflow-hidden border-b border-border transition-colors duration-200"
    >
      {ticks}
      {cursorX !== null && cursorX >= 0 && cursorX <= width && (
        <line 
          x1={cursorX} 
          y1={0} 
          x2={cursorX} 
          y2={24} 
          stroke="#3b82f6" 
          strokeWidth={1.5} 
          strokeDasharray="2,2" 
        />
      )}
    </svg>
  );
}

interface VerticalRulerProps {
  height: number;
  mmHeight: number;
  cursorY: number | null;
}

export function VerticalRuler({ height, mmHeight, cursorY }: VerticalRulerProps) {
  const pixelsPerMM = height / mmHeight;
  const ticks = [];

  let step = 1;
  if (pixelsPerMM < 1.2) {
    step = 10;
  } else if (pixelsPerMM < 2.5) {
    step = 5;
  }

  for (let i = 0; i <= mmHeight; i += step) {
    const y = i * pixelsPerMM;
    if (i % 10 === 0) {
      // 10mm tick (1cm)
      ticks.push(
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
      // 5mm tick
      ticks.push(
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
      // 1mm tick
      ticks.push(
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

  return (
    <svg 
      width={24} 
      height={height} 
      className="bg-card text-card-foreground overflow-hidden border-l border-border transition-colors duration-200"
    >
      {ticks}
      {cursorY !== null && cursorY >= 0 && cursorY <= height && (
        <line 
          x1={0} 
          y1={cursorY} 
          x2={24} 
          y2={cursorY} 
          stroke="#3b82f6" 
          strokeWidth={1.5} 
          strokeDasharray="2,2" 
        />
      )}
    </svg>
  );
}
