import { useEditorStore } from "@/lib/editor-store";
import { useShallow } from "zustand/react/shallow";

import { usePrintLayout } from "@/hooks/use-print-layout";

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
    printImageSrc,
  } = useEditorStore(useShallow((state) => ({
    template: state.template,
    canvasWidth: state.canvasWidth,
    canvasHeight: state.canvasHeight,
    elements: state.elements,
    slots: state.slots,
    mode: state.mode,
    backgroundColor: state.backgroundColor,
    printSettings: state.printSettings,
    printImageSrc: state.printImageSrc,
  })));

  const firstImage =
    mode === "single"
      ? elements.find((e) => e.type === "image")
      : slots.find((s) => s.imageSrc);

  const {
    imageWidthMM,
    imageHeightMM,
    gapMM,
    actualCopies: actualCount,
    paperWidth: paperW,
    paperHeight: paperH,
    availableWidthMM,
    availableHeightMM,
    cols,
  } = usePrintLayout({
    template,
    printSettings,
    canvasWidth,
    canvasHeight,
    mode,
  });

  if (!firstImage && elements.length === 0) return null;

  if (mode === "collage") {
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
          boxSizing: "border-box",
        }}
      >
        <div
          style={{
            width: `${availableWidthMM}mm`,
            height: `${availableHeightMM}mm`,
            position: "relative",
            backgroundColor: "white",
            overflow: "hidden",
            boxSizing: "border-box",
          }}
        >
          {printImageSrc ? (
            <img
              src={printImageSrc}
              alt=""
              style={{
                width: "100%",
                height: "100%",
                objectFit: "fill",
              }}
            />
          ) : (
            <div className="w-full h-full bg-slate-100 animate-pulse" />
          )}
        </div>
      </div>
    );
  }

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
            backgroundColor: "white",
            overflow: "hidden",
            border: printSettings.showCutLines
              ? "0.2mm dashed #999"
              : "none",
            boxSizing: "border-box",
          }}
        >
          {printImageSrc ? (
            <img
              src={printImageSrc}
              alt=""
              style={{
                width: "100%",
                height: "100%",
                objectFit: "fill",
              }}
            />
          ) : (
            <div className="w-full h-full bg-slate-100 animate-pulse" />
          )}
        </div>
      ))}
    </div>
  );
}
