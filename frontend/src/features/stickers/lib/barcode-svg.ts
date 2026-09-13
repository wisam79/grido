import React from "react";
import JsBarcode from "jsbarcode";
import { QRCodeSVG } from "qrcode.react";
import { renderToStaticMarkup } from "react-dom/server";

export function generateBarcodeInnerSvg(
  value: string,
  format: string = "CODE128",
  options?: { lineColor?: string; background?: string; height?: number; width?: number }
): string {
  const reqHeight = options?.height || 60;
  const reqWidth = options?.width ? `${options.width}` : "100%";
  if (typeof document === "undefined") {
    return `<svg width="${reqWidth}" height="${reqHeight}" viewBox="0 0 200 ${reqHeight}" preserveAspectRatio="xMidYMid meet"><rect x="0" y="0" width="200" height="${reqHeight}" fill="${options?.lineColor || "#000000"}" /></svg>`;
  }

  try {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    JsBarcode(svg, value || "12345678", {
      format: format,
      lineColor: options?.lineColor || "#000000",
      background: options?.background || "transparent",
      displayValue: false,
      margin: 0,
      width: 2,
      height: reqHeight,
    });
    const svgWidth = parseFloat(svg.getAttribute("width") || "200") || 200;
    return `<svg width="${reqWidth}" height="${reqHeight}" viewBox="0 0 ${svgWidth} ${reqHeight}" preserveAspectRatio="xMidYMid meet">${svg.innerHTML}</svg>`;
  } catch {
    // If format validation fails (e.g. invalid EAN checksum while typing), return fallback simulated bars centered
    return `<svg width="${reqWidth}" height="${reqHeight}" viewBox="0 0 200 ${reqHeight}" preserveAspectRatio="xMidYMid meet">
      <g fill="${options?.lineColor || "#000000"}">
        <rect x="10" y="0" width="4" height="${reqHeight}"/>
        <rect x="20" y="0" width="8" height="${reqHeight}"/>
        <rect x="34" y="0" width="4" height="${reqHeight}"/>
        <rect x="44" y="0" width="12" height="${reqHeight}"/>
        <rect x="62" y="0" width="6" height="${reqHeight}"/>
        <rect x="74" y="0" width="14" height="${reqHeight}"/>
        <rect x="94" y="0" width="4" height="${reqHeight}"/>
        <rect x="104" y="0" width="16" height="${reqHeight}"/>
        <rect x="126" y="0" width="6" height="${reqHeight}"/>
        <rect x="138" y="0" width="10" height="${reqHeight}"/>
        <rect x="154" y="0" width="14" height="${reqHeight}"/>
        <rect x="174" y="0" width="4" height="${reqHeight}"/>
      </g>
    </svg>`;
  }
}

/**
 * Generates an authentic, fully-scannable vector QR Code SVG string.
 */
export function generateQrCodeInnerSvg(
  value: string,
  size: number = 200,
  options?: { fgColor?: string; bgColor?: string }
): string {
  try {
    const qrElement = React.createElement(QRCodeSVG, {
      value: value || "https://grido.app",
      size: size,
      fgColor: options?.fgColor || "#000000",
      bgColor: options?.bgColor || "transparent",
      level: "M",
    });
    return renderToStaticMarkup(qrElement);
  } catch (err) {
    console.error("Failed to generate QR Code SVG:", err);
    return `<rect width="${size}" height="${size}" fill="${options?.fgColor || "#000000"}" />`;
  }
}
