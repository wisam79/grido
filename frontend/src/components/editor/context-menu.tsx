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
  const focusIndexRef = React.useRef(0);
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

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      const menu = menuRef.current;
      if (!menu) return;
      const items = menu.querySelectorAll<HTMLElement>("[role='menuitem']");
      if (items.length === 0) return;

      if (e.key === "ArrowDown") {
        e.preventDefault();
        const next = (focusIndexRef.current + 1) % items.length;
        focusIndexRef.current = next;
        items[next]?.focus();
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        const prev = (focusIndexRef.current - 1 + items.length) % items.length;
        focusIndexRef.current = prev;
        items[prev]?.focus();
      } else if (e.key === "Home") {
        e.preventDefault();
        focusIndexRef.current = 0;
        items[0]?.focus();
      } else if (e.key === "End") {
        e.preventDefault();
        const last = items.length - 1;
        focusIndexRef.current = last;
        items[last]?.focus();
      }
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
    // إعادة تعيين فهرس التركيز عند تغير الهدف
    focusIndexRef.current = 0;
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
      role="menu"
      tabIndex={-1}
      aria-label="قائمة السياق"
      className="fixed z-[9999] w-auto min-w-[130px] max-w-[220px] bg-card border border-border/50 shadow-2xl rounded-md py-1 text-sm font-cairo overflow-hidden select-none animate-in fade-in-50 zoom-in-95 duration-100 outline-none"
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
            role="menuitem"
            tabIndex={-1}
            className="w-full text-right px-3 py-1.5 hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground flex items-center gap-2 transition-colors whitespace-nowrap cursor-pointer outline-none"
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
            role="menuitem"
            tabIndex={-1}
            className="w-full text-right px-3 py-1.5 hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground flex items-center gap-2 transition-colors whitespace-nowrap cursor-pointer outline-none"
            onClick={() => handleAction(() => bringToFront(target.id!))}
          >
            <ArrowUpToLine className="w-4 h-4 shrink-0" />
            <span>إحضار للأمام</span>
          </button>
          
          <button
            role="menuitem"
            tabIndex={-1}
            className="w-full text-right px-3 py-1.5 hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground flex items-center gap-2 transition-colors whitespace-nowrap cursor-pointer outline-none"
            onClick={() => handleAction(() => sendToBack(target.id!))}
          >
            <ArrowDownToLine className="w-4 h-4 shrink-0" />
            <span>إرسال للخلف</span>
          </button>

          <div className="h-px bg-border/50 my-1 mx-2" role="separator" />
          
          <button
            role="menuitem"
            tabIndex={-1}
            className="w-full text-right px-3 py-1.5 hover:bg-destructive/10 focus:bg-destructive/10 text-destructive flex items-center gap-2 transition-colors whitespace-nowrap cursor-pointer outline-none"
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
            role="menuitem"
            tabIndex={-1}
            className="w-full text-right px-3 py-1.5 hover:bg-destructive/10 focus:bg-destructive/10 text-destructive flex items-center gap-2 transition-colors whitespace-nowrap cursor-pointer outline-none"
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
