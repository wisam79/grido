import React, { useMemo } from 'react';
import { rulerCursor } from '@/lib/canvas/canvas-colors';
import type { RulerUnit } from '@/lib/store/slices/grid-slice';
import { cn } from '@/lib/utils';

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

import { getRulerSteps, getUnitSpan, formatRulerNumber } from './ruler-utils';

/** عرض منطقة التدرج اللوني لظل حافة الورقة على المسطرة */
const PAPER_EDGE_SHADOW = 5;

/**
 * 📏 المسطرة الأفقية القياسية بنمط أدوات التصميم الاحترافية (Figma / Photoshop Standard)
 */
export const HorizontalRuler = React.memo(function HorizontalRuler({
  viewportWidth,
  originX,
  displayW,
  mmWidth,
  pxWidth,
  unit = 'mm',
  marginPx = 0,
  selectionBounds,
  onPointerDown,
}: HorizontalRulerProps) {
  const span = getUnitSpan(mmWidth, pxWidth, unit);

  const { subPath, midPath, labelElements } = useMemo(() => {
    if (!displayW || !span || displayW <= 0 || span <= 0 || !viewportWidth || viewportWidth <= 0) {
      return { subPath: '', midPath: '', labelElements: [] };
    }

    const pixelsPerUnit = displayW / span;
    const { labelStep, subStep } = getRulerSteps(pixelsPerUnit, unit);

    // المسطرة تستمر عبر مساحة العمل كلها ولا تتوقف عند حدود الورقة: القيم
    // السالبة يسار نقطة الصفر جزء حقيقي من مساحة العمل (سلوك Figma/Photoshop)،
    // والقص عند [0, span] كان يجعل النصف الفارغ من الشريط بلا تدريج إطلاقاً.
    // الورقة تبقى مميَّزة بخلفيتها وخطَّي بدايتها/نهايتها.
    const visibleMinUnit = (0 - originX) / pixelsPerUnit;
    const visibleMaxUnit = (viewportWidth - originX) / pixelsPerUnit;

    if (visibleMinUnit > visibleMaxUnit) {
      return { subPath: '', midPath: '', labelElements: [] };
    }

    const startStepIndex = Math.floor(visibleMinUnit / subStep);
    const endStepIndex = Math.ceil(visibleMaxUnit / subStep);

    let subD = '';
    let midD = '';
    const labels: React.ReactNode[] = [];

    const labelRatio = Math.max(1, Math.round(labelStep / subStep));

    for (let idx = startStepIndex; idx <= endStepIndex; idx++) {
      const u = idx * subStep;

      const x = originX + u * pixelsPerUnit;

      if (x < -60 || x > viewportWidth + 60) continue;

      const isLabel = idx % labelRatio === 0;
      const isMid = !isLabel && Math.abs((u % labelStep) - labelStep / 2) < subStep / 2 + 1e-9;
      const isZero = Math.abs(u) < 0.00001;

      if (isLabel) {
        // الإرساء عند حدّ منطقة العرض لا عند حدّ الورقة، وإلّا انقلبت محاذاة
        // كل الأرقام الواقعة يمين الورقة وتظهر ملتصقة يسار موضعها.
        const isNearEnd = x + 16 > viewportWidth;
        labels.push(
          <g key={`h-lbl-${idx}`}>
            <line
              x1={x}
              y1={isZero ? 2 : 10}
              x2={x}
              y2={20}
              stroke="currentColor"
              className={isZero ? 'stroke-primary' : 'stroke-ruler-tick-major'}
              strokeWidth={isZero ? 1.5 : 0.8}
            />
            <text
              x={isNearEnd ? x - 2 : x + (isZero ? 3 : 2)}
              y={8}
              textAnchor={isNearEnd ? 'end' : 'start'}
              fontSize={8}
              // هالة بلون سطح المسطرة تحافظ على مقروئية الرقم فوق خطوط التدريج
              style={{ paintOrder: 'stroke' }}
              strokeWidth={2.5}
              strokeLinejoin="round"
              className={cn(
                'font-mono select-none tracking-tighter stroke-ruler-surface',
                isZero
                  ? 'fill-primary font-bold text-2xs'
                  : 'fill-ruler-tick-label-active font-medium',
              )}
            >
              {formatRulerNumber(u, unit)}
            </text>
          </g>,
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
  const hasSelection =
    !!selectionBounds &&
    selectionBounds.lengthPx > 0 &&
    selectionBounds.startPx + selectionBounds.lengthPx > 0 &&
    selectionBounds.startPx < viewportWidth;

  return (
    <svg
      width={viewportWidth}
      height={20}
      onPointerDown={onPointerDown}
      className="bg-ruler-surface text-foreground overflow-hidden select-none block cursor-ns-resize"
      style={{ touchAction: 'none' }}
    >
      <defs>
        {/* ظل ناعم على حافتي الورقة يمنح إحساس العمق بأسلوب Figma */}
        <linearGradient id="h-paper-shadow-left" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#000" stopOpacity="0.10" />
          <stop offset="100%" stopColor="#000" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="h-paper-shadow-right" x1="1" y1="0" x2="0" y2="0">
          <stop offset="0%" stopColor="#000" stopOpacity="0.10" />
          <stop offset="100%" stopColor="#000" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* 1. مسار مساحة العمل والورقة الفعلي */}
      <rect x={0} y={0} width={viewportWidth} height={20} className="fill-ruler-track" />

      {displayW > 0 && (
        <g>
          {/* مساحة الورقة الفعلية (Paper Track Area) */}
          <rect x={originX} y={0} width={displayW} height={20} className="fill-card" />
          {/* ظل حواف الورقة الناعم */}
          <rect
            x={originX}
            y={0}
            width={Math.min(PAPER_EDGE_SHADOW, displayW)}
            height={20}
            fill="url(#h-paper-shadow-left)"
          />
          <rect
            x={endX - Math.min(PAPER_EDGE_SHADOW, displayW)}
            y={0}
            width={Math.min(PAPER_EDGE_SHADOW, displayW)}
            height={20}
            fill="url(#h-paper-shadow-right)"
          />
        </g>
      )}

      {/* خط الإطار السفلي الفاصل مع الكانفس */}
      <line
        x1={0}
        y1={19.5}
        x2={viewportWidth}
        y2={19.5}
        className="stroke-ruler-border"
        strokeWidth={1}
      />

      {/* 2. خطوط التدريج الاحترافية (3-Tier Tick Marks) */}
      {subPath && (
        <path
          d={subPath}
          stroke="currentColor"
          className="stroke-ruler-tick/70"
          strokeWidth={0.65}
        />
      )}
      {midPath && (
        <path
          d={midPath}
          stroke="currentColor"
          className="stroke-ruler-tick-major/80"
          strokeWidth={0.75}
        />
      )}

      {/* 3. مؤشرات هوامش الصفحة بأسلوب Word — تظليل خفيف وحدود متقطعة */}
      {marginPx > 0 && displayW > 0 && (
        <g>
          {[originX + marginPx, endX - marginPx].map((mx, i) => (
            <line
              key={`h-margin-${i}`}
              x1={mx}
              y1={3}
              x2={mx}
              y2={20}
              className="stroke-primary/40"
              strokeWidth={1}
              strokeDasharray="2 2"
            />
          ))}
        </g>
      )}

      {/* 4. شريط تحديد العنصر المُسقَط من الكانفس */}
      {hasSelection && (
        <g>
          <rect
            x={Math.max(0, selectionBounds!.startPx)}
            y={13}
            width={Math.min(
              selectionBounds!.lengthPx - Math.max(0, -selectionBounds!.startPx),
              viewportWidth - Math.max(0, selectionBounds!.startPx),
            )}
            height={7}
            rx={2}
            className="fill-primary/15 stroke-primary/60"
            strokeWidth={1}
          />
          {selectionBounds!.label && (
            <text
              x={Math.max(0, selectionBounds!.startPx) + 3}
              y={11.5}
              fontSize={7.5}
              style={{ paintOrder: 'stroke' }}
              strokeWidth={2.5}
              strokeLinejoin="round"
              className="fill-primary font-mono font-bold select-none tracking-tighter stroke-ruler-surface"
            >
              {selectionBounds!.label}
            </text>
          )}
        </g>
      )}

      {/* 5. علامة نقطة الصفر المثلثة (Origin Flag) بنمط Photoshop */}
      {displayW > 0 && (
        <polygon
          points={`${originX - 4},0 ${originX + 4},0 ${originX},7`}
          className="fill-primary"
        />
      )}

      {/* 6. الأرقام والعلامات الرئيسية */}
      {labelElements}

      {/* 7. مؤشر تتبع الماوس اللحظي النقي (Hairline Mouse Cursor) */}
      <line
        id="h-ruler-cursor"
        x1={0}
        y1={0}
        x2={0}
        y2={20}
        stroke={rulerCursor()}
        strokeWidth={1.25}
        strokeLinecap="round"
        style={{ display: 'none' }}
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
  unit = 'mm',
  marginPx = 0,
  selectionBounds,
  onPointerDown,
}: VerticalRulerProps) {
  const span = getUnitSpan(mmHeight, pxHeight, unit);

  const { subPath, midPath, labelElements } = useMemo(() => {
    if (
      !displayH ||
      !span ||
      displayH <= 0 ||
      span <= 0 ||
      !viewportHeight ||
      viewportHeight <= 0
    ) {
      return { subPath: '', midPath: '', labelElements: [] };
    }

    const pixelsPerUnit = displayH / span;
    const { labelStep, subStep } = getRulerSteps(pixelsPerUnit, unit);

    // نفس مبدأ المسطرة الأفقية: التدريج يستمر فوق نقطة الصفر وتحتها عبر
    // كامل مساحة العمل، لا داخل حدود الورقة فقط.
    const visibleMinUnit = (0 - originY) / pixelsPerUnit;
    const visibleMaxUnit = (viewportHeight - originY) / pixelsPerUnit;

    if (visibleMinUnit > visibleMaxUnit) {
      return { subPath: '', midPath: '', labelElements: [] };
    }

    const startStepIndex = Math.floor(visibleMinUnit / subStep);
    const endStepIndex = Math.ceil(visibleMaxUnit / subStep);

    let subD = '';
    let midD = '';
    const labels: React.ReactNode[] = [];

    const labelRatio = Math.max(1, Math.round(labelStep / subStep));

    for (let idx = startStepIndex; idx <= endStepIndex; idx++) {
      const u = idx * subStep;

      const y = originY + u * pixelsPerUnit;

      if (y < -60 || y > viewportHeight + 60) continue;

      const isLabel = idx % labelRatio === 0;
      const isMid = !isLabel && Math.abs((u % labelStep) - labelStep / 2) < subStep / 2 + 1e-9;
      const isZero = Math.abs(u) < 0.00001;
      // نفس منطق المسطرة الأفقية: الإرساء عند حدّ منطقة العرض لا حدّ الورقة
      const isNearEnd = y + 8 > viewportHeight;
      if (isLabel) {
        labels.push(
          <g key={`v-lbl-${idx}`}>
            <line
              x1={isZero ? 2 : 10}
              y1={y}
              x2={20}
              y2={y}
              stroke="currentColor"
              className={isZero ? 'stroke-primary' : 'stroke-ruler-tick-major'}
              strokeWidth={isZero ? 1.5 : 0.8}
            />
            {isZero ? (
              <text
                x={4}
                y={y + 2}
                fontSize={8}
                style={{ paintOrder: 'stroke' }}
                strokeWidth={2.5}
                strokeLinejoin="round"
                className="font-mono select-none tracking-tighter stroke-ruler-surface fill-primary font-bold text-2xs"
                textAnchor="start"
                dominantBaseline="hanging"
              >
                0
              </text>
            ) : (
              <text
                x={5.5}
                y={y}
                fontSize={8}
                style={{ paintOrder: 'stroke' }}
                strokeWidth={2.5}
                strokeLinejoin="round"
                className="font-mono select-none tracking-tighter stroke-ruler-surface fill-ruler-tick-label-active font-medium"
                transform={`rotate(-90, 5.5, ${y})`}
                textAnchor={isNearEnd ? 'start' : 'middle'}
                dominantBaseline="middle"
              >
                {formatRulerNumber(u, unit)}
              </text>
            )}
          </g>,
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
  const hasSelection =
    !!selectionBounds &&
    selectionBounds.lengthPx > 0 &&
    selectionBounds.startPx + selectionBounds.lengthPx > 0 &&
    selectionBounds.startPx < viewportHeight;

  return (
    <svg
      width={20}
      height={viewportHeight}
      onPointerDown={onPointerDown}
      className="bg-ruler-surface text-foreground overflow-hidden select-none block cursor-ew-resize"
      style={{ touchAction: 'none' }}
    >
      <defs>
        {/* ظل ناعم على حافتي الورقة يمنح إحساس العمق بأسلوب Figma */}
        <linearGradient id="v-paper-shadow-top" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#000" stopOpacity="0.10" />
          <stop offset="100%" stopColor="#000" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="v-paper-shadow-bottom" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" stopColor="#000" stopOpacity="0.10" />
          <stop offset="100%" stopColor="#000" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* 1. مسار مساحة العمل والورقة الفعلي */}
      <rect x={0} y={0} width={20} height={viewportHeight} className="fill-ruler-track" />

      {displayH > 0 && (
        <g>
          {/* مساحة الورقة الفعلية (Paper Track Area) */}
          <rect x={0} y={originY} width={20} height={displayH} className="fill-card" />
          {/* ظل حواف الورقة الناعم */}
          <rect
            x={0}
            y={originY}
            width={20}
            height={Math.min(PAPER_EDGE_SHADOW, displayH)}
            fill="url(#v-paper-shadow-top)"
          />
          <rect
            x={0}
            y={endY - Math.min(PAPER_EDGE_SHADOW, displayH)}
            width={20}
            height={Math.min(PAPER_EDGE_SHADOW, displayH)}
            fill="url(#v-paper-shadow-bottom)"
          />
        </g>
      )}

      {/* خط الإطار الأيمن الفاصل مع الكانفس */}
      <line
        x1={19.5}
        y1={0}
        x2={19.5}
        y2={viewportHeight}
        className="stroke-ruler-border"
        strokeWidth={1}
      />

      {/* 2. خطوط التدريج الاحترافية (3-Tier Tick Marks) */}
      {subPath && (
        <path
          d={subPath}
          stroke="currentColor"
          className="stroke-ruler-tick/70"
          strokeWidth={0.65}
        />
      )}
      {midPath && (
        <path
          d={midPath}
          stroke="currentColor"
          className="stroke-ruler-tick-major/80"
          strokeWidth={0.75}
        />
      )}

      {/* 3. مؤشرات هوامش الصفحة بأسلوب Word — حدود متقطعة */}
      {marginPx > 0 && displayH > 0 && (
        <g>
          {[originY + marginPx, endY - marginPx].map((my, i) => (
            <line
              key={`v-margin-${i}`}
              x1={3}
              y1={my}
              x2={20}
              y2={my}
              className="stroke-primary/40"
              strokeWidth={1}
              strokeDasharray="2 2"
            />
          ))}
        </g>
      )}

      {/* 4. شريط تحديد العنصر المُسقَط من الكانفس */}
      {hasSelection && (
        <g>
          <rect
            x={13}
            y={Math.max(0, selectionBounds!.startPx)}
            width={7}
            height={Math.min(
              selectionBounds!.lengthPx - Math.max(0, -selectionBounds!.startPx),
              viewportHeight - Math.max(0, selectionBounds!.startPx),
            )}
            rx={2}
            className="fill-primary/15 stroke-primary/60"
            strokeWidth={1}
          />
          {selectionBounds!.label && (
            <text
              x={11.5}
              y={Math.max(0, selectionBounds!.startPx) + 3}
              fontSize={7.5}
              style={{ paintOrder: 'stroke' }}
              strokeWidth={2.5}
              strokeLinejoin="round"
              className="fill-primary font-mono font-bold select-none tracking-tighter stroke-ruler-surface"
              transform={`rotate(-90, 11.5, ${Math.max(0, selectionBounds!.startPx) + 3})`}
              textAnchor="start"
            >
              {selectionBounds!.label}
            </text>
          )}
        </g>
      )}

      {/* 5. علامة نقطة الصفر المثلثة (Origin Flag) بنمط Photoshop */}
      {displayH > 0 && (
        <polygon
          points={`0,${originY - 4} 0,${originY + 4} 7,${originY}`}
          className="fill-primary"
        />
      )}

      {/* 6. الأرقام والعلامات الرئيسية */}
      {labelElements}

      {/* 7. مؤشر تتبع الماوس اللحظي النقي (Hairline Mouse Cursor) */}
      <line
        id="v-ruler-cursor"
        x1={0}
        y1={0}
        x2={20}
        y2={0}
        stroke={rulerCursor()}
        strokeWidth={1.25}
        strokeLinecap="round"
        style={{ display: 'none' }}
      />
    </svg>
  );
});
