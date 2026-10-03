import React, { useRef, useEffect, useMemo } from 'react';
import { Image as KonvaImage, Group } from 'react-konva';
import type Konva from 'konva';
import { useAsyncImage } from '@/hooks/use-async-image';
import { getKonvaFilters } from '@/lib/filters/konva-filters';
import { useRenderQuality } from '@/lib/canvas/render-quality';
import { useFilterCache } from '@/hooks/use-filter-cache';
import { getDisplayImage } from '@/lib/canvas/display-image';
import { liftToDragLayer, dropFromDragLayer, findLiftRoot } from '../drag-layer';
import { MagicAiScanner } from './magic-ai-scanner';

export const KonvaCollageImage = React.memo(
  function KonvaCollageImage({
    id,
    imageSrc,
    width,
    height,
    canvasWidth,
    filter,
    brightness,
    contrast,
    saturation,
    zoom = 1,
    dragX = 0,
    dragY = 0,
    flipX = false,
    flipY = false,
    rotation = 0,
    draggable = false,
    cornerRadius = 0,
    onUpdateOffsets,
    onDragEnd,
    onClick,
    onDblClick,
  }: {
    id?: string;
    imageSrc: string;
    width: number;
    height: number;
    canvasWidth: number;
    filter?: string;
    brightness?: number;
    contrast?: number;
    saturation?: number;
    zoom?: number;
    dragX?: number;
    dragY?: number;
    flipX?: boolean;
    flipY?: boolean;
    rotation?: number;
    draggable?: boolean;
    cornerRadius?: number;
    onUpdateOffsets?: (x: number, y: number) => void;
    onDragEnd?: () => void;
    onClick?: () => void;
    onDblClick?: () => void;
  }) {
    const [image] = useAsyncImage(imageSrc);
    // 🚀 نسخة عرض مخفّضة للرسم التفاعلي — المصدر الكامل للتصدير فقط.
    const displayImage = React.useMemo(() => getDisplayImage(image), [image]);
    // ⚖️ فضاء الإحداثيات الموحّد: نسبة الأصل → العرض. قبل اكتمال التحميل
    // (naturalWidth = 0) تكون النسبة 1 فلا يحدث أي تحويل.
    const naturalW = image?.naturalWidth || 0;
    const shownForScale = displayImage ?? image;
    const displayW = shownForScale ? shownForScale.width : 0;
    const srcToShown = naturalW > 0 && displayW > 0 ? displayW / naturalW : 1;
    const imageRef = useRef<Konva.Image | null>(null);
    // 🧭 كل حالة السحب التفاعلي أدناه (accumulatedDrag/dragStartRef) تعمل في
    // فضاء نسخة العرض حصراً — تُزامَن من props (فضاء الأصل) عبر effect أدناه.
    const accumulatedDrag = useRef<{ dragX: number; dragY: number }>({ dragX, dragY });
    const dragStartRef = useRef<{ dragX: number; dragY: number }>({ dragX, dragY });
    // 🚀 معكوس مصفوفة التحويل يُحسب مرة واحدة عند بدء السحب — التحويل لا يتغير
    // أثناء السحب (القص فقط يتغير) فيُعاد استخدامه لكل حدث بدل invert() مكلف.
    const dragXfRef = useRef<{
      inv: { point: (p: { x: number; y: number }) => { x: number; y: number } };
      absX: number;
      absY: number;
    } | null>(null);
    const enhancingElementId = useRenderQuality((s) => s.enhancingElementId);
    const isEnhancing = Boolean(id && enhancingElementId === id);

    // 🛡️ نمط latest-ref: المقارن المخصص أدناه يتجاهل هوية الدوال لتفادي إعادة
    // الرسم عند كل render للأب، لكن هذا قد يترك closures قديمة إن التقطت الدوال
    // حالة متغيرة. المراجع أدناه تضمن استدعاء آخر نسخة مُمرّرة دائماً.
    const onUpdateOffsetsRef = useRef<((x: number, y: number) => void) | undefined>(
      onUpdateOffsets,
    );
    const onDragEndRef = useRef<(() => void) | undefined>(onDragEnd);
    const onClickRef = useRef<((e: unknown) => void) | undefined>(onClick);
    const onDblClickRef = useRef<((e: unknown) => void) | undefined>(onDblClick);
    useEffect(() => {
      onUpdateOffsetsRef.current = onUpdateOffsets;
      onDragEndRef.current = onDragEnd;
      onClickRef.current = onClick;
      onDblClickRef.current = onDblClick;
    });

    useEffect(() => {
      // 🔄 Props بفضاء الأصل → حالة السحب بفضاء العرض. يُعاد التحويل عند تغيّر
      // الصورة (اكتمال التحميل يبدّل النسبة) حتى لا تبقى قيم محسوبة بنسبة قديمة.
      accumulatedDrag.current = { dragX: dragX * srcToShown, dragY: dragY * srcToShown };
    }, [dragX, dragY, srcToShown]);

    const filterResult = useMemo(
      () =>
        getKonvaFilters({
          filter,
          brightness,
          contrast,
          saturation,
        }),
      [filter, brightness, contrast, saturation],
    );

    const filterKey = `${filter}_${brightness}_${contrast}_${saturation}`;
    const hasFilters = filterResult.filters.length > 0;
    const hasTransform = flipX || flipY || rotation !== 0;

    useFilterCache({
      nodeRef: imageRef,
      image: displayImage as unknown as HTMLImageElement,
      hasFilters,
      canvasWidth,
      filterKey,
    });

    if (!image) return null;

    // ⚖️ كل حسابات القصّة (object-fit: cover + zoom + الإزاحات) تتم في فضاء
    // الصورة المُمرَّرة للعقدة فعلياً (نسخة العرض المخفّضة بسقف 2048px)،
    // لأن Konva يطبّق cropX/cropY/cropWidth/cropHeight على نسخة العرض نفسها
    // (shapes/Image.js يستخدم `image = this.attrs.image` مباشرة). الحساب على
    // أبعاد الأصل كان يترك القصّة خارج نطاق النسخة المخفّضة فتظهر الصورة
    // مصغَّرة ومزاحة داخل الخلية — أوضح مع لقطة نقل الكولاج (2480px+).
    const shown = displayImage ?? image;
    const normRot = ((rotation % 360) + 360) % 360;
    const isRotated90or270 = normRot === 90 || normRot === 270;
    // `.width`/`.height` صحيحان لكلي النوعين: على العنصر غير المُركَّب في DOM
    // يعيدان الأبعاد الطبيعية، وعلى نسخة Canvas يعيدان أبعادها الفعلية.
    const shownW = shown.width;
    const shownH = shown.height;
    const shownAspect = shownW / shownH;
    const slotAspect = isRotated90or270 ? height / width : width / height;
    let sw = shownW;
    let sh = shownH;

    if (shownAspect > slotAspect) {
      sw = shownH * slotAspect;
    } else {
      sh = shownW / slotAspect;
    }

    // Apply zoom factor
    sw = sw / zoom;
    sh = sh / zoom;

    // Default centering offset
    const defaultSx = shownAspect > slotAspect ? (shownW - sw) / 2 : 0;
    const defaultSy = shownAspect > slotAspect ? 0 : (shownH - sh) / 2;

    // Max bounds for offset X and Y
    const maxDragX = Math.max(0, (shownW - sw) / 2);
    const maxDragY = Math.max(0, (shownH - sh) / 2);

    // 🧭 props dragX/dragY بفضاء الصورة الأصلية (الستور + drawSlotImage يفسرها
    // على أبعاد الأصل) — نحوّلها لفضاء نسخة العرض بالتناسب عبر النسبة المحسوبة
    // أعلاه (متاحة هنا لأننا بعد `if (!image)`).
    const dragXShown = dragX * srcToShown;
    const dragYShown = dragY * srcToShown;

    // Clamp the drag offsets to ensure crop window stays within the image boundaries
    const dragXClamped = Math.max(-maxDragX, Math.min(maxDragX, dragXShown));
    const dragYClamped = Math.max(-maxDragY, Math.min(maxDragY, dragYShown));

    const sx = Math.round(defaultSx + dragXClamped);
    const sy = Math.round(defaultSy + dragYClamped);
    sw = Math.round(sw);
    sh = Math.round(sh);

    const content = (
      <Group x={hasTransform ? -width / 2 : 0} y={hasTransform ? -height / 2 : 0}>
        <KonvaImage
          draggable={draggable}
          onDragStart={() => {
            // 🖼️ تفريغ كاش Konva قبل السحب — العقدة المخبأة تتجاهل تحديثات
            // cropX/cropY أثناء onDragMove فتظل الصورة جامدة (Konva يرسم من الكاش)
            const node = imageRef.current;
            if (node && typeof node.isCached === 'function' && node.isCached()) {
              node.clearCache();
            }
            // 🚀 التقاط معكوس التحويل مرة واحدة — يُعاد استخدامه طوال السحب.
            if (node) {
              const abs0 = node.getAbsolutePosition();
              dragXfRef.current = {
                inv: node.getAbsoluteTransform().copy().invert(),
                absX: abs0.x,
                absY: abs0.y,
              };
            } else {
              dragXfRef.current = null;
            }
            // 🚀 رفع مجموعة الخانة (مع قصّها) إلى طبقة السحب الرسمية.
            try {
              liftToDragLayer([findLiftRoot(node)]);
            } catch {
              // تجاهل آمن — السحب يعمل بلا طبقة
            }
            dragStartRef.current = {
              dragX: accumulatedDrag.current.dragX,
              dragY: accumulatedDrag.current.dragY,
            };
          }}
          dragBoundFunc={(pos) => {
            const node = imageRef.current;
            if (!node || !image) return pos;

            // تحويل حركة المؤشر المطلقة إلى المحاور المحلية للخلية والصورة
            const cached = dragXfRef.current;
            const nodeAbsPos = cached
              ? { x: cached.absX, y: cached.absY }
              : node.getAbsolutePosition();
            const inv = cached ? cached.inv : node.getAbsoluteTransform().copy().invert();
            const p0 = inv.point({ x: nodeAbsPos.x, y: nodeAbsPos.y });
            const p1 = inv.point({ x: pos.x, y: pos.y });
            const dxLocal = p1.x - p0.x;
            const dyLocal = p1.y - p0.y;

            // الحساب الخطي المتناسب مع وضع السحب الابتدائي (منع الانزلاق والتسارع)
            const startX = dragStartRef.current.dragX;
            const startY = dragStartRef.current.dragY;

            const proposedX = startX - dxLocal * (sw / width);
            const proposedY = startY - dyLocal * (sh / height);

            let snapX = proposedX;
            if (Math.abs(snapX) < maxDragX * 0.05 + 8) snapX = 0;
            let snapY = proposedY;
            if (Math.abs(snapY) < maxDragY * 0.05 + 8) snapY = 0;

            const clampedX = Math.max(-maxDragX, Math.min(maxDragX, snapX));
            const clampedY = Math.max(-maxDragY, Math.min(maxDragY, snapY));

            accumulatedDrag.current = { dragX: clampedX, dragY: clampedY };

            // 🚀 بلا batchDraw هنا — الموضع لا يتغير (يُعاد nodeAbsPos ثابتاً)
            // والتحديث البصري يأتي من crop في onDragMove برسمة واحدة.
            return nodeAbsPos;
          }}
          onDragMove={() => {
            const node = imageRef.current;
            if (!node || !image) return;
            const currentX = accumulatedDrag.current.dragX;
            const currentY = accumulatedDrag.current.dragY;

            const dragXClamped = Math.max(-maxDragX, Math.min(maxDragX, currentX));
            const dragYClamped = Math.max(-maxDragY, Math.min(maxDragY, currentY));

            const newSx = Math.round(defaultSx + dragXClamped);
            const newSy = Math.round(defaultSy + dragYClamped);

            node.cropX(newSx);
            node.cropY(newSy);

            node.getLayer()?.batchDraw();
          }}
          onDragEnd={() => {
            // 🚀 الاستعادة أولاً — قبل كتابة الإزاحات للستور.
            try {
              dropFromDragLayer();
            } catch {
              // تجاهل آمن
            }
            dragXfRef.current = null;
            if (draggable && accumulatedDrag.current) {
              // إعادة بناء الكاش بعد استقرار الإزاحة — الفلاتر تعود للعمل
              // بدقة الشاشة العادية بعد الحركة
              const node = imageRef.current;
              if (node && hasFilters && typeof node.cache === 'function') {
                try {
                  node.cache({ pixelRatio: Math.max(1, window.devicePixelRatio || 1) });
                  node.getLayer()?.batchDraw();
                } catch {
                  // تجاهل آمن — الكاش تحسين وليس شرطاً للرسم
                }
              }
              // ✍️ الكتابة للستور بفضاء الأصل: الإزاحة المعروضة في فضاء نسخة
              // العرض تُعاد قياسها بالتناسب، فتُفسَّر في drawSlotImage على أبعاد
              // الأصل تماماً كما عُرضت — مطابقة تامة بين الشاشة والطباعة/التصدير.
              // الحارس الصفري يمنع تضخيم القيمة إلى ما لا نهاية قبل اكتمال التحميل.
              onUpdateOffsetsRef.current?.(
                accumulatedDrag.current.dragX / (srcToShown || 1),
                accumulatedDrag.current.dragY / (srcToShown || 1),
              );
              onDragEndRef.current?.();
            }
          }}
          image={shown as unknown as HTMLImageElement}
          cropX={sx}
          cropY={sy}
          cropWidth={sw}
          cropHeight={sh}
          x={0}
          y={0}
          width={width}
          height={height}
          cornerRadius={cornerRadius}
          perfectDrawEnabled={false}
          filters={filterResult.filters}
          brightness={filterResult.brightness}
          contrast={filterResult.contrast}
          saturation={filterResult.saturation}
          sepiaRatio={filterResult.sepiaRatio}
          pixelSize={filterResult.pixelSize}
          threshold={filterResult.threshold}
          onClick={(e) => onClickRef.current?.(e)}
          onTap={(e) => onClickRef.current?.(e)}
          onDblClick={(e) => onDblClickRef.current?.(e)}
          onDblTap={(e) => onDblClickRef.current?.(e)}
          ref={imageRef}
        />
        {isEnhancing && (
          <MagicAiScanner x={0} y={0} width={width} height={height} cornerRadius={cornerRadius} />
        )}
      </Group>
    );

    if (!hasTransform) return content;

    return (
      <Group
        x={width / 2}
        y={height / 2}
        rotation={rotation}
        scaleX={flipX ? -1 : 1}
        scaleY={flipY ? -1 : 1}
      >
        {content}
      </Group>
    );
  },
  (prev, next) => {
    // 🛡️ الدوال متعمدة الغياب هنا — تُدار عبر latest-refs داخل المكوّن أعلاه
    return (
      prev.id === next.id &&
      prev.imageSrc === next.imageSrc &&
      prev.width === next.width &&
      prev.height === next.height &&
      prev.canvasWidth === next.canvasWidth &&
      prev.filter === next.filter &&
      prev.brightness === next.brightness &&
      prev.contrast === next.contrast &&
      prev.saturation === next.saturation &&
      prev.zoom === next.zoom &&
      prev.dragX === next.dragX &&
      prev.dragY === next.dragY &&
      prev.flipX === next.flipX &&
      prev.flipY === next.flipY &&
      prev.rotation === next.rotation &&
      prev.draggable === next.draggable &&
      prev.cornerRadius === next.cornerRadius
    );
  },
);
