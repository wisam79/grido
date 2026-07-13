import React, { useEffect } from "react";
import { Image as KonvaImage } from "react-konva";
import { useAsyncImage } from "@/hooks/use-async-image";
import Konva from "konva";
import { ImageElement, useEditorStore } from "@/lib/editor-store";
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
      if (hasFilters) {
        try {
          const stage = node.getStage();
          const exportRatio = stage ? (useEditorStore.getState().canvasWidth / stage.width()) : 4;
          node.cache({
            pixelRatio: Math.max(2, exportRatio)
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

  // حساب القيم الكلية بدمج مرشحات الصور الجاهزة والتعديلات اليدوية
  let totalBrightness = element.brightness ?? 100;
  let totalContrast = element.contrast ?? 100;
  let totalSaturation = element.saturation ?? 100;
  let totalHue = 0;
  let useSepia = false;
  let useGrayscale = false;

  if (element.filter === "enhance") {
    totalContrast = (totalContrast / 100) * 108;
    totalSaturation = (totalSaturation / 100) * 112;
    totalBrightness = (totalBrightness / 100) * 102;
  } else if (element.filter === "skinGlow") {
    totalHue = 10;
    totalSaturation = (totalSaturation / 100) * 110;
    totalContrast = (totalContrast / 100) * 94;
    totalBrightness = (totalBrightness / 100) * 106;
  } else if (element.filter === "clarity") {
    totalContrast = (totalContrast / 100) * 122;
    totalSaturation = (totalSaturation / 100) * 120;
    totalBrightness = (totalBrightness / 100) * 98;
  } else if (element.filter === "lowlight") {
    totalBrightness = (totalBrightness / 100) * 116;
    totalContrast = (totalContrast / 100) * 90;
    totalSaturation = (totalSaturation / 100) * 105;
  } else if (element.filter === "cinematic") {
    useSepia = true;
    totalHue = 5;
    totalSaturation = (totalSaturation / 100) * 115;
    totalContrast = (totalContrast / 100) * 110;
    totalBrightness = (totalBrightness / 100) * 102;
  } else if (element.filter === "monoPro") {
    useGrayscale = true;
    totalContrast = (totalContrast / 100) * 125;
    totalBrightness = (totalBrightness / 100) * 102;
  }

  const filters: any[] = [];
  if (element.filter === "skinGlow" && (Konva.Filters as any).SkinGlow) {
    filters.push((Konva.Filters as any).SkinGlow);
  }
  if (useGrayscale) filters.push(Konva.Filters.Grayscale);
  if (useSepia) filters.push(Konva.Filters.Sepia);
  if (totalBrightness !== 100) filters.push(Konva.Filters.Brighten);
  if (totalContrast !== 100) filters.push(Konva.Filters.Contrast);
  if (totalSaturation !== 100 || totalHue !== 0) filters.push(Konva.Filters.HSL);
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
      brightness={totalBrightness !== 100 ? (totalBrightness - 100) / 100 : 0}
      contrast={totalContrast !== 100 ? totalContrast - 100 : 0}
      blurRadius={element.blur || 0}
      {...({
        hue: totalHue,
        saturation: totalSaturation !== 100 ? Math.log2(Math.max(1, totalSaturation) / 100) : 0
      } as any)}
      draggable={!element.locked && isSelected}
      onDragStart={onDragStart}
      dragBoundFunc={dragBoundFunc}
      onDragMove={onDragMove}
      onDragEnd={onDragEnd}
    />
  );
}, propsAreEqual);
