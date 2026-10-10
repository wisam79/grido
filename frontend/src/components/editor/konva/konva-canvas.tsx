import React, { useRef, useEffect, useMemo } from 'react';
import { Stage, Layer, Rect } from 'react-konva';
import Konva from 'konva';
import type { KonvaEventObject } from 'konva/lib/Node';
import { useEditorStore, CanvasElement } from '@/lib/editor-store';
import { useStageRef } from '@/lib/canvas/stage-context';
import { SnapGuide } from '@/lib/canvas/snap-utils';
import { getElementPixelVisualBox } from '@/lib/canvas/element-geometry';
import { useShallow } from 'zustand/react/shallow';
import { checkerColor } from '@/lib/canvas/canvas-colors';
import { registerDragLayer, registerDragExtrasProvider } from './drag-layer';
import { useCanvasInteraction } from '@/lib/canvas/canvas-interaction-store';
import '@/lib/filters/custom-filters';

import { KonvaBackgroundLayer } from './layers/konva-background-layer';
import { KonvaCollageLayer } from './layers/konva-collage-layer';
import { KonvaSingleLayer } from './layers/konva-single-layer';
import { KonvaOverlayLayer } from './layers/konva-overlay-layer';

interface KonvaCanvasProps {
  viewportW: number;
  viewportH: number;
  stagePos: { x: number; y: number };
  stageScale: number;
  displayW: number;
  displayH: number;
  sortedElements: CanvasElement[];
  handleDoubleClick: (el: CanvasElement) => void;
  setActiveGuides: (guides: SnapGuide[]) => void;
  handleSlotClick?: (slotId: string) => void;
  handleSlotDblClick?: (slotId: string) => void;
  onContextMenu?: (e: KonvaEventObject<MouseEvent>) => void;
}

export const KonvaCanvas = React.memo(function KonvaCanvas({
  viewportW,
  viewportH,
  stagePos,
  stageScale,
  displayW,
  displayH,
  sortedElements,
  handleDoubleClick,
  setActiveGuides,
  handleSlotClick,
  handleSlotDblClick,
  onContextMenu,
}: KonvaCanvasProps) {
  const wheelTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const slotZoomFrameRef = useRef<number | null>(null);
  const pendingSlotZoomsRef = useRef(new Map<string, number>());

  const mode = useEditorStore((s) => s.mode);
  const canvasWidth = useEditorStore((s) => s.canvasWidth);
  const canvasHeight = useEditorStore((s) => s.canvasHeight);

  useEffect(() => {
    // 🛡️ دستور كونفا وثبات الـ pixelRatio:
    // تثبيت Konva.pixelRatio = Math.min(window.devicePixelRatio || 1, 2) عند تركيب
    // المكون فقط ومنع إعادة حسابه ديناميكياً مع حركات الزوم لتجنب التقطيع وإعادة تخصيص أسطح الرسم في VRAM.
    const applyPixelRatio = () => {
      const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
      Konva.pixelRatio = Math.max(1, Math.min(2, dpr));
    };

    applyPixelRatio();

    if (typeof window !== 'undefined' && window.matchMedia) {
      const dpr1 = window.matchMedia(`(resolution: ${window.devicePixelRatio || 1}dppx)`);
      try {
        dpr1.addEventListener('change', applyPixelRatio);
        return () => dpr1.removeEventListener('change', applyPixelRatio);
      } catch {
        // متصفحات قديمة
      }
    }
    return undefined;
  }, []);

  // تنظيف مؤقتات تحديثات زوم الخانات (منقول من الأثر القديم أعلاه)
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
  const backgroundColor = useEditorStore((s) => s.backgroundColor);
  const backgroundGradientColor2 = useEditorStore((s) => s.backgroundGradientColor2);
  const backgroundGradientAngle = useEditorStore((s) => s.backgroundGradientAngle);
  const selectedId = useEditorStore((s) => s.selectedId);
  const selectedIds = useEditorStore(useShallow((s) => s.selectedIds));
  const snapToGrid = useEditorStore((s) => s.snapToGrid);

  const selectElement = useEditorStore((s) => s.selectElement);
  const toggleElementSelection = useEditorStore((s) => s.toggleElementSelection);
  const updateElement = useEditorStore((s) => s.updateElement);
  const updateSlot = useEditorStore((s) => s.updateSlot);
  const pushHistory = useEditorStore((s) => s.pushHistory);

  const handleSlotWheel = React.useCallback(
    (slot: { id: string; imageSrc?: string; zoom?: number }, e: KonvaEventObject<WheelEvent>) => {
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
    },
    [pushHistory, updateSlot],
  );

  const grid = useEditorStore(
    useShallow((s) => ({
      showGrid: s.showGrid,
      gridSize: s.gridSize,
      gridColor: s.gridColor,
      gridOpacity: s.gridOpacity,
      gridSubdivisions: s.gridSubdivisions,
      gridType: s.gridType,
    })),
  );
  const { showGrid, gridSize, gridColor, gridOpacity, gridSubdivisions, gridType } = grid;

  const columns = useEditorStore(
    useShallow((s) => ({
      showColumns: s.showColumns,
      columnsCount: s.columnsCount,
      columnsColor: s.columnsColor,
      columnsMargin: s.columnsMargin,
      columnsGutter: s.columnsGutter,
    })),
  );
  const { showColumns, columnsCount, columnsColor, columnsMargin, columnsGutter } = columns;

  const collage = useEditorStore(
    useShallow((s) => ({
      slots: s.slots,
      collageGap: s.collageGap,
      collageMargin: s.collageMargin,
      collageTemplate: s.collageTemplate,
      collageRadius: s.collageRadius,
      collageShowCutLines: s.collageShowCutLines,
      collageShowEndCutLine: s.collageShowEndCutLine,
      collageStrokeWidth: s.collageStrokeWidth,
      collageStrokeColor: s.collageStrokeColor,
    })),
  );
  const {
    slots,
    collageGap,
    collageMargin,
    collageTemplate,
    collageRadius,
    collageShowCutLines,
    collageShowEndCutLine,
    collageStrokeWidth,
    collageStrokeColor,
  } = collage;

  const trRef = useRef<Konva.Transformer | null>(null);
  const dragLayerRef = useRef<Konva.Layer | null>(null);
  // 🛡️ ref مستقر الهوية لطبقة السحب: دالة ref مضمّنة تُخلق من جديد مع كل
  // رندر، فيستدعيها React بالقيمة null ثم بالطبقة عند كل إعادة رندر — وكان
  // null يُسقط التسجيل ويمسح home/touchedLayers أثناء السحب النشط. بالهوية
  // المستقرة لا يصل null إلا عند unmount الحقيقي، فيُنظَّف التسجيل قصداً
  // (registerDragLayer(null) يصفّر الحالة كما صُمم في drag-layer.ts).
  const handleDragLayerRef = React.useCallback((l: Konva.Layer | null) => {
    dragLayerRef.current = l;
    registerDragLayer(l);
  }, []);
  const elementsRefs = useRef<Record<string, Konva.Node>>({});
  // 🚀 آخر عقد مربوطة بالمحول — تخطي nodes()+forceUpdate()+batchDraw()
  // عندما لا يتغير شيء فعلياً (sortedElements تتبدل هويتها مع كل tick ستور).
  // ⚠️ يجب تتبع هوية المحوّل نفسه أيضاً: إلغاء التحديد يفكّ تركيب المحوّل
  // (selectedIds.length > 0 شرط العرض) وإعادة التحديد تركّب نسخة جديدة —
  // فتخطي الربط عند تشابه العقد فقط كان يترك المحوّل الجديد بلا عقد.
  const attachedTrNodesRef = useRef<Konva.Node[]>([]);
  const attachedTrInstanceRef = useRef<Konva.Transformer | null>(null);
  // مجموعة معرّفات التحديد المربوطة حالياً — أساس مقارنة M19 بدل مصفوفة العقد
  const attachedSelectedIdsRef = useRef<Set<string>>(new Set());
  // 🚀 تسجيل طبقة السحب الرسمية + مزود إضافاتها (المحوّل وشارة الأبعاد
  // يرافقان العقدة المسحوبة لطبقة السحب حتى لا يختفيا تحتها).
  useEffect(() => {
    registerDragExtrasProvider(() => {
      const tr = trRef.current;
      if (!tr) return [];
      const nodes: Konva.Node[] = [tr];
      try {
        const badge = tr.getParent()?.findOne('.transformer-badge');
        if (badge) nodes.push(badge as unknown as Konva.Node);
      } catch {
        // بلا شارة — المحوّل وحده كافٍ
      }
      return nodes;
    });
    return () => {
      registerDragExtrasProvider(null);
      registerDragLayer(null);
    };
  }, []);

  const altPressedRef = useRef(false);
  const shiftPressedRef = useRef(false);
  const stageContextRef = useStageRef();

  const marqueeRectRef = useRef<Konva.Rect | null>(null);
  const isMarqueeDraggingRef = useRef(false);
  const marqueeStartPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const marqueeInitialSelectedRef = useRef<string[]>([]);
  const marqueeBoxRef = useRef<{ x: number; y: number; width: number; height: number }>({
    x: 0,
    y: 0,
    width: 0,
    height: 0,
  });

  const checkerPattern = useMemo(() => {
    if (typeof document === 'undefined') return undefined;
    const canvas = document.createElement('canvas');
    canvas.width = 20;
    canvas.height = 20;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, 20, 20);
      ctx.fillStyle = checkerColor();
      ctx.fillRect(0, 0, 10, 10);
      ctx.fillRect(10, 10, 10, 10);
    }
    return canvas;
  }, []);

  const getLogicalPointerPos = React.useCallback(
    (stage: Konva.Stage): { x: number; y: number } | null => {
      const pos = stage.getPointerPosition();
      if (!pos) return null;
      // 🧭 في معمارية Viewport Canvas: الـ Stage يملأ النافذة ويحمل إزاحته ومقياسه مباشرة.
      // عكس مصفوفة تحويل المسرح تعيد إحداثيات المؤشر إلى الفضاء المنطقي الدقيق للورقة O(1).
      const transform = stage.getAbsoluteTransform().copy().invert();
      return transform.point(pos);
    },
    [],
  );

  const finishMarquee = React.useCallback(
    (isMulti?: boolean) => {
      if (!isMarqueeDraggingRef.current || mode !== 'single') return;
      isMarqueeDraggingRef.current = false;

      const rectNode = marqueeRectRef.current;
      if (rectNode) {
        rectNode.visible(false);
        rectNode.size({ width: 0, height: 0 });
        rectNode.getLayer()?.batchDraw();
      }

      const box = marqueeBoxRef.current;
      // إذا كانت الحركة مجرد نقرة بسيطة (< 4px)، لا نعتبرها سحب صندوق
      if (box.width < 4 && box.height < 4) {
        return;
      }

      const currentElements = useEditorStore.getState().elements;
      const newlySelectedIds = currentElements
        .filter((el) => !el.locked && el.visible !== false)
        .filter((el) => {
          const vBox = getElementPixelVisualBox(
            el.x * canvasWidth,
            el.y * canvasHeight,
            el.width * canvasWidth,
            el.height * canvasHeight,
            el.rotation || 0,
          );
          const elBox = {
            x: vBox.minX,
            y: vBox.minY,
            width: vBox.width,
            height: vBox.height,
          };
          return Konva.Util.haveIntersection(box, elBox);
        })
        .map((el) => el.id);

      // إذا كان أي عنصر ينتمي لمجموعة، وسّع التحديد ليشمل كامل أعضاء مجموعته
      const expandedIds = new Set<string>();
      for (const id of newlySelectedIds) {
        const el = currentElements.find((e) => e.id === id);
        if (el?.groupId) {
          for (const member of currentElements) {
            if (member.groupId === el.groupId) {
              expandedIds.add(member.id);
            }
          }
        } else {
          expandedIds.add(id);
        }
      }
      const finalNewlySelected = Array.from(expandedIds);

      const multi = isMulti ?? shiftPressedRef.current;
      if (multi) {
        const combined = Array.from(
          new Set([...marqueeInitialSelectedRef.current, ...finalNewlySelected]),
        );
        useEditorStore.getState().setSelectedIds(combined);
      } else {
        useEditorStore.getState().setSelectedIds(finalNewlySelected);
      }
    },
    [canvasWidth, canvasHeight, mode],
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Alt') altPressedRef.current = true;
      if (e.key === 'Shift') shiftPressedRef.current = true;
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Alt') altPressedRef.current = false;
      if (e.key === 'Shift') shiftPressedRef.current = false;
    };
    // مع Alt+Tab يُسرق حدث keyup فيبقى Alt/Shift «عالقاً» —
    // نصفّر المراجع عند فقدان النافذة للتركيز أو إخفائها.
    const resetKeys = () => {
      altPressedRef.current = false;
      shiftPressedRef.current = false;
      if (isMarqueeDraggingRef.current) {
        isMarqueeDraggingRef.current = false;
        if (marqueeRectRef.current) {
          marqueeRectRef.current.visible(false);
          marqueeRectRef.current.size({ width: 0, height: 0 });
          marqueeRectRef.current.getLayer()?.batchDraw();
        }
      }
    };
    const handleVisibility = () => {
      if (document.hidden) resetKeys();
    };
    const handlePointerUpGlobal = (e: PointerEvent) => {
      if (isMarqueeDraggingRef.current) {
        const isMulti = e.shiftKey || e.ctrlKey || e.metaKey || shiftPressedRef.current;
        finishMarquee(isMulti);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', resetKeys);
    window.addEventListener('pointerup', handlePointerUpGlobal);
    window.addEventListener('pointercancel', handlePointerUpGlobal);
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', resetKeys);
      window.removeEventListener('pointerup', handlePointerUpGlobal);
      window.removeEventListener('pointercancel', handlePointerUpGlobal);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [finishMarquee]);

  useEffect(() => {
    const tr = trRef.current;
    if (!tr) {
      // المحوّل مفكوك (لا تحديد) — صفّر المتتبع ولا شيء يُمسح.
      attachedTrNodesRef.current = [];
      attachedSelectedIdsRef.current = new Set<string>();
      attachedTrInstanceRef.current = null;
      return;
    }
    if (mode === 'single' && selectedIds.length > 0) {
      const nodes = selectedIds.map((id) => elementsRefs.current[id]).filter(Boolean);
      const prev = attachedTrNodesRef.current;
      // 🛡️ M19 من تدقيق 2026-10-08: المقارنة كانت بالطول والتطابق فقط. عندما
      // يخرج عنصر محدد من حدود الرسم يُفكَّك (يرجع null) فتُصبح nodes فارغة
      // بينما prev فارغة أيضاً ⇒ `sameNodes` صادقة ⇒ نُبقي المجموعة القديمة
      // المرتبطة بعقدة مفصولة، فتُرسم المقابض في موقع قديم ويُكتب التحويل في
      // عقدة ميتة. نُقارن مجموعة المعرّفات فعلياً لا مصفوفة العقد.
      const prevIds = attachedSelectedIdsRef.current;
      const sameIds =
        prevIds.size === selectedIds.length && selectedIds.every((id) => prevIds.has(id));
      // نحتفظ بالعقد الحيّة فقط: مرجع عقدة مفصولة يجب ألا يبقى في القائمة
      const liveNodes =
        prev.length === nodes.length ? nodes.filter((n) => n.getStage() === tr.getStage()) : nodes;
      const sameNodes =
        sameIds && liveNodes.length === prev.length && liveNodes.every((n, i) => n === prev[i]);
      // إذا كانت العقد متطابقة (لا إعادة ربط)، حدّث الصندوق المحيط للمحوّل فقط.
      // 🔒 نحترم حاجز الإيماءة نفسه الذي يفرضه Konva داخلياً
      // (`if (!this._transforming && !this.isDragging()) this.update()`) لأن
      // forceUpdate() تتخطاه: إعادة حساب الصندوق في منتصف سحب مقبض تُزحزح
      // المقابض تحت المؤشر. المسار الشائع (تغيّر أبعاد العقدة/موضعها) يلتقطه
      // Konva ذاتياً عبر width/heightChange وabsoluteTransformChange؛
      // والاستدعاء هنا شبكة أمان للهندسة التي تتغيّر من الأبناء بلا حدث على العقدة.
      if (sameNodes && attachedTrInstanceRef.current === tr) {
        if (!tr.isTransforming() && !tr.isDragging()) {
          tr.forceUpdate();
          tr.getLayer()?.batchDraw();
        }
        return;
      }
      attachedTrNodesRef.current = nodes;
      attachedTrInstanceRef.current = tr;
      attachedSelectedIdsRef.current = new Set(selectedIds);
      tr.nodes(nodes);
      tr.forceUpdate();
      tr.getLayer()?.batchDraw();
    } else {
      if (attachedTrNodesRef.current.length === 0 && attachedTrInstanceRef.current === tr) return;
      attachedTrNodesRef.current = [];
      attachedTrInstanceRef.current = tr;
      attachedSelectedIdsRef.current = new Set<string>();
      tr.nodes([]);
      tr.getLayer()?.batchDraw();
    }
  }, [selectedIds, mode, sortedElements]);

  const handleStageMouseDown = (e: KonvaEventObject<MouseEvent | TouchEvent>) => {
    if (
      'button' in e.evt &&
      ((e.evt as MouseEvent).button === 2 || (e.evt as MouseEvent).button === 1)
    )
      return;

    const isBackgroundOrEmpty = e.target === e.target.getStage() || e.target.hasName('bg-rect');
    if (!isBackgroundOrEmpty) return;

    // الماركي بالماوس فقط: على اللمس (touch-action: pan-x pan-y عام) كان بدء
    // الماركي يستولي على إيماءة التمرير فيصير سحب الإصبع تحديداً. العناصر
    // تبقى قابلة للسحب والتحديد باللمس عبر onTouchStart الخاص بها، ونقر
    // الخلفية باللمس ما زال يلغي التحديد.
    if (e.type !== 'mousedown') {
      selectElement(null);
      return;
    }

    if (mode === 'single') {
      const stage = stageContextRef.current || e.target.getStage();
      if (!stage) return;
      const logicalPos = getLogicalPointerPos(stage);
      if (!logicalPos) return;

      const isMulti = e.evt.shiftKey || e.evt.ctrlKey || e.evt.metaKey;
      isMarqueeDraggingRef.current = true;
      marqueeStartPosRef.current = logicalPos;
      marqueeBoxRef.current = { x: logicalPos.x, y: logicalPos.y, width: 0, height: 0 };
      marqueeInitialSelectedRef.current = isMulti ? useEditorStore.getState().selectedIds : [];

      if (!isMulti) {
        selectElement(null);
      }

      const rectNode = marqueeRectRef.current;
      if (rectNode) {
        rectNode.position(logicalPos);
        rectNode.size({ width: 0, height: 0 });
        rectNode.visible(false);
      }
    } else {
      selectElement(null);
    }
  };

  const handleStageMouseMove = (e: KonvaEventObject<MouseEvent | TouchEvent>) => {
    if (!isMarqueeDraggingRef.current || mode !== 'single') return;
    const stage = stageContextRef.current || e.target.getStage();
    if (!stage) return;
    const logicalPos = getLogicalPointerPos(stage);
    if (!logicalPos) return;

    const start = marqueeStartPosRef.current;
    const x = Math.min(start.x, logicalPos.x);
    const y = Math.min(start.y, logicalPos.y);
    const width = Math.abs(logicalPos.x - start.x);
    const height = Math.abs(logicalPos.y - start.y);

    marqueeBoxRef.current = { x, y, width, height };

    const rectNode = marqueeRectRef.current;
    if (rectNode) {
      rectNode.position({ x, y });
      rectNode.size({ width, height });
      if (!rectNode.visible() && (width > 3 || height > 3)) {
        rectNode.visible(true);
      }
      rectNode.getLayer()?.batchDraw();
    }
  };

  const handleStageMouseUp = (e: KonvaEventObject<MouseEvent | TouchEvent>) => {
    if (!isMarqueeDraggingRef.current) return;
    const isMulti = 'evt' in e && (e.evt?.shiftKey || e.evt?.ctrlKey || e.evt?.metaKey);
    finishMarquee(Boolean(isMulti));
  };

  const handleElementChange = React.useCallback(
    (id: string, patch: Partial<CanvasElement>) => {
      updateElement(id, patch);
    },
    [updateElement],
  );

  const createElementMouseDown = React.useCallback(
    (elId: string) => (e: KonvaEventObject<MouseEvent>) => {
      const isMulti = e?.evt?.shiftKey || e?.evt?.ctrlKey || e?.evt?.metaKey;
      if (!isMulti) {
        const { selectedIds } = useEditorStore.getState();
        if (!selectedIds.includes(elId)) {
          selectElement(elId);
        }
      } else {
        toggleElementSelection(elId);
      }
    },
    [selectElement, toggleElementSelection],
  );

  const createElementClick = React.useCallback(
    (elId: string) => (e: KonvaEventObject<MouseEvent>) => {
      const isMulti = e?.evt?.shiftKey || e?.evt?.ctrlKey || e?.evt?.metaKey;
      if (!isMulti) {
        const { selectedIds } = useEditorStore.getState();
        if (selectedIds.includes(elId)) {
          selectElement(elId);
        }
      }
    },
    [selectElement],
  );

  const elementRefCache = React.useRef<Map<string, { current: Konva.Node | null }>>(new Map());

  // تنظيف مراجع العناصر المحذوفة من كاش elementRefCache لمنع تراكم الذاكرة
  useEffect(() => {
    const liveIds = new Set(sortedElements.map((e) => e.id));
    for (const id of elementRefCache.current.keys()) {
      if (!liveIds.has(id)) {
        elementRefCache.current.delete(id);
      }
    }
  }, [sortedElements]);

  const createElementRef = React.useCallback((elId: string) => {
    let cached = elementRefCache.current.get(elId);
    if (!cached) {
      cached = {
        get current() {
          return elementsRefs.current[elId];
        },
        set current(val: Konva.Node | null) {
          if (val) {
            elementsRefs.current[elId] = val;
          } else {
            delete elementsRefs.current[elId];
          }
        },
      };
      elementRefCache.current.set(elId, cached);
    }
    return cached;
  }, []);

  return (
    <Stage
      width={viewportW}
      height={viewportH}
      x={stagePos.x}
      y={stagePos.y}
      scaleX={stageScale}
      scaleY={stageScale}
      onMouseDown={handleStageMouseDown}
      onTouchStart={handleStageMouseDown as unknown as (e: KonvaEventObject<TouchEvent>) => void}
      onMouseMove={handleStageMouseMove}
      onTouchMove={handleStageMouseMove as unknown as (e: KonvaEventObject<TouchEvent>) => void}
      onMouseUp={handleStageMouseUp}
      onTouchEnd={handleStageMouseUp as unknown as (e: KonvaEventObject<TouchEvent>) => void}
      onDragStart={() => {
        useCanvasInteraction.getState().setIsDragging(true);
      }}
      onDragEnd={() => {
        useCanvasInteraction.getState().setIsDragging(false);
      }}
      dragDistance={5}
      onContextMenu={(e) => {
        e.evt.preventDefault();
        onContextMenu?.(e);
      }}
      ref={(stage) => {
        stageContextRef.current = stage;
        // 🧪 DEV-only: مقبض اختبار E2E لفحص المحوّل (يُزال من الإنتاج بالتقسيم الميت)
        if (import.meta.env.DEV && typeof window !== 'undefined') {
          (window as unknown as { __gridoStage?: Konva.Stage | null }).__gridoStage = stage;
        }
      }}
    >
      {/* 📄 طبقة ظل الورقة والخلفية الأساسية */}
      <Layer listening={false}>
        <Rect
          name="paper-shadow-rect"
          x={0}
          y={0}
          width={canvasWidth}
          height={canvasHeight}
          fill={backgroundColor === 'transparent' ? undefined : '#ffffff'}
          fillPatternImage={
            backgroundColor === 'transparent'
              ? (checkerPattern as unknown as HTMLImageElement)
              : undefined
          }
          shadowColor="rgba(0, 0, 0, 0.28)"
          shadowBlur={24 / stageScale}
          shadowOffset={{ x: 0, y: 8 / stageScale }}
          shadowOpacity={0.35}
          perfectDrawEnabled={false}
        />
      </Layer>

      <KonvaBackgroundLayer
        canvasWidth={canvasWidth}
        canvasHeight={canvasHeight}
        backgroundColor={backgroundColor}
        backgroundGradientColor2={backgroundGradientColor2}
        backgroundGradientAngle={backgroundGradientAngle}
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

      {mode === 'collage' && (
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

      {mode === 'single' && (
        <KonvaSingleLayer
          sortedElements={sortedElements}
          selectedIds={selectedIds}
          canvasWidth={canvasWidth}
          canvasHeight={canvasHeight}
          snapToGrid={snapToGrid}
          gridSize={gridSize}
          elementsRefs={elementsRefs}
          altPressedRef={altPressedRef}
          shiftPressedRef={shiftPressedRef}
          setActiveGuides={setActiveGuides}
          handleDoubleClick={handleDoubleClick}
          handleElementChange={handleElementChange}
          createElementMouseDown={createElementMouseDown}
          createElementClick={createElementClick}
          createElementRef={createElementRef}
        />
      )}

      {/* 🛠️ طبقة الأدوات والتفاعل العلوية: تفصل المحوّل ومستطيل التحديد
      عن طبقة المحتوى لمنع إعادة رسم الصور والنصوص أثناء التحجيم وسحب التحديد */}
      {mode === 'single' && (
        <KonvaOverlayLayer
          selectedIds={selectedIds}
          sortedElements={sortedElements}
          canvasWidth={canvasWidth}
          canvasHeight={canvasHeight}
          displayW={displayW}
          trRef={trRef}
          elementsRefs={elementsRefs}
          altPressedRef={altPressedRef}
          setActiveGuides={setActiveGuides}
          marqueeRectRef={marqueeRectRef}
        />
      )}

      {/* 🚀 طبقة السحب الرسمية (Konva drag-layer pattern): تستقبل العقدة
      المسحوبة أثناء السحب فقط، فتُرسم عقدة واحدة لا الطبقة كاملة. */}
      <Layer
        ref={handleDragLayerRef}
        listening={false}
        clipX={0}
        clipY={0}
        clipWidth={canvasWidth}
        clipHeight={canvasHeight}
      />
    </Stage>
  );
});
