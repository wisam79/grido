import { useState, useRef, useEffect, useCallback } from "react";
import {
  docScannerPrimary, docScannerHover, docScannerDark,
  docScannerInner, docScannerLoupe,
} from "@/lib/canvas/canvas-colors";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogCloseButton,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/huge-icon";
import {
  Scan,
  Sparkle,
  ArrowClockwise,
  Check,
  Eye,
  ArrowCounterClockwise,
  FileText,
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import {
  Point,
  warpPerspective,
  inferSmartDocumentAspect,
  detectDocumentAuto,
  DetectedDocument,
  DocumentAspectType,
  ScannerFilterMode,
  DetectionMode,
  splitQuadIntoIdCards,
  addManualDocumentQuad,
  rotateCanvas,
  warmupMlDetector,
} from "./perspective-transform";
import { toast } from "sonner";
import { ScannerSidebar } from "./components/scanner-sidebar";

interface DocumentScannerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  imageSrc: string;
  onSave: (processedBase64: string | string[]) => void;
}

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

export function DocumentScannerDialog({
  open,
  onOpenChange,
  imageSrc,
  onSave,
}: DocumentScannerDialogProps) {
  const [corners, setCorners] = useState<Point[]>([]);
  const [activeCorner, setActiveCorner] = useState<number | null>(null);
  const [isHoveringCorner, setIsHoveringCorner] = useState<number | null>(null);
  const [loupePos, setLoupePos] = useState<{ x: number; y: number } | null>(null);
  const [aspect, setAspect] = useState<DocumentAspectType>("free");
  const [filter, setFilter] = useState<ScannerFilterMode>("original");
  const [rotation, setRotation] = useState<number>(0);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [previewSrc, setPreviewSrc] = useState<string | null>(null);

  // نمط الكشف: المسح المفرد (الافتراضي) أو المسح المتعدد (الثانوي)
  const [detectionMode, setDetectionMode] = useState<DetectionMode>("single");

  // حالة المستندات المتعددة المكتشفة وتحديدها
  const [detectedDocs, setDetectedDocs] = useState<DetectedDocument[]>([]);
  const [selectedDocIds, setSelectedDocIds] = useState<string[]>([]);
  const [activeDocIndex, setActiveDocIndex] = useState<number>(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const loupeCanvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);

  const [imgSize, setImgSize] = useState<{ w: number; h: number }>({ w: 0, h: 0 });
  const displayScaleRef = useRef<number>(1);
  const [isDetecting, setIsDetecting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const activeReqIdRef = useRef<number>(0);
  const drawRafRef = useRef<number | null>(null);
  const loupeRafRef = useRef<number | null>(null);

  const selectDocument = useCallback(
    (index: number) => {
      if (index < 0 || index >= detectedDocs.length) return;
      setActiveDocIndex(index);
      const doc = detectedDocs[index];
      setCorners(doc.corners);
      setAspect(doc.aspectType || "free");
      setRotation(doc.rotation || 0);
      if (isPreviewMode) {
        setIsPreviewMode(false);
        setPreviewSrc(null);
      }
    },
    [detectedDocs, isPreviewMode]
  );

  const toggleDocSelection = useCallback((id: string) => {
    setSelectedDocIds((prev) =>
      prev.includes(id) ? (prev.length > 1 ? prev.filter((d) => d !== id) : prev) : [...prev, id]
    );
  }, []);

  const selectAllDocs = useCallback(() => {
    if (selectedDocIds.length === detectedDocs.length) {
      if (detectedDocs[activeDocIndex]) {
        setSelectedDocIds([detectedDocs[activeDocIndex].id]);
      }
    } else {
      setSelectedDocIds(detectedDocs.map((d) => d.id));
    }
  }, [detectedDocs, selectedDocIds, activeDocIndex]);

  const runDetection = useCallback(
    async (notify: boolean, mode: DetectionMode = "single") => {
      const img = imgRef.current;
      if (!img) return;
      const reqId = ++activeReqIdRef.current;
      setIsDetecting(true);
      try {
        const result = await detectDocumentAuto(img, img.naturalWidth, img.naturalHeight, mode);
        if (reqId !== activeReqIdRef.current) return;
        if (result.documents && result.documents.length > 0) {
          setDetectedDocs(result.documents);
          setSelectedDocIds(result.documents.map((d) => d.id));
          setActiveDocIndex(0);
          const first = result.documents[0];
          setCorners(first.corners);
          if (first.aspectType !== "free") setAspect(first.aspectType);

          if (notify) {
            if (result.documents.length > 1) {
              toast.success(`تم اكتشاف ${result.documents.length} مستندات في الصورة بنجاح! 🎯`);
            } else if (result.method === "scanic") {
              toast.success(`كشف فائق بالذكاء الاصطناعي (${Math.round(result.confidence * 100)}%) 🎯`);
            } else if (result.method === "opencv") {
              toast.success(`كشف تلقائي دقيق (${Math.round(result.confidence * 100)}%) 🎯`);
            } else if (result.method === "js") {
              toast.success("كشف ذكي للمستند/البطاقة 🎯");
            } else {
              toast.warning("لم يُكتشف المستند بدقة — اضبط الأركان يدوياً ⚠️");
            }
          }
        } else if (result.corners) {
          setCorners(result.corners);
          const inferred = inferSmartDocumentAspect(result.corners);
          if (inferred !== "free") setAspect(inferred);
          if (notify) toast.success("تم كشف المستند 🎯");
        } else {
          if (notify) toast.warning("لم يُنتج الكشف أي أركان — استخدم التعديل اليدوي ⚠️");
        }
      } catch {
        if (reqId === activeReqIdRef.current && notify) {
          toast.error("حدث خطأ أثناء الكشف — جرب مرة أخرى");
        }
      } finally {
        if (reqId === activeReqIdRef.current) {
          setIsDetecting(false);
        }
      }
    },
    []
  );

  // 🔒 تنظيف الحالات عند الإغلاق والفتح
  useEffect(() => {
    if (!open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsDetecting(false);
      setIsPreviewMode(false);
      setPreviewSrc(null);
      setRotation(0);
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
      return;
    }
    // تسخين نموذج الذكاء الاصطناعي مسبقاً في الخلفية
    warmupMlDetector();

    if (!imageSrc) return;

    let isCancelled = false;
    const img = new Image();
    img.crossOrigin = "anonymous";

    img.onload = () => {
      if (isCancelled) return;
      imgRef.current = img;
      setImgSize({ w: img.naturalWidth, h: img.naturalHeight });
      
      const padX = Math.round(img.naturalWidth * 0.05);
      const padY = Math.round(img.naturalHeight * 0.05);
      setCorners([
        { x: padX, y: padY },
        { x: img.naturalWidth - padX, y: padY },
        { x: img.naturalWidth - padX, y: img.naturalHeight - padY },
        { x: padX, y: img.naturalHeight - padY },
      ]);
      setIsPreviewMode(false);
      setPreviewSrc(null);
      setRotation(0);
      setDetectionMode("single");

      runDetection(false, "single");
    };

    img.onerror = () => {
      if (!isCancelled) {
        toast.error("فشل تحميل صورة المستند للمسح");
      }
    };

    img.src = imageSrc;

    const reqIdAtMount = activeReqIdRef.current;
    return () => {
      isCancelled = true;
      activeReqIdRef.current = reqIdAtMount + 1;
      img.onload = null;
      img.onerror = null;
    };
  }, [open, imageSrc, runDetection]);

  // 🔒 تحكم الأسهم الدقيق بالدبابيس واختصارات التبديل بين المستندات
  useEffect(() => {
    if (!open || isPreviewMode) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        (e.target as HTMLElement)?.isContentEditable
      ) {
        return;
      }

      // التبديل السريع بين المستندات بالأرقام (1-9)
      if (!e.ctrlKey && !e.altKey && !e.metaKey) {
        const num = parseInt(e.key, 10);
        if (!isNaN(num) && num >= 1 && num <= detectedDocs.length) {
          selectDocument(num - 1);
          return;
        }
      }

      if (activeCorner === null || corners.length !== 4) return;
      const baseStep = e.shiftKey ? 10 : 2;
      const canvasRect = canvasRef.current?.getBoundingClientRect();
      const displayScale = canvasRect && canvasRect.width > 0 ? canvasRect.width / Math.max(1, imgSize.w) : 1;
      const step = Math.max(1, Math.round(baseStep / Math.max(0.05, displayScale)));

      let dx = 0;
      let dy = 0;
      if (e.key === "ArrowLeft") dx = -step;
      else if (e.key === "ArrowRight") dx = step;
      else if (e.key === "ArrowUp") dy = -step;
      else if (e.key === "ArrowDown") dy = step;
      else return;

      e.preventDefault();
      setCorners((prev) => {
        const next = [...prev];
        const cur = next[activeCorner];
        next[activeCorner] = {
          x: Math.max(0, Math.min(imgSize.w, cur.x + dx)),
          y: Math.max(0, Math.min(imgSize.h, cur.y + dy)),
        };
        return next;
      });
      setDetectedDocs((prev) =>
        prev.map((doc, idx) =>
          idx === activeDocIndex
            ? {
                ...doc,
                aspectType: "free",
                corners: doc.corners.map((pt, cIdx) =>
                  cIdx === activeCorner
                    ? {
                        x: Math.max(0, Math.min(imgSize.w, pt.x + dx)),
                        y: Math.max(0, Math.min(imgSize.h, pt.y + dy)),
                      }
                    : pt
                ),
              }
            : doc
        )
      );
      setAspect("free");
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, isPreviewMode, activeCorner, corners, imgSize, detectedDocs, activeDocIndex, selectDocument]);

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
  }, [corners, activeCorner, isHoveringCorner, isPreviewMode, detectedDocs, activeDocIndex]);

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
    [corners]
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

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
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
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
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
      setCorners(nextCorners);
      setDetectedDocs((prev) =>
        prev.map((doc, idx) => (idx === activeDocIndex ? { ...doc, corners: nextCorners, aspectType: "free" } : doc))
      );
      if (aspect !== "free") {
        setAspect("free");
      }

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
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (activeCorner !== null) {
      setActiveCorner(null);
      setLoupePos(null);
      setDetectedDocs((prev) =>
        prev.map((doc, idx) => (idx === activeDocIndex ? { ...doc, corners } : doc))
      );
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
  };

  const handleAutoDetect = (mode?: DetectionMode) => {
    const targetMode = mode || detectionMode;
    if (mode && mode !== detectionMode) {
      setDetectionMode(mode);
    }
    runDetection(true, targetMode);
  };

  const handleAddManualDocument = () => {
    if (!imgSize.w || !imgSize.h) return;
    setDetectionMode("multi");
    const newDoc = addManualDocumentQuad(detectedDocs, imgSize.w, imgSize.h);
    const nextDocs = [...detectedDocs, newDoc];
    setDetectedDocs(nextDocs);
    setSelectedDocIds((prev) => [...prev, newDoc.id]);
    setActiveDocIndex(nextDocs.length - 1);
    setCorners(newDoc.corners);
    setAspect(newDoc.aspectType);
    if (isPreviewMode) {
      setIsPreviewMode(false);
      setPreviewSrc(null);
    }
    toast.success(`تمت إضافة ${newDoc.label} — اضبط حدوده بالسحب أو الأسهم 🎯`);
  };

  const handleDeleteDocument = (id: string) => {
    if (detectedDocs.length <= 1) {
      toast.warning("يجب الإبقاء على مستند واحد على الأقل");
      return;
    }
    const deletedIdx = detectedDocs.findIndex((d) => d.id === id);
    if (deletedIdx === -1) return;

    const prevSelectedSet = new Set(selectedDocIds);
    const survivingDocs = detectedDocs.filter((d) => d.id !== id);

    // إعادة التسمية مع الحفاظ على كائنات جديدة نقية (Immutability)
    const nextDocs: DetectedDocument[] = survivingDocs.map((doc, idx) => {
      let aspectLabel = "مستند";
      if (doc.aspectType === "id_card") aspectLabel = "بطاقة هوية";
      else if (doc.aspectType === "a4_p" || doc.aspectType === "a4_l") aspectLabel = "ورقة A4";
      else if (doc.aspectType === "square") aspectLabel = "مستند مربع";

      return {
        ...doc,
        id: `doc-${idx + 1}`,
        label: `مستند ${idx + 1} (${aspectLabel})`,
      };
    });

    // مزامنة دقيقة للمستندات المحددة استناداً للمستندات المتبقية التي كانت محددة بالفعل
    const nextSelected: string[] = [];
    survivingDocs.forEach((oldDoc, idx) => {
      if (prevSelectedSet.has(oldDoc.id)) {
        nextSelected.push(nextDocs[idx].id);
      }
    });
    const finalSelected = nextSelected.length > 0 ? nextSelected : [nextDocs[0].id];

    setDetectedDocs(nextDocs);
    setSelectedDocIds(finalSelected);

    const newActiveIdx = Math.max(
      0,
      Math.min(
        nextDocs.length - 1,
        deletedIdx === activeDocIndex
          ? 0
          : deletedIdx < activeDocIndex
          ? activeDocIndex - 1
          : activeDocIndex
      )
    );
    setActiveDocIndex(newActiveIdx);
    setCorners(nextDocs[newActiveIdx].corners);
    setAspect(nextDocs[newActiveIdx].aspectType || "free");

    if (isPreviewMode) {
      setIsPreviewMode(false);
      setPreviewSrc(null);
    }
    toast.info("تم حذف المستند");
  };

  const handleSplitIdCards = () => {
    if (corners.length !== 4) return;
    setDetectionMode("multi");
    const cards = splitQuadIntoIdCards(corners, "vertical");
    if (cards.length === 2) {
      setDetectedDocs(cards);
      setSelectedDocIds(cards.map((c) => c.id));
      setActiveDocIndex(0);
      setCorners(cards[0].corners);
      setAspect("id_card");
      if (isPreviewMode) {
        setIsPreviewMode(false);
        setPreviewSrc(null);
      }
      toast.success("تم تقسيم المستند إلى بطاقتي هوية (وجه أمامي وخلفي) 🎯");
    }
  };

  const handleResetCorners = () => {
    if (!imgSize.w || !imgSize.h) return;
    const resetPts = [
      { x: Math.floor(imgSize.w * 0.05), y: Math.floor(imgSize.h * 0.05) },
      { x: Math.floor(imgSize.w * 0.95), y: Math.floor(imgSize.h * 0.05) },
      { x: Math.floor(imgSize.w * 0.95), y: Math.floor(imgSize.h * 0.95) },
      { x: Math.floor(imgSize.w * 0.05), y: Math.floor(imgSize.h * 0.95) },
    ];
    setCorners(resetPts);
    setDetectedDocs((prev) =>
      prev.map((doc, idx) => (idx === activeDocIndex ? { ...doc, corners: resetPts } : doc))
    );
    toast.info("تمت إعادة ضبط الأركان");
  };

  const handleRotateClockwise = () => {
    const nextRot = (rotation + 90) % 360;
    setRotation(nextRot);
    setDetectedDocs((prev) =>
      prev.map((doc, idx) => (idx === activeDocIndex ? { ...doc, rotation: nextRot } : doc))
    );
    if (isPreviewMode) {
      setIsPreviewMode(false);
      setPreviewSrc(null);
    }
  };

  const handleRotateCounterClockwise = () => {
    const nextRot = (rotation + 270) % 360;
    setRotation(nextRot);
    setDetectedDocs((prev) =>
      prev.map((doc, idx) => (idx === activeDocIndex ? { ...doc, rotation: nextRot } : doc))
    );
    if (isPreviewMode) {
      setIsPreviewMode(false);
      setPreviewSrc(null);
    }
  };

  const generateWarpedForDoc = (
    docCorners: Point[],
    docAspect: DocumentAspectType,
    isPreview: boolean = false,
    docRotation?: number,
    docFilter?: ScannerFilterMode
  ): HTMLCanvasElement | null => {
    const img = imgRef.current;
    if (!img || docCorners.length !== 4) return null;

    const srcCanvas = document.createElement("canvas");
    srcCanvas.width = img.naturalWidth;
    srcCanvas.height = img.naturalHeight;
    const srcCtx = srcCanvas.getContext("2d");
    if (!srcCtx) return null;
    srcCtx.drawImage(img, 0, 0);

    // حساب الأبعاد الحقيقية ديناميكياً للحفاظ على دقة الطباعة الكاملة
    const topW = Math.hypot(docCorners[1].x - docCorners[0].x, docCorners[1].y - docCorners[0].y);
    const botW = Math.hypot(docCorners[2].x - docCorners[3].x, docCorners[2].y - docCorners[3].y);
    const leftH = Math.hypot(docCorners[3].x - docCorners[0].x, docCorners[3].y - docCorners[0].y);
    const rightH = Math.hypot(docCorners[2].x - docCorners[1].x, docCorners[2].y - docCorners[1].y);

    const maxEdgeW = Math.round(Math.max(topW, botW));
    const maxEdgeH = Math.round(Math.max(leftH, rightH));

    let targetW: number | undefined;
    let targetH: number | undefined;

    if (isPreview) {
      const maxDim = 800;
      const s = Math.min(1, maxDim / Math.max(maxEdgeW, maxEdgeH, 1));
      targetW = Math.round(maxEdgeW * s);
      targetH = Math.round(maxEdgeH * s);
    } else {
      targetW = maxEdgeW;
      targetH = maxEdgeH;
    }

    if (docAspect === "a4_p") {
      if (isPreview) {
        targetW = 620;
        targetH = 877;
      } else {
        const baseW = Math.max(1400, maxEdgeW);
        targetW = baseW;
        targetH = Math.round(baseW * Math.SQRT2);
      }
    } else if (docAspect === "a4_l") {
      if (isPreview) {
        targetW = 877;
        targetH = 620;
      } else {
        const baseW = Math.max(1980, maxEdgeW);
        targetW = baseW;
        targetH = Math.round(baseW / Math.SQRT2);
      }
    } else if (docAspect === "id_card") {
      if (isPreview) {
        targetW = 500;
        targetH = 315;
      } else {
        const baseW = Math.max(1200, maxEdgeW);
        targetW = baseW;
        targetH = Math.round(baseW / (85.60 / 53.98));
      }
    } else if (docAspect === "square") {
      const avg = isPreview ? 600 : Math.max(1200, Math.round((maxEdgeW + maxEdgeH) / 2));
      targetW = avg;
      targetH = avg;
    }

    const effectiveFilter = docFilter || filter;
    const resCanvas = warpPerspective(
      srcCtx,
      img.naturalWidth,
      img.naturalHeight,
      docCorners,
      targetW,
      targetH,
      effectiveFilter
    );

    srcCanvas.width = 0;
    srcCanvas.height = 0;

    const rotToApply = docRotation !== undefined ? docRotation : rotation;
    if (rotToApply !== 0 && resCanvas) {
      return rotateCanvas(resCanvas, rotToApply, true);
    }

    return resCanvas;
  };

  const handleTogglePreview = () => {
    if (!isPreviewMode) {
      const warped = generateWarpedForDoc(corners, aspect, true);
      if (warped) {
        setPreviewSrc(warped.toDataURL("image/png"));
        setIsPreviewMode(true);
        warped.width = 0;
        warped.height = 0;
      } else {
        toast.error("حدّد أركان المستند أولاً — اسحب النقاط أو اضغط إعادة ضبط");
      }
    } else {
      setIsPreviewMode(false);
    }
  };

  const handleFilterChange = (newFilter: ScannerFilterMode) => {
    setFilter(newFilter);
    setDetectedDocs((prev) =>
      prev.map((doc, idx) => (idx === activeDocIndex ? { ...doc, filterMode: newFilter } : doc))
    );
    if (isPreviewMode) {
      setIsPreviewMode(false);
      setPreviewSrc(null);
    }
  };

  const handleAspectChange = (newAspect: DocumentAspectType) => {
    setAspect(newAspect);
    setDetectedDocs((prev) =>
      prev.map((doc, idx) => (idx === activeDocIndex ? { ...doc, aspectType: newAspect } : doc))
    );
    if (isPreviewMode) {
      setIsPreviewMode(false);
      setPreviewSrc(null);
    }
  };

  const handleApplyActive = async () => {
    setIsExporting(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 0));
      const warped = generateWarpedForDoc(corners, aspect, false);
      if (warped) {
        onSave(warped.toDataURL("image/png"));
        warped.width = 0;
        warped.height = 0;
        onOpenChange(false);
      } else {
        toast.error("حدّد أركان المستند أولاً — اسحب النقاط أو اضغط إعادة ضبط");
      }
    } finally {
      setIsExporting(false);
    }
  };

  const handleApplySelected = async () => {
    const docsToExport = detectedDocs.filter((d) => selectedDocIds.includes(d.id));
    if (docsToExport.length === 0) {
      toast.error("يرجى تحديد مستند واحد على الأقل للإدراج");
      return;
    }

    setIsExporting(true);
    try {
      const results: string[] = [];
      for (const doc of docsToExport) {
        await new Promise((resolve) => setTimeout(resolve, 30)); // Yield to UI
        const warped = generateWarpedForDoc(
          doc.corners,
          doc.aspectType,
          false,
          doc.rotation ?? rotation,
          doc.filterMode ?? filter
        );
        if (warped) {
          results.push(warped.toDataURL("image/png"));
          warped.width = 0;
          warped.height = 0;
        }
      }

      if (results.length > 0) {
        onSave(results.length === 1 ? results[0] : results);
        onOpenChange(false);
      } else {
        toast.error("فشل معالجة المستندات المحددة");
      }
    } finally {
      setIsExporting(false);
    }
  };

  const cornersReady = corners.length === 4;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="sm:max-w-[1140px] w-[94vw] h-[86vh] max-h-[900px] overflow-hidden flex flex-col rounded-2xl border border-border/80 dark:border-white/10 bg-card/95 backdrop-blur-2xl p-4 sm:p-5 shadow-2xl transition-all duration-150 fluent-specular gap-3 font-cairo"
        dir="rtl"
      >
        {/* 🔹 رأس النافذة الأنيق مع زر الإغلاق وشارة النمط */}
        <DialogHeader className="pb-3 border-b border-border/40 flex flex-row items-center justify-between shrink-0 space-y-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center shadow-xs shrink-0">
              <Scan size={22} weight="duotone" />
            </div>
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-2">
                <DialogTitle className="text-base font-bold text-foreground truncate">
                  ماسح وتقويم المستندات والبطاقات
                </DialogTitle>
                {detectedDocs.length > 1 ? (
                  <span className="inline-flex items-center gap-1 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 text-[10px] px-2 py-0.5 font-bold rounded-full shadow-2xs">
                    مسح متعدد ({detectedDocs.length})
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 bg-primary/10 text-primary border border-primary/20 text-[10px] px-2 py-0.5 font-bold rounded-full shadow-2xs">
                    مسح مفرد
                  </span>
                )}
              </div>
              <span className="text-[11px] font-normal text-muted-foreground mt-0.5 truncate">
                استعدال المنظور وتبييض الورقة تلقائياً للطباعة بدقة عالية
              </span>
            </div>
          </div>
          <DialogCloseButton />
        </DialogHeader>

        {/* Main Work Area */}
        <div className="flex-1 overflow-hidden flex flex-col md:flex-row gap-3 min-h-0 h-full">
          {/* Canvas Main Container */}
          <div
            ref={containerRef}
            className="flex-1 bg-zinc-950/90 dark:bg-black/85 rounded-2xl overflow-hidden flex items-center justify-center h-full min-h-0 border border-border/50 relative shadow-inner p-2 select-none"
          >
            {/* Top Floating Status Badge */}
            <div className="absolute top-3 inset-x-0 mx-auto w-fit z-20 pointer-events-none">
              <div className="px-3.5 py-1 rounded-full bg-card/90 dark:bg-card/80 border border-border/70 text-[11px] font-semibold text-foreground shadow-md backdrop-blur-md flex items-center gap-2">
                {isDetecting ? (
                  <>
                    <ArrowClockwise size={13} weight="bold" className="text-primary shrink-0 animate-spin" />
                    <span>جاري فحص الحواف واكتشاف المستندات ...</span>
                  </>
                ) : isPreviewMode ? (
                  <>
                    <Eye size={13} weight="duotone" className="text-blue-500 shrink-0" />
                    <span>معاينة المستند بعد الاستعدال والمعالجة</span>
                  </>
                ) : detectedDocs.length > 1 ? (
                  <>
                    <FileText size={13} weight="duotone" className="text-emerald-500 shrink-0" />
                    <span>
                      تم تحديد {detectedDocs.length} مستندات — انقر على أي مستند أو اضغط أرقام (1-{detectedDocs.length}) للتبديل
                    </span>
                  </>
                ) : (
                  <>
                    <Sparkle size={13} weight="duotone" className="text-primary shrink-0" />
                    <span>اسحب الدبابيس لضبط الحدود، أو اضغط "+ إضافة" لإضافة بطاقة ثانية</span>
                  </>
                )}
              </div>
            </div>

            {isPreviewMode && previewSrc ? (
              <img
                src={previewSrc}
                alt="المستند المستعدل"
                className="max-h-full max-w-full object-contain rounded-xl shadow-md shadow-black/20 border border-border/30 animate-in fade-in-50 duration-200"
              />
            ) : (
              <canvas
                ref={canvasRef}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerCancel={handlePointerUp}
                className={cn(
                  "touch-none rounded-xl cursor-crosshair transition-opacity duration-150",
                  activeCorner !== null && "cursor-grabbing"
                )}
              />
            )}

            {/* Loupe Glass Magnifier */}
            <div
              className={cn(
                "absolute pointer-events-none transition-all duration-100 rounded-full border-2 border-primary bg-zinc-950/95 shadow-lg z-50 overflow-hidden ring-4 ring-primary/20",
                loupePos && activeCorner !== null ? "opacity-100 scale-100" : "opacity-0 scale-90"
              )}
              style={{
                left: loupePos ? `${loupePos.x}px` : "0px",
                top: loupePos ? `${loupePos.y}px` : "0px",
                width: "115px",
                height: "115px",
              }}
            >
              <canvas ref={loupeCanvasRef} className="w-full h-full" />
            </div>
          </div>

          {/* Right Control Sidebar */}
          <ScannerSidebar
            detectionMode={detectionMode}
            onModeChange={setDetectionMode}
            detectedDocs={detectedDocs}
            activeDocIndex={activeDocIndex}
            selectedDocIds={selectedDocIds}
            onSelectDoc={selectDocument}
            onToggleCheckDoc={toggleDocSelection}
            onSelectAllDocs={selectAllDocs}
            onAddDocument={handleAddManualDocument}
            onDeleteDoc={handleDeleteDocument}
            onSplitIdCards={handleSplitIdCards}
            isDetecting={isDetecting}
            onAutoDetect={handleAutoDetect}
            onReset={handleResetCorners}
            filterMode={filter}
            onFilterChange={handleFilterChange}
            aspectType={aspect}
            onAspectChange={handleAspectChange}
            rotation={rotation}
            onRotateClockwise={handleRotateClockwise}
            onRotateCounterClockwise={handleRotateCounterClockwise}
          />
        </div>

        {/* Footer Bar */}
        <DialogFooter className="gap-2 border-t border-border/40 pt-3 flex items-center justify-between w-full shrink-0">
          <div>
            <Button
              variant="outline"
              onClick={handleTogglePreview}
              disabled={!cornersReady && !isPreviewMode}
              title={cornersReady ? undefined : "حدّد أركان المستند أولاً"}
              className="rounded-lg h-8 px-3.5 text-xs font-semibold cursor-pointer gap-2 border border-border/60 shadow-2xs hover:bg-accent flex items-center disabled:cursor-not-allowed"
            >
              {isPreviewMode ? (
                <>
                  <ArrowCounterClockwise size={14} weight="bold" className="text-primary shrink-0" />
                  <span>رجوع للتعديل</span>
                </>
              ) : (
                <>
                  <Eye size={14} weight="bold" className="text-primary shrink-0" />
                  <span>معاينة النتيجة</span>
                </>
              )}
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="rounded-lg h-8 px-4 text-xs font-semibold cursor-pointer border-border/60"
              disabled={isExporting}
            >
              إلغاء
            </Button>

            {detectedDocs.length > 1 && selectedDocIds.length > 1 && (
              <Button
                variant="outline"
                size="sm"
                className="rounded-lg h-8 px-4 text-xs font-bold gap-1.5 cursor-pointer border-emerald-500/60 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 shadow-xs transition-all active:scale-[0.98]"
                onClick={handleApplySelected}
                disabled={isExporting}
              >
                {isExporting ? <Spinner className="w-3.5 h-3.5 shrink-0" size={14} /> : <Check size={14} weight="bold" className="shrink-0" />}
                <span>{isExporting ? "جاري التصدير ..." : `إدراج (${selectedDocIds.length}) مستندات`}</span>
              </Button>
            )}

            <Button
              onClick={handleApplyActive}
              disabled={!cornersReady || isExporting}
              title={cornersReady ? undefined : "حدّد أركان المستند أولاً"}
              className="rounded-lg h-8 px-5 text-xs font-bold gap-1.5 cursor-pointer bg-primary hover:bg-primary/90 text-primary-foreground shadow-xs transition-all active:scale-[0.98] disabled:cursor-not-allowed"
            >
              {isExporting ? <Spinner className="w-3.5 h-3.5 shrink-0" size={14} /> : <Check size={14} weight="bold" className="shrink-0" />}
              <span>{isExporting ? "جاري المعالجة ..." : detectedDocs.length > 1 ? "إدراج المستند النشط" : "تطبيق واستعدال"}</span>
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


