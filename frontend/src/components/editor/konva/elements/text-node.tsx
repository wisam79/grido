import React, { useEffect } from "react";
import { Text as KonvaText } from "react-konva";
import Konva from "konva";
import { TextElement, useEditorStore } from "@/lib/editor-store";
import { useKonvaDrag } from "@/hooks/use-konva-drag";
import { ElementProps, propsAreEqual } from "./types";
import { getFillProps } from "./fill-utils";

export const KonvaTextElement = React.memo(function KonvaTextElement({ 
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
  onDblClick, 
  getKonvaNode 
}: ElementProps) {
  const element = _element as TextElement;
  const editingTextId = useEditorStore((state) => state.editingTextId);
  const canvasWidth = useEditorStore((state) => state.canvasWidth) || 2480;
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
      const targetOpacity = editingTextId === element.id ? 0 : element.opacity;
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
  }, [elementRef, element.opacity, element.flipX, editingTextId, element.id]);
  
  // Sync auto height back to store so bounding boxes and overlays stay perfect
  useEffect(() => {
    const node = elementRef.current;
    if (node) {
      const actualHeight = node.height() / displayH;
      if (Math.abs(actualHeight - element.height) > 0.005) {
        onChange({ height: actualHeight });
      }
    }
  }, [element.text, element.fontSize, element.fontFamily, element.fontWeight, element.fontStyle, element.textAlign, element.color, element.width, element.id, displayH, element.height, elementRef, onChange]);

  const flipped = element.flipX === true;
  const w = element.width * displayW;
  const h = element.height * displayH;

  return (
    <KonvaText
      ref={elementRef}
      text={element.text || ""}
      x={flipped ? (element.x + element.width) * displayW : element.x * displayW}
      y={element.y * displayH}
      width={w}
      scaleX={flipped ? -1 : 1}
      rotation={element.rotation}
      opacity={editingTextId === element.id ? 0 : element.opacity}
      visible={element.visible !== false}
      id={element.id}
      globalCompositeOperation={element.globalCompositeOperation as any || "source-over"}
      shadowColor={element.shadowColor}
      shadowBlur={element.shadowBlur || 0}
      shadowOffsetX={element.shadowOffsetX || 0}
      shadowOffsetY={element.shadowOffsetY || 0}
      shadowOpacity={element.shadowOpacity ?? 0}
      onMouseDown={onMouseDown}
      onTouchStart={onTouchStart}
      onClick={onClick}
      onTap={onTap}
      onDblClick={onDblClick}
      onDblTap={onDblClick}
      fontSize={element.fontSize ? element.fontSize * (displayW / canvasWidth) : 16}
      fontStyle={[
        element.fontStyle === "italic" ? "italic" : "",
        element.fontWeight ? String(element.fontWeight) : "400",
      ].filter(Boolean).join(" ")}
      {...getFillProps(element, w, h)}
      fontFamily={element.fontFamily || "sans-serif"}
      align={element.textAlign || "center"}
      lineHeight={element.lineHeight ?? 1.2}
      letterSpacing={element.letterSpacing ? element.letterSpacing * (displayW / canvasWidth) : 0}
      stroke={element.strokeWidth ? (element.stroke || "#000000") : undefined}
      strokeWidth={element.strokeWidth ? element.strokeWidth * (displayW / canvasWidth) : undefined}
      textDecoration={element.textDecoration || ""}
      draggable={!element.locked && isSelected}
      onDragStart={onDragStart}
      dragBoundFunc={dragBoundFunc}
      onDragMove={onDragMove}
      onDragEnd={onDragEnd}
    />
  );
}, propsAreEqual);
