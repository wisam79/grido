import React from 'react';

import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

import { FluentKbd } from './fluent-kbd';

export interface FluentCapsuleButtonProps {
  icon: React.ReactNode;
  label: string;
  tooltip: React.ReactNode;
  shortcut?: string;
  active?: boolean;
  onClick?: () => void;
  testId?: string;
  className?: string;
}

/**
 * FluentCapsuleButton — زر الكبسولة الأيقوني الموحد لشرائط الأدوات المدمجة
 * (كان ~12 نسخة متطابقة في canvas-viewport-deck وحدها: نفس الكلاسات ونفس
 * قالب Tooltip+Ctrl+kbd). الحالة النشطة بلون primary، والخاملة muted.
 */
export const FluentCapsuleButton = React.memo(function FluentCapsuleButton({
  icon,
  label,
  tooltip,
  shortcut,
  active,
  onClick,
  testId,
  className,
}: FluentCapsuleButtonProps) {
  const isToggle = active !== undefined;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={onClick}
          data-testid={testId}
          aria-label={label}
          aria-pressed={isToggle ? active : undefined}
          className={cn(
            'coarse-touch-target relative w-6 h-6 flex items-center justify-center rounded-sm transition-colors duration-150 cursor-pointer [&_svg]:w-3.5 [&_svg]:h-3.5',
            'focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none',
            active
              ? 'bg-card text-foreground border border-border/80 dark:border-white/10 shadow-2xs hover:bg-accent'
              : 'text-muted-foreground hover:text-foreground hover:bg-accent/60 border border-transparent',
            className,
          )}
        >
          {icon}
        </button>
      </TooltipTrigger>
      <TooltipContent
        side="top"
        sideOffset={8}
        align="center"
        className="font-cairo text-xs font-semibold py-1 px-2.5 shadow-fluent-8"
      >
        <div className="flex items-center gap-1.5">
          <span>{tooltip}</span>
          {shortcut && <FluentKbd keys={shortcut} />}
        </div>
      </TooltipContent>
    </Tooltip>
  );
});
