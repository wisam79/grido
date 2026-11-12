import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';

const UI_ZOOM_STORAGE_KEY = 'grido_ui_zoom_scale_v1';
const MIN_ZOOM = 0.85; // 85%
const MAX_ZOOM = 2; // 200% — الحد الأدنى المطلوب لمستخدمي ضعف البصر
const ZOOM_STEP = 0.05; // 5% لكل خطوة

function readInitialScale(): number {
  if (typeof window === 'undefined') return 1;
  try {
    const saved = localStorage.getItem(UI_ZOOM_STORAGE_KEY);
    if (saved) {
      const parsed = parseFloat(saved);
      if (Number.isFinite(parsed) && parsed >= MIN_ZOOM && parsed <= MAX_ZOOM) {
        return Math.round(parsed * 100) / 100;
      }
    }
  } catch {
    // fallback
  }
  return 1;
}

function syncZoomToDom(scale: number) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  if (Math.abs(scale - 1) < 0.01) {
    root.style.removeProperty('--grido-ui-zoom');
    root.style.removeProperty('zoom');
  } else {
    root.style.setProperty('--grido-ui-zoom', scale.toString());
    (root.style as CSSStyleDeclaration & { zoom: string }).zoom = scale.toString();
  }
}

let currentScale = readInitialScale();
const subscribers = new Set<(scale: number) => void>();

// مزامنة مبكرة مع الـ DOM عند التحميل الأولي
if (typeof window !== 'undefined') {
  syncZoomToDom(currentScale);
}

function updateScale(nextScale: number, showToast = true) {
  const clamped = Math.round(Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, nextScale)) * 100) / 100;
  currentScale = clamped;
  syncZoomToDom(clamped);
  try {
    localStorage.setItem(UI_ZOOM_STORAGE_KEY, clamped.toString());
  } catch {
    // تجاهل أخطاء التخزين
  }
  subscribers.forEach((fn) => fn(clamped));

  if (showToast) {
    const percent = Math.round(clamped * 100);
    const label = percent === 100 ? 'حجم الواجهة: 100% (الافتراضي)' : `حجم الواجهة: ${percent}%`;
    toast.info(label, {
      id: 'grido-ui-zoom-feedback',
      duration: 1200,
    });
  }
}

export function useUiZoom() {
  const [zoomScale, setZoomScaleState] = useState<number>(currentScale);

  useEffect(() => {
    subscribers.add(setZoomScaleState);
    return () => {
      subscribers.delete(setZoomScaleState);
    };
  }, []);

  const zoomIn = useCallback(() => {
    updateScale(currentScale + ZOOM_STEP);
  }, []);

  const zoomOut = useCallback(() => {
    updateScale(currentScale - ZOOM_STEP);
  }, []);

  const resetZoom = useCallback(() => {
    updateScale(1);
  }, []);

  const setZoom = useCallback((nextScale: number) => {
    updateScale(nextScale);
  }, []);

  return {
    zoomScale,
    setZoom,
    zoomIn,
    zoomOut,
    resetZoom,
  };
}
