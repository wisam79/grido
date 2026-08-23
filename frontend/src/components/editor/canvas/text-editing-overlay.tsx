import React, { useRef, useEffect } from "react";
import { CanvasElement } from "@/lib/editor-store";
import { TEXT_COLOR_DEFAULT } from "@/lib/canvas/canvas-colors";

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
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const textEl = elements.find((e) => e.id === editingTextId);
  const isValid = !printMode && !!editingTextId && !!textEl && textEl.type === "text";

  // Auto-focus and adjust height on mount
  useEffect(() => {
    if (isValid && textareaRef.current) {
      const textarea = textareaRef.current;
      textarea.focus();
      textarea.select();
      
      // Auto-grow height based on scrollHeight
      if (textarea.scrollHeight > textarea.clientHeight) {
        textarea.style.height = `${textarea.scrollHeight + 4}px`;
      }
    }
  }, [isValid, editingTextId]);

  if (!isValid || !textEl) return null;

  const isArabicText = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/.test(textEl.text || "");
  const spacingVal = textEl.letterSpacing || 0;
  const bgColor = textEl.textBgColor && textEl.textBgColor !== "transparent" ? textEl.textBgColor : "transparent";
  const scaleRatio = Math.min(displayW / canvasWidth, displayH / canvasHeight);
  const radiusPx = (textEl.textBgRadius || 0) * scaleRatio;
  const paddingXPx = (textEl.textBgPaddingX ?? textEl.textBgPadding ?? 0) * scaleRatio;
  const paddingYPx = (textEl.textBgPaddingY ?? textEl.textBgPadding ?? 0) * scaleRatio;

  const flippedX = textEl.flipX === true;
  const flippedY = textEl.flipY === true;

  const leftPx = flippedX ? (textEl.x + textEl.width) * displayW : textEl.x * displayW;
  const topPx = flippedY ? (textEl.y + textEl.height) * displayH : textEl.y * displayH;
  const widthPx = textEl.width * displayW;
  const minHeightPx = Math.max(30, textEl.height * displayH);

  const handleCommit = (newText: string) => {
    if (newText !== textEl.text) {
      updateElement(textEl.id, { text: newText });
      pushHistory();
    }
    setEditingTextId(null);
  };

  return (
    <div
      className="absolute z-50 pointer-events-auto font-cairo"
      style={{
        left: `${leftPx}px`,
        top: `${topPx}px`,
        width: `${widthPx}px`,
        transform: `rotate(${textEl.rotation || 0}deg) scale(${flippedX ? -1 : 1}, ${flippedY ? -1 : 1})`,
        transformOrigin: "top left",
      }}
    >
      <textarea
        ref={textareaRef}
        className="w-full bg-transparent resize-none outline-none ring-0 m-0 border-0 transition-shadow duration-150 custom-scrollbar block"
        style={{
          backgroundColor: bgColor,
          borderRadius: radiusPx > 0 ? `${radiusPx}px` : "4px",
          border: textEl.textBgBorderWidth ? `${textEl.textBgBorderWidth * scaleRatio}px solid ${textEl.textBgBorderColor || textEl.color || TEXT_COLOR_DEFAULT}` : undefined,
          padding: `${paddingYPx}px ${paddingXPx}px`,
          minHeight: `${minHeightPx}px`,
          fontSize: `${(textEl.fontSize || 20) * scaleRatio}px`,
          fontFamily: textEl.fontFamily || "Cairo, sans-serif",
          fontWeight: textEl.fontWeight || 400,
          fontStyle: textEl.fontStyle || "normal",
          textDecoration: textEl.textDecoration || "none",
          textTransform: textEl.textTransform || "none",
          color: textEl.color || TEXT_COLOR_DEFAULT,
          textAlign: textEl.textAlign || "center",
          lineHeight: textEl.lineHeight || 1.2,
          // التباعد قيمة منطقية على الكانفس — يجب تحجيمها مثل fontSize لتطابق
          // ما سيُرسم فعلياً (إصلاح Bug#12)
          letterSpacing: isArabicText ? "0px" : `${spacingVal * scaleRatio}px`,
          wordSpacing: isArabicText ? `${spacingVal * scaleRatio}px` : undefined,
          boxShadow: "0 0 0 2px var(--primary) , 0 0 0 4px color-mix(in srgb, var(--primary) 25%, transparent), 0 4px 20px rgba(0, 0, 0, 0.25)",
        }}
        defaultValue={textEl.text}
        onInput={(e) => {
          const target = e.currentTarget;
          target.style.height = "auto";
          target.style.height = `${Math.max(minHeightPx, target.scrollHeight)}px`;
        }}
        onBlur={(e) => {
          handleCommit(e.target.value);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleCommit(e.currentTarget.value);
          }
          if (e.key === "Escape") {
            e.preventDefault();
            handleCommit(e.currentTarget.value);
          }
        }}
      />
    </div>
  );
});
