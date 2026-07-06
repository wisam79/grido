import { useEditorStore, CanvasElement, CanvasSlot } from "@/lib/editor-store";
import { buildCSSFilter } from "@/lib/utils";

import { useShallow } from "zustand/react/shallow";

// منطقة الطباعة - تُعرض فقط عند الطباعة عبر CSS print media
export function PrintArea() {
  const {
    template,
    canvasWidth,
    canvasHeight,
    elements,
    slots,
    mode,
    backgroundColor,
    printSettings,
  } = useEditorStore(useShallow((state) => ({
    template: state.template,
    canvasWidth: state.canvasWidth,
    canvasHeight: state.canvasHeight,
    elements: state.elements,
    slots: state.slots,
    mode: state.mode,
    backgroundColor: state.backgroundColor,
    printSettings: state.printSettings,
  })));

  const firstImage =
    mode === "single"
      ? elements.find((e) => e.type === "image")
      : slots.find((s) => s.imageSrc);

  if (!firstImage && elements.length === 0) return null;

  const dpi = template ? template.dpi : printSettings.dpi;
  const imageWidthMM = template ? template.widthMM : Math.round((canvasWidth / dpi) * 25.4);
  const imageHeightMM = template ? template.heightMM : Math.round((canvasHeight / dpi) * 25.4);

  const availableWidthMM =
    printSettings.orientation === "portrait"
      ? printSettings.paperWidthMM - 2 * printSettings.marginMM
      : printSettings.paperHeightMM - 2 * printSettings.marginMM;
  const availableHeightMM =
    printSettings.orientation === "portrait"
      ? printSettings.paperHeightMM - 2 * printSettings.marginMM
      : printSettings.paperWidthMM - 2 * printSettings.marginMM;

  const gapMM = printSettings.gapMM || 2;
  const cols = Math.max(1, Math.floor(availableWidthMM / (imageWidthMM + gapMM)));
  const actualCount = Math.min(
    printSettings.copiesPerSheet,
    cols * Math.floor(availableHeightMM / (imageHeightMM + gapMM))
  );

  const paperW =
    printSettings.orientation === "portrait"
      ? printSettings.paperWidthMM
      : printSettings.paperHeightMM;
  const paperH =
    printSettings.orientation === "portrait"
      ? printSettings.paperHeightMM
      : printSettings.paperWidthMM;

  return (
    <div
      id="print-area"
      style={{
        position: "absolute",
        left: 0,
        top: 0,
        width: `${paperW}mm`,
        height: `${paperH}mm`,
        padding: `${printSettings.marginMM}mm`,
        backgroundColor: "white",
        display: "grid",
        gridTemplateColumns: `repeat(${cols}, 1fr)`,
        gridAutoRows: `${imageHeightMM}mm`,
        gap: `${gapMM}mm`,
        alignContent: "start",
      }}
    >
      {Array.from({ length: actualCount }, (_, i) => (
        <div
          key={i}
          style={{
            width: `${imageWidthMM}mm`,
            height: `${imageHeightMM}mm`,
            position: "relative",
            backgroundColor,
            overflow: "hidden",
            border: printSettings.showCutLines
              ? "0.2mm dashed #999"
              : "none",
            boxSizing: "border-box",
          }}
        >
          <PrintableCanvas
            elements={elements}
            slots={slots}
            mode={mode}
            backgroundColor={backgroundColor}
          />
        </div>
      ))}
    </div>
  );
}

interface PrintableCanvasProps {
  elements: CanvasElement[];
  slots: CanvasSlot[];
  mode: "single" | "collage";
  backgroundColor: string;
}

// نسخة طباعة من الكانفس - تعرض العناصر بدقة كاملة
function PrintableCanvas({
  elements,
  slots,
  mode,
  backgroundColor,
}: PrintableCanvasProps) {
  const { printSettings } = useEditorStore();
  const paperW =
    printSettings.orientation === "portrait"
      ? printSettings.paperWidthMM
      : printSettings.paperHeightMM;
  const paperH =
    printSettings.orientation === "portrait"
      ? printSettings.paperHeightMM
      : printSettings.paperWidthMM;

  if (mode === "collage") {
    const margin = printSettings.marginMM || 5;
    const gap = printSettings.gapMM || 2;
    return (
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          width: `${paperW}mm`,
          height: `${paperH}mm`,
          padding: `${margin}mm`,
          backgroundColor,
          boxSizing: "border-box",
        }}
      >
        <div style={{ position: "relative", width: "100%", height: "100%" }}>
          {slots.map((slot: any) => (
            <div
              key={slot.id}
              style={{
                position: "absolute",
                left: `${slot.x * 100}%`,
                top: `${slot.y * 100}%`,
                width: `${slot.w * 100}%`,
                height: `${slot.h * 100}%`,
                padding: `${gap / 2}mm`,
                boxSizing: "border-box",
                overflow: "hidden",
              }}
            >
              {slot.imageSrc && (
                <img
                  src={slot.imageSrc}
                  alt=""
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    filter: buildCSSFilter(slot),
                  }}
                />
              )}
            </div>
          ))}
        </div>
      </div>
    );
  }

  // وضع الصورة الواحدة - عرض العناصر مرتبة حسب zIndex
  const sorted = [...elements].sort((a: any, b: any) => a.zIndex - b.zIndex);
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        backgroundColor,
      }}
    >
      {sorted.map((el: any) => (
        <div
          key={el.id}
          style={{
            position: "absolute",
            left: `${el.x * 100}%`,
            top: `${el.y * 100}%`,
            width: `${el.width * 100}%`,
            height: `${el.height * 100}%`,
            transform: `rotate(${el.rotation}deg)`,
            opacity: el.opacity,
          }}
        >
          {el.type === "image" && el.imageSrc && (
            <img
              src={el.imageSrc}
              alt=""
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                filter: buildCSSFilter(el),
              }}
            />
          )}
          {el.type === "text" && (
            <div
              style={{
                width: "100%",
                height: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent:
                  el.textAlign === "center"
                    ? "center"
                    : el.textAlign === "left"
                    ? "flex-start"
                    : "flex-end",
                color: el.color,
                fontSize: `${el.fontSize}px`,
                fontWeight: el.fontWeight,
                textAlign: el.textAlign,
                direction: "rtl",
                lineHeight: 1.2,
                padding: "0 4px",
              }}
            >
              {el.text}
            </div>
          )}
          {el.type === "shape" && (
            <svg
              width="100%"
              height="100%"
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
            >
              {el.shape === "rect" && (
                <rect
                  x="0"
                  y="0"
                  width="100"
                  height="100"
                  rx={el.radius}
                  fill={el.fill}
                  stroke={el.strokeWidth ? el.stroke : "none"}
                  strokeWidth={el.strokeWidth}
                />
              )}
              {el.shape === "ellipse" && (
                <ellipse
                  cx="50"
                  cy="50"
                  rx="50"
                  ry="50"
                  fill={el.fill}
                  stroke={el.strokeWidth ? el.stroke : "none"}
                  strokeWidth={el.strokeWidth}
                />
              )}
              {el.shape === "line" && (
                <line
                  x1="0"
                  y1="50"
                  x2="100"
                  y2="50"
                  stroke={el.fill}
                  strokeWidth={Math.max(1, el.strokeWidth || 4)}
                />
              )}
              {el.shape === "star" && (
                <polygon
                  points="50,5 61,38 95,38 67,58 78,91 50,70 22,91 33,58 5,38 39,38"
                  fill={el.fill}
                  stroke={el.strokeWidth ? el.stroke : "none"}
                  strokeWidth={el.strokeWidth}
                />
              )}
            </svg>
          )}
        </div>
      ))}
    </div>
  );
}
