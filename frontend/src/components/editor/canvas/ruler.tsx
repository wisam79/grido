import React, { useMemo } from "react";
import { rulerCursor } from "@/lib/canvas/canvas-colors";
import type { RulerUnit } from "@/lib/store/slices/grid-slice";

export type { RulerUnit };

export interface SelectionBoundsProjection {
  /** بداية العنصر بالبكسل بالنسبة للمسطرة */
  startPx: number;
  /** طول العنصر بالبكسل */
  lengthPx: number;
  /** تسمية أو قياس العنصر (مثال: "35 mm") */
  label?: string;
}

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
  /** إسقاط أبعاد العنصر المحدد على المسطرة */
  selectionBounds?: SelectionBoundsProjection | null;
  /** بدء سحب خط إرشادي جديد من المسطرة */
  onPointerDown?: (e: React.PointerEvent<SVGSVGElement>) => void;
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
  /** إسقاط أبعاد العنصر المحدد على المسطرة */
  selectionBounds?: SelectionBoundsProjection | null;
  /** بدء سحب خط إرشادي جديد من المسطرة */
  onPointerDown?: (e: React.PointerEvent<SVGSVGElement>) => void;
}

/**
 * حساب التدريج والخطوات التكيفية الذكية لمختلف الوحدات ومستويات الزوم
 */
function getRulerSteps(pixelsPerUnit: number, unit: RulerUnit) {
  const minLabelDistancePx = unit === "in" ? 55 : 48;
  const rawLabelStep = minLabelDistancePx / Math.max(pixelsPerUnit, 0.00001);

  let niceSteps: number[];
  if (unit === "cm") {
    niceSteps = [0.1, 0.2, 0.5, 1, 2, 5, 10, 20, 50, 100, 200];
  } else if (unit === "in") {
    niceSteps = [0.125, 0.25, 0.5, 1, 2, 4, 8, 12, 24, 48];
  } else if (unit === "px") {
    niceSteps = [5, 10, 20, 25, 50, 100, 200, 250, 500, 1000, 2000, 5000];
  } else {
    // mm (الافتراضي)
    niceSteps = [1, 2, 5, 10, 20, 25, 50, 100, 200, 250, 500, 1000, 2000];
  }

  const labelStep = niceSteps.find((s) => s >= rawLabelStep) || niceSteps[niceSteps.length - 1];

  let subStep = 1;
  if (unit === "in") {
    if (labelStep >= 4) subStep = 1;
    else if (labelStep >= 2) subStep = 0.5;
    else if (labelStep >= 1) subStep = 0.25;
    else if (labelStep >= 0.5) subStep = 0.125;
    else subStep = 0.0625;
  } else if (unit === "cm") {
    if (labelStep >= 10) subStep = 2;
    else if (labelStep >= 5) subStep = 1;
    else if (labelStep >= 2) subStep = 0.5;
    else if (labelStep >= 1) subStep = 0.1;
    else subStep = 0.05;
  } else if (unit === "px") {
    if (labelStep >= 1000) subStep = labelStep / 10;
    else if (labelStep >= 500) subStep = labelStep / 5;
    else if (labelStep >= 200) subStep = labelStep / 10;
    else if (labelStep >= 100) subStep = labelStep / 5;
    else if (labelStep >= 50) subStep = 10;
    else if (labelStep >= 20) subStep = 5;
    else subStep = 2;
  } else {
    // mm
    if (labelStep >= 1000) subStep = labelStep / 10;
    else if (labelStep >= 500) subStep = labelStep / 5;
    else if (labelStep >= 200) subStep = labelStep / 10;
    else if (labelStep >= 100) subStep = labelStep / 5;
    else if (labelStep >= 50) subStep = 10;
    else if (labelStep >= 20) subStep = 5;
    else if (labelStep >= 10) subStep = 2;
    else if (labelStep >= 5) subStep = 1;
    else subStep = 0.5;
  }

  const midStep = labelStep / 2;
  return { labelStep, subStep, midStep };
}

/**
 * حساب المدى الإجمالي للورقة بحسب الوحدة المختارة
 */
function getUnitSpan(mm: number, px: number | undefined, unit: RulerUnit): number {
  if (unit === "px") return px || (mm * 300) / 25.4;
  if (unit === "cm") return mm / 10;
  if (unit === "in") return mm / 25.4;
  return mm; // mm
}

/**
 * تنسيق الرقم لعرض نقي وموجز على المسطرة
 */
function formatRulerNumber(val: number, unit: RulerUnit): string {
  if (Math.abs(val) < 0.0001) return "0";
  if (unit === "in" || unit === "cm") {
    return Number(val.toFixed(2)).toString();
  }
  return Number(val.toFixed(1)).toString();
}

/**
 * المسطرة الأفقية المتطورة (Horizontal Ruler)
 */
export const HorizontalRuler = React.memo(function HorizontalRuler({
  viewportWidth,
  originX,
  displayW,
  mmWidth,
  pxWidth,
  unit = "mm",
  selectionBounds,
  onPointerDown,
}: HorizontalRulerProps) {
  const span = getUnitSpan(mmWidth, pxWidth, unit);

  const { subPath, midPath, labelElements } = useMemo(() => {
    if (!displayW || !span || displayW <= 0 || span <= 0 || !viewportWidth || viewportWidth <= 0) {
      return { subPath: "", midPath: "", labelElements: [] };
    }

    const pixelsPerUnit = displayW / span;
    const { labelStep, subStep, midStep } = getRulerSteps(pixelsPerUnit, unit);

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

      if (x < -40 || x > viewportWidth + 40) continue;

      const isLabel = idx % labelRatio === 0;
      const isMid = !isLabel && midRatio > 0 && idx % midRatio === 0;
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
              className={isZero ? "stroke-primary" : "stroke-muted-foreground/75 dark:stroke-muted-foreground/60"}
              strokeWidth={isZero ? 1.5 : 1}
            />
            <text
              x={x + 3}
              y={9}
              fontSize={8.5}
              className={
                isZero
                  ? "fill-primary font-bold font-mono select-none tracking-tight"
                  : "fill-muted-foreground font-mono font-medium select-none tracking-tight"
              }
            >
              {formatRulerNumber(u, unit)}
            </text>
          </g>
        );
      } else if (isMid) {
        midD += `M${x} 17V24`;
      } else {
        subD += `M${x} 20V24`;
      }
    }

    return { subPath: subD, midPath: midD, labelElements: labels };
  }, [viewportWidth, originX, displayW, span, unit]);

  const endX = originX + displayW;

  return (
    <svg
      width={viewportWidth}
      height={24}
      onPointerDown={onPointerDown}
      className="bg-card/95 text-card-foreground overflow-hidden select-none block cursor-ns-resize"
      style={{ touchAction: "none" }}
    >
      {/* 1. تمييز نطاق الورقة الفعلي بلون أكريليك ناعم مع خط سفلي محدد */}
      {displayW > 0 && (
        <>
          <rect
            x={originX}
            y={0}
            width={displayW}
            height={24}
            className="fill-primary/[0.04] dark:fill-primary/[0.07]"
          />
          <line
            x1={originX}
            y1={23.5}
            x2={endX}
            y2={23.5}
            className="stroke-primary/50 dark:stroke-primary/60"
            strokeWidth={1}
          />
          {/* خط نهاية حدود الورقة */}
          <line
            x1={endX}
            y1={0}
            x2={endX}
            y2={24}
            className="stroke-primary/60"
            strokeWidth={1}
            strokeDasharray="3,3"
          />
        </>
      )}

      {/* 2. إسقاط أبعاد العنصر المحدد على المسطرة (Selection Bounds Highlight) */}
      {selectionBounds && selectionBounds.lengthPx > 0 && (
        <g className="transition-all duration-100 ease-out">
          <rect
            x={selectionBounds.startPx}
            y={1}
            width={selectionBounds.lengthPx}
            height={22}
            className="fill-primary/20 stroke-primary/50"
            strokeWidth={1}
            rx={1.5}
          />
          <line
            x1={selectionBounds.startPx}
            y1={0}
            x2={selectionBounds.startPx}
            y2={24}
            className="stroke-primary"
            strokeWidth={1.5}
          />
          <line
            x1={selectionBounds.startPx + selectionBounds.lengthPx}
            y1={0}
            x2={selectionBounds.startPx + selectionBounds.lengthPx}
            y2={24}
            className="stroke-primary"
            strokeWidth={1.5}
          />
        </g>
      )}

      {/* 3. خطوط التدريج الدقيقة والمتوسطة */}
      {subPath && (
        <path
          d={subPath}
          stroke="currentColor"
          className="stroke-muted-foreground/30 dark:stroke-muted-foreground/25"
          strokeWidth={0.75}
        />
      )}
      {midPath && (
        <path
          d={midPath}
          stroke="currentColor"
          className="stroke-muted-foreground/55 dark:stroke-muted-foreground/45"
          strokeWidth={1}
        />
      )}

      {/* 4. الأرقام والعلامات الرئيسية */}
      {labelElements}

      {/* 5. مؤشر تتبع الماوس اللحظي */}
      <line
        id="h-ruler-cursor"
        x1={0}
        y1={0}
        x2={0}
        y2={24}
        stroke={rulerCursor()}
        strokeWidth={1.5}
        style={{ display: "none" }}
      />
    </svg>
  );
});

/**
 * المسطرة الرأسية المتطورة (Vertical Ruler)
 */
export const VerticalRuler = React.memo(function VerticalRuler({
  viewportHeight,
  originY,
  displayH,
  mmHeight,
  pxHeight,
  unit = "mm",
  selectionBounds,
  onPointerDown,
}: VerticalRulerProps) {
  const span = getUnitSpan(mmHeight, pxHeight, unit);

  const { subPath, midPath, labelElements } = useMemo(() => {
    if (!displayH || !span || displayH <= 0 || span <= 0 || !viewportHeight || viewportHeight <= 0) {
      return { subPath: "", midPath: "", labelElements: [] };
    }

    const pixelsPerUnit = displayH / span;
    const { labelStep, subStep, midStep } = getRulerSteps(pixelsPerUnit, unit);

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

      if (y < -40 || y > viewportHeight + 40) continue;

      const isLabel = idx % labelRatio === 0;
      const isMid = !isLabel && midRatio > 0 && idx % midRatio === 0;
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
              className={isZero ? "stroke-primary" : "stroke-muted-foreground/75 dark:stroke-muted-foreground/60"}
              strokeWidth={isZero ? 1.5 : 1}
            />
            <text
              x={7}
              y={y}
              fontSize={8.5}
              className={
                isZero
                  ? "fill-primary font-bold font-mono select-none tracking-tight"
                  : "fill-muted-foreground font-mono font-medium select-none tracking-tight"
              }
              transform={`rotate(-90, 7, ${y})`}
              textAnchor="middle"
              dominantBaseline="middle"
            >
              {formatRulerNumber(u, unit)}
            </text>
          </g>
        );
      } else if (isMid) {
        midD += `M17 ${y}H24`;
      } else {
        subD += `M20 ${y}H24`;
      }
    }

    return { subPath: subD, midPath: midD, labelElements: labels };
  }, [viewportHeight, originY, displayH, span, unit]);

  const endY = originY + displayH;

  return (
    <svg
      width={24}
      height={viewportHeight}
      onPointerDown={onPointerDown}
      className="bg-card/95 text-card-foreground overflow-hidden select-none block cursor-ew-resize"
      style={{ touchAction: "none" }}
    >
      {/* 1. تمييز نطاق الورقة الفعلي بلون أكريليك ناعم مع خط جانبي محدد */}
      {displayH > 0 && (
        <>
          <rect
            x={0}
            y={originY}
            width={24}
            height={displayH}
            className="fill-primary/[0.04] dark:fill-primary/[0.07]"
          />
          <line
            x1={23.5}
            y1={originY}
            x2={23.5}
            y2={endY}
            className="stroke-primary/50 dark:stroke-primary/60"
            strokeWidth={1}
          />
          {/* خط نهاية حدود الورقة */}
          <line
            x1={0}
            y1={endY}
            x2={24}
            y2={endY}
            className="stroke-primary/60"
            strokeWidth={1}
            strokeDasharray="3,3"
          />
        </>
      )}

      {/* 2. إسقاط أبعاد العنصر المحدد على المسطرة (Selection Bounds Highlight) */}
      {selectionBounds && selectionBounds.lengthPx > 0 && (
        <g className="transition-all duration-100 ease-out">
          <rect
            x={1}
            y={selectionBounds.startPx}
            width={22}
            height={selectionBounds.lengthPx}
            className="fill-primary/20 stroke-primary/50"
            strokeWidth={1}
            rx={1.5}
          />
          <line
            x1={0}
            y1={selectionBounds.startPx}
            x2={24}
            y2={selectionBounds.startPx}
            className="stroke-primary"
            strokeWidth={1.5}
          />
          <line
            x1={0}
            y1={selectionBounds.startPx + selectionBounds.lengthPx}
            x2={24}
            y2={selectionBounds.startPx + selectionBounds.lengthPx}
            className="stroke-primary"
            strokeWidth={1.5}
          />
        </g>
      )}

      {/* 3. خطوط التدريج الدقيقة والمتوسطة */}
      {subPath && (
        <path
          d={subPath}
          stroke="currentColor"
          className="stroke-muted-foreground/30 dark:stroke-muted-foreground/25"
          strokeWidth={0.75}
        />
      )}
      {midPath && (
        <path
          d={midPath}
          stroke="currentColor"
          className="stroke-muted-foreground/55 dark:stroke-muted-foreground/45"
          strokeWidth={1}
        />
      )}

      {/* 4. الأرقام والعلامات الرئيسية */}
      {labelElements}

      {/* 5. مؤشر تتبع الماوس اللحظي */}
      <line
        id="v-ruler-cursor"
        x1={0}
        y1={0}
        x2={24}
        y2={0}
        stroke={rulerCursor()}
        strokeWidth={1.5}
        style={{ display: "none" }}
      />
    </svg>
  );
});


