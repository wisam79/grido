import React, { useRef, useEffect, useState } from 'react';
import { CanvasElement } from '@/lib/editor-store';
import { TEXT_COLOR_DEFAULT } from '@/lib/canvas/canvas-colors';
import { loadGoogleFont } from '@/lib/io/fonts';
import {
  TEXT_MAX_LENGTH,
  TEXT_LABEL_PREVIEW,
  sanitizeText,
  isArabicText as isArabicTextHelper,
} from '@/lib/canvas/text-helpers';

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
  // P0: انتظار تحميل الخط قبل إظهار المحرر — يمنع قفزة الخط البديل
  const [fontReady, setFontReady] = useState(false);

  const textEl = elements.find((e) => e.id === editingTextId);
  const isValid = !printMode && !!editingTextId && !!textEl && textEl.type === 'text';
  const fontFamily = textEl?.type === 'text' ? textEl.fontFamily : undefined;

  // حمّل خط العنصر فور استهدافه، وانتظر الجاهزية (مع مهلة أمان 800ms)
  useEffect(() => {
    if (!isValid) {
      setFontReady(false);
      return;
    }
    setFontReady(false);
    if (fontFamily) loadGoogleFont(fontFamily);
    let settled = false;
    const done = () => {
      if (!settled) {
        settled = true;
        setFontReady(true);
      }
    };
    // document.fonts.ready يحل عندما تكتمل الخطوط المعلقة
    if (typeof document !== 'undefined' && document.fonts?.ready) {
      document.fonts.ready.then(done).catch(done);
      const timer = setTimeout(done, 800);
      return () => {
        settled = true;
        clearTimeout(timer);
      };
    }
    done();
    return () => {
      settled = true;
    };
  }, [isValid, editingTextId, fontFamily]);

  // Auto-focus and adjust height on mount — بعد جاهزية الخط فقط
  useEffect(() => {
    if (isValid && fontReady && textareaRef.current) {
      const textarea = textareaRef.current;
      textarea.focus();
      // P0: النصوص الطويلة (>50 حرفاً) — المؤشر في النهاية بدل تحديد الكل
      const len = textarea.value.length;
      if (len > 50) {
        textarea.setSelectionRange(len, len);
      } else {
        textarea.select();
      }

      // Auto-grow height based on scrollHeight
      if (textarea.scrollHeight > textarea.clientHeight) {
        textarea.style.height = `${textarea.scrollHeight + 4}px`;
      }
    }
  }, [isValid, fontReady, editingTextId]);

  if (!isValid || !textEl) return null;

  const isArabicText = isArabicTextHelper(textEl.text);
  const spacingVal = textEl.letterSpacing || 0;
  const bgColor =
    textEl.textBgColor && textEl.textBgColor !== 'transparent' ? textEl.textBgColor : 'transparent';
  // 🛡️ حارس الصفر: كانفس 0×0 (تهيئة/حالة فارغة) كان ينتج Infinity/NaN
  // في font-size والحشوات فيتعطل التحرير — النسبة الاحتياطية 1 آمنة.
  const scaleRatio =
    canvasWidth > 0 && canvasHeight > 0
      ? Math.min(displayW / canvasWidth, displayH / canvasHeight)
      : 1;
  const radiusPx = (textEl.textBgRadius || 0) * scaleRatio;
  const paddingXPx = (textEl.textBgPaddingX ?? textEl.textBgPadding ?? 0) * scaleRatio;
  const paddingYPx = (textEl.textBgPaddingY ?? textEl.textBgPadding ?? 0) * scaleRatio;

  const flippedX = textEl.flipX === true;
  const flippedY = textEl.flipY === true;

  const leftPx = textEl.x * displayW;
  const topPx = textEl.y * displayH;
  const widthPx = textEl.width * displayW;
  const minHeightPx = Math.max(30, textEl.height * displayH);

  const handleCommit = (newText: string) => {
    // P0: تعقيم + قصّ عند الحد الأقصى عبر الوحدة المركزية
    const capped = sanitizeText(newText);
    if (capped !== textEl.text) {
      updateElement(textEl.id, { text: capped });
      pushHistory();
    }
    setEditingTextId(null);
  };

  // P0: اسم وصولي يصف النص المحرَّر (أول 30 حرفاً — عبر الثابت المركزي)
  const accessibleName = `تحرير نص: ${(textEl.text || '').slice(0, TEXT_LABEL_PREVIEW) || 'نص جديد'}`;

  return (
    <div
      // R7/R10: طبقة التحرير فوق الأدلة (70 فوق 60) ودون القوائم (1000) — مطابقة Konva text-node:
      // عربي → wordSpacing، لاتيني → letterSpacing، نفس fontFamily لمنع انحراف WYSIWYG.
      className="absolute z-(--z-canvas-text-overlay) pointer-events-auto font-cairo"
      style={{
        left: `${leftPx}px`,
        top: `${topPx}px`,
        width: `${widthPx}px`,
        transform: `rotate(${textEl.rotation || 0}deg)`,
        transformOrigin: 'top left',
        // P0: إخفاء المحرر حتى جاهزية الخط — يمنع وميض الخط البديل
        visibility: fontReady ? 'visible' : 'hidden',
      }}
    >
      <textarea
        key={textEl.id}
        ref={textareaRef}
        // P0: هوية منطوقة لقارئ الشاشة
        aria-label={accessibleName}
        maxLength={TEXT_MAX_LENGTH}
        // 🛡️ مطابقة WYSIWYG: عقدة Konva تضبط direction=rtl للعربي — المحرر
        // كان يرث ltr من الكانفس فيختلف ترتيب الكلمات وموضع المؤشر.
        dir={isArabicText ? 'rtl' : 'ltr'}
        className="w-full bg-transparent resize-none outline-none ring-0 m-0 border-0 transition-shadow duration-150 custom-scrollbar block"
        style={{
          transform: `scale(${flippedX ? -1 : 1}, ${flippedY ? -1 : 1})`,
          transformOrigin: 'center',
          backgroundColor: bgColor,
          borderRadius: radiusPx > 0 ? `${radiusPx}px` : '4px',
          border: textEl.textBgBorderWidth
            ? `${textEl.textBgBorderWidth * scaleRatio}px solid ${textEl.textBgBorderColor || textEl.color || TEXT_COLOR_DEFAULT}`
            : undefined,
          padding: `${paddingYPx}px ${paddingXPx}px`,
          minHeight: `${minHeightPx}px`,
          fontSize: `${(textEl.fontSize || 20) * scaleRatio}px`,
          fontFamily: textEl.fontFamily || '"IBM Plex Sans Arabic", Cairo, sans-serif',
          fontWeight: textEl.fontWeight || 400,
          fontStyle: textEl.fontStyle || 'normal',
          textDecoration: textEl.textDecoration || 'none',
          textTransform: textEl.textTransform || 'none',
          color: textEl.color || TEXT_COLOR_DEFAULT,
          textAlign: textEl.textAlign || 'center',
          lineHeight: textEl.lineHeight || 1.2,
          // التباعد قيمة منطقية على الكانفس — يجب تحجيمها مثل fontSize لتطابق
          // ما سيُرسم فعلياً (إصلاح Bug#12)
          letterSpacing: isArabicText ? '0px' : `${spacingVal * scaleRatio}px`,
          wordSpacing: isArabicText ? `${spacingVal * scaleRatio}px` : undefined,
          boxShadow:
            '0 0 0 2px var(--primary) , 0 0 0 4px color-mix(in srgb, var(--primary) 25%, transparent), 0 4px 20px rgba(0, 0, 0, 0.25)',
        }}
        defaultValue={textEl.text}
        onInput={(e) => {
          const target = e.currentTarget;
          target.style.height = 'auto';
          target.style.height = `${Math.max(minHeightPx, target.scrollHeight)}px`;
        }}
        onBlur={(e) => {
          handleCommit(e.target.value);
        }}
        onKeyDown={(e) => {
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
