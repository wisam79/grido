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
import { Scissors, Maximize2, RotateCw, ZoomIn, ZoomOut, Info } from "lucide-react";
import { useEditorStore } from "@/lib/editor-store";
import { useShallow } from "zustand/react/shallow";

interface CropDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  imageSrc: string;
  onCropSave: (croppedBase64: string) => void;
}

export function CropDialog({ open, onOpenChange, imageSrc, onCropSave }: CropDialogProps) {
  const { template } = useEditorStore(useShallow((state) => ({ template: state.template })));
  const cropperRef = useRef<ReactCropperElement>(null);
  
  // تحديد نسبة العرض إلى الارتفاع الافتراضية
  const templateAspect = template ? template.width / template.height : undefined;
  
  const [prevOpen, setPrevOpen] = useState(open);
  const [aspect, setAspect] = useState<number | undefined>(templateAspect);

  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setAspect(templateAspect);
    }
  }

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
      // الحصول على الصورة المقصوصة بجودة عالية
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-hidden flex flex-col rounded-2xl border border-border/60 bg-card p-5" dir="rtl">
        <DialogHeader className="pb-3 border-b border-border/30">
          <DialogTitle className="flex items-center gap-2 text-base font-bold text-foreground">
            <Scissors className="w-4.5 h-4.5 text-primary" /> 
            <span>قص وتدوير الصورة</span>
          </DialogTitle>
          <DialogDescription className="text-[10px] text-muted-foreground mt-0.5">
            اسحب زوايا مربع التحديد لقص الصورة بالأبعاد التي تفضلها.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col md:flex-row gap-5 py-4">
          {/* منطقة الكروبير */}
          <div className="flex-1 bg-zinc-950/80 dark:bg-black/40 rounded-xl overflow-hidden flex items-center justify-center min-h-[320px] border border-border/40 relative shadow-inner p-1.5">
            {open && (
              <Cropper
                src={imageSrc}
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

          {/* لوحة التحكم الجانبية */}
          <div className="w-full md:w-52 flex flex-col justify-between gap-4 shrink-0">
            <div className="space-y-4">
              {/* نسب القص */}
              <div className="space-y-2">
                <Label className="text-[10px] font-bold text-muted-foreground flex items-center gap-1.5">
                  <Maximize2 className="w-3.5 h-3.5" /> 
                  <span>نسبة أبعاد القص</span>
                </Label>
                <div className="grid grid-cols-2 gap-1.5">
                  <Button
                    variant={aspect === undefined ? "default" : "outline"}
                    size="sm"
                    className="text-[10.5px] h-8 rounded-lg cursor-pointer"
                    onClick={() => setAspect(undefined)}
                  >
                    حر
                  </Button>
                  <Button
                    variant={aspect === 1 ? "default" : "outline"}
                    size="sm"
                    className="text-[10.5px] h-8 rounded-lg cursor-pointer"
                    onClick={() => setAspect(1)}
                  >
                    1:1 (مربع)
                  </Button>
                  <Button
                    variant={aspect === 16/9 ? "default" : "outline"}
                    size="sm"
                    className="text-[10.5px] h-8 rounded-lg cursor-pointer"
                    onClick={() => setAspect(16/9)}
                  >
                    16:9 (عرضي)
                  </Button>
                  <Button
                    variant={aspect === 9/16 ? "default" : "outline"}
                    size="sm"
                    className="text-[10.5px] h-8 rounded-lg cursor-pointer"
                    onClick={() => setAspect(9/16)}
                  >
                    9:16 (طولي)
                  </Button>
                  <Button
                    variant={aspect === 4/3 ? "default" : "outline"}
                    size="sm"
                    className="text-[10.5px] h-8 rounded-lg cursor-pointer"
                    onClick={() => setAspect(4/3)}
                  >
                    4:3 (عرضي)
                  </Button>
                  <Button
                    variant={aspect === 3/4 ? "default" : "outline"}
                    size="sm"
                    className="text-[10.5px] h-8 rounded-lg cursor-pointer"
                    onClick={() => setAspect(3/4)}
                  >
                    3:4 (طولي)
                  </Button>
                  {templateAspect && (
                    <Button
                      variant={aspect === templateAspect ? "default" : "outline"}
                      size="sm"
                      className="text-[10px] h-8.5 col-span-2 font-bold rounded-lg border-primary/20 hover:border-primary/40 cursor-pointer"
                      onClick={() => setAspect(templateAspect)}
                    >
                      أبعاد القالب ({template?.name.split(" · ")[1] || "القياسية"})
                    </Button>
                  )}
                </div>
              </div>

              {/* أدوات التحكم الإضافية */}
              <div className="space-y-2">
                <Label className="text-[10px] font-bold text-muted-foreground">أدوات إضافية</Label>
                <div className="flex gap-1.5 bg-muted/40 dark:bg-muted/20 p-1.5 rounded-lg border border-border/40 w-fit">
                  <Button variant="ghost" size="icon" className="h-8 w-8 rounded-md hover:bg-background cursor-pointer" onClick={handleRotate} title="تدوير 90 درجة">
                    <RotateCw className="w-3.5 h-3.5 text-foreground/80" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 rounded-md hover:bg-background cursor-pointer" onClick={() => handleZoom(0.1)} title="تكبير">
                    <ZoomIn className="w-3.5 h-3.5 text-foreground/80" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 rounded-md hover:bg-background cursor-pointer" onClick={() => handleZoom(-0.1)} title="تصغير">
                    <ZoomOut className="w-3.5 h-3.5 text-foreground/80" />
                  </Button>
                </div>
              </div>
            </div>

            {/* صندوق النصائح */}
            <div className="flex gap-1.5 p-3 rounded-xl bg-amber-500/[0.03] dark:bg-amber-500/[0.05] border border-amber-500/10 text-[10px] text-amber-600 dark:text-amber-400 leading-normal font-medium">
              <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              <span>سيتم استبدال الصورة بنسختها المقصوصة مع الحفاظ على بقية فلاترها وتعديلاتها الحالية.</span>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 border-t border-border/30 pt-3 flex items-center justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="rounded-lg h-9 text-xs font-semibold cursor-pointer">
            إلغاء
          </Button>
          <Button 
            onClick={handleCrop} 
            className="rounded-lg h-9 text-xs font-bold gap-1.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white border-0 shadow-md shadow-indigo-500/10 hover:shadow-indigo-500/20 transition-all cursor-pointer"
          >
            <Scissors className="w-3.5 h-3.5" /> 
            <span>حفظ القص</span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
