import { CanvasElement } from "@/lib/editor-store";
import { KonvaEventObject } from "konva/lib/Node";
import type Konva from "konva";
import type { SnapGuide } from "@/lib/canvas/snap-utils";

/**
 * عناصر Konva داخل `elementRef` تتنوع (Group/Rect/Image/Text/...).
 * `Konva.Shape` هو الجذر المشترك لجميع العناصر المرئية في react-konva،
 * فنمرّر النوع عبر cast محلي في مواقع الاستهلاك.
 */
export interface ElementProps {
  element: CanvasElement;
  isSelected: boolean;
  onMouseDown: (e: KonvaEventObject<MouseEvent>) => void;
  onTouchStart: (e: KonvaEventObject<TouchEvent>) => void;
  onClick: (e: KonvaEventObject<MouseEvent>) => void;
  onTap: (e: KonvaEventObject<TouchEvent>) => void;
  onChange: (patch: Partial<CanvasElement>) => void;
  canvasWidth: number;
  canvasHeight: number;
  allElements: CanvasElement[];
  setActiveGuides: (guides: SnapGuide[]) => void;
  elementRef: React.MutableRefObject<Konva.Node | null>;
  snapToGrid?: boolean;
  gridSize?: number;
  altPressedRef: React.RefObject<boolean>;
  shiftPressedRef?: React.RefObject<boolean>;
  onDblClick?: () => void;
  getKonvaNode: (id: string) => Konva.Node | null;
}

export const propsAreEqual = (prev: ElementProps, next: ElementProps) => {
  return prev.element === next.element &&
         prev.isSelected === next.isSelected &&
         prev.canvasWidth === next.canvasWidth &&
         prev.canvasHeight === next.canvasHeight &&
         prev.snapToGrid === next.snapToGrid &&
         prev.gridSize === next.gridSize &&
         // onDblClick يغلق على حالة المكوّن (مثل isLoading) — تجاهله كان يجمّد
         // نسخة قديمة من المعالج داخل العقدة فيصمت النقر المزدوج (إصلاح Bug#16)
         prev.onDblClick === next.onDblClick;
};
