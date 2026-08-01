import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { LayoutGrid, Check, RefreshCw, FileEdit, Ruler, Save } from "lucide-react";
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
import { SaveCustomTemplate } from "../../../../wailsjs/go/main/App";

interface FreeformCollageModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const clampPaperDim = (value: number): number => {
  if (!Number.isFinite(value)) return 20;
  return Math.min(1000, Math.max(20, Math.round(value)));
};

const HISTORY_LIMIT = 100;

/**
 * حقل إدخال أبعاد يسمح بالكتابة الحرة ويُثبّت القيمة عند الفقد/Enter
 */
function PaperDimInput({ value, onCommit }: { value: number; onCommit: (v: number) => void }) {
  const [text, setText] = useState(String(value));
  const [focused, setFocused] = useState(false);
  const [prevValue, setPrevValue] = useState(value);

  // مزامنة النص عند تغيّر القيمة من الخارج (أثناء إعادة العرض — النمط الرسمي لـ React)
  if (value !== prevValue) {
    setPrevValue(value);
    if (!focused) setText(String(value));
  }

  return (
    <Input
      type="text"
      inputMode="numeric"
      dir="ltr"
      value={text}
      className="h-7 text-[11px] rounded-lg w-[55px] font-mono font-bold text-center bg-background border-border/60"
      onFocus={() => setFocused(true)}
      onChange={(e) => setText(e.target.value.replace(/[^\d]/g, "").slice(0, 4))}
      onBlur={() => {
        setFocused(false);
        const v = clampPaperDim(Number(text || "0"));
        setText(String(v));
        onCommit(v);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") (e.currentTarget as HTMLInputElement).blur();
      }}
    />
  );
}

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

  // مرايا Ref ثابتة تسمح للمعالجات (والاختصارات) بالبقاء مستقرة
  // دون إعادة اشتراك/إنشاء في كل إطار سحب (تسريب أداء سابق)
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

  const handleSelectPreset = (preset: MixedPreset) => {
    // تبديل القالب يُعيد التعيين مباشرة دون تلويث سجل التراجع —
    // وإلا عاد التراجع بالخلايا القديمة مع ورقة وأبعاد القالب الجديد (تناقض)
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
  };

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

  // إعادة مزامنة التحديد بعد التراجع/الإعادة/الحذف — لا تُبقي التحديد على خلية غير موجودة
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

        // تحديث المعاينة فوراً والتجميع لسجل التراجع بـ Debounce (400ms)
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

  // callbacks سحب مستقرة — تتجنب إعادة إنشاء الاشتراكات في كل إطار
  const handleDragStart = useCallback(() => {
    // لقطة قبل السحب — تُدفع كخطوة تراجع واحدة عند الانتهاء
    dragStartSlotsRef.current = slotsRef.current.map((s) => ({ ...s }));
  }, []);

  const handleSlotsChange = useCallback((next: FreeformSlot[]) => {
    // معاينة حيّة فقط أثناء السحب دون تلويث سجل التراجع
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

      // تحديث أبعاد الكانفس وإعدادات الطباعة ذرية في الـ Store قبل تطبيق القالب لضمان خطوة تراجع واحدة
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
          paperWidthMM,
          paperHeightMM,
          orientation: paperHeightMM >= paperWidthMM ? "portrait" : "landscape",
          fitToPage: false,
        },
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
        className="w-[96vw] sm:max-w-[1040px] h-[93vh] max-h-[840px] overflow-hidden border border-border/60 bg-background/95 backdrop-blur-2xl rounded-2xl shadow-2xl font-cairo flex flex-col p-3.5 gap-2"
        dir="rtl"
      >
        {/* Header — رأس النافذة */}
        <DialogHeader className="border-b border-border/40 pb-2 shrink-0 flex flex-row items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-xl bg-primary/15 text-primary">
              <LayoutGrid className="w-4 h-4" />
            </div>
            <div>
              <DialogTitle className="text-sm font-black text-foreground">محرر الكولاج الحر والأحجام المختلطة</DialogTitle>
              <DialogDescription className="text-[10.5px] text-muted-foreground mt-0.5">
                تأطير وتنسيق مخصص بأقصى مساحة رؤية للكانفاس
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Content — محتوى الكانفس وأشرطة الأدوات */}
        <div className="flex flex-col flex-1 min-h-0 gap-2">
          {/* شريط الأدوات العلوي المدمج */}
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

        {/* Footer — شريط سفلي موحد ونظيف بدون تراكب نصي */}
        <DialogFooter className="border-t border-border/40 pt-2 flex items-center justify-between gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            className="h-8 rounded-xl text-xs gap-1.5 cursor-pointer border-border/60 hover:bg-muted/50"
            onClick={handleSaveAsCustomTemplate}
            disabled={isSavingTemplate || slots.length === 0}
          >
            <Save className="w-3.5 h-3.5 text-emerald-500" />
            <span>حفظ كقالب مخصص</span>
          </Button>

          {/* مدخلات الاسم والأبعاد المنسقة بدقة */}
          <div className="flex items-center gap-2 bg-muted/30 px-3 py-1 rounded-xl border border-border/40" dir="rtl">
            <FileEdit className="w-3.5 h-3.5 text-primary shrink-0" />
            <Input
              value={layoutName}
              onChange={(e) => setLayoutName(e.target.value)}
              className="h-7 text-[11px] rounded-lg w-[160px] bg-background border-border/60 font-bold"
              placeholder="اسم الكولاج..."
            />

            <div className="h-3.5 w-px bg-border/60 mx-0.5" />

            <Ruler className="w-3.5 h-3.5 text-primary shrink-0" />
            <span className="text-[11px] font-bold text-muted-foreground">أبعاد الورقة:</span>
            <div className="flex items-center gap-1 font-mono" dir="ltr">
              <PaperDimInput
                value={paperWidthMM}
                onCommit={(v) => setPaperWidthMM(v)}
              />
              <span className="text-[10px] font-extrabold text-muted-foreground">×</span>
              <PaperDimInput
                value={paperHeightMM}
                onCommit={(v) => setPaperHeightMM(v)}
              />
              <span className="text-[10px] font-bold text-muted-foreground">mm</span>
            </div>

            <span className="text-[10px] font-mono font-extrabold text-primary bg-primary/10 px-2 py-0.5 rounded-md border border-primary/20 me-1">
              {slots.length} صور
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="h-8 rounded-xl text-xs px-3.5 cursor-pointer" onClick={() => onOpenChange(false)}>
              إلغاء
            </Button>
            <Button
              size="sm"
              className="h-8 rounded-xl text-xs font-bold gap-1.5 px-4 cursor-pointer shadow-sm bg-primary text-primary-foreground hover:bg-primary/90"
              onClick={handleApplyToCanvas}
              disabled={isApplying || slots.length === 0}
            >
              {isApplying ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>جاري التطبيق...</span>
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
