import React, { useCallback, useEffect, useRef } from 'react';

import { Crosshair } from '@/components/ui/icons';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { RESET_CANVAS_PAN_EVENT } from '@/hooks/use-canvas-zoom';
import {
  clientToLocal,
  computeScrollbarMetrics,
  getStageClampBounds,
} from '@/lib/canvas/viewport-geometry';
import { getDocumentSession } from '@/lib/io/document-session';

const STEP_DELTA_PX = 40;

/** Pending thumb frames/listeners may not outlive a reset, document or component. */
function useThumbDrag() {
  const cleanupRef = useRef<(() => void) | null>(null);
  useEffect(() => {
    const cancel = () => cleanupRef.current?.();
    window.addEventListener(RESET_CANVAS_PAN_EVENT, cancel);
    return () => {
      cancel();
      window.removeEventListener(RESET_CANVAS_PAN_EVENT, cancel);
    };
  }, []);
  return useCallback(
    (
      e: React.PointerEvent<HTMLDivElement>,
      horizontal: boolean,
      maxOffset: number,
      span: number,
      startPos: number,
      scroll: (pos: number) => void,
    ) => {
      e.preventDefault();
      e.stopPropagation();
      cleanupRef.current?.();
      const target = e.currentTarget;
      const track = target.parentElement;
      if (!track) return;
      target.setPointerCapture(e.pointerId);
      const session = getDocumentSession();
      const local = clientToLocal(
        track.getBoundingClientRect(),
        { w: track.clientWidth, h: track.clientHeight },
        e.clientX,
        e.clientY,
      );
      const scale = horizontal ? local.scaleX : local.scaleY;
      const startCoord = horizontal ? e.clientX : e.clientY;
      let rafId: number | null = null;
      let active = true;
      const cancel = () => {
        active = false;
        if (rafId !== null) cancelAnimationFrame(rafId);
        if (target.hasPointerCapture(e.pointerId)) target.releasePointerCapture(e.pointerId);
        target.removeEventListener('pointermove', move);
        target.removeEventListener('pointerup', cancel);
        target.removeEventListener('pointercancel', cancel);
      };
      const move = (event: PointerEvent) => {
        if (getDocumentSession() !== session) {
          cancel();
          return;
        }
        const delta = ((horizontal ? event.clientX : event.clientY) - startCoord) / scale;
        if (rafId !== null) cancelAnimationFrame(rafId);
        rafId = requestAnimationFrame(() => {
          rafId = null;
          if (!active || getDocumentSession() !== session || maxOffset <= 0 || span <= 0) return;
          scroll(startPos - (delta / maxOffset) * span);
        });
      };
      cleanupRef.current = cancel;
      target.addEventListener('pointermove', move);
      target.addEventListener('pointerup', cancel);
      target.addEventListener('pointercancel', cancel);
    },
    [],
  );
}

/** موضع التمرير الجديد من نقرة على المسار — نفس معادلة المحورين. */
function scrollPosFromTrackClick(
  clickOffset: number,
  thumbLength: number,
  maxOffset: number,
  span: number,
  maxPos: number,
): number {
  const targetThumbOffset = clickOffset - thumbLength / 2;
  const clampedOffset = Math.max(0, Math.min(maxOffset, targetThumbOffset));
  return maxPos - (clampedOffset / maxOffset) * span;
}

export interface CanvasHorizontalScrollbarProps {
  viewportWidth: number;
  viewportHeight: number;
  displayW: number;
  displayH: number;
  stagePosX: number;
  onScrollX: (newStagePosX: number) => void;
  className?: string;
}

export interface CanvasVerticalScrollbarProps {
  viewportHeight: number;
  viewportWidth: number;
  displayH: number;
  displayW: number;
  stagePosY: number;
  onScrollY: (newStagePosY: number) => void;
  className?: string;
}

export interface CanvasCornerResetButtonProps {
  onResetPan: () => void;
  className?: string;
}

export interface CanvasScrollbarsBottomBarProps {
  viewportWidth: number;
  viewportHeight: number;
  displayW: number;
  displayH: number;
  stagePosX: number;
  onScrollX: (newStagePosX: number) => void;
  onResetPan: () => void;
  className?: string;
}

/**
 * 🧭 CanvasHorizontalScrollbar — مسطرة/شريط التمرير الأفقي لكانفاس Grido Studio
 *
 * تصميم Microsoft Fluent 2 نقي: كبسولة ناعمة ملساء (Pill) تتمدد بسلاسة عند التحويم
 * خالية من أزرار الأسهم الكلاسيكية والحزوز، وتعمل بتزامن لحظي مع مسار GPU Compositor.
 */
export const CanvasHorizontalScrollbar = React.memo(function CanvasHorizontalScrollbar({
  viewportWidth,
  viewportHeight,
  displayW,
  displayH,
  stagePosX,
  onScrollX,
  className = '',
}: CanvasHorizontalScrollbarProps) {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const startThumbDrag = useThumbDrag();
  const { minX, maxX } = getStageClampBounds(displayW, displayH, viewportWidth, viewportHeight);
  const {
    span: spanX,
    progress: tx,
    thumbLength,
    maxOffset,
    thumbOffset,
  } = computeScrollbarMetrics(viewportWidth, minX, maxX, stagePosX);
  const handleThumbPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) =>
      startThumbDrag(e, true, maxOffset, spanX, stagePosX, onScrollX),
    [startThumbDrag, maxOffset, spanX, stagePosX, onScrollX],
  );

  // النقر على المسار للقفز إلى موضع المؤشر
  const handleTrackPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (e.target !== e.currentTarget && (e.target as HTMLElement).closest('[data-thumb]')) {
        return;
      }
      const track = trackRef.current;
      if (!track || maxOffset <= 0 || spanX <= 0) return;
      const local = clientToLocal(
        track.getBoundingClientRect(),
        { w: track.clientWidth, h: track.clientHeight },
        e.clientX,
        e.clientY,
      );
      onScrollX(scrollPosFromTrackClick(local.x, thumbLength, maxOffset, spanX, maxX));
    },
    [maxOffset, spanX, thumbLength, maxX, onScrollX],
  );

  // إعادة التوسيط الأفقي بالنقر المزدوج على المقبض
  const handleThumbDoubleClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      const centerPos = (viewportWidth - displayW) / 2;
      onScrollX(centerPos);
    },
    [viewportWidth, displayW, onScrollX],
  );

  // التنقل عبر لوحة المفاتيح لمعايير الوصولية WAI-ARIA
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        onScrollX(stagePosX + STEP_DELTA_PX);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        onScrollX(stagePosX - STEP_DELTA_PX);
      } else if (e.key === 'Home') {
        e.preventDefault();
        onScrollX((viewportWidth - displayW) / 2);
      }
    },
    [stagePosX, onScrollX, viewportWidth, displayW],
  );

  // ltr-island: شريط التمرير الأفقي يتطابق مع إحداثيات ومحاذاة كانفس Konva من اليسار إلى اليمين
  return (
    <div
      role="scrollbar"
      aria-label="شريط تمرير الكانفاس الأفقي"
      aria-orientation="horizontal"
      aria-controls="canvas-area"
      aria-valuenow={Math.round(tx * 100)}
      aria-valuemin={0}
      aria-valuemax={100}
      tabIndex={0}
      onKeyDown={handleKeyDown}
      className={`h-[20px] w-full bg-ruler-surface flex items-center select-none text-muted-foreground z-20 group outline-hidden focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-primary ${className}`}
      dir="ltr"
    >
      {/* مسار التمرير الكامل بكامل العرض */}
      <div
        ref={trackRef}
        onPointerDown={handleTrackPointerDown}
        className="w-full h-full relative flex items-center cursor-pointer px-1.5"
      >
        {/* المقبض بنمط Fluent 2 Pill الهادئ والمتناسق (خافت في السكون ويتفاعل بهدوء عند التحويم) */}
        <div
          data-thumb="true"
          data-canvas-h-thumb="true"
          data-max-offset={maxOffset}
          onPointerDown={handleThumbPointerDown}
          onDoubleClick={handleThumbDoubleClick}
          title="اسحب للتحريك أفقياً (أو انقر مرتين للتوسيط)"
          style={{
            width: `${thumbLength}px`,
            transform: `translate3d(${thumbOffset}px, 0, 0)`,
          }}
          className="h-[8px] group-hover:h-[10px] rounded-full bg-black/15 hover:bg-black/25 active:bg-black/40 dark:bg-white/12 dark:hover:bg-white/22 dark:active:bg-white/35 transition-[height,background-color] duration-150 cursor-grab active:cursor-grabbing select-none relative z-10"
        />
      </div>
    </div>
  );
});

/**
 * 🧭 CanvasVerticalScrollbar — مسطرة/شريط التمرير الرأسي لكانفاس Grido Studio
 *
 * تصميم Microsoft Fluent 2 نقي: كبسولة ناعمة ملساء (Pill) تتمدد بسلاسة عند التحويم
 * خالية من أزرار الأسهم الكلاسيكية والحزوز، وتعمل بتزامن لحظي مع مسار GPU Compositor.
 */
export const CanvasVerticalScrollbar = React.memo(function CanvasVerticalScrollbar({
  viewportHeight,
  viewportWidth,
  displayH,
  displayW,
  stagePosY,
  onScrollY,
  className = '',
}: CanvasVerticalScrollbarProps) {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const startThumbDrag = useThumbDrag();
  const { minY, maxY } = getStageClampBounds(displayW, displayH, viewportWidth, viewportHeight);
  const {
    span: spanY,
    progress: ty,
    thumbLength,
    maxOffset,
    thumbOffset,
  } = computeScrollbarMetrics(viewportHeight, minY, maxY, stagePosY);
  const handleThumbPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) =>
      startThumbDrag(e, false, maxOffset, spanY, stagePosY, onScrollY),
    [startThumbDrag, maxOffset, spanY, stagePosY, onScrollY],
  );

  // النقر على المسار للقفز إلى موضع المؤشر
  const handleTrackPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (e.target !== e.currentTarget && (e.target as HTMLElement).closest('[data-thumb]')) {
        return;
      }
      const track = trackRef.current;
      if (!track || maxOffset <= 0 || spanY <= 0) return;
      const local = clientToLocal(
        track.getBoundingClientRect(),
        { w: track.clientWidth, h: track.clientHeight },
        e.clientX,
        e.clientY,
      );
      onScrollY(scrollPosFromTrackClick(local.y, thumbLength, maxOffset, spanY, maxY));
    },
    [maxOffset, spanY, thumbLength, maxY, onScrollY],
  );

  // إعادة التوسيط الرأسي بالنقر المزدوج على المقبض
  const handleThumbDoubleClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      const centerPos = (viewportHeight - displayH) / 2;
      onScrollY(centerPos);
    },
    [viewportHeight, displayH, onScrollY],
  );

  // التنقل عبر لوحة المفاتيح لمعايير الوصولية WAI-ARIA
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        onScrollY(stagePosY + STEP_DELTA_PX);
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        onScrollY(stagePosY - STEP_DELTA_PX);
      } else if (e.key === 'Home') {
        e.preventDefault();
        onScrollY((viewportHeight - displayH) / 2);
      }
    },
    [stagePosY, onScrollY, viewportHeight, displayH],
  );

  // ltr-island: شريط التمرير الرأسي يتموضع على الجانب الأيمن للكانفس ويتطابق مع إحداثيات Konva
  return (
    <div
      role="scrollbar"
      aria-label="شريط تمرير الكانفاس الرأسي"
      aria-orientation="vertical"
      aria-controls="canvas-area"
      aria-valuenow={Math.round(ty * 100)}
      aria-valuemin={0}
      aria-valuemax={100}
      tabIndex={0}
      onKeyDown={handleKeyDown}
      className={`w-[20px] h-full bg-ruler-surface border-l border-ruler-border flex justify-center select-none text-muted-foreground z-20 shrink-0 group outline-hidden focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-primary /* ltr-island */ ${className}`}
      dir="ltr"
    >
      {/* مسار التمرير الكامل بكامل الارتفاع */}
      <div
        ref={trackRef}
        onPointerDown={handleTrackPointerDown}
        className="h-full w-full relative flex justify-center cursor-pointer py-1.5"
      >
        {/* المقبض بنمط Fluent 2 Pill الهادئ والمتناسق (خافت في السكون ويتفاعل بهدوء عند التحويم) */}
        <div
          data-thumb="true"
          data-canvas-v-thumb="true"
          data-max-offset={maxOffset}
          onPointerDown={handleThumbPointerDown}
          onDoubleClick={handleThumbDoubleClick}
          title="اسحب للتحريك رأسياً (أو انقر مرتين للتوسيط)"
          style={{
            height: `${thumbLength}px`,
            transform: `translate3d(0, ${thumbOffset}px, 0)`,
          }}
          className="w-[8px] group-hover:w-[10px] rounded-full bg-black/15 hover:bg-black/25 active:bg-black/40 dark:bg-white/12 dark:hover:bg-white/22 dark:active:bg-white/35 transition-[width,background-color] duration-150 cursor-grab active:cursor-grabbing select-none relative z-10"
        />
      </div>
    </div>
  );
});

/**
 * 🧭 CanvasCornerResetButton — زر الزاوية السفلية اليمنى لإعادة توسيط الكانفاس
 *
 * يُمثّل نقطة تقاطع شريطي التمرير الأفقي والرأسي ويوفر إعادة توسيط فورية للكانفاس.
 */
export const CanvasCornerResetButton = React.memo(function CanvasCornerResetButton({
  onResetPan,
  className = '',
}: CanvasCornerResetButtonProps) {
  // ltr-island: زر الزاوية يقع عند تقاطع أشرطة التمرير المطابقة لإحداثيات Konva
  return (
    <div
      className={`w-[20px] h-[20px] shrink-0 bg-ruler-corner border-l border-ruler-border flex items-center justify-center select-none /* ltr-island */ ${className}`}
      dir="ltr"
    >
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={onResetPan}
            title="إعادة توسيط الكانفاس (Home)"
            aria-label="إعادة توسيط الكانفاس"
            className="w-full h-full flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-accent/70 transition-colors cursor-pointer focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary"
          >
            <Crosshair className="w-3.5 h-3.5" weight="regular" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="top" align="end" className="text-micro font-cairo">
          إعادة توسيط الورقة (Home)
        </TooltipContent>
      </Tooltip>
    </div>
  );
});

/**
 * 🧭 CanvasScrollbarsBottomBar — الشريط السفلي المتكامل الحاوي لشريط التمرير والزاويتين
 */
export const CanvasScrollbarsBottomBar = React.memo(function CanvasScrollbarsBottomBar({
  viewportWidth,
  viewportHeight,
  displayW,
  displayH,
  stagePosX,
  onScrollX,
  onResetPan,
  className = '',
}: CanvasScrollbarsBottomBarProps) {
  // ltr-island: الشريط السفلي يجمع شريط التمرير الأفقي وزوايا التقاطع بمحاذاة LTR لمطابقة Konva
  return (
    <div
      className={`flex h-[20px] w-full bg-ruler-surface border-t border-ruler-border z-20 shrink-0 select-none shadow-2xs ${className}`}
      dir="ltr"
    >
      {/* 🧭 الزاوية السفلية اليسرى أسفل المسطرة الرأسية مباشرة (20x20px) — ltr-island */}
      <div
        className="w-[20px] h-[20px] shrink-0 bg-ruler-corner border-r border-ruler-border select-none /* ltr-island */"
        aria-hidden="true"
      />

      {/* 🧭 مسطرة/شريط التمرير الأفقي */}
      <div className="flex-1 overflow-hidden relative">
        <CanvasHorizontalScrollbar
          viewportWidth={viewportWidth}
          viewportHeight={viewportHeight}
          displayW={displayW}
          displayH={displayH}
          stagePosX={stagePosX}
          onScrollX={onScrollX}
        />
      </div>

      {/* 🧭 زر الزاوية السفلية اليمنى لإعادة التوسيط (20x20px) */}
      <CanvasCornerResetButton onResetPan={onResetPan} />
    </div>
  );
});
