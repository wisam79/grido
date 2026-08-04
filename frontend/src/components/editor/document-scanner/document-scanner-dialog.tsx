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
  RotateCcw,
  Maximize2,
  FileText,
  CreditCard,
  LayoutGrid,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Point,
  warpPerspective,
  inferSmartDocumentAspect,
  detectDocumentAuto,
} from "./perspective-transform";
import { toast } from "sonner";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";

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
  const [isDetecting, setIsDetecting] = useState(false);

  const activeReqIdRef = useRef<number>(0);

  const runDetection = useCallback(
    async (notify: boolean) => {
      const img = imgRef.current;
      if (!img) return;
      const reqId = ++activeReqIdRef.current;
      setIsDetecting(true);
      try {
        const result = await detectDocumentAuto(img, img.naturalWidth, img.naturalHeight);
        if (reqId !== activeReqIdRef.current) return;
        if (result.corners) {
          setCorners(result.corners);
          const inferred = inferSmartDocumentAspect(result.corners);
          if (inferred !== "free") setAspect(inferred);
          if (notify) {
            if (result.method === "opencv") {
              toast.success(`كشف دقيق عبر OpenCV (${Math.round(result.confidence * 100)}%) 🎯`);
            } else if (result.method === "js") {
              toast.success("كشف عبر الخوارزمية الاحتياطية 🎯");
            } else {
              toast.warning("لم يُكتشف المستند بدقة — اضبط الأركان يدوياً ⚠️");
            }
          }
        } else {
          if (notify) toast.warning("لم يُنتج الكشف أي أركان — استخدم التعديل اليدوي ⚠️");
        }
      } catch (err) {
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

  // 🔒 إصلاح BUG-3 & BUG-13: التحقق من التلغية عند فك المكون وإزالة prevOpen المزدوج
  useEffect(() => {
    if (!open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsDetecting(false);
      setIsPreviewMode(false);
      setPreviewSrc(null);
      return;
    }
    if (!imageSrc) return;

    let isCancelled = false;
    const img = new Image();
    img.crossOrigin = "anonymous";

    img.onload = () => {
      if (isCancelled) return;
      imgRef.current = img;
      setImgSize({ w: img.naturalWidth, h: img.naturalHeight });
      setIsPreviewMode(false);
      setPreviewSrc(null);
      // Run detection asynchronously with OpenCV + JS fallback
      runDetection(false);
    };

    img.onerror = () => {
      if (!isCancelled) {
        toast.error("فشل تحميل صورة المستند للمسح");
      }
    };

    img.src = imageSrc;

    return () => {
      isCancelled = true;
      activeReqIdRef.current++;
      img.onload = null;
      img.onerror = null;
    };
  }, [open, imageSrc, runDetection]);

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
    runDetection(true);
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
        className="sm:max-w-[1180px] w-[90vw] h-[86vh] max-h-[90vh] overflow-hidden flex flex-col rounded-2xl border border-border/60 bg-card/98 backdrop-blur-md p-4 shadow-2xl transition-all duration-150"
        dir="rtl"
      >
        {/* Top Header */}
        <DialogHeader className="pb-3 border-b border-border/40 flex flex-row items-center justify-between shrink-0">
          <div>
            <DialogTitle className="flex items-center gap-2.5 text-base font-bold text-foreground">
              <div className="p-2 rounded-xl bg-primary/10 text-primary border border-primary/20 shadow-2xs">
                <ScanLine className="w-4 h-4" />
              </div>
              <div className="flex flex-col">
                <span>ماسح وتقويم المستندات (Document Scanner)</span>
                <span className="text-[11px] font-normal text-muted-foreground mt-0.5">
                  استعدال المنظور وتحديد حدود الورقة وتبييض الخلفية تلقائياً للطباعة
                </span>
              </div>
            </DialogTitle>
          </div>
        </DialogHeader>

        {/* Main Work Area */}
        <div className="flex-1 overflow-hidden flex flex-col md:flex-row gap-3 py-2 min-h-0 h-full">
          {/* Canvas Main Container */}
          <div
            ref={containerRef}
            className="flex-1 bg-zinc-950/95 dark:bg-black/90 rounded-2xl overflow-hidden flex items-center justify-center h-full min-h-0 border border-border/40 relative shadow-inner p-2 select-none"
          >
            {/* Top Floating Status Badge */}
            <div className="absolute top-3 inset-x-0 mx-auto w-fit z-20 pointer-events-none">
              <div className="px-3.5 py-1.5 rounded-full bg-background/80 dark:bg-zinc-900/90 border border-border/60 text-[11px] font-medium text-foreground/90 shadow-md backdrop-blur-md flex items-center gap-2">
                {isDetecting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 text-primary animate-spin" />
                    <span>جاري فحص الحواف وتحديد أركان المستند تلقائياً...</span>
                  </>
                ) : isPreviewMode ? (
                  <>
                    <Eye className="w-3.5 h-3.5 text-emerald-500" />
                    <span>معاينة المستند بعد الاستعدال والمعالجة</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5 text-primary" />
                    <span>اسحب الدبابيس الأربعة لضبط حدود المستند بدقة</span>
                  </>
                )}
              </div>
            </div>

            {isPreviewMode && previewSrc ? (
              <img
                src={previewSrc}
                alt="المستند المستعدل"
                className="max-h-full max-w-full object-contain rounded-xl shadow-2xl border border-border/30 animate-in fade-in-50 duration-200"
              />
            ) : (
              <canvas
                ref={canvasRef}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                className={cn(
                  "touch-none rounded-xl cursor-crosshair transition-opacity duration-150",
                  activeCorner !== null && "cursor-grabbing"
                )}
              />
            )}

            {/* Loupe Glass Magnifier */}
            <div
              className={cn(
                "absolute pointer-events-none transition-all duration-100 rounded-full border-2 border-primary bg-zinc-950/95 shadow-2xl z-50 overflow-hidden ring-4 ring-primary/20",
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
          <div className="w-full md:w-64 flex flex-col gap-3.5 shrink-0 bg-card/50 dark:bg-card/30 p-3.5 rounded-2xl border border-border/40 overflow-y-auto h-full min-h-0">
            {/* 1. كشف الحواف والأركان */}
            <div className="space-y-2 bg-background/40 dark:bg-background/20 p-2.5 rounded-xl border border-border/30">
              <Label className="text-[11.5px] font-bold text-foreground/90 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-primary shrink-0" />
                <span>كشف الأركان</span>
              </Label>
              <div className="grid grid-cols-2 gap-2">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="default"
                      size="sm"
                      className="h-9 rounded-xl font-bold text-[11px] flex items-center justify-center gap-1.5 cursor-pointer shadow-xs bg-primary hover:bg-primary/90"
                      onClick={handleAutoDetect}
                      disabled={isDetecting}
                    >
                      {isDetecting ? (
                        <RefreshCw className="w-3.5 h-3.5 shrink-0 animate-spin" />
                      ) : (
                        <Sparkles className="w-3.5 h-3.5 shrink-0" />
                      )}
                      <span>{isDetecting ? "جاري الكشف" : "كشف تلقائي"}</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="top">كشف أركان المستند آلياً بالذكاء الاصطناعي</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-9 rounded-xl border-border/60 hover:bg-accent text-[11px] font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
                      onClick={handleResetCorners}
                    >
                      <RefreshCw className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                      <span>إعادة ضبط</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="top">إعادة توزيع الأركان على كامل الصورة</TooltipContent>
                </Tooltip>
              </div>
            </div>

            {/* 2. فلاتر وتصفية الورقة */}
            <div className="space-y-2 bg-background/40 dark:bg-background/20 p-2.5 rounded-xl border border-border/30">
              <Label className="text-[11.5px] font-bold text-foreground/90 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-primary shrink-0" />
                <span>معالجة وتصفية الورقة</span>
              </Label>
              <div className="flex flex-col gap-1.5">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant={filter === "original" ? "default" : "outline"}
                      size="sm"
                      className={cn(
                        "h-9 rounded-xl text-[11px] font-semibold justify-start px-3 gap-2.5 cursor-pointer transition-all border-border/40",
                        filter === "original" ? "bg-primary text-primary-foreground shadow-2xs font-bold" : "hover:bg-accent/60 text-foreground/80"
                      )}
                      onClick={() => handleFilterChange("original")}
                    >
                      <FileText className="w-3.5 h-3.5 shrink-0" />
                      <div className="flex flex-col items-start leading-tight">
                        <span>الألوان الأصلية</span>
                      </div>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="left">الاحتفاظ بألوان وإضاءة الصورة الأصلية</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant={filter === "magic" ? "default" : "outline"}
                      size="sm"
                      className={cn(
                        "h-9 rounded-xl text-[11px] font-bold justify-start px-3 gap-2.5 cursor-pointer transition-all border-border/40",
                        filter === "magic" ? "bg-primary text-primary-foreground shadow-2xs" : "hover:bg-accent/60 text-foreground/80"
                      )}
                      onClick={() => handleFilterChange("magic")}
                    >
                      <Sparkles className="w-3.5 h-3.5 shrink-0 text-amber-300" />
                      <div className="flex flex-col items-start leading-tight">
                        <span>ماسح ذكي (Magic)</span>
                      </div>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="left">تبييض الورقة وإزالة الظلال وتحسين وضوح النص</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant={filter === "bw" ? "default" : "outline"}
                      size="sm"
                      className={cn(
                        "h-9 rounded-xl text-[11px] font-semibold justify-start px-3 gap-2.5 cursor-pointer transition-all border-border/40",
                        filter === "bw" ? "bg-primary text-primary-foreground shadow-2xs font-bold" : "hover:bg-accent/60 text-foreground/80"
                      )}
                      onClick={() => handleFilterChange("bw")}
                    >
                      <LayoutGrid className="w-3.5 h-3.5 shrink-0" />
                      <div className="flex flex-col items-start leading-tight">
                        <span>أبيض وأسود (B&W)</span>
                      </div>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="left">تحويل المستند لأبيض وأسود عالي التباين</TooltipContent>
                </Tooltip>
              </div>
            </div>

            {/* 3. نسبة الأبعاد والقياس */}
            <div className="space-y-2 bg-background/40 dark:bg-background/20 p-2.5 rounded-xl border border-border/30">
              <Label className="text-[11.5px] font-bold text-foreground/90 flex items-center gap-1.5">
                <Maximize2 className="w-3.5 h-3.5 text-primary shrink-0" />
                <span>قياس ونسبة المستند</span>
              </Label>
              <div className="grid grid-cols-2 gap-1.5">
                <Button
                  variant={aspect === "free" ? "default" : "outline"}
                  size="sm"
                  className={cn(
                    "h-8.5 rounded-xl text-[11px] font-bold cursor-pointer transition-all border-border/40",
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
                    "h-8.5 rounded-xl text-[11px] font-semibold cursor-pointer transition-all border-border/40",
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
                    "h-8.5 rounded-xl text-[11px] font-semibold cursor-pointer transition-all border-border/40",
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
                    "h-8.5 rounded-xl text-[11px] font-semibold cursor-pointer flex items-center justify-center gap-1.5 transition-all border-border/40",
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

        {/* Footer Bar */}
        <DialogFooter className="gap-3 border-t border-border/40 pt-3 flex items-center justify-between w-full shrink-0">
          <div>
            <Button
              variant="secondary"
              onClick={handleTogglePreview}
              className="rounded-xl h-10 px-4 text-xs font-semibold cursor-pointer gap-2 border border-border/50 shadow-xs hover:bg-accent flex items-center"
            >
              {isPreviewMode ? (
                <>
                  <RotateCcw className="w-4 h-4 text-primary" />
                  <span>رجوع للتعديل</span>
                </>
              ) : (
                <>
                  <Eye className="w-4 h-4 text-primary" />
                  <span>معاينة الاستعدال</span>
                </>
              )}
            </Button>
          </div>
          <div className="flex items-center gap-2.5">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="rounded-xl h-10 px-4 text-xs font-semibold cursor-pointer"
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

