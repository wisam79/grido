import React, { useEffect } from "react";
import { 
  Image as KonvaImage, 
  Text as KonvaText, 
  Rect as KonvaRect, 
  Ellipse as KonvaEllipse, 
  Line as KonvaLine, 
  Star as KonvaStar 
} from "react-konva";
import useImage from "use-image";
import Konva from "konva";
import { CanvasElement, useEditorStore } from "@/lib/editor-store";
import { getSnapPositions } from "@/lib/snap-utils";

interface ElementProps {
  element: CanvasElement;
  isSelected: boolean;
  onSelect: () => void;
  onChange: (patch: Partial<CanvasElement>) => void;
  displayW: number;
  displayH: number;
  allElements: CanvasElement[];
  setActiveGuides: (guides: any[]) => void;
  elementRef: React.MutableRefObject<any>;
  snapToGrid?: boolean;
  gridSize?: number;
  altPressedRef: React.RefObject<boolean>;
  onDblClick?: () => void;
}

export function URLImage({ element, isSelected, onSelect, onChange, displayW, displayH, allElements, setActiveGuides, elementRef, snapToGrid, gridSize, altPressedRef }: ElementProps) {
  const [image] = useImage(element.imageSrc || "");

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

  if (element.filter === "grayscale") {
    useGrayscale = true;
  } else if (element.filter === "sepia") {
    useSepia = true;
  } else if (element.filter === "vivid") {
    totalContrast = (totalContrast / 100) * 110;
    totalSaturation = (totalSaturation / 100) * 140;
  } else if (element.filter === "cool") {
    totalHue = 180;
    totalSaturation = (totalSaturation / 100) * 120;
  } else if (element.filter === "warm") {
    useSepia = true;
    totalHue = -10;
    totalSaturation = (totalSaturation / 100) * 130;
  } else if (element.filter === "soft") {
    totalBrightness = (totalBrightness / 100) * 110;
    totalContrast = (totalContrast / 100) * 90;
    totalSaturation = (totalSaturation / 100) * 90;
  } else if (element.filter === "professional") {
    totalContrast = (totalContrast / 100) * 115;
    totalSaturation = (totalSaturation / 100) * 110;
    totalBrightness = (totalBrightness / 100) * 102;
  }

  const filters: any[] = [];
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
          const snapResult = getSnapPositions(element.id, x, y, element.width, element.height, allElements, thresholdX, thresholdY);
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
          const snapResult = getSnapPositions(element.id, x, y, element.width, element.height, allElements, thresholdX, thresholdY);
          setActiveGuides(snapResult.guides);
        }
      }}
      onDragEnd={(e) => {
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
}

export function KonvaTextElement({ element, isSelected, onSelect, onChange, displayW, displayH, allElements, setActiveGuides, elementRef, snapToGrid, gridSize, altPressedRef, onDblClick }: ElementProps) {
  const editingTextId = useEditorStore((state) => state.editingTextId);
  
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

  return (
    <KonvaText
      ref={elementRef}
      text={element.text || ""}
      x={flipped ? (element.x + element.width) * displayW : element.x * displayW}
      y={element.y * displayH}
      width={element.width * displayW}
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
      fill={element.color || "#000000"}
      fontFamily={element.fontFamily || "sans-serif"}
      align={element.textAlign || "center"}
      lineHeight={element.lineHeight ?? 1.2}
      draggable={!element.locked && isSelected}
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
          const snapResult = getSnapPositions(element.id, x, y, element.width, element.height, allElements, thresholdX, thresholdY);
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
          const snapResult = getSnapPositions(element.id, x, y, element.width, element.height, allElements, thresholdX, thresholdY);
          setActiveGuides(snapResult.guides);
        }
      }}
      onDragEnd={(e) => {
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
}

export function KonvaShapeElement({ element, isSelected, onSelect, onChange, displayW, displayH, allElements, setActiveGuides, elementRef, snapToGrid, gridSize, altPressedRef }: ElementProps) {
  const w = element.width * displayW;
  const h = element.height * displayH;
  const flipped = element.flipX === true;

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
    fill: element.fill || "transparent",
    stroke: element.strokeWidth && element.strokeWidth > 0 ? element.stroke || "#000000" : undefined,
    strokeWidth: element.strokeWidth || 0,
    draggable: !element.locked && isSelected,
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
        const snapResult = getSnapPositions(element.id, x, y, element.width, element.height, allElements, thresholdX, thresholdY);
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
        const snapResult = getSnapPositions(element.id, x, y, element.width, element.height, allElements, thresholdX, thresholdY);
        setActiveGuides(snapResult.guides);
      }
    },
    onDragEnd: (e: any) => {
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

  return (
    <KonvaRect
      {...shapeProps}
      cornerRadius={element.radius || 0}
    />
  );
}
