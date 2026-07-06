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
import { CanvasElement } from "@/lib/editor-store";
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
  onDblClick?: () => void;
}

export function URLImage({ element, isSelected, onSelect, onChange, displayW, displayH, allElements, setActiveGuides, elementRef }: ElementProps) {
  const [image] = useImage(element.imageSrc || "");

  useEffect(() => {
    const node = elementRef.current;
    if (node && image) {
      try {
        node.cache();
      } catch (e) {
        console.warn("Failed to cache Konva image", e);
      }
    }
    return () => {
      if (node) {
        try {
          node.clearCache();
        } catch (e) {
          // ignore
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

  return (
    <KonvaImage
      ref={elementRef}
      image={image}
      x={element.x * displayW}
      y={element.y * displayH}
      width={element.width * displayW}
      height={element.height * displayH}
      rotation={element.rotation}
      opacity={element.opacity}
      visible={element.visible !== false}
      id={element.id}
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

      onDragMove={(e) => {
        if (e.evt.altKey) {
          setActiveGuides([]);
          return;
        }
        const thresholdX = 8 / displayW;
        const thresholdY = 8 / displayH;
        const x = e.target.x() / displayW;
        const y = e.target.y() / displayH;
        const snapResult = getSnapPositions(element.id, x, y, element.width, element.height, allElements, thresholdX, thresholdY);
        e.target.x(snapResult.x * displayW);
        e.target.y(snapResult.y * displayH);
        setActiveGuides(snapResult.guides);
      }}
      onDragEnd={(e) => {
        setActiveGuides([]);
        onChange({
          x: e.target.x() / displayW,
          y: e.target.y() / displayH,
        });
      }}
      onTransformEnd={(e) => {
        const node = e.target;
        const scaleX = node.scaleX();
        const scaleY = node.scaleY();
        node.scaleX(1);
        node.scaleY(1);
        onChange({
          x: node.x() / displayW,
          y: node.y() / displayH,
          width: (node.width() * scaleX) / displayW,
          height: (node.height() * scaleY) / displayH,
          rotation: node.rotation(),
        });
      }}
    />
  );
}

export function KonvaTextElement({ element, isSelected, onSelect, onChange, displayW, displayH, allElements, setActiveGuides, elementRef, onDblClick }: ElementProps) {
  return (
    <KonvaText
      ref={elementRef}
      text={element.text || ""}
      x={element.x * displayW}
      y={element.y * displayH}
      width={element.width * displayW}
      height={element.height * displayH}
      rotation={element.rotation}
      opacity={element.opacity}
      visible={element.visible !== false}
      id={element.id}
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
      onDragMove={(e) => {
        if (e.evt.altKey) {
          setActiveGuides([]);
          return;
        }
        const thresholdX = 8 / displayW;
        const thresholdY = 8 / displayH;
        const x = e.target.x() / displayW;
        const y = e.target.y() / displayH;
        const snapResult = getSnapPositions(element.id, x, y, element.width, element.height, allElements, thresholdX, thresholdY);
        e.target.x(snapResult.x * displayW);
        e.target.y(snapResult.y * displayH);
        setActiveGuides(snapResult.guides);
      }}
      onDragEnd={(e) => {
        setActiveGuides([]);
        onChange({
          x: e.target.x() / displayW,
          y: e.target.y() / displayH,
        });
      }}
      onTransformEnd={(e) => {
        const node = e.target;
        const scaleX = node.scaleX();
        const scaleY = node.scaleY();
        node.scaleX(1);
        node.scaleY(1);
        const currentFontSize = element.fontSize || 16;
        const newFontSize = Math.round(currentFontSize * scaleY);
        onChange({
          x: node.x() / displayW,
          y: node.y() / displayH,
          width: (node.width() * scaleX) / displayW,
          height: (node.height() * scaleY) / displayH,
          fontSize: newFontSize,
          rotation: node.rotation(),
        });
      }}
    />
  );
}

export function KonvaShapeElement({ element, isSelected, onSelect, onChange, displayW, displayH, allElements, setActiveGuides, elementRef }: ElementProps) {
  const w = element.width * displayW;
  const h = element.height * displayH;

  const shapeProps = {
    ref: elementRef,
    x: element.x * displayW,
    y: element.y * displayH,
    width: w,
    height: h,
    rotation: element.rotation,
    opacity: element.opacity,
    visible: element.visible !== false,
    id: element.id,
    onClick: onSelect,
    onTap: onSelect,
    fill: element.fill || "transparent",
    stroke: element.strokeWidth && element.strokeWidth > 0 ? element.stroke || "#000000" : undefined,
    strokeWidth: element.strokeWidth || 0,
    draggable: !element.locked && isSelected,
    onDragMove: (e: any) => {
      if (e.evt.altKey) {
        setActiveGuides([]);
        return;
      }
      const thresholdX = 8 / displayW;
      const thresholdY = 8 / displayH;
      const x = e.target.x() / displayW;
      const y = e.target.y() / displayH;
      const snapResult = getSnapPositions(element.id, x, y, element.width, element.height, allElements, thresholdX, thresholdY);
      e.target.x(snapResult.x * displayW);
      e.target.y(snapResult.y * displayH);
      setActiveGuides(snapResult.guides);
    },
    onDragEnd: (e: any) => {
      setActiveGuides([]);
      onChange({
        x: e.target.x() / displayW,
        y: e.target.y() / displayH,
      });
    },
    onTransformEnd: (e: any) => {
      const node = e.target;
      const scaleX = node.scaleX();
      const scaleY = node.scaleY();
      node.scaleX(1);
      node.scaleY(1);
      onChange({
        x: node.x() / displayW,
        y: node.y() / displayH,
        width: (node.width() * scaleX) / displayW,
        height: (node.height() * scaleY) / displayH,
        rotation: node.rotation(),
      });
    }
  };

  if (element.shape === "ellipse") {
    return (
      <KonvaEllipse
        {...shapeProps}
        x={element.x * displayW + w / 2}
        y={element.y * displayH + h / 2}
        radiusX={w / 2}
        radiusY={h / 2}
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
        x={element.x * displayW + w / 2}
        y={element.y * displayH + h / 2}
        numPoints={5}
        innerRadius={Math.min(w, h) / 4}
        outerRadius={Math.min(w, h) / 2}
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
