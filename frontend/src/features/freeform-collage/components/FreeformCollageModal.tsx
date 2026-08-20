import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { LayoutGrid, Check, RefreshCw, Save } from "lucide-react";
import { useEditorStore } from "@/lib/editor-store";
import type { FreeformLayout, FreeformSlot, PhotoPresetType, MixedPreset } from "../types";
import { MIXED_COLLAGE_PRESETS, PHOTO_PRESET_LABELS } from "../lib/mixed-presets";
import {
  splitSlot,
  removeSlot,
  addDefaultSlot,
  convertToGridoTemplate,
  rotateSlot,
  duplicateSlot,
  alignSlot,
  PHOTO_PRESET_DIMENSIONS_MM,
  type SlotAlignment,
} from "../lib/freeform-math";
import { FreeformToolbar } from "./FreeformToolbar";
import { FreeformCanvasEditor } from "./FreeformCanvasEditor";
import { MixedPresetsGrid } from "./MixedPresetsGrid";
import { FreeformPaperSelector } from "./FreeformPaperSelector";
import { SaveCustomTemplate } from "../../../../wailsjs/go/main/App";

interface FreeformCollageModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const HISTORY_LIMIT = 100;

export const FreeformCollageModal: React.FC<FreeformCollageModalProps> = ({ open, onOpenChange }) => {
  const [paperWidthMM, setPaperWidthMM] = useState<number>(100);
  const [paperHeightMM, setPaperHeightMM] = useState<number>(150);
  const [layoutName, setLayoutName] = useState<string>("كولاج حر مخصص");
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(MIXED_COLLAGE_PRESETS[0].slots[0]?.id || null);
  const [activePresetId, setActivePresetId] = useState<string | null>(MIXED_COLLAGE_PRESETS[0].id);
  const [isApplying, setIsApplying] = useState<boolean>(false);
  const [isSavingTemplate, setIsSavingTemplate] = useState<boolean>(false);

  // سجل التراجع والإعادة الآمن من الـ Stale Closures
  const [historyState, setHistoryState] = useState<{
    past: FreeformSlot[][];
    present: FreeformSlot[];
    future: FreeformSlot[][];
  }>({
    past: [],
    present: MIXED_COLLAGE_PRESETS[0].slots,
    future: [],
  });

  // لقطة الخلايا قبل بدء السحب — تُسجَّل كخطوة تراجع واحدة عند انتهائه
  const dragStartSlotsRef = useRef<FreeformSlot[] | null>(null);

  const slots = historyState.present;

  // مرايا Ref ثابتة تسمح للمعالجات والاختصارات بالبقاء مستقرة دون إعادة اشتراك في كل إطار سحب
  const slotsRef = useRef(slots);
  const selectedSlotIdRef = useRef(selectedSlotId);
  useEffect(() => {
    slotsRef.current = slots;
    selectedSlotIdRef.current = selectedSlotId;
  }, [slots, selectedSlotId]);

  const updateSlotsWithHistory = useCallback((newSlots: FreeformSlot[]) => {
    setHistoryState((prev) => ({
      past: [...prev.past.slice(-(HISTORY_LIMIT - 1)), prev.present],
      present: newSlots,
      future: [],
    }));
  }, []);

  const handleUndo = useCallback(() => {
    setHistoryState((prev) => {
      if (prev.past.length === 0) return prev;
      const previous = prev.past[prev.past.length - 1];
      const newPast = prev.past.slice(0, prev.past.length - 1);
      return {
        past: newPast,
        present: previous,
        future: [prev.present, ...prev.future].slice(0, HISTORY_LIMIT),
      };
    });
  }, []);

  const handleRedo = useCallback(() => {
    setHistoryState((prev) => {
      if (prev.future.length === 0) return prev;
      const next = prev.future[0];
      const newFuture = prev.future.slice(1);
      return {
        past: [...prev.past.slice(-(HISTORY_LIMIT - 1)), prev.present],
        present: next,
        future: newFuture,
      };
    });
  }, []);

  // تصفير وإعادة ضبط حالات التحميل والمتغيرات عند فتح/إغلاق النافذة
  useEffect(() => {
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsApplying(false);
      setIsSavingTemplate(false);
      dragStartSlotsRef.current = null;
      const firstPreset = MIXED_COLLAGE_PRESETS[0];
      setPaperWidthMM(firstPreset.paperWidthMM);
      setPaperHeightMM(firstPreset.paperHeightMM);
      setLayoutName(firstPreset.nameAr);
      setSelectedSlotId(firstPreset.slots[0]?.id || null);
      setActivePresetId(firstPreset.id);

      setHistoryState({
        past: [],
        present: firstPreset.slots,
        future: [],
      });
    } else {
      setIsApplying(false);
      setIsSavingTemplate(false);
      dragStartSlotsRef.current = null;
    }
  }, [open]);

  const handleSelectPreset = useCallback((preset: MixedPreset) => {
    setActivePresetId(preset.id);
    setPaperWidthMM(preset.paperWidthMM);
    setPaperHeightMM(preset.paperHeightMM);
    setLayoutName(preset.nameAr);
    setHistoryState({
      past: [],
      present: preset.slots,
      future: [],
    });
    setSelectedSlotId(preset.slots[0]?.id || null);
  }, []);

  const handlePaperDimensionsChange = useCallback((w: number, h: number) => {
    setPaperWidthMM(w);
    setPaperHeightMM(h);
    setActivePresetId(null);
  }, []);

  const handleSplitHorizontal = useCallback(() => {
    const selectedId = selectedSlotIdRef.current;
    if (!selectedId) return;
    updateSlotsWithHistory(splitSlot(slotsRef.current, selectedId, "horizontal"));
    setActivePresetId(null);
  }, [updateSlotsWithHistory]);

  const handleSplitVertical = useCallback(() => {
    const selectedId = selectedSlotIdRef.current;
    if (!selectedId) return;
    updateSlotsWithHistory(splitSlot(slotsRef.current, selectedId, "vertical"));
    setActivePresetId(null);
  }, [updateSlotsWithHistory]);

  const handleAddSlot = useCallback(() => {
    const updated = addDefaultSlot(slotsRef.current);
    updateSlotsWithHistory(updated);
    setSelectedSlotId(updated[updated.length - 1].id);
    setActivePresetId(null);
  }, [updateSlotsWithHistory]);

  const handleRemoveSlot = useCallback(() => {
    const selectedId = selectedSlotIdRef.current;
    if (!selectedId) return;
    if (slotsRef.current.length <= 1) return;
    const updated = removeSlot(slotsRef.current, selectedId);
    if (updated.length === slotsRef.current.length) return;
    updateSlotsWithHistory(updated);
    setSelectedSlotId(updated[0]?.id || null);
    setActivePresetId(null);
  }, [updateSlotsWithHistory]);

  const handleRotateSlot = useCallback(() => {
    const selectedId = selectedSlotIdRef.current;
    if (!selectedId) return;
    updateSlotsWithHistory(rotateSlot(slotsRef.current, selectedId, paperWidthMM, paperHeightMM));
    setActivePresetId(null);
  }, [updateSlotsWithHistory, paperWidthMM, paperHeightMM]);

  const handleDuplicateSlot = useCallback(() => {
    const selectedId = selectedSlotIdRef.current;
    if (!selectedId) return;
    const updated = duplicateSlot(slotsRef.current, selectedId);
    updateSlotsWithHistory(updated);
    setSelectedSlotId(updated[updated.length - 1].id);
    setActivePresetId(null);
  }, [updateSlotsWithHistory]);

  const handleAlignSlot = useCallback((alignment: SlotAlignment) => {
    const selectedId = selectedSlotIdRef.current;
    if (!selectedId) return;
    updateSlotsWithHistory(alignSlot(slotsRef.current, selectedId, alignment));
    setActivePresetId(null);
  }, [updateSlotsWithHistory]);

  const handleChangePresetType = useCallback((type: PhotoPresetType) => {
    const selectedId = selectedSlotIdRef.current;
    if (!selectedId) return;
    const dims = PHOTO_PRESET_DIMENSIONS_MM[type];
    const updated = slotsRef.current.map((s) => {
      if (s.id !== selectedId) return s;
      const newW = Math.min(1 - s.x, Math.max(0.04, dims.w / paperWidthMM));
      const newH = Math.min(1 - s.y, Math.max(0.04, dims.h / paperHeightMM));
      return {
        ...s,
        presetType: type,
        label: PHOTO_PRESET_LABELS[type],
        w: newW,
        h: newH,
      };
    });
    updateSlotsWithHistory(updated);
    setActivePresetId(null);
  }, [updateSlotsWithHistory, paperWidthMM, paperHeightMM]);

  // إعادة مزامنة التحديد بعد التراجع/الإعادة/الحذف
  useEffect(() => {
    if (selectedSlotId && !slots.some((s) => s.id === selectedSlotId)) {
      queueMicrotask(() => setSelectedSlotId(slots[0]?.id ?? null));
    }
  }, [slots, selectedSlotId]);

  const nudgeDebounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement as HTMLElement | null;
      if (
        activeEl &&
        (activeEl.tagName === "INPUT" ||
          activeEl.tagName === "TEXTAREA" ||
          activeEl.tagName === "SELECT" ||
          activeEl.isContentEditable)
      ) {
        return;
      }

      const keyLower = e.key.toLowerCase();
      const isCmdOrCtrl = e.ctrlKey || e.metaKey;

      const isHandledKey =
        (isCmdOrCtrl && ["z", "y", "d"].includes(keyLower)) ||
        ["delete", "backspace"].includes(keyLower) ||
        ["arrowup", "arrowdown", "arrowleft", "arrowright"].includes(keyLower);

      if (isHandledKey) {
        e.stopPropagation();
        e.stopImmediatePropagation();
      }

      if (isCmdOrCtrl && keyLower === "z") {
        e.preventDefault();
        if (e.shiftKey) handleRedo();
        else handleUndo();
      } else if (isCmdOrCtrl && keyLower === "y") {
        e.preventDefault();
        handleRedo();
      } else if (isCmdOrCtrl && keyLower === "d") {
        e.preventDefault();
        handleDuplicateSlot();
      } else if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        handleRemoveSlot();
      } else if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) {
        const selectedId = selectedSlotIdRef.current;
        if (!selectedId) return;
        e.preventDefault();
        const step = e.shiftKey ? 0.025 : 0.005;
        let dx = 0;
        let dy = 0;
        if (e.key === "ArrowLeft") dx = -step;
        if (e.key === "ArrowRight") dx = step;
        if (e.key === "ArrowUp") dy = -step;
        if (e.key === "ArrowDown") dy = step;

        const nextSlots = slotsRef.current.map((s) => {
          if (s.id !== selectedId) return s;
          const nx = Math.min(1 - s.w, Math.max(0, s.x + dx));
          const ny = Math.min(1 - s.h, Math.max(0, s.y + dy));
          return { ...s, x: nx, y: ny };
        });

        setHistoryState((prev) => ({ ...prev, present: nextSlots }));
        setActivePresetId(null);

        if (nudgeDebounceTimer.current) clearTimeout(nudgeDebounceTimer.current);
        nudgeDebounceTimer.current = setTimeout(() => {
          updateSlotsWithHistory(nextSlots);
        }, 400);
      }
    };

    window.addEventListener("keydown", handleKeyDown, { capture: true });
    return () => {
      window.removeEventListener("keydown", handleKeyDown, { capture: true });
      if (nudgeDebounceTimer.current) clearTimeout(nudgeDebounceTimer.current);
    };
  }, [open, handleUndo, handleRedo, handleDuplicateSlot, handleRemoveSlot, updateSlotsWithHistory]);

  const handleSaveAsCustomTemplate = async () => {
    try {
      setIsSavingTemplate(true);
      const currentSlots = slotsRef.current;
      const gridoTemplate = convertToGridoTemplate({
        id: Date.now().toString(36),
        name: layoutName,
        paperWidthMM,
        paperHeightMM,
        slots: currentSlots,
      });

      if (typeof SaveCustomTemplate === "function") {
        await SaveCustomTemplate(layoutName || "كولاج مخصص", gridoTemplate.cells.length, JSON.stringify(gridoTemplate.cells));
        toast.success(`تم حفظ القالب المخصص "${layoutName}" في مكتبة قوالبك!`);
      } else {
        const saved = JSON.parse(localStorage.getItem("grido_custom_templates") || "[]");
        saved.push({ name: layoutName || "كولاج مخصص", template: gridoTemplate });
        localStorage.setItem("grido_custom_templates", JSON.stringify(saved));
        toast.success(`تم حفظ كولاج "${layoutName}" المخصص بنجاح!`);
      }
    } catch (err: unknown) {
      toast.error("فشل حفظ القالب: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setIsSavingTemplate(false);
    }
  };

  const handleDragStart = useCallback(() => {
    dragStartSlotsRef.current = slotsRef.current.map((s) => ({ ...s }));
  }, []);

  const handleSlotsChange = useCallback((next: FreeformSlot[]) => {
    setHistoryState((prev) => ({ ...prev, present: next }));
  }, []);

  const handleDragEnd = useCallback(
    (finalSlots: FreeformSlot[]) => {
      const start = dragStartSlotsRef.current;
      dragStartSlotsRef.current = null;
      setActivePresetId(null);
      if (!start) return;
      setHistoryState((prev) => ({
        past: [...prev.past.slice(-(HISTORY_LIMIT - 1)), start],
        present: finalSlots,
        future: [],
      }));
    },
    []
  );

  const handleApplyToCanvas = () => {
    try {
      setIsApplying(true);
      const currentSlots = slotsRef.current;
      const layout: FreeformLayout = {
        id: "custom-layout-" + Date.now(),
        name: layoutName || "كولاج حر مخصص",
        paperWidthMM,
        paperHeightMM,
        slots: currentSlots,
      };

      const gridoTemplate = convertToGridoTemplate(layout);
      const store = useEditorStore.getState();

      const dpi = store.printSettings?.dpi || 300;
      const newW = Math.max(64, Math.round((paperWidthMM * dpi) / 25.4));
      const newH = Math.max(64, Math.round((paperHeightMM * dpi) / 25.4));

      useEditorStore.setState({
        canvasWidth: newW,
        canvasHeight: newH,
        printSettings: {
          ...(store.printSettings || {
            marginMM: 0,
            gapMM: 0,
            dpi: 300,
            copiesPerSheet: 1,
            showCutLines: false,
          }),
          paperId: "custom",
          paperWidthMM: Math.min(paperWidthMM, paperHeightMM),
          paperHeightMM: Math.max(paperWidthMM, paperHeightMM),
          orientation: paperHeightMM >= paperWidthMM ? "portrait" : "landscape",
        },
        collageGap: 0,
        collageMargin: 0,
      });

      store.setCollageTemplate(gridoTemplate);

      toast.success(`تم تطبيق كولاج "${layout.name}" بأبعاد ${paperWidthMM}×${paperHeightMM} مم!`);
      onOpenChange(false);
    } catch (err: unknown) {
      toast.error("حدث خطأ أثناء تطبيق الكولاج المخصص: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setIsApplying(false);
    }
  };

  const selectedSlot = slots.find((s) => s.id === selectedSlotId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="w-[96vw] sm:max-w-[1060px] h-[93vh] max-h-[850px] overflow-hidden border border-border/80 dark:border-white/10 bg-card/95 backdrop-blur-2xl rounded-2xl shadow-2xl font-cairo flex flex-col p-3.5 gap-2.5 fluent-specular"
        dir="rtl"
      >
        {/* Header — رأس النافذة المنظم مع محدد أبعاد الورقة المليمتري */}
        <DialogHeader className="border-b border-border/40 pb-2.5 shrink-0 flex flex-row items-center justify-between">
          <DialogTitle className="text-base font-bold tracking-tight text-foreground flex items-center gap-2">
            <LayoutGrid className="w-4 h-4 text-primary" />
            محرر الكولاج الحر
          </DialogTitle>

          {/* قياسات وأبعاد الورقة عبر المكون المستقل */}
          <FreeformPaperSelector
            paperWidthMM={paperWidthMM}
            paperHeightMM={paperHeightMM}
            onPaperDimensionsChange={handlePaperDimensionsChange}
          />
        </DialogHeader>

        {/* Content — محتوى الكانفس وأشرطة الأدوات والشبكات */}
        <div className="flex flex-col flex-1 min-h-0 gap-2">
          {/* شريط الأدوات والقوالب المدمج */}
          <div className="flex items-center justify-between gap-2 shrink-0 bg-muted/20 p-1 rounded-xl border border-border/40 flex-wrap">
            <MixedPresetsGrid activePresetId={activePresetId} onSelectPreset={handleSelectPreset} />

            <FreeformToolbar
              selectedSlotId={selectedSlotId}
              canUndo={historyState.past.length > 0}
              canRedo={historyState.future.length > 0}
              onUndo={handleUndo}
              onRedo={handleRedo}
              onSplitHorizontal={handleSplitHorizontal}
              onSplitVertical={handleSplitVertical}
              onAddSlot={handleAddSlot}
              onRemoveSlot={handleRemoveSlot}
              onRotateSlot={handleRotateSlot}
              onDuplicateSlot={handleDuplicateSlot}
              onAlignSlot={handleAlignSlot}
              onChangePresetType={handleChangePresetType}
              currentPresetType={selectedSlot?.presetType}
            />
          </div>

          {/* الكانفس التفاعلي الرئيسي */}
          <FreeformCanvasEditor
            paperWidthMM={paperWidthMM}
            paperHeightMM={paperHeightMM}
            slots={slots}
            selectedSlotId={selectedSlotId}
            onSelectSlot={setSelectedSlotId}
            onDragStart={handleDragStart}
            onSlotsChange={handleSlotsChange}
            onDragEnd={handleDragEnd}
          />
        </div>

        {/* Footer — شريط سفلي متوافق مع Fluent 2 Standard Ramp */}
        <DialogFooter className="border-t border-border/40 pt-2.5 flex items-center justify-between gap-2 shrink-0">
          {/* حفظ كقالب مخصص على اليمين */}
          <div className="flex items-center gap-2">
            <Input
              value={layoutName}
              onChange={(e) => setLayoutName(e.target.value)}
              className="h-8 text-xs rounded-md w-[150px] bg-background border-border/60 font-semibold focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              placeholder="اسم القالب..."
            />
            <Button
              variant="outline"
              size="sm"
              className="h-8 rounded-md text-xs gap-1.5 cursor-pointer border-border/60 hover:bg-muted font-semibold focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              onClick={handleSaveAsCustomTemplate}
              disabled={isSavingTemplate || slots.length === 0}
            >
              {isSavingTemplate ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-500" />
                  <span>جاري الحفظ ...</span>
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5 text-emerald-500" />
                  <span>حفظ كقالب</span>
                </>
              )}
            </Button>
          </div>

          {/* أزرار الإلغاء والتطبيق على اليسار */}
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs font-mono font-bold text-primary bg-primary/10 px-2.5 py-1 rounded-md border border-primary/20 me-1">
              {slots.length} صور
            </span>
            <Button
              variant="outline"
              size="sm"
              className="h-8 rounded-md text-xs px-4 cursor-pointer font-semibold focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              onClick={() => onOpenChange(false)}
            >
              إلغاء
            </Button>
            <Button
              size="sm"
              className="h-8 rounded-md text-xs font-semibold gap-1.5 px-5 cursor-pointer shadow-xs bg-primary text-primary-foreground hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              onClick={handleApplyToCanvas}
              disabled={isApplying || slots.length === 0}
            >
              {isApplying ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>جاري التطبيق ...</span>
                </>
              ) : (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>تطبيق على الكانفس</span>
                </>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
