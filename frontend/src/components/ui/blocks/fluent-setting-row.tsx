import React from 'react';

import { Question } from '@/components/ui/icons';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

export interface FluentSettingRowProps extends React.HTMLAttributes<HTMLDivElement> {
  label: React.ReactNode;
  description?: React.ReactNode;
  tooltip?: string;
  control?: React.ReactNode;
  children?: React.ReactNode;
  layout?: 'horizontal' | 'vertical';
}

export const FluentSettingRow = React.memo(
  React.forwardRef<HTMLDivElement, FluentSettingRowProps>(function FluentSettingRow(
    { label, description, tooltip, control, children, layout = 'horizontal', className, ...props },
    ref,
  ) {
    const actionElement = control || children;

    if (layout === 'vertical') {
      return (
        <div ref={ref} className={cn('space-y-1.5', className)} {...props}>
          {/* الوصف يتبع العنوان مباشرةً (لا يُدفع إلى الطرف المقابل) — فالوصف
              بيانات ثانوية كتأحتها لا قيمة حقل. */}
          <div className="flex items-center gap-2 text-xs">
            <div className="flex items-center gap-1.5 font-normal text-foreground/85">
              <span>{label}</span>
              {tooltip && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      className="inline-flex items-center justify-center p-1 -m-1 text-muted-foreground/70 hover:text-foreground cursor-pointer rounded-md outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                      aria-label={typeof label === 'string' ? `شرح: ${label}` : 'شرح الإعداد'}
                    >
                      <Question className="size-3.5 shrink-0" weight="bold" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="text-xs font-cairo">
                    {tooltip}
                  </TooltipContent>
                </Tooltip>
              )}
            </div>
            {description && <span className="text-micro text-muted-foreground">{description}</span>}
          </div>
          {actionElement}
        </div>
      );
    }

    return (
      <div
        ref={ref}
        className={cn(
          'flex items-center justify-between gap-3 py-1 text-xs select-none',
          className,
        )}
        {...props}
      >
        <div className="flex items-center gap-2 min-w-0">
          <div className="min-w-0 text-start">
            <div className="flex items-center gap-1.5 font-normal text-foreground/85">
              <span className="truncate">{label}</span>
              {tooltip && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      className="text-muted-foreground/70 hover:text-foreground cursor-pointer inline-flex items-center justify-center p-1 -m-1 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                      aria-label={typeof label === 'string' ? `شرح: ${label}` : 'شرح الإعداد'}
                    >
                      <Question className="size-3.5 shrink-0" weight="bold" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="text-xs font-cairo">
                    {tooltip}
                  </TooltipContent>
                </Tooltip>
              )}
            </div>
            {description && (
              <p className="text-micro text-muted-foreground truncate mt-0.5">{description}</p>
            )}
          </div>
        </div>

        {actionElement && <div className="shrink-0 flex items-center">{actionElement}</div>}
      </div>
    );
  }),
);

FluentSettingRow.displayName = 'FluentSettingRow';
