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
  flipX = false,
  flipY = false,
  rotation = 0,
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
  flipX?: boolean;
  flipY?: boolean;
  rotation?: number;
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
  const dragStartRef = useRef<{ dragX: number; dragY: number }>({ dragX, dragY });
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
  const hasTransform = flipX || flipY || rotation !== 0;

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
  }, [image, hasFilters, isDraggingFilter, hasTransform]);

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
  const maxDragX = Math.max(0, (image.width - sw) / 2);
  const maxDragY = Math.max(0, (image.height - sh) / 2);

  // Clamp the drag offsets to ensure crop window stays within the image boundaries
  const dragXClamped = Math.max(-maxDragX, Math.min(maxDragX, dragX));
  const dragYClamped = Math.max(-maxDragY, Math.min(maxDragY, dragY));

  const sx = Math.round(defaultSx + dragXClamped);
  const sy = Math.round(defaultSy + dragYClamped);
  sw = Math.round(sw);
  sh = Math.round(sh);

  const content = (
    <Group x={hasTransform ? -width / 2 : 0} y={hasTransform ? -height / 2 : 0}>
      <KonvaImage
        draggable={draggable}
        onDragStart={() => {
          dragStartRef.current = {
            dragX: accumulatedDrag.current.dragX,
            dragY: accumulatedDrag.current.dragY,
          };
        }}
        dragBoundFunc={(pos) => {
          const node = imageRef.current;
          if (!node || !image) return pos;

          // تحويل حركة المؤشر المطلقة إلى المحاور المحلية للخلية والصورة
          const nodeAbsPos = node.getAbsolutePosition();
          const inv = node.getAbsoluteTransform().copy().invert();
          const p0 = inv.point({ x: nodeAbsPos.x, y: nodeAbsPos.y });
          const p1 = inv.point({ x: pos.x, y: pos.y });
          const dxLocal = p1.x - p0.x;
          const dyLocal = p1.y - p0.y;

          // الحساب الخطي المتناسب مع وضع السحب الابتدائي (منع الانزلاق والتسارع)
          const startX = dragStartRef.current.dragX;
          const startY = dragStartRef.current.dragY;

          const proposedX = startX - dxLocal * (sw / width);
          const proposedY = startY - dyLocal * (sh / height);

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

  if (!hasTransform) return content;

  return (
    <Group
      x={width / 2}
      y={height / 2}
      rotation={rotation}
      scaleX={flipX ? -1 : 1}
      scaleY={flipY ? -1 : 1}
    >
      {content}
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
         prev.flipX === next.flipX &&
         prev.flipY === next.flipY &&
         prev.rotation === next.rotation &&
         prev.draggable === next.draggable &&
         prev.cornerRadius === next.cornerRadius &&
         prev.onDblClick === next.onDblClick;
});
