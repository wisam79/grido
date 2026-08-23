import { useRef, useState, useEffect } from "react";
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
import { Cropper, ReactCropperElement } from "react-cropper";
import "cropperjs/dist/cropper.css";
import { Scissors, Maximize2, RotateCw, ZoomIn, ZoomOut, RotateCcw, RefreshCw, Check, Sparkles, Compass } from "lucide-react";
import { useEditorStore } from "@/lib/editor-store";
import { useShallow } from "zustand/react/shallow";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface CropDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  imageSrc: string;
  originalImageSrc?: string;
  onCropSave: (croppedBase64: string, dims?: { width: number; height: number }) => void;
}

export function CropDialog({ open, onOpenChange, imageSrc, originalImageSrc, onCropSave }: CropDialogProps) {
  const { template } = useEditorStore(useShallow((state) => ({ template: state.template })));
  const cropperRef = useRef<ReactCropperElement>(null);
  
  // تحديد نسبة العرض إلى الارتفاع الافتراضية
  const templateAspect =
    template && template.width > 0 && template.height > 0 ? template.width / template.height : undefined;
  
  const [aspect, setAspect] = useState<number | undefined>(templateAspect);
  const [currentSrc, setCurrentSrc] = useState(imageSrc);
  const [straightenAngle, setStraightenAngle] = useState(0);
  const [baseRotation, setBaseRotation] = useState(0);

  // إعادة ضبط الحالة عند فتح النافذة أو تغيير الصورة
  useEffect(() => {
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setAspect(templateAspect);
      setCurrentSrc(imageSrc);
      setStraightenAngle(0);
      setBaseRotation(0);
    }
  }, [open, imageSrc, templateAspect]);

  const handleRestoreOriginal = () => {
    if (originalImageSrc) {
      setCurrentSrc(originalImageSrc);
      setStraightenAngle(0);
      setBaseRotation(0);
    }
  };

  const handleResetCrop = () => {
    cropperRef.current?.cropper.reset();
    setAspect(templateAspect);
    setStraightenAngle(0);
    setBaseRotation(0);
  };

  const handleStraightenChange = (angle: number) => {
    setStraightenAngle(angle);
    const cropper = cropperRef.current?.cropper;
    if (cropper) {
      cropper.rotateTo(baseRotation + angle);
    }
  };

  // تحديث نسبة أبعاد المربع يدوياً في كروبرجي إس عند تغير الخيار في واجهة React
  useEffect(() => {
    const cropper = cropperRef.current?.cropper;
    if (cropper) {
      cropper.setAspectRatio(aspect === undefined ? NaN : aspect);
    }
  }, [aspect]);

  const handleCrop = () => {
    const cropper = cropperRef.current?.cropper;
    if (cropper) {
      const croppedCanvas = cropper.getCroppedCanvas({
        imageSmoothingEnabled: true,
        imageSmoothingQuality: "high",
      });
      if (croppedCanvas && croppedCanvas.width > 0 && croppedCanvas.height > 0) {
        onCropSave(croppedCanvas.toDataURL(), {
          width: croppedCanvas.width,
          height: croppedCanvas.height,
        });
        onOpenChange(false);
      } else {
        toast.error("حدد منطقة قص صالحة");
      }
    }
  };

  const handleRotate = () => {
    const newBase = (baseRotation + 90) % 360;
    setBaseRotation(newBase);
    const cropper = cropperRef.current?.cropper;
    if (cropper) {
      cropper.rotateTo(newBase + straightenAngle);
    }
  };

  const handleZoom = (factor: number) => {
    const cropper = cropperRef.current?.cropper;
    if (cropper) {
      cropper.zoom(factor);
    }
  };

  const aspectOptions = [
    { label: "حر", value: undefined },
    { label: "1:1 مربع", value: 1 },
    { label: "3:4 طولي", value: 3 / 4 },
    { label: "4:3 عرضي", value: 4 / 3 },
    { label: "9:16 طولي", value: 9 / 16 },
    { label: "16:9 عرضي", value: 16 / 9 },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[1140px] w-[88vw] h-[84vh] max-h-[88vh] overflow-hidden flex flex-col rounded-2xl border border-border/80 dark:border-white/10 bg-card/98 backdrop-blur-2xl p-3 shadow-xl transition-all duration-150 fluent-specular" dir="rtl">
        {/* هيدر النافذة */}
        <DialogHeader className="pb-2 border-b border-border/40 flex flex-row items-center justify-between shrink-0">
          <div>
            <DialogTitle className="flex items-center gap-2 text-base font-bold text-foreground">
              <div className="p-1.5 rounded-lg bg-primary/10 text-primary border border-primary/20 shadow-2xs">
                <Scissors className="w-4 h-4" />
              </div>
              <span>قص وتدوير الصورة</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground mt-0.5">
              قص وتدوير وضبط استقامة الصورة
            </DialogDescription>
          </div>
        </DialogHeader>

        {/* محتوى النافذة الرئيسي - يستغل 100% من المساحة المتاحة */}
        <div className="flex-1 overflow-hidden flex flex-col md:flex-row gap-3 py-1.5 min-h-0 h-full">
          {/* منطقة الكانفس الخاصة بالقص - التوسع الديناميكي الكامل */}
          <div className="flex-1 bg-zinc-950/90 dark:bg-black/80 rounded-xl overflow-hidden flex items-center justify-center h-full min-h-0 border border-border/40 relative shadow-inner p-1.5">
            {open && (
              <Cropper
                src={currentSrc}
                style={{ height: "100%", width: "100%", minHeight: "100%" }}
                className="h-full w-full"
                aspectRatio={aspect}
                guides={true}
                ref={cropperRef}
                viewMode={1}
                background={false}
                responsive={true}
                autoCropArea={0.95}
                checkOrientation={false}
              />
            )}
          </div>

          {/* لوحة التحكم الجانبية المتناسقة مع الأزرار دون تشوه */}
          <div className="w-full md:w-52 flex flex-col gap-3 shrink-0 bg-card/60 dark:bg-card/40 p-3 rounded-xl border border-border/40 overflow-y-auto h-full min-h-0 fluent-specular">
            {/* 1. أدوات التكبير والتدوير */}
            <div className="space-y-2">
              <Label className="text-[11px] font-bold text-foreground/90 flex items-center gap-1.5">
                <RotateCw className="w-3.5 h-3.5 text-primary" />
                <span>أدوات التحكم</span>
              </Label>
              
              <div className="grid grid-cols-3 gap-1 p-1 bg-muted/40 dark:bg-muted/20 rounded-xl border border-border/30">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-full rounded-md hover:bg-accent/60 cursor-pointer flex items-center justify-center gap-1 text-xs font-semibold"
                      onClick={handleRotate}
                    >
                      <RotateCw className="w-3.5 h-3.5 text-primary" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="top">تدوير 90°</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-full rounded-md hover:bg-accent/60 cursor-pointer flex items-center justify-center gap-1 text-xs font-semibold"
                      onClick={() => handleZoom(0.1)}
                    >
                      <ZoomIn className="w-3.5 h-3.5 text-foreground/80" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="top">تكبير</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-full rounded-md hover:bg-accent/60 cursor-pointer flex items-center justify-center gap-1 text-xs font-semibold"
                      onClick={() => handleZoom(-0.1)}
                    >
                      <ZoomOut className="w-3.5 h-3.5 text-foreground/80" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="top">تصغير</TooltipContent>
                </Tooltip>
              </div>
            </div>

            {/* 1.5 ضبط استقامة الزوايا الدقيقة */}
            <div className="space-y-2 bg-muted/20 p-2.5 rounded-xl border border-border/40">
              <div className="flex justify-between items-center">
                <Label className="text-[11px] font-bold text-foreground/90 flex items-center gap-1">
                  <Compass className="w-3.5 h-3.5 text-primary" />
                  <span>استقامة الزاوية</span>
                </Label>
                <span className="text-[10px] font-mono font-bold text-primary">{straightenAngle > 0 ? `+${straightenAngle}°` : `${straightenAngle}°`}</span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="range"
                  min="-45"
                  max="45"
                  step="0.5"
                  value={straightenAngle}
                  onChange={(e) => handleStraightenChange(parseFloat(e.target.value))}
                  className="w-full accent-primary cursor-pointer h-1.5 bg-muted rounded-lg"
                />
                {straightenAngle !== 0 && (
                  <button
                    type="button"
                    onClick={() => handleStraightenChange(0)}
                    className="text-[10px] text-muted-foreground hover:text-primary underline shrink-0 cursor-pointer"
                  >
                    تصفير
                  </button>
                )}
              </div>
            </div>

            {/* 2. نسب أبعاد القص */}
            <div className="space-y-2">
              <Label className="text-[11px] font-bold text-foreground/90 flex items-center gap-1.5">
                <Maximize2 className="w-3.5 h-3.5 text-primary" /> 
                <span>نسبة الأبعاد</span>
              </Label>

              <div className="grid grid-cols-2 gap-1.5">
                {aspectOptions.map((opt) => {
                  const isSelected = aspect === opt.value;
                  return (
                    <Button
                      key={opt.label}
                      variant={isSelected ? "default" : "outline"}
                      size="sm"
                      className={cn(
                        "text-xs h-8 rounded-md cursor-pointer font-semibold transition-all border-border/80",
                        isSelected
                          ? "bg-primary text-primary-foreground shadow-2xs"
                          : "hover:bg-accent/60 text-foreground/80"
                      )}
                      onClick={() => setAspect(opt.value)}
                    >
                      {opt.label}
                    </Button>
                  );
                })}

                {templateAspect && (
                  <Button
                    variant={aspect === templateAspect ? "default" : "outline"}
                    size="sm"
                    className={cn(
                      "text-xs h-8 col-span-2 font-semibold rounded-md border-primary/40 cursor-pointer flex items-center justify-center gap-1.5 transition-all mt-0.5",
                      aspect === templateAspect
                        ? "bg-primary text-primary-foreground shadow-2xs"
                        : "hover:bg-primary/10 text-primary border-primary/30"
                    )}
                    onClick={() => setAspect(templateAspect)}
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>أبعاد القالب ({template?.name.split(" · ")[1] || "القياسية"})</span>
                  </Button>
                )}
              </div>
            </div>

            {/* 3. إرجاع وضبط */}
            <div className="space-y-2 pt-2 border-t border-border/30">
              <Label className="text-xs font-bold text-foreground/90 block">الضبط والإرجاع</Label>
              
              <div className="grid grid-cols-1 gap-1.5">
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs h-8 rounded-md cursor-pointer flex items-center justify-center gap-2 w-full text-foreground/90 border-border/80 hover:bg-accent/60 font-medium"
                  onClick={handleResetCrop}
                  title="إعادة تحديد القص والتدوير للحالة الكاملة الأولية"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-primary shrink-0" />
                  <span>إعادة ضبط القص</span>
                </Button>

                {originalImageSrc && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs h-8 rounded-md cursor-pointer flex items-center justify-center gap-2 w-full text-primary border-primary/30 hover:border-primary/50 hover:bg-primary/10 font-semibold"
                    onClick={handleRestoreOriginal}
                    title="استرجاع الصورة الأصلية الكاملة"
                  >
                    <RotateCcw className="w-3.5 h-3.5 shrink-0" />
                    <span>استعادة الأصل</span>
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* فوتر النافذة */}
        <DialogFooter className="gap-2 border-t border-border/40 pt-3 flex items-center justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="rounded-md h-8 px-4 text-xs font-semibold cursor-pointer">
            إلغاء
          </Button>
          <Button
            onClick={handleCrop}
            className="rounded-md h-8 px-5 text-xs font-semibold gap-1.5 cursor-pointer bg-primary hover:bg-primary/90 text-primary-foreground shadow-xs transition-all active:scale-[0.98]"
          >
            <Check className="w-3.5 h-3.5" />
            <span>تطبيق القص</span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
