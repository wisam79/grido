import React, { useRef, useEffect, useMemo } from "react";
import { Image as KonvaImage } from "react-konva";
import { useAsyncImage } from "@/hooks/use-async-image";
import Konva from "konva";

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
          // استخدام دقة عرض الشاشة العادية أثناء التعديل
          let ratio = typeof window !== 'undefined' ? window.devicePixelRatio : 1;
          ratio = Math.max(1.5, Math.min(2, ratio));
          node.cache({
            pixelRatio: ratio
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
    return () => {};
  }, [image, hasFilters, filter, brightness, contrast, saturation]);

  const { filters, totalBrightness, totalContrast, totalSaturation, totalHue } = useMemo(() => {
    let b = brightness ?? 100;
    let c = contrast ?? 100;
    let s = saturation ?? 100;
    let h = 0;
    let sepia = false;
    let mono = false;

    if (filter === "enhance") {
      c = (c / 100) * 108;
      s = (s / 100) * 112;
      b = (b / 100) * 102;
    } else if (filter === "skinGlow") {
      h = 10;
      s = (s / 100) * 110;
      c = (c / 100) * 94;
      b = (b / 100) * 106;
    } else if (filter === "clarity") {
      c = (c / 100) * 122;
      s = (s / 100) * 120;
      b = (b / 100) * 98;
    } else if (filter === "lowlight") {
      b = (b / 100) * 116;
      c = (c / 100) * 90;
      s = (s / 100) * 105;
    } else if (filter === "cinematic") {
      sepia = true;
      h = 5;
      s = (s / 100) * 115;
      c = (c / 100) * 110;
      b = (b / 100) * 102;
    } else if (filter === "monoPro") {
      mono = true;
      c = (c / 100) * 125;
      b = (b / 100) * 102;
    }

    const fList: any[] = [];
    if (filter === "skinGlow" && (Konva.Filters as any).SkinGlow) {
      fList.push((Konva.Filters as any).SkinGlow);
    }
    if (mono) fList.push(Konva.Filters.Grayscale);
    if (sepia) fList.push(Konva.Filters.Sepia);
    if (b !== 100) fList.push(Konva.Filters.Brighten);
    if (c !== 100) fList.push(Konva.Filters.Contrast);
    if (s !== 100 || h !== 0) fList.push(Konva.Filters.HSL);

    return { filters: fList, totalBrightness: b, totalContrast: c, totalSaturation: s, totalHue: h };
  }, [filter, brightness, contrast, saturation]);

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
