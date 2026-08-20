"use client"

import * as React from "react"
import * as TogglePrimitive from "@radix-ui/react-toggle"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const toggleVariants = cva(
  "inline-flex items-center justify-center gap-1.5 rounded-md text-xs font-semibold hover:bg-muted/80 hover:text-foreground disabled:pointer-events-none disabled:opacity-40 data-[state=on]:bg-primary/10 data-[state=on]:text-primary dark:data-[state=on]:bg-primary/20 dark:data-[state=on]:text-primary [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-3.5 [&_svg]:shrink-0 outline-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background transition-all duration-150 whitespace-nowrap cursor-pointer",
  {
    variants: {
      variant: {
        default: "bg-transparent",
        outline:
          "border border-border/80 dark:border-border/60 bg-transparent shadow-2xs hover:bg-accent/60 hover:text-foreground",
      },
      size: {
        default: "h-8 px-2.5 min-w-8",
        sm: "h-7 px-2 min-w-7 text-[11px]",
        lg: "h-9 px-3 min-w-9 text-xs",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Toggle({
  className,
  variant,
  size,
  ...props
}: React.ComponentProps<typeof TogglePrimitive.Root> &
  VariantProps<typeof toggleVariants>) {
  return (
    <TogglePrimitive.Root
      data-slot="toggle"
      className={cn(toggleVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Toggle, toggleVariants }
