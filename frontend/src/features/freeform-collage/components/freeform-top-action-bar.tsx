import React from 'react';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlignCenterHorizontal,
  AlignCenterVertical,
  AlignLeft,
  AlignTop,
  ArrowClockwise,
  ArrowUUpLeft,
  ArrowUUpRight,
  ArrowsIn,
  ArrowsOut,
  Broom,
  CaretDown,
  Columns,
  Copy,
  PushPin,
  Rows,
  Scissors,
  Trash,
} from '@/components/ui/icons';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

import type { DistributionAxis, SlotAlignment } from '../types';

export type MultiAlignMode =
  'left' | 'right' | 'top' | 'bottom' | 'center-h' | 'center-v' | 'same-size';

interface FreeformTopActionBarProps {
  selectedSlotId: string | null;
  /** عدد خلايا التحديد الكلي (الأساسية + المتعدد) */
  multiSelectedCount: number;
  canUndo: boolean;
  canRedo: boolean;
  showCutLines: boolean;
  enableSnapping: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onDuplicateSlot: () => void;
  onRotateSlot: () => void;
  onRemoveSlot: () => void;
  onScaleSelection: (factor: number) => void;
  onSplitHorizontal: () => void;
  onSplitVertical: () => void;
  onAlignSlot: (alignment: SlotAlignment) => void;
  onAlignSelectionToEachOther: (alignment: MultiAlignMode) => void;
  onDistributeSlots: (axis: DistributionAxis) => void;
  onResolveOverlaps: () => void;
  onToggleCutLines: () => void;
  onToggleSnapping: () => void;
}

/** زر أيقونة موحد Fluent 2 مدمج (28px) مع Tooltip وحلقة تركيز مزدوجة */
export const FreeformToolButton: React.FC<{
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
  title: string;
  children: React.ReactNode;
  destructive?: boolean;
}> = ({ onClick, disabled, active, title, children, destructive }) => (
  <Tooltip>
    <TooltipTrigger asChild>
      <Button
        variant={active ? 'secondary' : 'ghost'}
        size="icon"
        onClick={onClick}
        disabled={disabled}
        aria-label={title}
        aria-pressed={active}
        className={cn(
          'h-8 w-8 rounded-md cursor-pointer shrink-0 transition-colors duration-150',
          'focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:outline-none',
          active && 'text-primary bg-primary/10 hover:bg-primary/15',
          destructive &&
            'text-destructive hover:bg-destructive/10 hover:text-destructive focus-visible:ring-destructive',
        )}
      >
        {children}
      </Button>
    </TooltipTrigger>
    <TooltipContent side="bottom" className="font-cairo text-mini">
      {title}
    </TooltipContent>
  </Tooltip>
);

const Divider = () => <div className="w-[1px] h-4 bg-border/60 mx-0.5 shrink-0" />;

export const FreeformTopActionBar: React.FC<FreeformTopActionBarProps> = React.memo(
  function FreeformTopActionBar({
    selectedSlotId,
    multiSelectedCount,
    canUndo,
    canRedo,
    showCutLines,
    enableSnapping,
    onUndo,
    onRedo,
    onDuplicateSlot,
    onRotateSlot,
    onRemoveSlot,
    onScaleSelection,
    onSplitHorizontal,
    onSplitVertical,
    onAlignSlot,
    onAlignSelectionToEachOther,
    onDistributeSlots,
    onResolveOverlaps,
    onToggleCutLines,
    onToggleSnapping,
  }) {
    const isMulti = multiSelectedCount > 1;

    return (
      <div
        className="min-h-11 px-3 py-1 bg-card flex flex-wrap items-center gap-0.5 font-cairo select-none"
        role="group"
        aria-label="تحرير الخلايا"
        dir="rtl"
      >
        {/* ── المحفوظات ── */}
        <FreeformToolButton onClick={onUndo} disabled={!canUndo} title="تراجع (Ctrl+Z)">
          <ArrowUUpLeft className="w-3.5 h-3.5" weight="bold" />
        </FreeformToolButton>
        <FreeformToolButton onClick={onRedo} disabled={!canRedo} title="إعادة (Ctrl+Y)">
          <ArrowUUpRight className="w-3.5 h-3.5" weight="bold" />
        </FreeformToolButton>

        <Divider />

        {/* ── تحرير الخلية المحددة ── */}
        <FreeformToolButton
          onClick={onDuplicateSlot}
          disabled={!selectedSlotId}
          title="تكرار (Ctrl+D)"
        >
          <Copy className="w-3.5 h-3.5" weight="bold" />
        </FreeformToolButton>
        <FreeformToolButton
          onClick={() => onScaleSelection(1.1)}
          disabled={!selectedSlotId}
          title="تكبير 10%"
        >
          <ArrowsOut className="w-3.5 h-3.5" weight="bold" />
        </FreeformToolButton>
        <FreeformToolButton
          onClick={() => onScaleSelection(1 / 1.1)}
          disabled={!selectedSlotId}
          title="تصغير 10%"
        >
          <ArrowsIn className="w-3.5 h-3.5" weight="bold" />
        </FreeformToolButton>
        <FreeformToolButton onClick={onRotateSlot} disabled={!selectedSlotId} title="تدوير 90°">
          <ArrowClockwise className="w-3.5 h-3.5" weight="bold" />
        </FreeformToolButton>
        <FreeformToolButton
          onClick={onRemoveSlot}
          disabled={!selectedSlotId}
          title="حذف (Del)"
          destructive
        >
          <Trash className="w-3.5 h-3.5" weight="bold" />
        </FreeformToolButton>

        <Divider />

        {/* ── التقسيم ── */}
        <FreeformToolButton
          onClick={onSplitVertical}
          disabled={!selectedSlotId}
          title="تقسيم لصفين"
        >
          <Rows className="w-3.5 h-3.5" weight="bold" />
        </FreeformToolButton>
        <FreeformToolButton
          onClick={onSplitHorizontal}
          disabled={!selectedSlotId}
          title="تقسيم لعمودين"
        >
          <Columns className="w-3.5 h-3.5" weight="bold" />
        </FreeformToolButton>

        <Divider />

        {/* قائمة الترتيب المتقدم: توزيع + محاذاة جماعية */}
        <DropdownMenu>
          <Tooltip>
            <TooltipTrigger asChild>
              <DropdownMenuTrigger asChild>
                <Button
                  variant={isMulti ? 'secondary' : 'ghost'}
                  size="sm"
                  disabled={!selectedSlotId}
                  aria-label="ترتيب وتوزيع"
                  className={cn(
                    'h-7 px-2 text-mini gap-1 rounded-md cursor-pointer shrink-0 font-semibold relative text-muted-foreground hover:text-foreground',
                    'focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:outline-none',
                    isMulti &&
                      'text-foreground bg-card border border-border/80 dark:border-white/15 shadow-xs font-bold',
                  )}
                >
                  <span>ترتيب</span>
                  <CaretDown className="w-3 h-3" />
                </Button>
              </DropdownMenuTrigger>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="font-cairo text-mini">
              توزيع المسافات والمحاذاة الجماعية
            </TooltipContent>
          </Tooltip>
          <DropdownMenuContent
            align="start"
            className="w-52 font-cairo text-xs z-(--z-print-toolbar)"
          >
            <DropdownMenuLabel className="text-mini text-muted-foreground">
              محاذاة في الورقة
            </DropdownMenuLabel>
            <DropdownMenuItem onSelect={() => onAlignSlot('center-h')}>
              <AlignCenterHorizontal className="size-4" />
              توسيط أفقي
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => onAlignSlot('center-v')}>
              <AlignCenterVertical className="size-4" />
              توسيط عمودي
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => onAlignSlot('top-left')}>ركن الورقة</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => onDistributeSlots('horizontal')}
              className="cursor-pointer gap-2 py-1.5 font-semibold"
            >
              <AlignLeft className="w-3.5 h-3.5 text-primary" weight="bold" />
              <span>توزيع المسافات أفقياً</span>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => onDistributeSlots('vertical')}
              className="cursor-pointer gap-2 py-1.5 font-semibold"
            >
              <AlignTop className="w-3.5 h-3.5 text-primary" weight="bold" />
              <span>توزيع المسافات عمودياً</span>
            </DropdownMenuItem>

            {isMulti && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuLabel className="text-micro text-muted-foreground font-bold">
                  محاذاة التحديد ({multiSelectedCount} خلايا)
                </DropdownMenuLabel>
                <DropdownMenuItem
                  onClick={() => onAlignSelectionToEachOther('same-size')}
                  className="cursor-pointer py-1.5 font-semibold"
                >
                  توحيد المقاس للكل
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => onAlignSelectionToEachOther('center-h')}
                  className="cursor-pointer py-1.5 font-semibold"
                >
                  توسيط أفقي جماعي
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => onAlignSelectionToEachOther('center-v')}
                  className="cursor-pointer py-1.5 font-semibold"
                >
                  توسيط عمودي جماعي
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => onAlignSelectionToEachOther('top')}
                  className="cursor-pointer py-1.5 font-semibold"
                >
                  محاذاة للحافة العليا
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => onAlignSelectionToEachOther('bottom')}
                  className="cursor-pointer py-1.5 font-semibold"
                >
                  محاذاة للحافة السفلى
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        <Divider />

        {/* ── مساعدات الكانفاس ── */}
        <FreeformToolButton
          onClick={onToggleCutLines}
          active={showCutLines}
          title={showCutLines ? 'إخفاء خطوط القص' : 'إظهار خطوط القص للطباعة'}
        >
          <Scissors className="w-3.5 h-3.5" weight="bold" />
        </FreeformToolButton>
        <FreeformToolButton
          onClick={onToggleSnapping}
          active={enableSnapping}
          title={enableSnapping ? 'المغناطيس نشط' : 'المغناطيس معطل'}
        >
          <PushPin className="w-3.5 h-3.5" weight="bold" />
        </FreeformToolButton>
        <FreeformToolButton onClick={onResolveOverlaps} title="تنظيم وتفادي التداخلات">
          <Broom className="w-3.5 h-3.5" weight="bold" />
        </FreeformToolButton>
      </div>
    );
  },
);
