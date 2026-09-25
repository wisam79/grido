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
 *
 * أفعال الملاءمة الثلاثة تعيّن الوضع + تُرجع مضاعف الزوم إلى 100%:
 * قاعدة الملاءمة هي التي تعيّن الحجم الأساسي، والزوم مضاعف فوقها، فإرجاعه
 * إلى 100% يجعل الملاءمة معناها الحقيقي «الورقة كاملة/عرض كامل».
 *
 * ملاحظة على الأسماء: `fitZoomStore` تعني «ملاءمة الكل» (الورقة كاملة على
 * الشاشة) وهي نفس دلالة Ctrl+0 القديمة، لكنها الآن تعمل بلا الحدث
 * `grido:fit-canvas-to-screen` — فتغيير وضع الملاءمة يمرّ من متجر واحد.
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

/** ملاءمة الكل — الورقة كاملة داخل منطقة العمل (بلا تمرير) */
export function fitZoomStore(): void {
  const { setCanvasFitMode, setCanvasZoom } = useEditorStore.getState();
  setCanvasFitMode("height");
  setCanvasZoom(ZOOM_DEFAULT);
}

/** ملاءمة العرض — الورقة تملأ عرض منطقة العمل ويُمرَّر الباقي رأسياً */
export function fitWidthZoomStore(): void {
  const { setCanvasFitMode, setCanvasZoom } = useEditorStore.getState();
  setCanvasFitMode("width");
  setCanvasZoom(ZOOM_DEFAULT);
}

/** ملاءمة تلقائية — يختار المحرر الوضع الأنسب لهندسة النافذة */
export function autoFitZoomStore(): void {
  const { setCanvasFitMode, setCanvasZoom } = useEditorStore.getState();
  setCanvasFitMode("auto");
  setCanvasZoom(ZOOM_DEFAULT);
}

/**
 * الحجم الفعلي 1:1 — بكسل الورقة = بكسل CSS، فالورقة الأعرض من النافذة
 * تُمرَّر أفقياً ورأسياً (الوحيد الذي يُنتج عصا تمرير أفقية عند 100%).
 */
export function actualSizeZoomStore(): void {
  const { setCanvasFitMode, setCanvasZoom } = useEditorStore.getState();
  setCanvasFitMode("actual");
  setCanvasZoom(ZOOM_DEFAULT);
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
    fitWidthZoom: fitWidthZoomStore,
    autoFitZoom: autoFitZoomStore,
    actualSizeZoom: actualSizeZoomStore,
    canZoomIn: canZoomIn(zoom),
    canZoomOut: canZoomOut(zoom),
    isDefaultZoom: isDefaultZoom(zoom),
  };
}
