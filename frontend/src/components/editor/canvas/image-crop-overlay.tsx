import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';

import { Button } from '@/components/ui/button';
import {
  ArrowCounterClockwise,
  Check,
  Crop,
  MagnifyingGlassMinus,
  MagnifyingGlassPlus,
  X,
} from '@/components/ui/icons';
import { Slider } from '@/components/ui/slider';
import { useCanvasInteraction } from '@/lib/canvas/canvas-interaction-store';
import { getElementVisualBox } from '@/lib/canvas/element-geometry';
import { getCachedImageDimensions, resolveImageDimensions } from '@/lib/canvas/image-dimensions';
import { useEditorStore } from '@/lib/editor-store';
import {
  IMAGE_CROP_MAX_ZOOM,
  IMAGE_CROP_MIN_ZOOM,
  clampImageCropPan,
  clampImageCropZoom,
  computeImageCrop,
  hasCustomImageCrop,
  normalizeImageCropFraming,
  panImageCropByDelta,
} from '@/lib/export/export-primitives';
import { getDocumentSession } from '@/lib/io/document-session';

import type { ImageCropFraming } from '@/lib/export/export-primitives';
import type { CanvasElement, ImageElement } from '@/lib/store/types';

export interface ImageCropOverlayProps {
  printMode: boolean;
  croppingElementId: string | null;
  elements: CanvasElement[];
  displayW: number;
  displayH: number;
  canvasWidth: number;
  canvasHeight: number;
  updateElement: (id: string, patch: Partial<CanvasElement>) => void;
  pushHistory: () => void;
  onOpenAdvancedCrop: (elementId: string) => void;
}

interface CropInitialSnapshot {
  elementId: string;
  session: number;
  historyIndex: number;
  historyLen: number;
  cropZoom: number | undefined;
  cropPanX: number | undefined;
  cropPanY: number | undefined;
}

function hasFramingChanged(
  live: Pick<ImageElement, 'cropZoom' | 'cropPanX' | 'cropPanY'>,
  initial: Pick<CropInitialSnapshot, 'cropZoom' | 'cropPanX' | 'cropPanY'>,
): boolean {
  return (
    Math.abs(clampImageCropZoom(live.cropZoom) - clampImageCropZoom(initial.cropZoom)) > 1e-4 ||
    Math.abs(clampImageCropPan(live.cropPanX) - clampImageCropPan(initial.cropPanX)) > 1e-4 ||
    Math.abs(clampImageCropPan(live.cropPanY) - clampImageCropPan(initial.cropPanY)) > 1e-4
  );
}

interface ImageCropOverlaySessionProps extends ImageCropOverlayProps {
  imgEl: ImageElement;
}

function ImageCropOverlaySession({
  imgEl,
  displayW,
  displayH,
  canvasWidth,
  canvasHeight,
  updateElement,
  pushHistory,
  onOpenAdvancedCrop,
}: ImageCropOverlaySessionProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const settledRef = useRef(false);

  const [initial] = useState<CropInitialSnapshot>(() => {
    const store = useEditorStore.getState();
    return {
      elementId: imgEl.id,
      session: getDocumentSession(),
      historyIndex: store.historyIndex,
      historyLen: store.history.length,
      cropZoom: imgEl.cropZoom,
      cropPanX: imgEl.cropPanX,
      cropPanY: imgEl.cropPanY,
    };
  });

  const boxW = Math.max(1, imgEl.width * displayW);
  const boxH = Math.max(1, imgEl.height * displayH);

  const cachedDims = imgEl.imageSrc ? getCachedImageDimensions(imgEl.imageSrc) : undefined;
  const [resolvedDims, setResolvedDims] = useState<{
    src: string;
    width: number;
    height: number;
  } | null>(null);

  useEffect(() => {
    const src = imgEl.imageSrc;
    if (!src || cachedDims) return;
    let cancelled = false;
    void resolveImageDimensions(src).then((dims) => {
      if (!cancelled && dims && dims.width > 0 && dims.height > 0) {
        setResolvedDims({ src, ...dims });
      }
    });
    return () => {
      cancelled = true;
    };
  }, [imgEl.imageSrc, cachedDims]);

  const sourceDims = useMemo(
    () =>
      cachedDims ??
      (resolvedDims && resolvedDims.src === imgEl.imageSrc ? resolvedDims : null) ?? {
        width: boxW,
        height: boxH,
      },
    [cachedDims, resolvedDims, imgEl.imageSrc, boxW, boxH],
  );

  const latestRef = useRef({
    imgEl,
    boxW,
    boxH,
    displayW,
    displayH,
    sourceDims,
    updateElement,
    pushHistory,
  });
  useLayoutEffect(() => {
    latestRef.current = {
      imgEl,
      boxW,
      boxH,
      displayW,
      displayH,
      sourceDims,
      updateElement,
      pushHistory,
    };
  }, [imgEl, boxW, boxH, displayW, displayH, sourceDims, updateElement, pushHistory]);

  const applyFraming = useCallback(
    (nextZoom: number | undefined, nextPanX: number | undefined, nextPanY: number | undefined) => {
      const { imgEl: liveEl, updateElement: applyUpdate } = latestRef.current;
      applyUpdate(
        liveEl.id,
        normalizeImageCropFraming({
          cropZoom: nextZoom,
          cropPanX: nextPanX,
          cropPanY: nextPanY,
        }),
      );
    },
    [],
  );

  const handleCommit = useCallback(() => {
    if (settledRef.current) return;
    settledRef.current = true;
    useCanvasInteraction.getState().setIsDragging(false);

    const store = useEditorStore.getState();
    const isSameSession =
      getDocumentSession() === initial.session &&
      store.historyIndex === initial.historyIndex &&
      store.history.length === initial.historyLen;

    if (isSameSession) {
      const live = store.elements.find((e) => e.id === initial.elementId);
      if (live && live.type === 'image' && !live.locked && hasFramingChanged(live, initial)) {
        latestRef.current.pushHistory();
      }
    }

    useCanvasInteraction.getState().setCroppingElementId(null);
  }, [initial]);

  const handleCancel = useCallback(() => {
    if (settledRef.current) return;
    settledRef.current = true;
    useCanvasInteraction.getState().setIsDragging(false);

    const store = useEditorStore.getState();
    const isSameSession =
      getDocumentSession() === initial.session &&
      store.historyIndex === initial.historyIndex &&
      store.history.length === initial.historyLen;

    if (isSameSession) {
      const live = store.elements.find((e) => e.id === initial.elementId);
      if (live && live.type === 'image' && !live.locked && hasFramingChanged(live, initial)) {
        latestRef.current.updateElement(initial.elementId, {
          cropZoom: initial.cropZoom,
          cropPanX: initial.cropPanX,
          cropPanY: initial.cropPanY,
        });
      }
    }

    useCanvasInteraction.getState().setCroppingElementId(null);
  }, [initial]);

  // تسجيل أفعال التأكيد/الإلغاء للوصول الموحّد من useKeyboardShortcuts
  useEffect(() => {
    useCanvasInteraction.getState().setCropSessionActions({
      commit: handleCommit,
      cancel: handleCancel,
    });
    return () => {
      useCanvasInteraction.getState().setCropSessionActions(null);
      useCanvasInteraction.getState().setIsDragging(false);
    };
  }, [handleCommit, handleCancel]);

  // إغلاق الجلسة تلقائياً عند تغيير التحديد أو التراجع/الإعادة أو تبديل المستند/الوضع
  useEffect(() => {
    const unsubscribe = useEditorStore.subscribe((state) => {
      if (settledRef.current) return;
      if (
        getDocumentSession() !== initial.session ||
        state.historyIndex !== initial.historyIndex ||
        state.history.length !== initial.historyLen ||
        state.mode !== 'single'
      ) {
        settledRef.current = true;
        useCanvasInteraction.getState().setCroppingElementId(null);
        return;
      }

      const live = state.elements.find((el) => el.id === initial.elementId);
      if (!live || live.type !== 'image' || !live.imageSrc || live.locked) {
        settledRef.current = true;
        useCanvasInteraction.getState().setCroppingElementId(null);
        return;
      }

      if (!state.selectedIds.includes(initial.elementId)) {
        handleCommit();
      }
    });
    return unsubscribe;
  }, [initial, handleCommit]);

  // تركيز الإطار فور الدخول في وضع ضبط الكادر لالتقاط Esc / Enter / الأسهم
  useEffect(() => {
    overlayRef.current?.focus({ preventScroll: true });
  }, []);

  // عجلة الفأرة للتكبير/التصغير غير الهدّام داخل إطار الصورة
  useEffect(() => {
    const el = frameRef.current;
    if (!el) return;
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const { imgEl: liveEl } = latestRef.current;
      const currentZoom = clampImageCropZoom(liveEl.cropZoom);
      const nextZoom = clampImageCropZoom(currentZoom * Math.exp(-e.deltaY * 0.002));
      applyFraming(nextZoom, liveEl.cropPanX, liveEl.cropPanY);
    };
    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
      el.removeEventListener('wheel', handleWheel);
    };
  }, [applyFraming]);

  // سحب الصورة داخل الإطار عبر المؤشر
  const dragRef = useRef<{
    pointerId: number;
    startClientX: number;
    startClientY: number;
    scaleX: number;
    scaleY: number;
    startFraming: ImageCropFraming;
  } | null>(null);
  const dragCleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    return () => {
      dragCleanupRef.current?.();
      dragCleanupRef.current = null;
    };
  }, []);

  const handleFramePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    e.preventDefault();

    dragCleanupRef.current?.();

    const canvasArea = frameRef.current?.closest('#canvas-area') as HTMLElement | null;
    const rect = canvasArea?.getBoundingClientRect();
    const scaleX = rect && rect.width > 0 && displayW > 0 ? rect.width / displayW : 1;
    const scaleY = rect && rect.height > 0 && displayH > 0 ? rect.height / displayH : 1;

    dragRef.current = {
      pointerId: e.pointerId,
      startClientX: e.clientX,
      startClientY: e.clientY,
      scaleX,
      scaleY,
      startFraming: {
        cropZoom: imgEl.cropZoom,
        cropPanX: imgEl.cropPanX,
        cropPanY: imgEl.cropPanY,
      },
    };
    try {
      e.currentTarget.setPointerCapture?.(e.pointerId);
    } catch {
      // تجاهل آمن في بيئات الاختبار التي لا تدعم PointerCapture
    }
    useCanvasInteraction.getState().setIsDragging(true);

    const onPointerMove = (ev: PointerEvent) => {
      const drag = dragRef.current;
      if (!drag || ev.pointerId !== drag.pointerId) return;
      const dxPaper = (ev.clientX - drag.startClientX) / drag.scaleX;
      const dyPaper = (ev.clientY - drag.startClientY) / drag.scaleY;
      const { imgEl: liveEl, boxW: w, boxH: h, sourceDims: dims } = latestRef.current;
      const { cropPanX, cropPanY } = panImageCropByDelta({
        img: dims,
        boxW: w,
        boxH: h,
        framing: drag.startFraming,
        dxPaper,
        dyPaper,
        rotation: liveEl.rotation,
        flipX: liveEl.flipX,
        flipY: liveEl.flipY,
      });
      applyFraming(drag.startFraming.cropZoom, cropPanX, cropPanY);
    };

    const endDrag = (ev?: PointerEvent) => {
      const drag = dragRef.current;
      if (!drag || (ev && ev.pointerId !== drag.pointerId)) return;
      dragRef.current = null;
      dragCleanupRef.current?.();
      dragCleanupRef.current = null;
      useCanvasInteraction.getState().setIsDragging(false);
    };

    const cleanup = () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', endDrag);
      window.removeEventListener('pointercancel', endDrag);
    };
    dragCleanupRef.current = cleanup;
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', endDrag);
    window.addEventListener('pointercancel', endDrag);
  };

  const currentZoom = clampImageCropZoom(imgEl.cropZoom);
  const currentZoomPct = Math.round(currentZoom * 100);
  const hasCustomCrop = hasCustomImageCrop(imgEl);

  const visualBox = getElementVisualBox(imgEl, canvasWidth, canvasHeight);
  const vbLeft = visualBox.x * displayW;
  const vbTop = visualBox.y * displayH;
  const vbWidth = visualBox.width * displayW;
  const vbHeight = visualBox.height * displayH;
  const toolbarCenterX = Math.max(16, Math.min(Math.max(16, displayW - 16), vbLeft + vbWidth / 2));
  const placeBelow = vbTop < 48;
  const toolbarTop = placeBelow ? vbTop + vbHeight + 8 : vbTop - 44;

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      handleCancel();
      return;
    }
    if (e.key === 'Enter') {
      if ((e.target as HTMLElement | null)?.closest?.('button')) return;
      e.preventDefault();
      e.stopPropagation();
      handleCommit();
      return;
    }
    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
      if ((e.target as HTMLElement | null)?.closest?.('[role="slider"]')) return;
      e.preventDefault();
      e.stopPropagation();
      const step = e.shiftKey ? 0.15 : 0.05;
      const crop = computeImageCrop(sourceDims, boxW, boxH, imgEl);
      const slackX = Math.max(0, sourceDims.width - crop.sw);
      const slackY = Math.max(0, sourceDims.height - crop.sh);
      let nextPanX = clampImageCropPan(imgEl.cropPanX);
      let nextPanY = clampImageCropPan(imgEl.cropPanY);
      if (e.key === 'ArrowLeft' && slackX > 1e-6) {
        nextPanX = clampImageCropPan(nextPanX + (imgEl.flipX ? step : -step));
      } else if (e.key === 'ArrowRight' && slackX > 1e-6) {
        nextPanX = clampImageCropPan(nextPanX + (imgEl.flipX ? -step : step));
      } else if (e.key === 'ArrowUp' && slackY > 1e-6) {
        nextPanY = clampImageCropPan(nextPanY + (imgEl.flipY ? step : -step));
      } else if (e.key === 'ArrowDown' && slackY > 1e-6) {
        nextPanY = clampImageCropPan(nextPanY + (imgEl.flipY ? -step : step));
      }
      applyFraming(imgEl.cropZoom, nextPanX, nextPanY);
    }
  };

  return (
    <div
      ref={overlayRef}
      tabIndex={-1}
      onKeyDown={handleKeyDown}
      className="absolute inset-0 pointer-events-none outline-none z-(--z-canvas-text-overlay)"
    >
      {/* إطار التفاعل الموضعي فوق الصورة: سحب لإزاحة الكادر + عجلة للتكبير */}
      <div
        ref={frameRef}
        data-testid="image-crop-overlay"
        data-crop-overlay="true"
        role="region"
        aria-label="ضبط كادر الصورة"
        onPointerDown={handleFramePointerDown}
        onDoubleClick={(e) => {
          e.stopPropagation();
          handleCommit();
        }}
        className="absolute pointer-events-auto cursor-grab active:cursor-grabbing ring-2 ring-primary shadow-fluent-8 select-none"
        style={{
          left: `${imgEl.x * displayW}px`,
          top: `${imgEl.y * displayH}px`,
          width: `${boxW}px`,
          height: `${boxH}px`,
          transform: `rotate(${imgEl.rotation || 0}deg)`,
          transformOrigin: '0 0',
        }}
      >
        {/* شبكة التثليث الإرشادية أثناء ضبط الكادر */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute inset-y-0 left-1/3 w-px bg-white/45 shadow-2xs" />
          <div className="absolute inset-y-0 left-2/3 w-px bg-white/45 shadow-2xs" />
          <div className="absolute inset-x-0 top-1/3 h-px bg-white/45 shadow-2xs" />
          <div className="absolute inset-x-0 top-2/3 h-px bg-white/45 shadow-2xs" />
        </div>
      </div>

      {/* شريط ضبط الكادر المدمج العائم */}
      <div
        data-testid="image-crop-toolbar"
        data-crop-overlay="true"
        dir="rtl"
        onPointerDown={(e) => e.stopPropagation()}
        className="absolute pointer-events-auto rounded-lg bg-card border border-border/80 shadow-fluent-8 fluent-specular px-2 py-1 flex items-center gap-1.5 font-cairo whitespace-nowrap"
        style={{
          left: `${toolbarCenterX}px`,
          top: `${toolbarTop}px`,
          transform: 'translateX(-50%)',
        }}
      >
        <Button
          type="button"
          variant="ghost"
          size="sm"
          aria-label="تصغير الكادر"
          title="تصغير الكادر"
          disabled={currentZoom <= IMAGE_CROP_MIN_ZOOM}
          onClick={() =>
            applyFraming(clampImageCropZoom(currentZoom - 0.25), imgEl.cropPanX, imgEl.cropPanY)
          }
          className="h-7 w-7 p-0 rounded-md"
        >
          <MagnifyingGlassMinus className="w-3.5 h-3.5" weight="regular" />
        </Button>

        <Slider
          min={IMAGE_CROP_MIN_ZOOM * 100}
          max={IMAGE_CROP_MAX_ZOOM * 100}
          step={5}
          value={[currentZoomPct]}
          aria-label="تكبير الكادر"
          onValueChange={(vals) => {
            const nextZoom = clampImageCropZoom((vals[0] ?? 100) / 100);
            applyFraming(nextZoom, imgEl.cropPanX, imgEl.cropPanY);
          }}
          className="w-20"
        />

        <Button
          type="button"
          variant="ghost"
          size="sm"
          aria-label="تكبير الكادر"
          title="تكبير الكادر"
          disabled={currentZoom >= IMAGE_CROP_MAX_ZOOM}
          onClick={() =>
            applyFraming(clampImageCropZoom(currentZoom + 0.25), imgEl.cropPanX, imgEl.cropPanY)
          }
          className="h-7 w-7 p-0 rounded-md"
        >
          <MagnifyingGlassPlus className="w-3.5 h-3.5" weight="regular" />
        </Button>

        <span
          className="text-mini font-mono tabular-nums text-foreground min-w-[4ch] text-center select-none"
          dir="ltr"
        >
          {currentZoomPct}%
        </span>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          aria-label="إعادة ضبط الكادر"
          title="إعادة ضبط الكادر"
          disabled={!hasCustomCrop}
          onClick={() => applyFraming(1, 0, 0)}
          className="h-7 w-7 p-0 rounded-md"
        >
          <ArrowCounterClockwise className="w-3.5 h-3.5" weight="regular" />
        </Button>

        <Button
          type="button"
          variant="outline"
          size="sm"
          aria-label="قص وتدوير متقدم"
          title="فتح نافذة القص والتدوير المتقدم"
          onClick={() => {
            const targetId = imgEl.id;
            handleCancel();
            onOpenAdvancedCrop(targetId);
          }}
          className="h-7 px-2 gap-1 text-xs rounded-md"
        >
          <Crop className="w-3.5 h-3.5" weight="regular" />
          <span>قص متقدم</span>
        </Button>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleCancel}
          className="h-7 px-2 gap-1 text-xs rounded-md text-muted-foreground hover:text-foreground"
        >
          <X className="w-3.5 h-3.5" weight="bold" />
          <span>إلغاء</span>
        </Button>

        <Button
          type="button"
          size="sm"
          onClick={handleCommit}
          className="h-7 px-2.5 gap-1 text-xs rounded-md bg-primary-action hover:bg-primary-action-hover text-primary-foreground"
        >
          <Check className="w-3.5 h-3.5" weight="bold" />
          <span>تم</span>
        </Button>
      </div>
    </div>
  );
}

export const ImageCropOverlay = React.memo(function ImageCropOverlay(props: ImageCropOverlayProps) {
  if (props.printMode || !props.croppingElementId) return null;
  const found = props.elements.find((el) => el.id === props.croppingElementId);
  if (!found || found.type !== 'image' || !found.imageSrc || found.locked) {
    return null;
  }
  return <ImageCropOverlaySession key={found.id} {...props} imgEl={found} />;
});
