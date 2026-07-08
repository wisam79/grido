import React, { useRef, useEffect } from "react";
import { Stage, Layer, Transformer, Line, Circle, Group, Rect, Text, FastLayer } from "react-konva";
import { useAsyncImage } from "@/hooks/use-async-image";
import Konva from "konva";
import { useEditorStore, CanvasElement } from "@/lib/editor-store";
import { URLImage, KonvaTextElement, KonvaShapeElement } from "./konva-elements";
import { SnapGuide } from "@/lib/snap-utils";
import { useShallow } from "zustand/react/shallow";
import "@/lib/custom-filters";

interface KonvaCanvasProps {
  displayW: number;
  displayH: number;
  sortedElements: CanvasElement[];
  handleDoubleClick: (el: CanvasElement) => void;
  setActiveGuides: (guides: SnapGuide[]) => void;
  handleSlotClick?: (slotId: string) => void;
}

const KonvaCollageImage = React.memo(function KonvaCollageImage({
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
  const [image] = useAsyncImage(imageSrc);
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
}, (prev, next) => {
  return prev.imageSrc === next.imageSrc &&
         prev.width === next.width &&
         prev.height === next.height &&
         prev.filter === next.filter &&
         prev.brightness === next.brightness &&
         prev.contrast === next.contrast &&
         prev.saturation === next.saturation;
});

const GridLayer = React.memo(function GridLayer({
  showGrid,
  gridSize,
  gridColor,
  gridOpacity,
  gridSubdivisions,
  gridType,
  displayW,
  displayH
}: {
  showGrid: boolean;
  gridSize: number;
  gridColor: string;
  gridOpacity: number;
  gridSubdivisions: number;
  gridType: "lines" | "dots";
  displayW: number;
  displayH: number;
}) {
  if (!showGrid || gridSize <= 0) return null;

  const numH = Math.ceil(displayH / gridSize);
  const numW = Math.ceil(displayW / gridSize);
  const elements = [];

  if (gridType === "lines") {
    for (let i = 0; i <= numH; i++) {
      const isMajor = gridSubdivisions > 0 && i % gridSubdivisions === 0;
      elements.push(
        <Line
          key={`grid-h-${i}`}
          points={[0, i * gridSize, displayW, i * gridSize]}
          stroke={gridColor}
          opacity={isMajor ? Math.min(gridOpacity * 2.2, 0.9) : gridOpacity}
          strokeWidth={isMajor ? 0.8 : 0.4}
        />
      );
    }
    for (let j = 0; j <= numW; j++) {
      const isMajor = gridSubdivisions > 0 && j % gridSubdivisions === 0;
      elements.push(
        <Line
          key={`grid-v-${j}`}
          points={[j * gridSize, 0, j * gridSize, displayH]}
          stroke={gridColor}
          opacity={isMajor ? Math.min(gridOpacity * 2.2, 0.9) : gridOpacity}
          strokeWidth={isMajor ? 0.8 : 0.4}
        />
      );
    }
  } else {
    for (let i = 0; i <= numH; i++) {
      for (let j = 0; j <= numW; j++) {
        const isMajor = gridSubdivisions > 0 && (i % gridSubdivisions === 0 || j % gridSubdivisions === 0);
        elements.push(
          <Circle
            key={`grid-dot-${i}-${j}`}
            x={j * gridSize}
            y={i * gridSize}
            radius={isMajor ? 1.5 : 0.8}
            fill={gridColor}
            opacity={isMajor ? Math.min(gridOpacity * 2.2, 0.9) : gridOpacity}
          />
        );
      }
    }
  }

  return (
    <FastLayer listening={false} name="grid-layer">
      {elements}
    </FastLayer>
  );
});

const ColumnsLayer = React.memo(function ColumnsLayer({
  showColumns,
  columnsMargin,
  columnsGutter,
  columnsCount,
  columnsColor,
  displayW,
  displayH
}: {
  showColumns: boolean;
  columnsMargin: number;
  columnsGutter: number;
  columnsCount: number;
  columnsColor: string;
  displayW: number;
  displayH: number;
}) {
  if (!showColumns) return null;

  const cols = [];
  const availW = displayW - 2 * columnsMargin;
  const colW = (availW - (columnsCount - 1) * columnsGutter) / columnsCount;

  for (let i = 0; i < columnsCount; i++) {
    const xPos = columnsMargin + i * (colW + columnsGutter);
    cols.push(
      <Rect
        key={`col-${i}`}
        x={xPos}
        y={0}
        width={colW}
        height={displayH}
        fill={columnsColor}
      />
    );
  }

  return (
    <FastLayer listening={false} name="columns-layer">
      {cols}
    </FastLayer>
  );
});

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
    selectedIds,
    selectElement,
    toggleElementSelection,
    updateElement,
    pushHistory,
    showGrid,
    gridSize,
    gridColor,
    gridOpacity,
    gridSubdivisions,
    gridType,
    snapToGrid,
    showColumns,
    columnsCount,
    columnsColor,
    columnsMargin,
    columnsGutter,
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
    selectedIds: state.selectedIds,
    selectElement: state.selectElement,
    toggleElementSelection: state.toggleElementSelection,
    updateElement: state.updateElement,
    pushHistory: state.pushHistory,
    showGrid: state.showGrid,
    gridSize: state.gridSize,
    gridColor: state.gridColor,
    gridOpacity: state.gridOpacity,
    gridSubdivisions: state.gridSubdivisions,
    gridType: state.gridType,
    snapToGrid: state.snapToGrid,
    showColumns: state.showColumns,
    columnsCount: state.columnsCount,
    columnsColor: state.columnsColor,
    columnsMargin: state.columnsMargin,
    columnsGutter: state.columnsGutter,
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
      if (selectedIds.length > 0 && mode === "single") {
        const nodes = selectedIds
          .map((id) => elementsRefs.current[id])
          .filter(Boolean);
        trRef.current.nodes(nodes);
        trRef.current.getLayer().batchDraw();
      } else {
        trRef.current.nodes([]);
        trRef.current.getLayer().batchDraw();
      }
    }
  }, [selectedIds, sortedElements, mode]);

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
      {mode === "single" && (
        <GridLayer
          showGrid={showGrid}
          gridSize={gridSize}
          gridColor={gridColor}
          gridOpacity={gridOpacity}
          gridSubdivisions={gridSubdivisions}
          gridType={gridType}
          displayW={displayW}
          displayH={displayH}
        />
      )}

      {/* Columns Layout Layer */}
      {mode === "single" && (
        <ColumnsLayer
          showColumns={showColumns}
          columnsMargin={columnsMargin}
          columnsGutter={columnsGutter}
          columnsCount={columnsCount}
          columnsColor={columnsColor}
          displayW={displayW}
          displayH={displayH}
        />
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

            // Off-screen elements culling to speed up Konva rendering
            if (
              el.x > 1.1 ||
              el.y > 1.1 ||
              el.x + el.width < -0.1 ||
              el.y + el.height < -0.1
            ) {
              return null;
            }

            const elementProps = {
              key: el.id,
              element: el,
              isSelected: selectedIds.includes(el.id),
              onSelect: (e?: any) => {
                if (e?.evt?.shiftKey) {
                  toggleElementSelection(el.id);
                } else {
                  selectElement(el.id);
                }
              },
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
