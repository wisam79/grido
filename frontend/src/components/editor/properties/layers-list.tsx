import React from "react";
import { useEditorStore, CanvasElement } from "@/lib/editor-store";
import { Button } from "@/components/ui/button";
import {
  Layers, Eye, EyeOff, Lock, Unlock, Type, Square, Image as ImageIcon, Trash2, GripVertical
} from "lucide-react";
import { useShallow } from "zustand/react/shallow";
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent
} from "@dnd-kit/core";
import {
  SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

function SortableLayerItem({ el, isSelected, toggleVisibility, toggleLock, deleteLayer, selectElement }: any) {
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
      onClick={() => selectElement(el.id)}
      className={`flex items-center justify-between p-1.5 rounded-lg border text-right cursor-pointer transition-colors duration-200 ${
        isSelected
          ? "border-primary/50 bg-primary/5 text-primary shadow-xs font-bold"
          : "border-transparent bg-transparent hover:bg-muted/40 text-muted-foreground hover:text-foreground"
      } ${isDragging ? "shadow-md bg-background ring-1 ring-primary/30" : ""}`}
    >
      <div className="flex items-center gap-1.5 min-w-0">
        <div 
          {...attributes} 
          {...listeners} 
          className="cursor-grab active:cursor-grabbing hover:bg-muted/50 p-1 rounded-md text-muted-foreground/60 hover:text-foreground transition-colors"
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical className="w-3.5 h-3.5" />
        </div>
        <span className="shrink-0 text-muted-foreground/80">
          {el.type === "image" && <ImageIcon className="w-3.5 h-3.5" />}
          {el.type === "text" && <Type className="w-3.5 h-3.5" />}
          {el.type === "shape" && <Square className="w-3.5 h-3.5" />}
        </span>
        <span className="text-[11px] font-medium truncate max-w-[100px]">
          {el.type === "image" ? "صورة" : el.type === "text" ? el.text || "نص" : `شكل (${el.shape})`}
        </span>
      </div>

      <div className="flex items-center gap-1 shrink-0">
        <Button
          variant="ghost"
          size="icon"
          className={`w-5 h-5 rounded-md hover:bg-muted ${isLocked ? "text-primary dark:text-purple-400" : "text-muted-foreground/50 hover:text-foreground"}`}
          onClick={(e) => toggleLock(el, e)}
          title={isLocked ? "إلغاء القفل" : "قفل الطبقة"}
        >
          {isLocked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className={`w-5 h-5 rounded-md hover:bg-muted ${!isVisible ? "text-red-500" : "text-muted-foreground/75 hover:text-foreground"}`}
          onClick={(e) => toggleVisibility(el, e)}
          title={isVisible ? "إخفاء الطبقة" : "إظهار الطبقة"}
        >
          {isVisible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
        </Button>
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
}

export function LayersList() {
  const { elements, selectedId, selectElement, updateElement, removeElement, pushHistory } = useEditorStore(useShallow((state) => ({
    elements: state.elements,
    selectedId: state.selectedId,
    selectElement: state.selectElement,
    updateElement: state.updateElement,
    removeElement: state.removeElement,
    pushHistory: state.pushHistory,
  })));

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

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
    newSorted.forEach((el, index) => {
      const targetZ = (len - index) * baseZ;
      if (el.zIndex !== targetZ) {
        updateElement(el.id, { zIndex: targetZ });
      }
    });
    pushHistory();
  };

  return (
    <div className="bg-muted/20 dark:bg-muted/10 p-3 rounded-xl border border-border/30 space-y-2 select-none">
      <div className="text-[11px] font-bold text-foreground/80 flex items-center justify-between pb-1.5 border-b border-border/20">
        <span className="flex items-center gap-1.5">
          <Layers className="w-3.5 h-3.5 text-primary" /> الطبقات ({elements.length})
        </span>
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={sorted.map(el => el.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-1 max-h-[220px] overflow-y-auto pr-0.5">
            {sorted.map((el) => (
              <SortableLayerItem
                key={el.id}
                el={el}
                isSelected={selectedId === el.id}
                toggleVisibility={toggleVisibility}
                toggleLock={toggleLock}
                deleteLayer={deleteLayer}
                selectElement={selectElement}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
}
