import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import * as React from 'react';

import { cn } from '@/lib/utils';

const buttonVariants = cva(
  "font-sans inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-md text-control font-semibold select-none transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background",
  {
    variants: {
      variant: {
        default:
          'bg-primary-action text-primary-foreground hover:bg-primary-action-hover active:bg-primary-action-hover',
        destructive:
          'bg-destructive text-destructive-foreground shadow-2xs hover:bg-destructive/90 focus-visible:ring-destructive',
        outline:
          'border border-control-border bg-card hover:bg-accent hover:text-foreground dark:hover:bg-accent/60',
        secondary: 'bg-secondary text-secondary-foreground shadow-2xs hover:bg-secondary/80',
        ghost: 'text-muted-foreground hover:bg-accent/60 hover:text-foreground active:bg-accent/80',
        transparent: 'bg-transparent text-foreground hover:bg-black/5 dark:hover:bg-white/5',
        link: 'text-primary underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-8 px-3 py-1.5 has-[>svg]:px-2.5',
        sm: 'h-7 rounded-md gap-1 px-2.5 text-control has-[>svg]:px-2',
        lg: 'h-9 rounded-md px-4 text-control font-semibold has-[>svg]:px-3',
        xl: 'h-10 rounded-md px-5 text-sm font-semibold has-[>svg]:px-3.5',
        '2xl': 'h-12 rounded-lg px-6 text-sm font-bold has-[>svg]:px-4',
        icon: 'size-8 p-0',
        // الحد الأدنى المطلق للأزرار الأيقونية h-7 w-7 (سلم الارتفاعات) —
        // حُذف متغير icon-xs (‏size-6) لمنع أهداف 24px مستقبلاً؛ استخدم icon-sm.
        'icon-sm': 'size-7 p-0',
        'icon-lg': 'size-9 p-0',
      },
      shape: {
        rounded: 'rounded-md',
        circular: 'rounded-full',
        square: 'rounded-none',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
      shape: 'rounded',
    },
  },
);

export interface ButtonProps
  extends React.ComponentPropsWithRef<'button'>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, shape, asChild = false, disabled, children, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    const blockActivation = (event: React.SyntheticEvent) => {
      event.preventDefault();
      event.stopPropagation();
    };
    // Slot runs child handlers before wrapper handlers. Override activation on the
    // child too: a disabled anchor/custom control has no native disabled behavior.
    const content =
      asChild && disabled && React.isValidElement(children)
        ? React.cloneElement(
            children as React.ReactElement<
              React.HTMLAttributes<HTMLElement> & { disabled?: boolean }
            >,
            {
              disabled: true,
              'aria-disabled': true,
              tabIndex: -1,
              onClick: blockActivation,
              onClickCapture: blockActivation,
              onKeyDownCapture: (event) => {
                if (event.key === 'Enter' || event.key === ' ') blockActivation(event);
              },
            },
          )
        : children;
    return (
      <Comp
        data-slot="button"
        className={cn(
          buttonVariants({ variant, size, shape, className }),
          asChild && disabled && 'opacity-50 cursor-not-allowed',
        )}
        ref={ref}
        disabled={disabled}
        {...props}
        {...(asChild && disabled
          ? {
              'aria-disabled': true,
              tabIndex: -1,
              onClick: blockActivation,
              onClickCapture: blockActivation,
              onKeyDownCapture: (event: React.KeyboardEvent<HTMLElement>) => {
                if (event.key === 'Enter' || event.key === ' ') blockActivation(event);
              },
            }
          : {})}
      >
        {content}
      </Comp>
    );
  },
);
Button.displayName = 'Button';

export { Button, buttonVariants };
