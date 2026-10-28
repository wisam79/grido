import { useEffect } from 'react';
import { useHotkeys } from 'react-hotkeys-hook';
import { toast } from 'sonner';

import { SaveImageFromBase64 } from '@bindings/grido/app';

import {
  autoFitZoomStore,
  fitWidthZoomStore,
  fitZoomStore,
  resetZoomStore,
  zoomInStore,
  zoomOutStore,
} from '@/hooks/use-canvas-zoom';
import { resolveImageAspectRatio } from '@/lib/canvas/image-dimensions';
import { useEditorStore } from '@/lib/editor-store';
import { pasteFromClipboardOrStore } from '@/lib/io/clipboard-utils';
import { createLogger } from '@/lib/logger';
import { getSectionsForWorkflow } from '@/lib/workspace-tools';

import type { CanvasElement } from '@/lib/editor-store';

const logger = createLogger('use-keyboard-shortcuts');

export function isModalActive(): boolean {
  if (typeof document === 'undefined') return false;
  return Boolean(
    document.querySelector('[role="dialog"], [role="alertdialog"], [aria-modal="true"]'),
  );
}

function shouldIgnoreCanvasAction(e: KeyboardEvent): boolean {
  if (isModalActive()) return true;
  const target = e.target as HTMLElement | null;
  if (!target) return false;
  return Boolean(
    target.tagName === 'INPUT' ||
    target.tagName === 'TEXTAREA' ||
    target.isContentEditable ||
    target.closest?.(
      'input, textarea, [contenteditable="true"], select, [role="dialog"], [role="alertdialog"]',
    ),
  );
}

export function useKeyboardShortcuts() {
  // --- Shortcuts via react-hotkeys-hook ---

  // 🛡️ H15 من تدقيق 2026-10-08: اختصار لوحة الاختصارات (Ctrl+/) كان مسجّلاً
  // بمستمع keydown خام داخل `keyboard-shortcuts-dialog.tsx` — مالك ثانٍ لمفاتيح
  // عامة بلا حرّاس الحقول النصية ولا تسجيل وفق قاعدة المصدر الواحد. انتقل هنا.
  useHotkeys(
    'mod+/, mod+shift+/',
    (e) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)
      ) {
        return;
      }
      e.preventDefault();
      window.dispatchEvent(new CustomEvent('grido:open-shortcuts'));
    },
    { enableOnFormTags: false },
  );

  // Undo: Ctrl+Z or Cmd+Z
  useHotkeys(
    'mod+z',
    (e) => {
      e.preventDefault();
      useEditorStore.getState().undo();
    },
    { ignoreEventWhen: shouldIgnoreCanvasAction },
  );

  // Redo: Ctrl+Shift+Z or Ctrl+Y or Cmd+Shift+Z or Cmd+Y
  useHotkeys(
    'mod+shift+z, mod+y',
    (e) => {
      e.preventDefault();
      useEditorStore.getState().redo();
    },
    { ignoreEventWhen: shouldIgnoreCanvasAction },
  );

  // Delete / Backspace — العناصر المقفلة لا تُحذف بصمت، ونُعلم المستخدم إن تبقى شيء محذوف.
  useHotkeys(
    'delete, backspace',
    (e) => {
      e.preventDefault();
      const state = useEditorStore.getState();
      // 🧱 التمييز بالمعرف لا بالوضع: في الكولاج التحديد يشير لخانة فيُفرغ صورتها،
      // وفي الوضع الحر يشير لعنصراً حرّاً فيُحذف. اختيار عنصر حر داخل الكولاج
      // (قوائم/اختبارات) يسقط لمسار العناصر.
      const selectedElementCount = state.elements.filter((x) =>
        state.selectedIds.includes(x.id),
      ).length;
      if (state.mode === 'collage' && selectedElementCount === 0) {
        const selectedSlotIds = state.selectedIds.filter((id) =>
          state.slots.some((slot) => slot.id === id),
        );
        const imageIds = selectedSlotIds.filter((id) =>
          state.slots.some((slot) => slot.id === id && slot.imageSrc),
        );
        if (imageIds.length === 0) return;
        state.updateSlotsBatch(imageIds, { imageSrc: undefined, originalImageSrc: undefined });
        state.pushHistory();
        return;
      }
      const { selectedIds, elements, removeElements, removeElement } = state;
      // 🧱 فصل الوضعين: في الكولاج التحديد يشير لخانة لا لعنصر حر — نتحقق
      // من وجود عناصر حرة محددة فعلاً لتفادي تنبيه «العناصر مقفلة» عند Delete على خانة كولاج
      const selectedElements = elements.filter((x) => selectedIds.includes(x.id));
      if (selectedElements.length === 0) return;
      const removableIds = selectedElements.filter((el) => !el.locked).map((el) => el.id);
      if (removableIds.length === 0) {
        toast.info('العناصر المحددة مقفلة — ألغِ قفلها أولاً للحذف');
        return;
      }
      if (removableIds.length < selectedElements.length) {
        toast.info('تجاهلنا العناصر المقفلة وحذفنا غير المقفلة فقط');
      }
      if (removableIds.length === 1) {
        removeElement(removableIds[0]);
      } else {
        removeElements(removableIds);
      }
    },
    {
      ignoreEventWhen: (e) => {
        if (shouldIgnoreCanvasAction(e)) return true;
        const t = e.target as HTMLElement | null;
        return !!t?.closest?.('button, [role="menu"], [role="menuitem"]');
      },
    },
  );

  // Duplicate: Ctrl+D or Cmd+D
  useHotkeys(
    'mod+d',
    (e) => {
      e.preventDefault();
      const { selectedIds, duplicateElements, duplicateElement } = useEditorStore.getState();
      if (selectedIds.length === 1) {
        duplicateElement(selectedIds[0]);
      } else if (selectedIds.length > 1) {
        duplicateElements(selectedIds);
      }
    },
    { ignoreEventWhen: shouldIgnoreCanvasAction },
  );

  // Select All: Ctrl+A or Cmd+A (Canvas elements only when outside text inputs and modals)
  useHotkeys('mod+a', (e) => {
    if (shouldIgnoreCanvasAction(e)) return;
    const { mode, elements, slots, selectAllElements, setSelectedIds } = useEditorStore.getState();
    if (mode === 'collage' && slots.length > 0) {
      e.preventDefault();
      setSelectedIds(slots.map((slot) => slot.id));
    } else if (mode === 'single' && elements.length > 0) {
      e.preventDefault();
      selectAllElements();
    }
  });

  // Copy: Ctrl+C or Cmd+C
  useHotkeys('mod+c', (e) => {
    if (shouldIgnoreCanvasAction(e)) return;
    const { selectedIds, copySelectedElements } = useEditorStore.getState();
    if (selectedIds.length > 0) {
      e.preventDefault();
      copySelectedElements(selectedIds);
    }
  });

  // Cut: Ctrl+X or Cmd+X
  useHotkeys('mod+x', (e) => {
    if (shouldIgnoreCanvasAction(e)) return;
    const { selectedIds, cutSelectedElements } = useEditorStore.getState();
    if (selectedIds.length > 0) {
      e.preventDefault();
      cutSelectedElements(selectedIds);
    }
  });

  // Paste: Ctrl+V or Cmd+V
  useHotkeys('mod+v', async (e) => {
    if (shouldIgnoreCanvasAction(e)) return;
    e.preventDefault();
    await pasteFromClipboardOrStore();
  });

  // Group: Ctrl+G or Cmd+G
  useHotkeys(
    'mod+g',
    (e) => {
      e.preventDefault();
      const { selectedIds, groupSelectedElements } = useEditorStore.getState();
      if (selectedIds.length > 0) groupSelectedElements();
    },
    { ignoreEventWhen: shouldIgnoreCanvasAction },
  );

  // Ungroup: Ctrl+Shift+G or Cmd+Shift+G
  useHotkeys(
    'shift+mod+g',
    (e) => {
      e.preventDefault();
      const { selectedIds, ungroupSelectedElements } = useEditorStore.getState();
      if (selectedIds.length > 0) ungroupSelectedElements();
    },
    { ignoreEventWhen: shouldIgnoreCanvasAction },
  );

  // 🛡️ تكديس المودالات: مفاتيح فتح الحوارات تتجاهل الحالة أثناء مودال مفتوح
  // أو داخل حقول الإدخال (يمنع Export فوق Print وما شابه).
  // Save: Ctrl+S or Cmd+S — فتح مكتبة المشاريع للحفظ
  useHotkeys(
    'mod+s',
    (e) => {
      e.preventDefault();
      window.dispatchEvent(
        new CustomEvent('grido:open-projects-dialog', { detail: { tab: 'save' } }),
      );
    },
    { ignoreEventWhen: shouldIgnoreCanvasAction },
  );

  // Export: Ctrl+E or Cmd+E — كانت معلنة في الحوار وشريط الأدوات بلا مستمع (إصلاح Bug#7)
  useHotkeys(
    'mod+e',
    (e) => {
      e.preventDefault();
      window.dispatchEvent(new CustomEvent('grido:open-export-dialog'));
    },
    { ignoreEventWhen: shouldIgnoreCanvasAction },
  );

  // Print: Ctrl+P or Cmd+P — تمنع أيضاً طباعة المتصفح الافتراضية (إصلاح Bug#7)
  useHotkeys(
    'mod+p',
    (e) => {
      e.preventDefault();
      window.dispatchEvent(new CustomEvent('grido:open-print-dialog'));
    },
    { ignoreEventWhen: shouldIgnoreCanvasAction },
  );

  // Insert Image: Ctrl+O or Cmd+O — تمنع فتح ملف المتصفح الافتراضي (إصلاح Bug#7)
  useHotkeys(
    'mod+o',
    (e) => {
      e.preventDefault();
      window.dispatchEvent(new CustomEvent('grido:open-file-dialog'));
    },
    { ignoreEventWhen: shouldIgnoreCanvasAction },
  );

  // Batch / Multi Insert: Ctrl+Shift+O or Cmd+Shift+O
  useHotkeys(
    'mod+shift+o',
    (e) => {
      e.preventDefault();
      window.dispatchEvent(new CustomEvent('grido:open-batch-insert-dialog'));
    },
    { ignoreEventWhen: shouldIgnoreCanvasAction },
  );

  // Toggle Right Sidebar (Templates / Layers): Ctrl+B or Cmd+B
  useHotkeys(
    'mod+b',
    (e) => {
      e.preventDefault();
      window.dispatchEvent(new CustomEvent('grido:toggle-right-sidebar'));
    },
    { ignoreEventWhen: shouldIgnoreCanvasAction },
  );

  // Toggle Left Sidebar (Properties / Workspace): Ctrl+Shift+B or Cmd+Shift+B
  useHotkeys(
    'mod+shift+b',
    (e) => {
      e.preventDefault();
      window.dispatchEvent(new CustomEvent('grido:toggle-left-sidebar'));
    },
    { ignoreEventWhen: shouldIgnoreCanvasAction },
  );

  // Switch workspace sections: Alt+1 … Alt+9 — مفهرسة من سجل الوجهات الموحّد
  // (كانت مكتوبة يدوياً لكل تبويب؛ الربط بالفهرس يوسّعها تلقائياً عند إضافة وجهة)
  // 🛡️ نفس حارس تكديس المودالات أعلاه — تبديل الوجهات/الوضع خلف مودال مفتوح ممنوع.
  // ملاحظة: الفهرس يُحل من قائمة وجهات مسار العمل — في مسار quick تنطوي وجهة
  // العناصر إلى «الطبقات» فيبقى Alt+1 هو الوجهة الأولى كما تظهر في الشريط.
  const tabGuard = { ignoreEventWhen: shouldIgnoreCanvasAction };
  const selectVisibleSectionByIndex = (e: KeyboardEvent, index: number) => {
    e.preventDefault();
    const { mode, workflow } = useEditorStore.getState();
    const section = getSectionsForWorkflow(mode, workflow)[index];
    if (!section) return;
    const isCollage = mode === 'collage';
    window.dispatchEvent(
      new CustomEvent(isCollage ? 'grido:select-collage-tab' : 'grido:select-studio-tab', {
        detail: { tab: section.defaultTab },
      }),
    );
  };
  useHotkeys('alt+1', (e) => selectVisibleSectionByIndex(e, 0), tabGuard);
  useHotkeys('alt+2', (e) => selectVisibleSectionByIndex(e, 1), tabGuard);
  useHotkeys('alt+3', (e) => selectVisibleSectionByIndex(e, 2), tabGuard);
  useHotkeys('alt+4', (e) => selectVisibleSectionByIndex(e, 3), tabGuard);
  useHotkeys('alt+5', (e) => selectVisibleSectionByIndex(e, 4), tabGuard);
  useHotkeys('alt+6', (e) => selectVisibleSectionByIndex(e, 5), tabGuard);
  useHotkeys('alt+7', (e) => selectVisibleSectionByIndex(e, 6), tabGuard);
  useHotkeys('alt+8', (e) => selectVisibleSectionByIndex(e, 7), tabGuard);
  useHotkeys('alt+9', (e) => selectVisibleSectionByIndex(e, 8), tabGuard);

  // Switch Editor Mode: Ctrl+Alt+1 (كولاج) / Ctrl+Alt+2 (تعديل حر)
  // كانت عناوين مبدّل الوضع في الواجهة تعد بهذين الاختصارين بلا تسجيل فعلي لهما
  useHotkeys(
    'mod+alt+1',
    (e) => {
      e.preventDefault();
      useEditorStore.getState().setMode('collage');
    },
    tabGuard,
  );

  useHotkeys(
    'mod+alt+2',
    (e) => {
      e.preventDefault();
      useEditorStore.getState().setMode('single');
    },
    tabGuard,
  );

  // Ctrl+K — لوحة كل الأدوات (وصول بالاسم بلا تمرير في الشريط)
  useHotkeys(
    'mod+k',
    (e) => {
      e.preventDefault();
      window.dispatchEvent(new CustomEvent('grido:open-tool-launcher'));
    },
    tabGuard,
  );

  // Toggle Zen Mode (Canvas focus): Tab key or Ctrl+. / Cmd+.
  useHotkeys(
    'tab, mod+.',
    (e) => {
      if (shouldIgnoreCanvasAction(e)) return;
      if (e.key === 'Tab') {
        const target = (e.target || document.activeElement) as HTMLElement | null;
        if (
          target?.closest?.(
            'button, [role="button"], a, input, textarea, select, [role="slider"], [role="switch"], [role="combobox"], [role="listbox"], [role="tab"], [tabindex]:not([tabindex="-1"])',
          )
        ) {
          return;
        }
      }
      e.preventDefault();
      window.dispatchEvent(new CustomEvent('grido:toggle-zen-mode'));
    },
    {
      ignoreEventWhen: (e) => {
        if (isModalActive()) return true;
        if (e.key === 'Tab') {
          const t = (e.target || document.activeElement) as HTMLElement | null;
          return !!t?.closest?.(
            'button, [role="button"], a, input, textarea, [contenteditable="true"], [role="slider"], [role="switch"], [role="combobox"], [role="listbox"], [role="tab"], select, [tabindex]:not([tabindex="-1"])',
          );
        }
        return false;
      },
    },
  );

  // Toggle Rulers: Ctrl+R or Cmd+R
  useHotkeys('mod+r', (e) => {
    e.preventDefault();
    const { showRuler, setShowRuler } = useEditorStore.getState();
    setShowRuler(!showRuler);
  });

  // Toggle Grid: Ctrl+' or Cmd+'
  useHotkeys("mod+'", (e) => {
    e.preventDefault();
    const { showGrid, setShowGrid } = useEditorStore.getState();
    setShowGrid(!showGrid);
  });

  // Toggle User Guides: Ctrl+; or Cmd+; — كان معلناً في شريط العرض بلا تسجيل فعلي
  useHotkeys('mod+;', (e) => {
    e.preventDefault();
    const { showUserGuides, setShowUserGuides } = useEditorStore.getState();
    setShowUserGuides(!showUserGuides);
  });

  // Zoom In: Ctrl+= or Ctrl++ or Cmd+= / Cmd++
  useHotkeys('mod+=, mod+plus, mod+numpad_add, mod+shift+=', (e) => {
    e.preventDefault();
    zoomInStore();
  });

  // Zoom Out: Ctrl+- or Ctrl+_ or Cmd+- / Cmd+_
  useHotkeys('mod+-, mod+underscore, mod+numpad_subtract', (e) => {
    e.preventDefault();
    zoomOutStore();
  });

  // Fit all: Ctrl+0 — الورقة كاملة على الشاشة (منفصل عن 100% الحقيقي)
  useHotkeys('mod+0, mod+numpad_0', (e) => {
    e.preventDefault();
    fitZoomStore();
  });

  // Fit width: Ctrl+Shift+0 — تملأ عرض منطقة العمل ويُمرَّر الباقي رأسياً
  useHotkeys('shift+mod+0, shift+mod+numpad_0', (e) => {
    e.preventDefault();
    fitWidthZoomStore();
  });

  // Fit auto: Ctrl+Alt+0 — يختار الوضع الأنسب لهندسة النافذة
  useHotkeys('alt+mod+0, alt+mod+numpad_0', (e) => {
    e.preventDefault();
    autoFitZoomStore();
  });

  // True 100%: Ctrl+1 or Cmd+1
  useHotkeys('mod+1, mod+numpad_1', (e) => {
    e.preventDefault();
    resetZoomStore();
  });

  // --- Arrows (Nudging) & Paste via native events ---
  useEffect(() => {
    let nudgeTimeout: ReturnType<typeof setTimeout> | null = null;

    // عناصر تحكم تفاعلية: تركيز إبهام السلايدر (span[role="slider"]) أو مفتاح
    // تبديل لا يجب أن يُحرّك العناصر بالأسهم أو يمسح التحديد بـ Escape (إصلاح Bug#5)
    const isInteractiveTarget = (t: HTMLElement | null) =>
      !!t &&
      !!t.closest(
        'input, textarea, [contenteditable="true"], [role="slider"], [role="switch"], [role="combobox"], [role="listbox"], [role="tab"], select',
      );

    const handleKeyDown = (e: KeyboardEvent) => {
      if (isModalActive()) return;
      const target = e.target as HTMLElement;
      if (isInteractiveTarget(target)) return;

      const { selectedIds, mode, elements } = useEditorStore.getState();
      const selectedElementCount = elements.filter((x) => selectedIds.includes(x.id)).length;

      // Escape = Clear selection and stop editing
      if (e.key === 'Escape') {
        const { setEditingTextId, setSelectedIds } = useEditorStore.getState();
        setEditingTextId(null);
        setSelectedIds([]);
        return;
      }

      // 🧱 تحريك القص للخانات المحددة — بالمعرف لا بالوضع: تحديد عناصر حرة
      // داخل الكولاج يسقط لمسار العناصر أدناه.
      if (
        mode === 'collage' &&
        selectedIds.length > 0 &&
        selectedElementCount === 0 &&
        ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)
      ) {
        e.preventDefault();
        const state = useEditorStore.getState();
        const selectedSet = new Set(selectedIds);
        const delta = e.shiftKey ? 8 : 2;
        let dragX = 0;
        let dragY = 0;
        if (e.key === 'ArrowUp') dragY = -delta;
        if (e.key === 'ArrowDown') dragY = delta;
        if (e.key === 'ArrowLeft') dragX = -delta;
        if (e.key === 'ArrowRight') dragX = delta;
        state.slots.forEach((slot) => {
          if (!selectedSet.has(slot.id) || !slot.imageSrc) return;
          state.updateSlot(slot.id, {
            dragX: (slot.dragX ?? 0) + dragX,
            dragY: (slot.dragY ?? 0) + dragY,
          });
        });
        if (nudgeTimeout) clearTimeout(nudgeTimeout);
        nudgeTimeout = setTimeout(() => {
          useEditorStore.getState().pushHistory();
          nudgeTimeout = null;
        }, 400);
        return;
      }

      // Alt + ArrowUp / ArrowDown = Smooth scaling of selected element (توسيع / تقليص ناعم للعنصر)
      if (selectedIds.length > 0 && e.altKey && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
        e.preventDefault();
        const { elements, updateElements, updateElement } = useEditorStore.getState();
        const isGrow = e.key === 'ArrowUp';
        const factor = e.shiftKey ? (isGrow ? 1.05 : 0.95) : isGrow ? 1.015 : 0.985;

        const patches = selectedIds
          .map((id) => {
            const el = elements.find((x) => x.id === id);
            if (!el || el.locked) return null;

            const newW = Math.max(0.01, Math.min(2.0, el.width * factor));
            const newH = Math.max(0.01, Math.min(2.0, el.height * factor));
            const dw = newW - el.width;
            const dh = newH - el.height;

            // الحفاظ على مركز العنصر ثابتاً أثناء التكبير/التصغير
            const patch: Partial<CanvasElement> = {
              width: newW,
              height: newH,
              x: el.x - dw / 2,
              y: el.y - dh / 2,
            };

            if (el.type === 'text' && typeof (el as { fontSize?: number }).fontSize === 'number') {
              (patch as Record<string, unknown>).fontSize = Math.max(
                6,
                Math.round((el as { fontSize: number }).fontSize * factor),
              );
            }

            return { id, patch };
          })
          .filter(Boolean) as { id: string; patch: Partial<CanvasElement> }[];

        if (patches.length > 0) {
          if (patches.length === 1) {
            updateElement(patches[0].id, patches[0].patch);
          } else {
            updateElements(patches);
          }

          if (nudgeTimeout) clearTimeout(nudgeTimeout);
          nudgeTimeout = setTimeout(() => {
            useEditorStore.getState().pushHistory();
            nudgeTimeout = null;
          }, 400);
        }
        return;
      }

      // Arrow Keys = Nudging selected elements
      if (
        selectedIds.length > 0 &&
        ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)
      ) {
        e.preventDefault();
        const { elements, updateElements, updateElement } = useEditorStore.getState();
        const step = e.shiftKey ? 0.015 : 0.002;
        let dx = 0;
        let dy = 0;
        if (e.key === 'ArrowUp') dy = -step;
        if (e.key === 'ArrowDown') dy = step;
        if (e.key === 'ArrowLeft') dx = -step;
        if (e.key === 'ArrowRight') dx = step;

        const patches = selectedIds
          .map((id) => {
            const el = elements.find((x) => x.id === id);
            if (el && !el.locked) {
              return {
                id,
                patch: {
                  x: Math.max(-0.5, Math.min(1, el.x + dx)),
                  y: Math.max(-0.5, Math.min(1, el.y + dy)),
                },
              };
            }
            return null;
          })
          .filter(Boolean) as { id: string; patch: Partial<CanvasElement> }[];

        if (patches.length > 0) {
          if (patches.length === 1) {
            updateElement(patches[0].id, patches[0].patch);
          } else {
            updateElements(patches);
          }

          // تجميع سجل التراجع أثناء الضغط المستمر (Debouncing pushHistory)
          if (nudgeTimeout) clearTimeout(nudgeTimeout);
          nudgeTimeout = setTimeout(() => {
            useEditorStore.getState().pushHistory();
            nudgeTimeout = null;
          }, 400);
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (isInteractiveTarget(target)) return;

      const { selectedIds, pushHistory } = useEditorStore.getState();
      if (
        selectedIds.length > 0 &&
        ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)
      ) {
        if (nudgeTimeout) {
          clearTimeout(nudgeTimeout);
          nudgeTimeout = null;
          pushHistory();
        }
      }
    };

    const handlePaste = async (e: ClipboardEvent) => {
      const target = e.target as HTMLElement;
      // 🛡️ M1 من تدقيق 2026-10-08: الحرس كان يفحص الحقول النصية فقط، فلصق
      // صورة وحوار مفتوح (التركيز على محتوى غير قابل للكتابة) كان يُدرجها في
      // الكانفس خلف المودال. الحقل النصي يُمرّر اللصق لسلوكه الطبيعي، والمودال
      // يبتلع اللصق أيضاً (الحقول داخله مُستثناة أصلاً).
      if (
        isModalActive() ||
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      )
        return;

      const items = e.clipboardData?.items;
      let hasPastedImage = false;

      if (items) {
        for (let i = 0; i < items.length; i++) {
          const item = items[i];
          if (item.type.indexOf('image') !== -1) {
            const file = item.getAsFile();
            if (file) {
              e.preventDefault();
              hasPastedImage = true;
              const reader = new FileReader();
              reader.onload = async (event) => {
                if (event.target?.result) {
                  const b64 = event.target.result as string;
                  try {
                    const localPath = await SaveImageFromBase64(b64);
                    if (!localPath) return;

                    const state = useEditorStore.getState();
                    if (state.mode === 'collage') {
                      let targetSlotId = state.selectedId;
                      if (!targetSlotId) {
                        const emptySlot = state.slots.find((s) => !s.imageSrc);
                        if (emptySlot) targetSlotId = emptySlot.id;
                        else if (state.slots.length > 0) targetSlotId = state.slots[0].id;
                      }
                      if (targetSlotId) state.setSlotImage(targetSlotId, localPath);
                    } else {
                      const aspect = await resolveImageAspectRatio(localPath);
                      state.addImageElement(localPath, aspect);
                    }
                  } catch (err) {
                    logger.error('Failed to save pasted image:', err);
                  }
                }
              };
              reader.readAsDataURL(file);
              break; // معالجة أول صورة فقط
            }
          }
        }
      }

      if (!hasPastedImage) {
        e.preventDefault();
        await pasteFromClipboardOrStore();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('paste', handlePaste);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('paste', handlePaste);
      if (nudgeTimeout) clearTimeout(nudgeTimeout);
    };
  }, []);
}
