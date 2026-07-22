import React, { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useEditorStore } from "@/lib/editor-store";
import { 
  Copy, 
  Trash2, 
  ArrowUpToLine, 
  ArrowDownToLine, 
  Eraser 
} from "lucide-react";

export interface ContextMenuPosition {
  x: number;
  y: number;
}

export interface ContextMenuTarget {
  id: string | null;
  type: "element" | "slot" | "canvas";
}

interface ContextMenuProps {
  position: ContextMenuPosition;
  target: ContextMenuTarget;
  onClose: () => void;
}

export function ContextMenu({ position, target, onClose }: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const {
    duplicateElement,
    duplicateElements,
    removeElement,
    bringToFront,
    sendToBack,
    updateSlot,
    pushHistory,
  } = useEditorStore();

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    
    // Use capture phase to ensure it triggers before other handlers
    document.addEventListener("mousedown", handleClickOutside, true);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside, true);
    };
  }, [onClose]);

  // Handle ESC key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const handleAction = (action: () => void) => {
    action();
    onClose();
  };

  const handleActionWithHistory = (action: () => void) => {
    action();
    pushHistory();
    onClose();
  };

  const [menuSize, setMenuSize] = React.useState<{ w: number; h: number } | null>(null);

  useEffect(() => {
    if (menuRef.current) {
      setMenuSize({
        w: menuRef.current.offsetWidth,
        h: menuRef.current.offsetHeight
      });
    }
  }, [target, position.x, position.y]);

  const size = menuSize || { w: 150, h: 160 };

  let maxRight = window.innerWidth - 8;
  let maxBottom = window.innerHeight - 8;
  let minLeft = 8;
  let minTop = 8;

  const canvasArea = document.getElementById("canvas-area");
  if (canvasArea) {
    const rect = canvasArea.getBoundingClientRect();
    maxRight = Math.min(maxRight, rect.right);
    maxBottom = Math.min(maxBottom, rect.bottom);
    minLeft = Math.max(minLeft, rect.left);
    minTop = Math.max(minTop, rect.top);
  }

  // Calculate position with flips if it exceeds the available space
  let left = position.x;
  let top = position.y;
  let originX = "left";
  let originY = "top";

  if (left + size.w > maxRight) {
    left = position.x - size.w;
    originX = "right";
  }
  if (top + size.h > maxBottom) {
    top = position.y - size.h;
    originY = "bottom";
  }

  // Final clamping to ensure it doesn't go off the left/top edges 
  left = Math.max(minLeft, Math.min(left, maxRight - size.w));
  top = Math.max(minTop, Math.min(top, maxBottom - size.h));

  return createPortal(
    <div
      ref={menuRef}
      className="fixed z-[9999] w-auto min-w-[130px] max-w-[220px] bg-card border border-border/50 shadow-2xl rounded-md py-1 text-sm font-cairo overflow-hidden select-none animate-in fade-in-50 zoom-in-95 duration-100"
      style={{
        left: `${left}px`,
        top: `${top}px`,
        transformOrigin: `${originY} ${originX}`,
        visibility: menuSize === null ? 'hidden' : 'visible'
      }}
      onContextMenu={(e) => e.preventDefault()}
    >
      {target.type === "element" && target.id && (
        <>
          <button
            className="w-full text-right px-3 py-1.5 hover:bg-accent hover:text-accent-foreground flex items-center gap-2 transition-colors whitespace-nowrap cursor-pointer"
            onClick={() => handleAction(() => {
              const { selectedIds } = useEditorStore.getState();
              if (selectedIds.length > 1) {
                duplicateElements(selectedIds);
              } else {
                duplicateElement(target.id!);
              }
            })}
          >
            <Copy className="w-4 h-4 shrink-0" />
            <span>تكرار</span>
          </button>
          
          <button
            className="w-full text-right px-3 py-1.5 hover:bg-accent hover:text-accent-foreground flex items-center gap-2 transition-colors whitespace-nowrap cursor-pointer"
            onClick={() => handleAction(() => bringToFront(target.id!))}
          >
            <ArrowUpToLine className="w-4 h-4 shrink-0" />
            <span>إحضار للأمام</span>
          </button>
          
          <button
            className="w-full text-right px-3 py-1.5 hover:bg-accent hover:text-accent-foreground flex items-center gap-2 transition-colors whitespace-nowrap cursor-pointer"
            onClick={() => handleAction(() => sendToBack(target.id!))}
          >
            <ArrowDownToLine className="w-4 h-4 shrink-0" />
            <span>إرسال للخلف</span>
          </button>

          <div className="h-px bg-border/50 my-1 mx-2" />
          
          <button
            className="w-full text-right px-3 py-1.5 hover:bg-destructive/10 text-destructive flex items-center gap-2 transition-colors whitespace-nowrap cursor-pointer"
            onClick={() => handleAction(() => {
              const { selectedIds, removeElements } = useEditorStore.getState();
              if (selectedIds.length > 1) {
                removeElements(selectedIds);
              } else {
                removeElement(target.id!);
              }
            })}
          >
            <Trash2 className="w-4 h-4 shrink-0" />
            <span>حذف</span>
          </button>
        </>
      )}

      {target.type === "slot" && target.id && (
        <>
          <button
            className="w-full text-right px-3 py-1.5 hover:bg-destructive/10 text-destructive flex items-center gap-2 transition-colors whitespace-nowrap cursor-pointer"
            onClick={() => handleActionWithHistory(() => updateSlot(target.id!, { imageSrc: undefined, originalImageSrc: undefined }))}
          >
            <Eraser className="w-4 h-4 shrink-0" />
            <span>تفريغ الخلية</span>
          </button>
        </>
      )}

    </div>,
    document.body
  );
}
