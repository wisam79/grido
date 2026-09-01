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
    const { selectedIds, userGuides, showUserGuides, showGrid, gridSize: storeGridSize } = useEditorStore.getState();
    const effectiveGridSize = gridSize ?? storeGridSize;

    // 🎯 أهداف المحاذاة المغناطيسية: حواف ومركز مساحة العمل
    const vTargets: SnapTarget[] = [
      { value: 0, origin: "canvas" },
      { value: 0.5, origin: "canvas" },
      { value: 1, origin: "canvas" },
    ];
    const hTargets: SnapTarget[] = [
      { value: 0, origin: "canvas" },
      { value: 0.5, origin: "canvas" },
      { value: 1, origin: "canvas" },
    ];

    // حواف ومراكز كافة العناصر الأخرى غير المحددة
    for (const el of currentElements) {
      if (selectedIds.includes(el.id)) continue;
      vTargets.push({ value: el.x, origin: "element" });
      vTargets.push({ value: el.x + el.width / 2, origin: "element" });
      vTargets.push({ value: el.x + el.width, origin: "element" });
      hTargets.push({ value: el.y, origin: "element" });
      hTargets.push({ value: el.y + el.height / 2, origin: "element" });
      hTargets.push({ value: el.y + el.height, origin: "element" });
    }

    // خطوط المساطر الإرشادية للمستخدم
    if (showUserGuides && userGuides) {
      for (const g of userGuides) {
        if (g.type === "v") vTargets.push({ value: g.pos, origin: "user-guide" });
        if (g.type === "h") hTargets.push({ value: g.pos, origin: "user-guide" });
      }
    }

    // خطوط الشبكة عند تفعيل إظهار الشبكة
    if (showGrid && effectiveGridSize && effectiveGridSize > 0) {
      const numCols = Math.floor(canvasWidth / effectiveGridSize);
      for (let i = 1; i < numCols; i++) {
        vTargets.push({ value: (i * effectiveGridSize) / canvasWidth, origin: "grid" });
      }
      const numRows = Math.floor(canvasHeight / effectiveGridSize);
      for (let j = 1; j < numRows; j++) {
        hTargets.push({ value: (j * effectiveGridSize) / canvasHeight, origin: "grid" });
      }
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
    // Konva يمرر إحداثيات «مطلقة» (شاشية، بعد scale الـ Stage) ويغذّي القيمة
    // المعادة في setAbsolutePosition. المغناطيس والحدود معرّفة بوحدات الكانفس
    // المنطقية — لذا نحوّل للفضاء المنطقي أولاً ثم نعيد الناتج للمطلق.
    const stage = getKonvaNode(element.id)?.getStage();
    const stageScale = stage?.scaleX() || 1;
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

    const snapEnabled = snapToGrid !== false && !altPressedRef.current;
    if (snapEnabled) {
      const x = xLogical / canvasWidth;
      const y = yLogical / canvasHeight;
      // عتبة 8 بكسل شاشي مستقلة عن مقياس التكبير (Screen-pixel consistent threshold)
      const thresholdX = 8 / (canvasWidth * stageScale);
      const thresholdY = 8 / (canvasHeight * stageScale);
      const targets = snapTargetsRef.current || {
        vTargets: [
          { value: 0, origin: "canvas" },
          { value: 0.5, origin: "canvas" },
          { value: 1, origin: "canvas" },
        ],
        hTargets: [
          { value: 0, origin: "canvas" },
          { value: 0.5, origin: "canvas" },
          { value: 1, origin: "canvas" },
        ],
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
    const draggedNode = e.target;
    const draggedId = element.id;
    const startPos = dragStartPositionsRef.current[draggedId];
    
    // 1. تحريك كافة العناصر المحددة الأخرى التابعة للمجموعة في نفس الوقت
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

    // 2. معالجة الخطوط الإرشادية والمحاذاة المغناطيسية
    const snapEnabled = snapToGrid !== false && !altPressedRef.current;
    if (!snapEnabled) {
      if (prevGuidesRef.current.length > 0) {
        setActiveGuides([]);
        prevGuidesRef.current = [];
      }
      return;
    }

    const stage = e.target.getStage();
    const stageScale = stage?.scaleX() || 1;
    const x = e.target.x() / canvasWidth;
    const y = e.target.y() / canvasHeight;
    const thresholdX = 8 / (canvasWidth * stageScale);
    const thresholdY = 8 / (canvasHeight * stageScale);
    const targets = snapTargetsRef.current || {
      vTargets: [
        { value: 0, origin: "canvas" },
        { value: 0.5, origin: "canvas" },
        { value: 1, origin: "canvas" },
      ],
      hTargets: [
        { value: 0, origin: "canvas" },
        { value: 0.5, origin: "canvas" },
        { value: 1, origin: "canvas" },
      ],
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
