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
        {previewImageSrc ? (
          <img
            src={previewImageSrc}
            alt=""
            className="w-full h-full"
            style={{
              objectFit: "fill",
            }}
          />
        ) : (
          <div className="w-full h-full bg-slate-100 dark:bg-slate-800 animate-pulse flex items-center justify-center text-xs text-muted-foreground font-cairo">
            جاري تحميل المعاينة...
          </div>
        )}
      </div>
    );
  }

  // الوضع الحر (Free mode): تكرار لقطة الكانفس الكاملة على الورقة
  const items = [];
  for (let i = 0; i < count; i++) {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x = col * (imageWidthMM + gapMM) * 2 * zoom;
    const y = row * (imageHeightMM + gapMM) * 2 * zoom;
    const w = imageWidthMM * 2 * zoom;
    const h = imageHeightMM * 2 * zoom;

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
            className="w-full h-full"
            style={{
              objectFit: "fill",
            }}
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
    const marginPx = marginMM * 2 * zoom;

    for (let i = 1; i < cols; i++) {
      const x = i * (imageWidthMM + gapMM) * 2 * zoom - gapMM * zoom;
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
      const y = i * (imageHeightMM + gapMM) * 2 * zoom - gapMM * zoom;
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
