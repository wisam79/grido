import { useEffect } from "react";
import { useHotkeys } from "react-hotkeys-hook";
import { toast } from "sonner";
import { CanvasElement, useEditorStore } from "@/lib/editor-store";
import { SaveImageFromBase64 } from "../../wailsjs/go/main/App";
import { pasteFromClipboardOrStore } from "@/lib/io/clipboard-utils";

export function useKeyboardShortcuts() {
  // --- Shortcuts via react-hotkeys-hook ---
  
  // Undo: Ctrl+Z or Cmd+Z
  useHotkeys("mod+z", (e) => {
    e.preventDefault();
    useEditorStore.getState().undo();
  });

  // Redo: Ctrl+Shift+Z or Ctrl+Y or Cmd+Shift+Z or Cmd+Y
  useHotkeys("mod+shift+z, mod+y", (e) => {
    e.preventDefault();
    useEditorStore.getState().redo();
  });

  // Delete / Backspace — العناصر المقفلة لا تُحذف بصمت، ونُعلم المستخدم إن تبقى شيء محذوف.
  useHotkeys(
    "delete, backspace",
    (e) => {
      e.preventDefault();
      const { selectedIds, elements, removeElements, removeElement } = useEditorStore.getState();
      const removableIds = selectedIds.filter((id) => {
        const el = elements.find((x) => x.id === id);
        return el && !el.locked;
      });
      if (removableIds.length === 0) {
        toast.info("العناصر المحددة مقفلة — ألغِ قفلها أولاً للحذف");
        return;
      }
      if (removableIds.length < selectedIds.length) {
        toast.info("تجاهلنا العناصر المقفلة وحذفنا غير المقفلة فقط");
      }
      if (removableIds.length === 1) {
        removeElement(removableIds[0]);
      } else {
        removeElements(removableIds);
      }
    },
    {
      ignoreEventWhen: (e) => {
        const t = e.target as HTMLElement | null;
        return !!t?.closest?.('button, [role="menu"], [role="menuitem"]');
      },
    }
  );

  // Duplicate: Ctrl+D or Cmd+D
  useHotkeys("mod+d", (e) => {
    e.preventDefault();
    const { selectedIds, duplicateElements, duplicateElement } = useEditorStore.getState();
    if (selectedIds.length === 1) {
      duplicateElement(selectedIds[0]);
    } else if (selectedIds.length > 1) {
      duplicateElements(selectedIds);
    }
  });

  // Copy: Ctrl+C or Cmd+C
  useHotkeys("mod+c", (e) => {
    const target = e.target as HTMLElement;
    if (target?.tagName === "INPUT" || target?.tagName === "TEXTAREA" || target?.isContentEditable) return;
    const { selectedIds, copySelectedElements } = useEditorStore.getState();
    if (selectedIds.length > 0) {
      e.preventDefault();
      copySelectedElements(selectedIds);
    }
  });

  // Cut: Ctrl+X or Cmd+X
  useHotkeys("mod+x", (e) => {
    const target = e.target as HTMLElement;
    if (target?.tagName === "INPUT" || target?.tagName === "TEXTAREA" || target?.isContentEditable) return;
    const { selectedIds, cutSelectedElements } = useEditorStore.getState();
    if (selectedIds.length > 0) {
      e.preventDefault();
      cutSelectedElements(selectedIds);
    }
  });

  // Paste: Ctrl+V or Cmd+V
  useHotkeys("mod+v", async (e) => {
    const target = e.target as HTMLElement;
    if (target?.tagName === "INPUT" || target?.tagName === "TEXTAREA" || target?.isContentEditable) return;
    e.preventDefault();
    await pasteFromClipboardOrStore();
  });

  // Group: Ctrl+G or Cmd+G
  useHotkeys("mod+g", (e) => {
    e.preventDefault();
    const { selectedIds, groupSelectedElements } = useEditorStore.getState();
    if (selectedIds.length > 0) groupSelectedElements();
  });

  // Ungroup: Ctrl+Shift+G or Cmd+Shift+G
  useHotkeys("shift+mod+g", (e) => {
    e.preventDefault();
    const { selectedIds, ungroupSelectedElements } = useEditorStore.getState();
    if (selectedIds.length > 0) ungroupSelectedElements();
  });

  // Save: Ctrl+S or Cmd+S — فتح مكتبة المشاريع للحفظ
  useHotkeys("mod+s", (e) => {
    e.preventDefault();
    window.dispatchEvent(new CustomEvent("grido:open-projects-dialog"));
  });

  // --- Arrows (Nudging) & Paste via native events ---
  useEffect(() => {
    let nudgeTimeout: ReturnType<typeof setTimeout> | null = null;

    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable) return;

      const { selectedIds } = useEditorStore.getState();
      
      // Escape = Clear selection and stop editing
      if (e.key === "Escape") {
        const { setEditingTextId, selectElement } = useEditorStore.getState();
        setEditingTextId(null);
        selectElement(null);
        return;
      }

      // Arrow Keys = Nudging selected elements
      if (selectedIds.length > 0 && ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) {
        e.preventDefault();
        const { elements, updateElements, updateElement } = useEditorStore.getState();
        const step = e.shiftKey ? 0.015 : 0.002;
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
        if (nudgeTimeout) {
          clearTimeout(nudgeTimeout);
          nudgeTimeout = null;
          pushHistory();
        }
      }
    };

    const handlePaste = async (e: ClipboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable) return;

      const items = e.clipboardData?.items;
      let hasPastedImage = false;

      if (items) {
        for (let i = 0; i < items.length; i++) {
          const item = items[i];
          if (item.type.indexOf("image") !== -1) {
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
                    if (state.mode === "collage") {
                      let targetSlotId = state.selectedId;
                      if (!targetSlotId) {
                        const emptySlot = state.slots.find((s) => !s.imageSrc);
                        if (emptySlot) targetSlotId = emptySlot.id;
                        else if (state.slots.length > 0) targetSlotId = state.slots[0].id;
                      }
                      if (targetSlotId) state.setSlotImage(targetSlotId, localPath);
                    } else {
                       const img = new Image();
                       img.onload = () => {
                         const aspect = img.width / img.height;
                         img.onload = null;
                         img.onerror = null;
                         img.src = "";
                         state.addImageElement(localPath, aspect);
                       };
                       img.onerror = () => {
                         img.onload = null;
                         img.onerror = null;
                         img.src = "";
                         state.addImageElement(localPath, 1);
                       };
                       img.src = localPath;
                    }
                  } catch (err) {
                    console.error("Failed to save pasted image:", err);
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

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    window.addEventListener("paste", handlePaste);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("paste", handlePaste);
      if (nudgeTimeout) clearTimeout(nudgeTimeout);
    };
  }, []);
}
