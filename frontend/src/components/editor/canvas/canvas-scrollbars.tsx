import React, { useCallback, useRef } from 'react';
import { Crosshair } from '@/components/ui/icons';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { getStageClampBounds } from './use-canvas-viewport';

const STEP_DELTA_PX = 40;
const MIN_THUMB_PX = 28;

export interface CanvasHorizontalScrollbarProps {
  viewportWidth: number;
  displayW: number;
  stagePosX: number;
  onScrollX: (newStagePosX: number) => void;
  className?: string;
}

export interface CanvasVerticalScrollbarProps {
  viewportHeight: number;
  displayH: number;
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
  displayW: number;
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
  displayW,
  stagePosX,
  onScrollX,
  className = '',
}: CanvasHorizontalScrollbarProps) {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const rafIdRef = useRef<number | null>(null);

  // حساب حدود التحريك والأبعاد المشتركة مع Viewport
  const { minX, maxX } = getStageClampBounds(displayW, 100, viewportWidth, 100);
  const spanX = maxX - minX;

  // نسبة التقدم t: من 0 (أقصى اليسار) إلى 1 (أقصى اليمين)
  const tx = spanX > 0 ? Math.max(0, Math.min(1, (maxX - stagePosX) / spanX)) : 0.5;

  // حجم المقبض (Thumb): يتناسب مع نسبة نافذة العرض إلى المدى الكلي الفعلي لمساحة العمل
  const totalRangeX = spanX + viewportWidth;
  const ratio = totalRangeX > 0 ? Math.min(1, viewportWidth / totalRangeX) : 1;
  const trackLength = Math.max(40, viewportWidth);
  const thumbLength = Math.max(
    MIN_THUMB_PX,
    Math.min(trackLength, Math.round(trackLength * ratio)),
  );
  const maxOffset = Math.max(0, trackLength - thumbLength);
  const thumbOffset = Math.round(tx * maxOffset);

  // سحب المقبض (Dragging Thumb)
  const handleThumbPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      const target = e.currentTarget;
      target.setPointerCapture(e.pointerId);

      const startCoord = e.clientX;
      const startPos = stagePosX;

      const onPointerMove = (moveEvt: PointerEvent) => {
        const deltaPx = moveEvt.clientX - startCoord;
        if (rafIdRef.current !== null) {
          cancelAnimationFrame(rafIdRef.current);
        }
        rafIdRef.current = requestAnimationFrame(() => {
          rafIdRef.current = null;
          if (maxOffset <= 0 || spanX <= 0) return;
          const deltaT = deltaPx / maxOffset;
          // سحب المقبض يميناً يعني انتقال الرؤية لليمين (انخفاض stagePosX)
          const newPos = startPos - deltaT * spanX;
          onScrollX(newPos);
        });
      };

      const onPointerUp = (upEvt: PointerEvent) => {
        if (target.hasPointerCapture(upEvt.pointerId)) {
          target.releasePointerCapture(upEvt.pointerId);
        }
        target.removeEventListener('pointermove', onPointerMove);
        target.removeEventListener('pointerup', onPointerUp);
        target.removeEventListener('pointercancel', onPointerUp);
        if (rafIdRef.current !== null) {
          cancelAnimationFrame(rafIdRef.current);
          rafIdRef.current = null;
        }
      };

      target.addEventListener('pointermove', onPointerMove);
      target.addEventListener('pointerup', onPointerUp);
      target.addEventListener('pointercancel', onPointerUp);
    },
    [stagePosX, maxOffset, spanX, onScrollX],
  );

  // النقر على المسار للقفز إلى موضع المؤشر
  const handleTrackPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (e.target !== e.currentTarget && (e.target as HTMLElement).closest('[data-thumb]')) {
        return;
      }
      const track = trackRef.current;
      if (!track || maxOffset <= 0 || spanX <= 0) return;
      const rect = track.getBoundingClientRect();
      const clickOffset = e.clientX - rect.left;
      const targetThumbOffset = clickOffset - thumbLength / 2;
      const clampedOffset = Math.max(0, Math.min(maxOffset, targetThumbOffset));
      const targetT = clampedOffset / maxOffset;
      const targetPos = maxX - targetT * spanX;
      onScrollX(targetPos);
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
      className={`h-[20px] w-full bg-ruler-surface flex items-center select-none text-muted-foreground z-20 group outline-hidden ${className}`}
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
  displayH,
  stagePosY,
  onScrollY,
  className = '',
}: CanvasVerticalScrollbarProps) {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const rafIdRef = useRef<number | null>(null);

  // حساب حدود التحريك والأبعاد المشتركة مع Viewport
  const { minY, maxY } = getStageClampBounds(100, displayH, 100, viewportHeight);
  const spanY = maxY - minY;

  // نسبة التقدم t: من 0 (أعلى) إلى 1 (أسفل)
  const ty = spanY > 0 ? Math.max(0, Math.min(1, (maxY - stagePosY) / spanY)) : 0.5;

  // حجم المقبض (Thumb): يتناسب مع نسبة نافذة العرض إلى المدى الكلي الفعلي لمساحة العمل
  const totalRangeY = spanY + viewportHeight;
  const ratio = totalRangeY > 0 ? Math.min(1, viewportHeight / totalRangeY) : 1;
  const trackLength = Math.max(40, viewportHeight);
  const thumbLength = Math.max(
    MIN_THUMB_PX,
    Math.min(trackLength, Math.round(trackLength * ratio)),
  );
  const maxOffset = Math.max(0, trackLength - thumbLength);
  const thumbOffset = Math.round(ty * maxOffset);

  // سحب المقبض (Dragging Thumb)
  const handleThumbPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      const target = e.currentTarget;
      target.setPointerCapture(e.pointerId);

      const startCoord = e.clientY;
      const startPos = stagePosY;

      const onPointerMove = (moveEvt: PointerEvent) => {
        const deltaPx = moveEvt.clientY - startCoord;
        if (rafIdRef.current !== null) {
          cancelAnimationFrame(rafIdRef.current);
        }
        rafIdRef.current = requestAnimationFrame(() => {
          rafIdRef.current = null;
          if (maxOffset <= 0 || spanY <= 0) return;
          const deltaT = deltaPx / maxOffset;
          // سحب المقبض لأسفل يعني انتقال الرؤية لأسفل (انخفاض stagePosY)
          const newPos = startPos - deltaT * spanY;
          onScrollY(newPos);
        });
      };

      const onPointerUp = (upEvt: PointerEvent) => {
        if (target.hasPointerCapture(upEvt.pointerId)) {
          target.releasePointerCapture(upEvt.pointerId);
        }
        target.removeEventListener('pointermove', onPointerMove);
        target.removeEventListener('pointerup', onPointerUp);
        target.removeEventListener('pointercancel', onPointerUp);
        if (rafIdRef.current !== null) {
          cancelAnimationFrame(rafIdRef.current);
          rafIdRef.current = null;
        }
      };

      target.addEventListener('pointermove', onPointerMove);
      target.addEventListener('pointerup', onPointerUp);
      target.addEventListener('pointercancel', onPointerUp);
    },
    [stagePosY, maxOffset, spanY, onScrollY],
  );

  // النقر على المسار للقفز إلى موضع المؤشر
  const handleTrackPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (e.target !== e.currentTarget && (e.target as HTMLElement).closest('[data-thumb]')) {
        return;
      }
      const track = trackRef.current;
      if (!track || maxOffset <= 0 || spanY <= 0) return;
      const rect = track.getBoundingClientRect();
      const clickOffset = e.clientY - rect.top;
      const targetThumbOffset = clickOffset - thumbLength / 2;
      const clampedOffset = Math.max(0, Math.min(maxOffset, targetThumbOffset));
      const targetT = clampedOffset / maxOffset;
      const targetPos = maxY - targetT * spanY;
      onScrollY(targetPos);
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
      className={`w-[20px] h-full bg-ruler-surface border-l border-ruler-border flex justify-center select-none text-muted-foreground z-20 shrink-0 group outline-hidden ${className}`}
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
  return (
    <div
      className={`w-[20px] h-[20px] shrink-0 bg-ruler-corner border-l border-ruler-border flex items-center justify-center select-none ${className}`}
      dir="ltr"
    >
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={onResetPan}
            title="إعادة توسيط الكانفاس (Home)"
            aria-label="إعادة توسيط الكانفاس"
            className="w-[18px] h-[18px] flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-ruler-corner-hover rounded-xs transition-all active:scale-90 cursor-pointer focus-visible:outline-hidden"
          >
            <Crosshair className="w-3 h-3" weight="regular" />
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
  displayW,
  stagePosX,
  onScrollX,
  onResetPan,
  className = '',
}: CanvasScrollbarsBottomBarProps) {
  return (
    <div
      className={`flex h-[20px] w-full bg-ruler-surface border-t border-ruler-border z-20 shrink-0 select-none shadow-2xs ${className}`}
      dir="ltr"
    >
      {/* 🧭 الزاوية السفلية اليسرى أسفل المسطرة الرأسية مباشرة (20x20px) */}
      <div
        className="w-[20px] h-[20px] shrink-0 bg-ruler-corner border-r border-ruler-border select-none"
        aria-hidden="true"
      />

      {/* 🧭 مسطرة/شريط التمرير الأفقي */}
      <div className="flex-1 overflow-hidden relative">
        <CanvasHorizontalScrollbar
          viewportWidth={viewportWidth}
          displayW={displayW}
          stagePosX={stagePosX}
          onScrollX={onScrollX}
        />
      </div>

      {/* 🧭 زر الزاوية السفلية اليمنى لإعادة التوسيط (20x20px) */}
      <CanvasCornerResetButton onResetPan={onResetPan} />
    </div>
  );
});
