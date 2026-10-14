import React, { useCallback, useMemo } from 'react';
import { useEditorStore } from '@/lib/editor-store';
import { CanvasElement, ShapeElement } from '@/lib/store/types';
import { useShallow } from 'zustand/react/shallow';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { toast } from 'sonner';
import {
  Image,
  TextT,
  Shapes,
  Stack,
  Eye,
  EyeSlash,
  LockSimple,
  LockSimpleOpen,
  Trash,
  Copy,
  DotsSixVertical,
} from '@/components/ui/icons';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

/* ────────────────────────────────────────────────────────
 * لوحة الطبقات الاحترافية (Layers Panel) — V3 dnd-kit
 * ────────────────────────────────────────────────────────
 * مصدر الحقيقة المرئي لطبقات content (zIndex) مع توصيل
 * مباشر على store عبر updateElements batch + pushHistory.
 * توثيق الطبقات المنطقية (z 0..4) في lib/canvas/layer-system.ts.
 * كان الإصدار HTML5 draggable يسبب شفافية عالقة وتعارض
 * hitGraph مع السحب الطويل؛ dnd-kit يحلّها مع PointerSensor
 * ولوحة مفاتيح كاملة وFocus داخل الصف.
 * ──────────────────────────────────────────────────────── */

function getElementLabel(el: CanvasElement, layerNumber?: number): string {
  const suffix = layerNumber !== undefined ? ` ${String(layerNumber).padStart(2, '0')}` : '';
  switch (el.type) {
    case 'image':
      return `صورة${suffix}`;
    case 'text':
      return el.text?.slice(0, 18) || `نص${suffix}`;
    case 'shape': {
      const shapeLabels: Record<string, string> = {
        rect: 'مستطيل',
        circle: 'دائرة',
        ellipse: 'بيضاوي',
        line: 'خط',
        star: 'نجمة',
        path: 'مسار',
        polygon: 'مضلع',
        arrow: 'سهم',
        ring: 'حلقة',
      };
      return `${shapeLabels[(el as ShapeElement).shape] || 'شكل'}${suffix}`;
    }
    default:
      return `عنصر${suffix}`;
  }
}

function getElementIcon(el: CanvasElement, isSelected = false) {
  const weight = isSelected ? 'fill' : 'regular';
  switch (el.type) {
    case 'image':
      return <Image size={14} weight={weight} />;
    case 'text':
      return <TextT size={14} weight={isSelected ? 'bold' : 'regular'} />;
    case 'shape':
      return <Shapes size={14} weight={weight} />;
    default:
      return <Stack size={14} weight={weight} />;
  }
}

interface SortableRowProps {
  el: CanvasElement;
  layerNumber: number;
  isSelected: boolean;
  onSelect: (e: React.MouseEvent | React.KeyboardEvent) => void;
  onToggleVisibility: () => void;
  onToggleLock: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
}

const SortableLayerRow = React.memo(function SortableLayerRow({
  el,
  layerNumber,
  isSelected,
  onSelect,
  onToggleVisibility,
  onToggleLock,
  onDelete,
  onDuplicate,
}: SortableRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: el.id,
  });
  const isHidden = el.visible === false;
  const isLocked = el.locked === true;

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.85 : 1,
    zIndex: isDragging ? 30 : undefined,
  };

  /* eslint-disable jsx-a11y/no-noninteractive-element-interactions, jsx-a11y/no-noninteractive-tabindex */
  return (
    <div
      ref={setNodeRef}
      style={style}
      role="listitem"
      tabIndex={0}
      aria-label={getElementLabel(el, layerNumber)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect(e as unknown as React.KeyboardEvent);
        }
      }}
      onClick={onSelect}
      className={cn(
        'group flex items-center gap-1.5 px-2 py-1.5 rounded-md transition-colors cursor-pointer select-none',
        'border border-transparent',
        'focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:outline-none',
        isSelected ? 'bg-accent-active border-border/70 shadow-xs' : 'hover:bg-muted/50',
        isHidden && 'opacity-45',
        isDragging && 'shadow-fluent-8 bg-card ring-1 ring-primary/30',
      )}
    >
      {/* مقبض السحب — المستمع الوحيد للسحب (باقي الصف للنقر/التحديد) */}
      <button
        type="button"
        aria-label="اسحب لإعادة الترتيب"
        className="cursor-grab active:cursor-grabbing text-muted-foreground/40 group-hover:text-muted-foreground/70 hover:bg-input p-1 rounded transition-colors shrink-0 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:outline-none"
        {...attributes}
        {...listeners}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
      >
        <DotsSixVertical size={13} weight="bold" />
      </button>

      <div
        className={cn(
          'w-6 h-6 rounded-md flex items-center justify-center shrink-0 transition-colors',
          isSelected ? 'bg-muted/90 text-foreground' : 'bg-muted/60 text-muted-foreground',
        )}
      >
        {getElementIcon(el, isSelected)}
      </div>

      <span
        className={cn(
          'flex-1 text-xs font-bold truncate min-w-0',
          isSelected ? 'text-foreground' : 'text-foreground/80',
          isHidden && 'line-through',
        )}
        dir="auto"
      >
        {getElementLabel(el, layerNumber)}
      </span>

      <div
        className={cn(
          'flex items-center gap-0.5 shrink-0 transition-opacity',
          isSelected
            ? 'opacity-100'
            : 'opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 focus-within:opacity-100',
        )}
      >
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              aria-label="نسخ"
              onClick={(e) => {
                e.stopPropagation();
                onDuplicate();
              }}
              className="touch-hit-44 relative p-1 rounded-md hover:bg-muted/80 text-muted-foreground hover:text-foreground transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:outline-none"
            >
              <Copy size={13} weight="regular" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="top" className="font-cairo text-micro">
            نسخ
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              aria-label={isHidden ? 'إظهار' : 'إخفاء'}
              onClick={(e) => {
                e.stopPropagation();
                onToggleVisibility();
              }}
              className={cn(
                'touch-hit-44 relative p-1 rounded-md hover:bg-muted/80 transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:outline-none',
                isHidden ? 'text-destructive/60' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {isHidden ? <EyeSlash size={14} weight="bold" /> : <Eye size={14} weight="regular" />}
            </button>
          </TooltipTrigger>
          <TooltipContent side="top" className="font-cairo text-micro">
            {isHidden ? 'إظهار' : 'إخفاء'}
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              aria-label={isLocked ? 'فك القفل' : 'قفل'}
              onClick={(e) => {
                e.stopPropagation();
                onToggleLock();
              }}
              className={cn(
                'touch-hit-44 relative p-1 rounded-md hover:bg-muted/80 transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:outline-none',
                isLocked ? 'text-amber-500' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {isLocked ? (
                <LockSimple size={14} weight="fill" />
              ) : (
                <LockSimpleOpen size={14} weight="light" />
              )}
            </button>
          </TooltipTrigger>
          <TooltipContent side="top" className="font-cairo text-micro">
            {isLocked ? 'فك القفل' : 'قفل'}
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              aria-label="حذف"
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              className="touch-hit-44 relative p-1 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:outline-none"
            >
              <Trash size={13} weight="regular" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="top" className="font-cairo text-micro">
            حذف
          </TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
  /* eslint-enable jsx-a11y/no-noninteractive-element-interactions, jsx-a11y/no-noninteractive-tabindex */
});

export const LayersPanel = React.memo(function LayersPanel() {
  const {
    elements,
    selectedId,
    selectedIds,
    selectElement,
    toggleElementSelection,
    updateElement,
    updateElements,
    removeElement,
    duplicateElement,
    pushHistory,
  } = useEditorStore(
    useShallow((state) => ({
      elements: state.elements,
      selectedId: state.selectedId,
      selectedIds: state.selectedIds,
      selectElement: state.selectElement,
      toggleElementSelection: state.toggleElementSelection,
      updateElement: state.updateElement,
      updateElements: state.updateElements,
      removeElement: state.removeElement,
      duplicateElement: state.duplicateElement,
      pushHistory: state.pushHistory,
    })),
  );

  const sortedElements = useMemo(
    () => [...elements].sort((a, b) => b.zIndex - a.zIndex),
    [elements],
  );

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const state = useEditorStore.getState();
    const sorted = [...state.elements].sort((a, b) => b.zIndex - a.zIndex);
    const oldIndex = sorted.findIndex((el) => el.id === active.id);
    const newIndex = sorted.findIndex((el) => el.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    const newSorted = [...sorted];
    const [moved] = newSorted.splice(oldIndex, 1);
    newSorted.splice(newIndex, 0, moved);
    const total = newSorted.length;
    const patches: { id: string; patch: Partial<CanvasElement> }[] = [];
    newSorted.forEach((el, i) => {
      const newZ = (total - i) * 10;
      if (el.zIndex !== newZ) patches.push({ id: el.id, patch: { zIndex: newZ } });
    });
    if (patches.length > 0) {
      state.updateElements(patches);
      state.pushHistory();
    }
  }, []);

  const handleToggleVisibility = useCallback(
    (id: string, current: boolean | undefined) => {
      updateElement(id, { visible: current === false ? true : false } as Partial<CanvasElement>);
      pushHistory();
    },
    [updateElement, pushHistory],
  );

  const handleToggleLock = useCallback(
    (id: string, current: boolean | undefined) => {
      updateElement(id, { locked: !current } as Partial<CanvasElement>);
      pushHistory();
    },
    [updateElement, pushHistory],
  );

  return (
    <div
      className="flex flex-col h-full select-none font-cairo"
      dir="rtl"
      data-testid="layers-panel"
    >
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-border/40 shrink-0">
        <div className="flex items-center gap-2 text-xs font-extrabold text-foreground">
          <div className="p-1 rounded-md bg-muted/80 dark:bg-white/5 text-muted-foreground">
            <Stack size={16} weight="duotone" />
          </div>
          <span>الطبقات</span>
        </div>
        <span className="text-micro text-muted-foreground font-mono bg-muted/40 border border-border/20 px-2 py-0.5 rounded-md font-bold">
          {elements.length}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto p-1.5" role="list" aria-label="طبقات العناصر">
        {sortedElements.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center py-16 px-4">
            <div className="w-12 h-12 rounded-full bg-muted/40 flex items-center justify-center mb-3">
              <Stack size={28} weight="thin" className="text-muted-foreground/50" />
            </div>
            <p className="text-xs text-muted-foreground font-bold">لا توجد عناصر</p>
            <p className="text-micro text-muted-foreground/60 mt-1">أضف عناصر من شريط الأدوات</p>
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={sortedElements.map((el) => el.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-0.5">
                {sortedElements.map((el, index) => (
                  <SortableLayerRow
                    key={el.id}
                    el={el}
                    layerNumber={sortedElements.length - index}
                    isSelected={selectedIds.includes(el.id) || selectedId === el.id}
                    onSelect={(e) => {
                      if (
                        (e as React.MouseEvent).ctrlKey ||
                        (e as React.MouseEvent).metaKey ||
                        (e as React.MouseEvent).shiftKey
                      ) {
                        toggleElementSelection(el.id);
                      } else {
                        selectElement(el.id);
                      }
                    }}
                    onToggleVisibility={() => handleToggleVisibility(el.id, el.visible)}
                    onToggleLock={() => handleToggleLock(el.id, el.locked)}
                    onDelete={() => {
                      if (el.locked) {
                        toast.info('العنصر مقفل — ألغِ قفله أولاً للحذف');
                        return;
                      }
                      removeElement(el.id);
                    }}
                    onDuplicate={() => duplicateElement(el.id)}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </div>
    </div>
  );
});
