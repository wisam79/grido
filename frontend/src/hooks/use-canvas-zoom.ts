import { useEditorStore } from "@/lib/editor-store";
import {
  ZOOM_DEFAULT,
  canZoomIn,
  canZoomOut,
  isDefaultZoom,
  stepZoom,
} from "@/lib/canvas/zoom";

/**
 * use-canvas-zoom — أفعال الزوم الموحدة (كانت متناثرة نصاً متطابقاً في
 * canvas-viewport-deck + desktop-menu-bar + use-keyboard-shortcuts +
 * workspace-tools). دوال الـ store تعمل خارج المكونات (اختصارات/أوامر)،
 * والـ hook للمكونات مع تسمية النسبة وحالة الحدود للتعطيل.
 */

export function zoomInStore(): void {
  useEditorStore.getState().setCanvasZoom((z) => stepZoom(z, 1));
}

export function zoomOutStore(): void {
  useEditorStore.getState().setCanvasZoom((z) => stepZoom(z, -1));
}

export function resetZoomStore(): void {
  useEditorStore.getState().setCanvasZoom(ZOOM_DEFAULT);
}

export function fitZoomStore(): void {
  window.dispatchEvent(new CustomEvent("grido:fit-canvas-to-screen"));
}

export function useCanvasZoom() {
  const zoom = useEditorStore((s) => s.canvasZoom);
  return {
    zoom,
    percentLabel: `${Math.round(zoom * 100)}%`,
    zoomIn: zoomInStore,
    zoomOut: zoomOutStore,
    resetZoom: resetZoomStore,
    fitZoom: fitZoomStore,
    canZoomIn: canZoomIn(zoom),
    canZoomOut: canZoomOut(zoom),
    isDefaultZoom: isDefaultZoom(zoom),
  };
}
