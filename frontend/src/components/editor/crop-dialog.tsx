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
import { Scissors, Maximize2, RefreshCw, ZoomIn, ZoomOut } from "lucide-react";
import { useEditorStore } from "@/lib/editor-store";

interface CropDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  imageSrc: string;
  onCropSave: (croppedBase64: string) => void;
}

export function CropDialog({ open, onOpenChange, imageSrc, onCropSave }: CropDialogProps) {
  const { template } = useEditorStore();
  const cropperRef = useRef<ReactCropperElement>(null);
  
  // تحديد نسبة العرض إلى الارتفاع الافتراضية
  const templateAspect = template ? template.width / template.height : undefined;
  const [aspect, setAspect] = useState<number | undefined>(templateAspect);

  useEffect(() => {
    if (open) {
      setAspect(templateAspect);
    }
  }, [open, templateAspect]);

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
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Scissors className="w-5 h-5 text-primary" /> قص وتدوير الصورة
          </DialogTitle>
          <DialogDescription>
            اسحب زوايا المربع لتحديد منطقة القص، ويمكنك اختيار نسبة أبعاد محددة.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col md:flex-row gap-4 p-1">
          {/* منطقة الكروبير */}
          <div className="flex-1 bg-slate-900 rounded-lg overflow-hidden flex items-center justify-center min-h-[300px]">
            {open && (
              <Cropper
                src={imageSrc}
                style={{ height: "400px", width: "100%" }}
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
          <div className="w-full md:w-48 flex flex-col justify-between gap-4 shrink-0">
            <div className="space-y-4">
              {/* نسب القص */}
              <div className="space-y-2">
                <Label className="text-xs font-bold text-muted-foreground flex items-center gap-1.5">
                  <Maximize2 className="w-4.5 h-4.5" /> نسبة أبعاد القص
                </Label>
                <div className="grid grid-cols-2 gap-1.5">
                  <Button
                    variant={aspect === undefined ? "default" : "outline"}
                    size="sm"
                    className="text-xs h-8"
                    onClick={() => setAspect(undefined)}
                  >
                    حر
                  </Button>
                  <Button
                    variant={aspect === 1 ? "default" : "outline"}
                    size="sm"
                    className="text-xs h-8"
                    onClick={() => setAspect(1)}
                  >
                    1:1 (مربع)
                  </Button>
                  <Button
                    variant={aspect === 4/3 ? "default" : "outline"}
                    size="sm"
                    className="text-xs h-8"
                    onClick={() => setAspect(4/3)}
                  >
                    4:3
                  </Button>
                  <Button
                    variant={aspect === 16/9 ? "default" : "outline"}
                    size="sm"
                    className="text-xs h-8"
                    onClick={() => setAspect(16/9)}
                  >
                    16:9
                  </Button>
                  {templateAspect && (
                    <Button
                      variant={aspect === templateAspect ? "default" : "outline"}
                      size="sm"
                      className="text-xs h-8 col-span-2 text-[10px] font-bold"
                      onClick={() => setAspect(templateAspect)}
                    >
                      أبعاد القالب ({template?.name.split(" · ")[1] || "القياسية"})
                    </Button>
                  )}
                </div>
              </div>

              {/* أدوات التحكم الإضافية */}
              <div className="space-y-2">
                <Label className="text-xs font-bold text-muted-foreground">أدوات تحكم</Label>
                <div className="flex gap-2">
                  <Button variant="outline" size="icon" className="h-9 w-9" onClick={handleRotate} title="تدوير 90 درجة">
                    <RefreshCw className="w-4 h-4" />
                  </Button>
                  <Button variant="outline" size="icon" className="h-9 w-9" onClick={() => handleZoom(0.1)} title="تكبير">
                    <ZoomIn className="w-4 h-4" />
                  </Button>
                  <Button variant="outline" size="icon" className="h-9 w-9" onClick={() => handleZoom(-0.1)} title="تصغير">
                    <ZoomOut className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>

            <div className="text-[11px] text-muted-foreground bg-muted/40 p-2.5 rounded-lg border border-border/20">
              ملاحظة: سيتم استبدال الصورة الحالية بالنسخة المقصوصة مع الحفاظ على الفلاتر والتعديلات المطبقة عليها.
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            إلغاء
          </Button>
          <Button onClick={handleCrop} className="gap-1.5">
            <Scissors className="w-4 h-4" /> حفظ القص
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
