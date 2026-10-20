import { CanvasElement, useEditorStore } from '@/lib/editor-store';
import { Button } from '@/components/ui/button';
import { Eye, EyeSlash, LockSimple, LockSimpleOpen } from '@/components/ui/icons';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

export interface ElementHeaderActionsProps {
  element: CanvasElement;
  onUpdate: (id: string, patch: Partial<CanvasElement>) => void;
}

/**
 * إجراءات سياقية دائمة في رأس لوحة الخصائص — الإظهار والقفل متاحان
 * دائماً حتى لا يضيع المستخدم داخل تبويب بعد إخفاء العنصر أو قفله.
 */
export function ElementHeaderActions({ element, onUpdate }: ElementHeaderActionsProps) {
  const isHidden = element.visible === false;
  const isLocked = element.locked === true;

  const commit = (patch: Partial<CanvasElement>) => {
    onUpdate(element.id, patch);
    useEditorStore.getState().pushHistory();
  };

  return (
    <>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            aria-label={isHidden ? 'إظهار العنصر' : 'إخفاء العنصر'}
            aria-pressed={isHidden}
            onClick={() => commit({ visible: isHidden ? true : false })}
            className={cn(
              'flex size-7 items-center justify-center rounded-md transition-colors cursor-pointer',
              'focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none',
              isHidden
                ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                : 'text-muted-foreground hover:bg-accent/60 hover:text-foreground',
            )}
          >
            {isHidden ? (
              <EyeSlash className="size-4" weight="bold" />
            ) : (
              <Eye className="size-4" weight="regular" />
            )}
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="text-xs font-cairo">
          {isHidden ? 'إظهار العنصر' : 'إخفاء العنصر'}
        </TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            aria-label={isLocked ? 'إلغاء قفل العنصر' : 'قفل العنصر'}
            aria-pressed={isLocked}
            onClick={() => commit({ locked: !isLocked })}
            className={cn(
              'flex size-7 items-center justify-center rounded-md transition-colors cursor-pointer',
              'focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none',
              isLocked
                ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                : 'text-muted-foreground hover:bg-accent/60 hover:text-foreground',
            )}
          >
            {isLocked ? (
              <LockSimple className="size-4" weight="fill" />
            ) : (
              <LockSimpleOpen className="size-4" weight="regular" />
            )}
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="text-xs font-cairo">
          {isLocked ? 'إلغاء قفل العنصر' : 'قفل العنصر'}
        </TooltipContent>
      </Tooltip>
    </>
  );
}

export interface ElementHeaderBadgeProps {
  element: CanvasElement;
  onUnlock: () => void;
}

/** تنبيه القفل داخل الجسم — يفسر تعطيل بقية عناصر التحكم */
export function ElementHeaderBadge({ element, onUnlock }: ElementHeaderBadgeProps) {
  if (!element.locked) return null;

  return (
    <div className="bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 p-2.5 rounded-md flex items-center justify-between text-xs font-semibold mb-2 animate-in fade-in slide-in-from-top-1 duration-200 fluent-specular">
      <div className="flex items-center gap-2">
        <LockSimple className="w-3.5 h-3.5 shrink-0" weight="fill" />
        <span>القفل يمنع التعديل من الكانفاس والخصائص</span>
      </div>
      <Button
        variant="ghost"
        size="sm"
        onClick={onUnlock}
        className="h-7 px-2 text-micro bg-amber-500/15 enabled:hover:bg-amber-500/25 border border-amber-500/20 rounded-md transition-colors cursor-pointer text-amber-700 dark:text-amber-300 font-bold"
      >
        إلغاء القفل
      </Button>
    </div>
  );
}
