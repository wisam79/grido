import React from "react";
import { CanvasElement, useEditorStore } from "@/lib/editor-store";
import { getSnapPositionsWithTargets, SnapTarget } from "@/lib/canvas/snap-utils";
import { KonvaEventObject } from "konva/lib/Node";

interface UseKonvaDragProps {
  element: CanvasElement;
  canvasWidth: number;
  canvasHeight: number;
  snapToGrid?: boolean;
  gridSize?: number;
  altPressedRef: React.RefObject<boolean>;
  shiftPressedRef?: React.RefObject<boolean>;
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
  shiftPressedRef,
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
      // العناصر المقفلة لا تدخل قائمة السحب الجماعي — حماية draggable={!locked}
      // تمنع القائد فقط، وonDragMove تحرّك كل عقدة لها موضع بداية مسجّل.
      const el = currentElements.find((e) => e.id === id);
      if (el?.locked) return;
      const node = getKonvaNode(id);
      if (node) {
        startPositions[id] = { x: node.x(), y: node.y() };
      }
    });
    dragStartPositionsRef.current = startPositions;
  };

  const dragBoundFunc = (pos: { x: number; y: number }) => {
    if (altPressedRef.current) return pos;

    // Konva يمرر إحداثيات «مطلقة» (شاشية، بعد scale الـ Stage) ويغذّي القيمة
    // المعادة في setAbsolutePosition. المغناطيس والحدود معرّفة بوحدات الكانفس
    // المنطقية — لذا نحوّل للفضاء المنطقي أولاً ثم نعيد الناتج للمطلق.
    // (نفس نمط collage-image.tsx: القسمة على stageScale والضرب عند الإرجاع)
    const stageScale = getKonvaNode(element.id)?.getStage()?.scaleX() || 1;
    let xLogical = pos.x / stageScale;
    let yLogical = pos.y / stageScale;

    // قفل المحاور عند الضغط على Shift (Axis Lock: Horizontal or Vertical)
    if (shiftPressedRef?.current && dragStartPositionsRef.current[element.id]) {
      const startPos = dragStartPositionsRef.current[element.id];
      const dx = Math.abs(xLogical - startPos.x);
      const dy = Math.abs(yLogical - startPos.y);
      if (dx > dy) {
        yLogical = startPos.y;
      } else {
        xLogical = startPos.x;
      }
    }

    if (snapToGrid && gridSize && gridSize > 0) {
      xLogical = Math.round(xLogical / gridSize) * gridSize;
      yLogical = Math.round(yLogical / gridSize) * gridSize;
    } else {
      const x = xLogical / canvasWidth;
      const y = yLogical / canvasHeight;
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
      xLogical = snapResult.x * canvasWidth;
      yLogical = snapResult.y * canvasHeight;
    }
    const elW = element.width * canvasWidth;
    const elH = element.height * canvasHeight;
    const margin = 0.25;
    xLogical = Math.max(-canvasWidth * margin, Math.min(canvasWidth * (1 + margin) - elW, xLogical));
    yLogical = Math.max(-canvasHeight * margin, Math.min(canvasHeight * (1 + margin) - elH, yLogical));
    return { x: xLogical * stageScale, y: yLogical * stageScale };
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

      const { selectedIds, elements: currentElements } = useEditorStore.getState();
      const margin = 0.25;
      selectedIds.forEach((id) => {
        if (id === draggedId) return;
        const node = getKonvaNode(id);
        const nodeStart = dragStartPositionsRef.current[id];
        if (node && nodeStart) {
          // الحدود نفسها التي يطبقها dragBoundFunc على القائد —
          // منع التابعين من الخروج عن الكانفس أثناء السحب الجماعي
          const followerEl = currentElements.find((e) => e.id === id);
          if (followerEl?.locked) return;
          const fW = (followerEl?.width ?? element.width) * canvasWidth;
          const fH = (followerEl?.height ?? element.height) * canvasHeight;
          node.x(Math.max(-canvasWidth * margin, Math.min(canvasWidth * (1 + margin) - fW, nodeStart.x + dx)));
          node.y(Math.max(-canvasHeight * margin, Math.min(canvasHeight * (1 + margin) - fH, nodeStart.y + dy)));
        }
      });
      e.target.getLayer()?.batchDraw();
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
      // استبعاد المقفلة من كتابة المواضع النهائية — مواضعها لم تتغير أصلاً
      const movableIds = selectedIds.filter((id) => !currentElements.find((e) => e.id === id)?.locked);
      const patches = movableIds.map((id) => {
        const node = getKonvaNode(id);
        if (node) {
          const el = currentElements.find((x) => x.id === id) || element;
          const flipped = el.flipX === true;
          const flippedY = el.flipY === true;
          const rawX = node.x() / canvasWidth;
          const rawY = node.y() / canvasHeight;
          return {
            id,
            patch: {
              x: flipped ? rawX - el.width : rawX,
              y: flippedY ? rawY - el.height : rawY,
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
