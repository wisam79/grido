import React, { useEffect, useRef } from 'react';
import {
  ImageSquare,
  GridFour,
  Rows,
  Columns,
  ArrowClockwise,
  FlipHorizontal,
  ArrowCounterClockwise,
  Eye,
  Broom,
} from '@/components/ui/icons';
import { Spinner } from '@/components/ui/huge-icon';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { useShallow } from 'zustand/react/shallow';
import { useEditorStore } from '@/lib/editor-store';
import type { CanvasSlot } from '@/lib/store/types';
import { QuickBarGroup } from './quick-bar-group';

/**
 * QuickBarSlotSection — قسم الخلية المحددة في وضع الكولاج.
 *
 * 🧭 نطاق الشريط السريع العائم: عمليات الخلية الحركية وسلوك الشبكة فقط
 * (رفع/استبدال، تعبئة صف/عمود/الكل، تدوير، قلب، معاينة الأصل، وتفريغ الخلية).
 * المعالجات الثقيلة تبقى في شريط الأدوات العلوي واللوح الجانبي.
 */
interface QuickBarSlotSectionProps {
  slot: CanvasSlot;
  onOpenFileForSlot: () => void;
  isBusy?: boolean;
}

export const QuickBarSlotSection = React.memo(function QuickBarSlotSection({
  slot,
  onOpenFileForSlot,
  isBusy = false,
}: QuickBarSlotSectionProps) {
  const { fillAllSlots, fillRowSlots, fillColumnSlots, updateSlot, rotateSlot, flipSlotX } =
    useEditorStore(
      useShallow((s) => ({
        fillAllSlots: s.fillAllSlots,
        fillRowSlots: s.fillRowSlots,
        fillColumnSlots: s.fillColumnSlots,
        updateSlot: s.updateSlot,
        rotateSlot: s.rotateSlot,
        flipSlotX: s.flipSlotX,
      })),
    );

  // 🛡️ أمان المعاينة المستمرة: فكّ التركيب أثناء الضغط (تبديل وضع/إغلاق)
  // كان يُبقي صورة المعاينة دائمة بلا تراجع — الاستعادة عند التنظيف.
  const holdRef = useRef<{ id: string; src: string | undefined } | null>(null);
  const updateSlotRef = useRef(updateSlot);
  updateSlotRef.current = updateSlot;
  useEffect(
    () => () => {
      if (holdRef.current) {
        const { id, src } = holdRef.current;
        holdRef.current = null;
        updateSlotRef.current(id, { imageSrc: src });
      }
    },
    [],
  );

  return (
    <>
      {/* 1. رفع / استبدال الصورة */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            onClick={onOpenFileForSlot}
            disabled={isBusy}
            aria-label="تغيير الصورة"
            className="h-6 w-6 p-0 rounded-md hover:bg-primary/10 hover:text-primary disabled:opacity-60 disabled:pointer-events-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none"
          >
            {isBusy ? (
              <Spinner className="w-3.5 h-3.5" size={14} />
            ) : (
              <ImageSquare className="w-3.5 h-3.5" weight="regular" />
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          {isBusy ? 'جاري تجهيز الصورة ...' : 'رفع صورة للخلية'}
        </TooltipContent>
      </Tooltip>

      {slot.imageSrc && (
        <>
          {/* 2. تعبئة الشبكة */}
          <Separator orientation="vertical" className="h-3.5 bg-border/50 mx-0.5" />
          <QuickBarGroup>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => fillAllSlots(slot.imageSrc!, slot.id)}
                  aria-label="تكرار الصورة بكل الخلايا"
                  className="h-6 w-6 p-0 rounded-md hover:bg-primary/10 hover:text-primary focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none"
                >
                  <GridFour className="w-3.5 h-3.5" weight="regular" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">تكرار الصورة بكل الخلايا</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => fillRowSlots(slot.id, slot.imageSrc!)}
                  aria-label="تعبئة الصف"
                  className="h-6 w-6 p-0 rounded-md hover:bg-primary/10 hover:text-primary focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none"
                >
                  <Rows className="w-3.5 h-3.5" weight="regular" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">تعبئة الصف بهذه الصورة</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => fillColumnSlots(slot.id, slot.imageSrc!)}
                  aria-label="تعبئة العمود"
                  className="h-6 w-6 p-0 rounded-md hover:bg-primary/10 hover:text-primary focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none"
                >
                  <Columns className="w-3.5 h-3.5" weight="regular" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">تعبئة العمود بهذه الصورة</TooltipContent>
            </Tooltip>
          </QuickBarGroup>

          {/* 3. التحويلات */}
          <Separator orientation="vertical" className="h-3.5 bg-border/50 mx-0.5" />
          <QuickBarGroup>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => rotateSlot(slot.id, 90)}
                  aria-label="تدوير 90 درجة"
                  className="h-6 w-6 p-0 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none"
                >
                  <ArrowClockwise className="w-3.5 h-3.5" weight="bold" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">تدوير 90 درجة</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => flipSlotX(slot.id)}
                  aria-label="قلب أفقي"
                  className="h-6 w-6 p-0 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none"
                >
                  <FlipHorizontal className="w-3.5 h-3.5" weight="bold" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">قلب أفقي</TooltipContent>
            </Tooltip>
          </QuickBarGroup>

          {/* 4. استعادة ومعاينة الأصل */}
          {slot.originalImageSrc && (
            <QuickBarGroup>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      updateSlot(slot.id, {
                        imageSrc: slot.originalImageSrc,
                        originalImageSrc: undefined,
                        bgColor: undefined,
                      });
                      useEditorStore.getState().pushHistory();
                      toast.success('تمت الاستعادة');
                    }}
                    aria-label="استعادة الصورة الأصلية"
                    className="h-6 w-6 p-0 rounded-md text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none"
                  >
                    <ArrowCounterClockwise className="w-3.5 h-3.5" weight="regular" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">استعادة الصورة الأصلية</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onMouseDown={() => {
                      const curr = slot.imageSrc;
                      holdRef.current = { id: slot.id, src: curr };
                      updateSlot(slot.id, { imageSrc: slot.originalImageSrc });
                      const restore = () => {
                        holdRef.current = null;
                        updateSlot(slot.id, { imageSrc: curr });
                        cleanup();
                      };
                      const cleanup = () => {
                        window.removeEventListener('pointerup', restore);
                        window.removeEventListener('pointercancel', restore);
                        window.removeEventListener('blur', restore);
                      };
                      window.addEventListener('pointerup', restore);
                      window.addEventListener('pointercancel', restore);
                      window.addEventListener('blur', restore);
                    }}
                    aria-label="معاينة الصورة الأصلية"
                    className="h-6 w-6 p-0 rounded-md text-primary hover:bg-primary/10 select-none active:bg-primary active:text-primary-foreground focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none"
                  >
                    <Eye className="w-3.5 h-3.5" weight="regular" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">اضغط مطولاً للمعاينة</TooltipContent>
              </Tooltip>
            </QuickBarGroup>
          )}

          {/* 5. تفريغ الخلية */}
          <Separator orientation="vertical" className="h-3.5 bg-border/50 mx-0.5" />
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  updateSlot(slot.id, { imageSrc: undefined, originalImageSrc: undefined });
                  useEditorStore.getState().pushHistory();
                }}
                aria-label="تفريغ الخلية"
                className="h-6 w-6 p-0 rounded-md text-destructive hover:bg-destructive/10 cursor-pointer focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none"
              >
                <Broom className="w-3.5 h-3.5" weight="regular" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">تفريغ هذه الخلية</TooltipContent>
          </Tooltip>
        </>
      )}
    </>
  );
});
