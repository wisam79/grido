import Konva from 'konva';
import React, { useEffect } from 'react';
import { Image as KonvaImage, Group, Rect, Shape as KonvaShape } from 'react-konva';

import { useAsyncImage } from '@/hooks/use-async-image';
import { useDisplayImage } from '@/hooks/use-display-image';
import { useFilterCache } from '@/hooks/use-filter-cache';
import { useKonvaDrag } from '@/hooks/use-konva-drag';
import { useStickerDisplayRaster } from '@/hooks/use-sticker-display-raster';
import { useCanvasInteraction } from '@/lib/canvas/canvas-interaction-store';
import { isStageCaptureActive } from '@/lib/canvas/konva-export-utils';
import { useRenderQuality } from '@/lib/canvas/render-quality';
import { computeImageCrop } from '@/lib/export/export-primitives';
import { getKonvaFilters } from '@/lib/filters/konva-filters';

import { withShadowlessDrag } from './drag-shadow';
import { MagicAiScanner } from './magic-ai-scanner';
import { propsAreEqual } from './types';
import type { ElementProps } from './types';
import type { CacheableKonvaNode } from '@/hooks/use-filter-cache';
import type { ImageElement } from '@/lib/editor-store';
import '@/lib/filters/custom-filters';

function traceMaskClipPath(
  ctx: Pick<
    CanvasRenderingContext2D,
    'beginPath' | 'moveTo' | 'lineTo' | 'bezierCurveTo' | 'arc' | 'closePath'
  >,
  maskShape: string | undefined,
  w: number,
  h: number,
) {
  if (maskShape === 'circle') {
    ctx.beginPath();
    ctx.arc(w / 2, h / 2, Math.min(w, h) / 2, 0, Math.PI * 2);
    ctx.closePath();
  } else if (maskShape === 'star') {
    const cx = w / 2;
    const cy = h / 2;
    const spikes = 5;
    const outerRadius = Math.min(w, h) / 2;
    const innerRadius = outerRadius / 2;
    let rot = (Math.PI / 2) * 3;
    const step = Math.PI / spikes;

    ctx.beginPath();
    ctx.moveTo(cx, cy - outerRadius);
    for (let i = 0; i < spikes; i++) {
      let x = cx + Math.cos(rot) * outerRadius;
      let y = cy + Math.sin(rot) * outerRadius;
      ctx.lineTo(x, y);
      rot += step;

      x = cx + Math.cos(rot) * innerRadius;
      y = cy + Math.sin(rot) * innerRadius;
      ctx.lineTo(x, y);
      rot += step;
    }
    ctx.lineTo(cx, cy - outerRadius);
    ctx.closePath();
  } else if (maskShape === 'heart') {
    const topCurveHeight = h * 0.3;
    ctx.beginPath();
    ctx.moveTo(w / 2, topCurveHeight);
    ctx.bezierCurveTo(w / 2, 0, 0, 0, 0, topCurveHeight);
    ctx.bezierCurveTo(0, (h + topCurveHeight) / 2, w / 2, (h + topCurveHeight) / 2, w / 2, h);
    ctx.bezierCurveTo(
      w / 2,
      (h + topCurveHeight) / 2,
      w,
      (h + topCurveHeight) / 2,
      w,
      topCurveHeight,
    );
    ctx.bezierCurveTo(w, 0, w / 2, 0, w / 2, topCurveHeight);
    ctx.closePath();
  }
}

export const URLImage = React.memo(function URLImage({
  element: _element,
  isSelected,
  onMouseDown,
  onTouchStart,
  onClick,
  onTap,
  onDblClick,
  onChange: _onChange,
  canvasWidth,
  canvasHeight,
  setActiveGuides,
  elementRef,
  snapToGrid,
  gridSize,
  altPressedRef,
  shiftPressedRef,
  getKonvaNode,
}: ElementProps) {
  const element = _element as ImageElement;
  const [image] = useAsyncImage(element.imageSrc || '');
  // 🚀 نسخة عرض مخفّضة (سقف 2048px) للرسم التفاعلي — المصدر الكامل يبقى
  // للتصدير والذكاء الاصطناعي. useMemo متزامن: توليد مرة واحدة لكل صورة.
  const displayImage = useDisplayImage(image);
  const nodeW = element.width * canvasWidth;
  const nodeH = element.height * canvasHeight;
  // ترقية متجهة حيّة للملصقات المرفقة: عند التكبير نعيد تصيير الـ SVG بالمقاس الجديد
  // حتى لا يتبكسل الراستر الابتدائي (50mm@300DPI ≈ 591px) على المسرح أو عند الزوم.
  const stickerImage = useStickerDisplayRaster({
    stickerSource: element.stickerSource,
    nodeW,
    nodeH,
    baseImage: image,
  });
  const shown = stickerImage ?? displayImage ?? image;
  const hasAnimatedRef = React.useRef(false);
  const enhancingElementId = useRenderQuality((s) => s.enhancingElementId);
  const isEnhancing = enhancingElementId === element.id;
  const isCropping = useCanvasInteraction((s) => s.croppingElementId === element.id);

  const { onDragStart, dragBoundFunc, onDragMove, onDragEnd } = useKonvaDrag({
    element,
    canvasWidth,
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
      const targetOpacity = element.opacity;
      node.opacity(0);
      node.scale({ x: 0.8, y: 0.8 });
      (node as unknown as { to: (cfg: Record<string, unknown>) => void }).to({
        opacity: targetOpacity,
        scaleX: 1,
        scaleY: 1,
        duration: 0.28,
        easing: Konva.Easings.BackEaseOut,
      });
    }
  }, [elementRef, element.opacity]);

  const { filters, filterProps } = React.useMemo(() => {
    const res = getKonvaFilters({
      filter: element.filter,
      brightness: element.brightness,
      contrast: element.contrast,
      saturation: element.saturation,
    });
    if (element.blur && element.blur > 0) {
      res.filters.push(Konva.Filters.Blur);
    }
    return { filters: res.filters, filterProps: res };
  }, [element.filter, element.brightness, element.contrast, element.saturation, element.blur]);

  const imageNodeRef = React.useRef<CacheableKonvaNode | null>(null);
  // الأبعاد خارج المفتاح عمداً: التحجيم يعيد الكاش المكلف في كل إطار،
  // ويُعاد بناؤه صراحةً بعد استقرار التحويل (onTransformEnd) والتصدير يرفع الدقة بنفسه
  // 🛡️ cornerRadius داخل المفتاح: الخاصية تُطبَّق على العقدة المُخزَّنة
  // (`node.cache()`)، فبدونها يظل القص الزاوي القديم مرسوماً في البيت ماپ
  // حتى يُجبر تغيير الحجم أو الزوم إعادة بناء الكاش (H2 من تدقيق 2026-10-08).
  const filterKey = `${element.filter}_${element.brightness}_${element.contrast}_${element.saturation}_${element.blur}_${element.cornerRadius || 0}`;
  const hasFilters = filters.length > 0;

  const recacheFilters = useFilterCache({
    targetId: element.id,
    nodeRef: imageNodeRef,
    image: shown,
    hasFilters,
    canvasWidth,
    filterKey,
    observeCropChanges: true,
  });

  // إعادة الكاش بعد استقرار التحجيم فقط (الستور يُكتب عند onTransformEnd لا أثناءه،
  // فيطلق هذا الأثر مرة واحدة بدل كل إطار تحجيم)
  const prevDimsRef = React.useRef(`${element.width}x${element.height}`);
  React.useEffect(() => {
    const key = `${element.width}x${element.height}`;
    if (prevDimsRef.current === key) return;
    prevDimsRef.current = key;
    // تفريغ الكاش فورياً لمنع رسم البيت ماب القديم بأبعاد قديمة
    imageNodeRef.current?.clearCache?.();
    if (!hasFilters) return;
    const t = setTimeout(() => recacheFilters(), 100);
    return () => clearTimeout(t);
  }, [element.width, element.height, hasFilters, recacheFilters]);

  const flipped = element.flipX === true;
  const flippedY = element.flipY === true;
  const nodeX = element.x * canvasWidth;
  const nodeY = element.y * canvasHeight;

  // ⚖️ مطابقة object-fit: cover + الكادر غير الهدّام مع مسار التصدير اليدوي (computeImageCrop في export-primitives.ts):
  // يمنع مطّ وتشويه الوجوه عند تغيير أبعاد الصورة بمقابض الجوانب ويوحّد المعاينة والتصدير 100%.
  const coverCrop = React.useMemo(() => {
    if (!shown || nodeW <= 0 || nodeH <= 0) return undefined;
    const shownW = shown.width || (shown as HTMLImageElement).naturalWidth || 0;
    const shownH = shown.height || (shown as HTMLImageElement).naturalHeight || 0;
    if (shownW <= 0 || shownH <= 0) return undefined;
    const crop = computeImageCrop({ width: shownW, height: shownH }, nodeW, nodeH, {
      cropZoom: element.cropZoom,
      cropPanX: element.cropPanX,
      cropPanY: element.cropPanY,
    });
    const cropWidth = Math.max(1, Math.min(shownW, Math.round(crop.sw)));
    const cropHeight = Math.max(1, Math.min(shownH, Math.round(crop.sh)));
    const cropX = Math.max(0, Math.min(shownW - cropWidth, Math.round(crop.sx)));
    const cropY = Math.max(0, Math.min(shownH - cropHeight, Math.round(crop.sy)));
    return {
      cropX,
      cropY,
      cropWidth,
      cropHeight,
    };
  }, [shown, nodeW, nodeH, element.cropZoom, element.cropPanX, element.cropPanY]);

  // 🚀 إطفاء الظلال أثناء السحب بلا إعادة رسم React (انظر drag-shadow.ts و konva-rendering-invariants).
  const { handleStart: handleShadowlessStart, handleEnd: handleShadowlessEnd } = withShadowlessDrag(
    () => elementRef.current as unknown as Konva.Group | null,
    onDragStart,
    onDragEnd,
  );

  const clipFunc = React.useMemo(() => {
    if (!element.maskShape || element.maskShape === 'none') return undefined;

    return (ctx: Konva.Context) => {
      traceMaskClipPath(ctx, element.maskShape, nodeW, nodeH);
    };
  }, [element.maskShape, nodeW, nodeH]);

  const hasShadow =
    (element.shadowOpacity ?? 0) > 0 &&
    Boolean(
      element.shadowColor || element.shadowBlur || element.shadowOffsetX || element.shadowOffsetY,
    );
  const shadowProps = hasShadow
    ? {
        shadowColor: element.shadowColor || '#000000',
        shadowBlur: element.shadowBlur || 0,
        shadowOffsetX: element.shadowOffsetX || 0,
        shadowOffsetY: element.shadowOffsetY || 0,
        shadowOpacity: element.shadowOpacity ?? 0,
      }
    : {
        shadowColor: undefined,
        shadowBlur: 0,
        shadowOffsetX: 0,
        shadowOffsetY: 0,
        shadowOpacity: 0,
      };
  const hasBgColor = Boolean(element.bgColor && element.bgColor !== 'transparent');
  // في Konva لا تدعم عقدة Group خصائص الظل مطلقاً (تُطبَّق على Shape فقط)، وعند
  // تفعيل الفلاتر (node.cache) أو قناع القصّ (clipFunc) يُحجب ظل KonvaImage.
  // لذا نرسم الظل مباشرة على KonvaImage في الحالة العادية، أو على Shape غير
  // مقصوص يعرض صورة مخبأة مقصوصة في كانفاس خارجي ليظهر الظل حول الشكل المقصوص.
  const useDirectImageShadow = hasShadow && !hasFilters && !clipFunc && !hasBgColor;
  const useRectShadow = hasShadow && hasBgColor && !clipFunc;
  const useShapeShadowCaster =
    hasShadow && !useDirectImageShadow && !useRectShadow && Boolean(shown);

  // Reuse only the editor bitmap. Capture swaps the Image node inside its
  // serialized transaction, so the caster must read that node at draw time.
  // No effect cleanup: StrictMode replays cleanup while this bitmap is still live.
  const shadowCasterRef = React.useRef<{
    source: CanvasImageSource;
    crop: string;
    canvas: HTMLCanvasElement;
  } | null>(null);
  const drawShadowCaster = (context: Konva.Context) => {
    const node = imageNodeRef.current as unknown as Konva.Image | null;
    const source = node?.image() ?? shown;
    if (!source || nodeW <= 0 || nodeH <= 0) return;
    const crop =
      node?.crop() ??
      (coverCrop
        ? {
            x: coverCrop.cropX,
            y: coverCrop.cropY,
            width: coverCrop.cropWidth,
            height: coverCrop.cropHeight,
          }
        : { x: 0, y: 0, width: 0, height: 0 });
    // The capture canvas carries its own DPI. Never enlarge the fixed 1024px
    // editor caster for print, and never retain a leased full-resolution source.
    const pixelRatio = context.getCanvas().getPixelRatio();
    const capturing = isStageCaptureActive(node?.getStage());
    const scale = capturing ? pixelRatio : Math.min(1, 1024 / Math.max(nodeW, nodeH));
    const cw = Math.max(1, Math.ceil(nodeW * scale));
    const ch = Math.max(1, Math.ceil(nodeH * scale));
    const key = `${crop.x},${crop.y},${crop.width},${crop.height},${nodeW},${nodeH},${cw},${ch},${element.maskShape},${element.cornerRadius},${element.bgColor}`;
    const cached = shadowCasterRef.current;
    let off = cached?.source === source && cached.crop === key ? cached.canvas : null;
    if (!off) {
      off = document.createElement('canvas');
      off.width = cw;
      off.height = ch;
      const ctx = off.getContext('2d');
      if (!ctx) return;
      ctx.scale(cw / nodeW, ch / nodeH);
      if (element.maskShape && element.maskShape !== 'none') {
        traceMaskClipPath(ctx, element.maskShape, nodeW, nodeH);
        ctx.clip();
      } else if (element.cornerRadius && element.cornerRadius > 0) {
        const r = Math.min(element.cornerRadius, nodeW / 2, nodeH / 2);
        ctx.beginPath();
        ctx.moveTo(r, 0);
        ctx.arcTo(nodeW, 0, nodeW, nodeH, r);
        ctx.arcTo(nodeW, nodeH, 0, nodeH, r);
        ctx.arcTo(0, nodeH, 0, 0, r);
        ctx.arcTo(0, 0, nodeW, 0, r);
        ctx.closePath();
        ctx.clip();
      }
      if (hasBgColor && element.bgColor) {
        ctx.fillStyle = element.bgColor;
        ctx.fillRect(0, 0, nodeW, nodeH);
      }
      if (crop.width > 0 && crop.height > 0) {
        ctx.drawImage(
          source as CanvasImageSource,
          crop.x,
          crop.y,
          crop.width,
          crop.height,
          0,
          0,
          nodeW,
          nodeH,
        );
      } else {
        ctx.drawImage(source as CanvasImageSource, 0, 0, nodeW, nodeH);
      }
      if (!capturing && source === shown) {
        shadowCasterRef.current = { source: source as CanvasImageSource, crop: key, canvas: off };
      }
    }
    context._context.drawImage(off, 0, 0, nodeW, nodeH);
  };

  return (
    <Group
      ref={elementRef as unknown as React.Ref<Konva.Group>}
      x={nodeX}
      y={nodeY}
      width={nodeW}
      height={nodeH}
      scaleX={1}
      scaleY={1}
      rotation={element.rotation || 0}
      opacity={element.opacity}
      visible={element.visible !== false}
      id={element.id}
      draggable={!element.locked && isSelected && !isCropping}
      onDragStart={handleShadowlessStart}
      dragBoundFunc={dragBoundFunc}
      onDragMove={onDragMove}
      onDragEnd={handleShadowlessEnd}
      onMouseDown={onMouseDown}
      onTouchStart={onTouchStart}
      onClick={onClick}
      onTap={onTap}
      onDblClick={onDblClick}
      onDblTap={onDblClick as unknown as (e: Konva.KonvaEventObject<TouchEvent>) => void}
    >
      <Group
        x={nodeW / 2}
        y={nodeH / 2}
        offsetX={nodeW / 2}
        offsetY={nodeH / 2}
        scaleX={flipped ? -1 : 1}
        scaleY={flippedY ? -1 : 1}
        width={nodeW}
        height={nodeH}
      >
        {useShapeShadowCaster && (
          <KonvaShape
            x={0}
            y={0}
            width={nodeW}
            height={nodeH}
            listening={false}
            perfectDrawEnabled={false}
            {...shadowProps}
            sceneFunc={drawShadowCaster}
          />
        )}
        <Group width={nodeW} height={nodeH} clipFunc={clipFunc}>
          {hasBgColor && (
            <Rect
              x={0}
              y={0}
              width={nodeW}
              height={nodeH}
              fill={element.bgColor}
              cornerRadius={element.cornerRadius || 0}
              listening={false}
              {...(useRectShadow ? shadowProps : {})}
            />
          )}
          <KonvaImage
            ref={imageNodeRef as unknown as React.RefObject<Konva.Image>}
            image={shown as unknown as HTMLImageElement}
            cropX={coverCrop?.cropX}
            cropY={coverCrop?.cropY}
            cropWidth={coverCrop?.cropWidth}
            cropHeight={coverCrop?.cropHeight}
            x={0}
            y={0}
            width={nodeW}
            height={nodeH}
            perfectDrawEnabled={false}
            cornerRadius={element.cornerRadius || 0}
            {...(useDirectImageShadow
              ? shadowProps
              : {
                  shadowColor: undefined,
                  shadowBlur: 0,
                  shadowOffsetX: 0,
                  shadowOffsetY: 0,
                  shadowOpacity: 0,
                })}
            filters={filters}
            brightness={filterProps.brightness}
            contrast={filterProps.contrast}
            blurRadius={element.blur || 0}
            saturation={filterProps.saturation}
            sepiaRatio={filterProps.sepiaRatio}
            pixelSize={filterProps.pixelSize}
            threshold={filterProps.threshold}
          />
          {isEnhancing && (
            <MagicAiScanner
              x={0}
              y={0}
              width={nodeW}
              height={nodeH}
              rotation={0}
              cornerRadius={element.cornerRadius || 0}
            />
          )}
        </Group>
      </Group>
    </Group>
  );
}, propsAreEqual);
