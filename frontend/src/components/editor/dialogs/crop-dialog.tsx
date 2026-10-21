import { useRef, useState, useEffect } from 'react';
import { Cropper } from 'react-cropper';
import { toast } from 'sonner';
import { useShallow } from 'zustand/react/shallow';

import { FluentSliderField } from '@/components/ui/blocks';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogCloseButton,
} from '@/components/ui/dialog';
import {
  ArrowClockwise,
  MagnifyingGlassPlus,
  MagnifyingGlassMinus,
  ArrowCounterClockwise,
  Sparkle,
  Compass,
  CircleNotch,
} from '@/components/ui/icons';
import { Label } from '@/components/ui/label';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useEditorStore } from '@/lib/editor-store';
import { uploadCanvasBlob } from '@/lib/io/media-upload';
import { cn } from '@/lib/utils';
import { wailsIsDesktop } from '@/lib/wails-env';

import type { ReactCropperElement } from 'react-cropper';

import 'cropperjs/dist/cropper.css';

interface CropDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  imageSrc: string;
  originalImageSrc?: string;
  onCropSave: (croppedBase64: string, dims?: { width: number; height: number }) => void;
}

export function CropDialog({
  open,
  onOpenChange,
  imageSrc,
  originalImageSrc,
  onCropSave,
}: CropDialogProps) {
  const { template } = useEditorStore(useShallow((state) => ({ template: state.template })));
  const cropperRef = useRef<ReactCropperElement>(null);

  // تحديد نسبة العرض إلى الارتفاع الافتراضية
  const templateAspect =
    template && template.width > 0 && template.height > 0
      ? template.width / template.height
      : undefined;

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

  const [isSaving, setIsSaving] = useState(false);

  const handleCrop = async () => {
    const cropper = cropperRef.current?.cropper;
    if (cropper) {
      const croppedCanvas = cropper.getCroppedCanvas({
        imageSmoothingEnabled: true,
        imageSmoothingQuality: 'high',
      });
      if (croppedCanvas && croppedCanvas.width > 0 && croppedCanvas.height > 0) {
        setIsSaving(true);
        try {
          let finalPath = '';
          if (wailsIsDesktop()) {
            const uploadRes = await uploadCanvasBlob(
              croppedCanvas,
              'image/png',
              undefined,
              'cropped.png',
            );
            if (uploadRes?.imageSrc) {
              finalPath = uploadRes.imageSrc;
            }
          }
          if (!finalPath) {
            finalPath = croppedCanvas.toDataURL();
          }
          onCropSave(finalPath, {
            width: croppedCanvas.width,
            height: croppedCanvas.height,
          });
          onOpenChange(false);
        } catch {
          toast.error('فشل حفظ الصورة المقصوصة');
        } finally {
          setIsSaving(false);
        }
      } else {
        toast.error('حدد منطقة قص صالحة');
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
    { label: 'حر', value: undefined },
    { label: '1:1 مربع', value: 1 },
    { label: '3:4 طولي', value: 3 / 4 },
    { label: '4:3 عرضي', value: 4 / 3 },
    { label: '9:16 طولي', value: 9 / 16 },
    { label: '16:9 عرضي', value: 16 / 9 },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="sm:max-w-[1140px] w-[88vw] h-[84vh] max-h-[88vh] overflow-hidden flex flex-col rounded-xl border border-border bg-card p-5 sm:p-6 shadow-fluent-16 transition-colors duration-150 fluent-specular"
        dir="rtl"
      >
        {/* هيدر النافذة */}
        <DialogHeader className="pb-2.5 border-b border-border/40 flex flex-row items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="min-w-0">
              <DialogTitle className="text-base font-bold text-foreground truncate">
                قص وتدوير الصورة
              </DialogTitle>
            </div>
          </div>
          <DialogCloseButton />
        </DialogHeader>

        {/* محتوى النافذة الرئيسي - يستغل 100% من المساحة المتاحة */}
        {/* 🛡️ عمود الجوال: h-full المزدوج كان ≈200% فيحجب الفوتر — ارتفاعات
            تلقائية + سقف للشريط الجانبي مع تمريره الداخلي */}
        <div className="flex-1 overflow-hidden flex flex-col md:flex-row gap-3 py-1.5 min-h-0 md:h-full">
          {/* منطقة الكانفس الخاصة بالقص - التوسع الديناميكي الكامل */}
          <div className="flex-1 bg-muted rounded-md overflow-hidden flex items-center justify-center h-64 sm:h-72 md:h-full min-h-0 border border-border/40 relative shadow-inner p-1.5">
            {open && (
              <Cropper
                src={currentSrc}
                style={{ height: '100%', width: '100%', minHeight: '100%' }}
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
          <div className="w-full md:w-52 flex flex-col gap-3 shrink-0 bg-card/60 dark:bg-card/40 p-3 rounded-md border border-border/40 overflow-y-auto h-auto md:h-full min-h-0 max-h-[38vh] md:max-h-none fluent-specular">
            {/* 1. أدوات التكبير والتدوير */}
            <div className="space-y-2">
              <Label
                id="crop-controls-label"
                className="text-xs font-bold text-foreground/90 flex items-center gap-1.5"
              >
                <ArrowClockwise className="text-primary w-3.5 h-3.5 shrink-0" weight="bold" />
                <span>أدوات التحكم</span>
              </Label>

              <div
                role="group"
                aria-labelledby="crop-controls-label"
                className="grid grid-cols-3 gap-1 p-1 bg-muted/40 dark:bg-muted/20 rounded-md border border-border/30"
              >
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-full rounded-md hover:bg-accent/60 cursor-pointer flex items-center justify-center gap-1 text-xs font-semibold"
                      onClick={handleRotate}
                    >
                      <ArrowClockwise className="text-primary w-3.5 h-3.5 shrink-0" weight="bold" />
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
                      <MagnifyingGlassPlus className="text-foreground/80 w-3.5 h-3.5 shrink-0" />
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
                      <MagnifyingGlassMinus className="text-foreground/80 w-3.5 h-3.5 shrink-0" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="top">تصغير</TooltipContent>
                </Tooltip>
              </div>
            </div>

            {/* 1.5 ضبط استقامة الزوايا الدقيقة */}
            <div className="space-y-2 bg-muted/20 p-2.5 rounded-md border border-border/40">
              <FluentSliderField
                label="استقامة الزاوية"
                icon={<Compass className="text-primary w-3.5 h-3.5 shrink-0" weight="duotone" />}
                value={straightenAngle}
                min={-45}
                max={45}
                step={0.5}
                valueFormatter={(val) => (val > 0 ? `+${val}°` : `${val}°`)}
                onChange={handleStraightenChange}
              />
              {straightenAngle !== 0 && (
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => handleStraightenChange(0)}
                    className="text-micro text-muted-foreground hover:text-primary underline shrink-0 cursor-pointer font-semibold"
                  >
                    تصفير
                  </button>
                </div>
              )}
            </div>

            {/* 2. نسب أبعاد القص */}
            <div className="space-y-2">
              <Label
                id="crop-aspect-label"
                className="text-xs font-bold text-foreground/90 flex items-center gap-1.5"
              >
                <span>نسبة الأبعاد</span>
              </Label>

              <div
                role="group"
                aria-labelledby="crop-aspect-label"
                className="grid grid-cols-2 gap-1.5"
              >
                {aspectOptions.map((opt) => {
                  const isSelected = aspect === opt.value;
                  return (
                    <Button
                      key={opt.label}
                      variant={isSelected ? 'default' : 'outline'}
                      size="sm"
                      className={cn(
                        'text-xs h-8 rounded-md cursor-pointer font-semibold transition-colors border-border/80',
                        isSelected
                          ? 'bg-primary text-primary-foreground shadow-2xs'
                          : 'hover:bg-accent/60 text-foreground/80',
                      )}
                      onClick={() => setAspect(opt.value)}
                    >
                      {opt.label}
                    </Button>
                  );
                })}

                {templateAspect && (
                  <Button
                    variant={aspect === templateAspect ? 'default' : 'outline'}
                    size="sm"
                    className={cn(
                      'text-xs h-8 col-span-2 font-semibold rounded-md border-primary/40 cursor-pointer flex items-center justify-center gap-1.5 transition-colors mt-0.5',
                      aspect === templateAspect
                        ? 'bg-primary text-primary-foreground shadow-2xs'
                        : 'hover:bg-primary/10 text-primary border-primary/30',
                    )}
                    onClick={() => setAspect(templateAspect)}
                  >
                    <Sparkle className="w-3.5 h-3.5 shrink-0" weight="fill" />
                    <span>أبعاد القالب ({template?.name.split(' · ')[1] || 'القياسية'})</span>
                  </Button>
                )}
              </div>
            </div>

            {/* 3. إرجاع وضبط */}
            <div className="space-y-2 pt-2 border-t border-border/30">
              <Label id="crop-reset-label" className="text-xs font-bold text-foreground/90 block">
                الضبط والإرجاع
              </Label>

              <div
                role="group"
                aria-labelledby="crop-reset-label"
                className="grid grid-cols-1 gap-1.5"
              >
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs h-8 rounded-md cursor-pointer flex items-center justify-center gap-2 w-full text-foreground/90 border-border/80 hover:bg-accent/60 font-medium"
                  onClick={handleResetCrop}
                  title="إعادة ضبط القص والتدوير"
                >
                  <ArrowCounterClockwise className="text-primary w-3.5 h-3.5 shrink-0" />
                  <span>إعادة ضبط</span>
                </Button>

                {originalImageSrc && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs h-8 rounded-md cursor-pointer flex items-center justify-center gap-2 w-full text-primary border-primary/30 hover:border-primary/50 hover:bg-primary/10 font-semibold"
                    onClick={handleRestoreOriginal}
                    title="استعادة الصورة الأصلية"
                  >
                    <ArrowCounterClockwise className="w-3.5 h-3.5 shrink-0" />
                    <span>استعادة الأصل</span>
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* فوتر النافذة */}
        <DialogFooter className="gap-2 border-t border-border/40 pt-3 flex items-center justify-end">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="rounded-md h-8 px-4 text-xs font-semibold cursor-pointer"
          >
            إلغاء
          </Button>
          <Button
            onClick={handleCrop}
            disabled={isSaving}
            className="rounded-md h-8 px-5 text-xs font-semibold gap-1.5 cursor-pointer bg-primary hover:bg-primary/90 text-primary-foreground shadow-xs transition-colors"
          >
            {isSaving && <CircleNotch className="w-3.5 h-3.5 animate-spin" />}
            <span>{isSaving ? 'جاري الحفظ...' : 'تطبيق القص'}</span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
