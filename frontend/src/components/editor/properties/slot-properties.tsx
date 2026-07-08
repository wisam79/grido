import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ImageIcon, ImagePlus, Copy, Scissors, Paintbrush, Sliders } from "lucide-react";
import { OpenFile, SaveImageFromBase64 } from "../../../../wailsjs/go/main/App";
import { toast } from "sonner";
import { useEditorStore, CanvasSlot } from "@/lib/editor-store";
import { IMAGE_FILTERS } from "@/lib/templates";
import { CropDialog } from "../crop-dialog";
import { SliderControl } from "./shared-controls";
import { cn } from "@/lib/utils";
import { useShallow } from "zustand/react/shallow";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export function SlotProperties({
  slot,
  onUpdate,
}: {
  slot: CanvasSlot;
  onUpdate: (id: string, patch: Partial<CanvasSlot>) => void;
}) {
  const { fillAllSlots, setSlotImage, lastEditedImage } = useEditorStore(useShallow((state) => ({
    fillAllSlots: state.fillAllSlots,
    setSlotImage: state.setSlotImage,
    lastEditedImage: state.lastEditedImage,
  })));
  const [cropOpen, setCropOpen] = useState(false);

  const handleOpenFile = async () => {
    try {
      const b64 = await OpenFile();
      if (b64) {
        setSlotImage(slot.id, b64);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleFillAll = () => {
    if (slot.imageSrc) {
      fillAllSlots(slot.imageSrc);
    }
  };

  const handleUseLastImage = () => {
    if (lastEditedImage) {
      setSlotImage(slot.id, lastEditedImage);
    }
  };

  if (!slot.imageSrc) {
    return (
      <div className="space-y-4 p-2">
        <div className="text-xs text-muted-foreground text-center py-4">
          لا توجد صورة في هذه الخلية.
        </div>
        <Button
          variant="outline"
          size="sm"
          className="w-full gap-1.5"
          onClick={handleOpenFile}
        >
          <ImagePlus className="w-4 h-4" />
          رفع صورة للخلية
        </Button>
        {lastEditedImage && (
          <Button
            variant="secondary"
            size="sm"
            className="w-full gap-1.5"
            onClick={handleUseLastImage}
          >
            <Copy className="w-4 h-4" />
            تعبئة بآخر صورة معدلة
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="text-xs font-semibold text-primary flex items-center justify-between border-b border-border/10 pb-2">
        <div className="flex items-center gap-1.5">
          <ImageIcon className="w-3.5 h-3.5" />
          <span>خصائص صورة الخلية</span>
        </div>
      </div>

      <Tabs defaultValue="style" className="w-full">
        <TabsList className="grid w-full grid-cols-2 h-9 p-[3px] bg-muted rounded-lg border">
          <TabsTrigger value="style" title="التنسيق والمظهر" className="rounded-md py-1 cursor-pointer data-[state=active]:bg-primary data-[state=active]:text-primary-foreground dark:data-[state=active]:bg-primary dark:data-[state=active]:text-primary-foreground">
            <Paintbrush className="w-3.5 h-3.5" />
          </TabsTrigger>
          <TabsTrigger value="adjust" title="تعديل الألوان" className="rounded-md py-1 cursor-pointer data-[state=active]:bg-primary data-[state=active]:text-primary-foreground dark:data-[state=active]:bg-primary dark:data-[state=active]:text-primary-foreground">
            <Sliders className="w-3.5 h-3.5" />
          </TabsTrigger>
        </TabsList>

        <TabsContent value="style" className="mt-3.5 space-y-3.5 animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-9 w-9 p-0 rounded-lg border-border/60 hover:border-primary/45 hover:bg-accent/50 transition-all cursor-pointer flex items-center justify-center"
              onClick={handleOpenFile}
              title="تغيير الصورة"
            >
              <ImagePlus className="w-4 h-4 text-primary" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-9 w-9 p-0 rounded-lg border-border/60 hover:border-primary/45 hover:bg-accent/50 transition-all cursor-pointer flex items-center justify-center"
              onClick={() => setCropOpen(true)}
              title="قص وتدوير الصورة"
            >
              <Scissors className="w-4 h-4 text-primary" />
            </Button>
            <Button
              variant="secondary"
              size="sm"
              className="h-9 w-9 p-0 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-100 transition-all cursor-pointer flex items-center justify-center"
              onClick={handleFillAll}
              title="تكرار الصورة في كل خلايا الكولاج"
            >
              <Copy className="w-4 h-4" />
            </Button>
          </div>

          {slot.imageSrc && (
            <CropDialog
              open={cropOpen}
              onOpenChange={setCropOpen}
              imageSrc={slot.imageSrc}
              onCropSave={async (cropped) => {
                try {
                  const localPath = await SaveImageFromBase64(cropped);
                  onUpdate(slot.id, { imageSrc: localPath });
                } catch (err) {
                  console.error("Failed to save cropped slot image:", err);
                  toast.error("فشل حفظ الصورة المقصوصة محلياً");
                }
              }}
            />
          )}

          <div className="bg-muted/30 dark:bg-muted/10 p-2.5 rounded-xl border border-border/30 space-y-2">
            <Label className="text-xs mb-1.5 block font-bold text-foreground/80">المرشحات الجاهزة</Label>
            <div className="grid grid-cols-4 gap-1.5" dir="rtl">
              {IMAGE_FILTERS.map((f) => (
                <button
                  key={f.id}
                  onClick={() => onUpdate(slot.id, { filter: f.id })}
                  className={cn(
                    "flex flex-col items-center gap-1 p-1 rounded-lg border transition-all hover:scale-[1.02] active:scale-95 cursor-pointer",
                    slot.filter === f.id
                      ? "border-primary bg-primary/10 text-primary shadow-xs shadow-primary/5 dark:bg-primary/20 dark:border-primary/50 font-bold"
                      : "border-border/60 bg-card hover:bg-accent text-muted-foreground"
                  )}
                >
                  <div className="w-full aspect-square rounded-md overflow-hidden shrink-0 border border-black/10 dark:border-white/10 bg-slate-100 relative">
                    {slot.imageSrc ? (
                      <img
                        src={slot.imageSrc}
                        alt=""
                        className="w-full h-full object-cover"
                        style={{ filter: f.css }}
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500" style={{ filter: f.css }} />
                    )}
                  </div>
                  <span className="text-[9px] tracking-tight leading-tight truncate max-w-full text-center mt-0.5">{f.name}</span>
                </button>
              ))}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="adjust" className="mt-3.5 space-y-3.5 animate-in fade-in duration-200">
          <div className="bg-muted/30 dark:bg-muted/10 p-3 rounded-xl border border-border/30 space-y-3">
            <Label className="text-[11px] font-bold text-foreground/80 block border-b border-border/20 pb-1.5 mb-1">تعديل الألوان</Label>
            <SliderControl
              label="السطوع"
              value={slot.brightness ?? 100}
              min={0}
              max={200}
              step={1}
              unit="%"
              onChange={(v) => onUpdate(slot.id, { brightness: v })}
            />
            <SliderControl
              label="التباين"
              value={slot.contrast ?? 100}
              min={0}
              max={200}
              step={1}
              unit="%"
              onChange={(v) => onUpdate(slot.id, { contrast: v })}
            />
            <SliderControl
              label="التشبع"
              value={slot.saturation ?? 100}
              min={0}
              max={200}
              step={1}
              unit="%"
              onChange={(v) => onUpdate(slot.id, { saturation: v })}
            />

            <Button
              variant="outline"
              size="sm"
              className="w-full mt-2"
              onClick={() =>
                onUpdate(slot.id, {
                  filter: "none",
                  brightness: 100,
                  contrast: 100,
                  saturation: 100,
                })
              }
            >
              إعادة تعيين التعديلات
            </Button>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
