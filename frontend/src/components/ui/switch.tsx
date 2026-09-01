"use client"

import * as React from "react"
import * as SwitchPrimitive from "@radix-ui/react-switch"

import { cn } from "@/lib/utils"

function Switch({
  className,
  ...props
}: React.ComponentProps<typeof SwitchPrimitive.Root>) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      dir="ltr"
      className={cn(
        "peer data-[state=checked]:bg-primary data-[state=unchecked]:bg-muted/80 dark:data-[state=unchecked]:bg-muted/50 inline-flex h-5 w-9 shrink-0 items-center rounded-full border border-border/60 data-[state=checked]:border-primary shadow-2xs transition-all duration-150 outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-40 px-0.5 cursor-pointer",
        className
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className={cn(
          "bg-background dark:data-[state=unchecked]:bg-muted-foreground/80 dark:data-[state=checked]:bg-primary-foreground pointer-events-none block size-3.5 rounded-full shadow-xs transition-transform duration-200 ease-[cubic-bezier(0.34,1.56,0.64,1)] data-[state=checked]:translate-x-4 data-[state=unchecked]:translate-x-0 group-active/switch:scale-90"
        )}
      />
    </SwitchPrimitive.Root>
  )
}

export { Switch }
