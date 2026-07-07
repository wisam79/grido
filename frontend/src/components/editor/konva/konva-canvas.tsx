import React, { useRef, useEffect } from "react";
import { Stage, Layer, Transformer, Line, Circle, Group, Rect, Text } from "react-konva";
import useImage from "use-image";
import Konva from "konva";
import { useEditorStore, CanvasElement } from "@/lib/editor-store";
import { URLImage, KonvaTextElement, KonvaShapeElement } from "./konva-elements";
import { SnapGuide } from "@/lib/snap-utils";
import { useShallow } from "zustand/react/shallow";

interface KonvaCanvasProps {
  displayW: number;
  displayH: number;
  sortedElements: CanvasElement[];
  handleDoubleClick: (el: CanvasElement) => void;
  setActiveGuides: (guides: SnapGuide[]) => void;
  handleSlotClick?: (slotId: string) => void;
}

function KonvaCollageImage({
  imageSrc,
  width,
  height,
  filter,
  brightness,
  contrast,
  saturation,
  onClick
}: {
  imageSrc: string;
  width: number;
  height: number;
  filter?: string;
  brightness?: number;
  contrast?: number;
  saturation?: number;
  onClick: () => void;
}) {
  const [image] = useImage(imageSrc);
  const imageRef = useRef<any>(null);

  useEffect(() => {
    const node = imageRef.current;
    if (node && image) {
      try {
        node.cache();
      } catch (err) {
        console.warn("Failed to cache collage image", err);
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
  }, [image, filter, brightness, contrast, saturation]);

  if (!image) return null;

  // object-fit: cover
  const imgAspect = image.width / image.height;
  const slotAspect = width / height;
  let sx = 0, sy = 0, sw = image.width, sh = image.height;
  if (imgAspect > slotAspect) {
    sw = image.height * slotAspect;
    sx = (image.width - sw) / 2;
  } else {
    sh = image.width / slotAspect;
    sy = (image.height - sh) / 2;
  }

  let totalBrightness = brightness ?? 100;
  let totalContrast = contrast ?? 100;
  let totalSaturation = saturation ?? 100;
  let totalHue = 0;
  let useSepia = false;
  let useGrayscale = false;

  if (filter === "grayscale") {
    useGrayscale = true;
  } else if (filter === "sepia") {
    useSepia = true;
  } else if (filter === "vivid") {
    totalContrast = (totalContrast / 100) * 110;
    totalSaturation = (totalSaturation / 100) * 140;
  } else if (filter === "cool") {
    totalHue = 180;
    totalSaturation = (totalSaturation / 100) * 120;
  } else if (filter === "warm") {
    useSepia = true;
    totalHue = -10;
    totalSaturation = (totalSaturation / 100) * 130;
  } else if (filter === "soft") {
    totalBrightness = (totalBrightness / 100) * 110;
    totalContrast = (totalContrast / 100) * 90;
    totalSaturation = (totalSaturation / 100) * 90;
  } else if (filter === "professional") {
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

  return (
    <Rect
      fillPatternImage={image}
      fillPatternX={-sx * (width / sw)}
      fillPatternY={-sy * (height / sh)}
      fillPatternScaleX={width / sw}
      fillPatternScaleY={height / sh}
      width={width}
      height={height}
      filters={filters}
      brightness={totalBrightness !== 100 ? (totalBrightness - 100) / 100 : 0}
      contrast={totalContrast !== 100 ? totalContrast - 100 : 0}
      {...({
        hue: totalHue,
        saturation: totalSaturation !== 100 ? Math.log2(Math.max(1, totalSaturation) / 100) : 0
      } as any)}
      onClick={onClick}
      onTap={onClick}
      ref={imageRef}
    />
  );
}

export function KonvaCanvas({
  displayW,
  displayH,
  sortedElements,
  handleDoubleClick,
  setActiveGuides,
  handleSlotClick
}: KonvaCanvasProps) {
  const {
    mode,
    slots,
    selectedId,
    selectElement,
    updateElement,
    pushHistory,
    showGrid,
    gridSize,
    gridColor,
    gridType,
    snapToGrid,
    setStageRef,
    collageGap,
    collageMargin,
    collageRadius,
    collageShowCutLines,
    collageStrokeWidth,
    collageStrokeColor,
    backgroundColor,
  } = useEditorStore(useShallow((state) => ({
    mode: state.mode,
    slots: state.slots,
    selectedId: state.selectedId,
    selectElement: state.selectElement,
    updateElement: state.updateElement,
    pushHistory: state.pushHistory,
    showGrid: state.showGrid,
    gridSize: state.gridSize,
    gridColor: state.gridColor,
    gridType: state.gridType,
    snapToGrid: state.snapToGrid,
    setStageRef: state.setStageRef,
    collageGap: state.collageGap,
    collageMargin: state.collageMargin,
    collageRadius: state.collageRadius,
    collageShowCutLines: state.collageShowCutLines,
    collageStrokeWidth: state.collageStrokeWidth,
    collageStrokeColor: state.collageStrokeColor,
    backgroundColor: state.backgroundColor,
  })));
  
  const trRef = useRef<any>(null);
  const elementsRefs = useRef<Record<string, any>>({});
  const altPressedRef = useRef(false);
  
  const selectedEl = sortedElements.find((e) => e.id === selectedId);
  const isText = selectedEl?.type === "text";

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Alt") altPressedRef.current = true;
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === "Alt") altPressedRef.current = false;
    };
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, []);

  useEffect(() => {
    if (trRef.current) {
      if (selectedId && mode === "single") {
        const selectedNode = elementsRefs.current[selectedId];
        if (selectedNode) {
          trRef.current.nodes([selectedNode]);
          trRef.current.getLayer().batchDraw();
          return;
        }
      }
      trRef.current.nodes([]);
      trRef.current.getLayer().batchDraw();
    }
  }, [selectedId, sortedElements, mode]);

  const handleStageMouseDown = (e: any) => {
    const isBackgroundOrEmpty = e.target === e.target.getStage() || e.target.hasName("bg-rect");
    if (isBackgroundOrEmpty) {
      selectElement(null);
    }
  };

  const handleElementChange = (id: string, patch: Partial<CanvasElement>) => {
    updateElement(id, patch);
  };

  return (
    <Stage
      width={displayW}
      height={displayH}
      onMouseDown={handleStageMouseDown}
      onTouchStart={handleStageMouseDown}
      ref={setStageRef}
    >
      {/* Background Color Layer */}
      <Layer>
        <Rect
          name="bg-rect"
          width={displayW}
          height={displayH}
          fill={backgroundColor === "transparent" ? undefined : backgroundColor}
        />
      </Layer>

      {/* Grid Layer */}
      {showGrid && gridSize > 0 && mode === "single" && (
        <Layer listening={false}>
          {(() => {
            const lines = [];
            const numH = Math.ceil(displayH / gridSize);
            const numW = Math.ceil(displayW / gridSize);

            if (gridType === "lines") {
              for (let i = 0; i <= numH; i++) {
                lines.push(
                  <Line
                    key={`grid-h-${i}`}
                    points={[0, i * gridSize, displayW, i * gridSize]}
                    stroke={gridColor}
                    strokeWidth={0.5}
                  />
                );
              }
              for (let j = 0; j <= numW; j++) {
                lines.push(
                  <Line
                    key={`grid-v-${j}`}
                    points={[j * gridSize, 0, j * gridSize, displayH]}
                    stroke={gridColor}
                    strokeWidth={0.5}
                  />
                );
              }
            } else {
              for (let i = 0; i <= numH; i++) {
                for (let j = 0; j <= numW; j++) {
                  lines.push(
                    <Circle
                      key={`grid-dot-${i}-${j}`}
                      x={j * gridSize}
                      y={i * gridSize}
                      radius={1}
                      fill={gridColor}
                    />
                  );
                }
              }
            }
            return lines;
          })()}
        </Layer>
      )}

      {/* Collage Mode Layer */}
      {mode === "collage" && (
        <Layer>
          {slots.map((slot) => {
            const scale = displayW / 1200;
            const margin = collageMargin * scale;
            const gap = collageGap * scale;
            const radius = collageRadius * scale;
            const borderW = collageStrokeWidth * scale;

            const availW = displayW - 2 * margin;
            const availH = displayH - 2 * margin;

            const left = margin + slot.x * availW + gap / 2;
            const top = margin + slot.y * availH + gap / 2;
            const width = slot.w * availW - gap;
            const height = slot.h * availH - gap;

            const isSelected = selectedId === slot.id;

            return (
              <Group key={slot.id}>
                {/* Cut Lines (dashed background guide) */}
                {collageShowCutLines && (
                  <Rect
                    x={left - gap / 2}
                    y={top - gap / 2}
                    width={width + gap}
                    height={height + gap}
                    stroke="#a0aec0"
                    strokeWidth={Math.max(1, 2 * scale)}
                    dash={[8, 8]}
                    listening={false}
                  />
                )}

                {/* Slot clipping group for image/placeholder */}
                <Group
                  x={left}
                  y={top}
                  width={width}
                  height={height}
                  clipFunc={(ctx) => {
                    ctx.beginPath();
                    ctx.moveTo(radius, 0);
                    ctx.lineTo(width - radius, 0);
                    ctx.quadraticCurveTo(width, 0, width, radius);
                    ctx.lineTo(width, height - radius);
                    ctx.quadraticCurveTo(width, height, width - radius, height);
                    ctx.lineTo(radius, height);
                    ctx.quadraticCurveTo(0, height, 0, height - radius);
                    ctx.lineTo(0, radius);
                    ctx.quadraticCurveTo(0, 0, radius, 0);
                    ctx.closePath();
                  }}
                  onClick={() => handleSlotClick?.(slot.id)}
                  onTouchEnd={() => handleSlotClick?.(slot.id)}
                >
                  {slot.imageSrc ? (
                    <KonvaCollageImage
                      imageSrc={slot.imageSrc}
                      width={width}
                      height={height}
                      filter={slot.filter}
                      brightness={slot.brightness}
                      contrast={slot.contrast}
                      saturation={slot.saturation}
                      onClick={() => handleSlotClick?.(slot.id)}
                    />
                  ) : (
                    // Placeholder background & text
                    <Group>
                      <Rect
                        x={0}
                        y={0}
                        width={width}
                        height={height}
                        fill="#f3f4f6"
                      />
                      <Text
                        text="+"
                        fontSize={32 * scale}
                        fill="#9ca3af"
                        x={0}
                        y={height / 2 - 25 * scale}
                        width={width}
                        align="center"
                      />
                      <Text
                        text="انقر للإضافة"
                        fontSize={12 * scale}
                        fill="#9ca3af"
                        fontFamily="Cairo, sans-serif"
                        x={0}
                        y={height / 2 + 10 * scale}
                        width={width}
                        align="center"
                      />
                    </Group>
                  )}
                </Group>

                {/* Stroke Border */}
                {borderW > 0 && (
                  <Rect
                    x={left}
                    y={top}
                    width={width}
                    height={height}
                    stroke={collageStrokeColor}
                    strokeWidth={borderW}
                    cornerRadius={radius}
                    listening={false}
                  />
                )}

                {/* Selection indicator Ring */}
                {isSelected && (
                  <Rect
                    x={left - 1}
                    y={top - 1}
                    width={width + 2}
                    height={height + 2}
                    stroke="#3b82f6"
                    strokeWidth={2}
                    cornerRadius={radius + 1}
                    listening={false}
                  />
                )}
              </Group>
            );
          })}
        </Layer>
      )}

      {/* Single Mode Layer */}
      {mode === "single" && (
        <Layer>
          {sortedElements.map((el) => {
            if (el.visible === false) return null;

            const elementProps = {
              key: el.id,
              element: el,
              isSelected: selectedId === el.id,
              onSelect: () => selectElement(el.id),
              onChange: (patch: Partial<CanvasElement>) => handleElementChange(el.id, patch),
              displayW,
              displayH,
              allElements: sortedElements,
              setActiveGuides,
              snapToGrid,
              gridSize,
              altPressedRef,
              elementRef: {
                get current() {
                  return elementsRefs.current[el.id];
                },
                set current(val) {
                  if (val) {
                    elementsRefs.current[el.id] = val;
                  } else {
                    delete elementsRefs.current[el.id];
                  }
                }
              }
            };

            if (el.type === "image" && el.imageSrc) {
              return <URLImage {...elementProps} />;
            }
            if (el.type === "text") {
              return (
                <React.Fragment key={el.id}>
                  <KonvaTextElement 
                    {...elementProps} 
                    onDblClick={() => handleDoubleClick(el)}
                  />
                </React.Fragment>
              );
            }
            if (el.type === "shape") {
              return <KonvaShapeElement {...elementProps} />;
            }
            return null;
          })}

          {selectedId && (
            <Transformer
              ref={trRef}
              anchorSize={10}
              anchorCornerRadius={5}
              anchorStroke="#ffffff"
              anchorStrokeWidth={1.5}
              anchorFill="#4f46e5"
              borderStroke="#4f46e5"
              borderStrokeWidth={1.5}
              padding={5}
              rotationSnaps={[0, 45, 90, 135, 180, 225, 270, 315]}
              rotateAnchorOffset={25}
              enabledAnchors={
                isText
                  ? ["top-left", "top-right", "bottom-left", "bottom-right", "middle-left", "middle-right"]
                  : ["top-left", "top-right", "bottom-left", "bottom-right", "middle-left", "middle-right", "top-center", "bottom-center"]
              }
              boundBoxFunc={(oldBox, newBox) => {
                if (newBox.width < 5 || newBox.height < 5) {
                  return oldBox;
                }
                return newBox;
              }}
              onTransformEnd={() => {
                pushHistory();
              }}
            />
          )}
        </Layer>
      )}
    </Stage>
  );
}
