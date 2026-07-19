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
import { Scissors, Maximize2, RotateCw, ZoomIn, ZoomOut, Info, RotateCcw, RefreshCw, Check, Sparkles } from "lucide-react";
import { useEditorStore } from "@/lib/editor-store";
import { useShallow } from "zustand/react/shallow";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface CropDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  imageSrc: string;
  originalImageSrc?: string;
  onCropSave: (croppedBase64: string) => void;
}

export function CropDialog({ open, onOpenChange, imageSrc, originalImageSrc, onCropSave }: CropDialogProps) {
  const { template } = useEditorStore(useShallow((state) => ({ template: state.template })));
  const cropperRef = useRef<ReactCropperElement>(null);
  
  // تحديد نسبة العرض إلى الارتفاع الافتراضية
  const templateAspect = template ? template.width / template.height : undefined;
  
  const [prevOpen, setPrevOpen] = useState(open);
  const [aspect, setAspect] = useState<number | undefined>(templateAspect);
  const [currentSrc, setCurrentSrc] = useState(imageSrc);

  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setAspect(templateAspect);
      setCurrentSrc(imageSrc);
    }
  }

  const handleRestoreOriginal = () => {
    if (originalImageSrc) {
      setCurrentSrc(originalImageSrc);
    }
  };

  const handleResetCrop = () => {
    cropperRef.current?.cropper.reset();
    setAspect(templateAspect);
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
      if (croppedCanvas) {
        onCropSave(croppedCanvas.toDataURL());
        onOpenChange(false);
      }
    }
  };

  const handleRotate = () => {
    const cropper = cropperRef.current?.cropper;
    if (cropper) {
      cropper.rotate(90);
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
      <DialogContent className="sm:max-w-[1050px] w-[90vw] max-h-[90vh] overflow-hidden flex flex-col rounded-2xl border border-border/60 bg-card/95 backdrop-blur-md p-5 shadow-2xl" dir="rtl">
        {/* هيدر النافذة */}
        <DialogHeader className="pb-3 border-b border-border/40 flex flex-row items-center justify-between shrink-0">
          <div>
            <DialogTitle className="flex items-center gap-2 text-base font-bold text-foreground">
              <div className="p-1.5 rounded-lg bg-primary/10 text-primary border border-primary/20">
                <Scissors className="w-4.5 h-4.5" />
              </div>
              <span>قص وتدوير الصورة</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground mt-0.5">
              قم بضبط مربع القص وتدوير الصورة أو اختيار أبعاد جاهزة للحصول على النتيجة المطلوبة.
            </DialogDescription>
          </div>
        </DialogHeader>

        {/* محتوى النافذة الرئيسي */}
        <div className="flex-1 overflow-hidden flex flex-col md:flex-row gap-5 py-3 min-h-0">
          {/* منطقة الكانفس الخاصة بالقص */}
          <div className="flex-1 bg-zinc-950/90 dark:bg-black/60 rounded-2xl overflow-hidden flex items-center justify-center min-h-[360px] border border-border/40 relative shadow-inner p-2">
            {open && (
              <Cropper
                src={currentSrc}
                style={{ height: "380px", width: "100%" }}
                aspectRatio={aspect}
                guides={true}
                ref={cropperRef}
                viewMode={1}
                background={false}
                responsive={true}
                autoCropArea={0.9}
                checkOrientation={false}
              />
            )}
          </div>

          {/* لوحة التحكم الجانبية العريضة */}
          <div className="w-full md:w-64 flex flex-col justify-between gap-3 shrink-0 bg-muted/20 dark:bg-muted/10 p-3.5 rounded-2xl border border-border/30 overflow-y-auto">
            <div className="space-y-4">
              {/* أدوات التحكم والتكبير والتدوير */}
              <div className="space-y-2">
                <Label className="text-[11px] font-bold text-foreground/80 flex items-center justify-between">
                  <span>الأدوات والتحكم</span>
                  <span className="text-[9px] text-muted-foreground font-normal">سحب / زوم / تدوير</span>
                </Label>
                
                <TooltipProvider delayDuration={200}>
                  <div className="grid grid-cols-3 gap-1.5 p-1.5 rounded-xl bg-background/80 dark:bg-muted/30 border border-border/40">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-9 w-full rounded-lg hover:bg-accent cursor-pointer flex items-center justify-center gap-1 text-xs font-semibold"
                          onClick={handleRotate}
                        >
                          <RotateCw className="w-4 h-4 text-primary" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="top">تدوير 90° مع عقارب الساعة</TooltipContent>
                    </Tooltip>

                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-9 w-full rounded-lg hover:bg-accent cursor-pointer flex items-center justify-center gap-1 text-xs font-semibold"
                          onClick={() => handleZoom(0.1)}
                        >
                          <ZoomIn className="w-4 h-4 text-foreground/80" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="top">تكبير (Zoom In)</TooltipContent>
                    </Tooltip>

                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-9 w-full rounded-lg hover:bg-accent cursor-pointer flex items-center justify-center gap-1 text-xs font-semibold"
                          onClick={() => handleZoom(-0.1)}
                        >
                          <ZoomOut className="w-4 h-4 text-foreground/80" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="top">تصغير (Zoom Out)</TooltipContent>
                    </Tooltip>
                  </div>
                </TooltipProvider>
              </div>

              {/* نسب القص المجهزة */}
              <div className="space-y-2">
                <Label className="text-[11px] font-bold text-foreground/80 flex items-center gap-1.5">
                  <Maximize2 className="w-3.5 h-3.5 text-primary" /> 
                  <span>نسبة أبعاد القص</span>
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
                          "text-[11px] h-8.5 rounded-xl cursor-pointer font-bold transition-all",
                          isSelected
                            ? "bg-primary text-primary-foreground shadow-sm"
                            : "border-border/50 hover:bg-accent/60"
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
                        "text-[11px] h-9 col-span-2 font-bold rounded-xl border-primary/30 cursor-pointer flex items-center justify-center gap-1.5 transition-all mt-1",
                        aspect === templateAspect
                          ? "bg-primary text-primary-foreground"
                          : "hover:bg-primary/10 text-primary border-primary/20"
                      )}
                      onClick={() => setAspect(templateAspect)}
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>أبعاد القالب ({template?.name.split(" · ")[1] || "القياسية"})</span>
                    </Button>
                  )}
                </div>
              </div>

              {/* خيارات الإعادة والاستعادة */}
              <div className="space-y-2 pt-2 border-t border-border/30">
                <Label className="text-[11px] font-bold text-foreground/80 block">إعادة الضبط والإرجاع</Label>
                
                <div className="space-y-1.5">
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-[11px] h-9 rounded-xl cursor-pointer flex items-center justify-center gap-2 w-full text-foreground/90 border-border/60 hover:bg-accent/60 font-semibold"
                    onClick={handleResetCrop}
                    title="إعادة تحديد القص والتدوير للحالة الكاملة الأولية"
                  >
                    <RefreshCw className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                    <span>إعادة ضبط مربع القص ↺</span>
                  </Button>

                  {originalImageSrc && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-[11px] h-9 rounded-xl cursor-pointer flex items-center justify-center gap-2 w-full text-primary border-primary/30 hover:border-primary/50 hover:bg-primary/10 font-bold"
                      onClick={handleRestoreOriginal}
                      title="استرجاع الصورة الأصلية الكاملة"
                    >
                      <RotateCcw className="w-3.5 h-3.5 shrink-0" />
                      <span>استعادة الصورة الأصلية</span>
                    </Button>
                  )}
                </div>
              </div>
            </div>

            {/* صندوق النصائح والملاحظات */}
            <div className="flex gap-2 p-3 rounded-xl bg-amber-500/[0.05] dark:bg-amber-500/[0.08] border border-amber-500/20 text-[10.5px] text-amber-700 dark:text-amber-300 leading-normal font-medium mt-auto">
              <Info className="w-4 h-4 shrink-0 mt-0.5 text-amber-500" />
              <span>سيتم حفظ الصورة المقصوصة وتحديث العناصر دون فقدان التعديلات السابقة.</span>
            </div>
          </div>
        </div>

        {/* فوتر النافذة */}
        <DialogFooter className="gap-2.5 border-t border-border/40 pt-3.5 flex items-center justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="rounded-xl h-10 px-5 text-xs font-semibold cursor-pointer">
            إلغاء
          </Button>
          <Button
            onClick={handleCrop}
            className="rounded-xl h-10 px-6 text-xs font-bold gap-2 cursor-pointer bg-primary hover:bg-primary/90 text-primary-foreground shadow-md hover:shadow-lg transition-all active:scale-[0.98]"
          >
            <Check className="w-4 h-4" />
            <span>حفظ القص</span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
