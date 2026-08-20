import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-md text-xs font-semibold select-none transition-all duration-150 disabled:pointer-events-none disabled:opacity-40 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background active:scale-[0.98]",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-2xs hover:bg-primary/90 active:bg-primary/95",
        primary:
          "bg-primary text-primary-foreground shadow-2xs hover:bg-primary/90 active:bg-primary/95",
        destructive:
          "bg-destructive text-destructive-foreground shadow-2xs hover:bg-destructive/90 focus-visible:ring-destructive",
        outline:
          "border border-border/80 bg-background/60 hover:bg-accent hover:text-foreground dark:bg-card/40 dark:border-border/60 dark:hover:bg-accent/60 shadow-2xs",
        secondary:
          "bg-secondary text-secondary-foreground shadow-2xs hover:bg-secondary/80",
        ghost:
          "text-muted-foreground hover:bg-accent/60 hover:text-foreground active:bg-accent/80",
        subtle:
          "text-muted-foreground hover:bg-accent/60 hover:text-foreground active:bg-accent/80",
        transparent:
          "bg-transparent text-foreground hover:bg-black/5 dark:hover:bg-white/5",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-8 px-3 py-1.5 has-[>svg]:px-2.5",
        sm: "h-7 rounded-md gap-1 px-2.5 text-[11px] has-[>svg]:px-2",
        lg: "h-9 rounded-md px-4 text-xs font-semibold has-[>svg]:px-3",
        xl: "h-10 rounded-md px-5 text-sm font-semibold has-[>svg]:px-3.5",
        "2xl": "h-12 rounded-xl px-6 text-sm font-bold has-[>svg]:px-4",
        icon: "size-8 p-0",
        "icon-sm": "size-7 p-0",
        "icon-lg": "size-9 p-0",
        "icon-xs": "size-6 p-0",
      },
      shape: {
        rounded: "rounded-md",
        circular: "rounded-full",
        square: "rounded-none",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
      shape: "rounded",
    },
  }
)

export interface ButtonProps
  extends React.ComponentPropsWithRef<"button">,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, shape, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        data-slot="button"
        className={cn(buttonVariants({ variant, size, shape, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
