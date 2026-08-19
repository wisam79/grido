import React, { useEffect } from "react";
import { Image as KonvaImage, Group, Rect } from "react-konva";
import { useAsyncImage } from "@/hooks/use-async-image";
import Konva from "konva";
import { ImageElement } from "@/lib/editor-store";
import { getKonvaFilters } from "@/lib/filters/konva-filters";
import { useRenderQuality } from "@/lib/canvas/render-quality";
import { useFilterCache } from "@/hooks/use-filter-cache";
import { useKonvaDrag } from "@/hooks/use-konva-drag";
import { ElementProps, propsAreEqual } from "./types";
import { MagicAiScanner } from "./magic-ai-scanner";
import "@/lib/filters/custom-filters";

export const URLImage = React.memo(function URLImage({ 
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
  getKonvaNode 
}: ElementProps) {
  const element = _element as ImageElement;
  const [image] = useAsyncImage(element.imageSrc || "");
  const hasAnimatedRef = React.useRef(false);
  const enhancingElementId = useRenderQuality((s) => s.enhancingElementId);
  const isEnhancing = enhancingElementId === element.id;

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
        scaleY: element.flipY === true ? -1 : 1,
        duration: 0.28,
        easing: Konva.Easings.BackEaseOut
      });
    }
  }, [elementRef, element.opacity, element.flipX, element.flipY]);

  const { filters, filterProps } = React.useMemo(() => {
    const res = getKonvaFilters({
      filter: element.filter,
      brightness: element.brightness,
      contrast: element.contrast,
      saturation: element.saturation
    });
    if (element.blur && element.blur > 0) {
      res.filters.push(Konva.Filters.Blur);
    }
    return { filters: res.filters, filterProps: res };
  }, [element.filter, element.brightness, element.contrast, element.saturation, element.blur]);

  const imageNodeRef = React.useRef<any>(null);
  const filterKey = `${element.filter}_${element.brightness}_${element.contrast}_${element.saturation}_${element.blur}_${element.width}_${element.height}`;
  const hasFilters = filters.length > 0;

  useFilterCache({ nodeRef: imageNodeRef, image, hasFilters, canvasWidth, filterKey });

  const flipped = element.flipX === true;
  const flippedY = element.flipY === true;
  const nodeX = flipped ? (element.x + element.width) * canvasWidth : element.x * canvasWidth;
  const nodeY = flippedY ? (element.y + element.height) * canvasHeight : element.y * canvasHeight;
  const nodeW = element.width * canvasWidth;
  const nodeH = element.height * canvasHeight;

  return (
    <Group
      ref={elementRef}
      x={nodeX}
      y={nodeY}
      width={nodeW}
      height={nodeH}
      scaleX={flipped ? -1 : 1}
      scaleY={flippedY ? -1 : 1}
      rotation={element.rotation || 0}
      opacity={element.opacity}
      visible={element.visible !== false}
      id={element.id}
      draggable={!element.locked && isSelected}
      onDragStart={onDragStart}
      dragBoundFunc={dragBoundFunc}
      onDragMove={onDragMove}
      onDragEnd={onDragEnd}
      onMouseDown={onMouseDown}
      onTouchStart={onTouchStart}
      onClick={onClick}
      onTap={onTap}
    >
      {element.bgColor && element.bgColor !== "transparent" && (
        <Rect
          x={0}
          y={0}
          width={nodeW}
          height={nodeH}
          fill={element.bgColor}
          cornerRadius={element.cornerRadius || 0}
          listening={false}
        />
      )}
      <KonvaImage
        ref={imageNodeRef}
        image={image}
        x={0}
        y={0}
        width={nodeW}
        height={nodeH}
        perfectDrawEnabled={false}
        shadowColor={element.shadowColor}
        shadowBlur={element.shadowBlur || 0}
        shadowOffsetX={element.shadowOffsetX || 0}
        shadowOffsetY={element.shadowOffsetY || 0}
        shadowOpacity={element.shadowOpacity ?? 0}
        cornerRadius={element.cornerRadius || 0}
        filters={filters}
        brightness={filterProps.brightness}
        contrast={filterProps.contrast}
        blurRadius={element.blur || 0}
        hue={(filterProps as any).hue}
        saturation={(filterProps as any).saturation}
      />
      {isEnhancing && (
        <MagicAiScanner
          targetNodeRef={elementRef}
          x={0}
          y={0}
          width={nodeW}
          height={nodeH}
          rotation={0}
          cornerRadius={element.cornerRadius || 0}
        />
      )}
    </Group>
  );
}, propsAreEqual);
