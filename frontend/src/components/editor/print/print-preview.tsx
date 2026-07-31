import { buildCSSFilter } from "@/lib/utils";

interface SheetPreviewProps {
  cols: number;
  rows: number;
  count: number;
  imageWidthMM: number;
  imageHeightMM: number;
  gapMM: number;
  zoom: number;
  showCutLines: boolean;
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
          slots.map((slot, index) => {
            if (!slot.imageSrc) return null;
            
            const scaleX = 100;
            const scaleY = 100;

            const marginX_pct = hasPhysical ? 0 : (collageMargin / canvasWidth) * 100;
            const marginY_pct = hasPhysical ? 0 : (collageMargin / canvasHeight) * 100;
            const gapX_pct = hasPhysical ? 0 : (collageGap / canvasWidth) * 100;
            const gapY_pct = hasPhysical ? 0 : (collageGap / canvasHeight) * 100;
            
            const availW_pct = 100 - 2 * marginX_pct;
            const availH_pct = 100 - 2 * marginY_pct;
            
            const left_pct = marginX_pct + slot.x * availW_pct + gapX_pct / 2;
            const top_pct = marginY_pct + slot.y * availH_pct + gapY_pct / 2;
            const width_pct = slot.w * availW_pct - gapX_pct;
            const height_pct = slot.h * availH_pct - gapY_pct;

            return (
              <div 
                key={index} 
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
                  src={slot.imageSrc}
                  alt=""
                  className="w-full h-full object-cover"
                  style={{
                    transform: `scale(${slot.zoom || 1}) scaleX(${slot.flipX ? -1 : 1}) scaleY(${slot.flipY ? -1 : 1}) rotate(${slot.rotation || 0}deg)`,
                    filter: buildCSSFilter(slot),
                  }}
                />
              </div>
            );
          })
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
      </div>
    );
  }

  const actualRows = Math.ceil(count / cols);
  const gridWidth = cols * imageWidthMM + Math.max(0, cols - 1) * gapMM;
  const gridHeight = actualRows * imageHeightMM + Math.max(0, actualRows - 1) * gapMM;
  const availableWidthMM = paperWidthMM - 2 * marginMM;
  const availableHeightMM = paperHeightMM - 2 * marginMM;
  const offsetX = Math.max(0, availableWidthMM - gridWidth) / 2;
  const offsetY = Math.max(0, availableHeightMM - gridHeight) / 2;

  // الوضع الحر (Free mode): تكرار لقطة الكانفس الكاملة على الورقة
  const items = [];
  for (let i = 0; i < count; i++) {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x = (offsetX + col * (imageWidthMM + gapMM)) * scaleFactor * zoom;
    const y = (offsetY + row * (imageHeightMM + gapMM)) * scaleFactor * zoom;
    const w = imageWidthMM * scaleFactor * zoom;
    const h = imageHeightMM * scaleFactor * zoom;

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
          boxShadow: showCutLines ? "0 0 0 0.5px rgba(248, 113, 113, 0.4)" : "none",
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

  const cutLines = [];
  if (showCutLines) {
    const marginPx = marginMM * scaleFactor * zoom;

    for (let i = 1; i < cols; i++) {
      const x = (offsetX + i * (imageWidthMM + gapMM)) * scaleFactor * zoom - (gapMM * scaleFactor * zoom) / 2;
      cutLines.push(
        <div
          key={`v-${i}`}
          className="absolute border-l border-dashed border-red-400/60 pointer-events-none"
          style={{ 
            left: x, 
            top: -marginPx, 
            bottom: -marginPx 
          }}
        />
      );
    }
    for (let i = 1; i < rows; i++) {
      const y = (offsetY + i * (imageHeightMM + gapMM)) * scaleFactor * zoom - (gapMM * scaleFactor * zoom) / 2;
      cutLines.push(
        <div
          key={`h-${i}`}
          className="absolute border-t border-dashed border-red-400/60 pointer-events-none"
          style={{ 
            top: y, 
            left: -marginPx, 
            right: -marginPx 
          }}
        />
      );
    }
  }

  return (
    <div className="relative w-full h-full">
      {items}
      {cutLines}
    </div>
  );
}
