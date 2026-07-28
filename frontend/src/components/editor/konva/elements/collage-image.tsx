import React, { useRef, useEffect, useMemo } from "react";
import { Image as KonvaImage } from "react-konva";
import { useAsyncImage } from "@/hooks/use-async-image";
import { getKonvaFilters } from "@/lib/konva-filters";
import { useRenderQuality } from "@/lib/render-quality";

export const KonvaCollageImage = React.memo(function KonvaCollageImage({
  imageSrc,
  width,
  height,
  filter,
  brightness,
  contrast,
  saturation,
  zoom = 1,
  dragX = 0,
  dragY = 0,
  draggable = false,
  cornerRadius = 0,
  onUpdateOffsets,
  onDragEnd,
  onClick,
  onDblClick
}: {
  imageSrc: string;
  width: number;
  height: number;
  filter?: string;
  brightness?: number;
  contrast?: number;
  saturation?: number;
  zoom?: number;
  dragX?: number;
  dragY?: number;
  draggable?: boolean;
  cornerRadius?: number;
  onUpdateOffsets?: (x: number, y: number) => void;
  onDragEnd?: () => void;
  onClick?: () => void;
  onDblClick?: () => void;
}) {
  const [image] = useAsyncImage(imageSrc);
  const imageRef = useRef<any>(null);
  const accumulatedDrag = useRef<{ dragX: number; dragY: number }>({ dragX, dragY });
  const isDraggingFilter = useRenderQuality((s) => s.isDraggingFilter);

  useEffect(() => {
    accumulatedDrag.current = { dragX, dragY };
  }, [dragX, dragY]);

  const filterResult = useMemo(() => getKonvaFilters({
    filter, brightness, contrast, saturation
  }), [filter, brightness, contrast, saturation]);

  const hasFilters = filterResult.filters.length > 0;

  useEffect(() => {
    const node = imageRef.current;
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
      const ratio = isDraggingFilter
        ? Math.max(0.25, Math.min(0.5, stageScale * 0.3))
        : Math.max(0.5, Math.min(1.5, stageScale * 1.2));
      node.clearCache();
      node.cache({ pixelRatio: ratio });
    } catch (err) {
      console.warn("Failed to cache collage image", err);
    }
  }, [image, hasFilters, isDraggingFilter]);

  if (!image) return null;

  // object-fit: cover
  const imgAspect = image.width / image.height;
  const slotAspect = width / height;
  let sw = image.width;
  let sh = image.height;

  if (imgAspect > slotAspect) {
    sw = image.height * slotAspect;
  } else {
    sh = image.width / slotAspect;
  }

  // Apply zoom factor
  sw = sw / zoom;
  sh = sh / zoom;

  // Default centering offset
  const defaultSx = imgAspect > slotAspect ? (image.width - sw) / 2 : 0;
  const defaultSy = imgAspect > slotAspect ? 0 : (image.height - sh) / 2;

  // Max bounds for offset X and Y
  const maxDragX = (image.width - sw) / 2;
  const maxDragY = (image.height - sh) / 2;

  // Clamp the drag offsets to ensure crop window stays within the image boundaries
  const dragXClamped = Math.max(-maxDragX, Math.min(maxDragX, dragX));
  const dragYClamped = Math.max(-maxDragY, Math.min(maxDragY, dragY));

  const sx = Math.round(defaultSx + dragXClamped);
  const sy = Math.round(defaultSy + dragYClamped);
  sw = Math.round(sw);
  sh = Math.round(sh);

  return (
    <KonvaImage
      draggable={draggable}
      onDragMove={(e) => {
        if (!draggable) return;
        const node = e.target as any;
        const dx = node.x();
        const dy = node.y();
        // Reset component position to stay locked inside slot
        node.x(0);
        node.y(0);
        
        // Calculate deltas in source image scale
        const deltaCropX = -dx * (sw / width);
        const deltaCropY = -dy * (sh / height);
        
        // Accumulate sub-pixel movement with float precision
        accumulatedDrag.current.dragX += deltaCropX;
        accumulatedDrag.current.dragY += deltaCropY;
        
        // Clamp accumulated drag values to bounds
        accumulatedDrag.current.dragX = Math.max(-maxDragX, Math.min(maxDragX, accumulatedDrag.current.dragX));
        accumulatedDrag.current.dragY = Math.max(-maxDragY, Math.min(maxDragY, accumulatedDrag.current.dragY));
        
        // Compute new crop coords based on clamped accumulated drag
        const newCropX = defaultSx + accumulatedDrag.current.dragX;
        const newCropY = defaultSy + accumulatedDrag.current.dragY;
        
        node.cropX(Math.round(newCropX));
        node.cropY(Math.round(newCropY));
        
        node.getLayer()?.batchDraw();
      }}
      onDragEnd={() => {
        if (draggable && accumulatedDrag.current) {
          onUpdateOffsets?.(accumulatedDrag.current.dragX, accumulatedDrag.current.dragY);
          onDragEnd?.();
        }
      }}
      image={image}
      cropX={sx}
      cropY={sy}
      cropWidth={sw}
      cropHeight={sh}
      x={0}
      y={0}
      width={width}
      height={height}
      cornerRadius={cornerRadius}
      perfectDrawEnabled={false}
      filters={filterResult.filters}
      brightness={filterResult.brightness}
      contrast={filterResult.contrast}
      hue={(filterResult as any).hue}
      saturation={(filterResult as any).saturation}
      onClick={onClick}
      onTap={onClick}
      onDblClick={onDblClick}
      onDblTap={onDblClick}
      ref={imageRef}
    />
  );
}, (prev, next) => {
  return prev.imageSrc === next.imageSrc &&
         prev.width === next.width &&
         prev.height === next.height &&
         prev.filter === next.filter &&
         prev.brightness === next.brightness &&
         prev.contrast === next.contrast &&
         prev.saturation === next.saturation &&
         prev.zoom === next.zoom &&
         prev.dragX === next.dragX &&
         prev.dragY === next.dragY &&
         prev.draggable === next.draggable &&
         prev.cornerRadius === next.cornerRadius &&
         prev.onDblClick === next.onDblClick;
});
