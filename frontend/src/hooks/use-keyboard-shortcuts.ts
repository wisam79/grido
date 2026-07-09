import { useEffect } from "react";
import { CanvasElement, useEditorStore } from "@/lib/editor-store";
import { saveProjectAsJSON } from "@/components/editor/export-utils";

export function useKeyboardShortcuts() {
  useEffect(() => {
    let nudgeTimeout: any = null;

    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      // تجاهل الاختصارات داخل حقول الإدخال
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable) return;

      const {
        undo,
        redo,
        selectedIds,
        removeElements,
        duplicateElements,
        groupSelectedElements,
        ungroupSelectedElements,
      } = useEditorStore.getState();

      // Ctrl+Z = تراجع
      if ((e.ctrlKey || e.metaKey) && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        undo();
      }
      // Ctrl+Shift+Z أو Ctrl+Y = إعادة
      if ((e.ctrlKey || e.metaKey) && (e.key === "y" || (e.key === "z" && e.shiftKey))) {
        e.preventDefault();
        redo();
      }
      // Delete / Backspace = حذف العناصر المحددة
      if ((e.key === "Delete" || e.key === "Backspace") && selectedIds.length > 0) {
        e.preventDefault();
        if (selectedIds.length === 1) {
          const { removeElement } = useEditorStore.getState();
          removeElement(selectedIds[0]);
        } else {
          removeElements(selectedIds);
        }
      }
      // Ctrl+D = تكرار العناصر المحددة
      if ((e.ctrlKey || e.metaKey) && e.key === "d" && selectedIds.length > 0) {
        e.preventDefault();
        if (selectedIds.length === 1) {
          const { duplicateElement } = useEditorStore.getState();
          duplicateElement(selectedIds[0]);
        } else {
          duplicateElements(selectedIds);
        }
      }
      // Ctrl+G = تجميع العناصر المحددة
      if ((e.ctrlKey || e.metaKey) && e.key === "g" && !e.shiftKey && selectedIds.length > 0) {
        e.preventDefault();
        groupSelectedElements();
      }
      // Ctrl+Shift+G = فك التجميع
      if ((e.ctrlKey || e.metaKey) && e.key === "g" && e.shiftKey && selectedIds.length > 0) {
        e.preventDefault();
        ungroupSelectedElements();
      }
      // Ctrl+S = حفظ
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        saveProjectAsJSON();
      }
      // Arrow Keys = Nudging selected elements
      if (selectedIds.length > 0 && ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) {
        e.preventDefault();
        const { elements, updateElements } = useEditorStore.getState();
        const step = e.shiftKey ? 0.015 : 0.002; // Shift gives larger steps
        let dx = 0;
        let dy = 0;
        if (e.key === "ArrowUp") dy = -step;
        if (e.key === "ArrowDown") dy = step;
        if (e.key === "ArrowLeft") dx = -step;
        if (e.key === "ArrowRight") dx = step;

        const patches = selectedIds.map((id) => {
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
        }).filter(Boolean) as { id: string; patch: Partial<CanvasElement> }[];

        if (patches.length > 0) {
          if (patches.length === 1) {
            const { updateElement } = useEditorStore.getState();
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
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable) return;

      const { selectedIds, pushHistory } = useEditorStore.getState();
      if (selectedIds.length > 0 && ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) {
        // عند إفلات الزر، نقوم بحفظ الحالة فوراً وإلغاء المؤقت المؤجل لتفادي تكرار السجلات
        if (nudgeTimeout) {
          clearTimeout(nudgeTimeout);
          nudgeTimeout = null;
          pushHistory();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      if (nudgeTimeout) clearTimeout(nudgeTimeout);
    };
  }, []);
}
