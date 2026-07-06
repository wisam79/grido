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
    if (elementRef.current && image) {
      try {
        elementRef.current.cache();
      } catch (e) {
        console.warn("Failed to cache Konva image", e);
      }
    }
  }, [image, element.brightness, element.contrast, element.saturation, element.blur, elementRef]);

  const filters: any[] = [];
  if (element.brightness !== undefined && element.brightness !== 100) filters.push(Konva.Filters.Brighten);
  if (element.contrast !== undefined && element.contrast !== 100) filters.push(Konva.Filters.Contrast);
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
      brightness={element.brightness !== undefined ? (element.brightness - 100) / 100 : 0}
      contrast={element.contrast !== undefined ? element.contrast - 100 : 0}
      blurRadius={element.blur || 0}
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
