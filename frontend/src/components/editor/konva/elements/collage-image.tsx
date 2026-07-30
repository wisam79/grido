import React, { useRef, useEffect, useMemo } from "react";
import { Image as KonvaImage, Group } from "react-konva";
import { useAsyncImage } from "@/hooks/use-async-image";
import { getKonvaFilters } from "@/lib/konva-filters";
import { useRenderQuality } from "@/lib/render-quality";
import { MagicAiScanner } from "./magic-ai-scanner";

export const KonvaCollageImage = React.memo(function KonvaCollageImage({
  id,
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
  id?: string;
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
  const enhancingElementId = useRenderQuality((s) => s.enhancingElementId);
  const isEnhancing = Boolean(id && enhancingElementId === id);

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
      const deviceRatio = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
      const ratio = isDraggingFilter
        ? Math.max(0.25, Math.min(0.5, stageScale * 0.3))
        : Math.max(0.75, Math.min(2.5, stageScale * deviceRatio * 1.2));
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
    <Group>
      <KonvaImage
        draggable={draggable}
        dragBoundFunc={(pos) => {
          const node = imageRef.current;
          if (!node || !image) return pos;
          const stageScale = node.getStage()?.scaleX() || 1;
          const nodeAbsPos = node.getAbsolutePosition();
          
          const dxScreen = pos.x - nodeAbsPos.x;
          const dyScreen = pos.y - nodeAbsPos.y;
          
          const dxCanvas = dxScreen / stageScale;
          const dyCanvas = dyScreen / stageScale;

          const currentX = accumulatedDrag.current.dragX;
          const currentY = accumulatedDrag.current.dragY;

          const proposedX = currentX - dxCanvas * (sw / width);
          const proposedY = currentY - dyCanvas * (sh / height);

          const clampedX = Math.max(-maxDragX, Math.min(maxDragX, proposedX));
          const clampedY = Math.max(-maxDragY, Math.min(maxDragY, proposedY));

          accumulatedDrag.current = { dragX: clampedX, dragY: clampedY };
          
          node.getLayer()?.batchDraw();
          return nodeAbsPos;
        }}
        onDragMove={() => {
          const node = imageRef.current;
          if (!node || !image) return;
          const currentX = accumulatedDrag.current.dragX;
          const currentY = accumulatedDrag.current.dragY;

          const dragXClamped = Math.max(-maxDragX, Math.min(maxDragX, currentX));
          const dragYClamped = Math.max(-maxDragY, Math.min(maxDragY, currentY));

          const newSx = Math.round(defaultSx + dragXClamped);
          const newSy = Math.round(defaultSy + dragYClamped);

          node.cropX(newSx);
          node.cropY(newSy);
          
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
      {isEnhancing && (
        <MagicAiScanner
          targetNodeRef={imageRef}
          x={0}
          y={0}
          width={width}
          height={height}
        />
      )}
    </Group>
  );
}, (prev, next) => {
  return prev.id === next.id &&
         prev.imageSrc === next.imageSrc &&
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
