import React, { useRef, useEffect } from "react";
import { Stage, Layer, Transformer, Group, Rect, Text } from "react-konva";
import { useEditorStore, CanvasElement } from "@/lib/editor-store";
import { useStageRef } from "@/lib/stage-context";
import { URLImage, KonvaTextElement, KonvaShapeElement } from "./konva-elements";
import { SnapGuide } from "@/lib/snap-utils";
import { useShallow } from "zustand/react/shallow";
import "@/lib/custom-filters";

import { KonvaCollageImage } from "./elements/collage-image";
import { GridLayer } from "./elements/grid-layer";
import { ColumnsLayer } from "./elements/columns-layer";

interface KonvaCanvasProps {
  displayW: number;
  displayH: number;
  sortedElements: CanvasElement[];
  handleDoubleClick: (el: CanvasElement) => void;
  setActiveGuides: (guides: SnapGuide[]) => void;
  handleSlotClick?: (slotId: string) => void;
  handleSlotDblClick?: (slotId: string) => void;
}


export function KonvaCanvas({
  displayW,
  displayH,
  sortedElements,
  handleDoubleClick,
  setActiveGuides,
  handleSlotClick,
  handleSlotDblClick
}: KonvaCanvasProps) {
  const wheelTimeoutRef = useRef<any>(null);

  useEffect(() => {
    return () => {
      if (wheelTimeoutRef.current) {
        clearTimeout(wheelTimeoutRef.current);
      }
    };
  }, []);
  const {
    mode,
    slots,
    selectedId,
    selectedIds,
    selectElement,
    toggleElementSelection,
    updateElement,
    updateSlot,
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
    collageGap,
    collageMargin,
    collageTemplate,
    collageRadius,
    collageShowCutLines,
    collageStrokeWidth,
    collageStrokeColor,
    backgroundColor,
    canvasWidth,
  } = useEditorStore(useShallow((state) => ({
    mode: state.mode,
    slots: state.slots,
    selectedId: state.selectedId,
    selectedIds: state.selectedIds,
    selectElement: state.selectElement,
    toggleElementSelection: state.toggleElementSelection,
    updateElement: state.updateElement,
    updateSlot: state.updateSlot,
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
    collageGap: state.collageGap,
    collageMargin: state.collageMargin,
    collageTemplate: state.collageTemplate,
    collageRadius: state.collageRadius,
    collageShowCutLines: state.collageShowCutLines,
    collageStrokeWidth: state.collageStrokeWidth,
    collageStrokeColor: state.collageStrokeColor,
    backgroundColor: state.backgroundColor,
    canvasWidth: state.canvasWidth,
  })));
  
  const trRef = useRef<any>(null);
  const elementsRefs = useRef<Record<string, any>>({});
  const altPressedRef = useRef(false);
  // استخدام StageContext بدلاً من Zustand لتجنب مشاكل GC
  const stageContextRef = useStageRef();
  
  const selectedEl = sortedElements.find((e) => e.id === selectedId);
  const isText = selectedEl?.type === "text";

  // Handle caching logic for main image (Single Mode)
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
      ref={(stage) => { stageContextRef.current = stage; }}
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
            const scale = displayW / canvasWidth;
            const hasPhysical = collageTemplate?.physicalLayout;
            const margin = hasPhysical ? 0 : collageMargin * scale;
            const gap = hasPhysical ? 0 : collageGap * scale;
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
                {collageShowCutLines && hasPhysical && (
                  <Rect
                    x={left}
                    y={top}
                    width={width}
                    height={height}
                    stroke="#ff0000"
                    strokeWidth={1 * scale}
                    dash={[4 * scale, 4 * scale]}
                    listening={false}
                  />
                )}

                {/* Slot rendering group */}
                <Group
                  x={left}
                  y={top}
                  width={width}
                  height={height}
                  onClick={() => handleSlotClick?.(slot.id)}
                  onTouchEnd={() => handleSlotClick?.(slot.id)}
                  onDblClick={() => handleSlotDblClick?.(slot.id)}
                  onDblTap={() => handleSlotDblClick?.(slot.id)}
                  onWheel={(e) => {
                    if (slot.imageSrc && selectedId === slot.id) {
                      e.evt.preventDefault();
                      const currentZoom = slot.zoom ?? 1;
                      const delta = e.evt.deltaY;
                      let newZoom = currentZoom;
                      if (delta < 0) {
                        newZoom = Math.min(3.0, currentZoom + 0.05);
                      } else {
                        newZoom = Math.max(1.0, currentZoom - 0.05);
                      }
                      updateSlot(slot.id, { zoom: newZoom });
                      
                      if (wheelTimeoutRef.current) clearTimeout(wheelTimeoutRef.current);
                      wheelTimeoutRef.current = setTimeout(() => {
                        pushHistory();
                        wheelTimeoutRef.current = null;
                      }, 500);
                    }
                  }}
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
                      zoom={slot.zoom}
                      dragX={slot.dragX}
                      dragY={slot.dragY}
                      draggable={isSelected}
                      cornerRadius={radius}
                      onUpdateOffsets={(x, y) => {
                        updateSlot(slot.id, { dragX: x, dragY: y });
                      }}
                      onDragEnd={() => {
                        pushHistory();
                      }}
                      onClick={() => handleSlotClick?.(slot.id)}
                      onDblClick={() => handleSlotDblClick?.(slot.id)}
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
                        cornerRadius={radius}
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

            const handleMouseDown = (e: any) => {
              const isMulti = e?.evt?.shiftKey || e?.evt?.ctrlKey || e?.evt?.metaKey;
              if (!isMulti) {
                const { selectedIds } = useEditorStore.getState();
                if (!selectedIds.includes(el.id)) {
                  selectElement(el.id);
                }
              } else {
                toggleElementSelection(el.id);
              }
            };

            const handleClick = (e: any) => {
              const isMulti = e?.evt?.shiftKey || e?.evt?.ctrlKey || e?.evt?.metaKey;
              if (!isMulti) {
                const { selectedIds } = useEditorStore.getState();
                if (selectedIds.includes(el.id)) {
                  selectElement(el.id);
                }
              }
            };

            const elementProps = {
              key: el.id,
              element: el,
              isSelected: selectedIds.includes(el.id),
              onMouseDown: handleMouseDown,
              onTouchStart: handleMouseDown,
              onClick: handleClick,
              onTap: handleClick,
              onChange: (patch: Partial<CanvasElement>) => handleElementChange(el.id, patch),
              displayW,
              displayH,
              allElements: sortedElements,
              setActiveGuides,
              snapToGrid,
              gridSize,
              altPressedRef,
              getKonvaNode: (id: string) => elementsRefs.current[id],
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

          {selectedIds.length > 0 && (
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
                isText && selectedIds.length === 1
                  ? ["top-left", "top-right", "bottom-left", "bottom-right", "middle-left", "middle-right"]
                  : ["top-left", "top-right", "bottom-left", "bottom-right", "middle-left", "middle-right", "top-center", "bottom-center"]
              }
              boundBoxFunc={(oldBox, newBox) => {
                if (newBox.width < 5 || newBox.height < 5) {
                  return oldBox;
                }
                return newBox;
              }}

              onTransformEnd={(e) => {
                if (!trRef.current) return;
                const nodes = trRef.current.nodes();
                const patches = nodes.map((node: any) => {
                  const id = node.id();
                  const el = sortedElements.find((x) => x.id === id);
                  if (!el) return null;

                  const sx = node.scaleX();
                  const sy = node.scaleY();
                  const isNowFlipped = sx < 0;
                  const absScaleX = Math.abs(sx);
                  node.scaleX(isNowFlipped ? -1 : 1);
                  node.scaleY(1);

                  const newWidth = (node.width() * absScaleX) / displayW;
                  const rawX = node.x() / displayW;

                  const patch: Partial<CanvasElement> = {
                    x: isNowFlipped ? rawX - newWidth : rawX,
                    y: node.y() / displayH,
                    width: newWidth,
                    rotation: node.rotation(),
                    flipX: isNowFlipped,
                  };

                  if (el.type === "text") {
                    patch.height = node.height() / displayH;
                    (patch as any).fontSize = Math.max(6, Math.round((el.fontSize || 16) * Math.abs(sy)));
                  } else {
                    patch.height = (node.height() * Math.abs(sy)) / displayH;
                  }

                  return { id, patch };
                }).filter(Boolean) as { id: string; patch: Partial<CanvasElement> }[];

                useEditorStore.getState().updateElements(patches);
                useEditorStore.getState().pushHistory();
              }}
            />
          )}
        </Layer>
      )}
    </Stage>
  );
}
