import { useEditorStore } from "@/lib/editor-store";
import { useShallow } from "zustand/react/shallow";

/**
 * lib/store/selectors — محددات Zustand المشتركة (كان `useShallow((state)=>...`
 * مكرراً 41 مرة، واشتراك canvas-viewport-deck وحده 16 حقلاً).
 * كل محدد معرّف مرة واحدة ويُعاد استخدامه — نفس الحقول، نفس سلوك التصيير.
 */

/** سياق الكانفس المشترك بين حوارات التصدير/الطباعة وشرائط العرض. */
export function useCanvasContext() {
  return useEditorStore(
    useShallow((s) => ({
      template: s.template,
      canvasWidth: s.canvasWidth,
      canvasHeight: s.canvasHeight,
      mode: s.mode,
      printSettings: s.printSettings,
    }))
  );
}

/** عناصر التحكم بالزوم (شريط العرض + قائمة سطح المكتب). */
export function useZoomControls() {
  return useEditorStore(
    useShallow((s) => ({
      canvasZoom: s.canvasZoom,
      setCanvasZoom: s.setCanvasZoom,
    }))
  );
}

/** أعلام عرض الكولاج (خطوط القص) — اشتراك صغير مشترك. */
export function useCollageViewFlags() {
  return useEditorStore(
    useShallow((s) => ({
      collageShowCutLines: s.collageShowCutLines,
      setCollageShowCutLines: s.setCollageShowCutLines,
    }))
  );
}

/** عناصر التحكم بالشبكة والمساطر والأدلة. */
export function useGridControls() {
  return useEditorStore(
    useShallow((s) => ({
      showGrid: s.showGrid,
      setShowGrid: s.setShowGrid,
      snapToGrid: s.snapToGrid,
      setSnapToGrid: s.setSnapToGrid,
      showRuler: s.showRuler,
      setShowRuler: s.setShowRuler,
      showUserGuides: s.showUserGuides,
      setShowUserGuides: s.setShowUserGuides,
      rulerUnit: s.rulerUnit,
      setRulerUnit: s.setRulerUnit,
    }))
  );
}
