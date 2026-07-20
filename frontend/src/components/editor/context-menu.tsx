import React, { useEffect, useRef } from "react";
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

  const [menuWidth, setMenuWidth] = React.useState(150);

  useEffect(() => {
    if (menuRef.current) {
      setMenuWidth(menuRef.current.offsetWidth || 150);
    }
  }, [target]);

  const menuHeight = 160;

  const left = position.x + menuWidth > window.innerWidth ? position.x - menuWidth : position.x;
  const top = position.y + menuHeight > window.innerHeight ? position.y - menuHeight : position.y;

  return (
    <div
      ref={menuRef}
      className="fixed z-[9999] w-auto min-w-[130px] max-w-[220px] bg-card border border-border/50 shadow-2xl rounded-md py-1 text-sm font-cairo overflow-hidden select-none animate-in fade-in-50 zoom-in-95 duration-100"
      style={{
        left: `${Math.max(8, left)}px`,
        top: `${Math.max(8, top)}px`,
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

    </div>
  );
}
