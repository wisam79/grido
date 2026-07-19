import React, { useEffect } from "react";
import { Image as KonvaImage } from "react-konva";
import { useAsyncImage } from "@/hooks/use-async-image";
import Konva from "konva";
import { ImageElement, useEditorStore } from "@/lib/editor-store";
import { getKonvaFilters } from "@/lib/konva-filters";
import { useKonvaDrag } from "@/hooks/use-konva-drag";
import { ElementProps, propsAreEqual } from "./types";
import "@/lib/custom-filters";

export const URLImage = React.memo(function URLImage({ 
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
  const element = _element as ImageElement;
  const [image] = useAsyncImage(element.imageSrc || "");
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

  const hasFilters = !!(
    element.filter ||
    (element.brightness !== undefined && element.brightness !== 100) ||
    (element.contrast !== undefined && element.contrast !== 100) ||
    (element.saturation !== undefined && element.saturation !== 100) ||
    (element.blur !== undefined && element.blur > 0)
  );

  useEffect(() => {
    const node = elementRef.current;
    if (node && image) {
      const isLargeImage = image.width * image.height > 1000000;
      if (hasFilters || isLargeImage) {
        try {
          const stage = node.getStage();
          const stageW = stage ? stage.width() : 0;
          const exportRatio = stageW > 0 ? (useEditorStore.getState().canvasWidth / stageW) : 4;
          let ratio = Math.max(2, exportRatio);
          
          // حماية إضافية ضد قيم غير محدودة أو NaN أو كبيرة جداً قد تسبب انهيار الرندرة واختفاء الكانفس
          if (!isFinite(ratio) || isNaN(ratio) || ratio > 8) {
            ratio = 2;
          }
          
          node.clearCache();
          node.cache({
            pixelRatio: ratio
          });
        } catch (err) {
          console.warn("Failed to cache Konva image", err);
        }
      } else {
        try {
          node.clearCache();
        } catch (err) {
          // Ignore
        }
      }
    }
    return () => {
      if (node) {
        try {
          node.clearCache();
        } catch (err) {
          console.warn("Failed to clear Konva image cache", err);
        }
      }
    };
  }, [
    image,
    hasFilters,
    element.width,
    element.height,
    displayW,
    displayH,
    elementRef,
    element.filter,
    element.brightness,
    element.contrast,
    element.saturation,
    element.blur,
  ]);

  const filterProps = React.useMemo(() => getKonvaFilters({
    filter: element.filter,
    brightness: element.brightness,
    contrast: element.contrast,
    saturation: element.saturation
  }), [element.filter, element.brightness, element.contrast, element.saturation]);

  const filters = [...filterProps.filters];
  if (element.blur && element.blur > 0) filters.push(Konva.Filters.Blur);

  const flipped = element.flipX === true;

  return (
    <KonvaImage
      ref={elementRef}
      image={image}
      x={flipped ? (element.x + element.width) * displayW : element.x * displayW}
      y={element.y * displayH}
      width={element.width * displayW}
      height={element.height * displayH}
      scaleX={flipped ? -1 : 1}
      rotation={element.rotation}
      opacity={element.opacity}
      visible={element.visible !== false}
      id={element.id}
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
      {...({
        hue: filterProps.hue,
        saturation: filterProps.saturation
      } as any)}
      draggable={!element.locked && isSelected}
      onDragStart={onDragStart}
      dragBoundFunc={dragBoundFunc}
      onDragMove={onDragMove}
      onDragEnd={onDragEnd}
    />
  );
}, propsAreEqual);
