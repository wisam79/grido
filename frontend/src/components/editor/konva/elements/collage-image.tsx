import React, { useRef, useEffect } from "react";
import { Image as KonvaImage } from "react-konva";
import { useAsyncImage } from "@/hooks/use-async-image";
import Konva from "konva";
import { useEditorStore } from "@/lib/editor-store";

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

  useEffect(() => {
    accumulatedDrag.current = { dragX, dragY };
  }, [dragX, dragY]);

  const hasFilters = !!(
    (filter && filter !== "none") ||
    (brightness !== undefined && brightness !== 100) ||
    (contrast !== undefined && contrast !== 100) ||
    (saturation !== undefined && saturation !== 100)
  );

  useEffect(() => {
    const node = imageRef.current;
    if (node && image) {
      if (hasFilters) {
        try {
          const stage = node.getStage();
          const exportRatio = stage ? (useEditorStore.getState().canvasWidth / stage.width()) : 4;
          node.cache({
            pixelRatio: Math.max(2, exportRatio)
          });
        } catch (err) {
          console.warn("Failed to cache collage image", err);
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
          console.warn("Failed to clear collage image cache", err);
        }
      }
    };
  }, [image, hasFilters, width, height, filter, brightness, contrast, saturation, zoom, dragX, dragY]);

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

  let totalBrightness = brightness ?? 100;
  let totalContrast = contrast ?? 100;
  let totalSaturation = saturation ?? 100;
  let totalHue = 0;
  let useSepia = false;
  let useGrayscale = false;

  if (filter === "enhance") {
    totalContrast = (totalContrast / 100) * 108;
    totalSaturation = (totalSaturation / 100) * 112;
    totalBrightness = (totalBrightness / 100) * 102;
  } else if (filter === "skinGlow") {
    totalHue = 10;
    totalSaturation = (totalSaturation / 100) * 110;
    totalContrast = (totalContrast / 100) * 94;
    totalBrightness = (totalBrightness / 100) * 106;
  } else if (filter === "clarity") {
    totalContrast = (totalContrast / 100) * 122;
    totalSaturation = (totalSaturation / 100) * 120;
    totalBrightness = (totalBrightness / 100) * 98;
  } else if (filter === "lowlight") {
    totalBrightness = (totalBrightness / 100) * 116;
    totalContrast = (totalContrast / 100) * 90;
    totalSaturation = (totalSaturation / 100) * 105;
  } else if (filter === "cinematic") {
    useSepia = true;
    totalHue = 5;
    totalSaturation = (totalSaturation / 100) * 115;
    totalContrast = (totalContrast / 100) * 110;
    totalBrightness = (totalBrightness / 100) * 102;
  } else if (filter === "monoPro") {
    useGrayscale = true;
    totalContrast = (totalContrast / 100) * 125;
    totalBrightness = (totalBrightness / 100) * 102;
  }

  const filters: any[] = [];
  if (filter === "skinGlow" && (Konva.Filters as any).SkinGlow) {
    filters.push((Konva.Filters as any).SkinGlow);
  }
  if (useGrayscale) filters.push(Konva.Filters.Grayscale);
  if (useSepia) filters.push(Konva.Filters.Sepia);
  if (totalBrightness !== 100) filters.push(Konva.Filters.Brighten);
  if (totalContrast !== 100) filters.push(Konva.Filters.Contrast);
  if (totalSaturation !== 100 || totalHue !== 0) filters.push(Konva.Filters.HSL);

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
      filters={filters}
      brightness={totalBrightness !== 100 ? (totalBrightness - 100) / 100 : 0}
      contrast={totalContrast !== 100 ? totalContrast - 100 : 0}
      {...({
        hue: totalHue,
        saturation: totalSaturation !== 100 ? Math.log2(Math.max(1, totalSaturation) / 100) : 0
      } as any)}
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
         prev.onDblClick === next.onDblClick;
});
