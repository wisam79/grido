import Konva from 'konva';
import React, { useEffect } from 'react';
import { Group as KonvaGroup, Line as KonvaLine, Arrow as KonvaArrow } from 'react-konva';

import { useAsyncImage } from '@/hooks/use-async-image';
import { useKonvaDrag } from '@/hooks/use-konva-drag';
import { gradientStart, useCanvasColors, TEXT_COLOR_DEFAULT } from '@/lib/canvas/canvas-colors';
import { resolveLineCap, resolveStrokeDash } from '@/lib/canvas/shape-pattern';
import { getSvgPathBounds } from '@/lib/canvas/svg-path-bounds';

import { withShadowlessDrag } from './drag-shadow';
import { createElementSpaceSceneFunc, getFillProps } from './fill-utils';
import { FillableShapeGeometry } from './fillable-shape-geometry';
import { propsAreEqual } from './types';

import type { ElementProps } from './types';
import type { ShapeElement } from '@/lib/editor-store';

export const KonvaShapeElement = React.memo(function KonvaShapeElement({
  element: _element,
  isSelected,
  onMouseDown,
  onTouchStart,
  onClick,
  onTap,
  onChange: _onChange,
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
  // 🛡️ إعادة تصيير الأشكال بألوان الثيم الجديد (C5 — تدقيق 2026-10-08)
  useCanvasColors();
  const element = _element as ShapeElement;
  const w = element.width * canvasWidth;
  const h = element.height * canvasHeight;
  const flipped = element.flipX === true;
  const flippedY = element.flipY === true;
  const hasAnimatedRef = React.useRef(false);

  // صورة تعبئة الشكل (fillType='image'): تُحمَّل بالـhook الموحّد (كاش + LRU).
  // النداء غير مشروط — السلسلة الفارغة في غير وضع الصورة تعني "لا تحميل".
  const [fillImage] = useAsyncImage(element.fillType === 'image' ? element.fillImageSrc || '' : '');
  const isLinearShape = element.shape === 'line' || element.shape === 'arrow';
  const resolvedStrokeWidth = isLinearShape
    ? element.strokeWidth && element.strokeWidth > 0
      ? element.strokeWidth
      : 4
    : element.strokeWidth || 0;
  // أشكال المسار تُرسم بمقياس داخلي إلى viewBox — يُحسب مرة واحدة ليخدم
  // تعويض نقش الصورة وهندسة الرسم معاً (بلا حساب مزدوج)
  const pathBounds = element.shape === 'path' ? getSvgPathBounds(element.svgPath || '') : null;

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

  const isCentroidShape =
    element.shape === 'ellipse' ||
    element.shape === 'star' ||
    element.shape === 'polygon' ||
    element.shape === 'ring' ||
    element.shape === 'arc' ||
    element.shape === 'wedge';
  const fillSpace = pathBounds
    ? {
        scaleX: w / pathBounds.w,
        scaleY: h / pathBounds.h,
        originX: pathBounds.minX,
        originY: pathBounds.minY,
      }
    : isCentroidShape
      ? { originX: -w / 2, originY: -h / 2 }
      : undefined;

  const elementSpaceScene = React.useMemo(() => {
    if (
      element.fillType !== 'image' &&
      element.fillType !== 'linear' &&
      element.fillType !== 'radial'
    ) {
      return undefined;
    }
    if (pathBounds && w > 0 && h > 0) {
      return createElementSpaceSceneFunc(element, w, h, fillImage ?? null, [
        pathBounds.w / w,
        0,
        0,
        pathBounds.h / h,
        pathBounds.minX,
        pathBounds.minY,
      ]);
    }
    if (element.shape === 'arc' || element.shape === 'wedge') {
      // The geometry rotates -90°, not the paint. Invert T(center) R(-90°).
      return createElementSpaceSceneFunc(element, w, h, fillImage ?? null, [
        0,
        1,
        -1,
        0,
        h / 2,
        -w / 2,
      ]);
    }
    return undefined;
  }, [element, w, h, fillImage, pathBounds]);

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
    ...getFillProps(element, w, h, fillImage ?? null, fillSpace),
    stroke: isLinearShape
      ? element.stroke || element.fill || gradientStart()
      : element.strokeWidth && element.strokeWidth > 0
        ? element.stroke || TEXT_COLOR_DEFAULT
        : undefined,
    strokeWidth: resolvedStrokeWidth,
    // نمط الحد (متصل/متقطع/منقّط) — الـdash يتدرّج مع سماكة الحد الفعلية
    dash: resolveStrokeDash(element.strokeStyle, resolvedStrokeWidth),
    lineCap: resolveLineCap(element.strokeStyle, element.lineCap),
  };

  const renderShapeGeometry = () => {
    if (element.shape === 'line') {
      const strokeW = resolvedStrokeWidth;
      return (
        <KonvaLine
          {...commonVisualProps}
          x={0}
          y={0}
          height={h}
          points={[0, h / 2, w, h / 2]}
          hitStrokeWidth={Math.max(20, strokeW + 12)}
        />
      );
    }

    if (element.shape === 'arrow') {
      const strokeW = resolvedStrokeWidth;
      return (
        <KonvaArrow
          {...commonVisualProps}
          x={0}
          y={0}
          points={[0, h / 2, w, h / 2]}
          pointerLength={element.pointerLength ?? 14}
          pointerWidth={element.pointerWidth ?? 14}
          pointerAtBeginning={element.pointerAtBeginning === true}
          stroke={element.stroke || element.fill || gradientStart()}
          fill={element.fill || element.stroke || gradientStart()}
          // رأس السهم يُعبَّأ باللون المصمت دائماً — مطابق لمسار التصدير،
          // ويمنع أن يغلب نقش الصورة (fillPriority='pattern') على اللون
          fillPriority="color"
          strokeWidth={strokeW}
          hitStrokeWidth={Math.max(20, strokeW + 12)}
        />
      );
    }

    return (
      <FillableShapeGeometry
        element={element}
        w={w}
        h={h}
        pathBounds={pathBounds}
        visualProps={commonVisualProps}
        elementSpaceScene={elementSpaceScene}
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
