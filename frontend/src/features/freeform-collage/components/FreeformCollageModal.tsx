import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogCloseButton,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Spinner } from "@/components/ui/huge-icon";
import { SquaresFour, Check, FloppyDisk, DownloadSimple, UploadSimple } from "@phosphor-icons/react";
import { useEditorStore } from "@/lib/editor-store";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type {
  FreeformLayout,
  FreeformSlot,
  PhotoPresetType,
  SlotAlignment,
  DistributionAxis,
  AutoPackStrategy,
} from "../types";
import { PHOTO_PRESET_LABELS } from "../lib/mixed-presets";
import {
  splitSlot,
  removeSlot,
  removeSlotsByIds,
  duplicateSlotsByIds,
  addDefaultSlot,
  addPresetSlot,
  autoPackSlots,
  distributeSlots,
  convertToGridoTemplate,
  rotateSlot,
  alignSlot,
  alignSlotsToEachOther,
  scaleSlotsByIds,
  resolveOverlaps,
  exportLayoutFile,
  parseLayoutFile,
  slotsFromFile,
  newSlotId,
} from "../lib/freeform-math";

function clampNum(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v));
}
import { FreeformToolbar } from "./FreeformToolbar";
import { FreeformCanvasEditor } from "./FreeformCanvasEditor";
import { FreeformPaperSelector } from "./FreeformPaperSelector";
import { FreeformSlotInspector } from "./FreeformSlotInspector";
import { SaveCustomTemplate } from "../../../../wailsjs/go/main/App";

interface FreeformCollageModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const HISTORY_LIMIT = 100;

type Clipboard = FreeformSlot[] | null;

/**
 * ورقة البداية الفارغة — شبكة بسيطة 2×4 كنقطة انطلاق قابلة للتعديل فوراً
 * (ليست "قالباً جاهزاً" بل مجرد مساحة عمل أولية يحررها المستخدم كما يشاء)
 */
function createBlankSheet(paperWidthMM: number, paperHeightMM: number): FreeformSlot[] {
  const slots: FreeformSlot[] = [];
  const w = 0.25;
  const h = 0.5;
  for (let r = 0; r < 2; r++) {
    for (let c = 0; c < 4; c++) {
      slots.push({
        id: newSlotId("slot_blank"),
        x: c * w,
        y: r * h,
        w,
        h,
        presetType: "iq-national-id",
        label: "خلية",
        rotation: 0,
      });
    }
  }
  void paperWidthMM;
  void paperHeightMM;
  return slots;
}

export const FreeformCollageModal: React.FC<FreeformCollageModalProps> = ({ open, onOpenChange }) => {
  const [paperWidthMM, setPaperWidthMM] = useState<number>(100);
  const [paperHeightMM, setPaperHeightMM] = useState<number>(150);
  const [layoutName, setLayoutName] = useState<string>("كولاج حر مخصص");
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);
  const [isApplying, setIsApplying] = useState<boolean>(false);
  const [isSavingTemplate, setIsSavingTemplate] = useState<boolean>(false);
  const [showCutLines, setShowCutLines] = useState<boolean>(false);
  const [enableSnapping, setEnableSnapping] = useState<boolean>(true);

  // ⚡ التحديد المتعدد: مجموعة خلايا نشطة إضافة للخلية الأساسية
  const [multiSelectedIds, setMultiSelectedIds] = useState<string[]>([]);
  const clipboardRef = useRef<Clipboard>(null);

  // ⚙️ إعدادات التعبئة الذكية: فجوة وهامش بالمليمتر
  const [packGapMM, setPackGapMM] = useState<number>(2);
  const [packMarginMM, setPackMarginMM] = useState<number>(2);

  // سجل التراجع والإعادة — ورقة فارغة نقطة البداية
  const [historyState, setHistoryState] = useState<{
    past: FreeformSlot[][];
    present: FreeformSlot[];
    future: FreeformSlot[][];
  }>(() => ({
    past: [],
    present: createBlankSheet(100, 150),
    future: [],
  }));

  const dragStartSlotsRef = useRef<FreeformSlot[] | null>(null);
  const slots = historyState.present;

  const slotsRef = useRef(slots);
  const selectedSlotIdRef = useRef(selectedSlotId);
  const multiSelectedIdsRef = useRef(multiSelectedIds);
  useEffect(() => {
    slotsRef.current = slots;
    selectedSlotIdRef.current = selectedSlotId;
    multiSelectedIdsRef.current = multiSelectedIds;
  }, [slots, selectedSlotId, multiSelectedIds]);

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

  // تصفير وإعادة ضبط الحالات عند فتح النافذة — ورقة فارغة دائماً
  useEffect(() => {
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsApplying(false);
      setIsSavingTemplate(false);
      dragStartSlotsRef.current = null;
      clipboardRef.current = null;
      setPaperWidthMM(100);
      setPaperHeightMM(150);
      setLayoutName("كولاج حر مخصص");
      setMultiSelectedIds([]);

      const blank = createBlankSheet(100, 150);
      setHistoryState({
        past: [],
        present: blank,
        future: [],
      });
      setSelectedSlotId(blank[0]?.id || null);
    } else {
      setIsApplying(false);
      setIsSavingTemplate(false);
      dragStartSlotsRef.current = null;
      clipboardRef.current = null;
    }
  }, [open]);

  const handlePaperDimensionsChange = useCallback((w: number, h: number) => {
    setPaperWidthMM(w);
    setPaperHeightMM(h);
  }, []);

  const handleSplitHorizontal = useCallback(() => {
    const selectedId = selectedSlotIdRef.current;
    if (!selectedId) return;
    updateSlotsWithHistory(splitSlot(slotsRef.current, selectedId, "horizontal"));
  }, [updateSlotsWithHistory]);

  const handleSplitVertical = useCallback(() => {
    const selectedId = selectedSlotIdRef.current;
    if (!selectedId) return;
    updateSlotsWithHistory(splitSlot(slotsRef.current, selectedId, "vertical"));
  }, [updateSlotsWithHistory]);

  const handleAddSlot = useCallback(() => {
    const updated = addDefaultSlot(slotsRef.current);
    updateSlotsWithHistory(updated);
    setSelectedSlotId(updated[updated.length - 1].id);
  }, [updateSlotsWithHistory]);

  const handleAddPresetSlot = useCallback((presetType: PhotoPresetType) => {
    const updated = addPresetSlot(slotsRef.current, presetType, paperWidthMM, paperHeightMM);
    updateSlotsWithHistory(updated);
    setSelectedSlotId(updated[updated.length - 1].id);
    toast.success(`تمت إضافة ${PHOTO_PRESET_LABELS[presetType]} إلى الورقة`);
  }, [updateSlotsWithHistory, paperWidthMM, paperHeightMM]);

  const handleAutoPack = useCallback((strategy: AutoPackStrategy) => {
    const updated = autoPackSlots(strategy, paperWidthMM, paperHeightMM, packGapMM, packMarginMM);
    updateSlotsWithHistory(updated);
    setSelectedSlotId(updated[0]?.id || null);
    setMultiSelectedIds([]);
    toast.success(`تمت تعبئة الورقة تلقائياً بـ ${updated.length} صورة!`);
  }, [updateSlotsWithHistory, paperWidthMM, paperHeightMM, packGapMM, packMarginMM]);

  const handleRemoveSlot = useCallback(() => {
    const selectedId = selectedSlotIdRef.current;
    if (!selectedId) return;

    // حذف جماعي عند وجود تحديد متعدد
    if (multiSelectedIdsRef.current.length > 0) {
      const ids = [selectedId, ...multiSelectedIdsRef.current];
      const updated = removeSlotsByIds(slotsRef.current, ids);
      if (updated.length === slotsRef.current.length) return;
      updateSlotsWithHistory(updated);
      setSelectedSlotId(updated[0]?.id || null);
      setMultiSelectedIds([]);
      return;
    }

    if (slotsRef.current.length <= 1) return;
    const updated = removeSlot(slotsRef.current, selectedId);
    if (updated.length === slotsRef.current.length) return;
    updateSlotsWithHistory(updated);
    setSelectedSlotId(updated[0]?.id || null);
  }, [updateSlotsWithHistory]);

  const handleRotateSlot = useCallback(() => {
    const selectedId = selectedSlotIdRef.current;
    if (!selectedId) return;
    updateSlotsWithHistory(rotateSlot(slotsRef.current, selectedId, paperWidthMM, paperHeightMM));
  }, [updateSlotsWithHistory, paperWidthMM, paperHeightMM]);

  const handleDuplicateSlot = useCallback(() => {
    const selectedId = selectedSlotIdRef.current;
    if (!selectedId) return;

    // مضاعفة جماعية للتحديد المتعدد
    const ids = multiSelectedIdsRef.current.length > 0
      ? [selectedId, ...multiSelectedIdsRef.current]
      : [selectedId];
    const { slots: updated, newIds } = duplicateSlotsByIds(slotsRef.current, ids);
    if (newIds.length === 0) return;
    updateSlotsWithHistory(updated);
    setSelectedSlotId(newIds[0]);
    setMultiSelectedIds(newIds.slice(1));
  }, [updateSlotsWithHistory]);

  const handleAlignSlot = useCallback((alignment: SlotAlignment) => {
    const selectedId = selectedSlotIdRef.current;
    if (!selectedId) return;
    updateSlotsWithHistory(alignSlot(slotsRef.current, selectedId, alignment));
  }, [updateSlotsWithHistory]);

  const handleDistributeSlots = useCallback((axis: DistributionAxis) => {
    if (slotsRef.current.length <= 2) return;
    updateSlotsWithHistory(distributeSlots(slotsRef.current, axis));
    toast.success(axis === "horizontal" ? "تم توزيع المسافات أفقياً" : "تم توزيع المسافات عمودياً");
  }, [updateSlotsWithHistory]);

  const handleUpdateSlot = useCallback((updated: Partial<FreeformSlot>) => {
    const selectedId = selectedSlotIdRef.current;
    if (!selectedId) return;
    const nextSlots = slotsRef.current.map((s) => (s.id === selectedId ? { ...s, ...updated } : s));
    updateSlotsWithHistory(nextSlots);
  }, [updateSlotsWithHistory]);

  /* ⚡ التحديد المتعدد: تبديل عضوية الخلية في المجموعة */
  const handleToggleMultiSelect = useCallback((slotId: string) => {
    setMultiSelectedIds((prev) =>
      prev.includes(slotId) ? prev.filter((id) => id !== slotId) : [...prev, slotId]
    );
  }, []);

  /* ⚡ لوح النسخ واللصق الداخلي */
  const handleCopySelection = useCallback(() => {
    const selectedId = selectedSlotIdRef.current;
    if (!selectedId) return;
    const ids = multiSelectedIdsRef.current.length > 0
      ? [selectedId, ...multiSelectedIdsRef.current]
      : [selectedId];
    clipboardRef.current = slotsRef.current.filter((s) => ids.includes(s.id)).map((s) => ({ ...s }));
    toast.success(`تم نسخ ${ids.length} ${ids.length === 1 ? "خلية" : "خلايا"} إلى الحافظة`);
  }, []);

  const handlePasteClipboard = useCallback(() => {
    const clip = clipboardRef.current;
    if (!clip || clip.length === 0) return;
    const { slots: updated, newIds } = duplicateSlotsByIds(
      slotsRef.current,
      clip.map((s) => s.id)
    );
    if (newIds.length === 0) {
      // المعرفات قديمة (منسوخة) — نعيد التوليد يدوياً كنسخ جديدة
      const copies = clip.map((s) => ({
        ...s,
        id: newSlotId("slot_paste"),
        x: clampNum(s.x + 0.03, 0, 1 - s.w),
        y: clampNum(s.y + 0.03, 0, 1 - s.h),
        label: s.label ? `${s.label} (نسخة)` : undefined,
      }));
      updateSlotsWithHistory([...slotsRef.current, ...copies]);
      setSelectedSlotId(copies[0]?.id || null);
      setMultiSelectedIds(copies.slice(1).map((c) => c.id));
      toast.success(`تم لصق ${copies.length} خلية`);
      return;
    }
    updateSlotsWithHistory(updated);
    setSelectedSlotId(newIds[0]);
    setMultiSelectedIds(newIds.slice(1));
    toast.success(`تم لصق ${newIds.length} خلية`);
  }, [updateSlotsWithHistory]);

  /* ⚡ تحرير جماعي: تكبير/تصغير وقياس موحد */
  const handleScaleSelection = useCallback((factor: number) => {
    const selectedId = selectedSlotIdRef.current;
    if (!selectedId) return;
    const ids = multiSelectedIdsRef.current.length > 0
      ? [selectedId, ...multiSelectedIdsRef.current]
      : [selectedId];
    const updated = scaleSlotsByIds(slotsRef.current, ids, factor, paperWidthMM, paperHeightMM);
    updateSlotsWithHistory(updated);
  }, [updateSlotsWithHistory, paperWidthMM, paperHeightMM]);

  const handleAlignSelectionToEachOther = useCallback((alignment: "left" | "right" | "top" | "bottom" | "center-h" | "center-v" | "same-size") => {
    const selectedId = selectedSlotIdRef.current;
    if (!selectedId) return;
    const ids = multiSelectedIdsRef.current.length > 0
      ? [selectedId, ...multiSelectedIdsRef.current]
      : [selectedId];
    if (ids.length < 2) {
      toast.info("حدد خليتين أو أكثر (Shift + نقرة) للمحاذاة فيما بينها");
      return;
    }
    const updated = alignSlotsToEachOther(slotsRef.current, ids, alignment);
    updateSlotsWithHistory(updated);
  }, [updateSlotsWithHistory]);

  /* ⚡ إزالة كافة التداخلات بضغطة واحدة */
  const handleResolveOverlaps = useCallback(() => {
    const updated = resolveOverlaps(slotsRef.current);
    updateSlotsWithHistory(updated);
    toast.success("تمت إزالة التداخلات بين الخلايا");
  }, [updateSlotsWithHistory]);

  /* ⚡ تصدير التخطيط الحالي كملف JSON للمشاركة */
  const handleExportLayout = useCallback(() => {
    try {
      const file = exportLayoutFile(layoutName, paperWidthMM, paperHeightMM, slotsRef.current);
      const blob = new Blob([JSON.stringify(file, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${(layoutName || "freeform").replace(/[\\/:*?"<>|]/g, "_")}.grido.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("تم تصدير التخطيط كملف JSON");
    } catch {
      toast.error("فشل تصدير التخطيط");
    }
  }, [layoutName, paperWidthMM, paperHeightMM]);

  /* ⚡ استيراد تخطيط JSON خارجي */
  const importInputRef = useRef<HTMLInputElement>(null);
  const handleImportLayout = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const parsed = parseLayoutFile(String(reader.result || ""));
      if (!parsed) {
        toast.error("ملف غير صالح — يجب أن يكون ملف كولاج حر من Grido");
        return;
      }
      const imported = slotsFromFile(parsed);
      setPaperWidthMM(parsed.paperWidthMM);
      setPaperHeightMM(parsed.paperHeightMM);
      setLayoutName(parsed.name);
      setMultiSelectedIds([]);
      updateSlotsWithHistory(imported);
      setSelectedSlotId(imported[0]?.id || null);
      toast.success(`تم استيراد "${parsed.name}" بـ ${imported.length} خلية`);
    };
    reader.onerror = () => toast.error("فشل قراءة الملف");
    reader.readAsText(file);
  }, [updateSlotsWithHistory]);

  // إعادة مزامنة التحديد بعد التراجع/الإعادة/الحذف
  useEffect(() => {
    if (selectedSlotId && !slots.some((s) => s.id === selectedSlotId)) {
      queueMicrotask(() => setSelectedSlotId(slots[0]?.id ?? null));
    }
  }, [slots, selectedSlotId]);

  const nudgeDebounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // اختصارات لوحة المفاتيح
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
        (isCmdOrCtrl && ["z", "y", "d", "c", "v", "a"].includes(keyLower)) ||
        ["delete", "backspace", "escape"].includes(keyLower) ||
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
      } else if (isCmdOrCtrl && keyLower === "c") {
        e.preventDefault();
        handleCopySelection();
      } else if (isCmdOrCtrl && keyLower === "v") {
        e.preventDefault();
        handlePasteClipboard();
      } else if (isCmdOrCtrl && keyLower === "a") {
        e.preventDefault();
        const first = slotsRef.current[0]?.id ?? null;
        setSelectedSlotId(first);
        setMultiSelectedIds(slotsRef.current.slice(1).map((s) => s.id));
      } else if (e.key === "Escape") {
        setMultiSelectedIds([]);
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

        // تحديد المجموعة الكاملة للتحريك الجماعي
        const moveIds = multiSelectedIdsRef.current.length > 0
          ? [selectedId, ...multiSelectedIdsRef.current]
          : [selectedId];
        const moveSet = new Set(moveIds);

        const nextSlots = slotsRef.current.map((s) => {
          if (!moveSet.has(s.id)) return s;
          const nx = Math.min(1 - s.w, Math.max(0, s.x + dx));
          const ny = Math.min(1 - s.h, Math.max(0, s.y + dy));
          return { ...s, x: nx, y: ny };
        });

        setHistoryState((prev) => ({ ...prev, present: nextSlots }));

        if (nudgeDebounceTimer.current) clearTimeout(nudgeDebounceTimer.current);
        nudgeDebounceTimer.current = setTimeout(() => {
          updateSlotsWithHistory(nextSlots);
        }, 150);
      }
    };

    window.addEventListener("keydown", handleKeyDown, { capture: true });
    return () => window.removeEventListener("keydown", handleKeyDown, { capture: true });
  }, [open, handleUndo, handleRedo, handleDuplicateSlot, handleRemoveSlot, handleCopySelection, handlePasteClipboard, updateSlotsWithHistory]);

  const handleSaveAsCustomTemplate = async () => {
    try {
      setIsSavingTemplate(true);
      const currentSlots = slotsRef.current;
      // نضيف أبعاد الورقة للاسم لأن مكتبة القوالب لا تخزنها — ليعرف المستخدم مقاس الورق عند إعادة التطبيق
      const baseName = layoutName.trim() || "كولاج مخصص";
      const templateName = `${baseName} (${paperWidthMM}×${paperHeightMM}مم)`;
      const gridoTemplate = convertToGridoTemplate({
        id: "freeform-" + Date.now(),
        name: templateName,
        paperWidthMM,
        paperHeightMM,
        slots: currentSlots,
      });

      if (typeof SaveCustomTemplate === "function") {
        await SaveCustomTemplate(templateName, gridoTemplate.cells.length, JSON.stringify(gridoTemplate.cells));
        toast.success(`تم حفظ القالب المخصص "${templateName}" في مكتبة قوالبك!`);
      } else {
        const saved = JSON.parse(localStorage.getItem("grido_custom_templates") || "[]");
        saved.push({ name: templateName, template: gridoTemplate });
        localStorage.setItem("grido_custom_templates", JSON.stringify(saved));
        toast.success(`تم حفظ كولاج "${templateName}" المخصص بنجاح!`);
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
        showCloseButton={false}
        className="w-[96vw] sm:max-w-[1180px] h-[93vh] max-h-[900px] overflow-hidden border border-border/80 dark:border-white/10 bg-card/95 backdrop-blur-2xl rounded-2xl shadow-xl font-cairo flex flex-col p-4 gap-3 fluent-specular"
        dir="rtl"
      >
        {/* ═══ الرأس: أيقونة + عنوان + وصف | محدد الورقة | إغلاق ═══ */}
        <DialogHeader className="border-b border-border/40 pb-3 shrink-0">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-primary/12 text-primary flex items-center justify-center shrink-0 border border-primary/20">
                <SquaresFour className="w-4.5 h-4.5" weight="duotone" />
              </div>
              <div className="min-w-0">
                <DialogTitle className="text-sm font-bold tracking-tight text-foreground truncate">
                  محرر الكولاج الحر
                </DialogTitle>
                <p className="text-[10.5px] text-muted-foreground mt-0.5 truncate">
                  ورقة فارغة بالمليمتر — صمم بحرية كاملة، Shift لتحديد متعدد
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5 shrink-0">
              <FreeformPaperSelector
                paperWidthMM={paperWidthMM}
                paperHeightMM={paperHeightMM}
                onPaperDimensionsChange={handlePaperDimensionsChange}
              />
              <DialogCloseButton />
            </div>
          </div>
        </DialogHeader>

        {/* ═══ المحتوى ═══ */}
        <div className="flex flex-col flex-1 min-h-0 gap-2.5">
          {/* شريط أدوات التحرير — أيقوني مضغوط */}
          <FreeformToolbar
            selectedSlotId={selectedSlotId}
            multiSelectedCount={multiSelectedIds.length + (selectedSlotId ? 1 : 0)}
            canUndo={historyState.past.length > 0}
            canRedo={historyState.future.length > 0}
            showCutLines={showCutLines}
            enableSnapping={enableSnapping}
            packGapMM={packGapMM}
            packMarginMM={packMarginMM}
            onPackGapChange={setPackGapMM}
            onPackMarginChange={setPackMarginMM}
            onUndo={handleUndo}
            onRedo={handleRedo}
            onSplitHorizontal={handleSplitHorizontal}
            onSplitVertical={handleSplitVertical}
            onAddSlot={handleAddSlot}
            onAddPresetSlot={handleAddPresetSlot}
            onAutoPack={handleAutoPack}
            onRemoveSlot={handleRemoveSlot}
            onRotateSlot={handleRotateSlot}
            onDuplicateSlot={handleDuplicateSlot}
            onAlignSlot={handleAlignSlot}
            onAlignSelectionToEachOther={handleAlignSelectionToEachOther}
            onScaleSelection={handleScaleSelection}
            onResolveOverlaps={handleResolveOverlaps}
            onDistributeSlots={handleDistributeSlots}
            onToggleCutLines={() => setShowCutLines((prev) => !prev)}
            onToggleSnapping={() => setEnableSnapping((prev) => !prev)}
          />

          {/* مساحة العمل: الكانفس + المفتش الجانبي */}
          <div className="flex flex-1 min-h-0 gap-2.5 items-stretch">
            <div className="flex-1 flex min-h-0">
              <FreeformCanvasEditor
                paperWidthMM={paperWidthMM}
                paperHeightMM={paperHeightMM}
                slots={slots}
                selectedSlotId={selectedSlotId}
                multiSelectedIds={multiSelectedIds}
                showCutLines={showCutLines}
                enableSnapping={enableSnapping}
                onSelectSlot={setSelectedSlotId}
                onToggleMultiSelect={handleToggleMultiSelect}
                onDragStart={handleDragStart}
                onSlotsChange={handleSlotsChange}
                onDragEnd={handleDragEnd}
              />
            </div>

            <div className="w-[230px] shrink-0 flex flex-col justify-start">
              <FreeformSlotInspector
                slot={selectedSlot}
                multiSelectedCount={multiSelectedIds.length + (selectedSlot ? 1 : 0)}
                paperWidthMM={paperWidthMM}
                paperHeightMM={paperHeightMM}
                onUpdateSlot={handleUpdateSlot}
                onRotateSlot={handleRotateSlot}
                onDuplicateSlot={handleDuplicateSlot}
                onRemoveSlot={handleRemoveSlot}
                onAlignSlot={handleAlignSlot}
              />
            </div>
          </div>
        </div>

        {/* ═══ التذييل: اسم + حفظ/تصدير/استيراد | عداد + إلغاء + تطبيق ═══ */}
        <DialogFooter className="border-t border-border/40 pt-3 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <Input
              value={layoutName}
              onChange={(e) => setLayoutName(e.target.value)}
              className="h-8 text-xs rounded-md w-[140px] bg-background border-border/60 font-semibold focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 shrink-0"
              placeholder="اسم التخطيط..."
            />
            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                size="sm"
                className="h-8 rounded-md text-xs gap-1.5 cursor-pointer border-border/60 hover:bg-muted font-semibold focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                onClick={handleSaveAsCustomTemplate}
                disabled={isSavingTemplate || slots.length === 0}
              >
                {isSavingTemplate ? (
                  <>
                    <Spinner size={14} className="text-emerald-500" />
                    <span>جاري الحفظ ...</span>
                  </>
                ) : (
                  <>
                    <FloppyDisk className="w-3.5 h-3.5 text-emerald-500" weight="bold" />
                    <span>حفظ</span>
                  </>
                )}
              </Button>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8 rounded-md cursor-pointer border-border/60 hover:bg-muted"
                    onClick={handleExportLayout}
                    disabled={slots.length === 0}
                  >
                    <DownloadSimple className="w-3.5 h-3.5 text-primary" weight="bold" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top" className="font-cairo text-[11px]">تصدير JSON للمشاركة</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8 rounded-md cursor-pointer border-border/60 hover:bg-muted"
                    onClick={() => importInputRef.current?.click()}
                  >
                    <UploadSimple className="w-3.5 h-3.5 text-primary" weight="bold" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top" className="font-cairo text-[11px]">استيراد تخطيط JSON</TooltipContent>
              </Tooltip>

              <input
                ref={importInputRef}
                type="file"
                accept=".json,application/json"
                className="hidden"
                onChange={handleImportLayout}
              />
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            {/* عدادات حية: الخلايا + التحديد + نسبة الاستغلال */}
            <div className="flex items-center gap-1.5" dir="rtl">
              <span className="text-[10px] font-mono font-bold text-primary bg-primary/10 px-2 py-1 rounded-md border border-primary/20">
                {slots.length} خلية
              </span>
              {multiSelectedIds.length > 0 && (
                <span className="text-[10px] font-mono font-bold text-primary bg-primary/10 px-2 py-1 rounded-md border border-primary/20 animate-in fade-in duration-150">
                  ×{multiSelectedIds.length + 1} محدد
                </span>
              )}
            </div>

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
                  <Spinner size={14} />
                  <span>جاري التطبيق ...</span>
                </>
              ) : (
                <>
                  <Check className="w-3.5 h-3.5" weight="bold" />
                  <span>تطبيق</span>
                </>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
