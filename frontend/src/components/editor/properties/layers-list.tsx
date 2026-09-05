import React, { useState, useCallback } from "react";
import { useEditorStore, CanvasElement } from "@/lib/editor-store";
import type { TextElement, ShapeElement } from "@/lib/store/types";
import { Button } from "@/components/ui/button";
import {
  Stack,
  Eye,
  EyeSlash,
  LockSimple,
  LockSimpleOpen,
  TextAa,
  Shapes,
  Image,
  Trash,
  DotsSixVertical,
  CaretDown,
} from "@phosphor-icons/react";
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
      <TooltipContent side="top">
        {content}
      </TooltipContent>
    </Tooltip>
  );
}

interface SortableLayerItemProps {
  el: CanvasElement;
  isSelected: boolean;
  toggleVisibility: (el: CanvasElement, e: React.MouseEvent) => void;
  toggleLock: (el: CanvasElement, e: React.MouseEvent) => void;
  deleteLayer: (id: string, e: React.MouseEvent) => void;
  selectElement: (id: string) => void;
  toggleElementSelection: (id: string) => void;
}

const SortableLayerItem = React.memo(
  function SortableLayerItem({ el, isSelected, toggleVisibility, toggleLock, deleteLayer, selectElement, toggleElementSelection }: SortableLayerItemProps) {
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
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            if (e.shiftKey || e.ctrlKey || e.metaKey) {
              toggleElementSelection(el.id);
            } else {
              selectElement(el.id);
            }
          }
        }}
        onClick={(e) => {
          if (e.shiftKey || e.ctrlKey || e.metaKey) {
            toggleElementSelection(el.id);
          } else {
            selectElement(el.id);
          }
        }}
        className={`flex items-center justify-between p-2.5 rounded-md border text-right cursor-pointer transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 focus-visible:outline-none select-none ${
          isSelected
            ? "border-primary/50 bg-primary/15 text-primary shadow-xs font-bold ring-1 ring-primary/25"
            : "border-transparent bg-transparent hover:bg-input text-muted-foreground hover:text-foreground"
        } ${isDragging ? "shadow-md bg-card ring-1 ring-primary/30" : ""}`}
      >
        <div className="flex items-center gap-2 min-w-0">
          <div 
            {...attributes} 
            {...listeners} 
            className="cursor-grab active:cursor-grabbing hover:bg-input p-1.5 rounded-md text-muted-foreground/60 hover:text-foreground transition-colors"
            onClick={(e) => e.stopPropagation()}
          >
            <DotsSixVertical className="w-4 h-4" weight="bold" />
          </div>
          <span className="shrink-0 text-muted-foreground/80">
            {el.type === "image" && <Image className="w-4 h-4" weight="regular" />}
            {el.type === "text" && <TextAa className="w-4 h-4" weight="regular" />}
            {el.type === "shape" && <Shapes className="w-4 h-4" weight="regular" />}
          </span>
          <span className="text-xs font-semibold truncate max-w-[120px]">
            {el.type === "image"
              ? "صورة"
              : el.type === "text"
              ? (el as TextElement).text || "نص"
              : el.shape === "rect"
              ? "مستطيل"
              : el.shape === "ellipse"
              ? "دائرة"
              : el.shape === "star"
              ? "نجمة"
              : el.shape === "line"
              ? "خط"
              : el.shape === "path"
              ? "مسار"
              : "شكل"}
          </span>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <TooltipBtn content={isLocked ? "إلغاء قفل الطبقة" : "قفل الطبقة"}>
            <Button
              variant="ghost"
              size="icon"
              className={`w-7 h-7 rounded-md hover:bg-input focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 focus-visible:outline-none ${isLocked ? "text-primary" : "text-muted-foreground/50 hover:text-foreground"}`}
              onClick={(e) => toggleLock(el, e)}
            >
              {isLocked ? <LockSimple className="w-3.5 h-3.5" weight="fill" /> : <LockSimpleOpen className="w-3.5 h-3.5" weight="regular" />}
            </Button>
          </TooltipBtn>
          <TooltipBtn content={isVisible ? "إخفاء الطبقة" : "إظهار الطبقة"}>
            <Button
              variant="ghost"
              size="icon"
              className={`w-7 h-7 rounded-md hover:bg-input focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 focus-visible:outline-none ${!isVisible ? "text-muted-foreground/40" : "text-muted-foreground hover:text-foreground"}`}
              onClick={(e) => toggleVisibility(el, e)}
            >
              {isVisible ? <Eye className="w-3.5 h-3.5" weight="regular" /> : <EyeSlash className="w-3.5 h-3.5" weight="regular" />}
            </Button>
          </TooltipBtn>
          <TooltipBtn content="حذف الطبقة">
            <Button
              variant="ghost"
              size="icon"
              className="w-7 h-7 rounded-md hover:bg-red-500/10 text-muted-foreground/50 hover:text-red-500 transition-colors focus-visible:ring-2 focus-visible:ring-destructive focus-visible:ring-offset-1 focus-visible:outline-none"
              onClick={(e) => deleteLayer(el.id, e)}
            >
              <Trash className="w-3.5 h-3.5" weight="regular" />
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
      (prevProps.el as TextElement).text === (nextProps.el as TextElement).text &&
      (prevProps.el as ShapeElement).shape === (nextProps.el as ShapeElement).shape &&
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
      <div className="bg-input/40 border border-dashed border-border rounded-xl p-5 text-center select-none flex flex-col items-center justify-center space-y-2 animate-in fade-in duration-300">
        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary shadow-xs">
          <Stack className="w-4.5 h-4.5 opacity-80" weight="duotone" />
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
    <div className="bg-card border border-border p-3 rounded-xl shadow-xs fluent-specular space-y-2 select-none">
      {/* Clickable Header */}
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex items-center justify-between w-full text-right cursor-pointer select-none"
      >
        <div className="flex items-center gap-1.5">
          <CaretDown className={cn("w-4 h-4 transition-transform duration-200 text-muted-foreground", !expanded && "-rotate-90")} weight="bold" />
          <span className="text-sm font-bold text-foreground/90 cursor-pointer flex items-center gap-1.5">
            <Stack className="w-4 h-4 text-primary shrink-0" weight="duotone" />
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
