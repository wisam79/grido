import { useEffect } from 'react';

import type { FreeformSlot } from '../types';
import type { RefObject } from 'react';

interface UseFreeformKeyboardParams {
  open: boolean;
  handleUndo: () => void;
  handleRedo: () => void;
  handleDuplicateSlot: () => void;
  handleRemoveSlot: () => void;
  handleCopySelection: () => void;
  handlePasteClipboard: () => void;
  handleNudge: (dx: number, dy: number) => void;
  finishNudgeBurst: () => void;
  setSlotSelection: (primaryId: string | null, secondaryIds?: readonly string[]) => void;
  slotsRef: RefObject<FreeformSlot[]>;
  selectedSlotIdRef: RefObject<string | null>;
}

/**
 * اختصارات لوحة المفاتيح في حوار الكولاج الحر (تراجع/إعادة/مضاعفة/نسخ/لصق/
 * تحديد الكل/حذف/أسهم التحريك مع دفعة النبضة) — كانت تأثيراً بـ150 سطراً داخل
 * freeform-collage-modal. يُسجَّل على capture عمداً ليعمل فوق عناصر الحوار،
 * ويُترك Escape لطبقة Radix (H14 من تدقيق 2026-10-08).
 */
export function useFreeformKeyboard({
  open,
  handleUndo,
  handleRedo,
  handleDuplicateSlot,
  handleRemoveSlot,
  handleCopySelection,
  handlePasteClipboard,
  handleNudge,
  finishNudgeBurst,
  setSlotSelection,
  slotsRef,
  selectedSlotIdRef,
}: UseFreeformKeyboardParams): void {
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      const keyLower = e.key.toLowerCase();
      const isArrowKey = ['arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(keyLower);
      if (!isArrowKey) finishNudgeBurst();
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
        finishNudgeBurst();
        return;
      }

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
        setSlotSelection(
          first,
          slotsRef.current.slice(1).map((s) => s.id),
        );
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

        handleNudge(dx, dy);
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
    handleNudge,
    finishNudgeBurst,
    setSlotSelection,
    slotsRef,
    selectedSlotIdRef,
  ]);
}
