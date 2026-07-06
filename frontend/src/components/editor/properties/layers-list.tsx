import { useEditorStore, CanvasElement } from "@/lib/editor-store";
import { Button } from "@/components/ui/button";
import {
  Layers,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  ChevronUp,
  ChevronDown,
  Type,
  Square,
  Image as ImageIcon,
  Trash2,
} from "lucide-react";

import { useShallow } from "zustand/react/shallow";

export function LayersList() {
  const { elements, selectedId, selectElement, updateElement, removeElement, pushHistory } = useEditorStore(useShallow((state) => ({
    elements: state.elements,
    selectedId: state.selectedId,
    selectElement: state.selectElement,
    updateElement: state.updateElement,
    removeElement: state.removeElement,
    pushHistory: state.pushHistory,
  })));

  if (elements.length === 0) {
    return (
      <div className="bg-muted/10 border rounded-xl p-4 text-center text-xs text-muted-foreground select-none">
        <Layers className="w-8 h-8 mx-auto mb-1.5 opacity-40 text-muted-foreground" />
        لا توجد طبقات حالياً
      </div>
    );
  }

  // Sort by zIndex descending (topmost element first in the layers list list UI)
  const sorted = [...elements].sort((a, b) => b.zIndex - a.zIndex);

  const toggleVisibility = (el: CanvasElement, e: React.MouseEvent) => {
    e.stopPropagation();
    updateElement(el.id, { visible: el.visible === false ? true : false });
    pushHistory();
  };

  const toggleLock = (el: CanvasElement, e: React.MouseEvent) => {
    e.stopPropagation();
    updateElement(el.id, { locked: !el.locked });
    pushHistory();
  };

  const deleteLayer = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    removeElement(id);
  };

  const moveLayer = (id: string, direction: "up" | "down", e: React.MouseEvent) => {
    e.stopPropagation();
    const sortedAsc = [...elements].sort((a, b) => a.zIndex - b.zIndex);
    const idx = sortedAsc.findIndex((el) => el.id === id);
    if (idx === -1) return;

    if (direction === "up" && idx < sortedAsc.length - 1) {
      const nextEl = sortedAsc[idx + 1];
      const tempZ = sortedAsc[idx].zIndex;
      
      // Swap zIndex
      updateElement(id, { zIndex: nextEl.zIndex });
      updateElement(nextEl.id, { zIndex: tempZ });
      pushHistory();
    } else if (direction === "down" && idx > 0) {
      const prevEl = sortedAsc[idx - 1];
      const tempZ = sortedAsc[idx].zIndex;
      
      // Swap zIndex
      updateElement(id, { zIndex: prevEl.zIndex });
      updateElement(prevEl.id, { zIndex: tempZ });
      pushHistory();
    }
  };

  return (
    <div className="bg-muted/20 dark:bg-muted/10 p-3 rounded-xl border border-border/30 space-y-2 select-none">
      <div className="text-[11px] font-bold text-foreground/80 flex items-center justify-between pb-1.5 border-b border-border/20">
        <span className="flex items-center gap-1.5">
          <Layers className="w-3.5 h-3.5 text-primary" /> الطبقات ({elements.length})
        </span>
      </div>

      <div className="space-y-1 max-h-[220px] overflow-y-auto pr-0.5">
        {sorted.map((el, index) => {
          const isSelected = selectedId === el.id;
          const isVisible = el.visible !== false;
          const isLocked = !!el.locked;

          return (
            <div
              key={el.id}
              onClick={() => selectElement(el.id)}
              className={`flex items-center justify-between p-1.5 rounded-lg border text-right cursor-pointer transition-all duration-200 ${
                isSelected
                  ? "border-primary/50 bg-primary/5 text-primary shadow-xs font-bold"
                  : "border-transparent bg-transparent hover:bg-muted/40 text-muted-foreground hover:text-foreground"
              }`}
            >
              {/* Layer Title & Icon */}
              <div className="flex items-center gap-2 min-w-0">
                <span className="shrink-0 text-muted-foreground/80">
                  {el.type === "image" && <ImageIcon className="w-3.5 h-3.5" />}
                  {el.type === "text" && <Type className="w-3.5 h-3.5" />}
                  {el.type === "shape" && <Square className="w-3.5 h-3.5" />}
                </span>
                <span className="text-[11px] font-medium truncate max-w-[100px]">
                  {el.type === "image" ? "صورة" : el.type === "text" ? el.text || "نص" : `شكل (${el.shape})`}
                </span>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1 shrink-0">
                {/* Order buttons */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="w-5 h-5 rounded-md text-muted-foreground/75 hover:bg-muted hover:text-foreground"
                  disabled={index === 0} // Topmost element in descending list can't move up
                  onClick={(e) => moveLayer(el.id, "up", e)}
                  title="نقل للأعلى"
                >
                  <ChevronUp className="w-3.5 h-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="w-5 h-5 rounded-md text-muted-foreground/75 hover:bg-muted hover:text-foreground"
                  disabled={index === sorted.length - 1} // Bottommost element can't move down
                  onClick={(e) => moveLayer(el.id, "down", e)}
                  title="نقل للأسفل"
                >
                  <ChevronDown className="w-3.5 h-3.5" />
                </Button>

                {/* Lock button */}
                <Button
                  variant="ghost"
                  size="icon"
                  className={`w-5 h-5 rounded-md hover:bg-muted ${
                    isLocked ? "text-primary dark:text-purple-400" : "text-muted-foreground/50 hover:text-foreground"
                  }`}
                  onClick={(e) => toggleLock(el, e)}
                  title={isLocked ? "إلغاء القفل" : "قفل الطبقة"}
                >
                  {isLocked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                </Button>

                {/* Visibility button */}
                <Button
                  variant="ghost"
                  size="icon"
                  className={`w-5 h-5 rounded-md hover:bg-muted ${
                    !isVisible ? "text-red-500" : "text-muted-foreground/75 hover:text-foreground"
                  }`}
                  onClick={(e) => toggleVisibility(el, e)}
                  title={isVisible ? "إخفاء الطبقة" : "إظهار الطبقة"}
                >
                  {isVisible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                </Button>

                {/* Delete button */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="w-5 h-5 rounded-md text-muted-foreground/50 hover:text-red-500 hover:bg-red-500/10"
                  onClick={(e) => deleteLayer(el.id, e)}
                  title="حذف"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
