import Konva from 'konva';
import React, { useEffect, useRef } from 'react';
import { Text as KonvaText, Rect as KonvaRect, Group, Shape as KonvaShape } from 'react-konva';

import { useAsyncImage } from '@/hooks/use-async-image';
import { useKonvaDrag } from '@/hooks/use-konva-drag';
import { TEXT_COLOR_DEFAULT } from '@/lib/canvas/canvas-colors';
import { drawCurvedText } from '@/lib/canvas/curved-text-utils';
import { createElementGlyphPainter } from '@/lib/canvas/fill-paint';
import { resolveTextRenderState } from '@/lib/canvas/text-helpers';
import { ensureTextStrokeFilter } from '@/lib/canvas/text-stroke-filter';
import { useEditorStore } from '@/lib/editor-store';
import { loadGoogleFont, onFontReady } from '@/lib/io/fonts';

import { withShadowlessDrag } from './drag-shadow';
import { getFillProps } from './fill-utils';
import { propsAreEqual } from './types';

import type { ElementProps } from './types';
import type { TextElement } from '@/lib/editor-store';

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
  shiftPressedRef,
  onDblClick,
  getKonvaNode,
}: ElementProps) {
  const element = _element as TextElement;
  // اختيار مُبسَّط: كل عقدة نص تُعيد منطقياً فقط «أنا قيد التحرير؟». بالنسبة
  // لبقية العقدات يظلّ الناتج false ثابتاً فلا يعلمها Zustand → لا إعادة رسم
  // جماعية عند بدء/إنهاء تحرير عقدة واحدة (100+ عقدة في المستندات الكثيفة).
  const isEditing = useEditorStore((state) => state.editingTextId === element.id);
  const hasAnimatedRef = React.useRef(false);
  const textRef = useRef<Konva.Text | null>(null);
  // صورة تعبئة النص — يُعاد استخدام نفس كاش الصور ونفس رياضيات نقش الأشكال
  const [fillImage] = useAsyncImage(element.fillType === 'image' ? element.fillImageSrc || '' : '');

  const { onDragStart, dragBoundFunc, onDragMove, onDragEnd } = useKonvaDrag({
    element,
    canvasWidth: stageCanvasWidth,
    canvasHeight,
    snapToGrid,
    gridSize,
    altPressedRef,
    shiftPressedRef,
    getKonvaNode,
    setActiveGuides,
  });

  useEffect(() => {
    const node = elementRef.current;
    if (node && !hasAnimatedRef.current) {
      hasAnimatedRef.current = true;
      const targetOpacity = isEditing ? 0 : element.opacity;
      node.opacity(0);
      node.scale({ x: 0.8, y: 0.8 });
      node.to({
        opacity: targetOpacity,
        scaleX: 1,
        scaleY: 1,
        duration: 0.28,
        easing: Konva.Easings.BackEaseOut,
      });
    }
  }, [elementRef, element.opacity, isEditing, element.id]);

  // Ensure font and weight variants are loaded dynamically.
  // Subscribe to font-ready events so Konva re-draws with correct metrics
  // instead of fallback-font measurements (per Konva official docs).
  useEffect(() => {
    if (element.fontFamily) {
      loadGoogleFont(element.fontFamily);
    }
    const unsubscribe = onFontReady(() => {
      const node = textRef.current;
      if (node) {
        // Force Konva to re-measure text with the newly loaded font
        (node as Konva.Text & { _setTextData?: () => void })._setTextData?.();
        node.getLayer()?.batchDraw();
      }
    });
    return unsubscribe;
  }, [element.fontFamily, element.fontWeight]);

  // Sync auto height back to store so bounding boxes and overlays stay perfect
  const lastSetHeightRef = useRef<number | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    if (!element.curve && textRef.current) {
      const node = textRef.current as Konva.Text;
      // قياس الارتفاع الفعلي لأسطر النص لمنع تجميده عند تمرير height لـ Konva verticalAlign
      const textHeightPx = node.textHeight || node.height();
      const naturalHeight = Math.max(0.01, textHeightPx / canvasHeight);
      const hasVAlign = element.textVerticalAlign && element.textVerticalAlign !== 'top';
      const actualHeight = hasVAlign ? Math.max(element.height || 0, naturalHeight) : naturalHeight;

      if (
        lastSetHeightRef.current === null ||
        Math.abs(lastSetHeightRef.current - actualHeight) > 0.001
      ) {
        lastSetHeightRef.current = actualHeight;
        onChangeRef.current({ height: actualHeight });
      }
    }
  }, [
    element.text,
    element.fontSize,
    element.fontFamily,
    element.fontWeight,
    element.fontStyle,
    element.textAlign,
    element.textVerticalAlign,
    element.color,
    element.width,
    element.id,
    element.height,
    canvasHeight,
    element.curve,
    element.lineHeight,
    element.letterSpacing,
    element.wrap,
    element.textTransform,
    element.arabicNumerals,
  ]);

  const flipped = element.flipX === true;
  const flippedY = element.flipY === true;
  const w = element.width * stageCanvasWidth;
  const h = element.height * canvasHeight;

  // تجهيز النص الموحّد (أرقام مشرقية + تحويلات حالة + تباعد كلمات عربي)
  // — نفس الدالة في التصدير تمنع انحراف المعاينة عن الملف النهائي.
  const {
    text: renderText,
    isArabic,
    letterSpacing: effectiveLetterSpacing,
  } = resolveTextRenderState({
    text: element.text,
    arabicNumerals: element.arabicNumerals,
    letterSpacing: element.letterSpacing,
    textTransform: element.textTransform,
  });

  const hasBg = !!element.textBgColor && element.textBgColor !== 'transparent';
  const bgPaddingX = element.textBgPaddingX ?? element.textBgPadding ?? 0;
  const bgPaddingY = element.textBgPaddingY ?? element.textBgPadding ?? 0;
  const bgRadius = element.textBgRadius || 0;
  const bgBorderWidth = element.textBgBorderWidth || 0;
  const bgBorderColor = element.textBgBorderColor || undefined;

  const nodeX = element.x * stageCanvasWidth;
  const nodeY = element.y * canvasHeight;
  const sharedOpacity = isEditing ? 0 : element.opacity;

  const hasCurve = typeof element.curve === 'number' && element.curve !== 0;
  const strokeW = element.strokeWidth || 0;
  const strokeColor = element.stroke || TEXT_COLOR_DEFAULT;
  const strokeFilterId = strokeW > 0 ? ensureTextStrokeFilter(strokeW, strokeColor) : '';

  // 🚀 إطفاء الظلال أثناء السحب بلا إعادة رسم React (انظر drag-shadow.ts).
  const { handleStart: handleShadowlessStart, handleEnd: handleShadowlessEnd } = withShadowlessDrag(
    () => elementRef.current as unknown as Konva.Group | null,
    onDragStart,
    onDragEnd,
  );

  return (
    <Group
      ref={elementRef as unknown as React.Ref<Konva.Group>}
      x={nodeX}
      y={nodeY}
      width={w}
      height={h}
      scaleX={1}
      scaleY={1}
      rotation={element.rotation || 0}
      opacity={sharedOpacity}
      visible={element.visible !== false}
      id={element.id}
      draggable={!element.locked && isSelected}
      onDragStart={handleShadowlessStart}
      dragBoundFunc={dragBoundFunc}
      onDragMove={onDragMove}
      onDragEnd={handleShadowlessEnd}
      onMouseDown={onMouseDown}
      onTouchStart={onTouchStart}
      onClick={onClick}
      onTap={onTap}
      onDblClick={onDblClick}
      onDblTap={onDblClick}
    >
      <Group
        x={w / 2}
        y={h / 2}
        offsetX={w / 2}
        offsetY={h / 2}
        scaleX={flipped ? -1 : 1}
        scaleY={flippedY ? -1 : 1}
        width={w}
        height={h}
      >
        {/* Hit area and background badge for seamless clicking and dragging */}
        <KonvaRect
          x={-bgPaddingX}
          y={-bgPaddingY}
          width={w + bgPaddingX * 2}
          height={h + bgPaddingY * 2}
          cornerRadius={bgRadius}
          fill={hasBg ? element.textBgColor : 'rgba(0,0,0,0.0001)'}
          stroke={bgBorderWidth > 0 ? bgBorderColor : undefined}
          strokeWidth={bgBorderWidth > 0 ? bgBorderWidth : undefined}
          perfectDrawEnabled={false}
        />

        {hasCurve ? (
          <KonvaShape
            ref={textRef}
            x={0}
            y={0}
            width={w}
            height={h}
            sceneFunc={(context) => {
              const ctx = context._context;
              drawCurvedText(ctx, {
                text: renderText,
                x: 0,
                y: 0,
                width: w,
                height: h,
                fontSize: element.fontSize || 16,
                fontFamily: element.fontFamily || 'Cairo, sans-serif',
                fontWeight: element.fontWeight || 400,
                fontStyle: element.fontStyle || 'normal',
                color: element.color || TEXT_COLOR_DEFAULT,
                // تدرج/صورة في فضاء العنصر رغم دوران كل حرف على القوس
                fillStyle: createElementGlyphPainter(ctx, element, w, h, fillImage),
                stroke: element.strokeWidth ? element.stroke || TEXT_COLOR_DEFAULT : undefined,
                strokeWidth: element.strokeWidth || 0,
                textAlign: element.textAlign || 'center',
                curve: element.curve || 0,
                letterSpacing: effectiveLetterSpacing,
              });
            }}
            shadowColor={element.shadowColor}
            shadowBlur={element.shadowBlur || 0}
            shadowOffsetX={element.shadowGlow ? 0 : element.shadowOffsetX || 0}
            shadowOffsetY={element.shadowGlow ? 0 : element.shadowOffsetY || 0}
            shadowOpacity={element.shadowOpacity ?? 0}
            perfectDrawEnabled={false}
          />
        ) : (
          <KonvaText
            ref={textRef}
            x={0}
            y={0}
            width={w}
            text={renderText}
            perfectDrawEnabled={false}
            shadowForStrokeEnabled={false}
            globalCompositeOperation={
              (element.globalCompositeOperation as GlobalCompositeOperation | undefined) ||
              'source-over'
            }
            shadowColor={element.shadowColor}
            shadowBlur={element.shadowBlur || 0}
            shadowOffsetX={element.shadowGlow ? 0 : element.shadowOffsetX || 0}
            shadowOffsetY={element.shadowGlow ? 0 : element.shadowOffsetY || 0}
            shadowOpacity={element.shadowOpacity ?? 0}
            fontSize={element.fontSize || 16}
            fontStyle={[
              element.fontStyle === 'italic' ? 'italic' : '',
              element.fontWeight ? String(element.fontWeight) : '400',
            ]
              .filter(Boolean)
              .join(' ')}
            {...getFillProps(element, w, h, fillImage ?? null)}
            fontFamily={element.fontFamily || 'sans-serif'}
            align={element.textAlign || 'center'}
            lineHeight={element.lineHeight ?? 1.2}
            letterSpacing={effectiveLetterSpacing}
            sceneFunc={
              strokeFilterId
                ? (context, shape) => {
                    const ctx = context._context;
                    ctx.save();
                    ctx.filter = `url(#${strokeFilterId})`;
                    Konva.Text.prototype._sceneFunc.call(shape, context);
                    ctx.restore();
                  }
                : undefined
            }
            textDecoration={element.textDecoration || ''}
            direction={isArabic ? 'rtl' : 'inherit'}
            wrap={element.wrap || 'word'}
            ellipsis={false}
            verticalAlign={element.textVerticalAlign || 'top'}
            height={h}
          />
        )}
      </Group>
    </Group>
  );
}, propsAreEqual);
