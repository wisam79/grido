import React, { useEffect } from "react";
import { 
  Image as KonvaImage, 
  Text as KonvaText, 
  Rect as KonvaRect, 
  Ellipse as KonvaEllipse, 
  Line as KonvaLine, 
  Star as KonvaStar,
  Path as KonvaPath
} from "react-konva";
import { useAsyncImage } from "@/hooks/use-async-image";
import Konva from "konva";
import { CanvasElement, useEditorStore } from "@/lib/editor-store";
import { getSnapPositions, getSnapPositionsWithTargets, SnapTarget } from "@/lib/snap-utils";
import "@/lib/custom-filters";

function getFillProps(element: CanvasElement, w: number, h: number) {
  if (element.fillType === "linear") {
    const start = element.fillLinearGradientStartPoint || { x: 0, y: 0 };
    const end = element.fillLinearGradientEndPoint || { x: 1, y: 1 };
    return {
      fillLinearGradientStartPoint: { x: start.x * w, y: start.y * h },
      fillLinearGradientEndPoint: { x: end.x * w, y: end.y * h },
      fillLinearGradientColorStops: element.fillLinearGradientColorStops || [0, "#3b82f6", 1, "#8b5cf6"],
    };
  }
  if (element.fillType === "radial") {
    const start = element.fillRadialGradientStartPoint || { x: 0.5, y: 0.5 };
    const end = element.fillRadialGradientEndPoint || { x: 0.5, y: 0.5 };
    const rStart = element.fillRadialGradientStartRadius !== undefined ? element.fillRadialGradientStartRadius : 0;
    const rEnd = element.fillRadialGradientEndRadius !== undefined ? element.fillRadialGradientEndRadius : 0.5;
    return {
      fillRadialGradientStartPoint: { x: start.x * w, y: start.y * h },
      fillRadialGradientStartRadius: rStart * Math.max(w, h),
      fillRadialGradientEndPoint: { x: end.x * w, y: end.y * h },
      fillRadialGradientEndRadius: rEnd * Math.max(w, h),
      fillRadialGradientColorStops: element.fillRadialGradientColorStops || [0, "#3b82f6", 1, "#8b5cf6"],
    };
  }
  return {
    fill: element.type === "text" ? (element.color || "#000000") : (element.fill || "transparent"),
  };
}

interface ElementProps {
  element: CanvasElement;
  isSelected: boolean;
  onSelect: () => void;
  onChange: (patch: Partial<CanvasElement>) => void;
  displayW: number;
  displayH: number;
  allElements: CanvasElement[]; // Passed but ignored in memo
  setActiveGuides: (guides: any[]) => void;
  elementRef: React.MutableRefObject<any>;
  snapToGrid?: boolean;
  gridSize?: number;
  altPressedRef: React.RefObject<boolean>;
  onDblClick?: () => void;
}

const propsAreEqual = (prev: ElementProps, next: ElementProps) => {
  return prev.element === next.element &&
         prev.isSelected === next.isSelected &&
         prev.displayW === next.displayW &&
         prev.displayH === next.displayH &&
         prev.snapToGrid === next.snapToGrid &&
         prev.gridSize === next.gridSize;
};

export const URLImage = React.memo(function URLImage({ element, isSelected, onSelect, onChange, displayW, displayH, setActiveGuides, elementRef, snapToGrid, gridSize, altPressedRef }: ElementProps) {
  const [image] = useAsyncImage(element.imageSrc || "");
  const hasAnimatedRef = React.useRef(false);
  const snapTargetsRef = React.useRef<{
    vTargets: SnapTarget[];
    hTargets: SnapTarget[];
  } | null>(null);

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

  useEffect(() => {
    const node = elementRef.current;
    if (node && image) {
      try {
        node.cache();
      } catch (err) {
        console.warn("Failed to cache Konva image", err);
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
  }, [image, element.filter, element.brightness, element.contrast, element.saturation, element.blur, elementRef]);

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
      onClick={onSelect}
      onTap={onSelect}
      filters={filters}
      brightness={totalBrightness !== 100 ? (totalBrightness - 100) / 100 : 0}
      contrast={totalContrast !== 100 ? totalContrast - 100 : 0}
      blurRadius={element.blur || 0}
      {...({
        hue: totalHue,
        saturation: totalSaturation !== 100 ? Math.log2(Math.max(1, totalSaturation) / 100) : 0
      } as any)}
      draggable={!element.locked && isSelected}

      onDragStart={() => {
        const currentElements = useEditorStore.getState().elements;
        const vTargets = [{ value: 0.5, origin: "canvas" }];
        const hTargets = [{ value: 0.5, origin: "canvas" }];
        for (const el of currentElements) {
          if (el.id === element.id) continue;
          vTargets.push({ value: el.x, origin: "element" });
          vTargets.push({ value: el.x + el.width / 2, origin: "element" });
          vTargets.push({ value: el.x + el.width, origin: "element" });
          hTargets.push({ value: el.y, origin: "element" });
          hTargets.push({ value: el.y + el.height / 2, origin: "element" });
          hTargets.push({ value: el.y + el.height, origin: "element" });
        }
        snapTargetsRef.current = { vTargets, hTargets };
      }}

      dragBoundFunc={(pos) => {
        if (altPressedRef.current) return pos;
        let xAbs = pos.x;
        let yAbs = pos.y;

        if (snapToGrid && gridSize && gridSize > 0) {
          xAbs = Math.round(xAbs / gridSize) * gridSize;
          yAbs = Math.round(yAbs / gridSize) * gridSize;
        } else {
          const x = xAbs / displayW;
          const y = yAbs / displayH;
          const thresholdX = 5 / displayW;
          const thresholdY = 5 / displayH;
          const targets = snapTargetsRef.current || {
            vTargets: [{ value: 0.5, origin: "canvas" }],
            hTargets: [{ value: 0.5, origin: "canvas" }]
          };
          const snapResult = getSnapPositionsWithTargets(x, y, element.width, element.height, targets.vTargets, targets.hTargets, thresholdX, thresholdY);
          xAbs = snapResult.x * displayW;
          yAbs = snapResult.y * displayH;
        }
        return { x: xAbs, y: yAbs };
      }}

      onDragMove={(e) => {
        if (altPressedRef.current) {
          setActiveGuides([]);
          return;
        }
        if (snapToGrid) {
          setActiveGuides([]);
        } else {
          const x = e.target.x() / displayW;
          const y = e.target.y() / displayH;
          const thresholdX = 5 / displayW;
          const thresholdY = 5 / displayH;
          const targets = snapTargetsRef.current || {
            vTargets: [{ value: 0.5, origin: "canvas" }],
            hTargets: [{ value: 0.5, origin: "canvas" }]
          };
          const snapResult = getSnapPositionsWithTargets(x, y, element.width, element.height, targets.vTargets, targets.hTargets, thresholdX, thresholdY);
          setActiveGuides(snapResult.guides);
        }
      }}
      onDragEnd={(e) => {
        snapTargetsRef.current = null;
        setActiveGuides([]);
        const rawX = e.target.x() / displayW;
        onChange({
          x: flipped ? rawX - element.width : rawX,
          y: e.target.y() / displayH,
        });
        useEditorStore.getState().pushHistory();
      }}
      onTransformEnd={(e) => {
        const node = e.target;
        const sx = node.scaleX();
        const sy = node.scaleY();
        // Preserve flipX direction and reset scale to base flip value
        const isNowFlipped = sx < 0;
        const absScaleX = Math.abs(sx);
        node.scaleX(isNowFlipped ? -1 : 1);
        node.scaleY(1);
        const newWidth = (node.width() * absScaleX) / displayW;
        const rawX = node.x() / displayW;
        onChange({
          x: isNowFlipped ? rawX - newWidth : rawX,
          y: node.y() / displayH,
          width: newWidth,
          height: (node.height() * Math.abs(sy)) / displayH,
          rotation: node.rotation(),
          flipX: isNowFlipped,
        });
        useEditorStore.getState().pushHistory();
      }}
    />
  );
}, propsAreEqual);

export const KonvaTextElement = React.memo(function KonvaTextElement({ element, isSelected, onSelect, onChange, displayW, displayH, setActiveGuides, elementRef, snapToGrid, gridSize, altPressedRef, onDblClick }: ElementProps) {
  const editingTextId = useEditorStore((state) => state.editingTextId);
  const hasAnimatedRef = React.useRef(false);
  const snapTargetsRef = React.useRef<{
    vTargets: SnapTarget[];
    hTargets: SnapTarget[];
  } | null>(null);

  useEffect(() => {
    const node = elementRef.current;
    if (node && !hasAnimatedRef.current) {
      hasAnimatedRef.current = true;
      const targetOpacity = editingTextId === element.id ? 0 : element.opacity;
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
  }, [elementRef, element.opacity, element.flipX, editingTextId]);
  
  // Sync auto height back to store so bounding boxes and overlays stay perfect
  useEffect(() => {
    const node = elementRef.current;
    if (node) {
      const actualHeight = node.height() / displayH;
      if (Math.abs(actualHeight - element.height) > 0.005) {
        // Use a timeout to avoid dispatching action during render cycle
        const timer = setTimeout(() => {
          onChange({ height: actualHeight });
        }, 10);
        return () => clearTimeout(timer);
      }
    }
  }, [element.text, element.fontSize, element.width, element.height, displayH, elementRef, onChange]);

  const flipped = element.flipX === true;
  const w = element.width * displayW;
  const h = element.height * displayH;

  return (
    <KonvaText
      ref={elementRef}
      text={element.text || ""}
      x={flipped ? (element.x + element.width) * displayW : element.x * displayW}
      y={element.y * displayH}
      width={w}
      scaleX={flipped ? -1 : 1}
      rotation={element.rotation}
      opacity={editingTextId === element.id ? 0 : element.opacity}
      visible={element.visible !== false}
      id={element.id}
      globalCompositeOperation={element.globalCompositeOperation as any || "source-over"}
      shadowColor={element.shadowColor}
      shadowBlur={element.shadowBlur || 0}
      shadowOffsetX={element.shadowOffsetX || 0}
      shadowOffsetY={element.shadowOffsetY || 0}
      shadowOpacity={element.shadowOpacity ?? 0}
      onClick={onSelect}
      onTap={onSelect}
      onDblClick={onDblClick}
      onDblTap={onDblClick}
      fontSize={element.fontSize ? element.fontSize * (displayW / 600) : 16}
      fontWeight={element.fontWeight ? String(element.fontWeight) : "normal"}
      {...getFillProps(element, w, h)}
      fontFamily={element.fontFamily || "sans-serif"}
      align={element.textAlign || "center"}
      lineHeight={element.lineHeight ?? 1.2}
      draggable={!element.locked && isSelected}
      onDragStart={() => {
        const currentElements = useEditorStore.getState().elements;
        const vTargets = [{ value: 0.5, origin: "canvas" }];
        const hTargets = [{ value: 0.5, origin: "canvas" }];
        for (const el of currentElements) {
          if (el.id === element.id) continue;
          vTargets.push({ value: el.x, origin: "element" });
          vTargets.push({ value: el.x + el.width / 2, origin: "element" });
          vTargets.push({ value: el.x + el.width, origin: "element" });
          hTargets.push({ value: el.y, origin: "element" });
          hTargets.push({ value: el.y + el.height / 2, origin: "element" });
          hTargets.push({ value: el.y + el.height, origin: "element" });
        }
        snapTargetsRef.current = { vTargets, hTargets };
      }}
      dragBoundFunc={(pos) => {
        if (altPressedRef.current) return pos;
        let xAbs = pos.x;
        let yAbs = pos.y;

        if (snapToGrid && gridSize && gridSize > 0) {
          xAbs = Math.round(xAbs / gridSize) * gridSize;
          yAbs = Math.round(yAbs / gridSize) * gridSize;
        } else {
          const x = xAbs / displayW;
          const y = yAbs / displayH;
          const thresholdX = 5 / displayW;
          const thresholdY = 5 / displayH;
          const targets = snapTargetsRef.current || {
            vTargets: [{ value: 0.5, origin: "canvas" }],
            hTargets: [{ value: 0.5, origin: "canvas" }]
          };
          const snapResult = getSnapPositionsWithTargets(x, y, element.width, element.height, targets.vTargets, targets.hTargets, thresholdX, thresholdY);
          xAbs = snapResult.x * displayW;
          yAbs = snapResult.y * displayH;
        }
        return { x: xAbs, y: yAbs };
      }}
      onDragMove={(e) => {
        if (altPressedRef.current) {
          setActiveGuides([]);
          return;
        }
        if (snapToGrid) {
          setActiveGuides([]);
        } else {
          const x = e.target.x() / displayW;
          const y = e.target.y() / displayH;
          const thresholdX = 5 / displayW;
          const thresholdY = 5 / displayH;
          const targets = snapTargetsRef.current || {
            vTargets: [{ value: 0.5, origin: "canvas" }],
            hTargets: [{ value: 0.5, origin: "canvas" }]
          };
          const snapResult = getSnapPositionsWithTargets(x, y, element.width, element.height, targets.vTargets, targets.hTargets, thresholdX, thresholdY);
          setActiveGuides(snapResult.guides);
        }
      }}
      onDragEnd={(e) => {
        snapTargetsRef.current = null;
        setActiveGuides([]);
        const rawX = e.target.x() / displayW;
        onChange({
          x: flipped ? rawX - element.width : rawX,
          y: e.target.y() / displayH,
        });
        useEditorStore.getState().pushHistory();
      }}
      onTransform={(e) => {
        const node = e.target as any;
        const scaleX = node.scaleX();
        const scaleY = node.scaleY();
        const isFlipped = scaleX < 0;
        
        node.setAttrs({
          width: Math.max(node.width() * Math.abs(scaleX), 20),
          fontSize: Math.max(Math.round((node.fontSize() || 16) * scaleY), 6),
          scaleX: isFlipped ? -1 : 1,
          scaleY: 1,
        });
      }}
      onTransformEnd={(e) => {
        const node = e.target as any;
        const sx = node.scaleX();
        const sy = node.scaleY();
        const isNowFlipped = sx < 0;
        const absScaleX = Math.abs(sx);
        node.scaleX(isNowFlipped ? -1 : 1);
        node.scaleY(1);
        const newWidth = (node.width() * absScaleX) / displayW;
        const rawX = node.x() / displayW;
        onChange({
          x: isNowFlipped ? rawX - newWidth : rawX,
          y: node.y() / displayH,
          width: newWidth,
          height: node.height() / displayH,
          fontSize: Math.round(node.fontSize() / (displayW / 600)),
          rotation: node.rotation(),
          flipX: isNowFlipped,
        });
        useEditorStore.getState().pushHistory();
      }}
    />
  );
}, propsAreEqual);

export const KonvaShapeElement = React.memo(function KonvaShapeElement({ element, isSelected, onSelect, onChange, displayW, displayH, setActiveGuides, elementRef, snapToGrid, gridSize, altPressedRef }: ElementProps) {
  const w = element.width * displayW;
  const h = element.height * displayH;
  const flipped = element.flipX === true;
  const hasAnimatedRef = React.useRef(false);
  const snapTargetsRef = React.useRef<{
    vTargets: SnapTarget[];
    hTargets: SnapTarget[];
  } | null>(null);

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

  const shapeProps = {
    ref: elementRef,
    x: flipped ? (element.x + element.width) * displayW : element.x * displayW,
    y: element.y * displayH,
    width: w,
    height: h,
    scaleX: flipped ? -1 : 1,
    rotation: element.rotation,
    opacity: element.opacity,
    visible: element.visible !== false,
    id: element.id,
    globalCompositeOperation: element.globalCompositeOperation as any || "source-over",
    shadowColor: element.shadowColor,
    shadowBlur: element.shadowBlur || 0,
    shadowOffsetX: element.shadowOffsetX || 0,
    shadowOffsetY: element.shadowOffsetY || 0,
    shadowOpacity: element.shadowOpacity ?? 0,
    cornerRadius: element.cornerRadius || 0,
    onClick: onSelect,
    onTap: onSelect,
    ...getFillProps(element, w, h),
    stroke: element.strokeWidth && element.strokeWidth > 0 ? element.stroke || "#000000" : undefined,
    strokeWidth: element.strokeWidth || 0,
    draggable: !element.locked && isSelected,
    onDragStart: () => {
      const currentElements = useEditorStore.getState().elements;
      const vTargets = [{ value: 0.5, origin: "canvas" }];
      const hTargets = [{ value: 0.5, origin: "canvas" }];
      for (const el of currentElements) {
        if (el.id === element.id) continue;
        vTargets.push({ value: el.x, origin: "element" });
        vTargets.push({ value: el.x + el.width / 2, origin: "element" });
        vTargets.push({ value: el.x + el.width, origin: "element" });
        hTargets.push({ value: el.y, origin: "element" });
        hTargets.push({ value: el.y + el.height / 2, origin: "element" });
        hTargets.push({ value: el.y + el.height, origin: "element" });
      }
      snapTargetsRef.current = { vTargets, hTargets };
    },
    dragBoundFunc: (pos: any) => {
      if (altPressedRef.current) return pos;
      let xAbs = pos.x;
      let yAbs = pos.y;

      if (snapToGrid && gridSize && gridSize > 0) {
        xAbs = Math.round(xAbs / gridSize) * gridSize;
        yAbs = Math.round(yAbs / gridSize) * gridSize;
      } else {
        const x = xAbs / displayW;
        const y = yAbs / displayH;
        const thresholdX = 5 / displayW;
        const thresholdY = 5 / displayH;
        const targets = snapTargetsRef.current || {
          vTargets: [{ value: 0.5, origin: "canvas" }],
          hTargets: [{ value: 0.5, origin: "canvas" }]
        };
        const snapResult = getSnapPositionsWithTargets(x, y, element.width, element.height, targets.vTargets, targets.hTargets, thresholdX, thresholdY);
        xAbs = snapResult.x * displayW;
        yAbs = snapResult.y * displayH;
      }
      return { x: xAbs, y: yAbs };
    },
    onDragMove: (e: any) => {
      if (altPressedRef.current) {
        setActiveGuides([]);
        return;
      }
      if (snapToGrid) {
        setActiveGuides([]);
      } else {
        const x = e.target.x() / displayW;
        const y = e.target.y() / displayH;
        const thresholdX = 5 / displayW;
        const thresholdY = 5 / displayH;
        const targets = snapTargetsRef.current || {
          vTargets: [{ value: 0.5, origin: "canvas" }],
          hTargets: [{ value: 0.5, origin: "canvas" }]
        };
        const snapResult = getSnapPositionsWithTargets(x, y, element.width, element.height, targets.vTargets, targets.hTargets, thresholdX, thresholdY);
        setActiveGuides(snapResult.guides);
      }
    },
    onDragEnd: (e: any) => {
      snapTargetsRef.current = null;
      setActiveGuides([]);
      const rawX = e.target.x() / displayW;
      onChange({
        x: flipped ? rawX - element.width : rawX,
        y: e.target.y() / displayH,
      });
      useEditorStore.getState().pushHistory();
    },
    onTransformEnd: (e: any) => {
      const node = e.target;
      const sx = node.scaleX();
      const sy = node.scaleY();
      const isNowFlipped = sx < 0;
      const absScaleX = Math.abs(sx);
      node.scaleX(isNowFlipped ? -1 : 1);
      node.scaleY(1);
      const newWidth = (node.width() * absScaleX) / displayW;
      const rawX = node.x() / displayW;
      onChange({
        x: isNowFlipped ? rawX - newWidth : rawX,
        y: node.y() / displayH,
        width: newWidth,
        height: (node.height() * Math.abs(sy)) / displayH,
        rotation: node.rotation(),
        flipX: isNowFlipped,
      });
      useEditorStore.getState().pushHistory();
    }
  };

  if (element.shape === "ellipse") {
    return (
      <KonvaEllipse
        {...shapeProps}
        radiusX={w / 2}
        radiusY={h / 2}
        offsetX={-w / 2}
        offsetY={-h / 2}
      />
    );
  }

  if (element.shape === "line") {
    return (
      <KonvaLine
        {...shapeProps}
        points={[0, h / 2, w, h / 2]}
      />
    );
  }

  if (element.shape === "star") {
    return (
      <KonvaStar
        {...shapeProps}
        numPoints={5}
        innerRadius={Math.min(w, h) / 4}
        outerRadius={Math.min(w, h) / 2}
        offsetX={-w / 2}
        offsetY={-h / 2}
      />
    );
  }

  if (element.shape === "path") {
    return (
      <KonvaPath
        {...shapeProps}
        data={element.svgPath || ""}
      />
    );
  }

  return (
    <KonvaRect
      {...shapeProps}
      cornerRadius={element.radius || 0}
    />
  );
}, propsAreEqual);
