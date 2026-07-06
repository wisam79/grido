import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { ImageIcon, ImagePlus, Copy, Scissors } from "lucide-react";
import { OpenFile } from "../../../../wailsjs/go/main/App";
import { useEditorStore } from "@/lib/editor-store";
import { IMAGE_FILTERS } from "@/lib/templates";
import { CropDialog } from "../crop-dialog";
import { SliderControl } from "./shared-controls";
import { cn } from "@/lib/utils";

export function SlotProperties({
  slot,
  onUpdate,
}: {
  slot: any;
  onUpdate: (id: string, patch: any) => void;
}) {
  const { fillAllSlots, setSlotImage, lastEditedImage } = useEditorStore();
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
      <div className="text-xs font-semibold text-primary flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <ImageIcon className="w-3.5 h-3.5" />
          <span>خصائص صورة الخلية</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Button
          variant="outline"
          size="sm"
          className="gap-1 text-[11px]"
          onClick={handleOpenFile}
        >
          تغيير الصورة
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="gap-1 text-[11px]"
          onClick={() => setCropOpen(true)}
        >
          <Scissors className="w-3.5 h-3.5 text-primary" />
          قص وتدوير
        </Button>
        <Button
          variant="secondary"
          size="sm"
          className="gap-1 text-[11px] bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-100 col-span-2"
          onClick={handleFillAll}
        >
          تكرار في كل الخلايا
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

      <Separator />

      <div>
        <Label className="text-xs mb-2 block">المرشحات الجاهزة</Label>
        <div className="grid grid-cols-2 gap-1.5">
          {IMAGE_FILTERS.map((f) => (
            <button
              key={f.id}
              onClick={() => onUpdate(slot.id, { filter: f.id })}
              className={cn(
                "px-2 py-1.5 text-[11px] rounded-md border transition-all",
                slot.filter === f.id
                  ? "border-primary bg-primary/10 font-semibold"
                  : "border-border hover:border-primary/50"
              )}
            >
              {f.name}
            </button>
          ))}
        </div>
      </div>

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
        className="w-full"
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
  );
}
