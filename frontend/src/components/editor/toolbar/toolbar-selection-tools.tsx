import React, { useCallback } from 'react';
import { toast } from 'sonner';
import { useShallow } from 'zustand/react/shallow';

import {
  AlignLeftIcon,
  AlignCenterHorizontalIcon,
  AlignRightIcon,
  AlignTopIcon,
  AlignCenterVerticalIcon,
  AlignBottomIcon,
} from '@/components/ui/alignment-icons';
import { FluentTooltip as TooltipBtn } from '@/components/ui/blocks';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Copy, Link, LinkBreak, Trash, CaretDown } from '@/components/ui/icons';
import { Separator } from '@/components/ui/separator';
import { useEditorStore } from '@/lib/editor-store';

import { ImageFiltersPopover } from './toolbar-image-filters';

/** تنفيذ فعل على التحديد: عنصر واحد أو دفعة — كان الفرع مكرراً في تكرار/حذف. */
function actOnSelection(
  single: (id: string) => void,
  multi: (ids: string[]) => void,
  isDelete = false,
): void {
  const { selectedId, selectedIds, elements } = useEditorStore.getState();
  const activeIds = selectedIds.length > 0 ? selectedIds : selectedId ? [selectedId] : [];
  if (isDelete) {
    const lockedCount = activeIds.filter(
      (id) => elements.find((el) => el.id === id)?.locked,
    ).length;
    const removableIds = activeIds.filter((id) => !elements.find((el) => el.id === id)?.locked);
    if (removableIds.length === 0 && lockedCount > 0) {
      toast.info('العناصر المحددة مقفلة — ألغِ قفلها أولاً للحذف');
      return;
    }
    if (lockedCount > 0) {
      toast.info('تجاهلنا العناصر المقفلة وحذفنا غير المقفلة فقط');
    }
    if (removableIds.length === 1) single(removableIds[0]);
    else if (removableIds.length > 1) multi(removableIds);
    return;
  }
  if (activeIds.length === 1) single(activeIds[0]);
  else if (activeIds.length > 1) multi(activeIds);
}

/** أدوات العناصر المحددة (تكرار/ذكاء اصطناعي/تجميع/محاذاة/حذف). */
export const ToolbarSelectionTools = React.memo(function ToolbarSelectionTools() {
  const { hasSelection, isImageSelected, isSlotSelection, hasSlotImage, canGroup, canUngroup } =
    useEditorStore(
      useShallow((state) => {
        const activeIds =
          state.selectedIds.length > 0
            ? state.selectedIds
            : state.selectedId
              ? [state.selectedId]
              : [];
        const hasSel = activeIds.length > 0;
        const selectedElements = state.elements.filter((element) => activeIds.includes(element.id));
        const selectedSlots = (state.slots ?? []).filter((slot) => activeIds.includes(slot.id));
        const slotSelection =
          state.mode === 'collage' && selectedElements.length === 0 && selectedSlots.length > 0;
        const isImg =
          selectedElements.some((el) => el.type === 'image') ||
          (slotSelection && selectedSlots.some((slot) => !!slot.imageSrc));

        const hasGroup = selectedElements.some((el) => el.groupId);

        return {
          hasSelection: hasSel,
          isImageSelected: isImg,
          isSlotSelection: slotSelection,
          hasSlotImage: slotSelection && selectedSlots.some((slot) => !!slot.imageSrc),
          canGroup: !slotSelection && activeIds.length >= 2,
          canUngroup: hasGroup,
        };
      }),
    );
  const duplicateElement = useEditorStore((state) => state.duplicateElement);
  const duplicateElements = useEditorStore((state) => state.duplicateElements);
  const groupSelectedElements = useEditorStore((state) => state.groupSelectedElements);
  const ungroupSelectedElements = useEditorStore((state) => state.ungroupSelectedElements);
  const removeElement = useEditorStore((state) => state.removeElement);
  const removeElements = useEditorStore((state) => state.removeElements);

  const alignElement = useCallback(
    (type: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom') => {
      // استخدام دالة الستور المعتمدة alignSelectedElements — المحاذاة المحلية
      // كانت تعالج كل عنصر بمفرده وتسحق العناصر المجمعة فوق نفس الإحداثي
      const { alignSelectedElements } = useEditorStore.getState();
      alignSelectedElements(type);
    },
    [],
  );

  if (!hasSelection || (isSlotSelection && !hasSlotImage)) return null;

  const deleteSelection = () => {
    const state = useEditorStore.getState();
    if (isSlotSelection) {
      const activeIds =
        state.selectedIds.length > 0
          ? state.selectedIds
          : state.selectedId
            ? [state.selectedId]
            : [];
      const imageIds = activeIds.filter((id) =>
        state.slots.some((slot) => slot.id === id && slot.imageSrc),
      );
      if (imageIds.length === 0) return;
      state.updateSlotsBatch(imageIds, { imageSrc: undefined, originalImageSrc: undefined });
      state.pushHistory();
      return;
    }
    actOnSelection(removeElement, removeElements, true);
  };

  return (
    <div
      data-testid="toolbar-selection-group"
      className="flex items-center gap-0.5 animate-in fade-in-0 duration-100"
    >
      <Separator orientation="vertical" className="h-4 mx-1.5 bg-border/80" />

      <div className="fluent-command-group">
        {!isSlotSelection && (
          <TooltipBtn content="تكرار العناصر">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => actOnSelection(duplicateElement, duplicateElements)}
              aria-label="تكرار"
              className="coarse-touch-target h-8 w-8 p-0 text-foreground/80 hover:text-foreground hover:bg-accent rounded-md transition-colors cursor-pointer"
            >
              <Copy className="w-4 h-4" />
            </Button>
          </TooltipBtn>
        )}

        {isImageSelected && <ImageFiltersPopover />}

        {canGroup && (
          <TooltipBtn content="تجميع العناصر">
            <Button
              variant="ghost"
              size="sm"
              onClick={groupSelectedElements}
              aria-label="تجميع"
              // 🎨 رمادي في الراحة → داكن عند التمرير (اتساق أيقونات الشريط)
              className="coarse-touch-target h-8 w-8 p-0 text-foreground/80 hover:text-foreground hover:bg-accent rounded-md transition-colors cursor-pointer"
            >
              <Link className="w-4 h-4" />
            </Button>
          </TooltipBtn>
        )}

        {canUngroup && (
          <TooltipBtn content="فك التجميع">
            <Button
              variant="ghost"
              size="sm"
              onClick={ungroupSelectedElements}
              aria-label="فك التجميع"
              className="coarse-touch-target h-8 w-8 p-0 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 rounded-md transition-colors cursor-pointer"
            >
              <LinkBreak className="w-4 h-4" />
            </Button>
          </TooltipBtn>
        )}

        {!isSlotSelection && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="coarse-touch-target h-8 px-2 text-foreground/80 hover:text-foreground hover:bg-accent data-[state=open]:bg-accent data-[state=open]:text-foreground rounded-md transition-colors cursor-pointer gap-1"
                aria-label="محاذاة"
              >
                <AlignCenterHorizontalIcon className="w-4 h-4" />
                <CaretDown className="w-3 h-3 opacity-60" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="start"
              className="w-44 font-cairo [direction:rtl] rounded-lg bg-popover text-popover-foreground border border-border shadow-fluent-16 fluent-specular p-1 space-y-0.5"
            >
              <DropdownMenuItem
                onClick={() => alignElement('left')}
                className="gap-2.5 text-xs cursor-pointer rounded-md py-1.5 px-2.5 text-foreground/90 hover:text-foreground"
              >
                <AlignLeftIcon className="w-4 h-4 text-muted-foreground" />
                <span className="font-semibold">محاذاة لليسار</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => alignElement('center')}
                className="gap-2.5 text-xs cursor-pointer rounded-md py-1.5 px-2.5 text-foreground/90 hover:text-foreground"
              >
                <AlignCenterHorizontalIcon className="w-4 h-4 text-muted-foreground" />
                <span className="font-semibold">توسيط أفقي</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => alignElement('right')}
                className="gap-2.5 text-xs cursor-pointer rounded-md py-1.5 px-2.5 text-foreground/90 hover:text-foreground"
              >
                <AlignRightIcon className="w-4 h-4 text-muted-foreground" />
                <span className="font-semibold">محاذاة لليمين</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator className="my-1" />
              <DropdownMenuItem
                onClick={() => alignElement('top')}
                className="gap-2.5 text-xs cursor-pointer rounded-md py-1.5 px-2.5 text-foreground/90 hover:text-foreground"
              >
                <AlignTopIcon className="w-4 h-4 text-muted-foreground" />
                <span className="font-semibold">محاذاة للأعلى</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => alignElement('middle')}
                className="gap-2.5 text-xs cursor-pointer rounded-md py-1.5 px-2.5 text-foreground/90 hover:text-foreground"
              >
                <AlignCenterVerticalIcon className="w-4 h-4 text-muted-foreground" />
                <span className="font-semibold">توسيط عمودي</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => alignElement('bottom')}
                className="gap-2.5 text-xs cursor-pointer rounded-md py-1.5 px-2.5 text-foreground/90 hover:text-foreground"
              >
                <AlignBottomIcon className="w-4 h-4 text-muted-foreground" />
                <span className="font-semibold">محاذاة للأسفل</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {/* حذف — أيقونة محايدة في الراحة وتتحول للأحمر عند التمرير لمنع التشتت البصري */}
        <Separator
          orientation="vertical"
          className="mx-1 bg-border/60 data-[orientation=vertical]:h-3.5"
        />
        <TooltipBtn content={isSlotSelection ? 'تفريغ الصورة (Delete)' : 'حذف (Delete)'}>
          <Button
            variant="ghost"
            size="sm"
            onClick={deleteSelection}
            aria-label={isSlotSelection ? 'تفريغ الصورة' : 'حذف'}
            className="coarse-touch-target h-8 w-8 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md transition-colors cursor-pointer"
          >
            <Trash className="w-4 h-4" />
          </Button>
        </TooltipBtn>
      </div>
    </div>
  );
});
