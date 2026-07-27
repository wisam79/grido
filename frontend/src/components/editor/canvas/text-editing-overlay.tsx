import React from "react";
import { CanvasElement } from "@/lib/editor-store";

interface TextEditingOverlayProps {
  printMode: boolean;
  editingTextId: string | null;
  elements: CanvasElement[];
  displayW: number;
  displayH: number;
  canvasWidth: number;
  canvasHeight: number;
  updateElement: (id: string, patch: Partial<CanvasElement>) => void;
  pushHistory: () => void;
  setEditingTextId: (id: string | null) => void;
}

export const TextEditingOverlay = React.memo(function TextEditingOverlay({
  printMode,
  editingTextId,
  elements,
  displayW,
  displayH,
  canvasWidth,
  canvasHeight,
  updateElement,
  pushHistory,
  setEditingTextId,
}: TextEditingOverlayProps) {
  if (printMode || !editingTextId) return null;

  const textEl = elements.find((e) => e.id === editingTextId);
  if (!textEl || textEl.type !== "text") return null;

  const isArabicText = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/.test(textEl.text || "");
  const spacingVal = textEl.letterSpacing || 0;

  return (
    <textarea
      autoFocus
      className="absolute z-50 bg-transparent resize-none outline-none border-2 border-primary ring-0 m-0 p-0"
      style={{
        left: `${textEl.x * displayW}px`,
        top: `${textEl.y * displayH}px`,
        width: `${textEl.width * displayW}px`,
        height: `${textEl.height * displayH}px`,
        transform: `rotate(${textEl.rotation || 0}deg)`,
        transformOrigin: "top left",
        fontSize: `${(textEl.fontSize || 20) * Math.min(displayW / canvasWidth, displayH / canvasHeight)}px`,
        fontFamily: textEl.fontFamily || "Arial",
        fontWeight: textEl.fontWeight || 400,
        color: textEl.color || "#000000",
        textAlign: textEl.textAlign || "center",
        lineHeight: textEl.lineHeight || 1.2,
        letterSpacing: isArabicText ? "0px" : `${spacingVal}px`,
        wordSpacing: isArabicText ? `${spacingVal}px` : undefined,
        padding: "2px",
      }}
      defaultValue={textEl.text}
      onFocus={(e) => {
        e.target.select();
      }}
      onBlur={(e) => {
        updateElement(textEl.id, { text: e.target.value });
        pushHistory();
        setEditingTextId(null);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" && !e.shiftKey) {
          e.preventDefault();
          updateElement(textEl.id, { text: e.currentTarget.value });
          pushHistory();
          setEditingTextId(null);
        }
        if (e.key === "Escape") {
          e.preventDefault();
          setEditingTextId(null);
        }
      }}
    />
  );
});
