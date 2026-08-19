import { useState, useRef, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Eraser, Paintbrush, ZoomIn, ZoomOut, Save, X, Undo, MousePointer2, Sparkles, Feather } from "lucide-react";
import { toast } from "sonner";
import { SaveImageFromBase64 } from "../../../../wailsjs/go/main/App";
import { cn } from "@/lib/utils";

// Shared buffers to prevent memory leaks and GC pressure during magic eraser flood fill
let sharedVisited: Uint8Array | null = null;
let sharedQueueX: Int32Array | null = null;
let sharedQueueY: Int32Array | null = null;

interface RefineBgDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  element: any;
  onSave: (newImageSrc: string) => void;
}

type ToolType = "erase" | "restore" | "defringe" | "pan" | "magic";

export function RefineBgDialog({ open, onOpenChange, element, onSave }: RefineBgDialogProps) {
  const [tool, setTool] = useState<ToolType>("erase");
  const [brushSize, setBrushSize] = useState(20);
  const [tolerance, setTolerance] = useState(20);
  const [previewBg, setPreviewBg] = useState<"checker" | "white" | "black" | "blue">("checker");
  const [cursorPos, setCursorPos] = useState<{ x: number; y: number; visible: boolean }>({ x: 0, y: 0, visible: false });
  const [isSaving, setIsSaving] = useState(false);
  const [scale, setScale] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isSpacePressed, setIsSpacePressed] = useState(false);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const [originalImage, setOriginalImage] = useState<HTMLImageElement | null>(null);
  const [currentImage, setCurrentImage] = useState<HTMLImageElement | null>(null);
  const [historyLength, setHistoryLength] = useState(1);
  const originalImageDataRef = useRef<ImageData | null>(null);
  const historyRef = useRef<ImageData[]>([]);
  
  const isDrawing = useRef(false);
  const lastPos = useRef<{ x: number, y: number } | null>(null);
  const isPanning = useRef(false);
  const panStart = useRef({ x: 0, y: 0 });

  // Global keyboard shortcuts and mouse wheel zoom
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        e.preventDefault();
        setIsSpacePressed(true);
      }
      
      if (e.key === "+" || e.key === "=") {
        e.preventDefault();
        setScale(s => Math.min(s + 0.25, 5));
      }
      
      if (e.key === "-") {
        e.preventDefault();
        setScale(s => Math.max(s - 0.25, 0.25));
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        e.preventDefault();
        setIsSpacePressed(false);
      }
    };

    const container = containerRef.current;
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const zoomFactor = 0.08;
      const direction = e.deltaY < 0 ? 1 : -1;
      setScale(s => {
        const nextScale = s + direction * zoomFactor;
        return Math.max(0.25, Math.min(5, nextScale));
      });
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    if (container) {
      container.addEventListener("wheel", handleWheel, { passive: false });
    }

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      if (container) {
        container.removeEventListener("wheel", handleWheel);
      }
    };
  }, [open]);

   // Load images
   useEffect(() => {
     if (!open || !element.imageSrc) return;
     const effectiveOriginalSrc = element.originalImageSrc || element.imageSrc;

     let isCancelled = false;
     let origImg: HTMLImageElement | null = null;
     let curImg: HTMLImageElement | null = null;

     const loadImages = async () => {
       try {
         origImg = new Image();
         curImg = new Image();

         await Promise.all([
           new Promise((resolve, reject) => {
             origImg!.onload = resolve;
             origImg!.onerror = reject;
             origImg!.src = effectiveOriginalSrc;
           }),
           new Promise((resolve, reject) => {
             curImg!.onload = resolve;
             curImg!.onerror = reject;
             curImg!.src = element.imageSrc!;
           })
         ]);

         if (isCancelled) return;

         // Cache original image data for the Magic Eraser tool
         const tempCanvas = document.createElement("canvas");
         tempCanvas.width = origImg!.width;
         tempCanvas.height = origImg!.height;
         const tempCtx = tempCanvas.getContext("2d");
         if (tempCtx) {
           tempCtx.drawImage(origImg!, 0, 0);
           originalImageDataRef.current = tempCtx.getImageData(0, 0, origImg!.width, origImg!.height);
         }

         setOriginalImage(origImg!);
         setCurrentImage(curImg!);

         // Reset view
         setScale(1);
         setPan({ x: 0, y: 0 });
       } catch (err) {
         console.error("Failed to load images for refinement:", err);
         toast.error("فشل تحميل الصور للتعديل");
       }
     };

     loadImages();
     return () => {
       isCancelled = true;
       if (origImg) { origImg.onload = null; origImg.onerror = null; origImg.src = ""; }
       if (curImg) { curImg.onload = null; curImg.onerror = null; curImg.src = ""; }
       setOriginalImage(null);
       setCurrentImage(null);
       originalImageDataRef.current = null;
       historyRef.current = [];
       setHistoryLength(0);
       sharedVisited = null;
       sharedQueueX = null;
       sharedQueueY = null;
     };
  }, [open, element.originalImageSrc, element.imageSrc]);

  // Render currentImage onto canvas once loaded
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !currentImage || !originalImage || !open) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(currentImage, 0, 0, canvas.width, canvas.height);
    
    // Save initial state to history
    historyRef.current = [ctx.getImageData(0, 0, canvas.width, canvas.height)];
    setHistoryLength(1);
  }, [currentImage, originalImage, open]);

  const getHistoryMax = (imgData: ImageData) => {
    // حساب حجم ImageData بالبايت لتحديد العدد الأقصى المسموح به في السجل
    // الصور الكبيرة تستهلك ذاكرة هائلة، لذا نحدّ السجل ديناميكياً
    const bytes = imgData.data.length;
    if (bytes > 50_000_000) return 2;   // >50MB → سجلين فقط
    if (bytes > 10_000_000) return 4;   // >10MB → 4 سجلات
    return 10;                           // ≥10 سجلات للصور الصغيرة
  };

  const saveHistory = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    
    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const maxStates = getHistoryMax(imgData);

    if (historyRef.current.length >= maxStates) {
      historyRef.current.shift();
    }
    historyRef.current.push(imgData);
    setHistoryLength(historyRef.current.length);
  };

  const handleUndo = () => {
    if (historyRef.current.length <= 1) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    
    historyRef.current.pop(); // Remove current state
    const previousState = historyRef.current[historyRef.current.length - 1];
    ctx.putImageData(previousState, 0, 0);
    setHistoryLength(historyRef.current.length);
  };

  const getCanvasCoords = (e: React.MouseEvent | React.TouchEvent | MouseEvent | TouchEvent) => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container || !originalImage) return { x: 0, y: 0 };
    
    const containerRect = container.getBoundingClientRect();
    let clientX, clientY;
    
    if ('touches' in e) {
      const touch = e.touches[0] || e.changedTouches[0];
      if (touch) {
        clientX = touch.clientX;
        clientY = touch.clientY;
      } else {
        clientX = 0;
        clientY = 0;
      }
    } else {
      clientX = (e as React.MouseEvent).clientX;
      clientY = (e as React.MouseEvent).clientY;
    }
    
    // Mouse position relative to the center of the container
    const mouseXFromCenter = clientX - (containerRect.left + containerRect.width / 2);
    const mouseYFromCenter = clientY - (containerRect.top + containerRect.height / 2);
    
    // Remove the panning translation and scale
    const unscaledX = (mouseXFromCenter - pan.x) / scale;
    const unscaledY = (mouseYFromCenter - pan.y) / scale;
    
    // Determine the unscaled layout width and height of the canvas inside the container (using fit logic)
    const containerW = containerRect.width;
    const containerH = containerRect.height;
    const imgW = originalImage.width;
    const imgH = originalImage.height;
    
    let unscaledCanvasW = containerW * 0.9;
    let unscaledCanvasH = unscaledCanvasW * (imgH / imgW);
    
    if (unscaledCanvasH > containerH * 0.9) {
      unscaledCanvasH = containerH * 0.9;
      unscaledCanvasW = unscaledCanvasH * (imgW / imgH);
    }
    
    // Map to canvas pixel space
    const x = ((unscaledX + unscaledCanvasW / 2) * imgW) / unscaledCanvasW;
    const y = ((unscaledY + unscaledCanvasH / 2) * imgH) / unscaledCanvasH;
    
    return { x, y };
  };

  const handlePointerDown = (e: React.MouseEvent | React.TouchEvent) => {
    const isPan = tool === "pan" || isSpacePressed || ('button' in e && e.button === 1);
    if (isPan) {
      isPanning.current = true;
      let clientX, clientY;
      if ('touches' in e) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
      } else {
        clientX = (e as React.MouseEvent).clientX;
        clientY = (e as React.MouseEvent).clientY;
      }
      panStart.current = { x: clientX - pan.x, y: clientY - pan.y };
      return;
    }

    if (tool === "magic") {
      const { x, y } = getCanvasCoords(e);
      runMagicEraser(x, y);
      return;
    }

    isDrawing.current = true;
    const { x, y } = getCanvasCoords(e);
    lastPos.current = { x, y };
    
    draw(x, y, x, y); // Draw single dot
  };

  const handlePointerMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (isPanning.current) {
      let clientX, clientY;
      if ('touches' in e) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
      } else {
        clientX = (e as React.MouseEvent).clientX;
        clientY = (e as React.MouseEvent).clientY;
      }
      setPan({
        x: clientX - panStart.current.x,
        y: clientY - panStart.current.y
      });
      return;
    }

    if (!isDrawing.current || !lastPos.current) return;
    
    const { x, y } = getCanvasCoords(e);
    draw(lastPos.current.x, lastPos.current.y, x, y);
    lastPos.current = { x, y };
  };

  const handlePointerUp = () => {
    if (isPanning.current) {
      isPanning.current = false;
      return;
    }
    
    if (isDrawing.current) {
      isDrawing.current = false;
      lastPos.current = null;
      saveHistory(); // Save after stroke is complete
    }
  };

  const draw = (startX: number, startY: number, endX: number, endY: number) => {
    const canvas = canvasRef.current;
    const origImg = originalImage;
    if (!canvas || !origImg) return;
    
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.save();
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = brushSize;

    if (tool === "erase") {
      ctx.globalCompositeOperation = "destination-out";
      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.lineTo(endX, endY);
      ctx.stroke();
    } else if (tool === "defringe") {
      // فرشاة تشذيب الحواف الخافتة وتنعيم الهالات
      ctx.globalCompositeOperation = "destination-out";
      ctx.strokeStyle = "rgba(0, 0, 0, 0.25)";
      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.lineTo(endX, endY);
      ctx.stroke();
    } else if (tool === "restore") {
      ctx.globalCompositeOperation = "source-over";
      const pattern = ctx.createPattern(origImg, "no-repeat");
      if (pattern) {
        ctx.strokeStyle = pattern;
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(endX, endY);
        ctx.stroke();
      }
    }
    ctx.restore();
  };

  const runMagicEraser = (startX: number, startY: number) => {
    const canvas = canvasRef.current;
    const origData = originalImageDataRef.current;
    if (!canvas || !origData) return;
    
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    
    const startXInt = Math.floor(startX);
    const startYInt = Math.floor(startY);
    
    if (startXInt < 0 || startXInt >= width || startYInt < 0 || startYInt >= height) return;

    const targetIdx = (startYInt * width + startXInt) * 4;
    const tr = origData.data[targetIdx];
    const tg = origData.data[targetIdx + 1];
    const tb = origData.data[targetIdx + 2];
    
    const canvasImgData = ctx.getImageData(0, 0, width, height);
    const canvasData = canvasImgData.data;

    const size = width * height;
    if (!sharedQueueX || sharedQueueX.length < size) {
      sharedVisited = new Uint8Array(size);
      sharedQueueX = new Int32Array(size);
      sharedQueueY = new Int32Array(size);
    } else {
      sharedVisited!.fill(0, 0, size);
    }
    const visited = sharedVisited!;
    
    // Flat arrays act as a circular buffer queue for speed and memory efficiency
    const queueX = sharedQueueX!;
    const queueY = sharedQueueY!;
    let head = 0;
    let tail = 0;

    queueX[tail] = startXInt;
    queueY[tail] = startYInt;
    tail++;
    
    visited[startYInt * width + startXInt] = 1;

    // Manhattan distance threshold: tolerance * 3 (since there are 3 channels and each channel is up to 255)
    const maxDist = tolerance * 3;

    const dx = [0, 0, 1, -1];
    const dy = [1, -1, 0, 0];

    while (head < tail) {
      const cx = queueX[head];
      const cy = queueY[head];
      head++;

      const currentIdx = (cy * width + cx) * 4;
      
      canvasData[currentIdx + 3] = 0; // Set Alpha to 0

      for (let i = 0; i < 4; i++) {
        const nx = cx + dx[i];
        const ny = cy + dy[i];

        if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
          const nIdx = ny * width + nx;
          if (visited[nIdx] === 0) {
            visited[nIdx] = 1;
            
            const pixelOffset = nIdx * 4;
            const pr = origData.data[pixelOffset];
            const pg = origData.data[pixelOffset + 1];
            const pb = origData.data[pixelOffset + 2];
            
            const dist = Math.abs(pr - tr) + Math.abs(pg - tg) + Math.abs(pb - tb);
            if (dist <= maxDist) {
              queueX[tail] = nx;
              queueY[tail] = ny;
              tail++;
            }
          }
        }
      }
    }

    ctx.putImageData(canvasImgData, 0, 0);
    saveHistory();
    toast.success("تم مسح المساحة اللونية المتصلة");
  };

  const handleSave = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    setIsSaving(true);
    try {
      const dataUrl = canvas.toDataURL("image/png");
      const localPath = await SaveImageFromBase64(dataUrl);
      onSave(localPath);
      onOpenChange(false);
      toast.success("تم حفظ التعديلات بنجاح");
    } catch (err) {
      console.error("Save failed:", err);
      toast.error("فشل حفظ التعديلات");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !isSaving && onOpenChange(v)}>
      <DialogContent className="sm:max-w-4xl w-[90vw] h-[85vh] flex flex-col p-0 gap-0 bg-background border-border overflow-hidden" dir="rtl" showCloseButton={false}>
        <DialogHeader className="p-4 border-b border-border/40 shrink-0 flex flex-row items-center justify-between">
          <DialogTitle className="text-sm font-bold flex items-center gap-2">
            <Paintbrush className="w-4 h-4 text-primary" />
            تعديل القص يدوياً
          </DialogTitle>
          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" onClick={() => onOpenChange(false)}>
            <X className="w-4 h-4" />
          </Button>
        </DialogHeader>

        <div className="flex flex-1 overflow-hidden">
          {/* الأدوات - Sidebar */}
          <div className="w-56 border-r border-border/40 bg-muted/10 p-4 flex flex-col gap-5 shrink-0 overflow-y-auto">
            <div className="space-y-2">
              <span className="text-[11px] font-bold text-muted-foreground block mb-2">نوع الأداة</span>
              <Button
                variant={tool === "erase" ? "default" : "outline"}
                className={cn("w-full justify-start h-9 text-xs font-semibold gap-2 cursor-pointer", tool === "erase" && "bg-primary text-primary-foreground")}
                onClick={() => setTool("erase")}
              >
                <Eraser className="w-4 h-4" />
                ممحاة (إزالة)
              </Button>
              <Button
                variant={tool === "defringe" ? "default" : "outline"}
                className={cn("w-full justify-start h-9 text-xs font-semibold gap-2 cursor-pointer", tool === "defringe" && "bg-primary text-primary-foreground")}
                onClick={() => setTool("defringe")}
              >
                <Feather className="w-4 h-4" />
                تشذيب الحواف (Defringe)
              </Button>
              <Button
                variant={tool === "restore" ? "default" : "outline"}
                className={cn("w-full justify-start h-9 text-xs font-semibold gap-2 cursor-pointer", tool === "restore" && "bg-primary text-primary-foreground")}
                onClick={() => setTool("restore")}
              >
                <Paintbrush className="w-4 h-4" />
                فرشاة (استرجاع)
              </Button>
              <Button
                variant={tool === "magic" ? "default" : "outline"}
                className={cn("w-full justify-start h-9 text-xs font-semibold gap-2 cursor-pointer", tool === "magic" && "bg-primary text-primary-foreground")}
                onClick={() => setTool("magic")}
              >
                <Sparkles className="w-4 h-4" />
                القص الذكي (سحري)
              </Button>
              <Button
                variant={tool === "pan" ? "default" : "outline"}
                className={cn("w-full justify-start h-9 text-xs font-semibold gap-2 cursor-pointer", tool === "pan" && "bg-primary text-primary-foreground")}
                onClick={() => setTool("pan")}
              >
                <MousePointer2 className="w-4 h-4" />
                تحريك (Pan)
              </Button>
            </div>

            {/* فحص نقاء العزل بخلفيات ملونة */}
            <div className="space-y-2 bg-background p-3 rounded-xl border border-border/40">
              <span className="text-[11px] font-bold text-foreground/80 block">خلفية المعاينة</span>
              <div className="grid grid-cols-4 gap-1.5">
                {[
                  { id: "checker", label: "شفاف", bg: "repeating-conic-gradient(#80808033 0% 25%, transparent 0% 50%)" },
                  { id: "white", label: "أبيض", bg: "#ffffff" },
                  { id: "black", label: "أسود", bg: "#09090b" },
                  { id: "blue", label: "أزرق", bg: "#1d4ed8" },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    title={item.label}
                    onClick={() => setPreviewBg(item.id as any)}
                    className={cn(
                      "h-7 rounded-lg border border-border/60 transition-all flex items-center justify-center cursor-pointer shadow-2xs",
                      previewBg === item.id && "ring-2 ring-primary border-primary font-bold"
                    )}
                    style={{
                      background: item.bg,
                      backgroundSize: item.id === "checker" ? "8px 8px" : undefined
                    }}
                  />
                ))}
              </div>
            </div>

            {tool !== "pan" && tool !== "magic" && (
              <div className="space-y-3 bg-background p-3 rounded-xl border border-border/40">
                <div className="flex justify-between items-center">
                  <span className="text-[11px] font-bold text-foreground/80">حجم الفرشاة</span>
                  <span className="text-[10px] font-mono font-bold text-muted-foreground">{brushSize}px</span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="150"
                  value={brushSize}
                  onChange={(e) => setBrushSize(parseInt(e.target.value))}
                  className="w-full accent-primary cursor-pointer"
                />
              </div>
            )}

            {tool === "magic" && (
              <div className="space-y-3 bg-background p-3 rounded-xl border border-border/40">
                <div className="flex justify-between items-center">
                  <span className="text-[11px] font-bold text-foreground/80">الفارق اللوني (التسامح)</span>
                  <span className="text-[10px] font-mono font-bold text-muted-foreground">{tolerance}</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="100"
                  value={tolerance}
                  onChange={(e) => setTolerance(parseInt(e.target.value))}
                  className="w-full accent-primary cursor-pointer"
                />
              </div>
            )}

            <div className="space-y-3 pt-4 border-t border-border/40 mt-auto">
              <div className="flex gap-2" dir="ltr">
                <Button 
                  variant="outline" 
                  size="icon" 
                  className="h-8 w-8 flex-1 border-border/60 hover:bg-muted cursor-pointer"
                  onClick={() => setScale(s => Math.min(s + 0.25, 5))}
                  title="تكبير"
                >
                  <ZoomIn className="w-4 h-4 text-muted-foreground" />
                </Button>
                <Button 
                  variant="outline" 
                  size="icon" 
                  className="h-8 w-8 flex-1 border-border/60 hover:bg-muted cursor-pointer"
                  onClick={() => setScale(s => Math.max(s - 0.25, 0.25))}
                  title="تصغير"
                >
                  <ZoomOut className="w-4 h-4 text-muted-foreground" />
                </Button>
              </div>
              <Button 
                variant="outline" 
                className="w-full h-8 text-xs font-semibold gap-2 border-border/60 hover:bg-muted cursor-pointer"
                onClick={handleUndo}
                disabled={historyLength <= 1}
              >
                <Undo className="w-3.5 h-3.5" />
                تراجع
              </Button>
            </div>
          </div>

          {/* مساحة الرسم - Main Canvas Area */}
          <div 
            ref={containerRef}
            className="flex-1 bg-black/5 dark:bg-white/5 relative overflow-hidden select-none flex items-center justify-center touch-none"
            style={{ 
              backgroundImage: 'radial-gradient(circle, #00000010 1px, transparent 1px)',
              backgroundSize: '20px 20px',
              cursor: (tool === "pan" || isSpacePressed) ? "grab" : "crosshair"
            }}
            onMouseEnter={() => setCursorPos((p) => ({ ...p, visible: true }))}
            onMouseLeave={() => {
              handlePointerUp();
              setCursorPos((p) => ({ ...p, visible: false }));
            }}
            onMouseDown={handlePointerDown}
            onMouseMove={(e) => {
              setCursorPos({ x: e.clientX, y: e.clientY, visible: true });
              handlePointerMove(e);
            }}
            onMouseUp={handlePointerUp}
            onTouchStart={handlePointerDown}
            onTouchMove={handlePointerMove}
            onTouchEnd={handlePointerUp}
          >
            {/* Dynamic Brush Cursor Circle */}
            {cursorPos.visible && tool !== "pan" && tool !== "magic" && (
              <div
                className="fixed pointer-events-none rounded-full border border-white/90 shadow-[0_0_8px_rgba(0,0,0,0.6)] z-50 -translate-x-1/2 -translate-y-1/2"
                style={{
                  left: cursorPos.x,
                  top: cursorPos.y,
                  width: Math.max(6, brushSize * scale),
                  height: Math.max(6, brushSize * scale),
                  backgroundColor: tool === "erase" ? "rgba(239,68,68,0.2)" : tool === "defringe" ? "rgba(168,85,247,0.2)" : "rgba(34,197,94,0.2)",
                }}
              />
            )}

            {/* Background container for inspection */}
            <div 
              className="relative shadow-2xl transition-transform duration-75 ease-out"
              style={{
                transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`,
                transformOrigin: 'center center',
                backgroundImage:
                  previewBg === "checker"
                    ? 'repeating-conic-gradient(#80808033 0% 25%, transparent 0% 50%)'
                    : undefined,
                backgroundColor:
                  previewBg === "white"
                    ? "#ffffff"
                    : previewBg === "black"
                    ? "#09090b"
                    : previewBg === "blue"
                    ? "#1d4ed8"
                    : undefined,
                backgroundSize: '20px 20px',
                backgroundPosition: '0 0, 10px 10px',
                pointerEvents: 'none',
                maxWidth: '90%',
                maxHeight: '90%',
                width: '100%',
                height: '100%',
                aspectRatio: originalImage ? `${originalImage.width} / ${originalImage.height}` : 'auto'
              }}
            >
              <canvas
                ref={canvasRef}
                width={originalImage?.width || 300}
                height={originalImage?.height || 150}
                className="w-full h-full block object-contain"
              />
            </div>
          </div>
        </div>

        <DialogFooter className="p-4 border-t border-border/40 bg-muted/10 shrink-0 flex items-center justify-between sm:justify-between">
          <Button variant="ghost" onClick={() => onOpenChange(false)} className="text-xs font-semibold hover:bg-red-500/10 hover:text-red-600">
            <X className="w-4 h-4 ml-1.5" /> إلغاء
          </Button>
          <Button onClick={handleSave} disabled={isSaving} className="text-xs font-bold px-6 shadow-md shadow-primary/20">
            {isSaving ? "جاري الحفظ..." : "حفظ التعديلات"}
            <Save className="w-4 h-4 mr-1.5" />
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
