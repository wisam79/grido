import { buildCSSFilter, cn } from "@/lib/utils";
import { calculatePrintCutLines } from "@/lib/cut-lines-utils";

interface SheetPreviewProps {
  cols: number;
  rows: number;
  count: number;
  imageWidthMM: number;
  imageHeightMM: number;
  gapMM: number;
  zoom: number;
  showCutLines: boolean;
  showEndCutLine?: boolean;
  mode: "single" | "collage";
  backgroundColor: string;
  previewImageSrc: string;
  marginMM?: number;
  paperWidthMM?: number;
  paperHeightMM?: number;
  slots?: any[];
  collageGap?: number;
  collageMargin?: number;
  canvasWidth?: number;
  canvasHeight?: number;
  hasPhysical?: boolean;
  scaleFactor?: number;
}

export function SheetPreview({
  cols,
  rows,
  count,
  imageWidthMM,
  imageHeightMM,
  gapMM,
  zoom,
  showCutLines,
  showEndCutLine = true,
  mode,
  backgroundColor,
  previewImageSrc,
  marginMM = 0,
  paperWidthMM = 210,
  paperHeightMM = 297,
  slots,
  collageGap = 0,
  collageMargin = 0,
  canvasWidth = 2480,
  canvasHeight = 3508,
  hasPhysical = false,
  scaleFactor = 1.5,
}: SheetPreviewProps) {
  const sf = scaleFactor * zoom;
  const availableWidthMM = paperWidthMM - 2 * marginMM;
  const availableHeightMM = paperHeightMM - 2 * marginMM;

  const rawCutLines = showCutLines
    ? calculatePrintCutLines({
        mode,
        cols,
        rows,
        actualCopies: count,
        imageWidthMM,
        imageHeightMM,
        gapMM,
        effectiveMarginMM: marginMM,
        availableWidthMM,
        availableHeightMM,
        paperWidth: paperWidthMM,
        paperHeight: paperHeightMM,
        showEndCutLine,
        slots,
        collageMargin,
        collageGap,
        canvasWidth,
        canvasHeight,
        hasPhysical,
      })
    : [];

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
          className="absolute border-l border-dashed border-slate-400/70 pointer-events-none z-20"
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
              : "border-t border-dashed border-slate-400/70"
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
            const firstFilled = slots.find((s) => s.imageSrc);
            return Array.from({ length: count }).map((_, i) => {
              const col = i % cols;
              const row = Math.floor(i / cols);
              const blockXMM = marginMM + Math.max(0, availableWidthMM - (cols * imageWidthMM + Math.max(0, cols - 1) * gapMM)) / 2 + col * (imageWidthMM + gapMM);
              const blockYMM = marginMM + Math.max(0, availableHeightMM - (Math.ceil(count / cols) * imageHeightMM + Math.max(0, Math.ceil(count / cols) - 1) * gapMM)) / 2 + row * (imageHeightMM + gapMM);

              return slots.map((slot, index) => {
                const activeSrc = slot.imageSrc || firstFilled?.imageSrc;
                if (!activeSrc) return null;

                const marginX_pct = hasPhysical ? 0 : (collageMargin / canvasWidth);
                const marginY_pct = hasPhysical ? 0 : (collageMargin / canvasHeight);
                const gapX_pct = hasPhysical ? 0 : (collageGap / canvasWidth);
                const gapY_pct = hasPhysical ? 0 : (collageGap / canvasHeight);
                
                const availW_pct = 1 - 2 * marginX_pct;
                const availH_pct = 1 - 2 * marginY_pct;
                
                const slotLeftMM = blockXMM + (marginX_pct + slot.x * availW_pct + gapX_pct / 2) * imageWidthMM;
                const slotTopMM = blockYMM + (marginY_pct + slot.y * availH_pct + gapY_pct / 2) * imageHeightMM;
                const slotWidthMM = (slot.w * availW_pct - gapX_pct) * imageWidthMM;
                const slotHeightMM = (slot.h * availH_pct - gapY_pct) * imageHeightMM;

                const left_pct = (slotLeftMM / Math.max(1, paperWidthMM)) * 100;
                const top_pct = (slotTopMM / Math.max(1, paperHeightMM)) * 100;
                const width_pct = (slotWidthMM / Math.max(1, paperWidthMM)) * 100;
                const height_pct = (slotHeightMM / Math.max(1, paperHeightMM)) * 100;

                return (
                  <div 
                    key={`copy-${i}-slot-${index}`} 
                    className="absolute overflow-hidden shadow-xs"
                    style={{
                      left: `${left_pct}%`,
                      top: `${top_pct}%`,
                      width: `${width_pct}%`,
                      height: `${height_pct}%`,
                      borderRadius: "2px",
                    }}
                  >
                    <img
                      src={activeSrc}
                    alt=""
                    className="w-full h-full object-cover"
                    style={{
                      transform: `scale(${slot.zoom || 1}) scaleX(${slot.flipX ? -1 : 1}) scaleY(${slot.flipY ? -1 : 1}) rotate(${slot.rotation || 0}deg)`,
                      filter: buildCSSFilter(slot),
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
            جاري تحميل المعاينة...
          </div>
        )}
        {cutLineElements}
      </div>
    );
  }

  const actualRows = Math.ceil(count / cols);
  const gridWidth = cols * imageWidthMM + Math.max(0, cols - 1) * gapMM;
  const gridHeight = actualRows * imageHeightMM + Math.max(0, actualRows - 1) * gapMM;
  const offsetX = marginMM + Math.max(0, availableWidthMM - gridWidth) / 2;
  const offsetY = marginMM + Math.max(0, availableHeightMM - gridHeight) / 2;

  // الوضع الحر (Free mode): تكرار لقطة الكانفس الكاملة على الورقة
  const items = [];
  for (let i = 0; i < count; i++) {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x = (offsetX + col * (imageWidthMM + gapMM)) * sf;
    const y = (offsetY + row * (imageHeightMM + gapMM)) * sf;
    const w = imageWidthMM * sf;
    const h = imageHeightMM * sf;

    items.push(
      <div
        key={i}
        className="absolute overflow-hidden"
        style={{
          left: x,
          top: y,
          width: w,
          height: h,
          backgroundColor: backgroundColor || "#FFFFFF",
          boxSizing: "border-box",
        }}
      >
        {previewImageSrc ? (
          <img
            src={previewImageSrc}
            alt=""
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-slate-100 dark:bg-slate-800 animate-pulse flex items-center justify-center text-[10px] text-muted-foreground font-cairo">
            تحميل...
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="relative w-full h-full">
      {items}
      {cutLineElements}
    </div>
  );
}

