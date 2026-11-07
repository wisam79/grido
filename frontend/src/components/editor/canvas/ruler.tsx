import React, { useMemo } from 'react';

import { rulerCursor } from '@/lib/canvas/canvas-colors';
import { cn } from '@/lib/utils';

import { getRulerSteps, getUnitSpan, formatRulerNumber } from './ruler-utils';

import type { RulerUnit } from '@/lib/store/slices/grid-slice';

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
      // 🛡️ باقي قسمة موجب: % في JS تحفظ الإشارة فيُساء تصنيف نقاط المنتصف
      // يسار الصفر (تظهر minor بدل mid) — التماثل حول الصفر مطلوب.
      const posMod = ((u % labelStep) + labelStep) % labelStep;
      const isMid = !isLabel && Math.abs(posMod - labelStep / 2) < subStep / 2 + 1e-9;
      const isZero = Math.abs(u) < 0.00001;

      if (isLabel) {
        // الإرساء عند حدّ منطقة العرض لا عند حدّ الورقة، وإلّا انقلبت محاذاة
        // كل الأرقام الواقعة يمين الورقة وتظهر ملتصقة يسار موضعها.
        const isNearEnd = x + 16 > viewportWidth;
        labels.push(
          <g key={`h-lbl-${idx}`}>
            <line
              x1={x}
              y1={isZero ? 2 : 8}
              x2={x}
              y2={16}
              stroke="currentColor"
              className={isZero ? 'stroke-primary' : 'stroke-ruler-tick-major'}
              strokeWidth={isZero ? 1.5 : 0.8}
            />
            <text
              x={isNearEnd ? x - 2 : x + (isZero ? 3 : 2)}
              y={7}
              textAnchor={isNearEnd ? 'end' : 'start'}
              fontSize={8.5}
              // هالة بلون سطح المسطرة تحافظ على مقروئية الرقم فوق خطوط التدريج
              style={{ paintOrder: 'stroke' }}
              strokeWidth={2}
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
        midD += `M${x} 11V16`;
      } else {
        subD += `M${x} 13.5V16`;
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
      height={16}
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
      <rect x={0} y={0} width={viewportWidth} height={16} className="fill-ruler-track" />

      {/* محتوى المسطرة المتحرك مع إزاحة الورقة */}
      <g id="h-ruler-content">
        {displayW > 0 && (
          <g>
            {/* مساحة الورقة الفعلية (Paper Track Area) */}
            <rect x={originX} y={0} width={displayW} height={16} className="fill-card" />
            {/* ظل حواف الورقة الناعم */}
            <rect
              x={originX}
              y={0}
              width={Math.min(PAPER_EDGE_SHADOW, displayW)}
              height={16}
              fill="url(#h-paper-shadow-left)"
            />
            <rect
              x={endX - Math.min(PAPER_EDGE_SHADOW, displayW)}
              y={0}
              width={Math.min(PAPER_EDGE_SHADOW, displayW)}
              height={16}
              fill="url(#h-paper-shadow-right)"
            />
          </g>
        )}

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
                y1={2}
                x2={mx}
                y2={16}
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
              y={10}
              width={Math.min(
                selectionBounds!.lengthPx - Math.max(0, -selectionBounds!.startPx),
                viewportWidth - Math.max(0, selectionBounds!.startPx),
              )}
              height={5}
              rx={1.5}
              className="fill-primary/15 stroke-primary/60"
              strokeWidth={1}
            />
            {selectionBounds!.label && (
              <text
                x={Math.max(0, selectionBounds!.startPx) + 3}
                y={8.5}
                fontSize={8}
                style={{ paintOrder: 'stroke' }}
                strokeWidth={2}
                strokeLinejoin="round"
                className="fill-primary font-mono font-bold select-none tracking-tighter stroke-ruler-surface"
              >
                {selectionBounds!.label}
              </text>
            )}
          </g>
        )}

        {/* 5. الأرقام والعلامات الرئيسية */}
        {labelElements}
      </g>

      {/* خط الإطار السفلي الفاصل مع الكانفس */}
      <line
        x1={0}
        y1={15.5}
        x2={viewportWidth}
        y2={15.5}
        className="stroke-ruler-border"
        strokeWidth={1}
      />

      {/* 7. مؤشر تتبع الماوس اللحظي النقي (Hairline Mouse Cursor) */}
      <line
        id="h-ruler-cursor"
        x1={0}
        y1={0}
        x2={0}
        y2={16}
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
      // 🛡️ باقي قسمة موجب: % في JS تحفظ الإشارة فيُساء تصنيف نقاط المنتصف
      // يسار الصفر (تظهر minor بدل mid) — التماثل حول الصفر مطلوب.
      const posMod = ((u % labelStep) + labelStep) % labelStep;
      const isMid = !isLabel && Math.abs(posMod - labelStep / 2) < subStep / 2 + 1e-9;
      const isZero = Math.abs(u) < 0.00001;
      // نفس منطق المسطرة الأفقية: الإرساء عند حدّ منطقة العرض لا حدّ الورقة
      const isNearEnd = y + 8 > viewportHeight;
      if (isLabel) {
        labels.push(
          <g key={`v-lbl-${idx}`}>
            <line
              x1={isZero ? 2 : 8}
              y1={y}
              x2={16}
              y2={y}
              stroke="currentColor"
              className={isZero ? 'stroke-primary' : 'stroke-ruler-tick-major'}
              strokeWidth={isZero ? 1.5 : 0.8}
            />
            {isZero ? (
              <text
                x={3}
                y={y + 1}
                fontSize={8.5}
                style={{ paintOrder: 'stroke' }}
                strokeWidth={2}
                strokeLinejoin="round"
                className="font-mono select-none tracking-tighter stroke-ruler-surface fill-primary font-bold text-2xs"
                textAnchor="start"
                dominantBaseline="hanging"
              >
                0
              </text>
            ) : (
              <text
                x={4.5}
                y={y}
                fontSize={8.5}
                style={{ paintOrder: 'stroke' }}
                strokeWidth={2}
                strokeLinejoin="round"
                className="font-mono select-none tracking-tighter stroke-ruler-surface fill-ruler-tick-label-active font-medium"
                transform={`rotate(-90, 4.5, ${y})`}
                textAnchor={isNearEnd ? 'start' : 'middle'}
                dominantBaseline="middle"
              >
                {formatRulerNumber(u, unit)}
              </text>
            )}
          </g>,
        );
      } else if (isMid) {
        midD += `M11 ${y}H16`;
      } else {
        subD += `M13.5 ${y}H16`;
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
      width={16}
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
      <rect x={0} y={0} width={16} height={viewportHeight} className="fill-ruler-track" />

      {/* محتوى المسطرة المتحرك مع إزاحة الورقة */}
      <g id="v-ruler-content">
        {displayH > 0 && (
          <g>
            {/* مساحة الورقة الفعلية (Paper Track Area) */}
            <rect x={0} y={originY} width={16} height={displayH} className="fill-card" />
            {/* ظل حواف الورقة الناعم */}
            <rect
              x={0}
              y={originY}
              width={16}
              height={Math.min(PAPER_EDGE_SHADOW, displayH)}
              fill="url(#v-paper-shadow-top)"
            />
            <rect
              x={0}
              y={endY - Math.min(PAPER_EDGE_SHADOW, displayH)}
              width={16}
              height={Math.min(PAPER_EDGE_SHADOW, displayH)}
              fill="url(#v-paper-shadow-bottom)"
            />
          </g>
        )}

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
                x1={2}
                y1={my}
                x2={16}
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
              x={10}
              y={Math.max(0, selectionBounds!.startPx)}
              width={5}
              height={Math.min(
                selectionBounds!.lengthPx - Math.max(0, -selectionBounds!.startPx),
                viewportHeight - Math.max(0, selectionBounds!.startPx),
              )}
              rx={1.5}
              className="fill-primary/15 stroke-primary/60"
              strokeWidth={1}
            />
            {selectionBounds!.label && (
              <text
                x={9}
                y={Math.max(0, selectionBounds!.startPx) + 3}
                fontSize={8}
                style={{ paintOrder: 'stroke' }}
                strokeWidth={2}
                strokeLinejoin="round"
                className="fill-primary font-mono font-bold select-none tracking-tighter stroke-ruler-surface"
                transform={`rotate(-90, 9, ${Math.max(0, selectionBounds!.startPx) + 3})`}
                textAnchor="start"
              >
                {selectionBounds!.label}
              </text>
            )}
          </g>
        )}

        {/* 5. الأرقام والعلامات الرئيسية */}
        {labelElements}
      </g>

      {/* خط الإطار الأيمن الفاصل مع الكانفس */}
      <line
        x1={15.5}
        y1={0}
        x2={15.5}
        y2={viewportHeight}
        className="stroke-ruler-border"
        strokeWidth={1}
      />

      {/* 7. مؤشر تتبع الماوس اللحظي النقي (Hairline Mouse Cursor) */}
      <line
        id="v-ruler-cursor"
        x1={0}
        y1={0}
        x2={16}
        y2={0}
        stroke={rulerCursor()}
        strokeWidth={1.25}
        strokeLinecap="round"
        style={{ display: 'none' }}
      />
    </svg>
  );
});
