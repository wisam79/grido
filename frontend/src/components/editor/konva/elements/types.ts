import { CanvasElement } from "@/lib/editor-store";

export interface ElementProps {
  element: CanvasElement;
  isSelected: boolean;
  onMouseDown: (e: any) => void;
  onTouchStart: (e: any) => void;
  onClick: (e: any) => void;
  onTap: (e: any) => void;
  onChange: (patch: Partial<CanvasElement>) => void;
  displayW: number;
  displayH: number;
  allElements: CanvasElement[];
  setActiveGuides: (guides: any[]) => void;
  elementRef: React.MutableRefObject<any>;
  snapToGrid?: boolean;
  gridSize?: number;
  altPressedRef: React.RefObject<boolean>;
  onDblClick?: () => void;
  getKonvaNode: (id: string) => any;
}

export const propsAreEqual = (prev: ElementProps, next: ElementProps) => {
  return prev.element === next.element &&
         prev.isSelected === next.isSelected &&
         prev.displayW === next.displayW &&
         prev.displayH === next.displayH &&
         prev.snapToGrid === next.snapToGrid &&
         prev.gridSize === next.gridSize;
};
