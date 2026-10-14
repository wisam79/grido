import React from 'react';
import { Layer } from 'react-konva';
import type Konva from 'konva';
import type { KonvaEventObject } from 'konva/lib/Node';
import { CanvasElement } from '@/lib/editor-store';
import { SnapGuide } from '@/lib/canvas/snap-utils';
import { URLImage, KonvaTextElement, KonvaShapeElement } from '../konva-elements';
import { isBoxOffscreen as _isBoxOffscreen } from '@/lib/canvas/viewport-culling';
import type { ViewRect } from '@/lib/canvas/viewport-culling';

interface KonvaSingleLayerProps {
  sortedElements: CanvasElement[];
  selectedIds: string[];
  canvasWidth: number;
  canvasHeight: number;
  snapToGrid: boolean;
  gridSize: number;
  elementsRefs: React.MutableRefObject<Record<string, Konva.Node>>;
  altPressedRef: React.MutableRefObject<boolean>;
  shiftPressedRef: React.MutableRefObject<boolean>;
  setActiveGuides: (guides: SnapGuide[]) => void;
  handleDoubleClick: (el: CanvasElement) => void;
  handleElementChange: (id: string, patch: Partial<CanvasElement>) => void;
  createElementMouseDown: (elId: string) => (e: KonvaEventObject<MouseEvent>) => void;
  createElementClick: (elId: string) => (e: KonvaEventObject<MouseEvent>) => void;
  createElementRef: (elId: string) => { current: Konva.Node | null };
  /** صندوق العرض المنطقي — يُحسب في konva-canvas ويُمرر لتجنب إعادة حسابه لكل عنصر */
  viewRect?: ViewRect;
  /** لا culling في المستندات الصغيرة — Konva الرسمي: visible(false) أرخص من remove لكن حسابات isOffscreen لها كلفة على <40 عنصر */
  shouldCull?: boolean;
  visible?: boolean;
  listening?: boolean;
}

/**
 * 🎨 طبقة محتوى العناصر النقية (Pure Elements Content Layer).
 *
 * مخصصة حصراً لتصيير صور ونصوص وأشكال المستخدم.
 * أُزيل منها المحوّل (Transformer) ومستطيل التحديد (Marquee Selection) ونُقلا
 * إلى طبقة الأدوات المستقلة (KonvaOverlayLayer) لحماية العناصر من إعادة الرسم
 * عند سحب التحديد أو التحجيم.
 */
export const KonvaSingleLayer = React.memo(function KonvaSingleLayer({
  sortedElements,
  selectedIds,
  canvasWidth,
  canvasHeight,
  snapToGrid,
  gridSize,
  elementsRefs,
  altPressedRef,
  shiftPressedRef,
  setActiveGuides,
  handleDoubleClick,
  handleElementChange,
  createElementMouseDown,
  createElementClick,
  createElementRef,
  viewRect,
  shouldCull,
  visible = true,
  listening = true,
}: KonvaSingleLayerProps) {
  // 🚀 Map بالمعرفات بدل find لكل محدد — O(n) مرة واحدة بدل O(Selected×Elements)
  // في كل رندر (كان يتكرر لكل تغيير ستور مع كثافة عناصر عالية)
  const elementsById = React.useMemo(
    () => new Map(sortedElements.map((el) => [el.id, el])),
    [sortedElements],
  );

  const elementsByIdRef = React.useRef(elementsById);
  elementsByIdRef.current = elementsById;
  const handleDoubleClickRef = React.useRef(handleDoubleClick);
  handleDoubleClickRef.current = handleDoubleClick;
  const handleElementChangeRef = React.useRef(handleElementChange);
  handleElementChangeRef.current = handleElementChange;

  const dblClickHandlersRef = React.useRef<Map<string, () => void>>(new Map());
  const getDblClickHandler = React.useCallback((id: string) => {
    let handler = dblClickHandlersRef.current.get(id);
    if (!handler) {
      handler = () => {
        const targetEl = elementsByIdRef.current.get(id);
        if (targetEl) {
          handleDoubleClickRef.current(targetEl);
        }
      };
      dblClickHandlersRef.current.set(id, handler);
    }
    return handler;
  }, []);

  const changeHandlersRef = React.useRef<Map<string, (patch: Partial<CanvasElement>) => void>>(
    new Map(),
  );
  const getChangeHandler = React.useCallback((id: string) => {
    let handler = changeHandlersRef.current.get(id);
    if (!handler) {
      handler = (patch: Partial<CanvasElement>) => {
        handleElementChangeRef.current(id, patch);
      };
      changeHandlersRef.current.set(id, handler);
    }
    return handler;
  }, []);

  // تنظيف المعرفات المحذوفة من كاش المعالجات لمنع تراكم الذاكرة
  React.useEffect(() => {
    const liveIds = new Set(sortedElements.map((e) => e.id));
    for (const id of dblClickHandlersRef.current.keys()) {
      if (!liveIds.has(id)) dblClickHandlersRef.current.delete(id);
    }
    for (const id of changeHandlersRef.current.keys()) {
      if (!liveIds.has(id)) changeHandlersRef.current.delete(id);
    }
  }, [sortedElements]);

  return (
    <Layer
      name="elements-content-layer"
      clipX={0}
      clipY={0}
      clipWidth={canvasWidth}
      clipHeight={canvasHeight}
      visible={visible}
      listening={listening}
      // content layer تفاعلية — hit graph مطلوب للتحديد. overlay يفصل المحوّل لمنع إعادة رسمها كاملة.
      clearBeforeDraw
      hitGraphEnabled // صراحةً لتجنب التباس مع الطبقات الثابتة
    >
      {sortedElements.map((el) => {
        if (el.visible === false) return null;

        // 🔍 حذف خارج الكانفس + viewport-culling (Konva الرسمي: Very large scenes)
        // المرحلة 1: خارج حدود الورقة (0..1) مع دعم الدوران — Bug#11
        const rad = ((el.rotation || 0) * Math.PI) / 180;
        const cos = Math.cos(rad);
        const sin = Math.sin(rad);
        const w01 = el.width;
        const h01 = el.height;
        const cornersX = [0, w01 * cos, w01 * cos - h01 * sin, -h01 * sin];
        const cornersY = [0, w01 * sin, w01 * sin + h01 * cos, h01 * cos];
        const minX = el.x + Math.min(...cornersX);
        const maxX = el.x + Math.max(...cornersX);
        const minY = el.y + Math.min(...cornersY);
        const maxY = el.y + Math.max(...cornersY);

        if (minX > 1.25 || minY > 1.25 || maxX < -0.25 || maxY < -0.25) {
          return null;
        }

        // المرحلة 2: viewport-culling — العناصر خارج العرض تُخفى بـ visible=false
        // (أرخص من remove) وتُظهر عند الرجوع. المحددة لا تُقص أبداً.
        const isSelected = selectedIds.includes(el.id);
        if (
          shouldCull &&
          !isSelected &&
          viewRect &&
          _isBoxOffscreen(
            el.x * canvasWidth,
            el.y * canvasHeight,
            el.width * canvasWidth,
            el.height * canvasHeight,
            el.rotation || 0,
            viewRect,
          )
        ) {
          return null;
        }

        const handleMouseDown = createElementMouseDown(el.id);
        const handleClick = createElementClick(el.id);

        const elementProps = {
          element: el,
          isSelected, // محسوب أعلاه للـ culling — بلا إعادة includes
          onMouseDown: handleMouseDown,
          onTouchStart: handleMouseDown as unknown as (e: KonvaEventObject<TouchEvent>) => void,
          onClick: handleClick,
          onTap: handleClick as unknown as (e: KonvaEventObject<TouchEvent>) => void,
          onChange: getChangeHandler(el.id),
          canvasWidth,
          canvasHeight,
          allElements: sortedElements,
          setActiveGuides,
          snapToGrid,
          gridSize,
          altPressedRef,
          shiftPressedRef,
          getKonvaNode: (id: string) => elementsRefs.current[id],
          elementRef: createElementRef(el.id),
        };

        if (el.type === 'image' && el.imageSrc) {
          return <URLImage key={el.id} {...elementProps} />;
        }
        if (el.type === 'text') {
          return (
            <KonvaTextElement
              key={el.id}
              {...elementProps}
              onDblClick={getDblClickHandler(el.id)}
            />
          );
        }
        if (el.type === 'shape') {
          return <KonvaShapeElement key={el.id} {...elementProps} />;
        }
        return null;
      })}
    </Layer>
  );
});
