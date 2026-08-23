import React, { useMemo } from "react";

// وحدة قياس المساطر — mm (فعلية) أو px (بكسلات الكانفس الفعلية)
export type RulerUnit = "mm" | "px";

export interface HorizontalRulerProps {
  /** عرض منطقة المسطرة على الشاشة (عرض الـ Viewport) */
  viewportWidth: number;
  /** إزاحة نقطة الصفر للورقة على الشاشة بالبكسل */
  originX: number;
  /** عرض الورقة على الشاشة بالبكسل */
  displayW: number;
  /** عرض الورقة بالملم */
  mmWidth: number;
  /** بكسلات الكانفس الفعلية — مطلوبة عند unit="px" */
  pxWidth?: number;
  unit?: RulerUnit;
}

export interface VerticalRulerProps {
  /** ارتفاع منطقة المسطرة على الشاشة (ارتفاع الـ Viewport) */
  viewportHeight: number;
  /** إزاحة نقطة الصفر للورقة على الشاشة بالبكسل */
  originY: number;
  /** ارتفاع الورقة على الشاشة بالبكسل */
  displayH: number;
  /** ارتفاع الورقة بالملم */
  mmHeight: number;
  /** بكسلات الكانفس الفعلية — مطلوبة عند unit="px" */
  pxHeight?: number;
  unit?: RulerUnit;
}

function getRulerSteps(pixelsPerUnit: number) {
  // المسافة المستهدفة بين التسميات الرقمية بالبكسل على الشاشة (~45px)
  const minLabelDistancePx = 45;
  const rawLabelStep = minLabelDistancePx / Math.max(pixelsPerUnit, 0.0001);

  const niceSteps = [1, 2, 5, 10, 20, 25, 50, 100, 200, 250, 500, 1000, 2000, 5000];
  const labelStep = niceSteps.find((s) => s >= rawLabelStep) || 5000;

  let subStep = 1;
  if (labelStep >= 1000) subStep = labelStep / 10;
  else if (labelStep >= 500) subStep = labelStep / 5;
  else if (labelStep >= 200) subStep = labelStep / 10;
  else if (labelStep >= 100) subStep = labelStep / 5;
  else if (labelStep >= 50) subStep = 10;
  else if (labelStep >= 20) subStep = 5;
  else if (labelStep >= 10) subStep = 2;
  else if (labelStep >= 5) subStep = 1;
  else subStep = 0.5;

  const midStep = labelStep / 2;
  return { labelStep, subStep, midStep };
}

export const HorizontalRuler = React.memo(function HorizontalRuler({
  viewportWidth,
  originX,
  displayW,
  mmWidth,
  pxWidth,
  unit = "mm",
}: HorizontalRulerProps) {
  const { subPath, midPath, labelElements } = useMemo(() => {
    const span = unit === "px" ? (pxWidth || 0) : mmWidth;
    if (!displayW || !span || displayW <= 0 || span <= 0 || !viewportWidth || viewportWidth <= 0) {
      return { subPath: "", midPath: "", labelElements: [] };
    }

    const pixelsPerUnit = displayW / span;
    const { labelStep, subStep, midStep } = getRulerSteps(pixelsPerUnit);

    const minUnit = (0 - originX) / pixelsPerUnit;
    const maxUnit = (viewportWidth - originX) / pixelsPerUnit;

    const startStepIndex = Math.floor(minUnit / subStep);
    const endStepIndex = Math.ceil(maxUnit / subStep);

    let subD = "";
    let midD = "";
    const labels: React.ReactNode[] = [];

    const labelRatio = Math.max(1, Math.round(labelStep / subStep));
    const midRatio = Math.max(1, Math.round(midStep / subStep));

    for (let idx = startStepIndex; idx <= endStepIndex; idx++) {
      const u = idx * subStep;
      const x = originX + u * pixelsPerUnit;

      if (x < -30 || x > viewportWidth + 30) continue;

      const isLabel = idx % labelRatio === 0;
      const isMid = !isLabel && (midRatio > 0 && idx % midRatio === 0);
      const isZero = Math.abs(u) < 0.0001;

      if (isLabel) {
        labels.push(
          <g key={`h-lbl-${idx}`}>
            <line
              x1={x}
              y1={isZero ? 0 : 13}
              x2={x}
              y2={24}
              stroke="currentColor"
              className={isZero ? "stroke-primary" : "stroke-muted-foreground/70"}
              strokeWidth={isZero ? 1.5 : 1}
            />
            <text
              x={x + 3}
              y={9.5}
              fontSize={8}
              className={
                isZero
                  ? "fill-primary font-bold font-mono select-none"
                  : "fill-muted-foreground/90 font-mono font-semibold select-none"
              }
            >
              {Math.round(u * 10) / 10}
            </text>
          </g>
        );
      } else if (isMid) {
        midD += `M${x} 17V24`;
      } else {
        subD += `M${x} 20.5V24`;
      }
    }

    return { subPath: subD, midPath: midD, labelElements: labels };
  }, [viewportWidth, originX, displayW, mmWidth, pxWidth, unit]);

  const endX = originX + displayW;

  return (
    <svg
      width={viewportWidth}
      height={24}
      className="bg-card/90 text-card-foreground overflow-hidden select-none block"
    >
      {/* تمييز نطاق الورقة الفعلي بلون أكريليك خفيف مع خط سفلي محدد */}
      {displayW > 0 && (
        <>
          <rect
            x={originX}
            y={0}
            width={displayW}
            height={24}
            className="fill-primary/[0.08] dark:fill-primary/[0.14]"
          />
          <line
            x1={originX}
            y1={23.5}
            x2={endX}
            y2={23.5}
            className="stroke-primary/50"
            strokeWidth={1}
          />
          {/* خط نهاية حدود الورقة */}
          <line
            x1={endX}
            y1={0}
            x2={endX}
            y2={24}
            className="stroke-primary/30"
            strokeWidth={1}
            strokeDasharray="2,2"
          />
        </>
      )}

      {subPath && (
        <path
          d={subPath}
          stroke="currentColor"
          className="stroke-muted-foreground/25"
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
        stroke="#0078d4"
        strokeWidth={1.5}
        style={{ display: "none" }}
      />
    </svg>
  );
});

export const VerticalRuler = React.memo(function VerticalRuler({
  viewportHeight,
  originY,
  displayH,
  mmHeight,
  pxHeight,
  unit = "mm",
}: VerticalRulerProps) {
  const { subPath, midPath, labelElements } = useMemo(() => {
    const span = unit === "px" ? (pxHeight || 0) : mmHeight;
    if (!displayH || !span || displayH <= 0 || span <= 0 || !viewportHeight || viewportHeight <= 0) {
      return { subPath: "", midPath: "", labelElements: [] };
    }

    const pixelsPerUnit = displayH / span;
    const { labelStep, subStep, midStep } = getRulerSteps(pixelsPerUnit);

    const minUnit = (0 - originY) / pixelsPerUnit;
    const maxUnit = (viewportHeight - originY) / pixelsPerUnit;

    const startStepIndex = Math.floor(minUnit / subStep);
    const endStepIndex = Math.ceil(maxUnit / subStep);

    let subD = "";
    let midD = "";
    const labels: React.ReactNode[] = [];

    const labelRatio = Math.max(1, Math.round(labelStep / subStep));
    const midRatio = Math.max(1, Math.round(midStep / subStep));

    for (let idx = startStepIndex; idx <= endStepIndex; idx++) {
      const u = idx * subStep;
      const y = originY + u * pixelsPerUnit;

      if (y < -30 || y > viewportHeight + 30) continue;

      const isLabel = idx % labelRatio === 0;
      const isMid = !isLabel && (midRatio > 0 && idx % midRatio === 0);
      const isZero = Math.abs(u) < 0.0001;

      if (isLabel) {
        labels.push(
          <g key={`v-lbl-${idx}`}>
            <line
              x1={isZero ? 0 : 13}
              y1={y}
              x2={24}
              y2={y}
              stroke="currentColor"
              className={isZero ? "stroke-primary" : "stroke-muted-foreground/70"}
              strokeWidth={isZero ? 1.5 : 1}
            />
            <text
              x={7}
              y={y}
              fontSize={8}
              className={
                isZero
                  ? "fill-primary font-bold font-mono select-none"
                  : "fill-muted-foreground/90 font-mono font-semibold select-none"
              }
              transform={`rotate(-90, 7, ${y})`}
              textAnchor="middle"
              dominantBaseline="middle"
            >
              {Math.round(u * 10) / 10}
            </text>
          </g>
        );
      } else if (isMid) {
        midD += `M17 ${y}H24`;
      } else {
        subD += `M20.5 ${y}H24`;
      }
    }

    return { subPath: subD, midPath: midD, labelElements: labels };
  }, [viewportHeight, originY, displayH, mmHeight, pxHeight, unit]);

  const endY = originY + displayH;

  return (
    <svg
      width={24}
      height={viewportHeight}
      className="bg-card/90 text-card-foreground overflow-hidden select-none block"
    >
      {/* تمييز نطاق الورقة الفعلي بلون أكريليك خفيف مع خط جانبي محدد */}
      {displayH > 0 && (
        <>
          <rect
            x={0}
            y={originY}
            width={24}
            height={displayH}
            className="fill-primary/[0.08] dark:fill-primary/[0.14]"
          />
          <line
            x1={23.5}
            y1={originY}
            x2={23.5}
            y2={endY}
            className="stroke-primary/50"
            strokeWidth={1}
          />
          {/* خط نهاية حدود الورقة */}
          <line
            x1={0}
            y1={endY}
            x2={24}
            y2={endY}
            className="stroke-primary/30"
            strokeWidth={1}
            strokeDasharray="2,2"
          />
        </>
      )}

      {subPath && (
        <path
          d={subPath}
          stroke="currentColor"
          className="stroke-muted-foreground/25"
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
        stroke="#0078d4"
        strokeWidth={1.5}
        style={{ display: "none" }}
      />
    </svg>
  );
});

