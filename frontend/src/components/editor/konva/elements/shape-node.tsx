import React, { useEffect } from "react";
import { 
  Rect as KonvaRect, 
  Ellipse as KonvaEllipse, 
  Line as KonvaLine, 
  Star as KonvaStar, 
  Path as KonvaPath 
} from "react-konva";
import Konva from "konva";
import { ShapeElement, useEditorStore } from "@/lib/editor-store";
import { useKonvaDrag } from "@/hooks/use-konva-drag";
import { ElementProps, propsAreEqual } from "./types";
import { getFillProps } from "./fill-utils";

export const KonvaShapeElement = React.memo(function KonvaShapeElement({ 
  element: _element, 
  isSelected, 
  onMouseDown,
  onTouchStart,
  onClick,
  onTap, 
  onChange, 
  displayW, 
  displayH, 
  setActiveGuides, 
  elementRef, 
  snapToGrid, 
  gridSize, 
  altPressedRef, 
  getKonvaNode 
}: ElementProps) {
  const element = _element as ShapeElement;
  const w = element.width * displayW;
  const h = element.height * displayH;
  const flipped = element.flipX === true;
  const hasAnimatedRef = React.useRef(false);

  const {
    onDragStart,
    dragBoundFunc,
    onDragMove,
    onDragEnd,
  } = useKonvaDrag({
    element,
    displayW,
    displayH,
    snapToGrid,
    gridSize,
    altPressedRef,
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
      node.to({
        opacity: targetOpacity,
        scaleX: element.flipX === true ? -1 : 1,
        scaleY: 1,
        duration: 0.28,
        easing: Konva.Easings.BackEaseOut
      });
    }
  }, [elementRef, element.opacity, element.flipX]);

  const shapeProps = {
    ref: elementRef,
    x: flipped ? (element.x + element.width) * displayW : element.x * displayW,
    y: element.y * displayH,
    width: w,
    height: h,
    scaleX: flipped ? -1 : 1,
    rotation: element.rotation,
    opacity: element.opacity,
    visible: element.visible !== false,
    id: element.id,
    globalCompositeOperation: element.globalCompositeOperation as any || "source-over",
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
    stroke: element.strokeWidth && element.strokeWidth > 0 ? element.stroke || "#000000" : undefined,
    strokeWidth: element.strokeWidth || 0,
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
        radiusX={w / 2}
        radiusY={h / 2}
        offsetX={-w / 2}
        offsetY={-h / 2}
      />
    );
  }

  if (element.shape === "line") {
    return (
      <KonvaLine
        {...shapeProps}
        points={[0, h / 2, w, h / 2]}
      />
    );
  }

  if (element.shape === "star") {
    return (
      <KonvaStar
        {...shapeProps}
        numPoints={5}
        innerRadius={Math.min(w, h) / 4}
        outerRadius={Math.min(w, h) / 2}
        offsetX={-w / 2}
        offsetY={-h / 2}
      />
    );
  }

  if (element.shape === "path") {
    return (
      <KonvaPath
        {...shapeProps}
        data={element.svgPath || ""}
      />
    );
  }

  return (
    <KonvaRect
      {...shapeProps}
      cornerRadius={element.radius || 0}
    />
  );
}, propsAreEqual);
