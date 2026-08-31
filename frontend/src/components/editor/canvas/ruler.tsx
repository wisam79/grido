import React, { useMemo } from "react";
import { rulerCursor } from "@/lib/canvas/canvas-colors";
import type { RulerUnit } from "@/lib/store/slices/grid-slice";

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
 * 📏 المسطرة الأفقية القياسية بنمط Microsoft Office / Word الاحترافي النقي
 */
export const HorizontalRuler = React.memo(function HorizontalRuler({
  viewportWidth,
  originX,
  displayW,
  mmWidth,
  pxWidth,
  unit = "mm",
  marginPx = 0,
  onPointerDown,
}: HorizontalRulerProps) {
  const span = getUnitSpan(mmWidth, pxWidth, unit);

  const { subPath, midDots, labelElements } = useMemo(() => {
    if (!displayW || !span || displayW <= 0 || span <= 0 || !viewportWidth || viewportWidth <= 0) {
      return { subPath: "", midDots: [], labelElements: [] };
    }

    const pixelsPerUnit = displayW / span;
    const { labelStep, subStep, midStep } = getRulerSteps(pixelsPerUnit, unit);

    const minUnit = (0 - originX) / pixelsPerUnit;
    const maxUnit = (viewportWidth - originX) / pixelsPerUnit;

    const startStepIndex = Math.floor(minUnit / subStep);
    const endStepIndex = Math.ceil(maxUnit / subStep);

    let subD = "";
    const dots: { x: number; y: number }[] = [];
    const labels: React.ReactNode[] = [];

    const labelRatio = Math.max(1, Math.round(labelStep / subStep));
    const midRatio = Math.max(1, Math.round(midStep / subStep));

    for (let idx = startStepIndex; idx <= endStepIndex; idx++) {
      const u = idx * subStep;
      const x = originX + u * pixelsPerUnit;

      if (x < -50 || x > viewportWidth + 50) continue;

      const isLabel = idx % labelRatio === 0;
      const isMid = !isLabel && midRatio > 0 && idx % midRatio === 0;
      const isZero = Math.abs(u) < 0.00001;

      if (isLabel) {
        labels.push(
          <g key={`h-lbl-${idx}`}>
            <line
              x1={x}
              y1={isZero ? 4 : 14}
              x2={x}
              y2={22}
              stroke="currentColor"
              className={isZero ? "stroke-primary" : "stroke-neutral-400 dark:stroke-neutral-500"}
              strokeWidth={isZero ? 1.5 : 0.85}
            />
            <text
              x={x + (isZero ? 3.5 : 2.5)}
              y={10.5}
              fontSize={8.5}
              className={
                isZero
                  ? "fill-primary font-bold font-sans select-none tracking-tight"
                  : "fill-neutral-700 dark:fill-neutral-200 font-sans font-semibold select-none tracking-tight"
              }
            >
              {formatRulerNumber(u, unit)}
            </text>
          </g>
        );
      } else if (isMid) {
        dots.push({ x, y: 18 });
      } else {
        subD += `M${x} 19.5V22`;
      }
    }

    return { subPath: subD, midDots: dots, labelElements: labels };
  }, [viewportWidth, originX, displayW, span, unit]);

  const endX = originX + displayW;
  const leftIndentX = originX + marginPx;
  const rightIndentX = endX - marginPx;

  return (
    <svg
      width={viewportWidth}
      height={22}
      onPointerDown={onPointerDown}
      className="bg-neutral-200/90 dark:bg-neutral-900 text-foreground overflow-hidden select-none block cursor-ns-resize"
      style={{ touchAction: "none" }}
    >
      {/* 1. مسار المسطرة ثنائي اللون (Word Two-Tone Track) */}
      <rect
        x={0}
        y={0}
        width={viewportWidth}
        height={22}
        className="fill-neutral-200/90 dark:fill-neutral-900"
      />

      {displayW > 0 && (
        <g>
          {/* مساحة الورقة الفعلية (Paper Track Area) */}
          <rect
            x={originX}
            y={0.5}
            width={displayW}
            height={21}
            className="fill-white dark:fill-neutral-800"
          />
          {/* الحدود الجانبية الفاصلة للورقة */}
          <line
            x1={originX}
            y1={0}
            x2={originX}
            y2={22}
            className="stroke-neutral-400 dark:stroke-neutral-600"
            strokeWidth={1}
          />
          <line
            x1={endX}
            y1={0}
            x2={endX}
            y2={22}
            className="stroke-neutral-400 dark:stroke-neutral-600"
            strokeWidth={1}
          />
        </g>
      )}

      {/* خطوط الإطار العلوي والسفلي */}
      <line x1={0} y1={0.5} x2={viewportWidth} y2={0.5} className="stroke-neutral-300 dark:stroke-neutral-800" strokeWidth={1} />
      <line x1={0} y1={21.5} x2={viewportWidth} y2={21.5} className="stroke-neutral-300 dark:stroke-neutral-700" strokeWidth={1} />

      {/* 2. النقاط وخطوط التدريج بنمط Word */}
      {midDots.map((dot, i) => (
        <circle
          key={`dot-${i}`}
          cx={dot.x}
          cy={dot.y}
          r={0.9}
          className="fill-neutral-500 dark:fill-neutral-400"
        />
      ))}
      {subPath && (
        <path
          d={subPath}
          stroke="currentColor"
          className="stroke-neutral-400 dark:stroke-neutral-600"
          strokeWidth={0.7}
        />
      )}

      {/* 3. الأرقام والعلامات الرئيسية */}
      {labelElements}

      {/* 4. مؤشرات الهوامش الأيقونية بنمط Microsoft Word (Indent Sliders) */}
      {displayW > 0 && (
        <g className="pointer-events-none select-none">
          {/* مقبض الهامش الأيسر (Left Margin Hourglass Marker) */}
          <g transform={`translate(${leftIndentX}, 0)`}>
            <polygon points="-3.5,1 3.5,1 0,5.5" className="fill-white stroke-neutral-600 dark:fill-neutral-700 dark:stroke-neutral-300" strokeWidth={0.8} />
            <polygon points="-3.5,16 3.5,16 0,11.5" className="fill-white stroke-neutral-600 dark:fill-neutral-700 dark:stroke-neutral-300" strokeWidth={0.8} />
            <rect x={-3.5} y={16} width={7} height={4} className="fill-white stroke-neutral-600 dark:fill-neutral-700 dark:stroke-neutral-300" strokeWidth={0.8} rx={0.5} />
          </g>

          {/* مقبض الهامش الأيمن (Right Margin Marker) */}
          <g transform={`translate(${rightIndentX}, 0)`}>
            <polygon points="-3.5,16 3.5,16 0,11.5" className="fill-white stroke-neutral-600 dark:fill-neutral-700 dark:stroke-neutral-300" strokeWidth={0.8} />
            <rect x={-3.5} y={16} width={7} height={4} className="fill-white stroke-neutral-600 dark:fill-neutral-700 dark:stroke-neutral-300" strokeWidth={0.8} rx={0.5} />
          </g>
        </g>
      )}

      {/* 5. مؤشر تتبع الماوس اللحظي النقي (Hairline Mouse Cursor) */}
      <line
        id="h-ruler-cursor"
        x1={0}
        y1={0}
        x2={0}
        y2={22}
        stroke={rulerCursor()}
        strokeWidth={1.5}
        style={{ display: "none" }}
      />
    </svg>
  );
});

/**
 * 📏 المسطرة الرأسية القياسية بنمط Microsoft Office / Word الاحترافي النقي
 */
export const VerticalRuler = React.memo(function VerticalRuler({
  viewportHeight,
  originY,
  displayH,
  mmHeight,
  pxHeight,
  unit = "mm",
  marginPx = 0,
  onPointerDown,
}: VerticalRulerProps) {
  const span = getUnitSpan(mmHeight, pxHeight, unit);

  const { subPath, midDots, labelElements } = useMemo(() => {
    if (!displayH || !span || displayH <= 0 || span <= 0 || !viewportHeight || viewportHeight <= 0) {
      return { subPath: "", midDots: [], labelElements: [] };
    }

    const pixelsPerUnit = displayH / span;
    const { labelStep, subStep, midStep } = getRulerSteps(pixelsPerUnit, unit);

    const minUnit = (0 - originY) / pixelsPerUnit;
    const maxUnit = (viewportHeight - originY) / pixelsPerUnit;

    const startStepIndex = Math.floor(minUnit / subStep);
    const endStepIndex = Math.ceil(maxUnit / subStep);

    let subD = "";
    const dots: { x: number; y: number }[] = [];
    const labels: React.ReactNode[] = [];

    const labelRatio = Math.max(1, Math.round(labelStep / subStep));
    const midRatio = Math.max(1, Math.round(midStep / subStep));

    for (let idx = startStepIndex; idx <= endStepIndex; idx++) {
      const u = idx * subStep;
      const y = originY + u * pixelsPerUnit;

      if (y < -50 || y > viewportHeight + 50) continue;

      const isLabel = idx % labelRatio === 0;
      const isMid = !isLabel && midRatio > 0 && idx % midRatio === 0;
      const isZero = Math.abs(u) < 0.00001;

      if (isLabel) {
        labels.push(
          <g key={`v-lbl-${idx}`}>
            <line
              x1={isZero ? 4 : 14}
              y1={y}
              x2={22}
              y2={y}
              stroke="currentColor"
              className={isZero ? "stroke-primary" : "stroke-neutral-400 dark:stroke-neutral-500"}
              strokeWidth={isZero ? 1.5 : 0.85}
            />
            <text
              x={7.5}
              y={y}
              fontSize={8.5}
              className={
                isZero
                  ? "fill-primary font-bold font-sans select-none tracking-tight"
                  : "fill-neutral-700 dark:fill-neutral-200 font-sans font-semibold select-none tracking-tight"
              }
              transform={`rotate(-90, 7.5, ${y})`}
              textAnchor="middle"
              dominantBaseline="middle"
            >
              {formatRulerNumber(u, unit)}
            </text>
          </g>
        );
      } else if (isMid) {
        dots.push({ x: 18, y });
      } else {
        subD += `M19.5 ${y}H22`;
      }
    }

    return { subPath: subD, midDots: dots, labelElements: labels };
  }, [viewportHeight, originY, displayH, span, unit]);

  const endY = originY + displayH;
  const topIndentY = originY + marginPx;
  const bottomIndentY = endY - marginPx;

  return (
    <svg
      width={22}
      height={viewportHeight}
      onPointerDown={onPointerDown}
      className="bg-neutral-200/90 dark:bg-neutral-900 text-foreground overflow-hidden select-none block cursor-ew-resize"
      style={{ touchAction: "none" }}
    >
      {/* 1. مسار المسطرة ثنائي اللون */}
      <rect
        x={0}
        y={0}
        width={22}
        height={viewportHeight}
        className="fill-neutral-200/90 dark:fill-neutral-900"
      />

      {displayH > 0 && (
        <g>
          {/* مساحة الورقة الفعلية (Paper Track Area) */}
          <rect
            x={0.5}
            y={originY}
            width={21}
            height={displayH}
            className="fill-white dark:fill-neutral-800"
          />
          {/* الحدود الجانبية الفاصلة للورقة */}
          <line
            x1={0}
            y1={originY}
            x2={22}
            y2={originY}
            className="stroke-neutral-400 dark:stroke-neutral-600"
            strokeWidth={1}
          />
          <line
            x1={0}
            y1={endY}
            x2={22}
            y2={endY}
            className="stroke-neutral-400 dark:stroke-neutral-600"
            strokeWidth={1}
          />
        </g>
      )}

      {/* خطوط الإطار الأيسر والأيمن */}
      <line x1={0.5} y1={0} x2={0.5} y2={viewportHeight} className="stroke-neutral-300 dark:stroke-neutral-800" strokeWidth={1} />
      <line x1={21.5} y1={0} x2={21.5} y2={viewportHeight} className="stroke-neutral-300 dark:stroke-neutral-700" strokeWidth={1} />

      {/* 2. النقاط وخطوط التدريج بنمط Word */}
      {midDots.map((dot, i) => (
        <circle
          key={`vdot-${i}`}
          cx={dot.x}
          cy={dot.y}
          r={0.9}
          className="fill-neutral-500 dark:fill-neutral-400"
        />
      ))}
      {subPath && (
        <path
          d={subPath}
          stroke="currentColor"
          className="stroke-neutral-400 dark:stroke-neutral-600"
          strokeWidth={0.7}
        />
      )}

      {/* 3. الأرقام والعلامات الرئيسية */}
      {labelElements}

      {/* 4. مؤشرات الهوامش الرأسية بنمط Word */}
      {displayH > 0 && (
        <g className="pointer-events-none select-none">
          <g transform={`translate(0, ${topIndentY})`}>
            <polygon points="1,-3.5 1,3.5 5.5,0" className="fill-white stroke-neutral-600 dark:fill-neutral-700 dark:stroke-neutral-300" strokeWidth={0.8} />
          </g>
          <g transform={`translate(0, ${bottomIndentY})`}>
            <polygon points="16,-3.5 16,3.5 11.5,0" className="fill-white stroke-neutral-600 dark:fill-neutral-700 dark:stroke-neutral-300" strokeWidth={0.8} />
            <rect x={16} y={-3.5} width={4} height={7} className="fill-white stroke-neutral-600 dark:fill-neutral-700 dark:stroke-neutral-300" strokeWidth={0.8} rx={0.5} />
          </g>
        </g>
      )}

      {/* 5. مؤشر تتبع الماوس اللحظي النقي (Hairline Mouse Cursor) */}
      <line
        id="v-ruler-cursor"
        x1={0}
        y1={0}
        x2={22}
        y2={0}
        stroke={rulerCursor()}
        strokeWidth={1.5}
        style={{ display: "none" }}
      />
    </svg>
  );
});
