import { CanvasElement } from "@/lib/editor-store";

export function getFillProps(element: CanvasElement, w: number, h: number) {
  if (element.fillType === "linear") {
    const start = element.fillLinearGradientStartPoint || { x: 0, y: 0 };
    const end = element.fillLinearGradientEndPoint || { x: 1, y: 1 };
    return {
      fillLinearGradientStartPoint: { x: start.x * w, y: start.y * h },
      fillLinearGradientEndPoint: { x: end.x * w, y: end.y * h },
      fillLinearGradientColorStops: element.fillLinearGradientColorStops || [0, "#3b82f6", 1, "#8b5cf6"],
    };
  }
  if (element.fillType === "radial") {
    const start = element.fillRadialGradientStartPoint || { x: 0.5, y: 0.5 };
    const end = element.fillRadialGradientEndPoint || { x: 0.5, y: 0.5 };
    const rStart = element.fillRadialGradientStartRadius !== undefined ? element.fillRadialGradientStartRadius : 0;
    const rEnd = element.fillRadialGradientEndRadius !== undefined ? element.fillRadialGradientEndRadius : 0.5;
    return {
      fillRadialGradientStartPoint: { x: start.x * w, y: start.y * h },
      fillRadialGradientStartRadius: rStart * Math.max(w, h),
      fillRadialGradientEndPoint: { x: end.x * w, y: end.y * h },
      fillRadialGradientEndRadius: rEnd * Math.max(w, h),
      fillRadialGradientColorStops: element.fillRadialGradientColorStops || [0, "#3b82f6", 1, "#8b5cf6"],
    };
  }
  if (element.type === "text") {
    return { fill: element.color || "#000000" };
  }
  if (element.type === "shape") {
    return { fill: element.fill || "transparent" };
  }
  return { fill: "transparent" };
}
