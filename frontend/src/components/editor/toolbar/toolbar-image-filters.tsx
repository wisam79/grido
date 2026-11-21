import React from 'react';
import { useShallow } from 'zustand/react/shallow';

import { FluentTooltip as TooltipBtn } from '@/components/ui/blocks';
import { Button } from '@/components/ui/button';
import { PhotoFilter } from '@/components/ui/icons';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { useEditorStore } from '@/lib/editor-store';
import { IMAGE_FILTERS, filterShortName } from '@/lib/templates';
import { cn } from '@/lib/utils';

import type { ImageElement } from '@/lib/editor-store';

interface ImageFiltersPopoverProps {
  compact?: boolean;
}

/** مرشحات الصورة المحددة (عنصر أو خانة كولاج) — تُستخدم داخل أدوات التحديد. */
export const ImageFiltersPopover = React.memo(function ImageFiltersPopover({
  compact = false,
}: ImageFiltersPopoverProps = {}) {
  const {
    elements,
    slots,
    mode,
    selectedId: primaryId,
    selectedIds,
  } = useEditorStore(
    useShallow((state) => ({
      elements: state.elements,
      slots: state.slots,
      mode: state.mode,
      selectedId: state.selectedId,
      selectedIds: state.selectedIds,
    })),
  );
  const { imageSrc, filter, selectedId, targetIds } = React.useMemo(() => {
    if (mode !== 'collage') {
      const selectedImages = elements.filter(
        (element): element is ImageElement =>
          (element.id === primaryId || selectedIds.includes(element.id)) &&
          element.type === 'image',
      );
      const selectedImage =
        selectedImages.find((element) => element.id === primaryId) ?? selectedImages[0];
      if (selectedImage?.type === 'image') {
        return {
          imageSrc: selectedImage.imageSrc,
          filter: selectedImage.filter,
          selectedId: selectedImage.id,
          targetIds: selectedImages.map((element) => element.id),
        };
      }
    } else {
      const selectedSlots = slots.filter(
        (slot) => (slot.id === primaryId || selectedIds.includes(slot.id)) && !!slot.imageSrc,
      );
      const selectedSlot = selectedSlots.find((slot) => slot.id === primaryId) ?? selectedSlots[0];
      if (selectedSlot) {
        return {
          imageSrc: selectedSlot.imageSrc,
          filter: selectedSlot.filter,
          selectedId: selectedSlot.id,
          targetIds: selectedSlots.map((slot) => slot.id),
        };
      }
    }
    return {
      imageSrc: undefined,
      filter: undefined,
      selectedId: null,
      targetIds: [] as string[],
    };
  }, [elements, slots, mode, primaryId, selectedIds]);

  const updateElement = useEditorStore((state) => state.updateElement);
  const updateElements = useEditorStore((state) => state.updateElements);
  const updateSlotsBatch = useEditorStore((state) => state.updateSlotsBatch);
  const pushHistory = useEditorStore((state) => state.pushHistory);
  const canApply =
    mode === 'collage'
      ? slots.some((slot) => targetIds.includes(slot.id) && !!slot.imageSrc)
      : elements.some((element) => targetIds.includes(element.id) && !element.locked);

  if (!selectedId || targetIds.length === 0) return null;

  const hasActiveFilter = Boolean(filter && filter !== 'none');

  return (
    <Popover>
      <TooltipBtn content="المرشحات">
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            aria-label="المرشحات"
            disabled={!canApply}
            className={cn(
              compact ? 'h-7 w-7 p-0' : 'h-8 w-8 p-0',
              'coarse-touch-target hover:bg-accent data-[state=open]:bg-accent data-[state=open]:text-foreground rounded-md transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none',
              hasActiveFilter ? 'text-primary' : 'text-foreground/80 hover:text-foreground',
            )}
          >
            <PhotoFilter className="w-4 h-4" weight={hasActiveFilter ? 'fill' : 'regular'} />
          </Button>
        </PopoverTrigger>
      </TooltipBtn>
      <PopoverContent
        align="start"
        dir="rtl"
        className="w-80 p-3 font-cairo bg-popover text-popover-foreground border border-border rounded-lg shadow-fluent-16 fluent-specular z-(--z-popover)"
      >
        <div className="text-xs font-bold mb-2 text-foreground/80 text-start" dir="rtl">
          المرشحات
        </div>
        <div className="grid grid-cols-4 gap-1.5" dir="rtl">
          {IMAGE_FILTERS.map((f) => {
            const isActive = (filter ?? 'none') === f.id;

            return (
              <button
                key={f.id}
                onClick={() => {
                  const state = useEditorStore.getState();
                  if (state.mode !== mode) return;
                  const selected = new Set([state.selectedId, ...state.selectedIds]);
                  const changedIds =
                    mode === 'collage'
                      ? state.slots
                          .filter(
                            (slot) =>
                              targetIds.includes(slot.id) &&
                              selected.has(slot.id) &&
                              !!slot.imageSrc &&
                              (slot.filter ?? 'none') !== f.id,
                          )
                          .map((slot) => slot.id)
                      : state.elements
                          .filter(
                            (element) =>
                              targetIds.includes(element.id) &&
                              selected.has(element.id) &&
                              !element.locked &&
                              element.type === 'image' &&
                              (element.filter ?? 'none') !== f.id,
                          )
                          .map((element) => element.id);
                  if (changedIds.length === 0) return;
                  if (mode !== 'collage') {
                    if (changedIds.length === 1) {
                      updateElement(changedIds[0], { filter: f.id });
                    } else {
                      updateElements(changedIds.map((id) => ({ id, patch: { filter: f.id } })));
                    }
                  } else {
                    updateSlotsBatch(changedIds, { filter: f.id });
                  }
                  pushHistory();
                }}
                className={cn(
                  'flex flex-col items-center gap-1 p-1 rounded-md border transition-colors cursor-pointer',
                  'focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none',
                  isActive
                    ? 'border-primary bg-primary/10 text-primary shadow-xs shadow-primary/5 dark:bg-primary/20 dark:border-primary/50 font-bold'
                    : 'border-border/60 bg-card hover:bg-accent text-muted-foreground',
                )}
              >
                <div className="w-full aspect-square rounded-md overflow-hidden shrink-0 border border-foreground/10 bg-muted relative">
                  {imageSrc ? (
                    <img
                      src={imageSrc}
                      alt=""
                      aria-hidden="true"
                      loading="lazy"
                      draggable={false}
                      className="w-full h-full object-cover"
                      style={{ filter: f.css }}
                    />
                  ) : (
                    <div
                      className="w-full h-full bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500"
                      style={{ filter: f.css }}
                    />
                  )}
                </div>
                <span
                  className="text-micro tracking-tight w-full text-center leading-tight mt-0.5"
                  title={f.name}
                >
                  {filterShortName(f.name)}
                </span>
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
});
