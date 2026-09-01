import React, { useMemo } from "react";
import { rulerCursor } from "@/lib/canvas/canvas-colors";
import type { RulerUnit } from "@/lib/store/slices/grid-slice";
import { cn } from "@/lib/utils";

export type { RulerUnit };

export interface SelectionBoundsProjection {
  startPx: number;
  lengthPx: number;
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
  /** هامش الصفحة الأيسر/الأيمن بالبكسل لإظهار مؤشرات الهوامش بأسلوب Word */
  marginPx?: number;
  /** اختياري */
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
  /** هامش الصفحة العلوي/السفلي بالبكسل لإظهار مؤشرات الهوامش بأسلوب Word */
  marginPx?: number;
  /** اختياري */
  selectionBounds?: SelectionBoundsProjection | null;
  /** بدء سحب خط إرشادي جديد من المسطرة */
  onPointerDown?: (e: React.PointerEvent<SVGSVGElement>) => void;
}

/**
 * حساب التدريج والخطوات التكيفية الذكية لمختلف الوحدات ومستويات الزوم (من 10% إلى 500%+)
 */
export function getRulerSteps(pixelsPerUnit: number, unit: RulerUnit) {
  const minLabelDistancePx = unit === "in" ? 54 : 44;
  const rawLabelStep = minLabelDistancePx / Math.max(pixelsPerUnit, 0.00001);

  let niceSteps: number[];
  if (unit === "cm") {
    niceSteps = [0.01, 0.02, 0.05, 0.1, 0.2, 0.5, 1, 2, 5, 10, 20, 50, 100, 200];
  } else if (unit === "in") {
    niceSteps = [0.03125, 0.0625, 0.125, 0.25, 0.5, 1, 2, 4, 8, 12, 24, 48];
  } else if (unit === "px") {
    niceSteps = [1, 2, 5, 10, 20, 25, 50, 100, 200, 250, 500, 1000, 2000, 5000];
  } else {
    // mm (الافتراضي للهويات والاستوديو)
    niceSteps = [0.1, 0.2, 0.5, 1, 2, 5, 10, 20, 25, 50, 100, 200, 250, 500, 1000, 2000];
  }

  const labelStep = niceSteps.find((s) => s >= rawLabelStep) || niceSteps[niceSteps.length - 1];

  let subStep = 1;
  if (unit === "in") {
    if (labelStep >= 4) subStep = 1;
    else if (labelStep >= 2) subStep = 0.5;
    else if (labelStep >= 1) subStep = 0.25;
    else if (labelStep >= 0.5) subStep = 0.125;
    else if (labelStep >= 0.25) subStep = 0.0625;
    else subStep = 0.03125;
  } else if (unit === "cm") {
    if (labelStep >= 10) subStep = 2;
    else if (labelStep >= 5) subStep = 1;
    else if (labelStep >= 2) subStep = 0.5;
    else if (labelStep >= 1) subStep = 0.1;
    else if (labelStep >= 0.5) subStep = 0.05;
    else subStep = 0.01;
  } else if (unit === "px") {
    if (labelStep >= 1000) subStep = labelStep / 10;
    else if (labelStep >= 500) subStep = labelStep / 5;
    else if (labelStep >= 200) subStep = labelStep / 10;
    else if (labelStep >= 100) subStep = labelStep / 5;
    else if (labelStep >= 50) subStep = 10;
    else if (labelStep >= 20) subStep = 5;
    else if (labelStep >= 10) subStep = 2;
    else subStep = 1;
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
    else if (labelStep >= 2) subStep = 0.5;
    else if (labelStep >= 1) subStep = 0.2;
    else subStep = 0.1;
  }

  const midStep = labelStep / 2;
  return { labelStep, subStep, midStep };
}

/**
 * حساب المدى الإجمالي للورقة بحسب الوحدة المختارة
 */
export function getUnitSpan(mm: number, px: number | undefined, unit: RulerUnit): number {
  if (unit === "px") return px || (mm * 300) / 25.4;
  if (unit === "cm") return mm / 10;
  if (unit === "in") return mm / 25.4;
  return mm; // mm
}

/**
 * تنسيق الرقم لعرض نقي وموجز على علامات المسطرة
 */
export function formatRulerNumber(val: number, unit: RulerUnit): string {
  if (Math.abs(val) < 0.00001) return "0";
  if (unit === "in") {
    if (Math.abs(val - 0.25) < 0.001) return "¼";
    if (Math.abs(val - 0.5) < 0.001) return "½";
    if (Math.abs(val - 0.75) < 0.001) return "¾";
    if (Math.abs(val - 0.125) < 0.001) return "⅛";
    if (Math.abs(val - 0.375) < 0.001) return "⅜";
    if (Math.abs(val - 0.625) < 0.001) return "⅝";
    if (Math.abs(val - 0.875) < 0.001) return "⅞";
    return Number(val.toFixed(2)).toString();
  }
  if (unit === "cm") {
    return Number(val.toFixed(2)).toString();
  }
  if (unit === "px") {
    return Math.round(val).toString();
  }
  return Number(val.toFixed(1)).toString();
}

/**
 * تنسيق قياس الإحداثي الدقيق
 */
export function formatRulerCoordinate(val: number, unit: RulerUnit): string {
  if (Math.abs(val) < 0.0001) return `0 ${unit}`;
  if (unit === "in") return `${Number(val.toFixed(2))} in`;
  if (unit === "cm") return `${Number(val.toFixed(2))} cm`;
  if (unit === "px") return `${Math.round(val)} px`;
  return `${Number(val.toFixed(1))} mm`;
}

/**
 * 📏 المسطرة الأفقية القياسية بنمط أدوات التصميم الاحترافية (Figma / Photoshop Standard)
 */
export const HorizontalRuler = React.memo(function HorizontalRuler({
  viewportWidth,
  originX,
  displayW,
  mmWidth,
  pxWidth,
  unit = "mm",
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

      if (x < -60 || x > viewportWidth + 60) continue;

      const isLabel = idx % labelRatio === 0;
      const isMid = !isLabel && midRatio > 0 && idx % midRatio === 0;
      const isZero = Math.abs(u) < 0.00001;
      const isInsideCanvas = u >= -0.0001 && u <= span + 0.0001;

      if (isLabel) {
        labels.push(
          <g key={`h-lbl-${idx}`}>
            <line
              x1={x}
              y1={isZero ? 2 : 10}
              x2={x}
              y2={20}
              stroke="currentColor"
              className={
                isZero
                  ? "stroke-primary"
                  : isInsideCanvas
                  ? "stroke-neutral-400 dark:stroke-neutral-500"
                  : "stroke-neutral-300 dark:stroke-neutral-700"
              }
              strokeWidth={isZero ? 1.5 : 0.8}
            />
            <text
              x={x + (isZero ? 3 : 2)}
              y={8}
              fontSize={8}
              className={cn(
                "font-mono select-none tracking-tighter",
                isZero
                  ? "fill-primary font-bold text-[8.5px]"
                  : isInsideCanvas
                  ? "fill-neutral-700 dark:fill-neutral-300 font-medium"
                  : "fill-neutral-400 dark:fill-neutral-600 font-normal"
              )}
            >
              {formatRulerNumber(u, unit)}
            </text>
          </g>
        );
      } else if (isMid) {
        midD += `M${x} 14V20`;
      } else {
        subD += `M${x} 17V20`;
      }
    }

    return { subPath: subD, midPath: midD, labelElements: labels };
  }, [viewportWidth, originX, displayW, span, unit]);

  const endX = originX + displayW;

  return (
    <svg
      width={viewportWidth}
      height={20}
      onPointerDown={onPointerDown}
      className="bg-neutral-100/95 dark:bg-[#18181b] text-foreground overflow-hidden select-none block cursor-ns-resize"
      style={{ touchAction: "none" }}
    >
      {/* 1. مسار مساحة العمل والورقة الفعلي */}
      <rect
        x={0}
        y={0}
        width={viewportWidth}
        height={20}
        className="fill-neutral-200/60 dark:fill-[#141416]"
      />

      {displayW > 0 && (
        <g>
          {/* مساحة الورقة الفعلية (Paper Track Area) */}
          <rect
            x={originX}
            y={0}
            width={displayW}
            height={20}
            className="fill-white/90 dark:fill-[#202024]"
          />
          {/* خط بداية ونهاية الورقة */}
          <line
            x1={originX}
            y1={0}
            x2={originX}
            y2={20}
            className="stroke-primary/70"
            strokeWidth={1}
          />
          <line
            x1={endX}
            y1={0}
            x2={endX}
            y2={20}
            className="stroke-primary/70"
            strokeWidth={1}
          />
        </g>
      )}

      {/* خط الإطار السفلي الفاصل مع الكانفس */}
      <line x1={0} y1={19.5} x2={viewportWidth} y2={19.5} className="stroke-neutral-300/80 dark:stroke-neutral-800" strokeWidth={1} />

      {/* 2. خطوط التدريج الاحترافية (3-Tier Tick Marks) */}
      {subPath && (
        <path
          d={subPath}
          stroke="currentColor"
          className="stroke-neutral-400/70 dark:stroke-neutral-600"
          strokeWidth={0.65}
        />
      )}
      {midPath && (
        <path
          d={midPath}
          stroke="currentColor"
          className="stroke-neutral-500/80 dark:stroke-neutral-500"
          strokeWidth={0.75}
        />
      )}

      {/* 3. الأرقام والعلامات الرئيسية */}
      {labelElements}

      {/* 4. مؤشر تتبع الماوس اللحظي النقي (Hairline Mouse Cursor) */}
      <line
        id="h-ruler-cursor"
        x1={0}
        y1={0}
        x2={0}
        y2={20}
        stroke={rulerCursor()}
        strokeWidth={1}
        style={{ display: "none" }}
      />
    </svg>
  );
});

/**
 * 📏 المسطرة الرأسية القياسية بنمط أدوات التصميم الاحترافية (Figma / Photoshop Standard)
 */
export const VerticalRuler = React.memo(function VerticalRuler({
  viewportHeight,
  originY,
  displayH,
  mmHeight,
  pxHeight,
  unit = "mm",
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

      if (y < -60 || y > viewportHeight + 60) continue;

      const isLabel = idx % labelRatio === 0;
      const isMid = !isLabel && midRatio > 0 && idx % midRatio === 0;
      const isZero = Math.abs(u) < 0.00001;
      const isInsideCanvas = u >= -0.0001 && u <= span + 0.0001;

      if (isLabel) {
        labels.push(
          <g key={`v-lbl-${idx}`}>
            <line
              x1={isZero ? 2 : 10}
              y1={y}
              x2={20}
              y2={y}
              stroke="currentColor"
              className={
                isZero
                  ? "stroke-primary"
                  : isInsideCanvas
                  ? "stroke-neutral-400 dark:stroke-neutral-500"
                  : "stroke-neutral-300 dark:stroke-neutral-700"
              }
              strokeWidth={isZero ? 1.5 : 0.8}
            />
            <text
              x={5.5}
              y={y}
              fontSize={8}
              className={cn(
                "font-mono select-none tracking-tighter",
                isZero
                  ? "fill-primary font-bold text-[8.5px]"
                  : isInsideCanvas
                  ? "fill-neutral-700 dark:fill-neutral-300 font-medium"
                  : "fill-neutral-400 dark:fill-neutral-600 font-normal"
              )}
              transform={`rotate(-90, 5.5, ${y})`}
              textAnchor="middle"
              dominantBaseline="middle"
            >
              {formatRulerNumber(u, unit)}
            </text>
          </g>
        );
      } else if (isMid) {
        midD += `M14 ${y}H20`;
      } else {
        subD += `M17 ${y}H20`;
      }
    }

    return { subPath: subD, midPath: midD, labelElements: labels };
  }, [viewportHeight, originY, displayH, span, unit]);

  const endY = originY + displayH;

  return (
    <svg
      width={20}
      height={viewportHeight}
      onPointerDown={onPointerDown}
      className="bg-neutral-100/95 dark:bg-[#18181b] text-foreground overflow-hidden select-none block cursor-ew-resize"
      style={{ touchAction: "none" }}
    >
      {/* 1. مسار مساحة العمل والورقة الفعلي */}
      <rect
        x={0}
        y={0}
        width={20}
        height={viewportHeight}
        className="fill-neutral-200/60 dark:fill-[#141416]"
      />

      {displayH > 0 && (
        <g>
          {/* مساحة الورقة الفعلية (Paper Track Area) */}
          <rect
            x={0}
            y={originY}
            width={20}
            height={displayH}
            className="fill-white/90 dark:fill-[#202024]"
          />
          {/* خط بداية ونهاية الورقة */}
          <line
            x1={0}
            y1={originY}
            x2={20}
            y2={originY}
            className="stroke-primary/70"
            strokeWidth={1}
          />
          <line
            x1={0}
            y1={endY}
            x2={20}
            y2={endY}
            className="stroke-primary/70"
            strokeWidth={1}
          />
        </g>
      )}

      {/* خط الإطار الأيمن الفاصل مع الكانفس */}
      <line x1={19.5} y1={0} x2={19.5} y2={viewportHeight} className="stroke-neutral-300/80 dark:stroke-neutral-800" strokeWidth={1} />

      {/* 2. خطوط التدريج الاحترافية (3-Tier Tick Marks) */}
      {subPath && (
        <path
          d={subPath}
          stroke="currentColor"
          className="stroke-neutral-400/70 dark:stroke-neutral-600"
          strokeWidth={0.65}
        />
      )}
      {midPath && (
        <path
          d={midPath}
          stroke="currentColor"
          className="stroke-neutral-500/80 dark:stroke-neutral-500"
          strokeWidth={0.75}
        />
      )}

      {/* 3. الأرقام والعلامات الرئيسية */}
      {labelElements}

      {/* 4. مؤشر تتبع الماوس اللحظي النقي (Hairline Mouse Cursor) */}
      <line
        id="v-ruler-cursor"
        x1={0}
        y1={0}
        x2={20}
        y2={0}
        stroke={rulerCursor()}
        strokeWidth={1}
        style={{ display: "none" }}
      />
    </svg>
  );
});
