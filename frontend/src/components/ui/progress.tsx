'use client';

import * as ProgressPrimitive from '@radix-ui/react-progress';
import * as React from 'react';

import { cn } from '@/lib/utils';

function Progress({
  className,
  value,
  ...props
}: React.ComponentProps<typeof ProgressPrimitive.Root>) {
  return (
    <ProgressPrimitive.Root
      data-slot="progress"
      className={cn(
        'bg-muted/80 dark:bg-muted/60 relative h-1.5 w-full overflow-hidden rounded-full border border-border/40',
        className,
      )}
      {...props}
    >
      <ProgressPrimitive.Indicator
        data-slot="progress-indicator"
        // 🛡️ C4 من تدقيق 2026-10-08: كان التعبئة تُرسم بـ translateX فيتجاه
        // الملء من اليسار داخل كل الحوارات العربية (RTL). المقياس الأفقي يتبع
        // اتجاه المستند: origin يبدأ من البداية المنطقية للنص.
        className="bg-foreground/85 h-full w-full flex-1 origin-left rtl:origin-right transition-transform duration-300 ease-out"
        style={{ transform: `scaleX(${Math.max(0, Math.min(100, value || 0)) / 100})` }}
      />
    </ProgressPrimitive.Root>
  );
}

export { Progress };
