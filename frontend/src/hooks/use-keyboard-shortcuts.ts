import { useEffect } from "react";
import { useEditorStore } from "@/lib/editor-store";
import { saveProjectAsJSON } from "@/components/editor/export-utils";

export function useKeyboardShortcuts() {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      // تجاهل الاختصارات داخل حقول الإدخال
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable) return;

      const { undo, redo, selectedId, removeElement, duplicateElement } = useEditorStore.getState();

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
      // Delete / Backspace = حذف العنصر
      if ((e.key === "Delete" || e.key === "Backspace") && selectedId) {
        e.preventDefault();
        removeElement(selectedId);
      }
      // Ctrl+D = تكرار
      if ((e.ctrlKey || e.metaKey) && e.key === "d" && selectedId) {
        e.preventDefault();
        duplicateElement(selectedId);
      }
      // Ctrl+S = حفظ
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        saveProjectAsJSON();
      }
      // Arrow Keys = Nudging selected element
      if (selectedId && ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) {
        e.preventDefault();
        const { elements, updateElement } = useEditorStore.getState();
        const el = elements.find((x) => x.id === selectedId);
        if (el && !el.locked) {
          const step = e.shiftKey ? 0.015 : 0.002; // Shift gives larger steps
          let dx = 0;
          let dy = 0;
          if (e.key === "ArrowUp") dy = -step;
          if (e.key === "ArrowDown") dy = step;
          if (e.key === "ArrowLeft") dx = -step;
          if (e.key === "ArrowRight") dx = step;

          updateElement(selectedId, {
            x: Math.max(-0.5, Math.min(1, el.x + dx)),
            y: Math.max(-0.5, Math.min(1, el.y + dy)),
          });
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable) return;

      const { selectedId, pushHistory } = useEditorStore.getState();
      if (selectedId && ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) {
        pushHistory();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, []);
}
