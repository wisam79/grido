import React, { useEffect } from 'react';
import {
  Group as KonvaGroup,
  Rect as KonvaRect,
  Ellipse as KonvaEllipse,
  Line as KonvaLine,
  Star as KonvaStar,
  Path as KonvaPath,
  Arrow as KonvaArrow,
  RegularPolygon as KonvaRegularPolygon,
  Ring as KonvaRing,
} from 'react-konva';
import Konva from 'konva';
import { ShapeElement } from '@/lib/editor-store';
import { useKonvaDrag } from '@/hooks/use-konva-drag';
import { ElementProps, propsAreEqual } from './types';
import { getFillProps } from './fill-utils';
import { withShadowlessDrag } from './drag-shadow';
import { VECTOR_SHAPES } from '@/lib/io/svg-paths';
import { gradientStart, TEXT_COLOR_DEFAULT } from '@/lib/canvas/canvas-colors';
import { resolveRingInnerRadius, ringOuterRadius } from '@/lib/canvas/ring-geometry';

interface SvgPathBounds {
  w: number;
  h: number;
  /** أقل إحداثي داخل المسار — يلزم لإزاحة الرسم ليملأ صندوق العنصر */
  minX: number;
  minY: number;
}

const pathBoundsCache = new Map<string, SvgPathBounds>();

function getSvgPathBounds(pathStr: string): SvgPathBounds {
  if (!pathStr) return { w: 24, h: 24, minX: 0, minY: 0 };
  const cached = pathBoundsCache.get(pathStr);
  if (cached) return cached;

  const def = VECTOR_SHAPES.find((s) => s.path === pathStr);
  if (def?.viewBox) {
    const res: SvgPathBounds = { w: def.viewBox.w, h: def.viewBox.h, minX: 0, minY: 0 };
    pathBoundsCache.set(pathStr, res);
    return res;
  }

  try {
    const segments = Konva.Path.parsePathData(pathStr);
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const seg of segments) {
      if (seg.points) {
        for (let i = 0; i < seg.points.length; i += 2) {
          const px = seg.points[i];
          const py = seg.points[i + 1];
          if (px !== undefined && py !== undefined) {
            minX = Math.min(minX, px);
            minY = Math.min(minY, py);
            maxX = Math.max(maxX, px);
            maxY = Math.max(maxY, py);
          }
        }
      }
    }
    const w = maxX > minX && isFinite(maxX) && isFinite(minX) ? maxX - minX : 24;
    const h = maxY > minY && isFinite(maxY) && isFinite(minY) ? maxY - minY : 24;
    const res: SvgPathBounds = {
      w,
      h,
      minX: isFinite(minX) ? minX : 0,
      minY: isFinite(minY) ? minY : 0,
    };
    pathBoundsCache.set(pathStr, res);
    return res;
  } catch {
    const fallback: SvgPathBounds = { w: 24, h: 24, minX: 0, minY: 0 };
    pathBoundsCache.set(pathStr, fallback);
    return fallback;
  }
}

export const KonvaShapeElement = React.memo(function KonvaShapeElement({
  element: _element,
  isSelected,
  onMouseDown,
  onTouchStart,
  onClick,
  onTap,
  onChange,
  canvasWidth,
  canvasHeight,
  setActiveGuides,
  elementRef,
  snapToGrid,
  gridSize,
  altPressedRef,
  shiftPressedRef,
  getKonvaNode,
}: ElementProps) {
  const element = _element as ShapeElement;
  const w = element.width * canvasWidth;
  const h = element.height * canvasHeight;
  const flipped = element.flipX === true;
  const flippedY = element.flipY === true;
  const hasAnimatedRef = React.useRef(false);

  const { onDragStart, dragBoundFunc, onDragMove, onDragEnd } = useKonvaDrag({
    element,
    canvasWidth,
    canvasHeight,
    snapToGrid,
    gridSize,
    altPressedRef,
    shiftPressedRef,
    getKonvaNode,
    setActiveGuides,
  });

  useEffect(() => {
    const node = elementRef.current;
    if (node && !hasAnimatedRef.current) {
      hasAnimatedRef.current = true;
      const targetOpacity = element.opacity;
      node.opacity(0);
      node.scale({ x: 0.8, y: 0.8 });
      (node as unknown as { to: (cfg: Record<string, unknown>) => void }).to({
        opacity: targetOpacity,
        scaleX: 1,
        scaleY: 1,
        duration: 0.28,
        easing: Konva.Easings.BackEaseOut,
      });
    }
  }, [elementRef, element.opacity]);

  const commonVisualProps = {
    perfectDrawEnabled: false,
    // 🚀 توصية Konva الرسمية (Optimize Strokes): لا ظل للحدود — الرسم
    // الداخلي المضاعف (stroke + shadow) يُلغى ويبقى ظل التعبئة فقط.
    shadowForStrokeEnabled: false,
    globalCompositeOperation:
      (element.globalCompositeOperation as GlobalCompositeOperation | undefined) || 'source-over',
    shadowColor: element.shadowColor,
    shadowBlur: element.shadowBlur || 0,
    shadowOffsetX: element.shadowOffsetX || 0,
    shadowOffsetY: element.shadowOffsetY || 0,
    shadowOpacity: element.shadowOpacity ?? 0,
    ...getFillProps(element, w, h),
    stroke:
      element.shape === 'line' || element.shape === 'arrow'
        ? element.stroke || element.fill || gradientStart()
        : element.strokeWidth && element.strokeWidth > 0
          ? element.stroke || TEXT_COLOR_DEFAULT
          : undefined,
    strokeWidth:
      element.shape === 'line' || element.shape === 'arrow'
        ? element.strokeWidth && element.strokeWidth > 0
          ? element.strokeWidth
          : 4
        : element.strokeWidth || 0,
  };

  const renderShapeGeometry = () => {
    if (element.shape === 'ellipse') {
      return (
        <KonvaEllipse {...commonVisualProps} x={w / 2} y={h / 2} radiusX={w / 2} radiusY={h / 2} />
      );
    }

    if (element.shape === 'line') {
      const strokeW = element.strokeWidth && element.strokeWidth > 0 ? element.strokeWidth : 4;
      const lineH = Math.max(h, strokeW, 16);
      return (
        <KonvaLine
          {...commonVisualProps}
          x={0}
          y={0}
          height={lineH}
          points={[0, lineH / 2, w, lineH / 2]}
          hitStrokeWidth={Math.max(20, strokeW + 12)}
        />
      );
    }

    if (element.shape === 'arrow') {
      const strokeW = element.strokeWidth && element.strokeWidth > 0 ? element.strokeWidth : 4;
      const arrowH = Math.max(h, strokeW, 16);
      return (
        <KonvaArrow
          {...commonVisualProps}
          x={0}
          y={0}
          points={[0, arrowH / 2, w, arrowH / 2]}
          pointerLength={element.pointerLength ?? 14}
          pointerWidth={element.pointerWidth ?? 14}
          stroke={element.stroke || element.fill || gradientStart()}
          fill={element.fill || element.stroke || gradientStart()}
          strokeWidth={strokeW}
          hitStrokeWidth={Math.max(20, strokeW + 12)}
        />
      );
    }

    if (element.shape === 'star') {
      return (
        <KonvaStar
          {...commonVisualProps}
          x={w / 2}
          y={h / 2}
          numPoints={5}
          innerRadius={Math.min(w, h) / 4}
          outerRadius={Math.min(w, h) / 2}
        />
      );
    }

    if (element.shape === 'polygon') {
      return (
        <KonvaRegularPolygon
          {...commonVisualProps}
          x={w / 2}
          y={h / 2}
          sides={element.sides ?? 6}
          radius={Math.min(w, h) / 2}
        />
      );
    }

    if (element.shape === 'ring') {
      const outerR = ringOuterRadius(w, h);
      const innerR = resolveRingInnerRadius(element.innerRadius, w, h);
      return (
        <KonvaRing
          {...commonVisualProps}
          x={w / 2}
          y={h / 2}
          innerRadius={innerR}
          outerRadius={outerR}
        />
      );
    }

    if (element.shape === 'path') {
      const bounds = getSvgPathBounds(element.svgPath || '');
      // المسار قد لا يبدأ عند (0,0) — الإزاحة تجعله يملأ صندوق العنصر بدل
      // أن يترك فراغاً بحسب الإحداثي الأدنى داخل المسار
      const scaleX = w / bounds.w;
      const scaleY = h / bounds.h;
      return (
        <KonvaPath
          {...commonVisualProps}
          x={-bounds.minX * scaleX}
          y={-bounds.minY * scaleY}
          data={element.svgPath || ''}
          scaleX={scaleX}
          scaleY={scaleY}
        />
      );
    }

    return (
      <KonvaRect
        {...commonVisualProps}
        x={0}
        y={0}
        width={w}
        height={h}
        cornerRadius={element.radius || 0}
      />
    );
  };

  // 🚀 إطفاء الظلال أثناء السحب بلا إعادة رسم React (انظر drag-shadow.ts).
  const { handleStart: handleShadowlessStart, handleEnd: handleShadowlessEnd } = withShadowlessDrag(
    () => elementRef.current as unknown as Konva.Group | null,
    onDragStart,
    onDragEnd,
  );

  return (
    <KonvaGroup
      ref={elementRef as unknown as React.Ref<Konva.Group>}
      x={element.x * canvasWidth}
      y={element.y * canvasHeight}
      width={w}
      height={h}
      scaleX={1}
      scaleY={1}
      rotation={element.rotation}
      opacity={element.opacity}
      visible={element.visible !== false}
      id={element.id}
      draggable={!element.locked && isSelected}
      onDragStart={handleShadowlessStart}
      dragBoundFunc={dragBoundFunc}
      onDragMove={onDragMove}
      onDragEnd={handleShadowlessEnd}
      onMouseDown={onMouseDown}
      onTouchStart={onTouchStart}
      onClick={onClick}
      onTap={onTap}
    >
      <KonvaGroup
        x={w / 2}
        y={h / 2}
        offsetX={w / 2}
        offsetY={h / 2}
        scaleX={flipped ? -1 : 1}
        scaleY={flippedY ? -1 : 1}
        width={w}
        height={h}
      >
        {renderShapeGeometry()}
      </KonvaGroup>
    </KonvaGroup>
  );
}, propsAreEqual);
