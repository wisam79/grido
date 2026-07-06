import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ImageIcon, ImagePlus, Copy, Scissors, Paintbrush, Sliders } from "lucide-react";
import { OpenFile } from "../../../../wailsjs/go/main/App";
import { useEditorStore } from "@/lib/editor-store";
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
  slot: any;
  onUpdate: (id: string, patch: any) => void;
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
              onCropSave={(cropped) => onUpdate(slot.id, { imageSrc: cropped })}
            />
          )}

          <div className="bg-muted/30 dark:bg-muted/10 p-3 rounded-xl border border-border/30 space-y-2">
            <Label className="text-xs mb-2 block font-bold text-foreground/80">المرشحات الجاهزة</Label>
            <div className="grid grid-cols-2 gap-1.5" dir="rtl">
              {IMAGE_FILTERS.map((f) => (
                <button
                  key={f.id}
                  onClick={() => onUpdate(slot.id, { filter: f.id })}
                  className={cn(
                    "flex items-center gap-2 px-2.5 py-2 text-[10.5px] rounded-lg border transition-all text-right font-medium cursor-pointer active:scale-95",
                    slot.filter === f.id
                      ? "border-primary bg-primary/10 text-primary shadow-sm shadow-primary/5 dark:bg-primary/20 dark:border-primary/50 font-bold"
                      : "border-border/60 bg-card hover:bg-accent hover:text-foreground text-muted-foreground"
                  )}
                >
                  {/* دائرة ملونة ممثلة للتأثير */}
                  <div className={cn(
                    "w-3.5 h-3.5 rounded-full shadow-2xs shrink-0 border border-black/10 dark:border-white/10",
                    f.id === "original" ? "bg-radial from-neutral-200 to-neutral-400 dark:from-neutral-700 dark:to-neutral-900" :
                    f.id === "grayscale" ? "bg-gradient-to-br from-neutral-300 via-neutral-500 to-neutral-800" :
                    f.id === "vibrant" ? "bg-gradient-to-br from-amber-400 via-red-500 to-pink-600" :
                    f.id === "sepia" ? "bg-gradient-to-br from-amber-800 via-yellow-700 to-amber-950" :
                    f.id === "warm" ? "bg-gradient-to-br from-amber-300 via-orange-400 to-red-500" :
                    f.id === "cold" ? "bg-gradient-to-br from-sky-400 via-blue-500 to-indigo-600" :
                    f.id === "professional" ? "bg-gradient-to-br from-violet-600 via-indigo-600 to-blue-700" :
                    f.id === "soft" ? "bg-gradient-to-br from-pink-300 via-purple-300 to-indigo-200" : "bg-neutral-400"
                  )} />
                  <span className="truncate">{f.name}</span>
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
