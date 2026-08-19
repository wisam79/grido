import React, { useEffect, useRef } from "react";
import { Text as KonvaText, Rect as KonvaRect, Group } from "react-konva";
import Konva from "konva";
import { TextElement, useEditorStore } from "@/lib/editor-store";
import { useKonvaDrag } from "@/hooks/use-konva-drag";
import { ElementProps, propsAreEqual } from "./types";
import { getFillProps } from "./fill-utils";

export const KonvaTextElement = React.memo(function KonvaTextElement({ 
  element: _element, 
  isSelected, 
  onMouseDown,
  onTouchStart,
  onClick,
  onTap, 
  onChange, 
  canvasWidth: stageCanvasWidth, 
  canvasHeight, 
  setActiveGuides, 
  elementRef, 
  snapToGrid, 
  gridSize, 
  altPressedRef, 
  onDblClick, 
  getKonvaNode 
}: ElementProps) {
  const element = _element as TextElement;
  const editingTextId = useEditorStore((state) => state.editingTextId);
  const canvasWidth = useEditorStore((state) => state.canvasWidth) || 2480;
  const hasAnimatedRef = React.useRef(false);
  const textRef = useRef<any>(null);

  const {
    onDragStart,
    dragBoundFunc,
    onDragMove,
    onDragEnd,
  } = useKonvaDrag({
    element,
    canvasWidth: stageCanvasWidth,
    canvasHeight,
    snapToGrid,
    gridSize,
    altPressedRef,
    getKonvaNode,
    setActiveGuides,
  });

  useEffect(() => {
    const node = elementRef.current;
    if (node && !hasAnimatedRef.current) {
      hasAnimatedRef.current = true;
      const targetOpacity = editingTextId === element.id ? 0 : element.opacity;
      node.opacity(0);
      node.scale({ x: 0.8, y: 0.8 });
      node.to({
        opacity: targetOpacity,
        scaleX: element.flipX === true ? -1 : 1,
        scaleY: element.flipY === true ? -1 : 1,
        duration: 0.28,
        easing: Konva.Easings.BackEaseOut
      });
    }
  }, [elementRef, element.opacity, element.flipX, element.flipY, editingTextId, element.id]);
  
  // Sync auto height back to store so bounding boxes and overlays stay perfect
  // استخدام ref لمنع الحلقة الدائرية — نتوقف عن التحديث إذا كان الارتفاع الجديد مطابقاً
  const lastSetHeightRef = useRef<number | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  useEffect(() => {
    const textNode = textRef.current;
    if (textNode) {
      const actualHeight = textNode.height() / canvasHeight;
      // تجاهل إذا كان الارتفاع المحسوب مطابقاً لما قامنا بتعيينه سابقاً
      if (lastSetHeightRef.current !== null && Math.abs(actualHeight - lastSetHeightRef.current) < 0.001) {
        return;
      }
      if (Math.abs(actualHeight - element.height) > 0.005) {
        lastSetHeightRef.current = actualHeight;
        onChangeRef.current({ height: actualHeight });
      }
    }
  }, [element.text, element.fontSize, element.fontFamily, element.fontWeight, element.fontStyle, element.textAlign, element.color, element.width, element.id, canvasHeight, element.wrap]);

  const flipped = element.flipX === true;
  const flippedY = element.flipY === true;
  const w = element.width * stageCanvasWidth;
  const h = element.height * canvasHeight;

  // فحص هل يحتوي النص على أحرف عربية لمنع تقطيع الأحرف المتصلة (Letter Spacing Exploding)
  const rawText = element.text || "";
  const isArabic = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/.test(rawText);
  const spacing = element.letterSpacing || 0;

  let renderText = rawText;
  let effectiveLetterSpacing = spacing;

  if (isArabic && spacing > 0) {
    effectiveLetterSpacing = 0; // إلغاء التباعد بين الأحرف لمنع تفكيك وتفجير أحرف الكلمة الواحدة
    const extraSpaces = " ".repeat(Math.min(6, Math.max(1, Math.round(spacing / 3.5))));
    renderText = rawText.replace(/ /g, extraSpaces);
  }

  if (element.textTransform === "uppercase") {
    renderText = renderText.toUpperCase();
  } else if (element.textTransform === "lowercase") {
    renderText = renderText.toLowerCase();
  } else if (element.textTransform === "capitalize") {
    renderText = renderText.replace(/\b\w/g, (c) => c.toUpperCase());
  }

  const hasBg = !!element.textBgColor && element.textBgColor !== "transparent";
  const bgPadding = element.textBgPadding || 0;
  const bgRadius = element.textBgRadius || 0;
  const sharedX = flipped ? (element.x + element.width) * stageCanvasWidth : element.x * stageCanvasWidth;
  const sharedY = flippedY ? (element.y + element.height) * canvasHeight : element.y * canvasHeight;
  const sharedScaleY = flippedY ? -1 : 1;
  const sharedOpacity = editingTextId === element.id ? 0 : element.opacity;

  return (
    <Group
      ref={elementRef}
      x={sharedX}
      y={sharedY}
      width={w}
      height={h}
      scaleX={flipped ? -1 : 1}
      scaleY={sharedScaleY}
      rotation={element.rotation || 0}
      opacity={sharedOpacity}
      visible={element.visible !== false}
      id={element.id}
      draggable={!element.locked && isSelected}
      onDragStart={onDragStart}
      dragBoundFunc={dragBoundFunc}
      onDragMove={onDragMove}
      onDragEnd={onDragEnd}
      onMouseDown={onMouseDown}
      onTouchStart={onTouchStart}
      onClick={onClick}
      onTap={onTap}
      onDblClick={onDblClick}
      onDblTap={onDblClick}
    >
      {/* Hit area and background badge for seamless clicking and dragging */}
      <KonvaRect
        x={-bgPadding}
        y={-bgPadding}
        width={w + bgPadding * 2}
        height={h + bgPadding * 2}
        cornerRadius={bgRadius}
        fill={hasBg ? element.textBgColor : "rgba(0,0,0,0.0001)"}
        perfectDrawEnabled={false}
      />
      <KonvaText
        ref={textRef}
        x={0}
        y={0}
        width={w}
        text={renderText}
        perfectDrawEnabled={false}
        globalCompositeOperation={element.globalCompositeOperation as any || "source-over"}
        shadowColor={element.shadowColor}
        shadowBlur={element.shadowBlur || 0}
        shadowOffsetX={element.shadowOffsetX || 0}
        shadowOffsetY={element.shadowOffsetY || 0}
        shadowOpacity={element.shadowOpacity ?? 0}
        fontSize={element.fontSize || 16}
        fontStyle={[
          element.fontStyle === "italic" ? "italic" : "",
          element.fontWeight ? String(element.fontWeight) : "400",
        ].filter(Boolean).join(" ")}
        {...getFillProps(element, w, h)}
        fontFamily={element.fontFamily || "sans-serif"}
        align={element.textAlign || "center"}
        lineHeight={element.lineHeight ?? 1.2}
        letterSpacing={effectiveLetterSpacing}
        stroke={element.strokeWidth ? (element.stroke || "#000000") : undefined}
        strokeWidth={element.strokeWidth || undefined}
        textDecoration={element.textDecoration || ""}
        wrap={element.wrap || "word"}
        ellipsis={false}
      />
    </Group>
  );
}, propsAreEqual);
