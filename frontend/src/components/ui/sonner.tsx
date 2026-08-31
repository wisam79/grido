import React from "react"
import { Toaster as Sonner, ToasterProps } from "sonner"
import {
  CheckmarkCircle20Regular,
  DismissCircle20Regular,
  Warning20Regular,
  Info20Regular,
} from "@fluentui/react-icons"
import { Spinner } from "@/components/ui/huge-icon"

const Toaster = ({ ...props }: ToasterProps) => {
  const theme = typeof window !== "undefined" && document.documentElement.classList.contains("dark") ? "dark" : "light"

  return (
    <Sonner
      duration={1500}
      theme={theme as ToasterProps["theme"]}
      dir="rtl"
      className="toaster group"
      icons={{
        success: <CheckmarkCircle20Regular className="w-4 h-4 text-emerald-500 shrink-0" />,
        error: <DismissCircle20Regular className="w-4 h-4 text-rose-500 shrink-0" />,
        warning: <Warning20Regular className="w-4 h-4 text-amber-500 shrink-0" />,
        info: <Info20Regular className="w-4 h-4 text-blue-500 shrink-0" />,
        loading: <Spinner size={16} className="w-4 h-4 text-indigo-500" />,
      }}
      toastOptions={{
        classNames: {
          toast:
            "group toast font-sans !bg-card !text-foreground !border !border-border !shadow-md !rounded-full !backdrop-blur-md transition-all duration-150 !w-auto !max-w-fit !mx-auto px-3.5 py-1.5 min-h-[34px] gap-2 flex items-center",
          title: "text-xs font-medium text-foreground tracking-normal font-sans whitespace-nowrap",
          description: "text-[11px] text-muted-foreground font-sans mt-0.5",
          actionButton:
            "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground group-[.toast]:hover:bg-primary/90 text-xs font-medium px-2.5 py-1 rounded-full transition-colors",
          cancelButton:
            "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground group-[.toast]:hover:bg-muted/80 text-xs font-medium px-2.5 py-1 rounded-full transition-colors",
          closeButton:
            "group-[.toast]:!bg-transparent group-[.toast]:!text-muted-foreground/60 group-[.toast]:hover:!text-foreground group-[.toast]:!border-none group-[.toast]:!rounded-full transition-colors p-0.5",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
