import { useCallback, useEffect, useRef, useState } from "react";
import {
  Point,
  DetectedDocument,
  DocumentAspectType,
} from "../core";
import {
  docScannerPrimary, docScannerHover, docScannerDark,
  docScannerInner, docScannerLoupe,
} from "@/lib/canvas/canvas-colors";

function isPointInQuad(p: Point, quad: Point[]): boolean {
  if (!quad || quad.length < 4) return false;
  let inside = false;
  for (let i = 0, j = quad.length - 1; i < quad.length; j = i++) {
    const xi = quad[i].x, yi = quad[i].y;
    const xj = quad[j].x, yj = quad[j].y;
    const denom = yj - yi;
    if (denom === 0) continue;
    const intersect = ((yi > p.y) !== (yj > p.y)) && (p.x < ((xj - xi) * (p.y - yi)) / denom + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

export interface ScannerCanvasApi {
  containerRef: React.RefObject<HTMLDivElement>;
  canvasRef: React.RefObject<HTMLCanvasElement>;
  loupeCanvasRef: React.RefObject<HTMLCanvasElement>;
  activeCorner: number | null;
  setActiveCorner: React.Dispatch<React.SetStateAction<number | null>>;
  isHoveringCorner: number | null;
  setIsHoveringCorner: React.Dispatch<React.SetStateAction<number | null>>;
  loupePos: { x: number; y: number } | null;
  setLoupePos: React.Dispatch<React.SetStateAction<{ x: number; y: number } | null>>;
  displayScaleRef: React.RefObject<number>;
  drawRafRef: React.RefObject<number | null>;
  loupeRafRef: React.RefObject<number | null>;
  drawCanvas: () => void;
  handlePointerDown: (e: React.PointerEvent<HTMLCanvasElement>) => void;
  handlePointerMove: (e: React.PointerEvent<HTMLCanvasElement>) => void;
  handlePointerUp: (e: React.PointerEvent<HTMLCanvasElement>) => void;
}

/**
 * 🧭 واجهة الرسم الكانفاسية للماسح: رسم الصورة والمضلعات والدبابيس بدقة
 * HiDPI، المكبرة الزجاجية، وسحب الأركان بالمؤشر — كل ذلك معدّ بالـ rAF.
 * كانت هذه الكتلة مضمّنة في Dialog (أكبر كتلة فيه).
 */
export function useScannerCanvasRender(
  open: boolean,
  isPreviewMode: boolean,
  corners: Point[],
  detectedDocs: DetectedDocument[],
  activeDocIndex: number,
  imgRef: React.RefObject<HTMLImageElement | null>,
  imgSize: { w: number; h: number },
  onCornersChange: (corners: Point[]) => void,
  onAspectChange: (aspect: DocumentAspectType) => void,
  selectDocument: (index: number) => void
): ScannerCanvasApi {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const loupeCanvasRef = useRef<HTMLCanvasElement>(null);

  const [activeCorner, setActiveCorner] = useState<number | null>(null);
  const [isHoveringCorner, setIsHoveringCorner] = useState<number | null>(null);
  const [loupePos, setLoupePos] = useState<{ x: number; y: number } | null>(null);

  const displayScaleRef = useRef<number>(1);
  const drawRafRef = useRef<number | null>(null);
  const loupeRafRef = useRef<number | null>(null);

  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img) return;

    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;

    const container = containerRef.current;
    if (!container) return;

    const maxW = Math.max(container.clientWidth - 16, 200);
    const maxH = Math.max(container.clientHeight - 16, 200);

    const scale = Math.min(maxW / img.naturalWidth, maxH / img.naturalHeight, 1);
    if (scale <= 0) return;
    displayScaleRef.current = scale;

    const displayW = Math.max(1, Math.round(img.naturalWidth * scale));
    const displayH = Math.max(1, Math.round(img.naturalHeight * scale));

    // دعم دقة الشاشات العالية HiDPI / Retina
    const dpr = typeof window !== "undefined" ? Math.min(window.devicePixelRatio || 1, 2.5) : 1;
    const pixelW = Math.round(displayW * dpr);
    const pixelH = Math.round(displayH * dpr);

    if (canvas.width !== pixelW || canvas.height !== pixelH) {
      canvas.width = pixelW;
      canvas.height = pixelH;
    }
    canvas.style.width = `${displayW}px`;
    canvas.style.height = `${displayH}px`;

    ctx.save();
    ctx.scale(dpr, dpr);

    // رسم الصورة الأساسية
    ctx.drawImage(img, 0, 0, displayW, displayH);

    if (isPreviewMode) {
      ctx.restore();
      return;
    }

    // رسم المضلعات المكتشفة الأخرى غير النشطة (Inactive Document Polygons)
    if (detectedDocs.length > 1) {
      detectedDocs.forEach((doc, idx) => {
        if (idx === activeDocIndex || !doc.corners || doc.corners.length !== 4) return;
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(doc.corners[0].x * scale, doc.corners[0].y * scale);
        ctx.lineTo(doc.corners[1].x * scale, doc.corners[1].y * scale);
        ctx.lineTo(doc.corners[2].x * scale, doc.corners[2].y * scale);
        ctx.lineTo(doc.corners[3].x * scale, doc.corners[3].y * scale);
        ctx.closePath();

        ctx.fillStyle = "rgba(16, 185, 129, 0.12)";
        ctx.fill();
        ctx.strokeStyle = "rgba(16, 185, 129, 0.85)";
        ctx.lineWidth = 1.5;
        ctx.setLineDash([5, 4]);
        ctx.stroke();

        // رسم شارة رقم المستند في المنتصف
        const cx =
          ((doc.corners[0].x + doc.corners[1].x + doc.corners[2].x + doc.corners[3].x) / 4) * scale;
        const cy =
          ((doc.corners[0].y + doc.corners[1].y + doc.corners[2].y + doc.corners[3].y) / 4) * scale;
        ctx.fillStyle = "rgba(16, 185, 129, 0.95)";
        ctx.beginPath();
        ctx.arc(cx, cy, 13, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 11px system-ui";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(`${idx + 1}`, cx, cy);
        ctx.restore();
      });
    }

    if (corners.length !== 4) {
      ctx.restore();
      return;
    }

    // المضلع المحيطي التفاعلي الشفاف للمستند النشط
    ctx.beginPath();
    ctx.moveTo(corners[0].x * scale, corners[0].y * scale);
    ctx.lineTo(corners[1].x * scale, corners[1].y * scale);
    ctx.lineTo(corners[2].x * scale, corners[2].y * scale);
    ctx.lineTo(corners[3].x * scale, corners[3].y * scale);
    ctx.closePath();

    ctx.fillStyle = "rgba(99, 102, 241, 0.20)";
    ctx.fill();

    ctx.strokeStyle = docScannerPrimary();
    ctx.lineWidth = 2.5;
    ctx.setLineDash([6, 4]);
    ctx.stroke();
    ctx.setLineDash([]);

    // رسم الدبابيس الأربعة
    corners.forEach((pt, idx) => {
      const px = pt.x * scale;
      const py = pt.y * scale;

      const isActive = activeCorner === idx;
      const isHover = isHoveringCorner === idx;

      ctx.beginPath();
      ctx.arc(px, py, isActive ? 11 : isHover ? 9 : 7, 0, Math.PI * 2);
      ctx.fillStyle = isActive ? docScannerPrimary() : isHover ? docScannerHover() : "#ffffff";
      ctx.fill();
      ctx.strokeStyle = docScannerDark();
      ctx.lineWidth = 2.5;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(px, py, 3, 0, Math.PI * 2);
      ctx.fillStyle = isActive ? "#ffffff" : docScannerInner();
      ctx.fill();
    });

    ctx.restore();
  }, [corners, activeCorner, isHoveringCorner, isPreviewMode, detectedDocs, activeDocIndex, imgRef]);

  useEffect(() => {
    if (drawRafRef.current !== null) {
      cancelAnimationFrame(drawRafRef.current);
    }
    drawRafRef.current = requestAnimationFrame(() => {
      drawRafRef.current = null;
      drawCanvas();
    });
    return () => {
      if (drawRafRef.current !== null) {
        cancelAnimationFrame(drawRafRef.current);
        drawRafRef.current = null;
      }
    };
  }, [drawCanvas]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const ro = new ResizeObserver(() => {
      drawCanvas();
    });
    ro.observe(container);
    return () => ro.disconnect();
  }, [drawCanvas]);

  const updateLoupe = useCallback(
    (cornerIndex: number, clientX: number, clientY: number) => {
      const loupeCanvas = loupeCanvasRef.current;
      const img = imgRef.current;
      const canvas = canvasRef.current;
      if (!loupeCanvas || !img || !canvas || corners.length <= cornerIndex) return;

      const pt = corners[cornerIndex];
      const lCtx = loupeCanvas.getContext("2d");
      if (!lCtx) return;

      const loupeSize = 110;
      if (loupeCanvas.width !== loupeSize) loupeCanvas.width = loupeSize;
      if (loupeCanvas.height !== loupeSize) loupeCanvas.height = loupeSize;

      lCtx.clearRect(0, 0, loupeSize, loupeSize);

      lCtx.save();
      lCtx.beginPath();
      lCtx.arc(loupeSize / 2, loupeSize / 2, loupeSize / 2 - 2, 0, Math.PI * 2);
      lCtx.clip();

      const zoomFactor = 3.5;
      const srcRegionW = loupeSize / zoomFactor;
      const srcRegionH = loupeSize / zoomFactor;

      const sx = Math.max(0, Math.min(img.naturalWidth - srcRegionW, pt.x - srcRegionW / 2));
      const sy = Math.max(0, Math.min(img.naturalHeight - srcRegionH, pt.y - srcRegionH / 2));

      lCtx.imageSmoothingEnabled = false;
      lCtx.drawImage(img, sx, sy, srcRegionW, srcRegionH, 0, 0, loupeSize, loupeSize);

      const center = loupeSize / 2;
      lCtx.beginPath();
      lCtx.moveTo(center - 10, center);
      lCtx.lineTo(center + 10, center);
      lCtx.moveTo(center, center - 10);
      lCtx.lineTo(center, center + 10);
      lCtx.strokeStyle = docScannerLoupe();
      lCtx.lineWidth = 1.8;
      lCtx.stroke();

      lCtx.restore();

      const containerRect = containerRef.current?.getBoundingClientRect();
      if (containerRect) {
        let lx = clientX - containerRect.left - loupeSize / 2;
        let ly = clientY - containerRect.top - loupeSize - 20;

        // 🔒 حماية المكبرة من الخروج أعلى الإطار عبر قلب موضعها للأسفل
        if (ly < 10) {
          ly = clientY - containerRect.top + 30;
        }

        lx = Math.max(8, Math.min(containerRect.width - loupeSize - 8, lx));
        ly = Math.max(8, Math.min(containerRect.height - loupeSize - 8, ly));

        setLoupePos({ x: lx, y: ly });
      }
    },
    [corners, imgRef]
  );

  const scheduleLoupeUpdate = useCallback(
    (cornerIndex: number, clientX: number, clientY: number) => {
      if (loupeRafRef.current !== null) {
        cancelAnimationFrame(loupeRafRef.current);
      }
      loupeRafRef.current = requestAnimationFrame(() => {
        loupeRafRef.current = null;
        updateLoupe(cornerIndex, clientX, clientY);
      });
    },
    [updateLoupe]
  );

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (isPreviewMode || corners.length !== 4) return;
      const canvas = canvasRef.current;
      if (!canvas || !imgSize.w || !imgSize.h) return;

      const rect = canvas.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;
      const clickX = (e.clientX - rect.left) * (imgSize.w / rect.width);
      const clickY = (e.clientY - rect.top) * (imgSize.h / rect.height);

      let closestIdx = -1;
      let minDist = 32;

      corners.forEach((pt, idx) => {
        const dist = Math.hypot(pt.x - clickX, pt.y - clickY);
        if (dist < minDist) {
          minDist = dist;
          closestIdx = idx;
        }
      });

      if (closestIdx !== -1) {
        setActiveCorner(closestIdx);
        try {
          canvas.setPointerCapture(e.pointerId);
        } catch {
          // ignore
        }
        scheduleLoupeUpdate(closestIdx, e.clientX, e.clientY);
      } else if (detectedDocs.length > 1) {
        const clickedDocIdx = detectedDocs.findIndex(
          (doc, idx) => idx !== activeDocIndex && isPointInQuad({ x: clickX, y: clickY }, doc.corners)
        );
        if (clickedDocIdx !== -1) {
          selectDocument(clickedDocIdx);
        }
      }
    },
    [isPreviewMode, corners, imgSize, detectedDocs, activeDocIndex, selectDocument, scheduleLoupeUpdate]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (isPreviewMode) return;
      const canvas = canvasRef.current;
      if (!canvas || !imgSize.w || !imgSize.h) return;

      const rect = canvas.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;
      const clickX = (e.clientX - rect.left) * (imgSize.w / rect.width);
      const clickY = (e.clientY - rect.top) * (imgSize.h / rect.height);

      if (activeCorner !== null && corners.length === 4) {
        const clampedX = Math.max(0, Math.min(imgSize.w, Math.round(clickX)));
        const clampedY = Math.max(0, Math.min(imgSize.h, Math.round(clickY)));

        const nextCorners = corners.map((pt, idx) =>
          idx === activeCorner ? { x: clampedX, y: clampedY } : pt
        );
        onCornersChange(nextCorners);
        onAspectChange("free");

        scheduleLoupeUpdate(activeCorner, e.clientX, e.clientY);
      } else {
        let hoverIdx: number | null = null;
        let minHoverDist = 25;
        corners.forEach((pt, idx) => {
          const dist = Math.hypot(pt.x - clickX, pt.y - clickY);
          if (dist < minHoverDist) {
            minHoverDist = dist;
            hoverIdx = idx;
          }
        });
        setIsHoveringCorner(hoverIdx);
      }
    },
    [isPreviewMode, imgSize, activeCorner, corners, onCornersChange, onAspectChange, scheduleLoupeUpdate]
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (activeCorner !== null) {
        setActiveCorner(null);
        setLoupePos(null);
        try {
          if (
            canvasRef.current &&
            typeof canvasRef.current.releasePointerCapture === "function" &&
            typeof canvasRef.current.hasPointerCapture === "function" &&
            canvasRef.current.hasPointerCapture(e.pointerId)
          ) {
            canvasRef.current.releasePointerCapture(e.pointerId);
          }
        } catch {
          // ignore
        }
      }
    },
    [activeCorner]
  );

  // 🔒 إلغاء إطارات الرسم المعلقة عند الإغلاق
  useEffect(() => {
    if (!open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- reset canvas drag/hover state on close
      setActiveCorner(null);
      setIsHoveringCorner(null);
      setLoupePos(null);
      if (drawRafRef.current !== null) {
        cancelAnimationFrame(drawRafRef.current);
        drawRafRef.current = null;
      }
      if (loupeRafRef.current !== null) {
        cancelAnimationFrame(loupeRafRef.current);
        loupeRafRef.current = null;
      }
    }
  }, [open]);

  return {
    containerRef,
    canvasRef,
    loupeCanvasRef,
    activeCorner,
    setActiveCorner,
    isHoveringCorner,
    setIsHoveringCorner,
    loupePos,
    setLoupePos,
    displayScaleRef,
    drawRafRef,
    loupeRafRef,
    drawCanvas,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
  };
}
