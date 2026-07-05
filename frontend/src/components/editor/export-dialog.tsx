"use client";

import { useState } from "react";
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
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";
import { Download, FileJson, FileImage, Loader2 } from "lucide-react";
import { exportCanvas, downloadBlob, saveProjectAsJSON } from "./export-utils";
import { useEditorStore } from "@/lib/editor-store";
import { toast } from "sonner";

interface ExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ExportDialog({ open, onOpenChange }: ExportDialogProps) {
  const [format, setFormat] = useState<"png" | "jpg">("png");
  const [quality, setQuality] = useState(95);
  const [loading, setLoading] = useState(false);
  const { template, canvasWidth, canvasHeight, mode } = useEditorStore();

  const handleExport = async () => {
    setLoading(true);
    try {
      const blob = await exportCanvas(format, quality / 100);
      if (blob) {
        const ext = format === "png" ? "png" : "jpg";
        const name = template
          ? `${template.widthMM}x${template.heightMM}mm-${Date.now()}.${ext}`
          : mode === "collage"
          ? `collage-${Date.now()}.${ext}`
          : `photo-${Date.now()}.${ext}`;
        downloadBlob(blob, name);
        toast.success("تم تصدير الصورة بنجاح");
        onOpenChange(false);
      } else {
        toast.error("تعذر إنشاء الصورة");
      }
    } catch (e) {
      console.error(e);
      toast.error("حدث خطأ أثناء التصدير");
    } finally {
      setLoading(false);
    }
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
            {template && (
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
            )}
          </div>

          <div className="border-t pt-3">
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

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
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
