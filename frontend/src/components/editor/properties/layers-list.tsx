import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type Modifier,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { toast } from 'sonner';
import { useShallow } from 'zustand/react/shallow';

import { FluentTooltip as TooltipBtn } from '@/components/ui/blocks';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import {
  Stack,
  Layer,
  Eye,
  EyeSlash,
  LockSimple,
  LockSimpleOpen,
  TextAa,
  RenameA,
  Shapes,
  Image,
  Trash,
  Copy,
  DotsSixVertical,
  DotsThreeVertical,
  CaretDown,
  MagnifyingGlass,
  ChevronDoubleUp,
  ChevronDoubleDown,
  ArrowUp,
  ArrowDown,
  FolderSimple,
} from '@/components/ui/icons';
import { getThumbnailSrc } from '@/lib/canvas/thumbnail-src';
import { useEditorStore } from '@/lib/editor-store';
import { cn } from '@/lib/utils';

import type { CanvasElement } from '@/lib/editor-store';
import type { TextElement, ShapeElement, ImageElement } from '@/lib/store/types';

// ── Vertical-only Drag Modifier ──────────────────────────────────────────────
// قفل حركة سحب الطبقات حصرياً على المحور الرأسي Y لمنع أي انزياح أو اهتزاز أفقي
const restrictToVerticalAxis: Modifier = ({ transform }) => ({
  ...transform,
  x: 0,
});

// ── Types ───────────────────────────────────────────────────────────────────

export type LayerFilter = 'all' | 'image' | 'text' | 'shape';
export type LayerDensity = 'compact' | 'comfortable';

interface SortableLayerItemProps {
  el: CanvasElement;
  layerNumber: number;
  isSelected: boolean;
  isRenaming: boolean;
  density: LayerDensity;
  toggleVisibility: (el: CanvasElement, e: React.MouseEvent) => void;
  toggleLock: (el: CanvasElement, e: React.MouseEvent) => void;
  deleteLayer: (id: string, e: React.MouseEvent) => void;
  duplicateLayer: (id: string, e: React.MouseEvent) => void;
  selectElement: (id: string) => void;
  toggleElementSelection: (id: string) => void;
  onBringToFront: (id: string) => void;
  onSendToBack: (id: string) => void;
  onBringForward: (id: string) => void;
  onSendBackward: (id: string) => void;
  onStartRename: (id: string) => void;
  onCommitRename: (id: string, name: string) => void;
  onCancelRename: () => void;
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function getLayerLabel(el: CanvasElement, layerNumber: number): string {
  // اسم الطبقة المخصص يتقدم على التسمية التلقائية في اللوحة والبحث معاً
  if (el.name) return el.name;
  const n = String(layerNumber).padStart(2, '0');
  if (el.type === 'image') return `صورة ${n}`;
  if (el.type === 'text')
    return (el as TextElement).text?.trim() ? (el as TextElement).text!.slice(0, 28) : `نص ${n}`;
  const shape = (el as ShapeElement).shape;
  const map: Record<string, string> = {
    rect: `مستطيل ${n}`,
    ellipse: `دائرة ${n}`,
    ring: `حلقة ${n}`,
    polygon: `مضلع ${n}`,
    arrow: `سهم ${n}`,
    star: `نجمة ${n}`,
    line: `خط ${n}`,
    path: `مسار ${n}`,
  };
  return map[shape] ?? `شكل ${n}`;
}

function getLayerSubLabel(el: CanvasElement): string {
  if (el.type === 'image') {
    const w = Math.round(el.width * 100);
    const h = Math.round(el.height * 100);
    return el.stickerSource ? 'ملصق' : `صورة · ${w}×${h}`;
  }
  if (el.type === 'text') {
    const fam = (el as TextElement).fontFamily?.split(',')[0]?.trim() || 'نص';
    return `${fam} · ${Math.round((el as TextElement).fontSize ?? 16)}px`;
  }
  const shape = (el as ShapeElement).shape;
  const shapeName: Record<string, string> = {
    rect: 'مستطيل',
    ellipse: 'دائرة',
    ring: 'حلقة',
    polygon: 'مضلع',
    arrow: 'سهم',
    star: 'نجمة',
    line: 'خط',
    path: 'مسار',
  };
  return shapeName[shape] ?? 'شكل';
}

function matchesSearch(el: CanvasElement, query: string): boolean {
  if (!query.trim()) return true;
  const q = query.trim().toLowerCase();
  const label = getLayerLabel(el, 0).toLowerCase();
  const sub = getLayerSubLabel(el).toLowerCase();
  const typeLabel = el.type === 'image' ? 'صورة' : el.type === 'text' ? 'نص' : 'شكل';
  return (
    label.includes(q) || sub.includes(q) || typeLabel.includes(q) || el.id.toLowerCase().includes(q)
  );
}

function matchesFilter(el: CanvasElement, filter: LayerFilter): boolean {
  if (filter === 'all') return true;
  return el.type === filter;
}

// ── Row ─────────────────────────────────────────────────────────────────────

const SortableLayerItem = React.memo(
  function SortableLayerItem({
    el,
    layerNumber,
    isSelected,
    isRenaming,
    density,
    toggleVisibility,
    toggleLock,
    deleteLayer,
    duplicateLayer,
    selectElement,
    toggleElementSelection,
    onBringToFront,
    onSendToBack,
    onBringForward,
    onSendBackward,
    onStartRename,
    onCommitRename,
    onCancelRename,
  }: SortableLayerItemProps) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
      id: el.id,
    });

    const inputRef = useRef<HTMLInputElement>(null);
    // Escape يعني «تجاهل ما كُتب»: blur التالي بعد الإلغاء لا يجب أن يحفظ
    const cancelledRef = useRef(false);

    // الـ input يُركَّب مع كل جلسة تسمية فيبدأ من الاسم المحفوظ لا من التسمية
    // التلقائية (defaultValue)، والتحديد يختصر الكتابة فوق الاسم القديم
    useEffect(() => {
      if (!isRenaming) return;
      cancelledRef.current = false;
      const input = inputRef.current;
      if (input) {
        input.focus();
        input.select();
      }
    }, [isRenaming]);

    const style: React.CSSProperties = {
      transform: CSS.Translate.toString(transform ? { ...transform, x: 0 } : null),
      transition,
      zIndex: isDragging ? 100 : undefined,
      opacity: isDragging ? 0.95 : undefined,
    };

    const isVisible = el.visible !== false;
    const isLocked = !!el.locked;
    const isGrouped = !!el.groupId;
    const isComfortable = density === 'comfortable';
    const isHidden = !isVisible;
    const rowHeight = isComfortable ? 'h-11' : 'h-9';
    const thumbSize = isComfortable ? 'w-8 h-8' : 'w-6 h-6';
    const imageSrc = el.type === 'image' ? (el as ImageElement).imageSrc : '';
    const thumbnailSrc = imageSrc ? getThumbnailSrc(imageSrc, 128) : '';

    // المعاينة المصغرة (Thumbnail) — تلي المقبض مباشرة لثبات الهيكلية،
    // وتُشارك السطرَ نفسه في وضعي العرض العادي وإعادة التسمية
    const thumbnail =
      el.type === 'image' && imageSrc ? (
        <div
          className={cn(
            'shrink-0 rounded-md overflow-hidden border bg-muted/50 flex items-center justify-center transition-colors',
            thumbSize,
            isHidden ? 'grayscale opacity-70' : 'border-border/60',
            isSelected && 'border-primary/40 ring-1 ring-primary/20',
          )}
        >
          <img
            src={thumbnailSrc}
            alt=""
            className="w-full h-full object-cover select-none pointer-events-none"
            loading="lazy"
            decoding="async"
            draggable={false}
            onError={(event) => {
              const image = event.currentTarget;
              image.onerror = null;
              image.src = imageSrc;
            }}
          />
        </div>
      ) : (
        <span
          className={cn(
            'shrink-0 rounded-md flex items-center justify-center border transition-colors',
            thumbSize,
            isSelected
              ? 'bg-primary/10 border-primary/25 text-primary'
              : 'bg-muted/60 border-border/50 text-muted-foreground group-hover/row:text-foreground',
            isHidden && 'opacity-60',
          )}
        >
          {el.type === 'image' && <Image className="w-3.5 h-3.5" />}
          {el.type === 'text' && <TextAa className="w-3.5 h-3.5" weight="bold" />}
          {el.type === 'shape' && <Shapes className="w-3.5 h-3.5" />}
        </span>
      );

    const labelBlock = (
      <div className="flex-1 min-w-0 flex flex-col justify-center gap-0.5 pe-1">
        <span
          className={cn(
            'truncate leading-none text-xs',
            isSelected ? 'text-foreground font-bold' : 'text-foreground/90 font-semibold',
            isHidden && 'line-through decoration-muted-foreground/40 text-muted-foreground',
          )}
          title={getLayerLabel(el, layerNumber)}
        >
          {getLayerLabel(el, layerNumber)}
        </span>
        {isComfortable && (
          <span className="truncate text-mini leading-none text-muted-foreground font-medium">
            {getLayerSubLabel(el)}
            {isGrouped && ' · مجمّعة'}
          </span>
        )}
      </div>
    );

    return (
      <div
        ref={setNodeRef}
        style={style}
        role="listitem"
        className={cn(
          'group/row relative flex items-center gap-1.5 text-start select-none',
          'transition-colors duration-150',
          rowHeight,
          isComfortable ? 'px-2' : 'px-1.5',
          // State
          isSelected
            ? 'bg-primary/[0.08] dark:bg-primary/[0.14] text-foreground'
            : 'hover:bg-accent/45',
          isHidden && !isSelected && 'opacity-60',
          isDragging &&
            'rounded-md shadow-fluent-16 bg-card border border-primary/60 ring-2 ring-primary/30 scale-[1.01] cursor-grabbing',
          isGrouped && 'ps-2',
        )}
      >
        {/* مؤشر التحديد النشط — جهة اليمين (start-0) متوافق مع اتجاه القراءة العربي و Fluent 2 */}
        {isSelected && (
          <span
            aria-hidden
            className="absolute inset-y-1 start-0 w-0.5 rounded-e-full bg-primary z-10"
          />
        )}

        {/* مؤشر المجموعة */}
        {isGrouped && !isSelected && (
          <span
            aria-hidden
            className="absolute inset-y-1.5 start-0 w-0.5 rounded-e-full bg-primary/45 group-hover/row:bg-primary/75 transition-colors"
          />
        )}

        {/* مقبض السحب — خفيف في الوضع العادي وينشط بالتحويم */}
        <div
          {...attributes}
          {...listeners}
          role="button"
          tabIndex={0}
          aria-label="اسحب لإعادة الترتيب"
          className={cn(
            'flex items-center justify-center w-5 h-7 rounded shrink-0 cursor-grab active:cursor-grabbing text-muted-foreground/50 hover:text-foreground hover:bg-muted/60 focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none transition-[opacity,color,background-color]',
            isSelected ? 'opacity-80' : 'opacity-0 group-hover/row:opacity-100',
          )}
          onClick={(e) => e.stopPropagation()}
        >
          <DotsSixVertical className="w-3 h-3" weight="bold" />
        </div>

        {isRenaming ? (
          <div className="flex flex-1 min-w-0 items-center gap-1.5">
            {thumbnail}
            <input
              ref={inputRef}
              type="text"
              defaultValue={el.name ?? ''}
              onBlur={(e) => {
                if (cancelledRef.current) return;
                onCommitRename(el.id, e.currentTarget.value);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  cancelledRef.current = true;
                  onCommitRename(el.id, e.currentTarget.value);
                } else if (e.key === 'Escape') {
                  e.preventDefault();
                  cancelledRef.current = true;
                  onCancelRename();
                }
              }}
              onClick={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
              placeholder={getLayerLabel(el, layerNumber)}
              aria-label="اسم الطبقة"
              className="min-w-0 flex-1 h-6 rounded-sm border border-primary/60 bg-background px-1.5 text-xs font-semibold text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            />
          </div>
        ) : (
          <button
            type="button"
            aria-label={getLayerLabel(el, layerNumber)}
            aria-current={isSelected ? 'true' : undefined}
            onClick={(e) => {
              if (e.shiftKey || e.ctrlKey || e.metaKey) toggleElementSelection(el.id);
              else selectElement(el.id);
            }}
            onDoubleClick={(e) => {
              e.stopPropagation();
              onStartRename(el.id);
            }}
            className="flex flex-1 min-w-0 items-center gap-1.5 rounded-sm text-start cursor-pointer focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 focus-visible:ring-offset-background focus-visible:outline-none"
          >
            {thumbnail}
            {labelBlock}

            {/* شارة مجمّعة في الوضع المدمج */}
            {!isComfortable && isGrouped && (
              <span className="hidden sm:inline-flex items-center justify-center w-5 h-5 rounded-md bg-primary/10 border border-primary/15 text-primary shrink-0">
                <FolderSimple className="w-3 h-3" weight="fill" />
              </span>
            )}
          </button>
        )}

        {/* أدوات السطر المدمجة كلياً في نفس بطاقة السطر (بدون بطاقة طافية أو إطار منفصل).
            في الوضع الهادئ تظهر حالة القفل/الإخفاء النشطة فقط لتفادي الضجيج البصري،
            وتظهر بقية الأزرار فور التحويم أو التحديد أو التركيز بلوحة المفاتيح. */}
        <div className="flex items-center gap-0.5 shrink-0" onClick={(e) => e.stopPropagation()}>
          {/* زر المزيد (...) */}
          <DropdownMenu dir="rtl">
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                aria-label="المزيد"
                className={cn(
                  'w-7 h-7 rounded-md hover:bg-muted text-muted-foreground/70 hover:text-foreground focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none transition-[opacity,color,background-color]',
                  isSelected ? 'opacity-100' : 'opacity-0 group-hover/row:opacity-100',
                )}
                onClick={(e) => e.stopPropagation()}
              >
                <DotsThreeVertical className="w-3.5 h-3.5" weight="bold" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" sideOffset={6} className="min-w-44 font-cairo">
              <DropdownMenuLabel className="text-mini">إجراءات الطبقة</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => onStartRename(el.id)}>
                <RenameA className="w-3.5 h-3.5" /> إعادة تسمية
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  duplicateLayer(el.id, {
                    stopPropagation: () => {},
                  } as unknown as React.MouseEvent);
                }}
              >
                <Copy className="w-3.5 h-3.5" /> تكرار
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onBringToFront(el.id)}>
                <ChevronDoubleUp className="w-3.5 h-3.5" /> إحضار للأمام
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onBringForward(el.id)}>
                <ArrowUp className="w-3.5 h-3.5" /> تقديم طبقة واحدة
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onSendBackward(el.id)}>
                <ArrowDown className="w-3.5 h-3.5" /> تأخير طبقة واحدة
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onSendToBack(el.id)}>
                <ChevronDoubleDown className="w-3.5 h-3.5" /> إرسال للخلف
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={(e) => toggleLock(el, e as unknown as React.MouseEvent)}
                className={isLocked ? 'text-warning font-semibold' : undefined}
              >
                {isLocked ? (
                  <LockSimple className="w-3.5 h-3.5" weight="fill" />
                ) : (
                  <LockSimpleOpen className="w-3.5 h-3.5" />
                )}
                {isLocked ? 'فك القفل' : 'قفل الطبقة'}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={(e) => toggleVisibility(el, e as unknown as React.MouseEvent)}
              >
                {isVisible ? <EyeSlash className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                {isVisible ? 'إخفاء' : 'إظهار'}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                variant="destructive"
                onClick={(e) => deleteLayer(el.id, e as unknown as React.MouseEvent)}
                disabled={isLocked}
              >
                <Trash className="w-3.5 h-3.5" /> حذف
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* زر القفل — يظهر دائماً عند القفل أو التحديد، وعند التحويم لبقية الصفوف */}
          <TooltipBtn content={isLocked ? 'فك القفل' : 'قفل الطبقة'} side="top">
            <Button
              variant="ghost"
              size="icon"
              aria-label={isLocked ? 'فك القفل' : 'قفل الطبقة'}
              className={cn(
                'shrink-0 w-7 h-7 rounded-md focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 focus-visible:outline-none transition-[opacity,color,background-color]',
                isLocked
                  ? 'text-warning bg-warning/10 hover:bg-warning/15 border border-warning/20 opacity-100'
                  : isSelected
                    ? 'text-muted-foreground/70 hover:text-foreground hover:bg-muted/80 opacity-100'
                    : 'text-muted-foreground/60 hover:text-foreground hover:bg-muted/80 opacity-0 group-hover/row:opacity-100',
              )}
              onClick={(e) => toggleLock(el, e)}
            >
              {isLocked ? (
                <LockSimple className="w-3.5 h-3.5" weight="fill" />
              ) : (
                <LockSimpleOpen className="w-3.5 h-3.5" />
              )}
            </Button>
          </TooltipBtn>

          {/* زر الرؤية — يظهر دائماً عند الإخفاء أو التحديد، وعند التحويم لبقية الصفوف */}
          <TooltipBtn content={isVisible ? 'إخفاء الطبقة' : 'إظهار الطبقة'} side="top">
            <Button
              variant="ghost"
              size="icon"
              aria-label={isVisible ? 'إخفاء الطبقة' : 'إظهار الطبقة'}
              className={cn(
                'shrink-0 w-7 h-7 rounded-md focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 focus-visible:outline-none transition-[opacity,color,background-color]',
                isHidden
                  ? 'text-muted-foreground/70 hover:text-foreground bg-muted/50 opacity-100'
                  : isSelected
                    ? 'text-muted-foreground/70 hover:text-foreground hover:bg-muted/80 opacity-100'
                    : 'text-muted-foreground/60 hover:text-foreground hover:bg-muted/80 opacity-0 group-hover/row:opacity-100',
              )}
              onClick={(e) => toggleVisibility(el, e)}
            >
              {isVisible ? <Eye className="w-3.5 h-3.5" /> : <EyeSlash className="w-3.5 h-3.5" />}
            </Button>
          </TooltipBtn>
        </div>
      </div>
    );
  },
  (prev, next) =>
    prev.isSelected === next.isSelected &&
    prev.isRenaming === next.isRenaming &&
    prev.layerNumber === next.layerNumber &&
    prev.density === next.density &&
    prev.el.id === next.el.id &&
    prev.el.type === next.el.type &&
    prev.el.name === next.el.name &&
    prev.el.visible === next.el.visible &&
    prev.el.locked === next.el.locked &&
    (prev.el as ImageElement).imageSrc === (next.el as ImageElement).imageSrc &&
    (prev.el as TextElement).text === (next.el as TextElement).text &&
    (prev.el as ShapeElement).shape === (next.el as ShapeElement).shape &&
    prev.el.zIndex === next.el.zIndex &&
    prev.el.groupId === next.el.groupId,
);

export interface LayersListProps {
  standalone?: boolean;
  searchQuery?: string;
  typeFilter?: LayerFilter;
  density?: LayerDensity;
}

export function LayersList({
  standalone = false,
  searchQuery = '',
  typeFilter = 'all',
  density = 'compact',
}: LayersListProps = {}) {
  const {
    elements,
    selectedId: _selectedId,
    selectedIds,
    selectElement,
    updateElement,
    updateElements,
    removeElement,
    duplicateElement,
    bringForward,
    sendBackward,
    renameElement,
    pushHistory,
    toggleElementSelection,
  } = useEditorStore(
    useShallow((state) => ({
      elements: state.elements,
      selectedId: state.selectedId,
      selectedIds: state.selectedIds,
      selectElement: state.selectElement,
      updateElement: state.updateElement,
      updateElements: state.updateElements,
      removeElement: state.removeElement,
      duplicateElement: state.duplicateElement,
      bringForward: state.bringForward,
      sendBackward: state.sendBackward,
      renameElement: state.renameElement,
      pushHistory: state.pushHistory,
      toggleElementSelection: state.toggleElementSelection,
    })),
  );

  const [expanded, setExpanded] = useState(true);
  const [renamingId, setRenamingId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const isFiltered = !!(searchQuery.trim() || typeFilter !== 'all');

  const sorted = useMemo(() => [...elements].sort((a, b) => b.zIndex - a.zIndex), [elements]);
  const sortedIndexById = useMemo(() => new Map(sorted.map((s, idx) => [s.id, idx])), [sorted]);
  const selectedIdSet = useMemo(() => new Set(selectedIds), [selectedIds]);

  const filtered = useMemo(() => {
    if (!isFiltered) return sorted;
    return sorted.filter((el) => matchesSearch(el, searchQuery) && matchesFilter(el, typeFilter));
  }, [sorted, searchQuery, typeFilter, isFiltered]);

  const toggleVisibility = useCallback(
    (el: CanvasElement, e: React.MouseEvent) => {
      e.stopPropagation();
      updateElement(el.id, { visible: el.visible === false ? true : false });
      pushHistory();
    },
    [updateElement, pushHistory],
  );

  const toggleLock = useCallback(
    (el: CanvasElement, e: React.MouseEvent) => {
      e.stopPropagation();
      updateElement(el.id, { locked: !el.locked });
      pushHistory();
    },
    [updateElement, pushHistory],
  );

  const deleteLayer = useCallback(
    (id: string, e: React.MouseEvent) => {
      e.stopPropagation();
      const el = elements.find((item) => item.id === id);
      if (el?.locked) {
        toast.info('العنصر مقفل — ألغِ قفله أولاً للحذف');
        return;
      }
      removeElement(id);
    },
    [elements, removeElement],
  );

  const duplicateLayer = useCallback(
    (id: string, e: React.MouseEvent) => {
      e.stopPropagation();
      duplicateElement(id);
    },
    [duplicateElement],
  );

  const handleBringToFront = useCallback(
    (id: string) => {
      const maxZ = elements.reduce((m, el) => Math.max(m, el.zIndex), 0);
      updateElement(id, { zIndex: maxZ + 10 });
      pushHistory();
      toast.success('أُحضرت الطبقة للأمام');
    },
    [elements, updateElement, pushHistory],
  );

  const handleSendToBack = useCallback(
    (id: string) => {
      const minZ = elements.reduce((m, el) => Math.min(m, el.zIndex), Infinity);
      updateElement(id, { zIndex: minZ - 10 });
      pushHistory();
      toast.success('أُرسلت الطبقة للخلف');
    },
    [elements, updateElement, pushHistory],
  );

  const handleSelectElement = useCallback((id: string) => selectElement(id), [selectElement]);
  const handleToggleSelection = useCallback(
    (id: string) => toggleElementSelection(id),
    [toggleElementSelection],
  );

  // الستور يعيد false عند الحافة (لا جار يتبادل معه zIndex) — فلا تلميح كاذب بنجاح
  const handleBringForward = useCallback(
    (id: string) => {
      if (bringForward(id)) toast.success('قُدّمت الطبقة طبقة واحدة');
    },
    [bringForward],
  );

  const handleSendBackward = useCallback(
    (id: string) => {
      if (sendBackward(id)) toast.success('أُؤخّرت الطبقة طبقة واحدة');
    },
    [sendBackward],
  );

  const handleStartRename = useCallback((id: string) => setRenamingId(id), []);
  const handleCancelRename = useCallback(() => setRenamingId(null), []);
  const handleCommitRename = useCallback(
    (id: string, name: string) => {
      setRenamingId(null);
      renameElement(id, name);
    },
    [renameElement],
  );

  // ── Empty ───────────────────────────────────────────────────────────────
  if (elements.length === 0) {
    // أيقونة وحدها تكفي: العنوان والشرح وتلميحات السحب حشو بصري بلا
    // معلومة جديدة (معيار «حظر الحشو البصري») — والشرح ينتقل إلى Tooltip.
    // بلا بطاقة ولا إطار: الإطار يحوّل الأيقونة إلى زرٍّ كاذب. وبلون باهت
    // بحجم 5× فتذوب مع الخلفية بدل أن تنافس عناصر اللوح. والارتفاع
    // 60vh يضعها في منتصف البطاقة لا ملتصقاً بأعلى اللوح.
    return (
      <div className="min-h-[60vh] w-full select-none flex items-center justify-center animate-in fade-in duration-100">
        <TooltipBtn
          content="لا توجد طبقات بعد — أضف من الملصقات أو الأشكال أو النصوص"
          side="bottom"
        >
          <Layer className="h-6 w-6 scale-500 text-muted-foreground/20" />
        </TooltipBtn>
      </div>
    );
  }

  // ── Filtered empty ─────────────────────────────────────────────────────
  if (isFiltered && filtered.length === 0) {
    return (
      <div className="rounded-md border border-border/60 bg-card/40 p-6 text-center flex flex-col items-center gap-3 animate-in fade-in duration-100">
        <div className="w-10 h-10 rounded-md bg-muted flex items-center justify-center text-muted-foreground border border-border/60">
          <MagnifyingGlass className="w-5 h-5" />
        </div>
        <div className="space-y-1">
          <p className="text-xs font-bold">لا نتائج</p>
          <p className="text-mini text-muted-foreground">لا توجد طبقات مطابقة لـ “{searchQuery}”</p>
        </div>
        {typeFilter !== 'all' && (
          <p className="text-mini text-muted-foreground">الفلتر الحالي: {typeFilter}</p>
        )}
      </div>
    );
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    if (isFiltered) {
      toast.info('السحب معطّل أثناء التصفية — امسح الفلتر لإعادة الترتيب');
      return;
    }
    const oldIndex = sortedIndexById.get(String(active.id)) ?? -1;
    const newIndex = sortedIndexById.get(String(over.id)) ?? -1;
    if (oldIndex === -1 || newIndex === -1) return;
    const newSorted = [...sorted];
    const [moved] = newSorted.splice(oldIndex, 1);
    newSorted.splice(newIndex, 0, moved);
    const baseZ = 10;
    const len = newSorted.length;
    const patches: { id: string; patch: Partial<CanvasElement> }[] = [];
    newSorted.forEach((el, index) => {
      const targetZ = (len - index) * baseZ;
      if (el.zIndex !== targetZ) patches.push({ id: el.id, patch: { zIndex: targetZ } });
    });
    if (patches.length) {
      updateElements(patches);
      pushHistory();
    }
  };

  const listContent = (
    <>
      <div
        role="list"
        aria-label="قائمة الطبقات"
        // تمرير واحد فقط: PanelShell (ScrollArea) هو مصدر التمرير في اللوحة.
        // max-height/overflow هنا كانا يصنعان تمريراً متداخلاً داخل الدرج والمفتش.
        className="divide-y divide-border/45 overflow-hidden rounded-md border border-border/60 bg-card/40 custom-scrollbar"
      >
        {filtered.map((el) => {
          const origIndex = sortedIndexById.get(el.id) ?? 0;
          return (
            <SortableLayerItem
              key={el.id}
              el={el}
              layerNumber={sorted.length - origIndex}
              isSelected={selectedIdSet.has(el.id)}
              isRenaming={renamingId === el.id}
              density={density}
              toggleVisibility={toggleVisibility}
              toggleLock={toggleLock}
              deleteLayer={deleteLayer}
              duplicateLayer={duplicateLayer}
              selectElement={handleSelectElement}
              toggleElementSelection={handleToggleSelection}
              onBringToFront={handleBringToFront}
              onSendToBack={handleSendToBack}
              onBringForward={handleBringForward}
              onSendBackward={handleSendBackward}
              onStartRename={handleStartRename}
              onCommitRename={handleCommitRename}
              onCancelRename={handleCancelRename}
            />
          );
        })}
      </div>
      {isFiltered && (
        <p className="text-mini text-muted-foreground pt-1.5 text-center">
          السحب معطّل أثناء التصفية · {filtered.length} من {sorted.length}
        </p>
      )}
    </>
  );

  if (standalone) {
    return (
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        modifiers={[restrictToVerticalAxis]}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={(isFiltered ? filtered : sorted).map((el) => el.id)}
          strategy={verticalListSortingStrategy}
        >
          {listContent}
        </SortableContext>
      </DndContext>
    );
  }

  return (
    <div className="bg-card border border-border rounded-md shadow-xs fluent-specular select-none overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex items-center justify-between w-full text-start px-3 h-9 hover:bg-muted/40 transition-colors"
      >
        <span className="flex items-center gap-1.5 text-xs font-bold text-foreground">
          <span className="w-6 h-6 rounded-md bg-primary/10 border border-primary/15 flex items-center justify-center text-primary shrink-0">
            <Stack className="w-3.5 h-3.5" weight="duotone" />
          </span>
          الطبقات
          <span className="ms-1 px-1.5 py-0.5 rounded-full bg-muted border border-border/60 text-mini font-mono font-bold text-muted-foreground">
            {elements.length}
          </span>
        </span>
        <CaretDown
          className={cn(
            'w-4 h-4 text-muted-foreground transition-transform duration-200',
            !expanded && '-rotate-90 rtl:rotate-90',
          )}
          weight="bold"
        />
      </button>
      {expanded && (
        <div className="px-2 pb-2 pt-2 border-t border-border/40 bg-muted/20 animate-in fade-in duration-150">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            modifiers={[restrictToVerticalAxis]}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={(isFiltered ? filtered : sorted).map((el) => el.id)}
              strategy={verticalListSortingStrategy}
            >
              {listContent}
            </SortableContext>
          </DndContext>
        </div>
      )}
    </div>
  );
}
