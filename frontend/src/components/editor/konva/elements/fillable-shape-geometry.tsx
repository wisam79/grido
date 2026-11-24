import {
  Rect as KonvaRect,
  Ellipse as KonvaEllipse,
  Star as KonvaStar,
  Path as KonvaPath,
  RegularPolygon as KonvaRegularPolygon,
  Ring as KonvaRing,
  Arc as KonvaArc,
  Wedge as KonvaWedge,
} from 'react-konva';

import { resolveRingInnerRadius, ringOuterRadius } from '@/lib/canvas/ring-geometry';
import { getSvgPathBounds } from '@/lib/canvas/svg-path-bounds';

import type { SvgPathBounds } from '@/lib/canvas/svg-path-bounds';
import type { ShapeElement } from '@/lib/store/types';
import type Konva from 'konva';

interface FillableShapeGeometryProps {
  element: ShapeElement;
  w: number;
  h: number;
  pathBounds?: SvgPathBounds | null;
  visualProps: Konva.ShapeConfig;
  elementSpaceScene?: (context: Konva.Context, shape: Konva.Shape) => void;
}

/**
 * مصدر الحقيقة الموحّد لهندسة الأشكال القابلة للتعبئة في Konva — يتشاركه راسم العنصر
 * الفعلي وطبقة إبراز هدف الإفلات لتطابق الحدود والانحناءات والنجوم والمسارات.
 */
export function FillableShapeGeometry({
  element,
  w,
  h,
  pathBounds,
  visualProps,
  elementSpaceScene,
}: FillableShapeGeometryProps) {
  if (element.shape === 'ellipse') {
    return <KonvaEllipse {...visualProps} x={w / 2} y={h / 2} radiusX={w / 2} radiusY={h / 2} />;
  }

  if (element.shape === 'star') {
    const outerR = Math.min(w, h) / 2;
    return (
      <KonvaStar
        {...visualProps}
        x={w / 2}
        y={h / 2}
        numPoints={Math.max(3, Math.round(element.starPoints ?? 5))}
        innerRadius={outerR * (element.starInnerRatio ?? 0.5)}
        outerRadius={outerR}
      />
    );
  }

  if (element.shape === 'polygon') {
    return (
      <KonvaRegularPolygon
        {...visualProps}
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
      <KonvaRing {...visualProps} x={w / 2} y={h / 2} innerRadius={innerR} outerRadius={outerR} />
    );
  }

  // قوس حلقي (شريحة حلقة) — Konva.Arc الأصلي: نصف قطر داخلي/خارجي + زاوية.
  // rotation=-90 يجعل الزاوية تبدأ من أعلى الشكل (موضع عقارب 12) لا من يمينه.
  if (element.shape === 'arc') {
    return (
      <KonvaArc
        {...visualProps}
        x={w / 2}
        y={h / 2}
        innerRadius={resolveRingInnerRadius(element.innerRadius, w, h)}
        outerRadius={ringOuterRadius(w, h)}
        angle={element.arcAngle ?? 270}
        rotation={-90}
        sceneFunc={elementSpaceScene}
      />
    );
  }

  // قطاع دائري (بيتزا) — Konva.Wedge الأصلي: نصف قطر + زاوية من أعلى الشكل
  if (element.shape === 'wedge') {
    return (
      <KonvaWedge
        {...visualProps}
        x={w / 2}
        y={h / 2}
        radius={Math.min(w, h) / 2}
        angle={element.arcAngle ?? 90}
        rotation={-90}
        sceneFunc={elementSpaceScene}
      />
    );
  }

  if (element.shape === 'path') {
    const bounds = pathBounds ?? getSvgPathBounds(element.svgPath || '');
    // المسار قد لا يبدأ عند (0,0) — الإزاحة تجعله يملأ صندوق العنصر بدل
    // أن يترك فراغاً بحسب الإحداثي الأدنى داخل المسار
    const scaleX = w / bounds.w;
    const scaleY = h / bounds.h;
    return (
      <KonvaPath
        {...visualProps}
        x={-bounds.minX * scaleX}
        y={-bounds.minY * scaleY}
        data={element.svgPath || ''}
        scaleX={scaleX}
        scaleY={scaleY}
        sceneFunc={elementSpaceScene}
      />
    );
  }

  return (
    <KonvaRect
      {...visualProps}
      x={0}
      y={0}
      width={w}
      height={h}
      cornerRadius={element.radiusCorners ?? element.radius ?? 0}
    />
  );
}
