import Konva from 'konva';
import React, { useEffect, useRef } from 'react';
import { Text as KonvaText, Rect as KonvaRect, Group, Shape as KonvaShape } from 'react-konva';

import { useAsyncImage } from '@/hooks/use-async-image';
import { useKonvaDrag } from '@/hooks/use-konva-drag';
import { TEXT_COLOR_DEFAULT } from '@/lib/canvas/canvas-colors';
import { drawCurvedText } from '@/lib/canvas/curved-text-utils';
import { createElementGlyphPainter } from '@/lib/canvas/fill-paint';
import {
  clampAutoTextWidthPx,
  measureTextContentHeightPx,
  measureTextNaturalWidthPx,
  resolveTextBoxAnchorOffsetPx,
} from '@/lib/canvas/text-fit';
import { resolveTextRenderState } from '@/lib/canvas/text-helpers';
import { buildKonvaFontStyle } from '@/lib/canvas/text-measure';
import { ensureTextStrokeFilter } from '@/lib/canvas/text-stroke-filter';
import { useEditorStore } from '@/lib/editor-store';
import { loadGoogleFont } from '@/lib/io/fonts';

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
  // Re-measure when the exact face arrives: canvas silently substitutes a
  // fallback until then, so both line wrapping and height would be wrong.
  const [fontEpoch, bumpFontEpoch] = React.useReducer((n: number) => n + 1, 0);

  useEffect(() => {
    const family = element.fontFamily;
    if (!family) return;
    let cancelled = false;

    const remeasure = () => {
      if (cancelled) return;
      bumpFontEpoch();
      const node = textRef.current;
      if (node) {
        (node as Konva.Text & { _setTextData?: () => void })._setTextData?.();
        node.getLayer()?.batchDraw();
      }
    };

    // يحل الوعد بعد تحميل الوزن/النمط المطلوب تحديداً (أو فشله) — لا انتظار أبدي
    loadGoogleFont(family, element.fontWeight, element.fontStyle).then(remeasure);
    return () => {
      cancelled = true;
    };
  }, [element.fontFamily, element.fontWeight, element.fontStyle]);

  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const flipped = element.flipX === true;
  const flippedY = element.flipY === true;
  const autoSizing = (element.textSizing ?? 'fixed') === 'auto';
  const w = element.width * stageCanvasWidth;
  const boxHeightPx = element.height * canvasHeight;

  // تجهيز النص الموحّد (أرقام مشرقية + تحويلات حالة + تباعد كلمات عربي)
  // — نفس الدالة في التصدير تمنع انحراف المعاينة عن الملف النهائي.
  const {
    text: renderText,
    direction,
    letterSpacing: effectiveLetterSpacing,
  } = resolveTextRenderState({
    text: element.text,
    arabicNumerals: element.arabicNumerals,
    letterSpacing: element.letterSpacing,
    textTransform: element.textTransform,
  });

  const hasCurve = typeof element.curve === 'number' && element.curve !== 0;

  // العرض الطبيعي (أطول سطر) في وضع الملاءمة التلقائية — يُقاس على محرك
  // الكانفس نفسه، ويُقصّ عند حد الورقة كي لا يخرج النص عنها.
  const naturalWidthPx = React.useMemo(() => {
    void fontEpoch;
    if (!autoSizing || stageCanvasWidth <= 0) return null;
    return measureTextNaturalWidthPx({
      text: element.text,
      fontFamily: element.fontFamily,
      fontSize: element.fontSize,
      fontWeight: element.fontWeight,
      fontStyle: element.fontStyle,
      lineHeight: element.lineHeight,
      letterSpacing: element.letterSpacing,
      textAlign: element.textAlign,
      textTransform: element.textTransform,
      arabicNumerals: element.arabicNumerals,
      wrap: element.wrap,
      curve: element.curve,
      strokeWidth: element.strokeWidth,
    });
  }, [
    autoSizing,
    fontEpoch,
    element.text,
    element.fontFamily,
    element.fontSize,
    element.fontWeight,
    element.fontStyle,
    element.lineHeight,
    element.letterSpacing,
    element.textAlign,
    element.textTransform,
    element.arabicNumerals,
    element.wrap,
    element.strokeWidth,
    element.curve,
    stageCanvasWidth,
  ]);

  const renderWidthPx =
    autoSizing && naturalWidthPx != null
      ? clampAutoTextWidthPx(naturalWidthPx, stageCanvasWidth)
      : w;

  // ارتفاع الكتلة الطبيعية — بما فيه هبوط القوس للنص المنحني. لا نمرّر height
  // ثابتاً إلى Konva، بل نستخدم الناتج كهندسة صندوق فقط.
  const measuredHeightPx = React.useMemo(() => {
    void fontEpoch;
    if (stageCanvasWidth <= 0 || canvasHeight <= 0) return null;
    return measureTextContentHeightPx(
      {
        text: element.text,
        fontFamily: element.fontFamily,
        fontSize: element.fontSize,
        fontWeight: element.fontWeight,
        fontStyle: element.fontStyle,
        lineHeight: element.lineHeight,
        letterSpacing: element.letterSpacing,
        textAlign: element.textAlign,
        textTransform: element.textTransform,
        arabicNumerals: element.arabicNumerals,
        wrap: element.wrap,
        curve: element.curve,
        strokeWidth: element.strokeWidth,
      },
      renderWidthPx,
    );
  }, [
    fontEpoch,
    renderWidthPx,
    canvasHeight,
    stageCanvasWidth,
    element.text,
    element.fontFamily,
    element.fontSize,
    element.fontWeight,
    element.fontStyle,
    element.lineHeight,
    element.letterSpacing,
    element.textAlign,
    element.textTransform,
    element.arabicNumerals,
    element.wrap,
    element.strokeWidth,
    element.curve,
  ]);

  const layoutHeightPx = measuredHeightPx ?? boxHeightPx;

  // مزامنة الصندوق مع المحتوى: الارتفاع دائماً، والعرض في وضع auto فقط.
  // بلا ركن ارتساء: العرض يتمحور حول المركز (مع مراعاة الدوران) والارتفاع
  // ينمو للأسفل. مع ركن ارتساء (بعد تحجيم زاوية): يبقى ذلك الركن ثابتاً في
  // فضاء الكانفس عبر كل إعادة قياس — حتى لو تغيّرت المقاييس لاحقاً بتحميل خط.
  useEffect(() => {
    if (stageCanvasWidth <= 0 || canvasHeight <= 0) return;
    const patch: Partial<TextElement> = {};

    const targetHeightPx = layoutHeightPx;
    const heightChanged = Math.abs(targetHeightPx - boxHeightPx) > 0.5;
    if (heightChanged) patch.height = targetHeightPx / canvasHeight;

    let widthChanged = false;
    let targetWidthPx = w;
    if (autoSizing && naturalWidthPx != null) {
      targetWidthPx = clampAutoTextWidthPx(naturalWidthPx, stageCanvasWidth);
      if (Math.abs(targetWidthPx - w) > 0.5) {
        patch.width = targetWidthPx / stageCanvasWidth;
        widthChanged = true;
      }
    }

    if (widthChanged || heightChanged) {
      const offset = resolveTextBoxAnchorOffsetPx(
        element.textResizeAnchor,
        w,
        boxHeightPx,
        widthChanged ? targetWidthPx : w,
        heightChanged ? targetHeightPx : boxHeightPx,
        element.rotation || 0,
      );
      // عتبة صغيرة تمنع كتابة إزاحة تافهة تُعيد تشغيل الأثر بلا نهاية.
      if (Math.abs(offset.dxPx) > 0.01 || Math.abs(offset.dyPx) > 0.01) {
        patch.x = element.x + offset.dxPx / stageCanvasWidth;
        patch.y = element.y + offset.dyPx / canvasHeight;
      }
    }

    if (Object.keys(patch).length > 0) onChangeRef.current(patch);
  }, [
    autoSizing,
    naturalWidthPx,
    layoutHeightPx,
    canvasHeight,
    stageCanvasWidth,
    boxHeightPx,
    element.height,
    element.rotation,
    element.textResizeAnchor,
    element.x,
    element.y,
    w,
  ]);

  const hasBg = !!element.textBgColor && element.textBgColor !== 'transparent';
  const bgPaddingX = element.textBgPaddingX ?? element.textBgPadding ?? 0;
  const bgPaddingY = element.textBgPaddingY ?? element.textBgPadding ?? 0;
  const bgRadius = element.textBgRadius || 0;
  const bgBorderWidth = element.textBgBorderWidth || 0;
  const bgBorderColor = element.textBgBorderColor || undefined;

  // موضع الرسم: مع ركن ارتساء تُطبَّق إزاحة التثبيت في نفس إطار القياس الجديد
  // (قبل وصول التصحيح إلى الستور) فلا يظهر أي انزياح لحظي عند تحميل خط متأخر.
  // بلا ركن لا نغيّر شيئاً — تصحيح المركز يبقى مسؤولية أثر المزامنة وحده.
  const renderAnchorOffset = element.textResizeAnchor
    ? resolveTextBoxAnchorOffsetPx(
        element.textResizeAnchor,
        w,
        boxHeightPx,
        renderWidthPx,
        layoutHeightPx,
        element.rotation || 0,
      )
    : { dxPx: 0, dyPx: 0 };

  const nodeX = element.x * stageCanvasWidth + renderAnchorOffset.dxPx;
  const nodeY = element.y * canvasHeight + renderAnchorOffset.dyPx;
  const sharedOpacity = isEditing ? 0 : element.opacity;

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
      width={renderWidthPx}
      height={layoutHeightPx}
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
        x={renderWidthPx / 2}
        y={layoutHeightPx / 2}
        offsetX={renderWidthPx / 2}
        offsetY={layoutHeightPx / 2}
        scaleX={flipped ? -1 : 1}
        scaleY={flippedY ? -1 : 1}
        width={renderWidthPx}
        height={layoutHeightPx}
      >
        {/* Hit area and background badge for seamless clicking and dragging */}
        <KonvaRect
          x={-bgPaddingX}
          y={-bgPaddingY}
          width={renderWidthPx + bgPaddingX * 2}
          height={layoutHeightPx + bgPaddingY * 2}
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
            width={renderWidthPx}
            height={layoutHeightPx}
            listening={false}
            sceneFunc={(context) => {
              const ctx = context._context;
              drawCurvedText(ctx, {
                text: renderText,
                x: 0,
                y: 0,
                width: renderWidthPx,
                height: layoutHeightPx,
                fontSize: element.fontSize || 16,
                fontFamily: element.fontFamily || 'Cairo, sans-serif',
                fontWeight: element.fontWeight || 400,
                fontStyle: element.fontStyle || 'normal',
                color: element.color || TEXT_COLOR_DEFAULT,
                // تدرج/صورة في فضاء العنصر رغم دوران كل حرف على القوس
                createFill: (target) =>
                  createElementGlyphPainter(
                    target,
                    element,
                    renderWidthPx,
                    layoutHeightPx,
                    fillImage,
                  ),
                stroke: element.strokeWidth ? element.stroke || TEXT_COLOR_DEFAULT : undefined,
                strokeWidth: element.strokeWidth || 0,
                textAlign: element.textAlign || 'center',
                direction,
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
            width={renderWidthPx}
            text={renderText}
            listening={false}
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
            fontStyle={buildKonvaFontStyle(element.fontWeight, element.fontStyle)}
            {...getFillProps(element, renderWidthPx, layoutHeightPx, fillImage ?? null)}
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
            direction={direction}
            wrap={element.wrap || 'word'}
            ellipsis={false}
            verticalAlign="top"
          />
        )}
      </Group>
    </Group>
  );
}, propsAreEqual);
