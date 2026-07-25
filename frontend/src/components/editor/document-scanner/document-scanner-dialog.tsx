import { useState, useRef, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  ScanLine,
  Sparkles,
  RefreshCw,
  Check,
  Eye,
  Maximize2,
  FileText,
  CreditCard,
  LayoutGrid,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Point,
  autoDetectDocumentCorners,
  warpPerspective,
  inferSmartDocumentAspect,
} from "./perspective-transform";
import { toast } from "sonner";

interface DocumentScannerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  imageSrc: string;
  onSave: (processedBase64: string) => void;
}

type AspectRatioOption = "free" | "a4_p" | "a4_l" | "id_card" | "square";
type FilterType = "original" | "magic" | "bw";

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
  const [aspect, setAspect] = useState<AspectRatioOption>("free");
  const [filter, setFilter] = useState<FilterType>("original");
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [previewSrc, setPreviewSrc] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const loupeCanvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);

  const [imgSize, setImgSize] = useState<{ w: number; h: number }>({ w: 0, h: 0 });
  const displayScaleRef = useRef<number>(1);

  // 🔒 إصلاح BUG-3 & BUG-13: التحقق من التلغية عند فك المكون وإزالة prevOpen المزدوج
  useEffect(() => {
    if (!open || !imageSrc) return;

    let isCancelled = false;
    const img = new Image();
    img.crossOrigin = "anonymous";

    img.onload = () => {
      if (isCancelled) return;
      imgRef.current = img;
      setImgSize({ w: img.naturalWidth, h: img.naturalHeight });

      const maxDim = 400;
      const scale = Math.min(1, maxDim / img.naturalWidth, maxDim / img.naturalHeight);
      const sw = Math.max(1, Math.round(img.naturalWidth * scale));
      const sh = Math.max(1, Math.round(img.naturalHeight * scale));

      const tmpCanvas = document.createElement("canvas");
      tmpCanvas.width = sw;
      tmpCanvas.height = sh;
      const tmpCtx = tmpCanvas.getContext("2d");
      if (tmpCtx) {
        tmpCtx.drawImage(img, 0, 0, sw, sh);
        const imgData = tmpCtx.getImageData(0, 0, sw, sh);
        const detected = autoDetectDocumentCorners(imgData, sw, sh, img.naturalWidth, img.naturalHeight);
        setCorners(detected);
      }
      // 🔒 تنظيف tmpCanvas (BUG-6)
      tmpCanvas.width = 0;
      tmpCanvas.height = 0;

      setIsPreviewMode(false);
      setPreviewSrc(null);
    };

    img.onerror = () => {
      if (!isCancelled) {
        toast.error("فشل تحميل صورة المستند للمسح");
      }
    };

    img.src = imageSrc;

    return () => {
      isCancelled = true;
      img.onload = null;
      img.onerror = null;
    };
  }, [open, imageSrc]);

  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img || corners.length !== 4) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const container = containerRef.current;
    if (!container) return;

    const maxW = container.clientWidth - 16;
    const maxH = container.clientHeight - 16;

    const scale = Math.min(maxW / img.naturalWidth, maxH / img.naturalHeight, 1);
    displayScaleRef.current = scale;

    const canvasW = Math.round(img.naturalWidth * scale);
    const canvasH = Math.round(img.naturalHeight * scale);

    canvas.width = canvasW;
    canvas.height = canvasH;

    ctx.drawImage(img, 0, 0, canvasW, canvasH);

    if (isPreviewMode) return;

    // المضلع المحيطي التفاعلي الشفاف
    ctx.beginPath();
    ctx.moveTo(corners[0].x * scale, corners[0].y * scale);
    ctx.lineTo(corners[1].x * scale, corners[1].y * scale);
    ctx.lineTo(corners[2].x * scale, corners[2].y * scale);
    ctx.lineTo(corners[3].x * scale, corners[3].y * scale);
    ctx.closePath();

    ctx.fillStyle = "rgba(99, 102, 241, 0.20)";
    ctx.fill();

    ctx.strokeStyle = "#6366f1";
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
      ctx.fillStyle = isActive ? "#6366f1" : isHover ? "#818cf8" : "#ffffff";
      ctx.fill();
      ctx.strokeStyle = "#312e81";
      ctx.lineWidth = 2.5;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(px, py, 3, 0, Math.PI * 2);
      ctx.fillStyle = isActive ? "#ffffff" : "#4f46e5";
      ctx.fill();
    });
  }, [corners, activeCorner, isHoveringCorner, isPreviewMode]);

  useEffect(() => {
    drawCanvas();
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
      loupeCanvas.width = loupeSize;
      loupeCanvas.height = loupeSize;

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

      lCtx.drawImage(img, sx, sy, srcRegionW, srcRegionH, 0, 0, loupeSize, loupeSize);

      const center = loupeSize / 2;
      lCtx.beginPath();
      lCtx.moveTo(center - 10, center);
      lCtx.lineTo(center + 10, center);
      lCtx.moveTo(center, center - 10);
      lCtx.lineTo(center, center + 10);
      lCtx.strokeStyle = "#ef4444";
      lCtx.lineWidth = 1.8;
      lCtx.stroke();

      lCtx.restore();

      const containerRect = containerRef.current?.getBoundingClientRect();
      if (containerRect) {
        setLoupePos({
          x: clientX - containerRect.left - loupeSize / 2,
          y: clientY - containerRect.top - loupeSize - 20,
        });
      }
    },
    [corners]
  );

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (isPreviewMode || corners.length !== 4) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scale = displayScaleRef.current;
    const clickX = (e.clientX - rect.left) / scale;
    const clickY = (e.clientY - rect.top) / scale;

    let closestIdx = -1;
    let minDist = 30;

    corners.forEach((pt, idx) => {
      const dist = Math.hypot(pt.x - clickX, pt.y - clickY);
      if (dist < minDist) {
        minDist = dist;
        closestIdx = idx;
      }
    });

    if (closestIdx !== -1) {
      setActiveCorner(closestIdx);
      canvas.setPointerCapture(e.pointerId);
      updateLoupe(closestIdx, e.clientX, e.clientY);
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (isPreviewMode) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scale = displayScaleRef.current;
    const currX = Math.max(0, Math.min(imgSize.w, (e.clientX - rect.left) / scale));
    const currY = Math.max(0, Math.min(imgSize.h, (e.clientY - rect.top) / scale));

    if (activeCorner !== null) {
      const nextCorners = [...corners];
      nextCorners[activeCorner] = { x: Math.round(currX), y: Math.round(currY) };
      setCorners(nextCorners);
      updateLoupe(activeCorner, e.clientX, e.clientY);
    } else {
      let hoverIdx: number | null = null;
      corners.forEach((pt, idx) => {
        const dist = Math.hypot(pt.x - currX, pt.y - currY);
        if (dist < 25) hoverIdx = idx;
      });
      setIsHoveringCorner(hoverIdx);
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (activeCorner !== null) {
      setActiveCorner(null);
      setLoupePos(null);
      if (canvasRef.current) {
        canvasRef.current.releasePointerCapture(e.pointerId);
      }
    }
  };

  const handleAutoDetect = () => {
    const img = imgRef.current;
    if (!img) return;

    const maxDim = 400;
    const scale = Math.min(1, maxDim / img.naturalWidth, maxDim / img.naturalHeight);
    const sw = Math.max(1, Math.round(img.naturalWidth * scale));
    const sh = Math.max(1, Math.round(img.naturalHeight * scale));

    const tmpCanvas = document.createElement("canvas");
    tmpCanvas.width = sw;
    tmpCanvas.height = sh;
    const tmpCtx = tmpCanvas.getContext("2d");
    if (tmpCtx) {
      tmpCtx.drawImage(img, 0, 0, sw, sh);
      const imgData = tmpCtx.getImageData(0, 0, sw, sh);
      const detected = autoDetectDocumentCorners(imgData, sw, sh, img.naturalWidth, img.naturalHeight);
      setCorners(detected);

      const inferred = inferSmartDocumentAspect(detected);
      if (inferred !== "free") {
        setAspect(inferred);
        const aspectLabels: Record<string, string> = {
          id_card: "بطاقة شخصية / هوية 🪪",
          a4_p: "ورقة A4 رأسي 📄",
          a4_l: "ورقة A4 أفقي 📄",
          square: "مستند مربع ⏹️",
        };
        toast.success(`تم كشف أركان المستند وتصنيف النوع: ${aspectLabels[inferred] || inferred} 🎯`);
      } else {
        toast.success("تم كشف أركان المستند بنجاح 🎯");
      }
    }
    // 🔒 تنظيف tmpCanvas (BUG-6)
    tmpCanvas.width = 0;
    tmpCanvas.height = 0;
  };

  const handleResetCorners = () => {
    if (!imgSize.w || !imgSize.h) return;
    setCorners([
      { x: Math.floor(imgSize.w * 0.05), y: Math.floor(imgSize.h * 0.05) },
      { x: Math.floor(imgSize.w * 0.95), y: Math.floor(imgSize.h * 0.05) },
      { x: Math.floor(imgSize.w * 0.95), y: Math.floor(imgSize.h * 0.95) },
      { x: Math.floor(imgSize.w * 0.05), y: Math.floor(imgSize.h * 0.95) },
    ]);
    toast.info("تمت إعادة ضبط الأركان لليمين واليسار");
  };

  const generateWarpedCanvas = (): HTMLCanvasElement | null => {
    const img = imgRef.current;
    if (!img || corners.length !== 4) return null;

    const srcCanvas = document.createElement("canvas");
    srcCanvas.width = img.naturalWidth;
    srcCanvas.height = img.naturalHeight;
    const srcCtx = srcCanvas.getContext("2d");
    if (!srcCtx) return null;
    srcCtx.drawImage(img, 0, 0);

    let targetW: number | undefined;
    let targetH: number | undefined;

    if (aspect === "a4_p") {
      targetW = 1240;
      targetH = 1754;
    } else if (aspect === "a4_l") {
      targetW = 1754;
      targetH = 1240;
    } else if (aspect === "id_card") {
      targetW = 1000;
      targetH = 630;
    } else if (aspect === "square") {
      targetW = 1200;
      targetH = 1200;
    }

    const resCanvas = warpPerspective(
      srcCtx,
      img.naturalWidth,
      img.naturalHeight,
      corners,
      targetW,
      targetH,
      filter
    );

    // 🔒 تنظيف srcCanvas (BUG-6)
    srcCanvas.width = 0;
    srcCanvas.height = 0;

    return resCanvas;
  };

  const handleTogglePreview = () => {
    if (!isPreviewMode) {
      const warped = generateWarpedCanvas();
      if (warped) {
        setPreviewSrc(warped.toDataURL("image/png"));
        setIsPreviewMode(true);
        // 🔒 تنظيف warped canvas (BUG-12)
        warped.width = 0;
        warped.height = 0;
      }
    } else {
      setIsPreviewMode(false);
    }
  };

  // 🔒 إغلاق/تحديث المعاينة عند تغيير الفلتر أو نسبة الأبعاد (BUG-9)
  const handleFilterChange = (newFilter: FilterType) => {
    setFilter(newFilter);
    if (isPreviewMode) {
      setIsPreviewMode(false);
      setPreviewSrc(null);
    }
  };

  const handleAspectChange = (newAspect: AspectRatioOption) => {
    setAspect(newAspect);
    if (isPreviewMode) {
      setIsPreviewMode(false);
      setPreviewSrc(null);
    }
  };

  const handleApply = () => {
    const warped = generateWarpedCanvas();
    if (warped) {
      onSave(warped.toDataURL("image/png"));
      // 🔒 تنظيف warped canvas (BUG-12)
      warped.width = 0;
      warped.height = 0;
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-[1140px] w-[88vw] h-[84vh] max-h-[88vh] overflow-hidden flex flex-col rounded-2xl border border-border/60 bg-card/98 backdrop-blur-xs p-3 shadow-2xl transition-all duration-150"
        dir="rtl"
      >
        <DialogHeader className="pb-2 border-b border-border/40 flex flex-row items-center justify-between shrink-0">
          <div>
            <DialogTitle className="flex items-center gap-2 text-base font-bold text-foreground">
              <div className="p-1.5 rounded-lg bg-primary/10 text-primary border border-primary/20">
                <ScanLine className="w-4 h-4" />
              </div>
              <span>ماسح وتقويم المستندات (Document Scanner)</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground mt-0.5">
              قم بسحب الأركان الأربعة لتحديد حدود الورقة، واستعدال المنظور وتبييض الخلفية تلقائياً.
            </DialogDescription>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col md:flex-row gap-3 py-1.5 min-h-0 h-full">
          <div
            ref={containerRef}
            className="flex-1 bg-zinc-950/90 dark:bg-black/80 rounded-xl overflow-hidden flex items-center justify-center h-full min-h-0 border border-border/40 relative shadow-inner p-1.5"
          >
            {isPreviewMode && previewSrc ? (
              <img
                src={previewSrc}
                alt="المستند المستعدل"
                className="max-h-full max-w-full object-contain rounded-lg shadow-lg border border-border/20"
              />
            ) : (
              <canvas
                ref={canvasRef}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                className={cn(
                  "touch-none rounded-lg cursor-crosshair",
                  activeCorner !== null && "cursor-grabbing"
                )}
              />
            )}

            <div
              className={cn(
                "absolute pointer-events-none transition-opacity duration-150 rounded-full border-2 border-primary bg-zinc-950/90 shadow-2xl z-50 overflow-hidden",
                loupePos && activeCorner !== null ? "opacity-100 scale-100" : "opacity-0 scale-90"
              )}
              style={{
                left: loupePos ? `${loupePos.x}px` : "0px",
                top: loupePos ? `${loupePos.y}px` : "0px",
                width: "110px",
                height: "110px",
              }}
            >
              <canvas ref={loupeCanvasRef} className="w-full h-full" />
            </div>
          </div>

          <div className="w-full md:w-56 flex flex-col gap-3 shrink-0 bg-card/60 dark:bg-card/40 p-3 rounded-xl border border-border/40 overflow-y-auto h-full min-h-0">
            {/* 1. الكشف والتعديل */}
            <div className="space-y-1.5">
              <Label className="text-[11px] font-bold text-foreground/90 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-primary shrink-0" />
                <span>كشف الحواف</span>
              </Label>
              <div className="grid grid-cols-2 gap-1.5">
                <Button
                  variant="default"
                  size="sm"
                  className="h-8.5 rounded-xl font-bold text-[11px] flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
                  onClick={handleAutoDetect}
                  title="كشف تلقائي لأركان المستند"
                >
                  <Sparkles className="w-3.5 h-3.5 shrink-0" />
                  <span>كشف تلقائي</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8.5 rounded-xl border-border/60 hover:bg-accent text-[11px] font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
                  onClick={handleResetCorners}
                  title="إعادة ضبط الأركان للأجزاء الخارجية"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                  <span>إعادة ضبط</span>
                </Button>
              </div>
            </div>

            {/* 2. فلاتر الماسح */}
            <div className="space-y-1.5">
              <Label className="text-[11px] font-bold text-foreground/90 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-primary shrink-0" />
                <span>معالجة الورقة</span>
              </Label>
              <div className="grid grid-cols-1 gap-1.5">
                <Button
                  variant={filter === "original" ? "default" : "outline"}
                  size="sm"
                  className={cn(
                    "h-8.5 rounded-xl text-[11px] font-semibold justify-start px-3 gap-2 cursor-pointer transition-all border-border/50",
                    filter === "original" ? "bg-primary text-primary-foreground shadow-2xs" : "hover:bg-accent/60 text-foreground/80"
                  )}
                  onClick={() => handleFilterChange("original")}
                  title="الألوان الأصلية للمستند"
                >
                  <FileText className="w-3.5 h-3.5 shrink-0" />
                  <span>الألوان الأصلية</span>
                </Button>

                <Button
                  variant={filter === "magic" ? "default" : "outline"}
                  size="sm"
                  className={cn(
                    "h-8.5 rounded-xl text-[11px] font-bold justify-start px-3 gap-2 cursor-pointer transition-all border-border/50",
                    filter === "magic" ? "bg-primary text-primary-foreground shadow-2xs" : "hover:bg-accent/60 text-foreground/80"
                  )}
                  onClick={() => handleFilterChange("magic")}
                  title="ماسح ضوئي ذكي وتبييض الورقة"
                >
                  <Sparkles className="w-3.5 h-3.5 shrink-0" />
                  <span>ماسح ضوئي ذكي (Magic)</span>
                </Button>

                <Button
                  variant={filter === "bw" ? "default" : "outline"}
                  size="sm"
                  className={cn(
                    "h-8.5 rounded-xl text-[11px] font-semibold justify-start px-3 gap-2 cursor-pointer transition-all border-border/50",
                    filter === "bw" ? "bg-primary text-primary-foreground shadow-2xs" : "hover:bg-accent/60 text-foreground/80"
                  )}
                  onClick={() => handleFilterChange("bw")}
                  title="أبيض وأسود عالي التباين"
                >
                  <LayoutGrid className="w-3.5 h-3.5 shrink-0" />
                  <span>أبيض وأسود (B&W)</span>
                </Button>
              </div>
            </div>

            {/* 3. نسبة الأبعاد */}
            <div className="space-y-2">
              <Label className="text-[11px] font-bold text-foreground/90 flex items-center gap-1.5">
                <Maximize2 className="w-3.5 h-3.5 text-primary" />
                <span>أبعاد القياس</span>
              </Label>
              <div className="grid grid-cols-2 gap-1.5">
                <Button
                  variant={aspect === "free" ? "default" : "outline"}
                  size="sm"
                  className={cn(
                    "h-8.5 rounded-xl text-[11px] font-bold cursor-pointer transition-all border-border/50",
                    aspect === "free" ? "bg-primary text-primary-foreground shadow-2xs" : "hover:bg-accent/60 text-foreground/80"
                  )}
                  onClick={() => handleAspectChange("free")}
                >
                  تلقائي / حر
                </Button>

                <Button
                  variant={aspect === "a4_p" ? "default" : "outline"}
                  size="sm"
                  className={cn(
                    "h-8.5 rounded-xl text-[11px] font-semibold cursor-pointer transition-all border-border/50",
                    aspect === "a4_p" ? "bg-primary text-primary-foreground shadow-2xs" : "hover:bg-accent/60 text-foreground/80"
                  )}
                  onClick={() => handleAspectChange("a4_p")}
                >
                  A4 طولي
                </Button>

                <Button
                  variant={aspect === "a4_l" ? "default" : "outline"}
                  size="sm"
                  className={cn(
                    "h-8.5 rounded-xl text-[11px] font-semibold cursor-pointer transition-all border-border/50",
                    aspect === "a4_l" ? "bg-primary text-primary-foreground shadow-2xs" : "hover:bg-accent/60 text-foreground/80"
                  )}
                  onClick={() => handleAspectChange("a4_l")}
                >
                  A4 عرضي
                </Button>

                <Button
                  variant={aspect === "id_card" ? "default" : "outline"}
                  size="sm"
                  className={cn(
                    "h-8.5 rounded-xl text-[11px] font-semibold cursor-pointer flex items-center justify-center gap-1.5 transition-all border-border/50",
                    aspect === "id_card" ? "bg-primary text-primary-foreground shadow-2xs" : "hover:bg-accent/60 text-foreground/80"
                  )}
                  onClick={() => handleAspectChange("id_card")}
                >
                  <CreditCard className="w-3 h-3" />
                  <span>هوية ID</span>
                </Button>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2.5 border-t border-border/40 pt-3.5 flex items-center justify-between w-full">
          <div>
            <Button
              variant="secondary"
              onClick={handleTogglePreview}
              className="rounded-xl h-10 px-5 text-xs font-semibold cursor-pointer gap-2 border border-border/50 shadow-sm"
            >
              <Eye className="w-4 h-4 text-primary" />
              <span>{isPreviewMode ? "رجوع للتعديل ↩" : "معاينة الاستعدال 👁️"}</span>
            </Button>
          </div>
          <div className="flex items-center gap-2.5">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="rounded-xl h-10 px-5 text-xs font-semibold cursor-pointer"
            >
              إلغاء
            </Button>

            <Button
              onClick={handleApply}
              className="rounded-xl h-10 px-6 text-xs font-bold gap-2 cursor-pointer bg-primary hover:bg-primary/90 text-primary-foreground shadow-md hover:shadow-lg transition-all active:scale-[0.98]"
            >
              <Check className="w-4 h-4" />
              <span>تطبيق وعزل المستند</span>
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
