import React, { useState, useCallback } from "react";
import { useEditorStore, CanvasElement } from "@/lib/editor-store";
import { Button } from "@/components/ui/button";
import {
  Layers, Eye, EyeOff, Lock, Unlock, Type, Square, Image as ImageIcon, Trash2, GripVertical, ChevronDown
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useShallow } from "zustand/react/shallow";
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent
} from "@dnd-kit/core";
import {
  SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";

function TooltipBtn({ content, children }: { content: string; children: React.ReactElement }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        {React.cloneElement(children, { "aria-label": content })}
      </TooltipTrigger>
      <TooltipContent
        side="top"
        className="font-cairo text-[10px] py-1 px-2.5 bg-primary text-primary-foreground border-0 shadow-sm rounded font-medium"
      >
        {content}
      </TooltipContent>
    </Tooltip>
  );
}

const SortableLayerItem = React.memo(
  function SortableLayerItem({ el, isSelected, toggleVisibility, toggleLock, deleteLayer, selectElement, toggleElementSelection }: any) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: el.id });

    const style = {
      transform: CSS.Transform.toString(transform),
      transition,
      zIndex: isDragging ? 100 : "auto",
      opacity: isDragging ? 0.9 : 1,
    };

    const isVisible = el.visible !== false;
    const isLocked = !!el.locked;

    return (
      <div
        ref={setNodeRef}
        style={style}
        onClick={(e) => {
          if (e.shiftKey || e.ctrlKey || e.metaKey) {
            toggleElementSelection(el.id);
          } else {
            selectElement(el.id);
          }
        }}
        className={`flex items-center justify-between p-2.5 rounded-lg border text-right cursor-pointer transition-colors duration-200 ${
          isSelected
            ? "border-primary/50 bg-primary/5 text-primary shadow-xs font-bold"
            : "border-transparent bg-transparent hover:bg-muted/40 text-muted-foreground hover:text-foreground"
        } ${isDragging ? "shadow-md bg-background ring-1 ring-primary/30" : ""}`}
      >
        <div className="flex items-center gap-2 min-w-0">
          <div 
            {...attributes} 
            {...listeners} 
            className="cursor-grab active:cursor-grabbing hover:bg-muted/50 p-1.5 rounded-md text-muted-foreground/60 hover:text-foreground transition-colors"
            onClick={(e) => e.stopPropagation()}
          >
            <GripVertical className="w-4 h-4" />
          </div>
          <span className="shrink-0 text-muted-foreground/80">
            {el.type === "image" && <ImageIcon className="w-4 h-4" />}
            {el.type === "text" && <Type className="w-4 h-4" />}
            {el.type === "shape" && <Square className="w-4 h-4" />}
          </span>
          <span className="text-xs font-semibold truncate max-w-[120px]">
            {el.type === "image" ? "صورة" : el.type === "text" ? el.text || "نص" : `شكل (${el.shape})`}
          </span>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <TooltipBtn content={isLocked ? "إلغاء قفل الطبقة" : "قفل الطبقة"}>
            <Button
              variant="ghost"
              size="icon"
              className={`w-7.5 h-7.5 rounded-md hover:bg-muted ${isLocked ? "text-primary dark:text-purple-400" : "text-muted-foreground/50 hover:text-foreground"}`}
              onClick={(e) => toggleLock(el, e)}
            >
              {isLocked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
            </Button>
          </TooltipBtn>
          <TooltipBtn content={isVisible ? "إخفاء الطبقة" : "إظهار الطبقة"}>
            <Button
              variant="ghost"
              size="icon"
              className={`w-7.5 h-7.5 rounded-md hover:bg-muted ${!isVisible ? "text-red-500" : "text-muted-foreground/75 hover:text-foreground"}`}
              onClick={(e) => toggleVisibility(el, e)}
            >
              {isVisible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
            </Button>
          </TooltipBtn>
          <TooltipBtn content="حذف الطبقة">
            <Button
              variant="ghost"
              size="icon"
              className="w-7.5 h-7.5 rounded-md text-muted-foreground/50 hover:text-red-500 hover:bg-red-500/10"
              onClick={(e) => deleteLayer(el.id, e)}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </TooltipBtn>
        </div>
      </div>
    );
  },
  (prevProps, nextProps) => {
    return (
      prevProps.isSelected === nextProps.isSelected &&
      prevProps.el.id === nextProps.el.id &&
      prevProps.el.type === nextProps.el.type &&
      prevProps.el.visible === nextProps.el.visible &&
      prevProps.el.locked === nextProps.el.locked &&
      prevProps.el.text === nextProps.el.text &&
      prevProps.el.shape === nextProps.el.shape &&
      prevProps.el.zIndex === nextProps.el.zIndex
    );
  }
);

export function LayersList() {
  const { elements, selectedId, selectedIds, selectElement, updateElement, updateElements, removeElement, pushHistory, toggleElementSelection } = useEditorStore(useShallow((state) => ({
    elements: state.elements,
    selectedId: state.selectedId,
    selectedIds: state.selectedIds,
    selectElement: state.selectElement,
    updateElement: state.updateElement,
    updateElements: state.updateElements,
    removeElement: state.removeElement,
    pushHistory: state.pushHistory,
    toggleElementSelection: state.toggleElementSelection,
  })));

  const [expanded, setExpanded] = useState(true);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const toggleVisibility = useCallback((el: CanvasElement, e: React.MouseEvent) => {
    e.stopPropagation();
    updateElement(el.id, { visible: el.visible === false ? true : false });
    pushHistory();
  }, [updateElement, pushHistory]);

  const toggleLock = useCallback((el: CanvasElement, e: React.MouseEvent) => {
    e.stopPropagation();
    updateElement(el.id, { locked: !el.locked });
    pushHistory();
  }, [updateElement, pushHistory]);

  const deleteLayer = useCallback((id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    removeElement(id);
  }, [removeElement]);

  const handleSelectElement = useCallback((id: string) => {
    selectElement(id);
  }, [selectElement]);

  const handleToggleSelection = useCallback((id: string) => {
    toggleElementSelection(id);
  }, [toggleElementSelection]);

  if (elements.length === 0) {
    return (
      <div className="bg-muted/10 border border-dashed border-border/40 rounded-xl p-5 text-center select-none flex flex-col items-center justify-center space-y-2 animate-in fade-in duration-300">
        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary shadow-xs">
          <Layers className="w-4.5 h-4.5 opacity-80" />
        </div>
        <div className="space-y-1">
          <p className="text-[11px] font-bold text-foreground/80">لوحة الطبقات فارغة</p>
          <p className="text-[9px] text-muted-foreground max-w-[170px] leading-normal mx-auto text-center" dir="rtl">أضف صوراً أو نصوصاً أو أشكالاً للتحكم بترتيبها من هنا</p>
        </div>
      </div>
    );
  }

  // ترتيب من الأكبر إلى الأصغر Z-Index (العنصر الأعلى يظهر أولاً)
  const sorted = [...elements].sort((a, b) => b.zIndex - a.zIndex);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = sorted.findIndex((el) => el.id === active.id);
    const newIndex = sorted.findIndex((el) => el.id === over.id);

    // إنشاء مصفوفة جديدة وإعادة ترتيبها
    const newSorted = [...sorted];
    const [movedItem] = newSorted.splice(oldIndex, 1);
    newSorted.splice(newIndex, 0, movedItem);

    // تحديث Z-Index بناءً على الترتيب الجديد (العنصر الأول يأخذ أعلى رقم)
    const baseZ = 10;
    const len = newSorted.length;
    
    // منع تحديث العناصر التي لم تتغير لتقليل الـ Renders
    const patches: { id: string; patch: Partial<CanvasElement> }[] = [];
    newSorted.forEach((el, index) => {
      const targetZ = (len - index) * baseZ;
      if (el.zIndex !== targetZ) {
        patches.push({ id: el.id, patch: { zIndex: targetZ } });
      }
    });

    if (patches.length > 0) {
      updateElements(patches);
      pushHistory();
    }
  };

  return (
    <div className="bg-card/30 p-3 rounded-xl border border-border/40 space-y-2 select-none">
      {/* Clickable Header */}
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex items-center justify-between w-full text-right cursor-pointer select-none"
      >
        <div className="flex items-center gap-1.5">
          <ChevronDown className={cn("w-4 h-4 transition-transform duration-200 text-muted-foreground", !expanded && "-rotate-90")} />
          <span className="text-sm font-bold text-foreground/90 cursor-pointer flex items-center gap-1.5">
            <Layers className="w-4 h-4 text-primary shrink-0" />
            الطبقات ({elements.length})
          </span>
        </div>
      </button>

      {expanded && (
        <div className="space-y-2 pt-2 border-t border-border/10 animate-in fade-in duration-200">
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={sorted.map(el => el.id)} strategy={verticalListSortingStrategy}>
              <div className="space-y-1 max-h-[220px] overflow-y-auto pr-0.5">
                {sorted.map((el) => (
                  <SortableLayerItem
                    key={el.id}
                    el={el}
                    isSelected={selectedIds.includes(el.id)}
                    toggleVisibility={toggleVisibility}
                    toggleLock={toggleLock}
                    deleteLayer={deleteLayer}
                    selectElement={handleSelectElement}
                    toggleElementSelection={handleToggleSelection}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </div>
      )}
    </div>
  );
}
