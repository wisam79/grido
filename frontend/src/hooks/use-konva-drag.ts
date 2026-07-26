import React from "react";
import { CanvasElement, useEditorStore } from "@/lib/editor-store";
import { getSnapPositionsWithTargets, SnapTarget } from "@/lib/snap-utils";
import { KonvaEventObject } from "konva/lib/Node";

interface UseKonvaDragProps {
  element: CanvasElement;
  canvasWidth: number;
  canvasHeight: number;
  snapToGrid?: boolean;
  gridSize?: number;
  altPressedRef: React.RefObject<boolean>;
  getKonvaNode: (id: string) => any;
  setActiveGuides: (guides: any[]) => void;
}

export function useKonvaDrag({
  element,
  canvasWidth,
  canvasHeight,
  snapToGrid,
  gridSize,
  altPressedRef,
  getKonvaNode,
  setActiveGuides,
}: UseKonvaDragProps) {
  const snapTargetsRef = React.useRef<{
    vTargets: SnapTarget[];
    hTargets: SnapTarget[];
  } | null>(null);
  const dragStartPositionsRef = React.useRef<Record<string, { x: number; y: number }>>({});
  const prevGuidesRef = React.useRef<any[]>([]);

  const onDragStart = () => {
    const currentElements = useEditorStore.getState().elements;
    const { selectedIds } = useEditorStore.getState();
    const vTargets = [{ value: 0.5, origin: "canvas" }];
    const hTargets = [{ value: 0.5, origin: "canvas" }];
    for (const el of currentElements) {
      if (selectedIds.includes(el.id)) continue;
      vTargets.push({ value: el.x, origin: "element" });
      vTargets.push({ value: el.x + el.width / 2, origin: "element" });
      vTargets.push({ value: el.x + el.width, origin: "element" });
      hTargets.push({ value: el.y, origin: "element" });
      hTargets.push({ value: el.y + el.height / 2, origin: "element" });
      hTargets.push({ value: el.y + el.height, origin: "element" });
    }
    snapTargetsRef.current = { vTargets, hTargets };

    const startPositions: Record<string, { x: number; y: number }> = {};
    selectedIds.forEach((id) => {
      const node = getKonvaNode(id);
      if (node) {
        startPositions[id] = { x: node.x(), y: node.y() };
      }
    });
    dragStartPositionsRef.current = startPositions;
  };

  const dragBoundFunc = (pos: { x: number; y: number }) => {
    if (altPressedRef.current) return pos;
    let xAbs = pos.x;
    let yAbs = pos.y;

    if (snapToGrid && gridSize && gridSize > 0) {
      xAbs = Math.round(xAbs / gridSize) * gridSize;
      yAbs = Math.round(yAbs / gridSize) * gridSize;
    } else {
      const x = xAbs / canvasWidth;
      const y = yAbs / canvasHeight;
      const thresholdX = 5 / canvasWidth;
      const thresholdY = 5 / canvasHeight;
      const targets = snapTargetsRef.current || {
        vTargets: [{ value: 0.5, origin: "canvas" }],
        hTargets: [{ value: 0.5, origin: "canvas" }]
      };
      const snapResult = getSnapPositionsWithTargets(
        x,
        y,
        element.width,
        element.height,
        targets.vTargets,
        targets.hTargets,
        thresholdX,
        thresholdY
      );
      xAbs = snapResult.x * canvasWidth;
      yAbs = snapResult.y * canvasHeight;
    }
    return { x: xAbs, y: yAbs };
  };

  const onDragMove = (e: KonvaEventObject<DragEvent>) => {
    if (altPressedRef.current) {
      if (prevGuidesRef.current.length > 0) {
        setActiveGuides([]);
        prevGuidesRef.current = [];
      }
      return;
    }

    const draggedNode = e.target;
    const draggedId = element.id;
    const startPos = dragStartPositionsRef.current[draggedId];
    
    if (startPos) {
      const dx = draggedNode.x() - startPos.x;
      const dy = draggedNode.y() - startPos.y;

      const { selectedIds } = useEditorStore.getState();
      selectedIds.forEach((id) => {
        if (id === draggedId) return;
        const node = getKonvaNode(id);
        const nodeStart = dragStartPositionsRef.current[id];
        if (node && nodeStart) {
          node.x(nodeStart.x + dx);
          node.y(nodeStart.y + dy);
        }
      });
      e.target.getLayer().batchDraw();
    }

    if (snapToGrid) {
      if (prevGuidesRef.current.length > 0) {
        setActiveGuides([]);
        prevGuidesRef.current = [];
      }
    } else {
      const x = e.target.x() / canvasWidth;
      const y = e.target.y() / canvasHeight;
      const thresholdX = 5 / canvasWidth;
      const thresholdY = 5 / canvasHeight;
      const targets = snapTargetsRef.current || {
        vTargets: [{ value: 0.5, origin: "canvas" }],
        hTargets: [{ value: 0.5, origin: "canvas" }]
      };
      const snapResult = getSnapPositionsWithTargets(
        x,
        y,
        element.width,
        element.height,
        targets.vTargets,
        targets.hTargets,
        thresholdX,
        thresholdY
      );
      
      const isGuidesEqual = (g1: any[], g2: any[]) => {
        if (g1.length !== g2.length) return false;
        for (let i = 0; i < g1.length; i++) {
          if (g1[i].type !== g2[i].type || Math.abs(g1[i].coord - g2[i].coord) > 0.0001) return false;
        }
        return true;
      };

      if (!isGuidesEqual(snapResult.guides, prevGuidesRef.current)) {
        setActiveGuides(snapResult.guides);
        prevGuidesRef.current = snapResult.guides;
      }
    }
  };

  const onDragEnd = (e: KonvaEventObject<DragEvent>) => {
    const { selectedIds, updateElements, pushHistory } = useEditorStore.getState();
    const draggedNode = e.target;
    const draggedId = element.id;
    const startPos = dragStartPositionsRef.current[draggedId];
    
    snapTargetsRef.current = null;
    if (prevGuidesRef.current.length > 0) {
      setActiveGuides([]);
      prevGuidesRef.current = [];
    }
    
    if (startPos) {
      const dx = draggedNode.x() - startPos.x;
      const dy = draggedNode.y() - startPos.y;
      
      const currentElements = useEditorStore.getState().elements;
      const patches = selectedIds.map((id) => {
        const node = getKonvaNode(id);
        if (node) {
          const el = currentElements.find((x) => x.id === id) || element;
          const flipped = el.flipX === true;
          const rawX = node.x() / canvasWidth;
          return {
            id,
            patch: {
              x: flipped ? rawX - el.width : rawX,
              y: node.y() / canvasHeight,
            },
          };
        }
        return null;
      }).filter(Boolean) as { id: string; patch: Partial<CanvasElement> }[];
      
      updateElements(patches);
      pushHistory();
    }
    dragStartPositionsRef.current = {};
  };

  return {
    onDragStart,
    dragBoundFunc,
    onDragMove,
    onDragEnd,
  };
}
