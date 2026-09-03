import { useCallback, useEffect, useState, type PointerEvent as ReactPointerEvent, type RefObject } from "react";

type DomPointerEvent = PointerEvent;
import { useEditorStore } from "@/lib/editor-store";
import { useShallow } from "zustand/react/shallow";

export interface DragGuideState {
  type: "h" | "v";
  pos: number; // 0..1 نسبي إلى الكانفس
  guideId?: string;
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
  elements: { x: number; y: number; width: number; height: number }[]
) {
  const [dragGuideState, setDragGuideState] = useState<DragGuideState | null>(null);

  const {
    lockUserGuides,
    addUserGuide,
    updateUserGuide,
    removeUserGuide,
  } = useEditorStore(useShallow((state) => ({
    lockUserGuides: state.lockUserGuides,
    addUserGuide: state.addUserGuide,
    updateUserGuide: state.updateUserGuide,
    removeUserGuide: state.removeUserGuide,
  })));

  // محاذاة مغناطيسية ذكية للخطوط الإرشادية أثناء السحب نحو الحواف والمراكز والعناصر
  const snapGuidePos = useCallback((rawPos: number, type: "h" | "v", displayDim: number): number => {
    if (displayDim <= 0) return rawPos;
    const SNAP_THRESHOLD_PX = 6;
    const thresholdNorm = SNAP_THRESHOLD_PX / displayDim;

    // أهداف المغناطيسية: 0 (البداية)، 0.5 (المنتصف)، 1 (النهاية)
    const targets = [0, 0.5, 1];

    // أهداف حواف ومراكز العناصر المضافة على الكانفاس
    for (const el of elements) {
      if (type === "h") {
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
  }, [elements]);

  // بدء سحب خط إرشادي جديد من المسطرة الأفقية
  const handleStartDragHGuide = useCallback((e: ReactPointerEvent<SVGSVGElement>) => {
    if (printMode || !innerRef.current || displayH <= 0 || lockUserGuides) return;
    e.preventDefault();
    const paperRect = innerRef.current.getBoundingClientRect();
    const relY = (e.clientY - paperRect.top) / displayH;
    setDragGuideState({
      type: "h",
      pos: snapGuidePos(relY, "h", displayH),
    });
  }, [printMode, displayH, lockUserGuides, snapGuidePos, innerRef]);

  // بدء سحب خط إرشادي جديد من المسطرة الرأسية
  const handleStartDragVGuide = useCallback((e: ReactPointerEvent<SVGSVGElement>) => {
    if (printMode || !innerRef.current || displayW <= 0 || lockUserGuides) return;
    e.preventDefault();
    const paperRect = innerRef.current.getBoundingClientRect();
    const relX = (e.clientX - paperRect.left) / displayW;
    setDragGuideState({
      type: "v",
      pos: snapGuidePos(relX, "v", displayW),
    });
  }, [printMode, displayW, lockUserGuides, snapGuidePos, innerRef]);

  // متابعة سحب الخط الإرشادي عالمياً
  useEffect(() => {
    if (!dragGuideState) return;

    const handlePointerMove = (e: DomPointerEvent) => {
      if (!innerRef.current) return;
      const paperRect = innerRef.current.getBoundingClientRect();
      if (dragGuideState.type === "h") {
        const h = paperRect.height || 1;
        const rawPos = (e.clientY - paperRect.top) / h;
        const pos = snapGuidePos(rawPos, "h", h);
        setDragGuideState((prev) => (prev ? { ...prev, pos } : null));
      } else {
        const w = paperRect.width || 1;
        const rawPos = (e.clientX - paperRect.left) / w;
        const pos = snapGuidePos(rawPos, "v", w);
        setDragGuideState((prev) => (prev ? { ...prev, pos } : null));
      }
    };

    const handlePointerUp = () => {
      if (dragGuideState) {
        const { type, pos, guideId } = dragGuideState;
        if (pos >= -0.04 && pos <= 1.04) {
          const clamped = Math.min(1, Math.max(0, pos));
          if (guideId) {
            updateUserGuide(guideId, clamped);
          } else {
            addUserGuide({ type, pos: clamped });
          }
        } else if (guideId) {
          // سحبه خارج الكانفس يؤدي إلى حذفه
          removeUserGuide(guideId);
        }
        setDragGuideState(null);
      }
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [dragGuideState, addUserGuide, updateUserGuide, removeUserGuide, snapGuidePos, innerRef]);

  return {
    dragGuideState,
    setDragGuideState,
    handleStartDragHGuide,
    handleStartDragVGuide,
  };
}
