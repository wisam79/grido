import { useEditorStore } from "@/lib/editor-store";
import { useState, useEffect } from "react";
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

  if (!firstImage && elements.length === 0) return null;

  const dpi = template ? template.dpi : printSettings.dpi;
  const originalImageWidthMM = template ? template.widthMM : Math.round((canvasWidth / dpi) * 25.4);
  const originalImageHeightMM = template ? template.heightMM : Math.round((canvasHeight / dpi) * 25.4);

  const availableWidthMM =
    printSettings.orientation === "portrait"
      ? printSettings.paperWidthMM - 2 * printSettings.marginMM
      : printSettings.paperHeightMM - 2 * printSettings.marginMM;
  const availableHeightMM =
    printSettings.orientation === "portrait"
      ? printSettings.paperHeightMM - 2 * printSettings.marginMM
      : printSettings.paperWidthMM - 2 * printSettings.marginMM;

  const gapMM = printSettings.gapMM || 2;

  // حساب الأبعاد بعد تطبيق الملاءمة إذا كانت مفعلة وكان عدد النسخ 1 في الوضع الحر
  const fitToPage = printSettings.fitToPage !== false;
  const shouldFit = fitToPage && mode === "single" && printSettings.copiesPerSheet === 1;

  let imageWidthMM = originalImageWidthMM;
  let imageHeightMM = originalImageHeightMM;

  if (shouldFit) {
    const scaleX = availableWidthMM / originalImageWidthMM;
    const scaleY = availableHeightMM / originalImageHeightMM;
    const scale = Math.min(scaleX, scaleY);
    imageWidthMM = Math.round(originalImageWidthMM * scale);
    imageHeightMM = Math.round(originalImageHeightMM * scale);
  }

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
