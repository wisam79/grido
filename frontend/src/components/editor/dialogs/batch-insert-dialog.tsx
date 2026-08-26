import { useState, useEffect, useMemo } from "react";
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
import {
  Grid20Filled,
  FolderOpen20Filled,
  Add20Filled,
  Delete20Filled,
  Dismiss20Filled,
  ImageMultiple20Filled,
  ArrowRepeatAll20Filled,
  Checkmark20Filled,
  Subtract20Filled,
  LayerDiagonal20Filled,
} from "@fluentui/react-icons";
import { openImageFileDialog, openDirectoryImageDialog } from "@/lib/io/file-dialog-utils";
import { resolveImageAspectRatio } from "@/lib/canvas/image-dimensions";
import { useEditorStore } from "@/lib/editor-store";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useShallow } from "zustand/react/shallow";
import { SaveImageFromBase64 } from "../../../../wailsjs/go/main/App";
import { wailsIsDesktop } from "@/lib/wails-env";

export interface BatchInsertDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialImages?: string[];
}

interface QueuedImage {
  id: string;
  src: string;
  aspectRatio: number;
  copies: number;
  name?: string;
}

export function BatchInsertDialog({
  open,
  onOpenChange,
  initialImages = [],
}: BatchInsertDialogProps) {
  const [images, setImages] = useState<QueuedImage[]>([]);
  const [loading, setLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Layout settings
  const [layoutMode, setLayoutMode] = useState<"grid" | "cascade" | "collage">("grid");
  const [columns, setColumns] = useState<number>(0); // 0 = Auto
  const [gapPx, setGapPx] = useState<number>(24);
  const [marginPx, setMarginPx] = useState<number>(40);
  const [centerLastRow, setCenterLastRow] = useState<boolean>(true);

  const {
    mode,
    slots,
    setSlotImagesBatch,
    addImageElementsBatch,
    canvasWidth,
    canvasHeight,
  } = useEditorStore(
    useShallow((state) => ({
      mode: state.mode,
      slots: state.slots,
      setSlotImagesBatch: state.setSlotImagesBatch,
      addImageElementsBatch: state.addImageElementsBatch,
      canvasWidth: state.canvasWidth,
      canvasHeight: state.canvasHeight,
    }))
  );

  // Reset states when dialog opens / closes (Wait UX Invariant)
  useEffect(() => {
    setIsProcessing(false);
    setLoading(false);
  }, [open]);

  // Load initial images if provided
  useEffect(() => {
    if (!open) return;
    if (initialImages && initialImages.length > 0) {
      let isMounted = true;
      (async () => {
        setLoading(true);
        try {
          const loaded: QueuedImage[] = [];
          for (let i = 0; i < initialImages.length; i++) {
            const src = initialImages[i];
            const aspect = await resolveImageAspectRatio(src);
            loaded.push({
              id: `init-${i}-${Date.now()}`,
              src,
              aspectRatio: aspect,
              copies: 1,
            });
          }
          if (isMounted) {
            setImages(loaded);
          }
        } finally {
          if (isMounted) setLoading(false);
        }
      })();
      return () => {
        isMounted = false;
      };
    }
  }, [open, initialImages]);

  // Total expanded copies count
  const totalCopies = useMemo(() => {
    return images.reduce((sum, img) => sum + Math.max(1, img.copies), 0);
  }, [images]);

  // Add individual files
  const handleAddFiles = async () => {
    try {
      setLoading(true);
      const fileSrcs = await openImageFileDialog(true);
      if (!fileSrcs || fileSrcs.length === 0) return;

      const isDesktop = wailsIsDesktop();
      const newItems: QueuedImage[] = [];

      for (let i = 0; i < fileSrcs.length; i++) {
        let src = fileSrcs[i];
        if (isDesktop && src.startsWith("data:image/")) {
          try {
            const localPath = await SaveImageFromBase64(src);
            if (localPath) src = localPath;
          } catch (e) {
            console.error("SaveImageFromBase64 failed:", e);
          }
        }
        const aspect = await resolveImageAspectRatio(src);
        newItems.push({
          id: `img-${Date.now()}-${i}-${Math.random().toString(36).substring(2, 5)}`,
          src,
          aspectRatio: aspect,
          copies: 1,
        });
      }

      setImages((prev) => [...prev, ...newItems]);
      toast.success(`تمت إضافة ${newItems.length} صورة إلى قائمة الإدراج`);
    } catch (err) {
      console.error("Add files error:", err);
      toast.error("فشل استيراد الصور");
    } finally {
      setLoading(false);
    }
  };

  // Add entire directory
  const handleAddDirectory = async () => {
    try {
      setLoading(true);
      const fileSrcs = await openDirectoryImageDialog();
      if (!fileSrcs || fileSrcs.length === 0) return;

      const isDesktop = wailsIsDesktop();
      const newItems: QueuedImage[] = [];

      for (let i = 0; i < fileSrcs.length; i++) {
        let src = fileSrcs[i];
        if (isDesktop && src.startsWith("data:image/")) {
          try {
            const localPath = await SaveImageFromBase64(src);
            if (localPath) src = localPath;
          } catch (e) {
            console.error("SaveImageFromBase64 directory failed:", e);
          }
        }
        const aspect = await resolveImageAspectRatio(src);
        newItems.push({
          id: `dir-${Date.now()}-${i}-${Math.random().toString(36).substring(2, 5)}`,
          src,
          aspectRatio: aspect,
          copies: 1,
        });
      }

      setImages((prev) => [...prev, ...newItems]);
      toast.success(`تم استيراد ${newItems.length} صورة من المجلد`);
    } catch (err) {
      console.error("Add directory error:", err);
      toast.error("فشل استيراد صور المجلد");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateCopies = (id: string, delta: number) => {
    setImages((prev) =>
      prev.map((img) => {
        if (img.id === id) {
          const nextCopies = Math.max(1, Math.min(64, img.copies + delta));
          return { ...img, copies: nextCopies };
        }
        return img;
      })
    );
  };

  const handleRemoveImage = (id: string) => {
    setImages((prev) => prev.filter((img) => img.id !== id));
  };

  const handleClearAll = () => {
    setImages([]);
  };

  const handleSetAllCopies = (copies: number) => {
    setImages((prev) => prev.map((img) => ({ ...img, copies: Math.max(1, copies) })));
  };

  // Execute Batch Insertion
  const handleExecute = async () => {
    if (images.length === 0) {
      toast.error("يرجى اختيار صورة واحدة على الأقل");
      return;
    }

    try {
      setIsProcessing(true);

      // Expand images by their copies count
      const expandedItems: { src: string; aspectRatio: number }[] = [];
      for (const img of images) {
        const count = Math.max(1, img.copies);
        for (let c = 0; c < count; c++) {
          expandedItems.push({
            src: img.src,
            aspectRatio: img.aspectRatio,
          });
        }
      }

      if (layoutMode === "collage" || mode === "collage") {
        // Collage mode insertion
        const assignments: { slotId: string; src: string }[] = [];
        slots.forEach((slot, index) => {
          if (index < expandedItems.length) {
            assignments.push({
              slotId: slot.id,
              src: expandedItems[index].src,
            });
          }
        });

        if (assignments.length > 0) {
          setSlotImagesBatch(assignments, expandedItems[0]?.src || null);
          toast.success(`تم ملء ${assignments.length} خانة في الكولاج`);
        } else {
          toast.error("لا توجد خانات كولاج كافية");
        }
      } else {
        // Canvas freeform / grid insertion
        addImageElementsBatch(expandedItems, {
          layoutMode: layoutMode === "cascade" ? "cascade" : "grid",
          columns: columns > 0 ? columns : undefined,
          gapPx,
          marginPx,
          centerLastRow,
        });
        toast.success(`تم إدراج ${expandedItems.length} صورة في مساحة العمل`);
      }

      onOpenChange(false);
    } catch (err) {
      console.error("Execute batch insert error:", err);
      toast.error("فشل تنفيذ الإدراج المتعدد");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="w-[96vw] sm:max-w-[860px] max-h-[90vh] flex flex-col p-0 overflow-hidden bg-card/95 backdrop-blur-2xl border border-border/80 dark:border-white/10 rounded-2xl shadow-2xl font-cairo fluent-specular transition-all duration-150 gap-0"
        dir="rtl"
      >
        {/* Header */}
        <DialogHeader className="px-6 py-4 border-b border-border/40 bg-card/80 backdrop-blur-md shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-primary/10 text-primary border border-primary/20">
                <ImageMultiple20Filled className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold text-foreground">
                  إدراج دفعة صور ومعاملات (Batch Studio)
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                  توزيع شبكي ذكي، استيراد مجلدات، وتكرار نسخ المعاملات دفعة واحدة
                </DialogDescription>
              </div>
            </div>

            {/* Quick stats badge */}
            {images.length > 0 && (
              <div className="flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-xl bg-muted/60 border border-border/50 text-foreground">
                <span>{images.length} صور</span>
                <span className="text-muted-foreground">•</span>
                <span className="text-primary">{totalCopies} إجمالي النسخ</span>
              </div>
            )}
          </div>
        </DialogHeader>

        {/* Action Toolbar */}
        <div className="px-6 py-2.5 bg-muted/30 border-b border-border/30 flex items-center justify-between gap-3 shrink-0 flex-wrap">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleAddFiles}
              disabled={loading || isProcessing}
              className="h-8 rounded-md gap-1.5 text-xs font-medium border-border/60 hover:bg-primary/10 hover:text-primary hover:border-primary/40 transition-colors"
            >
              <Add20Filled className="w-3.5 h-3.5" />
              إضافة صور...
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleAddDirectory}
              disabled={loading || isProcessing}
              className="h-8 rounded-md gap-1.5 text-xs font-medium border-border/60 hover:bg-primary/10 hover:text-primary hover:border-primary/40 transition-colors"
            >
              <FolderOpen20Filled className="w-3.5 h-3.5" />
              استيراد مجلد كامل...
            </Button>
          </div>

          {images.length > 0 && (
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 text-xs text-muted-foreground ml-2">
                <span>نسخ موحدة:</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleSetAllCopies(2)}
                  className="h-6 px-2 text-xs rounded-md"
                >
                  ×2
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleSetAllCopies(4)}
                  className="h-6 px-2 text-xs rounded-md"
                >
                  ×4
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleSetAllCopies(8)}
                  className="h-6 px-2 text-xs rounded-md"
                >
                  ×8
                </Button>
              </div>

              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearAll}
                disabled={isProcessing}
                className="h-8 rounded-md gap-1.5 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive transition-colors"
              >
                <Delete20Filled className="w-3.5 h-3.5" />
                تفريغ القائمة
              </Button>
            </div>
          )}
        </div>

        {/* Content Body */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-0 overflow-hidden flex-1 min-h-[360px] max-h-[56vh]">
          {/* Images Queue List (7 Cols) */}
          <div className="md:col-span-7 border-l border-border/40 p-4 overflow-y-auto custom-scrollbar flex flex-col gap-2.5 bg-background/50">
            {images.length === 0 ? (
              <div className="flex flex-col items-center justify-center flex-1 py-12 px-4 text-center border-2 border-dashed border-border/50 rounded-xl bg-muted/10">
                <div className="p-4 rounded-2xl bg-muted/40 text-muted-foreground/60 mb-3">
                  <ImageMultiple20Filled className="w-8 h-8" />
                </div>
                <h4 className="text-sm font-bold text-foreground">قائمة الصور فارغة</h4>
                <p className="text-xs text-muted-foreground mt-1 max-w-xs leading-relaxed">
                  انقر على "إضافة صور" أو "استيراد مجلد" للبدء في تجميع وتوزيع الصور
                </p>
                <div className="flex items-center gap-2 mt-4">
                  <Button size="sm" onClick={handleAddFiles} className="h-8 gap-1.5 text-xs rounded-md">
                    <Add20Filled className="w-3.5 h-3.5" /> اختيار صور
                  </Button>
                  <Button size="sm" variant="outline" onClick={handleAddDirectory} className="h-8 gap-1.5 text-xs rounded-md">
                    <FolderOpen20Filled className="w-3.5 h-3.5" /> اختيار مجلد
                  </Button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {images.map((img, idx) => (
                  <div
                    key={img.id}
                    className="flex items-center gap-2.5 p-2 rounded-xl bg-card border border-border/60 shadow-xs hover:border-border transition-all"
                  >
                    {/* Thumbnail */}
                    <div className="w-14 h-14 rounded-lg overflow-hidden bg-muted shrink-0 border border-border/40 relative flex items-center justify-center">
                      <img
                        src={img.src}
                        alt={`Photo ${idx + 1}`}
                        className="w-full h-full object-cover"
                      />
                      <span className="absolute bottom-0.5 right-0.5 text-[9px] font-bold px-1 rounded bg-black/60 text-white backdrop-blur-xs">
                        #{idx + 1}
                      </span>
                    </div>

                    {/* Meta & Copies Stepper */}
                    <div className="flex-1 min-w-0 flex flex-col justify-between h-14 py-0.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-foreground truncate">
                          صورة {idx + 1}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveImage(img.id)}
                          className="h-6 w-6 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md"
                        >
                          <Dismiss20Filled className="w-3.5 h-3.5" />
                        </Button>
                      </div>

                      <div className="flex items-center justify-between mt-auto">
                        <span className="text-[11px] text-muted-foreground">النسخ:</span>
                        <div className="flex items-center gap-1 bg-muted/60 rounded-md p-0.5 border border-border/40">
                          <Button
                            variant="ghost"
                            size="icon"
                            disabled={img.copies <= 1}
                            onClick={() => handleUpdateCopies(img.id, -1)}
                            className="h-5 w-5 rounded text-muted-foreground hover:text-foreground"
                          >
                            <Subtract20Filled className="w-3 h-3" />
                          </Button>
                          <span className="text-xs font-bold text-foreground w-5 text-center">
                            {img.copies}
                          </span>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleUpdateCopies(img.id, 1)}
                            className="h-5 w-5 rounded text-muted-foreground hover:text-foreground"
                          >
                            <Add20Filled className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Layout Settings Panel (5 Cols) */}
          <div className="md:col-span-5 p-5 overflow-y-auto custom-scrollbar flex flex-col gap-4 bg-muted/10">
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              خيارات التوزيع والمحاذاة
            </h4>

            {/* Layout Mode Selector */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-foreground">نمط التوزيع على الصفحة</Label>
              <div className="grid grid-cols-2 gap-1.5">
                <Button
                  type="button"
                  variant={layoutMode === "grid" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setLayoutMode("grid")}
                  className={cn(
                    "h-8 rounded-md text-xs font-semibold gap-1.5 cursor-pointer transition-all border-border/60",
                    layoutMode === "grid" ? "bg-primary text-primary-foreground shadow-2xs font-bold" : "hover:bg-muted/60 text-foreground"
                  )}
                >
                  <Grid20Filled className="w-3.5 h-3.5" />
                  <span>شبكة منتظمة</span>
                </Button>

                <Button
                  type="button"
                  variant={layoutMode === "cascade" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setLayoutMode("cascade")}
                  className={cn(
                    "h-8 rounded-md text-xs font-semibold gap-1.5 cursor-pointer transition-all border-border/60",
                    layoutMode === "cascade" ? "bg-primary text-primary-foreground shadow-2xs font-bold" : "hover:bg-muted/60 text-foreground"
                  )}
                >
                  <LayerDiagonal20Filled className="w-3.5 h-3.5" />
                  <span>تتالي درجي</span>
                </Button>
              </div>
            </div>

            {layoutMode === "grid" && (
              <>
                {/* Columns */}
                <div className="space-y-2 pt-1 border-t border-border/30">
                  <div className="flex items-center justify-between text-xs">
                    <Label className="text-xs font-semibold text-foreground">عدد الأعمدة</Label>
                    <span className="font-bold text-primary">
                      {columns === 0 ? "تلقائي ذكي" : `${columns} أعمدة`}
                    </span>
                  </div>
                  <Slider
                    min={0}
                    max={8}
                    step={1}
                    value={[columns]}
                    onValueChange={(val) => setColumns(val[0])}
                    className="py-1"
                  />
                  <div className="flex justify-between text-[10px] text-muted-foreground">
                    <span>تلقائي</span>
                    <span>2</span>
                    <span>4</span>
                    <span>6</span>
                    <span>8</span>
                  </div>
                </div>

                {/* Spacing / Gap */}
                <div className="space-y-2 pt-1 border-t border-border/30">
                  <div className="flex items-center justify-between text-xs">
                    <Label className="text-xs font-semibold text-foreground">المسافة البينية (Gap)</Label>
                    <span className="font-bold text-muted-foreground">{gapPx} px</span>
                  </div>
                  <Slider
                    min={0}
                    max={80}
                    step={4}
                    value={[gapPx]}
                    onValueChange={(val) => setGapPx(val[0])}
                    className="py-1"
                  />
                </div>

                {/* Margin */}
                <div className="space-y-2 pt-1 border-t border-border/30">
                  <div className="flex items-center justify-between text-xs">
                    <Label className="text-xs font-semibold text-foreground">هوامش الحواف (Margin)</Label>
                    <span className="font-bold text-muted-foreground">{marginPx} px</span>
                  </div>
                  <Slider
                    min={0}
                    max={120}
                    step={5}
                    value={[marginPx]}
                    onValueChange={(val) => setMarginPx(val[0])}
                    className="py-1"
                  />
                </div>

                {/* Center Last Row */}
                <div className="flex items-center justify-between pt-2 border-t border-border/30">
                  <div className="space-y-0.5">
                    <Label className="text-xs font-medium text-foreground">توسيط الصف الأخير</Label>
                    <p className="text-[11px] text-muted-foreground">موازنة العناصر في الصف غير المكتمل</p>
                  </div>
                  <Switch
                    checked={centerLastRow}
                    onCheckedChange={setCenterLastRow}
                  />
                </div>
              </>
            )}

            {mode === "collage" && (
              <div className="p-2.5 rounded-xl bg-primary/5 border border-primary/20 text-xs text-primary/90 mt-2">
                💡 أنت حالياً في وضع الكولاج. يمكنك ملء خانات الكولاج بتسلسل الصور المحدد.
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <DialogFooter className="px-6 py-3.5 border-t border-border/40 bg-card/80 backdrop-blur-md flex items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-muted-foreground">
            {images.length > 0 ? (
              <span>
                جاهز لإنشاء <strong className="text-foreground">{totalCopies}</strong> عنصر على الكانفاس
              </span>
            ) : (
              <span>اختر صوراً لتفعيل الإدراج</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              disabled={isProcessing}
              className="h-8 rounded-md text-xs"
            >
              إلغاء
            </Button>

            <Button
              size="sm"
              onClick={handleExecute}
              disabled={images.length === 0 || isProcessing}
              className="h-8 rounded-md bg-primary text-primary-foreground gap-1.5 text-xs font-semibold px-4 shadow-sm"
            >
              <Checkmark20Filled className="w-4 h-4" />
              {isProcessing ? "جاري الإدراج ..." : "إدراج في مساحة العمل"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
