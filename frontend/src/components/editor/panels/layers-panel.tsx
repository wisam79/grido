import React, { useCallback, useRef, useState } from "react";
import { useEditorStore } from "@/lib/editor-store";
import { CanvasElement } from "@/lib/store/types";
import { useShallow } from "zustand/react/shallow";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import {
  Image as ImageIcon,
  Type,
  Shapes,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  GripVertical,
  Layers,
  Trash2,
  Copy,
} from "lucide-react";

/* ────────────────────────────────────────────────────────
 * لوحة الطبقات الاحترافية (Layers Panel)
 * ────────────────────────────────────────────────────────
 * تعرض كل عناصر الكانفاس مرتبة بالـ zIndex (الأعلى أولاً)
 * مع إمكانية:
 *   - إعادة الترتيب بالسحب (Drag to Reorder)
 *   - تبديل القفل (Lock/Unlock)
 *   - تبديل الإخفاء (Show/Hide)
 *   - تحديد العنصر بالنقر
 *   - حذف ونسخ العنصر
 * ──────────────────────────────────────────────────────── */

function getElementLabel(el: CanvasElement): string {
  switch (el.type) {
    case "image":
      return "صورة";
    case "text":
      return el.text?.slice(0, 18) || "نص";
    case "shape": {
      const shapeLabels: Record<string, string> = {
        rect: "مستطيل",
        circle: "دائرة",
        ellipse: "بيضاوي",
        line: "خط",
        star: "نجمة",
        path: "مسار",
      };
      return shapeLabels[(el as any).shape] || "شكل";
    }
    default:
      return "عنصر";
  }
}

function getElementIcon(el: CanvasElement) {
  switch (el.type) {
    case "image":
      return <ImageIcon className="w-3.5 h-3.5" />;
    case "text":
      return <Type className="w-3.5 h-3.5" />;
    case "shape":
      return <Shapes className="w-3.5 h-3.5" />;
    default:
      return <Layers className="w-3.5 h-3.5" />;
  }
}

interface LayerRowProps {
  el: CanvasElement;
  isSelected: boolean;
  onSelect: () => void;
  onToggleVisibility: () => void;
  onToggleLock: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onDragStart: (e: React.DragEvent, id: string) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent, targetId: string) => void;
  onDragEnd: (e: React.DragEvent) => void;
  isDragOver: boolean;
  isDragging: boolean;
}

const LayerRow = React.memo(function LayerRow({
  el,
  isSelected,
  onSelect,
  onToggleVisibility,
  onToggleLock,
  onDelete,
  onDuplicate,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  isDragOver,
  isDragging,
}: LayerRowProps) {
  const isHidden = el.visible === false;
  const isLocked = el.locked === true;

  return (
    <div
      draggable
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect();
        }
      }}
      onDragStart={(e) => onDragStart(e, el.id)}
      onDragOver={onDragOver}
      onDrop={(e) => onDrop(e, el.id)}
      onDragEnd={onDragEnd}
      onClick={onSelect}
      className={cn(
        "group flex items-center gap-1.5 px-2 py-1.5 rounded-md transition-all cursor-pointer select-none",
        "border border-transparent",
        "focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 focus-visible:outline-none",
        isSelected
          ? "bg-primary/12 border-primary/30 shadow-xs"
          : "hover:bg-muted/50",
        isDragOver && "border-primary/50 bg-primary/5",
        isHidden && "opacity-45",
        // شفافية الصف المسحوب عبر حالة React — الكتابة المباشرة على DOM كانت
        // تبقى عالقة لأن dragend كان يُلتقط على الحاوية لا الصف (إصلاح Bug#8)
        isDragging && "opacity-40"
      )}
    >
      {/* مقبض السحب */}
      <div className="cursor-grab active:cursor-grabbing text-muted-foreground/40 group-hover:text-muted-foreground/70 transition-colors shrink-0">
        <GripVertical className="w-3 h-3" />
      </div>

      {/* أيقونة النوع */}
      <div
        className={cn(
          "w-6 h-6 rounded-md flex items-center justify-center shrink-0 transition-colors",
          isSelected
            ? "bg-primary/20 text-primary"
            : "bg-muted/60 text-muted-foreground"
        )}
      >
        {getElementIcon(el)}
      </div>

      {/* اسم العنصر */}
      <span
        className={cn(
          "flex-1 text-[11px] font-bold truncate min-w-0",
          isSelected ? "text-primary" : "text-foreground/80",
          isHidden && "line-through"
        )}
        dir="auto"
      >
        {getElementLabel(el)}
      </span>

      {/* أزرار التحكم — تظهر عند Hover أو التحديد */}
      <div
        className={cn(
          "flex items-center gap-0.5 shrink-0 transition-opacity",
          isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100"
        )}
      >
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onDuplicate(); }}
              className="p-1 rounded-md hover:bg-muted/80 text-muted-foreground hover:text-foreground transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 focus-visible:outline-none"
            >
              <Copy className="w-3 h-3" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="top" className="font-cairo text-[10px]">نسخ</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onToggleVisibility(); }}
              className={cn(
                "p-1 rounded-md hover:bg-muted/80 transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 focus-visible:outline-none",
                isHidden ? "text-destructive/60" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {isHidden ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
            </button>
          </TooltipTrigger>
          <TooltipContent side="top" className="font-cairo text-[10px]">
            {isHidden ? "إظهار" : "إخفاء"}
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onToggleLock(); }}
              className={cn(
                "p-1 rounded-md hover:bg-muted/80 transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 focus-visible:outline-none",
                isLocked ? "text-amber-500" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {isLocked ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
            </button>
          </TooltipTrigger>
          <TooltipContent side="top" className="font-cairo text-[10px]">
            {isLocked ? "فك القفل" : "قفل"}
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onDelete(); }}
              className="p-1 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 focus-visible:outline-none"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="top" className="font-cairo text-[10px]">حذف</TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
});

export const LayersPanel = React.memo(function LayersPanel() {
  const {
    elements,
    selectedId,
    selectedIds,
    selectElement,
    updateElement,
    removeElement,
    duplicateElement,
    pushHistory,
  } = useEditorStore(
    useShallow((state) => ({
      elements: state.elements,
      selectedId: state.selectedId,
      selectedIds: state.selectedIds,
      selectElement: state.selectElement,
      updateElement: state.updateElement,
      removeElement: state.removeElement,
      duplicateElement: state.duplicateElement,
      pushHistory: state.pushHistory,
    }))
  );

  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const draggedIdRef = useRef<string | null>(null);

  // ترتيب العناصر من الأعلى (أكبر zIndex) إلى الأسفل
  const sortedElements = [...elements].sort((a, b) => b.zIndex - a.zIndex);

  const handleDragStart = useCallback((e: React.DragEvent, id: string) => {
    draggedIdRef.current = id;
    e.dataTransfer.effectAllowed = "move";
    // شفافية أثناء السحب عبر حالة React بدل تعديل DOM مباشر (إصلاح Bug#8)
    setDraggingId(id);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent, targetId: string) => {
      e.preventDefault();
      setDragOverId(null);
      const draggedId = draggedIdRef.current;
      if (!draggedId || draggedId === targetId) return;

      const state = useEditorStore.getState();
      const sorted = [...state.elements].sort((a, b) => b.zIndex - a.zIndex);

      const draggedIdx = sorted.findIndex((el) => el.id === draggedId);
      const targetIdx = sorted.findIndex((el) => el.id === targetId);
      if (draggedIdx === -1 || targetIdx === -1) return;

      // نقل العنصر المسحوب إلى موضع العنصر المستهدف
      const [moved] = sorted.splice(draggedIdx, 1);
      sorted.splice(targetIdx, 0, moved);

      // إعادة ترقيم الـ zIndex لكل العناصر
      const total = sorted.length;
      sorted.forEach((el, i) => {
        const newZ = (total - i) * 10;
        if (el.zIndex !== newZ) {
          state.updateElement(el.id, { zIndex: newZ });
        }
      });

      state.pushHistory();
      draggedIdRef.current = null;
    },
    []
  );

  const handleDragEnd = useCallback(() => {
    setDraggingId(null);
    setDragOverId(null);
    draggedIdRef.current = null;
  }, []);

  const handleToggleVisibility = useCallback(
    (id: string, current: boolean | undefined) => {
      updateElement(id, { visible: current === false ? true : false } as any);
      pushHistory();
    },
    [updateElement, pushHistory]
  );

  const handleToggleLock = useCallback(
    (id: string, current: boolean | undefined) => {
      updateElement(id, { locked: !current } as any);
      pushHistory();
    },
    [updateElement, pushHistory]
  );

  return (
    <div className="flex flex-col h-full select-none font-cairo" dir="rtl">
      {/* الهيدر */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-border/40">
        <div className="flex items-center gap-2 text-xs font-extrabold text-foreground">
          <div className="p-1 rounded-md bg-primary/10 text-primary">
            <Layers className="w-3.5 h-3.5" />
          </div>
          <span>الطبقات</span>
        </div>
        <span className="text-[10px] text-muted-foreground font-mono bg-muted/40 border border-border/20 px-2 py-0.5 rounded-md font-bold">
          {elements.length}
        </span>
      </div>

      {/* قائمة الطبقات */}
      <div className="flex-1 overflow-y-auto p-1.5 space-y-0.5" onDragEnd={handleDragEnd}>
        {sortedElements.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center py-16 px-4">
            <div className="w-12 h-12 rounded-full bg-muted/40 flex items-center justify-center mb-3">
              <Layers className="w-5 h-5 text-muted-foreground/50" />
            </div>
            <p className="text-[11px] text-muted-foreground font-bold">
              لا توجد عناصر بعد
            </p>
            <p className="text-[10px] text-muted-foreground/60 mt-1">
              أضف صوراً أو نصوصاً أو أشكالاً من شريط الأدوات
            </p>
          </div>
        ) : (
          sortedElements.map((el) => (
            <LayerRow
              key={el.id}
              el={el}
              isSelected={selectedIds.includes(el.id) || selectedId === el.id}
              onSelect={() => selectElement(el.id)}
              onToggleVisibility={() => handleToggleVisibility(el.id, el.visible)}
              onToggleLock={() => handleToggleLock(el.id, el.locked)}
              onDelete={() => removeElement(el.id)}
              onDuplicate={() => duplicateElement(el.id)}
              onDragStart={handleDragStart}
              onDragOver={(e) => {
                handleDragOver(e);
                setDragOverId(el.id);
              }}
              onDrop={handleDrop}
              onDragEnd={handleDragEnd}
              isDragOver={dragOverId === el.id}
              isDragging={draggingId === el.id}
            />
          ))
        )}
      </div>
    </div>
  );
});
