import { useCallback, useRef } from 'react';
import { toast } from 'sonner';

import { clamp } from '@/lib/clamp';
import { downloadJsonFile } from '@/lib/io/download';

import {
  splitSlot,
  removeSlot,
  removeSlotsByIds,
  duplicateSlotsByIds,
  addDefaultSlot,
  addPresetSlot,
  autoPackSlots,
  distributeSlots,
  rotateSlot,
  alignSlot,
  alignSlotsToEachOther,
  scaleSlotsByIds,
  resolveOverlaps,
  exportLayoutFile,
  parseLayoutFile,
  slotsFromFile,
  newSlotId,
  normalizeSlotSelection,
} from './freeform-math';
import { PHOTO_PRESET_LABELS } from './mixed-presets';
import { createDocument, type Clipboard } from './use-freeform-document-history';

import type {
  FreeformDocument,
  FreeformSlot,
  PhotoPresetType,
  SlotAlignment,
  DistributionAxis,
  AutoPackStrategy,
} from '../types';
import type { RefObject, ChangeEvent } from 'react';

interface UseFreeformSlotActionsParams {
  slotsRef: RefObject<FreeformSlot[]>;
  selectedSlotIdRef: RefObject<string | null>;
  multiSelectedIdsRef: RefObject<string[]>;
  documentValueRef: RefObject<FreeformDocument>;
  updateSlotsWithHistory: (slots: FreeformSlot[]) => void;
  pushDocumentWithHistory: (document: FreeformDocument) => void;
  setSlotSelection: (primaryId: string | null, secondaryIds?: readonly string[]) => void;
  finishNudgeBurst: () => void;
  paperWidthMM: number;
  paperHeightMM: number;
  packGapMM: number;
  packMarginMM: number;
  showCutLines: boolean;
  enableSnapping: boolean;
  layoutName: string;
}

/**
 * إجراءات الخلايا في الكولاج الحر (تقسيم/إضافة/تعبئة/حذف/تدوير/مضاعفة/محاذاة/
 * توزيع/نسخ ولصق/تحرير جماعي/تصدير واستيراد JSON) — كانت 20 معالجاً متمركزة
 * داخل freeform-collage-modal فتضخّمه إلى ما يفوق 1100 سطر. كل إجراء يقرأ
 * الحالة الحية عبر المراجع ويكتب عبر updateSlotsWithHistory فلا يتغير أي سلوك.
 */
export function useFreeformSlotActions({
  slotsRef,
  selectedSlotIdRef,
  multiSelectedIdsRef,
  documentValueRef,
  updateSlotsWithHistory,
  pushDocumentWithHistory,
  setSlotSelection,
  finishNudgeBurst,
  paperWidthMM,
  paperHeightMM,
  packGapMM,
  packMarginMM,
  showCutLines,
  enableSnapping,
  layoutName,
}: UseFreeformSlotActionsParams) {
  const clipboardRef = useRef<Clipboard>(null);
  const importInputRef = useRef<HTMLInputElement>(null);

  const handlePaperDimensionsChange = useCallback(
    (w: number, h: number) => {
      pushDocumentWithHistory({ ...documentValueRef.current, paperWidthMM: w, paperHeightMM: h });
    },
    [pushDocumentWithHistory, documentValueRef],
  );

  const handleSplitHorizontal = useCallback(() => {
    const selectedId = selectedSlotIdRef.current;
    if (!selectedId) return;
    updateSlotsWithHistory(splitSlot(slotsRef.current, selectedId, 'horizontal'));
  }, [updateSlotsWithHistory, slotsRef, selectedSlotIdRef]);

  const handleSplitVertical = useCallback(() => {
    const selectedId = selectedSlotIdRef.current;
    if (!selectedId) return;
    updateSlotsWithHistory(splitSlot(slotsRef.current, selectedId, 'vertical'));
  }, [updateSlotsWithHistory, slotsRef, selectedSlotIdRef]);

  const handleAddSlot = useCallback(() => {
    const updated = addDefaultSlot(slotsRef.current);
    updateSlotsWithHistory(updated);
    setSlotSelection(updated[updated.length - 1].id);
  }, [setSlotSelection, updateSlotsWithHistory, slotsRef]);

  const handleAddPresetSlot = useCallback(
    (presetType: PhotoPresetType) => {
      const updated = addPresetSlot(slotsRef.current, presetType, paperWidthMM, paperHeightMM);
      updateSlotsWithHistory(updated);
      setSlotSelection(updated[updated.length - 1].id);
      toast.success(`أُضيفت ${PHOTO_PRESET_LABELS[presetType]} للورقة`);
    },
    [setSlotSelection, updateSlotsWithHistory, paperWidthMM, paperHeightMM, slotsRef],
  );

  const handleAutoPack = useCallback(
    (strategy: AutoPackStrategy) => {
      const updated = autoPackSlots(strategy, paperWidthMM, paperHeightMM, packGapMM, packMarginMM);
      updateSlotsWithHistory(updated);
      setSlotSelection(updated[0]?.id ?? null);
      toast.success(`عُبئت الورقة بـ ${updated.length} صورة!`);
    },
    [
      setSlotSelection,
      updateSlotsWithHistory,
      paperWidthMM,
      paperHeightMM,
      packGapMM,
      packMarginMM,
    ],
  );

  const handleRemoveSlot = useCallback(() => {
    const selectedId = selectedSlotIdRef.current;
    if (!selectedId) return;

    // حذف جماعي عند وجود تحديد متعدد
    const { selectedIds } = normalizeSlotSelection(selectedId, multiSelectedIdsRef.current);
    if (selectedIds.length > 1) {
      const updated = removeSlotsByIds(slotsRef.current, selectedIds);
      if (updated.length === slotsRef.current.length) return;
      updateSlotsWithHistory(updated);
      setSlotSelection(updated[0]?.id ?? null);
      return;
    }

    if (slotsRef.current.length <= 1) return;
    const updated = removeSlot(slotsRef.current, selectedId);
    if (updated.length === slotsRef.current.length) return;
    updateSlotsWithHistory(updated);
    setSlotSelection(updated[0]?.id ?? null);
  }, [setSlotSelection, updateSlotsWithHistory, slotsRef, selectedSlotIdRef, multiSelectedIdsRef]);

  const handleRotateSlot = useCallback(() => {
    const selectedId = selectedSlotIdRef.current;
    if (!selectedId) return;
    updateSlotsWithHistory(rotateSlot(slotsRef.current, selectedId, paperWidthMM, paperHeightMM));
  }, [updateSlotsWithHistory, paperWidthMM, paperHeightMM, slotsRef, selectedSlotIdRef]);

  const handleDuplicateSlot = useCallback(() => {
    const selectedId = selectedSlotIdRef.current;
    if (!selectedId) return;

    // مضاعفة جماعية للتحديد المتعدد
    const { selectedIds: ids } = normalizeSlotSelection(selectedId, multiSelectedIdsRef.current);
    const { slots: updated, newIds } = duplicateSlotsByIds(slotsRef.current, ids);
    if (newIds.length === 0) return;
    updateSlotsWithHistory(updated);
    setSlotSelection(newIds[0], newIds.slice(1));
  }, [setSlotSelection, updateSlotsWithHistory, slotsRef, selectedSlotIdRef, multiSelectedIdsRef]);

  const handleAlignSlot = useCallback(
    (alignment: SlotAlignment) => {
      const selectedId = selectedSlotIdRef.current;
      if (!selectedId) return;
      updateSlotsWithHistory(alignSlot(slotsRef.current, selectedId, alignment));
    },
    [updateSlotsWithHistory, slotsRef, selectedSlotIdRef],
  );

  const handleDistributeSlots = useCallback(
    (axis: DistributionAxis) => {
      if (slotsRef.current.length <= 2) return;
      updateSlotsWithHistory(distributeSlots(slotsRef.current, axis));
      toast.success(axis === 'horizontal' ? 'وُزعت المسافات أفقياً' : 'وُزعت المسافات عمودياً');
    },
    [updateSlotsWithHistory, slotsRef],
  );

  const handleUpdateSlot = useCallback(
    (updated: Partial<FreeformSlot>) => {
      const selectedId = selectedSlotIdRef.current;
      if (!selectedId) return;
      const nextSlots = slotsRef.current.map((s) =>
        s.id === selectedId ? { ...s, ...updated } : s,
      );
      updateSlotsWithHistory(nextSlots);
    },
    [updateSlotsWithHistory, slotsRef, selectedSlotIdRef],
  );

  /* التحديد المتعدد: تبديل العضوية مع ترقية خلية باقية عند إزالة الأساسية */
  const handleToggleMultiSelect = useCallback(
    (slotId: string) => {
      const { selectedIds } = normalizeSlotSelection(
        selectedSlotIdRef.current,
        multiSelectedIdsRef.current,
      );
      const nextIds = selectedIds.includes(slotId)
        ? selectedIds.filter((id) => id !== slotId)
        : [...selectedIds, slotId];
      setSlotSelection(nextIds[0] ?? null, nextIds.slice(1));
    },
    [setSlotSelection, selectedSlotIdRef, multiSelectedIdsRef],
  );

  /* ⚡ لوح النسخ واللصق الداخلي */
  const handleCopySelection = useCallback(() => {
    finishNudgeBurst();
    const selectedId = selectedSlotIdRef.current;
    if (!selectedId) return;
    const { selectedIds: ids } = normalizeSlotSelection(selectedId, multiSelectedIdsRef.current);
    clipboardRef.current = slotsRef.current
      .filter((s) => ids.includes(s.id))
      .map((s) => ({ ...s }));
    toast.success(`نُسخت ${ids.length} ${ids.length === 1 ? 'خلية' : 'خلايا'} للحافظة`);
  }, [finishNudgeBurst, slotsRef, selectedSlotIdRef, multiSelectedIdsRef]);

  const handlePasteClipboard = useCallback(() => {
    const clip = clipboardRef.current;
    if (!clip || clip.length === 0) return;
    const { slots: updated, newIds } = duplicateSlotsByIds(
      slotsRef.current,
      clip.map((s) => s.id),
    );
    if (newIds.length === 0) {
      // المعرفات قديمة (منسوخة) — نعيد التوليد يدوياً كنسخ جديدة
      const copies = clip.map((s) => ({
        ...s,
        id: newSlotId('slot_paste'),
        x: clamp(s.x + 0.03, 0, 1 - s.w),
        y: clamp(s.y + 0.03, 0, 1 - s.h),
        label: s.label ? `${s.label} (نسخة)` : undefined,
      }));
      updateSlotsWithHistory([...slotsRef.current, ...copies]);
      setSlotSelection(
        copies[0]?.id ?? null,
        copies.slice(1).map((c) => c.id),
      );
      toast.success(`لُصقت ${copies.length} خلية`);
      return;
    }
    updateSlotsWithHistory(updated);
    setSlotSelection(newIds[0], newIds.slice(1));
    toast.success(`لُصقت ${newIds.length} خلية`);
  }, [setSlotSelection, updateSlotsWithHistory, slotsRef]);

  /* ⚡ تحرير جماعي: تكبير/تصغير وقياس موحد */
  const handleScaleSelection = useCallback(
    (factor: number) => {
      const selectedId = selectedSlotIdRef.current;
      if (!selectedId) return;
      const { selectedIds: ids } = normalizeSlotSelection(selectedId, multiSelectedIdsRef.current);
      const updated = scaleSlotsByIds(slotsRef.current, ids, factor, paperWidthMM, paperHeightMM);
      updateSlotsWithHistory(updated);
    },
    [
      updateSlotsWithHistory,
      paperWidthMM,
      paperHeightMM,
      slotsRef,
      selectedSlotIdRef,
      multiSelectedIdsRef,
    ],
  );

  const handleAlignSelectionToEachOther = useCallback(
    (alignment: 'left' | 'right' | 'top' | 'bottom' | 'center-h' | 'center-v' | 'same-size') => {
      const selectedId = selectedSlotIdRef.current;
      if (!selectedId) return;
      const { selectedIds: ids } = normalizeSlotSelection(selectedId, multiSelectedIdsRef.current);
      if (ids.length < 2) {
        toast.info('حدد خليتين (Shift+نقرة) للمحاذاة');
        return;
      }
      const updated = alignSlotsToEachOther(slotsRef.current, ids, alignment);
      updateSlotsWithHistory(updated);
    },
    [updateSlotsWithHistory, slotsRef, selectedSlotIdRef, multiSelectedIdsRef],
  );

  /* ⚡ إزالة كافة التداخلات بضغطة واحدة */
  const handleResolveOverlaps = useCallback(() => {
    const updated = resolveOverlaps(slotsRef.current);
    updateSlotsWithHistory(updated);
    toast.success('أُزيلت التداخلات');
  }, [updateSlotsWithHistory, slotsRef]);

  /* ⚡ تصدير التخطيط الحالي كملف JSON للمشاركة */
  const handleExportLayout = useCallback(() => {
    finishNudgeBurst();
    try {
      const file = exportLayoutFile(layoutName, paperWidthMM, paperHeightMM, slotsRef.current, {
        showCutLines,
        enableSnapping,
        packGapMM,
        packMarginMM,
      });
      downloadJsonFile(
        file,
        `${(layoutName || 'freeform').replace(/[\\/:*?"<>|]/g, '_')}.grido.json`,
      );
      toast.success('صُدّر التخطيط JSON');
    } catch {
      toast.error('فشل التصدير');
    }
  }, [
    layoutName,
    paperWidthMM,
    paperHeightMM,
    showCutLines,
    enableSnapping,
    packGapMM,
    packMarginMM,
    finishNudgeBurst,
    slotsRef,
  ]);

  /* ⚡ استيراد تخطيط JSON خارجي */
  const handleImportLayout = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      finishNudgeBurst();
      const file = e.target.files?.[0];
      e.target.value = '';
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        const parsed = parseLayoutFile(String(reader.result || ''));
        if (!parsed) {
          toast.error('ملف غير صالح — ليس ملف كولاج Grido');
          return;
        }
        const imported = slotsFromFile(parsed);
        const importedDocument = createDocument(
          parsed.paperWidthMM,
          parsed.paperHeightMM,
          imported,
          {
            id: crypto.randomUUID(),
            name: parsed.name,
            showCutLines: parsed.showCutLines ?? false,
            enableSnapping: parsed.enableSnapping ?? true,
            packGapMM: parsed.gapMM ?? 2,
            packMarginMM: parsed.marginMM ?? 2,
          },
        );
        pushDocumentWithHistory(importedDocument);
        setSlotSelection(imported[0]?.id ?? null);
        toast.success(`أُستورد "${parsed.name}" بـ ${imported.length} خلية`);
      };
      reader.onerror = () => toast.error('فشل القراءة');
      reader.readAsText(file);
    },
    [finishNudgeBurst, pushDocumentWithHistory, setSlotSelection],
  );

  return {
    clipboardRef,
    importInputRef,
    handlePaperDimensionsChange,
    handleSplitHorizontal,
    handleSplitVertical,
    handleAddSlot,
    handleAddPresetSlot,
    handleAutoPack,
    handleRemoveSlot,
    handleRotateSlot,
    handleDuplicateSlot,
    handleAlignSlot,
    handleDistributeSlots,
    handleUpdateSlot,
    handleToggleMultiSelect,
    handleCopySelection,
    handlePasteClipboard,
    handleScaleSelection,
    handleAlignSelectionToEachOther,
    handleResolveOverlaps,
    handleExportLayout,
    handleImportLayout,
  };
}
