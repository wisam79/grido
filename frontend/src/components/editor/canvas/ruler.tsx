import React, { useMemo } from "react";

// وحدة قياس المساطر — mm (فعلية) أو px (بكسلات الكانفس الفعلية)
export type RulerUnit = "mm" | "px";

interface HorizontalRulerProps {
  width: number;
  mmWidth: number;
  /** بكسلات الكانفس الفعلية — مطلوبة فقط عند unit="px" */
  pxWidth?: number;
  unit?: RulerUnit;
}

function getRulerSteps(pixelsPerMM: number) {
  // Target minimum distance between labeled ticks in screen pixels (~40px)
  const minLabelDistancePx = 40;
  const rawLabelStepMM = minLabelDistancePx / Math.max(pixelsPerMM, 0.001);

  const niceSteps = [1, 2, 5, 10, 20, 50, 100, 200, 500, 1000];
  const labelStep = niceSteps.find((s) => s >= rawLabelStepMM) || 1000;

  // Calculate sub-tick step
  let subStep = 1;
  if (labelStep >= 100) subStep = labelStep / 5;
  else if (labelStep >= 50) subStep = 10;
  else if (labelStep >= 20) subStep = 5;
  else if (labelStep >= 10) subStep = 1;
  else if (labelStep >= 5) subStep = 1;
  else subStep = 1;

  // Medium tick step (halfway mark between labels)
  const midStep = labelStep / 2;

  return { labelStep, subStep, midStep };
}

export const HorizontalRuler = React.memo(function HorizontalRuler({ width, mmWidth, pxWidth, unit = "mm" }: HorizontalRulerProps) {
  const { subPath, midPath, labelElements } = useMemo(() => {
    // المدى الكلي حسب الوحدة المختارة: ملم فعلية أو بكسلات الكانفس
    const span = unit === "px" ? (pxWidth || 0) : mmWidth;
    if (!width || !span || width <= 0 || span <= 0) {
      return { subPath: "", midPath: "", labelElements: [] };
    }
    const pixelsPerUnit = width / span;
    const { labelStep, subStep, midStep } = getRulerSteps(pixelsPerUnit);

    let subD = "";
    let midD = "";
    const labels: React.ReactNode[] = [];

    for (let i = 0; i <= span; i += subStep) {
      const x = i * pixelsPerUnit;
      const isLabel = Math.abs(i % labelStep) < 0.001 || Math.abs((i % labelStep) - labelStep) < 0.001;
      const isMid = !isLabel && (Math.abs(i % midStep) < 0.001 || Math.abs((i % midStep) - midStep) < 0.001);

      if (isLabel) {
        labels.push(
          <g key={`h-lbl-${i}`}>
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
              {Math.round(i)}
            </text>
          </g>
        );
      } else if (isMid) {
        midD += `M${x} 14V24`;
      } else {
        subD += `M${x} 18V24`;
      }
    }

    return { subPath: subD, midPath: midD, labelElements: labels };
  }, [width, mmWidth, pxWidth, unit]);

  return (
    <svg
      width={width}
      height={24}
      className="bg-card text-card-foreground overflow-hidden border-b border-border"
    >
      {subPath && (
        <path
          d={subPath}
          stroke="currentColor"
          className="stroke-muted-foreground/30"
          strokeWidth={1}
        />
      )}
      {midPath && (
        <path
          d={midPath}
          stroke="currentColor"
          className="stroke-muted-foreground/45"
          strokeWidth={1}
        />
      )}
      {labelElements}
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
  /** بكسلات الكانفس الفعلية — مطلوبة فقط عند unit="px" */
  pxHeight?: number;
  unit?: RulerUnit;
}

export const VerticalRuler = React.memo(function VerticalRuler({ height, mmHeight, pxHeight, unit = "mm" }: VerticalRulerProps) {
  const { subPath, midPath, labelElements } = useMemo(() => {
    const span = unit === "px" ? (pxHeight || 0) : mmHeight;
    if (!height || !span || height <= 0 || span <= 0) {
      return { subPath: "", midPath: "", labelElements: [] };
    }
    const pixelsPerUnit = height / span;
    const { labelStep, subStep, midStep } = getRulerSteps(pixelsPerUnit);

    let subD = "";
    let midD = "";
    const labels: React.ReactNode[] = [];

    for (let i = 0; i <= span; i += subStep) {
      const y = i * pixelsPerUnit;
      const isLabel = Math.abs(i % labelStep) < 0.001 || Math.abs((i % labelStep) - labelStep) < 0.001;
      const isMid = !isLabel && (Math.abs(i % midStep) < 0.001 || Math.abs((i % midStep) - midStep) < 0.001);

      if (isLabel) {
        labels.push(
          <g key={`v-lbl-${i}`}>
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
              {Math.round(i)}
            </text>
          </g>
        );
      } else if (isMid) {
        midD += `M14 ${y}H24`;
      } else {
        subD += `M18 ${y}H24`;
      }
    }

    return { subPath: subD, midPath: midD, labelElements: labels };
  }, [height, mmHeight, pxHeight, unit]);

  return (
    <svg
      width={24}
      height={height}
      className="bg-card text-card-foreground overflow-hidden border-l border-border"
    >
      {subPath && (
        <path
          d={subPath}
          stroke="currentColor"
          className="stroke-muted-foreground/30"
          strokeWidth={1}
        />
      )}
      {midPath && (
        <path
          d={midPath}
          stroke="currentColor"
          className="stroke-muted-foreground/45"
          strokeWidth={1}
        />
      )}
      {labelElements}
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
