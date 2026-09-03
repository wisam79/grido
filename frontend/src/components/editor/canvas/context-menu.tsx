import React, { useEffect, useRef, useState, Suspense, lazy } from "react";
import { createPortal } from "react-dom";
import { useEditorStore } from "@/lib/editor-store";
import { useShallow } from "zustand/react/shallow";
import { useBgRemoval } from "@/hooks/use-bg-removal";
import { useAiEnhance } from "@/hooks/use-ai-enhance";
import type { CanvasSlot, CanvasElement } from "@/lib/store/types";
import { ElementMenuSection } from "./context-menu/element-menu-section";
import { SlotMenuSection } from "./context-menu/slot-menu-section";
import { CanvasMenuSection } from "./context-menu/canvas-menu-section";

const CropDialog = lazy(() => import("../dialogs/crop-dialog").then((m) => ({ default: m.CropDialog })));

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
    updateSlot,
    updateElement,
    pushHistory,
  } = useEditorStore(useShallow((state) => ({
    updateSlot: state.updateSlot,
    updateElement: state.updateElement,
    pushHistory: state.pushHistory,
  })));

  const onUpdateSlot = (id: string, patch: Partial<CanvasSlot>) => {
    updateSlot(id, patch);
  };

  const onUpdateElement = (id: string, patch: Partial<CanvasElement>) => {
    updateElement(id, patch);
  };

  // 🧭 معالجات الذكاء الاصطناعي حسب نوع الهدف (كانت مضمّنة هنا)
  const { isRemovingBg, handleRemoveBg } = useBgRemoval(target.type === "slot" ? onUpdateSlot : onUpdateElement);
  const { isEnhancing, handleEnhance } = useAiEnhance(target.type === "slot" ? onUpdateSlot : onUpdateElement);

  const [cropTarget, setCropTarget] = useState<{
    imageSrc: string;
    originalImageSrc?: string;
    onSave: (croppedB64: string, dims?: { width: number; height: number }) => void;
  } | null>(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

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
    focusIndexRef.current = 0;
    // أعد القياس عندما يتغير محتوى القائمة أثناء فتحها (spinner ↔ نص) حتى لا تبقى المقاسات قديمة
  }, [target, position.x, position.y, isRemovingBg, isEnhancing]);

  const size = menuSize || { w: 190, h: 280 };

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

  left = Math.max(minLeft, Math.min(left, maxRight - size.w));
  top = Math.max(minTop, Math.min(top, maxBottom - size.h));

  const portal = createPortal(
    <div
      ref={menuRef}
      role="menu"
      tabIndex={-1}
      aria-label="قائمة السياق الموحدة"
      className="fixed z-[9999] w-[200px] bg-popover backdrop-blur-2xl border border-border rounded-xl p-1 text-xs font-cairo overflow-hidden select-none animate-in fade-in-80 zoom-in-95 duration-150 outline-none space-y-1 shadow-fluent-28 fluent-specular"
      style={{
        left: `${left}px`,
        top: `${top}px`,
        transformOrigin: `${originY} ${originX}`,
        visibility: menuSize === null ? 'hidden' : 'visible'
      }}
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* 🔹 الأقسام الثلاثة (كانت JSX ضخمة مضمّنة هنا) */}
      {target.type === "element" && target.id && (
        <ElementMenuSection
          targetId={target.id}
          onClose={onClose}
          handleAction={handleAction}
          setCropTarget={setCropTarget}
          isRemovingBg={isRemovingBg}
          isEnhancing={isEnhancing}
          handleRemoveBg={handleRemoveBg as (el: import("@/lib/store/types").ImageElement) => void}
          handleEnhance={handleEnhance as (el: import("@/lib/store/types").ImageElement) => void}
        />
      )}

      {target.type === "slot" && target.id && (
        <SlotMenuSection
          targetId={target.id}
          onClose={onClose}
          handleActionWithHistory={handleActionWithHistory}
          setCropTarget={setCropTarget}
          isRemovingBg={isRemovingBg}
          isEnhancing={isEnhancing}
          handleRemoveBg={handleRemoveBg as (slot: CanvasSlot) => void}
          handleEnhance={handleEnhance as (slot: CanvasSlot) => void}
          onUpdateSlot={onUpdateSlot}
        />
      )}

      {target.type === "canvas" && (
        <CanvasMenuSection handleAction={handleAction} />
      )}
    </div>,
    document.body
  );

  return (
    <>
      {!cropTarget && portal}
      {cropTarget && (
        <Suspense fallback={null}>
          <CropDialog
            open={!!cropTarget}
            onOpenChange={(op) => {
              if (!op) {
                setCropTarget(null);
                onClose();
              }
            }}
            imageSrc={cropTarget.imageSrc}
            originalImageSrc={cropTarget.originalImageSrc}
            onCropSave={(croppedB64, dims) => {
              cropTarget.onSave(croppedB64, dims);
              setCropTarget(null);
              onClose();
            }}
          />
        </Suspense>
      )}
    </>
  );
}
