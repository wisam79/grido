import { useState, useEffect, useRef } from "react";
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
import { Download, FileImage, Loader2, AlertTriangle } from "lucide-react";
import { exportCanvas, downloadBlob, exportSlotCanvas, applyBleedAndCropMarks, CanvasTooLargeError } from "@/lib/export";
import { useEditorStore } from "@/lib/editor-store";
import { useStageRef } from "@/lib/canvas/stage-context";
import { toast } from "sonner";

import { useShallow } from "zustand/react/shallow";

interface ExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ExportDialog({ open, onOpenChange }: ExportDialogProps) {
  const isCancelledRef = useRef(false);
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

  // تصفير مؤشرات التحميل عند فتح/غلق النافذة لمنع تعليق الأزرار (Fluent 2 Wait UX Invariant)
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(false);
    setProgress(0);
    if (!open) {
      isCancelledRef.current = true;
    } else {
      isCancelledRef.current = false;
    }
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
            if (isCancelledRef.current) break;
            const slot = validSlots[i];
            const blob = await exportSlotCanvas(slot.id, format, quality / 100);
            if (isCancelledRef.current) break;
            if (blob) {
              const ext = format === "png" ? "png" : "jpg";
              const name = `collage-photo-${i + 1}-${Date.now()}.${ext}`;
              const res = await downloadBlob(blob, name);
              if (res === "success") successCount++;
              else if (res === "") break; // ألغى المستخدم الحوار — لا نواصل الدفعة
            }
            if (isCancelledRef.current) break;
            setProgress(((i + 1) / validSlots.length) * 100);
            
            // Give browser time to process the download UI
            await new Promise(r => setTimeout(r, 250));
          }
          
          if (isCancelledRef.current) {
            return;
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
            const dateStr = new Date().toISOString().slice(0, 10);
            const name = template
              ? `Grido_${(template.name || "Template").replace(/\s+/g, "_")}_${template.widthMM}x${template.heightMM}mm_${dateStr}.${ext}`
              : mode === "collage"
              ? `Grido_Collage_${dateStr}_${Date.now().toString().slice(-4)}.${ext}`
              : `Grido_Design_${dateStr}_${Date.now().toString().slice(-4)}.${ext}`;
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
        if (e instanceof CanvasTooLargeError) {
          toast.error(
            `الأبعاد كبيرة جداً للتصدير (${e.width}×${e.height} بكسل ≈ ${(e.pixelCount / 1e6).toFixed(1)} ميجابكسل) — الحد الأقصى 50 ميجابكسل. قلّل مقاس الكانفاس أو DPI.`
          );
        } else {
          console.error(e);
          toast.error("حدث خطأ أثناء التصدير");
        }
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
            <Label className="text-xs mb-2 block font-semibold text-foreground/90">صيغة الملف</Label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setFormat("png")}
                className={`flex items-center gap-2.5 p-3 rounded-xl border transition-all cursor-pointer ${
                  format === "png"
                    ? "border-primary bg-primary/10 shadow-2xs"
                    : "border-border/80 hover:border-primary/50 bg-card hover:bg-muted/30"
                }`}
              >
                <FileImage className="w-5 h-5 text-primary shrink-0" />
                <div className="text-right">
                  <div className="text-sm font-bold">PNG</div>
                  <div className="text-[10px] text-muted-foreground font-medium">جودة عالية + شفافية</div>
                </div>
              </button>
              <button
                type="button"
                onClick={() => setFormat("jpg")}
                className={`flex items-center gap-2.5 p-3 rounded-xl border transition-all cursor-pointer ${
                  format === "jpg"
                    ? "border-primary bg-primary/10 shadow-2xs"
                    : "border-border/80 hover:border-primary/50 bg-card hover:bg-muted/30"
                }`}
              >
                <FileImage className="w-5 h-5 text-primary shrink-0" />
                <div className="text-right">
                  <div className="text-sm font-bold">JPG</div>
                  <div className="text-[10px] text-muted-foreground font-medium">حجم أصغر</div>
                </div>
              </button>
            </div>
          </div>

          {format === "jpg" && (
            <div className="bg-card p-3 rounded-xl border border-border/60 space-y-2">
              <div className="flex justify-between items-center">
                <Label className="text-xs font-semibold">جودة الصورة</Label>
                <span className="text-[11px] text-primary font-mono font-bold">{quality}%</span>
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

          <div className="rounded-xl border border-border/60 bg-muted/30 p-3 text-xs space-y-1.5 fluent-specular">
            <div className="flex justify-between">
              <span className="text-muted-foreground">الأبعاد:</span>
              <span className="font-mono font-semibold">{canvasWidth}×{canvasHeight}px</span>
            </div>
            {template ? (
              <>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">الحجم الفعلي:</span>
                  <span className="font-semibold">{template.widthMM}×{template.heightMM} مم</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">الدقة:</span>
                  <span className="font-mono">{template.dpi} DPI</span>
                </div>
              </>
            ) : (
              <>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">الحجم الفعلي:</span>
                  <span className="font-semibold">{Math.round((canvasWidth / printSettings.dpi) * 25.4)}×{Math.round((canvasHeight / printSettings.dpi) * 25.4)} مم</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">الدقة:</span>
                  <span className="font-mono">{printSettings.dpi} DPI</span>
                </div>
              </>
            )}
            <div className="flex justify-between pt-1.5 border-t border-border/50 mt-1">
              <span className="text-muted-foreground font-semibold">الحجم التقريبي للملف:</span>
              <span className="font-mono text-primary font-bold">
                {/* معاملات تقدير مرفوعة لمطابقة الواقع: PNG مضغوط ≈60% من الخام، JPG ≈35% */}
                {format === "png" 
                  ? ((canvasWidth * canvasHeight * 4) / 1024 / 1024 * 0.6).toFixed(1)
                  : ((canvasWidth * canvasHeight * 3) / 1024 / 1024 * 0.35 * (quality / 100)).toFixed(1)} MB
                <span className="text-[10px] text-muted-foreground font-normal"> (تقريبي)</span>
              </span>
            </div>
          </div>

          <div className="border-t border-border/40 pt-3 space-y-2.5">
            {(template?.dpi || printSettings.dpi || 300) < 150 && (
              <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-xl text-[11px] text-destructive flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span className="leading-tight font-medium">
                  الدقة الحالية ({template?.dpi || printSettings.dpi} DPI) منخفضة. يُوصى بـ 300 DPI للطباعة الاحترافية.
                </span>
              </div>
            )}

            <div className="p-2.5 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 rounded-xl text-[11px] text-amber-800 dark:text-amber-200 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <span className="leading-tight">تصدير الصورة بنظام الألوان القياسي RGB للطباعة الرقمية.</span>
            </div>

            <div className="flex items-center justify-between p-3 border border-border/60 rounded-xl bg-card hover:bg-muted/30 transition-colors">
              <div className="space-y-0.5 text-right">
                <Label className="text-xs font-semibold cursor-pointer">علامات القص الإرشادية</Label>
                <p className="text-[10px] text-muted-foreground">خطوط إرشادية حول منطقة النزيف</p>
              </div>
              <Switch checked={showCropMarks} onCheckedChange={setShowCropMarks} />
            </div>

            <div className="p-3 border border-border/60 rounded-xl bg-card space-y-2.5">
              <div className="flex justify-between items-center text-right">
                <Label className="text-xs font-semibold">هامش النزيف والقص</Label>
                <span className="text-[11px] font-mono bg-muted px-2 py-0.5 rounded-md font-bold">{bleedMM} mm</span>
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
              <div className="flex items-center justify-between p-3 border border-border/60 rounded-xl bg-card hover:bg-muted/30 transition-colors">
                <div className="space-y-0.5 text-right">
                  <Label className="text-xs font-semibold cursor-pointer">تصدير الصور كملفات منفصلة</Label>
                  <p className="text-[10px] text-muted-foreground">حفظ كل صورة في الكولاج كملف مستقل</p>
                </div>
                <Switch 
                  checked={batchExport} 
                  onCheckedChange={setBatchExport} 
                />
              </div>
            )}
          </div>
        </div>

        {loading && progress > 0 && (
          <div className="px-1 pb-2 space-y-1">
            <div className="flex justify-between text-[11px] text-muted-foreground font-medium">
              <span>جاري التصدير ...</span>
              <span className="font-mono font-bold text-primary">{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="h-1.5" />
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading} className="h-8 px-4 text-xs font-semibold rounded-md cursor-pointer">
            إلغاء
          </Button>
          <Button onClick={handleExport} disabled={loading} className="h-8 px-5 text-xs font-semibold rounded-md gap-1.5 cursor-pointer bg-primary hover:bg-primary/90 text-primary-foreground shadow-xs">
            {loading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>جاري التصدير ...</span>
              </>
            ) : (
              <>
                <Download className="w-3.5 h-3.5" />
                <span>تنزيل الصورة</span>
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
