import { IMAGE_FILTERS } from "@/lib/templates";
import { useEditorStore } from "@/lib/editor-store";

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
  const storeState = useEditorStore.getState();

  if (mode === "collage") {
    const collageMargin = storeState.collageMargin ?? 0;
    const collageGap = storeState.collageGap ?? 0;
    const collageRadius = storeState.collageRadius ?? 0;
    const collageStrokeWidth = storeState.collageStrokeWidth ?? 0;
    const collageStrokeColor = storeState.collageStrokeColor ?? "#000000";

    return (
      <div 
        className="relative w-full h-full"
        style={{
          backgroundColor: backgroundColor || "#FFFFFF",
          padding: `${collageMargin * 2 * zoom}px`,
          boxSizing: "border-box",
        }}
      >
        <div className="relative w-full h-full">
          {slots.map((slot: any) => {
            const left = `${slot.x * 100}%`;
            const top = `${slot.y * 100}%`;
            const width = `${slot.w * 100}%`;
            const height = `${slot.h * 100}%`;

            return (
              <div
                key={slot.id}
                className="absolute overflow-hidden"
                style={{
                  left,
                  top,
                  width,
                  height,
                  padding: `${(collageGap / 2) * 2 * zoom}px`,
                  boxSizing: "border-box",
                }}
              >
                <div
                  className="w-full h-full relative overflow-hidden"
                  style={{
                    borderRadius: `${collageRadius * 2 * zoom}px`,
                    border: collageStrokeWidth > 0 
                      ? `${collageStrokeWidth * 2 * zoom}px solid ${collageStrokeColor}` 
                      : showCutLines ? "0.5px dashed #f87171" : "none",
                    boxSizing: "border-box",
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
              </div>
            );
          })}
        </div>
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
          zoom={zoom * (w / canvasWidth) * 0.5} // Scale factor to fit inside thumbnail
        />
      </div>
    );
  }

  const cutLines = [];
  if (showCutLines) {
    for (let i = 0; i <= cols; i++) {
      const x = i * (imageWidthMM + gapMM) * 2 * zoom - (gapMM * zoom);
      cutLines.push(
        <div
          key={`v-${i}`}
          className="absolute border-l border-dashed border-red-400"
          style={{ left: x, top: 0, bottom: 0 }}
        />
      );
    }
    for (let i = 0; i <= rows; i++) {
      const y = i * (imageHeightMM + gapMM) * 2 * zoom - (gapMM * zoom);
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
  backgroundColor,
}: any) {
  // تصيير حقيقي مبسط لكافة العناصر داخل المعاينة بدلاً من الصورة الأولى فقط
  const sorted = [...(elements || [])]
    .filter((el) => el.visible !== false)
    .sort((a, b) => a.zIndex - b.zIndex);

  return (
    <div
      className="w-full h-full relative overflow-hidden"
      style={{ backgroundColor: backgroundColor || "#FFFFFF" }}
    >
      {sorted.map((el) => {
        const style: React.CSSProperties = {
          position: "absolute",
          left: `${el.x * 100}%`,
          top: `${el.y * 100}%`,
          width: `${el.width * 100}%`,
          height: `${el.height * 100}%`,
          transform: `rotate(${el.rotation || 0}deg)`,
          opacity: el.opacity ?? 1,
          zIndex: el.zIndex,
          boxSizing: "border-box",
        };

        if (el.type === "image" && el.imageSrc) {
          return (
            <img
              key={el.id}
              src={el.imageSrc}
              alt=""
              className="absolute object-cover"
              style={{
                ...style,
                filter: buildFilter(el),
              }}
            />
          );
        } else if (el.type === "text") {
          return (
            <div
              key={el.id}
              style={{
                ...style,
                color: el.color || "#000000",
                fontSize: `calc(${el.fontSize || 32}px * 0.08)`, // تصغير الخط ليتناسب مع المعاينة
                fontWeight: el.fontWeight || "bold",
                whiteSpace: "pre-wrap",
                fontFamily: "Tajawal, Cairo, sans-serif",
                textAlign: el.textAlign as any,
                lineHeight: 1.2,
                display: "flex",
                alignItems: "center",
                justifyContent: el.textAlign === "left" ? "flex-start" : el.textAlign === "right" ? "flex-end" : "center",
              }}
            >
              {el.text}
            </div>
          );
        } else if (el.type === "shape") {
          let borderRadius = "0";
          if (el.shape === "ellipse") borderRadius = "50%";
          else if (el.shape === "rect") borderRadius = `${(el.radius || 0) * 0.1}px`;

          return (
            <div
              key={el.id}
              style={{
                ...style,
                backgroundColor: el.fill || "#6366f1",
                border: el.strokeWidth ? `${el.strokeWidth * 0.1}px solid ${el.stroke || "#000000"}` : "none",
                borderRadius,
              }}
            />
          );
        }
        return null;
      })}
    </div>
  );
}

function buildFilter(el: any): string {
  const parts: string[] = [];
  const filterDef = IMAGE_FILTERS.find((f) => f.id === el?.filter);
  if (filterDef && filterDef.css) parts.push(filterDef.css);
  if (el?.brightness && el.brightness !== 100) parts.push(`brightness(${el.brightness}%)`);
  if (el?.contrast && el.contrast !== 100) parts.push(`contrast(${el.contrast}%)`);
  if (el?.saturation && el.saturation !== 100) parts.push(`saturate(${el.saturation}%)`);
  return parts.join(" ");
}
