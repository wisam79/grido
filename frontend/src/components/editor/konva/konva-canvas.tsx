import React, { useRef, useEffect } from "react";
import { Stage } from "react-konva";
import Konva from "konva";
import { useEditorStore, CanvasElement } from "@/lib/editor-store";
import { useStageRef } from "@/lib/canvas/stage-context";
import { SnapGuide } from "@/lib/canvas/snap-utils";
import { useShallow } from "zustand/react/shallow";
import "@/lib/filters/custom-filters";

import { KonvaBackgroundLayer } from "./layers/konva-background-layer";
import { KonvaCollageLayer } from "./layers/konva-collage-layer";
import { KonvaSingleLayer } from "./layers/konva-single-layer";

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
    Konva.pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
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

  const mode = useEditorStore((s) => s.mode);
  const canvasWidth = useEditorStore((s) => s.canvasWidth);
  const canvasHeight = useEditorStore((s) => s.canvasHeight);
  const backgroundColor = useEditorStore((s) => s.backgroundColor);
  const selectedId = useEditorStore((s) => s.selectedId);
  const selectedIds = useEditorStore(useShallow((s) => s.selectedIds));
  const snapToGrid = useEditorStore((s) => s.snapToGrid);

  const selectElement = useEditorStore((s) => s.selectElement);
  const toggleElementSelection = useEditorStore((s) => s.toggleElementSelection);
  const updateElement = useEditorStore((s) => s.updateElement);
  const updateSlot = useEditorStore((s) => s.updateSlot);
  const pushHistory = useEditorStore((s) => s.pushHistory);

  const handleSlotWheel = React.useCallback((slot: { id: string; imageSrc?: string; zoom?: number }, e: any) => {
    // إيماءة Ctrl+عجلة مخصصة لتكبير الكانفس — لا نكبّر الصورة والكانفس معاً
    if (e.evt.ctrlKey || e.evt.metaKey) return;
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

  const grid = useEditorStore(useShallow((s) => ({
    showGrid: s.showGrid,
    gridSize: s.gridSize,
    gridColor: s.gridColor,
    gridOpacity: s.gridOpacity,
    gridSubdivisions: s.gridSubdivisions,
    gridType: s.gridType,
  })));
  const { showGrid, gridSize, gridColor, gridOpacity, gridSubdivisions, gridType } = grid;

  const columns = useEditorStore(useShallow((s) => ({
    showColumns: s.showColumns,
    columnsCount: s.columnsCount,
    columnsColor: s.columnsColor,
    columnsMargin: s.columnsMargin,
    columnsGutter: s.columnsGutter,
  })));
  const { showColumns, columnsCount, columnsColor, columnsMargin, columnsGutter } = columns;

  const collage = useEditorStore(useShallow((s) => ({
    slots: s.slots,
    collageGap: s.collageGap,
    collageMargin: s.collageMargin,
    collageTemplate: s.collageTemplate,
    collageRadius: s.collageRadius,
    collageShowCutLines: s.collageShowCutLines,
    collageShowEndCutLine: s.collageShowEndCutLine,
    collageStrokeWidth: s.collageStrokeWidth,
    collageStrokeColor: s.collageStrokeColor,
  })));
  const { slots, collageGap, collageMargin, collageTemplate, collageRadius, collageShowCutLines, collageShowEndCutLine, collageStrokeWidth, collageStrokeColor } = collage;

  const trRef = useRef<any>(null);
  const elementsRefs = useRef<Record<string, any>>({});
  const altPressedRef = useRef(false);
  const stageContextRef = useStageRef();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Alt") altPressedRef.current = true;
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === "Alt") altPressedRef.current = false;
    };
    // مع Alt+Tab يُسرق حدث keyup فيبقى Alt «عالقاً» وتُلغى المغناطيس بصمت —
    // نصفّر المرجع عند فقدان النافذة للتركيز أو إخفائها.
    const resetAlt = () => {
      altPressedRef.current = false;
    };
    const handleVisibility = () => {
      if (document.hidden) resetAlt();
    };
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    window.addEventListener("blur", resetAlt);
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("blur", resetAlt);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, []);

  useEffect(() => {
    if (trRef.current && mode === "single") {
      if (selectedIds.length > 0) {
        const nodes = selectedIds
          .map((id) => elementsRefs.current[id])
          .filter(Boolean);
        trRef.current.nodes(nodes);
        trRef.current.forceUpdate();
        trRef.current.getLayer()?.batchDraw();
      } else {
        trRef.current.nodes([]);
        trRef.current.getLayer()?.batchDraw();
      }
    }
  }, [selectedIds, mode, sortedElements]);

  const handleStageMouseDown = (e: any) => {
    const isBackgroundOrEmpty = e.target === e.target.getStage() || e.target.hasName("bg-rect");
    if (isBackgroundOrEmpty) {
      selectElement(null);
    }
  };

  const handleElementChange = React.useCallback((id: string, patch: Partial<CanvasElement>) => {
    updateElement(id, patch);
  }, [updateElement]);

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
      dragDistance={5}
      onContextMenu={(e) => {
        e.evt.preventDefault();
        onContextMenu?.(e);
      }}
      ref={(stage) => { stageContextRef.current = stage; }}
    >
      <KonvaBackgroundLayer
        canvasWidth={canvasWidth}
        canvasHeight={canvasHeight}
        backgroundColor={backgroundColor}
        mode={mode}
        showGrid={showGrid}
        gridSize={gridSize}
        gridColor={gridColor}
        gridOpacity={gridOpacity}
        gridSubdivisions={gridSubdivisions}
        gridType={gridType}
        showColumns={showColumns}
        columnsMargin={columnsMargin}
        columnsGutter={columnsGutter}
        columnsCount={columnsCount}
        columnsColor={columnsColor}
      />

      {mode === "collage" && (
        <KonvaCollageLayer
          slots={slots}
          canvasWidth={canvasWidth}
          canvasHeight={canvasHeight}
          collageMargin={collageMargin}
          collageGap={collageGap}
          collageRadius={collageRadius}
          collageStrokeWidth={collageStrokeWidth}
          collageStrokeColor={collageStrokeColor}
          collageShowCutLines={collageShowCutLines}
          collageShowEndCutLine={collageShowEndCutLine}
          collageTemplate={collageTemplate}
          selectedId={selectedId}
          handleSlotClick={handleSlotClick}
          handleSlotDblClick={handleSlotDblClick}
          handleSlotWheel={handleSlotWheel}
          updateSlot={updateSlot}
          pushHistory={pushHistory}
        />
      )}

      {mode === "single" && (
        <KonvaSingleLayer
          sortedElements={sortedElements}
          selectedIds={selectedIds}
          canvasWidth={canvasWidth}
          canvasHeight={canvasHeight}
          displayW={displayW}
          snapToGrid={snapToGrid}
          gridSize={gridSize}
          trRef={trRef}
          elementsRefs={elementsRefs}
          altPressedRef={altPressedRef}
          setActiveGuides={setActiveGuides}
          handleDoubleClick={handleDoubleClick}
          handleElementChange={handleElementChange}
          createElementMouseDown={createElementMouseDown}
          createElementClick={createElementClick}
          createElementRef={createElementRef}
        />
      )}
    </Stage>
  );
});
