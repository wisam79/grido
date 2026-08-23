import { useState } from "react";
import { buildCSSFilter, cn } from "@/lib/utils";
import { calculatePrintCutLines } from "@/lib/print/cut-lines-utils";
import { computeBlockPosition, computeSlotRectMM } from "@/lib/print/print-layout-math";
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
  slots?: any[];
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

  const collageSlotTransform = (slot: any, rect: { wMM: number; hMM: number }) => {
    const zoomVal = slot.zoom && slot.zoom > 0 ? slot.zoom : 1;
    const normRot = (((slot.rotation || 0) % 360) + 360) % 360;
    const isQuarter = normRot === 90 || normRot === 270;

    if (isQuarter) {
      // الخلية المدوّرة 90/270: صندوق الصورة يتبدل (h×w) مع قلب النسبة ليطابق
      // تبديل Konva isRotated90or270 ? height/width : width/height — عندها
      // object-cover يقتص بنفس نافذة المحرر ويجب إبقاء الصندوق متمركزاً في الخلية
      const boxWpct = (rect.hMM / Math.max(0.01, rect.wMM)) * 100;
      const boxHpct = (rect.wMM / Math.max(0.01, rect.hMM)) * 100;
      return {
        width: `${boxWpct}%`,
        height: `${boxHpct}%`,
        transform: `scale(${zoomVal}) scaleX(${slot.flipX ? -1 : 1}) scaleY(${slot.flipY ? -1 : 1}) rotate(${slot.rotation || 0}deg) translate(-50%, -50%)`,
        stylePos: { left: "50%", top: "50%" },
      };
    }

    // السحب (dragX/dragY) بنقاط بكسل المصدر → إزاحة (%) من نافذة القصّ؛
    // المحصورة داخل منطقة القصّ cover (بدون فراغات) — نفس صيغة drawSlotImage
    const nat = naturalSizes[slot.id];
    let panX = 0;
    let panY = 0;
    if (nat && nat.w > 0 && nat.h > 0 && zoomVal > 1) {
      const imgAspect = nat.w / nat.h;
      const boxAspect = rect.wMM / Math.max(0.01, rect.hMM);
      const coverW = imgAspect > boxAspect ? nat.h * boxAspect : nat.w;
      const coverH = imgAspect > boxAspect ? nat.h : nat.w / boxAspect;
      const sw = coverW / zoomVal;
      const sh = coverH / zoomVal;
      const maxDragX = Math.max(0, (nat.w - sw) / 2);
      const maxDragY = Math.max(0, (nat.h - sh) / 2);
      const dx = Math.max(-maxDragX, Math.min(maxDragX, slot.dragX || 0));
      const dy = Math.max(-maxDragY, Math.min(maxDragY, slot.dragY || 0));
      panX = (100 * zoomVal * dx) / coverW;
      panY = (100 * zoomVal * dy) / coverH;
    }

    return {
      transform: `translate(${panX}%, ${panY}%) scale(${zoomVal}) scaleX(${slot.flipX ? -1 : 1}) scaleY(${slot.flipY ? -1 : 1}) rotate(${slot.rotation || 0}deg)`,
      stylePos: undefined,
    };
  };

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
      : cutLineStyle === "solid" || cutLineStyle === "cropmarks"
      ? "border-solid"
      : "border-dashed";

  const cutLineElements = rawCutLines.map((line, idx) => {
    const isVertical = Math.abs(line.x1 - line.x2) < 0.01;
    // حماية إحداثيات الحواف الخارجي من التقطع أو الاختفاء بسبب overflow:hidden
    const leftVal =
      line.x1 <= 0.5
        ? "1px"
        : line.x1 >= paperWidthMM - 0.5
        ? "calc(100% - 1.5px)"
        : `${(line.x1 / Math.max(1, paperWidthMM)) * 100}%`;

    const topVal =
      line.y1 <= 0.5
        ? "1px"
        : line.y1 >= paperHeightMM - 0.5
        ? "calc(100% - 2.5px)"
        : `${(line.y1 / Math.max(1, paperHeightMM)) * 100}%`;

    if (isVertical) {
      const heightPct = ((line.y2 - line.y1) / Math.max(1, paperHeightMM)) * 100;
      return (
        <div
          key={`v-cut-${idx}`}
          className={cn(
            "absolute border-l border-slate-400/70 pointer-events-none z-20",
            borderStyleClass
          )}
          style={{
            left: leftVal,
            top: topVal,
            height: `${heightPct}%`,
          }}
        />
      );
    } else {
      const widthPct = ((line.x2 - line.x1) / Math.max(1, paperWidthMM)) * 100;
      const isBottomEnd = line.isBottomEnd;
      return (
        <div
          key={`h-cut-${idx}`}
          className={cn(
            "absolute pointer-events-none z-20",
            isBottomEnd
              ? "border-t-2 border-blue-500/80 border-dashed"
              : cn("border-t border-slate-400/70", borderStyleClass)
          )}
          style={{
            top: topVal,
            left: leftVal,
            width: `${widthPct}%`,
          }}
        />
      );
    }
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
          (() => {
            return Array.from({ length: count }).map((_, i) => {
              const block = computeBlockPosition(i, grid);

              return slots.map((slot, index) => {
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

                // الزوايا والإطار بنفس تحويل Go: قيمة كانفس بكسل → مم (نسبة
                // imageWidthMM/canvasWidth) → بكسل شاشة عبر sf — تطابق WYSIWYG
                const pxPerCanvasPx = imageWidthMM / Math.max(1, canvasWidth);
                const radiusPx = collageRadius * pxPerCanvasPx * sf;
                const borderPx = collageStrokeWidth * pxPerCanvasPx * sf;

                const slotTransform = collageSlotTransform(slot, { wMM: rect.wMM, hMM: rect.hMM });

                return (
                  <div
                    key={`copy-${i}-slot-${index}`}
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
                    className="w-full h-full object-cover"
                    style={{
                      ...(slotTransform.stylePos || { left: 0, top: 0 }),
                      width: slotTransform.width,
                      height: slotTransform.height,
                      transform: slotTransform.transform,
                      filter: buildCSSFilter(slot),
                    }}
                    onLoad={(e) => {
                      const el = e.currentTarget;
                      const w = el.naturalWidth;
                      const h = el.naturalHeight;
                      if (w > 0 && h > 0) {
                        setNaturalSizes((prev) => ({ ...prev, [slot.id]: { w, h } }));
                      }
                    }}
                  />
                </div>
              );
            });
          });
        })()
        ) : previewImageSrc ? (
          <img
            src={previewImageSrc}
            alt=""
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-slate-100 dark:bg-slate-800 animate-pulse flex items-center justify-center text-xs text-muted-foreground font-cairo">
            جاري تحميل المعاينة ...
          </div>
        )}
        {cutLineElements}
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
          <div className="w-full h-full bg-slate-100 dark:bg-slate-800 animate-pulse flex items-center justify-center text-[10px] text-muted-foreground font-cairo">
            جاري التحميل ...
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
    </div>
  );
}

