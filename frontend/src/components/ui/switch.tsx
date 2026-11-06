'use client';

import * as SwitchPrimitive from '@radix-ui/react-switch';
import * as React from 'react';

import { cn } from '@/lib/utils';

function Switch({ className, ...props }: React.ComponentProps<typeof SwitchPrimitive.Root>) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      // ltr-island مقصودة وموثقة (عقد الاتجاه R37): سلوك Windows 11 ثابت —
      // التفعيل يميناً دائماً ولا يُعكس في RTL. translate-x-4 أدناه فيزيائي عمداً.
      dir="ltr"
      className={cn(
        // مسار مفعّل بلون التمييز (--primary) وأبعاد 40×24px (WCAG 2.5.8 ≥ 24×24)
        'peer data-[state=checked]:bg-primary data-[state=unchecked]:bg-muted dark:data-[state=unchecked]:bg-muted/50 data-[state=unchecked]:border-muted-foreground/50 inline-flex h-6 w-10 shrink-0 items-center rounded-full border border-border/60 data-[state=checked]:border-primary shadow-2xs transition-colors duration-150 outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-40 px-0.5 cursor-pointer',
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className={cn(
          'bg-foreground/70 dark:data-[state=unchecked]:bg-muted-foreground/80 data-[state=checked]:bg-primary-foreground dark:data-[state=checked]:bg-primary-foreground pointer-events-none block size-4 rounded-full shadow-xs transition-transform duration-200 ease-[cubic-bezier(0.34,1.56,0.64,1)] data-[state=checked]:translate-x-4 data-[state=unchecked]:translate-x-0',
        )}
      />
    </SwitchPrimitive.Root>
  );
}

export { Switch };
