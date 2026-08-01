import { useState, useEffect } from "react";
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
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { Download, FileJson, FileImage, Loader2 } from "lucide-react";
import { exportCanvas, downloadBlob, saveProjectAsJSON, exportSlotCanvas, applyBleedAndCropMarks } from "./export-utils";
import { useEditorStore } from "@/lib/editor-store";
import { useStageRef } from "@/lib/stage-context";
import { toast } from "sonner";

import { useShallow } from "zustand/react/shallow";

interface ExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ExportDialog({ open, onOpenChange }: ExportDialogProps) {
  const [format, setFormat] = useState<"png" | "jpg">("png");
  const [quality, setQuality] = useState(95);
  const [loading, setLoading] = useState(false);
  const [batchExport, setBatchExport] = useState(false);
  const [progress, setProgress] = useState(0);
  const [bleedMM, setBleedMM] = useState(0);
  const [showCropMarks, setShowCropMarks] = useState(false);
  const stageRef = useStageRef();
  const { template, canvasWidth, canvasHeight, mode, printSettings, slots } = useEditorStore(useShallow((state) => ({
    template: state.template,
    canvasWidth: state.canvasWidth,
    canvasHeight: state.canvasHeight,
    mode: state.mode,
    printSettings: state.printSettings,
    slots: state.slots,
  })));

  useEffect(() => {
    setLoading(false);
    setProgress(0);
  }, [open]);

  const handleExport = async () => {
    setLoading(true);
    setProgress(0);
    // نمنح المتصفح فرصة لرسم مؤشر التحميل أولاً (Paint Cycle) قبل حظر الخيط الرئيسي بالمعالجة
    setTimeout(async () => {
      try {
        if (batchExport && mode === "collage") {
          const validSlots = slots.filter(s => s.imageSrc);
          if (validSlots.length === 0) {
            toast.error("لا توجد صور في الكولاج لتصديرها");
            setLoading(false);
            return;
          }

          let successCount = 0;
          for (let i = 0; i < validSlots.length; i++) {
            const slot = validSlots[i];
            const blob = await exportSlotCanvas(slot.id, format, quality / 100);
            if (blob) {
              const ext = format === "png" ? "png" : "jpg";
              const name = `collage-photo-${i + 1}-${Date.now()}.${ext}`;
              const res = await downloadBlob(blob, name);
              if (res === "success") successCount++;
              else if (res === "") break; // ألغى المستخدم الحوار — لا نواصل الدفعة
            }
            setProgress(((i + 1) / validSlots.length) * 100);
            
            // Give browser time to process the download UI
            await new Promise(r => setTimeout(r, 250));
          }
          
          if (successCount > 0) {
            toast.success(`تم تصدير ${successCount} صورة بنجاح`);
            onOpenChange(false);
          } else {
            toast.error("تعذر تصدير الصور");
          }
        } else {
          setProgress(50);
          const blob = await exportCanvas(format, quality / 100, stageRef.current);
          if (blob) {
            const finalBlob = await applyBleedAndCropMarks(
              blob,
              bleedMM,
              showCropMarks,
              format,
              quality / 100,
              printSettings.dpi
            );
            const ext = format === "png" ? "png" : "jpg";
            const name = template
              ? `${template.widthMM}x${template.heightMM}mm-${Date.now()}.${ext}`
              : mode === "collage"
              ? `collage-${Date.now()}.${ext}`
              : `photo-${Date.now()}.${ext}`;
            const res = await downloadBlob(finalBlob, name);
            setProgress(100);
            if (res === "success") {
              toast.success("تم تصدير الصورة بنجاح");
              onOpenChange(false);
            } else if (res === "") {
              toast.info("تم إلغاء التصدير");
            } else {
              toast.error("فشل حفظ الصورة");
            }
          } else {
            toast.error("تعذر إنشاء الصورة");
          }
        }
      } catch (e) {
        console.error(e);
        toast.error("حدث خطأ أثناء التصدير");
      } finally {
        setLoading(false);
      }
    }, 50);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="w-5 h-5" /> تصدير الصورة
          </DialogTitle>
          <DialogDescription>
            احفظ الصورة بأبعاد القالب المحدد بدقة عالية للطباعة
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div>
            <Label className="text-xs mb-2 block">صيغة الملف</Label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setFormat("png")}
                className={`flex items-center gap-2 p-3 rounded-lg border-2 transition-all ${
                  format === "png"
                    ? "border-primary bg-primary/10"
                    : "border-border hover:border-primary/50"
                }`}
              >
                <FileImage className="w-5 h-5 text-primary" />
                <div className="text-right">
                  <div className="text-sm font-semibold">PNG</div>
                  <div className="text-[10px] text-muted-foreground">جودة عالية + شفافية</div>
                </div>
              </button>
              <button
                onClick={() => setFormat("jpg")}
                className={`flex items-center gap-2 p-3 rounded-lg border-2 transition-all ${
                  format === "jpg"
                    ? "border-primary bg-primary/10"
                    : "border-border hover:border-primary/50"
                }`}
              >
                <FileImage className="w-5 h-5 text-primary" />
                <div className="text-right">
                  <div className="text-sm font-semibold">JPG</div>
                  <div className="text-[10px] text-muted-foreground">حجم أصغر</div>
                </div>
              </button>
            </div>
          </div>

          {format === "jpg" && (
            <div>
              <div className="flex justify-between mb-1.5">
                <Label className="text-xs">جودة الصورة</Label>
                <span className="text-[11px] text-muted-foreground font-mono">{quality}%</span>
              </div>
              <Slider
                value={[quality]}
                min={50}
                max={100}
                step={5}
                onValueChange={(v) => setQuality(v[0])}
              />
            </div>
          )}

          <div className="rounded-lg border bg-muted/30 p-3 text-xs space-y-1">
            <div className="flex justify-between">
              <span className="text-muted-foreground">الأبعاد:</span>
              <span className="font-mono">{canvasWidth}×{canvasHeight}px</span>
            </div>
            {template ? (
              <>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">الحجم الفعلي:</span>
                  <span>{template.widthMM}×{template.heightMM} مم</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">الدقة:</span>
                  <span>{template.dpi} DPI</span>
                </div>
              </>
            ) : (
              <>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">الحجم الفعلي:</span>
                  <span>{Math.round((canvasWidth / printSettings.dpi) * 25.4)}×{Math.round((canvasHeight / printSettings.dpi) * 25.4)} مم</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">الدقة:</span>
                  <span>{printSettings.dpi} DPI</span>
                </div>
              </>
            )}
            <div className="flex justify-between pt-1 border-t border-border/50 mt-1">
              <span className="text-muted-foreground font-semibold">الحجم التقريبي للملف:</span>
              <span className="font-mono text-primary">
                {/* معاملات تقدير مرفوعة لمطابقة الواقع: PNG مضغوط ≈60% من الخام، JPG ≈35% */}
                {format === "png" 
                  ? ((canvasWidth * canvasHeight * 4) / 1024 / 1024 * 0.6).toFixed(1)
                  : ((canvasWidth * canvasHeight * 3) / 1024 / 1024 * 0.35 * (quality / 100)).toFixed(1)} MB
                <span className="text-[10px] text-muted-foreground font-normal"> (تقريبي)</span>
              </span>
            </div>
          </div>

          <div className="border-t pt-3 space-y-3">
            <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 rounded-lg text-[10px] text-amber-800 dark:text-amber-200">
              ⚠️ تنبيه للمطابع: سيتم تصدير الصورة بصيغة RGB. إذا كانت مطبعتك تشترط CMYK، يرجى تحويل الملف لاحقاً في برامج مثل Photoshop.
            </div>

            <div className="flex items-center justify-between p-3 border rounded-lg bg-card hover:bg-muted/30 transition-colors">
              <div className="space-y-0.5 text-right">
                <Label className="text-sm font-semibold">علامات القص (Crop Marks)</Label>
                <p className="text-[10px] text-muted-foreground">رسم خطوط إرشادية حول منطقة النزيف</p>
              </div>
              <Switch checked={showCropMarks} onCheckedChange={setShowCropMarks} />
            </div>

            <div className="p-3 border rounded-lg bg-card space-y-3">
              <div className="flex justify-between items-center text-right">
                <Label className="text-sm font-semibold">منطقة النزيف (Bleed Area)</Label>
                <span className="text-[11px] font-mono bg-muted px-1.5 py-0.5 rounded">{bleedMM} mm</span>
              </div>
              <Slider
                value={[bleedMM]}
                min={0}
                max={10}
                step={1}
                onValueChange={(v) => setBleedMM(v[0])}
              />
              <p className="text-[10px] text-muted-foreground">هامش إضافي لمنع ظهور حواف بيضاء بعد القص.</p>
            </div>

            {mode === "collage" && (
              <div className="flex items-center justify-between p-3 border rounded-lg bg-card hover:bg-muted/30 transition-colors">
                <div className="space-y-0.5 text-right">
                  <Label className="text-sm font-semibold">تصدير الدفعات (Batch Export)</Label>
                  <p className="text-[10px] text-muted-foreground">تصدير كل صورة كملف منفصل</p>
                </div>
                <Switch 
                  checked={batchExport} 
                  onCheckedChange={setBatchExport} 
                />
              </div>
            )}

            <Button
              variant="outline"
              size="sm"
              className="w-full gap-2"
              onClick={() => {
                saveProjectAsJSON();
                onOpenChange(false);
              }}
            >
              <FileJson className="w-4 h-4" /> حفظ المشروع (JSON)
            </Button>
            <p className="text-[10px] text-muted-foreground text-center mt-1.5">
              احفظ المشروع كاملاً للعودة إليه لاحقاً
            </p>
          </div>
        </div>

        {loading && progress > 0 && (
          <div className="px-6 pb-2 space-y-1">
            <div className="flex justify-between text-[10px] text-muted-foreground">
              <span>جاري التصدير...</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="h-1.5" />
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            إلغاء
          </Button>
          <Button onClick={handleExport} disabled={loading} className="gap-2">
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            تنزيل الصورة
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
