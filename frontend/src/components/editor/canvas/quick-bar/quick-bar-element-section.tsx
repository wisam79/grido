import React from 'react';
import { toast } from 'sonner';
import { useShallow } from 'zustand/react/shallow';

import { Button } from '@/components/ui/button';
import {
  ArrowUp,
  ArrowDown,
  ArrowClockwise,
  FlipHorizontal,
  ArrowCounterClockwise,
  Eye,
  TextT,
  ArrowsInLineHorizontal,
} from '@/components/ui/icons';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { getQuarterTurnRotationPatch } from '@/lib/canvas/element-geometry';
import { useEditorStore } from '@/lib/editor-store';
import { cn } from '@/lib/utils';

import { QuickBarGroup } from './quick-bar-group';

import type { CanvasElement } from '@/lib/store/types';

/**
 * QuickBarElementSection — قسم العنصر الفردي في وضع التعديل الحر.
 *
 * 🧭 نطاق هذا الشريط مصغر ورشيق: موضع العنصر على الورقة (ترتيب الطبقة،
 * التدوير، القلب، ومقارنة الصورة بالأصل) بحجم فائق الصغر (24px).
 * أما أدوات المعالجة والتكرار والحذف والذكاء الاصطناعي فموطنها شريط الأدوات العلوي واللوح الجانبي.
 */
interface QuickBarElementSectionProps {
  element: CanvasElement;
}

export const QuickBarElementSection = React.memo(function QuickBarElementSection({
  element,
}: QuickBarElementSectionProps) {
  const { updateElement, bringToFront, sendToBack } = useEditorStore(
    useShallow((s) => ({
      updateElement: s.updateElement,
      bringToFront: s.bringToFront,
      sendToBack: s.sendToBack,
    })),
  );

  // 🛡️ أمان المعاينة المستمرة: فكّ التركيب أثناء الضغط
  // كان يُبقي صورة المعاينة دائمة بلا تراجع — الاستعادة عند التنظيف.
  const holdRef = React.useRef<{ id: string; src: string | undefined } | null>(null);
  const updateElementRef = React.useRef(updateElement);
  updateElementRef.current = updateElement;
  React.useEffect(
    () => () => {
      if (holdRef.current) {
        const { id, src } = holdRef.current;
        holdRef.current = null;
        updateElementRef.current(id, { imageSrc: src });
      }
    },
    [],
  );

  return (
    <>
      {/* أدوات سريعة للنص: تحرير مباشر وملاءمة الصندوق للمحتوى */}
      {element.type === 'text' && (
        <>
          <QuickBarGroup>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => useEditorStore.getState().setEditingTextId(element.id)}
                  aria-label="تحرير النص"
                  className="h-7 w-7 p-0 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground"
                >
                  <TextT className="w-3.5 h-3.5" weight="bold" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">تحرير النص (نقر مزدوج)</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    if (element.textSizing === 'auto') {
                      updateElement(element.id, { textSizing: 'fixed' });
                      useEditorStore.getState().pushHistory();
                    } else {
                      useEditorStore.getState().fitTextToContent(element.id);
                    }
                  }}
                  aria-label={
                    element.textSizing === 'auto' ? 'تثبيت عرض النص' : 'ملاءمة الصندوق للنص'
                  }
                  className={cn(
                    'h-7 w-7 p-0 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground',
                    element.textSizing === 'auto' && 'bg-primary/10 text-primary',
                  )}
                >
                  <ArrowsInLineHorizontal
                    className="w-3.5 h-3.5"
                    weight={element.textSizing === 'auto' ? 'fill' : 'bold'}
                  />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                {element.textSizing === 'auto'
                  ? 'حجم تلقائي — اضغط لتثبيت العرض'
                  : 'ملاءمة الصندوق للنص'}
              </TooltipContent>
            </Tooltip>
          </QuickBarGroup>
          <Separator orientation="vertical" className="h-3 bg-border/40" />
        </>
      )}

      {/* مجموعة ترتيب الطبقة (أمام/خلف) */}
      <QuickBarGroup>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => bringToFront(element.id)}
              aria-label="إحضار للأمام"
              className="h-7 w-7 p-0 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground"
            >
              <ArrowUp className="w-3.5 h-3.5" weight="bold" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">إحضار للأمام</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => sendToBack(element.id)}
              aria-label="إرسال للخلف"
              className="h-7 w-7 p-0 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground"
            >
              <ArrowDown className="w-3.5 h-3.5" weight="bold" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">إرسال للخلف</TooltipContent>
        </Tooltip>
      </QuickBarGroup>

      {/* التحويلات (تدوير 90° / قلب أفقي) */}
      <QuickBarGroup>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                const { canvasWidth, canvasHeight } = useEditorStore.getState();
                updateElement(
                  element.id,
                  getQuarterTurnRotationPatch(element, canvasWidth, canvasHeight),
                );
                useEditorStore.getState().pushHistory();
              }}
              aria-label="تدوير 90 درجة"
              className="h-7 w-7 p-0 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground"
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
              onClick={() => {
                updateElement(element.id, { flipX: !element.flipX });
                useEditorStore.getState().pushHistory();
              }}
              aria-label="قلب أفقي"
              className={cn(
                'h-7 w-7 p-0 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground',
                element.flipX && 'bg-primary/10 text-primary',
              )}
            >
              <FlipHorizontal className="w-3.5 h-3.5" weight={element.flipX ? 'fill' : 'bold'} />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">قلب أفقي</TooltipContent>
        </Tooltip>
      </QuickBarGroup>

      {/* استعادة ومعاينة الأصل (للصور المعدلة فقط) */}
      {element.type === 'image' && element.imageSrc && element.originalImageSrc && (
        <>
          <Separator orientation="vertical" className="h-3 bg-border/40" />
          <QuickBarGroup>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    updateElement(element.id, {
                      imageSrc: element.originalImageSrc,
                      originalImageSrc: undefined,
                      bgColor: 'transparent',
                    });
                    useEditorStore.getState().pushHistory();
                    toast.success('تمت الاستعادة');
                  }}
                  aria-label="استعادة الصورة الأصلية"
                  className="h-7 w-7 p-0 rounded-md text-amber-600 dark:text-amber-400 hover:bg-amber-500/10"
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
                    const curr = element.imageSrc;
                    holdRef.current = { id: element.id, src: curr };
                    updateElement(element.id, { imageSrc: element.originalImageSrc });
                    const restore = () => {
                      holdRef.current = null;
                      updateElement(element.id, { imageSrc: curr });
                      cleanup();
                    };
                    const cleanup = () => {
                      window.removeEventListener('mouseup', restore);
                      window.removeEventListener('pointerup', restore);
                      window.removeEventListener('pointercancel', restore);
                      window.removeEventListener('blur', restore);
                    };
                    window.addEventListener('mouseup', restore);
                    window.addEventListener('pointerup', restore);
                    window.addEventListener('pointercancel', restore);
                    window.addEventListener('blur', restore);
                  }}
                  aria-label="معاينة الصورة الأصلية"
                  className="h-7 w-7 p-0 rounded-md text-primary hover:bg-primary/10 select-none active:bg-primary-action active:text-primary-foreground"
                >
                  <Eye className="w-3.5 h-3.5" weight="regular" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">اضغط مطولاً للمعاينة</TooltipContent>
            </Tooltip>
          </QuickBarGroup>
        </>
      )}
    </>
  );
});
