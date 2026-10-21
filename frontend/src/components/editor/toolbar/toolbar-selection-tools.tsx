import React, { useCallback } from 'react';
import { toast } from 'sonner';
import { useShallow } from 'zustand/react/shallow';

import {
  AlignLeftIcon,
  AlignCenterHorizontalIcon,
  AlignRightIcon,
} from '@/components/ui/alignment-icons';
import { FluentTooltip as TooltipBtn } from '@/components/ui/blocks';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import { Copy, Link, LinkBreak, Trash, CaretDown } from '@/components/ui/icons';
import { Separator } from '@/components/ui/separator';
import { useEditorStore } from '@/lib/editor-store';

import { AiToolsToolbarGroup } from './toolbar-ai-tools';
import { ImageFiltersPopover } from './toolbar-image-filters';

/** تنفيذ فعل على التحديد: عنصر واحد أو دفعة — كان الفرع مكرراً في تكرار/حذف. */
function actOnSelection(
  single: (id: string) => void,
  multi: (ids: string[]) => void,
  isDelete = false,
): void {
  const { selectedIds, elements } = useEditorStore.getState();
  if (isDelete) {
    const lockedCount = selectedIds.filter(
      (id) => elements.find((el) => el.id === id)?.locked,
    ).length;
    const removableIds = selectedIds.filter((id) => !elements.find((el) => el.id === id)?.locked);
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
  if (selectedIds.length === 1) single(selectedIds[0]);
  else if (selectedIds.length > 1) multi(selectedIds);
}

/** أدوات العناصر المحددة (تكرار/ذكاء اصطناعي/تجميع/محاذاة/حذف). */
export const ToolbarSelectionTools = React.memo(function ToolbarSelectionTools() {
  const { hasSelection, isImageSelected, canGroup, canUngroup } = useEditorStore(
    useShallow((state) => {
      const hasSel = !!state.selectedId || state.selectedIds.length > 0;
      const selectedEl = state.elements.find((e) => e.id === state.selectedId);
      const selectedSlot = state.slots?.find((s) => s.id === state.selectedId);
      const isImg =
        (selectedEl && selectedEl.type === 'image') ||
        (state.mode === 'collage' && selectedSlot && !!selectedSlot.imageSrc);

      const idsCount = state.selectedIds.length;
      const hasGroup = state.elements.some((el) => state.selectedIds.includes(el.id) && el.groupId);

      return {
        hasSelection: hasSel,
        isImageSelected: !!isImg,
        canGroup: idsCount >= 2,
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

  if (!hasSelection) return null;

  return (
    <div
      data-testid="toolbar-selection-group"
      className="flex items-center gap-2 animate-in fade-in-0 slide-in-from-right-2 duration-200 ease-out"
    >
      <Separator orientation="vertical" className="h-4 mx-0.5 bg-border/60" />

      {isImageSelected && (
        <>
          <AiToolsToolbarGroup />
          <Separator orientation="vertical" className="h-4 bg-border/60 mx-0.5" />
        </>
      )}

      <div className="fluent-command-group shadow-2xs">
        <TooltipBtn content="تكرار العناصر">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => actOnSelection(duplicateElement, duplicateElements)}
            aria-label="تكرار"
            className="h-8 px-2.5 text-muted-foreground hover:text-foreground hover:bg-background/80 rounded-md transition-colors cursor-pointer"
          >
            <Copy className="w-5 h-5" />
          </Button>
        </TooltipBtn>

        {isImageSelected && (
          <>
            <Separator orientation="vertical" className="h-4 bg-border/40 mx-0.5" />
            <ImageFiltersPopover />
          </>
        )}

        {canGroup && (
          <TooltipBtn content="تجميع العناصر">
            <Button
              variant="ghost"
              size="sm"
              onClick={groupSelectedElements}
              aria-label="تجميع"
              // 🎨 رمادي في الراحة → داكن عند التمرير (اتساق أيقونات الشريط)
              className="h-8 px-2.5 text-muted-foreground hover:text-foreground hover:bg-background/80 rounded-md transition-colors cursor-pointer"
            >
              <Link className="w-5 h-5" />
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
              className="h-8 px-2.5 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 rounded-md transition-colors cursor-pointer"
            >
              <LinkBreak className="w-5 h-5" />
            </Button>
          </TooltipBtn>
        )}
        <Separator orientation="vertical" className="h-4 bg-border/40 mx-0.5" />

        {/* محاذاة */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 px-2.5 text-muted-foreground hover:text-foreground hover:bg-background/80 rounded-md transition-colors cursor-pointer gap-1"
              aria-label="محاذاة"
            >
              <AlignCenterHorizontalIcon className="w-5 h-5" />
              <CaretDown className="w-3.5 h-3.5 opacity-60" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="start"
            className="w-40 font-cairo [direction:rtl] rounded-lg bg-popover text-popover-foreground border border-border shadow-fluent-16 fluent-specular p-1 space-y-0.5"
          >
            <DropdownMenuItem
              onClick={() => alignElement('left')}
              className="gap-2.5 text-xs cursor-pointer rounded-lg p-2 text-foreground/90 hover:text-foreground"
            >
              <AlignLeftIcon className="w-4 h-4 text-muted-foreground" />
              <span className="font-semibold">محاذاة لليسار</span>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => alignElement('center')}
              className="gap-2.5 text-xs cursor-pointer rounded-lg p-2 text-foreground/90 hover:text-foreground"
            >
              <AlignCenterHorizontalIcon className="w-4 h-4 text-muted-foreground" />
              <span className="font-semibold">توسيط أفقي</span>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => alignElement('right')}
              className="gap-2.5 text-xs cursor-pointer rounded-lg p-2 text-foreground/90 hover:text-foreground"
            >
              <AlignRightIcon className="w-4 h-4 text-muted-foreground" />
              <span className="font-semibold">محاذاة لليمين</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Separator orientation="vertical" className="h-4 bg-border/40 mx-0.5" />

        {/* حذف — أيقونة محايدة في الراحة وتتحول للأحمر عند التمرير لمنع التشتت البصري */}
        <TooltipBtn content="حذف (Delete)">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => actOnSelection(removeElement, removeElements, true)}
            aria-label="حذف"
            className="h-8 px-2.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md transition-colors cursor-pointer"
          >
            <Trash className="w-5 h-5" />
          </Button>
        </TooltipBtn>
      </div>
    </div>
  );
});
