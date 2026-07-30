import React, { useEffect } from "react";
import { Image as KonvaImage, Group } from "react-konva";
import { useAsyncImage } from "@/hooks/use-async-image";
import Konva from "konva";
import { ImageElement } from "@/lib/editor-store";
import { getKonvaFilters } from "@/lib/konva-filters";
import { useRenderQuality } from "@/lib/render-quality";
import { useKonvaDrag } from "@/hooks/use-konva-drag";
import { ElementProps, propsAreEqual } from "./types";
import { MagicAiScanner } from "./magic-ai-scanner";
import "@/lib/custom-filters";

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
  const isDraggingFilter = useRenderQuality((s) => s.isDraggingFilter);
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
        scaleY: 1,
        duration: 0.28,
        easing: Konva.Easings.BackEaseOut
      });
    }
  }, [elementRef, element.opacity, element.flipX]);

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

  const hasFilters = filters.length > 0;

  useEffect(() => {
    const node = elementRef.current;
    if (!node || !image) return;

    if (!hasFilters) {
      if (node.isCached()) {
        try {
          node.clearCache();
        } catch (err) {
          // Ignore
        }
      }
      return;
    }

    try {
      const stageScale = node.getStage()?.scaleX() || 1;
      const deviceRatio = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
      const ratio = isDraggingFilter
        ? Math.max(0.25, Math.min(0.5, stageScale * 0.3))
        : Math.max(0.75, Math.min(2.5, stageScale * deviceRatio * 1.2));
      node.clearCache();
      node.cache({ pixelRatio: ratio });
    } catch (err) {
      console.warn("Failed to cache Konva image", err);
    }
  }, [image, hasFilters, elementRef, isDraggingFilter]);

  const flipped = element.flipX === true;
  const nodeX = flipped ? (element.x + element.width) * canvasWidth : element.x * canvasWidth;
  const nodeY = element.y * canvasHeight;
  const nodeW = element.width * canvasWidth;
  const nodeH = element.height * canvasHeight;

  return (
    <Group>
      <KonvaImage
        ref={elementRef}
        image={image}
        x={nodeX}
        y={nodeY}
        width={nodeW}
        height={nodeH}
        scaleX={flipped ? -1 : 1}
        scaleY={1}
        rotation={element.rotation}
        opacity={element.opacity}
        visible={element.visible !== false}
        id={element.id}
        perfectDrawEnabled={false}
        globalCompositeOperation={element.globalCompositeOperation as any || "source-over"}
        shadowColor={element.shadowColor}
        shadowBlur={element.shadowBlur || 0}
        shadowOffsetX={element.shadowOffsetX || 0}
        shadowOffsetY={element.shadowOffsetY || 0}
        shadowOpacity={element.shadowOpacity ?? 0}
        cornerRadius={element.cornerRadius || 0}
        onMouseDown={onMouseDown}
        onTouchStart={onTouchStart}
        onClick={onClick}
        onTap={onTap}
        filters={filters}
        brightness={filterProps.brightness}
        contrast={filterProps.contrast}
        blurRadius={element.blur || 0}
        hue={(filterProps as any).hue}
        saturation={(filterProps as any).saturation}
        draggable={!element.locked && isSelected}
        onDragStart={onDragStart}
        dragBoundFunc={dragBoundFunc}
        onDragMove={onDragMove}
        onDragEnd={onDragEnd}
      />
      {isEnhancing && (
        <MagicAiScanner
          targetNodeRef={elementRef}
          x={element.x * canvasWidth}
          y={nodeY}
          width={nodeW}
          height={nodeH}
          rotation={element.rotation}
        />
      )}
    </Group>
  );
}, propsAreEqual);
