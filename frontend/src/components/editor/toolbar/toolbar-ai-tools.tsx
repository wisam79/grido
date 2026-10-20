import React, { useState } from 'react';
import { useEditorStore } from '@/lib/editor-store';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/huge-icon';
import { Sparkle, PaintBrush, UserSquare, MagicWand, CaretDown } from '@/components/ui/icons';
import { useShallow } from 'zustand/react/shallow';
import { FluentTooltip as TooltipBtn } from '@/components/ui/blocks';
import { useBgRemoval } from '@/hooks/use-bg-removal';
import { useAiEnhance } from '@/hooks/use-ai-enhance';
import { useFaceFrame } from '@/hooks/use-face-frame';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';

const RefineBgDialog = React.lazy(() =>
  import('../dialogs/refine-bg-dialog').then((m) => ({ default: m.RefineBgDialog })),
);

import { cn } from '@/lib/utils';

interface AiToolsToolbarGroupProps {
  compact?: boolean;
}

/** شريط أدوات الذكاء الاصطناعي للصورة المحددة — تصميم كبسولي ذكي ومدمج (Split Button) وفق Fluent 2. */
export const AiToolsToolbarGroup = React.memo(function AiToolsToolbarGroup({
  compact = false,
}: AiToolsToolbarGroupProps = {}) {
  const { selectedItem } = useEditorStore(
    useShallow((state) => {
      const el = state.elements.find((e) => e.id === state.selectedId);
      const slot = state.slots?.find((s) => s.id === state.selectedId);
      const target = state.mode === 'collage' ? slot : el?.type === 'image' ? el : null;
      return { selectedItem: target };
    }),
  );

  const onUpdate = React.useCallback((id: string, patch: Partial<Record<string, unknown>>) => {
    const store = useEditorStore.getState();
    if (store.mode === 'collage') {
      store.updateSlot(id, patch);
    } else {
      store.updateElement(id, patch);
    }
  }, []);

  const { isRemovingBg, bgProgress, bgProgressText, handleCancelBgRemoval, handleRemoveBg } =
    useBgRemoval(onUpdate);
  const { isEnhancing, enhanceProgress, remainingQuota, dailyLimit, handleEnhance } =
    useAiEnhance(onUpdate);
  const { isFraming, frameProgress, frameProgressText, handleCancelFrame, handleFrameFace } =
    useFaceFrame(onUpdate);

  const [refineOpen, setRefineOpen] = useState(false);

  if (!selectedItem || !selectedItem.imageSrc) return null;

  // 1. حالة عزل الخلفية جارية (Fluent Wait UX)
  if (isRemovingBg) {
    return (
      <div className="fluent-command-group font-cairo shadow-2xs">
        <TooltipBtn content={bgProgressText || 'إلغاء عزل الخلفية'}>
          <Button
            variant="destructive"
            size="sm"
            aria-label="إلغاء عزل الخلفية"
            className={cn(
              compact ? 'h-7 px-2' : 'h-8 px-2.5',
              'gap-1.5 text-xs font-semibold rounded-md cursor-pointer',
            )}
            onClick={handleCancelBgRemoval}
          >
            <Spinner className="w-3.5 h-3.5 shrink-0" size={14} />
            <span>{bgProgress > 0 ? `جاري العزل (${bgProgress}%)` : 'جاري العزل ...'}</span>
          </Button>
        </TooltipBtn>
      </div>
    );
  }

  // 2. حالة تأطير الوجه جارية
  if (isFraming) {
    return (
      <div className="fluent-command-group font-cairo shadow-2xs">
        <TooltipBtn content={frameProgressText || 'إلغاء التأطير'}>
          <Button
            variant="destructive"
            size="sm"
            aria-label="إلغاء التأطير"
            className={cn(
              compact ? 'h-7 px-2' : 'h-8 px-2.5',
              'gap-1.5 text-xs font-semibold rounded-md cursor-pointer',
            )}
            onClick={handleCancelFrame}
          >
            <Spinner className="w-3.5 h-3.5 shrink-0" size={14} />
            <span>
              {frameProgress > 0 ? `جاري التأطير (${frameProgress}%)` : 'جاري التأطير ...'}
            </span>
          </Button>
        </TooltipBtn>
      </div>
    );
  }

  // 3. حالة ترميم الوجه جارية
  if (isEnhancing) {
    return (
      <div className="fluent-command-group font-cairo bg-primary/10 border-primary/30 shadow-2xs">
        <div
          className={cn(
            compact ? 'h-7 px-2' : 'h-8 px-2.5',
            'gap-1.5 text-xs font-semibold text-primary rounded-md flex items-center select-none',
          )}
        >
          <Spinner className="w-3.5 h-3.5 shrink-0 text-primary" size={14} />
          <span>
            {enhanceProgress > 0 ? `جاري الترميم (${enhanceProgress}%)` : 'جاري الترميم ...'}
          </span>
        </div>
      </div>
    );
  }

  // 4. الحالة الطبيعية: Split Button أنيق ومدمج يجمع الإجراء السريع والقائمة الذكية
  return (
    <>
      <div className="fluent-command-group font-cairo bg-primary/5 dark:bg-primary/10 border-primary/25 dark:border-primary/30 shadow-2xs">
        {/* الزر الرئيسي السريع: عزل الخلفية الذكي */}
        <TooltipBtn content="عزل الخلفية الذكي">
          <Button
            variant="ghost"
            size="sm"
            aria-label="عزل الخلفية"
            className={cn(
              compact ? 'h-7 px-2' : 'h-8 px-2.5',
              'gap-1.5 font-bold text-xs text-primary hover:text-primary hover:bg-primary/10 rounded-s-md rounded-e-none border-e border-primary/20 transition-all cursor-pointer flex items-center select-none group',
            )}
            onClick={() => handleRemoveBg(selectedItem)}
          >
            <Sparkle
              className="w-4 h-4 text-primary shrink-0 group-hover:scale-105 transition-transform"
              weight="duotone"
            />
            <span>عزل</span>
          </Button>
        </TooltipBtn>

        {/* زر القائمة المنسدلة لبقية أدوات الذكاء الاصطناعي */}
        <DropdownMenu>
          <TooltipBtn content="أدوات الذكاء الاصطناعي">
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                aria-label="المزيد من أدوات الذكاء الاصطناعي"
                className={cn(
                  compact ? 'h-7 px-1' : 'h-8 px-1.5',
                  'text-primary hover:text-primary hover:bg-primary/10 rounded-s-none rounded-e-md transition-all cursor-pointer flex items-center justify-center',
                )}
              >
                <CaretDown className="w-3.5 h-3.5 opacity-80" />
              </Button>
            </DropdownMenuTrigger>
          </TooltipBtn>
          <DropdownMenuContent
            align="start"
            className="w-68 font-cairo [direction:rtl] rounded-lg bg-popover text-popover-foreground border border-border shadow-fluent-16 fluent-specular p-1.5 space-y-1"
          >
            <div className="px-2.5 py-1 text-mini font-bold text-muted-foreground select-none">
              أدوات الذكاء الاصطناعي
            </div>

            {/* ترميم وتحسين الوجه */}
            <DropdownMenuItem
              onClick={() => handleEnhance(selectedItem)}
              className="flex items-start gap-2.5 p-2 text-xs rounded-lg cursor-pointer transition-colors"
            >
              <MagicWand className="w-4 h-4 text-primary shrink-0 mt-0.5" weight="duotone" />
              <div className="flex-1 space-y-0.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-foreground">ترميم وتحسين الوجه</span>
                  <span className="text-micro font-mono bg-primary/15 text-primary px-1.5 py-0.5 rounded font-bold">
                    {remainingQuota}/{dailyLimit}
                  </span>
                </div>
                <p className="text-micro text-muted-foreground font-medium">
                  معالجة الدقة وترميم الملامح
                </p>
              </div>
            </DropdownMenuItem>

            {/* تأطير الوجه التلقائي */}
            <DropdownMenuItem
              onClick={() => handleFrameFace(selectedItem)}
              className="flex items-start gap-2.5 p-2 text-xs rounded-lg cursor-pointer transition-colors"
            >
              <UserSquare className="w-4 h-4 text-primary shrink-0 mt-0.5" weight="duotone" />
              <div className="flex-1 space-y-0.5">
                <span className="font-bold text-foreground block">تأطير الوجه التلقائي</span>
                <p className="text-micro text-muted-foreground font-medium">
                  توسيط الوجه لمقاسات صور الهوية
                </p>
              </div>
            </DropdownMenuItem>

            {/* تعديل تفاصيل العزل يدوياً */}
            {selectedItem.originalImageSrc && (
              <DropdownMenuItem
                onClick={() => setRefineOpen(true)}
                className="flex items-start gap-2.5 p-2 text-xs rounded-lg cursor-pointer transition-colors"
              >
                <PaintBrush className="w-4 h-4 text-primary shrink-0 mt-0.5" weight="duotone" />
                <div className="flex-1 space-y-0.5">
                  <span className="font-bold text-foreground block">تعديل تفاصيل العزل</span>
                  <p className="text-micro text-muted-foreground font-medium">
                    إعادة ضبط وتنعيم الحواف بالفرشاة
                  </p>
                </div>
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {selectedItem.originalImageSrc && refineOpen && (
        <React.Suspense fallback={null}>
          <RefineBgDialog
            open={refineOpen}
            onOpenChange={setRefineOpen}
            element={selectedItem}
            onSave={async (newImageSrc) => {
              onUpdate(selectedItem.id, { imageSrc: newImageSrc });
              useEditorStore.getState().pushHistory();
            }}
          />
        </React.Suspense>
      )}
    </>
  );
});
