import React, { useEffect, useRef } from "react";
import { Image as KonvaImage } from "react-konva";
import { useAsyncImage } from "@/hooks/use-async-image";
import Konva from "konva";
import { ImageElement } from "@/lib/editor-store";
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

  const cacheTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const filterHash = `${element.filter}|${element.brightness}|${element.contrast}|${element.saturation}|${element.blur}`;

  useEffect(() => {
    const node = elementRef.current;
    if (!node || !image) return;

    const isLargeImage = image.width * image.height > 1000000;
    if (!hasFilters && !isLargeImage) {
      try {
        node.clearCache();
      } catch (err) {
        // Ignore
      }
      return;
    }

    if (cacheTimerRef.current) clearTimeout(cacheTimerRef.current);
    cacheTimerRef.current = setTimeout(() => {
      if (!elementRef.current) return;
      const n = elementRef.current;
      try {
        let ratio = typeof window !== 'undefined' ? window.devicePixelRatio : 1;
        ratio = Math.max(1.5, Math.min(2, ratio));
        n.clearCache();
        n.cache({ pixelRatio: ratio });
      } catch (err) {
        console.warn("Failed to cache Konva image", err);
      }
    }, 150);

    return () => {
      if (cacheTimerRef.current) {
        clearTimeout(cacheTimerRef.current);
        cacheTimerRef.current = null;
      }
      if (node) {
        try {
          node.clearCache();
        } catch (err) {
          // Ignore
        }
      }
    };
  }, [
    image,
    hasFilters,
    elementRef,
    filterHash,
  ]);

  const { filters, filterProps } = React.useMemo(() => {
    const res = getKonvaFilters({
      filter: element.filter,
      brightness: element.brightness,
      contrast: element.contrast,
      saturation: element.saturation
    });
    const list = [...res.filters];
    if (element.blur && element.blur > 0) list.push(Konva.Filters.Blur);
    return { filters: list, filterProps: res };
  }, [element.filter, element.brightness, element.contrast, element.saturation, element.blur]);

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
