import { IMAGE_FILTERS } from "@/lib/templates";

export function SheetPreview({
  cols,
  rows,
  count,
  imageWidthMM,
  imageHeightMM,
  gapMM,
  zoom,
  showCutLines,
  elements,
  slots,
  mode,
  canvasWidth,
  canvasHeight,
  backgroundColor,
}: any) {
  if (mode === "collage") {
    const gap = gapMM;
    return (
      <div className="relative w-full h-full">
        {slots.map((slot: any) => (
          <div
            key={slot.id}
            className="absolute overflow-hidden"
            style={{
              left: `${slot.x * 100}%`,
              top: `${slot.y * 100}%`,
              width: `${slot.w * 100}%`,
              height: `${slot.h * 100}%`,
              padding: `${(gap / 2) * 2 * zoom}px`,
              boxSizing: "border-box",
              border: showCutLines ? "0.5px dashed #f87171" : "none",
            }}
          >
            {slot.imageSrc ? (
              <img
                src={slot.imageSrc}
                alt=""
                className="w-full h-full object-cover"
                style={{
                  filter: buildFilter(slot),
                }}
              />
            ) : (
              <div className="w-full h-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-[9px] text-muted-foreground">
                خلية فارغة
              </div>
            )}
          </div>
        ))}
      </div>
    );
  }

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
          backgroundColor,
          boxShadow: showCutLines ? "0 0 0 0.5px #94a3b8" : "none",
        }}
      >
        <CanvasThumbnail
          elements={elements}
          slots={slots}
          mode={mode}
          canvasWidth={canvasWidth}
          canvasHeight={canvasHeight}
          backgroundColor={backgroundColor}
        />
      </div>
    );
  }

  const cutLines = [];
  if (showCutLines) {
    for (let i = 0; i <= cols; i++) {
      const x = i * (imageWidthMM + gapMM) * 2 * zoom - gapMM * zoom;
      cutLines.push(
        <div
          key={`v-${i}`}
          className="absolute border-l border-dashed border-red-400"
          style={{ left: x, top: 0, bottom: 0 }}
        />
      );
    }
    for (let i = 0; i <= rows; i++) {
      const y = i * (imageHeightMM + gapMM) * 2 * zoom - gapMM * zoom;
      cutLines.push(
        <div
          key={`h-${i}`}
          className="absolute border-t border-dashed border-red-400"
          style={{ top: y, left: 0, right: 0 }}
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

export function CanvasThumbnail({
  elements,
  slots,
  mode,
  canvasWidth,
  canvasHeight,
  backgroundColor,
}: any) {
  const firstImage =
    mode === "single"
      ? elements.find((e: any) => e.type === "image")
      : slots.find((s: any) => s.imageSrc);

  if (firstImage) {
    const src = firstImage.imageSrc;
    return (
      <img
        src={src}
        alt=""
        className="w-full h-full object-cover"
        style={{
          filter: buildFilter(firstImage),
        }}
      />
    );
  }
  return (
    <div className="w-full h-full flex items-center justify-center text-[9px] text-muted-foreground">
      معاينة
    </div>
  );
}

export function buildFilter(el: any): string {
  const parts: string[] = [];
  const filterDef = IMAGE_FILTERS.find((f) => f.id === el?.filter);
  if (filterDef && filterDef.css) parts.push(filterDef.css);
  if (el?.brightness && el.brightness !== 100) parts.push(`brightness(${el.brightness}%)`);
  if (el?.contrast && el.contrast !== 100) parts.push(`contrast(${el.contrast}%)`);
  if (el?.saturation && el.saturation !== 100) parts.push(`saturate(${el.saturation}%)`);
  return parts.join(" ");
}
