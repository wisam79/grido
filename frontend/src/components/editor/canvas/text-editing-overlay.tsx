import React, { useRef, useEffect, useLayoutEffect, useState, useMemo, useId } from 'react';

import { TEXT_COLOR_DEFAULT, gradientEnd, gradientStart } from '@/lib/canvas/canvas-colors';
import {
  fitTextGeometry,
  measureTextContentHeightPx,
  measureTextNaturalWidthPx,
  resolveTextBoxAnchorOffsetPx,
} from '@/lib/canvas/text-fit';
import {
  TEXT_MAX_LENGTH,
  TEXT_LABEL_PREVIEW,
  sanitizeText,
  resolveTextRenderState,
  resolveTextDecorationColor,
  toEditorDisplayText,
  fromEditorDisplayText,
} from '@/lib/canvas/text-helpers';
import { loadGoogleFont } from '@/lib/io/fonts';

import type { CanvasElement, TextElement } from '@/lib/editor-store';
import type { CSSProperties } from 'react';

// إعادة تصدير للتوافق مع الاختبارات الحالية
export { TEXT_MAX_LENGTH } from '@/lib/canvas/text-helpers';

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

function cssGradientStops(stops: Array<number | string> | undefined, minRatio = 0): string {
  const list = stops && stops.length >= 4 ? stops : [0, gradientStart(), 1, gradientEnd()];
  const clampedMin = Math.max(0, Math.min(1, minRatio));
  const parts: string[] = [];
  for (let i = 0; i + 1 < list.length; i += 2) {
    const rawPos = Math.max(0, Math.min(1, Number(list[i])));
    const pos = clampedMin + rawPos * (1 - clampedMin);
    parts.push(`${String(list[i + 1])} ${(pos * 100).toFixed(2)}%`);
  }
  return parts.join(', ');
}

/**
 * تقريب CSS لتعبئة Konva (مصمت/خطي/شعاعي/صورة) عبر قصّ الخلفية على النص.
 * المعاينة داخل المحرر تقريبية فقط — الرسم النهائي يبقى من عقدة Konva.
 */
function buildFillStyle(el: TextElement, w: number, h: number): CSSProperties {
  if (el.fillType === 'linear') {
    const start = el.fillLinearGradientStartPoint || { x: 0, y: 0 };
    const end = el.fillLinearGradientEndPoint || { x: 1, y: 1 };
    // CSS 0deg يشير لأعلى؛ المتجه (dx, dy) يعني الزاوية atan2(dx, -dy)
    const angle = (Math.atan2(end.x - start.x, -(end.y - start.y)) * 180) / Math.PI;
    return {
      backgroundImage: `linear-gradient(${angle.toFixed(2)}deg, ${cssGradientStops(el.fillLinearGradientColorStops)})`,
      backgroundClip: 'text',
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
    };
  }
  if (el.fillType === 'radial') {
    const start = el.fillRadialGradientStartPoint || { x: 0.5, y: 0.5 };
    const endRadiusNorm = Math.max(0.0001, el.fillRadialGradientEndRadius ?? 0.5);
    const startRadiusNorm = Math.max(
      0,
      Math.min(endRadiusNorm, el.fillRadialGradientStartRadius ?? 0),
    );
    const radius = endRadiusNorm * Math.max(w, h);
    const minRatio = startRadiusNorm / endRadiusNorm;
    return {
      backgroundImage: `radial-gradient(circle ${radius}px at ${start.x * 100}% ${start.y * 100}%, ${cssGradientStops(el.fillRadialGradientColorStops, minRatio)})`,
      backgroundClip: 'text',
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
    };
  }
  if (el.fillType === 'image' && el.fillImageSrc) {
    const fit = el.fillImageFit || 'cover';
    const size =
      fit === 'stretch'
        ? '100% 100%'
        : fit === 'contain'
          ? 'contain'
          : fit === 'tile'
            ? 'auto'
            : 'cover';
    const posX = 50 + (el.fillImageOffsetX || 0) * 100;
    const posY = 50 + (el.fillImageOffsetY || 0) * 100;
    return {
      backgroundImage: `url("${el.fillImageSrc.replace(/"/g, '\\"')}")`,
      backgroundSize: size,
      backgroundRepeat: fit === 'tile' ? 'repeat' : 'no-repeat',
      backgroundPosition: `${posX}% ${posY}%`,
      backgroundClip: 'text',
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
    };
  }
  return { color: el.color || TEXT_COLOR_DEFAULT };
}

function buildTextShadow(el: TextElement, scale: number): string | undefined {
  if (!el.shadowColor || (el.shadowOpacity ?? 0) <= 0) return undefined;
  const blur = (el.shadowBlur || 0) * scale;
  const offsetX = el.shadowGlow ? 0 : (el.shadowOffsetX || 0) * scale;
  const offsetY = el.shadowGlow ? 0 : (el.shadowOffsetY || 0) * scale;
  const alpha = Math.round(Math.max(0, Math.min(1, el.shadowOpacity ?? 0)) * 100);
  const shadowColor = `color-mix(in srgb, ${el.shadowColor} ${alpha}%, transparent)`;
  return `${offsetX}px ${offsetY}px ${blur}px ${shadowColor}`;
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
  const focusedIdRef = useRef<string | null>(null);
  const committedRef = useRef(false);
  const curveHintId = useId();
  // P0: انتظار تحميل الخط قبل إظهار المحرر — يمنع قفزة الخط البديل
  const [fontReady, setFontReady] = useState(false);
  // مسودة حيّة أثناء الكتابة: تسمح للصندوق بالتوسع مع النص قبل الحفظ،
  // بينما يبقى العنصر في الستور دون تغيير حتى الإنهاء (تراجع واحد لكل جلسة).
  const [draft, setDraft] = useState<{ id: string; value: string } | null>(null);

  // جلسة جديدة = مسودة جديدة. بدون ذلك تبقى مسودة الجلسة السابقة حيّة فتُسترجع
  // عند إعادة تحرير العنصر بعد تراجع أو بعد إغلاق المحرر، فتكتب نصاً ملغياً.
  useEffect(() => {
    setDraft(null);
    committedRef.current = false;
  }, [editingTextId]);

  const found = elements.find((e) => e.id === editingTextId);
  const textEl = found && found.type === 'text' ? (found as TextElement) : null;
  const initialDisplay = textEl ? toEditorDisplayText(textEl.text, textEl.arabicNumerals) : '';
  const displayText = draft && draft.id === editingTextId ? draft.value : initialDisplay;
  const liveText = sanitizeText(fromEditorDisplayText(displayText, textEl?.arabicNumerals));
  const elementNumerals = textEl?.arabicNumerals;
  const elementLetterSpacing = textEl?.letterSpacing;
  const elementTransform = textEl?.textTransform;
  const elementCurve = textEl?.curve;
  const isCurved = typeof elementCurve === 'number' && elementCurve !== 0;
  const isValid = !printMode && !!editingTextId && !!textEl;
  const fontFamily = textEl?.fontFamily;
  const fontWeight = textEl?.fontWeight;
  const fontStyle = textEl?.fontStyle;

  // حمّل الوجه المطلوب فعلياً (العائلة + الوزن + النمط) وانتظر جاهزيته،
  // مع مهلة أمان كي لا يبقى المحرر مخفياً إن تعذّر التحميل.
  useEffect(() => {
    if (!isValid) {
      focusedIdRef.current = null;
      setFontReady(false);
      return;
    }
    setFontReady(false);
    if (!fontFamily) {
      setFontReady(true);
      return;
    }
    // بيئات بلا FontFaceSet (jsdom) لا يمكنها الانتظار — أظهر المحرر فوراً
    if (typeof document === 'undefined' || !document.fonts) {
      setFontReady(true);
      return;
    }
    let cancelled = false;
    const timer = setTimeout(() => {
      if (!cancelled) setFontReady(true);
    }, 1200);
    loadGoogleFont(fontFamily, fontWeight, fontStyle).then(() => {
      if (!cancelled) setFontReady(true);
    });
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [isValid, editingTextId, fontFamily, fontWeight, fontStyle]);

  // 🛡️ حارس الصفر: كانفس 0×0 (تهيئة/حالة فارغة) كان ينتج Infinity/NaN
  // في font-size والحشوات فيتعطل التحرير — النسبة الاحتياطية 1 آمنة.
  const scaleRatio =
    canvasWidth > 0 && canvasHeight > 0
      ? Math.min(displayW / canvasWidth, displayH / canvasHeight)
      : 1;

  const renderState = useMemo(
    () =>
      resolveTextRenderState({
        text: liveText,
        arabicNumerals: elementNumerals,
        letterSpacing: elementLetterSpacing,
        textTransform: elementTransform,
        curve: elementCurve,
        fontFamily,
        fontWeight,
      }),
    [
      liveText,
      elementNumerals,
      elementLetterSpacing,
      elementTransform,
      elementCurve,
      fontFamily,
      fontWeight,
    ],
  );

  const isAuto = textEl?.textSizing === 'auto';
  const storedWidthPx = (textEl?.width || 0) * displayW;
  const storedHeightPx = (textEl?.height || 0) * displayH;

  // مصدر القياس بوحدات العرض (الخط والتباعد والحد محجّمة بنفس نسبة المسرح)
  const displaySource = useMemo(() => {
    void fontReady;
    if (!textEl) return null;
    return {
      ...textEl,
      text: liveText,
      fontSize: (textEl.fontSize || 16) * scaleRatio,
      letterSpacing: (textEl.letterSpacing || 0) * scaleRatio,
      strokeWidth: (textEl.strokeWidth || 0) * scaleRatio,
    };
  }, [textEl, liveText, scaleRatio, fontReady]);

  // عرض الصندوق: في الوضع التلقائي يتبع أطول سطر لحظياً، وفي الثابت يبقى كما هو
  const widthPx = useMemo(() => {
    if (!isAuto || !displaySource) return storedWidthPx;
    const natural = measureTextNaturalWidthPx(displaySource);
    if (natural == null) return storedWidthPx;
    const minPx = 24 * scaleRatio;
    const maxPx = Math.max(minPx, displayW * 0.95);
    return Math.min(Math.max(minPx, natural), maxPx);
  }, [isAuto, displaySource, storedWidthPx, displayW, scaleRatio]);

  // ارتفاع كتلة النص في فضاء العرض — يطابق ارتفاع عقدة الكانفس (بما فيه القوس)
  const contentHeightPx = useMemo(() => {
    if (!displaySource) return storedHeightPx;
    return measureTextContentHeightPx(displaySource, widthPx) ?? storedHeightPx;
  }, [displaySource, widthPx, storedHeightPx]);

  // The content editor keeps raw newlines, even though the arc displays spaces.
  // Its straight-line height is only a DOM inset, never the element's fitted height.
  const editorContentHeightPx = useMemo(() => {
    if (!isCurved || !displaySource) return contentHeightPx;
    return (
      measureTextContentHeightPx({ ...displaySource, curve: 0 }, widthPx) ??
      displaySource.fontSize * (displaySource.lineHeight ?? 1.2) * displayText.split('\n').length
    );
  }, [isCurved, displaySource, widthPx, contentHeightPx, displayText]);
  const editorOffsetYPx = isCurved ? Math.max(0, (contentHeightPx - editorContentHeightPx) / 2) : 0;

  // Resize after React has applied the new text and symmetric curve insets, not
  // inside onChange against the previous padding/width (which can clip the draft).
  useLayoutEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea || !fontReady) return;
    textarea.style.height = 'auto';
    textarea.style.height = `${textarea.scrollHeight}px`;
  }, [displayText, fontReady, widthPx, contentHeightPx, editorOffsetYPx]);

  // Auto-focus and select once per editing session — بعد جاهزية الخط فقط
  useEffect(() => {
    if (!isValid || !fontReady || !textareaRef.current) return;
    if (!editingTextId || focusedIdRef.current === editingTextId) return;
    focusedIdRef.current = editingTextId;

    const textarea = textareaRef.current;
    textarea.focus();
    // P0: النصوص الطويلة (>50 حرفاً) — المؤشر في النهاية بدل تحديد الكل
    const len = textarea.value.length;
    if (len > 50) {
      textarea.setSelectionRange(len, len);
    } else {
      textarea.select();
    }
  }, [isValid, fontReady, editingTextId]);

  if (!isValid || !textEl || !renderState) return null;

  const paddingXPx = (textEl.textBgPaddingX ?? textEl.textBgPadding ?? 0) * scaleRatio;
  const paddingYPx = (textEl.textBgPaddingY ?? textEl.textBgPadding ?? 0) * scaleRatio;
  const radiusPx = (textEl.textBgRadius || 0) * scaleRatio;
  const bgBorderColor = textEl.textBgBorderColor || undefined;
  const borderWidthPx =
    bgBorderColor && (textEl.textBgBorderWidth || 0) > 0
      ? (textEl.textBgBorderWidth || 0) * scaleRatio
      : 0;
  // حد CSS يُرسم داخل الصندوق بعكس حد Konva المركزي — نعوّضه كي يبقى
  // محتوى النص بعرض w تماماً كما في عقدة الكانفس.
  const insetXPx = Math.max(0, paddingXPx - borderWidthPx);
  const insetYPx = Math.max(0, paddingYPx - borderWidthPx);

  const isArabicSpacing = renderState.isArabic && (textEl.letterSpacing || 0) > 0;
  const fillStyle = buildFillStyle(textEl, widthPx, contentHeightPx);
  const textShadow = buildTextShadow(textEl, scaleRatio);
  const strokeWidthPx = (textEl.strokeWidth || 0) * scaleRatio;
  const linearFallbackColor =
    textEl.fillLinearGradientColorStops && textEl.fillLinearGradientColorStops.length >= 2
      ? String(textEl.fillLinearGradientColorStops[1])
      : gradientStart();
  const decorationColor = resolveTextDecorationColor(textEl) ?? linearFallbackColor;

  const bgColor =
    textEl.textBgColor && textEl.textBgColor !== 'transparent' ? textEl.textBgColor : 'transparent';

  const flippedX = textEl.flipX === true;
  const flippedY = textEl.flipY === true;

  // نفس قاعدة الملاءمة: توسّع العرض حول المركز افتراضياً، أو حول ركن
  // الارتساء إن كان النص قد حُجّمت زاويته — فيبقى صندوق التحرير مطابقاً
  // لعقدة الكانفس عند تغيّر القياس (مثلاً اكتمال تحميل خط أثناء التحرير).
  const anchorOffset = resolveTextBoxAnchorOffsetPx(
    textEl.textResizeAnchor,
    storedWidthPx,
    storedHeightPx,
    widthPx,
    contentHeightPx,
    textEl.rotation || 0,
  );
  const boxLeftPx = textEl.x * displayW + anchorOffset.dxPx;
  const boxTopPx = textEl.y * displayH + anchorOffset.dyPx;

  const handleCommit = (newText: string) => {
    // Enter/Escape may be followed by blur while the same render is mounted.
    if (committedRef.current) return;
    committedRef.current = true;
    // P0: تعقيم + قصّ عند الحد الأقصى عبر الوحدة المركزية
    const capped = sanitizeText(fromEditorDisplayText(newText, textEl.arabicNumerals));
    const textChanged = capped !== textEl.text;
    const patch: Partial<TextElement> = {};
    if (textChanged) patch.text = capped;

    // التزام هندسي واحد: الصندوق يعود ملائماً للنص النهائي، والموضع محفوظ
    const fit = fitTextGeometry({ ...textEl, text: capped }, canvasWidth, canvasHeight);
    if (fit?.measured) {
      // نص حُجّمت زاويته ولم يتغيّر محتواه يحتفظ بركن ارتسائه أثناء إعادة
      // الملاءمة (قد يكون الخط قد اكتمل تحميله أثناء جلسة التحرير)؛ تعديل
      // المحتوى نفسه يبدأ تخطيطاً جديداً فيتمركز كما اعتاد.
      const anchor = !textChanged ? textEl.textResizeAnchor : undefined;
      let nextX = fit.x;
      let nextY = fit.y;
      if (anchor) {
        const offset = resolveTextBoxAnchorOffsetPx(
          anchor,
          textEl.width * canvasWidth,
          textEl.height * canvasHeight,
          fit.width * canvasWidth,
          fit.height * canvasHeight,
          textEl.rotation || 0,
        );
        nextX = textEl.x + offset.dxPx / canvasWidth;
        nextY = textEl.y + offset.dyPx / canvasHeight;
      }

      if (isAuto) {
        if (
          Math.abs(fit.width - textEl.width) > 1e-6 ||
          Math.abs(fit.height - textEl.height) > 1e-6
        ) {
          patch.width = fit.width;
          patch.height = fit.height;
          patch.x = nextX;
          patch.y = nextY;
        }
      } else if (Math.abs(fit.height - textEl.height) > 1e-6) {
        patch.height = fit.height;
        patch.x = nextX;
        patch.y = nextY;
      }
    }

    if (Object.keys(patch).length > 0) {
      updateElement(textEl.id, patch);
      if (textChanged) pushHistory();
    }
    setEditingTextId(null);
  };

  // P0: اسم وصولي يصف النص المحرَّر (أول 30 حرفاً — عبر الثابت المركزي)
  const accessibleName = `تحرير نص: ${(textEl.text || '').slice(0, TEXT_LABEL_PREVIEW) || 'نص جديد'}`;

  const textareaStyle: CSSProperties = {
    ...fillStyle,
    transform: `scale(${flippedX ? -1 : 1}, ${flippedY ? -1 : 1})`,
    transformOrigin: 'center',
    backgroundColor: 'transparent',
    padding: `${insetYPx + editorOffsetYPx}px ${insetXPx}px`,
    minHeight: `${contentHeightPx + paddingYPx * 2 - borderWidthPx * 2}px`,
    fontSize: `${(textEl.fontSize || 16) * scaleRatio}px`,
    fontFamily: textEl.fontFamily || (isCurved ? 'Cairo, sans-serif' : 'sans-serif'),
    fontWeight: renderState.fontWeight,
    fontStyle: textEl.fontStyle || 'normal',
    textDecoration: textEl.textDecoration || 'none',
    textDecorationColor: decorationColor,
    textTransform: textEl.textTransform || 'none',
    textAlign: isCurved ? 'center' : textEl.textAlign || 'center',
    lineHeight: textEl.lineHeight || 1.2,
    // التباعد قيمة منطقية على الكانفس — يجب تحجيمها مثل fontSize لتطابق
    // ما سيُرسم فعلياً (إصلاح Bug#12). العربي: Konva يصفّر letterSpacing
    // ويعوّض بمسافات، فنحاكيه بـ wordSpacing.
    letterSpacing: `${renderState.letterSpacing * scaleRatio}px`,
    wordSpacing: isArabicSpacing ? `${(textEl.letterSpacing || 0) * scaleRatio}px` : undefined,
    textShadow,
    WebkitTextStroke:
      strokeWidthPx > 0 ? `${strokeWidthPx}px ${textEl.stroke || TEXT_COLOR_DEFAULT}` : undefined,
    paintOrder: 'stroke fill',
    overflow: 'hidden',
  };

  return (
    <div
      // R7/R10: طبقة التحرير فوق الأدلة (70 فوق 60) ودون القوائم (1000) — مطابقة Konva text-node:
      // عربي → wordSpacing، لاتيني → letterSpacing، نفس fontFamily لمنع انحراف WYSIWYG.
      className="absolute z-(--z-canvas-text-overlay) pointer-events-auto font-cairo"
      style={{
        // نتمدد بحشوة الشارة للخارج مع تثبيت نقطة الدوران على أصل النص (x,y)
        left: `${boxLeftPx - paddingXPx}px`,
        top: `${boxTopPx - paddingYPx}px`,
        width: `${widthPx + paddingXPx * 2}px`,
        minHeight: `${contentHeightPx + paddingYPx * 2}px`,
        transform: `rotate(${textEl.rotation || 0}deg)`,
        transformOrigin: `${paddingXPx}px ${paddingYPx}px`,
        // An opaque DOM badge would hide the faint Konva arc underneath it.
        backgroundColor: isCurved ? 'transparent' : bgColor,
        borderRadius: radiusPx > 0 ? `${radiusPx}px` : '4px',
        border:
          borderWidthPx > 0 && bgBorderColor
            ? `${borderWidthPx}px solid ${bgBorderColor}`
            : undefined,
        boxShadow:
          '0 0 0 2px var(--primary) , 0 0 0 4px color-mix(in srgb, var(--primary) 25%, transparent), 0 4px 20px rgba(0, 0, 0, 0.25)',
        // P0: إخفاء المحرر حتى جاهزية الخط — يمنع وميض الخط البديل
        visibility: fontReady ? 'visible' : 'hidden',
      }}
    >
      {isCurved && (
        <span
          id={curveHintId}
          dir="rtl"
          className="absolute bottom-full start-0 mb-1 rounded-md border border-border bg-background px-2 py-1 text-xs text-muted-foreground pointer-events-none whitespace-nowrap"
        >
          نص منحني
        </span>
      )}
      <textarea
        key={textEl.id}
        ref={textareaRef}
        data-testid="text-editing-textarea"
        // P0: هوية منطوقة لقارئ الشاشة
        aria-label={accessibleName}
        aria-describedby={isCurved ? curveHintId : undefined}
        maxLength={TEXT_MAX_LENGTH}
        dir={renderState.direction}
        wrap={!isAuto && textEl.wrap === 'none' ? 'off' : 'soft'}
        className="w-full h-auto bg-transparent resize-none outline-none ring-0 m-0 border-0 custom-scrollbar block"
        style={textareaStyle}
        value={displayText}
        onChange={(e) => {
          setDraft({ id: textEl.id, value: e.currentTarget.value });
        }}
        onBlur={(e) => {
          handleCommit(e.target.value);
        }}
        onKeyDown={(e) => {
          // لا تلتقط Enter/Escape أثناء تركيب IME (عربي/آسيوي)
          if (e.nativeEvent.isComposing) return;
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleCommit(e.currentTarget.value);
          }
          if (e.key === 'Escape') {
            e.preventDefault();
            handleCommit(e.currentTarget.value);
          }
        }}
      />
    </div>
  );
});
