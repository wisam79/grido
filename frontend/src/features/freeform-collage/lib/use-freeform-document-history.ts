import { useCallback, useMemo, useRef, useState } from 'react';

import { moveSlotsWithinBounds, newSlotId, normalizeSlotSelection } from './freeform-math';

import type { FreeformDocument, FreeformSlot } from '../types';
import type { RefObject } from 'react';

/** سقف سجل التراجع في حوار الكولاج الحر */
export const HISTORY_LIMIT = 100;

export type DocumentHistory = {
  past: FreeformDocument[];
  present: FreeformDocument;
  future: FreeformDocument[];
};

type Clipboard = FreeformSlot[] | null;

/**
 * ورقة البداية الفارغة — شبكة بسيطة 2×4 كنقطة انطلاق قابلة للتعديل فوراً
 * (ليست "قالباً جاهزاً" بل مجرد مساحة عمل أولية يحررها المستخدم كما يشاء)
 */
export function createBlankSheet(paperWidthMM: number, paperHeightMM: number): FreeformSlot[] {
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

export function createDocument(
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

/** حقول المستند التي يملكها الحوار مباشرة (تُستعاد على الحالة بعد كل انتقال تاريخ) */
export interface FreeformDocumentUIState {
  paperWidthMM: number;
  paperHeightMM: number;
  layoutName: string;
  showCutLines: boolean;
  enableSnapping: boolean;
  packGapMM: number;
  packMarginMM: number;
}

interface UseFreeformDocumentHistoryParams {
  ui: FreeformDocumentUIState;
  /** ينعكس المستند المستعاد (تراجع/إعادة/استيراد) على حالة الحوار الحية */
  applyDocumentToUI: (document: FreeformDocument) => void;
  selectedSlotIdRef: RefObject<string | null>;
  multiSelectedIdsRef: RefObject<string[]>;
}

/**
 * محرّك المستند والتاريخ للكولاج الحر — كانت متمركزة داخل freeform-collage-modal
 * فكان الحوار قائداً أوركسترا بـ1100+ سطر. يملك: لقطة الحالة (past/present/future)
 * بقيمة documentValue المشتقة، عمليات الاستبدال والدفع والتراجع والإعادة،
 * وآلية نبضة الأسهم (دفعة تحريك واحدة بخطوة تراجع واحدة — اللقطة الأولى
 * الفعّالة تملك مرجعها والتوقيت لا يكتب مستنداً).
 */
export function useFreeformDocumentHistory({
  ui,
  applyDocumentToUI,
  selectedSlotIdRef,
  multiSelectedIdsRef,
}: UseFreeformDocumentHistoryParams) {
  const {
    paperWidthMM,
    paperHeightMM,
    layoutName,
    showCutLines,
    enableSnapping,
    packGapMM,
    packMarginMM,
  } = ui;

  const [historyState, setHistoryState] = useState<DocumentHistory>(() => {
    const slots = createBlankSheet(100, 150);
    return { past: [], present: createDocument(100, 150, slots), future: [] };
  });

  const [documentRevision, setDocumentRevision] = useState(0);
  const historyStateRef = useRef(historyState);
  const dragStartDocumentRef = useRef<FreeformDocument | null>(null);
  const nudgeStartDocumentRef = useRef<FreeformDocument | null>(null);
  const slotEditHistoryRef = useRef<DocumentHistory | null>(null);
  const nudgeDebounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const slots = historyState.present.slots;

  const slotsRef = useRef(slots);

  // The first effective nudge already owns its undo baseline; timers never write a document.
  const finishNudgeBurst = useCallback(() => {
    if (nudgeDebounceTimer.current !== null) {
      clearTimeout(nudgeDebounceTimer.current);
      nudgeDebounceTimer.current = null;
    }
    nudgeStartDocumentRef.current = null;
  }, []);

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

  // Keep event readers current before React batches another input, timer, or undo.
  const replaceHistory = useCallback((next: DocumentHistory) => {
    historyStateRef.current = next;
    documentValueRef.current = next.present;
    slotsRef.current = next.present.slots;
    setHistoryState(next);
  }, []);

  const restoreDocument = useCallback(
    (document: FreeformDocument) => {
      applyDocumentToUI(document);
    },
    [applyDocumentToUI],
  );

  const commitSlotEdit = useCallback(() => {
    const baseline = slotEditHistoryRef.current;
    slotEditHistoryRef.current = null;
    if (!baseline) return;
    const prev = historyStateRef.current;
    if (prev.present.id !== baseline.present.id) return;
    if (JSON.stringify(prev.present.slots) === JSON.stringify(baseline.present.slots)) {
      replaceHistory({ ...prev, past: baseline.past, future: baseline.future });
      return;
    }
    replaceHistory({
      ...prev,
      past: [...baseline.past.slice(-(HISTORY_LIMIT - 1)), baseline.present],
      future: [],
    });
  }, [replaceHistory]);

  const beginSlotEdit = useCallback(() => {
    finishNudgeBurst();
    commitSlotEdit();
    slotEditHistoryRef.current = historyStateRef.current;
  }, [finishNudgeBurst, commitSlotEdit]);

  const cancelSlotEdit = useCallback(() => {
    const baseline = slotEditHistoryRef.current;
    slotEditHistoryRef.current = null;
    if (!baseline || historyStateRef.current.present.id !== baseline.present.id) return;
    setDocumentRevision((revision) => revision + 1);
    replaceHistory(baseline);
    restoreDocument(baseline.present);
  }, [replaceHistory, restoreDocument]);

  const pushDocumentWithHistory = useCallback(
    (next: FreeformDocument) => {
      commitSlotEdit();
      setDocumentRevision((revision) => revision + 1);
      finishNudgeBurst();
      dragStartDocumentRef.current = null;
      const prev = historyStateRef.current;
      replaceHistory({
        past: [...prev.past.slice(-(HISTORY_LIMIT - 1)), prev.present],
        present: next,
        future: [],
      });
      restoreDocument(next);
    },
    [commitSlotEdit, finishNudgeBurst, replaceHistory, restoreDocument],
  );

  const updateDocumentOptions = useCallback(
    (patch: Partial<Omit<FreeformDocument, 'id' | 'slots'>>) => {
      commitSlotEdit();
      finishNudgeBurst();
      const prev = historyStateRef.current;
      const next = { ...prev.present, ...patch };
      // Non-undoable options survive geometry undo/redo, not just the current frame.
      replaceHistory({
        past: prev.past.map((document) =>
          document.id === next.id ? { ...document, ...patch } : document,
        ),
        present: next,
        future: prev.future.map((document) =>
          document.id === next.id ? { ...document, ...patch } : document,
        ),
      });
      restoreDocument(next);
    },
    [commitSlotEdit, finishNudgeBurst, replaceHistory, restoreDocument],
  );

  const updateSlotsWithHistory = useCallback(
    (newSlots: FreeformSlot[], preview = false) => {
      const hadEdit = slotEditHistoryRef.current !== null;
      if (!preview) {
        commitSlotEdit();
        if (hadEdit) setDocumentRevision((revision) => revision + 1);
      }
      const prev = historyStateRef.current;
      if (newSlots === prev.present.slots) return;
      if (slotEditHistoryRef.current) {
        const baseline = slotEditHistoryRef.current;
        replaceHistory({
          ...prev,
          past: [...baseline.past.slice(-(HISTORY_LIMIT - 1)), baseline.present],
          present: { ...prev.present, slots: newSlots },
          future: [],
        });
      } else {
        pushDocumentWithHistory({ ...documentValueRef.current, slots: newSlots });
      }
    },
    [commitSlotEdit, pushDocumentWithHistory, replaceHistory],
  );

  const handleUndo = useCallback(() => {
    commitSlotEdit();
    finishNudgeBurst();
    dragStartDocumentRef.current = null;
    const prev = historyStateRef.current;
    if (prev.past.length === 0) return;
    const previous = prev.past[prev.past.length - 1];
    setDocumentRevision((revision) => revision + 1);
    replaceHistory({
      past: prev.past.slice(0, -1),
      present: previous,
      future: [prev.present, ...prev.future].slice(0, HISTORY_LIMIT),
    });
    restoreDocument(previous);
  }, [commitSlotEdit, finishNudgeBurst, replaceHistory, restoreDocument]);

  const handleRedo = useCallback(() => {
    commitSlotEdit();
    finishNudgeBurst();
    dragStartDocumentRef.current = null;
    const prev = historyStateRef.current;
    if (prev.future.length === 0) return;
    const next = prev.future[0];
    setDocumentRevision((revision) => revision + 1);
    replaceHistory({
      past: [...prev.past.slice(-(HISTORY_LIMIT - 1)), prev.present],
      present: next,
      future: prev.future.slice(1),
    });
    restoreDocument(next);
  }, [commitSlotEdit, finishNudgeBurst, replaceHistory, restoreDocument]);

  const handleNudge = useCallback(
    (dx: number, dy: number) => {
      commitSlotEdit();
      const { selectedIds } = normalizeSlotSelection(
        selectedSlotIdRef.current,
        multiSelectedIdsRef.current,
      );
      const prev = historyStateRef.current;
      const nextSlots = moveSlotsWithinBounds(prev.present.slots, selectedIds, dx, dy);
      if (nextSlots === prev.present.slots) return;

      const startsBurst = nudgeStartDocumentRef.current === null;
      const baseline = nudgeStartDocumentRef.current ?? prev.present;
      nudgeStartDocumentRef.current = baseline;
      replaceHistory({
        past: startsBurst ? [...prev.past.slice(-(HISTORY_LIMIT - 1)), baseline] : prev.past,
        present: { ...prev.present, slots: nextSlots },
        future: [],
      });
      if (nudgeDebounceTimer.current !== null) clearTimeout(nudgeDebounceTimer.current);
      nudgeDebounceTimer.current = setTimeout(finishNudgeBurst, 150);
    },
    [commitSlotEdit, finishNudgeBurst, replaceHistory, selectedSlotIdRef, multiSelectedIdsRef],
  );

  const handleDragStart = useCallback(() => {
    commitSlotEdit();
    finishNudgeBurst();
    dragStartDocumentRef.current = documentValueRef.current;
  }, [commitSlotEdit, finishNudgeBurst]);

  const handleSlotsChange = useCallback(
    (next: FreeformSlot[]) => {
      const prev = historyStateRef.current;
      if (!dragStartDocumentRef.current || next === prev.present.slots) return;
      replaceHistory({ ...prev, present: { ...prev.present, slots: next }, future: [] });
    },
    [replaceHistory],
  );

  const handleDragEnd = useCallback(
    (finalSlots: FreeformSlot[]) => {
      const start = dragStartDocumentRef.current;
      dragStartDocumentRef.current = null;
      if (!start || start.slots.every((slot, index) => slot === finalSlots[index])) return;
      const prev = historyStateRef.current;
      replaceHistory({
        past: [...prev.past.slice(-(HISTORY_LIMIT - 1)), start],
        present: { ...prev.present, slots: finalSlots },
        future: [],
      });
    },
    [replaceHistory],
  );

  return {
    historyState,
    documentRevision,
    historyStateRef,
    slots,
    slotsRef,
    documentValue,
    documentValueRef,
    dragStartDocumentRef,
    slotEditHistoryRef,
    beginSlotEdit,
    commitSlotEdit,
    cancelSlotEdit,
    replaceHistory,
    pushDocumentWithHistory,
    updateDocumentOptions,
    updateSlotsWithHistory,
    handleUndo,
    handleRedo,
    finishNudgeBurst,
    handleNudge,
    handleDragStart,
    handleSlotsChange,
    handleDragEnd,
  };
}

export type { Clipboard };
