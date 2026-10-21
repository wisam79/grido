import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type RefObject,
} from 'react';
import { useShallow } from 'zustand/react/shallow';

import { useEditorStore } from '@/lib/editor-store';

type DomPointerEvent = PointerEvent;

export interface DragGuideState {
  type: 'h' | 'v';
  pos: number; // 0..1 نسبي إلى الكانفس
  guideId?: string;
}

/**
 * تثبيت الموضع النسبي على حافة بكسل مادية (device pixel) حتى تُرسم الخطوط
 * الإرشادية بسماكة موحدة 1px حادة دائماً — بدونه يقع الخط بين بكسلين فيظهر
 * بسمك 2px ضبابي في سحبة، و1px حاد في أخرى (الشكوى: سمك عشوائي لكل سحبة).
 */
export function snapGuidePosToPixel(pos: number, displayDim: number): number {
  if (!displayDim || displayDim <= 0) return pos;
  const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
  const px = Math.round(pos * displayDim * dpr);
  return px / (displayDim * dpr);
}

/**
 * 🧭 الخطوط الإرشادية للمستخدم: السحب من المساطر، المحاذاة المغناطيسية نحو
 * حواف/مراكز الورقة والعناصر، الحذف بالسحب خارج الكانفس أو بالنقر المزدوج.
 * 🛡️ كانت هذه الكتلة مضمّنة في EditorCanvas.
 */
export function useUserGuides(
  innerRef: RefObject<HTMLDivElement | null>,
  displayW: number,
  displayH: number,
  printMode: boolean,
  elements: { x: number; y: number; width: number; height: number }[],
) {
  const [dragGuideState, setDragGuideState] = useState<DragGuideState | null>(null);

  const { lockUserGuides, addUserGuide, updateUserGuide, removeUserGuide } = useEditorStore(
    useShallow((state) => ({
      lockUserGuides: state.lockUserGuides,
      addUserGuide: state.addUserGuide,
      updateUserGuide: state.updateUserGuide,
      removeUserGuide: state.removeUserGuide,
    })),
  );

  // محاذاة مغناطيسية ذكية للخطوط الإرشادية أثناء السحب نحو الحواف والمراكز والعناصر
  const snapGuidePos = useCallback(
    (rawPos: number, type: 'h' | 'v', displayDim: number): number => {
      if (displayDim <= 0) return rawPos;
      const SNAP_THRESHOLD_PX = 6;
      const thresholdNorm = SNAP_THRESHOLD_PX / displayDim;

      // أهداف المغناطيسية: 0 (البداية)، 0.5 (المنتصف)، 1 (النهاية)
      const targets = [0, 0.5, 1];

      // أهداف حواف ومراكز العناصر المضافة على الكانفاس
      for (const el of elements) {
        if (type === 'h') {
          targets.push(el.y, el.y + el.height / 2, el.y + el.height);
        } else {
          targets.push(el.x, el.x + el.width / 2, el.x + el.width);
        }
      }

      for (const target of targets) {
        if (Math.abs(rawPos - target) < thresholdNorm) {
          return target;
        }
      }
      return rawPos;
    },
    [elements],
  );

  // بدء سحب خط إرشادي جديد من المسطرة الأفقية
  const handleStartDragHGuide = useCallback(
    (e: ReactPointerEvent<SVGSVGElement>) => {
      if (printMode || !innerRef.current || displayH <= 0 || lockUserGuides) return;
      e.preventDefault();
      const paperRect = innerRef.current.getBoundingClientRect();
      const relY = (e.clientY - paperRect.top) / displayH;
      setDragGuideState({
        type: 'h',
        pos: snapGuidePos(snapGuidePosToPixel(relY, paperRect.height), 'h', displayH),
      });
    },
    [printMode, displayH, lockUserGuides, snapGuidePos, innerRef],
  );

  // بدء سحب خط إرشادي جديد من المسطرة الرأسية
  const handleStartDragVGuide = useCallback(
    (e: ReactPointerEvent<SVGSVGElement>) => {
      if (printMode || !innerRef.current || displayW <= 0 || lockUserGuides) return;
      e.preventDefault();
      const paperRect = innerRef.current.getBoundingClientRect();
      const relX = (e.clientX - paperRect.left) / displayW;
      setDragGuideState({
        type: 'v',
        pos: snapGuidePos(snapGuidePosToPixel(relX, paperRect.width), 'v', displayW),
      });
    },
    [printMode, displayW, lockUserGuides, snapGuidePos, innerRef],
  );

  const dragGuideStateRef = useRef(dragGuideState);
  const addUserGuideRef = useRef(addUserGuide);
  const updateUserGuideRef = useRef(updateUserGuide);
  const removeUserGuideRef = useRef(removeUserGuide);
  const snapGuidePosRef = useRef(snapGuidePos);

  useEffect(() => {
    dragGuideStateRef.current = dragGuideState;
    addUserGuideRef.current = addUserGuide;
    updateUserGuideRef.current = updateUserGuide;
    removeUserGuideRef.current = removeUserGuide;
    snapGuidePosRef.current = snapGuidePos;
  });

  // متابعة سحب الخط الإرشادي عالمياً — يُربط المستمع مرة واحدة عند بدء السحب ويُزال عند انتهائه
  const isDragging = Boolean(dragGuideState);
  useEffect(() => {
    if (!isDragging) return;

    let moveRafId: number | null = null;
    let pendingEvent: DomPointerEvent | null = null;

    const flushMove = () => {
      moveRafId = null;
      const e = pendingEvent;
      if (!e) return;
      const current = dragGuideStateRef.current;
      if (!current || !innerRef.current) return;
      const paperRect = innerRef.current.getBoundingClientRect();
      if (current.type === 'h') {
        const h = paperRect.height || 1;
        const rawPos = (e.clientY - paperRect.top) / h;
        // تثبيت على بكسل مادي ثم مغناطيسية — بهذا الترتيب يبقى الخط 1px حاداً
        // حتى عند عدم التقاط أي هدف مغناطيسي
        const pos = snapGuidePosRef.current(snapGuidePosToPixel(rawPos, h), 'h', h);
        setDragGuideState((prev) => (prev ? { ...prev, pos } : null));
      } else {
        const w = paperRect.width || 1;
        const rawPos = (e.clientX - paperRect.left) / w;
        const pos = snapGuidePosRef.current(snapGuidePosToPixel(rawPos, w), 'v', w);
        setDragGuideState((prev) => (prev ? { ...prev, pos } : null));
      }
    };

    const handlePointerMove = (e: DomPointerEvent) => {
      pendingEvent = e;
      if (moveRafId === null) {
        moveRafId = requestAnimationFrame(flushMove);
      }
    };

    const handlePointerUp = () => {
      if (moveRafId !== null) {
        cancelAnimationFrame(moveRafId);
        moveRafId = null;
      }
      const current = dragGuideStateRef.current;
      if (current) {
        const { type, pos, guideId } = current;
        if (pos >= -0.04 && pos <= 1.04) {
          const clamped = Math.min(1, Math.max(0, pos));
          if (guideId) {
            updateUserGuideRef.current(guideId, clamped);
          } else {
            addUserGuideRef.current({ type, pos: clamped });
          }
        } else if (guideId) {
          // سحبه خارج الكانفس يؤدي إلى حذفه
          removeUserGuideRef.current(guideId);
        }
        setDragGuideState(null);
      }
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    return () => {
      if (moveRafId !== null) {
        cancelAnimationFrame(moveRafId);
      }
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [isDragging, innerRef]);

  return {
    dragGuideState,
    setDragGuideState,
    handleStartDragHGuide,
    handleStartDragVGuide,
  };
}
