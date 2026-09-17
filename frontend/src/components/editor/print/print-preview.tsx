import { memo, useCallback, useState, type ReactElement } from "react";
import { buildCSSFilter, cn } from "@/lib/utils";
import { calculatePrintCutLines } from "@/lib/print/cut-lines-utils";
import { computeBlockPosition, computeSlotRectMM } from "@/lib/print/print-layout-math";
import type { CanvasSlot } from "@/lib/store/types";
import type { SheetGrid } from "@/lib/print/print-layout-math";

interface SheetPreviewProps {
  grid: SheetGrid;
  count: number;
  imageWidthMM: number;
  imageHeightMM: number;
  gapMM: number;
  zoom: number;
  showCutLines: boolean;
  showEndCutLine?: boolean;
  cutLineStyle?: "dashed" | "dotted" | "solid" | "cropmarks";
  mode: "single" | "collage";
  backgroundColor: string;
  previewImageSrc: string;
  paperWidthMM?: number;
  paperHeightMM?: number;
  slots?: CanvasSlot[];
  collageGap?: number;
  collageMargin?: number;
  collageRadius?: number;
  collageStrokeWidth?: number;
  collageStrokeColor?: string;
  canvasWidth?: number;
  canvasHeight?: number;
  hasPhysical?: boolean;
  scaleFactor?: number;
}

interface CollageSlotPreviewProps {
  slot: CanvasSlot;
  block: { xMM: number; yMM: number };
  imageWidthMM: number;
  imageHeightMM: number;
  paperWidthMM: number;
  paperHeightMM: number;
  canvasWidth: number;
  canvasHeight: number;
  hasPhysical: boolean;
  collageMargin: number;
  collageGap: number;
  collageRadius: number;
  collageStrokeWidth: number;
  collageStrokeColor: string;
  sf: number;
  naturalSize?: { w: number; h: number };
  onNaturalSize: (slotId: string, w: number, h: number) => void;
}

const CollageSlotPreview = memo(function CollageSlotPreview({
  slot,
  block,
  imageWidthMM,
  imageHeightMM,
  paperWidthMM,
  paperHeightMM,
  canvasWidth,
  canvasHeight,
  hasPhysical,
  collageMargin,
  collageGap,
  collageRadius,
  collageStrokeWidth,
  collageStrokeColor,
  sf,
  naturalSize,
  onNaturalSize,
}: CollageSlotPreviewProps) {
  const activeSrc = slot.imageSrc;
  if (!activeSrc) return null;

  const marginX_pct = hasPhysical ? 0 : (collageMargin / canvasWidth);
  const marginY_pct = hasPhysical ? 0 : (collageMargin / canvasHeight);
  const gapX_pct = hasPhysical ? 0 : (collageGap / canvasWidth);
  const gapY_pct = hasPhysical ? 0 : (collageGap / canvasHeight);

  const rect = computeSlotRectMM(
    block,
    { x: slot.x, y: slot.y, w: slot.w, h: slot.h },
    { widthMM: imageWidthMM, heightMM: imageHeightMM },
    { marginXMM: marginX_pct * imageWidthMM, marginYMM: marginY_pct * imageHeightMM },
    { gapXMM: gapX_pct * imageWidthMM, gapYMM: gapY_pct * imageHeightMM }
  );

  const left_pct = (rect.xMM / Math.max(1, paperWidthMM)) * 100;
  const top_pct = (rect.yMM / Math.max(1, paperHeightMM)) * 100;
  const width_pct = (rect.wMM / Math.max(1, paperWidthMM)) * 100;
  const height_pct = (rect.hMM / Math.max(1, paperHeightMM)) * 100;

  const pxPerCanvasPx = imageWidthMM / Math.max(1, canvasWidth);
  const radiusPx = collageRadius * pxPerCanvasPx * sf;
  const borderPx = collageStrokeWidth * pxPerCanvasPx * sf;

  const zoomVal = slot.zoom && slot.zoom > 0 ? slot.zoom : 1;
  const normRot = (((slot.rotation || 0) % 360) + 360) % 360;
  const isQuarter = normRot === 90 || normRot === 270;

  let imgWidth: string | undefined;
  let imgHeight: string | undefined;
  let imgPos: { position: "absolute"; left: string | number; top: string | number };
  let imgTransform: string;

  if (isQuarter) {
    const boxWpct = (rect.hMM / Math.max(0.01, rect.wMM)) * 100;
    const boxHpct = (rect.wMM / Math.max(0.01, rect.hMM)) * 100;
    imgWidth = `${boxWpct}%`;
    imgHeight = `${boxHpct}%`;
    imgPos = {
      position: "absolute",
      left: `${(100 - boxWpct) / 2}%`,
      top: `${(100 - boxHpct) / 2}%`,
    };
    imgTransform = `scale(${zoomVal}) scaleX(${slot.flipX ? -1 : 1}) scaleY(${slot.flipY ? -1 : 1}) rotate(${slot.rotation || 0}deg)`;
  } else {
    let panX = 0;
    let panY = 0;
    if (naturalSize && naturalSize.w > 0 && naturalSize.h > 0 && zoomVal > 1) {
      const imgAspect = naturalSize.w / naturalSize.h;
      const boxAspect = rect.wMM / Math.max(0.01, rect.hMM);
      const coverW = imgAspect > boxAspect ? naturalSize.h * boxAspect : naturalSize.w;
      const coverH = imgAspect > boxAspect ? naturalSize.h : naturalSize.w / boxAspect;
      const sw = coverW / zoomVal;
      const sh = coverH / zoomVal;
      const maxDragX = Math.max(0, (naturalSize.w - sw) / 2);
      const maxDragY = Math.max(0, (naturalSize.h - sh) / 2);
      const dx = Math.max(-maxDragX, Math.min(maxDragX, slot.dragX || 0));
      const dy = Math.max(-maxDragY, Math.min(maxDragY, slot.dragY || 0));
      panX = (100 * zoomVal * dx) / coverW;
      panY = (100 * zoomVal * dy) / coverH;
    }
    imgPos = { position: "absolute" as const, left: 0, top: 0 };
    imgTransform = `translate(${panX}%, ${panY}%) scale(${zoomVal}) scaleX(${slot.flipX ? -1 : 1}) scaleY(${slot.flipY ? -1 : 1}) rotate(${slot.rotation || 0}deg)`;
  }

  return (
    <div
      className="absolute overflow-hidden shadow-xs"
      style={{
        left: `${left_pct}%`,
        top: `${top_pct}%`,
        width: `${width_pct}%`,
        height: `${height_pct}%`,
        borderRadius: radiusPx > 0 ? `${radiusPx}px` : undefined,
        border: borderPx > 0 ? `${borderPx}px solid ${collageStrokeColor}` : undefined,
        backgroundColor: slot.bgColor && slot.bgColor !== "transparent" ? slot.bgColor : undefined,
      }}
    >
      <img
        src={activeSrc}
        alt=""
        className={cn("w-full h-full object-cover", imgPos.position === "absolute" && "absolute")}
        style={{
          ...imgPos,
          width: imgWidth,
          height: imgHeight,
          transform: imgTransform,
          filter: buildCSSFilter(slot),
        }}
        onLoad={(e) => {
          const el = e.currentTarget;
          if (el.naturalWidth > 0 && el.naturalHeight > 0) {
            onNaturalSize(slot.id, el.naturalWidth, el.naturalHeight);
          }
        }}
      />
    </div>
  );
});

export function SheetPreview({
  grid,
  count,
  imageWidthMM,
  imageHeightMM,
  gapMM,
  zoom,
  showCutLines,
  showEndCutLine = true,
  cutLineStyle = "dashed",
  mode,
  backgroundColor,
  previewImageSrc,
  paperWidthMM = 210,
  paperHeightMM = 297,
  slots,
  collageGap = 0,
  collageMargin = 0,
  collageRadius = 0,
  collageStrokeWidth = 0,
  collageStrokeColor = "#000000",
  canvasWidth = 2480,
  canvasHeight = 3508,
  hasPhysical = false,
  scaleFactor = 1.5,
}: SheetPreviewProps) {
  const sf = scaleFactor * zoom;
  // الأبعاد الطبيعية للصور بعد تحميلها (naturalWidth/Height) — تُستخدم لتحويل
  // سحب dragX/dragY شبكة البكسل إلى إزاحة نقل (%) مطابقة لمنطق Konva/التصدير
  const [naturalSizes, setNaturalSizes] = useState<Record<string, { w: number; h: number }>>({});

  const handleNaturalSize = useCallback((slotId: string, w: number, h: number) => {
    setNaturalSizes((prev) => {
      const existing = prev[slotId];
      if (existing && existing.w === w && existing.h === h) {
        return prev;
      }
      return { ...prev, [slotId]: { w, h } };
    });
  }, []);

  const rawCutLines = showCutLines
    ? calculatePrintCutLines({
        mode,
        actualCopies: count,
        imageWidthMM,
        imageHeightMM,
        gapMM,
        paperWidth: paperWidthMM,
        paperHeight: paperHeightMM,
        showEndCutLine,
        cutLineStyle: cutLineStyle || "dashed",
        slots,
        collageMargin,
        collageGap,
        canvasWidth,
        canvasHeight,
        hasPhysical,
        grid,
      })
    : [];

  const borderStyleClass =
    cutLineStyle === "dotted"
      ? "border-dotted"
      : cutLineStyle === "solid"
      ? "border-solid"
      : "border-dashed";

  const isCropMarks = cutLineStyle === "cropmarks";

  const cropMarkElements = isCropMarks
    ? (() => {
        const xs = rawCutLines.flatMap((l) => [l.x1, l.x2]);
        const ys = rawCutLines.flatMap((l) => [l.y1, l.y2]);
        if (xs.length === 0 || ys.length === 0) return [] as ReactElement[];

        const minX = Math.min(...xs);
        const maxX = Math.max(...xs);
        const minY = Math.min(...ys);
        const maxY = Math.max(...ys);
        const len = Math.max(2, Math.min(paperWidthMM, paperHeightMM) * 0.04);

        const xPct = (v: number) => `${(v / Math.max(1, paperWidthMM)) * 100}%`;
        const yPct = (v: number) => `${(v / Math.max(1, paperHeightMM)) * 100}%`;
        const wPct = `${(len / Math.max(1, paperWidthMM)) * 100}%`;
        const hPct = `${(len / Math.max(1, paperHeightMM)) * 100}%`;

        const corners = [
          { x: minX, y: minY, hx: 1, hy: 1 },
          { x: maxX, y: minY, hx: -1, hy: 1 },
          { x: minX, y: maxY, hx: 1, hy: -1 },
          { x: maxX, y: maxY, hx: -1, hy: -1 },
        ];

        return corners.flatMap((c, i) => [
          <div
            key={`cm-h-${i}`}
            className="absolute border-t border-canvas-collage-cut pointer-events-none z-20"
            style={{
              left: xPct(c.hx > 0 ? c.x : c.x - len),
              top: yPct(c.y),
              width: wPct,
            }}
          />,
          <div
            key={`cm-v-${i}`}
            className="absolute border-l border-canvas-collage-cut pointer-events-none z-20"
            style={{
              left: xPct(c.x),
              top: yPct(c.hy > 0 ? c.y : c.y - len),
              height: hPct,
            }}
          />,
        ]);
      })()
    : [];

  const cutLineElements = isCropMarks ? [] : rawCutLines.map((line, idx) => {
    const isVertical = Math.abs(line.x1 - line.x2) < 0.01;
    const leftPct = (line.x1 / Math.max(1, paperWidthMM)) * 100;
    const topPct = (line.y1 / Math.max(1, paperHeightMM)) * 100;

    if (isVertical) {
      const heightPct = ((line.y2 - line.y1) / Math.max(1, paperHeightMM)) * 100;
      return (
        <div
          key={`v-cut-${idx}`}
          className={cn(
            "absolute border-l border-canvas-collage-cut pointer-events-none z-20",
            borderStyleClass
          )}
          style={{
            left: `${leftPct}%`,
            top: `${topPct}%`,
            height: `${heightPct}%`,
            transform: "translateX(-50%)",
          }}
        />
      );
    }

    const widthPct = ((line.x2 - line.x1) / Math.max(1, paperWidthMM)) * 100;
    const isBottomEnd = line.isBottomEnd;
    return (
      <div
        key={`h-cut-${idx}`}
        className={cn(
          "absolute pointer-events-none z-20",
          isBottomEnd
            ? "border-t-2 border-canvas-collage-cut border-dashed"
            : cn("border-t border-canvas-collage-cut", borderStyleClass)
        )}
        style={{
          top: `${topPct}%`,
          left: `${leftPct}%`,
          width: `${widthPct}%`,
          transform: "translateY(-50%)",
        }}
      />
    );
  });

  if (mode === "collage") {
    return (
      <div 
        className="w-full h-full relative overflow-hidden"
        style={{
          backgroundColor: backgroundColor || "#FFFFFF",
          boxSizing: "border-box",
        }}
      >
        {slots && slots.length > 0 ? (
          Array.from({ length: count }).map((_, i) => {
            const block = computeBlockPosition(i, grid);

            return slots.map((slot, index) => (
              <CollageSlotPreview
                key={`copy-${i}-slot-${index}`}
                slot={slot}
                block={block}
                imageWidthMM={imageWidthMM}
                imageHeightMM={imageHeightMM}
                paperWidthMM={paperWidthMM}
                paperHeightMM={paperHeightMM}
                canvasWidth={canvasWidth}
                canvasHeight={canvasHeight}
                hasPhysical={hasPhysical}
                collageMargin={collageMargin}
                collageGap={collageGap}
                collageRadius={collageRadius}
                collageStrokeWidth={collageStrokeWidth}
                collageStrokeColor={collageStrokeColor}
                sf={sf}
                naturalSize={naturalSizes[slot.id]}
                onNaturalSize={handleNaturalSize}
              />
            ));
          })
        ) : previewImageSrc ? (
          <img
            src={previewImageSrc}
            alt=""
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-muted animate-pulse flex items-center justify-center text-xs text-muted-foreground font-cairo">
            جاري تحميل المعاينة ...
          </div>
        )}
        {cutLineElements}
        {cropMarkElements}
      </div>
    );
  }

  const items = [];
  for (let i = 0; i < count; i++) {
    const block = computeBlockPosition(i, grid);
    const left_pct = (block.xMM / Math.max(1, paperWidthMM)) * 100;
    const top_pct = (block.yMM / Math.max(1, paperHeightMM)) * 100;
    const width_pct = (imageWidthMM / Math.max(1, paperWidthMM)) * 100;
    const height_pct = (imageHeightMM / Math.max(1, paperHeightMM)) * 100;

    items.push(
      <div
        key={i}
        className="absolute overflow-hidden shadow-xs"
        style={{
          left: `${left_pct}%`,
          top: `${top_pct}%`,
          width: `${width_pct}%`,
          height: `${height_pct}%`,
          backgroundColor: backgroundColor || "#FFFFFF",
          boxSizing: "border-box",
        }}
      >
        {previewImageSrc ? (
          <img
            src={previewImageSrc}
            alt=""
            className="w-full h-full object-contain"
          />
        ) : (
          <div className="w-full h-full bg-muted animate-pulse flex items-center justify-center text-micro text-muted-foreground font-cairo">
            جاري تجهيز المعاينة ...
          </div>
        )}
      </div>
    );
  }

  return (
    <div 
      className="relative w-full h-full overflow-hidden"
      style={{
        backgroundColor: backgroundColor || "#FFFFFF",
        boxSizing: "border-box",
      }}
    >
      {items}
      {cutLineElements}
      {cropMarkElements}
    </div>
  );
}

