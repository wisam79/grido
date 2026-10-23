import React, { useMemo } from 'react';
import { Layer, Rect } from 'react-konva';

import { gradientPixelPoints } from '@/lib/canvas/gradient-geometry';

import { ColumnsLayer } from '../elements/columns-layer';
import { GridLayer } from '../elements/grid-layer';
// 🎨 هندسة تدرج الورقة موحّدة مع التصدير (lib/canvas/gradient-geometry)

interface KonvaBackgroundLayerProps {
  canvasWidth: number;
  canvasHeight: number;
  stageScale?: number;
  checkerPattern?: HTMLCanvasElement | null;
  backgroundColor: string;
  /** لون نهاية التدرج — غيابه يعني تعبئة مصمتة */
  backgroundGradientColor2?: string | null;
  /** زاوية التدرج الخطي بالدرجات (0° = يسار→يمين مع عقارب الساعة) */
  backgroundGradientAngle?: number;
  mode: 'single' | 'collage';
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
}

export const KonvaBackgroundLayer = React.memo(function KonvaBackgroundLayer({
  canvasWidth,
  canvasHeight,
  stageScale = 1,
  checkerPattern,
  backgroundColor,
  backgroundGradientColor2,
  backgroundGradientAngle = 135,
  mode: _mode,
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

  return (
    <Layer listening={false}>
      {/* 📄 مستطيل ظل الورقة والخلفية الأساسية */}
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
        shadowBlur={24 / Math.max(0.001, stageScale)}
        shadowOffset={{ x: 0, y: 8 / Math.max(0.001, stageScale) }}
        shadowOpacity={0.35}
        perfectDrawEnabled={false}
      />

      {/* Background Color / Gradient Layer */}
      <Rect
        name="bg-rect"
        width={canvasWidth}
        height={canvasHeight}
        // التدرج والمصمت حصريان — Konva يعطي أولوية fill المصمت إن حضر معه التدرج
        fill={!hasGradient && backgroundColor !== 'transparent' ? backgroundColor : undefined}
        fillLinearGradientStartPoint={hasGradient ? gradient.start : undefined}
        fillLinearGradientEndPoint={hasGradient ? gradient.end : undefined}
        fillLinearGradientColorStops={
          hasGradient ? [0, backgroundColor, 1, backgroundGradientColor2 as string] : undefined
        }
        listening={false}
        perfectDrawEnabled={false}
      />

      {/* Grid Layer */}
      <GridLayer
        showGrid={showGrid}
        gridSize={gridSize}
        gridColor={gridColor}
        gridOpacity={gridOpacity}
        gridSubdivisions={gridSubdivisions}
        gridType={gridType}
        displayW={canvasWidth}
        displayH={canvasHeight}
      />

      {/* Columns Layout Layer */}
      <ColumnsLayer
        showColumns={showColumns}
        columnsMargin={columnsMargin}
        columnsGutter={columnsGutter}
        columnsCount={columnsCount}
        columnsColor={columnsColor}
        displayW={canvasWidth}
        displayH={canvasHeight}
      />
    </Layer>
  );
});
