import React, { useEffect } from "react";
import { Image as KonvaImage, Group, Rect } from "react-konva";
import { useAsyncImage } from "@/hooks/use-async-image";
import Konva from "konva";
import { ImageElement } from "@/lib/editor-store";
import { getKonvaFilters } from "@/lib/filters/konva-filters";
import { useRenderQuality } from "@/lib/canvas/render-quality";
import { useFilterCache } from "@/hooks/use-filter-cache";
import { getDisplayImage } from "@/lib/canvas/display-image";
import { useKonvaDrag } from "@/hooks/use-konva-drag";
import { ElementProps, propsAreEqual } from "./types";
import { MagicAiScanner } from "./magic-ai-scanner";
import "@/lib/filters/custom-filters";

export const URLImage = React.memo(function URLImage({ 
  element: _element, 
  isSelected, 
  onMouseDown,
  onTouchStart,
  onClick,
  onTap, 
  onChange, 
  canvasWidth, 
  canvasHeight, 
  setActiveGuides, 
  elementRef, 
  snapToGrid, 
  gridSize, 
  altPressedRef, 
  shiftPressedRef, 
  getKonvaNode 
}: ElementProps) {
  const element = _element as ImageElement;
  const [image] = useAsyncImage(element.imageSrc || "");
  // 🚀 نسخة عرض مخفّضة (سقف 2048px) للرسم التفاعلي — المصدر الكامل يبقى
  // للتصدير والذكاء الاصطناعي. useMemo متزامن: توليد مرة واحدة لكل صورة.
  const displayImage = React.useMemo(() => getDisplayImage(image), [image]);
  const hasAnimatedRef = React.useRef(false);
  const enhancingElementId = useRenderQuality((s) => s.enhancingElementId);
  const isEnhancing = enhancingElementId === element.id;

  const {
    onDragStart,
    dragBoundFunc,
    onDragMove,
    onDragEnd,
  } = useKonvaDrag({
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
        easing: Konva.Easings.BackEaseOut
      });
    }
  }, [elementRef, element.opacity]);

  const { filters, filterProps } = React.useMemo(() => {
    const res = getKonvaFilters({
      filter: element.filter,
      brightness: element.brightness,
      contrast: element.contrast,
      saturation: element.saturation
    });
    if (element.blur && element.blur > 0) {
      res.filters.push(Konva.Filters.Blur);
    }
    return { filters: res.filters, filterProps: res };
  }, [element.filter, element.brightness, element.contrast, element.saturation, element.blur]);

  const imageNodeRef = React.useRef<import("@/hooks/use-filter-cache").CacheableKonvaNode | null>(null);
  // الأبعاد خارج المفتاح عمداً: التحجيم يعيد الكاش المكلف في كل إطار،
  // ويُعاد بناؤه صراحةً بعد استقرار التحويل (onTransformEnd) والتصدير يرفع الدقة بنفسه
  const filterKey = `${element.filter}_${element.brightness}_${element.contrast}_${element.saturation}_${element.blur}`;
  const hasFilters = filters.length > 0;

  const recacheFilters = useFilterCache({ nodeRef: imageNodeRef, image: displayImage as HTMLImageElement, hasFilters, canvasWidth, filterKey });

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
  const nodeW = element.width * canvasWidth;
  const nodeH = element.height * canvasHeight;

  // ✨ لمسة الرفع أثناء السحب: ظل ناعم يجعل الصورة «ترتفع» عن الورقة
  // (سلوك Figma/Fluent). يُفعَّل فقط للصور بلا ظل مخصص من المستخدم
  // كي لا نطغى على تنسيقه، وينطفئ فور انتهاء السحب.
  const [isDragLifted, setIsDragLifted] = React.useState(false);
  const hasCustomShadow = (element.shadowOpacity ?? 0) > 0;
  const liftActive = isDragLifted && !hasCustomShadow;

  // 🧷 شبكة أمان: Konva لا يُطلق أحداث dragend إن انتهى السحب خارج النافذة أو
  // فقد التطبيق التركيز — بدون هذا كان ظل الرفع يبقى عالقاً على الصورة.
  React.useEffect(() => {
    if (!isDragLifted) return;
    const clear = () => setIsDragLifted(false);
    window.addEventListener("pointerup", clear);
    window.addEventListener("pointercancel", clear);
    window.addEventListener("blur", clear);
    return () => {
      window.removeEventListener("pointerup", clear);
      window.removeEventListener("pointercancel", clear);
      window.removeEventListener("blur", clear);
    };
  }, [isDragLifted]);

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
      draggable={!element.locked && isSelected}
      onDragStart={() => {
        setIsDragLifted(true);
        onDragStart();
      }}
      dragBoundFunc={dragBoundFunc}
      onDragMove={onDragMove}
      onDragEnd={(e) => {
        setIsDragLifted(false);
        onDragEnd(e);
      }}
      onMouseDown={onMouseDown}
      onTouchStart={onTouchStart}
      onClick={onClick}
      onTap={onTap}
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
        {element.bgColor && element.bgColor !== "transparent" && (
          <Rect
            x={0}
            y={0}
            width={nodeW}
            height={nodeH}
            fill={element.bgColor}
            cornerRadius={element.cornerRadius || 0}
            listening={false}
          />
        )}
        <KonvaImage
          ref={imageNodeRef as unknown as React.RefObject<Konva.Image>}
          image={(displayImage ?? image) as unknown as HTMLImageElement}
          x={0}
          y={0}
          width={nodeW}
          height={nodeH}
          perfectDrawEnabled={false}
          // 🚀 أثناء السحب: ظل الرفع مخفّض (blur 8 بدل 16) والظل المخصص
          // مُطفأ تماماً — تمريرة الضبابية خارج الشاشة هي أغلى عملية/إطار.
          shadowColor={liftActive ? "rgba(15, 23, 42, 0.45)" : element.shadowColor}
          shadowBlur={isDragLifted ? (liftActive ? 8 : 0) : (element.shadowBlur || 0)}
          shadowOffsetX={liftActive ? 0 : element.shadowOffsetX || 0}
          shadowOffsetY={liftActive ? 4 : element.shadowOffsetY || 0}
          shadowOpacity={isDragLifted ? (liftActive ? 0.25 : 0) : (element.shadowOpacity ?? 0)}
          cornerRadius={element.cornerRadius || 0}
          filters={filters}
          brightness={filterProps.brightness}
          contrast={filterProps.contrast}
          blurRadius={element.blur || 0}
          saturation={filterProps.saturation}
          sepiaRatio={filterProps.sepiaRatio}
        />
        {isEnhancing && (
          <MagicAiScanner
            targetNodeRef={elementRef}
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
  );
}, propsAreEqual);
