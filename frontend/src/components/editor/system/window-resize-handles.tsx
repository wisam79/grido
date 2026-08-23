import React, { useRef } from "react";
import { WindowGetSize, WindowSetSize, WindowGetPosition, WindowSetPosition } from "../../../../wailsjs/runtime/runtime";

interface StartState {
  startWidth: number;
  startHeight: number;
  startX: number;
  startY: number;
  startMouseX: number;
  startMouseY: number;
}

export function WindowResizeHandles() {
  // تنظيف السحب النشط — يمنع تسجيل معالجات متزامنة تتقاتل على نفس النافذة (إصلاح Bug#22)
  const activeDragCleanupRef = useRef<(() => void) | null>(null);

  const minWidth = 900;
  const minHeight = 600;

  const handleMouseDown = (
    e: React.MouseEvent<HTMLDivElement>,
    direction: "n" | "s" | "e" | "w" | "nw" | "ne" | "sw" | "se"
  ) => {
    e.preventDefault();
    e.stopPropagation();

    // الزر الأيسر فقط — النقر الأيمن/الأوسط كان يبدأ سحباً ويكتب قائمة السياق
    if (e.button !== 0) return;
    // سحب واحد في كل مرة — تداخل سحبين كان يفسد حالة البداية المشتركة
    if (activeDragCleanupRef.current) return;

    // المعالجات تُربط بشكل متزامن فوراً — الربط بعد نداء IPC كان يفقد mouseup
    // إذا أفلت المستخدم بسرعة فيستمر تغيير الحجم مع حركة المؤشر (سحب عالق)
    let startState: StartState | null = null;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!startState) return; // IPC لم يُكمل بعد — نتجاهل حتى تجهز الحالة

      const { startWidth, startHeight, startX, startY, startMouseX, startMouseY } = startState;

      const deltaX = moveEvent.screenX - startMouseX;
      const deltaY = moveEvent.screenY - startMouseY;

      let newWidth = startWidth;
      let newHeight = startHeight;
      let newX = startX;
      let newY = startY;

      let sizeChanged = false;
      let posChanged = false;

      // Vertical resizing
      if (direction.includes("n")) {
        const calculatedHeight = startHeight - deltaY;
        if (calculatedHeight >= minHeight) {
          newHeight = calculatedHeight;
          newY = startY + deltaY;
          sizeChanged = true;
          posChanged = true;
        }
      } else if (direction.includes("s")) {
        const calculatedHeight = startHeight + deltaY;
        if (calculatedHeight >= minHeight) {
          newHeight = calculatedHeight;
          sizeChanged = true;
        }
      }

      // Horizontal resizing
      if (direction.includes("w")) {
        const calculatedWidth = startWidth - deltaX;
        if (calculatedWidth >= minWidth) {
          newWidth = calculatedWidth;
          newX = startX + deltaX;
          sizeChanged = true;
          posChanged = true;
        }
      } else if (direction.includes("e")) {
        const calculatedWidth = startWidth + deltaX;
        if (calculatedWidth >= minWidth) {
          newWidth = calculatedWidth;
          sizeChanged = true;
        }
      }

      if (sizeChanged && posChanged) {
        WindowSetSize(newWidth, newHeight);
        WindowSetPosition(newX, newY);
      } else if (sizeChanged) {
        WindowSetSize(newWidth, newHeight);
      } else if (posChanged) {
        WindowSetPosition(newX, newY);
      }
    };

    const cleanup = () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      window.removeEventListener("blur", cleanup);
      activeDragCleanupRef.current = null;
    };
    const handleMouseUp = () => cleanup();

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    // فقدان تركيز النافذة أثناء السحب ينهيه بأمان بدل سحب يتيم
    window.addEventListener("blur", cleanup);
    activeDragCleanupRef.current = cleanup;

    Promise.all([WindowGetSize(), WindowGetPosition()])
      .then(([size, pos]) => {
        startState = {
          startWidth: size.w,
          startHeight: size.h,
          startX: pos.x,
          startY: pos.y,
          startMouseX: e.screenX,
          startMouseY: e.screenY,
        };
      })
      .catch((err) => {
        console.error("Failed to get window state for resizing:", err);
        cleanup();
      });
  };

  // Border size in pixels
  const borderSize = 4;

  return (
    <>
      {/* Top Border */}
      <div
        className="fixed left-2 right-2 top-0 bg-transparent select-none"
        style={{ height: borderSize, cursor: "n-resize", zIndex: 9999 }}
        onMouseDown={(e) => handleMouseDown(e, "n")}
      />
      {/* Bottom Border */}
      <div
        className="fixed left-2 right-2 bottom-0 bg-transparent select-none"
        style={{ height: borderSize, cursor: "s-resize", zIndex: 9999 }}
        onMouseDown={(e) => handleMouseDown(e, "s")}
      />
      {/* Left Border */}
      <div
        className="fixed top-2 bottom-2 left-0 bg-transparent select-none"
        style={{ width: borderSize, cursor: "w-resize", zIndex: 9999 }}
        onMouseDown={(e) => handleMouseDown(e, "w")}
      />
      {/* Right Border */}
      <div
        className="fixed top-2 bottom-2 right-0 bg-transparent select-none"
        style={{ width: borderSize, cursor: "e-resize", zIndex: 9999 }}
        onMouseDown={(e) => handleMouseDown(e, "e")}
      />

      {/* Top Left Corner */}
      <div
        className="fixed top-0 left-0 bg-transparent select-none"
        style={{ width: borderSize * 2, height: borderSize * 2, cursor: "nwse-resize", zIndex: 9999 }}
        onMouseDown={(e) => handleMouseDown(e, "nw")}
      />
      {/* Top Right Corner */}
      <div
        className="fixed top-0 right-0 bg-transparent select-none"
        style={{ width: borderSize * 2, height: borderSize * 2, cursor: "nesw-resize", zIndex: 9999 }}
        onMouseDown={(e) => handleMouseDown(e, "ne")}
      />
      {/* Bottom Left Corner */}
      <div
        className="fixed bottom-0 left-0 bg-transparent select-none"
        style={{ width: borderSize * 2, height: borderSize * 2, cursor: "nesw-resize", zIndex: 9999 }}
        onMouseDown={(e) => handleMouseDown(e, "sw")}
      />
      {/* Bottom Right Corner */}
      <div
        className="fixed bottom-0 right-0 bg-transparent select-none"
        style={{ width: borderSize * 2, height: borderSize * 2, cursor: "nwse-resize", zIndex: 9999 }}
        onMouseDown={(e) => handleMouseDown(e, "se")}
      />
    </>
  );
}
