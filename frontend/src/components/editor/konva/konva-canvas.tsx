import React, { useRef, useEffect } from "react";
import { Stage, Layer, Group, Rect, Text } from "react-konva";
import { useEditorStore, CanvasElement } from "@/lib/editor-store";
import { useStageRef } from "@/lib/stage-context";
import { URLImage, KonvaTextElement, KonvaShapeElement } from "./konva-elements";
import { SnapGuide } from "@/lib/snap-utils";
import { useShallow } from "zustand/react/shallow";
import "@/lib/custom-filters";

import { KonvaCollageImage } from "./elements/collage-image";
import { GridLayer } from "./elements/grid-layer";
import { ColumnsLayer } from "./elements/columns-layer";
import { EditorTransformer } from "./elements/editor-transformer";

interface KonvaCanvasProps {
  displayW: number;
  displayH: number;
  sortedElements: CanvasElement[];
  handleDoubleClick: (el: CanvasElement) => void;
  setActiveGuides: (guides: SnapGuide[]) => void;
  handleSlotClick?: (slotId: string) => void;
  handleSlotDblClick?: (slotId: string) => void;
  onContextMenu?: (e: any) => void;
}

export const KonvaCanvas = React.memo(function KonvaCanvas({
  displayW,
  displayH,
  sortedElements,
  handleDoubleClick,
  setActiveGuides,
  handleSlotClick,
  handleSlotDblClick,
  onContextMenu
}: KonvaCanvasProps) {
  const wheelTimeoutRef = useRef<any>(null);
  const slotZoomFrameRef = useRef<number | null>(null);
  const pendingSlotZoomsRef = useRef(new Map<string, number>());

  useEffect(() => {
    const pendingSlotZooms = pendingSlotZoomsRef.current;
    return () => {
      if (wheelTimeoutRef.current) {
        clearTimeout(wheelTimeoutRef.current);
      }
      if (slotZoomFrameRef.current !== null) {
        cancelAnimationFrame(slotZoomFrameRef.current);
      }
      pendingSlotZooms.clear();
    };
  }, []);
  // تقسيم الاشتراكات لمنع إعادة رسم كاملة عند تغيير جزء واحد
  const mode = useEditorStore(useShallow((s) => s.mode));
  const canvasWidth = useEditorStore(useShallow((s) => s.canvasWidth));
  const canvasHeight = useEditorStore(useShallow((s) => s.canvasHeight));
  const backgroundColor = useEditorStore(useShallow((s) => s.backgroundColor));
  const selectedId = useEditorStore(useShallow((s) => s.selectedId));
  const selectedIds = useEditorStore(useShallow((s) => s.selectedIds));
  const snapToGrid = useEditorStore(useShallow((s) => s.snapToGrid));

  // وظائف — لا تتغير أبداً، آمنة بدون useShallow
  const selectElement = useEditorStore((s) => s.selectElement);
  const toggleElementSelection = useEditorStore((s) => s.toggleElementSelection);
  const updateElement = useEditorStore((s) => s.updateElement);
  const updateSlot = useEditorStore((s) => s.updateSlot);
  const pushHistory = useEditorStore((s) => s.pushHistory);

  // عجلة الفأرة قد تطلق عشرات الأحداث في الإطار الواحد. نجمع تعديلات قص
  // الصورة ونرسل تحديث Zustand واحداً فقط لكل إطار مرئي.
  const handleSlotWheel = React.useCallback((slot: { id: string; imageSrc?: string; zoom?: number }, e: any) => {
    if (!slot.imageSrc || useEditorStore.getState().selectedId !== slot.id) return;

    e.evt.preventDefault();
    const pendingZoom = pendingSlotZoomsRef.current.get(slot.id);
    const currentZoom = pendingZoom ?? slot.zoom ?? 1;
    const step = e.evt.deltaY < 0 ? 0.05 : -0.05;
    pendingSlotZoomsRef.current.set(slot.id, Math.min(3, Math.max(1, currentZoom + step)));

    if (slotZoomFrameRef.current === null) {
      slotZoomFrameRef.current = requestAnimationFrame(() => {
        slotZoomFrameRef.current = null;
        for (const [slotId, zoom] of pendingSlotZoomsRef.current) {
          updateSlot(slotId, { zoom });
        }
        pendingSlotZoomsRef.current.clear();
      });
    }

    if (wheelTimeoutRef.current) clearTimeout(wheelTimeoutRef.current);
    wheelTimeoutRef.current = setTimeout(() => {
      pushHistory();
      wheelTimeoutRef.current = null;
    }, 500);
  }, [pushHistory, updateSlot]);

  // إعدادات الشبكة — تتغير معاً
  const grid = useEditorStore(useShallow((s) => ({
    showGrid: s.showGrid,
    gridSize: s.gridSize,
    gridColor: s.gridColor,
    gridOpacity: s.gridOpacity,
    gridSubdivisions: s.gridSubdivisions,
    gridType: s.gridType,
  })));
  const { showGrid, gridSize, gridColor, gridOpacity, gridSubdivisions, gridType } = grid;

  // إعدادات الأعمدة — تتغير معاً
  const columns = useEditorStore(useShallow((s) => ({
    showColumns: s.showColumns,
    columnsCount: s.columnsCount,
    columnsColor: s.columnsColor,
    columnsMargin: s.columnsMargin,
    columnsGutter: s.columnsGutter,
  })));
  const { showColumns, columnsCount, columnsColor, columnsMargin, columnsGutter } = columns;

  // إعدادات الكولاج — تتغير معاً
  const collage = useEditorStore(useShallow((s) => ({
    slots: s.slots,
    collageGap: s.collageGap,
    collageMargin: s.collageMargin,
    collageTemplate: s.collageTemplate,
    collageRadius: s.collageRadius,
    collageShowCutLines: s.collageShowCutLines,
    collageStrokeWidth: s.collageStrokeWidth,
    collageStrokeColor: s.collageStrokeColor,
  })));
  const { slots, collageGap, collageMargin, collageTemplate, collageRadius, collageShowCutLines, collageStrokeWidth, collageStrokeColor } = collage;
  
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

  // إرفاق المحول بالعناصر المحددة — يعتمد فقط على التحديد والوضع
  // لا يعتمد على sortedElements لتجنب إعادة الإرفاق أثناء/بعد التحويل
  const transformingRef = useRef(false);
  useEffect(() => {
    if (trRef.current) {
      if (selectedIds.length > 0 && mode === "single") {
        const nodes = selectedIds
          .map((id) => elementsRefs.current[id])
          .filter(Boolean);
        // لا تعيد إرفاق العقد أثناء تحويل نشط لتجنب قطع التحويل البصري
        if (!transformingRef.current) {
          trRef.current.nodes(nodes);
          trRef.current.getLayer().batchDraw();
        }
      } else {
        trRef.current.nodes([]);
        trRef.current.getLayer().batchDraw();
      }
    }
  }, [selectedIds, mode]);

  // تتبع حالة التحويل النشط لمنع إعادة إرفاق العقد أثناء السحب
  useEffect(() => {
    const transformer = trRef.current;
    if (!transformer) return;
    const onStart = () => { transformingRef.current = true; };
    const onEnd = () => { transformingRef.current = false; };
    transformer.on("transformstart", onStart);
    transformer.on("transformend", onEnd);
    return () => {
      transformer.off("transformstart", onStart);
      transformer.off("transformend", onEnd);
    };
  }, []);

  const handleStageMouseDown = (e: any) => {
    const isBackgroundOrEmpty = e.target === e.target.getStage() || e.target.hasName("bg-rect");
    if (isBackgroundOrEmpty) {
      selectElement(null);
    }
  };

  const handleElementChange = (id: string, patch: Partial<CanvasElement>) => {
    updateElement(id, patch);
  };

  const createElementMouseDown = React.useCallback((elId: string) => (e: any) => {
    const isMulti = e?.evt?.shiftKey || e?.evt?.ctrlKey || e?.evt?.metaKey;
    if (!isMulti) {
      const { selectedIds } = useEditorStore.getState();
      if (!selectedIds.includes(elId)) {
        selectElement(elId);
      }
    } else {
      toggleElementSelection(elId);
    }
  }, [selectElement, toggleElementSelection]);

  const createElementClick = React.useCallback((elId: string) => (e: any) => {
    const isMulti = e?.evt?.shiftKey || e?.evt?.ctrlKey || e?.evt?.metaKey;
    if (!isMulti) {
      const { selectedIds } = useEditorStore.getState();
      if (selectedIds.includes(elId)) {
        selectElement(elId);
      }
    }
  }, [selectElement]);

  const createElementRef = React.useCallback((elId: string) => ({
    get current() {
      return elementsRefs.current[elId];
    },
    set current(val: any) {
      if (val) {
        elementsRefs.current[elId] = val;
      } else {
        delete elementsRefs.current[elId];
      }
    }
  }), []);

return (
    <Stage
      width={displayW}
      height={displayH}
      scaleX={displayW / canvasWidth}
      scaleY={displayH / canvasHeight}
      onMouseDown={handleStageMouseDown}
      onTouchStart={handleStageMouseDown}
      onContextMenu={(e) => {
        e.evt.preventDefault();
        onContextMenu?.(e);
      }}
      ref={(stage) => { stageContextRef.current = stage; }}
    >
      {/* Background Color Layer */}
      <Layer>
        <Rect
          name="bg-rect"
          width={canvasWidth}
          height={canvasHeight}
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
          displayW={canvasWidth}
          displayH={canvasHeight}
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
          displayW={canvasWidth}
          displayH={canvasHeight}
        />
      )}

      {/* Collage Mode Layer */}
      {mode === "collage" && (
        <Layer>
          {slots.map((slot) => {
            const hasPhysical = collageTemplate?.physicalLayout;
            const margin = hasPhysical ? 0 : collageMargin;
            const gap = hasPhysical ? 0 : collageGap;
            const radius = collageRadius;
            const borderW = collageStrokeWidth;

            const availW = canvasWidth - 2 * margin;
            const availH = canvasHeight - 2 * margin;

            const left = margin + slot.x * availW + gap / 2;
            const top = margin + slot.y * availH + gap / 2;
            const width = slot.w * availW - gap;
            const height = slot.h * availH - gap;

            const isSelected = selectedId === slot.id;

            return (
              <Group key={slot.id} id={`slot-${slot.id}`}>
                {/* Cut Lines (dashed background guide) */}
                {collageShowCutLines && hasPhysical && (
                  <Rect
                    x={left}
                    y={top}
                    width={width}
                    height={height}
                    stroke="#ff0000"
                    strokeWidth={1}
                    dash={[4, 4]}
                    listening={false}
                  />
                )}

                {/* Slot rendering group */}
                <Group
                  id={slot.id}
                  x={left}
                  y={top}
                  width={width}
                  height={height}
                  onClick={() => handleSlotClick?.(slot.id)}
                  onTouchEnd={() => handleSlotClick?.(slot.id)}
                  onDblClick={() => handleSlotDblClick?.(slot.id)}
                  onDblTap={() => handleSlotDblClick?.(slot.id)}
                  onWheel={(e) => handleSlotWheel(slot, e)}
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
                    <Group listening={false}>
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
                        fontSize={32}
                        fill="#9ca3af"
                        x={0}
                        y={height / 2 - 25}
                        width={width}
                        align="center"
                      />
                      <Text
                        text="انقر للإضافة"
                        fontSize={12}
                        fill="#9ca3af"
                        fontFamily="Cairo, sans-serif"
                        x={0}
                        y={height / 2 + 10}
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

            if (
              el.x > 1.1 ||
              el.y > 1.1 ||
              el.x + el.width < -0.1 ||
              el.y + el.height < -0.1
            ) {
              return null;
            }

            const handleMouseDown = createElementMouseDown(el.id);
            const handleClick = createElementClick(el.id);

            const elementProps = {
              key: el.id,
              element: el,
              isSelected: selectedIds.includes(el.id),
              onMouseDown: handleMouseDown,
              onTouchStart: handleMouseDown,
              onClick: handleClick,
              onTap: handleClick,
              onChange: (patch: Partial<CanvasElement>) => handleElementChange(el.id, patch),
              canvasWidth,
              canvasHeight,
              allElements: sortedElements,
              setActiveGuides,
              snapToGrid,
              gridSize,
              altPressedRef,
              getKonvaNode: (id: string) => elementsRefs.current[id],
              elementRef: createElementRef(el.id)
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
            <EditorTransformer
              trRef={trRef}
              selectedIds={selectedIds}
              sortedElements={sortedElements}
              canvasWidth={canvasWidth}
              canvasHeight={canvasHeight}
              stageScale={displayW / canvasWidth}
              isText={isText}
              onTransformEnd={() => {
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
                  const absScaleY = Math.abs(sy);

                  const newW = node.width() * absScaleX;
                  const newH = node.height() * absScaleY;

                  // Konva يغيّر scale بشكل مباشر أثناء التحويل. أعده إلى 1
                  // بعد نقل النتيجة إلى width/height، وإلا ستبقى الصورة مكبرة
                  // مرتين عند أول إعادة رسم لاحقة أو سيتضخم كاش الفلاتر.
                  node.width(newW);
                  if (el.type === "text") {
                    node.fontSize?.(Math.max(6, Math.round((el.fontSize || 16) * absScaleY)));
                  } else {
                    node.height(newH);
                  }
                  node.scaleX(isNowFlipped ? -1 : 1);
                  node.scaleY(1);

                  const newWidth = newW / canvasWidth;
                  const rawX = node.x() / canvasWidth;

                  const patch: Partial<CanvasElement> = {
                    x: isNowFlipped ? rawX - newWidth : rawX,
                    y: node.y() / canvasHeight,
                    width: newWidth,
                    rotation: node.rotation(),
                    flipX: isNowFlipped,
                  };

                  if (el.type === "text") {
                    patch.height = node.height() / canvasHeight;
                    (patch as any).fontSize = Math.max(6, Math.round((el.fontSize || 16) * absScaleY));
                  } else {
                    patch.height = newH / canvasHeight;
                  }

                  return { id, patch };
                }).filter(Boolean) as { id: string; patch: Partial<CanvasElement> }[];

                useEditorStore.getState().updateElements(patches);
                useEditorStore.getState().pushHistory();

                // إعادة إرفاق المحول بعد انتهاء التحويل لتحديث العقد بالقيم الجديدة
                requestAnimationFrame(() => {
                  if (trRef.current && selectedIds.length > 0) {
                    const updatedNodes = selectedIds
                      .map((sid) => elementsRefs.current[sid])
                      .filter(Boolean);
                    trRef.current.nodes(updatedNodes);
                    trRef.current.getLayer()?.batchDraw();
                  }
                });
              }}
            />
          )}
        </Layer>
      )}
    </Stage>
  );
})
