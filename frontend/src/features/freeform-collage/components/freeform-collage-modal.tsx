import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { toast } from 'sonner';

import { SaveCustomTemplateWithMetadata } from '@bindings/grido/app';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogCloseButton,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import { Spinner } from '@/components/ui/huge-icon';
import { DownloadSimple, UploadSimple, CaretDown, SidebarSimple } from '@/components/ui/icons';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { clamp } from '@/lib/clamp';
import { useEditorStore } from '@/lib/editor-store';
import { downloadJsonFile } from '@/lib/io/download';
import { cn } from '@/lib/utils';
import { toErrorMessage } from '@/lib/wails-error';

import { FreeformCanvasEditor } from './freeform-canvas-editor';
import { FreeformLeftToolsPanel } from './freeform-left-tools-panel';
import { FreeformPaperSelector } from './freeform-paper-selector';
import { FreeformRightInspectorPanel } from './freeform-right-inspector-panel';
import { FreeformTopActionBar, FreeformToolButton } from './freeform-top-action-bar';
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
  slotsFromGridoTemplate,
  newSlotId,
} from '../lib/freeform-math';
import { PHOTO_PRESET_LABELS } from '../lib/mixed-presets';

import type {
  FreeformLayout,
  FreeformDocument,
  FreeformSlot,
  PhotoPresetType,
  SlotAlignment,
  DistributionAxis,
  AutoPackStrategy,
} from '../types';

interface FreeformCollageModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTemplateSaved?: () => void | Promise<void>;
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
        id: newSlotId('slot_blank'),
        x: c * w,
        y: r * h,
        w,
        h,
        presetType: 'iq-national-id',
        label: 'خلية',
        rotation: 0,
      });
    }
  }
  void paperWidthMM;
  void paperHeightMM;
  return slots;
}

function createDocument(
  paperWidthMM: number,
  paperHeightMM: number,
  slots: FreeformSlot[],
  partial?: Partial<FreeformDocument>,
): FreeformDocument {
  return {
    id: partial?.id ?? crypto.randomUUID(),
    name: partial?.name ?? 'كولاج حر مخصص',
    paperWidthMM,
    paperHeightMM,
    slots,
    showCutLines: partial?.showCutLines ?? false,
    enableSnapping: partial?.enableSnapping ?? true,
    packGapMM: partial?.packGapMM ?? 2,
    packMarginMM: partial?.packMarginMM ?? 2,
  };
}

export const FreeformCollageModal: React.FC<FreeformCollageModalProps> = ({
  open,
  onOpenChange,
  onTemplateSaved,
}) => {
  const [paperWidthMM, setPaperWidthMM] = useState<number>(100);
  const [paperHeightMM, setPaperHeightMM] = useState<number>(150);
  const [layoutName, setLayoutName] = useState<string>('كولاج حر مخصص');
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);
  const [isApplying, setIsApplying] = useState<boolean>(false);
  const [isSavingTemplate, setIsSavingTemplate] = useState<boolean>(false);
  const [discardConfirmOpen, setDiscardConfirmOpen] = useState(false);
  const [showCutLines, setShowCutLines] = useState<boolean>(false);
  const [enableSnapping, setEnableSnapping] = useState<boolean>(true);
  const [panelTab, setPanelTab] = useState('insert');
  const [panelOpen, setPanelOpen] = useState(true);
  const dialogRef = useRef<HTMLDivElement>(null);

  const handleSelectSlot = useCallback((id: string | null) => {
    setSelectedSlotId(id);
    if (id) setPanelTab('properties');
  }, []);

  // ⚡ التحديد المتعدد: مجموعة خلايا نشطة إضافة للخلية الأساسية
  const [multiSelectedIds, setMultiSelectedIds] = useState<string[]>([]);
  const clipboardRef = useRef<Clipboard>(null);

  // ⚙️ إعدادات التعبئة الذكية: فجوة وهامش بالمليمتر
  const [packGapMM, setPackGapMM] = useState<number>(2);
  const [packMarginMM, setPackMarginMM] = useState<number>(2);

  const [historyState, setHistoryState] = useState<{
    past: FreeformDocument[];
    present: FreeformDocument;
    future: FreeformDocument[];
  }>(() => {
    const slots = createBlankSheet(100, 150);
    return { past: [], present: createDocument(100, 150, slots), future: [] };
  });

  const dragStartDocumentRef = useRef<FreeformDocument | null>(null);
  const slots = historyState.present.slots;

  const slotsRef = useRef(slots);
  const selectedSlotIdRef = useRef(selectedSlotId);
  const multiSelectedIdsRef = useRef(multiSelectedIds);
  useEffect(() => {
    slotsRef.current = slots;
    selectedSlotIdRef.current = selectedSlotId;
    multiSelectedIdsRef.current = multiSelectedIds;
  }, [slots, selectedSlotId, multiSelectedIds]);

  const documentValue = useMemo(
    () => ({
      ...historyState.present,
      name: layoutName,
      paperWidthMM,
      paperHeightMM,
      slots,
      showCutLines,
      enableSnapping,
      packGapMM,
      packMarginMM,
    }),
    [
      historyState.present,
      layoutName,
      paperWidthMM,
      paperHeightMM,
      slots,
      showCutLines,
      enableSnapping,
      packGapMM,
      packMarginMM,
    ],
  );
  const documentValueRef = useRef(documentValue);
  useEffect(() => {
    documentValueRef.current = documentValue;
  }, [documentValue]);

  // لقطة الافتتاح كـ state — المقارنة أثناء الرسم على ref كانت مخالفة لقواعد React
  const [initialDocument, setInitialDocument] = useState<FreeformDocument | null>(null);
  const hasDraftChanges =
    initialDocument !== null && JSON.stringify(documentValue) !== JSON.stringify(initialDocument);

  const restoreDocument = useCallback((document: FreeformDocument) => {
    setPaperWidthMM(document.paperWidthMM);
    setPaperHeightMM(document.paperHeightMM);
    setLayoutName(document.name);
    setShowCutLines(document.showCutLines);
    setEnableSnapping(document.enableSnapping);
    setPackGapMM(document.packGapMM);
    setPackMarginMM(document.packMarginMM);
  }, []);

  const pushDocumentWithHistory = useCallback(
    (next: FreeformDocument) => {
      setHistoryState((prev) => ({
        past: [...prev.past.slice(-(HISTORY_LIMIT - 1)), documentValueRef.current],
        present: next,
        future: [],
      }));
      restoreDocument(next);
    },
    [restoreDocument],
  );

  const updateSlotsWithHistory = useCallback(
    (newSlots: FreeformSlot[]) =>
      pushDocumentWithHistory({ ...documentValueRef.current, slots: newSlots }),
    [pushDocumentWithHistory],
  );

  const handleUndo = useCallback(() => {
    setHistoryState((prev) => {
      if (prev.past.length === 0) return prev;
      const previous = prev.past[prev.past.length - 1];
      queueMicrotask(() => restoreDocument(previous));
      return {
        past: prev.past.slice(0, -1),
        present: previous,
        future: [documentValueRef.current, ...prev.future].slice(0, HISTORY_LIMIT),
      };
    });
  }, [restoreDocument]);

  const handleRedo = useCallback(() => {
    setHistoryState((prev) => {
      if (prev.future.length === 0) return prev;
      const next = prev.future[0];
      queueMicrotask(() => restoreDocument(next));
      return {
        past: [...prev.past.slice(-(HISTORY_LIMIT - 1)), documentValueRef.current],
        present: next,
        future: prev.future.slice(1),
      };
    });
  }, [restoreDocument]);

  // تصفير وإعادة ضبط الحالات عند فتح النافذة — ورقة فارغة دائماً
  useEffect(() => {
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsApplying(false);
      setIsSavingTemplate(false);
      dragStartDocumentRef.current = null;
      clipboardRef.current = null;
      const store = useEditorStore.getState();
      const ps = store.printSettings;
      const dpi = ps?.dpi || 300;
      let initW = ps?.paperWidthMM;
      let initH = ps?.paperHeightMM;
      if (!initW || !initH) {
        initW = Math.round(((store.canvasWidth || 2480) * 25.4) / dpi);
        initH = Math.round(((store.canvasHeight || 3508) * 25.4) / dpi);
      }
      const isLandscape = ps?.orientation === 'landscape';
      const resolvedW = Math.max(10, isLandscape ? Math.max(initW, initH) : Math.min(initW, initH));
      const resolvedH = Math.max(10, isLandscape ? Math.min(initW, initH) : Math.max(initW, initH));

      const currentTemplate = store.collageTemplate;
      const canResume =
        currentTemplate?.metadata?.kind === 'freeform' ||
        currentTemplate?.id.startsWith('freeform-');
      const templateMetadata = currentTemplate?.metadata;
      const initialSlots =
        canResume && currentTemplate
          ? slotsFromGridoTemplate(currentTemplate).map((slot, index) => ({
              ...slot,
              sourceSlotId: store.slots[index]?.id,
            }))
          : createBlankSheet(resolvedW, resolvedH);
      const initialDocument = createDocument(
        templateMetadata?.paperWidthMM ?? resolvedW,
        templateMetadata?.paperHeightMM ?? resolvedH,
        initialSlots,
        {
          id: currentTemplate?.id ?? crypto.randomUUID(),
          name: canResume ? currentTemplate?.name : 'كولاج حر مخصص',
          showCutLines: templateMetadata?.showCutLines ?? store.collageShowCutLines,
          enableSnapping: templateMetadata?.enableSnapping ?? true,
          packGapMM: templateMetadata?.packGapMM ?? 2,
          packMarginMM: templateMetadata?.packMarginMM ?? 2,
        },
      );
      setInitialDocument(initialDocument);
      restoreDocument(initialDocument);
      setMultiSelectedIds([]);
      setHistoryState({ past: [], present: initialDocument, future: [] });
      setSelectedSlotId(initialSlots[0]?.id || null);
    } else {
      setIsApplying(false);
      setIsSavingTemplate(false);
      dragStartDocumentRef.current = null;
      clipboardRef.current = null;
    }
  }, [open, restoreDocument]);

  const handlePaperDimensionsChange = useCallback(
    (w: number, h: number) => {
      pushDocumentWithHistory({ ...documentValueRef.current, paperWidthMM: w, paperHeightMM: h });
    },
    [pushDocumentWithHistory],
  );

  const handleSplitHorizontal = useCallback(() => {
    const selectedId = selectedSlotIdRef.current;
    if (!selectedId) return;
    updateSlotsWithHistory(splitSlot(slotsRef.current, selectedId, 'horizontal'));
  }, [updateSlotsWithHistory]);

  const handleSplitVertical = useCallback(() => {
    const selectedId = selectedSlotIdRef.current;
    if (!selectedId) return;
    updateSlotsWithHistory(splitSlot(slotsRef.current, selectedId, 'vertical'));
  }, [updateSlotsWithHistory]);

  const handleAddSlot = useCallback(() => {
    const updated = addDefaultSlot(slotsRef.current);
    updateSlotsWithHistory(updated);
    setSelectedSlotId(updated[updated.length - 1].id);
  }, [updateSlotsWithHistory]);

  const handleAddPresetSlot = useCallback(
    (presetType: PhotoPresetType) => {
      const updated = addPresetSlot(slotsRef.current, presetType, paperWidthMM, paperHeightMM);
      updateSlotsWithHistory(updated);
      setSelectedSlotId(updated[updated.length - 1].id);
      toast.success(`أُضيفت ${PHOTO_PRESET_LABELS[presetType]} للورقة`);
    },
    [updateSlotsWithHistory, paperWidthMM, paperHeightMM],
  );

  const handleAutoPack = useCallback(
    (strategy: AutoPackStrategy) => {
      const updated = autoPackSlots(strategy, paperWidthMM, paperHeightMM, packGapMM, packMarginMM);
      updateSlotsWithHistory(updated);
      setSelectedSlotId(updated[0]?.id || null);
      setMultiSelectedIds([]);
      toast.success(`عُبئت الورقة بـ ${updated.length} صورة!`);
    },
    [updateSlotsWithHistory, paperWidthMM, paperHeightMM, packGapMM, packMarginMM],
  );

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
    const ids =
      multiSelectedIdsRef.current.length > 0
        ? [selectedId, ...multiSelectedIdsRef.current]
        : [selectedId];
    const { slots: updated, newIds } = duplicateSlotsByIds(slotsRef.current, ids);
    if (newIds.length === 0) return;
    updateSlotsWithHistory(updated);
    setSelectedSlotId(newIds[0]);
    setMultiSelectedIds(newIds.slice(1));
  }, [updateSlotsWithHistory]);

  const handleAlignSlot = useCallback(
    (alignment: SlotAlignment) => {
      const selectedId = selectedSlotIdRef.current;
      if (!selectedId) return;
      updateSlotsWithHistory(alignSlot(slotsRef.current, selectedId, alignment));
    },
    [updateSlotsWithHistory],
  );

  const handleDistributeSlots = useCallback(
    (axis: DistributionAxis) => {
      if (slotsRef.current.length <= 2) return;
      updateSlotsWithHistory(distributeSlots(slotsRef.current, axis));
      toast.success(axis === 'horizontal' ? 'وُزعت المسافات أفقياً' : 'وُزعت المسافات عمودياً');
    },
    [updateSlotsWithHistory],
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
    [updateSlotsWithHistory],
  );

  /* ⚡ التحديد المتعدد: تبديل عضوية الخلية في المجموعة */
  const handleToggleMultiSelect = useCallback((slotId: string) => {
    setMultiSelectedIds((prev) =>
      prev.includes(slotId) ? prev.filter((id) => id !== slotId) : [...prev, slotId],
    );
  }, []);

  /* ⚡ لوح النسخ واللصق الداخلي */
  const handleCopySelection = useCallback(() => {
    const selectedId = selectedSlotIdRef.current;
    if (!selectedId) return;
    const ids =
      multiSelectedIdsRef.current.length > 0
        ? [selectedId, ...multiSelectedIdsRef.current]
        : [selectedId];
    clipboardRef.current = slotsRef.current
      .filter((s) => ids.includes(s.id))
      .map((s) => ({ ...s }));
    toast.success(`نُسخت ${ids.length} ${ids.length === 1 ? 'خلية' : 'خلايا'} للحافظة`);
  }, []);

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
      setSelectedSlotId(copies[0]?.id || null);
      setMultiSelectedIds(copies.slice(1).map((c) => c.id));
      toast.success(`لُصقت ${copies.length} خلية`);
      return;
    }
    updateSlotsWithHistory(updated);
    setSelectedSlotId(newIds[0]);
    setMultiSelectedIds(newIds.slice(1));
    toast.success(`لُصقت ${newIds.length} خلية`);
  }, [updateSlotsWithHistory]);

  /* ⚡ تحرير جماعي: تكبير/تصغير وقياس موحد */
  const handleScaleSelection = useCallback(
    (factor: number) => {
      const selectedId = selectedSlotIdRef.current;
      if (!selectedId) return;
      const ids =
        multiSelectedIdsRef.current.length > 0
          ? [selectedId, ...multiSelectedIdsRef.current]
          : [selectedId];
      const updated = scaleSlotsByIds(slotsRef.current, ids, factor, paperWidthMM, paperHeightMM);
      updateSlotsWithHistory(updated);
    },
    [updateSlotsWithHistory, paperWidthMM, paperHeightMM],
  );

  const handleAlignSelectionToEachOther = useCallback(
    (alignment: 'left' | 'right' | 'top' | 'bottom' | 'center-h' | 'center-v' | 'same-size') => {
      const selectedId = selectedSlotIdRef.current;
      if (!selectedId) return;
      const ids =
        multiSelectedIdsRef.current.length > 0
          ? [selectedId, ...multiSelectedIdsRef.current]
          : [selectedId];
      if (ids.length < 2) {
        toast.info('حدد خليتين (Shift+نقرة) للمحاذاة');
        return;
      }
      const updated = alignSlotsToEachOther(slotsRef.current, ids, alignment);
      updateSlotsWithHistory(updated);
    },
    [updateSlotsWithHistory],
  );

  /* ⚡ إزالة كافة التداخلات بضغطة واحدة */
  const handleResolveOverlaps = useCallback(() => {
    const updated = resolveOverlaps(slotsRef.current);
    updateSlotsWithHistory(updated);
    toast.success('أُزيلت التداخلات');
  }, [updateSlotsWithHistory]);

  /* ⚡ تصدير التخطيط الحالي كملف JSON للمشاركة */
  const handleExportLayout = useCallback(() => {
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
  ]);

  /* ⚡ استيراد تخطيط JSON خارجي */
  const importInputRef = useRef<HTMLInputElement>(null);
  const handleImportLayout = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
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
        setMultiSelectedIds([]);
        pushDocumentWithHistory(importedDocument);
        setSelectedSlotId(imported[0]?.id || null);
        toast.success(`أُستورد "${parsed.name}" بـ ${imported.length} خلية`);
      };
      reader.onerror = () => toast.error('فشل القراءة');
      reader.readAsText(file);
    },
    [pushDocumentWithHistory],
  );
  useEffect(() => {
    if (selectedSlotId && !slots.some((s) => s.id === selectedSlotId)) {
      queueMicrotask(() => setSelectedSlotId(slots[0]?.id ?? null));
    }
  }, [slots, selectedSlotId]);

  const nudgeDebounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // تنظيف مؤقت الإزاحة عند فك التركيب
  useEffect(
    () => () => {
      if (nudgeDebounceTimer.current) clearTimeout(nudgeDebounceTimer.current);
    },
    [],
  );

  // اختصارات لوحة المفاتيح
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement as HTMLElement | null;
      if (
        activeEl &&
        (activeEl.tagName === 'INPUT' ||
          activeEl.tagName === 'TEXTAREA' ||
          activeEl.tagName === 'SELECT' ||
          activeEl.isContentEditable ||
          activeEl.closest(
            '[role="tablist"], [role="menu"], [role="listbox"], [role="combobox"], [role="alertdialog"]',
          ))
      ) {
        return;
      }

      const keyLower = e.key.toLowerCase();
      const isCmdOrCtrl = e.ctrlKey || e.metaKey;

      // 🛡️ H14 من تدقيق 2026-10-08: Escape كان ضمن المفاتيح المحتجزة بـ
      // `stopImmediatePropagation` على مستوى capture، فلا يصله مستمع Radix على
      // document فلا يُغلق الحوار إطلاقاً (X/Escape الطبيعي معطّل). Escape
      // يُترك لطبقة DismissableLayer، والمسح يحدث في `onEscapeKeyDown` أدناه.
      const isHandledKey =
        (isCmdOrCtrl && ['z', 'y', 'd', 'c', 'v', 'a'].includes(keyLower)) ||
        ['delete', 'backspace'].includes(keyLower) ||
        ['arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(keyLower);

      if (isHandledKey) {
        e.stopPropagation();
        e.stopImmediatePropagation();
      }

      if (isCmdOrCtrl && keyLower === 'z') {
        e.preventDefault();
        if (e.shiftKey) handleRedo();
        else handleUndo();
      } else if (isCmdOrCtrl && keyLower === 'y') {
        e.preventDefault();
        handleRedo();
      } else if (isCmdOrCtrl && keyLower === 'd') {
        e.preventDefault();
        handleDuplicateSlot();
      } else if (isCmdOrCtrl && keyLower === 'c') {
        e.preventDefault();
        handleCopySelection();
      } else if (isCmdOrCtrl && keyLower === 'v') {
        e.preventDefault();
        handlePasteClipboard();
      } else if (isCmdOrCtrl && keyLower === 'a') {
        e.preventDefault();
        const first = slotsRef.current[0]?.id ?? null;
        setSelectedSlotId(first);
        setMultiSelectedIds(slotsRef.current.slice(1).map((s) => s.id));
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        handleRemoveSlot();
      } else if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        const selectedId = selectedSlotIdRef.current;
        if (!selectedId) return;
        e.preventDefault();
        const step = e.shiftKey ? 0.025 : 0.005;
        let dx = 0;
        let dy = 0;
        if (e.key === 'ArrowLeft') dx = -step;
        if (e.key === 'ArrowRight') dx = step;
        if (e.key === 'ArrowUp') dy = -step;
        if (e.key === 'ArrowDown') dy = step;

        // تحديد المجموعة الكاملة للتحريك الجماعي
        const moveIds =
          multiSelectedIdsRef.current.length > 0
            ? [selectedId, ...multiSelectedIdsRef.current]
            : [selectedId];
        const moveSet = new Set(moveIds);

        const nextSlots = slotsRef.current.map((s) => {
          if (!moveSet.has(s.id)) return s;
          const nx = clamp(s.x + dx, 0, 1 - s.w);
          const ny = clamp(s.y + dy, 0, 1 - s.h);
          return { ...s, x: nx, y: ny };
        });

        setHistoryState((prev) => ({
          ...prev,
          present: { ...prev.present, slots: nextSlots },
        }));

        if (nudgeDebounceTimer.current) clearTimeout(nudgeDebounceTimer.current);
        nudgeDebounceTimer.current = setTimeout(() => {
          updateSlotsWithHistory(nextSlots);
        }, 150);
      }
    };

    window.addEventListener('keydown', handleKeyDown, { capture: true });
    return () => window.removeEventListener('keydown', handleKeyDown, { capture: true });
  }, [
    open,
    handleUndo,
    handleRedo,
    handleDuplicateSlot,
    handleRemoveSlot,
    handleCopySelection,
    handlePasteClipboard,
    updateSlotsWithHistory,
  ]);

  const handleSaveAsCustomTemplate = async () => {
    try {
      setIsSavingTemplate(true);
      const currentSlots = slotsRef.current;
      const baseName = layoutName.trim() || 'كولاج مخصص';
      const templateName = `${baseName} (${paperWidthMM}×${paperHeightMM}مم)`;
      const gridoTemplate = convertToGridoTemplate({
        id: 'freeform-' + crypto.randomUUID(),
        name: templateName,
        paperWidthMM,
        paperHeightMM,
        slots: currentSlots,
        showCutLines,
        enableSnapping,
        packGapMM,
        packMarginMM,
      });

      if (typeof SaveCustomTemplateWithMetadata === 'function') {
        await SaveCustomTemplateWithMetadata(
          templateName,
          gridoTemplate.cells.length,
          JSON.stringify(gridoTemplate.cells),
          JSON.stringify(gridoTemplate.metadata),
        );
        toast.success(`حُفظ القالب "${templateName}" في قوالبك!`);
        await onTemplateSaved?.();
      } else {
        const raw = localStorage.getItem('grido_custom_templates');
        let saved: Array<{ name: string; template: unknown }> = [];
        if (raw) {
          const parsed: unknown = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            saved = parsed.filter(
              (item): item is { name: string; template: unknown } =>
                !!item &&
                typeof item === 'object' &&
                typeof (item as { name?: unknown }).name === 'string',
            );
          }
        }
        saved.push({ name: templateName, template: gridoTemplate });
        localStorage.setItem('grido_custom_templates', JSON.stringify(saved));
        toast.success(`حُفظ الكولاج "${templateName}"`);
        await onTemplateSaved?.();
      }
    } catch (err: unknown) {
      toast.error(toErrorMessage(err, 'فشل الحفظ'));
    } finally {
      setIsSavingTemplate(false);
    }
  };

  const handleDragStart = useCallback(() => {
    dragStartDocumentRef.current = documentValueRef.current;
  }, []);

  const handleSlotsChange = useCallback((next: FreeformSlot[]) => {
    setHistoryState((prev) => ({ ...prev, present: { ...prev.present, slots: next } }));
  }, []);

  const handleDragEnd = useCallback((finalSlots: FreeformSlot[]) => {
    const start = dragStartDocumentRef.current;
    dragStartDocumentRef.current = null;
    if (!start) return;
    setHistoryState((prev) => ({
      past: [...prev.past.slice(-(HISTORY_LIMIT - 1)), start],
      present: { ...prev.present, slots: finalSlots },
      future: [],
    }));
  }, []);

  const handleApplyToCanvas = () => {
    try {
      setIsApplying(true);
      const currentSlots = slotsRef.current;
      const sourceSlotIds = currentSlots.map((slot) => slot.sourceSlotId);
      const layout: FreeformLayout = {
        id: 'freeform-' + crypto.randomUUID(),
        name: layoutName || 'كولاج حر مخصص',
        paperWidthMM,
        paperHeightMM,
        slots: currentSlots,
      };

      const gridoTemplate = convertToGridoTemplate(layout);
      const store = useEditorStore.getState();

      const result = store.commitCollageLayout(gridoTemplate, {
        paperWidthMM,
        paperHeightMM,
        gap: 0,
        margin: 0,
        sourceSlotIds,
      });
      if (result.remaining > 0) {
        toast.info(
          `أُبقيت ${result.remaining} ${result.remaining === 1 ? 'صورة' : 'صور'} في قائمة التعبئة`,
        );
      }

      toast.success(`طُبّق كولاج "${layout.name}" (${paperWidthMM}×${paperHeightMM} مم)`);
      // نقطة الافتتاح تتقدم بعد التطبيق — الإغلاق التالي لا يسأل عن مسودة مطبقة
      setInitialDocument(documentValueRef.current);
      onOpenChange(false);
    } catch (err: unknown) {
      toast.error(toErrorMessage(err, 'خطأ أثناء التطبيق'));
    } finally {
      setIsApplying(false);
    }
  };

  const selectedSlot = slots.find((s) => s.id === selectedSlotId);

  const multiCountTotal = multiSelectedIds.length + (selectedSlot ? 1 : 0);

  const requestClose = useCallback(() => {
    if (hasDraftChanges) setDiscardConfirmOpen(true);
    else onOpenChange(false);
  }, [hasDraftChanges, onOpenChange]);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next && hasDraftChanges) {
          setDiscardConfirmOpen(true);
          return;
        }
        onOpenChange(next);
      }}
    >
      <DialogContent
        ref={dialogRef}
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          dialogRef.current?.focus();
        }}
        showCloseButton={false}
        className="w-[calc(100vw-16px)] max-w-none sm:max-w-[1600px] h-[calc(100dvh-16px)] flex flex-col p-0 overflow-hidden bg-card border border-border/80 rounded-xl shadow-fluent-16 font-cairo gap-0"
        dir="rtl"
        aria-describedby={undefined}
        onEscapeKeyDown={() => setMultiSelectedIds([])}
      >
        <DialogHeader className="px-3 py-2 border-b border-border/60 shrink-0">
          <div className="flex flex-wrap items-center gap-2 min-w-0">
            <DialogTitle className="text-sm font-semibold whitespace-nowrap">
              الكولاج الحر
            </DialogTitle>
            <div className="hidden sm:block h-5 w-px bg-border/60 mx-1" />
            <Input
              value={layoutName}
              onChange={(e) => setLayoutName(e.target.value)}
              aria-label="اسم التخطيط"
              className="h-8 w-full order-last sm:order-none sm:w-48 min-w-0 border-transparent bg-transparent text-xs shadow-none hover:border-border focus-visible:border-primary"
            />
            <div className="flex-1" />
            <DropdownMenu dir="rtl">
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-7 sm:w-auto gap-1 px-1 sm:px-3 text-xs"
                  aria-label="خيارات التخطيط"
                >
                  <span className="hidden sm:inline">ملف</span>
                  <CaretDown className="size-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 font-cairo">
                <DropdownMenuItem onSelect={() => importInputRef.current?.click()}>
                  <UploadSimple className="size-4" />
                  استيراد JSON
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={handleExportLayout} disabled={slots.length === 0}>
                  <DownloadSimple className="size-4" />
                  تصدير JSON
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs"
              onClick={handleSaveAsCustomTemplate}
              disabled={isSavingTemplate || slots.length === 0}
            >
              {isSavingTemplate ? <Spinner size={14} /> : null}
              حفظ قالب
            </Button>
            <Button
              size="sm"
              className="h-8 text-xs px-3 sm:px-5"
              onClick={handleApplyToCanvas}
              disabled={isApplying || slots.length === 0}
            >
              {isApplying ? <Spinner size={14} /> : null}
              {isApplying ? 'جاري التطبيق ...' : 'تطبيق الكولاج'}
            </Button>
            <div className="hidden sm:block h-5 w-px bg-border/60 mx-1" />
            <DialogCloseButton onClick={requestClose} />
          </div>
        </DialogHeader>
        <input
          ref={importInputRef}
          type="file"
          accept=".json,application/json"
          className="hidden"
          onChange={handleImportLayout}
        />

        <div className="flex flex-wrap items-center justify-between border-b border-border/60 shrink-0">
          <FreeformTopActionBar
            selectedSlotId={selectedSlotId}
            multiSelectedCount={multiCountTotal}
            canUndo={historyState.past.length > 0}
            canRedo={historyState.future.length > 0}
            showCutLines={showCutLines}
            enableSnapping={enableSnapping}
            onUndo={handleUndo}
            onRedo={handleRedo}
            onDuplicateSlot={handleDuplicateSlot}
            onRotateSlot={handleRotateSlot}
            onRemoveSlot={handleRemoveSlot}
            onScaleSelection={handleScaleSelection}
            onSplitHorizontal={handleSplitHorizontal}
            onSplitVertical={handleSplitVertical}
            onAlignSlot={handleAlignSlot}
            onAlignSelectionToEachOther={handleAlignSelectionToEachOther}
            onDistributeSlots={handleDistributeSlots}
            onResolveOverlaps={handleResolveOverlaps}
            onToggleCutLines={() => setShowCutLines((prev) => !prev)}
            onToggleSnapping={() => setEnableSnapping((prev) => !prev)}
          />

          <div className="flex items-center gap-2 px-3 py-1.5 min-w-0">
            <FreeformToolButton
              onClick={() => setPanelOpen((value) => !value)}
              active={panelOpen}
              title={panelOpen ? 'إخفاء لوحة الأدوات' : 'إظهار لوحة الأدوات'}
            >
              <SidebarSimple className="size-4" />
            </FreeformToolButton>
            <FreeformPaperSelector
              paperWidthMM={paperWidthMM}
              paperHeightMM={paperHeightMM}
              onPaperDimensionsChange={handlePaperDimensionsChange}
              className="min-w-0"
            />
          </div>
        </div>

        <div className="relative flex flex-1 min-h-0 overflow-hidden">
          <aside
            aria-label="لوحة الكولاج"
            className={cn(
              'w-[280px] max-w-[85%] shrink-0 border-e border-border/60 bg-card min-h-0 flex-col absolute inset-y-0 start-0 z-30 shadow-fluent-16 md:static md:shadow-none',
              panelOpen ? 'flex' : 'hidden',
            )}
          >
            <Tabs
              value={panelTab}
              onValueChange={setPanelTab}
              dir="rtl"
              className="gap-0 flex-1 min-h-0"
            >
              <TabsList
                aria-label="أدوات الكولاج"
                className="h-11 w-full shrink-0 rounded-none border-0 border-b border-border/60 bg-transparent dark:bg-transparent p-0 gap-0"
              >
                {(
                  [
                    ['insert', 'إدراج'],
                    ['pack', 'تعبئة'],
                    ['properties', 'خصائص'],
                  ] as const
                ).map(([value, label]) => (
                  <TabsTrigger
                    key={value}
                    value={value}
                    className="rounded-none h-full text-xs data-[state=active]:border-0 data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none"
                  >
                    {label}
                  </TabsTrigger>
                ))}
              </TabsList>
              {(['insert', 'pack'] as const).map((mode) => (
                <TabsContent
                  key={mode}
                  value={mode}
                  forceMount
                  className="min-h-0 overflow-y-auto data-[state=inactive]:hidden"
                >
                  <FreeformLeftToolsPanel
                    mode={mode}
                    packGapMM={packGapMM}
                    packMarginMM={packMarginMM}
                    onAddSlot={handleAddSlot}
                    onAddPresetSlot={handleAddPresetSlot}
                    onAutoPack={handleAutoPack}
                    onPackGapChange={setPackGapMM}
                    onPackMarginChange={setPackMarginMM}
                  />
                </TabsContent>
              ))}
              <TabsContent value="properties" className="min-h-0 overflow-y-auto">
                <FreeformRightInspectorPanel
                  slot={selectedSlot}
                  multiSelectedCount={multiCountTotal}
                  paperWidthMM={paperWidthMM}
                  paperHeightMM={paperHeightMM}
                  onUpdateSlot={handleUpdateSlot}
                />
              </TabsContent>
            </Tabs>
          </aside>
          <main aria-label="مساحة تخطيط الكولاج" className="flex-1 min-w-0 min-h-0 flex">
            <FreeformCanvasEditor
              paperWidthMM={paperWidthMM}
              paperHeightMM={paperHeightMM}
              slots={slots}
              selectedSlotId={selectedSlotId}
              multiSelectedIds={multiSelectedIds}
              showCutLines={showCutLines}
              enableSnapping={enableSnapping}
              onSelectSlot={handleSelectSlot}
              onToggleMultiSelect={handleToggleMultiSelect}
              onDragStart={handleDragStart}
              onSlotsChange={handleSlotsChange}
              onDragEnd={handleDragEnd}
            />
          </main>
        </div>

        <footer className="h-8 px-3 border-t border-border/60 flex items-center gap-4 shrink-0 text-mini text-muted-foreground tabular-nums">
          <span>{slots.length} خلايا</span>
          {multiCountTotal > 0 && <span>{multiCountTotal} محدد</span>}
          <div className="flex-1" />
          <Button variant="ghost" size="sm" className="h-7 text-mini" onClick={requestClose}>
            إلغاء
          </Button>
        </footer>

        {/* حوار تجاهل المسودة — يظهر فقط عند وجود تغييرات غير مطبقة */}
        <AlertDialog open={discardConfirmOpen} onOpenChange={setDiscardConfirmOpen}>
          <AlertDialogContent dir="rtl" className="font-cairo">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-start text-base font-bold">
                تجاهل تعديلات التخطيط؟
              </AlertDialogTitle>
              <AlertDialogDescription className="text-start text-xs text-muted-foreground leading-relaxed">
                لديك تعديلات لم تُطبَّق بعد. الإغلاق سيُلغيها، و«تطبيق الكولاج» يثبّتها على الورقة.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="cursor-pointer rounded-md h-8 text-xs font-semibold">
                متابعة التحرير
              </AlertDialogCancel>
              <AlertDialogAction
                className="cursor-pointer rounded-md h-8 text-xs font-bold bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={() => {
                  setDiscardConfirmOpen(false);
                  onOpenChange(false);
                }}
              >
                تجاهل التعديلات
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </DialogContent>
    </Dialog>
  );
};
