import React, { useEffect } from "react";
import { 
  Rect as KonvaRect, 
  Ellipse as KonvaEllipse, 
  Line as KonvaLine, 
  Star as KonvaStar, 
  Path as KonvaPath 
} from "react-konva";
import Konva from "konva";
import { ShapeElement } from "@/lib/editor-store";
import { useKonvaDrag } from "@/hooks/use-konva-drag";
import { ElementProps, propsAreEqual } from "./types";
import { getFillProps } from "./fill-utils";
import { VECTOR_SHAPES } from "@/lib/io/svg-paths";
import { gradientStart, TEXT_COLOR_DEFAULT } from "@/lib/canvas/canvas-colors";

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
  getKonvaNode 
}: ElementProps) {
  const element = _element as ShapeElement;
  const w = element.width * canvasWidth;
  const h = element.height * canvasHeight;
  const flipped = element.flipX === true;
  const flippedY = element.flipY === true;
  const hasAnimatedRef = React.useRef(false);

  const {
    onDragStart,
    dragBoundFunc,
    onDragMove,
    onDragEnd,
  } = useKonvaDrag({
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
        scaleX: element.flipX === true ? -1 : 1,
        scaleY: element.flipY === true ? -1 : 1,
        duration: 0.28,
        easing: Konva.Easings.BackEaseOut
      });
    }
  }, [elementRef, element.opacity, element.flipX, element.flipY]);

  const shapeProps = {
    x: flipped ? (element.x + element.width) * canvasWidth : element.x * canvasWidth,
    y: flippedY ? (element.y + element.height) * canvasHeight : element.y * canvasHeight,
    width: w,
    height: h,
    scaleX: flipped ? -1 : 1,
    scaleY: flippedY ? -1 : 1,
    rotation: element.rotation,
    opacity: element.opacity,
    visible: element.visible !== false,
    id: element.id,
    perfectDrawEnabled: false,
    globalCompositeOperation: (element.globalCompositeOperation as GlobalCompositeOperation | undefined) || "source-over",
    shadowColor: element.shadowColor,
    shadowBlur: element.shadowBlur || 0,
    shadowOffsetX: element.shadowOffsetX || 0,
    shadowOffsetY: element.shadowOffsetY || 0,
    shadowOpacity: element.shadowOpacity ?? 0,
    cornerRadius: element.cornerRadius || 0,
    onMouseDown: onMouseDown,
    onTouchStart: onTouchStart,
    onClick: onClick,
    onTap: onTap,
    ...getFillProps(element, w, h),
    stroke: element.shape === "line" 
      ? (element.stroke || element.fill || gradientStart()) 
      : (element.strokeWidth && element.strokeWidth > 0 ? element.stroke || TEXT_COLOR_DEFAULT : undefined),
    strokeWidth: element.shape === "line" 
      ? (element.strokeWidth && element.strokeWidth > 0 ? element.strokeWidth : 4) 
      : (element.strokeWidth || 0),
    draggable: !element.locked && isSelected,
    onDragStart,
    dragBoundFunc,
    onDragMove,
    onDragEnd,
  };

  if (element.shape === "ellipse") {
    return (
      <KonvaEllipse
        {...shapeProps}
        ref={elementRef as unknown as React.Ref<Konva.Ellipse>}
        radiusX={w / 2}
        radiusY={h / 2}
        offsetX={-w / 2}
        offsetY={-h / 2}
      />
    );
  }

  if (element.shape === "line") {
    const strokeW = element.strokeWidth && element.strokeWidth > 0 ? element.strokeWidth : 4;
    const lineH = Math.max(h, strokeW, 16);
    return (
      <KonvaLine
        {...shapeProps}
        ref={elementRef as unknown as React.Ref<Konva.Line>}
        height={lineH}
        points={[0, lineH / 2, w, lineH / 2]}
        hitStrokeWidth={Math.max(30, strokeW + 20)}
      />
    );
  }

  if (element.shape === "star") {
    return (
      <KonvaStar
        {...shapeProps}
        ref={elementRef as unknown as React.Ref<Konva.Star>}
        numPoints={5}
        innerRadius={Math.min(w, h) / 4}
        outerRadius={Math.min(w, h) / 2}
        offsetX={-w / 2}
        offsetY={-h / 2}
      />
    );
  }

  if (element.shape === "path") {
    // قياس المسار المتجه ليملأ صندوق العنصر (المسارات بإطارات مرجعية مختلفة الأحجام)
    const def = VECTOR_SHAPES.find((s) => s.path === element.svgPath);
    const vbW = def?.viewBox.w || 24;
    const vbH = def?.viewBox.h || 24;
    return (
      <KonvaPath
        {...shapeProps}
        ref={elementRef as unknown as React.Ref<Konva.Path>}
        data={element.svgPath || ""}
        scaleX={(flipped ? -1 : 1) * (w / vbW)}
        scaleY={(flippedY ? -1 : 1) * (h / vbH)}
      />
    );
  }

  return (
    <KonvaRect
      {...shapeProps}
      ref={elementRef as unknown as React.Ref<Konva.Rect>}
      cornerRadius={element.radius || 0}
    />
  );
}, propsAreEqual);
