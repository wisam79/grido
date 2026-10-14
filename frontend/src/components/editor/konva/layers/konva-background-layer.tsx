import React, { useMemo } from 'react';
import { Layer, Rect, Shape } from 'react-konva';
// 🎨 هندسة تدرج الورقة موحّدة مع التصدير (lib/canvas/gradient-geometry)
import { gradientPixelPoints } from '@/lib/canvas/gradient-geometry';

interface KonvaBackgroundLayerProps {
  canvasWidth: number;
  canvasHeight: number;
  backgroundColor: string;
  /** لون نهاية التدرج — غيابه يعني تعبئة مصمتة */
  backgroundGradientColor2?: string | null;
  /** زاوية التدرج الخطي بالدرجات (0° = يسار→يمين مع عقارب الساعة) */
  backgroundGradientAngle?: number;
  showGrid: boolean;
  gridSize: number;
  gridColor: string;
  gridOpacity: number;
  gridSubdivisions: number;
  gridType: 'lines' | 'dots';
  showColumns: boolean;
  columnsMargin: number;
  columnsGutter: number;
  columnsCount: number;
  columnsColor: string;
  /** نمط المربعات الشفافة للخلفية الشفافة — يُمرر من konva-canvas */
  checkerPattern?: HTMLCanvasElement;
  /** مقياس العرض لثبات سماكة الظل على الشاشة */
  stageScale?: number;
}

export const KonvaBackgroundLayer = React.memo(function KonvaBackgroundLayer({
  canvasWidth,
  canvasHeight,
  backgroundColor,
  backgroundGradientColor2,
  backgroundGradientAngle = 135,
  showGrid,
  gridSize,
  gridColor,
  gridOpacity,
  gridSubdivisions,
  gridType,
  showColumns,
  columnsMargin,
  columnsGutter,
  columnsCount,
  columnsColor,
  checkerPattern,
  stageScale = 1,
}: KonvaBackgroundLayerProps) {
  // 🎨 نقاط التدرج بالبكسل حول مركز الورقة — `gradientPixelPoints` هي نفس الدالة
  // التي يستخدمها `exportCanvas`، فلا يختلف امتداد/اتجاه التدرج بين المعاينة
  // والناتج المصدَّر (تمرير النسب 0-1 مباشرة إلى Konva يحصر التدرج في 1px).
  const hasGradient = Boolean(
    backgroundGradientColor2 &&
    backgroundColor !== 'transparent' &&
    backgroundGradientColor2 !== 'transparent',
  );
  const gradient = useMemo(
    () => gradientPixelPoints(backgroundGradientAngle, canvasWidth, canvasHeight),
    [backgroundGradientAngle, canvasWidth, canvasHeight],
  );

  // — توحيد الطبقات الثابتة في Layer واحدة (Konva Performance Guide:
  // "keep the number of layers minimal — each Layer is a separate <canvas>").
  // كان قبل ذلك 3 طبقات منفصلة (خلفية + شبكة + أعمدة) = 3 backing stores + 3 مسح/رسم
  // لكل إطار. الآن طبقة واحدة تُرسم مرة واحدة وتُحفظ في VRAM مرة واحدة.
  const showGridActive = showGrid && gridSize > 0;
  const showColumnsActive = showColumns && columnsCount > 0;

  // حساب كثافة الشبكة (نفس منطق GridLayer سابقاً)
  const gridMeta = useMemo(() => {
    if (!showGridActive) return null;
    const numH = Math.ceil(canvasHeight / gridSize);
    const numW = Math.ceil(canvasWidth / gridSize);
    const MAX_GRID_CELLS = 20000;
    const totalCells = numH * numW;
    const densityStep =
      totalCells > MAX_GRID_CELLS ? Math.ceil(Math.sqrt(totalCells / MAX_GRID_CELLS)) : 1;
    return { numH, numW, densityStep };
  }, [showGridActive, canvasHeight, canvasWidth, gridSize]);

  const columnsMeta = useMemo(() => {
    if (!showColumnsActive) return null;
    const availW = Math.max(0, canvasWidth - 2 * columnsMargin);
    const colW = Math.max(0, (availW - (columnsCount - 1) * columnsGutter) / columnsCount);
    return { availW, colW };
  }, [showColumnsActive, canvasWidth, columnsMargin, columnsCount, columnsGutter]);

  return (
    <Layer
      listening={false}
      name="background-layer"
      hitStrokeWidth={0}
      clearBeforeDraw
      // Listening_False: هذه الطبقة بلا hit graph — توفير O(n) hit testing
    >
      {/* 📄 ظل الورقة — مدمج في طبقة الخلفية (All_Performance_Tips: keep layers minimal). */}
      <Rect
        name="paper-shadow-rect"
        x={0}
        y={0}
        width={canvasWidth}
        height={canvasHeight}
        fill={backgroundColor === 'transparent' ? undefined : '#ffffff'}
        fillPatternImage={
          backgroundColor === 'transparent'
            ? (checkerPattern as unknown as HTMLImageElement)
            : undefined
        }
        shadowColor="rgba(0, 0, 0, 0.28)"
        shadowBlur={24 / (stageScale || 1)}
        shadowOffset={{ x: 0, y: 8 / (stageScale || 1) }}
        shadowOpacity={0.35}
        shadowForStrokeEnabled={false}
        listening={false}
        perfectDrawEnabled={false}
      />
      <Rect
        name="bg-rect"
        width={canvasWidth}
        height={canvasHeight}
        fill={!hasGradient && backgroundColor !== 'transparent' ? backgroundColor : undefined}
        fillLinearGradientStartPoint={hasGradient ? gradient.start : undefined}
        fillLinearGradientEndPoint={hasGradient ? gradient.end : undefined}
        fillLinearGradientColorStops={
          hasGradient ? [0, backgroundColor, 1, backgroundGradientColor2 as string] : undefined
        }
        shadowForStrokeEnabled={false}
        listening={false}
        perfectDrawEnabled={false}
      />
      {gridMeta && (
        <Shape
          name="grid-shape"
          listening={false}
          perfectDrawEnabled={false}
          shadowForStrokeEnabled={false}
          hitStrokeWidth={0}
          sceneFunc={(ctx, shape) => {
            ctx.save();
            if (gridType === 'lines') {
              ctx.strokeStyle = gridColor;
              ctx.lineWidth = 0.4;
              (ctx as unknown as CanvasRenderingContext2D).globalAlpha = gridOpacity;
              ctx.beginPath();
              for (let i = 0; i <= gridMeta.numH; i += gridMeta.densityStep) {
                if (gridSubdivisions > 0 && i % gridSubdivisions === 0) continue;
                ctx.moveTo(0, i * gridSize);
                ctx.lineTo(canvasWidth, i * gridSize);
              }
              for (let j = 0; j <= gridMeta.numW; j += gridMeta.densityStep) {
                if (gridSubdivisions > 0 && j % gridSubdivisions === 0) continue;
                ctx.moveTo(j * gridSize, 0);
                ctx.lineTo(j * gridSize, canvasHeight);
              }
              ctx.stroke();
              if (gridSubdivisions > 0) {
                ctx.lineWidth = 0.8;
                (ctx as unknown as CanvasRenderingContext2D).globalAlpha = Math.min(
                  gridOpacity * 2.2,
                  0.9,
                );
                ctx.beginPath();
                for (let i = 0; i <= gridMeta.numH; i += gridSubdivisions) {
                  ctx.moveTo(0, i * gridSize);
                  ctx.lineTo(canvasWidth, i * gridSize);
                }
                for (let j = 0; j <= gridMeta.numW; j += gridSubdivisions) {
                  ctx.moveTo(j * gridSize, 0);
                  ctx.lineTo(j * gridSize, canvasHeight);
                }
                ctx.stroke();
              }
            } else {
              (ctx as unknown as CanvasRenderingContext2D).fillStyle = gridColor;
              (ctx as unknown as CanvasRenderingContext2D).globalAlpha = gridOpacity;
              ctx.beginPath();
              for (let i = 0; i <= gridMeta.numH; i += gridMeta.densityStep) {
                for (let j = 0; j <= gridMeta.numW; j += gridMeta.densityStep) {
                  const isMajor =
                    gridSubdivisions > 0 &&
                    (i % gridSubdivisions === 0 || j % gridSubdivisions === 0);
                  if (isMajor) continue;
                  const x = j * gridSize;
                  const y = i * gridSize;
                  ctx.moveTo(x + 0.8, y);
                  (ctx as unknown as CanvasRenderingContext2D).arc(x, y, 0.8, 0, Math.PI * 2);
                }
              }
              ctx.fill();
              if (gridSubdivisions > 0) {
                (ctx as unknown as CanvasRenderingContext2D).globalAlpha = Math.min(
                  gridOpacity * 1.5,
                  0.9,
                );
                ctx.beginPath();
                for (let i = 0; i <= gridMeta.numH; i += gridSubdivisions) {
                  for (let j = 0; j <= gridMeta.numW; j += gridSubdivisions) {
                    const x = j * gridSize;
                    const y = i * gridSize;
                    ctx.moveTo(x + 1.5, y);
                    (ctx as unknown as CanvasRenderingContext2D).arc(x, y, 1.5, 0, Math.PI * 2);
                  }
                }
                ctx.fill();
              }
            }
            ctx.restore();
            ctx.fillStrokeShape(shape);
          }}
        />
      )}
      {columnsMeta && (
        <Shape
          name="columns-shape"
          listening={false}
          perfectDrawEnabled={false}
          shadowForStrokeEnabled={false}
          hitStrokeWidth={0}
          sceneFunc={(ctx, shape) => {
            ctx.save();
            (ctx as unknown as CanvasRenderingContext2D).fillStyle = columnsColor;
            ctx.beginPath();
            for (let i = 0; i < columnsCount; i++) {
              const xPos = columnsMargin + i * (columnsMeta.colW + columnsGutter);
              ctx.rect(xPos, 0, columnsMeta.colW, canvasHeight);
            }
            ctx.fill();
            ctx.restore();
            ctx.fillStrokeShape(shape);
          }}
        />
      )}
    </Layer>
  );
});
