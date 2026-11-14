import { Button } from '@/components/ui/button';
import { Eye, EyeSlash, LockSimple, LockSimpleOpen } from '@/components/ui/icons';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useEditorStore } from '@/lib/editor-store';
import { FOCUS_RING } from '@/lib/ui/ui-compliance';
import { cn } from '@/lib/utils';

import type { CanvasElement } from '@/lib/editor-store';

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
              'coarse-touch-target flex size-6 items-center justify-center rounded-sm border transition-colors cursor-pointer',
              FOCUS_RING,
              isHidden
                ? 'border-border/80 bg-card text-foreground shadow-2xs hover:bg-accent dark:border-white/10'
                : 'border-transparent text-muted-foreground hover:bg-accent/60 hover:text-foreground',
            )}
          >
            {isHidden ? (
              <EyeSlash className="size-3.5" weight="duotone" aria-hidden="true" />
            ) : (
              <Eye className="size-3.5" weight="regular" aria-hidden="true" />
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
              'coarse-touch-target flex size-6 items-center justify-center rounded-sm border transition-colors cursor-pointer',
              FOCUS_RING,
              isLocked
                ? 'border-warning/30 bg-warning/15 text-warning shadow-2xs hover:bg-warning/20'
                : 'border-transparent text-muted-foreground hover:bg-accent/60 hover:text-foreground',
            )}
          >
            {isLocked ? (
              <LockSimple className="size-3.5" weight="duotone" aria-hidden="true" />
            ) : (
              <LockSimpleOpen className="size-3.5" weight="regular" aria-hidden="true" />
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
    <div className="bg-warning/10 border border-warning/20 text-warning p-2.5 rounded-md flex items-center justify-between text-xs font-semibold mb-2 animate-in fade-in slide-in-from-top-1 duration-200 fluent-specular">
      <div className="flex items-center gap-2">
        <LockSimple className="w-3.5 h-3.5 shrink-0" weight="fill" />
        <span>القفل يمنع التعديل من الكانفاس والخصائص</span>
      </div>
      <Button
        variant="ghost"
        size="sm"
        onClick={onUnlock}
        className="h-7 px-2 text-mini bg-warning/15 enabled:hover:bg-warning/25 border border-warning/20 rounded-md transition-colors cursor-pointer text-warning font-bold"
      >
        إلغاء القفل
      </Button>
    </div>
  );
}
