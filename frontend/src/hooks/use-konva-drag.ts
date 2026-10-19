import React from 'react';
import { CanvasElement, useEditorStore } from '@/lib/editor-store';
import { getSnapPositionsWithTargets, SnapTarget, SnapGuide } from '@/lib/canvas/snap-utils';
import { liftToDragLayer, dropFromDragLayer } from '@/components/editor/konva/drag-layer';
import { getElementPixelVisualBox, getElementVisualBox } from '@/lib/canvas/element-geometry';
import {
  useCanvasInteraction,
  resetCanvasInteraction,
} from '@/lib/canvas/canvas-interaction-store';
import { KonvaEventObject } from 'konva/lib/Node';
import type Konva from 'konva';

interface UseKonvaDragProps {
  element: CanvasElement;
  canvasWidth: number;
  canvasHeight: number;
  /** مضاعف الزوم البصري (CSS transform فوق الـ Stage) — حاسم لتحويل السحب */
  canvasZoom?: number;
  snapToGrid?: boolean;
  gridSize?: number;
  altPressedRef: React.RefObject<boolean>;
  shiftPressedRef?: React.RefObject<boolean>;
  getKonvaNode: (id: string) => Konva.Node | null;
  setActiveGuides: (guides: SnapGuide[]) => void;
}

export function useKonvaDrag({
  element,
  canvasWidth,
  canvasHeight,
  canvasZoom = 1,
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
    gridSnap?: { stepX: number; stepY: number };
  } | null>(null);
  const dragStartPositionsRef = React.useRef<Record<string, { x: number; y: number }>>({});
  const prevGuidesRef = React.useRef<SnapGuide[]>([]);
  // 🚀 أدلة آخر تمريرة سناب — dragBoundFunc تحسب الموضع والأدلة معاً،
  // وonDragMove يعيد استخدامها بدل إعادة الحساب المكلفة لكل حدث.
  const pendingGuidesRef = React.useRef<SnapGuide[] | null>(null);

  const onDragStart = () => {
    useCanvasInteraction.getState().setIsDragging(true);
    const currentElements = useEditorStore.getState().elements;
    const {
      selectedIds,
      userGuides,
      showUserGuides,
      showGrid,
      gridSize: storeGridSize,
    } = useEditorStore.getState();
    const effectiveGridSize = gridSize ?? storeGridSize;

    // 🎯 أهداف المحاذاة المغناطيسية: حواف ومركز مساحة العمل
    const vTargets: SnapTarget[] = [
      { value: 0, origin: 'canvas' },
      { value: 0.5, origin: 'canvas' },
      { value: 1, origin: 'canvas' },
    ];
    const hTargets: SnapTarget[] = [
      { value: 0, origin: 'canvas' },
      { value: 0.5, origin: 'canvas' },
      { value: 1, origin: 'canvas' },
    ];

    // حواف ومراكز كافة العناصر الأخرى غير المحددة
    for (const el of currentElements) {
      if (selectedIds.includes(el.id)) continue;
      const vBox = getElementVisualBox(el, canvasWidth, canvasHeight);
      vTargets.push({ value: vBox.x, origin: 'element' });
      vTargets.push({ value: vBox.centerX, origin: 'element' });
      vTargets.push({ value: vBox.x + vBox.width, origin: 'element' });
      hTargets.push({ value: vBox.y, origin: 'element' });
      hTargets.push({ value: vBox.centerY, origin: 'element' });
      hTargets.push({ value: vBox.y + vBox.height, origin: 'element' });
    }

    // خطوط المساطر الإرشادية للمستخدم
    if (showUserGuides && userGuides) {
      for (const g of userGuides) {
        if (g.type === 'v') vTargets.push({ value: g.pos, origin: 'user-guide' });
        if (g.type === 'h') hTargets.push({ value: g.pos, origin: 'user-guide' });
      }
    }

    // ⚡ محاذاة الشبكة تُحسب رياضياً O(1) في getSnapPositionsWithTargets —
    // كان هنا حقن حتى 600 خط في مصفوفات البحث الخطي التي تُمسح 60 مرة/ثانية
    const gridSnap =
      showGrid && effectiveGridSize > 0 && canvasWidth > 0 && canvasHeight > 0
        ? { stepX: effectiveGridSize / canvasWidth, stepY: effectiveGridSize / canvasHeight }
        : undefined;
    snapTargetsRef.current = { vTargets, hTargets, gridSnap };

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

    // 🚀 رفع العقد المحددة (+ المحوّل والشارة) إلى طبقة السحب الرسمية —
    // تُرسم عقدة واحدة لكل إطار بدل الطبقة كاملة (Konva drag-layer pattern).
    try {
      const liveIds = useEditorStore.getState().selectedIds;
      liftToDragLayer(
        liveIds
          .map((id) => {
            const el = currentElements.find((e) => e.id === id);
            if (el?.locked) return null;
            return getKonvaNode(id);
          })
          .filter((n): n is Konva.Node => !!n),
      );
    } catch {
      // تجاهل آمن — السحب يعمل بلا طبقة
    }

    // 🛡️ M20: شبكة أمان إن ضاع dragend — Konva يربط mouseup على window فقط
    // بلا pointercancel/blur، فلو تحرر المؤشر خارج النافذة أو سرق تطبيق آخر
    // التركيز بقيت العقد (+ المحوّل والشارة) داخل طبقة السحب غير التفاعلية
    // نهائياً. نفس نمط drag-shadow.ts: مستمعون لمرة واحدة يعيدون العقد ويُلغون
    // تسجيل أنفسهم.
    if (typeof window !== 'undefined') {
      const restoreDragLayer = () => {
        try {
          dropFromDragLayer();
        } catch {
          // تجاهل آمن
        }
        resetCanvasInteraction();
      };
      window.addEventListener('pointerup', restoreDragLayer, { once: true });
      window.addEventListener('pointercancel', restoreDragLayer, { once: true });
      window.addEventListener('blur', restoreDragLayer, { once: true });
    }
  };

  const dragBoundFunc = (pos: { x: number; y: number }) => {
    // Konva يمرر إحداثيات «مطلقة» (شاشية، بعد scale الـ Stage) ويغذّي القيمة
    // المعادة في setAbsolutePosition. المغناطيس والحدود معرّفة بوحدات الكانفس
    // المنطقية — لذا نحوّل للفضاء المنطقي أولاً ثم نعيد الناتج للمطلق.
    const stage = getKonvaNode(element.id)?.getStage();
    // 🧭 في معمارية Viewport Canvas (الخيار ب): الـ Stage يملأ النافذة ويحمل إزاحة (stageX/stageY)
    // ومقياس (stageScale). نحول الإحداثي المطلق القادم من Konva إلى الفضاء المنطقي الدقيق للورقة.
    const stageScale = stage?.scaleX?.() || 1;
    const stageX = typeof stage?.x === 'function' ? stage.x() : 0;
    const stageY = typeof stage?.y === 'function' ? stage.y() : 0;
    let xLogical = (pos.x - stageX) / stageScale;
    let yLogical = (pos.y - stageY) / stageScale;

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

    const elW = element.width * canvasWidth;
    const elH = element.height * canvasHeight;
    const vBox = getElementPixelVisualBox(xLogical, yLogical, elW, elH, element.rotation || 0);

    const snapEnabled = snapToGrid !== false && !altPressedRef.current;
    if (snapEnabled) {
      const normVisualX = vBox.minX / canvasWidth;
      const normVisualY = vBox.minY / canvasHeight;
      const normVisualW = vBox.width / canvasWidth;
      const normVisualH = vBox.height / canvasHeight;

      // عتبة 8 بكسل شاشي مستقلة عن مقياس التكبير (Screen-pixel consistent threshold)
      const thresholdX = 8 / (canvasWidth * stageScale);
      const thresholdY = 8 / (canvasHeight * stageScale);
      const targets = snapTargetsRef.current || {
        vTargets: [
          { value: 0, origin: 'canvas' },
          { value: 0.5, origin: 'canvas' },
          { value: 1, origin: 'canvas' },
        ],
        hTargets: [
          { value: 0, origin: 'canvas' },
          { value: 0.5, origin: 'canvas' },
          { value: 1, origin: 'canvas' },
        ],
      };
      const snapResult = getSnapPositionsWithTargets(
        normVisualX,
        normVisualY,
        normVisualW,
        normVisualH,
        targets.vTargets,
        targets.hTargets,
        thresholdX,
        thresholdY,
        null,
        targets.gridSnap,
      );
      // الأدلة المحسوبة هنا تُستهلك في onDragMove — لا إعادة حساب هناك.
      pendingGuidesRef.current = snapResult.guides;
      const snappedVisualX = snapResult.x * canvasWidth;
      const snappedVisualY = snapResult.y * canvasHeight;
      xLogical = snappedVisualX - vBox.offsetX;
      yLogical = snappedVisualY - vBox.offsetY;
    } else {
      pendingGuidesRef.current = [];
    }

    const margin = 0.25;
    const currentVisualX = xLogical + vBox.offsetX;
    const currentVisualY = yLogical + vBox.offsetY;

    // 🎯 حدود السحب الحر لعناصر التصميم:
    // للعناصر العادية (أصغر من الورقة): احترام هامش 25% حول الورقة لمنع ضياع العنصر.
    // للعناصر المكبرة (W > canvasWidth أو H > canvasHeight — مثل صورة شخصية مكبرة لتأطير الوجه):
    // السماح بتمرير كامل مساحة الصورة بحرية عبر الكانفاس ليتمكن المصمم من إظهار أي جزء مطلوب
    // دون أن تُحبس الصورة أو تُجمَّد الحركة نتيجة انعكاس حدود Math.min/max:
    let minVisualX = -canvasWidth * margin;
    let maxVisualX = canvasWidth * (1 + margin) - vBox.width;
    if (minVisualX > maxVisualX) {
      minVisualX = canvasWidth * margin - vBox.width;
      maxVisualX = canvasWidth * (1 - margin);
    } else if (vBox.width > canvasWidth) {
      minVisualX = Math.min(minVisualX, canvasWidth * margin - vBox.width);
      maxVisualX = Math.max(maxVisualX, canvasWidth * (1 - margin));
    }

    let minVisualY = -canvasHeight * margin;
    let maxVisualY = canvasHeight * (1 + margin) - vBox.height;
    if (minVisualY > maxVisualY) {
      minVisualY = canvasHeight * margin - vBox.height;
      maxVisualY = canvasHeight * (1 - margin);
    } else if (vBox.height > canvasHeight) {
      minVisualY = Math.min(minVisualY, canvasHeight * margin - vBox.height);
      maxVisualY = Math.max(maxVisualY, canvasHeight * (1 - margin));
    }

    const clampedVisualX = Math.max(minVisualX, Math.min(maxVisualX, currentVisualX));
    const clampedVisualY = Math.max(minVisualY, Math.min(maxVisualY, currentVisualY));
    xLogical = clampedVisualX - vBox.offsetX;
    yLogical = clampedVisualY - vBox.offsetY;

    return {
      x: stageX + xLogical * stageScale,
      y: stageY + yLogical * stageScale,
    };
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
      // 🚀 Map بالمعرفات مرة واحدة لكل إطار — find لكل محدد/إطار كان O(Selected×Elements)
      // ×60/ث مع كثافة عناصر عالية
      const elementsById = new Map(currentElements.map((e) => [e.id, e]));
      const margin = 0.25;
      selectedIds.forEach((id) => {
        if (id === draggedId) return;
        const node = getKonvaNode(id);
        const nodeStart = dragStartPositionsRef.current[id];
        if (node && nodeStart) {
          const followerEl = elementsById.get(id);
          if (followerEl?.locked) return;
          const fW = (followerEl?.width ?? element.width) * canvasWidth;
          const fH = (followerEl?.height ?? element.height) * canvasHeight;
          const targetNodeX = nodeStart.x + dx;
          const targetNodeY = nodeStart.y + dy;
          const fBox = getElementPixelVisualBox(
            targetNodeX,
            targetNodeY,
            fW,
            fH,
            followerEl?.rotation || 0,
          );
          const clampedVisualX = Math.max(
            -canvasWidth * margin,
            Math.min(canvasWidth * (1 + margin) - fBox.width, fBox.minX),
          );
          const clampedVisualY = Math.max(
            -canvasHeight * margin,
            Math.min(canvasHeight * (1 + margin) - fBox.height, fBox.minY),
          );
          node.x(clampedVisualX - fBox.offsetX);
          node.y(clampedVisualY - fBox.offsetY);
        }
      });
      e.target.getLayer?.()?.batchDraw?.();
    }

    // 2. معالجة الخطوط الإرشادية — تُستهلك أدلة تمريرة dragBoundFunc
    // مباشرة (تعمل قبل onDragMove لكل حدث سحب) بدل إعادة حساب السناب
    // كاملاً مرة ثانية (توفير ~50% من حسابات كل إطار).
    const snapEnabled = snapToGrid !== false && !altPressedRef.current;
    if (!snapEnabled) {
      if (prevGuidesRef.current.length > 0) {
        setActiveGuides([]);
        prevGuidesRef.current = [];
      }
      return;
    }

    const guides = pendingGuidesRef.current ?? [];
    pendingGuidesRef.current = null;

    const isGuidesEqual = (g1: SnapGuide[], g2: SnapGuide[]) => {
      if (g1.length !== g2.length) return false;
      for (let i = 0; i < g1.length; i++) {
        if (g1[i].type !== g2[i].type || Math.abs(g1[i].coord - g2[i].coord) > 0.0001) return false;
      }
      return true;
    };

    if (!isGuidesEqual(guides, prevGuidesRef.current)) {
      setActiveGuides(guides);
      prevGuidesRef.current = guides;
    }
  };

  const onDragEnd = (e: KonvaEventObject<DragEvent>) => {
    useCanvasInteraction.getState().setIsDragging(false);
    // 🚀 الاستعادة أولاً — قبل أي كتابة للستور، حتى لا ترى React
    // العقد خارج موضعها المعلن ولو لإطار واحد.
    try {
      dropFromDragLayer();
    } catch {
      // تجاهل آمن
    }
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
      const movableIds = selectedIds.filter(
        (id) => !currentElements.find((e) => e.id === id)?.locked,
      );
      const patches = movableIds
        .map((id) => {
          const node = getKonvaNode(id);
          if (node) {
            return {
              id,
              patch: {
                x: node.x() / canvasWidth,
                y: node.y() / canvasHeight,
              },
            };
          }
          return null;
        })
        .filter(Boolean) as { id: string; patch: Partial<CanvasElement> }[];

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
